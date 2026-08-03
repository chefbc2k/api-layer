import { id, ZeroAddress, ZeroHash } from "ethers";

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

export function fixtureValue(input: AbiInput, fixture: LocalForkFixture, blockNumber: number, timestamp: number): unknown {
  const arrayMatch = input.type.match(/^(.*)\[([0-9]*)\]$/u);
  if (arrayMatch) {
    const length = arrayMatch[2] ? Number(arrayMatch[2]) : 1;
    return Array.from({ length }, () => fixtureValue({ ...input, type: arrayMatch[1] }, fixture, blockNumber, timestamp));
  }
  if (input.type === "tuple") {
    return Object.fromEntries(
      (input.components ?? []).map((component, index) => [
        component.name || String(index),
        fixtureValue(component, fixture, blockNumber, timestamp),
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
