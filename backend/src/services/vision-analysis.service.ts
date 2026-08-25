// ─── TechEnsureX — Scanned/Image-Only PDF Analysis ──────
// Fallback path used ONLY when pdf.service.ts's native text extraction
// finds no usable text layer (a scanned/photographed report). Renders
// each page to an image (pdf-render.service.ts) and sends them to the
// configured NVIDIA vision-capable model, reusing the exact same Zod
// schema, JSON-repair, and grounding rules as the text paths in
// document-analysis.service.ts — the DocumentAnalysisResult shape (and
// therefore every downstream consumer) is identical regardless of which
// path produced it.

import { visionCompletion, AiServiceError } from "./nvidia.js";
import { renderPdfPagesToImages, type RenderedPage } from "./pdf-render.service.js";
import { withBoundedRetry } from "./retry.js";
import {
  tryParseAndValidate,
  zodSchemaShapeHint,
  type DocumentAnalysisResult,
  type AnalysisTiming,
} from "./document-analysis.service.js";

const VISION_EXTRACTION_SYSTEM_PROMPT = `detailed thinking off

You are EnsureAI's document extraction mode for TechEnsureX, an Indian medical insurance platform. You are given one or more images of pages from a scanned medical or insurance report — read the visible text in the images directly; there is no separate text version of this document.

GROUNDING RULE — this is the most important instruction: every value you report must come from what's actually visible/legible in the image(s). If a specific field isn't visible or you can't read it clearly, use "unknown" (or an empty array) for it. Never invent, estimate, or infer a name, value, medication, or diagnosis you can't actually read. If text is blurry, cut off, or ambiguous, use status "unknown" rather than guessing.

You are NOT diagnosing the patient. You are reporting what the document documents. Keep documented findings clearly separate from your own recommendations.

CONFIDENCE: for every lab result, set "confidence" to "verified" only if the value's relationship to a normal range is clearly legible or computable (a visible reference range, or an explicit "Normal"/"High"/"Low"/"Abnormal" label next to it). Set it to "uncertain" if you can read a value but the range/status isn't clearly legible or is ambiguous — and set "status" to "unknown" in that case. When confidence is "uncertain", add a short "note" explaining why (e.g. "Reference range not clearly legible in the image."). Never upgrade an uncertain reading to "verified" because a value looks plausible.

DIAGNOSES: put a condition in "diagnoses" ONLY if the image explicitly shows it labeled as a diagnosis (e.g. a "Diagnosis:"/"Impression:" line). If a condition is only named in passing — a test panel name, a reference-range label, vague phrasing — put that exact phrase in "ambiguousDiagnoses" instead, never in "diagnoses". When unsure, use "ambiguousDiagnoses".

RISK SCORE: "score" must be a number 0-100 ONLY when you have enough verified, legible data to genuinely support a risk read. If the images are too unclear, too sparse, or you'd otherwise be guessing, set "score" to the JSON value null (never 0 — 0 is a specific claim of verified minimal risk, not a stand-in for "unknown"). When score is null, "reasoning" must explain that some required values could not be reliably read from this scanned report.

Respond with ONLY a single JSON object — no markdown code fences, no commentary before or after — matching exactly this shape:
{
  "documentSummary": string,
  "patientDetails": { "name": string, "age": string, "sex": string, "reportDate": string },
  "keyFindings": [ { "finding": string, "value": string, "status": "normal"|"high"|"low"|"abnormal"|"unknown", "confidence": "verified"|"uncertain" } ],
  "medications": [string],
  "diagnoses": [string],
  "ambiguousDiagnoses": [string],
  "labResults": [ { "test": string, "value": string, "unit": string, "referenceRange": string, "status": "normal"|"high"|"low"|"abnormal"|"unknown", "confidence": "verified"|"uncertain", "note": string (optional, only when confidence is "uncertain") } ],
  "riskScore": { "score": number (0-100) OR null, "reasoning": string },
  "recommendations": [string],
  "disclaimer": string
}

The "disclaimer" field must state that this is an AI-generated summary of a scanned report image, not a medical diagnosis, and that the user should consult a qualified healthcare professional and their insurer for decisions. Use "unknown" for any patientDetails field not legible. Use ₹ for any monetary amounts. Be concise in prose fields; labResults may include every legible test result.`;

