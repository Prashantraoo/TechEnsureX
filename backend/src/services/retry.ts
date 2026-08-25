// ─── Shared bounded-retry helper ────────────────────────
// One retry, only for error classes that are genuinely worth retrying —
// a dropped connection before any content arrived, a 429/503 "busy"
// response, or (for streamed JSON extraction calls) a response that
// came back completely empty. A plain "timeout" is deliberately never
// retried: the model IS responding, just slowly, and retrying would
// just double an already-long wait. Reused by document-analysis.service.ts,
// vision-analysis.service.ts, and ai.service.ts's chat path (each with
// its own call shape, sharing just this retry policy).

import { AiServiceError, type AiErrorCode } from "./nvidia.js";

const DEFAULT_RETRYABLE_CODES: AiErrorCode[] = ["network_error", "rate_limited"];

export async function withBoundedRetry<T>(
  fn: () => Promise<T>,
  label = "request",
  retryableCodes: AiErrorCode[] = DEFAULT_RETRYABLE_CODES
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof AiServiceError && retryableCodes.includes(error.code)) {
      const backoffMs = error.code === "rate_limited" ? 800 : 0;
      console.warn(`${label}: ${error.code} — retrying once${backoffMs ? ` after ${backoffMs}ms` : ""}.`);
      if (backoffMs) await new Promise((resolve) => setTimeout(resolve, backoffMs));
      return await fn();
    }
    throw error;
  }
}
