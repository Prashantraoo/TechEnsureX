import { Request, Response, NextFunction } from "express";
import multer from "multer";
import crypto from "crypto";
import {
  uploadToCloudinary,
  generateSignedUploadParams,
  verifyOwnedResource,
  downloadCloudinaryAsset,
  deleteCloudinaryAsset,
  CloudinaryResourceError,
} from "../services/upload.service.js";
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
//
// NOTE: this is the application-level ceiling, enforced by multer (small
// path) and by verifyOwnedResource/downloadCloudinaryAsset (direct-upload
// path). It is independent of DIRECT_UPLOAD_THRESHOLD_BYTES below, which
// exists only because Vercel's platform enforces its own, much smaller,
// non-configurable request-body cap on the /document route itself.
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB

// Vercel's Serverless Function platform limit sits between 4MB and 5MB
// (empirically confirmed against this project's own production
// deployment: request bodies above this are rejected with
// FUNCTION_PAYLOAD_TOO_LARGE before Express ever runs — no application
// code, multer config, or vercel.json setting can raise it). Files at or
// above this threshold must go through the direct-to-Cloudinary path
// (POST /api/upload/signature -> client uploads directly to Cloudinary ->
// POST /api/upload/confirm) instead of POST /api/upload/document, which
// stays a normal single-request multipart upload for anything smaller.
// Kept comfortably under the real ~4.5MB platform cap to leave headroom
// for multipart boundary/header overhead.
export const DIRECT_UPLOAD_THRESHOLD_BYTES = 4 * 1024 * 1024; // 4MB

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

interface ProcessDocumentOptions {
  buffer: Buffer;
  fileName: string;
  mimetype: string;
  userId: string;
  timing: ReturnType<typeof createTiming>;
  // Already-known Cloudinary URL (direct-upload path uploaded it before
  // calling in) — when omitted, this uploads the buffer itself (small
  // multipart path).
  knownFileUrl?: string;
}

type ProcessResult =
  | { ok: true; status: 201; body: Record<string, unknown> }
  | { ok: false; status: number; message: string };

