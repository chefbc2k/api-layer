import { describe, expect, it } from "vitest";

import { isInsufficientFundsPayload, proposalIdFromSubmit } from "./verify-governance-workflows.js";

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
});
