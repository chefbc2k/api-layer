import { beforeEach, describe, expect, it, vi } from "vitest";
import { HttpError } from "../shared/errors.js";

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

  it("normalizes request failures", async () => {
    mocks.createEmergencyPrimitiveService.mockReturnValue({
      isRecipientWhitelisted: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: true })
        .mockResolvedValueOnce({ statusCode: 200, body: true }),
      requestEmergencyWithdrawal: vi.fn().mockRejectedValue(new Error("SecurityErrors.NotEmergencyAdmin(sender)")),
    });

    await expect(runEmergencyWithdrawalSequenceWorkflow(
      { apiKeys: {}, providerRouter: {} } as never,
      { apiKey: "requester", label: "requester", roles: ["service"], allowGasless: false },
      undefined,
      {
        token: "0x00000000000000000000000000000000000000bb",
        amount: "100",
        recipient: "0x00000000000000000000000000000000000000cc",
        whitelistRecipient: false,
      },
    )).rejects.toMatchObject<HttpError>({
      statusCode: 409,
    });
  });

  it("normalizes approval failures", async () => {
    mocks.waitForWorkflowWriteReceipt.mockReset();
    mocks.waitForWorkflowWriteReceipt.mockResolvedValueOnce("0xrequest");
    mocks.createEmergencyPrimitiveService.mockReturnValue({
      isRecipientWhitelisted: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: true })
        .mockResolvedValueOnce({ statusCode: 200, body: true }),
      requestEmergencyWithdrawal: vi.fn().mockResolvedValue({ statusCode: 202, body: `0x${"1".repeat(64)}` }),
      emergencyWithdrawalRequestedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xrequest" }] }),
      emergencyWithdrawalEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [] }),
      getApprovalCount: vi.fn().mockResolvedValue({ statusCode: 200, body: "1" }),
      approveEmergencyWithdrawal: vi.fn().mockRejectedValue(new Error("SecurityErrors.NotEmergencyAdmin(sender)")),
    });

    await expect(runEmergencyWithdrawalSequenceWorkflow(
      {
        apiKeys: {
          approver: {
            apiKey: "approver",
            label: "approver",
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
      undefined,
      {
        token: "0x00000000000000000000000000000000000000bb",
        amount: "100",
        recipient: "0x00000000000000000000000000000000000000cc",
        whitelistRecipient: false,
        approvals: [{ apiKey: "approver" }],
      },
    )).rejects.toMatchObject<HttpError>({
      statusCode: 409,
    });
  });

  it("normalizes execution failures", async () => {
    mocks.waitForWorkflowWriteReceipt.mockReset();
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce("0xrequest")
      .mockResolvedValueOnce("0xapprove");
    mocks.createEmergencyPrimitiveService.mockReturnValue({
      isRecipientWhitelisted: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: true })
        .mockResolvedValueOnce({ statusCode: 200, body: true }),
      requestEmergencyWithdrawal: vi.fn().mockResolvedValue({ statusCode: 202, body: `0x${"1".repeat(64)}` }),
      emergencyWithdrawalRequestedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xrequest" }] }),
      emergencyWithdrawalEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [] }),
      getApprovalCount: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "1" })
        .mockResolvedValueOnce({ statusCode: 200, body: "2" }),
      approveEmergencyWithdrawal: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xapprove" } }),
      emergencyWithdrawalApprovedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xapprove" }] }),
      emergencyWithdrawalExecutedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [] }),
      executeWithdrawal: vi.fn().mockRejectedValue(new Error("SecurityErrors.NotEmergencyAdmin(sender)")),
    });

    await expect(runEmergencyWithdrawalSequenceWorkflow(
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
      undefined,
      {
        token: "0x00000000000000000000000000000000000000bb",
        amount: "100",
        recipient: "0x00000000000000000000000000000000000000cc",
        whitelistRecipient: false,
        approvals: [{ apiKey: "approver" }],
        execute: { apiKey: "executor" },
      },
    )).rejects.toMatchObject<HttpError>({
      statusCode: 409,
    });
  });

  it("records zero event counts when approval and execute writes have no confirmed receipts", async () => {
    mocks.waitForWorkflowWriteReceipt.mockReset();
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce("0xrequest")
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    mocks.createEmergencyPrimitiveService.mockReturnValue({
      isRecipientWhitelisted: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: true })
        .mockResolvedValueOnce({ statusCode: 200, body: true }),
      requestEmergencyWithdrawal: vi.fn().mockResolvedValue({ statusCode: 202, body: `0x${"1".repeat(64)}` }),
      emergencyWithdrawalRequestedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xrequest" }] }),
      emergencyWithdrawalEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [] }),
      getApprovalCount: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "1" })
        .mockResolvedValueOnce({ statusCode: 200, body: "2" }),
      approveEmergencyWithdrawal: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xapprove" } }),
      emergencyWithdrawalApprovedEventQuery: vi.fn(),
      emergencyWithdrawalExecutedEventQuery: vi.fn(),
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
      undefined,
      {
        token: "0x00000000000000000000000000000000000000bb",
        amount: "100",
        recipient: "0x00000000000000000000000000000000000000cc",
        whitelistRecipient: false,
        approvals: [{ apiKey: "approver" }],
        execute: { apiKey: "executor" },
      },
    );

    expect(result.approvals).toEqual([
      expect.objectContaining({
        txHash: null,
        approvalEventCount: 0,
        executedEventCount: 0,
      }),
    ]);
    expect(result.execute).toEqual(expect.objectContaining({
      txHash: null,
      eventCount: 0,
    }));
    expect(result.summary.executed).toBe(false);
  });

  it("skips whitelist and request event queries when those writes never produce receipts", async () => {
    mocks.waitForWorkflowWriteReceipt.mockReset();
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("0xapprove")
      .mockResolvedValueOnce("0xexecute");

    const recipientWhitelistedEventQuery = vi.fn();
    const emergencyWithdrawalRequestedEventQuery = vi.fn();
    const emergencyWithdrawalEventQuery = vi.fn();
    mocks.createEmergencyPrimitiveService.mockReturnValue({
      isRecipientWhitelisted: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: false })
        .mockResolvedValueOnce({ statusCode: 200, body: true })
        .mockResolvedValueOnce({ statusCode: 200, body: true }),
      setRecipientWhitelist: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xwhitelist" } }),
      recipientWhitelistedEventQuery,
      requestEmergencyWithdrawal: vi.fn().mockResolvedValue({ statusCode: 202, body: `0x${"2".repeat(64)}` }),
      emergencyWithdrawalRequestedEventQuery,
      emergencyWithdrawalEventQuery,
      getApprovalCount: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "0" })
        .mockResolvedValueOnce({ statusCode: 200, body: "1" }),
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
      undefined,
      {
        token: "0x00000000000000000000000000000000000000bb",
        amount: "100",
        recipient: "0x00000000000000000000000000000000000000cc",
        whitelistRecipient: true,
        approvals: [{ apiKey: "approver" }],
        execute: { apiKey: "executor" },
      },
    );

    expect(recipientWhitelistedEventQuery).not.toHaveBeenCalled();
    expect(emergencyWithdrawalRequestedEventQuery).not.toHaveBeenCalled();
    expect(emergencyWithdrawalEventQuery).not.toHaveBeenCalled();
    expect(result.whitelist).toEqual(expect.objectContaining({
      txHash: null,
      eventCount: 0,
      recipientWhitelisted: true,
    }));
    expect(result.request).toEqual(expect.objectContaining({
      txHash: null,
      requestEventCount: 0,
      instantExecutionEventCount: 0,
      instantExecuted: false,
    }));
    expect(result.summary.executed).toBe(true);
  });
});
