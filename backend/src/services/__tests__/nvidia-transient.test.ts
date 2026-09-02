import { describe, it, expect } from "vitest";
import { AiServiceError, mapNvidiaError } from "../nvidia.js";

// The two payloads below are verbatim from live production traffic
// against integrate.api.nvidia.com. Both arrive INSIDE a streaming
// response (HTTP 200, first SSE frame is `data: {"error":{...}}`), which
// the OpenAI SDK turns into an APIError carrying the body's code/type
// but no HTTP status. Classifying those by status alone read them as a
// network failure — a misleading "check your connection" message for
// what is really the provider being briefly out of capacity, and a miss
// on the accurate retry class.
function sdkStreamError(body: Record<string, unknown>) {
  // Shape the SDK produces: `error` holds the body's error object and
  // its fields are also lifted onto the error itself; status is absent.
  return Object.assign(new Error(String(body.message)), { error: body, ...body, status: undefined });
}

describe("mapNvidiaError — transient capacity failures", () => {
  it("classifies an in-stream 'Service temporarily overloaded' frame as rate_limited", () => {
    const mapped = mapNvidiaError(
      sdkStreamError({ message: "Service temporarily overloaded", type: "service_unavailable", code: 503 })
    );
    expect(mapped).toBeInstanceOf(AiServiceError);
    expect(mapped.code).toBe("rate_limited");
    expect(mapped.message).toMatch(/busy/i);
  });

  it("classifies an in-stream ResourceExhausted worker-limit frame as rate_limited", () => {
    const mapped = mapNvidiaError(
      sdkStreamError({
        message: "ResourceExhausted: Worker local total request limit reached (16/16)",
        type: "internal_server_error",
        code: 500,
      })
    );
    expect(mapped.code).toBe("rate_limited");
  });

  it("still classifies an ordinary HTTP 429 as rate_limited", () => {
    expect(mapNvidiaError({ status: 429 }).code).toBe("rate_limited");
  });

  it("leaves a genuine connection failure as network_error", () => {
    expect(mapNvidiaError(new Error("fetch failed")).code).toBe("network_error");
  });

  it("still classifies an abort as timeout, not capacity", () => {
    const abort = Object.assign(new Error("aborted"), { name: "AbortError" });
    expect(mapNvidiaError(abort).code).toBe("timeout");
  });

  it("does not misread an unrelated 500 as a capacity problem", () => {
    expect(mapNvidiaError({ status: 500, message: "internal error" }).code).toBe("upstream_error");
  });
});
