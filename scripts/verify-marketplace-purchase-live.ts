import fs from "node:fs";
import { once } from "node:events";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Contract, JsonRpcProvider, Wallet, ZeroAddress, ethers } from "ethers";

import { createApiServer, type ApiServer } from "../packages/api/src/app.js";
import { loadRepoEnv } from "../packages/client/src/runtime/config.js";
import { facetRegistry } from "../packages/client/src/generated/index.js";

import { isLoopbackRpcUrl, resolveRuntimeConfig, startLocalForkIfNeeded } from "./alchemy-debug-lib.js";
import { collectSellerEscrowedVoiceHashes, prepareAgedListingFixture } from "./base-sepolia-operator-setup.js";
import { ONE_DAY, isExpiredListing, isPurchaseReadyListing, mergeMarketplaceCandidateVoiceHashes } from "./base-sepolia-operator-setup.helpers.js";
import { buildVerifyReportOutput, getOutputPath, writeVerifyReportOutput, type DomainClassification } from "./verify-report.js";

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
      status?: "ready" | "partial" | "blocked";
      purchaseReadiness?: "unverified" | "listed-not-yet-purchase-proven" | "purchase-ready";
      listing?: unknown;
    };
  };
};

export type MarketplacePurchaseTarget = {
  source: "aged-fixture" | "fresh-founder-listing";
  tokenId: string;
  voiceHash: string | null;
  sellerAddress: string;
  listing: unknown;
};

type FundingCheckResult =
  | {
      ok: true;
      balance: bigint;
    }
  | {
      ok: false;
      balance: bigint;
      minimum: bigint;
      missing: bigint;
      fundingWallet: string;
      recipient: string;
    };

const MIN_BUYER_NATIVE_BALANCE = ethers.parseEther("0.00005");
const MIN_FALLBACK_CREATOR_NATIVE_BALANCE = ethers.parseEther("0.00025");
const BUYER_GAS_BUFFER_NUMERATOR = 12n;
const BUYER_GAS_BUFFER_DENOMINATOR = 10n;

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

export function extractTxHash(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const direct = record.txHash;
  if (typeof direct === "string" && direct.startsWith("0x")) {
    return direct;
  }
  const purchase = record.purchase;
  if (purchase && typeof purchase === "object") {
    const txHash = (purchase as Record<string, unknown>).txHash;
    if (typeof txHash === "string" && txHash.startsWith("0x")) {
      return txHash;
    }
  }
  const withdrawal = record.withdrawal;
  if (withdrawal && typeof withdrawal === "object") {
    const txHash = (withdrawal as Record<string, unknown>).txHash;
    if (typeof txHash === "string" && txHash.startsWith("0x")) {
      return txHash;
    }
  }
  return null;
}

export function paymentClaimCommitmentStorageSlots(claimant: string, mappingSlot: 40 | 41) {
  const paymentStoragePosition = BigInt(ethers.keccak256(ethers.toUtf8Bytes("speak.payment.storage")));
  const mappingEntry = BigInt(ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "uint256"],
    [claimant, paymentStoragePosition + BigInt(mappingSlot)],
  )));
  return {
    commitHash: ethers.toBeHex(mappingEntry, 32),
    commitBlock: ethers.toBeHex(mappingEntry + 1n, 32),
    revealed: ethers.toBeHex(mappingEntry + 2n, 32),
  };
}

export async function readPaymentClaimCommitment(
  provider: JsonRpcProvider,
  diamondAddress: string,
  claimant: string,
  mappingSlot: 40 | 41,
) {
  const slots = paymentClaimCommitmentStorageSlots(claimant, mappingSlot);
  const [commitHash, commitBlock, revealed] = await Promise.all([
    provider.getStorage(diamondAddress, slots.commitHash),
    provider.getStorage(diamondAddress, slots.commitBlock),
    provider.getStorage(diamondAddress, slots.revealed),
  ]);
  return {
    commitHash: commitHash.toLowerCase(),
    commitBlock: BigInt(commitBlock).toString(),
    revealed: BigInt(revealed) !== 0n,
    slots,
  };
}

