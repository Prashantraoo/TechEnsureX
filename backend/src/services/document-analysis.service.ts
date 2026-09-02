// ─── TechEnsureX — Document Analysis Service ────────────
// Turns the REAL extracted text of an uploaded medical/insurance report
// into a compact, Zod-validated structured result.
//
// HYBRID EXTRACTION ARCHITECTURE (see the latency audit that motivated
// this — the fast Nemotron model turned out to burn 40-90s of hidden
// reasoning tokens just to TRANSCRIBE a lab table it could read
// mechanically). The facts a report actually contains — lab values,
// units, reference ranges, medications, patient details — don't need an
// LLM at all; they're extracted deterministically by regex
// (deterministic-extraction.service.ts). The LLM's job shrinks to what
// actually needs judgment: writing the summary, risk narrative, and
// recommendations FROM those facts.
//
//   PDF text → deterministic extraction (no LLM) → compact facts JSON
//            → MODELS.chat writes summary/risk/recommendations only
//            → merge facts + narrative → Zod validate → response
//
//   REASONING PATH (conditional, rare): triggered by deterministic
//   signals (conflicting values, many abnormal findings), a failed fast
//   narrative, or the narrative itself flagging real ambiguity. Always
//   given the compact facts, never the raw report text.
//
//   RAW-TEXT FALLBACK (rarest): only when deterministic extraction finds
//   essentially nothing in a non-trivial report — the layout doesn't
//   match the patterns the extractor handles — so there's no reliable
//   "facts" to hand the narrative model at all.

import { z } from "zod";
import { chatCompletionStream, MODELS, AiServiceError, type ChatMessage } from "./nvidia.js";
import { tryParseJsonObject } from "./json-repair.js";
import { withBoundedRetry } from "./retry.js";
import { extractDeterministicFacts, type DeterministicExtraction, type DeterministicLabResult } from "./deterministic-extraction.service.js";

const findingStatus = z.enum(["normal", "high", "low", "abnormal", "unknown"]);
// Whether we're confident this result's value AND its normal/high/low
// classification are both trustworthy. "uncertain" means: the value was
// found, but its relationship to a reference range couldn't be reliably
// established (missing/unparseable range, unrecognized unit, or the
// source text itself was ambiguous) — never a signal about the patient's
// health, only about how sure the extraction is.
const confidenceLevel = z.enum(["verified", "uncertain"]);

const DocumentAnalysisSchema = z.object({
  documentSummary: z.string(),
  patientDetails: z.object({
    name: z.string(),
    age: z.string(),
    sex: z.string(),
    reportDate: z.string(),
  }),
  keyFindings: z.array(
    z.object({ finding: z.string(), value: z.string(), status: findingStatus, confidence: confidenceLevel })
  ),
  medications: z.array(z.string()),
  // Only diagnoses the report explicitly states as such (a labeled
  // "Diagnosis:"/"Diagnoses:" section, or — in the raw-text/vision paths
  // — language the model judges unambiguously states a diagnosis).
  // Never inferred from a lab test name or reference-range text.
  diagnoses: z.array(z.string()),
  // Conditions/terms that appear somewhere in the report (e.g. named in a
  // test panel, a reference-range label, or passing narrative text) but
  // are NOT stated as an actual diagnosis — shown separately, always
  // labeled as needing verification, never merged into `diagnoses`.
  ambiguousDiagnoses: z.array(z.string()).default([]),
  labResults: z.array(
    z.object({
      test: z.string(),
      value: z.string(),
      unit: z.string(),
      referenceRange: z.string(),
      status: findingStatus,
      confidence: confidenceLevel,
      // Human-readable reason this result is uncertain — present only
      // when confidence === "uncertain".
      note: z.string().optional(),
    })
  ),
  // score is null when there isn't enough reliably-extracted data to
  // responsibly assess risk — this must NEVER be defaulted to 0. A score
  // of 0 asserts "verified minimal risk"; null means "we don't know",
  // which is a completely different claim and the only honest one when
  // the underlying facts are too sparse or too uncertain.
  riskScore: z.object({ score: z.number().min(0).max(100).nullable(), reasoning: z.string() }),
  recommendations: z.array(z.string()),
  disclaimer: z.string(),
});

export type DocumentAnalysisResult = z.infer<typeof DocumentAnalysisSchema>;
export type FindingStatus = z.infer<typeof findingStatus>;
export type ConfidenceLevel = z.infer<typeof confidenceLevel>;

// The LLM's entire job now — derived from the full schema via .pick()
// rather than hand-duplicated, so the two can never drift apart.
const NarrativeSchema = DocumentAnalysisSchema.pick({
  documentSummary: true,
  riskScore: true,
  recommendations: true,
  disclaimer: true,
});
type NarrativeResult = z.infer<typeof NarrativeSchema>;

const DEFAULT_DISCLAIMER =
  "This is an AI-generated summary of the uploaded report, not a medical diagnosis. Consult a qualified healthcare professional and your insurer before making any decisions.";

