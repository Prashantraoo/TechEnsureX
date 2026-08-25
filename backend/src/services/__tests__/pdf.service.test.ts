import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { extractPdfText } from "../pdf.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, "..", "..", "__tests__", "fixtures", "fictional-health-report.pdf");

describe("extractPdfText", () => {
  it("extracts real text content from the fictional health report PDF, not a placeholder", async () => {
    const buffer = readFileSync(FIXTURE);
    const { text, pageCount } = await extractPdfText(buffer);

    // This is the core regression this pipeline was built to fix: the AI
    // used to receive a fake filename-only description instead of the
    // PDF's actual content. Asserting the real, known values from this
    // fixture is the guard against that regressing silently.
    expect(pageCount).toBeGreaterThanOrEqual(1);
    expect(text).toContain("HbA1c");
    expect(text).toContain("5.5");
    expect(text).toContain("128/82");
    expect(text).not.toMatch(/medical document uploaded/i);
  });

  it("rejects a file that isn't a PDF", async () => {
    const buffer = Buffer.from("this is definitely not a pdf");
    await expect(extractPdfText(buffer)).rejects.toMatchObject({
      code: "not_a_pdf",
    });
  });

  it("rejects an empty file", async () => {
    await expect(extractPdfText(Buffer.alloc(0))).rejects.toMatchObject({
      code: "empty_file",
    });
  });
});
