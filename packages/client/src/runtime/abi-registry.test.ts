import { describe, expect, it } from "vitest";

import {
  getAbiEventDefinition,
  getAbiMethodDefinition,
  getAllAbiEventDefinitions,
  getAllAbiMethodDefinitions,
} from "./abi-registry.js";

describe("abi-registry", () => {
  it("returns known method and event definitions from the generated registry", () => {
    const method = getAbiMethodDefinition("DelegationFacet.delegateBySig");
    const event = getAbiEventDefinition("VoiceAssetFacet.VoiceAssetRegistered");

    expect(method).toMatchObject({
      facetName: "DelegationFacet",
      methodName: "delegateBySig",
      signature: expect.stringContaining("delegateBySig"),
    });
    expect(event).toMatchObject({
      facetName: "VoiceAssetFacet",
      eventName: "VoiceAssetRegistered",
      signature: expect.stringContaining("VoiceAssetRegistered"),
    });
  });

  it("returns null for missing definitions and exposes the full registry maps", () => {
    expect(getAbiMethodDefinition("MissingFacet.unknown")).toBeNull();
    expect(getAbiEventDefinition("MissingFacet.UnknownEvent")).toBeNull();

    const methods = getAllAbiMethodDefinitions();
    const events = getAllAbiEventDefinitions();

    expect(Object.keys(methods).length).toBeGreaterThan(100);
    expect(Object.keys(events).length).toBeGreaterThan(10);
    expect(methods["DelegationFacet.delegateBySig"]).toBeDefined();
    expect(events["VoiceAssetFacet.VoiceAssetRegistered"]).toBeDefined();
  });
});
