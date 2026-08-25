// ─── TechEnsureX — Deterministic Medical-Report Extraction ─
// Regex/heuristic extraction of structured facts (labs, vitals,
// medications, patient details) directly from native PDF text — no LLM
// call. This is the "don't send the whole report to a model just to
// transcribe a table it can already read mechanically" half of the fast
// path: the model's job shrinks to writing a summary/risk narrative from
// these already-extracted facts, not re-extracting them.
//
// Every value returned here is either literally present in the source
// text, or a plain arithmetic derivation from two values that ARE
// present (e.g. classifying 118 as "high" against a disclosed "<100"
// reference range). Nothing is inferred or guessed — anything the
// patterns below can't confidently parse is left out entirely (an empty
// array / "unknown"), per the "leave null/unknown rather than guess" rule.
// Tuned for common lab-report table layouts (colon "Test: value unit
// (Reference: range) - Status" and column "Test  value  unit  range"
// forms); reports with a fundamentally different layout may extract
// little or nothing — that's the signal analyzeDocument uses to fall
// back to LLM-based extraction from raw text instead.

import type { FindingStatus, ConfidenceLevel } from "./document-analysis.service.js";

export interface DeterministicLabResult {
  test: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: FindingStatus;
  // "verified" iff status was determined by real arithmetic against a
  // disclosed numeric range, or an explicit status suffix in the source
  // text ("- Normal", "(High)"). "uncertain" means a value was found but
  // its relationship to a normal range could NOT be reliably established
  // — never a statement about the patient, only about the extraction.
  confidence: ConfidenceLevel;
  // Present only when confidence is "uncertain" — a short, specific
  // reason a user or the UI can show ("no reference range found", etc.)
  // rather than silently guessing or silently dropping the row.
  note?: string;
}

export interface DeterministicExtraction {
  patientDetails: { name: string; age: string; sex: string; reportDate: string };
  labResults: DeterministicLabResult[];
  medications: string[];
  diagnoses: string[];
  // Short, bounded prose pulled from a "Medical History"/"Diagnoses"-type
  // section — the one place free text is passed through, capped, for the
  // LLM narrative step to draw on for anything genuinely not tabular.
  additionalNotes: string;
}

const MAX_NOTES_CHARS = 600;

// pdf.service.ts inserts "-- N of M --" page-break markers into the
// extracted text — never legitimate content in any section, and without
// filtering these out up front they can be misparsed as a table row
// (e.g. "-- 1 of 2 --" tokenizes with a numeric "1").
const PAGE_MARKER = /^--\s*\d+\s+of\s+\d+\s*--$/;

export function extractDeterministicFacts(text: string): DeterministicExtraction {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => !PAGE_MARKER.test(l));
  const headerLines = lines.slice(0, 25).join("\n");

  return {
    patientDetails: extractPatientDetails(headerLines),
    labResults: extractLabResults(lines),
    medications: extractMedications(lines),
    diagnoses: extractDiagnoses(lines),
    additionalNotes: extractAdditionalNotes(lines),
  };
}

// ─── Patient details ─────────────────────────────────────
function extractPatientDetails(headerText: string): DeterministicExtraction["patientDetails"] {
  const name =
    firstMatch(headerText, /Patient\s*Name[:\s]+([^\n,]+)/i) ??
    firstMatch(headerText, /^Patient[:\s]+([^\n,]+)/im) ??
    firstMatch(headerText, /^Name[:\s]+([^\n,]+)/im) ??
    "unknown";

  const age =
    firstMatch(headerText, /Age\s*\/?\s*Sex[:\s]+(\d{1,3})/i) ??
    firstMatch(headerText, /\bAge[:\s]+(\d{1,3})/i) ??
    "unknown";

  const sex =
    firstMatch(headerText, /Age\s*\/?\s*Sex[:\s]+\d{1,3}\s*\/\s*(Male|Female|Other)/i) ??
    firstMatch(headerText, /\bSex[:\s]+(Male|Female|Other)\b/i) ??
    firstMatch(headerText, /\b(Male|Female)\b/i) ??
    "unknown";

  const reportDate =
    firstMatch(headerText, /Report\s*Date[:\s]+([^\n]+)/i) ??
    "unknown";

  return {
    name: cleanValue(name),
    age: cleanValue(age),
    sex: cleanValue(sex),
    reportDate: cleanValue(reportDate),
  };
}

