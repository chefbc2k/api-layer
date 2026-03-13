import { createApiServer } from "../packages/api/src/app.js";
import { loadRepoEnv, readConfigFromEnv } from "../packages/client/src/runtime/config.js";
import { JsonRpcProvider, Wallet } from "ethers";
import fs from "node:fs";
import path from "node:path";

type ApiCallOptions = {
  apiKey?: string;
  body?: unknown;
};

type EndpointDefinition = {
  httpMethod: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  inputShape: {
    kind: "none" | "query" | "body" | "path+body";
    bindings: Array<{ name: string; source: "path" | "query" | "body"; field: string }>;
  };
};

type DomainResult = {
  routes: Array<string>;
  actors: Array<string>;
  result: "proven working" | "blocked by setup/state" | "semantically clarified but not fully proven" | "deeper issue remains";
  evidence: Record<string, unknown>;
};

async function apiCall(port: number, method: string, url: string, options: ApiCallOptions = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${url}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(options.apiKey === undefined ? { "x-api-key": "founder-key" } : options.apiKey ? { "x-api-key": options.apiKey } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const payload = await response.json().catch(() => null);
  return { status: response.status, payload };
}

function extractTxHash(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const value = (payload as Record<string, unknown>).txHash;
  return typeof value === "string" ? value : null;
}

async function waitForReceipt(provider: JsonRpcProvider, txHash: string, label: string) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const receipt = await provider.getTransactionReceipt(txHash);
    if (receipt) {
      return receipt;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`timeout waiting for ${label} receipt`);
}

async function retryRead<T extends { status: number }>(
  label: string,
  read: () => Promise<T>,
  condition: (resp: T) => boolean = (resp) => resp.status === 200,
  attempts = 15,
  delayMs = 2000,
): Promise<T> {
  let last: T | null = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    last = await read();
    if (condition(last)) {
      return last;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  if (!last) {
    throw new Error(`missing ${label} response`);
  }
  return last;
}

function buildPath(definition: EndpointDefinition, params: Record<string, string>): string {
  let pathValue = definition.path;
  for (const match of pathValue.match(/:([A-Za-z0-9_]+)/gu) ?? []) {
    const key = match.slice(1);
    const value = params[key];
    if (value !== undefined) {
      pathValue = pathValue.replace(match, value);
    }
  }
  if (definition.httpMethod !== "GET") {
    return pathValue;
  }
  const search = new URLSearchParams();
  for (const binding of definition.inputShape.bindings ?? []) {
    if (binding.source !== "query") {
      continue;
    }
    const value = params[binding.field];
    if (value !== undefined) {
      search.set(binding.field, value);
    }
  }
  const query = search.toString();
  return query ? `${pathValue}?${query}` : pathValue;
}

function endpointByKey(registry: Record<string, EndpointDefinition>, key: string): EndpointDefinition | null {
  return registry[key] ?? null;
}

async function main() {
  const repoEnv = loadRepoEnv();
  const config = readConfigFromEnv(repoEnv);
  const provider = new JsonRpcProvider(config.cbdpRpcUrl, config.chainId);
  const founderKey = repoEnv.PRIVATE_KEY ?? "";
  const founder = founderKey ? new Wallet(founderKey, provider) : null;
  const licensee = Wallet.createRandom().connect(provider);

  process.env.API_LAYER_KEYS_JSON = JSON.stringify({
    "founder-key": { label: "founder", signerId: "founder", roles: ["service"], allowGasless: false },
    "read-key": { label: "reader", roles: ["service"], allowGasless: false },
    "licensee-key": { label: "licensee", signerId: "licensee", roles: ["service"], allowGasless: false },
  });
  process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({
    founder: founderKey,
    licensee: licensee.privateKey,
  });

  const endpointRegistry = JSON.parse(
    fs.readFileSync(path.join("generated", "manifests", "http-endpoint-registry.json"), "utf8"),
  ).methods as Record<string, EndpointDefinition>;

  const server = createApiServer({ port: 0 }).listen();
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 8787;

  const results: Record<string, DomainResult> = {};
  const actors = {
    founder: founder?.address ?? "0x0000000000000000000000000000000000000000",
    licensee: licensee.address,
  };

  try {
    // Multisig read route
    {
      const domain: DomainResult = {
        routes: [],
        actors: ["read-key"],
        result: "deeper issue remains",
        evidence: {},
      };
      const isOperatorEndpoint = endpointByKey(endpointRegistry, "MultiSigFacet.isOperator");
      if (isOperatorEndpoint) {
        domain.routes.push(`${isOperatorEndpoint.httpMethod} ${isOperatorEndpoint.path}`);
      }
      const isOperatorResp = isOperatorEndpoint
        ? await apiCall(
          port,
          isOperatorEndpoint.httpMethod,
          buildPath(isOperatorEndpoint, { account: actors.founder }),
          { apiKey: "read-key" },
        )
        : { status: 0, payload: "missing isOperator endpoint" };
      domain.evidence.isOperator = isOperatorResp;
      domain.result = isOperatorResp.status === 200 ? "proven working" : "deeper issue remains";
      results.multisig = domain;
    }

    // Voice-assets read using captured voiceHash
    {
      const domain: DomainResult = {
        routes: [],
        actors: ["founder-key"],
        result: "deeper issue remains",
        evidence: {},
      };
      const createVoiceEndpoint = endpointByKey(endpointRegistry, "VoiceAssetFacet.registerVoiceAsset");
      if (createVoiceEndpoint) {
        domain.routes.push(`${createVoiceEndpoint.httpMethod} ${createVoiceEndpoint.path}`);
      }
      const voiceResp = createVoiceEndpoint
        ? await apiCall(port, createVoiceEndpoint.httpMethod, createVoiceEndpoint.path, {
        body: { ipfsHash: `QmLayer1Voice-${Date.now()}`, royaltyRate: "175" },
      })
        : { status: 0, payload: "missing registerVoiceAsset endpoint" };
      domain.evidence.createVoice = voiceResp;
      const voiceTxHash = extractTxHash(voiceResp.payload);
      if (voiceTxHash) {
        const receipt = await waitForReceipt(provider, voiceTxHash, "voice asset");
        domain.evidence.createVoiceReceipt = { status: receipt.status, blockNumber: receipt.blockNumber };
      }
      const voiceHash = (voiceResp.payload as Record<string, unknown>)?.result as string | undefined;
      const getVoiceEndpoint = endpointByKey(endpointRegistry, "VoiceAssetFacet.getVoiceAsset");
      if (getVoiceEndpoint) {
        domain.routes.push(`${getVoiceEndpoint.httpMethod} ${getVoiceEndpoint.path}`);
      }
      if (voiceHash && getVoiceEndpoint) {
        domain.evidence.voiceRead = await retryRead(
          "voice asset read",
          () => apiCall(
            port,
            getVoiceEndpoint.httpMethod,
            buildPath(getVoiceEndpoint, { voiceHash }),
            { apiKey: "read-key" },
          ),
          (resp) => resp.status === 200 && resp.payload !== null && typeof resp.payload === "object" && (resp.payload as Record<string, unknown>).result !== null,
        );
      }

      domain.result = voiceResp.status === 202 && (domain.evidence as Record<string, any>).voiceRead?.status === 200
        ? "proven working"
        : "deeper issue remains";
      results["voice-assets"] = domain;
    }
  } finally {
    server.close();
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
