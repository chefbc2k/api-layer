import path from "node:path";

import { generatedManifestDir, readJson } from "./utils.js";

export type AbiParameter = {
  name?: string;
  type: string;
  internalType?: string;
  components?: AbiParameter[];
  indexed?: boolean;
};

export type AbiMethodDefinition = {
  facetName: string;
  wrapperKey: string;
  methodName: string;
  signature: string;
  category: "read" | "write";
  mutability: string;
  liveRequired: boolean;
  cacheClass: "none" | "short" | "queryJoin" | "static" | "assetMetadata";
  cacheTtlSeconds: number | null;
  executionSources: Array<"live" | "cache" | "indexed">;
  gaslessModes: Array<"signature" | "cdpSmartWallet">;
  inputs: AbiParameter[];
  outputs: AbiParameter[];
};

export type AbiEventDefinition = {
  facetName: string;
  wrapperKey: string;
  eventName: string;
  signature: string;
  topicHash: string | null;
  anonymous: boolean;
  inputs: AbiParameter[];
  projection: {
    domain: string;
    projectionMode: "rawOnly" | "ledger" | "current" | "mixed";
    targets: Array<{ table: string; mode: "ledger" | "current" }>;
  };
};

export type AbiRegistryFile = {
  generatedAt: string;
  methods: Record<string, AbiMethodDefinition>;
  events: Record<string, AbiEventDefinition>;
};

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export type ApiClassification = "create" | "read" | "update" | "delete" | "action" | "admin" | "query";

export type RateLimitKind = "read" | "write" | "gasless";

export type InputBinding = {
  name: string;
  source: "path" | "query" | "body";
  field: string;
};

export type ApiSurfaceMethod = {
  facetName: string;
  wrapperKey: string;
  domain: string;
  resource: string;
  classification: ApiClassification;
  operationId: string;
  httpMethod: HttpMethod;
  path: string;
  inputShape: {
    kind: "none" | "query" | "body" | "path+body";
    bindings: InputBinding[];
  };
  outputShape: {
    kind: "void" | "scalar" | "tuple" | "array" | "object";
  };
  rateLimitKind: RateLimitKind;
  supportsGasless: boolean;
  notes: string;
};

export type ApiSurfaceEvent = {
  facetName: string;
  wrapperKey: string;
  domain: string;
  operationId: string;
  httpMethod: "POST";
  path: string;
  notes: string;
};

export type ReviewedApiSurfaceFile = {
  version: number;
  generatedAt: string;
  methods: Record<string, ApiSurfaceMethod>;
  events: Record<string, ApiSurfaceEvent>;
};

export const domainByFacet: Record<string, string> = {
  AccessControlFacet: "access-control",
  OwnershipFacet: "ownership",
  DiamondCutFacet: "diamond-admin",
  DiamondLoupeFacet: "diamond-admin",
  UpgradeControllerFacet: "diamond-admin",
  EmergencyFacet: "emergency",
  EmergencyWithdrawalFacet: "emergency",
  MultiSigFacet: "multisig",
  VoiceAssetFacet: "voice-assets",
  VoiceMetadataFacet: "voice-assets",
  VoiceDatasetFacet: "datasets",
  VoiceLicenseFacet: "licensing",
  VoiceLicenseTemplateFacet: "licensing",
  MarketplaceFacet: "marketplace",
  PaymentFacet: "marketplace",
  GovernorFacet: "governance",
  ProposalFacet: "governance",
  TimelockFacet: "governance",
  StakingFacet: "staking",
  DelegationFacet: "staking",
  VotingPowerFacet: "staking",
  EchoScoreFacetV3: "staking",
  TokenSupplyFacet: "tokenomics",
  BurnThresholdFacet: "tokenomics",
  TimewaveGiftFacet: "tokenomics",
  WhisperBlockFacet: "whisperblock",
};

