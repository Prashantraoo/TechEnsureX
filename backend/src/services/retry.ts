// ─── Shared bounded-retry helper ────────────────────────
// Retries only error classes that are genuinely worth retrying — a
// dropped connection before any content arrived, a 429/503 "busy"
// response, or (for streamed JSON extraction calls) a response that
// came back completely empty. A plain "timeout" is deliberately never
// retried: the model IS responding, just slowly, and retrying would
// just double an already-long wait. Reused by document-analysis.service.ts,
// vision-analysis.service.ts, and ai.service.ts's chat path (each with
// its own call shape, sharing just this retry policy).
//
// Attempt budget is deliberately shaped by how fast the failure came
// back, not by a flat count. NVIDIA rejects a request outright when the
// model's capacity pool is momentarily full (see isTransientCapacityError
// in nvidia.ts) and that rejection arrives in ~200-800ms — measured at a
// 20-40% rate from production against a healthy model. One retry leaves
// a visible share of users on an error for something that costs
// milliseconds to retry, so a failure that came back FAST earns up to
// two extra attempts. A failure that took real time (a soft deadline
// producing an empty response, say) gets the single retry it always
// had, so a slow path can never multiply into a much longer wait.

import { AiServiceError, type AiErrorCode } from "./nvidia.js";

const DEFAULT_RETRYABLE_CODES: AiErrorCode[] = ["network_error", "rate_limited"];

// Under this, the attempt cost nothing worth worrying about and the
// failure is almost certainly an immediate capacity rejection.
const FAST_FAILURE_MS = 5_000;
const MAX_ATTEMPTS = 3;

export async function withBoundedRetry<T>(
  fn: () => Promise<T>,
  label = "request",
  retryableCodes: AiErrorCode[] = DEFAULT_RETRYABLE_CODES
): Promise<T> {
  let attempt = 0;
  for (;;) {
    attempt++;
    const startedAt = Date.now();
    try {
      return await fn();
    } catch (error) {
      const elapsed = Date.now() - startedAt;
      const retryable = error instanceof AiServiceError && retryableCodes.includes(error.code);
      // Attempt 2 is always allowed for a retryable code; attempt 3 only
      // if the previous failure was fast enough to be free.
      const allowed = attempt < MAX_ATTEMPTS && (attempt === 1 || elapsed < FAST_FAILURE_MS);
      if (!retryable || !allowed) throw error;

      const backoffMs = error.code === "rate_limited" ? 400 * attempt : 0;
      console.warn(
        `${label}: ${error.code} after ${elapsed}ms — retrying (attempt ${attempt + 1}/${MAX_ATTEMPTS})${backoffMs ? ` after ${backoffMs}ms` : ""}.`
      );
      if (backoffMs) await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }
}
