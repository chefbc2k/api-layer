import { describe, expect, it, vi } from "vitest";

import { isRetryableRpcError, runWithTransientRpcRetries } from "./transient-rpc-retry.js";

describe("transient rpc retry helpers", () => {
  it("classifies timeout and rate limit errors as retryable", () => {
    expect(isRetryableRpcError(new Error("request timeout"))).toBe(true);
    expect(isRetryableRpcError({ shortMessage: "429 Too Many Requests" })).toBe(true);
    expect(isRetryableRpcError("service unavailable")).toBe(true);
    expect(isRetryableRpcError(503)).toBe(false);
    const circular: { message: string; cause?: unknown } = { message: "socket hang up" };
    circular.cause = circular;
    expect(isRetryableRpcError(circular)).toBe(true);
    expect(isRetryableRpcError({
      shortMessage: "missing revert data",
      info: {
        error: {
          message: "failed to get storage: connection reset",
        },
      },
    })).toBe(true);
    expect(isRetryableRpcError(new Error("execution reverted"))).toBe(false);
  });

  it("retries retryable failures until the operation succeeds", async () => {
    vi.useFakeTimers();
    const log = vi.fn();
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error("request timeout"))
      .mockRejectedValueOnce({ shortMessage: "429 Too Many Requests" })
      .mockResolvedValueOnce("ok");

    const promise = runWithTransientRpcRetries(operation, {
      label: "governance proof",
      maxAttempts: 3,
      baseDelayMs: 25,
      log,
    });

    await vi.advanceTimersByTimeAsync(75);
    await expect(promise).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(3);
    expect(log).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-retryable failures", async () => {
    const operation = vi.fn().mockRejectedValue(new Error("execution reverted"));
    await expect(runWithTransientRpcRetries(operation, {
      label: "setup",
      maxAttempts: 3,
      baseDelayMs: 1,
    })).rejects.toThrow("execution reverted");
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("surfaces the terminal failure immediately when max attempts normalizes to one", async () => {
    const operation = vi.fn().mockRejectedValue(new Error("request timeout"));

    await expect(runWithTransientRpcRetries(operation, {
      label: "setup",
      maxAttempts: 0,
      baseDelayMs: 1,
    })).rejects.toThrow("request timeout");

    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("throws the retained last error when the attempt loop is skipped by an invalid maxAttempts value", async () => {
    await expect(runWithTransientRpcRetries(() => Promise.resolve("ok"), {
      label: "setup",
      maxAttempts: Number.NaN,
      baseDelayMs: 1,
    })).rejects.toBeUndefined();
  });
});