function firstMatch(text: string, pattern: RegExp): string | null {
  const m = text.match(pattern);
  return m ? m[1].trim() : null;
}

function cleanValue(v: string): string {
  const trimmed = v.trim();
  return trimmed.length > 0 && trimmed.length < 100 ? trimmed : "unknown";
}

// ─── Section detection ────────────────────────────────────
type SectionType = "labs" | "medications" | "notes" | "other";

const SECTION_KEYWORDS: Array<{ type: SectionType; prefixes: string[] }> = [
  {
    type: "labs",
    prefixes: [
      "vital signs",
      "vitals",
      "laboratory results",
      "lab results",
      "complete blood count",
      "lipid profile",
      "glucose panel",
      "liver function",
      "kidney function",
      "renal function",
      "blood chemistry",
      "test results",
    ],
  },
  { type: "medications", prefixes: ["current medications", "medications"] },
  { type: "notes", prefixes: ["medical history", "diagnos", "clinical notes"] },
];

// A heading is short, and either numbered ("1. Vital Signs") or a bare
// keyword line ("Vitals") — distinguishing it from a table row (which
// always has a numeric value token) or a prose sentence (usually >60 chars).
function detectSectionType(line: string): SectionType | null {
  const stripped = line.replace(/^\d+[.)]\s*/, "").trim();
  if (stripped.length === 0 || stripped.length > 60) return null;
  const lower = stripped.toLowerCase().replace(/[:\s]+$/, "");
  for (const { type, prefixes } of SECTION_KEYWORDS) {
    if (prefixes.some((p) => lower.startsWith(p))) return type;
  }
  return null;
}

function splitIntoSections(lines: string[]): Map<SectionType, string[]> {
  const sections = new Map<SectionType, string[]>();
  let current: SectionType | null = null;
  for (const line of lines) {
    const detected = detectSectionType(line);
    if (detected) {
      current = detected;
      continue;
    }
    // A new numbered/short heading that ISN'T a known keyword still ends
    // the current section (e.g. "5. Imaging / Clinical Notes").
    if (/^\d+[.)]\s+\S/.test(line) && line.length < 60) {
      current = null;
      continue;
    }
    if (current && line.length > 0) {
      const bucket = sections.get(current) ?? [];
      bucket.push(line);
      sections.set(current, bucket);
    }
  }
  return sections;
}

// ─── Lab / vital results ─────────────────────────────────
// Matches a leading numeric value: integers/decimals, optional leading
// </>, optional systolic/diastolic slash (128/82), optional attached %.
const NUMERIC_TOKEN = /^[<>]?-?\d[\d.,]*(?:\/\d[\d.,]*)?%?$/;

const UNIT_TOKEN = /^(g\/dL|mg\/dL|mg\/L|mmol\/L|mEq\/L|ng\/mL|pg\/mL|µg\/mL|mcg\/mL|IU\/L|mIU\/mL|µIU\/mL|U\/L|IU|%|mmHg|bpm|°F|°C|kg\/m²|kg|cm|mL\/min\/1\.73m²|mL\/min|lakh\/uL|\/uL|cells\/uL|\/µL|fL|pg|g\/L)$/i;

function isUnitToken(token: string): boolean {
  return UNIT_TOKEN.test(token);
}

function extractLabResults(lines: string[]): DeterministicLabResult[] {
  const sections = splitIntoSections(lines);
  const candidateLines = [...(sections.get("labs") ?? [])];

  const results: DeterministicLabResult[] = [];
  for (const line of candidateLines) {
    const parsed = parseLabLine(line);
    if (parsed) results.push(parsed);
  }
  return results;
}