const NARRATIVE_RESPONSE_SHAPE = `{
  "documentSummary": string,
  "riskScore": { "score": number (0-100) OR null, "reasoning": string },
  "recommendations": [string],
  "disclaimer": string
}`;

const RISK_SCORE_RULE = `RISK SCORE — read this carefully: "score" must be a number 0-100 ONLY when the facts JSON gives you enough verified, reliable data to genuinely support a risk read (e.g. real lab values with a known normal/high/low classification, or explicit diagnoses/medications). If the facts are too sparse, too uncertain (most lab results marked confidence "uncertain"), or you would otherwise be guessing, set "score" to the JSON value null — not the number 0. A score of 0 is a specific medical claim ("verified minimal risk"); null means "not enough reliable data to say", which is a completely different statement. Never use 0 as a stand-in for "unknown" or "not applicable". When score is null, "reasoning" must explain plainly that some required values could not be reliably extracted or verified from this report.`;

const NARRATIVE_GROUNDING_RULES = `GROUNDING RULE: the facts JSON you're given (lab results, medications, diagnoses, patient details) was extracted directly from the report — it is the ONLY source of information you have. You do NOT have the original PDF or report text, and must not act as if you do: do not re-extract, re-read, or reinterpret anything beyond what's in the facts JSON, and do not guess at what the original document might have said. Treat every value in the facts JSON as ground truth — do not restate it differently, do not change any value/unit/reference range, and do not add lab results, medications, or diagnoses that aren't in it. Your job is ONLY to write about what's there: a summary, a risk assessment, and recommendations.

CONFIDENCE: some lab results in the facts JSON are marked confidence "uncertain" — this means the extraction itself is unsure of the value's relationship to a normal range, not that anything is wrong with the patient. Do not treat an "uncertain" result as more or less concerning than its status suggests; if you mention it, say plainly that it needs verification against the original report rather than presenting it as a confirmed finding.

${RISK_SCORE_RULE}

UNKNOWN FIELDS: any patientDetails field with the literal value "unknown" means that information was not found in the report. You MUST NOT state, infer, guess, imply, or work around a value for it in any way — not a specific age, not a range, not a euphemism ("adult", "an individual" is fine; "a 35-year-old" or "middle-aged" is not). This applies to every kind of patient detail, not just age: never invent a gender, diagnosis, medication, lab value, date, referring provider/physician, or any other patient information that isn't explicitly present in the facts JSON. If the facts JSON has nothing for a category (e.g. an empty diagnoses array), say so plainly rather than filling the gap.

Clearly distinguish FACTS (the labResults/medications/diagnoses you were given — never alter these) from YOUR INTERPRETATION (documentSummary, riskScore.reasoning, and recommendations, which are your own analysis, not the document's content). Never state a diagnosis the facts don't support, never claim certainty beyond what a lab value + reference range shows, and never infer a disease from a single abnormal value.

Keep the narrative concise — this is a summary, not a restatement of every fact.`;

// ─── FAST NARRATIVE (MODELS.chat, given compact facts) ──
const FAST_NARRATIVE_SYSTEM_PROMPT = `detailed thinking off

You are EnsureAI's document summary mode for TechEnsureX, an Indian medical insurance platform. You are given a compact JSON of facts already extracted from a medical report — NOT the report itself.

${NARRATIVE_GROUNDING_RULES}

Respond with ONLY a single JSON object — no markdown code fences, no commentary before or after — matching exactly this shape:
${NARRATIVE_RESPONSE_SHAPE}

The "disclaimer" field must state that this is an AI-generated summary of the uploaded report, not a medical diagnosis, and that the user should consult a qualified healthcare professional and their insurer for decisions.

Be concise:
- documentSummary: at most 3 sentences covering the overall picture.
- riskScore.reasoning: at most 2 sentences, considering the abnormal findings together, not just individually.
- recommendations: at most 6 short, one-sentence items.
- If the facts JSON itself contains something that looks like a genuine contradiction (e.g. the same test appearing twice with very different values), say so plainly in documentSummary in one sentence — this is read by an automated check.`;

const FAST_NARRATIVE_REPAIR_SYSTEM_PROMPT = `detailed thinking off

The previous response was supposed to be a single JSON object matching a specific schema but was not valid JSON, or didn't match the schema. Return ONLY the corrected JSON object — no markdown fences, no commentary.`;

// ─── REASONING NARRATIVE (MODELS.reasoning, given the SAME compact facts) ─
// Deliberately takes the same compact facts JSON as the fast path, not
// the raw report — the whole point of this tier is a small, fast call on
// the big model even when it's needed.
const REASONING_NARRATIVE_SYSTEM_PROMPT = `detailed thinking off

You are EnsureAI's document review mode for TechEnsureX, an Indian medical insurance platform. You are given a compact JSON of facts extracted from a medical report — NOT the report itself — that an automated check flagged as needing a closer read (conflicting values, many abnormal findings together, or a failed first attempt). Write the summary/risk/recommendations with that complexity specifically in mind: if the facts contain what look like conflicting readings for the same test, address the discrepancy directly in documentSummary rather than ignoring it or silently picking one.

${NARRATIVE_GROUNDING_RULES}

Respond with ONLY a single JSON object — no markdown code fences, no commentary before or after — matching exactly this shape:
${NARRATIVE_RESPONSE_SHAPE}

The "disclaimer" field must state that this is an AI-generated summary, not a medical diagnosis, and that the user should consult a qualified healthcare professional and their insurer for decisions.`;

