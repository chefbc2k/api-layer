import { createApiServer } from "../packages/api/src/app.js";
import { loadRepoEnv, readConfigFromEnv } from "../packages/client/src/runtime/config.js";
import { facetRegistry } from "../packages/client/src/generated/index.js";
import { Contract, JsonRpcProvider, Wallet } from "ethers";

import { ensureActiveLicenseTemplate } from "./license-template-helper.ts";

type ApiCallOptions = {
  apiKey?: string;
  body?: unknown;
};

type ApiResponse = {
  status: number;
  payload: unknown;
};

async function apiCall(port: number, method: string, path: string, options: ApiCallOptions = {}): Promise<ApiResponse> {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
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

function normalize(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, normalize(entry)]));
  }
  return value;
}

function extractTxHash(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const value = (payload as Record<string, unknown>).txHash;
  return typeof value === "string" ? value : null;
}

function listingToObject(value: unknown): Record<string, unknown> {
  const tuple = value as ArrayLike<unknown>;
  return {
    tokenId: normalize(tuple[0]),
    seller: normalize(tuple[1]),
    price: normalize(tuple[2]),
    createdAt: normalize(tuple[3]),
    createdBlock: normalize(tuple[4]),
    lastUpdateBlock: normalize(tuple[5]),
    expiresAt: normalize(tuple[6]),
    isActive: normalize(tuple[7]),
  };
}

async function waitForReceipt(provider: JsonRpcProvider, txHash: string, label: string) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const receipt = await provider.getTransactionReceipt(txHash);
    if (receipt) {
      return receipt;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`timed out waiting for receipt: ${label} ${txHash}`);
}

async function waitFor<T>(read: () => Promise<T>, accept: (value: T) => boolean, label: string): Promise<T> {
  let lastValue: T | undefined;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const value = await read();
    lastValue = value;
    if (accept(value)) {
      return value;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`timed out waiting for ${label}: ${JSON.stringify(normalize(lastValue))}`);
}

