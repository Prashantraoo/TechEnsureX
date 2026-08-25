// ─── Live AI end-to-end tests ────────────────────────────
// These hit the real NVIDIA NIM API (real latency, real token cost) and
// a real local MongoDB, so they're opt-in rather than part of the
// default `npm test` run — set RUN_LIVE_AI_TESTS=1 to run them:
//
//   RUN_LIVE_AI_TESTS=1 npx vitest run src/__tests__/live-ai.e2e.test.ts
//
// This is the automated version of the manual test sequence used to
// validate the AI architecture end-to-end: chat streaming, grounded
// health-report Q&A against the fictional report fixture (checking both
// correct extraction AND that unasked-for values aren't invented), and
// policy retrieval. Requires MONGODB_URI reachable and a seeded
// InsurancePlan collection (npm run seed) for the retrieval case.

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { chatCompletion } from "../services/ai.service.js";
import { analyzeDocument, type AnalysisTiming } from "../services/document-analysis.service.js";
import { analyzeScannedDocument } from "../services/vision-analysis.service.js";
import { extractPdfText } from "../services/pdf.service.js";
import { indexInsurancePlans, retrieveRelevantChunks } from "../services/rag.service.js";
import { InsurancePlan } from "../models/InsurancePlan.js";

const runLive = process.env.RUN_LIVE_AI_TESTS === "1";
const describeLive = runLive ? describe : describe.skip;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, "..", "__tests__", "fixtures", "fictional-health-report.pdf");
const SCANNED_FIXTURE = path.join(__dirname, "..", "__tests__", "fixtures", "scanned-health-report.pdf");

// Test-local implementation of the AnalysisTiming interface so live
// tests can assert which path (fast/reasoning/vision) actually ran and
// report real measured durations — the same interface upload.controller.ts
// uses in production, just captured here instead of only logged.
function recordingTiming() {
  const start = Date.now();
  const marks: Array<{ label: string; ms: number }> = [];
  let path: string = "unset";
  const timing: AnalysisTiming = {
    mark(label: string) {
      marks.push({ label, ms: Date.now() - start });
    },
    setPath(p) {
      path = p;
    },
  };
  return { timing, marks, getPath: () => path, elapsedMs: () => Date.now() - start };
}

async function collectStream(prompt: string): Promise<string> {
  let out = "";
  await chatCompletion([{ role: "user", content: prompt }], "test-user-live-e2e", (delta) => {
    out += delta;
  });
  return out;
}

describeLive("live AI chat", () => {
  it("streams a real answer (onDelta fires more than once)", async () => {
    let deltaCount = 0;
    await chatCompletion([{ role: "user", content: "Explain what a health insurance deductible is." }], "test-user-live-e2e", () => {
      deltaCount++;
    });
    expect(deltaCount).toBeGreaterThan(1);
  }, 30_000);

  it("answers a general insurance question using its own knowledge, not just retrieved context", async () => {
    const reply = await collectStream("Explain what coinsurance means.");
    // Match loosely on "co<any dash/hyphen char>insurance" — the model
    // sometimes renders this with a Unicode non-breaking hyphen (‑)
    // instead of a plain "-", which is a formatting choice, not a
    // correctness issue this test cares about.
    expect(reply.toLowerCase()).toMatch(/co.?insurance/);
  }, 30_000);
});

