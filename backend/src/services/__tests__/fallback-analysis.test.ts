import { describe, it, expect } from "vitest";
import { isMinimalFallbackAnalysis } from "../document-analysis.service.js";

// Guards the upload cache's "don't serve a degraded analysis" rule
// (upload.controller.ts). If the fallback narrative's wording is ever
// changed without updating the marker, this catches it — otherwise the
// cache would silently start treating degraded results as final again.
describe("isMinimalFallbackAnalysis", () => {
  it("detects the fallback narrative produced when facts were extracted", () => {
    expect(
      isMinimalFallbackAnalysis({
        documentSummary:
          "Extracted 59 lab/vital value(s) from this report; 11 outside the normal range. AI-generated narrative could not be produced for this report.",
      })
    ).toBe(true);
  });

  it("detects the fallback narrative produced when no facts were extracted", () => {
    expect(
      isMinimalFallbackAnalysis({ documentSummary: "AI-generated narrative could not be produced for this report." })
    ).toBe(true);
  });

  it("does not flag a real AI-authored narrative", () => {
    expect(
      isMinimalFallbackAnalysis({
        documentSummary: "The report shows normal total cholesterol and HDL. Triglycerides are high (199 mg/dL).",
      })
    ).toBe(false);
  });

  it("is safe on a missing or malformed analysis", () => {
    expect(isMinimalFallbackAnalysis(null)).toBe(false);
    expect(isMinimalFallbackAnalysis(undefined)).toBe(false);
    expect(isMinimalFallbackAnalysis({})).toBe(false);
    expect(isMinimalFallbackAnalysis({ documentSummary: 42 })).toBe(false);
  });
});
