import { Interface, VoidSigner, Wallet, type Provider, type TransactionRequest } from "ethers";

import { AddressBook, LocalCache, ProviderRouter, facetRegistry, readConfigFromEnv } from "../../../client/src/index.js";
import type { ApiLayerConfig } from "../../../client/src/runtime/config.js";
import { decodeParamsFromWire, serializeResultToWire, validateWireParams } from "../../../client/src/runtime/abi-codec.js";
import { invokeRead, queryEvent } from "../../../client/src/runtime/invoke.js";
import type { AuthContext } from "./auth.js";
import {
  buildDebugTransaction,
  createAlchemyClient,
  decodeReceiptLogs,
  readActorStates,
  simulateTransactionWithAlchemy,
  traceCallWithAlchemy,
  traceTransactionWithAlchemy,
} from "./alchemy-diagnostics.js";
import { loadApiKeys } from "./auth.js";
import { submitSmartWalletCall } from "./cdp-smart-wallet.js";
import { RateLimiter } from "./rate-limit.js";
import type { ApiRequestOptions, EventInvocationRequest, HttpEventDefinition, HttpMethodDefinition, PrimitiveInvocationRequest, RouteResult } from "./route-types.js";
import { TxRequestStore } from "./tx-store.js";

export type ApiExecutionContext = {
  config: ApiLayerConfig;
  apiKeys: Record<string, AuthContext>;
  providerRouter: ProviderRouter;
  addressBook: AddressBook;
  cache: LocalCache;
  txStore: TxRequestStore;
  rateLimiter: RateLimiter;
  alchemy: ReturnType<typeof createAlchemyClient>;
  signerRunners: Map<string, Wallet>;
  signerQueues: Map<string, Promise<void>>;
  signerNonces: Map<string, number>;
};

class ExecutionDiagnosticError extends Error {
  constructor(message: string, readonly diagnostics: unknown) {
    super(message);
  }
}

type PreparedWriteInvocation = {
  provider: Provider;
  providerName: string;
  signer: Wallet;
  signerAddress: string;
  queueKey: string;
  responseTemplate: TransactionRequest;
};

function signerMap(): Record<string, string> {
  const raw = process.env.API_LAYER_SIGNER_MAP_JSON;
  if (!raw) {
    return {};
  }
  return JSON.parse(raw) as Record<string, string>;
}

async function signerRunnerFor(
  context: ApiExecutionContext,
  auth: AuthContext,
  provider: Provider,
  providerName: string,
): Promise<Wallet | undefined> {
  if (!auth.signerId) {
    return undefined;
  }
  const privateKey = signerMap()[auth.signerId];
  if (!privateKey) {
    throw new Error(`missing private key for signer ${auth.signerId}`);
  }
  const cacheKey = `${auth.signerId}:${providerName}`;
  const cached = context.signerRunners.get(cacheKey);
  if (cached) {
    return cached;
  }
  const signer = new Wallet(privateKey, provider);
  context.signerRunners.set(cacheKey, signer);
  return signer;
}

function signerQueueKey(auth: AuthContext, providerName: string): string {
  return `${auth.signerId ?? "anonymous"}:${providerName}`;
}

function isNonceExpiredError(error: unknown): boolean {
  const message = String((error as { message?: string })?.message ?? error).toLowerCase();
  return message.includes("nonce too low") || message.includes("nonce has already been used") || message.includes("nonce expired");
}

async function withSignerQueue<T>(context: ApiExecutionContext, key: string, work: () => Promise<T>): Promise<T> {
  const previous = context.signerQueues.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  context.signerQueues.set(key, current);
  await previous.catch(() => undefined);
  try {
    return await work();
  } finally {
    release();
    if (context.signerQueues.get(key) === current) {
      context.signerQueues.delete(key);
    }
  }
}

function formatCanonicalAbiType(type: string, components?: Array<{ type: string; components?: Array<{ type: string; components?: Array<unknown> }> }>): string {
  const arraySuffixMatch = type.match(/(\[[^\]]*\])+$/u);
  const arraySuffix = arraySuffixMatch?.[0] ?? "";
  if (!type.startsWith("tuple")) {
    return type;
  }
  const tupleComponents = (components ?? []).map((component) => formatCanonicalAbiType(component.type, component.components as Array<{ type: string; components?: Array<{ type: string; components?: Array<unknown> }> }> | undefined));
  return `(${tupleComponents.join(",")})${arraySuffix}`;
}

