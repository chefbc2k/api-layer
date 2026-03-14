import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createEmergencyPrimitiveService: vi.fn(),
  waitForWorkflowWriteReceipt: vi.fn(),
}));

vi.mock("../modules/emergency/primitives/generated/index.js", () => ({
  createEmergencyPrimitiveService: mocks.createEmergencyPrimitiveService,
}));

vi.mock("./wait-for-write.js", () => ({
  waitForWorkflowWriteReceipt: mocks.waitForWorkflowWriteReceipt,
}));

import { runEmergencyWithdrawalSequenceWorkflow } from "./emergency-withdrawal-sequence.js";

describe("emergency-withdrawal-sequence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce("0xwhitelist")
      .mockResolvedValueOnce("0xrequest")
      .mockResolvedValueOnce("0xapprove")
      .mockResolvedValueOnce("0xexecute");
  });

  it("whitelists, requests, approves, and executes a withdrawal", async () => {
    mocks.createEmergencyPrimitiveService.mockReturnValue({
      isRecipientWhitelisted: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: false })
        .mockResolvedValueOnce({ statusCode: 200, body: true })
        .mockResolvedValueOnce({ statusCode: 200, body: true }),
      setRecipientWhitelist: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xwhitelist" } }),
      recipientWhitelistedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xwhitelist" }] }),
      requestEmergencyWithdrawal: vi.fn().mockResolvedValue({ statusCode: 202, body: `0x${"1".repeat(64)}` }),
      emergencyWithdrawalRequestedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xrequest" }] }),
      emergencyWithdrawalEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [] }),
      getApprovalCount: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "1" })
        .mockResolvedValueOnce({ statusCode: 200, body: "2" }),
      approveEmergencyWithdrawal: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xapprove" } }),
      emergencyWithdrawalApprovedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xapprove" }] }),
      emergencyWithdrawalExecutedEventQuery: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: [] })
        .mockResolvedValueOnce({ statusCode: 200, body: [{ transactionHash: "0xexecute" }] }),
      executeWithdrawal: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xexecute" } }),
    });

    const result = await runEmergencyWithdrawalSequenceWorkflow(
      {
        apiKeys: {
          approver: {
            apiKey: "approver",
            label: "approver",
            roles: ["service"],
            allowGasless: false,
          },
          executor: {
            apiKey: "executor",
            label: "executor",
            roles: ["service"],
            allowGasless: false,
          },
        },
        providerRouter: {
          withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: { getTransactionReceipt: () => Promise<unknown>; }) => Promise<unknown>) => work({
            getTransactionReceipt: vi.fn(async () => ({ blockNumber: 100 })),
          })),
        },
      } as never,
      { apiKey: "requester", label: "requester", roles: ["service"], allowGasless: false },
      "0x00000000000000000000000000000000000000aa",
      {
        token: "0x00000000000000000000000000000000000000bb",
        amount: "100",
        recipient: "0x00000000000000000000000000000000000000cc",
        whitelistRecipient: true,
        approvals: [{ apiKey: "approver" }],
        execute: { apiKey: "executor" },
      },
    );

    expect(result.summary).toEqual({
      token: "0x00000000000000000000000000000000000000bb",
      amount: "100",
      recipient: "0x00000000000000000000000000000000000000cc",
      requestId: `0x${"1".repeat(64)}`,
      approvalsRequested: 1,
      approvalsObserved: 1,
      executed: true,
      requiresManualExecution: true,
    });
    expect(result.whitelist?.eventCount).toBe(1);
    expect(result.execute?.eventCount).toBe(1);
  });

  it("supports instant-execution request path", async () => {
    mocks.waitForWorkflowWriteReceipt.mockReset();
    mocks.waitForWorkflowWriteReceipt.mockResolvedValueOnce("0xrequest");
    mocks.createEmergencyPrimitiveService.mockReturnValue({
      isRecipientWhitelisted: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: true })
        .mockResolvedValueOnce({ statusCode: 200, body: true }),
      requestEmergencyWithdrawal: vi.fn().mockResolvedValue({ statusCode: 202, body: `0x${"0".repeat(64)}` }),
      emergencyWithdrawalRequestedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [] }),
      emergencyWithdrawalEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xrequest" }] }),
    });

    const result = await runEmergencyWithdrawalSequenceWorkflow(
      {
        apiKeys: {},
        providerRouter: {
          withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: { getTransactionReceipt: () => Promise<unknown>; }) => Promise<unknown>) => work({
            getTransactionReceipt: vi.fn(async () => ({ blockNumber: 100 })),
          })),
        },
      } as never,
      { apiKey: "requester", label: "requester", roles: ["service"], allowGasless: false },
      undefined,
      {
        token: "0x00000000000000000000000000000000000000bb",
        amount: "1",
        recipient: "0x00000000000000000000000000000000000000cc",
        whitelistRecipient: false,
      },
    );

    expect(result.request.instantExecuted).toBe(true);
    expect(result.summary.executed).toBe(true);
    expect(result.approvals).toEqual([]);
    expect(result.execute).toBeNull();
  });

  it("normalizes whitelist failures", async () => {
    mocks.createEmergencyPrimitiveService.mockReturnValue({
      isRecipientWhitelisted: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      setRecipientWhitelist: vi.fn().mockRejectedValue(new Error("SecurityErrors.NotEmergencyAdmin(sender)")),
    });

    await expect(runEmergencyWithdrawalSequenceWorkflow(
      { apiKeys: {}, providerRouter: {} } as never,
      { apiKey: "requester", label: "requester", roles: ["service"], allowGasless: false },
      undefined,
      {
        token: "0x00000000000000000000000000000000000000bb",
        amount: "100",
        recipient: "0x00000000000000000000000000000000000000cc",
        whitelistRecipient: true,
      },
    )).rejects.toEqual(expect.objectContaining({
      statusCode: 409,
    }));
  });
});
