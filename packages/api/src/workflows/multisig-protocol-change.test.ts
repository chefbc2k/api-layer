import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "../shared/errors.js";

const OPERATION_ID = `0x${"a".repeat(64)}`;
const UPGRADE_ID = `0x${"b".repeat(64)}`;

const mocks = vi.hoisted(() => ({
  createMultisigPrimitiveService: vi.fn(),
  createOwnershipPrimitiveService: vi.fn(),
  createDiamondAdminPrimitiveService: vi.fn(),
  waitForWorkflowWriteReceipt: vi.fn(),
}));

vi.mock("../modules/multisig/primitives/generated/index.js", () => ({
  createMultisigPrimitiveService: mocks.createMultisigPrimitiveService,
}));

vi.mock("../modules/ownership/primitives/generated/index.js", () => ({
  createOwnershipPrimitiveService: mocks.createOwnershipPrimitiveService,
}));

vi.mock("../modules/diamond-admin/primitives/generated/index.js", () => ({
  createDiamondAdminPrimitiveService: mocks.createDiamondAdminPrimitiveService,
}));

vi.mock("./wait-for-write.js", () => ({
  waitForWorkflowWriteReceipt: mocks.waitForWorkflowWriteReceipt,
}));

import {
  multisigProtocolChangeTestUtils,
  runApproveMultisigProtocolChangeWorkflow,
  runExecuteMultisigProtocolChangeWorkflow,
  runProposeMultisigProtocolChangeWorkflow,
} from "./multisig-protocol-change.js";

