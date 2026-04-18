import { describe, expect, it } from "vitest";

import { isSetupBlockedResponse } from "./verify-layer1-helpers.js";

describe("verify-layer1-helpers", () => {
  it("detects canonical setup-blocked payloads", () => {
    expect(isSetupBlockedResponse({
      status: 500,
      payload: { error: "insufficient funds for intrinsic transaction cost" },
    })).toBe(true);

    expect(isSetupBlockedResponse({
      status: 409,
      payload: { error: "claim-reward-campaign blocked by setup/state: campaign is paused" },
    })).toBe(true);
  });

  it("treats common lifecycle precondition conflicts as setup-blocked", () => {
    expect(isSetupBlockedResponse({
      status: 409,
      payload: { error: "release-beneficiary-vesting blocked by setup/state: beneficiary is still in cliff period until 42" },
    })).toBe(true);

    expect(isSetupBlockedResponse({
      status: 409,
      payload: { error: "purchase-marketplace-asset blocked by setup/state: listing for token 11 has expired" },
    })).toBe(true);

    expect(isSetupBlockedResponse({
      status: 409,
      payload: { error: "claim-reward-campaign blocked by setup/state: campaign not found" },
    })).toBe(true);
  });

  it("ignores successful, malformed, and unrelated errors", () => {
    expect(isSetupBlockedResponse({ status: 200, payload: { ok: true } })).toBe(false);
    expect(isSetupBlockedResponse({ status: 500, payload: { error: "execution reverted" } })).toBe(false);
    expect(isSetupBlockedResponse({ status: 409, payload: { error: "commercialization requires current asset ownership" } })).toBe(false);
    expect(isSetupBlockedResponse(null)).toBe(false);
  });
});