const adminDomains = new Set(["access-control", "diamond-admin", "emergency", "multisig"]);
const queryPrefixes = ["search", "list", "has", "is", "supports", "facet", "debug", "calculate"];
const createPrefixes = ["create", "register", "issue", "init", "initialize"];
const updatePrefixes = ["set", "update", "configure", "customize"];
const deletePrefixes = ["delete", "remove", "revoke", "burn", "cancel", "renounce"];
const actionPrefixes = [
  "stake",
  "claim",
  "queue",
  "execute",
  "transfer",
  "purchase",
  "lock",
  "unlock",
  "withdraw",
  "record",
  "delegate",
  "pause",
  "unpause",
  "advance",
  "fund",
  "append",
  "approve",
  "grant",
  "freeze",
  "unfreeze",
  "start",
  "trigger",
  "complete",
  "schedule",
  "report",
  "release",
  "request",
];

function startsWithAny(value: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => value.startsWith(prefix));
}

export function keyForMethod(facetName: string, wrapperKey: string): string {
  return `${facetName}.${wrapperKey}`;
}

export function keyForEvent(facetName: string, wrapperKey: string): string {
  return `${facetName}.${wrapperKey}`;
}

export async function loadAbiRegistry(): Promise<AbiRegistryFile> {
  return readJson<AbiRegistryFile>(path.join(generatedManifestDir, "abi-method-registry.json"));
}