// ─── RAW-TEXT FALLBACK (MODELS.reasoning, full extraction) ──
// Used only when deterministic extraction found essentially nothing in a
// non-trivial report — this is the old monolithic behavior, kept as a
// safety net for report layouts the regex extractor doesn't handle.
const RAW_TEXT_FALLBACK_SYSTEM_PROMPT = `detailed thinking off

You are EnsureAI's document analysis mode for TechEnsureX, an Indian medical insurance platform. Deterministic extraction could not reliably parse this report's layout, so you are analyzing the original document text directly.

The user message contains the ACTUAL extracted text content of a medical or insurance report. It is real document content — analyze THAT CONTENT specifically. Never respond by saying you don't have the document text; the text is right there in the user message.

GROUNDING RULE — this is the most important instruction: every value you report must come from the supplied content. If a specific field isn't mentioned, use "unknown" (or an empty array) for it. Never invent, estimate, or infer a name, value, medication, or diagnosis that isn't actually present.

CONFIDENCE: for every lab result, set "confidence" to "verified" only if the value's relationship to a normal range is clearly stated or computable from the text (a disclosed reference range, or an explicit "Normal"/"High"/"Low"/"Abnormal" label next to it). Set it to "uncertain" if you can read a value but can't reliably tell whether it's in range — e.g. the reference range is missing, garbled, or the text around the result is ambiguous — and set "status" to "unknown" in that case. When confidence is "uncertain", add a short "note" explaining specifically why (e.g. "No reference range found for this result in the source text."). Never upgrade an uncertain extraction to "verified" just because a value looks plausible.

DIAGNOSES: put a condition in "diagnoses" ONLY if the report explicitly states it as a diagnosis (e.g. a labeled "Diagnosis:"/"Impression:" line, or a sentence unambiguously stating the patient has been diagnosed with something). If a condition is only named in passing — as a test panel name, a reference-range label ("Anemia: <11 g/dL"), or vague/uncertain phrasing — put that exact phrase in "ambiguousDiagnoses" instead, never in "diagnoses". When genuinely unsure which bucket applies, use "ambiguousDiagnoses".

${RISK_SCORE_RULE}

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

The "disclaimer" field must state that this is an AI-generated summary of the uploaded report, not a medical diagnosis, and that the user should consult a qualified healthcare professional and their insurer for decisions. Use "unknown" for any patientDetails field not present in the text. Use ₹ for any monetary amounts. Be concise in prose fields; labResults may include every test result from the report.`;

const RAW_TEXT_REPAIR_SYSTEM_PROMPT = `detailed thinking off

The previous response was supposed to be a single JSON object matching a specific schema but was not valid JSON, or didn't match the schema. Return ONLY the corrected JSON object — no markdown fences, no commentary. Keep every value grounded in the original report text; if you're unsure of a field, use "unknown" or an empty array rather than guessing.`;

// Safe-to-log error summary — code/name only, never the error's own
// message in case some future error class embeds request content in it.
function describeErrorCode(error: unknown): string {
  if (error instanceof AiServiceError) return error.code;
  if (error instanceof Error) return error.name;
  return "unknown_error";
}

export interface AnalysisTiming {
  mark(label: string): void;
  setPath(path: "fast" | "reasoning" | "reasoning-fallback" | "vision"): void;
}

/**
 * Analyzes the REAL extracted text of an uploaded medical/insurance
 * report and returns a Zod-validated structured result. Deterministic
 * regex extraction handles the facts; MODELS.chat writes the narrative
 * from those facts; MODELS.reasoning is used only when warranted (see
 * shouldEscalateFromFacts) and only ever sees the compact facts, never
 * the raw report. Throws AiServiceError ("malformed_response") only if
 * every available path fails — never falls back to fabricated data.
 */
