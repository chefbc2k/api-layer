import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createTokenomicsPrimitiveService: vi.fn(),
  waitForWorkflowWriteReceipt: vi.fn(),
}));

vi.mock("../modules/tokenomics/primitives/generated/index.js", () => ({
  createTokenomicsPrimitiveService: mocks.createTokenomicsPrimitiveService,
}));

vi.mock("./wait-for-write.js", () => ({
  waitForWorkflowWriteReceipt: mocks.waitForWorkflowWriteReceipt,
}));

import { runReleaseBeneficiaryVestingWorkflow } from "./release-beneficiary-vesting.js";

function tokenEconomics(balanceBefore = "100", balanceAfter = balanceBefore, supply = "1000") {
  return {
    tokenBalanceOf: vi.fn()
      .mockResolvedValueOnce({ statusCode: 200, body: balanceBefore })
      .mockResolvedValueOnce({ statusCode: 200, body: balanceAfter }),
    totalSupply: vi.fn()
      .mockResolvedValueOnce({ statusCode: 200, body: supply })
      .mockResolvedValueOnce({ statusCode: 200, body: supply }),
  };
}

describe("runReleaseBeneficiaryVestingWorkflow", () => {
  const auth = {
    apiKey: "test-key",
    label: "test",
    roles: ["service"],
    allowGasless: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("releases standard vesting for a beneficiary and confirms released amounts", async () => {
    const sequence: string[] = [];
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      ...tokenEconomics("100", "120"),
      hasVestingSchedule: vi.fn()
        .mockImplementationOnce(async () => ({ statusCode: 200, body: true }))
        .mockImplementationOnce(async () => ({ statusCode: 200, body: true })),
      getStandardVestingSchedule: vi.fn()
        .mockImplementationOnce(async () => {
          sequence.push("schedule-before");
          return { statusCode: 200, body: { releasedAmount: "50", totalAmount: "1000", revoked: false } };
        })
        .mockImplementationOnce(async () => {
          sequence.push("schedule-after");
          return { statusCode: 200, body: { releasedAmount: "70", totalAmount: "1000", revoked: false } };
        }),
      getVestingDetails: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { releasedAmount: "50" } })
        .mockResolvedValueOnce({ statusCode: 200, body: { releasedAmount: "70" } }),
      getVestingReleasableAmount: vi.fn()
        .mockImplementationOnce(async () => {
          sequence.push("releasable-before");
          return { statusCode: 200, body: "20" };
        })
        .mockImplementationOnce(async () => {
          sequence.push("releasable-after");
          return { statusCode: 200, body: "0" };
        }),
      getVestingTotalAmount: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { totalVested: "200", totalReleased: "50", releasable: "20" } })
        .mockResolvedValueOnce({ statusCode: 200, body: { totalVested: "220", totalReleased: "70", releasable: "0" } }),
      releaseStandardVestingFor: vi.fn().mockImplementation(async () => {
        sequence.push("release-for");
        return { statusCode: 202, body: { txHash: "0xrelease", result: "20" } };
      }),
      releaseStandardVesting: vi.fn(),
      tokensReleasedEventQuery: vi.fn().mockImplementation(async () => {
        sequence.push("release-events");
        return [{ transactionHash: "0xrelease-receipt", amount: "20" }];
      }),
    });
    mocks.waitForWorkflowWriteReceipt.mockImplementationOnce(async () => {
      sequence.push("wait-release");
      return "0xrelease-receipt";
    });
    const context = {
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, label: string, work: (provider: {
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
        }) => Promise<unknown>) => {
          sequence.push(`receipt:${label}`);
          return work({ getTransactionReceipt: vi.fn(async () => ({ blockNumber: 901 })) });
        }),
      },
    } as never;

    const result = await runReleaseBeneficiaryVestingWorkflow(context, auth, undefined, {
      beneficiary: "0x00000000000000000000000000000000000000bb",
      mode: "for",
    });

    expect(sequence).toEqual([
      "schedule-before",
      "releasable-before",
      "release-for",
      "wait-release",
      "receipt:workflow.releaseBeneficiaryVesting.for.receipt",
      "release-events",
      "schedule-after",
      "releasable-after",
    ]);
    expect(result.release.releasedNow).toBe("20");
    expect(result.release.eventCount).toBe(1);
    expect(result.economics).toEqual({
      released: { before: "50", after: "70", delta: "20" },
      beneficiaryBalance: { before: "100", after: "120", delta: "20" },
      totalSupply: { before: "1000", after: "1000", delta: "0" },
    });
  });

  it("supports the self-release path", async () => {
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      ...tokenEconomics("100", "105"),
      hasVestingSchedule: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: true })
        .mockResolvedValueOnce({ statusCode: 200, body: true }),
      getStandardVestingSchedule: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { releasedAmount: "10", totalAmount: "1000", revoked: false } })
        .mockResolvedValueOnce({ statusCode: 200, body: { releasedAmount: "15", totalAmount: "1000", revoked: false } }),
      getVestingDetails: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { releasedAmount: "10" } })
        .mockResolvedValueOnce({ statusCode: 200, body: { releasedAmount: "15" } }),
      getVestingReleasableAmount: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "5" })
        .mockResolvedValueOnce({ statusCode: 200, body: "0" }),
      getVestingTotalAmount: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { totalVested: "50", totalReleased: "10", releasable: "5" } })
        .mockResolvedValueOnce({ statusCode: 200, body: { totalVested: "55", totalReleased: "15", releasable: "0" } }),
      releaseStandardVesting: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xself", result: "5" } }),
      releaseStandardVestingFor: vi.fn(),
      tokensReleasedEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xself-receipt", amount: "5" }]),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xself-receipt");

    const result = await runReleaseBeneficiaryVestingWorkflow({
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: {
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
        }) => Promise<unknown>) => work({ getTransactionReceipt: vi.fn(async () => ({ blockNumber: 902 })) })),
      },
    } as never, auth, "0x00000000000000000000000000000000000000bb", {
      beneficiary: "0x00000000000000000000000000000000000000bb",
      mode: "self",
    });

    expect(result.release.mode).toBe("self");
  });

  it("prefers the conserved state and balance delta when the reported release amount is stale", async () => {
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      ...tokenEconomics("100", "148"),
      hasVestingSchedule: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: true })
        .mockResolvedValueOnce({ statusCode: 200, body: true }),
      getStandardVestingSchedule: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { releasedAmount: "0", totalAmount: "1000", revoked: false } })
        .mockResolvedValueOnce({ statusCode: 200, body: { releasedAmount: "48", totalAmount: "1000", revoked: false } }),
      getVestingDetails: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { releasedAmount: "0" } })
        .mockResolvedValueOnce({ statusCode: 200, body: { releasedAmount: "48" } }),
      getVestingReleasableAmount: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "12" })
        .mockResolvedValueOnce({ statusCode: 200, body: "0" }),
      getVestingTotalAmount: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { totalVested: "12", totalReleased: "0", releasable: "12" } })
        .mockResolvedValueOnce({ statusCode: 200, body: { totalVested: "48", totalReleased: "48", releasable: "0" } }),
      releaseStandardVestingFor: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xrelease", result: "12" } }),
      releaseStandardVesting: vi.fn(),
      tokensReleasedEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xrelease-receipt", amount: "47" }]),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xrelease-receipt");

    const result = await runReleaseBeneficiaryVestingWorkflow({
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: {
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
        }) => Promise<unknown>) => work({ getTransactionReceipt: vi.fn(async () => ({ blockNumber: 902 })) })),
      },
    } as never, auth, undefined, {
      beneficiary: "0x00000000000000000000000000000000000000bb",
      mode: "for",
    });

    expect(result.release.releasedNow).toBe("48");
    expect(result.release.reportedReleasedNow).toBe("47");
    expect(result.release.reportedAmountMatchesState).toBe(false);
    expect(result.vesting.after.schedule).toMatchObject({ releasedAmount: "48" });
  });

  it("skips receipt and event inspection when the release write never resolves to a transaction hash", async () => {
    const tokensReleasedEventQuery = vi.fn();
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      ...tokenEconomics("100", "106"),
      hasVestingSchedule: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: true })
        .mockResolvedValueOnce({ statusCode: 200, body: true }),
      getStandardVestingSchedule: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { releasedAmount: "10", totalAmount: "1000", revoked: false } })
        .mockResolvedValueOnce({ statusCode: 200, body: { releasedAmount: "16", totalAmount: "1000", revoked: false } }),
      getVestingDetails: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { releasedAmount: "10" } })
        .mockResolvedValueOnce({ statusCode: 200, body: { releasedAmount: "16" } }),
      getVestingReleasableAmount: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "6" })
        .mockResolvedValueOnce({ statusCode: 200, body: "0" }),
      getVestingTotalAmount: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { totalVested: "16", totalReleased: "10", releasable: "6" } })
        .mockResolvedValueOnce({ statusCode: 200, body: { totalVested: "16", totalReleased: "16", releasable: "0" } }),
      releaseStandardVestingFor: vi.fn().mockResolvedValue({ statusCode: 202, body: { result: "6" } }),
      releaseStandardVesting: vi.fn(),
      tokensReleasedEventQuery,
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue(null);

    const result = await runReleaseBeneficiaryVestingWorkflow({} as never, auth, undefined, {
      beneficiary: "0x00000000000000000000000000000000000000bb",
      mode: "for",
    });

    expect(result.release.txHash).toBeNull();
    expect(result.release.releasedNow).toBe("6");
    expect(result.release.eventCount).toBe(0);
    expect(tokensReleasedEventQuery).not.toHaveBeenCalled();
  });

  it("falls back to post-state growth when neither logs nor the write payload expose a released amount", async () => {
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      ...tokenEconomics("100", "102"),
      hasVestingSchedule: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: true })
        .mockResolvedValueOnce({ statusCode: 200, body: true }),
      getStandardVestingSchedule: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { releasedAmount: "10", totalAmount: "1000", revoked: false } })
        .mockResolvedValueOnce({ statusCode: 200, body: { releasedAmount: "12", totalAmount: "1000", revoked: false } }),
      getVestingDetails: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { releasedAmount: "10" } })
        .mockResolvedValueOnce({ statusCode: 200, body: { releasedAmount: "12" } }),
      getVestingReleasableAmount: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "3" })
        .mockResolvedValueOnce({ statusCode: 200, body: "1" }),
      getVestingTotalAmount: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { totalVested: "13", totalReleased: "10", releasable: "3" } })
        .mockResolvedValueOnce({ statusCode: 200, body: { totalVested: "13", totalReleased: "12", releasable: "1" } }),
      releaseStandardVestingFor: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xrelease" } }),
      releaseStandardVesting: vi.fn(),
      tokensReleasedEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xrelease-receipt" }]),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xrelease-receipt");

    const result = await runReleaseBeneficiaryVestingWorkflow({
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: {
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
        }) => Promise<unknown>) => work({ getTransactionReceipt: vi.fn(async () => ({ blockNumber: 903 })) })),
      },
    } as never, auth, undefined, {
      beneficiary: "0x00000000000000000000000000000000000000bb",
      mode: "for",
    });

    expect(result.release.txHash).toBe("0xrelease-receipt");
    expect(result.release.releasedNow).toBe("2");
    expect(result.release.reportedReleasedNow).toBeNull();
    expect(result.release.reportedAmountMatchesState).toBeNull();
    expect(result.release.eventCount).toBe(1);
    expect(result.summary.releasableAfter).toBe("1");
  });

  it("normalizes missing-schedule release failures into a workflow state block", async () => {
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      ...tokenEconomics(),
      hasVestingSchedule: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      getStandardVestingSchedule: vi.fn(),
      getVestingDetails: vi.fn(),
      getVestingReleasableAmount: vi.fn(),
      getVestingTotalAmount: vi.fn(),
      releaseStandardVestingFor: vi.fn().mockRejectedValue(new Error("execution reverted (unknown custom error) data=\"0xaca36dbe\"")),
      releaseStandardVesting: vi.fn(),
      tokensReleasedEventQuery: vi.fn(),
    });

    await expect(runReleaseBeneficiaryVestingWorkflow({} as never, auth, undefined, {
      beneficiary: "0x00000000000000000000000000000000000000dd",
      mode: "for",
    })).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining("schedule not found"),
    });
  });
});
