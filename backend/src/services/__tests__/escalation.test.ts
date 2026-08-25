import { describe, it, expect } from "vitest";
import { shouldEscalateFromFacts } from "../document-analysis.service.js";
import type { DeterministicExtraction, DeterministicLabResult } from "../deterministic-extraction.service.js";

function facts(labResults: DeterministicLabResult[]): DeterministicExtraction {
  return {
    patientDetails: { name: "Test Patient", age: "30", sex: "Male", reportDate: "2026-01-01" },
    labResults,
    medications: [],
    diagnoses: [],
    additionalNotes: "",
  };
}

function lab(test: string, value: string, status: DeterministicLabResult["status"] = "normal"): DeterministicLabResult {
  return { test, value, unit: "", referenceRange: "", status, confidence: status === "unknown" ? "uncertain" : "verified" };
}

describe("shouldEscalateFromFacts", () => {
  it("does not escalate an ordinary report with no abnormal findings", () => {
    const result = shouldEscalateFromFacts(
      facts([lab("Hemoglobin", "14.6"), lab("Fasting Glucose", "96")])
    );
    expect(result.escalate).toBe(false);
    expect(result.reasons).toEqual([]);
  });

  it("does not escalate a small cluster of abnormal findings (routine, below threshold)", () => {
    const result = shouldEscalateFromFacts(
      facts([
        lab("LDL Cholesterol", "118", "high"),
        lab("Triglycerides", "151", "high"),
        lab("ALT", "42", "abnormal"),
        lab("Fasting Glucose", "115", "high"),
      ])
    );
    expect(result.escalate).toBe(false);
  });

  it("escalates when there are many abnormal findings (at/above threshold)", () => {
    const result = shouldEscalateFromFacts(
      facts([
        lab("LDL Cholesterol", "118", "high"),
        lab("Triglycerides", "151", "high"),
        lab("ALT", "42", "abnormal"),
        lab("Fasting Glucose", "115", "high"),
        lab("Creatinine", "1.8", "high"),
      ])
    );
    expect(result.escalate).toBe(true);
    expect(result.reasons).toContain("multiple_abnormal_findings");
  });

  it("escalates when the same test appears twice with conflicting values", () => {
    const result = shouldEscalateFromFacts(
      facts([lab("HbA1c", "5.5", "normal"), lab("HbA1c", "8.9", "high")])
    );
    expect(result.escalate).toBe(true);
    expect(result.reasons).toContain("conflicting_lab_values");
  });

  it("does not treat the same test repeated with the SAME value as a conflict", () => {
    const result = shouldEscalateFromFacts(
      facts([lab("Hemoglobin", "14.6"), lab("hemoglobin", "14.6")])
    );
    expect(result.escalate).toBe(false);
  });

  it("can report multiple reasons at once", () => {
    const result = shouldEscalateFromFacts(
      facts([
        lab("HbA1c", "5.5", "normal"),
        lab("HbA1c", "8.9", "high"),
        lab("LDL Cholesterol", "118", "high"),
        lab("Triglycerides", "151", "high"),
        lab("ALT", "42", "abnormal"),
        lab("Fasting Glucose", "115", "high"),
      ])
    );
    expect(result.escalate).toBe(true);
    expect(result.reasons.length).toBeGreaterThanOrEqual(2);
  });
});
