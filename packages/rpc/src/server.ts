import { Wallet, type Provider } from "ethers";
import express, { type Request, type Response } from "express";
import { Alchemy, Network } from "alchemy-sdk";

import { createUspeaksClient, facetRegistry, getMethodMetadata, readConfigFromEnv, type SignerFactory } from "../../client/src/index.js";
import { authenticate, loadApiKeys, type AuthContext } from "./auth.js";
import { RateLimiter, type RateLimitKind } from "./rate-limit.js";
import type { JsonRpcError, JsonRpcRequest, JsonRpcSuccess } from "./types.js";

type RpcServerOptions = {
  port?: number;
};

type RpcServer = {
  app: express.Express;
  listen: () => ReturnType<express.Express["listen"]>;
};

type GaslessMode = "none" | "signature" | "cdpSmartWallet";
type ExecutionSource = "auto" | "live" | "cache" | "indexed";

const signerMap = (() => {
  const raw = process.env.API_LAYER_SIGNER_MAP_JSON;
  if (!raw) {
    return {} as Record<string, string>;
  }
  return JSON.parse(raw) as Record<string, string>;
})();

const alchemy = process.env.ALCHEMY_API_KEY
  ? new Alchemy({
      apiKey: process.env.ALCHEMY_API_KEY,
      network: (process.env.API_LAYER_CHAIN_ID ?? process.env.CHAIN_ID ?? "84532") === "8453" ? Network.BASE_MAINNET : Network.BASE_SEPOLIA,
    })
  : null;

function signerFactoryFor(auth: AuthContext): SignerFactory | undefined {
  if (!auth.signerId) {
    return undefined;
  }
  const privateKey = signerMap[auth.signerId];
  if (!privateKey) {
    throw new Error(`missing private key for signer ${auth.signerId}`);
  }
  return async (provider: Provider) => new Wallet(privateKey, provider);
}

function classifyRequest(method: string, gaslessMode: GaslessMode): RateLimitKind {
  if (gaslessMode !== "none") {
    return "gasless";
  }
  return getMethodMetadata(method)?.category === "write" ? "write" : "read";
}

function splitOptions(params: unknown[] | undefined): { args: unknown[]; gaslessMode: GaslessMode; executionSource: ExecutionSource } {
  const values = [...(params ?? [])];
  const maybeOptions = values.at(-1);
  if (maybeOptions && typeof maybeOptions === "object" && !Array.isArray(maybeOptions) && "__api" in maybeOptions) {
    values.pop();
    const apiOptions = (maybeOptions as { __api?: { gaslessMode?: GaslessMode; executionSource?: ExecutionSource } }).__api;
    const gaslessMode = (apiOptions?.gaslessMode ?? "none") as GaslessMode;
    const executionSource = (apiOptions?.executionSource ?? "auto") as ExecutionSource;
    return { args: values, gaslessMode, executionSource };
  }
  return { args: values, gaslessMode: "none", executionSource: "auto" };
}

