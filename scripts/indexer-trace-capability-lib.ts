export const BASE_SEPOLIA_CHAIN_ID = 84_532;
export const BASE_SEPOLIA_PUBLIC_RPC_URL = "https://sepolia.base.org";

type TraceRpcSelection = {
  rpcUrl: string;
  source: "explicit" | "configured" | "base-sepolia-public-fallback";
};

type TraceProvider = {
  getBlockNumber(): Promise<number>;
  getBlock(blockNumber: number, prefetchTxs: boolean): Promise<{
    transactions: Array<string | { hash: string }>;
  } | null>;
  getTransactionReceipt(txHash: string): Promise<{ status: number | bigint | null } | null>;
  send(method: string, params: unknown[]): Promise<unknown>;
};

function isLoopbackRpcUrl(rpcUrl: string): boolean {
  try {
    const hostname = new URL(rpcUrl).hostname.toLowerCase();
    return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
  } catch {
    return false;
  }
}

function envValue(env: NodeJS.ProcessEnv, key: string): string | null {
  const value = env[key]?.trim();
  return value ? value : null;
}

export function selectTraceRpcUrl(env: NodeJS.ProcessEnv): TraceRpcSelection {
  const explicit = envValue(env, "API_LAYER_INDEXER_TRACE_RPC_URL");
  if (explicit) {
    return { rpcUrl: explicit, source: "explicit" };
  }

  for (const key of ["ALCHEMY_RPC_URL", "RPC_URL", "CBDP_RPC_URL"]) {
    const configured = envValue(env, key);
    if (configured && !isLoopbackRpcUrl(configured)) {
      return { rpcUrl: configured, source: "configured" };
    }
  }

  const configuredChainId = Number(envValue(env, "CHAIN_ID") ?? BASE_SEPOLIA_CHAIN_ID);
  const network = (envValue(env, "NETWORK") ?? "base-sepolia").toLowerCase();
  if (configuredChainId === BASE_SEPOLIA_CHAIN_ID || network === "base-sepolia") {
    return {
      rpcUrl: BASE_SEPOLIA_PUBLIC_RPC_URL,
      source: "base-sepolia-public-fallback",
    };
  }

  throw new Error(
    "no non-loopback trace RPC is configured; set API_LAYER_INDEXER_TRACE_RPC_URL for the production indexer network",
  );
}

export function redactRpcEndpoint(rpcUrl: string): string {
  const parsed = new URL(rpcUrl);
  return `${parsed.protocol}//${parsed.host}`;
}

export async function findRecentSuccessfulTransaction(
  provider: TraceProvider,
  blockScanLimit = 50,
): Promise<{ txHash: string; blockNumber: number }> {
  let blockNumber = await provider.getBlockNumber();
  for (let offset = 0; offset < blockScanLimit && blockNumber >= 0; offset += 1, blockNumber -= 1) {
    const block = await provider.getBlock(blockNumber, true);
    for (const transaction of block?.transactions ?? []) {
      const txHash = typeof transaction === "string" ? transaction : transaction.hash;
      const receipt = await provider.getTransactionReceipt(txHash);
      if (Number(receipt?.status) === 1) {
        return { txHash, blockNumber };
      }
    }
  }
  throw new Error(`no successful transaction found in the latest ${blockScanLimit} blocks`);
}

export async function probeCallTracer(
  provider: TraceProvider,
  txHash: string,
): Promise<{ traceKind: "object" | "array" }> {
  const trace = await provider.send("debug_traceTransaction", [txHash, { tracer: "callTracer" }]);
  if (!trace || typeof trace !== "object") {
    throw new Error(`callTracer returned an invalid ${typeof trace} result`);
  }
  return { traceKind: Array.isArray(trace) ? "array" : "object" };
}