function canonicalMethodSignature(definition: HttpMethodDefinition): string {
  return `${definition.methodName}(${definition.inputs.map((input) => formatCanonicalAbiType(input.type, input.components as Array<{ type: string; components?: Array<{ type: string; components?: Array<unknown> }> }> | undefined)).join(",")})`;
}

function resolveContractMethod(contract: import("ethers").Contract, definition: HttpMethodDefinition) {
  try {
    return contract.getFunction(definition.signature);
  } catch (error) {
    const message = String((error as { message?: string })?.message ?? error);
    if (!message.includes("invalid function fragment")) {
      throw error;
    }
    return contract.getFunction(canonicalMethodSignature(definition));
  }
}

function parseGaslessAllowlist(): Set<string> {
  const raw = process.env.API_LAYER_GASLESS_ALLOWLIST ?? "DelegationFacet.delegate,DelegationFacet.delegateBySig,ProposalFacet.prCastVote";
  return new Set(raw.split(",").map((value) => value.trim()).filter(Boolean));
}

function spendCapFor(method: string): bigint {
  const raw = process.env.API_LAYER_GASLESS_SPEND_CAPS_JSON;
  if (!raw) {
    return 0n;
  }
  const parsed = JSON.parse(raw) as Record<string, string>;
  return BigInt(parsed[method] ?? "0");
}

function encodeSmartWalletCall(definition: HttpMethodDefinition, params: unknown[], diamondAddress: string): { to: string; data: string; value: string } {
  const iface = new Interface(facetRegistry[definition.facetName as keyof typeof facetRegistry].abi);
  return {
    to: diamondAddress,
    data: iface.encodeFunctionData(definition.signature, params),
    value: "0x0",
  };
}

function toJsonValue(value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, toJsonValue(entry)]));
  }
  return value;
}

function classifyRateLimit(definition: Pick<HttpMethodDefinition, "rateLimitKind">, api: ApiRequestOptions): "read" | "write" | "gasless" {
  if (api.gaslessMode !== "none") {
    return "gasless";
  }
  return definition.rateLimitKind === "read" ? "read" : "write";
}

function alchemySummary(context: ApiExecutionContext): Record<string, unknown> {
  return {
    enabled: context.config.alchemyDiagnosticsEnabled,
    simulationEnabled: context.config.alchemySimulationEnabled,
    simulationEnforced: context.config.alchemySimulationEnforced,
    endpointDetected: context.config.alchemyEndpointDetected,
    rpcUrl: context.config.alchemyRpcUrl,
    available: Boolean(context.alchemy),
  };
}

async function prepareWriteInvocationOnProvider(
  context: ApiExecutionContext,
  definition: HttpMethodDefinition,
  runtimeArgs: unknown[],
  auth: AuthContext,
  provider: Provider,
  providerName: string,
): Promise<PreparedWriteInvocation> {
  const signer = await signerRunnerFor(context, auth, provider, providerName);
  if (!signer) {
    throw new Error(`write method ${definition.key} requires signerFactory`);
  }
  const contract = new (await import("ethers")).Contract(
    context.addressBook.resolveFacetAddress(definition.facetName),
    facetRegistry[definition.facetName as keyof typeof facetRegistry].abi,
    signer,
  );
  const method = resolveContractMethod(contract, definition);
  const signerAddress = await signer.getAddress();
  const responseTemplate = await method.populateTransaction(...runtimeArgs);
  return {
    provider,
    providerName,
    signer,
    signerAddress,
    queueKey: signerQueueKey(auth, providerName),
    responseTemplate,
  };
}

async function prepareWriteInvocation(
  context: ApiExecutionContext,
  definition: HttpMethodDefinition,
  runtimeArgs: unknown[],
  auth: AuthContext,
): Promise<PreparedWriteInvocation> {
  return context.providerRouter.withProvider(
    "write",
    `${definition.key}.prepare`,
    (provider: Provider, providerName) => prepareWriteInvocationOnProvider(context, definition, runtimeArgs, auth, provider, providerName),
  );
}

