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
  });

  it("supports the self-release path", async () => {
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
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
});
