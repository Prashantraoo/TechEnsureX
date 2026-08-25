import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { renderPdfPagesToImages } from "../pdf-render.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCANNED_FIXTURE = path.join(__dirname, "..", "..", "__tests__", "fixtures", "scanned-health-report.pdf");

describe("renderPdfPagesToImages", () => {
  it("renders each page of a scanned (image-only) PDF to a non-trivial PNG buffer", async () => {
    const buffer = readFileSync(SCANNED_FIXTURE);
    const { pages, pageCount } = await renderPdfPagesToImages(buffer);

    expect(pageCount).toBe(2);
    expect(pages).toHaveLength(2);
    for (const page of pages) {
      // A valid, non-trivial PNG — starts with the PNG magic bytes and
      // is large enough to be an actual rendered page, not a blank stub.
      expect(page.pngBuffer.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
      expect(page.pngBuffer.length).toBeGreaterThan(10_000);
    }
    expect(pages.map((p) => p.pageNumber)).toEqual([1, 2]);
  });
});