async function buildFailureDiagnostics(
  context: ApiExecutionContext,
  definition: HttpMethodDefinition,
  prepared: PreparedWriteInvocation | null,
  error: unknown,
  walletAddress?: string,
): Promise<Record<string, unknown>> {
  const actorAddresses = [
    prepared?.signerAddress,
    walletAddress,
  ].filter((value): value is string => Boolean(value));
  const trace = context.config.alchemyDiagnosticsEnabled && prepared
    ? await traceCallWithAlchemy(
        context.alchemy,
        buildDebugTransaction(prepared.responseTemplate, prepared.signerAddress),
        context.config.alchemySimulationBlock,
      )
    : { status: "disabled" as const };
  const actors = prepared
    ? await readActorStates(prepared.provider, actorAddresses)
    : [];
  return {
    route: {
      httpMethod: definition.httpMethod,
      path: definition.path,
      operationId: definition.operationId,
      contractFunction: `${definition.facetName}.${definition.signature}`,
    },
    alchemy: alchemySummary(context),
    signer: prepared?.signerAddress ?? walletAddress ?? null,
    provider: prepared?.providerName ?? null,
    actors,
    trace,
    cause: String((error as { message?: string })?.message ?? error),
  };
}

async function staticCallPreview(
  context: ApiExecutionContext,
  definition: HttpMethodDefinition,
  runtimeArgs: unknown[],
  auth: AuthContext,
  walletAddress?: string,
): Promise<unknown> {
  if (definition.outputs.length === 0) {
    return null;
  }
  return context.providerRouter.withProvider("read", `${definition.key}.preview`, async (provider: Provider, providerName) => {
    const runner = await signerRunnerFor(context, auth, provider, providerName) ?? (walletAddress ? new VoidSigner(walletAddress, provider) : provider);
    const contract = new (await import("ethers")).Contract(
      context.addressBook.resolveFacetAddress(definition.facetName),
      facetRegistry[definition.facetName as keyof typeof facetRegistry].abi,
      runner,
    );
    const method = resolveContractMethod(contract, definition);
    return method.staticCall(...runtimeArgs);
  });
}

async function sendTransaction(context: ApiExecutionContext, definition: HttpMethodDefinition, runtimeArgs: unknown[], auth: AuthContext): Promise<{ hash?: string; response: unknown }> {
  if (!auth.signerId) {
    throw new Error(`write method ${definition.key} requires signerFactory`);
  }
  return context.providerRouter.withProvider("write", definition.key, async (provider: Provider, providerName) => {
    const prepared = await prepareWriteInvocationOnProvider(context, definition, runtimeArgs, auth, provider, providerName);
    return withSignerQueue(context, prepared.queueKey, async () => {
      const debugTransaction = buildDebugTransaction(prepared.responseTemplate, prepared.signerAddress);
      let simulationDiagnostics: unknown;

      if (context.config.alchemySimulationEnabled) {
        simulationDiagnostics = await simulateTransactionWithAlchemy(
          context.alchemy,
          debugTransaction,
          context.config.alchemySimulationBlock,
        );
        const simulationError =
          simulationDiagnostics &&
          typeof simulationDiagnostics === "object" &&
          "topLevelCall" in simulationDiagnostics &&
          simulationDiagnostics.topLevelCall &&
          typeof simulationDiagnostics.topLevelCall === "object" &&
          "error" in simulationDiagnostics.topLevelCall
            ? String((simulationDiagnostics.topLevelCall as { error?: string }).error ?? "")
            : "";
        if (context.config.alchemySimulationEnforced && simulationError) {
          throw new ExecutionDiagnosticError(
            simulationError,
            {
              route: {
                httpMethod: definition.httpMethod,
                path: definition.path,
                operationId: definition.operationId,
                contractFunction: `${definition.facetName}.${definition.signature}`,
              },
              alchemy: alchemySummary(context),
              simulation: simulationDiagnostics,
              signer: prepared.signerAddress,
              provider: prepared.providerName,
            },
          );
        }
      }

      const submit = async (forcedNonce?: number) => {
        const chainNonce = await provider.getTransactionCount(prepared.signerAddress, "pending");
        const nextNonce = forcedNonce ?? Math.max(chainNonce, context.signerNonces.get(prepared.queueKey) ?? 0);
        const response = await prepared.signer.sendTransaction({
          ...prepared.responseTemplate,
          nonce: nextNonce,
        });
        context.signerNonces.set(prepared.queueKey, nextNonce + 1);
        const hash = response && typeof response === "object" && "hash" in (response as Record<string, unknown>)
          ? String((response as Record<string, unknown>).hash)
          : undefined;
        return { hash, response };
      };

      try {
        return await submit();
      } catch (error) {
        if (!isNonceExpiredError(error)) {
          throw new ExecutionDiagnosticError(
            String((error as { message?: string })?.message ?? error),
            {
              ...(await buildFailureDiagnostics(context, definition, prepared, error)),
              ...(simulationDiagnostics === undefined ? {} : { simulation: simulationDiagnostics }),
            },
          );
        }
        const refreshedNonce = await provider.getTransactionCount(prepared.signerAddress, "pending");
        context.signerNonces.set(prepared.queueKey, refreshedNonce);
        try {
          return await submit(refreshedNonce);
        } catch (retryError) {
          throw new ExecutionDiagnosticError(
            String((retryError as { message?: string })?.message ?? retryError),
            {
              ...(await buildFailureDiagnostics(context, definition, prepared, retryError)),
              ...(simulationDiagnostics === undefined ? {} : { simulation: simulationDiagnostics }),
            },
          );
        }
      }
    });
  });
}