describe("multisig protocol change workflows", () => {
  const auth = {
    apiKey: "admin-key",
    label: "admin",
    roles: ["service"],
    allowGasless: false,
  };
  const operatorAuth = {
    apiKey: "operator-key",
    label: "operator",
    roles: ["service"],
    allowGasless: false,
  };

  const context = {
    apiKeys: {
      "admin-key": auth,
      "operator-key": operatorAuth,
    },
    providerRouter: {
      withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: {
        getTransactionReceipt: (txHash: string) => Promise<unknown>;
      }) => Promise<unknown>) => work({
        getTransactionReceipt: vi.fn(async (txHash: string) => {
          if (txHash === "0xprop") {
            return { blockNumber: 400 };
          }
          if (txHash === "0xapprove") {
            return { blockNumber: 401 };
          }
          if (txHash === "0xexec") {
            return { blockNumber: 402 };
          }
          return null;
        }),
      })),
    },
  } as never;

  function makeMultisigService(overrides: Record<string, unknown> = {}) {
    return {
      proposeOperation: vi.fn().mockResolvedValue({ statusCode: 202, body: { result: OPERATION_ID, txHash: "0xprop" } }),
      approveOperation: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xapprove" } }),
      executeOperation: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xexec" } }),
      getOperationStatus: vi.fn().mockResolvedValue({ statusCode: 200, body: "1" }),
      canExecuteOperation: vi.fn().mockResolvedValue({ statusCode: 200, body: [false, "Insufficient approvals"] }),
      hasApprovedOperation: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      operationProposedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xprop", id: OPERATION_ID }] }),
      operationApprovedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xapprove", id: OPERATION_ID }] }),
      operationStatusChangedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xapprove", operationId: OPERATION_ID }] }),
      operationExecutedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xexec", id: OPERATION_ID }] }),
      actionExecutedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [] }),
      batchCompletedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xexec", operationId: OPERATION_ID }] }),
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.waitForWorkflowWriteReceipt.mockImplementation(async (_context, body) => (body as { txHash?: string })?.txHash ?? null);

    mocks.createMultisigPrimitiveService.mockReturnValue(makeMultisigService());

    mocks.createOwnershipPrimitiveService.mockReturnValue({
      owner: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000aa" }),
      pendingOwner: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000bb" }),
      isOwnershipPolicyEnforced: vi.fn().mockResolvedValue({ statusCode: 200, body: true }),
      isOwnerTargetApproved: vi.fn().mockResolvedValue({ statusCode: 200, body: true }),
      ownershipTransferProposedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xexec" }] }),
      ownershipTransferredEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [] }),
      ownershipTransferCancelledEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [] }),
      ownershipTargetApprovalSetEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xexec" }] }),
    });

    mocks.createDiamondAdminPrimitiveService.mockReturnValue({
      getUpgradeControlStatus: vi.fn().mockResolvedValue({ statusCode: 200, body: { frozen: false } }),
      getUpgradeDelay: vi.fn().mockResolvedValue({ statusCode: 200, body: "3600" }),
      getUpgradeThreshold: vi.fn().mockResolvedValue({ statusCode: 200, body: "2" }),
      getUpgrade: vi.fn().mockResolvedValue({ statusCode: 200, body: ["0x00000000000000000000000000000000000000aa", "123", "2", false] }),
      upgradeProposedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xexec" }] }),
      upgradeApprovedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [] }),
      upgradeExecutedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [] }),
    });
  });

  it("proposes a multisig ownership change and reports consequence posture", async () => {
    const result = await runProposeMultisigProtocolChangeWorkflow(context, auth, undefined, {
      operation: {
        actions: [
          {
            kind: "propose-ownership-transfer",
            newOwner: "0x00000000000000000000000000000000000000cc",
          },
        ],
        requiredApprovals: "2",
      },
    });

    expect(result.operation.proposal.operationId).toBe(OPERATION_ID);
    expect(result.operation.state.statusLabel).toBe("Pending");
    expect(result.consequence.after.ownership).toEqual(expect.objectContaining({
      owner: "0x00000000000000000000000000000000000000aa",
      pendingOwner: "0x00000000000000000000000000000000000000bb",
    }));
    expect(result.summary.consequenceKinds).toEqual(["ownership"]);
  });

  it("approves a multisig operation and marks the actor as approved", async () => {
    mocks.createMultisigPrimitiveService.mockReturnValueOnce(makeMultisigService({
      getOperationStatus: vi.fn().mockResolvedValue({ statusCode: 200, body: "2" }),
      canExecuteOperation: vi.fn().mockResolvedValue({ statusCode: 200, body: [true, ""] }),
      hasApprovedOperation: vi.fn().mockResolvedValue({ statusCode: 200, body: true }),
      approveOperation: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xapprove" } }),
      operationApprovedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xapprove", id: OPERATION_ID }] }),
      operationStatusChangedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xapprove", operationId: OPERATION_ID }] }),
    }));

    const result = await runApproveMultisigProtocolChangeWorkflow(context, auth, "0x00000000000000000000000000000000000000dd", {
      operationId: OPERATION_ID,
      actor: {
        apiKey: "operator-key",
        walletAddress: "0x00000000000000000000000000000000000000dd",
      },
      actions: [
        {
          kind: "set-approved-owner-target",
          target: "0x00000000000000000000000000000000000000ee",
          approved: true,
        },
      ],
    });

    expect(result.approval.approved).toBe(true);
    expect(result.operation.after.statusLabel).toBe("ReadyForExecution");
    expect(result.summary.canExecute).toBe(true);
  });

  it("executes a multisig protocol change and reports ownership and upgrade consequences", async () => {
    mocks.createMultisigPrimitiveService.mockReturnValueOnce(makeMultisigService({
      getOperationStatus: vi.fn().mockResolvedValue({ statusCode: 200, body: "3" }),
      canExecuteOperation: vi.fn().mockResolvedValue({ statusCode: 200, body: [false, "Already executed"] }),
      hasApprovedOperation: vi.fn().mockResolvedValue({ statusCode: 200, body: true }),
      executeOperation: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xexec" } }),
      operationExecutedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xexec", id: OPERATION_ID }] }),
      actionExecutedEventQuery: vi.fn().mockResolvedValue({
        statusCode: 200,
      body: [
          { transactionHash: "0xexec", actionIndex: "0", result: UPGRADE_ID },
          { transactionHash: "0xexec", actionIndex: "1", result: "0x" },
        ],
      }),
      batchCompletedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xexec", operationId: OPERATION_ID }] }),
    }));

    const result = await runExecuteMultisigProtocolChangeWorkflow(context, auth, undefined, {
      operationId: OPERATION_ID,
      actions: [
        {
          kind: "propose-diamond-cut",
          facetCuts: [{
            facetAddress: "0x00000000000000000000000000000000000000ab",
            action: 0,
            functionSelectors: ["0x12345678"],
          }],
          initContract: "0x00000000000000000000000000000000000000ac",
          initCalldata: "0x",
        },
        {
          kind: "set-approved-owner-target",
          target: "0x00000000000000000000000000000000000000ee",
          approved: true,
        },
      ],
    });

    expect(result.execution.eventCount.operationExecuted).toBe(1);
    expect(result.operation.after.statusLabel).toBe("Executed");
    expect(result.consequence.after.diamondAdmin).toEqual(expect.objectContaining({
      upgradeDelay: "3600",
      upgradeThreshold: "2",
    }));
    expect(result.consequence.after.ownership).toEqual(expect.objectContaining({
      targetApprovals: [{ target: "0x00000000000000000000000000000000000000ee", approved: true }],
    }));
  });

  it("normalizes operator/state failures into structured http errors", async () => {
    mocks.createMultisigPrimitiveService.mockReturnValueOnce(makeMultisigService({
      proposeOperation: vi.fn().mockRejectedValue(new Error("Operation not found")),
    }));

    await expect(
      runProposeMultisigProtocolChangeWorkflow(context, auth, undefined, {
        operation: {
          actions: [{
            kind: "accept-ownership",
          }],
          requiredApprovals: "1",
        },
      }),
    ).rejects.toMatchObject<HttpError>({
      statusCode: 409,
    });
  });

  it("rejects unknown actor overrides before write execution", async () => {
    await expect(
      runApproveMultisigProtocolChangeWorkflow(context, auth, undefined, {
        operationId: OPERATION_ID,
        actor: {
          apiKey: "missing-key",
        },
      }),
    ).rejects.toMatchObject<HttpError>({
      statusCode: 400,
    });
  });

  it("exposes helper encoders and consequence target derivation", () => {
    const encoded = multisigProtocolChangeTestUtils.encodeProtocolAction({
      kind: "approve-upgrade",
      upgradeId: UPGRADE_ID,
    });
    expect(multisigProtocolChangeTestUtils.decodeProtocolAction(encoded)).toEqual({
      kind: "approve-upgrade",
      upgradeId: UPGRADE_ID,
    });
    expect(multisigProtocolChangeTestUtils.collectConsequenceTargets([
      { kind: "propose-ownership-transfer", newOwner: "0x00000000000000000000000000000000000000cc" },
      { kind: "propose-diamond-cut", facetCuts: [], initContract: "0x00000000000000000000000000000000000000ac", initCalldata: "0x" },
    ], {
      upgradeIds: [UPGRADE_ID],
    }, [UPGRADE_ID])).toEqual({
      ownershipTargets: ["0x00000000000000000000000000000000000000cc"],
      upgradeIds: [UPGRADE_ID],
    });
    expect(multisigProtocolChangeTestUtils.mapMultisigStatusLabel("2")).toBe("ReadyForExecution");
  });
});