export async function analyzeDocument(
  extractedText: string,
  fileName: string,
  timing?: AnalysisTiming
): Promise<DocumentAnalysisResult> {
  timing?.mark("deterministicExtractionStart");
  const facts = extractDeterministicFacts(extractedText);
  timing?.mark("deterministicExtractionComplete");

  const foundNothing = facts.labResults.length === 0 && facts.medications.length === 0;
  if (foundNothing && extractedText.trim().length > 200) {
    // Deterministic parsing found no structured facts in a non-trivial
    // report — this report's layout doesn't match the patterns the
    // extractor handles. There's nothing reliable to hand the narrative
    // model, so fall back to the LLM reading the raw text directly.
    console.warn("analyzeDocument: deterministic extraction found no structured facts — falling back to raw-text reasoning.");
    timing?.setPath("reasoning-fallback");
    timing?.mark("reasoningStart");
    const result = await runRawTextFallback(extractedText, fileName);
    timing?.mark("reasoningComplete");
    return result;
  }

  const escalation = shouldEscalateFromFacts(facts);
  if (escalation.escalate) {
    console.warn(`analyzeDocument: deterministic signals indicate escalation (${escalation.reasons.join(", ")}) — using reasoning model for narrative.`);
    timing?.setPath("reasoning");
    timing?.mark("reasoningStart");
    const result = await runReasoningNarrativeWithFallback(facts, escalation.reasons);
    timing?.mark("reasoningComplete");
    return result;
  }

  timing?.mark("fastNarrativeStart");
  let narrative: NarrativeResult | null = null;
  try {
    const raw = await runFastNarrative(facts);
    narrative = tryParseAndValidateNarrative(raw);
    if (!narrative) {
      console.warn("analyzeDocument: fast narrative output failed validation, attempting one repair.");
      const repairedRaw = await runFastNarrativeRepair(raw);
      narrative = tryParseAndValidateNarrative(repairedRaw);
    }
  } catch (error) {
    console.warn(`analyzeDocument: fast narrative threw (${describeErrorCode(error)}) — will fall back to reasoning.`);
  }
  timing?.mark("fastNarrativeComplete");

  if (!narrative) {
    console.warn("analyzeDocument: fast narrative failed — escalating to reasoning model.");
    timing?.setPath("reasoning-fallback");
    timing?.mark("reasoningStart");
    const result = await runReasoningNarrativeWithFallback(facts, ["fast_narrative_failed"]);
    timing?.mark("reasoningComplete");
    return result;
  }

  const merged = mergeFactsWithNarrative(facts, narrative);

  if (AMBIGUITY_PATTERN.test(merged.documentSummary) || AMBIGUITY_PATTERN.test(merged.riskScore.reasoning)) {
    console.warn("analyzeDocument: fast narrative flagged ambiguity — escalating to reasoning refinement.");
    timing?.mark("reasoningStart");
    const refined = await runReasoningNarrative(facts, ["model_flagged_ambiguity"]);
    timing?.mark("reasoningComplete");
    if (refined) {
      timing?.setPath("reasoning");
      return mergeFactsWithNarrative(facts, refined);
    }
    // Reasoning pass didn't validate — the fast narrative, while flagged,
    // is still a valid, schema-correct result. Degrade gracefully.
    timing?.setPath("fast");
    return merged;
  }

  timing?.setPath("fast");
  return merged;
}

async function runReasoningNarrativeWithFallback(
  facts: DeterministicExtraction,
  reasons: string[]
): Promise<DocumentAnalysisResult> {
  // Root cause of a real production failure ("The AI service returned an
  // empty response"): a large facts payload (e.g. 100+ labResults from a
  // long multi-page report) can push the reasoning model's hidden
  // chain-of-thought to consume its entire token budget, leaving nothing
  // for the actual answer — chatCompletionStream then throws rather than
  // returning empty-but-valid content. That throw was previously
  // uncaught here, so it escaped all the way to the client as a raw
  // error instead of hitting the graceful, 100%-grounded fallback below.
  // Any failure mode (empty response, timeout, malformed output that
  // even the repair-on-parse step can't fix) now degrades the same way.
  let narrative: NarrativeResult | null = null;
  try {
    narrative = await runReasoningNarrative(facts, reasons);
  } catch (error) {
    console.warn(`analyzeDocument: reasoning narrative threw (${describeErrorCode(error)}) — using minimal fallback narrative.`);
  }
  if (narrative) return mergeFactsWithNarrative(facts, narrative);
  console.warn("analyzeDocument: reasoning narrative also failed validation, using facts with a minimal fallback narrative.");
  return mergeFactsWithNarrative(facts, minimalFallbackNarrative(facts));
}

// Used only if the reasoning model itself fails to produce valid output
// — an extremely rare double-failure. Still 100% grounded (built purely
// from the facts already extracted), just without AI-authored prose.
function minimalFallbackNarrative(facts: DeterministicExtraction): NarrativeResult {
  const abnormalCount = facts.labResults.filter((l) => l.status === "high" || l.status === "low" || l.status === "abnormal").length;
  return {
    documentSummary:
      facts.labResults.length > 0
        ? `Extracted ${facts.labResults.length} lab/vital value(s) from this report; ${abnormalCount} outside the normal range. AI-generated narrative could not be produced for this report.`
        : "AI-generated narrative could not be produced for this report.",
    // null, never 0 — no AI-authored risk read happened here at all, so
    // there is nothing to report a score FOR.
    riskScore: { score: null, reasoning: "Some required values could not be reliably extracted from this report." },
    recommendations: ["Please consult a qualified healthcare professional to review this report."],
    disclaimer: DEFAULT_DISCLAIMER,
  };
}

