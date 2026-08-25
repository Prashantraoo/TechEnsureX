import { describe, it, expect } from "vitest";
import { tryParseJsonObject } from "../json-repair.js";

describe("tryParseJsonObject", () => {
  it("parses clean JSON", () => {
    expect(tryParseJsonObject('{"a": 1, "b": "two"}')).toEqual({ a: 1, b: "two" });
  });

  it("strips markdown code fences", () => {
    expect(tryParseJsonObject('```json\n{"a": 1}\n```')).toEqual({ a: 1 });
  });

  it("extracts a {...} block from surrounding prose", () => {
    expect(tryParseJsonObject('Here is the result:\n{"a": 1}\nHope that helps!')).toEqual({ a: 1 });
  });

  it("repairs a response truncated mid-string (hit max_tokens)", () => {
    const truncated = '{"summary": "Patient shows elevated LDL and triglyc';
    expect(tryParseJsonObject(truncated)).toEqual({ summary: "Patient shows elevated LDL and triglyc" });
  });

  it("repairs a response truncated mid-array with nested objects", () => {
    const truncated =
      '{"labResults": [{"test": "HbA1c", "value": "5.5"}, {"test": "LDL", "value": "118"';
    const result = tryParseJsonObject(truncated) as any;
    expect(result.labResults).toHaveLength(2);
    expect(result.labResults[1].value).toBe("118");
  });

  it("does not let braces inside string values confuse the repair", () => {
    const truncated = '{"note": "risk is {high} for this patient", "score": 4';
    const result = tryParseJsonObject(truncated) as any;
    expect(result.note).toBe("risk is {high} for this patient");
  });

  it("drops a trailing comma left by truncation right after a completed item", () => {
    const truncated = '{"items": ["a", "b",';
    const result = tryParseJsonObject(truncated) as any;
    expect(result.items).toEqual(["a", "b"]);
  });

  it("returns null for genuinely unrecoverable garbage", () => {
    expect(tryParseJsonObject("The answer is 42, not a JSON object at all.")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(tryParseJsonObject("")).toBeNull();
  });
});