function parseLabLine(rawLine: string): DeterministicLabResult | null {
  const line = rawLine.replace(/^[-•*]\s*/, "").trim();
  if (!line) return null;

  const colonIdx = line.indexOf(":");
  let namePart: string;
  let restPart: string;

  if (colonIdx > 0 && colonIdx < line.length - 1) {
    namePart = line.slice(0, colonIdx).trim();
    restPart = line.slice(colonIdx + 1).trim();
  } else {
    const tokens = line.split(/\s+/);
    // A genuine row's first token is the start of a name, never a value
    // itself — a line that's ALL numbers (e.g. a wrapped reference-range
    // boundary row like "40.0 70.0 100.0 450.0", with the real test name
    // several lines away) has no name at all and must be rejected here,
    // not have its first number mistaken for one.
    if (NUMERIC_TOKEN.test(tokens[0])) return null;
    let valueIdx = -1;
    for (let i = 1; i < tokens.length; i++) {
      if (NUMERIC_TOKEN.test(tokens[i])) {
        valueIdx = i;
        break;
      }
    }
    if (valueIdx === -1) return null;
    namePart = tokens.slice(0, valueIdx).join(" ");
    restPart = tokens.slice(valueIdx).join(" ");
  }

  if (!namePart || namePart.length > 60) return null;
  if (isKnownNonLabLabel(namePart)) return null;
  // A real test/finding name always contains at least one letter (even
  // abbreviated ones — "TSH", "T4", "Ca") — this rejects fragments left
  // over from multi-column layouts that linearize to a lone punctuation
  // mark (e.g. a stray ":" when a label and its colon end up on
  // different rendered lines).
  if (!/[A-Za-z]/.test(namePart)) return null;
  // Genuine names are noun phrases, not mid-sentence prose — reject
  // fragments like "the next 3 months" (from wrapped narrative text
  // elsewhere in the report) that happen to tokenize like a row. Matches
  // only a stopword followed by a SPACE (not just a word boundary) so
  // real abbreviations like "A/G Ratio" ("A" immediately followed by
  // "/") aren't caught by this.
  if (/^(the|a|an|is|are|was|were|this|that|these|those|and|or|but|of|to|in|on|for|with|next|it|you|your)\s/i.test(namePart)) {
    return null;
  }
  return parseValueUnitRefStatus(namePart, restPart);
}

// Administrative/boilerplate labels that can otherwise tokenize exactly
// like a lab row (name, then a numeric-looking value) — e.g. a clinic's
// repeated page header "Phone No: 1860 500 7788", or a leaked table
// header row ("Report Name Your Score"). Checked against the whole
// trimmed name, case-insensitively.
const NON_LAB_LABELS = new Set([
  "phone no",
  "phone",
  "fax",
  "email",
  "website",
  "address",
  "reg no",
  "registration no",
  "report name",
  "your score",
  "acceptable score",
  "score",
  "patient id",
  "lab report id",
  "id",
  "order id",
  "order no",
  "sample id",
  "specimen id",
  "barcode",
  "accession no",
  "collected on",
  "collected at",
  "received on",
  "reported on",
  "processed on",
  "page",
]);

function isKnownNonLabLabel(namePart: string): boolean {
  return NON_LAB_LABELS.has(namePart.trim().toLowerCase());
}