async function runFastNarrative(facts: DeterministicExtraction): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "system", content: FAST_NARRATIVE_SYSTEM_PROMPT },
    { role: "user", content: buildFactsPrompt(facts) },
  ];
  // disableThinking: verified experimentally (see nvidia.ts) that
  // MODELS.chat's hidden chain-of-thought — not the short narrative
  // output itself — was the actual cost of this call (~11-12s). With it
  // off, the same task measured ~1-3s across repeated live trials.
  // maxTokens/timeouts shrunk accordingly: with no reasoning tokens to
  // budget for, the true output (a few sentences + a short list) doesn't
  // need anywhere near the previous headroom.
  const { content } = await withBoundedRetry(
    () =>
      chatCompletionStream(messages, {
        model: MODELS.chat,
        maxTokens: 800,
        temperature: 0.2,
        softTimeoutMs: 15_000,
        hardTimeoutMs: 25_000,
        disableThinking: true,
      }),
    "runFastNarrative",
    ["network_error", "rate_limited", "empty_response"]
  );
  return content;
}

async function runFastNarrativeRepair(badOutput: string): Promise<string> {
  const repairMessages: ChatMessage[] = [
    { role: "system", content: FAST_NARRATIVE_REPAIR_SYSTEM_PROMPT },
    { role: "user", content: `Schema:\n${JSON.stringify(narrativeSchemaShapeHint)}\n\nYour previous response:\n${badOutput}` },
  ];
  const { content } = await chatCompletionStream(repairMessages, {
    model: MODELS.chat,
    maxTokens: 800,
    temperature: 0.1,
    softTimeoutMs: 15_000,
    hardTimeoutMs: 25_000,
    disableThinking: true,
  });
  return content;
}

async function runReasoningNarrative(
  facts: DeterministicExtraction,
  reasons: string[]
): Promise<NarrativeResult | null> {
  const messages: ChatMessage[] = [
    { role: "system", content: REASONING_NARRATIVE_SYSTEM_PROMPT },
    {
      role: "user",
      content: `Flagged for review because: ${reasons.join(", ")}.\n\n${buildFactsPrompt(facts)}`,
    },
  ];
  // Compact facts in, compact narrative out — even on the 550B model this
  // should be far faster than the old design that sent/regenerated the
  // full report and its full lab table. Large facts payloads (many
  // labResults) can still push this model's hidden reasoning to consume
  // the whole budget and return nothing — "empty_response" is included
  // here (matching runFastExtraction's retry list) so one transient
  // empty response gets a second attempt before the caller falls back.
  const { content } = await withBoundedRetry(
    () =>
      chatCompletionStream(messages, {
        model: MODELS.reasoning,
        maxTokens: 2048,
        temperature: 0.2,
        softTimeoutMs: 45_000,
        hardTimeoutMs: 80_000,
      }),
    "runReasoningNarrative",
    // "upstream_error" is retried HERE but nowhere else: this is the
    // escalated path, so a failure doesn't surface as an error the user
    // can retry — it silently downgrades their report to the minimal
    // fallback narrative. NVIDIA's shared endpoint was measured throwing
    // transient upstream failures from production often enough for that
    // to be a real quality loss, and the retry policy only spends a
    // third attempt when the failures come back fast (see retry.ts), so
    // a genuinely bad request costs a few hundred milliseconds.
    ["network_error", "rate_limited", "empty_response", "upstream_error"]
  );
  return tryParseAndValidateNarrative(content);
}

function buildFactsPrompt(facts: DeterministicExtraction): string {
  const compact = {
    patientDetails: facts.patientDetails,
    labResults: facts.labResults,
    medications: facts.medications,
    diagnoses: facts.diagnoses,
  };
  let prompt = `Facts extracted from the report:\n${JSON.stringify(compact)}`;
  if (facts.additionalNotes) {
    prompt += `\n\nAdditional short notes from the report (medical history section, not lab data):\n${facts.additionalNotes}`;
  }
  return prompt;
}

async function runRawTextFallback(extractedText: string, fileName: string): Promise<DocumentAnalysisResult> {
  const messages: ChatMessage[] = [
    { role: "system", content: RAW_TEXT_FALLBACK_SYSTEM_PROMPT },
    {
      role: "user",
      content: `Here is the extracted text content of the uploaded report (filename: ${fileName}). Analyze this actual content and return the JSON object described in your instructions.\n\n--- BEGIN EXTRACTED REPORT TEXT ---\n${extractedText}\n--- END EXTRACTED REPORT TEXT ---`,
    },
  ];
  const { content } = await withBoundedRetry(
    () =>
      chatCompletionStream(messages, {
        model: MODELS.reasoning,
        maxTokens: 4096,
        temperature: 0.2,
        softTimeoutMs: 100_000,
        hardTimeoutMs: 170_000,
      }),
    "runRawTextFallback"
  );

  let result = tryParseAndValidate(content);
  if (result) return result;

  console.warn("analyzeDocument: raw-text fallback output failed validation, attempting one repair.");
  const repairMessages: ChatMessage[] = [
    { role: "system", content: RAW_TEXT_REPAIR_SYSTEM_PROMPT },
    { role: "user", content: `Schema:\n${JSON.stringify(zodSchemaShapeHint)}\n\nYour previous response:\n${content}` },
  ];
  const repaired = await chatCompletionStream(repairMessages, {
    model: MODELS.reasoning,
    maxTokens: 4096,
    temperature: 0.1,
    softTimeoutMs: 60_000,
    hardTimeoutMs: 90_000,
  });

  result = tryParseAndValidate(repaired.content);
  if (!result) {
    console.warn(`analyzeDocument: raw-text fallback repair also failed validation (${repaired.content.length} chars).`);
    throw new AiServiceError(
      "The AI's response couldn't be understood. Please try again.",
      "malformed_response"
    );
  }
  return result;
}