export function resolveMarketplaceWithdrawalApiKey(
  sellerAddress: string,
  configuredSellerAddress: string,
  founderAddress: string,
): "seller-key" | "founder-key" | null {
  const normalizedSellerAddress = sellerAddress.toLowerCase();
  if (normalizedSellerAddress === configuredSellerAddress.toLowerCase()) {
    return "seller-key";
  }
  if (normalizedSellerAddress === founderAddress.toLowerCase()) {
    return "founder-key";
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

type ListingLike = {
  createdAt?: string;
  expiresAt?: string;
  isActive?: boolean;
};

async function ensureNativeBalance(
  provider: JsonRpcProvider,
  rpcUrl: string,
  fundingWallets: Wallet[],
  recipient: string,
  minimum: bigint,
) {
  const targetMinimum = isLoopbackRpcUrl(rpcUrl)
    ? (minimum > ethers.parseEther("0.02") ? minimum : ethers.parseEther("0.02")) + ethers.parseEther("0.005")
    : minimum;
  let balance = await provider.getBalance(recipient);
  if (balance >= targetMinimum) {
    return { ok: true, balance } as const;
  }

  if (isLoopbackRpcUrl(rpcUrl)) {
    await provider.send("anvil_setBalance", [recipient, ethers.toQuantity(targetMinimum)]);
    return { ok: true, balance: await provider.getBalance(recipient) } as const;
  }

  const donorReserve = ethers.parseEther("0.000003");
  for (const wallet of fundingWallets) {
    if (wallet.address.toLowerCase() === recipient.toLowerCase()) {
      continue;
    }
    const donorBalance = await provider.getBalance(wallet.address);
    if (donorBalance <= donorReserve) {
      continue;
    }
    const deficit = minimum - balance;
    const available = donorBalance - donorReserve;
    const amount = available >= deficit ? deficit : available;
    if (amount <= 0n) {
      continue;
    }
    await (await wallet.sendTransaction({ to: recipient, value: amount })).wait();
    balance = await provider.getBalance(recipient);
    if (balance >= minimum) {
      return { ok: true, balance } as const;
    }
  }

  const missing = minimum - balance;
  return {
    ok: false,
    balance,
    minimum,
    missing,
    fundingWallet: fundingWallets[0]?.address ?? fundingWallets.at(-1)?.address ?? recipient,
    recipient,
  } as const;
}

export async function estimateBuyerNativeMinimum(
  provider: JsonRpcProvider,
  marketplace: Contract,
  buyerAddress: string,
  tokenId: string,
): Promise<bigint> {
  const feeData = await provider.getFeeData();
  let estimatedGas: bigint;
  try {
    estimatedGas = BigInt(await marketplace.purchaseAsset.estimateGas(BigInt(tokenId), { from: buyerAddress }));
  } catch {
    return MIN_BUYER_NATIVE_BALANCE;
  }

  const gasPrice = feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n;
  if (gasPrice <= 0n) {
    return MIN_BUYER_NATIVE_BALANCE;
  }

  const estimatedCost = estimatedGas * gasPrice;
  const bufferedCost = (estimatedCost * BUYER_GAS_BUFFER_NUMERATOR) / BUYER_GAS_BUFFER_DENOMINATOR;
  return bufferedCost > MIN_BUYER_NATIVE_BALANCE ? bufferedCost : MIN_BUYER_NATIVE_BALANCE;
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
): Promise<MarketplacePurchaseTarget> {
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

export async function advanceLocalForkPastMarketplaceTradingLock(
  provider: JsonRpcProvider,
  rpcUrl: string,
  listing: ListingLike | null | undefined,
): Promise<{ advanced: boolean; secondsAdvanced: string; readyAt: string | null }> {
  if (!isLoopbackRpcUrl(rpcUrl) || !listing || !listing.isActive || !listing.createdAt) {
    return {
      advanced: false,
      secondsAdvanced: "0",
      readyAt: listing?.createdAt ? (BigInt(listing.createdAt) + ONE_DAY + 1n).toString() : null,
    };
  }

  const latestBlock = await provider.getBlock("latest");
  const latestTimestamp = BigInt(latestBlock?.timestamp ?? Math.floor(Date.now() / 1_000));
  if (isPurchaseReadyListing(listing, latestTimestamp) || isExpiredListing(listing, latestTimestamp)) {
    return {
      advanced: false,
      secondsAdvanced: "0",
      readyAt: (BigInt(listing.createdAt) + ONE_DAY + 1n).toString(),
    };
  }

  const readyAt = BigInt(listing.createdAt) + ONE_DAY + 1n;
  const secondsToAdvance = readyAt > latestTimestamp ? readyAt - latestTimestamp : 0n;
  if (secondsToAdvance <= 0n) {
    return {
      advanced: false,
      secondsAdvanced: "0",
      readyAt: readyAt.toString(),
    };
  }

  await provider.send("evm_increaseTime", [Number(secondsToAdvance)]);
  await provider.send("evm_mine", []);
  return {
    advanced: true,
    secondsAdvanced: secondsToAdvance.toString(),
    readyAt: readyAt.toString(),
  };
}

export function selectMarketplacePurchaseTarget(
  agedListing: FixtureReport["marketplace"] extends { agedListingFixture?: infer T } ? T : never,
  sellerAddress: string,
): MarketplacePurchaseTarget | null {
  if (
    !agedListing?.tokenId ||
    agedListing.activeListing !== true ||
    agedListing.purchaseReadiness !== "purchase-ready"
  ) {
    return null;
  }

  return {
    source: "aged-fixture",
    tokenId: agedListing.tokenId,
    voiceHash: agedListing.voiceHash ?? null,
    sellerAddress,
    listing: null,
  };
}

export function buildBlockedFundingOutput(args: {
  chainId: number;
  diamondAddress: string;
  sellerAddress: string;
  buyerAddress: string;
  fundingWallet: string;
  funding: Extract<FundingCheckResult, { ok: false }>;
  target: MarketplacePurchaseTarget | null;
}) {
  return {
    target: args.target
      ? {
          source: args.target.source,
          chainId: args.chainId,
          diamond: args.diamondAddress,
          tokenId: args.target.tokenId,
          voiceHash: args.target.voiceHash,
        }
      : {
          source: "unresolved",
          chainId: args.chainId,
          diamond: args.diamondAddress,
          tokenId: null,
          voiceHash: null,
        },
    actors: {
      seller: args.sellerAddress,
      buyer: args.buyerAddress,
      fundingWallet: args.fundingWallet,
    },
    classification: "blocked by setup/state",
    failureKind: "environment limitation",
    notes: {
      reason: "buyer lacks enough native gas for live marketplace purchase proof and the configured funding wallet cannot top up the gap",
      requiredMinimumWei: args.funding.minimum.toString(),
      buyerBalanceWei: args.funding.balance.toString(),
      missingWei: args.funding.missing.toString(),
      fundingWallet: args.funding.fundingWallet,
      recipient: args.funding.recipient,
    },
  };
}

export function buildBlockedPurchaseOutput(args: {
  chainId: number;
  diamondAddress: string;
  sellerAddress: string;
  buyerAddress: string;
  target: MarketplacePurchaseTarget;
  purchaseResponse: ApiResponse;
  listingBefore: unknown;
}) {
  const payload = normalize(args.purchaseResponse.payload);
  return {
    target: {
      source: args.target.source,
      chainId: args.chainId,
      diamond: args.diamondAddress,
      tokenId: args.target.tokenId,
      voiceHash: args.target.voiceHash,
    },
    actors: {
      seller: args.sellerAddress,
      buyer: args.buyerAddress,
    },
    preState: {
      listing: normalize(args.listingBefore),
    },
    purchase: {
      status: args.purchaseResponse.status,
      payload,
    },
    classification: "blocked by setup/state",
    failureKind: "contract constraint",
  };
}

type MarketplacePurchaseDetails = {
  target: {
    source: MarketplacePurchaseTarget["source"] | "unresolved";
    chainId: number;
    diamond: string;
    tokenId: string | null;
    voiceHash: string | null;
  };
  actorWallets: {
    seller: string;
    buyer: string;
    fundingWallet?: string;
  };
  preState?: {
    listing?: unknown;
    owner?: unknown;
    buyerUsdcBalance?: string;
    buyerAllowance?: string;
  };
  purchase?: {
    status: number;
    payload: unknown;
    txHash?: string;
    receipt?: {
      status: unknown;
      blockNumber: unknown;
    };
  };
  withdrawal?: {
    status: number;
    payload: unknown;
    txHash: string;
    deadline: string;
    receipt: {
      status: unknown;
      blockNumber: unknown;
    };
    pendingBefore: string;
    pendingAfter: string;
  };
  usdcTokenUpdate?: {
    status: number;
    payload: unknown;
    txHash: string;
    receipt: {
      status: unknown;
      blockNumber: unknown;
    };
    configuredTokenBefore: string;
    configuredTokenAfter: string;
    expectedEvent: string;
  };
  mevProtectionConfigUpdate?: {
    status: number;
    payload: unknown;
    txHash: string;
    receipt: {
      status: unknown;
      blockNumber: unknown;
      logCount: number;
    };
    configBefore: string[];
    configAfter: string[];
    eventExpectation: string;
  };
  buybackPauseUpdate?: {
    status: number;
    payload: unknown;
    txHash: string;
    receipt: {
      status: unknown;
      blockNumber: unknown;
      logCount: number;
    };
    pausedEventValue: boolean;
    pausedStateAfter: boolean;
    postStateReadback: string;
  };
  buybackConfigUpdate?: {
    status: number;
    txHash: string;
    receipt: { status: unknown; blockNumber: unknown; logCount: number };
    configBefore: string[];
    configAfter: string[];
    event: string;
  };
  buybackConfigStructUpdate?: {
    status: number;
    txHash: string;
    receipt: { status: unknown; blockNumber: unknown; logCount: number };
    configAfter: string[];
    event: string;
  };
  claimCommitmentUpdates?: Array<{
    methodKey: "PaymentFacet.commitDistribution" | "PaymentFacet.commitWithdraw";
    route: string;
    actor: string;
    status: number;
    txHash: string;
    receipt: { status: unknown; blockNumber: unknown; logCount: number };
    event: { claimant: string; commitHash: string; commitBlock: string };
    storageBefore: { commitHash: string; commitBlock: string; revealed: boolean };
    storageAfter: { commitHash: string; commitBlock: string; revealed: boolean };
    balanceBefore: string;
    balanceAfter: string;
  }>;
  postState?: {
    owner?: unknown;
    listing?: unknown;
    buyerUsdcBalance?: string;
    buyerAllowance?: string;
  };
  events?: {
    assetPurchased?: unknown;
    paymentDistributed?: unknown;
    assetReleased?: unknown;
  };
  failureKind?: string;
  notes?: Record<string, unknown>;
};

export function buildMarketplacePurchaseVerifyOutput(args: {
  classification: DomainClassification;
  executionResult: string;
  actors: string[];
  details: MarketplacePurchaseDetails;
}) {
  const evidence = [
    { kind: "target", value: normalize(args.details.target) },
    args.details.preState ? { kind: "preState", value: normalize(args.details.preState) } : null,
    args.details.purchase ? { kind: "purchase", value: normalize(args.details.purchase) } : null,
    args.details.withdrawal ? { kind: "withdrawal", value: normalize(args.details.withdrawal) } : null,
    args.details.usdcTokenUpdate ? { kind: "usdcTokenUpdate", value: normalize(args.details.usdcTokenUpdate) } : null,
    args.details.mevProtectionConfigUpdate ? { kind: "mevProtectionConfigUpdate", value: normalize(args.details.mevProtectionConfigUpdate) } : null,
    args.details.buybackPauseUpdate ? { kind: "buybackPauseUpdate", value: normalize(args.details.buybackPauseUpdate) } : null,
    args.details.buybackConfigUpdate ? { kind: "buybackConfigUpdate", value: normalize(args.details.buybackConfigUpdate) } : null,
    args.details.buybackConfigStructUpdate ? { kind: "buybackConfigStructUpdate", value: normalize(args.details.buybackConfigStructUpdate) } : null,
    args.details.claimCommitmentUpdates ? { kind: "claimCommitmentUpdates", value: normalize(args.details.claimCommitmentUpdates) } : null,
    args.details.postState ? { kind: "postState", value: normalize(args.details.postState) } : null,
    args.details.events ? { kind: "events", value: normalize(args.details.events) } : null,
    args.details.notes ? { kind: "notes", value: normalize(args.details.notes) } : null,
  ].filter((entry): entry is { kind: string; value: unknown } => entry !== null);

  return buildVerifyReportOutput({
    "marketplace-purchase": {
      routes: [
        "PATCH /v1/marketplace/commands/set-usdc-token",
        "PATCH /v1/marketplace/commands/set-mev-protection-config",
        "PATCH /v1/marketplace/commands/set-buyback-config",
        "PATCH /v1/marketplace/commands/set-buyback-config-struct",
        "POST /v1/marketplace/commands/commit-distribution",
        "POST /v1/marketplace/commands/commit-withdraw",
        "POST /v1/marketplace/commands/pause-buybacks",
        "POST /v1/workflows/purchase-marketplace-asset",
        "POST /v1/workflows/withdraw-marketplace-payments",
        "GET /v1/marketplace/queries/get-listing",
        "POST /v1/marketplace/events/asset-purchased/query",
        "POST /v1/marketplace/events/payment-distributed/query",
        "POST /v1/marketplace/events/asset-released/query",
        "POST /v1/marketplace/events/usdcpayment-withdrawn/query",
      ],
      actors: args.actors,
      executionResult: args.executionResult,
      evidence,
      finalClassification: args.classification,
      ...normalize(args.details),
    },
  });
}

export function shouldAttemptMarketplaceRefresh(
  agedListing: FixtureReport["marketplace"] extends { agedListingFixture?: infer T } ? T : never,
): boolean {
  if (!agedListing) {
    return true;
  }

  if (agedListing.activeListing === true || agedListing.purchaseReadiness === "purchase-ready") {
    return true;
  }

  if (agedListing.status === "blocked" && agedListing.purchaseReadiness === "unverified") {
    return false;
  }

  return agedListing.purchaseReadiness !== "unverified";
}

async function refreshMarketplacePurchaseTarget(args: {
  port: number;
  provider: JsonRpcProvider;
  rpcUrl: string;
  fundingWallets: Wallet[];
  voiceAsset: Contract;
  escrow: Contract;
  sellerAddress: string;
  diamondAddress: string;
}) {
  await ensureNativeBalance(
    args.provider,
    args.rpcUrl,
    args.fundingWallets,
    args.sellerAddress,
    MIN_BUYER_NATIVE_BALANCE,
  );
  const sellerVoiceHashes = await args.voiceAsset.getVoiceAssetsByOwner(args.sellerAddress);
  const escrowVoiceHashes = await args.voiceAsset.getVoiceAssetsByOwner(args.diamondAddress);
  const sellerEscrowedVoiceHashes = await collectSellerEscrowedVoiceHashes({
    escrowVoiceHashes,
    voiceAsset: args.voiceAsset as unknown as { getTokenId(voiceHash: string): Promise<unknown> },
    escrow: args.escrow as unknown as { getOriginalOwner(tokenId: unknown): Promise<unknown> },
    sellerAddress: args.sellerAddress,
  });
  const latestBlock = await args.provider.getBlock("latest");
  const latestTimestamp = BigInt(latestBlock?.timestamp ?? Math.floor(Date.now() / 1_000));
  const refreshedFixture = await prepareAgedListingFixture({
    candidateVoiceHashes: mergeMarketplaceCandidateVoiceHashes(
      [...sellerVoiceHashes],
      sellerEscrowedVoiceHashes,
    ),
    voiceAsset: args.voiceAsset as unknown as {
      getVoiceAsset(voiceHash: string): Promise<{ createdAt: bigint | number | string }>;
      getTokenId(voiceHash: string): Promise<{ toString(): string } | bigint | number | string>;
    },
    sellerAddress: args.sellerAddress,
    diamondAddress: args.diamondAddress,
    port: args.port,
    latestTimestamp,
  });
  return selectMarketplacePurchaseTarget(refreshedFixture, args.sellerAddress);
}

async function main() {
  const repoEnv = loadRepoEnv();
  const runtimeConfig = await resolveRuntimeConfig(repoEnv);
  const forkRuntime = await startLocalForkIfNeeded(runtimeConfig);
  const { config } = runtimeConfig;
  process.env.RPC_URL = forkRuntime.rpcUrl;
  process.env.ALCHEMY_RPC_URL = config.alchemyRpcUrl;

  const fixture = JSON.parse(fs.readFileSync(".runtime/base-sepolia-operator-fixtures.json", "utf8")) as FixtureReport;
  const agedListing = fixture.marketplace?.agedListingFixture;

  if (!repoEnv.PRIVATE_KEY || !repoEnv.ORACLE_SIGNER_PRIVATE_KEY_1 || !repoEnv.ORACLE_SIGNER_PRIVATE_KEY_2) {
    throw new Error("PRIVATE_KEY, ORACLE_SIGNER_PRIVATE_KEY_1, and ORACLE_SIGNER_PRIVATE_KEY_2 are required");
  }

  const provider = new JsonRpcProvider(forkRuntime.rpcUrl, config.chainId);
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
    "read-key": { label: "reader", roles: ["read-only"], allowGasless: false },
    "seller-key": { label: "seller", signerId: "seller", roles: ["service"], allowGasless: false },
    "buyer-key": { label: "buyer", signerId: "buyer", roles: ["service"], allowGasless: false },
  });
  process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({
    founder: founder.privateKey,
    seller: seller.privateKey,
    buyer: buyer.privateKey,
  });
  process.env.API_LAYER_SIGNER_API_KEYS_JSON = JSON.stringify({
    [founder.address.toLowerCase()]: {
      apiKey: "founder-key",
      signerId: "founder",
      privateKey: founder.privateKey,
      label: "founder",
      roles: ["service"],
      allowGasless: false,
    },
    [seller.address.toLowerCase()]: {
      apiKey: "seller-key",
      signerId: "seller",
      privateKey: seller.privateKey,
      label: "seller",
      roles: ["service"],
      allowGasless: false,
    },
    [buyer.address.toLowerCase()]: {
      apiKey: "buyer-key",
      signerId: "buyer",
      privateKey: buyer.privateKey,
      label: "buyer",
      roles: ["service"],
      allowGasless: false,
    },
  });

  const voiceAsset = new Contract(config.diamondAddress, facetRegistry.VoiceAssetFacet.abi, provider);
  const marketplace = new Contract(config.diamondAddress, facetRegistry.MarketplaceFacet.abi, provider);
  const payment = new Contract(config.diamondAddress, facetRegistry.PaymentFacet.abi, provider);
  const escrow = new Contract(config.diamondAddress, facetRegistry.EscrowFacet.abi, provider);
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

  const { server, port } = await startServer();
  try {
    let usdcTokenUpdate: MarketplacePurchaseDetails["usdcTokenUpdate"];
    let mevProtectionConfigUpdate: MarketplacePurchaseDetails["mevProtectionConfigUpdate"];
    let buybackPauseUpdate: MarketplacePurchaseDetails["buybackPauseUpdate"];
    let buybackConfigUpdate: MarketplacePurchaseDetails["buybackConfigUpdate"];
    let buybackConfigStructUpdate: MarketplacePurchaseDetails["buybackConfigStructUpdate"];
    let claimCommitmentUpdates: MarketplacePurchaseDetails["claimCommitmentUpdates"];
    if (isLoopbackRpcUrl(forkRuntime.rpcUrl)) {
      await ensureNativeBalance(
        provider,
        forkRuntime.rpcUrl,
        fundingCandidates,
        founder.address,
        MIN_FALLBACK_CREATOR_NATIVE_BALANCE,
      );
      const updateResponse = await apiCall(
        port,
        "PATCH",
        "/v1/marketplace/commands/set-usdc-token",
        {
          apiKey: "founder-key",
          walletAddress: founder.address,
          body: { newUsdcToken: usdcAddress },
        },
      );
      if (updateResponse.status !== 202) {
        throw new Error(`fork-only USDC token readback proof failed: ${JSON.stringify(updateResponse.payload)}`);
      }
      const updateTxHash = extractTxHash(updateResponse.payload);
      if (!updateTxHash) {
        throw new Error(`fork-only USDC token update did not return a tx hash: ${JSON.stringify(updateResponse.payload)}`);
      }
      const updateReceipt = await waitForReceipt(provider, updateTxHash, "fork-only USDC token update");
      const expectedEvent = "PaymentFacet.UsdcTokenUpdated";
      const usdcEventFound = updateReceipt.logs.some((log) => {
        try {
          return payment.interface.parseLog(log)?.name === "UsdcTokenUpdated";
        } catch {
          return false;
        }
      });
      const configuredTokenAfter = String(await payment.getUsdcToken());
      if (!usdcEventFound || configuredTokenAfter.toLowerCase() !== usdcAddress.toLowerCase()) {
        throw new Error("fork-only USDC token update missed its declared event or canonical readback");
      }
      usdcTokenUpdate = {
        status: updateResponse.status,
        payload: updateResponse.payload,
        txHash: updateTxHash,
        receipt: { status: updateReceipt.status, blockNumber: updateReceipt.blockNumber },
        configuredTokenBefore: usdcAddress,
        configuredTokenAfter,
        expectedEvent,
      };

      const configBeforeResult = await payment.getMevProtectionConfig();
      const configBefore = [
        Boolean(configBeforeResult[0]).toString(),
        String(configBeforeResult[1]),
        String(configBeforeResult[2]),
        String(configBeforeResult[3]),
        String(configBeforeResult[4]),
      ];
      const configBody = {
        flashbotsEnabled: Boolean(configBeforeResult[0]),
        flashbotsRelayAddress: String(configBeforeResult[1]),
        minFlashbotsValue: String(configBeforeResult[2]),
        highValueThreshold: String(configBeforeResult[3]),
        revealTimelockBlocks: String(configBeforeResult[4]),
      };
      const configResponse = await apiCall(
        port,
        "PATCH",
        "/v1/marketplace/commands/set-mev-protection-config",
        {
          apiKey: "founder-key",
          walletAddress: founder.address,
          body: configBody,
        },
      );
      if (configResponse.status !== 202) {
        throw new Error(`fork-only MEV protection configuration proof failed: ${JSON.stringify(configResponse.payload)}`);
      }
      const configTxHash = extractTxHash(configResponse.payload);
      if (!configTxHash) {
        throw new Error(`fork-only MEV protection configuration did not return a tx hash: ${JSON.stringify(configResponse.payload)}`);
      }
      const configReceipt = await waitForReceipt(provider, configTxHash, "fork-only MEV protection configuration");
      const configAfterResult = await payment.getMevProtectionConfig();
      const configAfter = [
        Boolean(configAfterResult[0]).toString(),
        String(configAfterResult[1]),
        String(configAfterResult[2]),
        String(configAfterResult[3]),
        String(configAfterResult[4]),
      ];
      const sameConfig = configBefore.length === configAfter.length
        && configBefore.every((value, index) => value.toLowerCase() === configAfter[index].toLowerCase());
      if (configReceipt.logs.length !== 0 || !sameConfig) {
        throw new Error(`fork-only MEV protection configuration proof mismatch: ${JSON.stringify({
          receiptLogCount: configReceipt.logs.length,
          configBefore,
          configAfter,
        })}`);
      }
      mevProtectionConfigUpdate = {
        status: configResponse.status,
        payload: configResponse.payload,
        txHash: configTxHash,
        receipt: { status: configReceipt.status, blockNumber: configReceipt.blockNumber, logCount: configReceipt.logs.length },
        configBefore,
        configAfter,
        eventExpectation: "eventless per PaymentFacet.setMevProtectionConfig source",
      };

      const buybackConfigBeforeResult = await payment.getBuybackStatus();
      const buybackConfigBefore = [
        String(buybackConfigBeforeResult.buybackBps ?? buybackConfigBeforeResult[0]),
        String(buybackConfigBeforeResult.minMonthlyRevenue ?? buybackConfigBeforeResult[1]),
        String(buybackConfigBeforeResult.requiredMonths ?? buybackConfigBeforeResult[2]),
        String(buybackConfigBeforeResult.cadence ?? buybackConfigBeforeResult[3]),
        String(buybackConfigBeforeResult.buybackRouter ?? buybackConfigBeforeResult[10]),
        String(buybackConfigBeforeResult.uspkToken ?? buybackConfigBeforeResult[11]),
        String(buybackConfigBeforeResult.burnAddress ?? buybackConfigBeforeResult[12]),
      ];
      const buybackConfigTarget = [
        "0",
        "0",
        "1",
        "1",
        ZeroAddress,
        buybackConfigBefore[5],
        ZeroAddress,
      ];
      const buybackConfigResponse = await apiCall(
        port,
        "PATCH",
        "/v1/marketplace/commands/set-buyback-config",
        {
          apiKey: "founder-key",
          walletAddress: founder.address,
          body: {
            buybackBps: buybackConfigTarget[0],
            minMonthlyRevenue: buybackConfigTarget[1],
            requiredMonths: buybackConfigTarget[2],
            cadence: buybackConfigTarget[3],
            buybackRouter: buybackConfigTarget[4],
            uspkToken: buybackConfigTarget[5],
            burnAddress: buybackConfigTarget[6],
          },
        },
      );
      if (buybackConfigResponse.status !== 202) {
        throw new Error(`fork-only buyback config proof failed: ${JSON.stringify(buybackConfigResponse.payload)}`);
      }
      const buybackConfigTxHash = extractTxHash(buybackConfigResponse.payload);
      if (!buybackConfigTxHash) {
        throw new Error(`fork-only buyback config did not return a tx hash: ${JSON.stringify(buybackConfigResponse.payload)}`);
      }
      const buybackConfigReceipt = await waitForReceipt(provider, buybackConfigTxHash, "fork-only buyback config");
      const buybackConfigEvent = buybackConfigReceipt.logs.flatMap((log) => {
        try {
          const parsed = payment.interface.parseLog(log);
          return parsed?.name === "BuybackConfigUpdated" ? [parsed] : [];
        } catch {
          return [];
        }
      })[0];
      const buybackConfigAfterResult = await payment.getBuybackStatus();
      const buybackConfigAfter = [
        String(buybackConfigAfterResult.buybackBps ?? buybackConfigAfterResult[0]),
        String(buybackConfigAfterResult.minMonthlyRevenue ?? buybackConfigAfterResult[1]),
        String(buybackConfigAfterResult.requiredMonths ?? buybackConfigAfterResult[2]),
        String(buybackConfigAfterResult.cadence ?? buybackConfigAfterResult[3]),
        String(buybackConfigAfterResult.buybackRouter ?? buybackConfigAfterResult[10]),
        String(buybackConfigAfterResult.uspkToken ?? buybackConfigAfterResult[11]),
        String(buybackConfigAfterResult.burnAddress ?? buybackConfigAfterResult[12]),
      ];
      const buybackConfigMatches = buybackConfigTarget.every((value, index) =>
        value.toLowerCase() === buybackConfigAfter[index].toLowerCase());
      const buybackConfigEventMatches = Boolean(buybackConfigEvent)
        && buybackConfigTarget.every((value, index) => String(buybackConfigEvent.args[index]).toLowerCase() === value.toLowerCase());
      if (!buybackConfigEventMatches || !buybackConfigMatches) {
        throw new Error(`fork-only buyback config event/readback mismatch: ${JSON.stringify({
          eventFound: Boolean(buybackConfigEvent),
          buybackConfigBefore,
          buybackConfigTarget,
          buybackConfigAfter,
          buybackConfigEventValues: buybackConfigEvent ? Array.from(buybackConfigEvent.args).map(String) : null,
        })}`);
      }
      buybackConfigUpdate = {
        status: buybackConfigResponse.status,
        txHash: buybackConfigTxHash,
        receipt: { status: buybackConfigReceipt.status, blockNumber: buybackConfigReceipt.blockNumber, logCount: buybackConfigReceipt.logs.length },
        configBefore: buybackConfigBefore,
        configTarget: buybackConfigTarget,
        configAfter: buybackConfigAfter,
        event: "PaymentFacet.BuybackConfigUpdated",
      };

      const buybackConfigStructResponse = await apiCall(
        port,
        "PATCH",
        "/v1/marketplace/commands/set-buyback-config-struct",
        {
          apiKey: "founder-key",
          walletAddress: founder.address,
          body: {
            config: {
              buybackBps: buybackConfigTarget[0],
              minMonthlyRevenue: buybackConfigTarget[1],
              requiredMonths: buybackConfigTarget[2],
              cadence: buybackConfigTarget[3],
              buybackRouter: buybackConfigTarget[4],
              uspkToken: buybackConfigTarget[5],
              burnAddress: buybackConfigTarget[6],
            },
          },
        },
      );
      if (buybackConfigStructResponse.status !== 202) {
        throw new Error(`fork-only buyback config struct proof failed: ${JSON.stringify(buybackConfigStructResponse.payload)}`);
      }
      const buybackConfigStructTxHash = extractTxHash(buybackConfigStructResponse.payload);
      if (!buybackConfigStructTxHash) {
        throw new Error(`fork-only buyback config struct did not return a tx hash: ${JSON.stringify(buybackConfigStructResponse.payload)}`);
      }
      const buybackConfigStructReceipt = await waitForReceipt(provider, buybackConfigStructTxHash, "fork-only buyback config struct");
      const buybackConfigStructEvent = buybackConfigStructReceipt.logs.flatMap((log) => {
        try {
          const parsed = payment.interface.parseLog(log);
          return parsed?.name === "BuybackConfigUpdated" ? [parsed] : [];
        } catch {
          return [];
        }
      })[0];
      const buybackConfigStructAfterResult = await payment.getBuybackStatus();
      const buybackConfigStructAfter = [
        String(buybackConfigStructAfterResult.buybackBps ?? buybackConfigStructAfterResult[0]),
        String(buybackConfigStructAfterResult.minMonthlyRevenue ?? buybackConfigStructAfterResult[1]),
        String(buybackConfigStructAfterResult.requiredMonths ?? buybackConfigStructAfterResult[2]),
        String(buybackConfigStructAfterResult.cadence ?? buybackConfigStructAfterResult[3]),
        String(buybackConfigStructAfterResult.buybackRouter ?? buybackConfigStructAfterResult[10]),
        String(buybackConfigStructAfterResult.uspkToken ?? buybackConfigStructAfterResult[11]),
        String(buybackConfigStructAfterResult.burnAddress ?? buybackConfigStructAfterResult[12]),
      ];
      const buybackConfigStructEventMatches = Boolean(buybackConfigStructEvent)
        && buybackConfigTarget.every((value, index) => String(buybackConfigStructEvent.args[index]).toLowerCase() === value.toLowerCase());
      const buybackConfigStructStateMatches = buybackConfigTarget.every((value, index) =>
        value.toLowerCase() === buybackConfigStructAfter[index].toLowerCase());
      if (!buybackConfigStructEventMatches || !buybackConfigStructStateMatches) {
        throw new Error(`fork-only buyback config struct event/readback mismatch: ${JSON.stringify({
          eventFound: Boolean(buybackConfigStructEvent),
          target: buybackConfigTarget,
          configAfter: buybackConfigStructAfter,
          eventValues: buybackConfigStructEvent ? Array.from(buybackConfigStructEvent.args).map(String) : null,
        })}`);
      }
      buybackConfigStructUpdate = {
        status: buybackConfigStructResponse.status,
        txHash: buybackConfigStructTxHash,
        receipt: { status: buybackConfigStructReceipt.status, blockNumber: buybackConfigStructReceipt.blockNumber, logCount: buybackConfigStructReceipt.logs.length },
        configAfter: buybackConfigStructAfter,
        event: "PaymentFacet.BuybackConfigUpdated",
      };

      const submitClaimCommitment = async (
        methodKey: "PaymentFacet.commitDistribution" | "PaymentFacet.commitWithdraw",
        methodName: "commitDistribution" | "commitWithdraw",
        mappingSlot: 40 | 41,
        route: string,
      ) => {
        const candidates = [
          { wallet: founder, apiKey: "founder-key" },
          { wallet: seller, apiKey: "seller-key" },
          { wallet: buyer, apiKey: "buyer-key" },
        ];
        let selected: typeof candidates[number] | undefined;
        let storageBefore: Awaited<ReturnType<typeof readPaymentClaimCommitment>> | undefined;
        for (const candidate of candidates) {
          const current = await readPaymentClaimCommitment(provider, config.diamondAddress, candidate.wallet.address, mappingSlot);
          if (current.commitHash === ethers.ZeroHash || current.revealed) {
            selected = candidate;
            storageBefore = current;
            break;
          }
        }
        if (!selected || !storageBefore) {
          throw new Error(`no configured API actor has an available ${methodName} commitment slot`);
        }

        const commitHash = ethers.keccak256(ethers.toUtf8Bytes(
          `api05:${methodName}:${selected.wallet.address.toLowerCase()}:${Date.now()}:${Math.random()}`,
        ));
        const balanceBefore = BigInt(await erc20.balanceOf(selected.wallet.address)).toString();
        const response = await apiCall(port, "POST", route, {
          apiKey: selected.apiKey,
          walletAddress: selected.wallet.address,
          body: { commitHash },
        });
        if (response.status !== 202) {
          throw new Error(`fork-only ${methodName} proof failed: ${JSON.stringify(response.payload)}`);
        }
        const txHash = extractTxHash(response.payload);
        if (!txHash) {
          throw new Error(`fork-only ${methodName} did not return a transaction hash`);
        }
        const receipt = await waitForReceipt(provider, txHash, `fork-only ${methodName}`);
        const committed = receipt.logs.flatMap((log) => {
          try {
            const parsed = payment.interface.parseLog(log);
            return parsed?.name === "ClaimCommitted" ? [parsed] : [];
          } catch {
            return [];
          }
        })[0];
        const storageAfter = await readPaymentClaimCommitment(provider, config.diamondAddress, selected.wallet.address, mappingSlot);
        const balanceAfter = BigInt(await erc20.balanceOf(selected.wallet.address)).toString();
        const event = committed ? {
          claimant: String(committed.args.claimant),
          commitHash: String(committed.args.commitHash).toLowerCase(),
          commitBlock: String(committed.args.commitBlock),
        } : null;
        if (!event
          || event.claimant.toLowerCase() !== selected.wallet.address.toLowerCase()
          || event.commitHash !== commitHash.toLowerCase()
          || event.commitBlock !== String(receipt.blockNumber)
          || receipt.logs.length !== 1
          || storageAfter.commitHash !== commitHash.toLowerCase()
          || storageAfter.commitBlock !== String(receipt.blockNumber)
          || storageAfter.revealed
          || balanceAfter !== balanceBefore) {
          throw new Error(`fork-only ${methodName} receipt/event/storage proof mismatch: ${JSON.stringify({
            event,
            expectedClaimant: selected.wallet.address,
            expectedCommitHash: commitHash,
            receipt: { blockNumber: receipt.blockNumber, logCount: receipt.logs.length },
            storageBefore,
            storageAfter,
            balanceBefore,
            balanceAfter,
          })}`);
        }
        return {
          methodKey,
          route,
          actor: selected.wallet.address,
          status: response.status,
          txHash,
          receipt: { status: receipt.status, blockNumber: receipt.blockNumber, logCount: receipt.logs.length },
          event,
          storageBefore,
          storageAfter,
          balanceBefore,
          balanceAfter,
        };
      };

      claimCommitmentUpdates = [
        await submitClaimCommitment(
          "PaymentFacet.commitDistribution",
          "commitDistribution",
          40,
          "/v1/marketplace/commands/commit-distribution",
        ),
        await submitClaimCommitment(
          "PaymentFacet.commitWithdraw",
          "commitWithdraw",
          41,
          "/v1/marketplace/commands/commit-withdraw",
        ),
      ];

      const pauseResponse = await apiCall(
        port,
        "POST",
        "/v1/marketplace/commands/pause-buybacks",
        {
          apiKey: "founder-key",
          walletAddress: founder.address,
          body: { paused: false },
        },
      );
      if (pauseResponse.status !== 202) {
        throw new Error(`fork-only buyback pause state proof failed: ${JSON.stringify(pauseResponse.payload)}`);
      }
      const pauseTxHash = extractTxHash(pauseResponse.payload);
      if (!pauseTxHash) {
        throw new Error(`fork-only buyback pause update did not return a tx hash: ${JSON.stringify(pauseResponse.payload)}`);
      }
      const pauseReceipt = await waitForReceipt(provider, pauseTxHash, "fork-only buyback pause update");
      const buybackStatusAfterPause = await payment.getBuybackStatus();
      const pausedStateAfter = Boolean(buybackStatusAfterPause.paused ?? buybackStatusAfterPause[9]);
      const pauseEvent = pauseReceipt.logs.flatMap((log) => {
        try {
          const parsed = payment.interface.parseLog(log);
          return parsed?.name === "BuybackPaused" ? [parsed] : [];
        } catch {
          return [];
        }
      })[0];
      const pausedEventValue = pauseEvent ? Boolean(pauseEvent.args.paused ?? pauseEvent.args[0]) : true;
      if (!pauseEvent || pausedEventValue !== false || pausedStateAfter !== false) {
        throw new Error(`fork-only buyback pause proof mismatch: ${JSON.stringify({
          receiptLogCount: pauseReceipt.logs.length,
          eventFound: Boolean(pauseEvent),
          pausedEventValue,
          pausedStateAfter,
        })}`);
      }
      buybackPauseUpdate = {
        status: pauseResponse.status,
        payload: pauseResponse.payload,
        txHash: pauseTxHash,
        receipt: { status: pauseReceipt.status, blockNumber: pauseReceipt.blockNumber, logCount: pauseReceipt.logs.length },
        pausedEventValue,
        pausedStateAfter,
        postStateReadback: "PaymentFacet.getBuybackStatus().paused",
      };
    }

    let target = selectMarketplacePurchaseTarget(agedListing, seller.address);
    const shouldRefreshTarget = shouldAttemptMarketplaceRefresh(agedListing);

    let listingBefore = target
      ? await apiCall(
          port,
          "GET",
          `/v1/marketplace/queries/get-listing?tokenId=${encodeURIComponent(target.tokenId)}`,
          { apiKey: "read-key" },
        )
      : null;

    const listingPayload = listingBefore?.status === 200 && listingBefore.payload && typeof listingBefore.payload === "object"
      ? listingBefore.payload as Record<string, unknown>
      : null;
    if (shouldRefreshTarget && target && listingPayload && isExpiredListing(listingPayload, BigInt(Math.floor(Date.now() / 1_000)))) {
      target = await refreshMarketplacePurchaseTarget({
        port,
        provider,
        rpcUrl: forkRuntime.rpcUrl,
        fundingWallets: fundingCandidates,
        voiceAsset,
        escrow,
        sellerAddress: seller.address,
        diamondAddress: config.diamondAddress,
      });
      listingBefore = target
        ? await apiCall(
            port,
            "GET",
            `/v1/marketplace/queries/get-listing?tokenId=${encodeURIComponent(target.tokenId)}`,
            { apiKey: "read-key" },
          )
        : null;
    }

    if (shouldRefreshTarget && (!target || !listingBefore || listingBefore.status !== 200 || (listingBefore.payload as Record<string, unknown>)?.isActive !== true)) {
      const refreshedTarget = await refreshMarketplacePurchaseTarget({
        port,
        provider,
        rpcUrl: forkRuntime.rpcUrl,
        fundingWallets: fundingCandidates,
        voiceAsset,
        escrow,
        sellerAddress: seller.address,
        diamondAddress: config.diamondAddress,
      });
      if (refreshedTarget) {
        target = refreshedTarget;
        listingBefore = await apiCall(
          port,
          "GET",
          `/v1/marketplace/queries/get-listing?tokenId=${encodeURIComponent(target.tokenId)}`,
          { apiKey: "read-key" },
        );
      }
    }

    if (!target || !listingBefore || listingBefore.status !== 200 || (listingBefore.payload as Record<string, unknown>)?.isActive !== true) {
      await ensureNativeBalance(
        provider,
        forkRuntime.rpcUrl,
        fundingCandidates,
        founder.address,
        MIN_FALLBACK_CREATOR_NATIVE_BALANCE,
      );
      target = await createFallbackListing(port, provider, founder.address, voiceAsset);
      listingBefore = { status: 200, payload: target.listing };
    }
    const requiredBuyerNativeBalance = await estimateBuyerNativeMinimum(
      provider,
      marketplace,
      buyer.address,
      target.tokenId,
    );
    const buyerFunding = await ensureNativeBalance(
      provider,
      forkRuntime.rpcUrl,
      fundingCandidates,
      buyer.address,
      requiredBuyerNativeBalance,
    );
    if (!buyerFunding.ok) {
      const blockedOutput = buildBlockedFundingOutput({
        chainId: config.chainId,
        diamondAddress: config.diamondAddress,
        sellerAddress: target.sellerAddress,
        buyerAddress: buyer.address,
        fundingWallet: founder.address,
        funding: buyerFunding,
        target,
      });
      const output = buildMarketplacePurchaseVerifyOutput({
        classification: "blocked by setup/state",
        executionResult: "buyer native gas funding remained below the live purchase threshold",
        actors: ["seller-key", "buyer-key", "founder-key"],
        details: {
          target: blockedOutput.target,
          actorWallets: blockedOutput.actors,
          failureKind: blockedOutput.failureKind,
          notes: blockedOutput.notes,
        },
      });
      const outputJson = JSON.stringify(output, null, 2);
      const outputPath = getOutputPath();
      writeVerifyReportOutput(outputPath, output);
      console.log(outputJson);
      return;
    }
    const tokenId = target.tokenId;
    const ownerBefore = await voiceAsset.ownerOf(BigInt(tokenId));
    const listingRecord = listingBefore.payload as Record<string, unknown>;
    const forkTimeAdjustment = await advanceLocalForkPastMarketplaceTradingLock(
      provider,
      forkRuntime.rpcUrl,
      listingRecord as ListingLike,
    );
    if (forkTimeAdjustment.advanced) {
      listingBefore = await retryRead(
        () => apiCall(
          port,
          "GET",
          `/v1/marketplace/queries/get-listing?tokenId=${encodeURIComponent(tokenId)}`,
          { apiKey: "read-key" },
        ),
        (value) => {
          if (value.status !== 200 || !value.payload || typeof value.payload !== "object") {
            return false;
          }
          const payload = value.payload as ListingLike;
          const createdAt = payload.createdAt ? BigInt(payload.createdAt) : 0n;
          return payload.isActive === true && createdAt > 0n;
        },
        "listing after local fork time advance",
      );
    }
    const listingRecordAfterAdjustment = listingBefore.payload as Record<string, unknown>;
    const price = BigInt(String(listingRecordAfterAdjustment.price));

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
      const payloadText = JSON.stringify(purchaseResponse.payload);
      if (purchaseResponse.status === 409 || /blocked by setup\/state|blocked by trading lock|listing .*expired/i.test(payloadText)) {
        const blockedOutput = buildBlockedPurchaseOutput({
          chainId: config.chainId,
          diamondAddress: config.diamondAddress,
          sellerAddress: target.sellerAddress,
          buyerAddress: buyer.address,
          target,
          purchaseResponse,
          listingBefore: listingBefore.payload,
        });
        const output = buildMarketplacePurchaseVerifyOutput({
          classification: "blocked by setup/state",
          executionResult: "marketplace purchase remained blocked by live listing state",
          actors: ["seller-key", "buyer-key", "read-key"],
          details: {
            target: blockedOutput.target,
            actorWallets: blockedOutput.actors,
            preState: blockedOutput.preState,
            purchase: blockedOutput.purchase,
            failureKind: blockedOutput.failureKind,
          },
        });
        const outputJson = JSON.stringify(output, null, 2);
        const outputPath = getOutputPath();
        writeVerifyReportOutput(outputPath, output);
        console.log(outputJson);
        return;
      }
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
    const withdrawalApiKey = resolveMarketplaceWithdrawalApiKey(
      target.sellerAddress,
      seller.address,
      founder.address,
    );
    if (!withdrawalApiKey) {
      throw new Error(`marketplace seller has no configured local-fork signer: ${target.sellerAddress}`);
    }
    const pendingBeforeWithdrawal = BigInt(await payment.getPendingPayments(target.sellerAddress));
    if (pendingBeforeWithdrawal <= 0n) {
      throw new Error(`marketplace purchase did not accrue seller payments: ${target.sellerAddress}`);
    }
    const latestBlock = await provider.getBlock("latest");
    if (!latestBlock) {
      throw new Error("marketplace payment withdrawal could not read the current fork block");
    }
    const withdrawalDeadline = String(latestBlock.timestamp + 3600);
    const withdrawalResponse = await apiCall(
      port,
      "POST",
      "/v1/workflows/withdraw-marketplace-payments",
      {
        apiKey: withdrawalApiKey,
        walletAddress: target.sellerAddress,
        body: { deadline: withdrawalDeadline },
      },
    );
    if (withdrawalResponse.status !== 202) {
      throw new Error(`marketplace payment withdrawal failed: ${JSON.stringify(withdrawalResponse.payload)}`);
    }
    const withdrawalTxHash = extractTxHash(withdrawalResponse.payload);
    if (!withdrawalTxHash) {
      throw new Error(`marketplace payment withdrawal did not return a tx hash: ${JSON.stringify(withdrawalResponse.payload)}`);
    }
    const withdrawalReceipt = await waitForReceipt(provider, withdrawalTxHash, "marketplace payment withdrawal");
    const pendingAfterWithdrawal = await retryRead(
      () => payment.getPendingPayments(target.sellerAddress).then((value: unknown) => BigInt(value as bigint).toString()),
      (value) => value === "0",
      "seller pending payment after withdrawal",
    );

    const output = buildMarketplacePurchaseVerifyOutput({
      classification: "proven working",
      executionResult: "marketplace purchase and seller withdrawal completed with settlement, receipt, and event evidence",
      actors: [withdrawalApiKey, "buyer-key", "read-key"],
      details: {
        target: {
          source: target.source,
          chainId: config.chainId,
          diamond: config.diamondAddress,
          tokenId,
          voiceHash: target.voiceHash,
        },
        actorWallets: {
          seller: target.sellerAddress,
          buyer: buyer.address,
        },
        preState: {
          listing: listingBefore.payload,
          owner: ownerBefore,
          buyerUsdcBalance: buyerBalanceBefore.toString(),
          buyerAllowance: buyerAllowanceBefore.toString(),
        },
        purchase: {
          status: purchaseResponse.status,
          payload: purchaseResponse.payload,
          txHash,
          receipt: {
            status: receipt.status,
            blockNumber: receipt.blockNumber,
          },
        },
        withdrawal: {
          status: withdrawalResponse.status,
          payload: withdrawalResponse.payload,
          txHash: withdrawalTxHash,
          deadline: withdrawalDeadline,
          receipt: {
            status: withdrawalReceipt.status,
            blockNumber: withdrawalReceipt.blockNumber,
          },
          pendingBefore: pendingBeforeWithdrawal.toString(),
          pendingAfter: pendingAfterWithdrawal,
        },
        ...(usdcTokenUpdate ? { usdcTokenUpdate } : {}),
        ...(mevProtectionConfigUpdate ? { mevProtectionConfigUpdate } : {}),
        ...(buybackPauseUpdate ? { buybackPauseUpdate } : {}),
        ...(buybackConfigUpdate ? { buybackConfigUpdate } : {}),
        ...(buybackConfigStructUpdate ? { buybackConfigStructUpdate } : {}),
        ...(claimCommitmentUpdates ? { claimCommitmentUpdates } : {}),
        postState: {
          owner: ownerAfter,
          listing: listingAfter.payload,
          buyerUsdcBalance: (await erc20.balanceOf(buyer.address)).toString(),
          buyerAllowance: (await erc20.allowance(buyer.address, config.diamondAddress)).toString(),
        },
        events: {
          assetPurchased: assetPurchasedEvents.payload,
          paymentDistributed: paymentDistributedEvents.payload,
          assetReleased: assetReleasedEvents.payload,
        },
        notes: forkTimeAdjustment.advanced
          ? {
              localForkTimeAdvance: forkTimeAdjustment,
            }
          : undefined,
      },
    });
    const outputJson = JSON.stringify(output, null, 2);
    const outputPath = getOutputPath();
    writeVerifyReportOutput(outputPath, output);
    console.log(outputJson);
  } finally {
    server.close();
    await provider.destroy();
    if (forkRuntime.forkProcess && forkRuntime.forkProcess.exitCode === null) {
      forkRuntime.forkProcess.kill("SIGTERM");
    }
  }
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
