// ─── TechEnsureX — PDF Text Extraction Service ──────────
// Real server-side PDF text extraction (pdf-parse / pdf.js under the
// hood). This is the ONLY place PDF bytes get turned into text — the
// AI service and upload controller both consume its output rather than
// touching pdf-parse directly.

import { PDFParse } from "pdf-parse";

export type PdfExtractionErrorCode =
  | "not_a_pdf"
  | "empty_file"
  | "no_extractable_text"
  | "password_protected"
  | "parse_failed"
  | "too_many_pages"
  | "text_too_large"
  | "timed_out";

export class PdfExtractionError extends Error {
  code: PdfExtractionErrorCode;
  constructor(message: string, code: PdfExtractionErrorCode) {
    super(message);
    this.name = "PdfExtractionError";
    this.code = code;
  }
}

export interface PdfExtractionResult {
  text: string;
  pageCount: number;
}

const PDF_MAGIC = "%PDF-";
// Below this many non-whitespace characters, treat the PDF as having no
// real text layer (i.e. a scanned/image-only document) rather than
// pretend a couple of stray characters constitute a usable report.
const MIN_MEANINGFUL_CHARS = 40;

// ─── Processing caps ──────────────────────────────────────
// Keeps a single upload bounded in cost and latency: a 200-page PDF
// shouldn't be able to make one request extract for a minute and then
// hand the AI a context window it can't reasonably use. Text is capped
// (rather than the AI request) so the limit is enforced once, at the
// source, instead of relying on every downstream caller to remember to
// truncate.
export const MAX_PDF_PAGES = 30;
export const MAX_EXTRACTED_TEXT_CHARS = 50_000;
const EXTRACTION_TIMEOUT_MS = 20_000;

/**
 * Extracts and cleans text from a PDF buffer. Throws PdfExtractionError
 * (never returns a fabricated/placeholder string) when the PDF is
 * invalid, empty, password-protected, too large, or has no real text
 * layer.
 */
export async function extractPdfText(buffer: Buffer): Promise<PdfExtractionResult> {
  if (!buffer || buffer.length === 0) {
    throw new PdfExtractionError("The uploaded file is empty.", "empty_file");
  }

  // Cheap magic-byte check before handing the buffer to the parser —
  // multer's mimetype check can be spoofed by the client, this can't.
  const header = buffer.subarray(0, 5).toString("latin1");
  if (header !== PDF_MAGIC) {
    throw new PdfExtractionError("The uploaded file is not a valid PDF.", "not_a_pdf");
  }

  let parser: PDFParse | undefined;
  let rawText: string;
  let pageCount: number;
  try {
    parser = new PDFParse({ data: buffer });
    const result = await withTimeout(
      parser.getText(),
      EXTRACTION_TIMEOUT_MS,
      () => new PdfExtractionError("This PDF took too long to process. Please try a smaller file.", "timed_out")
    );
    rawText = result.text ?? "";
    pageCount = result.total ?? 1;
  } catch (error: any) {
    if (error instanceof PdfExtractionError) throw error;
    const message: string = error?.message ?? "";
    if (/password/i.test(message)) {
      throw new PdfExtractionError(
        "This PDF is password-protected. Please upload an unlocked copy.",
        "password_protected"
      );
    }
    throw new PdfExtractionError(
      "Could not read this PDF — it may be corrupted or in an unsupported format.",
      "parse_failed"
    );
  } finally {
    if (parser) {
      try {
        await parser.destroy();
      } catch {
        // best-effort cleanup only
      }
    }
  }

  if (pageCount > MAX_PDF_PAGES) {
    throw new PdfExtractionError(
      `This PDF has ${pageCount} pages — the limit is ${MAX_PDF_PAGES}. Please upload a shorter document or split it first.`,
      "too_many_pages"
    );
  }

  let cleaned = cleanExtractedText(rawText);

  if (cleaned.replace(/\s/g, "").length < MIN_MEANINGFUL_CHARS) {
    throw new PdfExtractionError(
      "This PDF doesn't contain a readable text layer — it looks like a scanned image. OCR would be required to read it, which isn't currently supported.",
      "no_extractable_text"
    );
  }

  if (cleaned.length > MAX_EXTRACTED_TEXT_CHARS) {
    // Truncate rather than reject outright — most reports still have
    // their key data in the first pages, and a truncated-but-real
    // analysis beats an outright refusal. The document-analysis prompt
    // is grounded in whatever text it receives either way.
    cleaned = cleaned.slice(0, MAX_EXTRACTED_TEXT_CHARS);
    console.warn(`PDF extraction: text truncated at ${MAX_EXTRACTED_TEXT_CHARS} chars (was longer).`);
  }

  return { text: cleaned, pageCount };
}

function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: () => Error): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(onTimeout()), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

// Normalizes whitespace while preserving line structure (so headings,
// table rows, and multi-line values stay legible) rather than flattening
// everything into one paragraph.
function cleanExtractedText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ") // collapse horizontal whitespace runs, keep newlines
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n") // collapse 3+ blank lines to a single blank line
    .trim();
}
