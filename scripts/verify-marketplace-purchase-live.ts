import fs from "node:fs";
import { once } from "node:events";

import { Contract, JsonRpcProvider, Wallet, ZeroAddress, ethers } from "ethers";

import { createApiServer, type ApiServer } from "../packages/api/src/app.js";
import { loadRepoEnv } from "../packages/client/src/runtime/config.js";
import { facetRegistry } from "../packages/client/src/generated/index.js";

import { resolveRuntimeConfig } from "./alchemy-debug-lib.js";

type ApiResponse = {
  status: number;
  payload: unknown;
};

type FixtureReport = {
  marketplace?: {
    agedListingFixture?: {
      tokenId?: string | null;
      voiceHash?: string | null;
      activeListing?: boolean;
      listing?: unknown;
    };
  };
};

function getOutputPath() {
  const index = process.argv.indexOf("--output");
  if (index >= 0) {
    return process.argv[index + 1] ?? null;
  }
  return null;
}

async function apiCall(
  port: number,
  method: string,
  path: string,
  options: {
    apiKey?: string;
    walletAddress?: string;
    body?: unknown;
  } = {},
): Promise<ApiResponse> {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(options.apiKey ? { "x-api-key": options.apiKey } : {}),
      ...(options.walletAddress ? { "x-wallet-address": options.walletAddress } : {}),
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
  const record = payload as Record<string, unknown>;
  const direct = record.txHash;
  if (typeof direct === "string" && direct.startsWith("0x")) {
    return direct;
  }
  const purchase = record.purchase;
  if (purchase && typeof purchase === "object") {
    const txHash = (purchase as Record<string, unknown>).txHash;
    return typeof txHash === "string" && txHash.startsWith("0x") ? txHash : null;
  }
  return null;
}

async function waitForReceipt(provider: JsonRpcProvider, txHash: string, label: string) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const receipt = await provider.getTransactionReceipt(txHash);
    if (receipt) {
      if (Number(receipt.status) !== 1) {
        throw new Error(`${label} reverted: ${JSON.stringify({ txHash, status: receipt.status, blockNumber: receipt.blockNumber })}`);
      }
      return receipt;
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`timed out waiting for ${label}: ${txHash}`);
}

async function retryRead<T>(read: () => Promise<T>, ready: (value: T) => boolean, label: string, attempts = 20, delayMs = 1_500): Promise<T> {
  let lastValue: T | undefined;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const value = await read();
    lastValue = value;
    if (ready(value)) {
      return value;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error(`timed out waiting for ${label}: ${JSON.stringify(normalize(lastValue))}`);
}

async function ensureNativeBalance(provider: JsonRpcProvider, fundingWallet: Wallet, recipient: string, minimum: bigint) {
  const balance = await provider.getBalance(recipient);
  if (balance >= minimum || fundingWallet.address.toLowerCase() === recipient.toLowerCase()) {
    return balance;
  }
  await (await fundingWallet.sendTransaction({ to: recipient, value: minimum - balance })).wait();
  return provider.getBalance(recipient);
}

async function startServer(): Promise<{ server: ReturnType<ApiServer["listen"]>; port: number }> {
  const server = createApiServer({ port: 0 }).listen();
  if (!server.listening) {
    await once(server, "listening");
  }
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("unable to resolve API server port");
  }
  return { server, port: address.port };
}

