import { describe, it, expect } from "vitest";
import { extractDeterministicFacts } from "../deterministic-extraction.service.js";

describe("extractDeterministicFacts", () => {
  it("extracts patient details, vitals, and lab results from a numbered-heading tabular report", () => {
    const text = `Comprehensive Health Assessment Report
Patient Name Aarav Sharma
Report Date 12 August 2026
Sex Male
1. Vital Signs
Parameter Result Reference / Note
Blood Pressure 128/82 mmHg Typical adult range
2. Laboratory Results
Test Result Unit Reference Range
Hemoglobin 14.6 g/dL 13.5–17.5
LDL Cholesterol 118 mg/dL <100 desirable
Triglycerides 151 mg/dL <150
HbA1c 5.5 % <5.7
3. Medical History
Fictional test history: seasonal allergic rhinitis reported intermittently.
4. Current Medications
Medication Dose Frequency Purpose / Note
Cetirizine 10 mg As needed Seasonal allergy symptoms
Vitamin D3 1000 IU Daily Supplement`;

    const facts = extractDeterministicFacts(text);

    expect(facts.patientDetails.name).toBe("Aarav Sharma");
    expect(facts.patientDetails.sex).toBe("Male");
    expect(facts.patientDetails.reportDate).toBe("12 August 2026");

    const hba1c = facts.labResults.find((l) => l.test === "HbA1c");
    expect(hba1c).toEqual({ test: "HbA1c", value: "5.5", unit: "%", referenceRange: "<5.7", status: "normal", confidence: "verified" });

    const ldl = facts.labResults.find((l) => l.test === "LDL Cholesterol");
    expect(ldl?.status).toBe("high");

    const bp = facts.labResults.find((l) => l.test === "Blood Pressure");
    expect(bp?.value).toBe("128/82");
    expect(bp?.unit).toBe("mmHg");

    expect(facts.medications).toContain("Cetirizine 10 mg");
    expect(facts.medications).toContain("Vitamin D3 1000 IU");
  });

  it("extracts colon-style 'Test: value unit (Reference: range) - Status' rows", () => {
    const text = `Patient: Rohan Mehta
Age / Sex: 41 / Male
Report Date: 10-Aug-2026
Vitals
Blood Pressure: 128/82 mmHg
Complete Blood Count
Hemoglobin: 14.6 g/dL (Reference: 13.0 - 17.0 g/dL) - Normal
Lipid Profile
LDL Cholesterol: 118 mg/dL (Reference: <100 mg/dL) - High`;

    const facts = extractDeterministicFacts(text);

    expect(facts.patientDetails.name).toBe("Rohan Mehta");
    expect(facts.patientDetails.age).toBe("41");
    expect(facts.patientDetails.sex).toBe("Male");

    const hb = facts.labResults.find((l) => l.test === "Hemoglobin");
    expect(hb).toEqual({ test: "Hemoglobin", value: "14.6", unit: "g/dL", referenceRange: "13.0 - 17.0 g/dL", status: "normal", confidence: "verified" });

    const ldl = facts.labResults.find((l) => l.test === "LDL Cholesterol");
    expect(ldl?.status).toBe("high");
    expect(ldl?.value).toBe("118");
  });

  it("preserves BOTH readings when the same test appears twice with different values (no silent reconciliation)", () => {
    const text = `Lab Results (Morning Panel):
HbA1c: 5.5 % (Reference: <5.7%) - Normal

Lab Results (Afternoon Repeat Panel, same day):
HbA1c: 8.9 % (Reference: <5.7%) - High`;

    const facts = extractDeterministicFacts(text);
    const hba1cEntries = facts.labResults.filter((l) => l.test === "HbA1c");
    expect(hba1cEntries).toHaveLength(2);
    expect(hba1cEntries.map((l) => l.value).sort()).toEqual(["5.5", "8.9"]);
  });

  it("computes status from a disclosed numeric reference range without needing an explicit label", () => {
    const text = `2. Laboratory Results
Total Cholesterol 196 mg/dL <200
Fasting Glucose 96 mg/dL 70–99
eGFR 103 mL/min/1.73m² >90
Creatinine 0.94 mg/dL 0.7–1.3`;

    const facts = extractDeterministicFacts(text);
    expect(facts.labResults.find((l) => l.test === "Total Cholesterol")?.status).toBe("normal");
    expect(facts.labResults.find((l) => l.test === "Fasting Glucose")?.status).toBe("normal");
    expect(facts.labResults.find((l) => l.test === "eGFR")?.status).toBe("normal");
    expect(facts.labResults.find((l) => l.test === "Creatinine")?.status).toBe("normal");
  });

  it("leaves status unknown for a prose (non-numeric) reference range rather than guessing", () => {
    const text = `2. Laboratory Results
ALT 42 U/L Lab dependent`;
    const facts = extractDeterministicFacts(text);
    expect(facts.labResults[0].status).toBe("unknown");
  });

  it("does not invent values for a line with no parseable numeric value", () => {
    const text = `2. Laboratory Results
Overall Impression Stable No Concerns`;
    const facts = extractDeterministicFacts(text);
    expect(facts.labResults).toHaveLength(0);
  });

  it("ignores page-break markers and table headers", () => {
    const text = `2. Laboratory Results
Test Result Unit Reference Range
Hemoglobin 14.6 g/dL 13.5–17.5

-- 1 of 2 --

3. Medical History
some notes here.`;
    const facts = extractDeterministicFacts(text);
    expect(facts.labResults).toHaveLength(1);
    expect(facts.labResults[0].test).toBe("Hemoglobin");
    expect(facts.additionalNotes).not.toContain("--");
  });

  it("returns empty results (not fabricated data) for text with no recognizable structure", () => {
    const facts = extractDeterministicFacts("This is just a paragraph of prose with no tables or labeled fields at all.");
    expect(facts.labResults).toEqual([]);
    expect(facts.medications).toEqual([]);
    expect(facts.patientDetails).toEqual({ name: "unknown", age: "unknown", sex: "unknown", reportDate: "unknown" });
  });
});