// ─── Escalation (deterministic-level, pre-narrative) ─────
const ABNORMAL_STATUSES = new Set<FindingStatus>(["high", "low", "abnormal"]);
// Deliberately narrow to terms that imply two things actually disagree —
// "unclear"/"ambiguous" were tried first and dropped: models use those
// words routinely as generic hedging even in ordinary, unremarkable
// reports, which fired this on reports with nothing actually wrong.
const AMBIGUITY_PATTERN = /\bconflicting\b|\bdiscrepan|\bcontradictory\b|\binconsistent\b/i;
// A couple of mildly elevated lipids plus one soft finding is a
// completely ordinary "generally stable" profile, not something needing
// a second model's contextual read. The threshold is for when the
// cluster is large enough that reading the findings together matters.
const ABNORMAL_COUNT_THRESHOLD = 5;

export interface EscalationCheck {
  escalate: boolean;
  reasons: string[];
}

/**
 * Pure, deterministic check on the EXTRACTED FACTS (not a model call, not
 * even the narrative yet) deciding whether this report needs the
 * reasoning model. Exported for unit testing in isolation.
 */
export function shouldEscalateFromFacts(facts: DeterministicExtraction): EscalationCheck {
  const reasons: string[] = [];

  const byTest = new Map<string, Set<string>>();
  for (const lab of facts.labResults) {
    const key = lab.test.trim().toLowerCase();
    if (!key) continue;
    const values = byTest.get(key) ?? new Set<string>();
    values.add(lab.value.trim());
    byTest.set(key, values);
  }
  const hasConflictingValues = [...byTest.values()].some((values) => values.size > 1);
  if (hasConflictingValues) reasons.push("conflicting_lab_values");

  const abnormalCount = facts.labResults.filter((l) => ABNORMAL_STATUSES.has(l.status)).length;
  if (abnormalCount >= ABNORMAL_COUNT_THRESHOLD) reasons.push("multiple_abnormal_findings");

  return { escalate: reasons.length > 0, reasons };
}

// keyFindings is a curated view of labResults (the clinically notable
// ones, plus anything uncertain enough to need verification) — computed
// directly from the deterministic facts, not asked of any model, since
// it's a mechanical filter/cap, not a judgment call. Unlike the old
// "abnormal only" filter, this now includes normal results too — a card
// grid that ONLY ever shows problems reads as alarming-by-omission and
// hides the (equally real) reassuring values.
const MAX_KEY_FINDINGS = 8;

function keyFindingPriority(l: DeterministicLabResult): number {
  if (ABNORMAL_STATUSES.has(l.status)) return 0; // needs attention
  if (l.confidence === "uncertain") return 1; // needs verification
  return 2; // within reported range
}

function computeKeyFindings(labResults: DeterministicLabResult[]): DocumentAnalysisResult["keyFindings"] {
  return [...labResults]
    .sort((a, b) => keyFindingPriority(a) - keyFindingPriority(b))
    .slice(0, MAX_KEY_FINDINGS)
    .map((l) => ({
      finding: l.test,
      value: l.unit ? `${l.value} ${l.unit}` : l.value,
      status: l.status,
      confidence: l.confidence,
    }));
}

// Whether the extracted facts actually contain enough to responsibly
// support a risk read at all — independent of what the narrative model
// claims. A report with zero verified lab values, zero diagnoses, and
// zero medications gives no honest basis for ANY score, so this always
// wins over the model's own riskScore regardless of what it returned;
// see the CRITICAL requirement this enforces (never show a fabricated
// score, especially never 0, when there's nothing reliable to base it on).
function hasReliableRiskSignal(facts: DeterministicExtraction): boolean {
  const verifiedLabs = facts.labResults.filter((l) => l.confidence === "verified").length;
  return verifiedLabs > 0 || facts.diagnoses.length > 0 || facts.medications.length > 0;
}

const INSUFFICIENT_DATA_REASONING = "Some required values could not be reliably extracted from this report.";

function mergeFactsWithNarrative(facts: DeterministicExtraction, narrative: NarrativeResult): DocumentAnalysisResult {
  const riskScore = hasReliableRiskSignal(facts)
    ? narrative.riskScore
    : { score: null, reasoning: INSUFFICIENT_DATA_REASONING };
  return {
    documentSummary: narrative.documentSummary,
    patientDetails: facts.patientDetails,
    keyFindings: computeKeyFindings(facts.labResults),
    medications: facts.medications,
    diagnoses: facts.diagnoses,
    ambiguousDiagnoses: [], // deterministic extraction only ever produces explicit diagnoses
    labResults: facts.labResults,
    riskScore,
    recommendations: narrative.recommendations,
    disclaimer: narrative.disclaimer,
  };
}

