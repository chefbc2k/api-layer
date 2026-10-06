import { beforeEach, describe, expect, it, vi } from "vitest";
import { Interface } from "ethers";
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

const diamondAddress = "0x00000000000000000000000000000000000000dd";

function encodeUint256(value: bigint): string {
  return `0x${value.toString(16).padStart(64, "0")}`;
}

function makeContext(
  apiKeys: Record<string, unknown> = {},
  balanceReads: bigint[] = [1_000n, 0n, 900n, 100n],
  receipt: { from?: string; fee?: bigint; logs?: Array<{ data: string; topics: string[] }> } = {},
) {
  let balanceReadIndex = 0;
  const readBalance = () => balanceReads[balanceReadIndex++] ?? balanceReads.at(-1) ?? 0n;
  const provider = {
    getTransactionReceipt: vi.fn(async () => ({
      blockNumber: 100,
      from: receipt.from ?? "0x00000000000000000000000000000000000000aa",
      fee: receipt.fee ?? 0n,
      logs: receipt.logs ?? [],
    })),
    call: vi.fn(async () => encodeUint256(readBalance())),
    getBalance: vi.fn(async () => readBalance()),
  };
  return {
    apiKeys,
    addressBook: {
      toJSON: vi.fn(() => ({ diamond: diamondAddress })),
    },
    providerRouter: {
      withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (value: typeof provider) => Promise<unknown>) => work(provider)),
    },
  } as never;
}

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
      makeContext({
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
      }),
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
    expect(result.economics).toEqual({
      asset: "erc20",
      custody: { before: "1000", after: "900", delta: "-100" },
      recipient: { before: "0", after: "100", delta: "100" },
      recipientGas: "0",
      released: "100",
    });
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
      makeContext({}, [1_000n, 0n, 999n, 1n]),
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

  it("reconciles native withdrawal value with gas paid by the recipient", async () => {
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

    const recipient = "0x00000000000000000000000000000000000000cc";
    const result = await runEmergencyWithdrawalSequenceWorkflow(
      makeContext({}, [1_000n, 10n, 900n, 105n], { from: recipient, fee: 5n }),
      { apiKey: "requester", label: "requester", roles: ["service"], allowGasless: false },
      recipient,
      {
        token: "0x0000000000000000000000000000000000000000",
        amount: "100",
        recipient,
        whitelistRecipient: false,
      },
    );

    expect(result.economics).toEqual({
      asset: "native",
      custody: { before: "1000", after: "900", delta: "-100" },
      recipient: { before: "10", after: "105", delta: "95" },
      recipientGas: "5",
      released: "100",
    });
  });

  it("stops submitting approvals after an approval auto-executes the withdrawal", async () => {
    mocks.waitForWorkflowWriteReceipt.mockReset();
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce("0xrequest")
      .mockResolvedValueOnce("0xapprove");
    const approveEmergencyWithdrawal = vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xapprove" } });
    const executeWithdrawal = vi.fn();
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
      approveEmergencyWithdrawal,
      emergencyWithdrawalApprovedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xapprove" }] }),
      emergencyWithdrawalExecutedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xapprove" }] }),
      executeWithdrawal,
    });

    const result = await runEmergencyWithdrawalSequenceWorkflow(
      makeContext({
        approver: { apiKey: "approver", label: "approver", roles: ["service"], allowGasless: false },
        redundant: { apiKey: "redundant", label: "redundant", roles: ["service"], allowGasless: false },
        executor: { apiKey: "executor", label: "executor", roles: ["service"], allowGasless: false },
      }),
      { apiKey: "requester", label: "requester", roles: ["service"], allowGasless: false },
      undefined,
      {
        token: "0x00000000000000000000000000000000000000bb",
        amount: "100",
        recipient: "0x00000000000000000000000000000000000000cc",
        whitelistRecipient: false,
        approvals: [{ apiKey: "approver" }, { apiKey: "redundant" }],
        execute: { apiKey: "executor" },
      },
    );

    expect(approveEmergencyWithdrawal).toHaveBeenCalledTimes(1);
    expect(executeWithdrawal).not.toHaveBeenCalled();
    expect(result.approvals).toHaveLength(1);
    expect(result.execute).toBeNull();
    expect(result.summary.executed).toBe(true);
  });

  it("uses the mined request event id when transaction-time state differs from preflight", async () => {
    mocks.waitForWorkflowWriteReceipt.mockReset();
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce("0xrequest")
      .mockResolvedValueOnce("0xapprove");
    const previewRequestId = `0x${"1".repeat(64)}`;
    const minedRequestId = `0x${"2".repeat(64)}`;
    const token = "0x00000000000000000000000000000000000000bb";
    const recipient = "0x00000000000000000000000000000000000000cc";
    const requestEvent = new Interface([
      "event EmergencyWithdrawalRequested(bytes32 indexed requestId,address indexed token,uint256 indexed amount,address recipient,uint256 requestTime)",
    ]).encodeEventLog(
      "EmergencyWithdrawalRequested",
      [minedRequestId, token, 100n, recipient, 123n],
    );
    const approveEmergencyWithdrawal = vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xapprove" } });
    mocks.createEmergencyPrimitiveService.mockReturnValue({
      isRecipientWhitelisted: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: true })
        .mockResolvedValueOnce({ statusCode: 200, body: true }),
      requestEmergencyWithdrawal: vi.fn().mockResolvedValue({ statusCode: 202, body: { result: previewRequestId } }),
      emergencyWithdrawalRequestedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xrequest" }] }),
      emergencyWithdrawalEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [] }),
      getApprovalCount: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "0" })
        .mockResolvedValueOnce({ statusCode: 200, body: "1" }),
      approveEmergencyWithdrawal,
      emergencyWithdrawalApprovedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xapprove" }] }),
      emergencyWithdrawalExecutedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xapprove" }] }),
    });

    const result = await runEmergencyWithdrawalSequenceWorkflow(
      makeContext(
        { approver: { apiKey: "approver", label: "approver", roles: ["service"], allowGasless: false } },
        [1_000n, 0n, 900n, 100n],
        { logs: [{ data: requestEvent.data, topics: [...requestEvent.topics] }] },
      ),
      { apiKey: "requester", label: "requester", roles: ["service"], allowGasless: false },
      undefined,
      {
        token,
        amount: "100",
        recipient,
        whitelistRecipient: false,
        approvals: [{ apiKey: "approver" }],
      },
    );

    expect(approveEmergencyWithdrawal).toHaveBeenCalledWith(expect.objectContaining({
      wireParams: [minedRequestId],
    }));
    expect(result.request).toMatchObject({
      requestId: minedRequestId,
      preflightRequestId: previewRequestId,
      requestIdSource: "receipt-event",
    });
  });

  it("normalizes whitelist failures", async () => {
    mocks.createEmergencyPrimitiveService.mockReturnValue({
      isRecipientWhitelisted: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      setRecipientWhitelist: vi.fn().mockRejectedValue(new Error("SecurityErrors.NotEmergencyAdmin(sender)")),
    });

    await expect(runEmergencyWithdrawalSequenceWorkflow(
      makeContext(),
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
      makeContext({}, [1_000n, 0n, 1_000n, 0n]),
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

  it("rejects a failed request that nevertheless changes asset custody", async () => {
    mocks.createEmergencyPrimitiveService.mockReturnValue({
      isRecipientWhitelisted: vi.fn().mockResolvedValue({ statusCode: 200, body: true }),
      requestEmergencyWithdrawal: vi.fn().mockRejectedValue(new Error("SecurityErrors.NotEmergencyAdmin(sender)")),
    });

    await expect(runEmergencyWithdrawalSequenceWorkflow(
      makeContext({}, [1_000n, 0n, 999n, 0n]),
      { apiKey: "requester", label: "requester", roles: ["service"], allowGasless: false },
      undefined,
      {
        token: "0x00000000000000000000000000000000000000bb",
        amount: "100",
        recipient: "0x00000000000000000000000000000000000000cc",
        whitelistRecipient: false,
      },
    )).rejects.toThrow(/failedRequest economic invariant failed/u);
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
      makeContext({
          approver: {
            apiKey: "approver",
            label: "approver",
            roles: ["service"],
            allowGasless: false,
          },
      }, [1_000n, 0n, 1_000n, 0n]),
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
      makeContext({
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
      }, [1_000n, 0n, 1_000n, 0n]),
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
      makeContext({
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
      }, [1_000n, 0n, 1_000n, 0n]),
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
      makeContext({
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
      }),
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
