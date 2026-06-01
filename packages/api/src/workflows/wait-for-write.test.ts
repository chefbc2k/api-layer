import { afterEach, describe, expect, it, vi } from "vitest";

import { waitForWorkflowWriteReceipt } from "./wait-for-write.js";

describe("waitForWorkflowWriteReceipt", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when the payload does not contain a transaction hash", async () => {
    const withProvider = vi.fn();
    const result = await waitForWorkflowWriteReceipt({
      providerRouter: { withProvider },
    } as never, { requestId: "abc" }, "workflow");

    expect(result).toBeNull();
    expect(withProvider).not.toHaveBeenCalled();
  });

  it("returns null when the payload is not an object", async () => {
    const withProvider = vi.fn();
    const result = await waitForWorkflowWriteReceipt({
      providerRouter: { withProvider },
    } as never, null, "workflow");

    expect(result).toBeNull();
    expect(withProvider).not.toHaveBeenCalled();
  });

  it("returns null when the payload txHash is not a hex string", async () => {
    const withProvider = vi.fn();
    const result = await waitForWorkflowWriteReceipt({
      providerRouter: { withProvider },
    } as never, { txHash: "submitted" }, "workflow");

    expect(result).toBeNull();
    expect(withProvider).not.toHaveBeenCalled();
  });

  it("retries receipt reads until a successful receipt is available", async () => {
    const withProvider = vi.fn()
      .mockImplementationOnce(async (_mode, _label, work) => work({ getTransactionReceipt: vi.fn(async () => null) }))
      .mockImplementationOnce(async (_mode, _label, work) => work({ getTransactionReceipt: vi.fn(async () => null) }))
      .mockImplementationOnce(async (_mode, _label, work) => work({ getTransactionReceipt: vi.fn(async () => ({ status: 1n })) }));
    vi.spyOn(global, "setTimeout").mockImplementation(((fn: (...args: Array<unknown>) => void) => {
      fn();
      return 0 as never;
    }) as typeof setTimeout);

    const result = await waitForWorkflowWriteReceipt({
      providerRouter: { withProvider },
    } as never, { txHash: "0x1234" }, "workflow");

    expect(result).toBe("0x1234");
    expect(withProvider).toHaveBeenCalledTimes(3);
    expect(withProvider).toHaveBeenNthCalledWith(1, "read", "workflow.workflow.receipt", expect.any(Function));
  });

  it("throws when the receipt reports a reverted transaction", async () => {
    const withProvider = vi.fn().mockImplementation(async (_mode, _label, work) => work({
      getTransactionReceipt: vi.fn(async () => ({ status: 0n })),
    }));

    await expect(waitForWorkflowWriteReceipt({
      providerRouter: { withProvider },
    } as never, { txHash: "0xdead" }, "reverted")).rejects.toThrow("reverted transaction reverted: 0xdead");
  });

  it("throws when the receipt never arrives", async () => {
    const withProvider = vi.fn().mockImplementation(async (_mode, _label, work) => work({
      getTransactionReceipt: vi.fn(async () => null),
    }));
    vi.spyOn(global, "setTimeout").mockImplementation(((fn: (...args: Array<unknown>) => void) => {
      fn();
      return 0 as never;
    }) as typeof setTimeout);

    await expect(waitForWorkflowWriteReceipt({
      providerRouter: { withProvider },
    } as never, { txHash: "0xbeef" }, "timeout")).rejects.toThrow("timeout transaction receipt timeout: 0xbeef");
    expect(withProvider).toHaveBeenCalledTimes(120);
  });

  it("uses the non-test poll delay when imported under a production node environment", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const withProvider = vi.fn()
      .mockImplementationOnce(async (_mode, _label, work) => work({ getTransactionReceipt: vi.fn(async () => null) }))
      .mockImplementationOnce(async (_mode, _label, work) => work({ getTransactionReceipt: vi.fn(async () => ({ status: 1 })) }));
    const setTimeoutSpy = vi.spyOn(global, "setTimeout").mockImplementation(((fn: (...args: Array<unknown>) => void) => {
      fn();
      return 0 as never;
    }) as typeof setTimeout);

    process.env.NODE_ENV = "production";
    vi.resetModules();

    try {
      const { waitForWorkflowWriteReceipt: waitForProdReceipt } = await import("./wait-for-write.js");

      await expect(waitForProdReceipt({
        providerRouter: { withProvider },
      } as never, { txHash: "0xprod" }, "prod")).resolves.toBe("0xprod");
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 500);
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      vi.resetModules();
    }
  });
});
