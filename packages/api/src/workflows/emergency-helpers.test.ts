import { describe, expect, it } from "vitest";

import {
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
} from "./emergency-helpers.js";

describe("emergency-helpers", () => {
  it("maps emergency and incident labels", () => {
    expect(mapEmergencyStateLabel("0")).toBe("NORMAL");
    expect(mapEmergencyStateLabel("2")).toBe("LOCKED_DOWN");
    expect(mapIncidentTypeLabel("5")).toBe("GOVERNANCE_ATTACK");
    expect(mapResponseActionLabel("1")).toBe("FREEZE_ASSETS");
  });

  it("reads scalar, boolean, tuple, and incident payload shapes", () => {
    expect(readScalarBody("7")).toBe("7");
    expect(readScalarBody({ result: 9 })).toBe("9");
    expect(readBooleanBody(true)).toBe(true);
    expect(readBooleanBody({ result: false })).toBe(false);
    expect(readArrayBody({ body: ["0x01"] })).toEqual(["0x01"]);
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
    expect(readRecoveryPlanSummary([["0x1234"], true, "10", "0", "2", []])).toMatchObject({
      approvalCount: "2",
      phase: "executing",
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
    expect(normalizeRequestId(`0x${"1".repeat(64)}`)).toBe(`0x${"1".repeat(64)}`);
    expect(normalizeRequestId("nope")).toBeNull();
    expect(buildEventWindow({ blockNumber: 77 })).toEqual({ fromBlock: 77n, toBlock: 77n });
  });

  it("normalizes emergency authority and state conflicts", () => {
    expect(String((normalizeEmergencyExecutionError(new Error("SecurityErrors.NotEmergencyAdmin(sender)"), "wf", "step") as Error).message)).toContain("blocked by insufficient authority");
    expect(String((normalizeEmergencyExecutionError(new Error("SecurityErrors.InvalidTimestamp()"), "wf", "step") as Error).message)).toContain("blocked by setup/state");
  });
});
