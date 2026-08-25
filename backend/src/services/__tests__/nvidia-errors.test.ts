import { describe, it, expect } from "vitest";
import { AiServiceError, aiErrorStatus } from "../nvidia.js";

describe("aiErrorStatus", () => {
  it("maps rate_limited to 429 (used for both NVIDIA 429 and 503)", () => {
    expect(aiErrorStatus(new AiServiceError("busy", "rate_limited"))).toBe(429);
  });

  it("maps timeout to 504", () => {
    expect(aiErrorStatus(new AiServiceError("slow", "timeout"))).toBe(504);
  });

  it("maps payload_too_large to 413", () => {
    expect(aiErrorStatus(new AiServiceError("too big", "payload_too_large"))).toBe(413);
  });

  it("maps network_error and upstream_error to 502", () => {
    expect(aiErrorStatus(new AiServiceError("down", "network_error"))).toBe(502);
    expect(aiErrorStatus(new AiServiceError("down", "upstream_error"))).toBe(502);
  });

  it("never maps invalid_api_key to 401/403 — that would trigger the frontend's user-session logout", () => {
    const status = aiErrorStatus(new AiServiceError("bad key", "invalid_api_key"));
    expect(status).not.toBe(401);
    expect(status).not.toBe(403);
    expect(status).toBe(500);
  });

  it("falls back to 500 for a non-AiServiceError", () => {
    expect(aiErrorStatus(new Error("something else"))).toBe(500);
  });
});
