import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Contract, JsonRpcProvider, Wallet, ZeroAddress, ethers, id } from "ethers";

import { createApiServer } from "../packages/api/src/app.js";
import { facetRegistry } from "../packages/client/src/generated/index.js";
import { loadRepoEnv } from "../packages/client/src/runtime/config.js";

import { isLoopbackRpcUrl, resolveRuntimeConfig, startLocalForkIfNeeded } from "./alchemy-debug-lib.js";
import {
  type FixtureStatus,
  isExpiredListing,
  isPurchaseReadyListing,
  mergeMarketplaceCandidateVoiceHashes,
  rankFundingCandidates,
  selectPreferredMarketplaceFixtureCandidate,
} from "./base-sepolia-operator-setup.helpers.js";

type ApiCallOptions = {
  apiKey?: string;
  body?: unknown;
};

type WalletSpec = {
  label: string;
  privateKey?: string;
};

type RepoEnv = ReturnType<typeof loadRepoEnv>;

type BalanceTopUpResult = {
  funded: boolean;
  balance: string;
  fundingStrategy?: "transfer" | "local-rpc-balance-seed";
  attemptedFunders: Array<{
    label: string;
    address: string;
    spendable: string;
  }>;
  fundingTransactions?: Array<{
    label: string;
    address: string;
    txHash: string;
    amount: string;
  }>;
  blockedReason?: string;
};

type ListingReadback = {
  status: number;
  payload: Record<string, unknown> | null;
};

export type MarketplaceFixtureCandidate = {
  voiceHash: string;
  tokenId: string;
  listingReadback: ListingReadback;
};

export type AgedListingFixture = {
  voiceHash: string | null;
  tokenId: string | null;
  activeListing: boolean;
  purchaseReadiness: "unverified" | "listed-not-yet-purchase-proven" | "purchase-ready";
  status: FixtureStatus;
  reason: string;
  approval: unknown;
  listing: {
    submission: unknown;
    readback: unknown;
  } | null;
};

const DEFAULT_NATIVE_MINIMUM = ethers.parseEther("0.00004");
const DEFAULT_USDC_MINIMUM = 25_000_000n;
const RUNTIME_DIR = path.resolve(".runtime");
const OUTPUT_PATH = path.join(RUNTIME_DIR, "base-sepolia-operator-fixtures.json");

export async function nativeTransferSpendable(wallet: Wallet): Promise<bigint> {
  const [balance, feeData] = await Promise.all([
    wallet.provider!.getBalance(wallet.address),
    wallet.provider!.getFeeData(),
  ]);
  const maxFeePerGas = feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n;
  const reserve = ethers.parseEther("0.000001") + maxFeePerGas * 21_000n;
  return balance > reserve ? balance - reserve : 0n;
}

export function toJsonValue(value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map((entry) => toJsonValue(entry));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, toJsonValue(entry)]));
  }
  return value;
}

export async function apiCall(port: number, method: string, route: string, options: ApiCallOptions = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${route}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(options.apiKey ? { "x-api-key": options.apiKey } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const payload = await response.json().catch(() => null);
  return { status: response.status, payload };
}

export function extractTxHash(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    throw new Error("missing tx payload");
  }
  const txHash = (payload as Record<string, unknown>).txHash;
  if (typeof txHash !== "string" || !txHash.startsWith("0x")) {
    throw new Error("missing txHash");
  }
  return txHash;
}