function parseValueUnitRefStatus(namePart: string, restPart: string): DeterministicLabResult | null {
  let rest = restPart.trim();

  // Inline status suffix: "- Normal" / "(High)" at the end. This is the
  // report's OWN stated classification, not something we computed — as
  // trustworthy as a numeric range comparison.
  let status: FindingStatus = "unknown";
  let statusWasExplicit = false;
  const statusSuffix =
    rest.match(/[-–]\s*(Normal|High|Low|Abnormal)\s*$/i) ?? rest.match(/\((Normal|High|Low|Abnormal)\)\s*$/i);
  if (statusSuffix && statusSuffix.index !== undefined) {
    status = statusSuffix[1].toLowerCase() as FindingStatus;
    statusWasExplicit = true;
    rest = rest.slice(0, statusSuffix.index).trim();
  }

  // "(Reference: ...)" or "(Ref: ...)" parenthetical.
  let referenceRange = "";
  const refMatch = rest.match(/\((?:Reference|Ref)[:\s]*([^)]+)\)/i);
  if (refMatch && refMatch.index !== undefined) {
    referenceRange = refMatch[1].trim();
    rest = (rest.slice(0, refMatch.index) + rest.slice(refMatch.index + refMatch[0].length)).trim();
  }

  const tokens = rest.split(/\s+/).filter(Boolean);
  if (tokens.length === 0 || !NUMERIC_TOKEN.test(tokens[0])) return null;

  let value = tokens[0];
  let unit = "";
  let idx = 1;
  if (value.endsWith("%")) {
    unit = "%";
    value = value.slice(0, -1);
  } else if (idx < tokens.length && isUnitToken(tokens[idx])) {
    unit = tokens[idx];
    idx++;
  }

  if (!referenceRange) {
    referenceRange = tokens.slice(idx).join(" ").trim();
  }

  // Whether the trailing text actually LOOKS like a genuine reference
  // range/qualifier — numeric bounds, a comparison operator, or one of a
  // small set of known descriptive categories ("Desirable", "Reactive")
  // — rather than incidental administrative text that happens to
  // tokenize the same way (a phone number, a page marker, a leaked table
  // header). Text that fails this is discarded, never kept as if it were
  // a real reference range.
  const rangeLooksGenuine = referenceRange === "" || isPlausibleReferenceRange(referenceRange);
  if (!rangeLooksGenuine) {
    referenceRange = "";
  }

  if (!statusWasExplicit) {
    status = computeStatusFromRange(value, referenceRange);
  }

  // The value itself is always real (it's literally in the source text).
  // What's uncertain is whether we can say anything trustworthy about
  // where it falls relative to normal — i.e. whenever we couldn't land
  // on a real normal/high/low/abnormal classification. We surface this
  // row either way (never silently drop a real value) but flag it
  // clearly rather than implying a confident reading. See DATA QUALITY
  // handling downstream for how `note` gets shown to the user.
  const confidence: ConfidenceLevel = status === "unknown" ? "uncertain" : "verified";
  let note: string | undefined;
  if (confidence === "uncertain") {
    if (!rangeLooksGenuine) {
      note = "The reference range for this result could not be reliably matched from the source document.";
    } else if (!referenceRange) {
      note = "No reference range was found in the report for this result.";
    } else {
      note = "The reference range format for this result could not be automatically interpreted.";
    }
  }

  return { test: namePart, value, unit, referenceRange, status, confidence, ...(note ? { note } : {}) };
}

// A comparison bound ("<200", ">=40"), a numeric range ("13.5-17.5",
// "13.5 to 17.5"), or one of the handful of descriptive reference
// categories Indian lab reports commonly use instead of numbers. Deliberately
// NOT "contains any letter" (the old rule) — that let genuinely
// unrelated fragments ("Out of", stray words from a linearized table)
// through as if they were real reference text.
const RANGE_COMPARISON = /^[<>]=?\s*-?\d/;
const RANGE_NUMERIC = /-?\d+(?:\.\d+)?\s*(?:[-–]|\bto\b)\s*-?\d+(?:\.\d+)?/i;
const RANGE_DESCRIPTIVE =
  /^(desirable|borderline(?:\s+high)?|optimal|near\s+optimal|normal|abnormal|high|very\s+high|low|very\s+low|elevated|reduced|not\s+applicable|n\/a|na|lab\s+dependent|see\s+note|non-?reactive|reactive|negative|positive|detected|not\s+detected)\.?$/i;

function isPlausibleReferenceRange(referenceRange: string): boolean {
  const trimmed = referenceRange.trim();
  return RANGE_COMPARISON.test(trimmed) || RANGE_NUMERIC.test(trimmed) || RANGE_DESCRIPTIVE.test(trimmed);
}

