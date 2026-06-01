import { describe, expect, it, vi } from "vitest";

import {
  createProtocolAdminServices,
  collectConsequenceTargets,
  decodeProtocolAction,
  encodeProtocolAction,
  extractActionResults,
  extractOperationIdFromLogs,
  extractOperationIdFromPayload,
  mapMultisigStatusLabel,
  normalizeProtocolActionError,
  readBooleanBody,
  readOwnershipConsequence,
  readCanExecute,
  readConsequenceReport,
  readMultisigState,
  readOptionalEventLogs,
  readScalarBody,
  readTupleBody,
  readUpgradeConsequence,
  resolveActorOverride,
  waitForOperationStatus,
} from "./multisig-protocol-change-helpers.js";
import { HttpError } from "../shared/errors.js";
import * as diamondAdminPrimitives from "../modules/diamond-admin/primitives/generated/index.js";
import * as multisigPrimitives from "../modules/multisig/primitives/generated/index.js";
import * as ownershipPrimitives from "../modules/ownership/primitives/generated/index.js";

const UPGRADE_ID = `0x${"b".repeat(64)}`;

describe("multisig protocol change helper utilities", () => {
  it("creates protocol admin services from the generated primitive factories", () => {
    const context = { marker: true } as never;
    const multisig = { service: "multisig" };
    const ownership = { service: "ownership" };
    const diamondAdmin = { service: "diamond-admin" };
    const multisigSpy = vi.spyOn(multisigPrimitives, "createMultisigPrimitiveService").mockReturnValue(multisig as never);
    const ownershipSpy = vi.spyOn(ownershipPrimitives, "createOwnershipPrimitiveService").mockReturnValue(ownership as never);
    const diamondSpy = vi.spyOn(diamondAdminPrimitives, "createDiamondAdminPrimitiveService").mockReturnValue(diamondAdmin as never);

    expect(createProtocolAdminServices(context)).toEqual({
      multisig,
      ownership,
      diamondAdmin,
    });

    expect(multisigSpy).toHaveBeenCalledWith(context);
    expect(ownershipSpy).toHaveBeenCalledWith(context);
    expect(diamondSpy).toHaveBeenCalledWith(context);
  });

  it("normalizes scalar, boolean, and tuple bodies across route result shapes", () => {
    expect(readScalarBody("7")).toBe("7");
    expect(readScalarBody({ result: 9n })).toBe("9");
    expect(readScalarBody({ body: "ignored" })).toBeNull();

    expect(readBooleanBody(true)).toBe(true);
    expect(readBooleanBody({ result: false })).toBe(false);
    expect(readBooleanBody({ body: true })).toBeNull();

    expect(readTupleBody([1, 2, 3])).toEqual([1, 2, 3]);
    expect(readTupleBody({ result: ["a", "b"] })).toEqual(["a", "b"]);
    expect(readTupleBody({ body: ["x", "y"] })).toEqual(["x", "y"]);
    expect(readTupleBody({ result: "nope" })).toEqual([]);
  });

  it("encodes and decodes mounted protocol actions and preserves raw calldata", () => {
    const proposeOwnership = encodeProtocolAction({
      kind: "propose-ownership-transfer",
      newOwner: "0x00000000000000000000000000000000000000ab",
    });
    expect(decodeProtocolAction(proposeOwnership)).toEqual({
      kind: "propose-ownership-transfer",
      newOwner: "0x00000000000000000000000000000000000000AB",
    });

    const transferOwnership = encodeProtocolAction({
      kind: "transfer-ownership",
      newOwner: "0x00000000000000000000000000000000000000ac",
    });
    expect(decodeProtocolAction(transferOwnership)).toEqual({
      kind: "transfer-ownership",
      newOwner: "0x00000000000000000000000000000000000000AC",
    });

    expect(decodeProtocolAction(encodeProtocolAction({
      kind: "accept-ownership",
    }))).toEqual({
      kind: "accept-ownership",
    });

    expect(decodeProtocolAction(encodeProtocolAction({
      kind: "cancel-ownership-transfer",
    }))).toEqual({
      kind: "cancel-ownership-transfer",
    });

    const encodedOwnership = encodeProtocolAction({
      kind: "set-approved-owner-target",
      target: "0x00000000000000000000000000000000000000ee",
      approved: true,
    });
    expect(decodeProtocolAction(encodedOwnership)).toEqual({
      kind: "set-approved-owner-target",
      target: expect.stringMatching(/^0x00000000000000000000000000000000000000ee$/iu),
      approved: true,
    });

    expect(encodeProtocolAction({
      kind: "raw-calldata",
      data: "0x1234",
      label: "manual",
    })).toBe("0x1234");
    expect(decodeProtocolAction("0x1234")).toBeNull();

    const diamondCut = encodeProtocolAction({
      kind: "propose-diamond-cut",
      facetCuts: [{
        facetAddress: "0x00000000000000000000000000000000000000aa",
        action: 1,
        functionSelectors: ["0x12345678"],
      }],
      initContract: "0x00000000000000000000000000000000000000bb",
      initCalldata: "0xfeed",
    });
    expect(decodeProtocolAction(diamondCut)).toEqual({
      kind: "propose-diamond-cut",
      facetCuts: [{
        facetAddress: "0x00000000000000000000000000000000000000AA",
        action: 1,
        functionSelectors: ["0x12345678"],
      }],
      initContract: "0x00000000000000000000000000000000000000bb",
      initCalldata: "0xfeed",
    });

    const approveUpgrade = encodeProtocolAction({
      kind: "approve-upgrade",
      upgradeId: UPGRADE_ID,
    });
    expect(decodeProtocolAction(approveUpgrade)).toEqual({
      kind: "approve-upgrade",
      upgradeId: UPGRADE_ID,
    });

    const executeUpgrade = encodeProtocolAction({
      kind: "execute-upgrade",
      facetCuts: [{
        facetAddress: "0x00000000000000000000000000000000000000cc",
        action: 2,
        functionSelectors: ["0x90abcdef"],
      }],
      initContract: "0x00000000000000000000000000000000000000dd",
      initCalldata: "0xbeef",
      upgradeId: UPGRADE_ID,
    });
    expect(decodeProtocolAction(executeUpgrade)).toEqual({
      kind: "execute-upgrade",
      facetCuts: [{
        facetAddress: "0x00000000000000000000000000000000000000cc",
        action: 2,
        functionSelectors: ["0x90abcdef"],
      }],
      initContract: "0x00000000000000000000000000000000000000dd",
      initCalldata: "0xbeef",
      upgradeId: UPGRADE_ID,
    });
  });

  it("returns null for malformed calldata after both transaction decoders throw", () => {
    expect(decodeProtocolAction("0x123")).toBeNull();
  });

  it("covers execution readiness, status, and operation-id fallback branches", () => {
    expect(readCanExecute([true, "ready"])).toEqual({ canExecute: true, reason: "ready" });
    expect(readCanExecute({ result: "invalid" })).toEqual({ canExecute: false, reason: "" });

    expect(readScalarBody(7)).toBe("7");
    expect(mapMultisigStatusLabel("9")).toBe("Unknown");
    expect(mapMultisigStatusLabel("0")).toBe("NonExistent");
    expect(mapMultisigStatusLabel("1")).toBe("Pending");
    expect(mapMultisigStatusLabel("2")).toBe("ReadyForExecution");
    expect(mapMultisigStatusLabel("4")).toBe("Cancelled");

    expect(extractOperationIdFromPayload({ result: UPGRADE_ID })).toBe(UPGRADE_ID);
    expect(extractOperationIdFromPayload({ result: "0x1234" })).toBeNull();

    expect(extractOperationIdFromLogs([], null)).toBeNull();
    expect(extractOperationIdFromLogs([{ transactionHash: "0xabc", id: UPGRADE_ID }], "0xdef")).toBeNull();
    expect(extractOperationIdFromLogs([{ transactionHash: "0xabc", operationId: UPGRADE_ID }], "0xabc")).toBe(UPGRADE_ID);
    expect(extractOperationIdFromLogs([{ transactionHash: "0xabc", id: "0x1234" }], "0xabc")).toBeNull();
  });

  it("collects consequence targets and action results across ownership and upgrade actions", () => {
    expect(collectConsequenceTargets([
      { kind: "transfer-ownership", newOwner: "0x00000000000000000000000000000000000000cc" },
      { kind: "set-approved-owner-target", target: "0x00000000000000000000000000000000000000dd", approved: false },
      { kind: "propose-diamond-cut", facetCuts: [], initContract: "0x00000000000000000000000000000000000000aa", initCalldata: "0x" },
      { kind: "approve-upgrade", upgradeId: UPGRADE_ID },
    ], {
      ownershipTargets: ["0x00000000000000000000000000000000000000ee"],
      upgradeIds: [`0x${"c".repeat(64)}`],
    }, [null, null, UPGRADE_ID, null])).toEqual({
      ownershipTargets: [
        "0x00000000000000000000000000000000000000ee",
        "0x00000000000000000000000000000000000000cc",
        "0x00000000000000000000000000000000000000dd",
      ],
      upgradeIds: [`0x${"c".repeat(64)}`, UPGRADE_ID],
    });

    expect(extractActionResults([
      { transactionHash: "0xexec", actionIndex: "0", result: UPGRADE_ID },
      { transactionHash: "0xother", actionIndex: "1", result: "0xskip" },
      { transactionHash: "0xexec", actionIndex: "9", result: "0xskip" },
      { transactionHash: "0xexec", actionIndex: "1", result: "0x" },
    ], "0xexec", 2)).toEqual([UPGRADE_ID, "0x"]);
  });

  it("handles optional event-log reads and consequence inspection branches", async () => {
    await expect(readOptionalEventLogs(async () => {
      throw new Error("boom");
    })).resolves.toEqual([]);

    await expect(readOptionalEventLogs(async () => ({
      body: [{ transactionHash: "0xabc" }],
    }))).resolves.toEqual([{ transactionHash: "0xabc" }]);

    const auth = {
      apiKey: "admin-key",
      label: "admin",
      roles: ["service"],
      allowGasless: false,
    };
    const services = {
      ownership: {},
      multisig: {},
      diamondAdmin: {},
    } as never;

    await expect(readConsequenceReport(
      services,
      auth,
      undefined,
      [],
      { inspect: false },
    )).resolves.toEqual({
      inspected: false,
      ownership: null,
      diamondAdmin: null,
      note: "consequence inspection disabled",
    });

    await expect(readConsequenceReport(
      services,
      auth,
      undefined,
      [{ kind: "accept-ownership" }],
      undefined,
    )).resolves.toEqual({
      inspected: true,
      ownership: null,
      diamondAdmin: null,
      note: "no classified ownership or diamond-admin consequences were available from the provided action set",
    });
  });

  it("reads upgrade consequence snapshots and degrades missing upgrades into error entries", async () => {
    const auth = {
      apiKey: "admin-key",
      label: "admin",
      roles: ["service"],
      allowGasless: false,
    };
    const services = {
      diamondAdmin: {
        getUpgradeControlStatus: vi.fn().mockResolvedValue({ statusCode: 200, body: { frozen: true } }),
        getUpgradeDelay: vi.fn().mockResolvedValue({ statusCode: 200, body: { result: "60" } }),
        getUpgradeThreshold: vi.fn().mockResolvedValue({ statusCode: 200, body: "2" }),
        getUpgrade: vi
          .fn()
          .mockResolvedValueOnce({ statusCode: 200, body: ["0x00000000000000000000000000000000000000aa", "100", "2", true] })
          .mockRejectedValueOnce(new Error("missing upgrade")),
      },
    } as never;

    await expect(readUpgradeConsequence(
      services,
      auth,
      undefined,
      [UPGRADE_ID, `0x${"c".repeat(64)}`],
    )).resolves.toEqual({
      controlStatus: { frozen: true },
      upgradeDelay: "60",
      upgradeThreshold: "2",
      upgrades: [
        {
          upgradeId: UPGRADE_ID,
          proposer: "0x00000000000000000000000000000000000000aa",
          proposedAt: "100",
          approvalCount: "2",
          executed: true,
        },
        {
          upgradeId: `0x${"c".repeat(64)}`,
          error: "missing upgrade",
        },
      ],
    });
  });

  it("preserves primitive control-status bodies when the upgrade status route is not object-shaped", async () => {
    const auth = {
      apiKey: "admin-key",
      label: "admin",
      roles: ["service"],
      allowGasless: false,
    };
    const services = {
      diamondAdmin: {
        getUpgradeControlStatus: vi.fn().mockResolvedValue({ statusCode: 200, body: "paused" }),
        getUpgradeDelay: vi.fn().mockResolvedValue({ statusCode: 200, body: { result: "60" } }),
        getUpgradeThreshold: vi.fn().mockResolvedValue({ statusCode: 200, body: "2" }),
        getUpgrade: vi.fn().mockResolvedValue({ statusCode: 200, body: ["0x00000000000000000000000000000000000000aa", "100", "2", false] }),
      },
    } as never;

    await expect(readUpgradeConsequence(
      services,
      auth,
      "0x00000000000000000000000000000000000000aa",
      [UPGRADE_ID],
    )).resolves.toEqual({
      controlStatus: "paused",
      upgradeDelay: "60",
      upgradeThreshold: "2",
      upgrades: [
        {
          upgradeId: UPGRADE_ID,
          proposer: "0x00000000000000000000000000000000000000aa",
          proposedAt: "100",
          approvalCount: "2",
          executed: false,
        },
      ],
    });
  });

  it("reads ownership consequence snapshots without target approvals and resolves actor overrides", async () => {
    const auth = {
      apiKey: "admin-key",
      label: "admin",
      roles: ["service"],
      allowGasless: false,
    };
    const childAuth = {
      apiKey: "child-key",
      label: "child",
      roles: ["service"],
      allowGasless: false,
    };
    const context = {
      apiKeys: {
        "child-key": childAuth,
      },
    } as never;
    const services = {
      ownership: {
        owner: vi.fn().mockResolvedValue({ body: 123n }),
        pendingOwner: vi.fn().mockResolvedValue({ body: null }),
        isOwnershipPolicyEnforced: vi.fn().mockResolvedValue({ body: { result: true } }),
        isOwnerTargetApproved: vi.fn(),
      },
    } as never;

    expect(resolveActorOverride(context, auth, "0x00000000000000000000000000000000000000aa", undefined, "flow", "actor")).toEqual({
      auth,
      walletAddress: "0x00000000000000000000000000000000000000aa",
    });
    expect(resolveActorOverride(context, auth, "0x00000000000000000000000000000000000000aa", {
      apiKey: "child-key",
    }, "flow", "actor")).toEqual({
      auth: childAuth,
      walletAddress: "0x00000000000000000000000000000000000000aa",
    });
    expect(() => resolveActorOverride(context, auth, undefined, {
      apiKey: "missing-key",
    }, "flow", "actor")).toThrowError(HttpError);

    await expect(readOwnershipConsequence(
      services,
      auth,
      undefined,
      [],
    )).resolves.toEqual({
      owner: "123",
      pendingOwner: null,
      ownershipPolicyEnforced: true,
      targetApprovals: [],
    });
    expect(services.ownership.isOwnerTargetApproved).not.toHaveBeenCalled();
  });

  it("reads ownership target approvals when classified targets are present", async () => {
    const auth = {
      apiKey: "admin-key",
      label: "admin",
      roles: ["service"],
      allowGasless: false,
    };
    const services = {
      ownership: {
        owner: vi.fn().mockResolvedValue({ body: "0x00000000000000000000000000000000000000aa" }),
        pendingOwner: vi.fn().mockResolvedValue({ body: { result: "0x00000000000000000000000000000000000000bb" } }),
        isOwnershipPolicyEnforced: vi.fn().mockResolvedValue({ body: false }),
        isOwnerTargetApproved: vi
          .fn()
          .mockResolvedValueOnce({ body: true })
          .mockResolvedValueOnce({ body: { result: false } }),
      },
    } as never;

    await expect(readOwnershipConsequence(
      services,
      auth,
      "0x00000000000000000000000000000000000000cc",
      [
        "0x00000000000000000000000000000000000000dd",
        "0x00000000000000000000000000000000000000ee",
      ],
    )).resolves.toEqual({
      owner: "0x00000000000000000000000000000000000000aa",
      pendingOwner: "0x00000000000000000000000000000000000000bb",
      ownershipPolicyEnforced: false,
      targetApprovals: [
        { target: "0x00000000000000000000000000000000000000dd", approved: true },
        { target: "0x00000000000000000000000000000000000000ee", approved: false },
      ],
    });
  });

  it("keeps primitive upgrade status payloads and null tuple fields when upgrade reads are sparse", async () => {
    const auth = {
      apiKey: "admin-key",
      label: "admin",
      roles: ["service"],
      allowGasless: false,
    };
    const services = {
      diamondAdmin: {
        getUpgradeControlStatus: vi.fn().mockResolvedValue({ statusCode: 200, body: "frozen" }),
        getUpgradeDelay: vi.fn().mockResolvedValue({ statusCode: 200, body: { result: 60 } }),
        getUpgradeThreshold: vi.fn().mockResolvedValue({ statusCode: 200, body: { result: 2n } }),
        getUpgrade: vi.fn().mockResolvedValue({ statusCode: 200, body: ["0x1234", null, null, "yes"] }),
      },
    } as never;

    await expect(readUpgradeConsequence(
      services,
      auth,
      "0x00000000000000000000000000000000000000aa",
      [UPGRADE_ID],
    )).resolves.toEqual({
      controlStatus: "frozen",
      upgradeDelay: "60",
      upgradeThreshold: "2",
      upgrades: [{
        upgradeId: UPGRADE_ID,
        proposer: "0x1234",
        proposedAt: null,
        approvalCount: null,
        executed: null,
      }],
    });
  });

  it("reads ownership consequence snapshots and waits for operation status convergence", async () => {
    const auth = {
      apiKey: "admin-key",
      label: "admin",
      roles: ["service"],
      allowGasless: false,
    };
    const services = {
      ownership: {
        owner: vi.fn().mockResolvedValue({ statusCode: 200, body: { result: "0x00000000000000000000000000000000000000aa" } }),
        pendingOwner: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000bb" }),
        isOwnershipPolicyEnforced: vi.fn().mockResolvedValue({ statusCode: 200, body: { result: true } }),
        isOwnerTargetApproved: vi
          .fn()
          .mockResolvedValueOnce({ statusCode: 200, body: true })
          .mockResolvedValueOnce({ statusCode: 200, body: { result: false } }),
      },
      multisig: {
        getOperationStatus: vi
          .fn()
          .mockResolvedValueOnce({ statusCode: 200, body: { result: "1" } })
          .mockResolvedValueOnce({ statusCode: 200, body: { result: "2" } }),
      },
    } as never;
    vi.spyOn(global, "setTimeout").mockImplementation(((fn: (...args: Array<unknown>) => void) => {
      fn();
      return 0 as never;
    }) as typeof setTimeout);

    await expect(readOwnershipConsequence(
      services,
      auth,
      "0x00000000000000000000000000000000000000cc",
      [
        "0x00000000000000000000000000000000000000dd",
        "0x00000000000000000000000000000000000000ee",
      ],
    )).resolves.toEqual({
      owner: "0x00000000000000000000000000000000000000aa",
      pendingOwner: "0x00000000000000000000000000000000000000bb",
      ownershipPolicyEnforced: true,
      targetApprovals: [
        {
          target: "0x00000000000000000000000000000000000000dd",
          approved: true,
        },
        {
          target: "0x00000000000000000000000000000000000000ee",
          approved: false,
        },
      ],
    });

    await expect(waitForOperationStatus(
      services,
      auth,
      undefined,
      UPGRADE_ID,
      ["2", "3"],
      "approval",
    )).resolves.toBe("2");
  });

  it("reads multisig state snapshots with and without actor approval lookups", async () => {
    const auth = {
      apiKey: "admin-key",
      label: "admin",
      roles: ["service"],
      allowGasless: false,
    };
    const services = {
      multisig: {
        getOperationStatus: vi.fn().mockResolvedValue({ statusCode: 200, body: { result: "3" } }),
        canExecuteOperation: vi.fn().mockResolvedValue({ statusCode: 200, body: [true, "ready"] }),
        hasApprovedOperation: vi.fn().mockResolvedValue({ statusCode: 200, body: { result: false } }),
      },
    } as never;

    await expect(readMultisigState(
      services,
      auth,
      undefined,
      UPGRADE_ID,
      "0x00000000000000000000000000000000000000cc",
      "execute",
    )).resolves.toEqual({
      label: "execute",
      status: "3",
      statusLabel: "Executed",
      canExecute: true,
      readinessReason: "ready",
      actorApproved: false,
    });

    await expect(readMultisigState(
      services,
      auth,
      undefined,
      UPGRADE_ID,
      undefined,
      "execute",
    )).resolves.toEqual({
      label: "execute",
      status: "3",
      statusLabel: "Executed",
      canExecute: true,
      readinessReason: "ready",
      actorApproved: null,
    });

    expect(services.multisig.hasApprovedOperation).toHaveBeenCalledTimes(1);
  });

  it("degrades malformed multisig state payloads to null and empty readiness fields", async () => {
    const auth = {
      apiKey: "admin-key",
      label: "admin",
      roles: ["service"],
      allowGasless: false,
    };
    const services = {
      multisig: {
        getOperationStatus: vi.fn().mockResolvedValue({ statusCode: 200, body: { result: { bad: true } } }),
        canExecuteOperation: vi.fn().mockResolvedValue({ statusCode: 200, body: { result: [null, 7] } }),
        hasApprovedOperation: vi.fn().mockResolvedValue({ statusCode: 200, body: { result: "nope" } }),
      },
    } as never;

    await expect(readMultisigState(
      services,
      auth,
      undefined,
      UPGRADE_ID,
      "0x00000000000000000000000000000000000000cc",
      "execute",
    )).resolves.toEqual({
      label: "execute",
      status: null,
      statusLabel: "Unknown",
      canExecute: false,
      readinessReason: "",
      actorApproved: null,
    });
  });

  it("reads consequence reports when only ownership or upgrade targets are classified", async () => {
    const auth = {
      apiKey: "admin-key",
      label: "admin",
      roles: ["service"],
      allowGasless: false,
    };

    const ownershipOnly = {
      ownership: {
        owner: vi.fn().mockResolvedValue({ statusCode: 200, body: { result: "0x00000000000000000000000000000000000000aa" } }),
        pendingOwner: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000bb" }),
        isOwnershipPolicyEnforced: vi.fn().mockResolvedValue({ statusCode: 200, body: { result: true } }),
        isOwnerTargetApproved: vi.fn().mockResolvedValue({ statusCode: 200, body: true }),
      },
      multisig: {},
      diamondAdmin: {
        getUpgradeControlStatus: vi.fn(),
        getUpgradeDelay: vi.fn(),
        getUpgradeThreshold: vi.fn(),
        getUpgrade: vi.fn(),
      },
    } as never;

    await expect(readConsequenceReport(
      ownershipOnly,
      auth,
      undefined,
      [{ kind: "transfer-ownership", newOwner: "0x00000000000000000000000000000000000000cc" }],
      undefined,
    )).resolves.toMatchObject({
      inspected: true,
      diamondAdmin: null,
      note: null,
      ownership: {
        owner: "0x00000000000000000000000000000000000000aa",
        pendingOwner: "0x00000000000000000000000000000000000000bb",
        ownershipPolicyEnforced: true,
      },
    });

    const upgradeOnly = {
      ownership: {
        owner: vi.fn(),
        pendingOwner: vi.fn(),
        isOwnershipPolicyEnforced: vi.fn(),
        isOwnerTargetApproved: vi.fn(),
      },
      multisig: {},
      diamondAdmin: {
        getUpgradeControlStatus: vi.fn().mockResolvedValue({ statusCode: 200, body: { frozen: false } }),
        getUpgradeDelay: vi.fn().mockResolvedValue({ statusCode: 200, body: { result: "10" } }),
        getUpgradeThreshold: vi.fn().mockResolvedValue({ statusCode: 200, body: "1" }),
        getUpgrade: vi.fn().mockResolvedValue({ statusCode: 200, body: ["0x00000000000000000000000000000000000000aa", "1", "1", false] }),
      },
    } as never;

    await expect(readConsequenceReport(
      upgradeOnly,
      auth,
      undefined,
      [{ kind: "approve-upgrade", upgradeId: UPGRADE_ID }],
      undefined,
    )).resolves.toMatchObject({
      inspected: true,
      ownership: null,
      note: null,
      diamondAdmin: {
        upgradeDelay: "10",
        upgradeThreshold: "1",
      },
    });

    expect(upgradeOnly.ownership.owner).not.toHaveBeenCalled();
    expect(ownershipOnly.diamondAdmin.getUpgradeControlStatus).not.toHaveBeenCalled();
  });

  it("normalizes actor overrides and protocol action errors", () => {
    const auth = {
      apiKey: "admin-key",
      label: "admin",
      roles: ["service"],
      allowGasless: false,
    };
    const childAuth = {
      apiKey: "operator-key",
      label: "operator",
      roles: ["service"],
      allowGasless: false,
    };
    const context = {
      apiKeys: {
        "operator-key": childAuth,
      },
    } as never;

    expect(resolveActorOverride(context, auth, "0x00000000000000000000000000000000000000aa", undefined, "wf", "actor"))
      .toEqual({ auth, walletAddress: "0x00000000000000000000000000000000000000aa" });
    expect(resolveActorOverride(
      context,
      auth,
      undefined,
      { apiKey: "operator-key", walletAddress: "0x00000000000000000000000000000000000000bb" },
      "wf",
      "actor",
    )).toEqual({
      auth: childAuth,
      walletAddress: "0x00000000000000000000000000000000000000bb",
    });

    expect(normalizeProtocolActionError(new Error("OnlyOperator"), "wf", "approve")).toMatchObject<HttpError>({
      statusCode: 409,
    });
    expect(normalizeProtocolActionError(new Error("Operation already executed"), "wf", "execute")).toMatchObject<HttpError>({
      statusCode: 409,
    });
    expect(normalizeProtocolActionError(new Error("InvalidOperationType(bytes32)"), "wf", "propose")).toMatchObject<HttpError>({
      statusCode: 409,
    });
    expect(normalizeProtocolActionError(new Error("NotPending"), "wf", "execute")).toMatchObject<HttpError>({
      statusCode: 409,
    });
    expect(normalizeProtocolActionError(new Error("not permitted"), "wf", "execute")).toMatchObject<HttpError>({
      statusCode: 409,
    });
    const generic = new Error("keep original error");
    expect(normalizeProtocolActionError(generic, "wf", "execute")).toBe(generic);
    const plain = normalizeProtocolActionError("plain failure", "wf", "execute");
    expect(plain).toBeInstanceOf(Error);
    expect((plain as Error).message).toContain("plain failure");
  });
});
