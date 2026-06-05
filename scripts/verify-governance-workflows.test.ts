import { describe, expect, it } from "vitest";

import {
  buildGovernanceOutput,
  isInsufficientFundsPayload,
  proposalIdFromSubmit,
} from "./verify-governance-workflows.js";

describe("verify-governance-workflows helpers", () => {
  it("extracts proposal ids from nested workflow payloads", () => {
    expect(proposalIdFromSubmit({ proposalId: "11" })).toBe("11");
    expect(proposalIdFromSubmit({ proposal: { proposalId: "42" } })).toBe("42");
    expect(proposalIdFromSubmit({ summary: { proposalId: "77" } })).toBe("77");
    expect(proposalIdFromSubmit({ proposal: { proposalId: 88 } })).toBe("88");
    expect(proposalIdFromSubmit({})).toBeNull();
  });

  it("detects insufficient-funds workflow payloads", () => {
    expect(isInsufficientFundsPayload({
      error: "insufficient funds for intrinsic transaction cost",
    })).toBe(true);
    expect(isInsufficientFundsPayload({
      error: "execution reverted",
    })).toBe(false);
    expect(isInsufficientFundsPayload(null)).toBe(false);
  });

  it("wraps governance proof output in the shared verify-report shape", () => {
    const output = buildGovernanceOutput({
      routes: [
        "POST /v1/workflows/submit-proposal",
        "POST /v1/workflows/vote-on-proposal",
      ],
      actors: ["founder-key", "read-key"],
      executionResult: "governance proposal submission and voting completed through HTTP workflows",
      evidence: [
        {
          step: "submitProposal",
          actor: "founder-key",
          status: 202,
          postState: { proposalId: "42" },
        },
      ],
      finalClassification: "proven working",
    });

    expect(output.summary).toBe("proven working");
    expect(output.totals).toEqual({
      domainCount: 1,
      routeCount: 2,
      evidenceCount: 1,
    });
    expect(output.statusCounts).toEqual({
      "proven working": 1,
      "blocked by setup/state": 0,
      "semantically clarified but not fully proven": 0,
      "deeper issue remains": 0,
    });
    expect(output.reports.governance).toMatchObject({
      classification: "proven working",
      result: "proven working",
      actors: ["founder-key", "read-key"],
    });
  });
});
