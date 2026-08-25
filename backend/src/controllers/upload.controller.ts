import { Request, Response, NextFunction } from "express";
import multer from "multer";
import crypto from "crypto";
import { uploadToCloudinary } from "../services/upload.service.js";
import { analyzeDocument, formatAnalysisAsText, type AnalysisTiming } from "../services/document-analysis.service.js";
import { analyzeScannedDocument } from "../services/vision-analysis.service.js";
import { extractPdfText, PdfExtractionError } from "../services/pdf.service.js";
import { PdfRenderError } from "../services/pdf-render.service.js";
import { AiServiceError, aiErrorStatus, describeAiError } from "../services/nvidia.js";
import { DocumentScan } from "../models/DocumentScan.js";
import { env } from "../config/env.js";

// Upload byte cap — the number that actually matters here (see
// errorHandler.ts, which surfaces LIMIT_FILE_SIZE using this same value).
// Deliberately well above what a real medical report needs: everything
// downstream is already decoupled from the raw upload size — text
// extraction caps out at MAX_EXTRACTED_TEXT_CHARS regardless of how big
// the source PDF is (pdf.service.ts), and the scanned-document vision
// fallback caps at MAX_VISION_PAGES regardless of file size too
// (pdf-render.service.ts) — so raising this doesn't increase downstream
// AI payload size or cost, only how large a file we'll accept to begin
// text extraction on.
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB

// Multer config — store in memory
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      // A plain Error thrown here is *not* a multer.MulterError, so
      // errorHandler's MulterError branch never sees it — it falls to the
      // generic handler instead, which only forwards err.message for a
      // non-500 status. Attaching statusCode here is what keeps this
      // message ("Unsupported file type...") from being swallowed into a
      // bare "Internal server error".
      const error: Error & { statusCode?: number } = new Error(
        "Unsupported file type. Please upload a PDF, JPG, or PNG."
      );
      error.statusCode = 415;
      cb(error);
    }
  },
});

// Maps a PdfExtractionError's code to a safe HTTP status.
// ("no_extractable_text" is not handled here — it's intercepted before
// this ever runs and routed to the vision fallback instead.)
function pdfErrorStatus(error: PdfExtractionError): number {
  switch (error.code) {
    case "password_protected":
      return 422; // valid request, but the file can't be processed as-is
    case "too_many_pages":
      return 413; // valid PDF, but larger than the platform will process
    case "timed_out":
      return 504;
    case "not_a_pdf":
    case "empty_file":
    case "parse_failed":
    case "no_extractable_text": // only reached if the vision fallback itself also fails to render
    case "text_too_large": // never actually thrown — extraction truncates instead
    default:
      return 400;
  }
}

// Maps a PdfRenderError's code (vision fallback) to a safe HTTP status.
function pdfRenderErrorStatus(error: PdfRenderError): number {
  switch (error.code) {
    case "too_many_pages":
    case "payload_too_large":
      return 413;
    case "render_failed":
    default:
      return 422; // valid PDF, but this platform can't process it as a scanned document
  }
}

// Dev-only timing instrumentation (Step 11) — logs ONLY stage labels and
// elapsed milliseconds, never document contents, extracted text, or PHI.
function createTiming(label: string): AnalysisTiming & { log(): void } {
  const start = Date.now();
  const marks: Array<{ label: string; ms: number }> = [];
  let path = "unknown";
  return {
    mark(stage: string) {
      marks.push({ label: stage, ms: Date.now() - start });
    },
    setPath(p) {
      path = p;
    },
    log() {
      const summary = marks.map((m) => `${m.label}=${m.ms}ms`).join(" ");
      console.log(`[HEALTH REPORT] ${label}: path=${path} ${summary} total=${Date.now() - start}ms`);
    },
  };
}