async function createFallbackListing(
  port: number,
  provider: JsonRpcProvider,
  founderAddress: string,
  voiceAsset: Contract,
) {
  const createVoiceResponse = await apiCall(port, "POST", "/v1/voice-assets", {
    apiKey: "founder-key",
    walletAddress: founderAddress,
    body: {
      ipfsHash: `QmMarketplacePurchaseFallback${Date.now()}`,
      royaltyRate: "125",
    },
  });
  if (createVoiceResponse.status !== 202) {
    throw new Error(`fallback voice create failed: ${JSON.stringify(createVoiceResponse.payload)}`);
  }
  const createVoiceTxHash = extractTxHash(createVoiceResponse.payload);
  if (!createVoiceTxHash) {
    throw new Error(`fallback voice create missing tx hash: ${JSON.stringify(createVoiceResponse.payload)}`);
  }
  await waitForReceipt(provider, createVoiceTxHash, "fallback voice create");
  const voiceHash = String((createVoiceResponse.payload as Record<string, unknown>).result);
  const tokenId = await retryRead(
    async () => {
      const value = await voiceAsset.getTokenId(voiceHash);
      return BigInt(value).toString();
    },
    (value) => BigInt(value) > 0n,
    "fallback token id",
  );
  const listResponse = await apiCall(port, "POST", "/v1/marketplace/commands/list-asset", {
    apiKey: "founder-key",
    walletAddress: founderAddress,
    body: {
      tokenId,
      price: "1000",
      duration: String(30n * 24n * 60n * 60n),
    },
  });
  if (listResponse.status !== 202) {
    throw new Error(`fallback listing failed: ${JSON.stringify(listResponse.payload)}`);
  }
  const listTxHash = extractTxHash(listResponse.payload);
  if (!listTxHash) {
    throw new Error(`fallback listing missing tx hash: ${JSON.stringify(listResponse.payload)}`);
  }
  await waitForReceipt(provider, listTxHash, "fallback listing");
  const listingRead = await retryRead(
    () => apiCall(
      port,
      "GET",
      `/v1/marketplace/queries/get-listing?tokenId=${encodeURIComponent(tokenId)}`,
      { apiKey: "read-key" },
    ),
    (value) => value.status === 200 && (value.payload as Record<string, unknown>)?.isActive === true,
    "fallback listing read",
  );
  return {
    source: "fresh-founder-listing",
    tokenId,
    voiceHash,
    sellerAddress: founderAddress,
    listing: listingRead.payload,
  };
}