const VISION_REPAIR_SYSTEM_PROMPT = `detailed thinking off

The previous response was supposed to be a single JSON object matching a specific schema but was not valid JSON, or didn't match the schema. Return ONLY the corrected JSON object — no markdown fences, no commentary. Keep every value grounded in what was actually visible in the image; if unsure of a field, use "unknown" or an empty array rather than guessing.`;

function buildUserPrompt(fileName: string, pageCount: number, pages: RenderedPage[]): string {
  const pageList = pages.map((p) => p.pageNumber).join(", ");
  return `These are ${pages.length} page image(s) (page ${pageList} of ${pageCount} total) from the scanned report "${fileName}". Extract the structured JSON described in your instructions from what's visible in these images.`;
}

/**
 * Analyzes a scanned/image-only PDF by rendering its pages to images and
 * sending them to the vision-capable model. Returns the exact same
 * DocumentAnalysisResult shape as the text-extraction paths, plus the
 * total page count (so the caller can show "N-page report analyzed"
 * without re-deriving it — this comes from pdf.js's own page count, never
 * from the model). Throws PdfRenderError (propagated from
 * pdf-render.service.ts) for page-count/render failures, or
 * AiServiceError("malformed_response") if the model's output still
 * doesn't validate after one repair attempt.
 */
export async function analyzeScannedDocument(
  pdfBuffer: Buffer,
  fileName: string,
  timing?: AnalysisTiming
): Promise<{ result: DocumentAnalysisResult; pageCount: number }> {
  timing?.mark("visionRenderStart");
  const { pages, pageCount } = await renderPdfPagesToImages(pdfBuffer);
  timing?.mark("visionRenderComplete");

  const images = pages.map((p) => p.pngBuffer);
  const userPrompt = buildUserPrompt(fileName, pageCount, pages);

  timing?.mark("visionRequestStart");
  // Bounded, single retry for a genuinely transient failure (busy
  // service / dropped connection) — same pattern used for chat and fast
  // extraction. Never retries a plain timeout, since that means the
  // model IS responding, just slowly.
  const raw = await withBoundedRetry(() =>
    visionCompletion(VISION_EXTRACTION_SYSTEM_PROMPT, userPrompt, images, {
      maxTokens: 3072,
      temperature: 0.2,
      timeoutMs: 150_000,
      disableThinking: true,
    })
  );

  let result = tryParseAndValidate(raw);
  if (!result) {
    console.warn("analyzeScannedDocument: output failed validation, attempting one repair.");
    // The "reasoning" in this model's name isn't decorative — a repair
    // call with too little budget/time was observed timing out even
    // without images attached, so this gets the same headroom as the
    // primary call rather than the tighter budget a pure-text repair
    // would get on a non-reasoning model.
    const repaired = await visionCompletion(
      VISION_REPAIR_SYSTEM_PROMPT,
      `Schema:\n${JSON.stringify(zodSchemaShapeHint)}\n\nYour previous response:\n${raw}`,
      // No need to re-send the images for a pure JSON-formatting repair.
      [],
      { maxTokens: 3072, temperature: 0.1, timeoutMs: 120_000, disableThinking: true }
    );
    result = tryParseAndValidate(repaired);
  }
  timing?.mark("visionComplete");
  timing?.setPath("vision");

  if (!result) {
    console.warn("analyzeScannedDocument: repair attempt also failed validation.");
    throw new AiServiceError(
      "The AI's response couldn't be understood. Please try again.",
      "malformed_response"
    );
  }
  return { result, pageCount };
}
