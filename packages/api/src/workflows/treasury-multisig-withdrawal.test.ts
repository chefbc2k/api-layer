import { Interface } from "ethers";
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

import { runTreasuryMultisigWithdrawalWorkflow } from "./treasury-multisig-withdrawal.js";

const paymentToken = "0x00000000000000000000000000000000000000cc";
const custody = "0x0000000000000000000000000000000000000ddd";
const treasury = "0x00000000000000000000000000000000000000aa";
const approverOne = "0x00000000000000000000000000000000000000b1";
const approverTwo = "0x00000000000000000000000000000000000000b2";
const balanceInterface = new Interface(["function balanceOf(address account) view returns (uint256)"]);

const auth = {
  apiKey: "executor-key",
  label: "executor",
  roles: ["service"],
  allowGasless: false,
};

function createFixture(options: {
  pending?: Array<bigint>;
  balances?: Array<bigint>;
  executeError?: Error;
  secondApprovalError?: Error;
} = {}) {
  const pending = options.pending ?? [100n, 100n, 0n];
  const balances = options.balances ?? [1000n, 10n, 1000n, 10n, 900n, 110n];
  let pendingIndex = 0;
  let balanceIndex = 0;
  const service = {
    getUsdcToken: vi.fn().mockResolvedValue({ statusCode: 200, body: paymentToken }),
    isPaused: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
    paymentPaused: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
    getTreasuryAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: treasury }),
    getDevFundAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000dd" }),
    getUnionTreasuryAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000ee" }),
    getPendingPayments: vi.fn().mockImplementation(async () => ({
      statusCode: 200,
      body: (pending[pendingIndex++] ?? pending.at(-1) ?? 0n).toString(),
    })),
    approveMultisigWithdrawal: options.secondApprovalError
      ? vi.fn()
        .mockResolvedValueOnce({ statusCode: 202, body: { txHash: "0xapprove1" } })
        .mockRejectedValueOnce(options.secondApprovalError)
      : vi.fn()
        .mockResolvedValueOnce({ statusCode: 202, body: { txHash: "0xapprove1" } })
        .mockResolvedValueOnce({ statusCode: 202, body: { txHash: "0xapprove2" } }),
    executeMultisigWithdrawal: options.executeError
      ? vi.fn().mockRejectedValue(options.executeError)
      : vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xexecute" } }),
  };
  mocks.createMarketplacePrimitiveService.mockReturnValue(service);
  mocks.waitForWorkflowWriteReceipt.mockImplementation(async (_context, payload) => payload.txHash);

  const context = {
    apiKeys: {
      "executor-key": auth,
      "approver-one-key": { ...auth, apiKey: "approver-one-key", label: "approver one" },
      "approver-two-key": { ...auth, apiKey: "approver-two-key", label: "approver two" },
    },
    addressBook: {
      toJSON: () => ({ diamond: custody }),
    },
    providerRouter: {
      withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: { call: () => Promise<string> }) => Promise<unknown>) => work({
        call: vi.fn(async () => balanceInterface.encodeFunctionResult(
          "balanceOf",
          [balances[balanceIndex++] ?? balances.at(-1) ?? 0n],
        )),
      })),
    },
  } as never;

  return { context, service };
}

function requestBody(overrides: Record<string, unknown> = {}) {
  return {
    requiredApprovals: "2",
    approvers: [
      { apiKey: "approver-one-key", walletAddress: approverOne },
      { apiKey: "approver-two-key", walletAddress: approverTwo },
    ],
    ...overrides,
  } as never;
}

describe("runTreasuryMultisigWithdrawalWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("proves approval neutrality and exact treasury custody movement", async () => {
    const { context, service } = createFixture();

    const result = await runTreasuryMultisigWithdrawalWorkflow(
      context,
      auth,
      treasury,
      requestBody(),
    );

    expect(service.approveMultisigWithdrawal).toHaveBeenCalledTimes(2);
    expect(service.approveMultisigWithdrawal).toHaveBeenNthCalledWith(1, expect.objectContaining({
      walletAddress: approverOne,
      wireParams: [paymentToken, "100", treasury],
    }));
    expect(service.executeMultisigWithdrawal).toHaveBeenCalledWith(expect.objectContaining({
      walletAddress: treasury,
      wireParams: [paymentToken, "100", treasury, "2"],
    }));
    expect(result).toMatchObject({
      approvals: {
        accounts: [approverOne, approverTwo],
        txHashes: ["0xapprove1", "0xapprove2"],
        economicsUnchanged: true,
      },
      execution: {
        txHash: "0xexecute",
        pending: { before: "100", after: "0", delta: "-100" },
        custody: { before: "1000", after: "900", delta: "-100" },
        recipient: { before: "10", after: "110", delta: "100" },
        conservation: "0",
      },
      summary: {
        releasedAmount: "100",
        remainingPending: "0",
        approvalCount: 2,
      },
    });
  });

  it("proves failed execution leaves pending liability and token balances unchanged", async () => {
    const { context } = createFixture({
      pending: [100n, 100n, 100n],
      balances: [1000n, 10n, 1000n, 10n, 1000n, 10n],
      executeError: new Error("insufficient multisig approvals"),
    });

    await expect(runTreasuryMultisigWithdrawalWorkflow(
      context,
      auth,
      treasury,
      requestBody(),
    )).rejects.toMatchObject({
      statusCode: 500,
      message: "treasury-multisig-withdrawal execution failed after approvals",
      diagnostics: {
        confirmedApprovalTxHashes: ["0xapprove1", "0xapprove2"],
        economicStateUnchanged: true,
        cause: "insufficient multisig approvals",
      },
    });
  });

  it("reports confirmed approval state when a later approval fails without moving value", async () => {
    const { context } = createFixture({
      pending: [100n, 100n],
      balances: [1000n, 10n, 1000n, 10n],
      secondApprovalError: new Error("duplicate approval"),
    });

    await expect(runTreasuryMultisigWithdrawalWorkflow(
      context,
      auth,
      treasury,
      requestBody(),
    )).rejects.toMatchObject({
      statusCode: 500,
      message: "treasury-multisig-withdrawal approval failed",
      diagnostics: {
        confirmedApprovalTxHashes: ["0xapprove1"],
        economicStateUnchanged: true,
        cause: "duplicate approval",
      },
    });
  });

  it("blocks uncovered and replayed amounts before recording approvals", async () => {
    const { context, service } = createFixture({
      pending: [0n],
      balances: [1000n, 10n],
    });

    await expect(runTreasuryMultisigWithdrawalWorkflow(
      context,
      auth,
      treasury,
      requestBody({ amount: "1" }),
    )).rejects.toMatchObject({
      statusCode: 409,
      diagnostics: { amount: "1", pending: "0" },
    });
    expect(service.approveMultisigWithdrawal).not.toHaveBeenCalled();
  });

  it("rejects duplicate approvers and an executor that is not the configured treasury", async () => {
    const duplicate = createFixture();
    await expect(runTreasuryMultisigWithdrawalWorkflow(
      duplicate.context,
      auth,
      treasury,
      requestBody({
        approvers: [
          { apiKey: "approver-one-key", walletAddress: approverOne },
          { apiKey: "approver-two-key", walletAddress: approverOne },
        ],
      }),
    )).rejects.toMatchObject({ statusCode: 400 });
    expect(duplicate.service.approveMultisigWithdrawal).not.toHaveBeenCalled();

    const wrongExecutor = createFixture();
    await expect(runTreasuryMultisigWithdrawalWorkflow(
      wrongExecutor.context,
      auth,
      approverOne,
      requestBody(),
    )).rejects.toMatchObject({ statusCode: 409 });
    expect(wrongExecutor.service.approveMultisigWithdrawal).not.toHaveBeenCalled();
  });
});
