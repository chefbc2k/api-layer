import {
  Alchemy,
  DebugTracerType,
  Network,
  type DebugCallTrace,
  type DebugTransaction,
} from "alchemy-sdk";
import { Interface, type Provider, type TransactionReceipt, type TransactionRequest, toBeHex } from "ethers";

import { facetRegistry } from "../../../client/src/index.js";
import type { ApiLayerConfig } from "../../../client/src/runtime/config.js";

export type AlchemyLogMatch = {
  address: string;
  topic0: string | null;
  eventName: string | null;
  signature: string | null;
  facetName: string | null;
  logIndex?: number;
  transactionHash?: string;
  args?: Record<string, unknown>;
};

export type AlchemySimulationReport = {
  status: "available" | "disabled" | "unavailable" | "failed";
  blockTag?: "latest" | "pending";
  callCount?: number;
  logCount?: number;
  topLevelCall?: {
    from: string;
    to: string;
    gasUsed: string;
    type: string;
    revertReason?: string;
    error?: string;
  };
  decodedLogs?: AlchemyLogMatch[];
  error?: string;
};

export type AlchemyTraceReport = {
  status: "available" | "disabled" | "unavailable" | "failed";
  txHash?: string;
  topLevelCall?: {
    from: string;
    to: string;
    gasUsed: string;
    type: string;
    revertReason?: string;
    error?: string;
  };
  callTree?: Array<{
    depth: number;
    type: string;
    from: string;
    to: string;
    gasUsed: string;
    revertReason?: string;
    error?: string;
  }>;
  error?: string;
};

export type AlchemyEventVerificationReport = {
  status: "available" | "disabled" | "unavailable" | "missing" | "mismatch" | "failed";
  expectedEvent: string;
  matchedCount?: number;
  decodedLogs?: AlchemyLogMatch[];
  mismatches?: string[];
  error?: string;
};

export type AlchemyActorState = {
  address: string;
  nonce: string;
  balance: string;
};

type LogLike = {
  address: string;
  topics: string[];
  data: string;
  logIndex?: number | null;
  transactionHash?: string | null;
};

type EventDecoder = {
  facetName: string;
  iface: Interface;
};

const eventDecoders = Object.entries(facetRegistry).map(([facetName, entry]) => ({
  facetName,
  iface: new Interface(entry.abi),
}));

function toHexQuantity(value: unknown): string | undefined {
  if (value == null) {
    return undefined;
  }
  if (typeof value === "string" && value.startsWith("0x")) {
    return value;
  }
  if (typeof value === "string" && ["latest", "pending", "safe", "finalized", "earliest"].includes(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    return toBeHex(BigInt(value));
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return toBeHex(value);
  }
  return undefined;
}

function toJsonValue(value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map((entry) => toJsonValue(entry));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, toJsonValue(entry)]),
    );
  }
  return value;
}

function describeTrace(trace: DebugCallTrace | undefined) {
  if (!trace) {
    return undefined;
  }
  return {
    from: trace.from,
    to: trace.to,
    gasUsed: trace.gasUsed,
    type: trace.type,
    revertReason: trace.revertReason,
    error: trace.error,
  };
}

function flattenTrace(trace: DebugCallTrace | undefined, depth = 0): AlchemyTraceReport["callTree"] {
  if (!trace) {
    return [];
  }
  const children = trace.calls ?? [];
  return [
    {
      depth,
      type: trace.type,
      from: trace.from,
      to: trace.to,
      gasUsed: trace.gasUsed,
      revertReason: trace.revertReason,
      error: trace.error,
    },
    ...children.flatMap((child) => flattenTrace(child, depth + 1) ?? []),
  ];
}

function normalizeNamedArgs(args: unknown): Record<string, unknown> {
  if (!args || typeof args !== "object") {
    return {};
  }
  return Object.fromEntries(
    Object.entries(args as Record<string, unknown>)
      .filter(([key]) => Number.isNaN(Number(key)))
      .map(([key, value]) => [key, toJsonValue(value)]),
  );
}

function decodeLog(log: LogLike, decoders: EventDecoder[] = eventDecoders): AlchemyLogMatch {
  for (const decoder of decoders) {
    try {
      const parsed = decoder.iface.parseLog({
        topics: log.topics,
        data: log.data,
      });
      return {
        address: log.address,
        topic0: log.topics[0] ?? null,
        eventName: parsed?.name ?? null,
        signature: parsed?.signature ?? null,
        facetName: decoder.facetName,
        logIndex: log.logIndex ?? undefined,
        transactionHash: log.transactionHash ?? undefined,
        args: normalizeNamedArgs(parsed?.args),
      };
    } catch {
      continue;
    }
  }
  return {
    address: log.address,
    topic0: log.topics[0] ?? null,
    eventName: null,
    signature: null,
    facetName: null,
    logIndex: log.logIndex ?? undefined,
    transactionHash: log.transactionHash ?? undefined,
  };
}

export function alchemyNetworkForChainId(chainId: number): Network {
  if (chainId === 8453) {
    return Network.BASE_MAINNET;
  }
  return Network.BASE_SEPOLIA;
}

export function createAlchemyClient(config: ApiLayerConfig): Alchemy | null {
  if (!config.alchemyApiKey) {
    return null;
  }
  return new Alchemy({
    apiKey: config.alchemyApiKey,
    network: alchemyNetworkForChainId(config.chainId),
  });
}