export async function waitForReceipt(port: number, txHash: string): Promise<void> {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const response = await apiCall(port, "GET", `/v1/transactions/${txHash}`, { apiKey: "read-key" });
    const receipt = response.payload && typeof response.payload === "object"
      ? (response.payload as Record<string, unknown>).receipt as { status?: number | string } | undefined
      : undefined;
    if (response.status === 200 && receipt) {
      const status = receipt.status;
      if (status === 1 || status === "1") {
        return;
      }
      throw new Error(`transaction reverted: ${txHash}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`timed out waiting for receipt ${txHash}`);
}

export async function retryApiRead<T>(
  read: () => Promise<T>,
  condition: (value: T) => boolean,
  attempts = 10,
  delayMs = 1_000,
): Promise<T> {
  let lastValue: T | null = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    lastValue = await read();
    if (condition(lastValue)) {
      return lastValue;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  if (lastValue === null) {
    throw new Error("retryApiRead received no values");
  }
  return lastValue;
}

export function roleId(name: string): string {
  return id(name);
}

export function createEmptyAgedListingFixture(): AgedListingFixture {
  return {
    voiceHash: null,
    tokenId: null,
    activeListing: false,
    purchaseReadiness: "unverified",
    status: "blocked",
    reason: "missing aged seller asset",
    approval: null,
    listing: null,
  };
}

export function createPreferredMarketplaceFixture(
  preferredCandidate: MarketplaceFixtureCandidate,
  latestTimestamp: bigint,
): AgedListingFixture {
  const activeListing = preferredCandidate.listingReadback.status === 200 &&
    preferredCandidate.listingReadback.payload?.isActive === true;
  const listingExpired = isExpiredListing(preferredCandidate.listingReadback.payload, latestTimestamp);
  const purchaseReady = isPurchaseReadyListing(preferredCandidate.listingReadback.payload, latestTimestamp);
  return {
    voiceHash: preferredCandidate.voiceHash,
    tokenId: preferredCandidate.tokenId,
    activeListing,
    purchaseReadiness: purchaseReady
      ? "purchase-ready"
      : activeListing && !listingExpired
        ? "listed-not-yet-purchase-proven"
        : "unverified",
    status: purchaseReady
      ? "ready"
      : activeListing
        ? listingExpired
          ? "blocked"
          : "partial"
        : "blocked",
    reason: purchaseReady
      ? "listing is active and older than the marketplace contract's 1 day trading lock"
      : activeListing
        ? listingExpired
          ? "listing remains active in readback, but its expiration time has already passed"
          : "active listing exists, but it is still within the marketplace contract's 1 day trading lock"
        : "seller owns aged assets, but none currently have an active listing",
    approval: null,
    listing: {
      submission: null,
      readback: preferredCandidate.listingReadback,
    },
  };
}

export function createFallbackMarketplaceFixture(
  fallbackAsset: { voiceHash: string; tokenId: string },
  submission: unknown,
  refreshedListing: ListingReadback,
  approval: unknown,
): AgedListingFixture {
  const activeListing = refreshedListing.status === 200 && refreshedListing.payload?.isActive === true;
  return {
    voiceHash: fallbackAsset.voiceHash,
    tokenId: fallbackAsset.tokenId,
    activeListing,
    purchaseReadiness: activeListing ? "listed-not-yet-purchase-proven" : "unverified",
    status: activeListing ? "partial" : "blocked",
    reason: activeListing
      ? "listing was activated during setup, but it is still within the marketplace contract's 1 day trading lock"
      : "listing could not be activated",
    approval,
    listing: {
      submission,
      readback: refreshedListing,
    },
  };
}

export function createInactivePreferredMarketplaceFixture(
  preferredCandidate: MarketplaceFixtureCandidate,
  approval: unknown,
): AgedListingFixture {
  return {
    voiceHash: preferredCandidate.voiceHash,
    tokenId: preferredCandidate.tokenId,
    activeListing: false,
    purchaseReadiness: "unverified",
    status: "blocked",
    reason: "seller owns aged assets, but none currently have an active listing",
    approval,
    listing: {
      submission: null,
      readback: preferredCandidate.listingReadback,
    },
  };
}

export function createGovernanceStatus(args: {
  founderAddress: string;
  proposerRolePresent: boolean;
  threshold: bigint;
  currentVotes: bigint;
  currentVotesAfterSetup: bigint;
  tokenBalance: bigint;
  mintingFinished: boolean;
}): Record<string, unknown> {
  const status = args.currentVotesAfterSetup >= args.threshold && args.proposerRolePresent ? "ready" : "partial";
  return {
    proposerAddress: args.founderAddress,
    proposerRolePresent: args.proposerRolePresent,
    threshold: args.threshold.toString(),
    currentVotes: args.currentVotes.toString(),
    tokenBalance: args.tokenBalance.toString(),
    mintingFinished: args.mintingFinished,
    bootstrapRepairAttempted: false,
    currentVotesAfterSetup: args.currentVotesAfterSetup.toString(),
    status,
    reason: status === "ready"
      ? "promoted baseline already provides proposer role access and founder voting power"
      : "promoted baseline is expected to be ready without API-side bootstrap repair; inspect live role or voting power state",
  };
}

export async function ensureNativeBalance(
  funders: Wallet[],
  funderLabels: Map<string, string>,
  target: Wallet,
  minimum: bigint,
  rpcUrl?: string,
): Promise<BalanceTopUpResult> {
  const balance = await target.provider!.getBalance(target.address);
  if (balance >= minimum) {
    return {
      funded: false,
      balance: balance.toString(),
      attemptedFunders: [],
    };
  }

  if (rpcUrl && isLoopbackRpcUrl(rpcUrl)) {
    const targetBalance = minimum + ethers.parseEther("0.00001");
    await target.provider!.send("anvil_setBalance", [target.address, ethers.toQuantity(targetBalance)]);
    return {
      funded: true,
      balance: (await target.provider!.getBalance(target.address)).toString(),
      fundingStrategy: "local-rpc-balance-seed",
      attemptedFunders: [],
    };
  }

  let updatedBalance = balance;
  const transfers: NonNullable<BalanceTopUpResult["fundingTransactions"]> = [];
  const rankedFunders = rankFundingCandidates(
    await Promise.all(
      funders.map(async (wallet) => ({
        label: wallet.address.toLowerCase() === target.address.toLowerCase() ? "target" : "candidate",
        address: wallet.address,
        spendable: await nativeTransferSpendable(wallet),
      })),
    ),
    target.address,
  );

  const labeledFunders = rankedFunders.map((candidate) => {
    const funder = funders.find((wallet) => wallet.address.toLowerCase() === candidate.address.toLowerCase());
    return {
      label:
        funder === undefined
          ? candidate.label
          : funderLabels.get(funder.address.toLowerCase()) ?? candidate.label,
      address: candidate.address,
      spendable: candidate.spendable,
      wallet: funder!,
    };
  });

  for (const funder of labeledFunders) {
    if (updatedBalance >= minimum) {
      break;
    }
    const deficit = minimum - updatedBalance + ethers.parseEther("0.00001");
    const amount = funder.spendable >= deficit ? deficit : funder.spendable;
    if (amount <= 0n) {
      continue;
    }
    const receipt = await (await funder.wallet.sendTransaction({ to: target.address, value: amount })).wait();
    if (!receipt || receipt.status !== 1) {
      continue;
    }
    transfers.push({
      label: funder.label,
      address: funder.address,
      txHash: receipt.hash,
      amount: amount.toString(),
    });
    updatedBalance = await target.provider!.getBalance(target.address);
  }

  const aggregateSpendable = labeledFunders.reduce((sum, funder) => sum + funder.spendable, 0n);
  const remainingDeficit = updatedBalance >= minimum ? 0n : minimum - updatedBalance;
  return {
    funded: transfers.length > 0,
    balance: updatedBalance.toString(),
    ...(transfers.length > 0 ? { fundingStrategy: "transfer" as const } : {}),
    attemptedFunders: labeledFunders.map((funder) => ({
      label: funder.label,
      address: funder.address,
      spendable: funder.spendable.toString(),
    })),
    ...(transfers.length > 0 ? { fundingTransactions: transfers } : {}),
    ...(remainingDeficit > 0n
      ? {
          blockedReason: `insufficient aggregate spendable balance for ${target.address}: need ${remainingDeficit.toString()} additional wei, all available funders expose ${aggregateSpendable.toString()} wei spendable`,
        }
      : {}),
  };
}

export async function ensureRole(
  port: number,
  role: string,
  account: string,
): Promise<{ status: "present" | "granted" | "failed"; error?: string }> {
  const current = await apiCall(
    port,
    "GET",
    `/v1/access-control/queries/has-role?role=${encodeURIComponent(role)}&account=${encodeURIComponent(account)}`,
    { apiKey: "read-key" },
  );
  if (current.status === 200 && current.payload === true) {
    return { status: "present" };
  }
  const grant = await apiCall(port, "POST", "/v1/access-control/admin/grant-role", {
    apiKey: "founder-key",
    body: { role, account, expiryTime: ethers.MaxUint256.toString() },
  });
  if (grant.status !== 202) {
    return { status: "failed", error: JSON.stringify(grant.payload) };
  }
  await waitForReceipt(port, extractTxHash(grant.payload));
  return { status: "granted" };
}

type SetupStatus = {
  actors: Record<string, unknown>;
  setup: { status: string; blockers: string[] };
  marketplace: Record<string, unknown>;
  governance?: Record<string, unknown>;
  licensing?: Record<string, unknown>;
};

export type WalletContext = {
  founderSpec: WalletSpec;
  sellerSpec: WalletSpec;
  buyerSpec: WalletSpec;
  licenseeSpec: WalletSpec;
  transfereeSpec: WalletSpec;
  availableSpecs: WalletSpec[];
  availableSpecsForFunding: Map<string, string>;
  founder: Wallet;
  seller: Wallet;
  buyer: Wallet | null;
  licensee: Wallet | null;
  transferee: Wallet | null;
  fundingWallets: Wallet[];
};

function assignActorTopUp(
  status: SetupStatus,
  actorLabel: string,
  topUp: BalanceTopUpResult,
): void {
  status.actors[actorLabel] = {
    ...(status.actors[actorLabel] as Record<string, unknown> | undefined),
    nativeTopUp: topUp,
    nativeBalanceAfterSetup: topUp.balance,
  };
  if (topUp.blockedReason) {
    status.setup.blockers.push(`${actorLabel}: ${topUp.blockedReason}`);
  }
}

export async function applyNativeSetupTopUps(args: {
  status: SetupStatus;
  fundingWallets: Wallet[];
  availableSpecsForFunding: Map<string, string>;
  founder: Wallet;
  seller: Wallet;
  buyer: Wallet | null;
  licensee: Wallet | null;
  transferee: Wallet | null;
  rpcUrl: string;
  ensureNativeBalanceFn?: typeof ensureNativeBalance;
}): Promise<void> {
  const ensureBalance = args.ensureNativeBalanceFn ?? ensureNativeBalance;

  const founderTopUp = await ensureBalance(
    args.fundingWallets,
    args.availableSpecsForFunding,
    args.founder,
    ethers.parseEther("0.00005"),
    args.rpcUrl,
  );
  assignActorTopUp(args.status, "founder", founderTopUp);

  for (const [actorLabel, wallet, minimum] of [
    ["seller", args.seller, ethers.parseEther("0.00005")],
    ["buyer", args.buyer],
    ["licensee", args.licensee],
    ["transferee", args.transferee],
  ].map((entry) => [entry[0], entry[1], entry[2] ?? DEFAULT_NATIVE_MINIMUM] as const)) {
    if (!wallet) {
      continue;
    }
    const topUp = await ensureBalance(
      args.fundingWallets,
      args.availableSpecsForFunding,
      wallet,
      minimum,
      args.rpcUrl,
    );
    assignActorTopUp(args.status, actorLabel, topUp);
  }

  args.status.setup.status = args.status.setup.blockers.length > 0 ? "blocked" : "ready";
}

export function buildWalletContext(env: RepoEnv, provider: JsonRpcProvider): WalletContext {
  const founderSpec: WalletSpec = { label: "founder", privateKey: env.PRIVATE_KEY };
  const sellerSpec: WalletSpec = { label: "seller", privateKey: env.ORACLE_SIGNER_PRIVATE_KEY_1 ?? env.ORACLE_WALLET_PRIVATE_KEY ?? env.PRIVATE_KEY };
  const buyerSpec: WalletSpec = { label: "buyer", privateKey: env.ORACLE_SIGNER_PRIVATE_KEY_2 };
  const licenseeSpec: WalletSpec = { label: "licensee", privateKey: env.ORACLE_SIGNER_PRIVATE_KEY_3 };
  const transfereeSpec: WalletSpec = { label: "transferee", privateKey: env.ORACLE_SIGNER_PRIVATE_KEY_4 };
  const availableSpecs = [founderSpec, sellerSpec, buyerSpec, licenseeSpec, transfereeSpec].filter((entry) => entry.privateKey);
  if (!founderSpec.privateKey) {
    throw new Error("missing PRIVATE_KEY in repo .env");
  }

  const founder = new Wallet(founderSpec.privateKey, provider);
  const seller = new Wallet(sellerSpec.privateKey!, provider);
  const buyer = buyerSpec.privateKey ? new Wallet(buyerSpec.privateKey, provider) : null;
  const licensee = licenseeSpec.privateKey ? new Wallet(licenseeSpec.privateKey, provider) : null;
  const transferee = transfereeSpec.privateKey ? new Wallet(transfereeSpec.privateKey, provider) : null;

  const availableSpecsForFunding = new Map(
    availableSpecs.map((entry) => {
      const wallet = new Wallet(entry.privateKey!, provider);
      return [wallet.address.toLowerCase(), entry.label] as const;
    }),
  );
  const fundingWallets = [founder, seller, buyer, licensee, transferee].filter((wallet): wallet is Wallet => wallet !== null);

  return {
    founderSpec,
    sellerSpec,
    buyerSpec,
    licenseeSpec,
    transfereeSpec,
    availableSpecs,
    availableSpecsForFunding,
    founder,
    seller,
    buyer,
    licensee,
    transferee,
    fundingWallets,
  };
}

export function setApiLayerActorEnvironment(args: {
  founder: Wallet;
  seller: Wallet;
  buyer: Wallet | null;
  licensee: Wallet | null;
  transferee: Wallet | null;
}): void {
  process.env.API_LAYER_KEYS_JSON = JSON.stringify({
    "founder-key": { label: "founder", signerId: "founder", roles: ["service"], allowGasless: false },
    "read-key": { label: "reader", roles: ["service"], allowGasless: false },
    ...(args.seller ? { "seller-key": { label: "seller", signerId: "seller", roles: ["service"], allowGasless: false } } : {}),
    ...(args.buyer ? { "buyer-key": { label: "buyer", signerId: "buyer", roles: ["service"], allowGasless: false } } : {}),
    ...(args.licensee ? { "licensee-key": { label: "licensee", signerId: "licensee", roles: ["service"], allowGasless: false } } : {}),
    ...(args.transferee ? { "transferee-key": { label: "transferee", signerId: "transferee", roles: ["service"], allowGasless: false } } : {}),
  });
  process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({
    founder: args.founder.privateKey,
    seller: args.seller.privateKey,
    ...(args.buyer ? { buyer: args.buyer.privateKey } : {}),
    ...(args.licensee ? { licensee: args.licensee.privateKey } : {}),
    ...(args.transferee ? { transferee: args.transferee.privateKey } : {}),
  });
}

export async function buildUsdcFundingStatus(args: {
  erc20: {
    balanceOf(address: string): Promise<bigint | number | string>;
    allowance(owner: string, spender: string): Promise<bigint | number | string>;
    connect(wallet: Wallet): { transfer(to: string, amount: bigint): Promise<{ wait(): Promise<{ hash?: string | null } | null> }> };
  } | null;
  availableSpecs: WalletSpec[];
  buyer: Wallet | null;
  provider: JsonRpcProvider;
  port: number;
  diamondAddress: string;
  usdcAddress: string | null;
  apiCallFn?: typeof apiCall;
  waitForReceiptFn?: typeof waitForReceipt;
}): Promise<Record<string, unknown> | null> {
  const { buyer, erc20 } = args;
  if (!erc20 || !buyer) {
    return null;
  }

  const callApi = args.apiCallFn ?? apiCall;
  const waitReceipt = args.waitForReceiptFn ?? waitForReceipt;
  const balances = await Promise.all(
    args.availableSpecs.map(async (entry) => {
      const wallet = new Wallet(entry.privateKey!, args.provider);
      return {
        label: entry.label,
        address: wallet.address,
        balance: BigInt(await erc20.balanceOf(wallet.address)),
      };
    }),
  );
  const richest = balances.sort((left, right) => Number(right.balance - left.balance))[0];
  const buyerBalance = BigInt(await erc20.balanceOf(buyer.address));
  const buyerAllowance = BigInt(await erc20.allowance(buyer.address, args.diamondAddress));
  const usdcFunding: Record<string, unknown> = {
    token: args.usdcAddress,
    buyerBalance: buyerBalance.toString(),
    buyerAllowance: buyerAllowance.toString(),
    richestSigner: richest,
  };

  if (
    buyerBalance < DEFAULT_USDC_MINIMUM &&
    richest &&
    richest.balance > DEFAULT_USDC_MINIMUM &&
    richest.address.toLowerCase() !== buyer.address.toLowerCase()
  ) {
    const richestSpec = args.availableSpecs.find((entry) => entry.label === richest.label)!;
    const richestWallet = new Wallet(richestSpec.privateKey!, args.provider);
    const transferReceipt = await (await erc20.connect(richestWallet).transfer(buyer.address, DEFAULT_USDC_MINIMUM - buyerBalance)).wait();
    usdcFunding.transferTxHash = transferReceipt?.hash ?? null;
    usdcFunding.buyerBalanceAfterTransfer = (await erc20.balanceOf(buyer.address)).toString();
  }

  const refreshedBuyerBalance = BigInt(await erc20.balanceOf(buyer.address));
  if (refreshedBuyerBalance > 0n && BigInt(await erc20.allowance(buyer.address, args.diamondAddress)) < refreshedBuyerBalance) {
    const approve = await callApi(args.port, "POST", "/v1/tokenomics/commands/token-approve", {
      apiKey: "buyer-key",
      body: { spender: args.diamondAddress, amount: refreshedBuyerBalance.toString() },
    });
    usdcFunding.approval = approve;
    if (approve.status === 202) {
      await waitReceipt(args.port, extractTxHash(approve.payload));
    }
    usdcFunding.buyerAllowanceAfterApproval = (await erc20.allowance(buyer.address, args.diamondAddress)).toString();
  }

  return usdcFunding;
}

export async function collectSellerEscrowedVoiceHashes(args: {
  escrowVoiceHashes: string[];
  voiceAsset: { getTokenId(voiceHash: string): Promise<unknown> };
  escrow: { getOriginalOwner(tokenId: unknown): Promise<unknown> };
  sellerAddress: string;
}): Promise<string[]> {
  const sellerEscrowedVoiceHashes: string[] = [];
  for (const voiceHash of args.escrowVoiceHashes) {
    const tokenId = await args.voiceAsset.getTokenId(voiceHash);
    try {
      const originalOwner = await args.escrow.getOriginalOwner(tokenId);
      if (String(originalOwner).toLowerCase() === args.sellerAddress.toLowerCase()) {
        sellerEscrowedVoiceHashes.push(voiceHash);
      }
    } catch {
      continue;
    }
  }
  return sellerEscrowedVoiceHashes;
}

export async function prepareAgedListingFixture(args: {
  candidateVoiceHashes: string[];
  voiceAsset: {
    getVoiceAsset(voiceHash: string): Promise<{ createdAt: bigint | number | string }>;
    getTokenId(voiceHash: string): Promise<{ toString(): string } | bigint | number | string>;
  };
  sellerAddress: string;
  diamondAddress: string;
  port: number;
  latestTimestamp: bigint;
  apiCallFn?: typeof apiCall;
  waitForReceiptFn?: typeof waitForReceipt;
  retryApiReadFn?: typeof retryApiRead;
}): Promise<AgedListingFixture> {
  const callApi = args.apiCallFn ?? apiCall;
  const waitReceipt = args.waitForReceiptFn ?? waitForReceipt;
  const retryRead = args.retryApiReadFn ?? retryApiRead;
  const agedFixture = createEmptyAgedListingFixture();
  const marketplaceCandidates: MarketplaceFixtureCandidate[] = [];
  let fallbackAsset: { voiceHash: string; tokenId: string } | null = null;

  for (const voiceHash of args.candidateVoiceHashes) {
    const asset = await args.voiceAsset.getVoiceAsset(voiceHash);
    if (BigInt(asset.createdAt) > args.latestTimestamp) {
      continue;
    }

    const tokenId = await args.voiceAsset.getTokenId(voiceHash);
    const tokenIdString = tokenId.toString();
    if (!fallbackAsset) {
      fallbackAsset = { voiceHash, tokenId: tokenIdString };
    }

    const approvalRead = await callApi(
      args.port,
      "GET",
      `/v1/voice-assets/queries/is-approved-for-all?owner=${encodeURIComponent(args.sellerAddress)}&operator=${encodeURIComponent(args.diamondAddress)}`,
      { apiKey: "read-key" },
    );
    if (approvalRead.payload !== true) {
      const approval = await callApi(args.port, "PATCH", "/v1/voice-assets/commands/set-approval-for-all", {
        apiKey: "seller-key",
        body: { operator: args.diamondAddress, approved: true },
      });
      agedFixture.approval = approval;
      if (approval.status === 202) {
        await waitReceipt(args.port, extractTxHash(approval.payload));
      }
    }

    const listingRead = await callApi(
      args.port,
      "GET",
      `/v1/marketplace/queries/get-listing?tokenId=${encodeURIComponent(tokenIdString)}`,
      { apiKey: "read-key" },
    );
    const listingPayload = listingRead.status === 200 && listingRead.payload && typeof listingRead.payload === "object"
      ? listingRead.payload as Record<string, unknown>
      : null;
    marketplaceCandidates.push({
      voiceHash,
      tokenId: tokenIdString,
      listingReadback: {
        status: listingRead.status,
        payload: listingPayload,
      },
    });
    if (isPurchaseReadyListing(listingPayload, args.latestTimestamp)) {
      break;
    }
  }

  const preferredCandidate = selectPreferredMarketplaceFixtureCandidate(marketplaceCandidates, args.latestTimestamp);
  if (preferredCandidate && preferredCandidate.listingReadback.payload?.isActive === true) {
    Object.assign(agedFixture, createPreferredMarketplaceFixture(preferredCandidate, args.latestTimestamp));
    return agedFixture;
  }

  if (fallbackAsset) {
    const listing = await callApi(args.port, "POST", "/v1/marketplace/commands/list-asset", {
      apiKey: "seller-key",
      body: { tokenId: fallbackAsset.tokenId, price: "1000", duration: "0" },
    });
    agedFixture.listing = listing;
    if (listing.status === 202) {
      await waitReceipt(args.port, extractTxHash(listing.payload));
    }
    const refreshedListing = await retryRead(
      () => callApi(
        args.port,
        "GET",
        `/v1/marketplace/queries/get-listing?tokenId=${encodeURIComponent(fallbackAsset.tokenId)}`,
        { apiKey: "read-key" },
      ),
      (response) => response.status === 200 && (response.payload as Record<string, unknown> | null)?.isActive === true,
    );
    Object.assign(agedFixture, createFallbackMarketplaceFixture(
      fallbackAsset,
      listing,
      {
        status: refreshedListing.status,
        payload: refreshedListing.payload as Record<string, unknown> | null,
      },
      agedFixture.approval,
    ));
    return agedFixture;
  }

  return agedFixture;
}

export function createLicensingStatus(args: {
  sellerAddress: string;
  licenseeAddress: string | null;
  transfereeAddress: string | null;
}): Record<string, unknown> {
  return {
    lifecycle: {
      activeLicenseLifecycle: "issueLicense/createLicense -> getLicenseTerms/transferLicense as licensee-scoped operations",
    },
    recommendedActors: {
      licensor: args.sellerAddress,
      licensee: args.licenseeAddress,
      transferee: args.transfereeAddress,
    },
  };
}

export function applyDomainSetupStatus(
  status: SetupStatus,
  domain: string,
  domainStatus: FixtureStatus,
  reason: string,
): void {
  if (domainStatus === "ready") {
    return;
  }

  const blocker = `${domain}: ${reason}`;
  if (!status.setup.blockers.includes(blocker)) {
    status.setup.blockers.push(blocker);
  }

  if (domainStatus === "blocked") {
    status.setup.status = "blocked";
    return;
  }

  if (status.setup.status !== "blocked") {
    status.setup.status = "partial";
  }
}

export async function createInitialStatus(args: {
  chainId: number;
  fixtureRpcUrl: string;
  runtimeRpcUrl: string;
  forkedFrom: string | null;
  diamondAddress: string;
  availableSpecs: WalletSpec[];
  provider: { getBalance(address: string): Promise<bigint> };
}): Promise<Record<string, unknown>> {
  const status: Record<string, unknown> = {
    generatedAt: new Date().toISOString(),
    network: {
      chainId: args.chainId,
      rpcUrl: args.fixtureRpcUrl,
      upstreamRpcUrl: args.fixtureRpcUrl,
      runtimeRpcUrl: args.runtimeRpcUrl,
      forkedFrom: args.forkedFrom,
      diamondAddress: args.diamondAddress,
    },
    setup: {
      status: "ready",
      blockers: [] as string[],
    },
    actors: {},
    marketplace: {},
    governance: {},
    licensing: {},
  };

  for (const entry of args.availableSpecs) {
    const wallet = new Wallet(entry.privateKey!, args.provider as JsonRpcProvider);
    (status.actors as Record<string, unknown>)[entry.label] = {
      address: wallet.address,
      nativeBalance: (await args.provider.getBalance(wallet.address)).toString(),
    };
  }

  return status;
}

export async function populateSetupStatus(args: {
  status: SetupStatus;
  fundingWallets: Wallet[];
  availableSpecsForFunding: Map<string, string>;
  founder: Wallet;
  seller: Wallet;
  buyer: Wallet | null;
  licensee: Wallet | null;
  transferee: Wallet | null;
  rpcUrl: string;
  erc20: {
    balanceOf(address: string): Promise<bigint | number | string>;
    allowance(owner: string, spender: string): Promise<bigint | number | string>;
    connect(wallet: Wallet): { transfer(to: string, amount: bigint): Promise<{ wait(): Promise<{ hash?: string | null } | null> }> };
  } | null;
  availableSpecs: WalletSpec[];
  provider: JsonRpcProvider & { getBlock(blockTag: string): Promise<{ timestamp?: number | string | bigint } | null> };
  port: number;
  diamondAddress: string;
  usdcAddress: string | null;
  voiceAsset: {
    getVoiceAssetsByOwner(address: string): Promise<string[]>;
    getVoiceAsset(voiceHash: string): Promise<{ createdAt: bigint | number | string }>;
    getTokenId(voiceHash: string): Promise<{ toString(): string } | bigint | number | string>;
  };
  escrow: { getOriginalOwner(tokenId: unknown): Promise<unknown> };
  accessControl: { hasRole(role: string, account: string): Promise<boolean> };
  governorFacet: { getVotingConfig(): Promise<Array<bigint | number | string>> };
  delegationFacet: { getCurrentVotes(account: string): Promise<bigint | number | string> };
  tokenSupply: {
    tokenBalanceOf(account: string): Promise<bigint | number | string>;
    supplyIsMintingFinished(): Promise<boolean>;
  };
  applyNativeSetupTopUpsFn?: typeof applyNativeSetupTopUps;
  buildUsdcFundingStatusFn?: typeof buildUsdcFundingStatus;
  collectSellerEscrowedVoiceHashesFn?: typeof collectSellerEscrowedVoiceHashes;
  prepareAgedListingFixtureFn?: typeof prepareAgedListingFixture;
}): Promise<void> {
  const applyTopUps = args.applyNativeSetupTopUpsFn ?? applyNativeSetupTopUps;
  const buildUsdcStatus = args.buildUsdcFundingStatusFn ?? buildUsdcFundingStatus;
  const collectEscrowedVoiceHashes = args.collectSellerEscrowedVoiceHashesFn ?? collectSellerEscrowedVoiceHashes;
  const prepareFixture = args.prepareAgedListingFixtureFn ?? prepareAgedListingFixture;

  await applyTopUps({
    status: args.status,
    fundingWallets: args.fundingWallets,
    availableSpecsForFunding: args.availableSpecsForFunding,
    founder: args.founder,
    seller: args.seller,
    buyer: args.buyer,
    licensee: args.licensee,
    transferee: args.transferee,
    rpcUrl: args.rpcUrl,
  });

  const usdcFunding = await buildUsdcStatus({
    erc20: args.erc20,
    availableSpecs: args.availableSpecs,
    buyer: args.buyer,
    provider: args.provider,
    port: args.port,
    diamondAddress: args.diamondAddress,
    usdcAddress: args.usdcAddress,
  });
  if (usdcFunding) {
    args.status.marketplace = {
      ...(args.status.marketplace as Record<string, unknown>),
      usdcFunding,
    };
  }

  const sellerVoiceHashes = await args.voiceAsset.getVoiceAssetsByOwner(args.seller.address);
  const escrowVoiceHashes = await args.voiceAsset.getVoiceAssetsByOwner(args.diamondAddress);
  const sellerEscrowedVoiceHashes = await collectEscrowedVoiceHashes({
    escrowVoiceHashes,
    voiceAsset: args.voiceAsset as unknown as { getTokenId(voiceHash: string): Promise<unknown> },
    escrow: args.escrow,
    sellerAddress: args.seller.address,
  });
  const candidateVoiceHashes = mergeMarketplaceCandidateVoiceHashes(
    [...sellerVoiceHashes],
    sellerEscrowedVoiceHashes,
  );
  const latestBlock = await args.provider.getBlock("latest");
  const latestTimestamp = BigInt(latestBlock?.timestamp ?? Math.floor(Date.now() / 1_000));
  const agedFixture = await prepareFixture({
    candidateVoiceHashes,
    voiceAsset: args.voiceAsset,
    sellerAddress: args.seller.address,
    diamondAddress: args.diamondAddress,
    port: args.port,
    latestTimestamp,
  });
  args.status.marketplace = {
    ...(args.status.marketplace as Record<string, unknown>),
    agedListingFixture: agedFixture,
  };
  applyDomainSetupStatus(args.status, "marketplace", agedFixture.status, agedFixture.reason);

  const proposerRole = roleId("PROPOSER_ROLE");
  const votingConfig = await args.governorFacet.getVotingConfig();
  const threshold = BigInt(votingConfig[2]);
  const proposerRolePresent = await args.accessControl.hasRole(proposerRole, args.founder.address);
  const currentVotes = BigInt(await args.delegationFacet.getCurrentVotes(args.founder.address));
  const tokenBalance = BigInt(await args.tokenSupply.tokenBalanceOf(args.founder.address));
  const mintingFinished = await args.tokenSupply.supplyIsMintingFinished();
  const currentVotesAfterSetup = BigInt(await args.delegationFacet.getCurrentVotes(args.founder.address));
  args.status.governance = createGovernanceStatus({
    founderAddress: args.founder.address,
    proposerRolePresent,
    threshold,
    currentVotes,
    currentVotesAfterSetup,
    tokenBalance,
    mintingFinished,
  });
  applyDomainSetupStatus(
    args.status,
    "governance",
    args.status.governance.status === "ready" ? "ready" : "partial",
    String(args.status.governance.reason ?? "governance baseline requires additional setup"),
  );

  args.status.licensing = createLicensingStatus({
    sellerAddress: args.seller.address,
    licenseeAddress: args.licensee?.address ?? null,
    transfereeAddress: args.transferee?.address ?? null,
  });
}

export async function persistSetupStatus(
  status: Record<string, unknown>,
  args: {
    mkdirFn?: typeof mkdir;
    writeFileFn?: typeof writeFile;
    logFn?: (message: string) => void;
  } = {},
): Promise<void> {
  const mkdirFn = args.mkdirFn ?? mkdir;
  const writeFileFn = args.writeFileFn ?? writeFile;
  const logFn = args.logFn ?? console.log;
  const serialized = `${JSON.stringify(toJsonValue(status), null, 2)}\n`;
  await mkdirFn(RUNTIME_DIR, { recursive: true });
  await writeFileFn(OUTPUT_PATH, serialized, "utf8");
  logFn(JSON.stringify(toJsonValue(status), null, 2));
}

export async function main(): Promise<void> {
  const env = loadRepoEnv();
  const runtimeConfig = await resolveRuntimeConfig(env);
  const forkRuntime = await startLocalForkIfNeeded(runtimeConfig);
  const { config } = runtimeConfig;
  process.env.RPC_URL = forkRuntime.rpcUrl;
  process.env.ALCHEMY_RPC_URL = config.alchemyRpcUrl;
  const provider = new JsonRpcProvider(forkRuntime.rpcUrl, config.chainId);
  const walletContext = buildWalletContext(env, provider);
  setApiLayerActorEnvironment(walletContext);

  const server = createApiServer({ port: 0 }).listen();
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 8787;

  try {
    const voiceAsset = new Contract(config.diamondAddress, facetRegistry.VoiceAssetFacet.abi, provider);
    const payment = new Contract(config.diamondAddress, facetRegistry.PaymentFacet.abi, provider);
    const escrow = new Contract(config.diamondAddress, facetRegistry.EscrowFacet.abi, provider);
    const accessControl = new Contract(config.diamondAddress, facetRegistry.AccessControlFacet.abi, provider);
    const governorFacet = new Contract(config.diamondAddress, facetRegistry.GovernorFacet.abi, provider);
    const proposalFacet = new Contract(config.diamondAddress, facetRegistry.ProposalFacet.abi, provider);
    const delegationFacet = new Contract(config.diamondAddress, facetRegistry.DelegationFacet.abi, provider);
    const tokenSupply = new Contract(config.diamondAddress, facetRegistry.TokenSupplyFacet.abi, provider);

    const usdcAddress = await payment.getUsdcToken();
    const erc20 = usdcAddress && usdcAddress !== ZeroAddress
    ? new Contract(
        usdcAddress,
        [
          "function balanceOf(address) view returns (uint256)",
          "function allowance(address,address) view returns (uint256)",
          "function transfer(address,uint256) returns (bool)",
        ],
        provider,
      )
    : null;
    const status = await createInitialStatus({
      chainId: config.chainId,
      fixtureRpcUrl: !isLoopbackRpcUrl(config.cbdpRpcUrl)
        ? config.cbdpRpcUrl
        : (
            (forkRuntime.forkedFrom && !isLoopbackRpcUrl(forkRuntime.forkedFrom) ? forkRuntime.forkedFrom : null)
            ?? (!isLoopbackRpcUrl(runtimeConfig.rpcResolution.effectiveRpcUrl) ? runtimeConfig.rpcResolution.effectiveRpcUrl : null)
            ?? (!isLoopbackRpcUrl(config.alchemyRpcUrl) ? config.alchemyRpcUrl : null)
            ?? config.cbdpRpcUrl
          ),
      runtimeRpcUrl: forkRuntime.rpcUrl,
      forkedFrom: forkRuntime.forkedFrom ?? null,
      diamondAddress: config.diamondAddress,
      availableSpecs: walletContext.availableSpecs,
      provider,
    });

    await populateSetupStatus({
      status: status as SetupStatus,
      fundingWallets: walletContext.fundingWallets,
      availableSpecsForFunding: walletContext.availableSpecsForFunding,
      founder: walletContext.founder,
      seller: walletContext.seller,
      buyer: walletContext.buyer,
      licensee: walletContext.licensee,
      transferee: walletContext.transferee,
      rpcUrl: forkRuntime.rpcUrl,
      erc20: erc20 as any,
      availableSpecs: walletContext.availableSpecs,
      provider: provider as JsonRpcProvider & { getBlock(blockTag: string): Promise<{ timestamp?: number | string | bigint } | null> },
      port,
      diamondAddress: config.diamondAddress,
      usdcAddress,
      voiceAsset: voiceAsset as unknown as {
        getVoiceAssetsByOwner(address: string): Promise<string[]>;
        getVoiceAsset(voiceHash: string): Promise<{ createdAt: bigint | number | string }>;
        getTokenId(voiceHash: string): Promise<{ toString(): string } | bigint | number | string>;
      },
      escrow: escrow as unknown as { getOriginalOwner(tokenId: unknown): Promise<unknown> },
      accessControl: accessControl as unknown as { hasRole(role: string, account: string): Promise<boolean> },
      governorFacet: governorFacet as unknown as { getVotingConfig(): Promise<Array<bigint | number | string>> },
      delegationFacet: delegationFacet as unknown as { getCurrentVotes(account: string): Promise<bigint | number | string> },
      tokenSupply: tokenSupply as unknown as {
        tokenBalanceOf(account: string): Promise<bigint | number | string>;
        supplyIsMintingFinished(): Promise<boolean>;
      },
    });

    await persistSetupStatus(status);
  } finally {
    server.close();
    forkRuntime.forkProcess?.kill("SIGTERM");
    await provider.destroy();
  }
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
