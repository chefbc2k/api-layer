import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildVerifyReportOutput, getOutputPath, writeVerifyReportOutput } from "./verify-report.js";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeReport(finalClassification: "proven working" | "blocked by setup/state" | "semantically clarified but not fully proven" | "deeper issue remains") {
  return {
    routes: ["POST /v1/example"],
    actors: ["founder-key"],
    executionResult: "example",
    evidence: [{ route: "example" }],
    finalClassification,
  } as const;
}

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

  it("prefers the highest-severity summary branch", () => {
    expect(
      buildVerifyReportOutput({
        clarified: makeReport("semantically clarified but not fully proven"),
      }).summary,
    ).toBe("semantically clarified but not fully proven");

    expect(
      buildVerifyReportOutput({
        proven: makeReport("proven working"),
        clarified: makeReport("semantically clarified but not fully proven"),
        blocked: makeReport("blocked by setup/state"),
      }).summary,
    ).toBe("blocked by setup/state");

    expect(
      buildVerifyReportOutput({
        proven: makeReport("proven working"),
        deeper: makeReport("deeper issue remains"),
        blocked: makeReport("blocked by setup/state"),
      }).summary,
    ).toBe("deeper issues remain");
  });

  it("writes JSON output only when an output path is provided", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "verify-report-test-"));
    tempDirs.push(dir);
    const outputPath = path.join(dir, "verify-output.json");
    const output = { summary: "proven working", totals: { domainCount: 1 } };

    writeVerifyReportOutput(null, output);
    expect(fs.existsSync(outputPath)).toBe(false);

    writeVerifyReportOutput(outputPath, output);
    expect(fs.readFileSync(outputPath, "utf8")).toBe(`${JSON.stringify(output, null, 2)}\n`);
  });
});