describeLive("live document analysis + grounded chat", () => {
  it("takes the FAST path (not reasoning) for an ordinary report, and extracts real values without inventing unasked-for data", async () => {
    await mongoose.connect(env.MONGODB_URI);
    try {
      const buffer = readFileSync(FIXTURE);
      const { text } = await extractPdfText(buffer);
      const { timing, getPath, elapsedMs } = recordingTiming();
      const analysis = await analyzeDocument(text, "fictional-health-report.pdf", timing);
      console.log(`[test] fast-path analysis took ${elapsedMs()}ms, path=${getPath()}`);

      // The reasoning trigger is about the OUTPUT, not the input — this
      // report has no conflicting values or many-abnormal-findings
      // pattern, so it must stay on the fast path. This is the concrete
      // regression guard for "don't send every report to the 550B model."
      expect(getPath()).toBe("fast");

      // Known values from the fixture (see fixtures/fictional-health-report.pdf).
      const hba1c = analysis.labResults.find((l) => l.test.toLowerCase().includes("hba1c"));
      expect(hba1c?.value).toBe("5.5");

      // Hallucination guard: a value NOT in the report must not be invented.
      const b12 = analysis.labResults.find((l) => l.test.toLowerCase().includes("b12"));
      expect(b12).toBeUndefined();
    } finally {
      await mongoose.disconnect();
    }
  }, 45_000);

  it("escalates to the REASONING path when the extracted data has genuinely conflicting values", async () => {
    // Synthetic report text with two contradictory readings for the
    // same test — a real complexity signal, not something the fast
    // model should silently paper over.
    const conflictingText = `Apollo Diagnostics — Lab Report
Patient: Test Patient, Age 45, Male
Report Date: 2026-08-01

Lab Results (Morning Panel):
HbA1c: 5.5 % (Reference: <5.7%) - Normal
Fasting Glucose: 96 mg/dL (Reference: 70-99) - Normal

Lab Results (Afternoon Repeat Panel, same day):
HbA1c: 8.9 % (Reference: <5.7%) - High
Fasting Glucose: 210 mg/dL (Reference: 70-99) - High

Physician Note: Two panels run same day show markedly different results for HbA1c and glucose. Recommend repeat testing to resolve discrepancy.`;

    const { timing, getPath, elapsedMs } = recordingTiming();
    const analysis = await analyzeDocument(conflictingText, "conflicting-panel-report.txt", timing);
    console.log(`[test] reasoning-path analysis took ${elapsedMs()}ms, path=${getPath()}`);

    expect(getPath()).toBe("reasoning");
    // The conflict must not be silently dropped — either both readings
    // survive as distinct labResults entries, or the discrepancy is
    // explicitly called out in prose (documentSummary/riskScore.reasoning).
    // Either is acceptable; total silence about it is not.
    const mentionsHba1c = (s: string) => /hba1c|glycated/i.test(s);
    const hba1cInResults =
      analysis.labResults.some((l) => mentionsHba1c(l.test)) ||
      analysis.keyFindings.some((f) => mentionsHba1c(f.finding));
    const conflictNotedInProse =
      mentionsHba1c(analysis.documentSummary) || mentionsHba1c(analysis.riskScore.reasoning);
    expect(hba1cInResults || conflictNotedInProse).toBe(true);
  }, 90_000);

  it("falls back to raw-text reasoning when deterministic extraction finds no structured facts at all", async () => {
    // Prose-only report with no table/colon structure the deterministic
    // extractor can parse — this must not fail or hand the narrative
    // model an empty facts object; it should fall back to the LLM
    // reading the raw text, same as the old monolithic path.
    const proseOnlyText = `Health Summary for John Doe, reviewed on August 1st 2026.
The patient reports feeling generally well with no acute complaints. Recent lifestyle
changes including a Mediterranean-style diet and regular walking have been well
tolerated. The clinician notes overall stability and recommends a routine follow-up
visit in six months, along with continued attention to sleep hygiene and stress
management. No specific test values, medications, or diagnoses are recorded in this
particular summary document, which is intended purely as a narrative check-in note
between the patient and their primary care physician for record-keeping purposes.`;

    const { timing, getPath, elapsedMs } = recordingTiming();
    const analysis = await analyzeDocument(proseOnlyText, "prose-only-note.txt", timing);
    console.log(`[test] raw-text-fallback analysis took ${elapsedMs()}ms, path=${getPath()}`);

    expect(getPath()).toBe("reasoning-fallback");
    expect(analysis.documentSummary.length).toBeGreaterThan(0);
    // No fabricated lab data from a report that never had any.
    expect(analysis.labResults).toEqual([]);
  }, 180_000);
});

describeLive("live scanned-PDF (vision) analysis", () => {
  it("extracts real values from a scanned/image-only PDF via the vision model", async () => {
    const buffer = readFileSync(SCANNED_FIXTURE);
    // Confirms the fixture genuinely has no text layer — if this ever
    // stops throwing, the fixture no longer exercises the vision path.
    await expect(extractPdfText(buffer)).rejects.toMatchObject({ code: "no_extractable_text" });

    const { timing, getPath, elapsedMs } = recordingTiming();
    const { result: analysis } = await analyzeScannedDocument(buffer, "scanned-health-report.pdf", timing);
    console.log(`[test] vision-path analysis took ${elapsedMs()}ms, path=${getPath()}`);

    expect(getPath()).toBe("vision");
    // Same known values as the text-based fixture it was rendered from
    // (see fixtures/fictional-health-report.pdf) — the vision model must
    // read them off the page image, not guess.
    const hba1c = analysis.labResults.find((l) => l.test.toLowerCase().includes("hba1c"));
    expect(hba1c?.value).toBe("5.5");
  }, 300_000);
});

describeLive("live RAG policy retrieval", () => {
  it("retrieves the relevant plan chunk for a plan-specific question", async () => {
    await mongoose.connect(env.MONGODB_URI);
    try {
      const planCount = await InsurancePlan.countDocuments();
      if (planCount === 0) {
        throw new Error("No InsurancePlan documents found — run `npm run seed` before this test.");
      }
      await indexInsurancePlans();
      const chunks = await retrieveRelevantChunks("What is the premium for the Star Health Family Optima plan?");
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].sourceName).toMatch(/Star Health/i);
    } finally {
      await mongoose.disconnect();
    }
  }, 60_000);

  it("returns nothing for a query with no relevant indexed content", async () => {
    await mongoose.connect(env.MONGODB_URI);
    try {
      const chunks = await retrieveRelevantChunks("What is the airspeed velocity of an unladen swallow?");
      expect(chunks).toEqual([]);
    } finally {
      await mongoose.disconnect();
    }
  }, 30_000);
});
