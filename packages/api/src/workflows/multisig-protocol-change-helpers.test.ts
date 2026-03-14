import { describe, expect, it, vi } from "vitest";

import {
  collectConsequenceTargets,
  decodeProtocolAction,
  encodeProtocolAction,
  extractActionResults,
  extractOperationIdFromLogs,
  extractOperationIdFromPayload,
  mapMultisigStatusLabel,
  normalizeProtocolActionError,
  readBooleanBody,
  readCanExecute,
  readConsequenceReport,
  readOptionalEventLogs,
  readScalarBody,
  readTupleBody,
  readUpgradeConsequence,
  resolveActorOverride,
} from "./multisig-protocol-change-helpers.js";
import { HttpError } from "../shared/errors.js";

const UPGRADE_ID = `0x${"b".repeat(64)}`;

describe("multisig protocol change helper utilities", () => {
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
  });

  it("covers execution readiness, status, and operation-id fallback branches", () => {
    expect(readCanExecute([true, "ready"])).toEqual({ canExecute: true, reason: "ready" });
    expect(readCanExecute({ result: "invalid" })).toEqual({ canExecute: false, reason: "" });

    expect(mapMultisigStatusLabel("9")).toBe("Unknown");

    expect(extractOperationIdFromPayload({ result: UPGRADE_ID })).toBe(UPGRADE_ID);
    expect(extractOperationIdFromPayload({ result: "0x1234" })).toBeNull();

    expect(extractOperationIdFromLogs([], null)).toBeNull();
    expect(extractOperationIdFromLogs([{ transactionHash: "0xabc", id: UPGRADE_ID }], "0xdef")).toBeNull();
    expect(extractOperationIdFromLogs([{ transactionHash: "0xabc", operationId: UPGRADE_ID }], "0xabc")).toBe(UPGRADE_ID);
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
    const plain = normalizeProtocolActionError("plain failure", "wf", "execute");
    expect(plain).toBeInstanceOf(Error);
    expect((plain as Error).message).toContain("plain failure");
  });
});