async function dispatch(method: string, params: unknown[] | undefined, auth: AuthContext): Promise<unknown> {
  const config = readConfigFromEnv();
  const { args, gaslessMode, executionSource } = splitOptions(params);
  const signerFactory = signerFactoryFor(auth);
  const client = createUspeaksClient({
    providerRouterOptions: {
      chainId: config.chainId,
      cbdpRpcUrl: config.cbdpRpcUrl,
      alchemyRpcUrl: config.alchemyRpcUrl,
      errorThreshold: config.providerErrorThreshold,
      errorWindowMs: config.providerErrorWindowMs,
      recoveryCooldownMs: config.providerRecoveryCooldownMs,
    },
    addresses: {
      diamond: config.diamondAddress,
    },
    signerFactory,
  });

  if (method === "system.health") {
    return {
      ok: true,
      chainId: config.chainId,
      gaslessEnabled: config.enableGasless,
    };
  }
  if (method === "system.providerStatus") {
    return client.providerRouter.getStatus();
  }
  if (method === "tx.status") {
    const [txHash] = args as [string];
    if (!txHash) {
      throw new Error("tx.status requires tx hash");
    }
    if (alchemy) {
      const receipt = await alchemy.core.getTransactionReceipt(txHash);
      return { source: "alchemy", receipt };
    }
    const receipt = await client.providerRouter.withProvider("read", "tx.status", (provider: Provider) => provider.getTransactionReceipt(txHash));
    return { source: "rpc", receipt };
  }
  if (method === "events.query") {
    const [query] = args as [
      {
        facetName: keyof typeof client.facets;
        eventName: string;
        fromBlock?: string;
        toBlock?: string | "latest";
      },
    ];
    const eventGroup = client.facets[query.facetName].events as Record<string, { query: (fromBlock?: bigint, toBlock?: bigint | "latest") => Promise<unknown> }>;
    return eventGroup[query.eventName].query(
      query.fromBlock ? BigInt(query.fromBlock) : undefined,
      query.toBlock === "latest" ? "latest" : query.toBlock ? BigInt(query.toBlock) : undefined,
    );
  }

  const [facetName, functionName] = method.split(".");
  if (!facetName || !functionName) {
    throw new Error(`unsupported method ${method}`);
  }

  const methodMetadata = getMethodMetadata(method);
  if (methodMetadata?.liveRequired && executionSource !== "auto" && executionSource !== "live") {
    throw new Error(`${method} requires live chain execution; cached or indexed execution is not allowed`);
  }
  if (executionSource === "indexed") {
    throw new Error(`${method} indexed execution is not implemented`);
  }

  if (gaslessMode !== "none" && !auth.allowGasless) {
    throw new Error("API key not permitted for gasless execution");
  }
  if (gaslessMode === "cdpSmartWallet") {
    const allowlist = new Set(
      (process.env.API_LAYER_GASLESS_ALLOWLIST ?? "DelegationFacet.delegateBySig")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    );
    if (!allowlist.has(method)) {
      throw new Error(`gasless smart-wallet action not allowlisted: ${method}`);
    }
    return {
      mode: gaslessMode,
      method,
      accepted: true,
      status: "queued",
      relay: "cdp-smart-wallet",
      note: "Provide CDP credentials and paymaster configuration to enable live relay execution.",
    };
  }

  const facet = client.facets[facetName as keyof typeof client.facets];
  if (!facet) {
    throw new Error(`unknown facet ${facetName}`);
  }
  if (functionName in facet.read) {
    return (facet.read as Record<string, (...values: unknown[]) => Promise<unknown>>)[functionName](...args);
  }
  if (functionName in facet.write) {
    return (facet.write as Record<string, (...values: unknown[]) => Promise<unknown>>)[functionName](...args);
  }
  throw new Error(`unknown function ${method}`);
}

function jsonRpcError(id: string | number | null, message: string, code = -32000): JsonRpcError {
  return {
    id,
    jsonrpc: "2.0",
    error: {
      code,
      message,
    },
  };
}

export function createRpcServer(options: RpcServerOptions = {}): RpcServer {
  const config = readConfigFromEnv();
  const apiKeys = loadApiKeys();
  const limiter = new RateLimiter();
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.post("/", async (request: Request, response: Response) => {
    const body = request.body as JsonRpcRequest;
    const requestId = body.id ?? null;

    try {
      const auth = authenticate(apiKeys, request.header("x-api-key") ?? undefined);
      const { gaslessMode } = splitOptions(body.params);
      await limiter.enforce(classifyRequest(body.method, gaslessMode), auth.apiKey);
      const walletAddress = request.header("x-wallet-address");
      if (walletAddress) {
        await limiter.enforce(gaslessMode !== "none" ? "gasless" : "write", `${auth.apiKey}:${walletAddress}`);
      }

      const result = await dispatch(body.method, body.params, auth);
      const payload: JsonRpcSuccess = {
        id: requestId,
        jsonrpc: "2.0",
        result,
      };
      response.json(payload);
    } catch (error) {
      response.status(200).json(jsonRpcError(requestId, String((error as { message?: string })?.message ?? error)));
    }
  });

  return {
    app,
    listen() {
      const port = options.port ?? Number(process.env.API_LAYER_RPC_PORT ?? 8787);
      return app.listen(port, () => {
        console.log(`USpeaks API RPC listening on ${port} for chain ${config.chainId}`);
      });
    },
  };
}