export function createApiExecutionContext(): ApiExecutionContext {
  const config = readConfigFromEnv();
  return {
    config,
    apiKeys: loadApiKeys(),
    providerRouter: new ProviderRouter({
      chainId: config.chainId,
      cbdpRpcUrl: config.cbdpRpcUrl,
      alchemyRpcUrl: config.alchemyRpcUrl,
      errorThreshold: config.providerErrorThreshold,
      errorWindowMs: config.providerErrorWindowMs,
      recoveryCooldownMs: config.providerRecoveryCooldownMs,
    }),
    addressBook: new AddressBook({
      diamond: config.diamondAddress,
    }),
    cache: new LocalCache(),
    txStore: new TxRequestStore(),
    rateLimiter: new RateLimiter(),
    signerRunners: new Map(),
    signerQueues: new Map(),
    signerNonces: new Map(),
    alchemy: createAlchemyClient(config),
  };
}

export async function enforceRateLimit(context: ApiExecutionContext, definition: Pick<HttpMethodDefinition, "rateLimitKind">, auth: AuthContext, api: ApiRequestOptions, walletAddress?: string): Promise<void> {
  await context.rateLimiter.enforce(classifyRateLimit(definition, api), auth.apiKey);
  if (walletAddress) {
    await context.rateLimiter.enforce(api.gaslessMode !== "none" ? "gasless" : "write", `${auth.apiKey}:${walletAddress}`);
  }
}

