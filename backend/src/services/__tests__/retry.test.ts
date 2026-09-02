import { describe, it, expect, vi } from "vitest";
import { withBoundedRetry } from "../retry.js";
import { AiServiceError } from "../nvidia.js";

const busy = () => new AiServiceError("busy", "rate_limited");

describe("withBoundedRetry", () => {
  it("returns the first successful result without retrying", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    await expect(withBoundedRetry(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries a fast capacity rejection up to 3 attempts", async () => {
    const fn = vi.fn().mockRejectedValueOnce(busy()).mockRejectedValueOnce(busy()).mockResolvedValue("ok");
    await expect(withBoundedRetry(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("gives up after 3 attempts rather than retrying forever", async () => {
    const fn = vi.fn().mockRejectedValue(busy());
    await expect(withBoundedRetry(fn)).rejects.toThrow(/busy/);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("never retries a timeout — the model is responding, just slowly", async () => {
    const fn = vi.fn().mockRejectedValue(new AiServiceError("slow", "timeout"));
    await expect(withBoundedRetry(fn)).rejects.toThrow(/slow/);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("only retries codes the caller opted into", async () => {
    const fn = vi.fn().mockRejectedValue(new AiServiceError("empty", "empty_response"));
    await expect(withBoundedRetry(fn, "t", ["network_error"])).rejects.toThrow(/empty/);
    expect(fn).toHaveBeenCalledTimes(1);

    const fn2 = vi.fn().mockRejectedValueOnce(new AiServiceError("empty", "empty_response")).mockResolvedValue("ok");
    await expect(withBoundedRetry(fn2, "t", ["empty_response"])).resolves.toBe("ok");
  });

  it("stops after one retry when the failure was slow, so a slow path can't multiply", async () => {
    vi.useFakeTimers();
    try {
      const fn = vi.fn().mockImplementation(async () => {
        vi.advanceTimersByTime(30_000); // a soft deadline, not a capacity rejection
        throw busy();
      });
      const promise = withBoundedRetry(fn).catch((e) => e);
      await vi.runAllTimersAsync();
      expect(await promise).toBeInstanceOf(AiServiceError);
      expect(fn).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not retry a non-AiServiceError", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("bug"));
    await expect(withBoundedRetry(fn)).rejects.toThrow("bug");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
