import { describe, expect, it } from "vitest";

import {
  buildEventSurface,
  buildMethodSurface,
  buildOperationId,
  classifyMethod,
  keyForEvent,
  keyForMethod,
  sortObject,
  toCamelCase,
  toKebabCase,
  type AbiEventDefinition,
  type AbiMethodDefinition,
} from "./api-surface-lib.js";

function method(overrides: Partial<AbiMethodDefinition> = {}): AbiMethodDefinition {
  return {
    facetName: "VoiceAssetFacet",
    wrapperKey: "getVoiceAsset",
    methodName: "getVoiceAsset",
    signature: "getVoiceAsset(bytes32)",
    category: "read",
    mutability: "view",
    liveRequired: false,
    cacheClass: "short",
    cacheTtlSeconds: 30,
    executionSources: ["live"],
    gaslessModes: [],
    inputs: [{ name: "voiceHash", type: "bytes32" }],
    outputs: [{ name: "owner", type: "address" }],
    ...overrides,
  };
}

function event(overrides: Partial<AbiEventDefinition> = {}): AbiEventDefinition {
  return {
    facetName: "VoiceAssetFacet",
    wrapperKey: "VoiceAssetRegistered",
    eventName: "VoiceAssetRegistered",
    signature: "VoiceAssetRegistered(bytes32,address)",
    topicHash: "0xtopic",
    anonymous: false,
    inputs: [],
    projection: {
      domain: "voice-assets",
      projectionMode: "rawOnly",
      targets: [],
    },
    ...overrides,
  };
}

describe("api surface helpers", () => {
  it("normalizes method and event keys and names", () => {
    expect(keyForMethod("VoiceAssetFacet", "registerVoiceAsset")).toBe("VoiceAssetFacet.registerVoiceAsset");
    expect(keyForEvent("VoiceAssetFacet", "VoiceAssetRegistered")).toBe("VoiceAssetFacet.VoiceAssetRegistered");
    expect(toKebabCase("safeTransferFrom(address,address,uint256)")).toBe("safe-transfer-from");
    expect(toCamelCase("safe_transfer_from(address,address,uint256)")).toBe("safeTransferFrom");
    expect(buildOperationId(method({
      wrapperKey: "safeTransferFrom(address,address,uint256)",
      methodName: "safeTransferFrom",
    }))).toBe("safeTransferFromAddressAddressUint256");
  });

  it("classifies reads, creates, updates, deletes, admin writes, and actions", () => {
    expect(classifyMethod("marketplace", method({ methodName: "listVoiceAssets" }))).toBe("query");
    expect(classifyMethod("voice-assets", method({ methodName: "getVoiceAsset" }))).toBe("read");
    expect(classifyMethod("voice-assets", method({ category: "write", methodName: "registerVoiceAsset" }))).toBe("create");
    expect(classifyMethod("voice-assets", method({ category: "write", methodName: "customizeRoyaltyRate" }))).toBe("update");
    expect(classifyMethod("voice-assets", method({ category: "write", methodName: "revokeUser" }))).toBe("delete");
    expect(classifyMethod("multisig", method({
      facetName: "MultiSigFacet",
      category: "write",
      methodName: "setQuorum",
    }))).toBe("admin");
    expect(classifyMethod("marketplace", method({ category: "write", methodName: "purchaseAsset" }))).toBe("action");
  });

  it("builds method surfaces with default and overridden route shapes", () => {
    expect(buildMethodSurface(method())).toMatchObject({
      domain: "voice-assets",
      resource: "voice-assets",
      classification: "read",
      httpMethod: "GET",
      path: "/v1/voice-assets/:voiceHash",
      inputShape: {
        kind: "path+body",
        bindings: [{ name: "voiceHash", source: "path", field: "voiceHash" }],
      },
      outputShape: { kind: "scalar" },
    });

    expect(buildMethodSurface(method({
      wrapperKey: "registerVoiceAsset",
      methodName: "registerVoiceAsset",
      signature: "registerVoiceAsset(bytes32,uint96)",
      category: "write",
      inputs: [
        { name: "ipfsHash", type: "bytes32" },
        { name: "royaltyRate", type: "uint96" },
      ],
      outputs: [],
      gaslessModes: ["signature"],
    }))).toMatchObject({
      classification: "create",
      httpMethod: "POST",
      path: "/v1/voice-assets",
      supportsGasless: true,
      rateLimitKind: "write",
      inputShape: {
        kind: "body",
        bindings: [
          { name: "ipfsHash", source: "body", field: "ipfsHash" },
          { name: "royaltyRate", source: "body", field: "royaltyRate" },
        ],
      },
      outputShape: { kind: "void" },
    });
  });

  it("builds event surfaces and sorts object keys", () => {
    expect(buildEventSurface(event({
      wrapperKey: "Transfer(address,address,uint256)",
      eventName: "Transfer",
    }))).toMatchObject({
      domain: "voice-assets",
      operationId: "transferAddressAddressUint256EventQuery",
      path: "/v1/voice-assets/events/transfer/query",
      notes: "VoiceAssetFacet.Transfer(address,address,uint256)",
    });

    expect(sortObject({ beta: 2, alpha: 1, gamma: 3 })).toEqual({
      alpha: 1,
      beta: 2,
      gamma: 3,
    });
  });
});
