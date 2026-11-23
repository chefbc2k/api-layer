import { id } from "ethers";
import { describe, expect, it } from "vitest";

import {
  isDatasetTotalValidAfterBurn,
  isSetupBlockedResponse,
  requireVoiceLicenseCreatedEventRoute,
} from "./verify-layer1-helpers.js";

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

  it("accepts the contract's non-decrementing dataset total after burn", () => {
    expect(isDatasetTotalValidAfterBurn(27n, 27n)).toBe(true);
    expect(isDatasetTotalValidAfterBurn(27n, 28n)).toBe(true);
    expect(isDatasetTotalValidAfterBurn(27n, 26n)).toBe(false);
  });

  it.each([
    ["LicenseCreated(bytes32,address,bytes32,uint256,uint256)", "bytes32-address-bytes32-uint256-uint256"],
    ["LicenseCreated(bytes32,bytes32,address,uint256,uint256)", "bytes32-bytes32-address-uint256-uint256"],
  ])("resolves the mounted route for %s from its receipt topic", (signature, suffix) => {
    const diamond = "0x00000000000000000000000000000000000000ab";
    const logs = [{ address: "0x00000000000000000000000000000000000000AB", topics: [id(signature)] }];
    expect(requireVoiceLicenseCreatedEventRoute(diamond, logs))
      .toBe(`/v1/licensing/events/license-created/query/voice-license/${suffix}`);
  });

  it("requires the event to have been emitted by the configured diamond", () => {
    const diamond = "0x00000000000000000000000000000000000000ab";
    const unrelated = "0x00000000000000000000000000000000000000cd";
    const logs = [{ address: unrelated, topics: [id("LicenseCreated(bytes32,address,bytes32,uint256,uint256)")] }];
    expect(() => requireVoiceLicenseCreatedEventRoute(diamond, logs))
      .toThrow("did not contain a registered VoiceLicenseFacet.LicenseCreated event");
  });
});