const narrativeSchemaShapeHint = {
  documentSummary: "string",
  riskScore: { score: "number 0-100 or null", reasoning: "string" },
  recommendations: ["string"],
  disclaimer: "string",
};

export const zodSchemaShapeHint = {
  documentSummary: "string",
  patientDetails: { name: "string", age: "string", sex: "string", reportDate: "string" },
  keyFindings: [{ finding: "string", value: "string", status: "normal|high|low|abnormal|unknown", confidence: "verified|uncertain" }],
  medications: ["string"],
  diagnoses: ["string"],
  ambiguousDiagnoses: ["string"],
  labResults: [{ test: "string", value: "string", unit: "string", referenceRange: "string", status: "normal|high|low|abnormal|unknown", confidence: "verified|uncertain", note: "string (optional)" }],
  riskScore: { score: "number 0-100 or null", reasoning: "string" },
  recommendations: ["string"],
  disclaimer: "string",
};

// Exported so vision-analysis.service.ts can validate against the exact
// same schema instead of duplicating this logic.
export function tryParseAndValidate(raw: string): DocumentAnalysisResult | null {
  const parsed = tryParseJsonObject(raw);
  if (!parsed || typeof parsed !== "object") return null;

  const normalized = normalizeForValidation(parsed);
  const result = DocumentAnalysisSchema.safeParse(normalized);
  if (!result.success) return null;

  // Same deterministic safety net as the facts-based paths (see
  // hasReliableRiskSignal / mergeFactsWithNarrative): these paths let the
  // model report labResults/diagnoses/medications directly, so re-check
  // its OWN reported facts here rather than trusting its score in
  // isolation — a model can follow every instruction and still slip.
  const verifiedLabs = result.data.labResults.filter((l) => l.confidence === "verified").length;
  const reliable = verifiedLabs > 0 || result.data.diagnoses.length > 0 || result.data.medications.length > 0;
  if (!reliable && result.data.riskScore.score !== null) {
    return { ...result.data, riskScore: { score: null, reasoning: INSUFFICIENT_DATA_REASONING } };
  }
  return result.data;
}

