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

import { runRevokeBeneficiaryVestingWorkflow } from "./revoke-beneficiary-vesting.js";

describe("runRevokeBeneficiaryVestingWorkflow", () => {
  const auth = {
    apiKey: "test-key",
    label: "test",
    roles: ["service"],
    allowGasless: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("revokes a beneficiary vesting schedule and confirms revoked state", async () => {
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      hasVestingSchedule: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: true })
        .mockResolvedValueOnce({ statusCode: 200, body: true }),
      getStandardVestingSchedule: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { totalAmount: "1000", revoked: false } })
        .mockResolvedValueOnce({ statusCode: 200, body: { totalAmount: "1000", revoked: true } }),
      getVestingDetails: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { revoked: false } })
        .mockResolvedValueOnce({ statusCode: 200, body: { revoked: true } }),
      getVestingReleasableAmount: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "0" })
        .mockResolvedValueOnce({ statusCode: 200, body: "0" }),
      getVestingTotalAmount: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { totalVested: "1000", totalReleased: "0", releasable: "0" } })
        .mockResolvedValueOnce({ statusCode: 200, body: { totalVested: "1000", totalReleased: "0", releasable: "0" } }),
      tokenBalanceOf: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "250" })
        .mockResolvedValueOnce({ statusCode: 200, body: "250" }),
      totalSupply: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "10000" })
        .mockResolvedValueOnce({ statusCode: 200, body: "10000" }),
      revokeVestingSchedule: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xrevoke" } }),
      vestingScheduleRevokedEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xrevoke-receipt", revokedAmount: "1000" }]),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xrevoke-receipt");

    const result = await runRevokeBeneficiaryVestingWorkflow({
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: {
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
        }) => Promise<unknown>) => work({ getTransactionReceipt: vi.fn(async () => ({ blockNumber: 903 })) })),
      },
    } as never, auth, undefined, {
      beneficiary: "0x00000000000000000000000000000000000000bb",
    });

    expect(result.revoke.txHash).toBe("0xrevoke-receipt");
    expect(result.revoke.revokedAmount).toBe("1000");
    expect(result.economics).toEqual({
      canceledLiability: { before: "0", after: "1000", delta: "1000" },
      beneficiaryBalance: { before: "250", after: "250", delta: "0" },
      totalSupply: { before: "10000", after: "10000", delta: "0" },
      scheduleTotal: { before: "1000", after: "1000", delta: "0" },
      released: { before: "0", after: "0", delta: "0" },
    });
    expect(result.summary.revokedAfter).toBe(true);
  });

  it("normalizes vesting-manager authority failures into a workflow state block", async () => {
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      hasVestingSchedule: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      getStandardVestingSchedule: vi.fn(),
      getVestingDetails: vi.fn(),
      getVestingReleasableAmount: vi.fn(),
      getVestingTotalAmount: vi.fn(),
      tokenBalanceOf: vi.fn().mockResolvedValue({ statusCode: 200, body: "0" }),
      totalSupply: vi.fn().mockResolvedValue({ statusCode: 200, body: "10000" }),
      revokeVestingSchedule: vi.fn().mockRejectedValue(new Error("execution reverted (unknown custom error) data=\"0xa2880f97\"")),
      vestingScheduleRevokedEventQuery: vi.fn(),
    });

    await expect(runRevokeBeneficiaryVestingWorkflow({} as never, auth, undefined, {
      beneficiary: "0x00000000000000000000000000000000000000dd",
    })).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining("VESTING_MANAGER_ROLE"),
    });
  });

  it("skips receipt and event reads when the write receipt does not yield a tx hash", async () => {
    const vestingScheduleRevokedEventQuery = vi.fn();
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      hasVestingSchedule: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: true })
        .mockResolvedValueOnce({ statusCode: 200, body: true }),
      getStandardVestingSchedule: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { totalAmount: "1000", revoked: false } })
        .mockResolvedValueOnce({ statusCode: 200, body: { totalAmount: "1000", revoked: true } }),
      getVestingDetails: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { revoked: false } })
        .mockResolvedValueOnce({ statusCode: 200, body: { revoked: true } }),
      getVestingReleasableAmount: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "0" })
        .mockResolvedValueOnce({ statusCode: 200, body: "0" }),
      getVestingTotalAmount: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { totalVested: "1000", totalReleased: "0", releasable: "0" } })
        .mockResolvedValueOnce({ statusCode: 200, body: { totalVested: "1000", totalReleased: "0", releasable: "0" } }),
      tokenBalanceOf: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "250" })
        .mockResolvedValueOnce({ statusCode: 200, body: "250" }),
      totalSupply: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "10000" })
        .mockResolvedValueOnce({ statusCode: 200, body: "10000" }),
      revokeVestingSchedule: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xrevoke" } }),
      vestingScheduleRevokedEventQuery,
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue(null);

    const result = await runRevokeBeneficiaryVestingWorkflow({
      providerRouter: {
        withProvider: vi.fn(),
      },
    } as never, auth, undefined, {
      beneficiary: "0x00000000000000000000000000000000000000cc",
    });

    expect(result.revoke.txHash).toBeNull();
    expect(result.revoke.eventCount).toBe(0);
    expect(vestingScheduleRevokedEventQuery).not.toHaveBeenCalled();
    expect(result.revoke.revokedAmount).toBe("1000");
  });

  it("rejects a failed revoke that changes token balances", async () => {
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      hasVestingSchedule: vi.fn().mockResolvedValue({ statusCode: 200, body: true }),
      getStandardVestingSchedule: vi.fn().mockResolvedValue({ statusCode: 200, body: { totalAmount: "1000", releasedAmount: "100", revoked: false } }),
      getVestingDetails: vi.fn().mockResolvedValue({ statusCode: 200, body: { revoked: false } }),
      getVestingReleasableAmount: vi.fn().mockResolvedValue({ statusCode: 200, body: "0" }),
      getVestingTotalAmount: vi.fn().mockResolvedValue({ statusCode: 200, body: { totalVested: "1000", totalReleased: "100", releasable: "0" } }),
      tokenBalanceOf: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "250" })
        .mockResolvedValueOnce({ statusCode: 200, body: "251" }),
      totalSupply: vi.fn().mockResolvedValue({ statusCode: 200, body: "10000" }),
      revokeVestingSchedule: vi.fn().mockRejectedValue(new Error("execution reverted")),
      vestingScheduleRevokedEventQuery: vi.fn(),
    });

    await expect(runRevokeBeneficiaryVestingWorkflow({} as never, auth, undefined, {
      beneficiary: "0x00000000000000000000000000000000000000ee",
    })).rejects.toThrow("failedWrite.beneficiaryBalance economic invariant failed");
  });

});
