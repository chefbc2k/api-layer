import type { AuthContext } from "./auth.js";

export type AbiParameter = {
  name?: string;
  type: string;
  internalType?: string;
  components?: AbiParameter[];
  indexed?: boolean;
};

export type HttpMethodDefinition = {
  key: string;
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
  domain: string;
  resource: string;
  classification: "create" | "read" | "update" | "delete" | "action" | "admin" | "query";
  httpMethod: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  inputShape: {
    kind: "none" | "query" | "body" | "path+body";
    bindings: Array<{
      name: string;
      source: "path" | "query" | "body";
      field: string;
    }>;
  };
  outputShape: {
    kind: "void" | "scalar" | "tuple" | "array" | "object";
  };
  operationId: string;
  rateLimitKind: "read" | "write" | "gasless";
  supportsGasless: boolean;
  notes: string;
};

export type HttpEventDefinition = {
  key: string;
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
  domain: string;
  operationId: string;
  httpMethod: "POST";
  path: string;
  notes: string;
};

export type RequestSchemas = {
  path: import("zod").ZodTypeAny;
  query: import("zod").ZodTypeAny;
  body: import("zod").ZodTypeAny;
};

export type EventRequestSchema = {
  body: import("zod").ZodTypeAny;
};

export type ApiRequestOptions = {
  gaslessMode: "none" | "signature" | "cdpSmartWallet";
  executionSource: "auto" | "live" | "cache" | "indexed";
};

export type PrimitiveInvocationRequest = {
  auth: AuthContext;
  api: ApiRequestOptions;
  walletAddress?: string;
  wireParams: unknown[];
};

export type EventInvocationRequest = {
  auth: AuthContext;
  fromBlock?: bigint;
  toBlock?: bigint | "latest";
};

export type RouteResult = {
  statusCode: number;
  body: unknown;
};
