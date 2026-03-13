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
      revokeVestingSchedule: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xrevoke" } }),
      vestingScheduleRevokedEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xrevoke-receipt" }]),
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
    expect(result.summary.revokedAfter).toBe(true);
  });
});
