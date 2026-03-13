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

import { runCreateBeneficiaryVestingWorkflow } from "./create-beneficiary-vesting.js";

describe("runCreateBeneficiaryVestingWorkflow", () => {
  const auth = {
    apiKey: "test-key",
    label: "test",
    roles: ["service"],
    allowGasless: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a founder vesting schedule and confirms standard beneficiary state", async () => {
    const sequence: string[] = [];
    const service = {
      hasVestingSchedule: vi.fn()
        .mockImplementationOnce(async () => {
          sequence.push("exists-before");
          return { statusCode: 200, body: false };
        })
        .mockImplementationOnce(async () => {
          sequence.push("exists-after");
          return { statusCode: 200, body: true };
        }),
      getStandardVestingSchedule: vi.fn()
        .mockImplementationOnce(async () => {
          sequence.push("schedule-after");
          return { statusCode: 200, body: { totalAmount: "1000", revoked: false, releasedAmount: "0" } };
        }),
      getVestingDetails: vi.fn()
        .mockImplementationOnce(async () => {
          sequence.push("details-after");
          return { statusCode: 200, body: { totalAmount: "1000", revoked: false, releasedAmount: "0" } };
        }),
      getVestingReleasableAmount: vi.fn()
        .mockImplementationOnce(async () => {
          sequence.push("releasable-after");
          return { statusCode: 200, body: "0" };
        }),
      getVestingTotalAmount: vi.fn()
        .mockImplementationOnce(async () => {
          sequence.push("totals-after");
          return { statusCode: 200, body: { totalVested: "1000", totalReleased: "0", releasable: "0" } };
        }),
      createFounderVesting: vi.fn().mockImplementation(async () => {
        sequence.push("create-founder");
        return { statusCode: 202, body: { txHash: "0xcreate" } };
      }),
      vestingScheduleCreatedEventQuery: vi.fn().mockImplementation(async () => {
        sequence.push("created-events");
        return [{ transactionHash: "0xcreate-receipt" }];
      }),
      createCexVesting: vi.fn(),
      createDevFundVesting: vi.fn(),
      createPublicVesting: vi.fn(),
      createTeamVesting: vi.fn(),
    };
    mocks.createTokenomicsPrimitiveService.mockReturnValue(service);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xcreate-receipt");
    const context = {
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, label: string, work: (provider: {
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
        }) => Promise<unknown>) => {
          sequence.push(`receipt:${label}`);
          return work({ getTransactionReceipt: vi.fn(async () => ({ blockNumber: 801 })) });
        }),
      },
    } as never;

    const result = await runCreateBeneficiaryVestingWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      beneficiary: "0x00000000000000000000000000000000000000bb",
      amount: "1000",
      scheduleKind: "founder",
    });

    expect(sequence).toEqual([
      "exists-before",
      "create-founder",
      "receipt:workflow.createBeneficiaryVesting.create.receipt",
      "created-events",
      "exists-after",
      "schedule-after",
      "details-after",
      "releasable-after",
      "totals-after",
    ]);
    expect(result.create).toEqual({
      submission: { txHash: "0xcreate" },
      txHash: "0xcreate-receipt",
      eventCount: 1,
      scheduleKind: "founder",
    });
    expect(result.vesting.before).toEqual({
      exists: false,
      schedule: null,
      details: null,
      releasable: "0",
      totals: { totalVested: "0", totalReleased: "0", releasable: "0" },
    });
    expect(result.vesting.after.exists).toBe(true);
  });

  it("uses the team create path when scheduleKind is team", async () => {
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      hasVestingSchedule: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: false })
        .mockResolvedValueOnce({ statusCode: 200, body: true }),
      getStandardVestingSchedule: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { totalAmount: "2000", revoked: false } }),
      getVestingDetails: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { totalAmount: "2000", revoked: false } }),
      getVestingReleasableAmount: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "0" }),
      getVestingTotalAmount: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { totalVested: "2000", totalReleased: "0", releasable: "0" } }),
      createTeamVesting: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xteam" } }),
      vestingScheduleCreatedEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xteam-receipt" }]),
      createCexVesting: vi.fn(),
      createDevFundVesting: vi.fn(),
      createFounderVesting: vi.fn(),
      createPublicVesting: vi.fn(),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xteam-receipt");

    const result = await runCreateBeneficiaryVestingWorkflow({
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: {
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
        }) => Promise<unknown>) => work({ getTransactionReceipt: vi.fn(async () => ({ blockNumber: 802 })) })),
      },
    } as never, auth, undefined, {
      beneficiary: "0x00000000000000000000000000000000000000cc",
      amount: "2000",
      scheduleKind: "team",
      vestingType: "2",
    });

    expect(result.create.scheduleKind).toBe("team");
  });

  it("uses the cex create path and returns a stable empty-before state", async () => {
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      hasVestingSchedule: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: false })
        .mockResolvedValueOnce({ statusCode: 200, body: true }),
      getStandardVestingSchedule: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { totalAmount: "3000", revoked: false } }),
      getVestingDetails: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { totalAmount: "3000", revoked: false } }),
      getVestingReleasableAmount: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "0" }),
      getVestingTotalAmount: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: [3000, 0, 0] }),
      createCexVesting: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xcex" } }),
      vestingScheduleCreatedEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xcex-receipt" }]),
      createDevFundVesting: vi.fn(),
      createFounderVesting: vi.fn(),
      createPublicVesting: vi.fn(),
      createTeamVesting: vi.fn(),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xcex-receipt");

    const result = await runCreateBeneficiaryVestingWorkflow({
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: {
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
        }) => Promise<unknown>) => work({ getTransactionReceipt: vi.fn(async () => ({ blockNumber: 803 })) })),
      },
    } as never, auth, undefined, {
      beneficiary: "0x00000000000000000000000000000000000000dd",
      amount: "3000",
      scheduleKind: "cex",
    });

    expect(result.create.txHash).toBe("0xcex-receipt");
  });

  it("normalizes vesting-manager authority failures into a workflow state block", async () => {
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      hasVestingSchedule: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      getStandardVestingSchedule: vi.fn(),
      getVestingDetails: vi.fn(),
      getVestingReleasableAmount: vi.fn(),
      getVestingTotalAmount: vi.fn(),
      createFounderVesting: vi.fn().mockRejectedValue(new Error("execution reverted (unknown custom error) data=\"0xa2880f97\"")),
      vestingScheduleCreatedEventQuery: vi.fn(),
      createCexVesting: vi.fn(),
      createDevFundVesting: vi.fn(),
      createPublicVesting: vi.fn(),
      createTeamVesting: vi.fn(),
    });

    await expect(runCreateBeneficiaryVestingWorkflow({} as never, auth, undefined, {
      beneficiary: "0x00000000000000000000000000000000000000ee",
      amount: "1000",
      scheduleKind: "founder",
    })).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining("VESTING_MANAGER_ROLE"),
    });
  });
});
