import { concat, id, zeroPadValue, ZeroAddress, ZeroHash } from "ethers";

export type Binding = { name: string; source: "path" | "query" | "body"; field: string };
export type EndpointDefinition = {
  facetName: string;
  wrapperKey: string;
  httpMethod: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  rateLimitKind?: "read" | "write";
  inputShape?: { kind: string; bindings: Binding[] };
};
export type AbiInput = { name?: string; type: string; components?: AbiInput[] };
export type AbiFunction = { type: "function"; name: string; inputs?: AbiInput[] };
export type LocalForkFixture = {
  actors?: Record<string, { address?: string }>;
  marketplace?: {
    agedListingFixture?: {
      voiceHash?: string;
      tokenId?: string;
      listing?: { readback?: { payload?: Record<string, unknown> } };
    };
  };
};

export type FixtureOverrides = Record<string, unknown>;
export type ProofArtifacts = {
  core?: unknown;
  remaining?: unknown;
  governance?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function nested(value: unknown, ...keys: string[]): unknown {
  let current = value;
  for (const key of keys) {
    current = Array.isArray(current) && /^\d+$/u.test(key)
      ? current[Number(key)]
      : asRecord(current)?.[key];
  }
  return current;
}

function evidence(value: unknown, domain: string): Array<Record<string, unknown>> {
  const entries = nested(value, "reports", domain, "evidence");
  return Array.isArray(entries) ? entries.map(asRecord).filter((entry): entry is Record<string, unknown> => entry !== null) : [];
}

function matchingEvidence(value: unknown, domain: string, field: string, expected: string): Record<string, unknown> | null {
  return evidence(value, domain).find((entry) => entry[field] === expected) ?? null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function addressFromTopic(value: unknown): string | null {
  const topic = stringValue(value);
  return topic && /^0x[0-9a-fA-F]{64}$/u.test(topic) ? `0x${topic.slice(-40)}` : null;
}

export function proofFixtureOverrides(methodKey: string, artifacts: ProofArtifacts): FixtureOverrides {
  const overrides: FixtureOverrides = {};
  if (methodKey.startsWith("ProposalFacet.")) {
    const governanceSubmit = evidence(artifacts.governance, "governance").find((entry) => entry.step === "submitProposal");
    const coreSubmit = matchingEvidence(artifacts.core, "governance", "route", "submit");
    const proposalId = stringValue(nested(governanceSubmit, "postState", "proposalId"))
      ?? stringValue(nested(coreSubmit, "postState", "payload", "result"));
    if (proposalId) overrides.proposalId = proposalId;
  }
  if (methodKey.startsWith("VoiceDatasetFacet.")) {
    const dataset = matchingEvidence(artifacts.core, "datasets", "route", "dataset");
    const asset = matchingEvidence(artifacts.core, "datasets", "route", "tokenA");
    const datasetId = stringValue(nested(dataset, "postState", "payload", "result"));
    const assetId = stringValue(nested(asset, "postState", "payload", "result"));
    if (datasetId) overrides.datasetId = datasetId;
    if (assetId) overrides.assetId = assetId;
  }
  if (methodKey.startsWith("VoiceLicenseFacet.")) {
    const license = matchingEvidence(
      artifacts.remaining,
      "licensing",
      "route",
      "POST /v1/licensing/licenses/create-license",
    );
    const eventLog = nested(license, "eventQuery", "payload", "0");
    const topics = nested(eventLog, "topics");
    if (Array.isArray(topics)) {
      const voiceHash = stringValue(topics[1]);
      const licensee = stringValue(nested(license, "postState", "license", "licensee"))
        ?? addressFromTopic(topics[2]);
      if (voiceHash) overrides.voiceHash = voiceHash;
      if (licensee) overrides.licensee = licensee;
    }
  }
  if (methodKey.startsWith("VoiceLicenseTemplateFacet.")) {
    const template = matchingEvidence(artifacts.core, "datasets", "route", "template");
    const templateHash = stringValue(nested(template, "postState", "templateHashHex"));
    if (templateHash) overrides.templateHash = templateHash;
  }
  if (methodKey === "WhisperBlockFacet.verifyVoiceAuthenticity") {
    const fingerprint = matchingEvidence(
      artifacts.remaining,
      "whisperblock/security",
      "route",
      "POST /v1/whisperblock/whisperblocks",
    );
    const eventLog = nested(fingerprint, "eventQuery", "payload", "0");
    const topics = nested(eventLog, "topics");
    const voiceHash = Array.isArray(topics) ? stringValue(topics[1]) : null;
    const fingerprintData = concat([
      zeroPadValue("0x1111", 32),
      zeroPadValue("0x2222", 32),
      zeroPadValue("0x3333", 32),
    ]);
    if (voiceHash) overrides.voiceHash = voiceHash;
    if (fingerprintData) overrides.fingerprintData = fingerprintData;
  }
  return overrides;
}

function actor(fixture: LocalForkFixture, name: string, fallback: string): string {
  return fixture.actors?.[name]?.address ?? fallback;
}

function scalarFixtureValue(input: AbiInput, fixture: LocalForkFixture, blockNumber: number, timestamp: number): unknown {
  const name = input.name ?? "";
  const founder = actor(fixture, "founder", ZeroAddress);
  const seller = actor(fixture, "seller", founder);
  const buyer = actor(fixture, "buyer", founder);
  const licensee = actor(fixture, "licensee", buyer);
  const transferee = actor(fixture, "transferee", buyer);
  const addressByName: Record<string, string> = {
    account: founder,
    approver: founder,
    beneficiary: founder,
    collaborator: seller,
    creator: seller,
    facetAddr: ZeroAddress,
    initContract: ZeroAddress,
    licensee,
    operator: founder,
    owner: seller,
    payee: seller,
    proposer: founder,
    recipient: transferee,
    signer: founder,
    spender: founder,
    target: founder,
    user: founder,
    voter: founder,
  };
  if (input.type === "address") {
    return addressByName[name] ?? founder;
  }
  if (input.type === "bool") {
    return false;
  }
  if (input.type === "string") {
    return name === "category" || name === "classificationName" ? "default" : "";
  }
  if (input.type === "bytes4") {
    return "0x00000000";
  }
  if (input.type === "bytes32") {
    if (name === "voiceHash" || name === "assetId") {
      return fixture.marketplace?.agedListingFixture?.voiceHash ?? ZeroHash;
    }
    if (name === "role") {
      return id("DEFAULT_ADMIN_ROLE");
    }
    return ZeroHash;
  }
  if (input.type.startsWith("bytes")) {
    return "0x";
  }
  if (input.type.startsWith("uint") || input.type.startsWith("int")) {
    if (name === "sharePercentage") {
      return "10000";
    }
    if (name === "tokenId") {
      return fixture.marketplace?.agedListingFixture?.tokenId ?? "0";
    }
    if (name === "blockNumber") {
      return String(blockNumber);
    }
    if (name === "timestamp" || name === "startTime" || name === "stakeTimestamp") {
      return String(timestamp);
    }
    const listing = fixture.marketplace?.agedListingFixture?.listing?.readback?.payload;
    if (name === "salePrice" || name === "amount") {
      return String(listing?.price ?? "0");
    }
    if (name === "limit" || name === "maxBeneficiaries") {
      return "1";
    }
    return "0";
  }
  return "0";
}

export function classifySafeReadGap(status: number, payload: unknown): "needs fixture" | "proof gap" {
  const responseText = JSON.stringify(payload);
  if (
    status === 404 ||
    status === 409 ||
    /(?:NotFound|NoScheduleFound|NotRegistered|ProposalExpired|ARRAY_RANGE_ERROR)/u.test(responseText)
  ) {
    return "needs fixture";
  }
  return "proof gap";
}

export function fixtureValue(
  input: AbiInput,
  fixture: LocalForkFixture,
  blockNumber: number,
  timestamp: number,
  overrides: FixtureOverrides = {},
): unknown {
  if (input.name && Object.hasOwn(overrides, input.name)) {
    return overrides[input.name];
  }
  const arrayMatch = input.type.match(/^(.*)\[([0-9]*)\]$/u);
  if (arrayMatch) {
    const length = arrayMatch[2] ? Number(arrayMatch[2]) : 1;
    return Array.from({ length }, () => fixtureValue({ ...input, type: arrayMatch[1] }, fixture, blockNumber, timestamp, overrides));
  }
  if (input.type === "tuple") {
    return Object.fromEntries(
      (input.components ?? []).map((component, index) => [
        component.name || String(index),
        fixtureValue(component, fixture, blockNumber, timestamp, overrides),
      ]),
    );
  }
  return scalarFixtureValue(input, fixture, blockNumber, timestamp);
}

function methodName(methodKey: string): string {
  return methodKey.slice(methodKey.indexOf(".") + 1).replace(/\(.+$/u, "");
}

export function selectAbiFunction(methodKey: string, endpoint: EndpointDefinition, abi: AbiFunction[]): AbiFunction | null {
  const candidates = abi.filter((entry) => entry.type === "function" && entry.name === methodName(methodKey));
  if (candidates.length <= 1) {
    return candidates[0] ?? null;
  }
  const bindingNames = endpoint.inputShape?.bindings.map((binding) => binding.name) ?? [];
  return candidates.find((candidate) =>
    (candidate.inputs ?? []).map((input) => input.name ?? "").join(",") === bindingNames.join(","),
  ) ?? candidates[0];
}

function appendQuery(search: URLSearchParams, field: string, value: unknown): void {
  if (Array.isArray(value)) {
    for (const entry of value) {
      search.append(field, typeof entry === "object" ? JSON.stringify(entry) : String(entry));
    }
    return;
  }
  search.set(field, typeof value === "object" ? JSON.stringify(value) : String(value));
}

export function buildReadRequest(endpoint: EndpointDefinition, inputs: AbiInput[], values: unknown[]): {
  route: string;
  body: Record<string, unknown> | undefined;
} {
  let route = endpoint.path;
  const body: Record<string, unknown> = {};
  const search = new URLSearchParams();
  const valuesByName = new Map(inputs.map((input, index) => [input.name ?? String(index), values[index]]));
  for (const binding of endpoint.inputShape?.bindings ?? []) {
    const value = valuesByName.get(binding.name);
    if (binding.source === "path") {
      route = route.replace(`:${binding.field}`, encodeURIComponent(String(value)));
    } else if (binding.source === "query") {
      appendQuery(search, binding.field, value);
    } else {
      body[binding.field] = value;
    }
  }
  const query = search.toString();
  return {
    route: query ? `${route}?${query}` : route,
    body: Object.keys(body).length > 0 ? body : undefined,
  };
}
