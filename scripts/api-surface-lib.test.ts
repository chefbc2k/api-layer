import { describe, expect, it } from "vitest";

import {
  buildEventSurface,
  buildMethodSurface,
  buildOperationId,
  classifyMethod,
  domainByFacet,
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
    expect(toKebabCase("Already Clean")).toBe("already-clean");
    expect(toCamelCase("Already Clean")).toBe("alreadyClean");
    expect(toCamelCase("()")).toBe("");
    expect(toCamelCase("   ")).toBe("");
    expect(domainByFacet.RightsFacet).toBe("licensing");
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
    expect(classifyMethod("voice-assets", method({ category: "write", methodName: "propose" }))).toBe("create");
    expect(classifyMethod("voice-assets", method({ methodName: "getVoiceAssetByOwner" }))).toBe("query");
    expect(classifyMethod("voice-assets", method({ methodName: "URI" }))).toBe("query");
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

    expect(buildMethodSurface(method({
      facetName: "AccessControlFacet",
      wrapperKey: "grantRole",
      methodName: "grantRole",
      category: "write",
      inputs: [
        { name: "role", type: "bytes32" },
        { name: "account", type: "address" },
      ],
      outputs: [],
    }))).toMatchObject({
      domain: "access-control",
      classification: "admin",
      httpMethod: "POST",
      path: "/v1/access-control/admin/grant-role",
      inputShape: {
        kind: "body",
        bindings: [
          { name: "role", source: "body", field: "role" },
          { name: "account", source: "body", field: "account" },
        ],
      },
    });

    expect(buildMethodSurface(method({
      wrapperKey: "supportsInterface",
      methodName: "supportsInterface",
      inputs: [{ name: "", type: "bytes4" }],
      outputs: [{ name: "supported", type: "bool" }],
    }))).toMatchObject({
      classification: "query",
      httpMethod: "GET",
      path: "/v1/voice-assets/queries/supports-interface",
      inputShape: {
        kind: "query",
        bindings: [{ name: "value", source: "query", field: "value" }],
      },
    });

    expect(buildMethodSurface(method({
      wrapperKey: "lockVoiceAsset",
      methodName: "lockVoiceAsset",
      category: "write",
      inputs: [],
      outputs: [],
    }))).toMatchObject({
      classification: "action",
      httpMethod: "POST",
      path: "/v1/voice-assets/:voiceHash/lock",
      inputShape: {
        kind: "path+body",
        bindings: [{ name: "voiceHash", source: "path", field: "voiceHash" }],
      },
    });
  });

  it("maps resource domains, HTTP verbs, and output shapes across non-voice facets", () => {
    expect(buildMethodSurface(method({
      facetName: "VoiceDatasetFacet",
      wrapperKey: "createDataset",
      methodName: "createDataset",
      category: "write",
      inputs: [{ name: "name", type: "string" }],
      outputs: [{ name: "datasetId", type: "uint256" }],
    }))).toMatchObject({
      domain: "datasets",
      resource: "datasets",
      classification: "create",
      httpMethod: "POST",
      path: "/v1/datasets/datasets",
      outputShape: { kind: "scalar" },
    });

    expect(buildMethodSurface(method({
      facetName: "VoiceLicenseTemplateFacet",
      wrapperKey: "createTemplate",
      methodName: "createTemplate",
      category: "write",
      inputs: [{ name: "name", type: "string" }],
      outputs: [{ name: "templateId", type: "uint256" }],
    }))).toMatchObject({
      domain: "licensing",
      resource: "license-templates",
      classification: "create",
      httpMethod: "POST",
      path: "/v1/licensing/license-templates",
      outputShape: { kind: "scalar" },
    });

    expect(buildMethodSurface(method({
      facetName: "VoiceLicenseFacet",
      wrapperKey: "issueLicense",
      methodName: "issueLicense",
      category: "write",
      inputs: [{ name: "templateId", type: "uint256" }],
      outputs: [{ name: "licenseId", type: "uint256" }],
    }))).toMatchObject({
      domain: "licensing",
      resource: "licenses",
      classification: "create",
      httpMethod: "POST",
      path: "/v1/licensing/licenses",
      outputShape: { kind: "scalar" },
    });

    expect(buildMethodSurface(method({
      facetName: "RightsFacet",
      wrapperKey: "getRight",
      methodName: "getRight",
      inputs: [
        { name: "holder", type: "tuple", components: [{ name: "owner", type: "address" }] },
        { name: "id", type: "uint256" },
        { name: "extra", type: "uint256" },
      ],
      outputs: [{ name: "right", type: "tuple", components: [{ name: "id", type: "uint256" }] }],
    }))).toMatchObject({
      resource: "rights",
      httpMethod: "POST",
      path: "/v1/licensing/queries/get-right",
      inputShape: { kind: "body" },
      outputShape: { kind: "object" },
    });

    expect(buildMethodSurface(method({
      facetName: "PaymentFacet",
      wrapperKey: "withdrawPayments",
      methodName: "withdrawPayments",
      category: "write",
      inputs: [{ name: "payee", type: "address" }],
      outputs: [],
    }))).toMatchObject({
      domain: "marketplace",
      resource: "payments",
      classification: "action",
      httpMethod: "POST",
      path: "/v1/marketplace/commands/withdraw-payments",
    });

    expect(buildMethodSurface(method({
      facetName: "EscrowFacet",
      wrapperKey: "cancelEscrow",
      methodName: "cancelEscrow",
      category: "write",
      inputs: [{ name: "escrowId", type: "uint256" }],
      outputs: [],
    }))).toMatchObject({
      domain: "marketplace",
      resource: "escrow",
      classification: "delete",
      httpMethod: "DELETE",
      path: "/v1/marketplace/commands/cancel-escrow",
    });

    expect(buildMethodSurface(method({
      facetName: "MarketplaceFacet",
      wrapperKey: "getMarketplaceListing",
      methodName: "getMarketplaceListing",
      inputs: [{ name: "listingId", type: "uint256" }],
      outputs: [{ name: "listing", type: "tuple", components: [{ name: "price", type: "uint256" }] }],
    }))).toMatchObject({
      domain: "marketplace",
      resource: "listings",
      classification: "read",
      httpMethod: "GET",
      path: "/v1/marketplace/queries/get-marketplace-listing",
      outputShape: { kind: "object" },
    });

    expect(buildMethodSurface(method({
      facetName: "ProposalFacet",
      wrapperKey: "setProposalThreshold",
      methodName: "setProposalThreshold",
      category: "write",
      inputs: [{ name: "threshold", type: "uint256" }],
      outputs: [],
    }))).toMatchObject({
      domain: "governance",
      resource: "proposals",
      classification: "update",
      httpMethod: "PATCH",
    });

    expect(buildMethodSurface(method({
      facetName: "GovernorFacet",
      wrapperKey: "castVote",
      methodName: "castVote",
      category: "write",
      inputs: [{ name: "proposalId", type: "uint256" }],
      outputs: [],
    }))).toMatchObject({
      resource: "governance",
      classification: "action",
      httpMethod: "POST",
    });

    expect(buildMethodSurface(method({
      facetName: "TimelockFacet",
      wrapperKey: "queueOperation",
      methodName: "queueOperation",
      category: "write",
      inputs: [{ name: "operationId", type: "bytes32" }],
      outputs: [
        { name: "scheduledAt", type: "uint256" },
        { name: "eta", type: "uint256" },
      ],
    }))).toMatchObject({
      resource: "timelock-operations",
      classification: "action",
      httpMethod: "POST",
      outputShape: { kind: "tuple" },
    });

    expect(buildMethodSurface(method({
      facetName: "DelegationFacet",
      wrapperKey: "delegateVotes",
      methodName: "delegateVotes",
      category: "write",
      inputs: [{ name: "delegatee", type: "address" }],
      outputs: [],
    }))).toMatchObject({
      domain: "staking",
      resource: "delegations",
    });

    expect(buildMethodSurface(method({
      facetName: "VotingPowerFacet",
      wrapperKey: "getVotingPower",
      methodName: "getVotingPower",
      inputs: [{ name: "account", type: "address" }],
      outputs: [{ name: "power", type: "uint256[]" }],
    }))).toMatchObject({
      resource: "voting-power",
      outputShape: { kind: "array" },
    });

    expect(buildMethodSurface(method({
      facetName: "EchoScoreFacetV3",
      wrapperKey: "getEchoScore",
      methodName: "getEchoScore",
    }))).toMatchObject({
      resource: "echo-scores",
    });

    expect(buildMethodSurface(method({
      facetName: "StakingFacet",
      wrapperKey: "stakeTokens",
      methodName: "stakeTokens",
      category: "write",
      inputs: [{ name: "amount", type: "uint256" }],
      outputs: [],
    }))).toMatchObject({
      resource: "stakes",
      classification: "action",
    });

    expect(buildMethodSurface(method({
      facetName: "CommunityRewardsFacet",
      wrapperKey: "listCampaigns",
      methodName: "listCampaigns",
    }))).toMatchObject({
      domain: "tokenomics",
      resource: "community-rewards",
      classification: "query",
    });

    expect(buildMethodSurface(method({
      facetName: "TimewaveGiftFacet",
      wrapperKey: "claimGift",
      methodName: "claimGift",
      category: "write",
      inputs: [{ name: "giftId", type: "uint256" }],
      outputs: [],
    }))).toMatchObject({
      resource: "vesting",
    });

    expect(buildMethodSurface(method({
      facetName: "VestingFacet",
      wrapperKey: "createVestingSchedule",
      methodName: "createVestingSchedule",
      category: "write",
      inputs: [{ name: "beneficiary", type: "address" }],
      outputs: [],
    }))).toMatchObject({
      resource: "vesting",
      classification: "create",
    });

    expect(buildMethodSurface(method({
      facetName: "BurnThresholdFacet",
      wrapperKey: "getBurnThreshold",
      methodName: "getBurnThreshold",
    }))).toMatchObject({
      resource: "burn-thresholds",
    });

    expect(buildMethodSurface(method({
      facetName: "TokenSupplyFacet",
      wrapperKey: "getTokenSupply",
      methodName: "getTokenSupply",
    }))).toMatchObject({
      resource: "token-supply",
    });

    expect(buildMethodSurface(method({
      facetName: "EmergencyFacet",
      wrapperKey: "triggerEmergencyShutdown",
      methodName: "triggerEmergencyShutdown",
      category: "write",
      inputs: [{ name: "reasonCode", type: "uint256" }],
      outputs: [],
    }))).toMatchObject({
      domain: "emergency",
      resource: "emergency",
      classification: "admin",
    });

    expect(buildMethodSurface(method({
      facetName: "WhisperBlockFacet",
      wrapperKey: "getWhisperBlock",
      methodName: "getWhisperBlock",
    }))).toMatchObject({
      domain: "whisperblock",
      resource: "whisperblocks",
    });
  });

  it("applies voice-asset route overrides for write, read, and transfer variants", () => {
    expect(buildMethodSurface(method({
      wrapperKey: "registerVoiceAssetForCaller",
      methodName: "registerVoiceAssetForCaller",
      category: "write",
      inputs: [{ name: "ipfsHash", type: "bytes32" }],
      outputs: [{ name: "voiceHash", type: "bytes32" }],
    }))).toMatchObject({
      path: "/v1/voice-assets/registrations/for-caller",
    });

    expect(buildMethodSurface(method({
      wrapperKey: "getVoiceAssetDetails",
      methodName: "getVoiceAssetDetails",
      inputs: [{ name: "voiceHash", type: "bytes32" }],
      outputs: [{ name: "details", type: "tuple", components: [{ name: "owner", type: "address" }] }],
    }))).toMatchObject({
      httpMethod: "GET",
      path: "/v1/voice-assets/:voiceHash/details",
    });

    expect(buildMethodSurface(method({
      wrapperKey: "getVoiceAssetsByOwner",
      methodName: "getVoiceAssetsByOwner",
      inputs: [{ name: "owner", type: "address" }],
      outputs: [{ name: "tokens", type: "uint256[]" }],
    }))).toMatchObject({
      httpMethod: "GET",
      path: "/v1/voice-assets/by-owner/:owner",
    });

    expect(buildMethodSurface(method({
      wrapperKey: "authorizeUser",
      methodName: "authorizeUser",
      category: "write",
      inputs: [
        { name: "voiceHash", type: "bytes32" },
        { name: "user", type: "address" },
      ],
      outputs: [],
    }))).toMatchObject({
      path: "/v1/voice-assets/:voiceHash/authorization-grants",
      inputShape: {
        kind: "path+body",
        bindings: [
          { name: "voiceHash", source: "path", field: "voiceHash" },
          { name: "user", source: "body", field: "user" },
        ],
      },
    });

    expect(buildMethodSurface(method({
      wrapperKey: "revokeUser",
      methodName: "revokeUser",
      category: "write",
      inputs: [
        { name: "voiceHash", type: "bytes32" },
        { name: "user", type: "address" },
      ],
      outputs: [],
    }))).toMatchObject({
      httpMethod: "DELETE",
      path: "/v1/voice-assets/:voiceHash/authorization-grants/:user",
      inputShape: {
        kind: "path+body",
        bindings: [
          { name: "voiceHash", source: "path", field: "voiceHash" },
          { name: "user", source: "path", field: "user" },
        ],
      },
    });

    expect(buildMethodSurface(method({
      wrapperKey: "recordRoyaltyPayment",
      methodName: "recordRoyaltyPayment",
      category: "write",
      inputs: [
        { name: "voiceHash", type: "bytes32" },
        { name: "amount", type: "uint256" },
        { name: "usageReference", type: "string" },
      ],
      outputs: [],
    }))).toMatchObject({
      path: "/v1/voice-assets/:voiceHash/royalty-payments",
    });

    expect(buildMethodSurface(method({
      wrapperKey: "transferFromVoiceAsset",
      methodName: "transferFromVoiceAsset",
      category: "write",
      inputs: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "tokenId", type: "uint256" },
      ],
      outputs: [],
    }))).toMatchObject({
      path: "/v1/voice-assets/tokens/:tokenId/transfers",
      inputShape: {
        kind: "path+body",
        bindings: [
          { name: "from", source: "body", field: "from" },
          { name: "to", source: "body", field: "to" },
          { name: "tokenId", source: "path", field: "tokenId" },
        ],
      },
    });

    expect(buildMethodSurface(method({
      wrapperKey: "safeTransferFrom(address,address,uint256,bytes)",
      methodName: "safeTransferFrom",
      category: "write",
      inputs: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "tokenId", type: "uint256" },
        { name: "data", type: "bytes" },
      ],
      outputs: [],
    }))).toMatchObject({
      path: "/v1/voice-assets/tokens/:tokenId/transfers/safe-with-data",
      inputShape: {
        kind: "path+body",
        bindings: [
          { name: "from", source: "body", field: "from" },
          { name: "to", source: "body", field: "to" },
          { name: "tokenId", source: "path", field: "tokenId" },
          { name: "data", source: "body", field: "data" },
        ],
      },
    });

    expect(buildMethodSurface(method({
      wrapperKey: "recordUsage",
      methodName: "recordUsage",
      category: "write",
      inputs: [
        { name: "voiceHash", type: "bytes32" },
        { name: "usageRef", type: "string" },
      ],
      outputs: [],
    }))).toMatchObject({
      path: "/v1/voice-assets/:voiceHash/usage-records",
    });

    expect(buildMethodSurface(method({
      facetName: "VoiceMetadataFacet",
      wrapperKey: "updateBasicAcousticFeatures",
      methodName: "updateBasicAcousticFeatures",
      category: "write",
      inputs: [
        { name: "voiceHash", type: "bytes32" },
        { name: "features", type: "tuple", components: [{ name: "tempo", type: "uint256" }] },
      ],
      outputs: [],
    }))).toMatchObject({
      path: "/v1/voice-assets/:voiceHash/metadata/acoustic-features",
    });

    expect(buildMethodSurface(method({
      wrapperKey: "ownerOf",
      methodName: "ownerOf",
      inputs: [{ name: "tokenId", type: "uint256" }],
      outputs: [{ name: "owner", type: "address" }],
    }))).toMatchObject({
      httpMethod: "GET",
      path: "/v1/voice-assets/tokens/:tokenId/owner",
    });

    expect(buildMethodSurface(method({
      wrapperKey: "tokenURI",
      methodName: "tokenURI",
      inputs: [{ name: "tokenId", type: "uint256" }],
      outputs: [{ name: "uri", type: "string" }],
    }))).toMatchObject({
      httpMethod: "GET",
      path: "/v1/voice-assets/tokens/:tokenId/uri",
    });

    expect(buildMethodSurface(method({
      wrapperKey: "safeTransferFrom(address,address,uint256)",
      methodName: "safeTransferFrom",
      category: "write",
      inputs: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "tokenId", type: "uint256" },
      ],
      outputs: [],
    }))).toMatchObject({
      path: "/v1/voice-assets/tokens/:tokenId/transfers/safe",
    });

    expect(buildMethodSurface(method({
      facetName: "VoiceMetadataFacet",
      wrapperKey: "searchVoicesByClassification",
      methodName: "searchVoicesByClassification",
      inputs: [{ name: "classification", type: "string" }],
      outputs: [{ name: "matches", type: "bytes32[]" }],
    }))).toMatchObject({
      httpMethod: "POST",
      path: "/v1/voice-assets/queries/by-classification",
    });

    expect(buildMethodSurface(method({
      facetName: "VoiceMetadataFacet",
      wrapperKey: "updateBasicAcousticFeatures",
      methodName: "updateBasicAcousticFeatures",
      category: "write",
      inputs: [
        { name: "voiceHash", type: "bytes32" },
        { name: "features", type: "tuple", components: [{ name: "tempo", type: "uint256" }] },
      ],
      outputs: [],
    }))).toMatchObject({
      path: "/v1/voice-assets/:voiceHash/metadata/acoustic-features",
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

    expect(buildEventSurface(event({
      facetName: "GovernorFacet",
      wrapperKey: "VoteCast",
      eventName: "VoteCast",
    }))).toMatchObject({
      domain: "governance",
      operationId: "voteCastEventQuery",
      path: "/v1/governance/events/vote-cast/query",
      notes: "GovernorFacet.VoteCast",
    });

    expect(sortObject({ beta: 2, alpha: 1, gamma: 3 })).toEqual({
      alpha: 1,
      beta: 2,
      gamma: 3,
    });
  });

  it("throws for unmapped method or event facets", () => {
    expect(() => buildMethodSurface(method({ facetName: "UnknownFacet" }))).toThrow("missing domain mapping for UnknownFacet");
    expect(() => buildEventSurface(event({ facetName: "UnknownFacet" }))).toThrow("missing domain mapping for UnknownFacet");
  });
});
