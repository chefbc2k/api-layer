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

  it("falls back to default retry settings when numeric options are invalid", async () => {
    vi.useFakeTimers();
    const log = vi.fn();
    const operation = vi.fn()
      .mockRejectedValueOnce("service unavailable")
      .mockRejectedValueOnce({ reason: "network error" })
      .mockResolvedValueOnce("ok");

    const promise = runWithTransientRpcRetries(operation, {
      label: "setup",
      maxAttempts: Number.NaN,
      baseDelayMs: Number.NaN,
      log,
    });

    await vi.advanceTimersByTimeAsync(4_500);
    await expect(promise).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(3);
    expect(log).toHaveBeenNthCalledWith(
      1,
      "setup transient RPC failure on attempt 1/3: service unavailable. Retrying...",
    );
    expect(log).toHaveBeenNthCalledWith(
      2,
      "setup transient RPC failure on attempt 2/3: [object Object]. Retrying...",
    );
  });

  it("clamps negative base delays to zero before retrying", async () => {
    vi.useFakeTimers();
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error("request timeout"))
      .mockResolvedValueOnce("ok");

    const promise = runWithTransientRpcRetries(operation, {
      label: "setup",
      maxAttempts: 2,
      baseDelayMs: -10,
    });

    await vi.advanceTimersByTimeAsync(0);
    await expect(promise).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
  });
});
