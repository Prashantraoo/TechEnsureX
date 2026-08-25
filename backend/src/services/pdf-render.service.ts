// ─── TechEnsureX — PDF Page Rendering (for vision fallback) ─
// Renders PDF pages to PNG images, used ONLY when pdf.service.ts's
// native text extraction finds no usable text layer (a scanned/
// image-only PDF). Node.js requires pdf.js's "legacy" build — the
// default build references browser-only globals (DOMMatrix) that don't
// exist here (see src/types/pdfjs-legacy.d.ts for why the import path
// below needs its own type shim).

import path from "path";
import { fileURLToPath } from "url";
import { createCanvas } from "@napi-rs/canvas";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// pdf.js needs its bundled standard-fonts on disk to render text
// correctly when a PDF's embedded fonts fall back to a standard one —
// without this it silently mis-renders glyphs, which would directly
// hurt the vision model's ability to read the page accurately.
const STANDARD_FONTS_DIR = path.join(__dirname, "..", "..", "node_modules", "pdfjs-dist", "standard_fonts") + "/";

export type PdfRenderErrorCode = "too_many_pages" | "render_failed" | "payload_too_large";

export class PdfRenderError extends Error {
  code: PdfRenderErrorCode;
  constructor(message: string, code: PdfRenderErrorCode) {
    super(message);
    this.name = "PdfRenderError";
    this.code = code;
  }
}

// Scanned documents are page-images, not text — each page costs real
// vision-model tokens and latency, so the cap here is deliberately
// tighter than MAX_PDF_PAGES (text path) in pdf.service.ts.
export const MAX_VISION_PAGES = 8;
// Per-page render scale: high enough for small print/table text to stay
// legible to the vision model, without ballooning the base64 payload.
const RENDER_SCALE = 1.5;
// Guards against a single page rendering to an unreasonably large image
// (e.g. a PDF with an oversized page size) blowing up the request payload.
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export interface RenderedPage {
  pngBuffer: Buffer;
  pageNumber: number;
}

/**
 * Renders up to MAX_VISION_PAGES pages of a PDF to PNG buffers. Throws
 * PdfRenderError for a page count over the cap or a render failure —
 * never returns a partial/silently-truncated page set.
 */
export async function renderPdfPagesToImages(buffer: Buffer): Promise<{ pages: RenderedPage[]; pageCount: number }> {
  const data = new Uint8Array(buffer);
  let doc;
  try {
    // `disableWorker` is a real, documented pdf.js option for running in
    // Node without a worker thread, but this package's shipped types
    // (see src/types/pdfjs-legacy.d.ts) don't declare it — narrow cast
    // rather than losing type-checking on the rest of this call.
    doc = await pdfjsLib.getDocument({
      data,
      standardFontDataUrl: STANDARD_FONTS_DIR,
      isEvalSupported: false,
      disableWorker: true,
    } as Parameters<typeof pdfjsLib.getDocument>[0]).promise;
  } catch (error: any) {
    throw new PdfRenderError(
      "Could not render this PDF for image-based analysis — it may be corrupted or in an unsupported format.",
      "render_failed"
    );
  }

  const pageCount = doc.numPages;
  if (pageCount > MAX_VISION_PAGES) {
    throw new PdfRenderError(
      `This scanned PDF has ${pageCount} pages — the limit for image-based analysis is ${MAX_VISION_PAGES}. Please upload a shorter document or split it first.`,
      "too_many_pages"
    );
  }

  const pages: RenderedPage[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
      const page = await doc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: RENDER_SCALE });
      const canvas = createCanvas(viewport.width, viewport.height);
      const ctx = canvas.getContext("2d");
      // pdf.js's types expect DOM canvas/context types (HTMLCanvasElement,
      // CanvasRenderingContext2D) which don't exist in a Node-only
      // tsconfig (no "dom" lib) — @napi-rs/canvas's canvas/context are
      // structurally compatible at runtime (same render() call shape),
      // hence the cast rather than pulling in the DOM lib for this one
      // interop point.
      const renderParams = { canvasContext: ctx, canvas, viewport } as unknown as Parameters<typeof page.render>[0];
      await page.render(renderParams).promise;
      const pngBuffer = canvas.toBuffer("image/png");

      if (pngBuffer.length > MAX_IMAGE_BYTES) {
        throw new PdfRenderError(
          "One or more pages in this PDF are too large to process for image-based analysis.",
          "payload_too_large"
        );
      }
      pages.push({ pngBuffer, pageNumber });
    }
  } catch (error) {
    if (error instanceof PdfRenderError) throw error;
    throw new PdfRenderError("Could not render this PDF for image-based analysis.", "render_failed");
  } finally {
    await doc.destroy();
  }

  return { pages, pageCount };
}