// Normalizes a model-reported risk score to null-safe form. CRITICAL: the
// safe default for "missing, non-numeric, or otherwise unusable" is null
// (unknown), never 0 — 0 is a specific claim ("verified minimal risk")
// that must only survive when the model actually, deliberately said 0.
function normalizeRiskScore(raw: unknown): number | null {
  if (raw === null) return null;
  const num = Number(raw);
  if (!Number.isFinite(num)) return null;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function tryParseAndValidateNarrative(raw: string): NarrativeResult | null {
  const parsed = tryParseJsonObject(raw);
  if (!parsed || typeof parsed !== "object") return null;

  const p = parsed as any;
  const str = (v: unknown, fallback = "unknown") => (typeof v === "string" && v.trim() !== "" ? v : fallback);
  const strArray = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  const risk = p?.riskScore ?? {};

  const normalized = {
    documentSummary: str(p?.documentSummary, "No summary available."),
    riskScore: {
      score: normalizeRiskScore(risk?.score),
      reasoning: str(risk?.reasoning, INSUFFICIENT_DATA_REASONING),
    },
    recommendations: strArray(p?.recommendations),
    disclaimer: str(p?.disclaimer, "") || DEFAULT_DISCLAIMER,
  };

  const result = NarrativeSchema.safeParse(normalized);
  return result.success ? result.data : null;
}

const VALID_STATUSES = ["normal", "high", "low", "abnormal", "unknown"];
const VALID_CONFIDENCE = ["verified", "uncertain"];

// Backfills any field the model omitted (missing key, wrong type, or an
// out-of-enum status) with a safe default *before* Zod validation, so a
// 95%-complete-but-slightly-off response still passes instead of being
// discarded outright — Zod is the source of truth for what's acceptable,
// this just avoids failing validation over a single missing array. Only
// used by the raw-text fallback path now (the fast/reasoning narrative
// paths use tryParseAndValidateNarrative instead — their labResults etc.
// come from deterministic extraction, not the model).
function normalizeForValidation(parsed: any): unknown {
  const pd = parsed?.patientDetails ?? {};
  const risk = parsed?.riskScore ?? {};
  const str = (v: unknown, fallback = "unknown") => (typeof v === "string" && v.trim() !== "" ? v : fallback);
  const strArray = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  const status = (v: unknown) => (typeof v === "string" && VALID_STATUSES.includes(v) ? v : "unknown");
  // A model that doesn't understand/omits confidence entirely is treated
  // as uncertain, not verified — the safe direction to default a missing
  // signal is toward "needs verification", never toward false confidence.
  const confidence = (v: unknown) => (typeof v === "string" && VALID_CONFIDENCE.includes(v) ? v : "uncertain");

  return {
    documentSummary: str(parsed?.documentSummary, "No summary available."),
    patientDetails: {
      name: str(pd.name),
      age: str(pd.age),
      sex: str(pd.sex),
      reportDate: str(pd.reportDate),
    },
    keyFindings: Array.isArray(parsed?.keyFindings)
      ? parsed.keyFindings.map((f: any) => ({
          finding: str(f?.finding, ""),
          value: str(f?.value, ""),
          status: status(f?.status),
          confidence: confidence(f?.confidence),
        }))
      : [],
    medications: strArray(parsed?.medications),
    diagnoses: strArray(parsed?.diagnoses),
    ambiguousDiagnoses: strArray(parsed?.ambiguousDiagnoses),
    labResults: Array.isArray(parsed?.labResults)
      ? parsed.labResults.map((l: any) => {
          const c = confidence(l?.confidence);
          const note = str(l?.note, "");
          return {
            test: str(l?.test, ""),
            value: str(l?.value, ""),
            unit: str(l?.unit, ""),
            referenceRange: str(l?.referenceRange, ""),
            status: status(l?.status),
            confidence: c,
            ...(c === "uncertain" && note ? { note } : {}),
          };
        })
      : [],
    riskScore: {
      score: normalizeRiskScore(risk?.score),
      reasoning: str(risk?.reasoning, INSUFFICIENT_DATA_REASONING),
    },
    recommendations: strArray(parsed?.recommendations),
    disclaimer: str(parsed?.disclaimer, "") || DEFAULT_DISCLAIMER,
  };
}

// Renders the structured result as readable text for surfaces that only
// display a plain string (e.g. the dashboard quick-scan widget), so
// nothing that already consumes DocumentScan.aiAnalysis has to change.
export function formatAnalysisAsText(a: DocumentAnalysisResult): string {
  const lines: string[] = [`**Document Summary**\n${a.documentSummary}`];

  const pd = a.patientDetails;
  if (pd.name !== "unknown" || pd.age !== "unknown" || pd.sex !== "unknown" || pd.reportDate !== "unknown") {
    lines.push(
      `\n**Patient Details**\nName: ${pd.name}\nAge: ${pd.age}\nSex: ${pd.sex}\nReport date: ${pd.reportDate}`
    );
  }
  if (a.keyFindings.length) {
    lines.push(
      `\n**Key Findings**\n${a.keyFindings
        .map((f) => `- ${f.finding}: ${f.value} (${f.status}${f.confidence === "uncertain" ? ", needs verification" : ""})`)
        .join("\n")}`
    );
  }
  if (a.labResults.length) {
    lines.push(
      `\n**Lab Results**\n${a.labResults
        .map((l) => `- ${l.test}: ${l.value} ${l.unit}${l.referenceRange ? ` (ref: ${l.referenceRange})` : ""} — ${l.status}${l.confidence === "uncertain" ? " (needs verification)" : ""}`)
        .join("\n")}`
    );
  }
  if (a.diagnoses.length) lines.push(`\n**Diagnoses mentioned in report**\n${a.diagnoses.map((d) => `- ${d}`).join("\n")}`);
  if (a.ambiguousDiagnoses.length) {
    lines.push(`\n**Potentially referenced — requires verification**\n${a.ambiguousDiagnoses.map((d) => `- ${d}`).join("\n")}`);
  }
  if (a.medications.length) lines.push(`\n**Medications**\n${a.medications.map((m) => `- ${m}`).join("\n")}`);
  lines.push(
    a.riskScore.score === null
      ? `\n**Risk Assessment**: Not enough reliable data\n${a.riskScore.reasoning}`
      : `\n**Risk Score**: ${a.riskScore.score}/100\n${a.riskScore.reasoning}`
  );
  if (a.recommendations.length) {
    lines.push(`\n**Recommendations**\n${a.recommendations.map((r) => `- ${r}`).join("\n")}`);
  }
  lines.push(`\n_${a.disclaimer}_`);
  return lines.join("\n");
}

// Renders the structured result as a compact grounding block for chat
// follow-up questions ("what is my HbA1c?" after upload) — see
// ai.service.ts's document-context wiring. Deliberately terse: this gets
// prepended to chat context, so it shouldn't itself bloat every message.
export function formatAnalysisAsContext(a: DocumentAnalysisResult, fileName: string): string {
  const lines: string[] = [`Uploaded report: ${fileName}`, a.documentSummary];
  if (a.labResults.length) {
    lines.push(
      `Lab results: ${a.labResults.map((l) => `${l.test}=${l.value}${l.unit ? " " + l.unit : ""} (${l.status})`).join("; ")}`
    );
  }
  if (a.keyFindings.length) {
    lines.push(`Key findings: ${a.keyFindings.map((f) => `${f.finding}=${f.value} (${f.status})`).join("; ")}`);
  }
  if (a.medications.length) lines.push(`Medications: ${a.medications.join("; ")}`);
  if (a.diagnoses.length) lines.push(`Diagnoses: ${a.diagnoses.join("; ")}`);
  return lines.join("\n");
}
