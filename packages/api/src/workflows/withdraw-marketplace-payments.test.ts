import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createMarketplacePrimitiveService: vi.fn(),
  waitForWorkflowWriteReceipt: vi.fn(),
}));

vi.mock("../modules/marketplace/primitives/generated/index.js", () => ({
  createMarketplacePrimitiveService: mocks.createMarketplacePrimitiveService,
}));

vi.mock("./wait-for-write.js", () => ({
  waitForWorkflowWriteReceipt: mocks.waitForWorkflowWriteReceipt,
}));

import { runWithdrawMarketplacePaymentsWorkflow } from "./withdraw-marketplace-payments.js";

describe("runWithdrawMarketplacePaymentsWorkflow", () => {
  const auth = { apiKey: "test-key", label: "test", roles: ["service"], allowGasless: false };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("withdraws pending payments through the deadline path and confirms cleared pending state", async () => {
    const sequence: string[] = [];
    mocks.createMarketplacePrimitiveService.mockReturnValue({
      getUsdcToken: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000cc" }),
      isPaused: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      paymentPaused: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      getTreasuryAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000dd" }),
      getDevFundAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000ee" }),
      getUnionTreasuryAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000ff" }),
      getPendingPayments: vi.fn()
        .mockImplementationOnce(async () => {
          sequence.push("pending-before");
          return { statusCode: 200, body: "125" };
        })
        .mockImplementationOnce(async () => {
          sequence.push("pending-after");
          return { statusCode: 200, body: "0" };
        }),
      withdrawPaymentsWithDeadline: vi.fn().mockImplementation(async () => {
        sequence.push("withdraw-deadline");
        return { statusCode: 202, body: { txHash: "0xwithdraw-write" } };
      }),
      withdrawPayments: vi.fn(),
      usdcpaymentWithdrawnEventQuery: vi.fn().mockImplementation(async () => {
        sequence.push("withdraw-events");
        return [{ transactionHash: "0xwithdraw-receipt" }];
      }),
    });
    mocks.waitForWorkflowWriteReceipt.mockImplementationOnce(async () => {
      sequence.push("wait-withdraw");
      return "0xwithdraw-receipt";
    });

    const result = await runWithdrawMarketplacePaymentsWorkflow({
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, label: string, work: (provider: { getTransactionReceipt: (txHash: string) => Promise<unknown> }) => Promise<unknown>) => {
          sequence.push(`receipt:${label}`);
          return work({ getTransactionReceipt: vi.fn(async () => ({ blockNumber: 1701 })) });
        }),
      },
    } as never, auth as never, "0x00000000000000000000000000000000000000aa", {
      deadline: "999999",
    });

    expect(sequence).toEqual([
      "pending-before",
      "withdraw-deadline",
      "wait-withdraw",
      "receipt:workflow.withdrawMarketplacePayments.withdrawal.receipt",
      "pending-after",
      "withdraw-events",
    ]);
    expect(result).toEqual({
      preflight: {
        payee: "0x00000000000000000000000000000000000000aa",
        paymentToken: "0x00000000000000000000000000000000000000cc",
        paymentPaused: false,
        pendingBefore: "125",
      },
      withdrawal: {
        mode: "deadline",
        submission: { txHash: "0xwithdraw-write" },
        txHash: "0xwithdraw-receipt",
        pendingAfter: "0",
        eventCount: 1,
        deadline: "999999",
      },
      summary: {
        payee: "0x00000000000000000000000000000000000000aa",
        clearedPending: true,
        deadline: "999999",
      },
    });
  });

  it("fails early when no pending payments are available", async () => {
    mocks.createMarketplacePrimitiveService.mockReturnValue({
      getUsdcToken: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000cc" }),
      isPaused: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      paymentPaused: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      getTreasuryAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000dd" }),
      getDevFundAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000ee" }),
      getUnionTreasuryAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000ff" }),
      getPendingPayments: vi.fn().mockResolvedValue({ statusCode: 200, body: "0" }),
      withdrawPaymentsWithDeadline: vi.fn(),
      withdrawPayments: vi.fn(),
      usdcpaymentWithdrawnEventQuery: vi.fn(),
    });

    await expect(runWithdrawMarketplacePaymentsWorkflow({
      providerRouter: { withProvider: vi.fn() },
    } as never, auth as never, "0x00000000000000000000000000000000000000aa", {})).rejects.toThrow(
      "withdraw-marketplace-payments requires pending payments",
    );
  });

  it("fails early when marketplace payments are paused", async () => {
    mocks.createMarketplacePrimitiveService.mockReturnValue({
      getUsdcToken: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000cc" }),
      isPaused: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      paymentPaused: vi.fn().mockResolvedValue({ statusCode: 200, body: true }),
      getTreasuryAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000dd" }),
      getDevFundAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000ee" }),
      getUnionTreasuryAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000ff" }),
      getPendingPayments: vi.fn(),
      withdrawPaymentsWithDeadline: vi.fn(),
      withdrawPayments: vi.fn(),
      usdcpaymentWithdrawnEventQuery: vi.fn(),
    });

    await expect(runWithdrawMarketplacePaymentsWorkflow({
      providerRouter: { withProvider: vi.fn() },
    } as never, auth as never, "0x00000000000000000000000000000000000000aa", {})).rejects.toThrow(
      "withdraw-marketplace-payments requires payments to be unpaused",
    );
  });

  it("returns zero event count when no withdrawal receipt block is available", async () => {
    const marketplace = {
      getUsdcToken: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000cc" }),
      isPaused: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      paymentPaused: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      getTreasuryAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000dd" }),
      getDevFundAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000ee" }),
      getUnionTreasuryAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000ff" }),
      getPendingPayments: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "10" })
        .mockResolvedValueOnce({ statusCode: 200, body: "0" }),
      withdrawPaymentsWithDeadline: vi.fn(),
      withdrawPayments: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xwithdraw-write" } }),
      usdcpaymentWithdrawnEventQuery: vi.fn(),
    };
    mocks.createMarketplacePrimitiveService.mockReturnValue(marketplace);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValueOnce(null);

    const result = await runWithdrawMarketplacePaymentsWorkflow({
      providerRouter: { withProvider: vi.fn() },
    } as never, auth as never, "0x00000000000000000000000000000000000000aa", {});

    expect(result.withdrawal).toMatchObject({
      mode: "standard",
      txHash: null,
      eventCount: 0,
      deadline: null,
    });
    expect(marketplace.usdcpaymentWithdrawnEventQuery).not.toHaveBeenCalled();
  });

  it("withdraws pending payments through the standard path when no deadline is provided", async () => {
    const sequence: string[] = [];
    mocks.createMarketplacePrimitiveService.mockReturnValue({
      getUsdcToken: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000cc" }),
      isPaused: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      paymentPaused: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      getTreasuryAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000dd" }),
      getDevFundAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000ee" }),
      getUnionTreasuryAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000ff" }),
      getPendingPayments: vi.fn()
        .mockImplementationOnce(async () => {
          sequence.push("pending-before");
          return { statusCode: 200, body: "25" };
        })
        .mockImplementationOnce(async () => {
          sequence.push("pending-after");
          return { statusCode: 200, body: "0" };
        }),
      withdrawPaymentsWithDeadline: vi.fn(),
      withdrawPayments: vi.fn().mockImplementation(async () => {
        sequence.push("withdraw-standard");
        return { statusCode: 202, body: { txHash: "0xwithdraw-write" } };
      }),
      usdcpaymentWithdrawnEventQuery: vi.fn().mockImplementation(async () => {
        sequence.push("withdraw-events");
        return [{ transactionHash: "0xwithdraw-receipt" }];
      }),
    });
    mocks.waitForWorkflowWriteReceipt.mockImplementationOnce(async () => {
      sequence.push("wait-withdraw");
      return "0xwithdraw-receipt";
    });

    const result = await runWithdrawMarketplacePaymentsWorkflow({
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, label: string, work: (provider: { getTransactionReceipt: (txHash: string) => Promise<unknown> }) => Promise<unknown>) => {
          sequence.push(`receipt:${label}`);
          return work({ getTransactionReceipt: vi.fn(async () => ({ blockNumber: 1901 })) });
        }),
      },
    } as never, auth as never, "0x00000000000000000000000000000000000000aa", {});

    expect(sequence).toEqual([
      "pending-before",
      "withdraw-standard",
      "wait-withdraw",
      "receipt:workflow.withdrawMarketplacePayments.withdrawal.receipt",
      "pending-after",
      "withdraw-events",
    ]);
    expect(result.withdrawal).toEqual({
      mode: "standard",
      submission: { txHash: "0xwithdraw-write" },
      txHash: "0xwithdraw-receipt",
      pendingAfter: "0",
      eventCount: 1,
      deadline: null,
    });
    expect(result.summary).toEqual({
      payee: "0x00000000000000000000000000000000000000aa",
      clearedPending: true,
      deadline: null,
    });
  });

  it("retries pending-payment confirmation until the payee balance clears to zero", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: (...args: never[]) => void) => {
      callback();
      return 0;
    }) as typeof setTimeout);
    const marketplace = {
      getUsdcToken: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000cc" }),
      isPaused: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      paymentPaused: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      getTreasuryAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000dd" }),
      getDevFundAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000ee" }),
      getUnionTreasuryAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000ff" }),
      getPendingPayments: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "25" })
        .mockResolvedValueOnce({ statusCode: 200, body: "1" })
        .mockResolvedValueOnce({ statusCode: 200, body: "0" }),
      withdrawPaymentsWithDeadline: vi.fn(),
      withdrawPayments: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xwithdraw-write" } }),
      usdcpaymentWithdrawnEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xwithdraw-receipt" }]),
    };
    mocks.createMarketplacePrimitiveService.mockReturnValue(marketplace);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValueOnce("0xwithdraw-receipt");

    try {
      const result = await runWithdrawMarketplacePaymentsWorkflow({
        providerRouter: {
          withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: {
            getTransactionReceipt: (txHash: string) => Promise<unknown>;
          }) => Promise<unknown>) => work({ getTransactionReceipt: vi.fn(async () => ({ blockNumber: 1903 })) })),
        },
      } as never, auth as never, "0x00000000000000000000000000000000000000aa", {});

      expect(marketplace.getPendingPayments).toHaveBeenCalledTimes(3);
      expect(setTimeoutSpy).toHaveBeenCalled();
      expect(result.withdrawal.pendingAfter).toBe("0");
    } finally {
      setTimeoutSpy.mockRestore();
    }
  });

  it("normalizes a missing pending-after payee to null in the workflow summary", async () => {
    mocks.createMarketplacePrimitiveService.mockReturnValue({
      getUsdcToken: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000cc" }),
      isPaused: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      paymentPaused: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      getTreasuryAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000dd" }),
      getDevFundAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000ee" }),
      getUnionTreasuryAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000ff" }),
      getPendingPayments: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "15" })
        .mockResolvedValueOnce({ statusCode: 200, body: {} }),
      withdrawPaymentsWithDeadline: vi.fn(),
      withdrawPayments: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xwithdraw-write" } }),
      usdcpaymentWithdrawnEventQuery: vi.fn(),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValueOnce(null);

    const result = await runWithdrawMarketplacePaymentsWorkflow({
      providerRouter: { withProvider: vi.fn() },
    } as never, auth as never, "0x00000000000000000000000000000000000000aa", {});

    expect(result.preflight.pendingBefore).toBe("15");
    expect(result.withdrawal.pendingAfter).toBe(null);
  });

});