export function buildDebugTransaction(transaction: TransactionRequest, from: string): DebugTransaction {
  return {
    from,
    to: transaction.to ? String(transaction.to) : undefined,
    data: transaction.data ? String(transaction.data) : undefined,
    value: toHexQuantity(transaction.value),
    gas: toHexQuantity(transaction.gasLimit ?? transaction.gas),
    gasPrice: toHexQuantity(transaction.gasPrice ?? transaction.maxFeePerGas),
  };
}

export function decodeReceiptLogs(receipt: Pick<TransactionReceipt, "logs"> | { logs: LogLike[] }): AlchemyLogMatch[] {
  return receipt.logs.map((log) => decodeLog(log));
}

export async function simulateTransactionWithAlchemy(
  alchemy: Alchemy | null,
  transaction: DebugTransaction,
  blockTag: "latest" | "pending",
): Promise<AlchemySimulationReport> {
  if (!alchemy) {
    return {
      status: "unavailable",
      error: "Alchemy diagnostics unavailable",
    };
  }
  try {
    const simulation = await alchemy.transact.simulateExecution(transaction, blockTag);
    const topLevelCall = simulation.calls[0];
    return {
      status: "available",
      blockTag,
      callCount: simulation.calls.length,
      logCount: simulation.logs.length,
      topLevelCall: topLevelCall
        ? {
            from: topLevelCall.from,
            to: topLevelCall.to,
            gasUsed: topLevelCall.gasUsed,
            type: topLevelCall.type,
            revertReason: topLevelCall.error,
            error: topLevelCall.error,
          }
        : undefined,
      decodedLogs: simulation.logs.map((log) => decodeLog(log)),
    };
  } catch (error) {
    return {
      status: "failed",
      blockTag,
      error: String((error as { message?: string })?.message ?? error),
    };
  }
}

export async function traceTransactionWithAlchemy(
  alchemy: Alchemy | null,
  txHash: string,
  timeout = "5s",
): Promise<AlchemyTraceReport> {
  if (!alchemy) {
    return {
      status: "unavailable",
      txHash,
      error: "Alchemy diagnostics unavailable",
    };
  }
  try {
    const trace = await alchemy.debug.traceTransaction(
      txHash,
      { type: DebugTracerType.CALL_TRACER },
      timeout,
    );
    return {
      status: "available",
      txHash,
      topLevelCall: describeTrace(trace),
      callTree: flattenTrace(trace),
    };
  } catch (error) {
    return {
      status: "failed",
      txHash,
      error: String((error as { message?: string })?.message ?? error),
    };
  }
}

export async function traceCallWithAlchemy(
  alchemy: Alchemy | null,
  transaction: DebugTransaction,
  blockTag: "latest" | "pending",
): Promise<AlchemyTraceReport> {
  if (!alchemy) {
    return {
      status: "unavailable",
      error: "Alchemy diagnostics unavailable",
    };
  }
  try {
    const trace = await alchemy.debug.traceCall(
      transaction,
      blockTag,
      { type: DebugTracerType.CALL_TRACER },
    );
    return {
      status: "available",
      topLevelCall: describeTrace(trace),
      callTree: flattenTrace(trace),
    };
  } catch (error) {
    return {
      status: "failed",
      error: String((error as { message?: string })?.message ?? error),
    };
  }
}

export async function verifyExpectedEventWithAlchemy(
  alchemy: Alchemy | null,
  options: {
    address: string;
    facetName: string;
    eventName: string;
    fromBlock: string | number;
    toBlock?: string | number;
    indexedMatches?: Record<string, unknown>;
  },
): Promise<AlchemyEventVerificationReport> {
  if (!alchemy) {
    return {
      status: "unavailable",
      expectedEvent: `${options.facetName}.${options.eventName}`,
      error: "Alchemy diagnostics unavailable",
    };
  }
  const iface = new Interface(facetRegistry[options.facetName as keyof typeof facetRegistry].abi);
  try {
    const event = iface.getEvent(options.eventName);
    const logs = await alchemy.core.getLogs({
      address: options.address,
      fromBlock: toHexQuantity(options.fromBlock),
      toBlock: toHexQuantity(options.toBlock ?? options.fromBlock),
      topics: [event.topicHash],
    });
    const decodedLogs = logs.map((log) => decodeLog(log, [{ facetName: options.facetName, iface }]));
    const mismatches: string[] = [];
    for (const [key, expected] of Object.entries(options.indexedMatches ?? {})) {
      const expectedValue = String(toJsonValue(expected));
      const matched = decodedLogs.some((log) => String(log.args?.[key]) === expectedValue);
      if (!matched) {
        mismatches.push(`expected indexed argument ${key}=${expectedValue}`);
      }
    }
    if (decodedLogs.length === 0) {
      return {
        status: "missing",
        expectedEvent: `${options.facetName}.${options.eventName}`,
        matchedCount: 0,
        decodedLogs,
      };
    }
    if (mismatches.length > 0) {
      return {
        status: "mismatch",
        expectedEvent: `${options.facetName}.${options.eventName}`,
        matchedCount: decodedLogs.length,
        decodedLogs,
        mismatches,
      };
    }
    return {
      status: "available",
      expectedEvent: `${options.facetName}.${options.eventName}`,
      matchedCount: decodedLogs.length,
      decodedLogs,
    };
  } catch (error) {
    return {
      status: "failed",
      expectedEvent: `${options.facetName}.${options.eventName}`,
      error: String((error as { message?: string })?.message ?? error),
    };
  }
}

export async function readActorStates(provider: Provider, addresses: string[]): Promise<AlchemyActorState[]> {
  return Promise.all(
    addresses.map(async (address) => ({
      address,
      nonce: String(await provider.getTransactionCount(address, "pending")),
      balance: (await provider.getBalance(address)).toString(),
    })),
  );
}