async function main() {
  const repoEnv = loadRepoEnv();
  const { config } = await resolveRuntimeConfig(repoEnv);
  process.env.RPC_URL = config.cbdpRpcUrl;
  process.env.ALCHEMY_RPC_URL = config.alchemyRpcUrl;

  const fixture = JSON.parse(fs.readFileSync(".runtime/base-sepolia-operator-fixtures.json", "utf8")) as FixtureReport;
  const agedListing = fixture.marketplace?.agedListingFixture;

  if (!repoEnv.PRIVATE_KEY || !repoEnv.ORACLE_SIGNER_PRIVATE_KEY_1 || !repoEnv.ORACLE_SIGNER_PRIVATE_KEY_2) {
    throw new Error("PRIVATE_KEY, ORACLE_SIGNER_PRIVATE_KEY_1, and ORACLE_SIGNER_PRIVATE_KEY_2 are required");
  }

  const provider = new JsonRpcProvider(config.cbdpRpcUrl, config.chainId);
  const founder = new Wallet(repoEnv.PRIVATE_KEY, provider);
  const seller = new Wallet(repoEnv.ORACLE_SIGNER_PRIVATE_KEY_1, provider);
  const buyer = new Wallet(repoEnv.ORACLE_SIGNER_PRIVATE_KEY_2, provider);
  const fundingCandidates = [
    founder,
    seller,
    repoEnv.ORACLE_SIGNER_PRIVATE_KEY_3 ? new Wallet(repoEnv.ORACLE_SIGNER_PRIVATE_KEY_3, provider) : null,
    repoEnv.ORACLE_SIGNER_PRIVATE_KEY_4 ? new Wallet(repoEnv.ORACLE_SIGNER_PRIVATE_KEY_4, provider) : null,
  ].filter((candidate): candidate is Wallet => candidate !== null);

  process.env.API_LAYER_KEYS_JSON = JSON.stringify({
    "founder-key": { label: "founder", signerId: "founder", roles: ["service"], allowGasless: false },
    "read-key": { label: "reader", roles: ["service"], allowGasless: false },
    "seller-key": { label: "seller", signerId: "seller", roles: ["service"], allowGasless: false },
    "buyer-key": { label: "buyer", signerId: "buyer", roles: ["service"], allowGasless: false },
  });
  process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({
    founder: founder.privateKey,
    seller: seller.privateKey,
    buyer: buyer.privateKey,
  });

  const voiceAsset = new Contract(config.diamondAddress, facetRegistry.VoiceAssetFacet.abi, provider);
  const payment = new Contract(config.diamondAddress, facetRegistry.PaymentFacet.abi, provider);
  const usdcAddress = await payment.getUsdcToken();
  if (!usdcAddress || usdcAddress === ZeroAddress) {
    throw new Error("payment facet returned zero USDC token");
  }
  const erc20 = new Contract(
    usdcAddress,
    [
      "function balanceOf(address) view returns (uint256)",
      "function allowance(address,address) view returns (uint256)",
      "function transfer(address,uint256) returns (bool)",
      "function approve(address,uint256) returns (bool)",
    ],
    provider,
  );

  const richestUsdcHolder = (await Promise.all(
    fundingCandidates.map(async (wallet) => ({ wallet, balance: BigInt(await erc20.balanceOf(wallet.address)) })),
  )).sort((left, right) => Number(right.balance - left.balance))[0];

  await ensureNativeBalance(provider, founder, buyer.address, ethers.parseEther("0.00005"));

  const { server, port } = await startServer();
  try {
    let target = agedListing?.tokenId && agedListing.activeListing === true
      ? {
          source: "aged-fixture",
          tokenId: agedListing.tokenId,
          voiceHash: agedListing.voiceHash ?? null,
          sellerAddress: seller.address,
          listing: null as unknown,
        }
      : null;

    let listingBefore = target
      ? await apiCall(
          port,
          "GET",
          `/v1/marketplace/queries/get-listing?tokenId=${encodeURIComponent(target.tokenId)}`,
          { apiKey: "read-key" },
        )
      : null;

    if (!target || !listingBefore || listingBefore.status !== 200 || (listingBefore.payload as Record<string, unknown>)?.isActive !== true) {
      target = await createFallbackListing(port, provider, founder.address, voiceAsset);
      listingBefore = { status: 200, payload: target.listing };
    }
    const tokenId = target.tokenId;
    const ownerBefore = await voiceAsset.ownerOf(BigInt(tokenId));
    const listingRecord = listingBefore.payload as Record<string, unknown>;
    const price = BigInt(String(listingRecord.price));

    const buyerBalanceAtStart = BigInt(await erc20.balanceOf(buyer.address));
    const buyerAllowanceAtStart = BigInt(await erc20.allowance(buyer.address, config.diamondAddress));
    if (buyerBalanceAtStart < price) {
      if (!richestUsdcHolder || richestUsdcHolder.balance < price - buyerBalanceAtStart || richestUsdcHolder.wallet.address.toLowerCase() === buyer.address.toLowerCase()) {
        throw new Error(`buyer lacks USDC for purchase: balance=${buyerBalanceAtStart.toString()} price=${price.toString()}`);
      }
      await (await erc20.connect(richestUsdcHolder.wallet).transfer(buyer.address, price - buyerBalanceAtStart)).wait();
    }
    if (buyerAllowanceAtStart < price) {
      await (await erc20.connect(buyer).approve(config.diamondAddress, price)).wait();
    }
    const buyerBalanceBefore = BigInt(await erc20.balanceOf(buyer.address));
    const buyerAllowanceBefore = BigInt(await erc20.allowance(buyer.address, config.diamondAddress));

    const purchaseResponse = await apiCall(
      port,
      "POST",
      "/v1/workflows/purchase-marketplace-asset",
      {
        apiKey: "buyer-key",
        walletAddress: buyer.address,
        body: { tokenId },
      },
    );
    if (purchaseResponse.status !== 202) {
      throw new Error(`purchase workflow failed: ${JSON.stringify(purchaseResponse.payload)}`);
    }

    const txHash = extractTxHash(purchaseResponse.payload);
    if (!txHash) {
      throw new Error(`purchase workflow did not return a tx hash: ${JSON.stringify(purchaseResponse.payload)}`);
    }
    const receipt = await waitForReceipt(provider, txHash, "marketplace purchase");

    const ownerAfter = await retryRead(
      () => voiceAsset.ownerOf(BigInt(tokenId)),
      (value) => String(value).toLowerCase() === buyer.address.toLowerCase(),
      "owner after purchase",
    );
    const listingAfter = await retryRead(
      () => apiCall(
        port,
        "GET",
        `/v1/marketplace/queries/get-listing?tokenId=${encodeURIComponent(tokenId)}`,
        { apiKey: "read-key" },
      ),
      (value) => value.status === 200 && (value.payload as Record<string, unknown>)?.isActive === false,
      "listing after purchase",
    );
    const assetPurchasedEvents = await retryRead(
      () => apiCall(
        port,
        "POST",
        "/v1/marketplace/events/asset-purchased/query",
        { apiKey: "read-key", body: { fromBlock: String(receipt.blockNumber), toBlock: String(receipt.blockNumber) } },
      ),
      (value) => value.status === 200 && Array.isArray(value.payload) && value.payload.some((entry) => (entry as Record<string, unknown>)?.transactionHash === txHash),
      "asset purchased event",
    );
    const paymentDistributedEvents = await retryRead(
      () => apiCall(
        port,
        "POST",
        "/v1/marketplace/events/payment-distributed/query",
        { apiKey: "read-key", body: { fromBlock: String(receipt.blockNumber), toBlock: String(receipt.blockNumber) } },
      ),
      (value) => value.status === 200 && Array.isArray(value.payload) && value.payload.some((entry) => (entry as Record<string, unknown>)?.transactionHash === txHash),
      "payment distributed event",
    );
    const assetReleasedEvents = await retryRead(
      () => apiCall(
        port,
        "POST",
        "/v1/marketplace/events/asset-released/query",
        { apiKey: "read-key", body: { fromBlock: String(receipt.blockNumber), toBlock: String(receipt.blockNumber) } },
      ),
      (value) => value.status === 200 && Array.isArray(value.payload) && value.payload.some((entry) => (entry as Record<string, unknown>)?.transactionHash === txHash),
      "asset released event",
    );

    const output = {
      target: {
        source: target.source,
        chainId: config.chainId,
        diamond: config.diamondAddress,
        tokenId,
        voiceHash: target.voiceHash,
      },
      actors: {
        seller: target.sellerAddress,
        buyer: buyer.address,
      },
      preState: {
        listing: normalize(listingBefore.payload),
        owner: ownerBefore,
        buyerUsdcBalance: buyerBalanceBefore.toString(),
        buyerAllowance: buyerAllowanceBefore.toString(),
      },
      purchase: {
        status: purchaseResponse.status,
        payload: normalize(purchaseResponse.payload),
        txHash,
        receipt: {
          status: receipt.status,
          blockNumber: receipt.blockNumber,
        },
      },
      postState: {
        owner: ownerAfter,
        listing: normalize(listingAfter.payload),
        buyerUsdcBalance: (await erc20.balanceOf(buyer.address)).toString(),
        buyerAllowance: (await erc20.allowance(buyer.address, config.diamondAddress)).toString(),
      },
      events: {
        assetPurchased: normalize(assetPurchasedEvents.payload),
        paymentDistributed: normalize(paymentDistributedEvents.payload),
        assetReleased: normalize(assetReleasedEvents.payload),
      },
      classification: "proven working",
    };
    const outputJson = JSON.stringify(output, null, 2);
    const outputPath = getOutputPath();
    if (outputPath) {
      fs.writeFileSync(outputPath, `${outputJson}\n`);
    }
    console.log(outputJson);
  } finally {
    server.close();
    await provider.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