// Deterministic classification from two disclosed numbers (the value and
// the reference bound) — arithmetic, not inference. Falls back to
// "unknown" for any reference range that isn't a clean numeric
// threshold/range (prose like "Lab dependent" is common and correct to
// leave unclassified).
function computeStatusFromRange(value: string, referenceRange: string): FindingStatus {
  const v = parseFloat(value);
  if (!Number.isFinite(v)) return "unknown";

  const lt = referenceRange.match(/^<\s*(-?\d+(?:\.\d+)?)/);
  if (lt) return v < parseFloat(lt[1]) ? "normal" : "high";

  const gt = referenceRange.match(/^>\s*(-?\d+(?:\.\d+)?)/);
  if (gt) return v > parseFloat(gt[1]) ? "normal" : "low";

  const range = referenceRange.match(/(-?\d+(?:\.\d+)?)\s*(?:[-–]|to)\s*(-?\d+(?:\.\d+)?)/);
  if (range) {
    const lo = parseFloat(range[1]);
    const hi = parseFloat(range[2]);
    if (v < lo) return "low";
    if (v > hi) return "high";
    return "normal";
  }

  return "unknown";
}

// ─── Medications ──────────────────────────────────────────
function extractMedications(lines: string[]): string[] {
  const sections = splitIntoSections(lines);
  const candidateLines = sections.get("medications") ?? [];

  const meds: string[] = [];
  for (const line of candidateLines) {
    const parsed = parseMedicationLine(line);
    if (parsed) meds.push(parsed);
  }
  return meds;
}

function parseMedicationLine(rawLine: string): string | null {
  const line = rawLine.replace(/^[-•*]\s*/, "").trim();
  if (!line) return null;

  const colonIdx = line.indexOf(":");
  const body = colonIdx > 0 ? line.slice(colonIdx + 1).trim() : line;
  const tokens = body.split(/\s+/);

  let doseIdx = -1;
  for (let i = 1; i < tokens.length; i++) {
    if (/^\d[\d.,]*$/.test(tokens[i])) {
      doseIdx = i;
      break;
    }
  }
  if (doseIdx === -1) {
    // No numeric dose found — still record the name if this line clearly
    // sits in a medications section and looks like a short label, not a
    // table header ("Medication Dose Frequency Purpose / Note").
    if (/^(medication|dose|frequency|purpose)/i.test(body) || tokens.length > 6) return null;
    return tokens.length > 0 && tokens.length <= 4 ? body : null;
  }

  const name = tokens.slice(0, doseIdx).join(" ");
  let dose = tokens[doseIdx];
  if (doseIdx + 1 < tokens.length && isUnitToken(tokens[doseIdx + 1])) {
    dose += ` ${tokens[doseIdx + 1]}`;
  } else if (doseIdx + 1 < tokens.length && /^(mg|mcg|g|ml|iu|mL|IU)$/i.test(tokens[doseIdx + 1])) {
    dose += ` ${tokens[doseIdx + 1]}`;
  }
  return `${name} ${dose}`.trim();
}

// ─── Diagnoses ────────────────────────────────────────────
// Only catches explicitly labeled diagnosis lists ("Diagnoses:",
// "Diagnosis:") — free-text-embedded diagnoses (e.g. a sentence
// mentioning a condition in passing) are deliberately NOT extracted here,
// since reliably distinguishing a real diagnosis from incidental prose
// without an LLM risks fabricating structure that isn't there. Those
// stay available to the LLM narrative step via additionalNotes instead.
function extractDiagnoses(lines: string[]): string[] {
  const diagnoses: string[] = [];
  for (const line of lines) {
    const m = line.match(/^Diagnos(?:is|es)[:\s]+(.+)$/i);
    if (m) {
      diagnoses.push(
        ...m[1]
          .split(/[;,]|\band\b/i)
          .map((d) => d.trim())
          .filter((d) => d.length > 0 && d.length < 100)
      );
    }
  }
  return diagnoses;
}

// ─── Additional notes (bounded prose passthrough) ─────────
function extractAdditionalNotes(lines: string[]): string {
  const sections = splitIntoSections(lines);
  const notesLines = sections.get("notes") ?? [];
  const joined = notesLines.join(" ").trim();
  return joined.length > MAX_NOTES_CHARS ? joined.slice(0, MAX_NOTES_CHARS) + "…" : joined;
}