export function toKebabCase(value: string): string {
  return value
    .replace(/\((.*)\)$/u, "")
    .replace(/([a-z0-9])([A-Z])/gu, "$1-$2")
    .replace(/[^A-Za-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .toLowerCase();
}

export function toCamelCase(value: string): string {
  const cleaned = value.replace(/\((.*)\)$/u, "");
  const normalized = cleaned
    .replace(/([a-z0-9])([A-Z])/gu, "$1 $2")
    .replace(/[^A-Za-z0-9]+/gu, " ")
    .trim();
  const parts = normalized.length > 0 ? normalized.split(/\s+/u) : [];
  return parts
    .map((part, index) => {
      const lowered = part.toLowerCase();
      return index === 0 ? lowered : lowered.charAt(0).toUpperCase() + lowered.slice(1);
    })
    .join("");
}

function suffixForOverload(wrapperKey: string): string {
  const signature = wrapperKey.match(/\((.*)\)$/u)?.[1] ?? "";
  if (!signature) {
    return "";
  }
  return signature
    .split(",")
    .map((part) => part.replace(/\[\]/gu, "Array").replace(/[^A-Za-z0-9]+/gu, " ").trim())
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function buildOperationId(method: Pick<AbiMethodDefinition, "wrapperKey" | "methodName">): string {
  const base = toCamelCase(method.methodName);
  const overloadSuffix = method.wrapperKey === method.methodName ? "" : suffixForOverload(method.wrapperKey);
  return `${base}${overloadSuffix}`;
}

function inferResource(domain: string, method: AbiMethodDefinition): string {
  if (domain === "voice-assets") {
    return method.facetName === "VoiceMetadataFacet" ? "metadata" : "voice-assets";
  }
  if (domain === "datasets") {
    return "datasets";
  }
  if (domain === "licensing") {
    return method.facetName === "VoiceLicenseTemplateFacet" ? "license-templates" : "licenses";
  }
  if (domain === "marketplace") {
    return method.facetName === "PaymentFacet" ? "payments" : "listings";
  }
  if (domain === "governance") {
    if (method.facetName === "ProposalFacet") {
      return "proposals";
    }
    if (method.facetName === "TimelockFacet") {
      return "timelock-operations";
    }
    return "governance";
  }
  if (domain === "staking") {
    if (method.facetName === "DelegationFacet") {
      return "delegations";
    }
    if (method.facetName === "VotingPowerFacet") {
      return "voting-power";
    }
    if (method.facetName === "EchoScoreFacetV3") {
      return "echo-scores";
    }
    return "stakes";
  }
  if (domain === "tokenomics") {
    if (method.facetName === "TimewaveGiftFacet") {
      return "vesting";
    }
    if (method.facetName === "BurnThresholdFacet") {
      return "burn-thresholds";
    }
    return "token-supply";
  }
  if (domain === "whisperblock") {
    return "whisperblocks";
  }
  return domain;
}

export function classifyMethod(domain: string, method: AbiMethodDefinition): ApiClassification {
  const name = method.methodName;
  if (method.category === "read") {
    if (startsWithAny(name, queryPrefixes) || name === name.toUpperCase() || name.includes("By") || name.endsWith("s")) {
      return "query";
    }
    return "read";
  }
  if (startsWithAny(name, createPrefixes) || name === "propose") {
    return "create";
  }
  if (startsWithAny(name, deletePrefixes)) {
    return "delete";
  }
  if (startsWithAny(name, updatePrefixes)) {
    return adminDomains.has(domain) ? "admin" : "update";
  }
  if (adminDomains.has(domain)) {
    return "admin";
  }
  if (startsWithAny(name, actionPrefixes)) {
    return "action";
  }
  return "action";
}

function isSimpleScalarType(type: string): boolean {
  return /^(address|bool|string|bytes\d*|u?int\d*)$/u.test(type);
}

function isSimpleRead(method: AbiMethodDefinition): boolean {
  return method.inputs.length > 0 && method.inputs.length <= 2 && method.inputs.every((input) => isSimpleScalarType(input.type));
}

function defaultPathFor(domain: string, method: ApiSurfaceMethod, abiMethod: AbiMethodDefinition): string {
  const operationSegment = toKebabCase(method.operationId);
  if (method.classification === "read" && isSimpleRead(abiMethod)) {
    return `/v1/${domain}/queries/${operationSegment}`;
  }
  if (method.classification === "query" || method.classification === "read") {
    return `/v1/${domain}/queries/${operationSegment}`;
  }
  if (method.classification === "create") {
    return `/v1/${domain}/${method.resource}`;
  }
  if (method.classification === "update") {
    return `/v1/${domain}/commands/${operationSegment}`;
  }
  if (method.classification === "delete") {
    return `/v1/${domain}/commands/${operationSegment}`;
  }
  if (method.classification === "admin") {
    return `/v1/${domain}/admin/${operationSegment}`;
  }
  return `/v1/${domain}/commands/${operationSegment}`;
}

function defaultHttpMethodFor(classification: ApiClassification, abiMethod: AbiMethodDefinition): HttpMethod {
  if ((classification === "read" || classification === "query") && isSimpleRead(abiMethod)) {
    return "GET";
  }
  if (classification === "read" || classification === "query") {
    return "POST";
  }
  if (classification === "update") {
    return "PATCH";
  }
  if (classification === "delete") {
    return "DELETE";
  }
  return "POST";
}

function defaultBindingsFor(httpMethod: HttpMethod, abiMethod: AbiMethodDefinition): ApiSurfaceMethod["inputShape"] {
  if (abiMethod.inputs.length === 0) {
    return {
      kind: "none",
      bindings: [],
    };
  }
  if (httpMethod === "GET") {
    return {
      kind: "query",
      bindings: abiMethod.inputs.map((input) => ({
        name: input.name && input.name.length > 0 ? input.name : "value",
        source: "query",
        field: input.name && input.name.length > 0 ? input.name : "value",
      })),
    };
  }
  return {
    kind: "body",
    bindings: abiMethod.inputs.map((input, index) => ({
      name: input.name && input.name.length > 0 ? input.name : `arg${index}`,
      source: "body",
      field: input.name && input.name.length > 0 ? input.name : `arg${index}`,
    })),
  };
}

function overrideVoiceAssetMethod(method: AbiMethodDefinition, entry: ApiSurfaceMethod): ApiSurfaceMethod {
  const overrides: Record<string, Partial<ApiSurfaceMethod>> = {
    "VoiceAssetFacet.registerVoiceAsset": {
      httpMethod: "POST",
      path: "/v1/voice-assets",
      inputShape: {
        kind: "body",
        bindings: [
          { name: "ipfsHash", source: "body", field: "ipfsHash" },
          { name: "royaltyRate", source: "body", field: "royaltyRate" },
        ],
      },
    },
    "VoiceAssetFacet.registerVoiceAssetForCaller": {
      httpMethod: "POST",
      path: "/v1/voice-assets/registrations/for-caller",
    },
    "VoiceAssetFacet.getVoiceAsset": {
      httpMethod: "GET",
      path: "/v1/voice-assets/:voiceHash",
      inputShape: {
        kind: "path+body",
        bindings: [{ name: "voiceHash", source: "path", field: "voiceHash" }],
      },
    },
    "VoiceAssetFacet.getVoiceAssetDetails": {
      httpMethod: "GET",
      path: "/v1/voice-assets/:voiceHash/details",
      inputShape: {
        kind: "path+body",
        bindings: [{ name: "voiceHash", source: "path", field: "voiceHash" }],
      },
    },
    "VoiceAssetFacet.getVoiceAssetsByOwner": {
      httpMethod: "GET",
      path: "/v1/voice-assets/by-owner/:owner",
      inputShape: {
        kind: "path+body",
        bindings: [{ name: "owner", source: "path", field: "owner" }],
      },
    },
    "VoiceAssetFacet.authorizeUser": {
      httpMethod: "POST",
      path: "/v1/voice-assets/:voiceHash/authorization-grants",
      inputShape: {
        kind: "path+body",
        bindings: [
          { name: "voiceHash", source: "path", field: "voiceHash" },
          { name: "user", source: "body", field: "user" },
        ],
      },
    },
    "VoiceAssetFacet.revokeUser": {
      httpMethod: "DELETE",
      path: "/v1/voice-assets/:voiceHash/authorization-grants/:user",
      inputShape: {
        kind: "path+body",
        bindings: [
          { name: "voiceHash", source: "path", field: "voiceHash" },
          { name: "user", source: "path", field: "user" },
        ],
      },
    },
    "VoiceAssetFacet.customizeRoyaltyRate": {
      httpMethod: "PATCH",
      path: "/v1/voice-assets/:voiceHash/royalty-rate",
      inputShape: {
        kind: "path+body",
        bindings: [
          { name: "voiceHash", source: "path", field: "voiceHash" },
          { name: "royaltyRate", source: "body", field: "royaltyRate" },
        ],
      },
    },
    "VoiceAssetFacet.recordUsage": {
      httpMethod: "POST",
      path: "/v1/voice-assets/:voiceHash/usage-records",
      inputShape: {
        kind: "path+body",
        bindings: [
          { name: "voiceHash", source: "path", field: "voiceHash" },
          { name: "usageRef", source: "body", field: "usageRef" },
        ],
      },
    },
    "VoiceAssetFacet.recordRoyaltyPayment": {
      httpMethod: "POST",
      path: "/v1/voice-assets/:voiceHash/royalty-payments",
      inputShape: {
        kind: "path+body",
        bindings: [
          { name: "voiceHash", source: "path", field: "voiceHash" },
          { name: "amount", source: "body", field: "amount" },
          { name: "usageReference", source: "body", field: "usageReference" },
        ],
      },
    },
    "VoiceAssetFacet.lockVoiceAsset": {
      httpMethod: "POST",
      path: "/v1/voice-assets/:voiceHash/lock",
      inputShape: {
        kind: "path+body",
        bindings: [{ name: "voiceHash", source: "path", field: "voiceHash" }],
      },
    },
    "VoiceAssetFacet.unlockVoiceAsset": {
      httpMethod: "POST",
      path: "/v1/voice-assets/:voiceHash/unlock",
      inputShape: {
        kind: "path+body",
        bindings: [{ name: "voiceHash", source: "path", field: "voiceHash" }],
      },
    },
    "VoiceAssetFacet.ownerOf": {
      httpMethod: "GET",
      path: "/v1/voice-assets/tokens/:tokenId/owner",
      inputShape: {
        kind: "path+body",
        bindings: [{ name: "tokenId", source: "path", field: "tokenId" }],
      },
    },
    "VoiceAssetFacet.tokenURI": {
      httpMethod: "GET",
      path: "/v1/voice-assets/tokens/:tokenId/uri",
      inputShape: {
        kind: "path+body",
        bindings: [{ name: "tokenId", source: "path", field: "tokenId" }],
      },
    },
    "VoiceAssetFacet.transferFromVoiceAsset": {
      httpMethod: "POST",
      path: "/v1/voice-assets/tokens/:tokenId/transfers",
      inputShape: {
        kind: "path+body",
        bindings: [
          { name: "from", source: "body", field: "from" },
          { name: "to", source: "body", field: "to" },
          { name: "tokenId", source: "path", field: "tokenId" },
        ],
      },
    },
    "VoiceAssetFacet.safeTransferFrom(address,address,uint256)": {
      httpMethod: "POST",
      path: "/v1/voice-assets/tokens/:tokenId/transfers/safe",
      inputShape: {
        kind: "path+body",
        bindings: [
          { name: "from", source: "body", field: "from" },
          { name: "to", source: "body", field: "to" },
          { name: "tokenId", source: "path", field: "tokenId" },
        ],
      },
    },
    "VoiceAssetFacet.safeTransferFrom(address,address,uint256,bytes)": {
      httpMethod: "POST",
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
    },
    "VoiceMetadataFacet.searchVoicesByClassification": {
      httpMethod: "POST",
      path: "/v1/voice-assets/queries/by-classification",
    },
    "VoiceMetadataFacet.updateBasicAcousticFeatures": {
      httpMethod: "PATCH",
      path: "/v1/voice-assets/:voiceHash/metadata/acoustic-features",
      inputShape: {
        kind: "path+body",
        bindings: [
          { name: "voiceHash", source: "path", field: "voiceHash" },
          { name: "features", source: "body", field: "features" },
        ],
      },
    },
  };

  const override = overrides[keyForMethod(method.facetName, method.wrapperKey)];
  return override ? { ...entry, ...override } : entry;
}

export function buildMethodSurface(method: AbiMethodDefinition): ApiSurfaceMethod {
  const domain = domainByFacet[method.facetName];
  if (!domain) {
    throw new Error(`missing domain mapping for ${method.facetName}`);
  }
  const classification = classifyMethod(domain, method);
  const operationId = buildOperationId(method);
  const entry: ApiSurfaceMethod = {
    facetName: method.facetName,
    wrapperKey: method.wrapperKey,
    domain,
    resource: inferResource(domain, method),
    classification,
    httpMethod: defaultHttpMethodFor(classification, method),
    path: "",
    inputShape: defaultBindingsFor(defaultHttpMethodFor(classification, method), method),
    outputShape: {
      kind: method.outputs.length === 0 ? "void" : method.outputs.length === 1
        ? method.outputs[0].type.endsWith("[]")
          ? "array"
          : method.outputs[0].type === "tuple"
            ? "object"
            : "scalar"
        : "tuple",
    },
    operationId,
    rateLimitKind: method.category === "read" ? "read" : "write",
    supportsGasless: method.gaslessModes.length > 0,
    notes: `${method.facetName}.${method.wrapperKey}`,
  };
  entry.path = defaultPathFor(domain, entry, method);
  return domain === "voice-assets" ? overrideVoiceAssetMethod(method, entry) : entry;
}

export function buildEventSurface(event: AbiEventDefinition): ApiSurfaceEvent {
  const domain = domainByFacet[event.facetName];
  if (!domain) {
    throw new Error(`missing domain mapping for ${event.facetName}`);
  }
  const operationId = `${toCamelCase(event.eventName)}${event.wrapperKey === event.eventName ? "" : suffixForOverload(event.wrapperKey)}EventQuery`;
  return {
    facetName: event.facetName,
    wrapperKey: event.wrapperKey,
    domain,
    operationId,
    httpMethod: "POST",
    path: `/v1/${domain}/events/${toKebabCase(event.eventName)}/query`,
    notes: `${event.facetName}.${event.wrapperKey}`,
  };
}

export function sortObject<T>(value: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)));
}
