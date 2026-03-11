import abiRegistry from "../../../../generated/manifests/abi-method-registry.json";

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

type RegistryShape = {
  methods: Record<string, AbiMethodDefinition>;
  events: Record<string, AbiEventDefinition>;
};

const typedRegistry = abiRegistry as unknown as RegistryShape;

export function getAbiMethodDefinition(method: string): AbiMethodDefinition | null {
  return typedRegistry.methods[method] ?? null;
}

export function getAbiEventDefinition(eventKey: string): AbiEventDefinition | null {
  return typedRegistry.events[eventKey] ?? null;
}

export function getAllAbiMethodDefinitions(): Record<string, AbiMethodDefinition> {
  return typedRegistry.methods;
}

export function getAllAbiEventDefinitions(): Record<string, AbiEventDefinition> {
  return typedRegistry.events;
}
