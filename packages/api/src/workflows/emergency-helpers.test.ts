import { describe, expect, it } from "vitest";

import {
  asRouteResult,
  bytes32Schema,
  bytesSchema,
  digitsSchema,
  addressSchema,
  actorOverrideSchema,
  readEmergencyPosture,
  resolveActorOverride,
  buildEventWindow,
  deriveRecoveryPhase,
  mapEmergencyStateLabel,
  mapIncidentTypeLabel,
  mapResponseActionLabel,
  normalizeEmergencyExecutionError,
  normalizeRequestId,
  readArrayBody,
  readBooleanBody,
  readIncidentSummary,
  readRecoveryPlanSummary,
  readScalarBody,
  waitForEmergencyState,
} from "./emergency-helpers.js";
import { HttpError } from "../shared/errors.js";

describe("emergency-helpers", () => {
  it("maps emergency and incident labels", () => {
    expect(mapEmergencyStateLabel("0")).toBe("NORMAL");
    expect(mapEmergencyStateLabel("1")).toBe("PAUSED");
    expect(mapEmergencyStateLabel("2")).toBe("LOCKED_DOWN");
    expect(mapEmergencyStateLabel("3")).toBe("RECOVERY");
    expect(mapEmergencyStateLabel("99")).toBe("UNKNOWN");
    expect(mapIncidentTypeLabel("0")).toBe("SECURITY_BREACH");
    expect(mapIncidentTypeLabel("2")).toBe("MARKET_MANIPULATION");
    expect(mapIncidentTypeLabel("3")).toBe("SYSTEM_FAILURE");
    expect(mapIncidentTypeLabel("4")).toBe("EXTERNAL_THREAT");
    expect(mapIncidentTypeLabel("5")).toBe("GOVERNANCE_ATTACK");
    expect(mapIncidentTypeLabel("6")).toBe("ASSET_COMPROMISE");
    expect(mapIncidentTypeLabel("99")).toBe("UNKNOWN");
    expect(mapResponseActionLabel("0")).toBe("PAUSE_TRADING");
    expect(mapResponseActionLabel("1")).toBe("FREEZE_ASSETS");
    expect(mapResponseActionLabel("2")).toBe("LOCK_TRANSFERS");
    expect(mapResponseActionLabel("3")).toBe("ENABLE_RECOVERY");
    expect(mapResponseActionLabel("4")).toBe("RESTORE_STATE");
    expect(mapResponseActionLabel("5")).toBe("ROLLBACK_CHANGES");
    expect(mapResponseActionLabel("99")).toBe("UNKNOWN");
  });

  it("reads scalar, boolean, tuple, and incident payload shapes", () => {
    expect(readScalarBody("7")).toBe("7");
    expect(readScalarBody({ result: 9 })).toBe("9");
    expect(readScalarBody(11n)).toBe("11");
    expect(readScalarBody({ result: 12n })).toBe("12");
    expect(readScalarBody({ nope: true })).toBeNull();
    expect(readBooleanBody(true)).toBe(true);
    expect(readBooleanBody({ result: false })).toBe(false);
    expect(readBooleanBody({ result: "false" })).toBeNull();
    expect(readArrayBody(["0x00"])).toEqual(["0x00"]);
    expect(readArrayBody({ body: ["0x01"] })).toEqual(["0x01"]);
    expect(readArrayBody({ result: ["0x02"] })).toEqual(["0x02"]);
    expect(readArrayBody({ body: "nope", result: "still-nope" })).toEqual([]);
    expect(readIncidentSummary({
      id: "7",
      incidentType: "1",
      description: "bug",
      reporter: "0x00000000000000000000000000000000000000aa",
      timestamp: "11",
      resolved: false,
      actions: ["0", "1"],
      approvers: ["0x00000000000000000000000000000000000000bb"],
      resolutionTime: "0",
    })).toMatchObject({
      id: "7",
      incidentTypeLabel: "SMART_CONTRACT_BUG",
      actionLabels: ["PAUSE_TRADING", "FREEZE_ASSETS"],
    });
    expect(readIncidentSummary({
      actions: ["6", 7],
      approvers: ["0x00000000000000000000000000000000000000bb", 7],
      description: 7,
      reporter: 9,
      resolved: "nope",
    })).toMatchObject({
      id: null,
      incidentTypeLabel: "UNKNOWN",
      description: null,
      reporter: null,
      resolved: null,
      actionLabels: ["UNKNOWN", "UNKNOWN"],
      approvers: ["0x00000000000000000000000000000000000000bb"],
    });
    expect(readIncidentSummary({
      actions: "nope",
      approvers: "still-nope",
    })).toMatchObject({
      actions: [],
      approvers: [],
    });
    expect(readRecoveryPlanSummary([["0x1234"], true, "10", "0", "2", []])).toMatchObject({
      approvalCount: "2",
      phase: "executing",
    });
    expect(readRecoveryPlanSummary({ result: [["0x1234"], false, "0", "0", 1, ["0xab"]] })).toMatchObject({
      approvalCount: "1",
      phase: "awaiting-approval",
      results: ["0xab"],
    });
    expect(readRecoveryPlanSummary(["bad-steps", "bad-approved", "0", "0", "0", "bad-results"])).toMatchObject({
      steps: [],
      approvedByGovernance: null,
      results: [],
      phase: "not-started",
    });
  });

  it("derives recovery phases and normalizes request ids", () => {
    expect(deriveRecoveryPhase({
      approvedByGovernance: false,
      startTime: null,
      completionTime: null,
      steps: [],
      results: [],
    })).toBe("not-started");
    expect(deriveRecoveryPhase({
      approvedByGovernance: true,
      startTime: "10",
      completionTime: "0",
      steps: ["0x12"],
      results: [],
    })).toBe("executing");
    expect(deriveRecoveryPhase({
      approvedByGovernance: true,
      startTime: "10",
      completionTime: "12",
      steps: ["0x12"],
      results: ["0xab"],
    })).toBe("completed");
    expect(deriveRecoveryPhase({
      approvedByGovernance: true,
      startTime: null,
      completionTime: null,
      steps: ["0x12"],
      results: [],
    })).toBe("approved-awaiting-start");
    expect(deriveRecoveryPhase({
      approvedByGovernance: false,
      startTime: "10",
      completionTime: "0",
      steps: ["0x12"],
      results: ["0xab"],
    })).toBe("ready-to-complete");
    expect(normalizeRequestId(`0x${"1".repeat(64)}`)).toBe(`0x${"1".repeat(64)}`);
    expect(normalizeRequestId("nope")).toBeNull();
    expect(buildEventWindow({ blockNumber: 77 })).toEqual({ fromBlock: 77n, toBlock: 77n });
    expect(asRouteResult({ ok: true })).toEqual({ statusCode: 200, body: { ok: true } });
  });

  it("normalizes emergency authority and state conflicts", () => {
    expect(String((normalizeEmergencyExecutionError(new Error("SecurityErrors.NotEmergencyAdmin(sender)"), "wf", "step") as Error).message)).toContain("blocked by insufficient authority");
    expect(String((normalizeEmergencyExecutionError(new Error("SecurityErrors.InvalidTimestamp()"), "wf", "step") as Error).message)).toContain("blocked by setup/state");
    expect(String((normalizeEmergencyExecutionError(new Error("withdrawal_approval missing"), "wf", "step") as Error).message)).toContain("blocked by insufficient authority");
    expect(String((normalizeEmergencyExecutionError(new Error("NeedsGovernanceApproval"), "wf", "step") as Error).message)).toContain("blocked by setup/state");
    const httpError = new HttpError(418, "teapot");
    expect(normalizeEmergencyExecutionError(httpError, "wf", "step")).toBe(httpError);
    const opaqueError = new Error("opaque failure");
    expect(normalizeEmergencyExecutionError(opaqueError, "wf", "step")).toBe(opaqueError);
    const objectError = { diagnostics: { code: "X" } };
    expect(normalizeEmergencyExecutionError(objectError, "wf", "step")).toBe(objectError);
  });

  it("resolves actor overrides, emergency posture, and emergency-state waits", async () => {
    const context = {
      apiKeys: {
        child: {
          apiKey: "child",
          label: "child",
          roles: ["service"],
          allowGasless: false,
        },
      },
    } as never;
    const auth = {
      apiKey: "parent",
      label: "parent",
      roles: ["service"],
      allowGasless: false,
    };

    expect(resolveActorOverride(context, auth, "0x00000000000000000000000000000000000000aa", undefined, "wf", "step")).toEqual({
      auth,
      walletAddress: "0x00000000000000000000000000000000000000aa",
    });
    expect(resolveActorOverride(
      context,
      auth,
      "0x00000000000000000000000000000000000000aa",
      { apiKey: "child" },
      "wf",
      "step",
    )).toEqual({
      auth: context.apiKeys.child,
      walletAddress: "0x00000000000000000000000000000000000000aa",
    });
    expect(resolveActorOverride(
      context,
      auth,
      "0x00000000000000000000000000000000000000aa",
      {
        apiKey: "child",
        walletAddress: "0x00000000000000000000000000000000000000bb",
      },
      "wf",
      "step",
    )).toEqual({
      auth: context.apiKeys.child,
      walletAddress: "0x00000000000000000000000000000000000000bb",
    });
    expect(() => resolveActorOverride(context, auth, undefined, { apiKey: "missing" }, "wf", "step")).toThrow("wf received unknown step apiKey");

    const emergency = {
      getEmergencyState: async () => ({ statusCode: 200, body: { result: 2 } }),
      isEmergencyStopped: async () => ({ statusCode: 200, body: { result: true } }),
      getEmergencyTimeout: async () => ({ statusCode: 200, body: 99n }),
    };

    await expect(readEmergencyPosture(emergency as never, auth as never, undefined)).resolves.toEqual({
      currentState: "2",
      currentStateLabel: "LOCKED_DOWN",
      isEmergencyStopped: true,
      emergencyTimeout: "99",
    });

    const waitingEmergency = {
      getEmergencyState: async () => ({ statusCode: 200, body: { result: "3" } }),
    };
    await expect(waitForEmergencyState(waitingEmergency as never, auth as never, undefined, ["3"], "wf.wait")).resolves.toEqual({
      state: "3",
      stateLabel: "RECOVERY",
    });
  });

  it("validates workflow helper schemas", () => {
    expect(digitsSchema.safeParse("123").success).toBe(true);
    expect(digitsSchema.safeParse("12a").success).toBe(false);
    expect(addressSchema.safeParse("0x00000000000000000000000000000000000000aa").success).toBe(true);
    expect(addressSchema.safeParse("0x1234").success).toBe(false);
    expect(bytes32Schema.safeParse(`0x${"a".repeat(64)}`).success).toBe(true);
    expect(bytes32Schema.safeParse("0xdeadbeef").success).toBe(false);
    expect(bytesSchema.safeParse("0xaabb").success).toBe(true);
    expect(bytesSchema.safeParse("0xabc").success).toBe(false);
    expect(actorOverrideSchema.safeParse({ apiKey: "child", walletAddress: "0x00000000000000000000000000000000000000aa" }).success).toBe(true);
    expect(actorOverrideSchema.safeParse({ apiKey: "" }).success).toBe(false);
  });
});