async function main() {
  const repoEnv = loadRepoEnv();
  const config = readConfigFromEnv(repoEnv);
  const provider = new JsonRpcProvider(config.cbdpRpcUrl, config.chainId);
  const founderKey = repoEnv.PRIVATE_KEY;
  if (!founderKey) {
    throw new Error("PRIVATE_KEY is required");
  }
  const founder = new Wallet(founderKey, provider);
  const licensingOwnerKey = repoEnv.ORACLE_SIGNER_PRIVATE_KEY_1 ?? repoEnv.ORACLE_WALLET_PRIVATE_KEY ?? founderKey;
  const licensingOwner = new Wallet(licensingOwnerKey, provider);

  process.env.API_LAYER_KEYS_JSON = JSON.stringify({
    "founder-key": { label: "founder", signerId: "founder", roles: ["service"], allowGasless: false },
    "read-key": { label: "reader", roles: ["service"], allowGasless: false },
    "licensing-owner-key": { label: "licensing-owner", signerId: "licensingOwner", roles: ["service"], allowGasless: false },
  });
  process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({
    founder: founder.privateKey,
    licensingOwner: licensingOwner.privateKey,
  });

  const server = createApiServer({ port: 0 }).listen();
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 8787;

  const diamond = config.diamondAddress;
  const voiceAssetFacet = new Contract(diamond, facetRegistry.VoiceAssetFacet.abi, provider);
  const datasetFacet = new Contract(diamond, facetRegistry.VoiceDatasetFacet.abi, provider);
  const marketplaceFacet = new Contract(diamond, facetRegistry.MarketplaceFacet.abi, provider);

  try {
    const activeTemplate = await ensureActiveLicenseTemplate({
      port,
      provider,
      apiCall,
      creatorAddress: licensingOwner.address,
      label: "Dataset Readback Template",
      readApiKey: "read-key",
      writeApiKey: "licensing-owner-key",
    });

    const voiceHashes: string[] = [];
    const assetIds: string[] = [];
    for (const suffix of ["A", "B"] as const) {
      const createVoice = await apiCall(port, "POST", "/v1/voice-assets", {
        body: {
          ipfsHash: `QmDatasetReadback-${Date.now()}-${suffix}`,
          royaltyRate: "175",
        },
      });
      if (createVoice.status !== 202) {
        throw new Error(`voice asset create failed: ${JSON.stringify(createVoice.payload)}`);
      }
      const txHash = extractTxHash(createVoice.payload);
      if (!txHash) {
        throw new Error(`voice asset tx hash missing: ${JSON.stringify(createVoice.payload)}`);
      }
      await waitForReceipt(provider, txHash, `create voice ${suffix}`);
      const voiceHash = String((createVoice.payload as Record<string, unknown>).result);
      voiceHashes.push(voiceHash);
      const tokenId = await waitFor(
        async () => voiceAssetFacet.getTokenId(voiceHash),
        (value) => BigInt(value as bigint | string | number) > 0n,
        `voice token id ${suffix}`,
      );
      assetIds.push(String(tokenId));
    }

    const approvalRead = await apiCall(
      port,
      "GET",
      `/v1/voice-assets/queries/is-approved-for-all?owner=${encodeURIComponent(founder.address)}&operator=${encodeURIComponent(diamond)}`,
      { apiKey: "read-key" },
    );
    if (approvalRead.status !== 200 || approvalRead.payload !== true) {
      const approvalWrite = await apiCall(port, "PATCH", "/v1/voice-assets/commands/set-approval-for-all", {
        body: { operator: diamond, approved: true },
      });
      if (approvalWrite.status !== 202) {
        throw new Error(`setApprovalForAll failed: ${JSON.stringify(approvalWrite.payload)}`);
      }
      const approvalTxHash = extractTxHash(approvalWrite.payload);
      if (!approvalTxHash) {
        throw new Error(`approval tx hash missing: ${JSON.stringify(approvalWrite.payload)}`);
      }
      await waitForReceipt(provider, approvalTxHash, "set approval for all");
    }

    const createDataset = await apiCall(port, "POST", "/v1/datasets/datasets", {
      body: {
        title: `Dataset Listing Readback ${Date.now()}`,
        assetIds,
        licenseTemplateId: activeTemplate.templateIdDecimal,
        metadataURI: `ipfs://dataset-listing-readback-${Date.now()}`,
        royaltyBps: "500",
      },
    });
    if (createDataset.status !== 202) {
      throw new Error(`dataset create failed: ${JSON.stringify(createDataset.payload)}`);
    }
    const createDatasetTxHash = extractTxHash(createDataset.payload);
    if (!createDatasetTxHash) {
      throw new Error(`dataset create tx hash missing: ${JSON.stringify(createDataset.payload)}`);
    }
    await waitForReceipt(provider, createDatasetTxHash, "create dataset");
    const datasetId = String((createDataset.payload as Record<string, unknown>).result);

    await waitFor(
      async () => {
        try {
          return await datasetFacet.getDataset(datasetId);
        } catch {
          return null;
        }
      },
      (value) => Boolean(value) && String((value as ArrayLike<unknown>)[0]) === datasetId,
      "dataset on-chain read",
    );

    const listDataset = await apiCall(port, "POST", "/v1/marketplace/commands/list-asset", {
      body: {
        tokenId: datasetId,
        price: "1000",
        duration: "0",
      },
    });
    if (listDataset.status !== 202) {
      throw new Error(`dataset listing failed: ${JSON.stringify(listDataset.payload)}`);
    }
    const listTxHash = extractTxHash(listDataset.payload);
    if (!listTxHash) {
      throw new Error(`dataset listing tx hash missing: ${JSON.stringify(listDataset.payload)}`);
    }
    const listReceipt = await waitForReceipt(provider, listTxHash, "list dataset");

    const directListingTuple = await waitFor(
      async () => marketplaceFacet.getListing(datasetId),
      (value) => (value as ArrayLike<unknown>)[7] === true,
      "direct contract listing",
    );
    const directListing = listingToObject(directListingTuple);

    const apiListingResponse = await waitFor(
      async () => apiCall(
        port,
        "GET",
        `/v1/marketplace/queries/get-listing?tokenId=${encodeURIComponent(datasetId)}`,
        { apiKey: "read-key" },
      ),
      (response) => response.status === 200 && JSON.stringify(response.payload) === JSON.stringify(directListing),
      "API listing readback",
    );

    const result = {
      env: {
        chainId: config.chainId,
        diamond,
      },
      templateHashHex: activeTemplate.templateHashHex,
      templateId: activeTemplate.templateIdDecimal,
      assetIds,
      datasetId,
      listTxHash,
      listReceipt: {
        status: listReceipt.status,
        blockNumber: listReceipt.blockNumber,
      },
      directListing,
      apiListing: apiListingResponse.payload,
      matchesDirect: JSON.stringify(apiListingResponse.payload) === JSON.stringify(directListing),
    };

    console.log(JSON.stringify(normalize(result), null, 2));
  } finally {
    server.close();
    await provider.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