export async function executeHttpMethodDefinition(context: ApiExecutionContext, definition: HttpMethodDefinition, request: PrimitiveInvocationRequest): Promise<RouteResult> {
  validateWireParams(definition, request.wireParams);
  if (definition.liveRequired && request.api.executionSource !== "auto" && request.api.executionSource !== "live") {
    throw new Error(`${definition.key} requires live chain execution; cached or indexed execution is not allowed`);
  }
  if (request.api.executionSource !== "auto" && !definition.executionSources.includes(request.api.executionSource)) {
    throw new Error(`${definition.key} does not allow executionSource=${request.api.executionSource}`);
  }
  if (request.api.executionSource === "indexed") {
    throw new Error(`${definition.key} indexed execution is not implemented`);
  }
  if (request.api.gaslessMode !== "none" && !request.auth.allowGasless) {
    throw new Error("API key not permitted for gasless execution");
  }
  if (request.api.gaslessMode !== "none" && !definition.gaslessModes.includes(request.api.gaslessMode)) {
    throw new Error(`${definition.key} does not allow gaslessMode=${request.api.gaslessMode}`);
  }

  const runtimeArgs = decodeParamsFromWire(definition, request.wireParams);
  if (definition.category === "read") {
    const result = await invokeRead(
      {
        addressBook: context.addressBook,
        providerRouter: context.providerRouter,
        cache: context.cache,
        executionSource: request.api.executionSource,
      },
      definition.facetName as keyof typeof facetRegistry,
      definition.wrapperKey,
      runtimeArgs,
      definition.liveRequired,
      definition.cacheTtlSeconds,
    );
    return {
      statusCode: 200,
      body: serializeResultToWire(definition, result),
    };
  }

  if (request.api.gaslessMode === "none" && !request.auth.signerId) {
    throw new Error(`write method ${definition.key} requires signerFactory`);
  }

  let preview: unknown;
  try {
    preview = await staticCallPreview(context, definition, runtimeArgs, request.auth, request.walletAddress);
  } catch (error) {
    const prepared = request.auth.signerId
      ? await prepareWriteInvocation(context, definition, runtimeArgs, request.auth).catch(() => null)
      : null;
    throw new ExecutionDiagnosticError(
      String((error as { message?: string })?.message ?? error),
      await buildFailureDiagnostics(context, definition, prepared, error, request.walletAddress),
    );
  }

  if (request.api.gaslessMode === "cdpSmartWallet") {
    const allowlist = parseGaslessAllowlist();
    if (!allowlist.has(definition.key)) {
      throw new Error(`gasless smart-wallet action not allowlisted: ${definition.key}`);
    }
    const spendCap = spendCapFor(definition.key);
    if (spendCap !== 0n) {
      throw new Error(`non-zero spend caps are not yet supported for ${definition.key}`);
    }
    const requestId = await context.txStore.insert({
      requesterWallet: request.walletAddress,
      signerId: request.auth.signerId,
      method: definition.key,
      params: request.wireParams,
      status: "queued",
      relayMode: "cdpSmartWallet",
      apiKeyLabel: request.auth.label,
      spendCapDecision: "approved",
    });
    const relayResult = await submitSmartWalletCall(
      encodeSmartWalletCall(definition, runtimeArgs, context.addressBook.toJSON().diamond),
    );
    if (requestId) {
      await context.txStore.update(requestId, {
        status: "submitted",
        requestHash: relayResult.userOperationHash,
        responsePayload: toJsonValue(relayResult),
      });
    }
    return {
      statusCode: 202,
      body: {
        requestId,
        relay: toJsonValue(relayResult),
        result: definition.outputs.length > 0 ? serializeResultToWire(definition, preview) : null,
      },
    };
  }

  const requestId = await context.txStore.insert({
    requesterWallet: request.walletAddress,
    signerId: request.auth.signerId,
    method: definition.key,
    params: request.wireParams,
    status: request.api.gaslessMode === "signature" ? "relaying-signature" : "submitting",
    relayMode: request.api.gaslessMode === "signature" ? "signature" : "direct",
    apiKeyLabel: request.auth.label,
    spendCapDecision: "approved",
  });
  const tx = await sendTransaction(context, definition, runtimeArgs, request.auth);
  if (requestId) {
    await context.txStore.update(requestId, {
      status: "submitted",
      txHash: tx.hash,
      responsePayload: toJsonValue(tx.response),
    });
  }
  return {
    statusCode: 202,
    body: {
      requestId,
      txHash: tx.hash,
      result: definition.outputs.length > 0 ? serializeResultToWire(definition, preview) : null,
    },
  };
}

export async function executeHttpEventDefinition(context: ApiExecutionContext, definition: HttpEventDefinition, request: EventInvocationRequest): Promise<RouteResult> {
  const result = await queryEvent(
    {
      addressBook: context.addressBook,
      providerRouter: context.providerRouter,
      cache: context.cache,
    },
    definition.facetName as keyof typeof facetRegistry,
    definition.wrapperKey,
    request.fromBlock,
    request.toBlock,
  );
  return {
    statusCode: 200,
    body: toJsonValue(result),
  };
}

export async function getTransactionRequest(context: ApiExecutionContext, requestId: string): Promise<unknown> {
  return context.txStore.get(requestId);
}

export async function getTransactionStatus(context: ApiExecutionContext, txHash: string): Promise<unknown> {
  if (context.alchemy) {
    const receipt = await context.alchemy.core.getTransactionReceipt(txHash);
    return toJsonValue({
      source: "alchemy",
      receipt,
      diagnostics: {
        alchemy: alchemySummary(context),
        decodedLogs: receipt ? decodeReceiptLogs({ logs: receipt.logs }) : [],
        trace: context.config.alchemyDiagnosticsEnabled
          ? await traceTransactionWithAlchemy(context.alchemy, txHash, context.config.alchemyTraceTimeout)
          : { status: "disabled" },
      },
    });
  }
  const receipt = await context.providerRouter.withProvider("read", "tx.status", (provider: Provider) => provider.getTransactionReceipt(txHash));
  return toJsonValue({
    source: "rpc",
    receipt,
    diagnostics: {
      alchemy: alchemySummary(context),
      decodedLogs: receipt ? decodeReceiptLogs(receipt) : [],
      trace: { status: "disabled" },
    },
  });
}
