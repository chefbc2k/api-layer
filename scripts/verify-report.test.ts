import { describe, expect, it } from "vitest";

import { buildVerifyReportOutput, getOutputPath } from "./verify-report.js";

describe("verify-report helpers", () => {
  it("parses --output paths from argv", () => {
    expect(getOutputPath(["node", "script", "--output", "verify.json"])).toBe("verify.json");
    expect(getOutputPath(["node", "script"])).toBeNull();
    expect(getOutputPath(["node", "script", "--output"])).toBeNull();
  });

  it("adds report aliases and computes totals", () => {
    const output = buildVerifyReportOutput({
      licensing: {
        routes: ["POST /v1/licensing/licenses/create-license", "DELETE /v1/licensing/commands/revoke-license"],
        actors: ["licensing-owner-key", "licensee-key"],
        executionResult: "license lifecycle completed",
        evidence: [{ route: "create" }, { route: "revoke" }],
        finalClassification: "proven working",
      },
      whisperblock: {
        routes: ["POST /v1/whisperblock/whisperblocks"],
        actors: ["founder-key"],
        executionResult: "whisper lifecycle blocked",
        evidence: [{ route: "register" }],
        finalClassification: "blocked by setup/state",
      },
    });

    expect(output.summary).toBe("blocked by setup/state");
    expect(output.totals).toEqual({
      domainCount: 2,
      routeCount: 3,
      evidenceCount: 3,
    });
    expect(output.statusCounts).toEqual({
      "proven working": 1,
      "blocked by setup/state": 1,
      "semantically clarified but not fully proven": 0,
      "deeper issue remains": 0,
    });
    expect(output.reports.licensing.classification).toBe("proven working");
    expect(output.reports.licensing.result).toBe("proven working");
    expect(output.reports.whisperblock.classification).toBe("blocked by setup/state");
    expect(output.reports.whisperblock.result).toBe("blocked by setup/state");
  });
});