// POST /api/upload/document
export async function uploadDocument(
  req: Request,
  res: Response
): Promise<void> {
  const timing = createTiming("upload");
  timing.mark("upload");
  try {
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded." });
      return;
    }

    const file = req.file;

    // We don't have OCR for plain image uploads (jpg/png) — only PDFs go
    // through either the text path or the scanned-PDF vision path below.
    if (!file.mimetype.includes("pdf")) {
      res.status(422).json({
        message: "This file type isn't supported for analysis yet — please upload a PDF report (text-based or scanned).",
      });
      return;
    }

    // Cache key is scoped to (userId, contentHash) — see DocumentScan.ts.
    // A repeat upload of the exact same bytes by the same user reuses the
    // prior extraction + analysis instead of re-processing, but the hash
    // alone is never enough to serve someone else's cached result.
    const contentHash = crypto.createHash("sha256").update(file.buffer).digest("hex");
    const cached = await DocumentScan.findOne({ userId: req.user!._id, contentHash })
      .sort({ createdAt: -1 })
      .lean();
    if (cached) {
      timing.setPath("fast"); // cache doesn't record which path produced it; not meaningful here
      timing.mark("cacheHit");
      timing.log();
      res.status(201).json({
        message: "Document scanned successfully.",
        scan: {
          id: cached._id,
          fileName: cached.fileName,
          fileUrl: cached.fileUrl,
          aiAnalysis: cached.aiAnalysis,
          analysis: cached.analysis,
          riskScore: cached.riskScore,
          pageCount: cached.pageCount,
          createdAt: cached.createdAt,
        },
      });
      return;
    }

    // Real extraction — this is the fix: previously a fake description
    // ("Medical document uploaded: <filename>...") was sent to the AI
    // instead of the PDF's actual content. Prefer native text extraction
    // first; only fall back to rendering pages as images (below) when
    // the PDF has no usable text layer at all (a scanned/photographed
    // document) — running vision on every upload would be slower and
    // more expensive for no benefit on the ~95% of reports that already
    // have selectable text.
    let extractedText: string | null = null;
    // Set from pdf.service.ts's own page count (text path) or
    // pdf-render.service.ts's rendered page count (vision path) below —
    // never asked of the AI model, so it can't be miscounted or omitted.
    let pageCount: number | undefined;
    timing.mark("pdfExtractionStart");
    try {
      const extraction = await extractPdfText(file.buffer);
      extractedText = extraction.text;
      pageCount = extraction.pageCount;
      timing.mark("pdfExtractionComplete");
      console.log(
        `PDF extraction: "${file.originalname}" — ${extraction.pageCount} page(s), ${extractedText.length} chars extracted`
      );
    } catch (error) {
      if (!(error instanceof PdfExtractionError)) throw error;
      if (error.code !== "no_extractable_text") {
        console.warn("PDF extraction failed:", error.code, error.message);
        res.status(pdfErrorStatus(error)).json({ message: error.message });
        return;
      }
      // No usable text layer — this is the scanned/image-only case.
      timing.mark("pdfExtractionComplete");
      console.log(`PDF extraction: "${file.originalname}" — no text layer, falling back to image-based analysis`);
    }

    let fileUrl = "";
    // Upload to Cloudinary if configured
    if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY) {
      try {
        const result = await uploadToCloudinary(file.buffer);
        fileUrl = result.url;
      } catch (err) {
        console.warn("Cloudinary upload failed, storing without URL:", err);
      }
    }

    let analysis;
    try {
      if (extractedText !== null) {
        analysis = await analyzeDocument(extractedText, file.originalname, timing);
      } else {
        const vision = await analyzeScannedDocument(file.buffer, file.originalname, timing);
        analysis = vision.result;
        pageCount = vision.pageCount;
      }
    } catch (error) {
      if (error instanceof PdfRenderError) {
        console.warn("PDF vision render failed:", error.code, error.message);
        res.status(pdfRenderErrorStatus(error)).json({ message: error.message });
        return;
      }
      throw error;
    }
    timing.mark("aiComplete");
    const aiAnalysis = formatAnalysisAsText(analysis);

    const scan = await DocumentScan.create({
      userId: req.user!._id,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileUrl,
      aiAnalysis,
      analysis,
      // null (not 0) when there wasn't enough reliable data to assess
      // risk — see hasReliableRiskSignal in document-analysis.service.ts.
      riskScore: analysis.riskScore.score,
      pageCount,
      contentHash,
    });

    timing.log();
    res.status(201).json({
      message: "Document scanned successfully.",
      scan: {
        id: scan._id,
        fileName: scan.fileName,
        fileUrl: scan.fileUrl,
        aiAnalysis: scan.aiAnalysis,
        analysis: scan.analysis,
        riskScore: scan.riskScore,
        pageCount: scan.pageCount,
        createdAt: scan.createdAt,
      },
    });
  } catch (error: any) {
    if (error instanceof AiServiceError) {
      console.error("Upload AI analysis error:", describeAiError(error));
      res.status(aiErrorStatus(error)).json({ message: error.message });
      return;
    }
    // Anything else here is unexpected (a bug, an infra failure) rather
    // than a condition we deliberately handle — log the real error for
    // debugging, but never forward its message to the client, which could
    // leak internals (file paths, connection strings, native stack frames).
    console.error("Upload error:", error);
    res.status(500).json({
      message: "PDF uploaded successfully, but document processing failed. Please try again.",
    });
  }
}

// GET /api/upload/scans
export async function getScans(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const scans = await DocumentScan.find({ userId: req.user!._id }).sort({
      createdAt: -1,
    });
    res.json({ scans });
  } catch (error) {
    next(error);
  }
}