// Shared core of both upload entry points (multipart /document and
// direct-upload /confirm) — cache lookup, PDF text/vision extraction, AI
// analysis, and DocumentScan persistence are identical either way; only
// how the raw bytes and Cloudinary URL were obtained differs. Returns a
// result instead of writing to `res` directly so confirmDirectUpload can
// clean up an already-uploaded (now-orphaned) Cloudinary asset on any
// failure path — the multipart path never has that concern, since it
// only uploads to Cloudinary after extraction has already succeeded.
async function processDocument(opts: ProcessDocumentOptions): Promise<ProcessResult> {
  const { buffer, fileName, mimetype, userId, timing, knownFileUrl } = opts;

  if (!mimetype.includes("pdf")) {
    return {
      ok: false,
      status: 422,
      message: "This file type isn't supported for analysis yet — please upload a PDF report (text-based or scanned).",
    };
  }

  // Cache key is scoped to (userId, contentHash) — see DocumentScan.ts.
  // A repeat upload of the exact same bytes by the same user reuses the
  // prior extraction + analysis instead of re-processing, but the hash
  // alone is never enough to serve someone else's cached result.
  const contentHash = crypto.createHash("sha256").update(buffer).digest("hex");
  const cached = await DocumentScan.findOne({ userId, contentHash })
    .sort({ createdAt: -1 })
    .lean();
  if (cached) {
    timing.setPath("fast"); // cache doesn't record which path produced it; not meaningful here
    timing.mark("cacheHit");
    timing.log();
    return {
      ok: true,
      status: 201,
      body: {
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
      },
    };
  }

  // Real extraction — prefer native text extraction first; only fall
  // back to rendering pages as images (below) when the PDF has no usable
  // text layer at all (a scanned/photographed document) — running vision
  // on every upload would be slower and more expensive for no benefit on
  // the ~95% of reports that already have selectable text.
  let extractedText: string | null = null;
  // Set from pdf.service.ts's own page count (text path) or
  // pdf-render.service.ts's rendered page count (vision path) below —
  // never asked of the AI model, so it can't be miscounted or omitted.
  let pageCount: number | undefined;
  timing.mark("pdfExtractionStart");
  try {
    const extraction = await extractPdfText(buffer);
    extractedText = extraction.text;
    pageCount = extraction.pageCount;
    timing.mark("pdfExtractionComplete");
    console.log(
      `PDF extraction: "${fileName}" — ${extraction.pageCount} page(s), ${extractedText.length} chars extracted`
    );
  } catch (error) {
    if (!(error instanceof PdfExtractionError)) throw error;
    if (error.code !== "no_extractable_text") {
      console.warn("PDF extraction failed:", error.code, error.message);
      return { ok: false, status: pdfErrorStatus(error), message: error.message };
    }
    // No usable text layer — this is the scanned/image-only case.
    timing.mark("pdfExtractionComplete");
    console.log(`PDF extraction: "${fileName}" — no text layer, falling back to image-based analysis`);
  }

  let fileUrl = knownFileUrl ?? "";
  if (!fileUrl && env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY) {
    try {
      const result = await uploadToCloudinary(buffer);
      fileUrl = result.url;
    } catch (err) {
      console.warn("Cloudinary upload failed, storing without URL:", err);
    }
  }

  let analysis;
  try {
    if (extractedText !== null) {
      analysis = await analyzeDocument(extractedText, fileName, timing);
    } else {
      const vision = await analyzeScannedDocument(buffer, fileName, timing);
      analysis = vision.result;
      pageCount = vision.pageCount;
    }
  } catch (error) {
    if (error instanceof PdfRenderError) {
      console.warn("PDF vision render failed:", error.code, error.message);
      return { ok: false, status: pdfRenderErrorStatus(error), message: error.message };
    }
    throw error;
  }
  timing.mark("aiComplete");
  const aiAnalysis = formatAnalysisAsText(analysis);

  const scan = await DocumentScan.create({
    userId,
    fileName,
    fileType: mimetype,
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
  return {
    ok: true,
    status: 201,
    body: {
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
    },
  };
}

// Converts an unexpected thrown error (as opposed to one of
// processDocument's deliberately-handled failure branches above) into the
// same safe, non-leaking response shape used everywhere else — never
// forwards the raw error message to the client.
function describeUnexpectedError(error: any): { status: number; message: string } {
  if (error instanceof AiServiceError) {
    console.error("Upload AI analysis error:", describeAiError(error));
    return { status: aiErrorStatus(error), message: error.message };
  }
  console.error("Upload error:", error);
  return { status: 500, message: "PDF uploaded successfully, but document processing failed. Please try again." };
}

// POST /api/upload/document — single-request multipart upload. Only used
// for files under DIRECT_UPLOAD_THRESHOLD_BYTES; the frontend routes
// anything larger to the signature/confirm flow below instead, since
// Vercel's platform rejects request bodies above ~4.5MB before this
// handler (or even the auth middleware) ever runs.
export async function uploadDocument(req: Request, res: Response): Promise<void> {
  const timing = createTiming("upload");
  timing.mark("upload");
  if (!req.file) {
    res.status(400).json({ message: "No file uploaded." });
    return;
  }
  const file = req.file;
  try {
    const result = await processDocument({
      buffer: file.buffer,
      fileName: file.originalname,
      mimetype: file.mimetype,
      userId: String(req.user!._id),
      timing,
    });
    if (result.ok) {
      res.status(result.status).json(result.body);
    } else {
      res.status(result.status).json({ message: result.message });
    }
  } catch (error: any) {
    const { status, message } = describeUnexpectedError(error);
    res.status(status).json({ message });
  }
}

// POST /api/upload/signature — issues a short-lived signed payload the
// browser uses to upload directly to Cloudinary, entirely bypassing our
// Vercel function's request body (and its platform-enforced size cap).
// Scoped to this user's own folder (see userUploadFolder in
// upload.service.ts) so the resulting asset can be verified as theirs
// before we ever process or download it.
export async function getUploadSignature(req: Request, res: Response): Promise<void> {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    res.status(503).json({
      message: "Direct large-file upload isn't available right now. Please try a smaller file, or try again shortly.",
    });
    return;
  }
  const params = generateSignedUploadParams(String(req.user!._id));
  res.json(params);
}

interface ConfirmUploadBody {
  publicId?: string;
  fileName?: string;
}

// POST /api/upload/confirm — called after the browser has already
// uploaded the file directly to Cloudinary using the signed params
// above. Never trusts a client-supplied URL: the asset is looked up via
// Cloudinary's Admin API (verifyOwnedResource) using our own server-side
// credentials, which also confirms it actually lives in this user's own
// upload folder, before the backend downloads its bytes and runs the
// exact same extraction/analysis pipeline as the small-file path. Any
// failure past this point deletes the now-orphaned Cloudinary asset
// rather than leaving it stored with no corresponding DocumentScan.
export async function confirmDirectUpload(req: Request, res: Response): Promise<void> {
  const timing = createTiming("upload-direct");
  timing.mark("confirm");
  const body = req.body as ConfirmUploadBody;
  const publicId = typeof body.publicId === "string" ? body.publicId.trim() : "";
  const fileName = typeof body.fileName === "string" && body.fileName.trim() ? body.fileName.trim() : "document.pdf";

  if (!publicId) {
    res.status(400).json({ message: "No uploaded file reference provided." });
    return;
  }

  const userId = String(req.user!._id);
  let resource;
  try {
    timing.mark("resourceVerifyStart");
    resource = await verifyOwnedResource(publicId, userId);
    timing.mark("resourceVerifyComplete");
  } catch (error) {
    if (error instanceof CloudinaryResourceError) {
      const status = error.code === "wrong_owner" ? 403 : 404;
      res.status(status).json({ message: error.message });
      return;
    }
    console.error("confirmDirectUpload: resource verification failed:", error);
    res.status(502).json({ message: "Could not verify the uploaded file. Please try again." });
    return;
  }

  if (resource.bytes > MAX_UPLOAD_BYTES) {
    const limitMb = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));
    await deleteCloudinaryAsset(publicId);
    res.status(413).json({ message: `This file exceeds the ${limitMb}MB upload limit. Please upload a smaller document.` });
    return;
  }
  if (resource.format !== "pdf") {
    // Non-PDF direct uploads (jpg/png) aren't analyzable — same
    // limitation as the small-file path — so there's no reason to keep
    // the asset around either.
    await deleteCloudinaryAsset(publicId);
    res.status(422).json({
      message: "This file type isn't supported for analysis yet — please upload a PDF report (text-based or scanned).",
    });
    return;
  }

  let buffer: Buffer;
  try {
    timing.mark("downloadStart");
    buffer = await downloadCloudinaryAsset(resource.secureUrl, MAX_UPLOAD_BYTES);
    timing.mark("downloadComplete");
    console.log(`Direct upload: "${fileName}" — downloaded ${buffer.length} bytes from Cloudinary for processing`);
  } catch (error) {
    console.error("confirmDirectUpload: download failed:", error);
    await deleteCloudinaryAsset(publicId);
    res.status(502).json({ message: "Could not retrieve the uploaded file. Please try uploading again." });
    return;
  }

  try {
    const result = await processDocument({
      buffer,
      fileName,
      mimetype: "application/pdf",
      userId,
      timing,
      knownFileUrl: resource.secureUrl,
    });
    if (result.ok) {
      // A cache hit (same content already scanned for this user) reuses
      // the ORIGINAL scan's stored fileUrl rather than this request's
      // freshly-uploaded asset — the new upload is then a redundant
      // duplicate with nothing referencing it, so it's cleaned up rather
      // than kept around unnecessarily.
      const scan = (result.body as { scan?: { fileUrl?: string } }).scan;
      if (scan?.fileUrl && scan.fileUrl !== resource.secureUrl) {
        await deleteCloudinaryAsset(publicId);
      }
      res.status(result.status).json(result.body);
    } else {
      await deleteCloudinaryAsset(publicId);
      res.status(result.status).json({ message: result.message });
    }
  } catch (error: any) {
    await deleteCloudinaryAsset(publicId);
    const { status, message } = describeUnexpectedError(error);
    res.status(status).json({ message });
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
