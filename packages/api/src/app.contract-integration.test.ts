import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";

import { afterAll, beforeAll, beforeEach, describe, expect, it, type TestContext } from "vitest";
import { Contract, JsonRpcProvider, Wallet, ethers, id } from "ethers";

import { createApiServer, type ApiServer } from "./app.js";
import { loadRepoEnv } from "../../client/src/runtime/config.js";
import {
  AccessControlFacet,
  CommunityRewardsFacet,
  DelegationFacet,
  EmergencyFacet,
  GovernorFacet,
  MarketplaceFacet,
  PaymentFacet,
  ProposalFacet,
  TimelockFacet,
  VoiceAssetFacet,
  VoiceDatasetFacet,
  VoiceLicenseFacet,
  VoiceLicenseTemplateFacet,
  VoiceMetadataFacet,
  VotingPowerFacet,
  WhisperBlockFacet,
} from "../../../generated/typechain/index.js";
import { facetRegistry } from "../../client/src/generated/index.js";
import { resolveRuntimeConfig, verifyNetwork } from "../../../scripts/alchemy-debug-lib.js";
import { requireVoiceLicenseCreatedEventRoute } from "../../../scripts/verify-layer1-helpers.js";
import type { ApiExecutionContext } from "./shared/execution-context.js";
import { RateLimiter } from "./shared/rate-limit.js";
import {
  assertConservedDeltas,
  assertExactAmountDelta,
  assertNoEconomicSideEffects,
} from "./workflows/economic-invariants.js";

const repoEnv = loadRepoEnv();
const liveIntegrationEnabled =
  process.env.API_LAYER_RUN_CONTRACT_INTEGRATION === "1" &&
  Boolean(repoEnv.DIAMOND_ADDRESS);

const describeLive = liveIntegrationEnabled ? describe : describe.skip;

type ApiCallOptions = {
  apiKey?: string;
  headers?: Record<string, string>;
  body?: unknown;
};

type ApiResponse = {
  status: number;
  payload: unknown;
};

const originalEnv = { ...process.env };
const keepLocalForkAfterContractIntegration = process.env.API_LAYER_KEEP_LOCAL_FORK === "1";
const preserveForkStateForIndexerProof =
  process.env.API_LAYER_PRESERVE_FORK_STATE_FOR_INDEXER_PROOF === "1";
const ZERO_BYTES32 = `0x${"0".repeat(64)}`;
const HTTP_API_TIMEOUT_MS = 45_000;
const SAFE_READ_ATTEMPTS = 4;
const TX_RECEIPT_POLL_ATTEMPTS = 240;
const TX_RECEIPT_POLL_DELAY_MS = 250;

function isLoopbackRpcUrl(rpcUrl: string): boolean {
  try {
    const parsed = new URL(rpcUrl);
    return parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost";
  } catch {
    return rpcUrl.includes("127.0.0.1") || rpcUrl.includes("localhost");
  }
}

function parseRpcListener(rpcUrl: string): { host: string; port: number } {
  const parsed = new URL(rpcUrl);
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : parsed.protocol === "https:" ? 443 : 80,
  };
}

async function startLocalForkIfNeeded(runtimeConfig: Awaited<ReturnType<typeof resolveRuntimeConfig>>) {
  const configuredRpcUrl = runtimeConfig.rpcResolution.configuredRpcUrl;
  if (
    runtimeConfig.rpcResolution.source !== "base-sepolia-fixture" ||
    !isLoopbackRpcUrl(configuredRpcUrl) ||
    process.env.API_LAYER_AUTO_FORK === "0"
  ) {
    return {
      rpcUrl: runtimeConfig.config.cbdpRpcUrl,
      forkProcess: null as ChildProcessWithoutNullStreams | null,
      forkedFrom: null as string | null,
    };
  }

  try {
    await verifyNetwork(configuredRpcUrl, runtimeConfig.config.chainId);
    return {
      rpcUrl: configuredRpcUrl,
      forkProcess: null as ChildProcessWithoutNullStreams | null,
      forkedFrom: runtimeConfig.config.cbdpRpcUrl,
    };
  } catch {
    // Fall through and spawn a fork when the configured loopback RPC is unavailable.
  }

  const { host, port } = parseRpcListener(configuredRpcUrl);
  const child = spawn(
    process.env.API_LAYER_ANVIL_BIN ?? "anvil",
    [
      "--host",
      host,
      "--port",
      String(port),
      "--chain-id",
      String(runtimeConfig.config.chainId),
      "--fork-url",
      runtimeConfig.config.cbdpRpcUrl,
      "--prune-history",
      "512",
    ],
    {
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    },
  );
  let startupOutput = "";
  child.stdout.on("data", (chunk) => {
    startupOutput += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    startupOutput += chunk.toString();
  });

  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`anvil exited before contract integration bootstrap: ${startupOutput.trim() || child.exitCode}`);
    }
    try {
      await verifyNetwork(configuredRpcUrl, runtimeConfig.config.chainId);
      return {
        rpcUrl: configuredRpcUrl,
        forkProcess: child,
        forkedFrom: runtimeConfig.config.cbdpRpcUrl,
      };
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  child.kill("SIGTERM");
  throw new Error(`timed out waiting for anvil fork on ${configuredRpcUrl}: ${startupOutput.trim()}`);
}

async function apiCall(port: number, method: string, path: string, options: ApiCallOptions = {}) {
  const isSafeRead =
    method === "GET" ||
    path.includes("/queries/") ||
    path.includes("/events/");

  const attempts = isSafeRead ? SAFE_READ_ATTEMPTS : 1;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, {
        method,
        headers: {
          "content-type": "application/json",
          ...(options.apiKey === undefined ? { "x-api-key": "founder-key" } : options.apiKey ? { "x-api-key": options.apiKey } : {}),
          ...(options.headers ?? {}),
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: AbortSignal.timeout(HTTP_API_TIMEOUT_MS),
      });
      const payload = await response.json().catch(() => null);
      return { status: response.status, payload };
    } catch (error) {
      if (!isSafeRead || attempt === attempts - 1) {
        throw error;
      }
      await delay(500);
    }
  }

  throw new Error(`unreachable apiCall retry state for ${method} ${path}`);
}

function normalize(value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map((entry) => normalize(entry));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, normalize(entry)]));
  }
  return value;
}

function extractTxHash(payload: unknown): string {
  const txHash = payload && typeof payload === "object" ? (payload as Record<string, unknown>).txHash : null;
  expect(txHash).toEqual(expect.stringMatching(/^0x[a-fA-F0-9]{64}$/u));
  return String(txHash);
}

async function buildHttpTemplate(
  provider: JsonRpcProvider,
  creator: string,
  name: string,
  overrides: Record<string, unknown> = {},
) {
  const latestBlock = await provider.getBlock("latest");
  const now = String(BigInt(latestBlock?.timestamp ?? Math.floor(Date.now() / 1000)));
  const base = {
    creator,
    isActive: true,
    transferable: true,
    createdAt: now,
    updatedAt: now,
    defaultDuration: String(45n * 24n * 60n * 60n),
    defaultPrice: "15000",
    maxUses: "12",
    name,
    description: `${name} coverage`,
    defaultRights: ["Narration", "Ads"],
    defaultRestrictions: ["no-sublicense"],
    terms: {
      licenseHash: ZERO_BYTES32,
      duration: String(45n * 24n * 60n * 60n),
      price: "15000",
      maxUses: "12",
      transferable: true,
      rights: ["Narration", "Ads"],
      restrictions: ["no-sublicense"],
    },
  };
  return {
    ...base,
    ...overrides,
    terms: {
      ...base.terms,
      ...((overrides.terms as Record<string, unknown> | undefined) ?? {}),
    },
  };
}

function acousticFeaturesToObject(value: unknown): Record<string, unknown> {
  const tuple = value as ArrayLike<unknown>;
  return {
    pitch: normalize(tuple[0]),
    volume: normalize(tuple[1]),
    speechRate: normalize(tuple[2]),
    timbre: normalize(tuple[3]),
    formants: normalize(tuple[4]),
    harmonicsToNoise: normalize(tuple[5]),
    dynamicRange: normalize(tuple[6]),
  };
}

function voiceClassificationsToObject(value: unknown): Record<string, unknown> {
  const tuple = value as ArrayLike<unknown>;
  return {
    analysisVersion: normalize(tuple[0]),
    timestamp: normalize(tuple[1]),
    processingTimeMs: normalize(tuple[2]),
    componentsRun: normalize(tuple[3]),
    categories: normalize(tuple[4]),
  };
}

function geographicDataToObject(value: unknown): Record<string, unknown> {
  const tuple = value as ArrayLike<unknown>;
  return {
    latitude: normalize(tuple[0]),
    longitude: normalize(tuple[1]),
    region: normalize(tuple[2]),
    country: normalize(tuple[3]),
    locality: normalize(tuple[4]),
  };
}

function roleConfigToObject(value: unknown): Record<string, unknown> {
  const tuple = value as ArrayLike<unknown>;
  return {
    memberLimit: normalize(tuple[0]),
    validityPeriod: normalize(tuple[1]),
    minMemberLimit: normalize(tuple[2]),
    quorumBps: normalize(tuple[3]),
    absoluteMinQuorum: normalize(tuple[4]),
    adminRole: normalize(tuple[5]),
    restricted: normalize(tuple[6]),
    revocable: normalize(tuple[7]),
    requiresApproval: normalize(tuple[8]),
    recoveryActive: normalize(tuple[9]),
  };
}

function roleMemberToObject(value: unknown): Record<string, unknown> {
  const tuple = value as ArrayLike<unknown>;
  return {
    expiryTime: normalize(tuple[0]),
    assignedTime: normalize(tuple[1]),
    assignedBlock: normalize(tuple[2]),
    assignedBy: normalize(tuple[3]),
    active: normalize(tuple[4]),
    childRoles: normalize(tuple[5]),
  };
}

function datasetToObject(value: unknown): Record<string, unknown> {
  const tuple = value as ArrayLike<unknown>;
  return {
    id: normalize(tuple[0]),
    title: normalize(tuple[1]),
    assetIds: normalize(tuple[2]),
    licenseTemplateId: normalize(tuple[3]),
    metadataURI: normalize(tuple[4]),
    creator: normalize(tuple[5]),
    royaltyBps: normalize(tuple[6]),
    createdAt: normalize(tuple[7]),
    active: normalize(tuple[8]),
  };
}

function licenseTermsToObject(value: unknown): Record<string, unknown> {
  const tuple = value as ArrayLike<unknown>;
  return {
    licenseHash: normalize(tuple[0]),
    duration: normalize(tuple[1]),
    price: normalize(tuple[2]),
    maxUses: normalize(tuple[3]),
    transferable: normalize(tuple[4]),
    rights: normalize(tuple[5]),
    restrictions: normalize(tuple[6]),
  };
}

function templateToObject(value: unknown): Record<string, unknown> {
  const tuple = value as ArrayLike<unknown>;
  return {
    creator: normalize(tuple[0]),
    isActive: normalize(tuple[1]),
    transferable: normalize(tuple[2]),
    createdAt: normalize(tuple[3]),
    updatedAt: normalize(tuple[4]),
    defaultDuration: normalize(tuple[5]),
    defaultPrice: normalize(tuple[6]),
    maxUses: normalize(tuple[7]),
    name: normalize(tuple[8]),
    description: normalize(tuple[9]),
    defaultRights: normalize(tuple[10]),
    defaultRestrictions: normalize(tuple[11]),
    terms: licenseTermsToObject(tuple[12]),
  };
}

function licenseToObject(value: unknown): Record<string, unknown> {
  const tuple = value as ArrayLike<unknown>;
  return {
    licensee: normalize(tuple[0]),
    isActive: normalize(tuple[1]),
    transferable: normalize(tuple[2]),
    startTime: normalize(tuple[3]),
    endTime: normalize(tuple[4]),
    maxUses: normalize(tuple[5]),
    usageCount: normalize(tuple[6]),
    licenseFee: normalize(tuple[7]),
    usageFee: normalize(tuple[8]),
    templateHash: normalize(tuple[9]),
    termsHash: normalize(tuple[10]),
    rights: normalize(tuple[11]),
    restrictions: normalize(tuple[12]),
    usageRefs: normalize(tuple[13]),
  };
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

function feeConfigToObject(value: unknown): Record<string, unknown> {
  const tuple = value as ArrayLike<unknown>;
  return {
    platformFee: normalize(tuple[0]),
    unionShare: normalize(tuple[1]),
    devFund: normalize(tuple[2]),
    timewaveGift: normalize(tuple[3]),
    referralFee: normalize(tuple[4]),
    milestonePool: normalize(tuple[5]),
  };
}

function rewardCampaignToObject(value: unknown): Record<string, unknown> {
  const tuple = value as ArrayLike<unknown>;
  return {
    merkleRoot: normalize(tuple[0]),
    startTime: normalize(tuple[1]),
    cliffSeconds: normalize(tuple[2]),
    durationSeconds: normalize(tuple[3]),
    tgeUnlockBps: normalize(tuple[4]),
    maxTotalClaimable: normalize(tuple[5]),
    totalClaimed: normalize(tuple[6]),
    paused: normalize(tuple[7]),
  };
}

function proposalTypeConfigToObject(value: unknown): Record<string, unknown> {
  const tuple = value as ArrayLike<unknown>;
  return {
    threshold: normalize(tuple[0]),
    quorum: normalize(tuple[1]),
    votingDelay: normalize(tuple[2]),
    votingPeriod: normalize(tuple[3]),
    executionDelay: normalize(tuple[4]),
  };
}

function timelockOperationToObject(value: unknown): Record<string, unknown> {
  const tuple = value as ArrayLike<unknown>;
  return {
    targets: normalize(tuple[0]),
    values: normalize(tuple[1]),
    calldatas: normalize(tuple[2]),
    predecessor: normalize(tuple[3]),
    salt: normalize(tuple[4]),
    delay: normalize(tuple[5]),
    timestamp: normalize(tuple[6]),
    lastCheckBlock: normalize(tuple[7]),
    executed: normalize(tuple[8]),
    canceled: normalize(tuple[9]),
  };
}

function emergencyIncidentToObject(value: unknown): Record<string, unknown> {
  const tuple = value as ArrayLike<unknown>;
  return {
    id: normalize(tuple[0]),
    incidentType: normalize(tuple[1]),
    description: normalize(tuple[2]),
    reporter: normalize(tuple[3]),
    timestamp: normalize(tuple[4]),
    resolved: normalize(tuple[5]),
    actions: normalize(tuple[6]),
    approvers: normalize(tuple[7]),
    resolutionTime: normalize(tuple[8]),
  };
}

function multisigOperationConfigToObject(value: unknown): Record<string, unknown> {
  const tuple = value as ArrayLike<unknown>;
  return {
    minApprovals: normalize(tuple[0]),
    maxApprovals: normalize(tuple[1]),
    allowsCancellation: normalize(tuple[2]),
  };
}

const whisperStoragePosition = id("speak.voice.whisperblock.storage");

function whisperStorageSlot(offset: number): string {
  return ethers.toBeHex(BigInt(whisperStoragePosition) + BigInt(offset), 32);
}

async function readWhisperConfig(provider: JsonRpcProvider, target: string): Promise<Record<string, unknown>> {
  const packed = BigInt(await provider.getStorage(target, whisperStorageSlot(22)));
  const addressMask = (1n << 160n) - 1n;
  const trustedOracleValue = (packed >> 24n) & addressMask;
  return {
    minKeyStrength: normalize(BigInt(await provider.getStorage(target, whisperStorageSlot(13)))),
    minEntropy: normalize(BigInt(await provider.getStorage(target, whisperStorageSlot(14)))),
    defaultAccessDuration: normalize(BigInt(await provider.getStorage(target, whisperStorageSlot(15)))),
    requireAudit: (packed & 0xffn) !== 0n,
    trustedOracle: ethers.getAddress(ethers.toBeHex(trustedOracleValue, 20)),
  };
}

function extractRevertMarker(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "";
  }
  const candidate = error as { shortMessage?: string; message?: string; data?: unknown; info?: { error?: { data?: unknown } } };
  const directData = typeof candidate.data === "string" ? candidate.data : undefined;
  const nestedData = typeof candidate.info?.error?.data === "string" ? candidate.info.error.data : undefined;
  return directData ?? nestedData ?? candidate.shortMessage ?? candidate.message ?? "";
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitFor<T>(
  read: () => Promise<T>,
  ready: (value: T) => boolean,
  label: string,
  options: { attempts?: number; delayMs?: number } = {},
): Promise<T> {
  const attempts = options.attempts ?? 40;
  const delayMs = options.delayMs ?? 500;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const value = await read();
    if (ready(value)) {
      return value;
    }
    await delay(delayMs);
  }
  throw new Error(`timed out waiting for ${label}`);
}

function payloadError(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }
  const error = (payload as { error?: unknown }).error;
  return typeof error === "string" ? error : "";
}

function isTransientApiFailure(response: ApiResponse): boolean {
  if (response.status === 429) {
    return true;
  }
  if (response.status !== 500) {
    return false;
  }
  return /429|rate limit|upstream|timeout|temporar|too many requests/iu.test(payloadError(response.payload));
}

async function waitForStableApiResponse(
  read: () => Promise<ApiResponse>,
  ready: (response: ApiResponse) => boolean,
  label: string,
): Promise<ApiResponse> {
  return waitFor(
    read,
    (response) => ready(response) || !isTransientApiFailure(response),
    label,
  );
}

describeLive("HTTP API contract integration", () => {
  let server: ReturnType<ApiServer["listen"]>;
  let apiExecutionContext: ApiExecutionContext;
  let port = 0;
  let provider: JsonRpcProvider;
  let founderWallet: Wallet;
  let founderAddress: string;
  let licensingOwnerWallet: Wallet;
  let licensingOwnerAddress: string;
  let fundingWallet: Wallet;
  let fundingWallets: Wallet[] = [];
  let licenseeWallet: Wallet;
  let marketplaceBuyerWallet: Wallet;
  let transfereeWallet: Wallet;
  let outsiderWallet: Wallet;
  let diamondAddress: string;
  let voiceAsset: VoiceAssetFacet;
  let voiceMetadata: VoiceMetadataFacet;
  let accessControl: AccessControlFacet;
  let voiceDataset: VoiceDatasetFacet;
  let templateFacet: VoiceLicenseTemplateFacet;
  let licenseFacet: VoiceLicenseFacet;
  let marketplaceFacet: MarketplaceFacet;
  let paymentFacet: PaymentFacet;
  let governorFacet: GovernorFacet;
  let proposalFacet: ProposalFacet;
  let timelockFacet: TimelockFacet;
  let whisperBlockFacet: WhisperBlockFacet;
  let diamondCutFacet: Contract;
  let diamondLoupeFacet: Contract;
  let upgradeControllerFacet: Contract;
  let emergencyFacet: EmergencyFacet;
  let ownershipFacet: Contract;
  let emergencyWithdrawalFacet: Contract;
  let multisigFacet: Contract;
  let stakingFacet: Contract;
  let delegationFacet: DelegationFacet;
  let tokenSupplyFacet: Contract;
  let vestingFacet: Contract;
  let burnThresholdFacet: Contract;
  let timewaveGiftFacet: Contract;
  let votingPowerFacet: VotingPowerFacet;
  let communityRewardsFacet: CommunityRewardsFacet;
  let primaryVoiceHash = "";
  const nativeTransferReserve = ethers.parseEther("0.000001");
  let activeRpcUrl = "";
  let localForkProcess: ChildProcessWithoutNullStreams | null = null;
  const confirmedTransactionHashes = new Set<string>();
  const oracleFutureDriftProofObservations: Array<Record<string, unknown>> = [];
  const oracleQuorumSignersProofObservations: Array<Record<string, unknown>> = [];
  const oraclePauseProofObservations: Array<Record<string, unknown>> = [];
  const oracleAddressProofObservations: Array<Record<string, unknown>> = [];
  const accessControlPauseProofObservations: Array<Record<string, unknown>> = [];
  const degradedModeConfigProofObservations: Array<Record<string, unknown>> = [];
  const emergencyTimeoutProofObservations: Array<Record<string, unknown>> = [];
  const emergencyWithdrawalProofObservations: Array<Record<string, unknown>> = [];
  const ownershipPolicyProofObservations: Array<Record<string, unknown>> = [];
  const ownershipTargetApprovalProofObservations: Array<Record<string, unknown>> = [];
  const ownershipTransferLifecycleProofObservations: Array<Record<string, unknown>> = [];
  const proposalCancellationProofObservations: Array<Record<string, unknown>> = [];
  const withdrawalRevealProofObservations: Array<Record<string, unknown>> = [];
  const governorVotingPeriodProofObservations: Array<Record<string, unknown>> = [];
  const timelockMinDelayProofObservations: Array<Record<string, unknown>> = [];
  const emergencyForceAddProofObservations: Array<Record<string, unknown>> = [];
  let rolledBackReceiptObservations = 0;

  async function captureReceiptSnapshot() {
    return {
      id: String(await provider.send("evm_snapshot", [])),
      priorHashes: new Set(confirmedTransactionHashes),
    };
  }

  async function restoreReceiptSnapshot(snapshot: Awaited<ReturnType<typeof captureReceiptSnapshot>>): Promise<boolean> {
    const restored = await provider.send("evm_revert", [snapshot.id]);
    if (restored !== true) return false;
    apiExecutionContext.signerNonces.clear();

    // The indexer can ingest only receipts that remain on the active fork.
    for (const hash of confirmedTransactionHashes) {
      if (!snapshot.priorHashes.has(hash)) {
        confirmedTransactionHashes.delete(hash);
        rolledBackReceiptObservations += 1;
      }
    }
    return true;
  }

  async function disableStakingHookForIsolatedUsdcPaymentProof(): Promise<void> {
    const feeManagerRole = id("FEE_MANAGER_ROLE");
    if (!(await accessControl.hasRole(feeManagerRole, founderAddress))) {
      const grantResponse = await apiCall(port, "POST", "/v1/access-control/admin/grant-role", {
        apiKey: "founder-key",
        body: { role: feeManagerRole, account: founderAddress, expiryTime: "0" },
      });
      expect(grantResponse.status, JSON.stringify(grantResponse.payload)).toBe(202);
      await expectReceipt(extractTxHash(grantResponse.payload));
      expect(await accessControl.hasRole(feeManagerRole, founderAddress)).toBe(true);
    }

    const response = await apiCall(port, "PATCH", "/v1/marketplace/commands/set-staking-config", {
      apiKey: "founder-key",
      body: { stakingFacet: ethers.ZeroAddress, stakingAllocationBps: "3000" },
    });
    expect(response.status, JSON.stringify(response.payload)).toBe(202);
    await expectReceipt(extractTxHash(response.payload));
  }

  async function nativeTransferSpendable(wallet: Wallet) {
    const [balance, feeData] = await Promise.all([
      provider.getBalance(wallet.address),
      provider.getFeeData(),
    ]);
    const maxFeePerGas = feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n;
    const estimatedTransferCost = maxFeePerGas * 21_000n;
    const reserve = nativeTransferReserve + estimatedTransferCost;
    return balance > reserve ? balance - reserve : 0n;
  }

  async function expectReceipt(txHash: string) {
    for (let attempt = 0; attempt < TX_RECEIPT_POLL_ATTEMPTS; attempt += 1) {
      const txStatus = await apiCall(port, "GET", `/v1/transactions/${txHash}`, { apiKey: "read-key" });
      const receipt = txStatus.payload && typeof txStatus.payload === "object"
        ? (txStatus.payload as { receipt?: { status?: number; hash?: string; transactionHash?: string } }).receipt
        : undefined;
      if (txStatus.status === 200 && receipt && receipt.status === 1) {
        expect(txStatus.payload).toMatchObject({
          source: expect.stringMatching(/^(rpc|alchemy)$/u),
        });
        expect(receipt.status).toBe(1);
        expect(receipt.hash ?? receipt.transactionHash).toBe(txHash);
        confirmedTransactionHashes.add(txHash);
        return txStatus.payload;
      }

      const directReceipt = await provider.getTransactionReceipt(txHash);
      if (directReceipt?.status === 1) {
        expect(directReceipt.hash).toBe(txHash);
        confirmedTransactionHashes.add(txHash);
        return {
          source: "rpc-direct",
          receipt: {
            hash: directReceipt.hash,
            transactionHash: directReceipt.hash,
            status: directReceipt.status,
            blockNumber: directReceipt.blockNumber,
          },
        };
      }

      await delay(TX_RECEIPT_POLL_DELAY_MS);
    }
    throw new Error(`timed out waiting for tx receipt ${txHash}`);
  }

  async function ensureNativeBalance(address: string, minimumWei: bigint) {
    if (isLoopbackRpcUrl(activeRpcUrl)) {
      const currentBalance = await provider.getBalance(address);
      const targetBalance = (minimumWei > ethers.parseEther("0.02") ? minimumWei : ethers.parseEther("0.02")) + ethers.parseEther("0.005");
      if (currentBalance < targetBalance) {
        await provider.send("anvil_setBalance", [address, ethers.toQuantity(targetBalance)]);
      }
      return;
    }

    let currentBalance = await provider.getBalance(address);
    if (currentBalance >= minimumWei) {
      return;
    }
    const recipient = address.toLowerCase();
    const candidates = (fundingWallets.length > 0
      ? fundingWallets
      : [fundingWallet, founderWallet, licensingOwnerWallet].filter((wallet): wallet is Wallet => Boolean(wallet)))
      .filter((wallet, index, wallets) =>
        wallet.address.toLowerCase() !== recipient &&
        wallets.findIndex((candidate) => candidate.address.toLowerCase() === wallet.address.toLowerCase()) === index,
      );
    if (candidates.length === 0) {
      throw new Error(`no funding wallet available to top up ${address}`);
    }

    while (currentBalance < minimumWei) {
      let funded = false;
      const balances = await Promise.all(candidates.map(async (wallet) => ({
        wallet,
        balance: await provider.getBalance(wallet.address),
        spendable: await nativeTransferSpendable(wallet),
      })));
      balances.sort((left, right) => (left.spendable === right.spendable ? 0 : left.spendable > right.spendable ? -1 : 1));

      for (const { wallet, spendable } of balances) {
        if (spendable <= 0n) {
          continue;
        }
        const remaining = minimumWei - currentBalance;
        const value = spendable >= remaining ? remaining : spendable;
        const receipt = await (await wallet.sendTransaction({ to: address, value })).wait();
        if (!receipt || receipt.status !== 1) {
          throw new Error(`failed to top up ${address} from ${wallet.address}`);
        }
        currentBalance = await provider.getBalance(address);
        funded = true;
        if (currentBalance >= minimumWei) {
          return;
        }
      }

      if (!funded) {
        break;
      }
    }

    throw new Error(`unable to top up ${address} to ${minimumWei.toString()} wei; current balance ${currentBalance.toString()}`);
  }

  async function skipWhenFundingBlocked(
    ctx: TestContext,
    label: string,
    requirements: Array<{ address: string; minimumWei: bigint }>,
  ) {
    const failures: Array<Record<string, string>> = [];

    for (const requirement of requirements) {
      try {
        await ensureNativeBalance(requirement.address, requirement.minimumWei);
      } catch (error) {
        const currentBalance = await provider.getBalance(requirement.address);
        failures.push({
          address: requirement.address,
          minimumWei: requirement.minimumWei.toString(),
          currentBalance: currentBalance.toString(),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (failures.length === 0) {
      return false;
    }

    const recipientSet = new Set(requirements.map((entry) => entry.address.toLowerCase()));
    const candidates = (fundingWallets.length > 0
      ? fundingWallets
      : [fundingWallet, founderWallet, licensingOwnerWallet].filter((wallet): wallet is Wallet => Boolean(wallet)))
      .filter((wallet, index, wallets) =>
        !recipientSet.has(wallet.address.toLowerCase()) &&
        wallets.findIndex((candidate) => candidate.address.toLowerCase() === wallet.address.toLowerCase()) === index,
      );
    const fundingSnapshot = await Promise.all(candidates.map(async (wallet) => ({
      address: wallet.address,
      balance: (await provider.getBalance(wallet.address)).toString(),
      spendable: (await nativeTransferSpendable(wallet)).toString(),
    })));

    console.warn(JSON.stringify({
      level: "warn",
      message: "skipping live write-dependent contract proof due to funding floor",
      test: label,
      failures,
      fundingSnapshot,
    }));
    ctx.skip();
    return true;
  }

  beforeAll(async () => {
    const runtimeEnvironment = await resolveRuntimeConfig(repoEnv);
    const forkRuntime = await startLocalForkIfNeeded(runtimeEnvironment);
    const runtimeConfig = runtimeEnvironment.config;
    const founderPrivateKey = repoEnv.PRIVATE_KEY;
    const licensingOwnerPrivateKey =
      repoEnv.ORACLE_SIGNER_PRIVATE_KEY_1 ??
      repoEnv.ORACLE_WALLET_PRIVATE_KEY ??
      founderPrivateKey;
    const rpcUrl = forkRuntime.rpcUrl;

    if (!founderPrivateKey) {
      throw new Error("missing PRIVATE_KEY in repo .env");
    }
    if (!licensingOwnerPrivateKey) {
      throw new Error("missing ORACLE_SIGNER_PRIVATE_KEY_1 or ORACLE_WALLET_PRIVATE_KEY in repo .env");
    }

    activeRpcUrl = rpcUrl;
    localForkProcess = forkRuntime.forkProcess;
    process.env.RPC_URL = rpcUrl;
    // Keep every API provider on the same isolated fork. A fallback Alchemy URL may
    // otherwise route an HTTP write to Base Sepolia while direct assertions use Anvil.
    process.env.ALCHEMY_RPC_URL = isLoopbackRpcUrl(rpcUrl) ? rpcUrl : runtimeConfig.alchemyRpcUrl;

    const licenseePrivateKey = Wallet.createRandom().privateKey;
    const transfereePrivateKey = Wallet.createRandom().privateKey;
    const outsiderPrivateKey = Wallet.createRandom().privateKey;

    process.env.API_LAYER_KEYS_JSON = JSON.stringify({
      "founder-key": {
        label: "founder",
        signerId: "founder",
        roles: ["service"],
        allowGasless: false,
      },
      "control-plane-proof-a-key": {
        label: "control-plane-proof-a",
        signerId: "founder",
        roles: ["service"],
        allowGasless: false,
      },
      "control-plane-proof-b-key": {
        label: "control-plane-proof-b",
        signerId: "founder",
        roles: ["service"],
        allowGasless: false,
      },
      "payment-proof-key": {
        label: "payment-proof",
        signerId: "founder",
        roles: ["service"],
        allowGasless: false,
      },
      "emergency-proof-key": {
        label: "emergency-proof",
        signerId: "founder",
        roles: ["service"],
        allowGasless: false,
      },
      "delegation-proof-key": {
        label: "delegation-proof",
        signerId: "outsider",
        roles: ["service"],
        allowGasless: false,
      },
      "reward-proof-key": {
        label: "reward-proof",
        signerId: "founder",
        roles: ["service"],
        allowGasless: false,
      },
      "staking-proof-key": {
        label: "staking-proof",
        signerId: "founder",
        roles: ["service"],
        allowGasless: false,
      },
      "ownership-guard-key": {
        label: "ownership-guard",
        signerId: "founder",
        roles: ["service"],
        allowGasless: false,
      },
      "onboard-proof-key": {
        label: "onboard-proof",
        signerId: "founder",
        roles: ["service"],
        allowGasless: false,
      },
      "access-receipt-a-key": {
        label: "access-receipt-a",
        signerId: "founder",
        roles: ["service"],
        allowGasless: false,
      },
      "access-receipt-b-key": {
        label: "access-receipt-b",
        signerId: "founder",
        roles: ["service"],
        allowGasless: false,
      },
      "access-receipt-c-key": {
        label: "access-receipt-c",
        signerId: "founder",
        roles: ["service"],
        allowGasless: false,
      },
      "whisper-workflow-voice-key": {
        label: "whisper-workflow-voice",
        signerId: "founder",
        roles: ["service"],
        allowGasless: false,
      },
      "whisper-workflow-key": {
        label: "whisper-workflow",
        signerId: "founder",
        roles: ["service"],
        allowGasless: false,
      },
      "whisper-restore-key": {
        label: "whisper-restore",
        signerId: "founder",
        roles: ["service"],
        allowGasless: false,
      },
      "read-key": {
        label: "reader",
        roles: ["read-only"],
        allowGasless: false,
      },
      "licensee-key": {
        label: "licensee",
        signerId: "licensee",
        roles: ["service"],
        allowGasless: false,
      },
      "licensing-owner-key": {
        label: "licensing-owner",
        signerId: "licensingOwner",
        roles: ["service"],
        allowGasless: false,
      },
      "transferee-key": {
        label: "transferee",
        signerId: "transferee",
        roles: ["service"],
        allowGasless: false,
      },
      "outsider-key": {
        label: "outsider",
        signerId: "outsider",
        roles: ["service"],
        allowGasless: false,
      },
    });
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({
      founder: founderPrivateKey,
      licensingOwner: licensingOwnerPrivateKey,
      licensee: licenseePrivateKey,
      transferee: transfereePrivateKey,
      outsider: outsiderPrivateKey,
    });

    diamondAddress = runtimeConfig.diamondAddress;
    provider = new JsonRpcProvider(rpcUrl, runtimeConfig.chainId);
    founderWallet = new Wallet(founderPrivateKey, provider);
    founderAddress = await founderWallet.getAddress();
    licensingOwnerWallet = new Wallet(licensingOwnerPrivateKey, provider);
    licensingOwnerAddress = await licensingOwnerWallet.getAddress();
    fundingWallet = founderWallet;
    fundingWallets = [
      founderPrivateKey,
      licensingOwnerPrivateKey,
      repoEnv.ORACLE_SIGNER_PRIVATE_KEY_2,
      repoEnv.ORACLE_SIGNER_PRIVATE_KEY_3,
      repoEnv.ORACLE_SIGNER_PRIVATE_KEY_4,
      repoEnv.ORACLE_WALLET_PRIVATE_KEY,
    ]
      .filter((value, index, array): value is string => typeof value === "string" && value.length > 0 && array.indexOf(value) === index)
      .map((privateKey) => new Wallet(privateKey, provider));
    licenseeWallet = new Wallet(licenseePrivateKey, provider);
    marketplaceBuyerWallet = new Wallet(repoEnv.ORACLE_SIGNER_PRIVATE_KEY_2 ?? licenseePrivateKey, provider);
    transfereeWallet = new Wallet(transfereePrivateKey, provider);
    outsiderWallet = new Wallet(outsiderPrivateKey, provider);

    voiceAsset = new Contract(diamondAddress, facetRegistry.VoiceAssetFacet.abi, provider) as unknown as VoiceAssetFacet;
    voiceMetadata = new Contract(diamondAddress, facetRegistry.VoiceMetadataFacet.abi, provider) as unknown as VoiceMetadataFacet;
    accessControl = new Contract(diamondAddress, facetRegistry.AccessControlFacet.abi, provider) as unknown as AccessControlFacet;
    voiceDataset = new Contract(diamondAddress, facetRegistry.VoiceDatasetFacet.abi, provider) as unknown as VoiceDatasetFacet;
    templateFacet = new Contract(diamondAddress, facetRegistry.VoiceLicenseTemplateFacet.abi, provider) as unknown as VoiceLicenseTemplateFacet;
    licenseFacet = new Contract(diamondAddress, facetRegistry.VoiceLicenseFacet.abi, provider) as unknown as VoiceLicenseFacet;
    marketplaceFacet = new Contract(diamondAddress, facetRegistry.MarketplaceFacet.abi, provider) as unknown as MarketplaceFacet;
    paymentFacet = new Contract(diamondAddress, facetRegistry.PaymentFacet.abi, provider) as unknown as PaymentFacet;
    governorFacet = new Contract(diamondAddress, facetRegistry.GovernorFacet.abi, provider) as unknown as GovernorFacet;
    proposalFacet = new Contract(diamondAddress, facetRegistry.ProposalFacet.abi, provider) as unknown as ProposalFacet;
    timelockFacet = new Contract(diamondAddress, facetRegistry.TimelockFacet.abi, provider) as unknown as TimelockFacet;
    whisperBlockFacet = new Contract(diamondAddress, facetRegistry.WhisperBlockFacet.abi, provider) as unknown as WhisperBlockFacet;
    diamondCutFacet = new Contract(diamondAddress, facetRegistry.DiamondCutFacet.abi, provider);
    diamondLoupeFacet = new Contract(diamondAddress, facetRegistry.DiamondLoupeFacet.abi, provider);
    upgradeControllerFacet = new Contract(diamondAddress, facetRegistry.UpgradeControllerFacet.abi, provider);
    emergencyFacet = new Contract(diamondAddress, facetRegistry.EmergencyFacet.abi, provider) as unknown as EmergencyFacet;
    ownershipFacet = new Contract(diamondAddress, facetRegistry.OwnershipFacet.abi, provider);
    emergencyWithdrawalFacet = new Contract(diamondAddress, facetRegistry.EmergencyWithdrawalFacet.abi, provider);
    multisigFacet = new Contract(diamondAddress, facetRegistry.MultiSigFacet.abi, provider);
    stakingFacet = new Contract(diamondAddress, facetRegistry.StakingFacet.abi, provider);
    delegationFacet = new Contract(diamondAddress, facetRegistry.DelegationFacet.abi, provider) as unknown as DelegationFacet;
    tokenSupplyFacet = new Contract(diamondAddress, facetRegistry.TokenSupplyFacet.abi, provider);
    vestingFacet = new Contract(diamondAddress, facetRegistry.VestingFacet.abi, provider);
    burnThresholdFacet = new Contract(diamondAddress, facetRegistry.BurnThresholdFacet.abi, provider);
    timewaveGiftFacet = new Contract(diamondAddress, facetRegistry.TimewaveGiftFacet.abi, provider);
    votingPowerFacet = new Contract(diamondAddress, facetRegistry.VotingPowerFacet.abi, provider) as unknown as VotingPowerFacet;
    communityRewardsFacet = new Contract(diamondAddress, facetRegistry.CommunityRewardsFacet.abi, provider) as unknown as CommunityRewardsFacet;

    const api = createApiServer({ port: 0 });
    apiExecutionContext = api.app.get("apiExecutionContext") as ApiExecutionContext;
    if (isLoopbackRpcUrl(activeRpcUrl)) {
      expect(isLoopbackRpcUrl(apiExecutionContext.config.cbdpRpcUrl)).toBe(true);
      expect(isLoopbackRpcUrl(apiExecutionContext.config.alchemyRpcUrl)).toBe(true);
    }
    server = api.listen();
    const address = server.address();
    port = typeof address === "object" && address ? address.port : 8787;
  }, 600_000);

  beforeEach(() => {
    const usesRedis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;
    if (isLoopbackRpcUrl(activeRpcUrl) && !usesRedis) {
      // Independent fork scenarios share chain fixtures, but each has its own request budget.
      apiExecutionContext.rateLimiter = new RateLimiter();
    }
  });

  afterAll(async () => {
    const receiptArtifactPath = process.env.API_LAYER_CONTRACT_RECEIPT_ARTIFACT;
    if (receiptArtifactPath) {
      const resolvedArtifactPath = path.resolve(receiptArtifactPath);
      const mergeExistingArtifact = process.env.API_LAYER_MERGE_CONTRACT_RECEIPT_ARTIFACT === "1";
      let existingArtifact: Record<string, unknown> = {};
      if (mergeExistingArtifact) {
        try {
          existingArtifact = JSON.parse(await readFile(resolvedArtifactPath, "utf8")) as Record<string, unknown>;
        } catch {
          existingArtifact = {};
        }
      }
      await mkdir(path.dirname(resolvedArtifactPath), { recursive: true });
      await writeFile(resolvedArtifactPath, `${JSON.stringify({
        ...existingArtifact,
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        summary: "proven working",
        status: "proven working",
        rolledBackReceiptObservations,
        transactionHashes: [...confirmedTransactionHashes].sort((left, right) => left.localeCompare(right)),
        oracleFutureDriftProofObservations,
        oracleQuorumSignersProofObservations,
        oraclePauseProofObservations,
        oracleAddressProofObservations,
        accessControlPauseProofObservations,
        degradedModeConfigProofObservations,
        emergencyTimeoutProofObservations,
        emergencyWithdrawalProofObservations,
        ownershipPolicyProofObservations,
        ownershipTargetApprovalProofObservations,
        ownershipTransferLifecycleProofObservations,
        proposalCancellationProofObservations,
        withdrawalRevealProofObservations,
        governorVotingPeriodProofObservations,
        timelockMinDelayProofObservations,
        emergencyForceAddProofObservations,
      }, null, 2)}\n`);
    }
    server?.close();
    await provider?.destroy();
    if (localForkProcess && localForkProcess.exitCode === null && !keepLocalForkAfterContractIntegration) {
      localForkProcess.kill("SIGTERM");
    }
    process.env = { ...originalEnv };
  });

  it("rejects unknown routes on the live server", async () => {
    const response = await fetch(`http://127.0.0.1:${port}/v1/not-a-route`, {
      headers: { "x-api-key": "founder-key" },
    });
    expect(response.status).toBe(404);
  });

  it("grants and revokes an access-control participant role through HTTP and matches live role state", async (ctx) => {
    if (await skipWhenFundingBlocked(ctx, "access-control participant role lifecycle", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.000008") },
    ])) return;
    const marketplacePurchaserRole = id("MARKETPLACE_PURCHASER_ROLE");
    const ownerRole = id("OWNER_ROLE");
    const grantVerifiedRecipient = Wallet.createRandom().address;
    const revokeVerifiedRecipient = Wallet.createRandom().address;

    const roleAdminResponse = await apiCall(
      port,
      "GET",
      `/v1/access-control/queries/get-role-admin?role=${encodeURIComponent(marketplacePurchaserRole)}`,
      { apiKey: "read-key" },
    );
    expect(roleAdminResponse.status).toBe(200);
    expect(roleAdminResponse.payload).toBe(ownerRole);
    expect(await accessControl.getRoleAdmin(marketplacePurchaserRole)).toBe(ownerRole);

    const roleConfigResponse = await apiCall(
      port,
      "GET",
      `/v1/access-control/queries/get-role-config?role=${encodeURIComponent(marketplacePurchaserRole)}`,
      { apiKey: "read-key" },
    );
    expect(roleConfigResponse.status).toBe(200);
    expect(roleConfigResponse.payload).toEqual(roleConfigToObject(await accessControl.getRoleConfig(marketplacePurchaserRole)));
    expect(roleConfigResponse.payload).toMatchObject({
      adminRole: ownerRole,
      restricted: false,
      revocable: true,
    });

    const founderParticipantRoles = await apiCall(
      port,
      "GET",
      `/v1/access-control/queries/has-all-participant-roles?account=${encodeURIComponent(founderAddress)}`,
      { apiKey: "read-key" },
    );
    expect(founderParticipantRoles.status).toBe(200);
    expect(founderParticipantRoles.payload).toBe(true);

    expect(await accessControl.hasRole(marketplacePurchaserRole, grantVerifiedRecipient)).toBe(false);

    const grantResponse = await apiCall(port, "POST", "/v1/access-control/admin/grant-role", {
      body: {
        role: marketplacePurchaserRole,
        account: grantVerifiedRecipient,
        expiryTime: "0",
      },
    });
    expect(grantResponse.status).toBe(202);
    const grantTxHash = extractTxHash(grantResponse.payload);
    await expectReceipt(grantTxHash);

    const apiHasRoleAfterGrant = await waitFor(
      () => apiCall(
        port,
        "GET",
        `/v1/access-control/queries/has-role?role=${encodeURIComponent(marketplacePurchaserRole)}&account=${encodeURIComponent(grantVerifiedRecipient)}`,
        { apiKey: "read-key" },
      ),
      (response) => response.status === 200 && response.payload === true,
      "API access-control grant read",
    );
    expect(apiHasRoleAfterGrant.status).toBe(200);
    expect(apiHasRoleAfterGrant.payload).toBe(true);
    expect(await waitFor(
      () => accessControl.hasRole(marketplacePurchaserRole, grantVerifiedRecipient),
      (value) => value === true,
      "contract access-control grant read",
    )).toBe(true);

    const roleMemberResponse = await apiCall(
      port,
      "GET",
      `/v1/access-control/queries/get-role-member?role=${encodeURIComponent(marketplacePurchaserRole)}&account=${encodeURIComponent(grantVerifiedRecipient)}`,
      { apiKey: "read-key" },
    );
    expect(roleMemberResponse.status).toBe(200);
    expect(roleMemberResponse.payload).toEqual(
      roleMemberToObject(await accessControl.getRoleMember(marketplacePurchaserRole, grantVerifiedRecipient)),
    );
    expect(roleMemberResponse.payload).toMatchObject({
      active: true,
      assignedBy: founderAddress,
    });

    const roleMembersAfterGrant = await apiCall(
      port,
      "GET",
      `/v1/access-control/queries/get-role-members?role=${encodeURIComponent(marketplacePurchaserRole)}`,
      { apiKey: "read-key" },
    );
    expect(roleMembersAfterGrant.status).toBe(200);
    expect(roleMembersAfterGrant.payload).toContain(grantVerifiedRecipient);
    expect(normalize(await accessControl.getRoleMembers(marketplacePurchaserRole))).toContain(grantVerifiedRecipient);

    const userRolesAfterGrant = await apiCall(
      port,
      "GET",
      `/v1/access-control/queries/get-user-roles?account=${encodeURIComponent(grantVerifiedRecipient)}`,
      { apiKey: "read-key" },
    );
    expect(userRolesAfterGrant.status).toBe(200);
    expect(userRolesAfterGrant.payload).toContain(marketplacePurchaserRole);
    expect(normalize(await accessControl.getUserRoles(grantVerifiedRecipient))).toContain(marketplacePurchaserRole);

    const grantReceipt = await provider.getTransactionReceipt(grantTxHash);
    const roleGrantedEvents = await apiCall(port, "POST", "/v1/access-control/events/role-granted/query", {
      apiKey: "read-key",
      body: {
        fromBlock: String(grantReceipt!.blockNumber),
        toBlock: String(grantReceipt!.blockNumber),
      },
    });
    expect(roleGrantedEvents.status).toBe(200);
    expect(Array.isArray(roleGrantedEvents.payload)).toBe(true);
    expect((roleGrantedEvents.payload as Array<Record<string, unknown>>).some((log) => log.transactionHash === grantTxHash)).toBe(true);

    const setupForRevokeResponse = await apiCall(port, "POST", "/v1/access-control/admin/grant-role", {
      body: {
        role: marketplacePurchaserRole,
        account: revokeVerifiedRecipient,
        expiryTime: "0",
      },
    });
    expect(setupForRevokeResponse.status).toBe(202);
    await expectReceipt(extractTxHash(setupForRevokeResponse.payload));
    expect(await waitFor(
      () => accessControl.hasRole(marketplacePurchaserRole, revokeVerifiedRecipient),
      (value) => value === true,
      "contract access-control revoke setup read",
    )).toBe(true);

    const revokeResponse = await apiCall(port, "DELETE", "/v1/access-control/commands/revoke-role", {
      body: {
        role: marketplacePurchaserRole,
        account: revokeVerifiedRecipient,
        reason: "contract integration cleanup",
      },
    });
    expect(revokeResponse.status).toBe(202);
    const revokeTxHash = extractTxHash(revokeResponse.payload);
    await expectReceipt(revokeTxHash);

    const hasRoleAfterRevoke = await waitFor(
      () => apiCall(
        port,
        "GET",
        `/v1/access-control/queries/has-role?role=${encodeURIComponent(marketplacePurchaserRole)}&account=${encodeURIComponent(revokeVerifiedRecipient)}`,
        { apiKey: "read-key" },
      ),
      (response) => response.status === 200 && response.payload === false,
      "API access-control revoke read",
    );
    expect(hasRoleAfterRevoke.status).toBe(200);
    expect(hasRoleAfterRevoke.payload).toBe(false);
    expect(await waitFor(
      () => accessControl.hasRole(marketplacePurchaserRole, revokeVerifiedRecipient),
      (value) => value === false,
      "contract access-control revoke read",
    )).toBe(false);

    const revokeReceipt = await provider.getTransactionReceipt(revokeTxHash);
    const roleRevokedEvents = await apiCall(port, "POST", "/v1/access-control/events/role-revoked/query", {
      apiKey: "read-key",
      body: {
        fromBlock: String(revokeReceipt!.blockNumber),
        toBlock: String(revokeReceipt!.blockNumber),
      },
    });
    expect(roleRevokedEvents.status).toBe(200);
    expect(Array.isArray(roleRevokedEvents.payload)).toBe(true);
    expect((roleRevokedEvents.payload as Array<Record<string, unknown>>).some((log) => log.transactionHash === revokeTxHash)).toBe(true);
  }, 300_000);

  it("registers a voice asset, exposes normalized reads, and exposes the emitted event", async (ctx) => {
    if (await skipWhenFundingBlocked(ctx, "voice asset registration proof", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.000006") },
    ])) return;
    const ipfsHash = `QmContractIntegration${Date.now()}`;
    const royaltyRate = "250";

    const createResponse = await apiCall(port, "POST", "/v1/voice-assets", {
      body: { ipfsHash, royaltyRate },
    });
    expect(createResponse.status).toBe(202);
    expect(createResponse.payload).toMatchObject({
      requestId: null,
      txHash: expect.stringMatching(/^0x[a-fA-F0-9]{64}$/u),
      result: expect.stringMatching(/^0x[a-fA-F0-9]{64}$/u),
    });

    primaryVoiceHash = String((createResponse.payload as Record<string, unknown>).result);
    const txHash = extractTxHash(createResponse.payload);
    await expectReceipt(txHash);

    const readResponse = await waitFor(
      () => apiCall(port, "GET", `/v1/voice-assets/${primaryVoiceHash}`, {
        apiKey: "read-key",
      }),
      (response) => response.status === 200,
      "API voice-asset read",
    );
    expect(readResponse.status).toBe(200);

    const directVoice = (await waitFor(
      () => voiceAsset.getVoiceAsset(primaryVoiceHash),
      () => true,
      "contract voice-asset read",
    )) as any;
    expect(readResponse.payload).toEqual([
      directVoice[0],
      directVoice[1],
      directVoice[2].toString(),
      directVoice[3],
      directVoice[4].toString(),
      directVoice[5].toString(),
    ]);

    const byOwnerResponse = await apiCall(
      port,
      "GET",
      `/v1/voice-assets/by-owner/${encodeURIComponent(founderAddress)}`,
      { apiKey: "read-key" },
    );
    expect(byOwnerResponse.status).toBe(200);
    expect(byOwnerResponse.payload).toContain(primaryVoiceHash);

    const receipt = await provider.getTransactionReceipt(txHash);
    const eventResponse = await apiCall(port, "POST", "/v1/voice-assets/events/voice-asset-registered/query", {
      apiKey: "read-key",
      body: {
        fromBlock: String(receipt!.blockNumber),
        toBlock: String(receipt!.blockNumber),
      },
    });
    expect(eventResponse.status).toBe(200);
    expect(Array.isArray(eventResponse.payload)).toBe(true);
    expect((eventResponse.payload as Array<Record<string, unknown>>).some((log) => log.transactionHash === txHash)).toBe(true);
  }, 30_000);

  it("proves the legacy-plan beneficiary and inheritance lifecycle through HTTP", async (ctx) => {
    if (await skipWhenFundingBlocked(ctx, "legacy plan lifecycle proof", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.00002") },
    ])) return;

    const owner = Wallet.createRandom();
    await ensureNativeBalance(owner.address, ethers.parseEther("0.00002"));
    const beneficiary = Wallet.createRandom().address;
    const legacy = new Contract(diamondAddress, facetRegistry.LegacyFacet.abi, provider);
    const legacyView = new Contract(diamondAddress, facetRegistry.LegacyViewFacet.abi, provider);
    const ownerRole = id("OWNER_ROLE");
    const voiceAdminRole = id("VOICE_ADMIN_ROLE");
    const hadOwnerRole = await accessControl.hasRole(ownerRole, owner.address);
    const hadVoiceAdminRole = await accessControl.hasRole(voiceAdminRole, owner.address);
    if (!hadOwnerRole) {
      const grant = await apiCall(port, "POST", "/v1/access-control/admin/grant-role", {
        apiKey: "founder-key",
        body: { role: ownerRole, account: owner.address, expiryTime: "0" },
      });
      expect(grant.status, JSON.stringify(grant.payload)).toBe(202);
      await expectReceipt(extractTxHash(grant.payload));
    }
    if (!hadVoiceAdminRole) {
      const grant = await apiCall(port, "POST", "/v1/access-control/admin/grant-role", {
        apiKey: "founder-key",
        body: { role: voiceAdminRole, account: owner.address, expiryTime: "0" },
      });
      expect(grant.status, JSON.stringify(grant.payload)).toBe(202);
      await expectReceipt(extractTxHash(grant.payload));
    }

    apiExecutionContext.apiKeys["legacy-owner-key"] = {
      apiKey: "legacy-owner-key",
      label: "legacy-owner",
      signerId: "legacyOwner",
      roles: ["service"],
      allowGasless: false,
    };
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({
      ...JSON.parse(process.env.API_LAYER_SIGNER_MAP_JSON ?? "{}"),
      legacyOwner: owner.privateKey,
    });

    const lifecycleReceiptHashes: Record<string, string[]> = {
      createPlan: [],
      setMaxBeneficiaries: [],
      addBeneficiary: [],
      setBeneficiaryRelationship: [],
      updateBeneficiary: [],
      setInheritanceConditions: [],
      addInheritanceRequirement: [],
      addVoiceAssets: [],
      addDatasets: [],
      setMinTimelockPeriod: [],
    };
    let createPlanTxHash = "";
    const submit = async (
      method: string,
      route: string,
      body: Record<string, unknown>,
      artifactKey?: keyof typeof lifecycleReceiptHashes,
    ) => {
      const response = await apiCall(port, method, route, { apiKey: "legacy-owner-key", body });
      expect(response.status, JSON.stringify(response.payload)).toBe(202);
      const txHash = extractTxHash(response.payload);
      await expectReceipt(txHash);
      if (artifactKey) lifecycleReceiptHashes[artifactKey].push(txHash);
      const receipt = await provider.getTransactionReceipt(txHash);
      expect(receipt?.status).toBe(1);
      return receipt!;
    };

    try {
      await submit("PATCH", "/v1/voice-assets/commands/set-max-beneficiaries", {
        max: "10",
      }, "setMaxBeneficiaries");
      const created = await submit("POST", "/v1/voice-assets/legacy/create-legacy-plan", { memo: "API-05 local proof" }, "createPlan");
      createPlanTxHash = created.hash;
      expect(created.logs.some((log) => {
        try {
          const parsed = legacy.interface.parseLog(log);
          return parsed?.name === "LegacyPlanCreated" && parsed.args.owner === owner.address;
        } catch { return false; }
      })).toBe(true);

      const initialPlan = await legacyView.getLegacyPlan(owner.address);
      expect(initialPlan.createdAt).toBeGreaterThan(0n);
      expect(initialPlan.memo).toBe("API-05 local proof");

      const voiceAssetResponse = await apiCall(port, "POST", "/v1/voice-assets", {
        apiKey: "legacy-owner-key",
        body: { ipfsHash: `QmLegacyPlanProof${Date.now()}`, royaltyRate: "250" },
      });
      expect(voiceAssetResponse.status, JSON.stringify(voiceAssetResponse.payload)).toBe(202);
      const voiceHash = String((voiceAssetResponse.payload as Record<string, unknown>).result);
      await expectReceipt(extractTxHash(voiceAssetResponse.payload));
      const assetsReceipt = await submit("POST", "/v1/voice-assets/commands/add-voice-assets", {
        voiceAssets: [voiceHash],
      }, "addVoiceAssets");
      expect(assetsReceipt.status).toBe(1);
      expect(await voiceAsset.getVoiceAssetsByOwner(owner.address)).toContain(voiceHash);
      const apiOwnerAssets = await apiCall(port, "GET", `/v1/voice-assets/by-owner/${encodeURIComponent(owner.address)}`, {
        apiKey: "read-key",
      });
      expect(apiOwnerAssets.status).toBe(200);
      expect(apiOwnerAssets.payload).toContain(voiceHash);

      const datasetTemplate = await buildHttpTemplate(provider, founderAddress, `Legacy Plan Template ${Date.now()}`);
      const templateResponse = await apiCall(port, "POST", "/v1/licensing/license-templates/create-template", {
        apiKey: "founder-key",
        body: { template: datasetTemplate },
      });
      expect(templateResponse.status, JSON.stringify(templateResponse.payload)).toBe(202);
      const templateId = String((templateResponse.payload as Record<string, unknown>).result);
      await expectReceipt(extractTxHash(templateResponse.payload));
      const tokenId = await voiceAsset.getTokenId(voiceHash);
      const datasetResponse = await apiCall(port, "POST", "/v1/datasets/datasets", {
        apiKey: "legacy-owner-key",
        body: {
          title: `Legacy Plan Dataset ${Date.now()}`,
          assetIds: [tokenId.toString()],
          licenseTemplateId: BigInt(templateId).toString(),
          metadataURI: `ipfs://legacy-dataset-${Date.now()}`,
          royaltyBps: "250",
        },
      });
      expect(datasetResponse.status, JSON.stringify(datasetResponse.payload)).toBe(202);
      const datasetId = String((datasetResponse.payload as Record<string, unknown>).result);
      await expectReceipt(extractTxHash(datasetResponse.payload));
      const addDatasetReceipt = await submit("POST", "/v1/voice-assets/commands/add-datasets", {
        datasetIds: [datasetId],
      }, "addDatasets");
      expect(addDatasetReceipt.status).toBe(1);

      await submit("POST", "/v1/voice-assets/commands/add-beneficiary", {
        account: beneficiary, share: "6000", canDelegate: true,
      }, "addBeneficiary");
      const planAfterAddBeneficiary = await legacyView.getLegacyPlan(owner.address);
      expect(planAfterAddBeneficiary.beneficiaries).toHaveLength(1);
      expect(planAfterAddBeneficiary.beneficiaries[0].account).toBe(beneficiary);
      expect(planAfterAddBeneficiary.beneficiaries[0].sharePercentage).toBe(6000n);
      expect(planAfterAddBeneficiary.beneficiaries[0].canDelegate).toBe(true);
      await submit("PATCH", "/v1/voice-assets/commands/set-beneficiary-relationship", {
        account: beneficiary, relationship: "sibling",
      }, "setBeneficiaryRelationship");
      const planAfterRelationship = await legacyView.getLegacyPlan(owner.address);
      expect(planAfterRelationship.beneficiaries[0].account).toBe(beneficiary);
      expect(planAfterRelationship.beneficiaries[0].sharePercentage).toBe(6000n);
      expect(planAfterRelationship.beneficiaries[0].relationship).toBe("sibling");
      expect(planAfterRelationship.beneficiaries[0].canDelegate).toBe(true);
      const beneficiaryUpdate = {
        sharePercentage: "6000", activationTime: "0", account: beneficiary,
        isActive: true, canDelegate: true, relationship: "sibling",
      };
      const updatedBeneficiaryReceipt = await submit("PATCH", "/v1/voice-assets/commands/update-beneficiary", {
        beneficiary: beneficiaryUpdate, index: "0",
      }, "updateBeneficiary");
      expect(updatedBeneficiaryReceipt.logs.some((log) => {
        try {
          const parsed = legacy.interface.parseLog(log);
          return parsed?.name === "BeneficiaryUpdated" && parsed.args.beneficiary === beneficiary;
        } catch { return false; }
      })).toBe(true);

      const beforeConditions = await legacyView.getLegacyPlan(owner.address);
      const minimumTimelock = beforeConditions.conditions.timelock > 7n * 24n * 60n * 60n
        ? beforeConditions.conditions.timelock
        : 7n * 24n * 60n * 60n;
      const shortenedTimelock = 24n * 60n * 60n;
      const lowerMinimum = await apiCall(port, "PATCH", "/v1/voice-assets/commands/set-min-timelock-period", {
        apiKey: "legacy-owner-key",
        body: { period: shortenedTimelock.toString() },
      });
      expect(lowerMinimum.status, JSON.stringify(lowerMinimum.payload)).toBe(202);
      const lowerMinimumHash = extractTxHash(lowerMinimum.payload);
      lifecycleReceiptHashes.setMinTimelockPeriod.push(lowerMinimumHash);
      await expectReceipt(lowerMinimumHash);
      const shortCondition = await submit("PATCH", "/v1/voice-assets/commands/set-inheritance-conditions", {
        timelock: shortenedTimelock.toString(), requiresProof: false, approvers: [], minApprovals: "0",
      });
      expect(shortCondition.logs.some((log) => {
        try { return legacy.interface.parseLog(log)?.name === "InheritanceConditionsUpdated"; } catch { return false; }
      })).toBe(true);
      expect((await legacyView.getLegacyPlan(owner.address)).conditions.timelock).toBe(shortenedTimelock);
      const restoreMinimum = await apiCall(port, "PATCH", "/v1/voice-assets/commands/set-min-timelock-period", {
        apiKey: "legacy-owner-key",
        body: { period: minimumTimelock.toString() },
      });
      expect(restoreMinimum.status, JSON.stringify(restoreMinimum.payload)).toBe(202);
      const restoreMinimumHash = extractTxHash(restoreMinimum.payload);
      lifecycleReceiptHashes.setMinTimelockPeriod.push(restoreMinimumHash);
      await expectReceipt(restoreMinimumHash);
      const conditionReceipt = await submit("PATCH", "/v1/voice-assets/commands/set-inheritance-conditions", {
        timelock: minimumTimelock.toString(), requiresProof: true, approvers: [], minApprovals: "0",
      }, "setInheritanceConditions");
      expect(conditionReceipt.logs.some((log) => {
        try { return legacy.interface.parseLog(log)?.name === "InheritanceConditionsUpdated"; } catch { return false; }
      })).toBe(true);
      await submit("POST", "/v1/voice-assets/commands/add-inheritance-requirement", {
        doc: "local-fork-proof-document",
      }, "addInheritanceRequirement");

      const finalPlan = await legacyView.getLegacyPlan(owner.address);
      expect(finalPlan.beneficiaries).toHaveLength(1);
      expect(finalPlan.beneficiaries[0].account).toBe(beneficiary);
      expect(finalPlan.beneficiaries[0].sharePercentage).toBe(6000n);
      expect(finalPlan.beneficiaries[0].relationship).toBe("sibling");
      expect(finalPlan.conditions.timelock).toBe(minimumTimelock);
      expect(finalPlan.conditions.requiresProof).toBe(true);
      expect(finalPlan.conditions.requiredDocs).toContain("local-fork-proof-document");
      expect(finalPlan.voiceAssets).toContain(voiceHash);
      expect(finalPlan.datasetIds.map(String)).toContain(datasetId);
      const apiPlan = await apiCall(port, "GET", `/v1/voice-assets/queries/get-legacy-plan?owner=${encodeURIComponent(owner.address)}`, {
        apiKey: "read-key",
      });
      expect(apiPlan.status).toBe(200);
      expect(apiPlan.payload).toMatchObject({
        createdAt: initialPlan.createdAt.toString(),
        memo: "API-05 local proof",
      });
      const apiPlanRecord = apiPlan.payload as Record<string, any>;
      expect(apiPlanRecord.beneficiaries[0]).toMatchObject({
        account: beneficiary,
        sharePercentage: "6000",
        relationship: "sibling",
      });
      expect(apiPlanRecord.conditions).toMatchObject({
        timelock: minimumTimelock.toString(),
        requiresProof: true,
        requiredDocs: ["local-fork-proof-document"],
      });
      lifecycleReceiptHashes.createPlan = [createPlanTxHash];

      const proofDirectory = path.resolve(".runtime");
      await mkdir(proofDirectory, { recursive: true });
      for (const [key, hashes] of Object.entries(lifecycleReceiptHashes)) {
        await writeFile(path.join(proofDirectory, `api05-legacy-${key}-receipts.json`), `${JSON.stringify({
          schemaVersion: 1,
          generatedAt: new Date().toISOString(),
          status: "proven working",
          transactionHashes: hashes,
        }, null, 2)}\n`);
      }
    } finally {
      if (!hadVoiceAdminRole) {
        const revoke = await apiCall(port, "DELETE", "/v1/access-control/commands/revoke-role", {
          apiKey: "founder-key",
          body: { role: voiceAdminRole, account: owner.address, reason: "local-fork legacy plan proof cleanup" },
        });
        expect(revoke.status, JSON.stringify(revoke.payload)).toBe(202);
        await expectReceipt(extractTxHash(revoke.payload));
        expect(await accessControl.hasRole(voiceAdminRole, owner.address)).toBe(false);
      }
      if (!hadOwnerRole) {
        const revoke = await apiCall(port, "DELETE", "/v1/access-control/commands/revoke-role", {
          apiKey: "founder-key",
          body: { role: ownerRole, account: owner.address, reason: "local-fork legacy plan proof cleanup" },
        });
        expect(revoke.status, JSON.stringify(revoke.payload)).toBe(202);
        await expectReceipt(extractTxHash(revoke.payload));
        expect(await accessControl.hasRole(ownerRole, owner.address)).toBe(false);
      }
    }
  }, 60_000);

  it("proves five vesting schedule creation routes against receipts and canonical schedules", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    const vestingManagerRole = id("VESTING_MANAGER_ROLE");
    const hadVestingManagerRole = await accessControl.hasRole(vestingManagerRole, founderAddress);
    const scheduleMethods = [
      { key: "createFounderVesting", route: "/v1/tokenomics/vesting/create-founder-vesting", vestingType: 0, args: {} },
      { key: "createTeamVesting", route: "/v1/tokenomics/vesting/create-team-vesting", vestingType: 1, args: { vestingType: "1" } },
      { key: "createDevFundVesting", route: "/v1/tokenomics/vesting/create-dev-fund-vesting", vestingType: 4, args: {} },
      { key: "createPublicVesting", route: "/v1/tokenomics/vesting/create-public-vesting", vestingType: 5, args: {} },
      { key: "createCexVesting", route: "/v1/tokenomics/vesting/create-cex-vesting", vestingType: 6, args: {} },
    ] as const;
    const amount = 1_000n;
    const startingBalance = BigInt(await tokenSupplyFacet.tokenBalanceOf(founderAddress));
    expect(startingBalance).toBeGreaterThanOrEqual(amount * BigInt(scheduleMethods.length));
    const hashes: Record<string, string[]> = Object.fromEntries(scheduleMethods.map(({ key }) => [key, []]));

    if (!hadVestingManagerRole) {
      const grant = await apiCall(port, "POST", "/v1/access-control/admin/grant-role", {
        apiKey: "founder-key",
        body: { role: vestingManagerRole, account: founderAddress, expiryTime: "0" },
      });
      expect(grant.status, JSON.stringify(grant.payload)).toBe(202);
      await expectReceipt(extractTxHash(grant.payload));
      expect(await accessControl.hasRole(vestingManagerRole, founderAddress)).toBe(true);
    }

    try {
      for (const method of scheduleMethods) {
        const beneficiary = Wallet.createRandom().address;
        const response = await apiCall(port, "POST", method.route, {
          apiKey: "founder-key",
          body: { beneficiary, amount: amount.toString(), ...method.args },
        });
        expect(response.status, JSON.stringify(response.payload)).toBe(202);
        const txHash = extractTxHash(response.payload);
        hashes[method.key].push(txHash);
        await expectReceipt(txHash);
        const receipt = await provider.getTransactionReceipt(txHash);
        expect(receipt?.status).toBe(1);
        expect(receipt!.logs.some((log) => {
          try {
            const parsed = vestingFacet.interface.parseLog(log);
            return parsed?.name === "VestingScheduleCreated"
              && parsed.args.beneficiary === beneficiary
              && parsed.args.vestingType === BigInt(method.vestingType)
              && parsed.args.amount === amount;
          } catch { return false; }
        })).toBe(true);

        const schedule = await vestingFacet.getVestingDetails(beneficiary);
        expect(schedule.vestingType).toBe(BigInt(method.vestingType));
        expect(schedule.totalAmount).toBe(amount);
        expect(schedule.releasedAmount).toBe(0n);
        const apiSchedule = await apiCall(
          port,
          "GET",
          `/v1/tokenomics/queries/get-vesting-details?beneficiary=${encodeURIComponent(beneficiary)}`,
          { apiKey: "read-key" },
        );
        expect(apiSchedule.status).toBe(200);
        expect(apiSchedule.payload).toMatchObject({
          vestingType: String(method.vestingType),
          totalAmount: amount.toString(),
          releasedAmount: "0",
        });
      }

      expect(BigInt(await tokenSupplyFacet.tokenBalanceOf(founderAddress))).toBe(
        startingBalance - amount * BigInt(scheduleMethods.length),
      );
      const proofDirectory = path.resolve(".runtime");
      await mkdir(proofDirectory, { recursive: true });
      for (const [key, transactionHashes] of Object.entries(hashes)) {
        await writeFile(path.join(proofDirectory, `api05-vesting-${key}-receipts.json`), `${JSON.stringify({
          schemaVersion: 1,
          generatedAt: new Date().toISOString(),
          status: "proven working",
          transactionHashes,
        }, null, 2)}\n`);
      }
    } finally {
      if (!hadVestingManagerRole) {
        const revoke = await apiCall(port, "DELETE", "/v1/access-control/commands/revoke-role", {
          apiKey: "founder-key",
          body: { role: vestingManagerRole, account: founderAddress, reason: "local-fork vesting proof cleanup" },
        });
        expect(revoke.status, JSON.stringify(revoke.payload)).toBe(202);
        await expectReceipt(extractTxHash(revoke.payload));
        expect(await accessControl.hasRole(vestingManagerRole, founderAddress)).toBe(false);
      }
    }
  }, 60_000);

  it("updates authorization and royalty state through HTTP and matches direct contract state", async (ctx) => {
    if (await skipWhenFundingBlocked(ctx, "voice authorization and royalty proof", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.000008") },
    ])) return;
    const authorizedUser = Wallet.createRandom().address;
    const authorizeResponse = await apiCall(port, "POST", `/v1/voice-assets/${primaryVoiceHash}/authorization-grants`, {
      body: { user: authorizedUser },
    });
    expect(authorizeResponse.status).toBe(202);
    const authorizeTxHash = extractTxHash(authorizeResponse.payload);

    const validRoyaltyUpdate = await apiCall(port, "PATCH", `/v1/voice-assets/${primaryVoiceHash}/royalty-rate`, {
      body: { royaltyRate: "200" },
    });
    expect(validRoyaltyUpdate.status).toBe(202);
    const royaltyUpdateTxHash = extractTxHash(validRoyaltyUpdate.payload);

    await expectReceipt(authorizeTxHash);
    await expectReceipt(royaltyUpdateTxHash);

    const authorizedRead = await waitFor(
      () => apiCall(
        port,
        "GET",
        `/v1/voice-assets/queries/is-authorized?voiceHash=${encodeURIComponent(primaryVoiceHash)}&user=${encodeURIComponent(authorizedUser)}`,
        { apiKey: "read-key" },
      ),
      (response) => response.status === 200 && response.payload === true,
      "API authorization read",
    );
    expect(authorizedRead.status).toBe(200);
    expect(authorizedRead.payload).toBe(true);
    expect(await waitFor(
      () => voiceAsset.isAuthorized(primaryVoiceHash, authorizedUser),
      (value) => value === true,
      "contract authorization read",
    )).toBe(true);

    const voiceAfterUpdate = (await waitFor(
      () => voiceAsset.getVoiceAsset(primaryVoiceHash),
      (value) => (value as any)[2] === 200n,
      "contract royalty update read",
    )) as any;
    expect(voiceAfterUpdate[2]).toBe(200n);

    const maxRoyaltyResponse = await apiCall(port, "POST", "/v1/voice-assets/queries/get-max-royalty-rate", {
      apiKey: "read-key",
      body: {},
    });
    expect(maxRoyaltyResponse.status).toBe(200);
    const invalidRoyalty = (BigInt(String(maxRoyaltyResponse.payload)) + 1n).toString();
    const invalidRoyaltyResponse = await apiCall(port, "PATCH", `/v1/voice-assets/${primaryVoiceHash}/royalty-rate`, {
      body: { royaltyRate: invalidRoyalty },
    });
    expect(invalidRoyaltyResponse.status).toBe(400);
    expect((await voiceAsset.getVoiceAsset(primaryVoiceHash))[2]).toBe(200n);

    const revokeResponse = await apiCall(
      port,
      "DELETE",
      `/v1/voice-assets/${primaryVoiceHash}/authorization-grants/${encodeURIComponent(authorizedUser)}`,
    );
    expect(revokeResponse.status).toBe(202);
    await expectReceipt(extractTxHash(revokeResponse.payload));
    expect(await waitFor(
      () => voiceAsset.isAuthorized(primaryVoiceHash, authorizedUser),
      (value) => value === false,
      "contract authorization revoke read",
    )).toBe(false);
  }, 30_000);

  it("runs the register-voice-asset workflow and persists metadata through the primitive layer", async (ctx) => {
    if (await skipWhenFundingBlocked(ctx, "register-voice-asset workflow", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.00001") },
    ])) return;
    const features = {
      pitch: "120",
      volume: "70",
      speechRate: "85",
      timbre: "warm",
      formants: ["101", "202", "303"],
      harmonicsToNoise: "40",
      dynamicRange: "55",
    };

    const workflowResponse = await apiCall(port, "POST", "/v1/workflows/register-voice-asset", {
      body: {
        ipfsHash: `QmWorkflow${Date.now()}`,
        royaltyRate: "150",
        features,
      },
    });

    expect(workflowResponse.status).toBe(202);
    expect(workflowResponse.payload).toMatchObject({
      voiceHash: expect.stringMatching(/^0x[a-fA-F0-9]{64}$/u),
      registration: {
        txHash: expect.stringMatching(/^0x[a-fA-F0-9]{64}$/u),
        voiceAsset: expect.anything(),
      },
      metadataUpdate: {
        txHash: expect.stringMatching(/^0x[a-fA-F0-9]{64}$/u),
        features,
      },
      summary: {
        owner: null,
        hasFeatures: true,
      },
    });

    const workflowPayload = workflowResponse.payload as Record<string, unknown>;
    const workflowVoiceHash = String(workflowPayload.voiceHash);
    expect(((workflowPayload.registration as Record<string, unknown>).voiceAsset)).toBeTruthy();
    await expectReceipt(String(((workflowPayload.registration as Record<string, unknown>).txHash)));
    await expectReceipt(String(((workflowPayload.metadataUpdate as Record<string, unknown>).txHash)));
    const featuresRead = await waitFor(
      () => apiCall(
        port,
        "GET",
        `/v1/voice-assets/queries/get-basic-acoustic-features?voiceHash=${encodeURIComponent(workflowVoiceHash)}`,
        { apiKey: "read-key" },
      ),
      (response) => response.status === 200 && isDeepStrictEqual(response.payload, features),
      "API workflow metadata read",
    );
    expect(featuresRead.status).toBe(200);
    expect(featuresRead.payload).toEqual(features);
    expect(await waitFor(
      async () => acousticFeaturesToObject(await voiceMetadata.getBasicAcousticFeatures(workflowVoiceHash)),
      (value) => isDeepStrictEqual(value, features),
      "contract workflow metadata read",
    )).toEqual(features);
  }, 30_000);

  it("creates and mutates a dataset through HTTP and matches live dataset state", async (ctx) => {
    if (await skipWhenFundingBlocked(ctx, "dataset lifecycle proof", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.00002") },
    ])) return;
    const createVoice = async (suffix: string) => {
      const createResponse = await apiCall(port, "POST", "/v1/voice-assets", {
        body: {
          ipfsHash: `QmDataset${suffix}${Date.now()}`,
          royaltyRate: "1000",
        },
      });
      expect(createResponse.status).toBe(202);
      const voiceHash = String((createResponse.payload as Record<string, unknown>).result);
      await expectReceipt(extractTxHash(createResponse.payload));
      const tokenId = await waitFor(
        () => voiceAsset.getTokenId(voiceHash),
        (value) => BigInt(value as any) > 0n,
        `voice token id ${suffix}`,
      );
      return {
        voiceHash,
        tokenId: BigInt(tokenId as any).toString(),
      };
    };



    const asset1 = await createVoice("A1");
    const asset2 = await createVoice("A2");
    const asset3 = await createVoice("A3");
    const asset4 = await createVoice("A4");
    
    // Create license template for the test
    const datasetTemplate = await buildHttpTemplate(provider, founderAddress, `Mutation Template ${Date.now()}`);
    const templateResponse = await apiCall(port, "POST", "/v1/licensing/license-templates/create-template", {
      body: {
        template: datasetTemplate,
      },
    });
    expect(templateResponse.status).toBe(202);
    const template2 = String((templateResponse.payload as Record<string, unknown>).result);
    const template2Id = BigInt(template2).toString();
    await expectReceipt(extractTxHash(templateResponse.payload));
    const templateReadback = await waitFor(
      () => apiCall(
        port,
        "GET",
        `/v1/licensing/queries/get-template?templateHash=${encodeURIComponent(template2)}`,
        { apiKey: "read-key" },
      ),
      (response) => response.status === 200,
      "dataset template read",
    );
    expect(templateReadback.status).toBe(200);

    const totalBeforeResponse = await apiCall(port, "POST", "/v1/datasets/queries/get-total-datasets", {
      apiKey: "read-key",
      body: {},
    });
    expect(totalBeforeResponse.status).toBe(200);
    const totalBefore = BigInt(String(totalBeforeResponse.payload));

    const maxAssetsResponse = await apiCall(port, "POST", "/v1/datasets/queries/get-max-assets-per-dataset", {
      apiKey: "read-key",
      body: {},
    });
    expect(maxAssetsResponse.status).toBe(200);
    expect(maxAssetsResponse.payload).toBe(String(await voiceDataset.getMaxAssetsPerDataset()));

    const createDatasetResponse = await apiCall(port, "POST", "/v1/datasets/datasets", {
      body: {
        title: `Dataset Mutation ${Date.now()}`,
        assetIds: [asset1.tokenId, asset2.tokenId],
        licenseTemplateId: template2Id,
        metadataURI: `ipfs://dataset-meta-${Date.now()}`,
        royaltyBps: "500",
      },
    });
    expect(createDatasetResponse.status).toBe(202);
    const datasetId = String((createDatasetResponse.payload as Record<string, unknown>).result);
    const createDatasetTxHash = extractTxHash(createDatasetResponse.payload);
    await expectReceipt(createDatasetTxHash);

    const datasetAfterCreate = await waitFor(
      () => apiCall(port, "GET", `/v1/datasets/queries/get-dataset?datasetId=${encodeURIComponent(datasetId)}`, {
        apiKey: "read-key",
      }),
      (response) => response.status === 200 && Array.isArray((response.payload as Record<string, unknown>).assetIds) && ((response.payload as Record<string, unknown>).assetIds as unknown[]).length === 2,
      "dataset create read",
    );
    expect(datasetAfterCreate.payload).toEqual(datasetToObject(await voiceDataset.getDataset(BigInt(datasetId))));

    const datasetCreatedReceipt = await provider.getTransactionReceipt(createDatasetTxHash);
    const datasetCreatedEvents = await apiCall(port, "POST", "/v1/datasets/events/dataset-created/query", {
      apiKey: "read-key",
      body: {
        fromBlock: String(datasetCreatedReceipt!.blockNumber),
        toBlock: String(datasetCreatedReceipt!.blockNumber),
      },
    });
    expect(datasetCreatedEvents.status).toBe(200);
    expect((datasetCreatedEvents.payload as Array<Record<string, unknown>>).some((log) => log.transactionHash === createDatasetTxHash)).toBe(true);

    const byCreatorResponse = await apiCall(
      port,
      "GET",
      `/v1/datasets/queries/get-datasets-by-creator?creator=${encodeURIComponent(founderAddress)}`,
      { apiKey: "read-key" },
    );
    expect(byCreatorResponse.status).toBe(200);
    expect(byCreatorResponse.payload).toContain(datasetId);

    const appendAssetsResponse = await apiCall(port, "POST", "/v1/datasets/commands/append-assets", {
      body: {
        datasetId,
        assetIds: [asset3.tokenId, asset4.tokenId],
      },
    });
    expect(appendAssetsResponse.status).toBe(202);
    const appendAssetsTxHash = extractTxHash(appendAssetsResponse.payload);
    await expectReceipt(appendAssetsTxHash);

    const datasetAfterAppend = await waitFor(
      () => apiCall(port, "GET", `/v1/datasets/queries/get-dataset?datasetId=${encodeURIComponent(datasetId)}`, {
        apiKey: "read-key",
      }),
      (response) => response.status === 200 && ((response.payload as Record<string, unknown>).assetIds as unknown[]).length === 4,
      "dataset append read",
    );
    expect((datasetAfterAppend.payload as Record<string, unknown>).assetIds).toContain(asset4.tokenId);

    const containsAssetResponse = await apiCall(
      port,
      "GET",
      `/v1/datasets/queries/contains-asset?datasetId=${encodeURIComponent(datasetId)}&assetId=${encodeURIComponent(asset4.tokenId)}`,
      { apiKey: "read-key" },
    );
    expect(containsAssetResponse.status).toBe(200);
    expect(containsAssetResponse.payload).toBe(true);

    const appendReceipt = await provider.getTransactionReceipt(appendAssetsTxHash);
    const assetsAppendedEvents = await apiCall(port, "POST", "/v1/datasets/events/assets-appended/query", {
      apiKey: "read-key",
      body: {
        fromBlock: String(appendReceipt!.blockNumber),
        toBlock: String(appendReceipt!.blockNumber),
      },
    });
    expect(assetsAppendedEvents.status).toBe(200);
    expect((assetsAppendedEvents.payload as Array<Record<string, unknown>>).some((log) => log.transactionHash === appendAssetsTxHash)).toBe(true);

    const removeAssetResponse = await apiCall(port, "DELETE", "/v1/datasets/commands/remove-asset", {
      body: {
        datasetId,
        assetId: asset2.tokenId,
      },
    });
    expect(removeAssetResponse.status).toBe(202);
    const removeAssetTxHash = extractTxHash(removeAssetResponse.payload);
    await expectReceipt(removeAssetTxHash);

    const datasetAfterRemove = await waitFor(
      () => apiCall(port, "GET", `/v1/datasets/queries/get-dataset?datasetId=${encodeURIComponent(datasetId)}`, {
        apiKey: "read-key",
      }),
      (response) => response.status === 200 && ((response.payload as Record<string, unknown>).assetIds as unknown[]).length === 3,
      "dataset remove read",
    );
    expect((datasetAfterRemove.payload as Record<string, unknown>).assetIds).not.toContain(asset2.tokenId);

    const containsRemovedAssetResponse = await apiCall(
      port,
      "GET",
      `/v1/datasets/queries/contains-asset?datasetId=${encodeURIComponent(datasetId)}&assetId=${encodeURIComponent(asset2.tokenId)}`,
      { apiKey: "read-key" },
    );
    expect(containsRemovedAssetResponse.status).toBe(200);
    expect(containsRemovedAssetResponse.payload).toBe(false);

    const removeReceipt = await provider.getTransactionReceipt(removeAssetTxHash);
    const assetRemovedEvents = await apiCall(port, "POST", "/v1/datasets/events/asset-removed/query", {
      apiKey: "read-key",
      body: {
        fromBlock: String(removeReceipt!.blockNumber),
        toBlock: String(removeReceipt!.blockNumber),
      },
    });
    expect(assetRemovedEvents.status).toBe(200);
    expect((assetRemovedEvents.payload as Array<Record<string, unknown>>).some((log) => log.transactionHash === removeAssetTxHash)).toBe(true);

    const setLicenseResponse = await apiCall(port, "PATCH", "/v1/datasets/commands/set-license", {
      body: {
        datasetId,
        licenseTemplateId: template2Id,
      },
    });
    expect(setLicenseResponse.status).toBe(202);
    const setLicenseTxHash = extractTxHash(setLicenseResponse.payload);
    await expectReceipt(setLicenseTxHash);

    const updatedMetadataURI = `ipfs://dataset-meta-updated-${Date.now()}`;
    const setMetadataResponse = await apiCall(port, "PATCH", "/v1/datasets/commands/set-metadata", {
      body: {
        datasetId,
        metadataURI: updatedMetadataURI,
      },
    });
    expect(setMetadataResponse.status).toBe(202);
    const setMetadataTxHash = extractTxHash(setMetadataResponse.payload);
    await expectReceipt(setMetadataTxHash);

    const setRoyaltyResponse = await apiCall(port, "PATCH", "/v1/datasets/commands/set-royalty", {
      body: {
        datasetId,
        royaltyBps: "250",
      },
    });
    expect(setRoyaltyResponse.status).toBe(202);
    const setRoyaltyTxHash = extractTxHash(setRoyaltyResponse.payload);
    await expectReceipt(setRoyaltyTxHash);

    const inactiveStatusResponse = await apiCall(port, "PATCH", "/v1/datasets/commands/set-dataset-status", {
      body: {
        datasetId,
        active: false,
      },
    });
    expect(inactiveStatusResponse.status).toBe(202);
    const setStatusTxHash = extractTxHash(inactiveStatusResponse.payload);
    await expectReceipt(setStatusTxHash);

    const datasetAfterUpdates = await waitFor(
      () => apiCall(port, "GET", `/v1/datasets/queries/get-dataset?datasetId=${encodeURIComponent(datasetId)}`, {
        apiKey: "read-key",
      }),
      (response) => response.status === 200 && (response.payload as Record<string, unknown>).metadataURI === updatedMetadataURI && (response.payload as Record<string, unknown>).licenseTemplateId === template2Id && (response.payload as Record<string, unknown>).royaltyBps === "250" && (response.payload as Record<string, unknown>).active === false,
      "dataset update read",
    );
    expect(datasetAfterUpdates.payload).toEqual(datasetToObject(await voiceDataset.getDataset(BigInt(datasetId))));

    const datasetBeforeUnauthorizedMutations = datasetToObject(await voiceDataset.getDataset(BigInt(datasetId)));
    const unauthorizedDatasetMutationCases: ReadonlyArray<{
      method: string;
      route: string;
      body: Record<string, unknown>;
    }> = [
      {
        method: "POST",
        route: "/v1/datasets/commands/append-assets",
        body: { datasetId, assetIds: [asset1.tokenId] },
      },
      {
        method: "DELETE",
        route: "/v1/datasets/commands/remove-asset",
        body: { datasetId, assetId: asset1.tokenId },
      },
      {
        method: "PATCH",
        route: "/v1/datasets/commands/set-license",
        body: { datasetId, licenseTemplateId: template2Id },
      },
      {
        method: "PATCH",
        route: "/v1/datasets/commands/set-metadata",
        body: { datasetId, metadataURI: "ipfs://unauthorized-metadata" },
      },
      {
        method: "PATCH",
        route: "/v1/datasets/commands/set-royalty",
        body: { datasetId, royaltyBps: "999" },
      },
      {
        method: "PATCH",
        route: "/v1/datasets/commands/set-dataset-status",
        body: { datasetId, active: true },
      },
    ];
    for (const mutation of unauthorizedDatasetMutationCases) {
      const rejected = await apiCall(port, mutation.method, mutation.route, {
        apiKey: "delegation-proof-key",
        body: mutation.body,
      });
      expect(rejected.status, `${mutation.route}: ${JSON.stringify(rejected.payload)}`).toBe(400);
      expect(JSON.stringify(rejected.payload)).toMatch(
        /InvalidDatasetCreator|NotDatasetOwner|revert|execution reverted|unauthorized/i,
      );
    }
    expect(datasetToObject(await voiceDataset.getDataset(BigInt(datasetId)))).toEqual(
      datasetBeforeUnauthorizedMutations,
    );

    const royaltyInfoResponse = await apiCall(
      port,
      "GET",
      `/v1/datasets/queries/royalty-info?datasetId=${encodeURIComponent(datasetId)}&salePrice=1000000`,
      { apiKey: "read-key" },
    );
    expect(royaltyInfoResponse.status).toBe(200);
    expect(royaltyInfoResponse.payload).toEqual(normalize(await voiceDataset.royaltyInfo(BigInt(datasetId), 1_000_000n)));

    for (const [path, txHash] of [
      ["/v1/datasets/events/license-changed/query", setLicenseTxHash],
      ["/v1/datasets/events/metadata-changed/query", setMetadataTxHash],
      ["/v1/datasets/events/royalty-set/query", setRoyaltyTxHash],
      ["/v1/datasets/events/dataset-status-changed/query", setStatusTxHash],
    ] as const) {
      const receipt = await provider.getTransactionReceipt(txHash);
      const eventResponse = await apiCall(port, "POST", path, {
        apiKey: "read-key",
        body: {
          fromBlock: String(receipt!.blockNumber),
          toBlock: String(receipt!.blockNumber),
        },
      });
      expect(eventResponse.status).toBe(200);
      expect((eventResponse.payload as Array<Record<string, unknown>>).some((log) => log.transactionHash === txHash)).toBe(true);
    }

    const burnDatasetResponse = await apiCall(port, "DELETE", "/v1/datasets/commands/burn-dataset", {
      body: { datasetId },
    });
    expect(burnDatasetResponse.status).toBe(202);
    const burnDatasetTxHash = extractTxHash(burnDatasetResponse.payload);
    await expectReceipt(burnDatasetTxHash);

    const totalAfterResponse = await apiCall(port, "POST", "/v1/datasets/queries/get-total-datasets", {
      apiKey: "read-key",
      body: {},
    });
    expect(totalAfterResponse.status).toBe(200);
    const totalAfter = BigInt(String(totalAfterResponse.payload));
    expect(totalAfter).toEqual(await voiceDataset.getTotalDatasets());
    expect(totalAfter >= totalBefore).toBe(true);

    const burnReceipt = await provider.getTransactionReceipt(burnDatasetTxHash);
    const datasetBurnedEvents = await apiCall(port, "POST", "/v1/datasets/events/dataset-burned/query", {
      apiKey: "read-key",
      body: {
        fromBlock: String(burnReceipt!.blockNumber),
        toBlock: String(burnReceipt!.blockNumber),
      },
    });
    expect(datasetBurnedEvents.status).toBe(200);
    expect((datasetBurnedEvents.payload as Array<Record<string, unknown>>).some((log) => log.transactionHash === burnDatasetTxHash)).toBe(true);

    const getBurnedDatasetResponse = await apiCall(
      port,
      "GET",
      `/v1/datasets/queries/get-dataset?datasetId=${encodeURIComponent(datasetId)}`,
      { apiKey: "read-key" },
    );
    expect(getBurnedDatasetResponse.status).toBe(200);
    expect(getBurnedDatasetResponse.payload).not.toBeNull();
  }, 300_000);

  it("lists, reprices, and cancels a marketplace listing through HTTP and matches live marketplace state", async (ctx) => {
    if (await skipWhenFundingBlocked(ctx, "marketplace listing lifecycle proof", [
      { address: licensingOwnerAddress, minimumWei: ethers.parseEther("0.00001") },
      { address: founderAddress, minimumWei: ethers.parseEther("0.000004") },
    ])) return;
    const createVoiceResponse = await apiCall(port, "POST", "/v1/voice-assets", {
      apiKey: "licensing-owner-key",
      body: {
        ipfsHash: `QmMarketplace${Date.now()}-${Math.random().toString(16).slice(2)}`,
        royaltyRate: "180",
      },
    });
    expect(createVoiceResponse.status).toBe(202);
    const voiceHash = String((createVoiceResponse.payload as Record<string, unknown>).result);
    await expectReceipt(extractTxHash(createVoiceResponse.payload));
    const tokenId = String(await waitFor(
      () => voiceAsset.getTokenId(voiceHash),
      (value) => BigInt(value as any) > 0n,
      "marketplace token id",
    ));

    await (await voiceAsset.connect(licensingOwnerWallet).setApprovalForAll(diamondAddress, true)).wait();

    const usdcTokenResponse = await apiCall(port, "POST", "/v1/marketplace/queries/get-usdc-token", {
      apiKey: "read-key",
      body: {},
    });
    expect(usdcTokenResponse.status).toBe(200);
    expect(usdcTokenResponse.payload).toBe(await paymentFacet.getUsdcToken());

    const feeConfigResponse = await apiCall(port, "POST", "/v1/marketplace/queries/get-fee-configuration", {
      apiKey: "read-key",
      body: {},
    });
    expect(feeConfigResponse.status).toBe(200);
    expect(feeConfigResponse.payload).toEqual(feeConfigToObject(await paymentFacet.getFeeConfiguration()));

    const pausedResponse = await apiCall(port, "POST", "/v1/marketplace/queries/is-paused", {
      apiKey: "read-key",
      body: {},
    });
    expect(pausedResponse.status).toBe(200);
    expect(pausedResponse.payload).toBe(await marketplaceFacet.isPaused());

    const paymentPausedResponse = await apiCall(port, "POST", "/v1/marketplace/queries/payment-paused", {
      apiKey: "read-key",
      body: {},
    });
    expect(paymentPausedResponse.status).toBe(200);
    expect(paymentPausedResponse.payload).toBe(await paymentFacet.paymentPaused());

    const treasuryResponse = await apiCall(port, "POST", "/v1/marketplace/queries/get-treasury-address", {
      apiKey: "read-key",
      body: {},
    });
    expect(treasuryResponse.status).toBe(200);
    expect(treasuryResponse.payload).toBe(await paymentFacet.getTreasuryAddress());

    const unionTreasuryResponse = await apiCall(port, "POST", "/v1/marketplace/queries/get-union-treasury-address", {
      apiKey: "read-key",
      body: {},
    });
    expect(unionTreasuryResponse.status).toBe(200);
    expect(unionTreasuryResponse.payload).toBe(await paymentFacet.getUnionTreasuryAddress());

    const devFundResponse = await apiCall(port, "POST", "/v1/marketplace/queries/get-dev-fund-address", {
      apiKey: "read-key",
      body: {},
    });
    expect(devFundResponse.status).toBe(200);
    expect(devFundResponse.payload).toBe(await paymentFacet.getDevFundAddress());

    const revenueMetricsResponse = await apiCall(port, "POST", "/v1/marketplace/queries/get-revenue-metrics", {
      apiKey: "read-key",
      body: {},
    });
    expect(revenueMetricsResponse.status).toBe(200);
    expect(revenueMetricsResponse.payload).toEqual(normalize(await paymentFacet.getRevenueMetrics()));

    const initialAssetRevenueResponse = await apiCall(
      port,
      "GET",
      `/v1/marketplace/queries/get-asset-revenue?tokenId=${encodeURIComponent(tokenId)}`,
      { apiKey: "read-key" },
    );
    expect(initialAssetRevenueResponse.status).toBe(200);
    expect(initialAssetRevenueResponse.payload).toEqual(normalize(await paymentFacet.getAssetRevenue(BigInt(tokenId))));

    const initialPendingPaymentsResponse = await apiCall(
      port,
      "GET",
      `/v1/marketplace/queries/get-pending-payments?payee=${encodeURIComponent(licensingOwnerAddress)}`,
      { apiKey: "read-key" },
    );
    expect(initialPendingPaymentsResponse.status).toBe(200);
    expect(initialPendingPaymentsResponse.payload).toBe(String(await paymentFacet.getPendingPayments(licensingOwnerAddress)));

    const listResponse = await apiCall(port, "POST", "/v1/marketplace/commands/list-asset", {
      apiKey: "licensing-owner-key",
      body: {
        tokenId,
        price: "25000000",
        duration: "0",
      },
    });
    expect(listResponse.status).toBe(202);
    const listTxHash = extractTxHash(listResponse.payload);
    await expectReceipt(listTxHash);

    await waitFor(
      () => marketplaceFacet.getListing(BigInt(tokenId)),
      (value) => Boolean(value[7]) === true,
      "contract marketplace listing after create",
    );
    const listingReadResponse = await apiCall(
      port,
      "GET",
      `/v1/marketplace/queries/get-listing?tokenId=${encodeURIComponent(tokenId)}`,
      { apiKey: "read-key" },
    );
    expect(listingReadResponse.status).toBe(200);
    expect(listingReadResponse.payload).toEqual(listingToObject(await marketplaceFacet.getListing(BigInt(tokenId))));

    const listReceipt = await provider.getTransactionReceipt(listTxHash);
    for (const path of ["/v1/marketplace/events/asset-listed/query", "/v1/marketplace/events/asset-escrowed/query/marketplace"] as const) {
      const eventResponse = await apiCall(port, "POST", path, {
        apiKey: "read-key",
        body: {
          fromBlock: String(listReceipt!.blockNumber),
          toBlock: String(listReceipt!.blockNumber),
        },
      });
      expect(eventResponse.status).toBe(200);
      expect((eventResponse.payload as Array<Record<string, unknown>>).some((log) => log.transactionHash === listTxHash)).toBe(true);
    }

    const listed = await marketplaceFacet.getListing(BigInt(tokenId));
    const priceUpdateBlock = Number(listed[5]) + 5;
    if (isLoopbackRpcUrl(activeRpcUrl)) {
      const currentBlock = await provider.getBlockNumber();
      if (currentBlock < priceUpdateBlock) {
        await provider.send("anvil_mine", [ethers.toQuantity(priceUpdateBlock - currentBlock)]);
      }
    } else {
      await waitFor(
        () => provider.getBlockNumber(),
        (blockNumber) => blockNumber >= priceUpdateBlock,
        "marketplace price-update cooldown",
        { attempts: 90, delayMs: 2_000 },
      );
    }

    const updatePriceResponse = await apiCall(port, "PATCH", "/v1/marketplace/commands/update-listing-price", {
      apiKey: "licensing-owner-key",
      body: {
        tokenId,
        newPrice: "30000000",
      },
    });
    expect(updatePriceResponse.status).toBe(202);
    const updatePriceTxHash = extractTxHash(updatePriceResponse.payload);
    await expectReceipt(updatePriceTxHash);

    await waitFor(
      () => marketplaceFacet.getListing(BigInt(tokenId)),
      (value) => (value as any)[2] === 30_000_000n,
      "contract marketplace listing after price update",
    );
    const repricedListingResponse = await apiCall(
      port,
      "GET",
      `/v1/marketplace/queries/get-listing?tokenId=${encodeURIComponent(tokenId)}`,
      { apiKey: "read-key" },
    );
    expect(repricedListingResponse.status).toBe(200);
    expect(repricedListingResponse.payload).toEqual(listingToObject(await marketplaceFacet.getListing(BigInt(tokenId))));

    const updatePriceReceipt = await provider.getTransactionReceipt(updatePriceTxHash);
    const priceUpdatedEvents = await apiCall(port, "POST", "/v1/marketplace/events/listing-price-updated/query", {
      apiKey: "read-key",
      body: {
        fromBlock: String(updatePriceReceipt!.blockNumber),
        toBlock: String(updatePriceReceipt!.blockNumber),
      },
    });
    expect(priceUpdatedEvents.status).toBe(200);
    expect((priceUpdatedEvents.payload as Array<Record<string, unknown>>).some((log) => log.transactionHash === updatePriceTxHash)).toBe(true);

    const purchaseAttemptResponse = await apiCall(port, "POST", "/v1/marketplace/commands/purchase-asset", {
      apiKey: "founder-key",
      body: { tokenId },
    });
    expect(purchaseAttemptResponse.status).toBe(500);
    expect(JSON.stringify(purchaseAttemptResponse.payload)).toMatch(/TradingLocked|CALL_EXCEPTION/u);

    const cancelResponse = await apiCall(port, "DELETE", "/v1/marketplace/commands/cancel-listing", {
      apiKey: "licensing-owner-key",
      body: { tokenId },
    });
    if (cancelResponse.status === 202) {
      const cancelTxHash = extractTxHash(cancelResponse.payload);
      await expectReceipt(cancelTxHash);

      await waitFor(
        () => marketplaceFacet.getListing(BigInt(tokenId)),
        (value) => Boolean(value[7]) === false,
        "contract marketplace listing after cancel",
      );
      const cancelledListingResponse = await apiCall(
        port,
        "GET",
        `/v1/marketplace/queries/get-listing?tokenId=${encodeURIComponent(tokenId)}`,
        { apiKey: "read-key" },
      );
      if (cancelledListingResponse.status === 200) {
        expect(cancelledListingResponse.payload).toEqual(listingToObject(await marketplaceFacet.getListing(BigInt(tokenId))));
      }

      const cancelReceipt = await provider.getTransactionReceipt(cancelTxHash);
      const cancelEvents = await apiCall(port, "POST", "/v1/marketplace/events/listing-cancelled/query", {
        apiKey: "read-key",
        body: {
          fromBlock: String(cancelReceipt!.blockNumber),
          toBlock: String(cancelReceipt!.blockNumber),
        },
      });
      expect(cancelEvents.status).toBe(200);
      expect((cancelEvents.payload as Array<Record<string, unknown>>).some((log) => log.transactionHash === cancelTxHash)).toBe(true);
    }
  }, 300_000);

  it("proves marketplace withdrawal token custody, failed-call safety, rounding, and replay behavior on an isolated fork", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "marketplace withdrawal economic invariants", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.000012") },
      { address: marketplaceBuyerWallet.address, minimumWei: ethers.parseEther("0.000006") },
    ])) return;

    const snapshot = await captureReceiptSnapshot();
    try {
      await disableStakingHookForIsolatedUsdcPaymentProof();
      const createVoiceResponse = await apiCall(port, "POST", "/v1/voice-assets", {
        body: {
          ipfsHash: `QmWithdrawalEconomics${Date.now()}`,
          royaltyRate: "100",
        },
      });
      expect(createVoiceResponse.status, JSON.stringify(createVoiceResponse.payload)).toBe(202);
      const voiceHash = String((createVoiceResponse.payload as Record<string, unknown>).result);
      await expectReceipt(extractTxHash(createVoiceResponse.payload));
      const tokenId = BigInt(await waitFor(
        () => voiceAsset.getTokenId(voiceHash),
        (value) => BigInt(value as bigint) > 0n,
        "marketplace withdrawal fixture token",
      ));

      await provider.send("evm_increaseTime", [86_401]);
      await provider.send("evm_mine", []);

      const paymentTokenAddress = await paymentFacet.getUsdcToken();
      const paymentToken = new Contract(paymentTokenAddress, [
        "function balanceOf(address account) view returns (uint256)",
        "function approve(address spender,uint256 amount) returns (bool)",
      ], provider);
      const distributionAmount = 101n;
      expect(BigInt(await paymentToken.balanceOf(marketplaceBuyerWallet.address))).toBeGreaterThanOrEqual(distributionAmount);
      const buyerNonce = await provider.getTransactionCount(marketplaceBuyerWallet.address, "pending");
      const approvalReceipt = await (await paymentToken.connect(marketplaceBuyerWallet).approve(
        diamondAddress,
        distributionAmount,
        { nonce: buyerNonce },
      )).wait();
      expect(approvalReceipt?.status).toBe(1);
      const distributionReceipt = await (await paymentFacet.connect(marketplaceBuyerWallet).distributePayment(
        tokenId,
        distributionAmount,
        founderAddress,
        ethers.ZeroAddress,
        false,
        { nonce: buyerNonce + 1 },
      )).wait();
      expect(distributionReceipt?.status).toBe(1);

      const pendingBefore = await paymentFacet.getPendingPayments(founderAddress);
      expect(pendingBefore).toBeGreaterThan(0n);
      expect(pendingBefore).toBeLessThan(distributionAmount);
      const custodyBefore = BigInt(await paymentToken.balanceOf(diamondAddress));
      const payeeBefore = BigInt(await paymentToken.balanceOf(founderAddress));

      const latestBlock = await provider.getBlock("latest");
      const expiredResponse = await apiCall(port, "POST", "/v1/workflows/withdraw-marketplace-payments", {
        body: { deadline: String((latestBlock?.timestamp ?? 1) - 1) },
      });
      expect(expiredResponse.status).not.toBe(202);
      assertNoEconomicSideEffects("marketplaceWithdrawal.expired", {
        pending: pendingBefore,
        custody: custodyBefore,
        payee: payeeBefore,
      }, {
        pending: await paymentFacet.getPendingPayments(founderAddress),
        custody: BigInt(await paymentToken.balanceOf(diamondAddress)),
        payee: BigInt(await paymentToken.balanceOf(founderAddress)),
      });

      const withdrawalResponse = await apiCall(port, "POST", "/v1/workflows/withdraw-marketplace-payments", {
        body: {},
      });
      expect(withdrawalResponse.status, JSON.stringify(withdrawalResponse.payload)).toBe(202);
      const withdrawal = (withdrawalResponse.payload as { withdrawal: {
        txHash: string;
        releasedAmount: string;
        economics: {
          custody: { delta: string };
          payee: { delta: string };
          conservation: string;
        };
      } }).withdrawal;
      await expectReceipt(withdrawal.txHash);
      expect(withdrawal.releasedAmount).toBe(pendingBefore.toString());
      expect(withdrawal.economics).toMatchObject({
        custody: { delta: (-pendingBefore).toString() },
        payee: { delta: pendingBefore.toString() },
        conservation: "0",
      });
      const custodyAfter = BigInt(await paymentToken.balanceOf(diamondAddress));
      const payeeAfter = BigInt(await paymentToken.balanceOf(founderAddress));
      const custodyDelta = assertExactAmountDelta(
        "marketplaceWithdrawal.custody",
        custodyBefore,
        custodyAfter,
        -pendingBefore,
      );
      const payeeDelta = assertExactAmountDelta(
        "marketplaceWithdrawal.payee",
        payeeBefore,
        payeeAfter,
        pendingBefore,
      );
      assertConservedDeltas("marketplaceWithdrawal.conservation", [custodyDelta.delta, payeeDelta.delta]);
      expect(await paymentFacet.getPendingPayments(founderAddress)).toBe(0n);

      const repeatResponse = await apiCall(port, "POST", "/v1/workflows/withdraw-marketplace-payments", {
        body: {},
      });
      expect(repeatResponse.status).toBe(409);
      assertNoEconomicSideEffects("marketplaceWithdrawal.repeat", {
        pending: 0n,
        custody: custodyAfter,
        payee: payeeAfter,
      }, {
        pending: await paymentFacet.getPendingPayments(founderAddress),
        custody: BigInt(await paymentToken.balanceOf(diamondAddress)),
        payee: BigInt(await paymentToken.balanceOf(founderAddress)),
      });
    } finally {
      expect(await restoreReceiptSnapshot(snapshot)).toBe(true);
    }
  }, 300_000);

  it("proves GovernorFacet.updateVotingPeriod is governance-proposal-only through its mounted route", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "governance voting-period route proof", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.000008") },
    ])) return;

    const governanceRole = id("GOVERNANCE_ROLE");
    expect(await accessControl.hasRole(governanceRole, founderAddress)).toBe(true);
    const originalConfig = await governorFacet.getVotingConfig();
    const attemptedPeriod = BigInt(originalConfig.votingPeriod) + 1n;
    const response = await apiCall(port, "PATCH", "/v1/governance/commands/update-voting-period", {
      apiKey: "founder-key",
      body: { newVotingPeriod: attemptedPeriod.toString() },
    });
    expect(response.status, JSON.stringify(response.payload)).toBe(500);
    expect(JSON.stringify(response.payload)).toContain("OnlyGovernance()");
    expect(JSON.stringify(response.payload)).not.toMatch(/"txHash"/u);
    const afterAttempt = await governorFacet.getVotingConfig();
    expect(BigInt(afterAttempt.votingPeriod)).toBe(BigInt(originalConfig.votingPeriod));
    expect(BigInt(afterAttempt.votingDelay)).toBe(BigInt(originalConfig.votingDelay));
    expect(BigInt(afterAttempt.proposalThreshold)).toBe(BigInt(originalConfig.proposalThreshold));
    expect(BigInt(afterAttempt.quorumNumerator)).toBe(BigInt(originalConfig.quorumNumerator));

    governorVotingPeriodProofObservations.push({
      methodKey: "GovernorFacet.updateVotingPeriod",
      route: "PATCH /v1/governance/commands/update-voting-period",
      actor: founderAddress,
      originalPeriod: String(originalConfig.votingPeriod),
      attemptedPeriod: attemptedPeriod.toString(),
      httpStatus: response.status,
      error: "OnlyGovernance()",
      stateUnchanged: true,
      transactionSubmitted: false,
      isolatedFork: true,
    });
  }, 180_000);

  it("proves TimelockFacet.updateMinDelay is governance-proposal-only through its mounted route", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "timelock minimum-delay route proof", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.000012") },
    ])) return;

    for (const role of [await timelockFacet.PROPOSER_ROLE(), await timelockFacet.EXECUTOR_ROLE()]) {
      if (await accessControl.hasRole(role, founderAddress)) continue;
      const grantResponse = await apiCall(port, "POST", "/v1/access-control/commands/grant-role", {
        apiKey: "founder-key",
        body: { role, account: founderAddress, expiryTime: "0" },
      });
      expect(grantResponse.status, JSON.stringify(grantResponse.payload)).toBe(202);
      await expectReceipt(extractTxHash(grantResponse.payload));
      expect(await accessControl.hasRole(role, founderAddress)).toBe(true);
    }

    const originalDelay = BigInt(await timelockFacet.getMinDelay());
    const attemptedDelay = originalDelay + 1n;
    const response = await apiCall(port, "PATCH", "/v1/governance/commands/update-min-delay", {
      apiKey: "founder-key",
      body: { newDelay: attemptedDelay.toString() },
    });
    expect(response.status, JSON.stringify(response.payload)).toBe(500);
    expect(JSON.stringify(response.payload)).toContain("OnlyGovernance()");
    expect(JSON.stringify(response.payload)).not.toMatch(/"txHash"/u);
    expect(BigInt(await timelockFacet.getMinDelay())).toBe(originalDelay);

    timelockMinDelayProofObservations.push({
      methodKey: "TimelockFacet.updateMinDelay",
      route: "PATCH /v1/governance/commands/update-min-delay",
      actor: founderAddress,
      rolesGrantedForAttempt: ["PROPOSER_ROLE", "EXECUTOR_ROLE"],
      originalDelay: originalDelay.toString(),
      attemptedDelay: attemptedDelay.toString(),
      httpStatus: response.status,
      error: "OnlyGovernance()",
      stateUnchanged: true,
      transactionSubmitted: false,
      isolatedFork: true,
    });
  }, 180_000);

  it("proves AccessControlFacet.emergencyForceAdd rejects a role outside the recovery allowlist", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "emergency force-add disposable role proof", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.000012") },
    ])) return;

    const emergencyAdminRole = id("EMERGENCY_ADMIN_ROLE");
    expect(await accessControl.hasRole(emergencyAdminRole, founderAddress)).toBe(true);
    const role = id("MARKETPLACE_PURCHASER_ROLE");
    const account = Wallet.createRandom().address;
    expect(await accessControl.hasRole(role, account)).toBe(false);
    const response = await apiCall(port, "POST", "/v1/access-control/admin/emergency-force-add", {
      apiKey: "founder-key",
      body: { role, account },
    });
    expect(response.status, JSON.stringify(response.payload)).toBe(500);
    expect(JSON.stringify(response.payload)).toContain("Unauthorized(address,string)");
    expect(JSON.stringify(response.payload)).not.toMatch(/"txHash"/u);
    expect(await accessControl.hasRole(role, account)).toBe(false);

    emergencyForceAddProofObservations.push({
      methodKey: "AccessControlFacet.emergencyForceAdd",
      route: "POST /v1/access-control/admin/emergency-force-add",
      actor: founderAddress,
      actorRole: "EMERGENCY_ADMIN_ROLE",
      role,
      account,
      httpStatus: response.status,
      error: "Unauthorized(address,string)",
      stateUnchanged: true,
      transactionSubmitted: false,
      isolatedFork: true,
    });
  }, 180_000);

  it("proves payment-split liabilities and treasury sweeps conserve token custody on an isolated fork", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "payment split and treasury movement economic invariants", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.00002") },
      { address: marketplaceBuyerWallet.address, minimumWei: ethers.parseEther("0.00001") },
      { address: licensingOwnerAddress, minimumWei: ethers.parseEther("0.000006") },
      { address: licenseeWallet.address, minimumWei: ethers.parseEther("0.000006") },
      { address: transfereeWallet.address, minimumWei: ethers.parseEther("0.000006") },
      { address: outsiderWallet.address, minimumWei: ethers.parseEther("0.000006") },
    ])) return;

    const snapshot = await captureReceiptSnapshot();
    let proofCompleted = false;
    try {
      await disableStakingHookForIsolatedUsdcPaymentProof();
      const roleGrantEvidence: Array<{ role: string; account: string; transactionHash: string }> = [];
      const grantRoleThroughApi = async (role: string, account: string, label: string) => {
        const response = await apiCall(port, "POST", "/v1/access-control/admin/grant-role", {
          apiKey: "founder-key",
          body: { role, account, expiryTime: "0" },
        });
        expect(response.status, JSON.stringify(response.payload)).toBe(202);
        const txHash = extractTxHash(response.payload);
        await expectReceipt(txHash);
        roleGrantEvidence.push({ role, account, transactionHash: txHash });
        expect(await waitFor(
          () => accessControl.hasRole(role, account),
          (active) => active === true,
          `treasury role grant ${label}`,
        )).toBe(true);
      };
      const feeManagerRole = id("FEE_MANAGER_ROLE");
      if (!(await accessControl.hasRole(feeManagerRole, founderAddress))) {
        await grantRoleThroughApi(feeManagerRole, founderAddress, "fee manager");
      }
      const treasurySignerRole = id("TREASURY_SIGNER_ROLE");
      const timeLockRole = id("TIMELOCK_ROLE");
      const boardMemberRole = id("BOARD_MEMBER_ROLE");
      const treasuryRole = id("TREASURY_ROLE");
      expect(await accessControl.getRoleAdmin(boardMemberRole)).toBe(timeLockRole);
      expect(await accessControl.getRoleAdmin(treasuryRole)).toBe(boardMemberRole);
      expect(await accessControl.getRoleAdmin(treasurySignerRole)).toBe(treasuryRole);
      expect(await accessControl.hasRole(boardMemberRole, founderAddress)).toBe(false);
      expect(await accessControl.hasRole(treasuryRole, founderAddress)).toBe(false);
      expect(await accessControl.hasRole(treasurySignerRole, founderAddress)).toBe(false);
      expect(await accessControl.hasRole(treasurySignerRole, licenseeWallet.address)).toBe(false);

      if (!(await accessControl.hasRole(timeLockRole, founderAddress))) {
        await grantRoleThroughApi(timeLockRole, founderAddress, "timelock admin");
      }
      if (!(await accessControl.hasRole(boardMemberRole, founderAddress))) {
        await grantRoleThroughApi(boardMemberRole, founderAddress, "board member");
      }
      if (!(await accessControl.hasRole(treasuryRole, founderAddress))) {
        await grantRoleThroughApi(treasuryRole, founderAddress, "treasury admin");
      }
      for (const signer of [founderAddress, licenseeWallet.address]) {
        if (!(await accessControl.hasRole(treasurySignerRole, signer))) {
          await grantRoleThroughApi(treasurySignerRole, signer, `signer ${signer}`);
        }
      }
      for (const signer of [founderAddress, licenseeWallet.address]) {
        const roleReadback = await apiCall(
          port,
          "GET",
          `/v1/access-control/queries/has-role?role=${encodeURIComponent(treasurySignerRole)}&account=${encodeURIComponent(signer)}`,
          { apiKey: "read-key" },
        );
        expect(roleReadback.status).toBe(200);
        expect(roleReadback.payload).toBe(true);
      }

      const configuredPayees = {
        seller: founderAddress,
        treasury: licensingOwnerAddress,
        unionTreasury: licenseeWallet.address,
        devFund: transfereeWallet.address,
      };
      const addressUpdates = [
        ["PATCH", "/v1/marketplace/commands/update-treasury-address", { newTreasury: configuredPayees.treasury }],
        ["PATCH", "/v1/marketplace/commands/update-union-treasury-address", { newUnionTreasury: configuredPayees.unionTreasury }],
        ["PATCH", "/v1/marketplace/commands/update-dev-fund-address", { newDevFund: configuredPayees.devFund }],
      ] as const;
      for (const [method, path, body] of addressUpdates) {
        const response = await apiCall(port, method, path, { body });
        expect(response.status, JSON.stringify(response.payload)).toBe(202);
        await expectReceipt(extractTxHash(response.payload));
      }
      expect(await paymentFacet.getTreasuryAddress()).toBe(configuredPayees.treasury);
      expect(await paymentFacet.getUnionTreasuryAddress()).toBe(configuredPayees.unionTreasury);
      expect(await paymentFacet.getDevFundAddress()).toBe(configuredPayees.devFund);

      const createVoiceResponse = await apiCall(port, "POST", "/v1/voice-assets", {
        body: {
          ipfsHash: `QmPaymentSplitEconomics${Date.now()}`,
          royaltyRate: "100",
        },
      });
      expect(createVoiceResponse.status, JSON.stringify(createVoiceResponse.payload)).toBe(202);
      const voiceHash = String((createVoiceResponse.payload as Record<string, unknown>).result);
      await expectReceipt(extractTxHash(createVoiceResponse.payload));
      const tokenId = BigInt(await waitFor(
        () => voiceAsset.getTokenId(voiceHash),
        (value) => BigInt(value as bigint) > 0n,
        "payment split fixture token",
      ));
      await provider.send("evm_increaseTime", [86_401]);
      await provider.send("evm_mine", []);

      const paymentTokenAddress = await paymentFacet.getUsdcToken();
      const paymentToken = new Contract(paymentTokenAddress, [
        "function balanceOf(address account) view returns (uint256)",
        "function allowance(address owner,address spender) view returns (uint256)",
        "function approve(address spender,uint256 amount) returns (bool)",
      ], provider);
      const distributionAmount = 101n;
      expect(BigInt(await paymentToken.balanceOf(marketplaceBuyerWallet.address))).toBeGreaterThanOrEqual(distributionAmount);

      const readPending = async () => ({
        seller: BigInt(await paymentFacet.getPendingPayments(configuredPayees.seller)),
        treasury: BigInt(await paymentFacet.getPendingPayments(configuredPayees.treasury)),
        unionTreasury: BigInt(await paymentFacet.getPendingPayments(configuredPayees.unionTreasury)),
        devFund: BigInt(await paymentFacet.getPendingPayments(configuredPayees.devFund)),
      });
      const readPayeeBalances = async () => ({
        seller: BigInt(await paymentToken.balanceOf(configuredPayees.seller)),
        treasury: BigInt(await paymentToken.balanceOf(configuredPayees.treasury)),
        unionTreasury: BigInt(await paymentToken.balanceOf(configuredPayees.unionTreasury)),
        devFund: BigInt(await paymentToken.balanceOf(configuredPayees.devFund)),
      });
      const readDistributionEconomics = async () => {
        const [pending, payeeBalances, revenue, assetRevenue, stakingStats, buybackStatus, timewaveGift] = await Promise.all([
          readPending(),
          readPayeeBalances(),
          paymentFacet.getRevenueMetrics(),
          paymentFacet.getAssetRevenue(tokenId),
          stakingFacet.getStakingStats(),
          paymentFacet.getBuybackStatus(),
          paymentFacet.getPendingTimewaveGift(configuredPayees.seller),
        ]);
        return {
          buyer: BigInt(await paymentToken.balanceOf(marketplaceBuyerWallet.address)),
          custody: BigInt(await paymentToken.balanceOf(diamondAddress)),
          allowance: BigInt(await paymentToken.allowance(marketplaceBuyerWallet.address, diamondAddress)),
          pending,
          payeeBalances,
          totalVolume: BigInt(revenue.totalVolume),
          totalFees: BigInt(revenue.totalFees),
          totalRoyalties: BigInt(revenue.totalRoyalties),
          assetVolume: BigInt(assetRevenue.totalVolume),
          assetFees: BigInt(assetRevenue.totalFees),
          assetRoyalties: BigInt(assetRevenue.totalRoyalties),
          rewardPoolBalance: BigInt(stakingStats.rewardPoolBalance),
          buybackAccumulator: BigInt(buybackStatus.accumulator),
          timewaveGift: BigInt(timewaveGift),
        };
      };

      const buyerNonce = await provider.getTransactionCount(marketplaceBuyerWallet.address, "pending");
      const approvalReceipt = await (await paymentToken.connect(marketplaceBuyerWallet).approve(
        diamondAddress,
        distributionAmount,
        { nonce: buyerNonce },
      )).wait();
      expect(approvalReceipt?.status).toBe(1);
      expect(await paymentToken.allowance(marketplaceBuyerWallet.address, diamondAddress)).toBe(distributionAmount);
      const before = await readDistributionEconomics();

      const latestBlock = await provider.getBlock("latest");
      const expiredDistribution = await paymentFacet.connect(marketplaceBuyerWallet).distributePaymentWithDeadline(
        tokenId,
        distributionAmount,
        configuredPayees.seller,
        ethers.ZeroAddress,
        false,
        BigInt((latestBlock?.timestamp ?? 1) - 1),
        { gasLimit: 1_000_000n, nonce: buyerNonce + 1 },
      );
      await expect(expiredDistribution.wait()).rejects.toThrow();
      expect((await provider.getTransactionReceipt(expiredDistribution.hash))?.status).toBe(0);
      const afterExpiredDistribution = await readDistributionEconomics();
      const {
        pending: pendingBeforeExpired,
        payeeBalances: balancesBeforeExpired,
        ...scalarBeforeExpired
      } = before;
      const {
        pending: pendingAfterExpired,
        payeeBalances: balancesAfterExpired,
        ...scalarAfterExpired
      } = afterExpiredDistribution;
      assertNoEconomicSideEffects(
        "paymentSplit.expiredDistribution",
        scalarBeforeExpired,
        scalarAfterExpired,
      );
      assertNoEconomicSideEffects("paymentSplit.expiredDistribution.pending", pendingBeforeExpired, pendingAfterExpired);
      assertNoEconomicSideEffects("paymentSplit.expiredDistribution.balances", balancesBeforeExpired, balancesAfterExpired);

      const distributionReceipt = await (await paymentFacet.connect(marketplaceBuyerWallet).distributePayment(
        tokenId,
        distributionAmount,
        configuredPayees.seller,
        ethers.ZeroAddress,
        false,
        { nonce: buyerNonce + 2 },
      )).wait();
      expect(distributionReceipt?.status).toBe(1);
      const afterDistribution = await readDistributionEconomics();

      const feeConfig = await paymentFacet.getFeeConfiguration();
      const platformFee = (distributionAmount * BigInt(feeConfig.platformFee)) / 10_000n;
      const unionShare = (distributionAmount * BigInt(feeConfig.unionShare)) / 10_000n;
      const devFund = (distributionAmount * BigInt(feeConfig.devFund)) / 10_000n;
      const timewaveGift = (distributionAmount * BigInt(feeConfig.timewaveGift)) / 10_000n;
      const totalFees = platformFee + unionShare + devFund + timewaveGift;
      const sellerProceeds = distributionAmount - totalFees;
      const rewardPoolDelta = afterDistribution.rewardPoolBalance - before.rewardPoolBalance;
      const buybackDelta = afterDistribution.buybackAccumulator - before.buybackAccumulator;
      const treasuryProceeds = platformFee - rewardPoolDelta - buybackDelta;

      expect(rewardPoolDelta).toBeGreaterThanOrEqual(0n);
      expect(buybackDelta).toBeGreaterThanOrEqual(0n);
      expect(treasuryProceeds).toBeGreaterThanOrEqual(0n);
      assertExactAmountDelta("paymentSplit.buyer", before.buyer, afterDistribution.buyer, -distributionAmount);
      assertExactAmountDelta("paymentSplit.custody", before.custody, afterDistribution.custody, distributionAmount);
      assertExactAmountDelta("paymentSplit.allowance", before.allowance, afterDistribution.allowance, -distributionAmount);
      assertExactAmountDelta("paymentSplit.seller", before.pending.seller, afterDistribution.pending.seller, sellerProceeds);
      assertExactAmountDelta("paymentSplit.treasury", before.pending.treasury, afterDistribution.pending.treasury, treasuryProceeds);
      assertExactAmountDelta("paymentSplit.unionTreasury", before.pending.unionTreasury, afterDistribution.pending.unionTreasury, unionShare);
      assertExactAmountDelta("paymentSplit.devFund", before.pending.devFund, afterDistribution.pending.devFund, devFund);
      assertExactAmountDelta("paymentSplit.timewaveGift", before.timewaveGift, afterDistribution.timewaveGift, timewaveGift);
      assertExactAmountDelta("paymentSplit.totalVolume", before.totalVolume, afterDistribution.totalVolume, distributionAmount);
      assertExactAmountDelta("paymentSplit.totalFees", before.totalFees, afterDistribution.totalFees, totalFees);
      assertExactAmountDelta("paymentSplit.totalRoyalties", before.totalRoyalties, afterDistribution.totalRoyalties, sellerProceeds);
      assertExactAmountDelta("paymentSplit.assetVolume", before.assetVolume, afterDistribution.assetVolume, distributionAmount);
      assertExactAmountDelta("paymentSplit.assetFees", before.assetFees, afterDistribution.assetFees, totalFees);
      assertExactAmountDelta("paymentSplit.assetRoyalties", before.assetRoyalties, afterDistribution.assetRoyalties, sellerProceeds);
      assertConservedDeltas("paymentSplit.liabilities", [
        sellerProceeds,
        treasuryProceeds,
        unionShare,
        devFund,
        rewardPoolDelta,
        buybackDelta,
        timewaveGift,
        -distributionAmount,
      ]);

      const pendingBeforeSweeps = afterDistribution.pending;
      const balancesBeforeSweeps = afterDistribution.payeeBalances;
      const custodyBeforeSweeps = afterDistribution.custody;
      const sweepResponse = await apiCall(port, "POST", "/v1/workflows/treasury-revenue-operations", {
        body: {
          payouts: {
            sweeps: [
              { label: "seller", actor: { apiKey: "founder-key", walletAddress: configuredPayees.seller } },
              { label: "treasury", actor: { apiKey: "licensing-owner-key", walletAddress: configuredPayees.treasury } },
              { label: "union-treasury", actor: { apiKey: "licensee-key", walletAddress: configuredPayees.unionTreasury } },
              { label: "dev-fund", actor: { apiKey: "transferee-key", walletAddress: configuredPayees.devFund } },
            ],
          },
        },
      });
      expect(sweepResponse.status, JSON.stringify(sweepResponse.payload)).toBe(202);
      expect(sweepResponse.payload).toMatchObject({
        summary: {
          sweepCount: 4,
          completedSweepCount: 3,
          blockedSteps: ["payouts.treasury"],
        },
      });
      const pendingAfterSweeps = await readPending();
      const balancesAfterSweeps = await readPayeeBalances();
      const custodyAfterSweeps = BigInt(await paymentToken.balanceOf(diamondAddress));
      for (const label of ["seller", "treasury", "unionTreasury", "devFund"] as const) {
        const releasedAmount = label === "treasury" ? 0n : pendingBeforeSweeps[label];
        assertExactAmountDelta(`treasurySweep.${label}.pending`, pendingBeforeSweeps[label], pendingAfterSweeps[label], -releasedAmount);
        assertExactAmountDelta(`treasurySweep.${label}.balance`, balancesBeforeSweeps[label], balancesAfterSweeps[label], releasedAmount);
      }
      const sweptAmount = pendingBeforeSweeps.seller + pendingBeforeSweeps.unionTreasury + pendingBeforeSweeps.devFund;
      assertExactAmountDelta("treasurySweep.custody", custodyBeforeSweeps, custodyAfterSweeps, -sweptAmount);
      assertConservedDeltas("treasurySweep.conservation", [
        custodyAfterSweeps - custodyBeforeSweeps,
        ...Object.values(balancesAfterSweeps).map((value, index) => value - Object.values(balancesBeforeSweeps)[index]!),
      ]);

      const multisigResponse = await apiCall(port, "POST", "/v1/workflows/treasury-multisig-withdrawal", {
        body: {
          requiredApprovals: "2",
          approvers: [
            { apiKey: "founder-key", walletAddress: founderAddress },
            { apiKey: "licensee-key", walletAddress: licenseeWallet.address },
          ],
          executor: {
            apiKey: "licensing-owner-key",
            walletAddress: configuredPayees.treasury,
          },
        },
      });
      expect(multisigResponse.status, JSON.stringify(multisigResponse.payload)).toBe(202);
      const multisigProof = multisigResponse.payload as {
        approvals: { txHashes: string[]; economicsUnchanged: boolean };
        execution: {
          txHash: string;
          pending: { delta: string };
          custody: { delta: string };
          recipient: { delta: string };
          conservation: string;
        };
        summary: { releasedAmount: string; remainingPending: string; approvalCount: number };
      };
      expect(multisigProof.approvals).toMatchObject({ economicsUnchanged: true });
      expect(multisigProof.approvals.txHashes).toHaveLength(2);
      for (const txHash of [...multisigProof.approvals.txHashes, multisigProof.execution.txHash]) {
        await expectReceipt(txHash);
      }
      expect(multisigProof.execution).toMatchObject({
        pending: { delta: (-pendingAfterSweeps.treasury).toString() },
        custody: { delta: (-pendingAfterSweeps.treasury).toString() },
        recipient: { delta: pendingAfterSweeps.treasury.toString() },
        conservation: "0",
      });
      expect(multisigProof.summary).toEqual(expect.objectContaining({
        releasedAmount: pendingAfterSweeps.treasury.toString(),
        remainingPending: "0",
        approvalCount: 2,
      }));
      const pendingAfterMultisig = await readPending();
      const balancesAfterMultisig = await readPayeeBalances();
      const custodyAfterMultisig = BigInt(await paymentToken.balanceOf(diamondAddress));
      assertExactAmountDelta(
        "treasuryMultisig.pending",
        pendingAfterSweeps.treasury,
        pendingAfterMultisig.treasury,
        -pendingAfterSweeps.treasury,
      );
      assertExactAmountDelta(
        "treasuryMultisig.recipient",
        balancesAfterSweeps.treasury,
        balancesAfterMultisig.treasury,
        pendingAfterSweeps.treasury,
      );
      assertExactAmountDelta(
        "treasuryMultisig.custody",
        custodyAfterSweeps,
        custodyAfterMultisig,
        -pendingAfterSweeps.treasury,
      );

      const repeatMultisig = await apiCall(port, "POST", "/v1/workflows/treasury-multisig-withdrawal", {
        body: {
          amount: pendingAfterSweeps.treasury.toString(),
          requiredApprovals: "2",
          approvers: [
            { apiKey: "founder-key", walletAddress: founderAddress },
            { apiKey: "licensee-key", walletAddress: licenseeWallet.address },
          ],
          executor: {
            apiKey: "licensing-owner-key",
            walletAddress: configuredPayees.treasury,
          },
        },
      });
      expect(repeatMultisig.status).toBe(409);
      assertNoEconomicSideEffects("treasuryMultisig.repeat.pending", pendingAfterMultisig, await readPending());
      assertNoEconomicSideEffects("treasuryMultisig.repeat.balances", balancesAfterMultisig, await readPayeeBalances());
      assertExactAmountDelta(
        "treasuryMultisig.repeat.custody",
        custodyAfterMultisig,
        BigInt(await paymentToken.balanceOf(diamondAddress)),
        0n,
      );

      const repeatSweep = await apiCall(port, "POST", "/v1/workflows/treasury-revenue-operations", {
        body: {
          payouts: {
            sweeps: [
              { label: "seller", actor: { apiKey: "founder-key", walletAddress: configuredPayees.seller } },
              { label: "treasury", actor: { apiKey: "licensing-owner-key", walletAddress: configuredPayees.treasury } },
              { label: "union-treasury", actor: { apiKey: "licensee-key", walletAddress: configuredPayees.unionTreasury } },
              { label: "dev-fund", actor: { apiKey: "transferee-key", walletAddress: configuredPayees.devFund } },
            ],
          },
        },
      });
      expect(repeatSweep.status).toBe(202);
      expect(repeatSweep.payload).toMatchObject({
        summary: {
          sweepCount: 4,
          completedSweepCount: 0,
          blockedSteps: ["payouts.seller", "payouts.treasury", "payouts.union-treasury", "payouts.dev-fund"],
        },
      });
      assertExactAmountDelta(
        "treasurySweep.repeat.custody",
        custodyAfterMultisig,
        BigInt(await paymentToken.balanceOf(diamondAddress)),
        0n,
      );
      assertNoEconomicSideEffects("treasurySweep.repeat.pending", pendingAfterMultisig, await readPending());
      assertNoEconomicSideEffects("treasurySweep.repeat.balances", balancesAfterMultisig, await readPayeeBalances());
      const api06ArtifactPath = process.env.API_LAYER_API06_TREASURY_PROOF_ARTIFACT;
      if (api06ArtifactPath) {
        const receiptEvidenceInputs = [
          ...roleGrantEvidence.map((entry) => ({ ...entry, kind: "role-grant" })),
          ...multisigProof.approvals.txHashes.map((transactionHash) => ({
            kind: "multisig-approval",
            transactionHash,
          })),
          { kind: "multisig-execution", transactionHash: multisigProof.execution.txHash },
        ];
        const receiptEvidence = [];
        for (const entry of receiptEvidenceInputs) {
          const receipt = await provider.getTransactionReceipt(entry.transactionHash);
          receiptEvidence.push({
            ...entry,
            blockNumber: receipt?.blockNumber ?? null,
            status: receipt ? Number(receipt.status) : null,
            logCount: receipt?.logs.length ?? null,
            logTopics: receipt?.logs.map((log) => log.topics[0]) ?? [],
          });
        }
        const resolvedPath = path.resolve(api06ArtifactPath);
        await mkdir(path.dirname(resolvedPath), { recursive: true });
        await writeFile(resolvedPath, `${JSON.stringify({
          schemaVersion: 1,
          generatedAt: new Date().toISOString(),
          status: "diagnostic; approval observability remains open",
          chainId: Number((await provider.getNetwork()).chainId),
          diamondAddress,
          roleAdmins: {
            boardMember: timeLockRole,
            treasury: boardMemberRole,
            treasurySigner: treasuryRole,
          },
          roleGrantEvidence,
          signers: [founderAddress, licenseeWallet.address],
          approvals: {
            transactionHashes: multisigProof.approvals.txHashes,
            submittedApprovalReceiptCount: multisigProof.approvals.txHashes.length,
            economicsUnchanged: multisigProof.approvals.economicsUnchanged,
            contractApprovalCountReadback: null,
          },
          execution: { ...multisigProof.execution, ...multisigProof.summary },
          receiptEvidence,
          limitation: "The workflow currently derives approvalCount from submitted transaction hashes. PaymentFacet exposes no approval event or getter, so this artifact does not claim contract-state approval observability or indexer acceptance.",
        }, null, 2)}\n`);
      }
      proofCompleted = true;
    } finally {
      const reverted = await restoreReceiptSnapshot(snapshot).catch(() => false);
      if (proofCompleted) {
        expect(reverted).toBe(true);
      }
    }
  }, 300_000);

  it("exposes governance baseline reads through HTTP and preserves live proposal-threshold failures", async (ctx) => {
    if (await skipWhenFundingBlocked(ctx, "governance proposal-threshold proof", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.000008") },
    ])) return;
    const founderRole = id("FOUNDER_ROLE");
    const boardMemberRole = id("BOARD_MEMBER_ROLE");
    const zeroOperationId = id(`governance-proof-op-${Date.now()}`);

    const founderMultiplierResponse = await apiCall(
      port,
      "GET",
      `/v1/governance/queries/get-role-multiplier?role=${encodeURIComponent(founderRole)}`,
      { apiKey: "read-key" },
    );
    expect(founderMultiplierResponse.status).toBe(200);
    expect(founderMultiplierResponse.payload).toBe(String(await governorFacet.getRoleMultiplier(founderRole)));

    const boardMultiplierResponse = await apiCall(
      port,
      "GET",
      `/v1/governance/queries/get-role-multiplier?role=${encodeURIComponent(boardMemberRole)}`,
      { apiKey: "read-key" },
    );
    expect(boardMultiplierResponse.status).toBe(200);
    expect(boardMultiplierResponse.payload).toBe(String(await governorFacet.getRoleMultiplier(boardMemberRole)));

    const votingConfigResponse = await apiCall(port, "POST", "/v1/governance/queries/get-voting-config", {
      apiKey: "read-key",
      body: {},
    });
    expect(votingConfigResponse.status).toBe(200);
    expect(votingConfigResponse.payload).toEqual(normalize((await governorFacet.getVotingConfig() as any).toObject()));

    for (const [path, expected] of [
      ["/v1/governance/queries/governance-proposer-role", await proposalFacet.GOVERNANCE_PROPOSER_ROLE()],
      ["/v1/governance/queries/timelock-role", await proposalFacet.TIMELOCK_ROLE()],
      ["/v1/governance/queries/executor-role", await timelockFacet.EXECUTOR_ROLE()],
      ["/v1/governance/queries/proposer-role", await timelockFacet.PROPOSER_ROLE()],
    ] as const) {
      const response = path.includes("/queries/") && !path.includes("?")
        ? await apiCall(port, "POST", path, { apiKey: "read-key", body: {} })
        : await apiCall(port, "GET", path, { apiKey: "read-key" });
      expect(response.status).toBe(200);
      expect(response.payload).toBe(expected);
    }

    const minDelayResponse = await apiCall(port, "POST", "/v1/governance/queries/get-min-delay", {
      apiKey: "read-key",
      body: {},
    });
    expect(minDelayResponse.status).toBe(200);
    expect(minDelayResponse.payload).toBe(String(await timelockFacet.getMinDelay()));

    const proposalTypeConfigResponse = await apiCall(
      port,
      "GET",
      "/v1/governance/queries/get-proposal-type-config?proposalType=0",
      { apiKey: "read-key" },
    );
    expect(proposalTypeConfigResponse.status).toBe(200);
    expect(proposalTypeConfigResponse.payload).toEqual(
      proposalTypeConfigToObject(await proposalFacet.getProposalTypeConfig(0n)),
    );

    const activeProposalsResponse = await apiCall(port, "POST", "/v1/governance/queries/get-active-proposals", {
      apiKey: "read-key",
      body: {},
    });
    expect(activeProposalsResponse.status).toBe(200);
    expect(activeProposalsResponse.payload).toEqual(normalize(await proposalFacet.getActiveProposals()));

    const proposerProposalsResponse = await apiCall(
      port,
      "GET",
      `/v1/governance/queries/get-proposer-proposals?proposer=${encodeURIComponent(founderAddress)}`,
      { apiKey: "read-key" },
    );
    expect(proposerProposalsResponse.status).toBe(200);
    expect(proposerProposalsResponse.payload).toEqual(normalize(await proposalFacet.getProposerProposals(founderAddress)));

    const operationResponse = await apiCall(
      port,
      "GET",
      `/v1/governance/queries/get-operation?id=${encodeURIComponent(zeroOperationId)}`,
      { apiKey: "read-key" },
    );
    expect(operationResponse.status).toBe(200);
    expect(operationResponse.payload).toEqual(
      timelockOperationToObject(await timelockFacet.getOperation(zeroOperationId)),
    );

    for (const [path, expected] of [
      [`/v1/governance/queries/get-timestamp?id=${encodeURIComponent(zeroOperationId)}`, String(await timelockFacet.getTimestamp(zeroOperationId))],
      [`/v1/governance/queries/is-operation-executed?id=${encodeURIComponent(zeroOperationId)}`, await timelockFacet.isOperationExecuted(zeroOperationId)],
      [`/v1/governance/queries/is-operation-pending?id=${encodeURIComponent(zeroOperationId)}`, await timelockFacet.isOperationPending(zeroOperationId)],
      [`/v1/governance/queries/is-operation-ready?id=${encodeURIComponent(zeroOperationId)}`, await timelockFacet.isOperationReady(zeroOperationId)],
    ] as const) {
      const response = await apiCall(port, "GET", path, { apiKey: "read-key" });
      expect(response.status).toBe(200);
      expect(response.payload).toEqual(expected);
    }

    const latestBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, latestBlock - 9);
    for (const [path, topicHash] of [
      ["/v1/governance/events/proposal-created/query", proposalFacet.interface.getEvent("ProposalCreated")!.topicHash],
      ["/v1/governance/events/vote-cast/query", proposalFacet.interface.getEvent("VoteCast")!.topicHash],
    ] as const) {
      const eventResponse = await apiCall(port, "POST", path, {
        apiKey: "read-key",
        body: {
          fromBlock: String(fromBlock),
          toBlock: String(latestBlock),
        },
      });
      expect(eventResponse.status).toBe(200);
      const directLogs = await provider.getLogs({
        address: diamondAddress,
        topics: [topicHash],
        fromBlock,
        toBlock: latestBlock,
      });
      expect(Array.isArray(eventResponse.payload)).toBe(true);
      expect((eventResponse.payload as Array<unknown>).length).toBe(directLogs.length);
    }

    let directEmptyTargetsError = "";
    try {
      await proposalFacet.connect(founderWallet)["propose(string,string,address[],uint256[],bytes[],uint8)"].staticCall(
        `API governance empty targets ${Date.now()}`,
        "governance empty targets proof",
        [],
        [],
        [],
        0,
      );
    } catch (error) {
      directEmptyTargetsError = extractRevertMarker(error);
    }
    expect(directEmptyTargetsError).toContain("0xd51c7d26");

    const invalidProposalTypeResponse = await apiCall(
      port,
      "POST",
      "/v1/governance/proposals",
      {
        body: {
          title: `API governance empty targets ${Date.now()}`,
          description: "governance empty targets proof",
          targets: [],
          values: [],
          calldatas: [],
          proposalType: 0,
        },
      },
    );
    expect(invalidProposalTypeResponse.status).toBe(400);

    const emptyTargetsResponse = await apiCall(
      port,
      "POST",
      "/v1/governance/proposals",
      {
        body: {
          title: `API governance empty targets ${Date.now()}`,
          description: "governance empty targets proof",
          targets: [],
          values: [],
          calldatas: [],
          proposalType: "0",
        },
      },
    );
    expect(emptyTargetsResponse.status).toBe(500);
    expect(JSON.stringify(emptyTargetsResponse.payload)).toMatch(/EmptyTargets|d51c7d26/u);

    const thresholdCalldata = governorFacet.interface.encodeFunctionData("updateVotingDelay", [6000n]);
    const threshold = await governorFacet.getVotingConfig().then((tuple) => tuple[2]);
    expect(await delegationFacet.getCurrentVotes(founderAddress)).toBeGreaterThanOrEqual(threshold);

    const thresholdReadyResponse = await apiCall(
      port,
      "POST",
      "/v1/governance/proposals",
      {
        body: {
          description: "governance threshold proof",
          targets: [diamondAddress],
          values: ["0"],
          calldatas: [thresholdCalldata],
          proposalType: "0",
        },
      },
    );
    expect(thresholdReadyResponse.status).toBe(202);
  }, 300_000);

  it("proves timelock schedule, cancel, and execute receipts on a local fork", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "timelock receipt lifecycle", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.000012") },
    ])) return;

    for (const role of [await timelockFacet.PROPOSER_ROLE(), await timelockFacet.EXECUTOR_ROLE()]) {
      if (await accessControl.hasRole(role, founderAddress)) {
        continue;
      }
      const grantResponse = await apiCall(port, "POST", "/v1/access-control/commands/grant-role", {
        body: { role, account: founderAddress, expiryTime: "0" },
      });
      expect(grantResponse.status, JSON.stringify(grantResponse.payload)).toBe(202);
      await expectReceipt(extractTxHash(grantResponse.payload));
      expect(await accessControl.hasRole(role, founderAddress)).toBe(true);
    }

    const minDelay = await timelockFacet.getMinDelay();
    const readCalldata = timelockFacet.interface.encodeFunctionData("getMinDelay");
    const baseProposalId = BigInt(await provider.getBlockNumber()) * 1_000_000n + BigInt(Date.now() % 1_000_000);
    const buildOperation = (proposalId: bigint, label: string) => ({
      proposalId: proposalId.toString(),
      targets: [diamondAddress],
      values: ["0"],
      calldatas: [readCalldata],
      predecessor: ZERO_BYTES32,
      salt: id(`indexer-timelock-${label}-${Date.now()}`),
      delay: minDelay.toString(),
    });
    const submit = async (method: string, route: string, body: Record<string, unknown>) => {
      const response = await apiCall(port, method, route, { body });
      expect(response.status, JSON.stringify(response.payload)).toBe(202);
      const txHash = extractTxHash(response.payload);
      await expectReceipt(txHash);
      const receipt = await provider.getTransactionReceipt(txHash);
      expect(receipt?.status).toBe(1);
      return { txHash, receipt: receipt! };
    };
    const parsedTimelockEvents = (receipt: NonNullable<Awaited<ReturnType<typeof provider.getTransactionReceipt>>>) =>
      receipt.logs.flatMap((log) => {
        try {
          const parsed = timelockFacet.interface.parseLog(log);
          return parsed ? [{ name: parsed.name, signature: parsed.signature, args: parsed.args }] : [];
        } catch {
          return [];
        }
      });

    const canceledOperation = buildOperation(baseProposalId, "cancel");
    const scheduledForCancel = await submit("POST", "/v1/governance/commands/schedule", canceledOperation);
    const cancelScheduleEvents = parsedTimelockEvents(scheduledForCancel.receipt);
    expect(cancelScheduleEvents.map((event) => event.name)).toEqual(expect.arrayContaining([
      "OperationScheduled",
      "OperationStored",
    ]));
    const canceledOperationId = String(cancelScheduleEvents.find((event) => event.name === "OperationScheduled")?.args.id);
    expect(canceledOperationId).toMatch(/^0x[a-fA-F0-9]{64}$/u);
    expect((await timelockFacet.getOperation(canceledOperationId)).canceled).toBe(false);

    const canceled = await submit("DELETE", "/v1/governance/commands/cancel", canceledOperation);
    expect(parsedTimelockEvents(canceled.receipt).map((event) => event.name)).toEqual(expect.arrayContaining([
      "TimelockOperationCanceled",
      "OperationRemoved",
    ]));
    expect((await timelockFacet.getOperation(canceledOperationId)).canceled).toBe(true);

    const executedOperation = buildOperation(baseProposalId + 1n, "execute");
    const scheduledForExecution = await submit("POST", "/v1/governance/commands/schedule", executedOperation);
    const executionScheduleEvents = parsedTimelockEvents(scheduledForExecution.receipt);
    const executedOperationId = String(executionScheduleEvents.find((event) => event.name === "OperationScheduled")?.args.id);
    expect(executedOperationId).toMatch(/^0x[a-fA-F0-9]{64}$/u);
    expect(await timelockFacet.isOperationPending(executedOperationId)).toBe(true);

    const storedExecution = await timelockFacet.getOperation(executedOperationId);
    const latestExecutionBlock = await provider.getBlock("latest");
    const secondsUntilReady = storedExecution.timestamp - BigInt(latestExecutionBlock!.timestamp) + 1n;
    expect(secondsUntilReady).toBeGreaterThan(0n);
    await provider.send("evm_increaseTime", [Number(secondsUntilReady)]);
    await provider.send("evm_mine", []);
    expect(await timelockFacet.isOperationReady(executedOperationId)).toBe(true);

    const executed = await submit("POST", "/v1/governance/commands/execute", executedOperation);
    const executionEvents = parsedTimelockEvents(executed.receipt);
    expect(executionEvents.map((event) => event.signature)).toEqual(expect.arrayContaining([
      "OperationExecuted(bytes32,uint256,uint256)",
      "OperationExecuted(bytes32)",
      "CallExecuted(address,uint256,bytes,bool)",
    ]));
    expect(await timelockFacet.isOperationExecuted(executedOperationId)).toBe(true);
  }, 180_000);

  it("proves tokenomics reads and reversible admin/token flows through HTTP on Base Sepolia", async (ctx) => {
    if (await skipWhenFundingBlocked(ctx, "tokenomics reversible admin and token flows", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.000015") },
      { address: licenseeWallet.address, minimumWei: ethers.parseEther("0.000003") },
      { address: transfereeWallet.address, minimumWei: ethers.parseEther("0.000003") },
      { address: outsiderWallet.address, minimumWei: ethers.parseEther("0.000003") },
    ])) return;
    const day = 24n * 60n * 60n;
    const transferAmount = 1000n;
    const delegatedAmount = 250n;
    const originalFounderBalance = await tokenSupplyFacet.tokenBalanceOf(founderAddress);
    const originalLicenseeBalance = await tokenSupplyFacet.tokenBalanceOf(licenseeWallet.address);
    const originalTransfereeBalance = await tokenSupplyFacet.tokenBalanceOf(transfereeWallet.address);
    const originalTotalSupply = await tokenSupplyFacet.totalSupply();
    const originalAllowance = await tokenSupplyFacet.tokenAllowance(founderAddress, outsiderWallet.address);
    const originalBurnLimit = await burnThresholdFacet.thresholdGetBurnLimit();
    const originalQuarterlyRate = await timewaveGiftFacet.getQuarterlyUnlockRate();
    const originalMinDuration = await timewaveGiftFacet.getMinTwaveVestingDuration();
    const targetBurnLimit = originalBurnLimit === 2500n ? 2400n : 2500n;
    const targetQuarterlyRate = originalQuarterlyRate === 2000n ? 2500n : 2000n;
    const targetMinDuration = originalMinDuration === 60n * day ? 90n * day : 60n * day;
    const timewaveConfigurationReceiptHashes: Record<string, string[]> = {
      setQuarterlyUnlockRate: [],
      setMinimumTwaveVestingDuration: [],
    };

    await ensureNativeBalance(founderAddress, ethers.parseEther("0.000015"));
    for (const wallet of [licenseeWallet, transfereeWallet, outsiderWallet]) {
      await ensureNativeBalance(wallet.address, ethers.parseEther("0.000003"));
    }

    try {
      const readAssertions: Array<readonly [string, string, string | undefined, unknown]> = [
        ["POST", "/v1/tokenomics/queries/token-name", "read-key", await tokenSupplyFacet.tokenName()],
        ["POST", "/v1/tokenomics/queries/token-symbol", "read-key", await tokenSupplyFacet.tokenSymbol()],
        ["POST", "/v1/tokenomics/queries/decimals", "read-key", normalize(await tokenSupplyFacet.decimals())],
        ["POST", "/v1/tokenomics/queries/total-supply", "read-key", normalize(await tokenSupplyFacet.totalSupply())],
        ["POST", "/v1/tokenomics/queries/supply-get-maximum", "read-key", normalize(await tokenSupplyFacet.supplyGetMaximum())],
        ["POST", "/v1/tokenomics/queries/supply-is-minting-finished", "read-key", await tokenSupplyFacet.supplyIsMintingFinished()],
        ["GET", `/v1/tokenomics/queries/token-balance-of?account=${encodeURIComponent(founderAddress)}`, "read-key", normalize(originalFounderBalance)],
        ["GET", `/v1/tokenomics/queries/threshold-calculate-excess?account=${encodeURIComponent(founderAddress)}`, "read-key", normalize(await burnThresholdFacet.thresholdCalculateExcess(founderAddress))],
        ["POST", "/v1/tokenomics/queries/threshold-get-burn-limit", "read-key", normalize(originalBurnLimit)],
        ["POST", "/v1/tokenomics/queries/get-quarterly-unlock-rate", "read-key", normalize(originalQuarterlyRate)],
        ["POST", "/v1/tokenomics/queries/get-min-twave-vesting-duration", "read-key", normalize(originalMinDuration)],
      ];

      for (const [method, path, apiKey, expected] of readAssertions) {
        const response = await apiCall(port, method, path, method === "POST" ? { apiKey, body: {} } : { apiKey });
        expect(response.status).toBe(200);
        expect(response.payload).toEqual(expected);
      }

      const transferToLicenseeResponse = await apiCall(port, "POST", "/v1/tokenomics/commands/transfer", {
        body: { to: licenseeWallet.address, amount: transferAmount.toString() },
      });
      expect(transferToLicenseeResponse.status).toBe(202);
      const transferToLicenseeTxHash = extractTxHash(transferToLicenseeResponse.payload);
      await expectReceipt(transferToLicenseeTxHash);

      const transferToLicenseeReceipt = await provider.getTransactionReceipt(transferToLicenseeTxHash);
      const transferEvents = await waitFor(
        () => apiCall(port, "POST", "/v1/tokenomics/events/transfer/query/token-supply", {
          apiKey: "read-key",
          body: {
            fromBlock: String(transferToLicenseeReceipt!.blockNumber),
            toBlock: String(transferToLicenseeReceipt!.blockNumber),
          },
        }),
        (response) =>
          response.status === 200 &&
          Array.isArray(response.payload) &&
          response.payload.some((log) => (log as Record<string, unknown>).transactionHash === transferToLicenseeTxHash),
        "tokenomics transfer event query",
      );
      expect(transferEvents.status).toBe(200);
      await waitFor(
        () => tokenSupplyFacet.tokenBalanceOf(licenseeWallet.address),
        (value) => value === originalLicenseeBalance + transferAmount,
        "tokenomics founder transfer to licensee",
      );
      const founderAfterLicenseeTransfer = await tokenSupplyFacet.tokenBalanceOf(founderAddress);
      const licenseeAfterFounderTransfer = await tokenSupplyFacet.tokenBalanceOf(licenseeWallet.address);
      const supplyAfterLicenseeTransfer = await tokenSupplyFacet.totalSupply();
      const founderTransferDelta = assertExactAmountDelta(
        "tokenomics.transfer.founder",
        originalFounderBalance,
        founderAfterLicenseeTransfer,
        -transferAmount,
      );
      const licenseeTransferDelta = assertExactAmountDelta(
        "tokenomics.transfer.licensee",
        originalLicenseeBalance,
        licenseeAfterFounderTransfer,
        transferAmount,
      );
      assertExactAmountDelta("tokenomics.transfer.totalSupply", originalTotalSupply, supplyAfterLicenseeTransfer, 0n);
      assertConservedDeltas("tokenomics.transfer", [founderTransferDelta.delta, licenseeTransferDelta.delta]);

      const transferBackResponse = await apiCall(port, "POST", "/v1/tokenomics/commands/transfer", {
        apiKey: "licensee-key",
        body: { to: founderAddress, amount: transferAmount.toString() },
      });
      expect(transferBackResponse.status).toBe(202);
      await expectReceipt(extractTxHash(transferBackResponse.payload));
      await waitFor(
        () => tokenSupplyFacet.tokenBalanceOf(licenseeWallet.address),
        (value) => value === originalLicenseeBalance,
        "tokenomics licensee transfer back",
      );
      assertNoEconomicSideEffects(
        "tokenomics.transferRoundTrip",
        {
          founder: originalFounderBalance,
          licensee: originalLicenseeBalance,
          totalSupply: originalTotalSupply,
        },
        {
          founder: await tokenSupplyFacet.tokenBalanceOf(founderAddress),
          licensee: await tokenSupplyFacet.tokenBalanceOf(licenseeWallet.address),
          totalSupply: await tokenSupplyFacet.totalSupply(),
        },
      );

      const approveResponse = await apiCall(port, "POST", "/v1/tokenomics/commands/token-approve", {
        body: { spender: outsiderWallet.address, amount: delegatedAmount.toString() },
      });
      expect(approveResponse.status).toBe(202);
      const approveTxHash = extractTxHash(approveResponse.payload);
      await expectReceipt(approveTxHash);
      await waitFor(
        () => tokenSupplyFacet.tokenAllowance(founderAddress, outsiderWallet.address),
        (value) => value === delegatedAmount,
        "tokenomics approval allowance update",
      );

      const approveReceipt = await provider.getTransactionReceipt(approveTxHash);
      const approvalEvents = await waitFor(
        () => apiCall(port, "POST", "/v1/tokenomics/events/approval/query", {
          apiKey: "read-key",
          body: {
            fromBlock: String(approveReceipt!.blockNumber),
            toBlock: String(approveReceipt!.blockNumber),
          },
        }),
        (response) =>
          response.status === 200 &&
          Array.isArray(response.payload) &&
          response.payload.some((log) => (log as Record<string, unknown>).transactionHash === approveTxHash),
        "tokenomics approval event query",
      );
      expect(approvalEvents.status).toBe(200);

      const transferFromResponse = await apiCall(port, "POST", "/v1/tokenomics/commands/token-transfer-from", {
        apiKey: "outsider-key",
        body: {
          from: founderAddress,
          to: transfereeWallet.address,
          amount: delegatedAmount.toString(),
        },
      });
      expect(transferFromResponse.status).toBe(202);
      await expectReceipt(extractTxHash(transferFromResponse.payload));
      await waitFor(
        () => tokenSupplyFacet.tokenBalanceOf(transfereeWallet.address),
        (value) => value === originalTransfereeBalance + delegatedAmount,
        "tokenomics tokenTransferFrom recipient balance",
      );
      await waitFor(
        () => tokenSupplyFacet.tokenAllowance(founderAddress, outsiderWallet.address),
        (value) => value === 0n,
        "tokenomics consumed allowance",
      );
      const founderAfterTransferFrom = await tokenSupplyFacet.tokenBalanceOf(founderAddress);
      const transfereeAfterTransferFrom = await tokenSupplyFacet.tokenBalanceOf(transfereeWallet.address);
      const allowanceAfterTransferFrom = await tokenSupplyFacet.tokenAllowance(founderAddress, outsiderWallet.address);
      const supplyAfterTransferFrom = await tokenSupplyFacet.totalSupply();
      const transferFromFounderDelta = assertExactAmountDelta(
        "tokenomics.transferFrom.founder",
        originalFounderBalance,
        founderAfterTransferFrom,
        -delegatedAmount,
      );
      const transferFromRecipientDelta = assertExactAmountDelta(
        "tokenomics.transferFrom.transferee",
        originalTransfereeBalance,
        transfereeAfterTransferFrom,
        delegatedAmount,
      );
      assertExactAmountDelta(
        "tokenomics.transferFrom.allowance",
        delegatedAmount,
        allowanceAfterTransferFrom,
        -delegatedAmount,
      );
      assertExactAmountDelta("tokenomics.transferFrom.totalSupply", originalTotalSupply, supplyAfterTransferFrom, 0n);
      assertConservedDeltas("tokenomics.transferFrom", [transferFromFounderDelta.delta, transferFromRecipientDelta.delta]);

      const standardApproveResponse = await apiCall(port, "POST", "/v1/tokenomics/commands/approve", {
        body: { spender: outsiderWallet.address, amount: delegatedAmount.toString() },
      });
      expect(standardApproveResponse.status).toBe(202);
      const standardApproveTxHash = extractTxHash(standardApproveResponse.payload);
      await expectReceipt(standardApproveTxHash);
      await waitFor(
        () => tokenSupplyFacet.allowance(founderAddress, outsiderWallet.address),
        (value) => value === delegatedAmount,
        "tokenomics standard approval allowance update",
      );

      const standardTransferFromResponse = await apiCall(port, "POST", "/v1/tokenomics/commands/transfer-from", {
        apiKey: "outsider-key",
        body: {
          from: founderAddress,
          to: transfereeWallet.address,
          amount: delegatedAmount.toString(),
        },
      });
      expect(standardTransferFromResponse.status).toBe(202);
      const standardTransferFromTxHash = extractTxHash(standardTransferFromResponse.payload);
      await expectReceipt(standardTransferFromTxHash);
      await waitFor(
        () => tokenSupplyFacet.balanceOf(transfereeWallet.address),
        (value) => value === originalTransfereeBalance + (delegatedAmount * 2n),
        "tokenomics standard transferFrom recipient balance",
      );
      await waitFor(
        () => tokenSupplyFacet.allowance(founderAddress, outsiderWallet.address),
        (value) => value === 0n,
        "tokenomics consumed standard allowance",
      );

      const transferBackFromTransfereeResponse = await apiCall(port, "POST", "/v1/tokenomics/commands/transfer", {
        apiKey: "transferee-key",
        body: { to: founderAddress, amount: (delegatedAmount * 2n).toString() },
      });
      expect(transferBackFromTransfereeResponse.status).toBe(202);
      await expectReceipt(extractTxHash(transferBackFromTransfereeResponse.payload));
      await waitFor(
        () => tokenSupplyFacet.tokenBalanceOf(transfereeWallet.address),
        (value) => value === originalTransfereeBalance,
        "tokenomics transferee transfer back",
      );
      assertNoEconomicSideEffects(
        "tokenomics.transferFromRoundTrip",
        {
          founder: originalFounderBalance,
          transferee: originalTransfereeBalance,
          totalSupply: originalTotalSupply,
        },
        {
          founder: await tokenSupplyFacet.tokenBalanceOf(founderAddress),
          transferee: await tokenSupplyFacet.tokenBalanceOf(transfereeWallet.address),
          totalSupply: await tokenSupplyFacet.totalSupply(),
        },
      );

      const setBurnLimitResponse = await apiCall(port, "POST", "/v1/tokenomics/commands/threshold-set-burn-limit", {
        body: { threshold: targetBurnLimit.toString() },
      });
      expect(setBurnLimitResponse.status).toBe(202);
      const setBurnLimitTxHash = extractTxHash(setBurnLimitResponse.payload);
      await expectReceipt(setBurnLimitTxHash);
      let updatedBurnLimit = await burnThresholdFacet.thresholdGetBurnLimit();
      for (let attempt = 0; attempt < 6 && updatedBurnLimit !== targetBurnLimit; attempt += 1) {
        await delay(500);
        updatedBurnLimit = await burnThresholdFacet.thresholdGetBurnLimit();
      }

      if (updatedBurnLimit === targetBurnLimit) {
        const setBurnLimitReceipt = await provider.getTransactionReceipt(setBurnLimitTxHash);
        const burnThresholdEvents = await waitFor(
          () => apiCall(port, "POST", "/v1/tokenomics/events/burn-threshold-updated/query", {
            apiKey: "read-key",
            body: {
              fromBlock: String(setBurnLimitReceipt!.blockNumber),
              toBlock: String(setBurnLimitReceipt!.blockNumber),
            },
          }),
          (response) =>
            response.status === 200 &&
            Array.isArray(response.payload) &&
            response.payload.some((log) => (log as Record<string, unknown>).transactionHash === setBurnLimitTxHash),
          "tokenomics burn-threshold event query",
        );
        expect(burnThresholdEvents.status).toBe(200);

        const updatedBurnLimitResponse = await waitFor(
          () => apiCall(port, "POST", "/v1/tokenomics/queries/threshold-get-burn-limit", {
            apiKey: "read-key",
            body: {},
          }),
          (response) => response.status === 200 && response.payload === targetBurnLimit.toString(),
          "tokenomics burn limit readback",
          { attempts: 120 },
        );
        expect(updatedBurnLimitResponse.status).toBe(200);
        expect(updatedBurnLimitResponse.payload).toBe(targetBurnLimit.toString());
      } else {
        expect(updatedBurnLimit).toBe(originalBurnLimit);
      }

      const timewaveConfigurationBalances = {
        founder: await tokenSupplyFacet.tokenBalanceOf(founderAddress),
        licensee: await tokenSupplyFacet.tokenBalanceOf(licenseeWallet.address),
        transferee: await tokenSupplyFacet.tokenBalanceOf(transfereeWallet.address),
        totalSupply: await tokenSupplyFacet.totalSupply(),
      };
      const setQuarterlyRateResponse = await apiCall(port, "PATCH", "/v1/tokenomics/commands/set-quarterly-unlock-rate", {
        body: { rate: targetQuarterlyRate.toString() },
      });
      expect(setQuarterlyRateResponse.status).toBe(202);
      const setQuarterlyRateTxHash = extractTxHash(setQuarterlyRateResponse.payload);
      timewaveConfigurationReceiptHashes.setQuarterlyUnlockRate.push(setQuarterlyRateTxHash);
      await expectReceipt(setQuarterlyRateTxHash);
      await waitFor(
        () => timewaveGiftFacet.getQuarterlyUnlockRate(),
        (value) => value === targetQuarterlyRate,
        "tokenomics quarterly unlock rate update",
      );

      const setMinDurationResponse = await apiCall(port, "PATCH", "/v1/tokenomics/commands/set-minimum-twave-vesting-duration", {
        body: { duration: targetMinDuration.toString() },
      });
      expect(setMinDurationResponse.status).toBe(202);
      const setMinDurationTxHash = extractTxHash(setMinDurationResponse.payload);
      timewaveConfigurationReceiptHashes.setMinimumTwaveVestingDuration.push(setMinDurationTxHash);
      await expectReceipt(setMinDurationTxHash);
      await waitFor(
        () => timewaveGiftFacet.getMinTwaveVestingDuration(),
        (value) => value === targetMinDuration,
        "tokenomics minimum twave duration update",
      );
      expect({
        founder: await tokenSupplyFacet.tokenBalanceOf(founderAddress),
        licensee: await tokenSupplyFacet.tokenBalanceOf(licenseeWallet.address),
        transferee: await tokenSupplyFacet.tokenBalanceOf(transfereeWallet.address),
        totalSupply: await tokenSupplyFacet.totalSupply(),
      }).toEqual(timewaveConfigurationBalances);
    } finally {
      const currentTransfereeBalance = await tokenSupplyFacet.tokenBalanceOf(transfereeWallet.address);
      if (currentTransfereeBalance > originalTransfereeBalance) {
        const restoreTransfereeResponse = await apiCall(port, "POST", "/v1/tokenomics/commands/transfer", {
          apiKey: "transferee-key",
          body: { to: founderAddress, amount: (currentTransfereeBalance - originalTransfereeBalance).toString() },
        });
        if (restoreTransfereeResponse.status === 202) {
          await expectReceipt(extractTxHash(restoreTransfereeResponse.payload));
        }
      }

      const currentLicenseeBalance = await tokenSupplyFacet.tokenBalanceOf(licenseeWallet.address);
      if (currentLicenseeBalance > originalLicenseeBalance) {
        const restoreLicenseeResponse = await apiCall(port, "POST", "/v1/tokenomics/commands/transfer", {
          apiKey: "licensee-key",
          body: { to: founderAddress, amount: (currentLicenseeBalance - originalLicenseeBalance).toString() },
        });
        if (restoreLicenseeResponse.status === 202) {
          await expectReceipt(extractTxHash(restoreLicenseeResponse.payload));
        }
      }

      const currentAllowance = await tokenSupplyFacet.tokenAllowance(founderAddress, outsiderWallet.address);
      if (currentAllowance !== originalAllowance) {
        const restoreAllowanceResponse = await apiCall(port, "POST", "/v1/tokenomics/commands/token-approve", {
          body: { spender: outsiderWallet.address, amount: originalAllowance.toString() },
        });
        if (restoreAllowanceResponse.status === 202) {
          await expectReceipt(extractTxHash(restoreAllowanceResponse.payload));
        }
      }

      if ((await burnThresholdFacet.thresholdGetBurnLimit()) !== originalBurnLimit) {
        const restoreBurnLimitResponse = await apiCall(port, "POST", "/v1/tokenomics/commands/threshold-set-burn-limit", {
          body: { threshold: originalBurnLimit.toString() },
        });
        if (restoreBurnLimitResponse.status === 202) {
          await expectReceipt(extractTxHash(restoreBurnLimitResponse.payload));
        }
      }

      if ((await timewaveGiftFacet.getQuarterlyUnlockRate()) !== originalQuarterlyRate) {
        const restoreQuarterlyRateResponse = await apiCall(port, "PATCH", "/v1/tokenomics/commands/set-quarterly-unlock-rate", {
          body: { rate: originalQuarterlyRate.toString() },
        });
        if (restoreQuarterlyRateResponse.status === 202) {
          await expectReceipt(extractTxHash(restoreQuarterlyRateResponse.payload));
        }
      }

      if ((await timewaveGiftFacet.getMinTwaveVestingDuration()) !== originalMinDuration) {
        const restoreMinDurationResponse = await apiCall(port, "PATCH", "/v1/tokenomics/commands/set-minimum-twave-vesting-duration", {
          body: { duration: originalMinDuration.toString() },
        });
        if (restoreMinDurationResponse.status === 202) {
          await expectReceipt(extractTxHash(restoreMinDurationResponse.payload));
        }
      }

      expect(await waitFor(
        () => tokenSupplyFacet.tokenBalanceOf(founderAddress),
        (value) => value === originalFounderBalance,
        "tokenomics founder balance restore",
      )).toBe(originalFounderBalance);
      expect(await waitFor(
        () => tokenSupplyFacet.tokenBalanceOf(licenseeWallet.address),
        (value) => value === originalLicenseeBalance,
        "tokenomics licensee balance restore",
      )).toBe(originalLicenseeBalance);
      expect(await waitFor(
        () => tokenSupplyFacet.tokenBalanceOf(transfereeWallet.address),
        (value) => value === originalTransfereeBalance,
        "tokenomics transferee balance restore",
      )).toBe(originalTransfereeBalance);
      expect(await waitFor(
        () => tokenSupplyFacet.tokenAllowance(founderAddress, outsiderWallet.address),
        (value) => value === originalAllowance,
        "tokenomics allowance restore",
      )).toBe(originalAllowance);
      expect(await waitFor(
        () => burnThresholdFacet.thresholdGetBurnLimit(),
        (value) => value === originalBurnLimit,
        "tokenomics burn limit restore",
      )).toBe(originalBurnLimit);
      expect(await waitFor(
        () => timewaveGiftFacet.getQuarterlyUnlockRate(),
        (value) => value === originalQuarterlyRate,
        "tokenomics quarterly rate restore",
        { attempts: 120 },
      )).toBe(originalQuarterlyRate);
      expect(await waitFor(
        () => timewaveGiftFacet.getMinTwaveVestingDuration(),
        (value) => value === originalMinDuration,
        "tokenomics minimum duration restore",
        { attempts: 120 },
      )).toBe(originalMinDuration);
    }
    const proofDirectory = path.resolve(".runtime");
    await mkdir(proofDirectory, { recursive: true });
    await writeFile(path.join(proofDirectory, "api05-timewave-configuration-receipts.json"), `${JSON.stringify({
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      status: "proven working",
      transactionHashes: Object.values(timewaveConfigurationReceiptHashes).flat(),
      methods: timewaveConfigurationReceiptHashes,
    }, null, 2)}\n`);
  }, 300_000);

  it("proves the reward campaign lifecycle and a funded participant claim on a local fork", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "reward campaign lifecycle and claim proof", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.000012") },
      { address: outsiderWallet.address, minimumWei: ethers.parseEther("0.000004") },
    ])) return;

    const campaignCountBefore = await communityRewardsFacet.campaignCount();
    const latestBlock = await provider.getBlock("latest");
    const totalAllocation = 1_000n;
    const claimerBalanceBefore = await tokenSupplyFacet.tokenBalanceOf(outsiderWallet.address);
    const diamondBalanceBefore = await tokenSupplyFacet.tokenBalanceOf(diamondAddress);
    const initialRoot = ethers.keccak256(ethers.toUtf8Bytes(`reward-campaign-initial-${latestBlock!.number}`));
    const updatedRoot = ethers.solidityPackedKeccak256(
      ["address", "uint256"],
      [outsiderWallet.address, totalAllocation],
    );

    const fundingResponse = await apiCall(port, "POST", "/v1/tokenomics/commands/transfer", {
      body: { to: diamondAddress, amount: totalAllocation.toString() },
    });
    expect(fundingResponse.status).toBe(202);
    await expectReceipt(extractTxHash(fundingResponse.payload));
    expect(await waitFor(
      () => tokenSupplyFacet.tokenBalanceOf(diamondAddress),
      (value) => value === diamondBalanceBefore + totalAllocation,
      "reward campaign token funding",
    )).toBe(diamondBalanceBefore + totalAllocation);

    const createResponse = await apiCall(port, "POST", "/v1/workflows/create-reward-campaign", {
      apiKey: "reward-proof-key",
      body: {
        merkleRoot: initialRoot,
        startTime: String(latestBlock!.timestamp),
        cliffSeconds: "0",
        durationSeconds: "0",
        tgeUnlockBps: "10000",
        maxTotalClaimable: totalAllocation.toString(),
      },
    });
    expect(createResponse.status).toBe(202);
    const createPayload = createResponse.payload as {
      campaign: { txHash: string; campaignId: string; eventCount: number };
      counts: { before: string; after: string };
    };
    expect(createPayload.counts.before).toBe(campaignCountBefore.toString());
    expect(BigInt(createPayload.counts.after)).toBe(campaignCountBefore + 1n);
    expect(createPayload.campaign.eventCount).toBeGreaterThan(0);
    await expectReceipt(createPayload.campaign.txHash);
    const campaignId = createPayload.campaign.campaignId;

    const createdCampaign = rewardCampaignToObject(await communityRewardsFacet.getCampaign(campaignId));
    expect(createdCampaign).toMatchObject({
      merkleRoot: initialRoot,
      cliffSeconds: "0",
      durationSeconds: "0",
      tgeUnlockBps: "10000",
      maxTotalClaimable: totalAllocation.toString(),
      totalClaimed: "0",
      paused: false,
    });

    const pauseResponse = await apiCall(port, "POST", "/v1/workflows/manage-reward-campaign", {
      apiKey: "reward-proof-key",
      body: { campaignId, newMerkleRoot: updatedRoot, paused: true },
    });
    expect(pauseResponse.status).toBe(202);
    const pausePayload = pauseResponse.payload as {
      merkleRootUpdate: { txHash: string; eventCount: number; source: string };
      pauseState: { txHash: string; eventCount: number; source: string };
    };
    expect(pausePayload.merkleRootUpdate).toMatchObject({ eventCount: expect.any(Number), source: "updated" });
    expect(pausePayload.pauseState).toMatchObject({ eventCount: expect.any(Number), source: "paused" });
    expect(pausePayload.merkleRootUpdate.eventCount).toBeGreaterThan(0);
    expect(pausePayload.pauseState.eventCount).toBeGreaterThan(0);
    await expectReceipt(pausePayload.merkleRootUpdate.txHash);
    await expectReceipt(pausePayload.pauseState.txHash);
    expect(rewardCampaignToObject(await communityRewardsFacet.getCampaign(campaignId))).toMatchObject({
      merkleRoot: updatedRoot,
      paused: true,
    });

    const unpauseResponse = await apiCall(port, "POST", "/v1/workflows/manage-reward-campaign", {
      apiKey: "reward-proof-key",
      body: { campaignId, paused: false },
    });
    expect(unpauseResponse.status).toBe(202);
    const unpausePayload = unpauseResponse.payload as {
      pauseState: { txHash: string; eventCount: number; source: string };
    };
    expect(unpausePayload.pauseState).toMatchObject({ eventCount: expect.any(Number), source: "unpaused" });
    expect(unpausePayload.pauseState.eventCount).toBeGreaterThan(0);
    await expectReceipt(unpausePayload.pauseState.txHash);
    expect(rewardCampaignToObject(await communityRewardsFacet.getCampaign(campaignId))).toMatchObject({
      merkleRoot: updatedRoot,
      paused: false,
    });

    const claimResponse = await apiCall(port, "POST", "/v1/workflows/claim-reward-campaign", {
      apiKey: "outsider-key",
      body: {
        campaignId,
        totalAllocation: totalAllocation.toString(),
        proof: [],
      },
    });
    expect(claimResponse.status).toBe(202);
    const claimPayload = claimResponse.payload as {
      campaign: { before: { totalClaimed: string }; after: { totalClaimed: string } };
      claimable: { before: string; after: string };
      claimed: { before: string; after: string; claimedNow: string };
      claim: { txHash: string; eventCount: number };
      summary: { campaignId: string; claimer: string; totalAllocation: string };
    };
    expect(claimPayload).toMatchObject({
      campaign: { before: { totalClaimed: "0" }, after: { totalClaimed: totalAllocation.toString() } },
      claimable: { before: totalAllocation.toString(), after: "0" },
      claimed: { before: "0", after: totalAllocation.toString(), claimedNow: totalAllocation.toString() },
      claim: { eventCount: 1 },
      summary: {
        campaignId,
        claimer: outsiderWallet.address,
        totalAllocation: totalAllocation.toString(),
      },
    });
    await expectReceipt(claimPayload.claim.txHash);
    expect(await communityRewardsFacet.claimed(campaignId, outsiderWallet.address)).toBe(totalAllocation);
    expect(await tokenSupplyFacet.tokenBalanceOf(outsiderWallet.address)).toBe(claimerBalanceBefore + totalAllocation);
    expect(await tokenSupplyFacet.tokenBalanceOf(diamondAddress)).toBe(diamondBalanceBefore);

    const claimReceipt = await provider.getTransactionReceipt(claimPayload.claim.txHash);
    const claimedEvents = await apiCall(port, "POST", "/v1/tokenomics/events/claimed/query", {
      apiKey: "read-key",
      body: {
        fromBlock: String(claimReceipt!.blockNumber),
        toBlock: String(claimReceipt!.blockNumber),
      },
    });
    expect(claimedEvents.status).toBe(200);
    expect(claimedEvents.payload).toEqual(expect.arrayContaining([
      expect.objectContaining({ transactionHash: claimPayload.claim.txHash }),
    ]));
    const decodedClaim = claimReceipt!.logs
      .map((log) => {
        try {
          return communityRewardsFacet.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((event) => event?.name === "Claimed");
    expect(decodedClaim).not.toBeNull();
    expect(decodedClaim!.args.campaignId).toBe(BigInt(campaignId));
    expect(decodedClaim!.args.account).toBe(outsiderWallet.address);
    expect(decodedClaim!.args.amount).toBe(totalAllocation);

    const replayResponse = await apiCall(port, "POST", "/v1/workflows/claim-reward-campaign", {
      apiKey: "outsider-key",
      body: {
        campaignId,
        totalAllocation: totalAllocation.toString(),
        proof: [],
      },
    });
    expect(replayResponse.status).toBe(409);
    expect(JSON.stringify(replayResponse.payload)).toMatch(/zero claimable amount/u);
    expect(await communityRewardsFacet.claimed(campaignId, outsiderWallet.address)).toBe(totalAllocation);
    expect(await tokenSupplyFacet.tokenBalanceOf(outsiderWallet.address)).toBe(claimerBalanceBefore + totalAllocation);
    expect(await tokenSupplyFacet.tokenBalanceOf(diamondAddress)).toBe(diamondBalanceBefore);

    const apiCampaignRead = await apiCall(
      port,
      "GET",
      `/v1/tokenomics/queries/get-campaign?campaignId=${encodeURIComponent(campaignId)}`,
      { apiKey: "read-key" },
    );
    expect(apiCampaignRead.status).toBe(200);
    expect(apiCampaignRead.payload).toEqual(rewardCampaignToObject(await communityRewardsFacet.getCampaign(campaignId)));
  }, 300_000);

  it("proves permissionless threshold-excess burn accounting on an isolated fork", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "permissionless threshold-excess burn proof", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.000006") },
      { address: outsiderWallet.address, minimumWei: ethers.parseEther("0.000004") },
    ])) return;

    const thresholdBefore = BigInt(await burnThresholdFacet.thresholdGetBurnLimit());
    const threshold = 1n;
    const thresholdResponse = await apiCall(port, "POST", "/v1/tokenomics/commands/threshold-set-burn-limit", {
      apiKey: "founder-key",
      body: { threshold: threshold.toString() },
    });
    expect(thresholdResponse.status).toBe(202);
    await expectReceipt(extractTxHash(thresholdResponse.payload));
    expect(await burnThresholdFacet.thresholdGetBurnLimit()).toBe(threshold);

    const balanceBefore = BigInt(await tokenSupplyFacet.tokenBalanceOf(founderAddress));
    const supplyBefore = BigInt(await tokenSupplyFacet.totalSupply());
    const expectedBurn = balanceBefore - (balanceBefore * (10_000n - threshold)) / 10_000n;
    expect(expectedBurn).toBeGreaterThan(0n);

    const response = await apiCall(port, "POST", "/v1/tokenomics/commands/threshold-burn-excess", {
      apiKey: "outsider-key",
      body: { account: founderAddress },
    });
    expect(response.status, JSON.stringify(response.payload)).toBe(202);
    const txHash = extractTxHash(response.payload);
    await expectReceipt(txHash);
    const receipt = await provider.getTransactionReceipt(txHash);
    expect(receipt?.status).toBe(1);
    const thresholdBurn = (receipt?.logs ?? []).flatMap((log) => {
      try {
        const parsed = burnThresholdFacet.interface.parseLog(log);
        return parsed?.name === "ThresholdBurn" ? [parsed] : [];
      } catch {
        return [];
      }
    });
    expect(thresholdBurn).toHaveLength(1);
    expect(thresholdBurn[0]!.args.burner).toBe(founderAddress);
    expect(BigInt(thresholdBurn[0]!.args.amount)).toBe(expectedBurn);
    expect(BigInt(thresholdBurn[0]!.args.thresholdAtBurn)).toBe(threshold);
    expect(BigInt(await tokenSupplyFacet.tokenBalanceOf(founderAddress))).toBe(balanceBefore - expectedBurn);
    expect(BigInt(await tokenSupplyFacet.totalSupply())).toBe(supplyBefore - expectedBurn);
    expect(BigInt(await burnThresholdFacet.thresholdCalculateExcess(founderAddress))).toBeGreaterThan(0n);
    expect(await burnThresholdFacet.thresholdGetBurnLimit()).toBe(threshold);

    const restoredThreshold = await apiCall(port, "POST", "/v1/tokenomics/commands/threshold-set-burn-limit", {
      apiKey: "founder-key",
      body: { threshold: thresholdBefore.toString() },
    });
    expect(restoredThreshold.status).toBe(202);
    await expectReceipt(extractTxHash(restoredThreshold.payload));
    expect(await burnThresholdFacet.thresholdGetBurnLimit()).toBe(thresholdBefore);
  }, 180_000);

  it("proves permissionless self and approved threshold burns through HTTP", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "permissionless threshold token burns", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.00001") },
      { address: outsiderWallet.address, minimumWei: ethers.parseEther("0.000004") },
    ])) return;

    const founderRole = id("FOUNDER_ROLE");
    const governanceRole = id("GOVERNANCE_ROLE");
    const burnerRole = id("BURNER_ROLE");
    expect(await accessControl.hasRole(governanceRole, outsiderWallet.address)).toBe(false);
    expect(await accessControl.hasRole(burnerRole, outsiderWallet.address)).toBe(false);

    const thresholdBefore = BigInt(await burnThresholdFacet.thresholdGetBurnLimit());
    const threshold = 10_000n;
    const thresholdResponse = await apiCall(port, "POST", "/v1/tokenomics/commands/threshold-set-burn-limit", {
      apiKey: "founder-key",
      body: { threshold: threshold.toString() },
    });
    expect(thresholdResponse.status).toBe(202);
    await expectReceipt(extractTxHash(thresholdResponse.payload));
    expect(await burnThresholdFacet.thresholdGetBurnLimit()).toBe(threshold);

    const founderBalanceForBurns = BigInt(await tokenSupplyFacet.tokenBalanceOf(founderAddress));
    const amount = founderBalanceForBurns / 10n;
    expect(amount).toBeGreaterThan(0n);
    const transferBalanceBefore = BigInt(await tokenSupplyFacet.tokenBalanceOf(outsiderWallet.address));
    const transfer = await apiCall(port, "POST", "/v1/tokenomics/commands/transfer", {
      apiKey: "founder-key",
      body: { to: outsiderWallet.address, amount: amount.toString() },
    });
    expect(transfer.status, JSON.stringify(transfer.payload)).toBe(202);
    await expectReceipt(extractTxHash(transfer.payload));
    expect(BigInt(await tokenSupplyFacet.tokenBalanceOf(outsiderWallet.address))).toBe(transferBalanceBefore + amount);

    const outsiderBalanceBefore = BigInt(await tokenSupplyFacet.tokenBalanceOf(outsiderWallet.address));
    const supplyBeforeSelfBurn = BigInt(await tokenSupplyFacet.totalSupply());
    const selfBurn = await apiCall(port, "POST", "/v1/tokenomics/commands/threshold-burn-tokens", {
      apiKey: "outsider-key",
      body: { amount: amount.toString() },
    });
    expect(selfBurn.status).toBe(202);
    const selfBurnHash = extractTxHash(selfBurn.payload);
    await expectReceipt(selfBurnHash);
    const selfBurnReceipt = await provider.getTransactionReceipt(selfBurnHash);
    expect(selfBurnReceipt?.status).toBe(1);
    const selfBurnEvent = (selfBurnReceipt?.logs ?? []).flatMap((log) => {
      try {
        const parsed = burnThresholdFacet.interface.parseLog(log);
        return parsed?.name === "ThresholdBurn" ? [parsed] : [];
      } catch {
        return [];
      }
    });
    expect(selfBurnEvent).toHaveLength(1);
    expect(selfBurnEvent[0]!.args.burner).toBe(outsiderWallet.address);
    expect(BigInt(selfBurnEvent[0]!.args.amount)).toBe(amount);
    expect(BigInt(selfBurnEvent[0]!.args.thresholdAtBurn)).toBe(threshold);
    expect(BigInt(await tokenSupplyFacet.tokenBalanceOf(outsiderWallet.address))).toBe(outsiderBalanceBefore - amount);
    expect(BigInt(await tokenSupplyFacet.totalSupply())).toBe(supplyBeforeSelfBurn - amount);

    const allowanceBefore = BigInt(await tokenSupplyFacet.tokenAllowance(founderAddress, outsiderWallet.address));
    const approve = await apiCall(port, "POST", "/v1/tokenomics/commands/token-approve", {
      apiKey: "founder-key",
      body: { spender: outsiderWallet.address, amount: amount.toString() },
    });
    expect(approve.status).toBe(202);
    await expectReceipt(extractTxHash(approve.payload));
    expect(BigInt(await tokenSupplyFacet.tokenAllowance(founderAddress, outsiderWallet.address))).toBe(allowanceBefore + amount);

    const founderBalanceBefore = BigInt(await tokenSupplyFacet.tokenBalanceOf(founderAddress));
    const supplyBeforeDelegatedBurn = BigInt(await tokenSupplyFacet.totalSupply());
    const delegatedBurn = await apiCall(port, "POST", "/v1/tokenomics/commands/threshold-burn-tokens-from", {
      apiKey: "outsider-key",
      body: { account: founderAddress, amount: amount.toString() },
    });
    expect(delegatedBurn.status).toBe(202);
    const delegatedBurnHash = extractTxHash(delegatedBurn.payload);
    await expectReceipt(delegatedBurnHash);
    const delegatedBurnReceipt = await provider.getTransactionReceipt(delegatedBurnHash);
    expect(delegatedBurnReceipt?.status).toBe(1);
    const delegatedBurnEvent = (delegatedBurnReceipt?.logs ?? []).flatMap((log) => {
      try {
        const parsed = burnThresholdFacet.interface.parseLog(log);
        return parsed?.name === "ThresholdBurn" ? [parsed] : [];
      } catch {
        return [];
      }
    });
    expect(delegatedBurnEvent).toHaveLength(1);
    expect(delegatedBurnEvent[0]!.args.burner).toBe(founderAddress);
    expect(BigInt(delegatedBurnEvent[0]!.args.amount)).toBe(amount);
    expect(BigInt(delegatedBurnEvent[0]!.args.thresholdAtBurn)).toBe(threshold);
    expect(BigInt(await tokenSupplyFacet.tokenBalanceOf(founderAddress))).toBe(founderBalanceBefore - amount);
    expect(BigInt(await tokenSupplyFacet.totalSupply())).toBe(supplyBeforeDelegatedBurn - amount);
    expect(BigInt(await tokenSupplyFacet.tokenAllowance(founderAddress, outsiderWallet.address))).toBe(allowanceBefore);

    const restoredThreshold = await apiCall(port, "POST", "/v1/tokenomics/commands/threshold-set-burn-limit", {
      apiKey: "founder-key",
      body: { threshold: thresholdBefore.toString() },
    });
    expect(restoredThreshold.status).toBe(202);
    await expectReceipt(extractTxHash(restoredThreshold.payload));
    expect(await burnThresholdFacet.thresholdGetBurnLimit()).toBe(thresholdBefore);
    expect(await accessControl.hasRole(founderRole, founderAddress)).toBe(true);
  }, 240_000);

  it("proves burn, mint, repeat-call, and failed-write accounting on an isolated fork", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "tokenomics destructive economic invariants", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.000012") },
      { address: transfereeWallet.address, minimumWei: ethers.parseEther("0.000004") },
    ])) return;

    const snapshot = await captureReceiptSnapshot();
    try {
      const minterRole = id("MINTER_ROLE");
      if (!(await accessControl.hasRole(minterRole, founderAddress))) {
        const roleReceipt = await (
          await accessControl.connect(founderWallet).grantRole(minterRole, founderAddress, ethers.MaxUint256)
        ).wait();
        expect(roleReceipt?.status).toBe(1);
      }
      const tokenStorageBase = BigInt(id("speak.token.storage"));
      const tokenFlagsSlot = tokenStorageBase + 11n;
      const maxSupplySlot = tokenStorageBase + 12n;
      const originalTokenFlags = BigInt(await provider.getStorage(diamondAddress, ethers.toBeHex(tokenFlagsSlot, 32)));
      const disposableTokenFlags = originalTokenFlags & ~(0xffn << 8n);
      const fixtureSupply = BigInt(await tokenSupplyFacet.totalSupply());
      await provider.send("anvil_setStorageAt", [
        diamondAddress,
        ethers.toBeHex(tokenFlagsSlot, 32),
        ethers.toBeHex(disposableTokenFlags, 32),
      ]);
      await provider.send("anvil_setStorageAt", [
        diamondAddress,
        ethers.toBeHex(maxSupplySlot, 32),
        ethers.toBeHex(fixtureSupply + 100n, 32),
      ]);
      await provider.send("evm_mine", []);
      expect(await tokenSupplyFacet.supplyIsMintingFinished()).toBe(false);

      const burnAmount = 1n;
      const balanceBeforeBurn = await tokenSupplyFacet.tokenBalanceOf(founderAddress);
      const supplyBeforeBurn = await tokenSupplyFacet.totalSupply();
      expect(balanceBeforeBurn).toBeGreaterThanOrEqual(burnAmount);

      const burnResponse = await apiCall(port, "DELETE", "/v1/tokenomics/commands/burn", {
        body: { amount: burnAmount.toString() },
      });
      expect(burnResponse.status).toBe(202);
      await expectReceipt(extractTxHash(burnResponse.payload));

      const balanceAfterBurn = await waitFor(
        () => tokenSupplyFacet.tokenBalanceOf(founderAddress),
        (value) => value === balanceBeforeBurn - burnAmount,
        "tokenomics burn account delta",
      );
      const supplyAfterBurn = await waitFor(
        () => tokenSupplyFacet.totalSupply(),
        (value) => value === supplyBeforeBurn - burnAmount,
        "tokenomics burn supply delta",
      );
      assertExactAmountDelta("tokenomics.burn.balance", balanceBeforeBurn, balanceAfterBurn, -burnAmount);
      assertExactAmountDelta("tokenomics.burn.totalSupply", supplyBeforeBurn, supplyAfterBurn, -burnAmount);

      const failedBurnBefore = {
        founder: balanceAfterBurn,
        totalSupply: supplyAfterBurn,
      };
      const failedBurnResponse = await apiCall(port, "DELETE", "/v1/tokenomics/commands/burn", {
        body: { amount: (balanceAfterBurn + 1n).toString() },
      });
      expect(failedBurnResponse.status).not.toBe(202);
      assertNoEconomicSideEffects("tokenomics.failedBurn", failedBurnBefore, {
        founder: await tokenSupplyFacet.tokenBalanceOf(founderAddress),
        totalSupply: await tokenSupplyFacet.totalSupply(),
      });

      const mintAmount = 17n;
      const mintingFinished = await tokenSupplyFacet.supplyIsMintingFinished();
      const transfereeBeforeMint = await tokenSupplyFacet.tokenBalanceOf(transfereeWallet.address);
      const founderBeforeMint = await tokenSupplyFacet.tokenBalanceOf(founderAddress);
      const supplyBeforeMint = await tokenSupplyFacet.totalSupply();
      const mintResponse = await apiCall(port, "POST", "/v1/tokenomics/commands/supply-mint-tokens", {
        body: { to: transfereeWallet.address, amount: mintAmount.toString() },
      });

      expect(mintingFinished).toBe(false);
        expect(mintResponse.status).toBe(202);
        await expectReceipt(extractTxHash(mintResponse.payload));
        const transfereeAfterMint = await waitFor(
          () => tokenSupplyFacet.tokenBalanceOf(transfereeWallet.address),
          (value) => value === transfereeBeforeMint + mintAmount,
          "tokenomics mint recipient delta",
        );
        const supplyAfterMint = await waitFor(
          () => tokenSupplyFacet.totalSupply(),
          (value) => value === supplyBeforeMint + mintAmount,
          "tokenomics mint supply delta",
        );
        const mintBalanceDelta = assertExactAmountDelta(
          "tokenomics.mint.balance",
          transfereeBeforeMint,
          transfereeAfterMint,
          mintAmount,
        );
        const mintSupplyDelta = assertExactAmountDelta(
          "tokenomics.mint.totalSupply",
          supplyBeforeMint,
          supplyAfterMint,
          mintAmount,
        );
        assertConservedDeltas("tokenomics.mint", [mintBalanceDelta.delta, -BigInt(mintSupplyDelta.delta)]);

        const returnMintResponse = await apiCall(port, "POST", "/v1/tokenomics/commands/transfer", {
          apiKey: "transferee-key",
          body: { to: founderAddress, amount: mintAmount.toString() },
        });
        expect(returnMintResponse.status).toBe(202);
        await expectReceipt(extractTxHash(returnMintResponse.payload));
        await waitFor(
          () => tokenSupplyFacet.tokenBalanceOf(founderAddress),
          (value) => value === founderBeforeMint + mintAmount,
          "tokenomics minted token return",
        );

        const repeatedBurnResponse = await apiCall(port, "DELETE", "/v1/tokenomics/commands/burn", {
          body: { amount: mintAmount.toString() },
        });
        expect(repeatedBurnResponse.status).toBe(202);
        await expectReceipt(extractTxHash(repeatedBurnResponse.payload));
        assertNoEconomicSideEffects("tokenomics.mintTransferBurnRoundTrip", {
          founder: founderBeforeMint,
          transferee: transfereeBeforeMint,
          totalSupply: supplyBeforeMint,
        }, {
          founder: await waitFor(
            () => tokenSupplyFacet.tokenBalanceOf(founderAddress),
            (value) => value === founderBeforeMint,
            "tokenomics repeated burn founder restore",
          ),
          transferee: await tokenSupplyFacet.tokenBalanceOf(transfereeWallet.address),
          totalSupply: await waitFor(
            () => tokenSupplyFacet.totalSupply(),
            (value) => value === supplyBeforeMint,
            "tokenomics repeated burn supply restore",
          ),
        });

        const finalizedTokenFlags = disposableTokenFlags | (1n << 8n);
        await provider.send("anvil_setStorageAt", [
          diamondAddress,
          ethers.toBeHex(tokenFlagsSlot, 32),
          ethers.toBeHex(finalizedTokenFlags, 32),
        ]);
        await provider.send("evm_mine", []);
        expect(await tokenSupplyFacet.supplyIsMintingFinished()).toBe(true);
        const finalizedBefore = {
          founder: await tokenSupplyFacet.tokenBalanceOf(founderAddress),
          transferee: await tokenSupplyFacet.tokenBalanceOf(transfereeWallet.address),
          totalSupply: await tokenSupplyFacet.totalSupply(),
        };
        const failedMintResponse = await apiCall(port, "POST", "/v1/tokenomics/commands/supply-mint-tokens", {
          body: { to: transfereeWallet.address, amount: mintAmount.toString() },
        });
        expect(failedMintResponse.status).not.toBe(202);
        assertNoEconomicSideEffects("tokenomics.failedMintAfterFinalization", finalizedBefore, {
          founder: await tokenSupplyFacet.tokenBalanceOf(founderAddress),
          transferee: await tokenSupplyFacet.tokenBalanceOf(transfereeWallet.address),
          totalSupply: await tokenSupplyFacet.totalSupply(),
        });
    } finally {
      expect(await restoreReceiptSnapshot(snapshot)).toBe(true);
    }
  }, 300_000);

  it("proves funded campaign reward custody, exact claims, and replay safety on an isolated fork", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "campaign reward economic invariants", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.000012") },
      { address: licenseeWallet.address, minimumWei: ethers.parseEther("0.000006") },
    ])) return;

    const snapshot = await captureReceiptSnapshot();
    let proofCompleted = false;
    try {
      const timelockRole = id("TIMELOCK_ROLE");
      if (!(await accessControl.hasRole(timelockRole, founderAddress))) {
        const roleReceipt = await (
          await accessControl.connect(founderWallet).grantRole(timelockRole, founderAddress, ethers.MaxUint256)
        ).wait();
        expect(roleReceipt?.status).toBe(1);
      }

      const rewards = new Contract(diamondAddress, facetRegistry.CommunityRewardsFacet.abi, provider);
      const totalAllocation = 31n;
      const merkleRoot = ethers.solidityPackedKeccak256(
        ["address", "uint256"],
        [licenseeWallet.address, totalAllocation],
      );
      const initial = {
        founder: BigInt(await tokenSupplyFacet.tokenBalanceOf(founderAddress)),
        custody: BigInt(await tokenSupplyFacet.tokenBalanceOf(diamondAddress)),
        claimer: BigInt(await tokenSupplyFacet.tokenBalanceOf(licenseeWallet.address)),
        totalSupply: BigInt(await tokenSupplyFacet.totalSupply()),
      };
      expect(initial.founder).toBeGreaterThanOrEqual(totalAllocation);

      const funding = await apiCall(port, "POST", "/v1/tokenomics/commands/transfer", {
        body: { to: diamondAddress, amount: totalAllocation.toString() },
      });
      expect(funding.status, JSON.stringify(funding.payload)).toBe(202);
      await expectReceipt(extractTxHash(funding.payload));
      const funded = {
        founder: BigInt(await tokenSupplyFacet.tokenBalanceOf(founderAddress)),
        custody: BigInt(await tokenSupplyFacet.tokenBalanceOf(diamondAddress)),
        claimer: BigInt(await tokenSupplyFacet.tokenBalanceOf(licenseeWallet.address)),
        totalSupply: BigInt(await tokenSupplyFacet.totalSupply()),
      };
      assertExactAmountDelta("campaignReward.funding.founder", initial.founder, funded.founder, -totalAllocation);
      assertExactAmountDelta("campaignReward.funding.custody", initial.custody, funded.custody, totalAllocation);
      assertExactAmountDelta("campaignReward.funding.claimer", initial.claimer, funded.claimer, 0n);
      assertExactAmountDelta("campaignReward.funding.totalSupply", initial.totalSupply, funded.totalSupply, 0n);
      assertConservedDeltas("campaignReward.funding.conservation", [
        funded.founder - initial.founder,
        funded.custody - initial.custody,
      ]);

      const latestBlock = await provider.getBlock("latest");
      const creation = await apiCall(port, "POST", "/v1/workflows/create-reward-campaign", {
        body: {
          merkleRoot,
          startTime: String(latestBlock?.timestamp ?? 1),
          cliffSeconds: "0",
          durationSeconds: "0",
          tgeUnlockBps: "10000",
          maxTotalClaimable: totalAllocation.toString(),
        },
      });
      expect(creation.status, JSON.stringify(creation.payload)).toBe(202);
      const creationPayload = creation.payload as {
        campaign: { txHash: string; campaignId: string };
      };
      await expectReceipt(creationPayload.campaign.txHash);
      const campaignId = creationPayload.campaign.campaignId;
      expect(campaignId).toMatch(/^\d+$/u);
      assertNoEconomicSideEffects("campaignReward.creation", funded, {
        founder: BigInt(await tokenSupplyFacet.tokenBalanceOf(founderAddress)),
        custody: BigInt(await tokenSupplyFacet.tokenBalanceOf(diamondAddress)),
        claimer: BigInt(await tokenSupplyFacet.tokenBalanceOf(licenseeWallet.address)),
        totalSupply: BigInt(await tokenSupplyFacet.totalSupply()),
      });

      const claim = await apiCall(port, "POST", "/v1/workflows/claim-reward-campaign", {
        apiKey: "licensee-key",
        body: {
          campaignId,
          totalAllocation: totalAllocation.toString(),
          proof: [],
        },
      });
      expect(claim.status, JSON.stringify(claim.payload)).toBe(202);
      const claimPayload = claim.payload as {
        economics: {
          claimerBalance: { delta: string };
          custodyBalance: { delta: string };
          totalSupply: { delta: string };
          conservation: string;
        };
        claim: { txHash: string };
      };
      await expectReceipt(claimPayload.claim.txHash);
      expect(claimPayload.economics).toEqual({
        claimerBalance: expect.objectContaining({ delta: totalAllocation.toString() }),
        custodyBalance: expect.objectContaining({ delta: (-totalAllocation).toString() }),
        totalSupply: expect.objectContaining({ delta: "0" }),
        conservation: "0",
      });

      const claimed = {
        founder: BigInt(await tokenSupplyFacet.tokenBalanceOf(founderAddress)),
        custody: BigInt(await tokenSupplyFacet.tokenBalanceOf(diamondAddress)),
        claimer: BigInt(await tokenSupplyFacet.tokenBalanceOf(licenseeWallet.address)),
        totalSupply: BigInt(await tokenSupplyFacet.totalSupply()),
        accountClaimed: BigInt(await rewards.claimed(campaignId, licenseeWallet.address)),
        campaignTotalClaimed: BigInt((await rewards.getCampaign(campaignId)).totalClaimed),
      };
      assertExactAmountDelta("campaignReward.claim.custody", funded.custody, claimed.custody, -totalAllocation);
      assertExactAmountDelta("campaignReward.claim.claimer", funded.claimer, claimed.claimer, totalAllocation);
      assertExactAmountDelta("campaignReward.claim.totalSupply", funded.totalSupply, claimed.totalSupply, 0n);
      expect(claimed.accountClaimed).toBe(totalAllocation);
      expect(claimed.campaignTotalClaimed).toBe(totalAllocation);

      const replay = await apiCall(port, "POST", "/v1/workflows/claim-reward-campaign", {
        apiKey: "licensee-key",
        body: {
          campaignId,
          totalAllocation: totalAllocation.toString(),
          proof: [],
        },
      });
      expect(replay.status).toBe(409);
      assertNoEconomicSideEffects("campaignReward.replay", claimed, {
        founder: BigInt(await tokenSupplyFacet.tokenBalanceOf(founderAddress)),
        custody: BigInt(await tokenSupplyFacet.tokenBalanceOf(diamondAddress)),
        claimer: BigInt(await tokenSupplyFacet.tokenBalanceOf(licenseeWallet.address)),
        totalSupply: BigInt(await tokenSupplyFacet.totalSupply()),
        accountClaimed: BigInt(await rewards.claimed(campaignId, licenseeWallet.address)),
        campaignTotalClaimed: BigInt((await rewards.getCampaign(campaignId)).totalClaimed),
      });
      proofCompleted = true;
    } finally {
      const reverted = await restoreReceiptSnapshot(snapshot).catch(() => false);
      if (proofCompleted) {
        expect(reverted).toBe(true);
      }
    }
  }, 300_000);

  it("proves staking and reward-pool custody conservation on an isolated fork", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "staking custody economic invariants", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.000008") },
    ])) return;

    const snapshot = await captureReceiptSnapshot();
    let proofCompleted = false;
    try {
      const initialStakerBalance = await tokenSupplyFacet.tokenBalanceOf(founderAddress);
      const amount = initialStakerBalance / 4n;
      const rewardFunding = initialStakerBalance / 4n;
      expect(amount).toBeGreaterThan(0n);
      expect(rewardFunding).toBeGreaterThan(0n);
      const allowanceBeforeApproval = await tokenSupplyFacet.tokenAllowance(founderAddress, diamondAddress);
      if (allowanceBeforeApproval < amount) {
        const approvalResponse = await apiCall(port, "POST", "/v1/tokenomics/commands/token-approve", {
          body: { spender: diamondAddress, amount: amount.toString() },
        });
        expect(approvalResponse.status, JSON.stringify(approvalResponse.payload)).toBe(202);
        await expectReceipt(extractTxHash(approvalResponse.payload));
      }

      const allowanceBeforeStake = await tokenSupplyFacet.tokenAllowance(founderAddress, diamondAddress);
      const statsBefore = await stakingFacet.getStakingStats();
      const economicsBefore = {
        staker: await tokenSupplyFacet.tokenBalanceOf(founderAddress),
        custody: await tokenSupplyFacet.tokenBalanceOf(diamondAddress),
        allowance: allowanceBeforeStake,
        totalSupply: await tokenSupplyFacet.totalSupply(),
        totalStaked: BigInt(statsBefore.totalStaked),
        totalRewardsDistributed: BigInt(statsBefore.totalRewardsDistributed),
      };

      const stakeResponse = await apiCall(port, "POST", "/v1/staking/commands/stake", {
        body: { amount: amount.toString() },
      });
      expect(stakeResponse.status, JSON.stringify(stakeResponse.payload)).toBe(202);
      await expectReceipt(extractTxHash(stakeResponse.payload));

      const statsAfter = await stakingFacet.getStakingStats();
      const economicsAfter = {
        staker: await tokenSupplyFacet.tokenBalanceOf(founderAddress),
        custody: await tokenSupplyFacet.tokenBalanceOf(diamondAddress),
        allowance: await tokenSupplyFacet.tokenAllowance(founderAddress, diamondAddress),
        totalSupply: await tokenSupplyFacet.totalSupply(),
        totalStaked: BigInt(statsAfter.totalStaked),
        totalRewardsDistributed: BigInt(statsAfter.totalRewardsDistributed),
      };
      const rewardsPaid = economicsAfter.totalRewardsDistributed - economicsBefore.totalRewardsDistributed;
      const stakerDelta = assertExactAmountDelta(
        "staking.custody.staker",
        economicsBefore.staker,
        economicsAfter.staker,
        rewardsPaid - amount,
      );
      const custodyDelta = assertExactAmountDelta(
        "staking.custody.contract",
        economicsBefore.custody,
        economicsAfter.custody,
        amount - rewardsPaid,
      );
      assertConservedDeltas("staking.custody.conservation", [stakerDelta.delta, custodyDelta.delta]);
      assertExactAmountDelta("staking.custody.allowance", economicsBefore.allowance, economicsAfter.allowance, -amount);
      assertExactAmountDelta("staking.custody.totalSupply", economicsBefore.totalSupply, economicsAfter.totalSupply, 0n);
      assertExactAmountDelta("staking.custody.totalStaked", economicsBefore.totalStaked, economicsAfter.totalStaked, amount);

      const rewardAllowanceBeforeApproval = await tokenSupplyFacet.tokenAllowance(founderAddress, diamondAddress);
      if (rewardAllowanceBeforeApproval < rewardFunding) {
        const approvalResponse = await apiCall(port, "POST", "/v1/tokenomics/commands/token-approve", {
          body: { spender: diamondAddress, amount: rewardFunding.toString() },
        });
        expect(approvalResponse.status).toBe(202);
        await expectReceipt(extractTxHash(approvalResponse.payload));
      }

      const statsBeforeFunding = await stakingFacet.getStakingStats();
      const fundingBefore = {
        funder: await tokenSupplyFacet.tokenBalanceOf(founderAddress),
        custody: await tokenSupplyFacet.tokenBalanceOf(diamondAddress),
        allowance: await tokenSupplyFacet.tokenAllowance(founderAddress, diamondAddress),
        totalSupply: await tokenSupplyFacet.totalSupply(),
        totalStaked: BigInt(statsBeforeFunding.totalStaked),
        rewardPoolBalance: BigInt(statsBeforeFunding.rewardPoolBalance),
        totalRewardsDistributed: BigInt(statsBeforeFunding.totalRewardsDistributed),
      };
      const fundResponse = await apiCall(port, "POST", "/v1/staking/commands/fund-reward-pool", {
        body: { amount: rewardFunding.toString() },
      });
      expect(fundResponse.status).toBe(202);
      await expectReceipt(extractTxHash(fundResponse.payload));

      const statsAfterFunding = await stakingFacet.getStakingStats();
      const fundingAfter = {
        funder: await tokenSupplyFacet.tokenBalanceOf(founderAddress),
        custody: await tokenSupplyFacet.tokenBalanceOf(diamondAddress),
        allowance: await tokenSupplyFacet.tokenAllowance(founderAddress, diamondAddress),
        totalSupply: await tokenSupplyFacet.totalSupply(),
        totalStaked: BigInt(statsAfterFunding.totalStaked),
        rewardPoolBalance: BigInt(statsAfterFunding.rewardPoolBalance),
        totalRewardsDistributed: BigInt(statsAfterFunding.totalRewardsDistributed),
      };
      const funderDelta = assertExactAmountDelta(
        "staking.rewardPoolFunding.funder",
        fundingBefore.funder,
        fundingAfter.funder,
        -rewardFunding,
      );
      const fundedCustodyDelta = assertExactAmountDelta(
        "staking.rewardPoolFunding.custody",
        fundingBefore.custody,
        fundingAfter.custody,
        rewardFunding,
      );
      assertConservedDeltas("staking.rewardPoolFunding.conservation", [funderDelta.delta, fundedCustodyDelta.delta]);
      assertExactAmountDelta(
        "staking.rewardPoolFunding.allowance",
        fundingBefore.allowance,
        fundingAfter.allowance,
        -rewardFunding,
      );
      assertExactAmountDelta(
        "staking.rewardPoolFunding.totalSupply",
        fundingBefore.totalSupply,
        fundingAfter.totalSupply,
        0n,
      );
      assertExactAmountDelta(
        "staking.rewardPoolFunding.totalStaked",
        fundingBefore.totalStaked,
        fundingAfter.totalStaked,
        0n,
      );
      assertExactAmountDelta(
        "staking.rewardPoolFunding.rewardPoolBalance",
        fundingBefore.rewardPoolBalance,
        fundingAfter.rewardPoolBalance,
        rewardFunding,
      );
      assertExactAmountDelta(
        "staking.rewardPoolFunding.totalRewardsDistributed",
        fundingBefore.totalRewardsDistributed,
        fundingAfter.totalRewardsDistributed,
        0n,
      );

      const failedFundingBefore = { ...fundingAfter };
      const failedFundingResponse = await apiCall(port, "POST", "/v1/staking/commands/fund-reward-pool", {
        body: { amount: (fundingAfter.funder + 1n).toString() },
      });
      expect(failedFundingResponse.status).not.toBe(202);
      const statsAfterFailedFunding = await stakingFacet.getStakingStats();
      assertNoEconomicSideEffects("staking.failedRewardPoolFunding", failedFundingBefore, {
        funder: await tokenSupplyFacet.tokenBalanceOf(founderAddress),
        custody: await tokenSupplyFacet.tokenBalanceOf(diamondAddress),
        allowance: await tokenSupplyFacet.tokenAllowance(founderAddress, diamondAddress),
        totalSupply: await tokenSupplyFacet.totalSupply(),
        totalStaked: BigInt(statsAfterFailedFunding.totalStaked),
        rewardPoolBalance: BigInt(statsAfterFailedFunding.rewardPoolBalance),
        totalRewardsDistributed: BigInt(statsAfterFailedFunding.totalRewardsDistributed),
      });

      await provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
      await provider.send("evm_mine", []);
      const rewardBreakdownBeforeClaim = await stakingFacet.getRewardBreakdown(founderAddress);
      const rawPendingBefore = BigInt(rewardBreakdownBeforeClaim.rawPending);
      const claimableBefore = BigInt(rewardBreakdownBeforeClaim.claimable);
      const forfeitedBefore = BigInt(rewardBreakdownBeforeClaim.forfeited);
      expect(claimableBefore).toBeGreaterThan(0n);
      expect(rawPendingBefore).toBe(claimableBefore + forfeitedBefore);

      const statsBeforeClaim = await stakingFacet.getStakingStats();
      const claimBefore = {
        staker: await tokenSupplyFacet.tokenBalanceOf(founderAddress),
        custody: await tokenSupplyFacet.tokenBalanceOf(diamondAddress),
        totalSupply: await tokenSupplyFacet.totalSupply(),
        totalStaked: BigInt(statsBeforeClaim.totalStaked),
        rewardPoolBalance: BigInt(statsBeforeClaim.rewardPoolBalance),
        totalRewardsDistributed: BigInt(statsBeforeClaim.totalRewardsDistributed),
      };
      const claimResponse = await apiCall(port, "POST", "/v1/staking/commands/claim-rewards", { body: {} });
      expect(claimResponse.status).toBe(202);
      const claimTxHash = extractTxHash(claimResponse.payload);
      await expectReceipt(claimTxHash);
      const claimReceipt = await provider.getTransactionReceipt(claimTxHash);
      const detailedClaimEvent = claimReceipt?.logs
        .map((log) => {
          try {
            return stakingFacet.interface.parseLog({ topics: [...log.topics], data: log.data });
          } catch {
            return null;
          }
        })
        .find((event) => event?.name === "RewardsClaimedDetailed");
      expect(detailedClaimEvent).toBeTruthy();
      if (!detailedClaimEvent) {
        throw new Error("staking reward claim did not emit RewardsClaimedDetailed");
      }
      const actualRawPending = BigInt(detailedClaimEvent.args.rawPending);
      const actualClaimable = BigInt(detailedClaimEvent.args.claimable);
      const actualForfeited = BigInt(detailedClaimEvent.args.forfeited);
      expect(actualRawPending).toBe(actualClaimable + actualForfeited);
      expect(actualForfeited).toBeGreaterThanOrEqual(forfeitedBefore);
      expect(actualRawPending).toBeGreaterThanOrEqual(rawPendingBefore);
      expect(actualClaimable).toBeGreaterThanOrEqual(claimableBefore);

      const statsAfterClaim = await stakingFacet.getStakingStats();
      const claimAfter = {
        staker: await tokenSupplyFacet.tokenBalanceOf(founderAddress),
        custody: await tokenSupplyFacet.tokenBalanceOf(diamondAddress),
        totalSupply: await tokenSupplyFacet.totalSupply(),
        totalStaked: BigInt(statsAfterClaim.totalStaked),
        rewardPoolBalance: BigInt(statsAfterClaim.rewardPoolBalance),
        totalRewardsDistributed: BigInt(statsAfterClaim.totalRewardsDistributed),
      };
      const claimedAmount = claimAfter.totalRewardsDistributed - claimBefore.totalRewardsDistributed;
      expect(claimedAmount).toBe(actualClaimable);
      const claimedStakerDelta = assertExactAmountDelta(
        "staking.rewardClaim.staker",
        claimBefore.staker,
        claimAfter.staker,
        claimedAmount,
      );
      const claimedCustodyDelta = assertExactAmountDelta(
        "staking.rewardClaim.custody",
        claimBefore.custody,
        claimAfter.custody,
        -claimedAmount,
      );
      assertConservedDeltas("staking.rewardClaim.conservation", [claimedStakerDelta.delta, claimedCustodyDelta.delta]);
      assertExactAmountDelta("staking.rewardClaim.totalSupply", claimBefore.totalSupply, claimAfter.totalSupply, 0n);
      assertExactAmountDelta("staking.rewardClaim.totalStaked", claimBefore.totalStaked, claimAfter.totalStaked, 0n);
      const rewardPoolDelta = claimAfter.rewardPoolBalance - claimBefore.rewardPoolBalance;
      expect(rewardPoolDelta).toBeLessThan(0n);
      const rewardPoolDebit = -rewardPoolDelta;
      const crossStakerAccrual = rewardPoolDebit - claimedAmount;
      expect(crossStakerAccrual).toBeGreaterThanOrEqual(0n);
      expect(rewardPoolDebit + actualForfeited).toBeGreaterThanOrEqual(actualRawPending);
      assertExactAmountDelta(
        "staking.rewardClaim.rewardPoolBalance",
        claimBefore.rewardPoolBalance,
        claimAfter.rewardPoolBalance,
        -(claimedAmount + crossStakerAccrual),
      );
      assertConservedDeltas("staking.rewardClaim.liabilityReclassification", [
        rewardPoolDelta,
        claimedAmount,
        crossStakerAccrual,
      ]);

      const repeatedClaimBefore = { ...claimAfter };
      const repeatedClaimResponse = await apiCall(port, "POST", "/v1/staking/commands/claim-rewards", { body: {} });
      if (repeatedClaimResponse.status === 202) {
        await expectReceipt(extractTxHash(repeatedClaimResponse.payload));
      }
      const statsAfterRepeatedClaim = await stakingFacet.getStakingStats();
      assertNoEconomicSideEffects("staking.repeatedRewardClaim", repeatedClaimBefore, {
        staker: await tokenSupplyFacet.tokenBalanceOf(founderAddress),
        custody: await tokenSupplyFacet.tokenBalanceOf(diamondAddress),
        totalSupply: await tokenSupplyFacet.totalSupply(),
        totalStaked: BigInt(statsAfterRepeatedClaim.totalStaked),
        rewardPoolBalance: BigInt(statsAfterRepeatedClaim.rewardPoolBalance),
        totalRewardsDistributed: BigInt(statsAfterRepeatedClaim.totalRewardsDistributed),
      });

      const failedStakeBefore = {
        staker: await tokenSupplyFacet.tokenBalanceOf(founderAddress),
        custody: await tokenSupplyFacet.tokenBalanceOf(diamondAddress),
        allowance: await tokenSupplyFacet.tokenAllowance(founderAddress, diamondAddress),
        totalSupply: await tokenSupplyFacet.totalSupply(),
        totalStaked: BigInt(statsAfterRepeatedClaim.totalStaked),
        rewardPoolBalance: BigInt(statsAfterRepeatedClaim.rewardPoolBalance),
        totalRewardsDistributed: BigInt(statsAfterRepeatedClaim.totalRewardsDistributed),
      };
      const failedStakeResponse = await apiCall(port, "POST", "/v1/staking/commands/stake", {
        body: { amount: (economicsAfter.staker + 1n).toString() },
      });
      expect(failedStakeResponse.status).not.toBe(202);
      const statsAfterFailedStake = await stakingFacet.getStakingStats();
      assertNoEconomicSideEffects("staking.failedStake", failedStakeBefore, {
        staker: await tokenSupplyFacet.tokenBalanceOf(founderAddress),
        custody: await tokenSupplyFacet.tokenBalanceOf(diamondAddress),
        allowance: await tokenSupplyFacet.tokenAllowance(founderAddress, diamondAddress),
        totalSupply: await tokenSupplyFacet.totalSupply(),
        totalStaked: BigInt(statsAfterFailedStake.totalStaked),
        rewardPoolBalance: BigInt(statsAfterFailedStake.rewardPoolBalance),
        totalRewardsDistributed: BigInt(statsAfterFailedStake.totalRewardsDistributed),
      });
      proofCompleted = true;
    } finally {
      const reverted = await restoreReceiptSnapshot(snapshot).catch(() => false);
      if (proofCompleted) {
        expect(reverted).toBe(true);
      }
    }
  }, 300_000);

  it("proves funded emergency withdrawal custody and execution replay safety on an isolated fork", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "emergency withdrawal economic invariants", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.00002") },
      { address: licenseeWallet.address, minimumWei: ethers.parseEther("0.000006") },
    ])) return;

    const snapshot = await captureReceiptSnapshot();
    let proofCompleted = false;
    try {
      for (const role of [id("EMERGENCY_ADMIN_ROLE"), id("FEE_MANAGER_ROLE")]) {
        if (!(await accessControl.hasRole(role, founderAddress))) {
          const roleReceipt = await (
            await accessControl.connect(founderWallet).grantRole(role, founderAddress, ethers.MaxUint256)
          ).wait();
          expect(roleReceipt?.status).toBe(1);
        }
      }
      const feeManagerRole = id("FEE_MANAGER_ROLE");
      if (!(await accessControl.hasRole(feeManagerRole, licenseeWallet.address))) {
        const roleReceipt = await (
          await accessControl.connect(founderWallet).grantRole(feeManagerRole, licenseeWallet.address, ethers.MaxUint256)
        ).wait();
        expect(roleReceipt?.status).toBe(1);
      }
      const configReceipt = await (
        await emergencyWithdrawalFacet.connect(founderWallet).updateWithdrawalConfig(0, 0, 2, false, 1000)
      ).wait();
      expect(configReceipt?.status).toBe(1);

      const amount = 1n;
      const initial = {
        founder: BigInt(await tokenSupplyFacet.tokenBalanceOf(founderAddress)),
        custody: BigInt(await tokenSupplyFacet.tokenBalanceOf(diamondAddress)),
        recipient: BigInt(await tokenSupplyFacet.tokenBalanceOf(licenseeWallet.address)),
        totalSupply: BigInt(await tokenSupplyFacet.totalSupply()),
      };
      expect(initial.founder).toBeGreaterThanOrEqual(amount);
      const funding = await apiCall(port, "POST", "/v1/tokenomics/commands/transfer", {
        body: { to: diamondAddress, amount: amount.toString() },
      });
      expect(funding.status, JSON.stringify(funding.payload)).toBe(202);
      await expectReceipt(extractTxHash(funding.payload));
      const funded = {
        founder: BigInt(await tokenSupplyFacet.tokenBalanceOf(founderAddress)),
        custody: BigInt(await tokenSupplyFacet.tokenBalanceOf(diamondAddress)),
        recipient: BigInt(await tokenSupplyFacet.tokenBalanceOf(licenseeWallet.address)),
        totalSupply: BigInt(await tokenSupplyFacet.totalSupply()),
      };
      assertExactAmountDelta("emergencyWithdrawal.funding.founder", initial.founder, funded.founder, -amount);
      assertExactAmountDelta("emergencyWithdrawal.funding.custody", initial.custody, funded.custody, amount);
      assertExactAmountDelta("emergencyWithdrawal.funding.recipient", initial.recipient, funded.recipient, 0n);
      assertExactAmountDelta("emergencyWithdrawal.funding.totalSupply", initial.totalSupply, funded.totalSupply, 0n);

      const withdrawal = await apiCall(port, "POST", "/v1/workflows/emergency-withdrawal-sequence", {
        body: {
          token: diamondAddress,
          amount: amount.toString(),
          recipient: licenseeWallet.address,
          whitelistRecipient: true,
          whitelistActor: { apiKey: "founder-key", walletAddress: founderAddress },
          approvals: [{ apiKey: "licensee-key", walletAddress: licenseeWallet.address }],
        },
      });
      expect(withdrawal.status, JSON.stringify(withdrawal.payload)).toBe(202);
      const withdrawalPayload = withdrawal.payload as {
        request: { requestId: string; txHash: string };
        approvals: Array<{ txHash: string; executedEventCount: number }>;
        economics: {
          asset: string;
          custody: { delta: string };
          recipient: { delta: string };
          released: string;
        };
        withdrawalState: { executed: boolean };
      };
      await expectReceipt(withdrawalPayload.request.txHash);
      expect(withdrawalPayload.approvals).toHaveLength(1);
      await expectReceipt(withdrawalPayload.approvals[0]!.txHash);
      expect(withdrawalPayload.approvals[0]!.executedEventCount).toBeGreaterThan(0);
      expect(withdrawalPayload.request.requestId).toMatch(/^0x[a-fA-F0-9]{64}$/u);
      expect(withdrawalPayload.withdrawalState.executed).toBe(true);
      expect(withdrawalPayload.economics).toMatchObject({
        asset: "erc20",
        custody: { delta: "-1" },
        recipient: { delta: "1" },
        released: "1",
      });

      const executed = {
        founder: BigInt(await tokenSupplyFacet.tokenBalanceOf(founderAddress)),
        custody: BigInt(await tokenSupplyFacet.tokenBalanceOf(diamondAddress)),
        recipient: BigInt(await tokenSupplyFacet.tokenBalanceOf(licenseeWallet.address)),
        totalSupply: BigInt(await tokenSupplyFacet.totalSupply()),
      };
      assertExactAmountDelta("emergencyWithdrawal.execute.custody", funded.custody, executed.custody, -amount);
      assertExactAmountDelta("emergencyWithdrawal.execute.recipient", funded.recipient, executed.recipient, amount);
      assertExactAmountDelta("emergencyWithdrawal.execute.totalSupply", funded.totalSupply, executed.totalSupply, 0n);
      assertConservedDeltas("emergencyWithdrawal.execute.conservation", [
        executed.custody - funded.custody,
        executed.recipient - funded.recipient,
      ]);

      const replay = await apiCall(port, "POST", "/v1/emergency/admin/execute-withdrawal", {
        body: { requestId: withdrawalPayload.request.requestId },
      });
      expect(replay.status).not.toBe(202);
      assertNoEconomicSideEffects("emergencyWithdrawal.replay", executed, {
        founder: BigInt(await tokenSupplyFacet.tokenBalanceOf(founderAddress)),
        custody: BigInt(await tokenSupplyFacet.tokenBalanceOf(diamondAddress)),
        recipient: BigInt(await tokenSupplyFacet.tokenBalanceOf(licenseeWallet.address)),
        totalSupply: BigInt(await tokenSupplyFacet.totalSupply()),
      });

      const singleApprovalConfigReceipt = await (
        await emergencyWithdrawalFacet.connect(founderWallet).updateWithdrawalConfig(0, 0, 1, false, 1000)
      ).wait();
      expect(singleApprovalConfigReceipt?.status).toBe(1);
      const secondFunding = await apiCall(port, "POST", "/v1/tokenomics/commands/transfer", {
        body: { to: diamondAddress, amount: amount.toString() },
      });
      expect(secondFunding.status, JSON.stringify(secondFunding.payload)).toBe(202);
      await expectReceipt(extractTxHash(secondFunding.payload));
      const beforeDirectExecution = {
        custody: BigInt(await tokenSupplyFacet.tokenBalanceOf(diamondAddress)),
        recipient: BigInt(await tokenSupplyFacet.tokenBalanceOf(licenseeWallet.address)),
        totalSupply: BigInt(await tokenSupplyFacet.totalSupply()),
      };
      const directExecution = await apiCall(port, "POST", "/v1/workflows/emergency-withdrawal-sequence", {
        body: {
          token: diamondAddress,
          amount: amount.toString(),
          recipient: licenseeWallet.address,
          approvals: [],
          execute: { apiKey: "founder-key", walletAddress: founderAddress },
        },
      });
      expect(directExecution.status, JSON.stringify(directExecution.payload)).toBe(202);
      const directPayload = directExecution.payload as {
        request: { requestId: string; txHash: string };
        execute: { txHash: string; eventCount: number } | null;
        withdrawalState: { executed: boolean };
        economics: { custody: { delta: string }; recipient: { delta: string }; released: string };
      };
      expect(directPayload.request.requestId).toMatch(/^0x[a-fA-F0-9]{64}$/u);
      expect(directPayload.execute?.txHash).toMatch(/^0x[a-fA-F0-9]{64}$/u);
      await expectReceipt(directPayload.request.txHash);
      await expectReceipt(directPayload.execute!.txHash);
      expect(directPayload.execute!.eventCount).toBeGreaterThan(0);
      expect(directPayload.withdrawalState.executed).toBe(true);
      expect(directPayload.economics).toMatchObject({
        custody: { delta: "-1" },
        recipient: { delta: "1" },
        released: "1",
      });
      const afterDirectExecution = {
        custody: BigInt(await tokenSupplyFacet.tokenBalanceOf(diamondAddress)),
        recipient: BigInt(await tokenSupplyFacet.tokenBalanceOf(licenseeWallet.address)),
        totalSupply: BigInt(await tokenSupplyFacet.totalSupply()),
      };
      assertExactAmountDelta("emergencyWithdrawal.directExecute.custody", beforeDirectExecution.custody, afterDirectExecution.custody, -amount);
      assertExactAmountDelta("emergencyWithdrawal.directExecute.recipient", beforeDirectExecution.recipient, afterDirectExecution.recipient, amount);
      assertExactAmountDelta("emergencyWithdrawal.directExecute.totalSupply", beforeDirectExecution.totalSupply, afterDirectExecution.totalSupply, 0n);
      const executeReceipt = await provider.getTransactionReceipt(directPayload.execute!.txHash);
      expect(executeReceipt?.status).toBe(1);
      expect(executeReceipt?.logs.some((log) => {
        try {
          return emergencyWithdrawalFacet.interface.parseLog(log)?.name === "EmergencyWithdrawalExecuted";
        } catch {
          return false;
        }
      })).toBe(true);

      emergencyWithdrawalProofObservations.push({
        methodKeys: ["EmergencyWithdrawalFacet.requestEmergencyWithdrawal", "EmergencyWithdrawalFacet.approveEmergencyWithdrawal", "EmergencyWithdrawalFacet.executeWithdrawal"],
        requestRoute: "POST /v1/workflows/emergency-withdrawal-sequence",
        directExecutionRoute: "POST /v1/workflows/emergency-withdrawal-sequence",
        replayRoute: "POST /v1/emergency/admin/execute-withdrawal",
        requestId: withdrawalPayload.request.requestId,
        requestTransactionHash: withdrawalPayload.request.txHash,
        approvalTransactionHashes: withdrawalPayload.approvals.map((approval) => approval.txHash),
        directExecutionRequestId: directPayload.request.requestId,
        directExecutionRequestTransactionHash: directPayload.request.txHash,
        directExecutionTransactionHash: directPayload.execute!.txHash,
        actor: "founder fixture requester and licensed approver",
        amount: amount.toString(),
        asset: diamondAddress,
        recipient: licenseeWallet.address,
        custodyDelta: (executed.custody - funded.custody).toString(),
        recipientDelta: (executed.recipient - funded.recipient).toString(),
        totalSupplyDelta: (executed.totalSupply - funded.totalSupply).toString(),
        executed: withdrawalPayload.withdrawalState.executed,
        replayRejected: replay.status !== 202,
        directExecutionConfirmed: true,
        directExecutionBalanceDeltasMatched: true,
        forkScopedFixture: true,
      });
      proofCompleted = true;
    } finally {
      const reverted = preserveForkStateForIndexerProof
        ? false
        : await restoreReceiptSnapshot(snapshot).catch(() => false);
      if (proofCompleted && !preserveForkStateForIndexerProof) {
        expect(reverted).toBe(true);
      }
    }
  }, 300_000);

  it("detects the vesting release custody deficit and proves revoke accounting on an isolated fork", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "vesting economic invariants", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.00002") },
      { address: outsiderWallet.address, minimumWei: ethers.parseEther("0.00001") },
      { address: transfereeWallet.address, minimumWei: ethers.parseEther("0.00001") },
    ])) return;

    const snapshot = await captureReceiptSnapshot();
    let proofCompleted = false;
    try {
      const timelockRole = id("TIMELOCK_ROLE");
      const vestingManagerRole = id("VESTING_MANAGER_ROLE");
      for (const role of [timelockRole, vestingManagerRole]) {
        if (!(await accessControl.hasRole(role, founderAddress))) {
          const roleReceipt = await (
            await accessControl.connect(founderWallet).grantRole(role, founderAddress, ethers.MaxUint256)
          ).wait();
          expect(roleReceipt?.status).toBe(1);
        }
      }

      const readSchedule = async (beneficiary: string) => {
        if (!(await vestingFacet.hasVestingSchedule(beneficiary))) {
          return {
            totalAmount: 0n,
            releasedAmount: 0n,
            revoked: false,
          };
        }
        const schedule = await vestingFacet.getVestingDetails(beneficiary);
        return {
          totalAmount: BigInt(schedule.totalAmount),
          releasedAmount: BigInt(schedule.releasedAmount),
          revoked: Boolean(schedule.revoked),
        };
      };
      const readVestingEconomics = async (beneficiary: string) => {
        const schedule = await readSchedule(beneficiary);
        return {
          founderBalance: BigInt(await tokenSupplyFacet.tokenBalanceOf(founderAddress)),
          beneficiaryBalance: BigInt(await tokenSupplyFacet.tokenBalanceOf(beneficiary)),
          totalSupply: BigInt(await tokenSupplyFacet.totalSupply()),
          scheduleTotal: schedule.totalAmount,
          scheduleReleased: schedule.releasedAmount,
          scheduleRevoked: schedule.revoked ? 1n : 0n,
        };
      };
      const workflowTxHash = (payload: unknown, step: string) => {
        const stepPayload = (payload as Record<string, unknown>)[step] as Record<string, unknown>;
        const txHash = String(stepPayload.txHash);
        expect(txHash).toMatch(/^0x[a-fA-F0-9]{64}$/u);
        return txHash;
      };

      const publicAmount = 20_003n * 10n ** 10n + 7n;
      const publicBefore = await readVestingEconomics(outsiderWallet.address);
      expect(await vestingFacet.hasVestingSchedule(outsiderWallet.address)).toBe(false);
      const publicCreate = await apiCall(port, "POST", "/v1/workflows/create-beneficiary-vesting", {
        body: {
          beneficiary: outsiderWallet.address,
          amount: publicAmount.toString(),
          scheduleKind: "public",
        },
      });
      expect(publicCreate.status, JSON.stringify(publicCreate.payload)).toBe(202);
      await expectReceipt(workflowTxHash(publicCreate.payload, "create"));

      const publicAfterCreate = await readVestingEconomics(outsiderWallet.address);
      assertExactAmountDelta(
        "vesting.publicCreate.founderBalance",
        publicBefore.founderBalance,
        publicAfterCreate.founderBalance,
        -publicAmount,
      );
      assertExactAmountDelta(
        "vesting.publicCreate.beneficiaryBalance",
        publicBefore.beneficiaryBalance,
        publicAfterCreate.beneficiaryBalance,
        0n,
      );
      assertExactAmountDelta("vesting.publicCreate.totalSupply", publicBefore.totalSupply, publicAfterCreate.totalSupply, 0n);
      assertExactAmountDelta("vesting.publicCreate.scheduleTotal", 0n, publicAfterCreate.scheduleTotal, publicAmount);
      assertConservedDeltas("vesting.publicCreate.liquidAndLocked", [
        publicAfterCreate.founderBalance - publicBefore.founderBalance,
        publicAfterCreate.beneficiaryBalance - publicBefore.beneficiaryBalance,
        publicAfterCreate.scheduleTotal - publicAfterCreate.scheduleReleased,
      ]);

      const duplicateCreateBefore = await readVestingEconomics(outsiderWallet.address);
      const duplicateCreate = await apiCall(port, "POST", "/v1/workflows/create-beneficiary-vesting", {
        body: {
          beneficiary: outsiderWallet.address,
          amount: publicAmount.toString(),
          scheduleKind: "public",
        },
      });
      expect(duplicateCreate.status).not.toBe(202);
      assertNoEconomicSideEffects(
        "vesting.duplicateCreate",
        duplicateCreateBefore,
        await readVestingEconomics(outsiderWallet.address),
      );

      await provider.send("evm_increaseTime", [30 * 24 * 60 * 60 + 1]);
      await provider.send("evm_mine", []);
      const releasableBefore = BigInt(await vestingFacet.getVestingReleasableAmount(outsiderWallet.address));
      expect(releasableBefore).toBeGreaterThan(0n);
      const releaseBefore = await readVestingEconomics(outsiderWallet.address);
      const release = await apiCall(port, "POST", "/v1/workflows/release-beneficiary-vesting", {
        apiKey: "outsider-key",
        body: {
          beneficiary: outsiderWallet.address,
          mode: "self",
        },
      });
      expect(release.status).toBe(500);
      expect(JSON.stringify(release.payload)).toContain("releaseBeneficiaryVesting.beneficiaryBalanceAfter");
      const releaseAfter = await readVestingEconomics(outsiderWallet.address);
      const releasedNow = releaseAfter.scheduleReleased - releaseBefore.scheduleReleased;
      expect(releasedNow).toBeGreaterThan(0n);
      assertExactAmountDelta(
        "vesting.publicRelease.missingBeneficiaryCredit",
        releaseBefore.beneficiaryBalance,
        releaseAfter.beneficiaryBalance,
        0n,
      );
      assertExactAmountDelta("vesting.publicRelease.totalSupply", releaseBefore.totalSupply, releaseAfter.totalSupply, 0n);
      assertConservedDeltas("vesting.publicRelease.custodyDeficit", [
        releaseAfter.founderBalance - publicBefore.founderBalance,
        releaseAfter.beneficiaryBalance - publicBefore.beneficiaryBalance,
        releaseAfter.scheduleTotal - releaseAfter.scheduleReleased,
      ], -releasedNow);

      const repeatReleaseBefore = await readVestingEconomics(outsiderWallet.address);
      const repeatRelease = await apiCall(port, "POST", "/v1/workflows/release-beneficiary-vesting", {
        apiKey: "outsider-key",
        body: {
          beneficiary: outsiderWallet.address,
          mode: "self",
        },
      });
      const repeatReleaseAfter = await readVestingEconomics(outsiderWallet.address);
      expect(repeatRelease.status).not.toBe(202);
      assertExactAmountDelta(
        "vesting.repeatRelease.beneficiaryBalance",
        repeatReleaseBefore.beneficiaryBalance,
        repeatReleaseAfter.beneficiaryBalance,
        0n,
      );
      assertExactAmountDelta(
        "vesting.repeatRelease.totalSupply",
        repeatReleaseBefore.totalSupply,
        repeatReleaseAfter.totalSupply,
        0n,
      );
      expect(repeatReleaseAfter.scheduleReleased).toBeGreaterThanOrEqual(repeatReleaseBefore.scheduleReleased);

      const revokedAmount = 8_009n * 10n ** 10n + 3n;
      const revokeBeforeCreate = await readVestingEconomics(transfereeWallet.address);
      expect(await vestingFacet.hasVestingSchedule(transfereeWallet.address)).toBe(false);
      const revokeCreate = await apiCall(port, "POST", "/v1/workflows/create-beneficiary-vesting", {
        body: {
          beneficiary: transfereeWallet.address,
          amount: revokedAmount.toString(),
          scheduleKind: "team",
          vestingType: "2",
        },
      });
      expect(revokeCreate.status, JSON.stringify(revokeCreate.payload)).toBe(202);
      await expectReceipt(workflowTxHash(revokeCreate.payload, "create"));
      const revokeAfterCreate = await readVestingEconomics(transfereeWallet.address);
      assertExactAmountDelta(
        "vesting.revokeCreate.founderBalance",
        revokeBeforeCreate.founderBalance,
        revokeAfterCreate.founderBalance,
        -revokedAmount,
      );
      assertExactAmountDelta("vesting.revokeCreate.totalSupply", revokeBeforeCreate.totalSupply, revokeAfterCreate.totalSupply, 0n);
      assertExactAmountDelta("vesting.revokeCreate.scheduleTotal", 0n, revokeAfterCreate.scheduleTotal, revokedAmount);

      const revokeBefore = await readVestingEconomics(transfereeWallet.address);
      const revoke = await apiCall(port, "POST", "/v1/workflows/revoke-beneficiary-vesting", {
        body: { beneficiary: transfereeWallet.address },
      });
      expect(revoke.status, JSON.stringify(revoke.payload)).toBe(202);
      await expectReceipt(workflowTxHash(revoke.payload, "revoke"));
      const revokeAfter = await readVestingEconomics(transfereeWallet.address);
      expect(revokeAfter.scheduleRevoked).toBe(1n);
      assertExactAmountDelta(
        "vesting.revoke.beneficiaryBalance",
        revokeBefore.beneficiaryBalance,
        revokeAfter.beneficiaryBalance,
        0n,
      );
      assertExactAmountDelta("vesting.revoke.totalSupply", revokeBefore.totalSupply, revokeAfter.totalSupply, 0n);
      assertExactAmountDelta("vesting.revoke.scheduleTotal", revokeBefore.scheduleTotal, revokeAfter.scheduleTotal, 0n);
      assertExactAmountDelta("vesting.revoke.scheduleReleased", revokeBefore.scheduleReleased, revokeAfter.scheduleReleased, 0n);
      expect(revoke.payload).toMatchObject({
        economics: {
          canceledLiability: { delta: revokedAmount.toString() },
          beneficiaryBalance: { delta: "0" },
          totalSupply: { delta: "0" },
          scheduleTotal: { delta: "0" },
          released: { delta: "0" },
        },
      });

      const repeatRevokeBefore = await readVestingEconomics(transfereeWallet.address);
      const repeatRevoke = await apiCall(port, "POST", "/v1/workflows/revoke-beneficiary-vesting", {
        body: { beneficiary: transfereeWallet.address },
      });
      expect(repeatRevoke.status).not.toBe(202);
      assertNoEconomicSideEffects(
        "vesting.repeatRevoke",
        repeatRevokeBefore,
        await readVestingEconomics(transfereeWallet.address),
      );
      proofCompleted = true;
    } finally {
      const reverted = await restoreReceiptSnapshot(snapshot).catch(() => false);
      if (proofCompleted) {
        expect(reverted).toBe(true);
      }
    }
  }, 300_000);

  it("mutates whisperblock state through HTTP and matches live whisperblock contract state", async (ctx) => {
    if (await skipWhenFundingBlocked(ctx, "whisperblock lifecycle proof", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.000018") },
    ])) return;
    const createVoiceResponse = await apiCall(port, "POST", "/v1/voice-assets", {
      body: {
        ipfsHash: `QmWhisper${Date.now()}-${Math.random().toString(16).slice(2)}`,
        royaltyRate: "125",
      },
    });
    expect(createVoiceResponse.status).toBe(202);
    const voiceHash = String((createVoiceResponse.payload as Record<string, unknown>).result);
    await expectReceipt(extractTxHash(createVoiceResponse.payload));

    const founderRoleResponses = await Promise.all([
      waitForStableApiResponse(
        () => apiCall(port, "POST", "/v1/whisperblock/queries/owner-role", { apiKey: "read-key", body: {} }),
        (response) => response.status === 200,
        "whisperblock owner role query",
      ),
      waitForStableApiResponse(
        () => apiCall(port, "POST", "/v1/whisperblock/queries/encryptor-role", { apiKey: "read-key", body: {} }),
        (response) => response.status === 200,
        "whisperblock encryptor role query",
      ),
      waitForStableApiResponse(
        () => apiCall(port, "POST", "/v1/whisperblock/queries/voice-operator-role", { apiKey: "read-key", body: {} }),
        (response) => response.status === 200,
        "whisperblock voice operator role query",
      ),
    ]);
    expect(founderRoleResponses[0].status).toBe(200);
    expect(founderRoleResponses[0].payload).toBe(await whisperBlockFacet.OWNER_ROLE());
    expect(founderRoleResponses[1].status).toBe(200);
    expect(founderRoleResponses[1].payload).toBe(await whisperBlockFacet.ENCRYPTOR_ROLE());
    expect(founderRoleResponses[2].status).toBe(200);
    expect(founderRoleResponses[2].payload).toBe(await whisperBlockFacet.VOICE_OPERATOR_ROLE());

    const selectorsResponse = await waitForStableApiResponse(
      () => apiCall(port, "POST", "/v1/whisperblock/queries/get-selectors", {
        apiKey: "read-key",
        body: {},
      }),
      (response) => response.status === 200,
      "whisperblock selectors query",
    );
    expect(selectorsResponse.status).toBe(200);
    expect(selectorsResponse.payload).toEqual(normalize(await whisperBlockFacet.getSelectors()));

    const originalWhisperConfig = await readWhisperConfig(provider, diamondAddress);
    try {
      const auditBeforeResponse = await waitFor(
        () => apiCall(
          port,
          "GET",
          `/v1/whisperblock/queries/get-audit-trail?voiceHash=${encodeURIComponent(voiceHash)}`,
          { apiKey: "read-key" },
        ),
        (response) => response.status === 200,
        "whisperblock initial audit trail read",
      );
      expect(auditBeforeResponse.status).toBe(200);
      expect(auditBeforeResponse.payload).toEqual(normalize(await whisperBlockFacet.getAuditTrail(voiceHash)));

      const setAuditResponse = await apiCall(port, "PATCH", "/v1/whisperblock/commands/set-audit-enabled", {
        body: { enabled: true },
      });
      expect(setAuditResponse.status).toBe(202);
      await expectReceipt(extractTxHash(setAuditResponse.payload));
      expect((await readWhisperConfig(provider, diamondAddress)).requireAudit).toBe(true);

      const fingerprintData = ethers.concat([
        ethers.zeroPadValue("0x1111", 32),
        ethers.zeroPadValue("0x2222", 32),
        ethers.zeroPadValue("0x3333", 32),
      ]);
      const invalidFingerprintData = ethers.concat([
        ethers.zeroPadValue("0x1111", 32),
        ethers.zeroPadValue("0x2222", 32),
        ethers.zeroPadValue("0x4444", 32),
      ]);

      const registerFingerprintResponse = await apiCall(port, "POST", "/v1/whisperblock/whisperblocks", {
        body: {
          voiceHash,
          structuredFingerprintData: fingerprintData,
        },
      });
      expect(registerFingerprintResponse.status).toBe(202);
      const registerFingerprintTxHash = extractTxHash(registerFingerprintResponse.payload);
      await expectReceipt(registerFingerprintTxHash);

      const verifyValidResponse = await waitFor(
        () => apiCall(
          port,
          "GET",
          `/v1/whisperblock/queries/verify-voice-authenticity?voiceHash=${encodeURIComponent(voiceHash)}&fingerprintData=${encodeURIComponent(fingerprintData)}`,
          { apiKey: "read-key" },
        ),
        (response) => response.status === 200 && response.payload === true,
        "whisperblock verify authentic",
      );
      expect(verifyValidResponse.status).toBe(200);
      expect(verifyValidResponse.payload).toBe(true);
      expect(await whisperBlockFacet.verifyVoiceAuthenticity(voiceHash, fingerprintData)).toBe(true);

      const verifyInvalidResponse = await apiCall(
        port,
        "GET",
        `/v1/whisperblock/queries/verify-voice-authenticity?voiceHash=${encodeURIComponent(voiceHash)}&fingerprintData=${encodeURIComponent(invalidFingerprintData)}`,
        { apiKey: "read-key" },
      );
      expect(verifyInvalidResponse.status).toBe(200);
      expect(verifyInvalidResponse.payload).toBe(false);
      expect(await whisperBlockFacet.verifyVoiceAuthenticity(voiceHash, invalidFingerprintData)).toBe(false);

      const registerFingerprintReceipt = await provider.getTransactionReceipt(registerFingerprintTxHash);
      const voiceFingerprintEvents = await apiCall(port, "POST", "/v1/whisperblock/events/voice-fingerprint-updated/query", {
        apiKey: "read-key",
        body: {
          fromBlock: String(registerFingerprintReceipt!.blockNumber),
          toBlock: String(registerFingerprintReceipt!.blockNumber),
        },
      });
      expect(voiceFingerprintEvents.status).toBe(200);
      expect((voiceFingerprintEvents.payload as Array<Record<string, unknown>>).some((log) => log.transactionHash === registerFingerprintTxHash)).toBe(true);

      const encryptionKeyResponse = await apiCall(port, "POST", "/v1/whisperblock/commands/generate-and-set-encryption-key", {
        body: { voiceHash },
      });
      expect(encryptionKeyResponse.status).toBe(202);
      expect((encryptionKeyResponse.payload as Record<string, unknown>).result).toEqual(expect.stringMatching(/^0x[0-9a-fA-F]*$/u));
      const encryptionKeyTxHash = extractTxHash(encryptionKeyResponse.payload);
      const encryptionKeyReceipt = await waitFor(
        () => provider.getTransactionReceipt(encryptionKeyTxHash),
        (receipt) => receipt !== null,
        "whisperblock encryption key receipt",
      );
      if (encryptionKeyReceipt && encryptionKeyReceipt.status === 1) {
        const keyRotatedEvents = await waitFor(
          () => apiCall(port, "POST", "/v1/whisperblock/events/key-rotated/query", {
            apiKey: "read-key",
            body: {
              fromBlock: String(encryptionKeyReceipt.blockNumber),
              toBlock: String(encryptionKeyReceipt.blockNumber),
            },
          }),
          (response) =>
            response.status === 200 &&
            Array.isArray(response.payload) &&
            response.payload.some((log) => (log as Record<string, unknown>).transactionHash === encryptionKeyTxHash),
          "whisperblock key-rotated event query",
        );
        expect(keyRotatedEvents.status).toBe(200);
        const directKeyRotatedLogCount = encryptionKeyReceipt.logs
          .map((log) => {
            try {
              return whisperBlockFacet.interface.parseLog(log);
            } catch {
              return null;
            }
          })
          .filter((log) => log?.name === "KeyRotated").length;
        expect(directKeyRotatedLogCount).toBeGreaterThan(0);
        expect((keyRotatedEvents.payload as Array<Record<string, unknown>>).some((log) => log.transactionHash === encryptionKeyTxHash)).toBe(true);
      } else if (encryptionKeyReceipt) {
        expect(encryptionKeyReceipt.status).toBe(0);
      }

      const accessGrantee = Wallet.createRandom().address;
      const grantAccessResponse = await apiCall(port, "POST", "/v1/whisperblock/commands/grant-access", {
        body: {
          voiceHash,
          user: accessGrantee,
          duration: "1200",
        },
      });
      expect(grantAccessResponse.status).toBe(202);
      const grantAccessTxHash = extractTxHash(grantAccessResponse.payload);
      await expectReceipt(grantAccessTxHash);

      const grantAccessReceipt = await provider.getTransactionReceipt(grantAccessTxHash);
      const accessGrantedEvents = await waitFor(
        () => apiCall(port, "POST", "/v1/whisperblock/events/access-granted/query", {
          apiKey: "read-key",
          body: {
            fromBlock: String(grantAccessReceipt!.blockNumber),
            toBlock: String(grantAccessReceipt!.blockNumber),
          },
        }),
        (response) =>
          response.status === 200 &&
          Array.isArray(response.payload) &&
          response.payload.some((log) => (log as Record<string, unknown>).transactionHash === grantAccessTxHash),
        "whisperblock access-granted event query",
      );
      expect(accessGrantedEvents.status).toBe(200);
      const directAccessGrantedLogCount = grantAccessReceipt!.logs
        .map((log) => {
          try {
            return whisperBlockFacet.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .filter((log) => log?.name === "AccessGranted").length;
      expect(directAccessGrantedLogCount).toBeGreaterThan(0);
      expect((accessGrantedEvents.payload as Array<Record<string, unknown>>).some((log) => log.transactionHash === grantAccessTxHash)).toBe(true);

      const revokeAccessResponse = await apiCall(port, "DELETE", "/v1/whisperblock/commands/revoke-access", {
        body: {
          voiceHash,
          user: accessGrantee,
        },
      });
      expect(revokeAccessResponse.status).toBe(202);
      const revokeAccessTxHash = extractTxHash(revokeAccessResponse.payload);
      await expectReceipt(revokeAccessTxHash);

      const revokeAccessReceipt = await provider.getTransactionReceipt(revokeAccessTxHash);
      const accessRevokedEvents = await waitFor(
        () => apiCall(port, "POST", "/v1/whisperblock/events/access-revoked/query", {
          apiKey: "read-key",
          body: {
            fromBlock: String(revokeAccessReceipt!.blockNumber),
            toBlock: String(revokeAccessReceipt!.blockNumber),
          },
        }),
        (response) =>
          response.status === 200 &&
          Array.isArray(response.payload) &&
          response.payload.some((log) => (log as Record<string, unknown>).transactionHash === revokeAccessTxHash),
        "whisperblock access-revoked event query",
      );
      expect(accessRevokedEvents.status).toBe(200);
      const directAccessRevokedLogCount = revokeAccessReceipt!.logs
        .map((log) => {
          try {
            return whisperBlockFacet.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .filter((log) => log?.name === "AccessRevoked").length;
      expect(directAccessRevokedLogCount).toBeGreaterThan(0);
      expect((accessRevokedEvents.payload as Array<Record<string, unknown>>).some((log) => log.transactionHash === revokeAccessTxHash)).toBe(true);

      const auditAfterAccessResponse = await waitFor(
        () => apiCall(
          port,
          "GET",
          `/v1/whisperblock/queries/get-audit-trail?voiceHash=${encodeURIComponent(voiceHash)}`,
          { apiKey: "read-key" },
        ),
        (response) => response.status === 200 && Array.isArray(response.payload) && response.payload.length > (auditBeforeResponse.payload as Array<unknown>).length,
        "whisperblock audit trail growth",
      );
      expect(auditAfterAccessResponse.payload).toEqual(normalize(await whisperBlockFacet.getAuditTrail(voiceHash)));

      const trustedOracleWallet = Wallet.createRandom();
      const setTrustedOracleResponse = await apiCall(port, "PATCH", "/v1/whisperblock/commands/set-trusted-oracle", {
        body: { oracle: trustedOracleWallet.address },
      });
      expect(setTrustedOracleResponse.status).toBe(202);
      await expectReceipt(extractTxHash(setTrustedOracleResponse.payload));
      await waitFor(
        () => readWhisperConfig(provider, diamondAddress),
        (config) => config.trustedOracle === trustedOracleWallet.address,
        "whisperblock trusted oracle update",
      );

      const updatedSystemParametersResponse = await apiCall(port, "PATCH", "/v1/whisperblock/commands/update-system-parameters", {
        body: {
          newMinKeyStrength: "512",
          newMinEntropy: "256",
          newDefaultAccessDuration: "3600",
        },
      });
      expect(updatedSystemParametersResponse.status).toBe(202);
      const updatedSystemParametersTxHash = extractTxHash(updatedSystemParametersResponse.payload);
      await expectReceipt(updatedSystemParametersTxHash);
      await waitFor(
        () => readWhisperConfig(provider, diamondAddress),
        (config) =>
          config.minKeyStrength === "512" &&
          config.minEntropy === "256" &&
          config.defaultAccessDuration === "3600" &&
          config.trustedOracle === trustedOracleWallet.address,
        "whisperblock system parameter update",
      );

      const updatedSystemParametersReceipt = await provider.getTransactionReceipt(updatedSystemParametersTxHash);
      const securityParametersEvents = await apiCall(port, "POST", "/v1/whisperblock/events/security-parameters-updated/query", {
        apiKey: "read-key",
        body: {
          fromBlock: String(updatedSystemParametersReceipt!.blockNumber),
          toBlock: String(updatedSystemParametersReceipt!.blockNumber),
        },
      });
      expect(securityParametersEvents.status).toBe(200);
      expect((securityParametersEvents.payload as Array<Record<string, unknown>>).some((log) => log.transactionHash === updatedSystemParametersTxHash)).toBe(true);

      const offchainSeed = id(`whisper-offchain-seed-${Date.now()}`);
      const blockHash = id(`whisper-block-hash-${Date.now()}`);
      const message = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["bytes32", "bytes32", "address", "bytes32"],
          [voiceHash, offchainSeed, founderAddress, blockHash],
        ),
      );
      const offchainSignature = await trustedOracleWallet.signMessage(ethers.getBytes(message));
      const offchainEntropyResponse = await apiCall(port, "PATCH", "/v1/whisperblock/commands/set-offchain-entropy", {
        body: {
          voiceHash,
          offchainSeed,
          walletAddress: founderAddress,
          blockHash,
          signature: offchainSignature,
        },
      });
      expect(offchainEntropyResponse.status).toBe(202);
      const offchainEntropyTxHash = extractTxHash(offchainEntropyResponse.payload);
      await expectReceipt(offchainEntropyTxHash);

      const offchainEntropyReceipt = await provider.getTransactionReceipt(offchainEntropyTxHash);
      const offchainKeyEvents = await waitFor(
        () => apiCall(port, "POST", "/v1/whisperblock/events/offchain-key-generated/query", {
          apiKey: "read-key",
          body: {
            fromBlock: String(offchainEntropyReceipt!.blockNumber),
            toBlock: String(offchainEntropyReceipt!.blockNumber),
          },
        }),
        (response) =>
          response.status === 200 &&
          Array.isArray(response.payload) &&
          response.payload.some((log) => (log as Record<string, unknown>).transactionHash === offchainEntropyTxHash),
        "whisperblock offchain-key-generated event query",
      );
      expect(offchainKeyEvents.status).toBe(200);
      expect((offchainKeyEvents.payload as Array<Record<string, unknown>>).some((log) => log.transactionHash === offchainEntropyTxHash)).toBe(true);

      const auditEventResponse = await apiCall(port, "POST", "/v1/whisperblock/events/audit-event/query", {
        apiKey: "read-key",
        body: {
          fromBlock: String(registerFingerprintReceipt!.blockNumber),
          toBlock: String(offchainEntropyReceipt!.blockNumber),
        },
      });
      expect(auditEventResponse.status).toBe(200);
      expect((auditEventResponse.payload as Array<Record<string, unknown>>).length).toBeGreaterThan(0);
    } finally {
      const restoreSystemParametersResponse = await apiCall(port, "PATCH", "/v1/whisperblock/commands/update-system-parameters", {
        apiKey: "whisper-restore-key",
        body: {
          newMinKeyStrength: String(originalWhisperConfig.minKeyStrength),
          newMinEntropy: String(originalWhisperConfig.minEntropy),
          newDefaultAccessDuration: String(originalWhisperConfig.defaultAccessDuration),
        },
      });
      expect(restoreSystemParametersResponse.status).toBe(202);
      await expectReceipt(extractTxHash(restoreSystemParametersResponse.payload));

      const restoreTrustedOracleResponse = await apiCall(port, "PATCH", "/v1/whisperblock/commands/set-trusted-oracle", {
        apiKey: "whisper-restore-key",
        body: { oracle: String(originalWhisperConfig.trustedOracle) },
      });
      expect(restoreTrustedOracleResponse.status).toBe(202);
      await expectReceipt(extractTxHash(restoreTrustedOracleResponse.payload));

      const restoreAuditResponse = await apiCall(port, "PATCH", "/v1/whisperblock/commands/set-audit-enabled", {
        apiKey: "whisper-restore-key",
        body: { enabled: Boolean(originalWhisperConfig.requireAudit) },
      });
      expect(restoreAuditResponse.status).toBe(202);
      await expectReceipt(extractTxHash(restoreAuditResponse.payload));

      await waitFor(
        () => readWhisperConfig(provider, diamondAddress),
        (config) =>
          config.minKeyStrength === originalWhisperConfig.minKeyStrength &&
          config.minEntropy === originalWhisperConfig.minEntropy &&
          config.defaultAccessDuration === originalWhisperConfig.defaultAccessDuration &&
          config.requireAudit === originalWhisperConfig.requireAudit &&
          config.trustedOracle === originalWhisperConfig.trustedOracle,
        "whisperblock restore original config",
      );
    }
  }, 120_000);

  it("creates templates and licenses through HTTP and matches live licensing state", async (ctx) => {
    if (await skipWhenFundingBlocked(ctx, "licensing template and license lifecycle", [
      { address: licensingOwnerAddress, minimumWei: ethers.parseEther("0.00001") },
      { address: licenseeWallet.address, minimumWei: ethers.parseEther("0.000003") },
      { address: transfereeWallet.address, minimumWei: ethers.parseEther("0.000003") },
    ])) return;
    await ensureNativeBalance(licensingOwnerAddress, ethers.parseEther("0.00001"));
    await ensureNativeBalance(licenseeWallet.address, ethers.parseEther("0.000003"));
    await ensureNativeBalance(transfereeWallet.address, ethers.parseEther("0.000003"));

    const createVoiceResponse = await apiCall(port, "POST", "/v1/voice-assets", {
      apiKey: "licensing-owner-key",
      body: {
        ipfsHash: `QmLicensing${Date.now()}-${Math.random().toString(16).slice(2)}`,
        royaltyRate: "175",
      },
    });
    expect(createVoiceResponse.status).toBe(202);
    const voiceHash = String((createVoiceResponse.payload as Record<string, unknown>).result);
    await expectReceipt(extractTxHash(createVoiceResponse.payload));

    const latestBlock = await provider.getBlock("latest");
    const now = BigInt(latestBlock?.timestamp ?? Math.floor(Date.now() / 1000));
    const baseTemplate = {
      creator: licensingOwnerAddress,
      isActive: true,
      transferable: true,
      createdAt: now,
      updatedAt: now,
      defaultDuration: 45n * 24n * 60n * 60n,
      defaultPrice: 15_000n,
      maxUses: 12n,
      name: `Lifecycle Base ${Date.now()}`,
      description: "template lifecycle coverage",
      defaultRights: ["Narration", "Ads"],
      defaultRestrictions: ["no-sublicense"],
      terms: {
        licenseHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        duration: 45n * 24n * 60n * 60n,
        price: 15_000n,
        maxUses: 12n,
        transferable: true,
        rights: ["Narration", "Ads"],
        restrictions: ["no-sublicense"],
      },
    };

    const createTemplateBody = await buildHttpTemplate(provider, licensingOwnerAddress, `Lifecycle Base ${Date.now()}`);
    const createTemplateResponse = await apiCall(port, "POST", "/v1/licensing/license-templates/create-template", {
      apiKey: "licensing-owner-key",
      body: {
        template: createTemplateBody,
      },
    });
    expect(createTemplateResponse.status).toBe(202);
    expect(createTemplateResponse.payload).toMatchObject({
      result: expect.stringMatching(/^0x[a-fA-F0-9]{64}$/u),
    });
    const templateHash = String((createTemplateResponse.payload as Record<string, unknown>).result);
    const createTemplateTxHash = extractTxHash(createTemplateResponse.payload);
    await expectReceipt(createTemplateTxHash);

    const creatorTemplatesResponse = await waitFor(
      () => apiCall(
        port,
        "GET",
        `/v1/licensing/queries/get-creator-templates?creator=${encodeURIComponent(licensingOwnerAddress)}`,
        { apiKey: "read-key" },
      ),
      (response) => response.status === 200 && Array.isArray(response.payload) && (response.payload as string[]).includes(templateHash),
      "licensing creator templates read",
    );
    expect(creatorTemplatesResponse.status).toBe(200);
    expect(creatorTemplatesResponse.payload).toContain(templateHash);

    const templateReadResponse = await apiCall(
      port,
      "GET",
      `/v1/licensing/queries/get-template?templateHash=${encodeURIComponent(templateHash)}`,
      { apiKey: "read-key" },
    );
    expect(templateReadResponse.status).toBe(200);
    expect(templateReadResponse.payload).toMatchObject({
      creator: licensingOwnerAddress,
      isActive: true,
      transferable: true,
      name: createTemplateBody.name,
      description: createTemplateBody.description,
    });
    expect((templateReadResponse.payload as Record<string, unknown>).terms).toMatchObject({
      licenseHash: expect.stringMatching(/^0x[a-fA-F0-9]{64}$/u),
      duration: "3888000",
      price: "15000",
      maxUses: "12",
      transferable: true,
      rights: ["Narration", "Ads"],
      restrictions: ["no-sublicense"],
    });

    const templateActiveResponse = await apiCall(
      port,
      "GET",
      `/v1/licensing/queries/is-template-active?templateHash=${encodeURIComponent(templateHash)}`,
      { apiKey: "read-key" },
    );
    expect(templateActiveResponse.status).toBe(200);
    expect(templateActiveResponse.payload).toBe(true);

    const updatedTemplate = {
      ...baseTemplate,
      transferable: false,
      updatedAt: now,
      defaultDuration: 90n * 24n * 60n * 60n,
      defaultPrice: 25_000n,
      maxUses: 24n,
      name: `Lifecycle Updated ${Date.now()}`,
      description: "updated template lifecycle coverage",
      defaultRights: ["Narration", "Audiobook"],
      defaultRestrictions: ["territory-us"],
      terms: {
        licenseHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        duration: 90n * 24n * 60n * 60n,
        price: 25_000n,
        maxUses: 24n,
        transferable: false,
        rights: ["Narration", "Audiobook"],
        restrictions: ["territory-us"],
      },
    };

    const updateTemplateBody = await buildHttpTemplate(provider, licensingOwnerAddress, `Lifecycle Updated ${Date.now()}`, {
      transferable: false,
      defaultDuration: String(90n * 24n * 60n * 60n),
      defaultPrice: "25000",
      maxUses: "24",
      defaultRights: ["Narration", "Audiobook"],
      defaultRestrictions: ["territory-us"],
      terms: {
        licenseHash: ZERO_BYTES32,
        duration: String(90n * 24n * 60n * 60n),
        price: "25000",
        maxUses: "24",
        transferable: false,
        rights: ["Narration", "Audiobook"],
        restrictions: ["territory-us"],
      },
    });

    const updateTemplateResponse = await apiCall(port, "PATCH", "/v1/licensing/commands/update-template", {
      apiKey: "licensing-owner-key",
      body: {
        templateHash,
        template: updateTemplateBody,
      },
    });
    expect(updateTemplateResponse.status).toBe(202);
    const updateTemplateTxHash = extractTxHash(updateTemplateResponse.payload);
    await expectReceipt(updateTemplateTxHash);

    const updatedTemplateRead = await waitFor(
      () => apiCall(
        port,
        "GET",
        `/v1/licensing/queries/get-template?templateHash=${encodeURIComponent(templateHash)}`,
        { apiKey: "read-key" },
      ),
      (response) => response.status === 200 && (response.payload as Record<string, unknown>).name === updateTemplateBody.name,
      "licensing updated template read",
    );
    expect(updatedTemplateRead.payload).toMatchObject({
      creator: licensingOwnerAddress,
      isActive: true,
      transferable: false,
      name: updateTemplateBody.name,
      description: updateTemplateBody.description,
    });
    expect((updatedTemplateRead.payload as Record<string, unknown>).terms).toMatchObject({
      licenseHash: expect.stringMatching(/^0x[a-fA-F0-9]{64}$/u),
      duration: "7776000",
      price: "25000",
      maxUses: "24",
      transferable: false,
      rights: ["Narration", "Audiobook"],
      restrictions: ["territory-us"],
    });

    const updateTemplateReceipt = await provider.getTransactionReceipt(updateTemplateTxHash);
    const templateUpdatedEvents = await apiCall(port, "POST", "/v1/licensing/events/template-updated/query/voice-license-template", {
      apiKey: "read-key",
      body: {
        fromBlock: String(updateTemplateReceipt!.blockNumber),
        toBlock: String(updateTemplateReceipt!.blockNumber),
      },
    });
    expect(templateUpdatedEvents.status).toBe(200);
    expect((templateUpdatedEvents.payload as Array<Record<string, unknown>>).some((log) => log.transactionHash === updateTemplateTxHash)).toBe(true);

    const deactivateTemplateResponse = await apiCall(port, "PATCH", "/v1/licensing/commands/set-template-status", {
      apiKey: "licensing-owner-key",
      body: {
        templateHash,
        active: false,
      },
    });
    expect(deactivateTemplateResponse.status).toBe(202);
    await expectReceipt(extractTxHash(deactivateTemplateResponse.payload));
    expect(await waitFor(
      () => templateFacet.isTemplateActive(templateHash),
      (value) => value === false,
      "contract inactive template read",
    )).toBe(false);

    const createFromInactiveResponse = await apiCall(port, "POST", "/v1/licensing/license-templates/create-license-from-template", {
      apiKey: "licensing-owner-key",
      body: {
        voiceHash,
        templateHash,
        customizations: normalize({
          licenseHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
          duration: 60n * 24n * 60n * 60n,
          price: 30_000n,
          maxUses: 7n,
          transferable: true,
          rights: ["Podcast"],
          restrictions: ["no-derivatives"],
        }),
      },
    });
    expect(createFromInactiveResponse.status).toBe(500);

    const reactivateTemplateResponse = await apiCall(port, "PATCH", "/v1/licensing/commands/set-template-status", {
      apiKey: "licensing-owner-key",
      body: {
        templateHash,
        active: true,
      },
    });
    expect(reactivateTemplateResponse.status).toBe(202);
    const reactivateTemplateTxHash = extractTxHash(reactivateTemplateResponse.payload);
    const reactivateTemplateReceipt = await waitFor(
      () => provider.getTransactionReceipt(reactivateTemplateTxHash),
      (value) => value !== null,
      "reactivate template receipt",
    );
    expect([0, 1]).toContain(Number(reactivateTemplateReceipt?.status ?? -1));

    const freshTemplate = {
      ...updatedTemplate,
      transferable: true,
      defaultPrice: 1_000n,
      terms: {
        ...updatedTemplate.terms,
        transferable: true,
        price: 1_000n,
      },
      name: `Lifecycle Active ${Date.now()}`,
    };
    const freshTemplateResponse = await apiCall(port, "POST", "/v1/licensing/license-templates/create-template", {
      apiKey: "licensing-owner-key",
      body: {
        template: await buildHttpTemplate(provider, licensingOwnerAddress, `Lifecycle Active ${Date.now()}`, {
          defaultPrice: "1000",
          terms: {
            licenseHash: ZERO_BYTES32,
            duration: String(45n * 24n * 60n * 60n),
            price: "1000",
            maxUses: "12",
            transferable: true,
            rights: ["Narration", "Ads"],
            restrictions: ["no-sublicense"],
          },
        }),
      },
    });
    expect(freshTemplateResponse.status).toBe(202);
    const freshTemplateHash = String((freshTemplateResponse.payload as Record<string, unknown>).result);
    await expectReceipt(extractTxHash(freshTemplateResponse.payload));

    let directTemplateDerivationError = "";
    try {
      await templateFacet.connect(licensingOwnerWallet).createLicenseFromTemplate.staticCall(
        voiceHash,
        freshTemplateHash,
        {
          licenseHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
          duration: 60n * 24n * 60n * 60n,
          price: 30_000n,
          maxUses: 7n,
          transferable: true,
          rights: ["Podcast"],
          restrictions: ["no-derivatives"],
        },
      );
    } catch (error) {
      directTemplateDerivationError = extractRevertMarker(error);
    }
    const createFromTemplateResponse = await apiCall(port, "POST", "/v1/licensing/license-templates/create-license-from-template", {
      apiKey: "licensing-owner-key",
      body: {
        voiceHash,
        templateHash: freshTemplateHash,
        customizations: normalize({
          licenseHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
          duration: 60n * 24n * 60n * 60n,
          price: 30_000n,
          maxUses: 7n,
          transferable: true,
          rights: ["Podcast"],
          restrictions: ["no-derivatives"],
        }),
      },
    });
    expect(createFromTemplateResponse.status).toBe(202);
    expect(createFromTemplateResponse.payload).toMatchObject({
      result: expect.stringMatching(/^0x[a-fA-F0-9]{64}$/u),
    });
    await expectReceipt(extractTxHash(createFromTemplateResponse.payload));
    expect(directTemplateDerivationError).toBe("");

    const createLicenseResponse = await apiCall(port, "POST", "/v1/licensing/licenses/create-license", {
      apiKey: "licensing-owner-key",
      body: {
        licensee: licenseeWallet.address,
        voiceHash,
        terms: normalize({
          licenseHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
          duration: 60n * 24n * 60n * 60n,
          price: 0n,
          maxUses: 7n,
          transferable: true,
          rights: ["Podcast"],
          restrictions: ["no-derivatives"],
        }),
      },
    });
    expect(createLicenseResponse.status).toBe(202);
    const createLicenseTxHash = extractTxHash(createLicenseResponse.payload);
    await expectReceipt(createLicenseTxHash);

    const licenseReadResponse = await waitFor(
      () => apiCall(
        port,
        "GET",
        `/v1/licensing/queries/get-license?voiceHash=${encodeURIComponent(voiceHash)}&licensee=${encodeURIComponent(licenseeWallet.address)}`,
        { apiKey: "read-key" },
      ),
      (response) => response.status === 200,
      "licensing get-license read",
    );
    expect(licenseReadResponse.status).toBe(200);
    const directLicense = await licenseFacet.getLicense(voiceHash, licenseeWallet.address);
    expect(licenseReadResponse.payload).toEqual(licenseToObject(directLicense));
    const activeTemplateHash = String((licenseReadResponse.payload as Record<string, unknown>).templateHash);
    expect(activeTemplateHash).toBe("0x0000000000000000000000000000000000000000000000000000000000000000");

    const licenseCreatedReceipt = await provider.getTransactionReceipt(createLicenseTxHash);
    if (!licenseCreatedReceipt) {
      throw new Error("Missing receipt for license creation");
    }
    const licenseCreatedEventRoute = requireVoiceLicenseCreatedEventRoute(diamondAddress, licenseCreatedReceipt.logs);
    const licenseCreatedEvents = await apiCall(port, "POST", licenseCreatedEventRoute, {
      apiKey: "read-key",
      body: {
        fromBlock: String(licenseCreatedReceipt.blockNumber),
        toBlock: String(licenseCreatedReceipt.blockNumber),
      },
    });
    expect(licenseCreatedEvents.status).toBe(200);
    expect((licenseCreatedEvents.payload as Array<Record<string, unknown>>).some((log) => log.transactionHash === createLicenseTxHash)).toBe(true);

    const licenseesResponse = await apiCall(
      port,
      "GET",
      `/v1/licensing/queries/get-licensees?voiceHash=${encodeURIComponent(voiceHash)}`,
      { apiKey: "read-key" },
    );
    expect(licenseesResponse.status).toBe(200);
    expect(licenseesResponse.payload).toContain(licenseeWallet.address);
    expect(normalize(await licenseFacet.getLicensees(voiceHash))).toContain(licenseeWallet.address);

    const licenseHistoryResponse = await apiCall(
      port,
      "GET",
      `/v1/licensing/queries/get-license-history?voiceHash=${encodeURIComponent(voiceHash)}`,
      { apiKey: "read-key" },
    );
    expect(licenseHistoryResponse.status).toBe(200);
    expect(licenseHistoryResponse.payload).toEqual(normalize(await licenseFacet.getLicenseHistory(voiceHash)));

    const licenseTermsResponse = await apiCall(
      port,
      "GET",
      `/v1/licensing/queries/get-license-terms?voiceHash=${encodeURIComponent(voiceHash)}`,
      { apiKey: "licensee-key" },
    );
    expect(licenseTermsResponse.status).toBe(200);
    expect(licenseTermsResponse.payload).toEqual(licenseTermsToObject(await licenseFacet.connect(licenseeWallet).getLicenseTerms(voiceHash)));

    const validateResponse = await apiCall(port, "POST", "/v1/licensing/queries/validate-license", {
      apiKey: "read-key",
      body: {
        voiceHash,
        licensee: licenseeWallet.address,
        templateHash: activeTemplateHash,
      },
    });
    expect(validateResponse.status).toBe(200);
    expect(validateResponse.payload).toEqual(normalize(await licenseFacet.validateLicense(voiceHash, licenseeWallet.address, activeTemplateHash)));

    const usageRef = id(`licensing-usage-${Date.now()}`);
    const recordUsageResponse = await apiCall(port, "POST", "/v1/licensing/commands/record-licensed-usage", {
      apiKey: "licensee-key",
      body: {
        voiceHash,
        usageRef,
      },
    });
    expect(recordUsageResponse.status).toBe(202);
    const recordUsageTxHash = extractTxHash(recordUsageResponse.payload);
    await expectReceipt(recordUsageTxHash);

    const usageReadResponse = await waitFor(
      () => apiCall(
        port,
        "GET",
        `/v1/licensing/queries/is-usage-ref-used?voiceHash=${encodeURIComponent(voiceHash)}&usageRef=${encodeURIComponent(usageRef)}`,
        { apiKey: "read-key" },
      ),
      (response) => response.status === 200 && response.payload === true,
      "licensing usage ref read",
    );
    expect(usageReadResponse.payload).toBe(true);
    expect(await licenseFacet.isUsageRefUsed(voiceHash, usageRef)).toBe(true);

    const usageCountResponse = await apiCall(
      port,
      "GET",
      `/v1/licensing/queries/get-usage-count?voiceHash=${encodeURIComponent(voiceHash)}&licensee=${encodeURIComponent(licenseeWallet.address)}`,
      { apiKey: "read-key" },
    );
    expect(usageCountResponse.status).toBe(200);
    expect(usageCountResponse.payload).toBe(String(await licenseFacet.getUsageCount(voiceHash, licenseeWallet.address)));

    const usageReceipt = await provider.getTransactionReceipt(recordUsageTxHash);
    const usageEvents = await apiCall(port, "POST", "/v1/licensing/events/license-used/query", {
      apiKey: "read-key",
      body: {
        fromBlock: String(usageReceipt!.blockNumber),
        toBlock: String(usageReceipt!.blockNumber),
      },
    });
    expect(usageEvents.status).toBe(200);
    expect((usageEvents.payload as Array<Record<string, unknown>>).some((log) => log.transactionHash === recordUsageTxHash)).toBe(true);

    let directTransferError = "";
    try {
      await licenseFacet.connect(licenseeWallet).transferLicense.staticCall(
        voiceHash,
        activeTemplateHash,
        transfereeWallet.address,
      );
    } catch (error) {
      directTransferError = extractRevertMarker(error);
    }
    const transferLicenseResponse = await apiCall(port, "POST", "/v1/licensing/commands/transfer-license", {
      apiKey: "licensee-key",
      body: {
        voiceHash,
        templateHash: activeTemplateHash,
        to: transfereeWallet.address,
      },
    });
    expect(transferLicenseResponse.status).toBe(500);
    expect(JSON.stringify(transferLicenseResponse.payload)).toMatch(/VoiceNotTransferable|InvalidLicenseTemplate|CALL_EXCEPTION|a4e1a97e|0xc7234888/u);
    expect(directTransferError).toMatch(/VoiceNotTransferable|InvalidLicenseTemplate|CALL_EXCEPTION|a4e1a97e|0xc7234888/u);

    const revokeLicenseResponse = await apiCall(port, "DELETE", "/v1/licensing/commands/revoke-license", {
      apiKey: "licensing-owner-key",
      body: {
        voiceHash,
        templateHash: activeTemplateHash,
        licensee: licenseeWallet.address,
        reason: "template lifecycle end",
      },
    });
    expect(revokeLicenseResponse.status).toBe(202);
    const revokeLicenseTxHash = extractTxHash(revokeLicenseResponse.payload);
    await expectReceipt(revokeLicenseTxHash);

    const revokedLicenseResponse = await apiCall(
      port,
      "GET",
      `/v1/licensing/queries/get-license?voiceHash=${encodeURIComponent(voiceHash)}&licensee=${encodeURIComponent(licenseeWallet.address)}`,
      { apiKey: "read-key" },
    );
    expect(revokedLicenseResponse.status).toBe(200);

    const revokeReceipt = await provider.getTransactionReceipt(revokeLicenseTxHash);
    const revokeEvents = await apiCall(port, "POST", "/v1/licensing/events/license-revoked/query", {
      apiKey: "read-key",
      body: {
        fromBlock: String(revokeReceipt!.blockNumber),
        toBlock: String(revokeReceipt!.blockNumber),
      },
    });
    expect(revokeEvents.status).toBe(200);
    expect((revokeEvents.payload as Array<Record<string, unknown>>).some((log) => log.transactionHash === revokeLicenseTxHash)).toBe(true);

    const pendingRevenueResponse = await apiCall(
      port,
      "GET",
      `/v1/licensing/queries/get-pending-revenue?account=${encodeURIComponent(licensingOwnerAddress)}`,
      { apiKey: "read-key" },
    );
    expect(pendingRevenueResponse.status).toBe(200);
    expect(pendingRevenueResponse.payload).toBe(String(await licenseFacet.getPendingRevenue(licensingOwnerAddress)));
  }, 120_000);

  it("proves admin, emergency, and multisig control-plane reads through HTTP on Base Sepolia", async () => {
    const latestBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(latestBlock - 9, 0);
    const syntheticUpgradeId = id(`admin-proof-upgrade-${latestBlock}`);
    const syntheticOperationId = id(`admin-proof-operation-${latestBlock}`);
    const syntheticOperationType = id("MARKETPLACE_WITHDRAWAL");
    const zeroAddress = ethers.ZeroAddress;
    const ownerOfSelector = voiceAsset.interface.getFunction("ownerOf")!.selector;
    const diamondCutSelector = diamondCutFacet.interface.getFunction("diamondCut")!.selector;
    const loupeFacetAddressSelector = diamondLoupeFacet.interface.getFunction("facetAddress")!.selector;

    const ownerOfFacet = await diamondLoupeFacet.facetAddress(ownerOfSelector);
    const diamondReadAssertions: Array<readonly [string, string, ApiCallOptions, unknown]> = [
      [
        "GET",
        `/v1/diamond-admin/queries/get-trusted-init-codehash?initContract=${encodeURIComponent(zeroAddress)}`,
        { apiKey: "read-key" },
        await diamondCutFacet.getTrustedInitCodehash(zeroAddress),
      ],
      [
        "GET",
        `/v1/diamond-admin/queries/is-immutable-selector-reserved?selector=${encodeURIComponent(diamondCutSelector)}`,
        { apiKey: "read-key" },
        await diamondCutFacet.isImmutableSelectorReserved(diamondCutSelector),
      ],
      [
        "GET",
        `/v1/diamond-admin/queries/is-trusted-init-selector?initContract=${encodeURIComponent(zeroAddress)}&selector=${encodeURIComponent("0x00000000")}`,
        { apiKey: "read-key" },
        await diamondCutFacet.isTrustedInitSelector(zeroAddress, "0x00000000"),
      ],
      [
        "GET",
        `/v1/diamond-admin/queries/is-trusted-init-selector-policy-enabled?initContract=${encodeURIComponent(zeroAddress)}`,
        { apiKey: "read-key" },
        await diamondCutFacet.isTrustedInitSelectorPolicyEnabled(zeroAddress),
      ],
      [
        "POST",
        "/v1/diamond-admin/queries/facet-addresses",
        { apiKey: "read-key", body: {} },
        normalize(await diamondLoupeFacet.facetAddresses()),
      ],
      [
        "GET",
        `/v1/diamond-admin/queries/is-immutable-selector-reserved?selector=${encodeURIComponent(loupeFacetAddressSelector)}`,
        { apiKey: "read-key" },
        await diamondLoupeFacet.isImmutableSelectorReserved(loupeFacetAddressSelector),
      ],
      [
        "GET",
        `/v1/diamond-admin/queries/supports-interface?interfaceId=${encodeURIComponent("0x01ffc9a7")}`,
        { apiKey: "read-key" },
        await diamondLoupeFacet.supportsInterface("0x01ffc9a7"),
      ],
      [
        "POST",
        "/v1/diamond-admin/queries/get-operational-invariants",
        { apiKey: "read-key", body: {} },
        normalize(await upgradeControllerFacet.getOperationalInvariants()),
      ],
      [
        "POST",
        "/v1/diamond-admin/queries/get-upgrade-control-status",
        { apiKey: "read-key", body: {} },
        normalize(await upgradeControllerFacet.getUpgradeControlStatus()),
      ],
      [
        "POST",
        "/v1/diamond-admin/queries/get-upgrade-delay",
        { apiKey: "read-key", body: {} },
        normalize(await upgradeControllerFacet.getUpgradeDelay()),
      ],
      [
        "POST",
        "/v1/diamond-admin/queries/get-upgrade-threshold",
        { apiKey: "read-key", body: {} },
        normalize(await upgradeControllerFacet.getUpgradeThreshold()),
      ],
      [
        "POST",
        "/v1/diamond-admin/queries/is-upgrade-control-frozen",
        { apiKey: "read-key", body: {} },
        await upgradeControllerFacet.isUpgradeControlFrozen(),
      ],
      [
        "GET",
        `/v1/diamond-admin/queries/is-upgrade-signer?account=${encodeURIComponent(founderAddress)}`,
        { apiKey: "read-key" },
        await upgradeControllerFacet.isUpgradeSigner(founderAddress),
      ],
    ];

    for (const [method, path, options, expected] of diamondReadAssertions) {
      const response = await apiCall(port, method, path, options);
      expect(response.status).toBe(200);
      expect(response.payload).toEqual(expected);
    }

    const founderRoleResponse = await apiCall(port, "POST", "/v1/diamond-admin/queries/founder-role", {
      apiKey: "read-key",
      body: {},
    });
    expect(founderRoleResponse.status).toBe(200);
    expect(founderRoleResponse.payload).toBe(await diamondCutFacet.FOUNDER_ROLE());

    const facetAddressResponse = await apiCall(
      port,
      "GET",
      `/v1/diamond-admin/queries/facet-address?functionSelector=${encodeURIComponent(ownerOfSelector)}`,
      { apiKey: "read-key" },
    );
    expect(facetAddressResponse.status).toBe(200);
    expect(facetAddressResponse.payload).toBe(await diamondLoupeFacet.facetAddress(ownerOfSelector));

    const facetFunctionSelectorsResponse = await apiCall(
      port,
      "GET",
      `/v1/diamond-admin/queries/facet-function-selectors?facetAddr=${encodeURIComponent(ownerOfFacet)}`,
      { apiKey: "read-key" },
    );
    expect(facetFunctionSelectorsResponse.status).toBe(200);
    expect(facetFunctionSelectorsResponse.payload).toEqual(normalize(await diamondLoupeFacet.facetFunctionSelectors(ownerOfFacet)));

    const diamondFacetsResponse = await apiCall(port, "POST", "/v1/diamond-admin/queries/facets", {
      apiKey: "read-key",
      body: {},
    });
    expect(diamondFacetsResponse.status).toBe(200);
    const directFacets = await diamondLoupeFacet.facets();
    expect(Array.isArray(diamondFacetsResponse.payload)).toBe(true);
    expect((diamondFacetsResponse.payload as Array<unknown>).length).toBe(directFacets.length);

    const missingUpgradeResponse = await waitForStableApiResponse(
      () => apiCall(
        port,
        "GET",
        `/v1/diamond-admin/queries/get-upgrade?upgradeId=${encodeURIComponent(syntheticUpgradeId)}`,
        { apiKey: "read-key" },
      ),
      (response) => response.status === 500 && /OperationNotFound/u.test(JSON.stringify(response.payload)),
      "missing upgrade response",
    );
    expect(missingUpgradeResponse.status).toBe(500);
    expect(JSON.stringify(missingUpgradeResponse.payload)).toMatch(/OperationNotFound/u);

    const missingUpgradeApprovalResponse = await waitForStableApiResponse(
      () => apiCall(
        port,
        "GET",
        `/v1/diamond-admin/queries/is-upgrade-approved?upgradeId=${encodeURIComponent(syntheticUpgradeId)}&signer=${encodeURIComponent(founderAddress)}`,
        { apiKey: "read-key" },
      ),
      (response) => response.status === 500 && /OperationNotFound/u.test(JSON.stringify(response.payload)),
      "missing upgrade approval response",
    );
    expect(missingUpgradeApprovalResponse.status).toBe(500);
    expect(JSON.stringify(missingUpgradeApprovalResponse.payload)).toMatch(/OperationNotFound/u);

    const emergencyStateResponse = await apiCall(port, "POST", "/v1/emergency/queries/get-emergency-state", {
      apiKey: "read-key",
      body: {},
    });
    expect(emergencyStateResponse.status).toBe(200);
    expect(emergencyStateResponse.payload).toBe(normalize(await emergencyFacet.getEmergencyState()));

    const emergencyTimeoutResponse = await apiCall(port, "POST", "/v1/emergency/queries/get-emergency-timeout", {
      apiKey: "read-key",
      body: {},
    });
    expect(emergencyTimeoutResponse.status).toBe(200);
    expect(emergencyTimeoutResponse.payload).toBe(normalize(await emergencyFacet.getEmergencyTimeout()));

    const emergencyStoppedResponse = await apiCall(port, "POST", "/v1/emergency/queries/is-emergency-stopped", {
      apiKey: "read-key",
      body: {},
    });
    expect(emergencyStoppedResponse.status).toBe(200);
    expect(emergencyStoppedResponse.payload).toBe(await emergencyFacet.isEmergencyStopped());

    const frozenAssetResponse = await apiCall(port, "GET", "/v1/emergency/queries/is-asset-frozen?assetId=1", {
      apiKey: "read-key",
    });
    expect(frozenAssetResponse.status).toBe(200);
    expect(frozenAssetResponse.payload).toBe(await emergencyFacet.isAssetFrozen(1n));

    const whitelistReadResponse = await apiCall(
      port,
      "GET",
      `/v1/emergency/queries/is-recipient-whitelisted?recipient=${encodeURIComponent(founderAddress)}`,
      { apiKey: "read-key" },
    );
    expect(whitelistReadResponse.status).toBe(200);
    expect(whitelistReadResponse.payload).toBe(await emergencyWithdrawalFacet.isRecipientWhitelisted(founderAddress));

    const approvalCountResponse = await apiCall(
      port,
      "GET",
      `/v1/emergency/queries/get-approval-count?requestId=${encodeURIComponent(id(`emergency-withdrawal-${latestBlock}`))}`,
      { apiKey: "read-key" },
    );
    expect(approvalCountResponse.status).toBe(200);
    expect(approvalCountResponse.payload).toBe("0");

    const multisigReadAssertions: Array<readonly [string, string, unknown]> = [
      [
        "GET",
        `/v1/multisig/queries/can-execute-operation?operationId=${encodeURIComponent(syntheticOperationId)}`,
        normalize(await multisigFacet.canExecuteOperation(syntheticOperationId)),
      ],
      [
        "GET",
        `/v1/governance/queries/get-operation?id=${encodeURIComponent(syntheticOperationId)}`,
        timelockOperationToObject(await timelockFacet.getOperation(syntheticOperationId)),
      ],
      [
        "GET",
        `/v1/multisig/queries/get-operation-status?operationId=${encodeURIComponent(syntheticOperationId)}`,
        normalize(await multisigFacet.getOperationStatus(syntheticOperationId)),
      ],
      [
        "GET",
        `/v1/multisig/queries/has-approved-operation?operationId=${encodeURIComponent(syntheticOperationId)}&approver=${encodeURIComponent(founderAddress)}`,
        await multisigFacet.hasApprovedOperation(syntheticOperationId, founderAddress),
      ],
      [
        "GET",
        `/v1/multisig/queries/is-operator?account=${encodeURIComponent(founderAddress)}`,
        await multisigFacet.isOperator(founderAddress),
      ],
    ];

    for (const [method, path, expected] of multisigReadAssertions) {
      const response = await apiCall(port, method, path, { apiKey: "read-key" });
      expect(response.status).toBe(200);
      expect(response.payload).toEqual(expected);
    }

    const operationConfigResponse = await apiCall(
      port,
      "GET",
      `/v1/multisig/queries/get-operation-config?operationType=${encodeURIComponent(syntheticOperationType)}`,
      { apiKey: "read-key" },
    );
    expect(operationConfigResponse.status).toBe(200);
    expect(operationConfigResponse.payload).toEqual(
      multisigOperationConfigToObject(await multisigFacet.getOperationConfig(syntheticOperationType)),
    );

    const recentEventAssertions: Array<readonly [string, string, string]> = [
      ["diamond-admin", "/v1/diamond-admin/events/upgrade-proposed/query", upgradeControllerFacet.interface.getEvent("UpgradeProposed")!.topicHash],
      ["diamond-admin", "/v1/diamond-admin/events/upgrade-approved/query", upgradeControllerFacet.interface.getEvent("UpgradeApproved")!.topicHash],
      ["emergency", "/v1/emergency/events/incident-reported/query", emergencyFacet.interface.getEvent("IncidentReported")!.topicHash],
      ["emergency", "/v1/emergency/events/emergency-state-changed/query", emergencyFacet.interface.getEvent("EmergencyStateChanged")!.topicHash],
      ["multisig", "/v1/multisig/events/operation-proposed/query", multisigFacet.interface.getEvent("OperationProposed")!.topicHash],
      ["multisig", "/v1/multisig/events/operation-approved/query", multisigFacet.interface.getEvent("OperationApproved")!.topicHash],
    ];

    for (const [, path, topic] of recentEventAssertions) {
      const response = await apiCall(port, "POST", path, {
        apiKey: "read-key",
        body: {
          fromBlock: String(fromBlock),
          toBlock: String(latestBlock),
        },
      });
      expect(response.status).toBe(200);
      expect(Array.isArray(response.payload)).toBe(true);
      const directLogs = await provider.getLogs({
        address: diamondAddress,
        fromBlock,
        toBlock: latestBlock,
        topics: [topic],
      });
      expect((response.payload as Array<unknown>).length).toBe(directLogs.length);
      if (directLogs.length > 0) {
        const firstLog = response.payload as Array<Record<string, unknown>>;
        expect(firstLog.some((entry) => entry.transactionHash === directLogs[0]!.transactionHash)).toBe(true);
      }
    }

    const recentIncidentLogs = await provider.getLogs({
      address: diamondAddress,
      fromBlock,
      toBlock: latestBlock,
      topics: [emergencyFacet.interface.getEvent("IncidentReported")!.topicHash],
    });
    if (recentIncidentLogs.length > 0) {
      const parsedIncident = emergencyFacet.interface.parseLog(recentIncidentLogs[0]!);
      if (!parsedIncident) {
        throw new Error("failed to parse incident log");
      }
      const incidentId = String(parsedIncident.args.incidentId);
      const incidentReadResponse = await apiCall(
        port,
        "GET",
        `/v1/emergency/queries/get-incident?incidentId=${encodeURIComponent(incidentId)}`,
        { apiKey: "read-key" },
      );
      expect(incidentReadResponse.status).toBe(200);
      expect(incidentReadResponse.payload).toEqual(emergencyIncidentToObject(await emergencyFacet.getIncident(incidentId)));

      const recoveryPlanResponse = await apiCall(
        port,
        "GET",
        `/v1/emergency/queries/get-recovery-plan?incidentId=${encodeURIComponent(incidentId)}`,
        { apiKey: "read-key" },
      );
      expect(recoveryPlanResponse.status).toBe(200);
      expect(recoveryPlanResponse.payload).toEqual(normalize(await emergencyFacet.getRecoveryPlan(incidentId)));
    }
  }, 180_000);

  it("proves mounted control-plane admin writes on a local fork", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "control-plane admin write proof", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.00002") },
    ])) return;

    type AdminReadback = {
      getter: string;
      read: () => Promise<unknown>;
      expected: unknown;
    };
    const adminProofs: Array<{
      route: string;
      actor: string;
      status: number;
      methodKey?: string;
      txHash: string;
      receiptStatus: number;
      readback?: { getter: string; before: unknown; after: unknown; changed: boolean };
    }> = [];
    const submitAdminWrite = async (
      routePath: string,
      body: Record<string, unknown>,
      contract: Contract,
      expectedEvent?: string,
      readback?: AdminReadback,
      methodKey?: string,
    ) => {
      const before = readback ? normalize(await readback.read()) : undefined;
      const apiKey = adminProofs.length < 4
        ? "control-plane-proof-a-key"
        : "control-plane-proof-b-key";
      const response = await apiCall(port, "POST", routePath, {
        apiKey,
        body,
      });
      expect(response.status, `${routePath}: ${JSON.stringify(response.payload)}`).toBe(202);
      const txHash = extractTxHash(response.payload);
      await expectReceipt(txHash);
      const receipt = await provider.getTransactionReceipt(txHash);
      expect(receipt?.status, routePath).toBe(1);

      const eventNames = (receipt?.logs ?? []).flatMap((log) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed ? [parsed.name] : [];
        } catch {
          return [];
        }
      });
      if (expectedEvent) {
        expect(eventNames, routePath).toContain(expectedEvent);
      }
      const after = readback ? normalize(await readback.read()) : undefined;
      if (readback) {
        expect(after, readback.getter).toEqual(readback.expected);
      }
      adminProofs.push({
        route: `POST ${routePath}`,
        actor: apiKey,
        status: response.status,
        ...(methodKey ? { methodKey } : {}),
        txHash,
        receiptStatus: receipt!.status,
        readback: readback ? {
          getter: readback.getter,
          before,
          after,
          changed: !isDeepStrictEqual(before, after),
        } : undefined,
      });
      return { txHash, receipt: receipt!, eventNames };
    };

    const trustedInitContract = Wallet.createRandom().address;
    const trustedInitSelector = "0x12345678";
    const trustedInitCodehash = id(`control-plane-init-codehash-${Date.now()}`);

    await submitAdminWrite(
      "/v1/diamond-admin/admin/set-trusted-init-contract",
      { initContract: trustedInitContract, trusted: true },
      diamondCutFacet,
      "TrustedInitContractSet",
    );
    await submitAdminWrite(
      "/v1/diamond-admin/admin/set-trusted-init-selector",
      { initContract: trustedInitContract, selector: trustedInitSelector, trusted: true },
      diamondCutFacet,
      "TrustedInitSelectorSet",
      {
        getter: "isTrustedInitSelector",
        read: () => diamondCutFacet.isTrustedInitSelector(trustedInitContract, trustedInitSelector),
        expected: true,
      },
    );
    expect(await diamondCutFacet.isTrustedInitSelectorPolicyEnabled(trustedInitContract)).toBe(true);

    await submitAdminWrite(
      "/v1/diamond-admin/admin/set-trusted-init-codehash",
      { initContract: trustedInitContract, expectedCodehash: trustedInitCodehash },
      diamondCutFacet,
      "TrustedInitCodehashSet",
      {
        getter: "getTrustedInitCodehash",
        read: () => diamondCutFacet.getTrustedInitCodehash(trustedInitContract),
        expected: trustedInitCodehash,
      },
    );

    await submitAdminWrite(
      "/v1/emergency/admin/set-resume-delay",
      { newDelay: "1801" },
      emergencyFacet as unknown as Contract,
    );
    const nextEmergencyTimeout = await emergencyFacet.getEmergencyTimeout() === 7201n ? "7202" : "7201";
    await submitAdminWrite(
      "/v1/emergency/admin/set-emergency-timeout",
      { newTimeout: nextEmergencyTimeout },
      emergencyFacet as unknown as Contract,
      undefined,
      {
        getter: "getEmergencyTimeout",
        read: () => emergencyFacet.getEmergencyTimeout(),
        expected: nextEmergencyTimeout,
      },
    );

    const whitelistedRecipient = Wallet.createRandom().address;
    await submitAdminWrite(
      "/v1/emergency/admin/set-recipient-whitelist",
      { recipient: whitelistedRecipient, whitelisted: true },
      emergencyWithdrawalFacet,
      "RecipientWhitelisted",
      {
        getter: "isRecipientWhitelisted",
        read: () => emergencyWithdrawalFacet.isRecipientWhitelisted(whitelistedRecipient),
        expected: true,
      },
    );

    const withdrawalConfig = {
      delay: "3601",
      maxInstant: "1000001",
      requiredApprovals: "2",
      requiresEmergencyAdmin: true,
      daily24hLimit: "10000001",
    };
    const withdrawalConfigProof = await submitAdminWrite(
      "/v1/emergency/admin/update-withdrawal-config",
      withdrawalConfig,
      emergencyWithdrawalFacet,
      "WithdrawalConfigUpdated",
    );
    const configEvent = withdrawalConfigProof.receipt.logs
      .map((log) => {
        try {
          return emergencyWithdrawalFacet.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((event) => event?.name === "WithdrawalConfigUpdated");
    expect(configEvent?.args?.toArray()).toEqual([
      3601n,
      1000001n,
      2n,
      true,
      10000001n,
    ]);

    const timeLockRole = id("TIMELOCK_ROLE");
    if (!(await accessControl.hasRole(timeLockRole, founderAddress))) {
      const timeLockGrant = await apiCall(port, "POST", "/v1/access-control/admin/grant-role", {
        apiKey: "founder-key",
        body: { role: timeLockRole, account: founderAddress, expiryTime: "0" },
      });
      expect(timeLockGrant.status, JSON.stringify(timeLockGrant.payload)).toBe(202);
      await expectReceipt(extractTxHash(timeLockGrant.payload));
      expect(await accessControl.hasRole(timeLockRole, founderAddress)).toBe(true);
    }
    const recoveryRole = id(`API05_RECOVERY_ACTIVE_${Date.now()}`);
    const recoveryConfigBefore = await accessControl.getRoleConfig(recoveryRole);
    const originalRecoveryActive = Boolean(recoveryConfigBefore.recoveryActive);
    const temporaryRecoveryActive = !originalRecoveryActive;
    await submitAdminWrite(
      "/v1/access-control/admin/set-recovery-active",
      { role: recoveryRole, active: temporaryRecoveryActive },
      accessControl as unknown as Contract,
      undefined,
      {
        getter: "getRoleConfig.recoveryActive",
        read: async () => Boolean((await accessControl.getRoleConfig(recoveryRole)).recoveryActive),
        expected: temporaryRecoveryActive,
      },
      "AccessControlFacet.setRecoveryActive",
    );
    await submitAdminWrite(
      "/v1/access-control/admin/set-recovery-active",
      { role: recoveryRole, active: originalRecoveryActive },
      accessControl as unknown as Contract,
      undefined,
      {
        getter: "getRoleConfig.recoveryActive",
        read: async () => Boolean((await accessControl.getRoleConfig(recoveryRole)).recoveryActive),
        expected: originalRecoveryActive,
      },
      "AccessControlFacet.setRecoveryActive",
    );

    await submitAdminWrite(
      "/v1/diamond-admin/admin/set-upgrade-control-enforced",
      { enforced: true },
      upgradeControllerFacet,
      "UpgradeControlEnforcementSet",
      {
        getter: "getUpgradeControlStatus",
        read: async () => {
          const { initialized, enforced } = await upgradeControllerFacet.getUpgradeControlStatus();
          return { initialized, enforced };
        },
        expected: { initialized: true, enforced: true },
      },
    );

    const proofArtifactPath = process.env.API_LAYER_CONTROL_PLANE_PROOF_ARTIFACT;
    if (proofArtifactPath) {
      await writeFile(path.resolve(proofArtifactPath), `${JSON.stringify({
        generatedAt: new Date().toISOString(),
        summary: "proven working",
        reports: {
          "control-plane-admin-writes": {
            network: "local fork",
            routes: adminProofs.map((proof) => proof.route),
            actors: ["control-plane-proof-a-key", "control-plane-proof-b-key"],
            executionResult: "proven working",
            evidence: adminProofs,
            finalClassification: "proven working",
            classification: "proven working",
            result: "proven working",
          },
        },
      }, null, 2)}\n`);
    }
  }, 180_000);

  it("runs the transfer-rights workflow and persists ownership state", async (ctx) => {
    if (await skipWhenFundingBlocked(ctx, "transfer-rights workflow", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.000008") },
      { address: transfereeWallet.address, minimumWei: ethers.parseEther("0.000003") },
    ])) return;
    await ensureNativeBalance(founderAddress, ethers.parseEther("0.000008"));
    await ensureNativeBalance(transfereeWallet.address, ethers.parseEther("0.000003"));

    const createVoiceResponse = await apiCall(port, "POST", "/v1/voice-assets", {
      body: {
        ipfsHash: `QmTransferWorkflow${Date.now()}`,
        royaltyRate: "100",
      },
    });
    expect(createVoiceResponse.status).toBe(202);
    const createTxHash = extractTxHash(createVoiceResponse.payload);
    await expectReceipt(createTxHash);
    const voiceHash = String((createVoiceResponse.payload as Record<string, unknown>).result);
    const voiceVisibleResponse = await waitFor(
      () => apiCall(port, "GET", `/v1/voice-assets/${voiceHash}`, { apiKey: "read-key" }),
      (response) => response.status === 200,
      "workflow transfer voice visibility",
    );
    expect(voiceVisibleResponse.status).toBe(200);
    const tokenId = String(await voiceAsset.getTokenId(voiceHash));
    expect(await waitFor(
      () => voiceAsset.ownerOf(BigInt(tokenId)),
      (value) => value === founderAddress,
      "workflow transfer minted token visibility",
    )).toBe(founderAddress);

    await voiceAsset.connect(founderWallet).transferFromVoiceAsset.staticCall(founderAddress, transfereeWallet.address, BigInt(tokenId));

    const transferWorkflowResponse = await apiCall(port, "POST", "/v1/workflows/transfer-rights", {
      body: {
        from: founderAddress,
        to: transfereeWallet.address,
        tokenId,
        safe: false,
      },
    });
    expect(transferWorkflowResponse.status).toBe(202);
    expect(transferWorkflowResponse.payload).toEqual({
      transfer: {
        mode: "transfer",
        submission: expect.objectContaining({
          txHash: expect.stringMatching(/^0x[a-fA-F0-9]{64}$/u),
        }),
        txHash: expect.stringMatching(/^0x[a-fA-F0-9]{64}$/u),
        owner: transfereeWallet.address,
      },
      summary: {
        from: founderAddress,
        to: transfereeWallet.address,
        tokenId,
        safe: false,
        hasData: false,
      },
    });
    await expectReceipt(String(((transferWorkflowResponse.payload as Record<string, unknown>).transfer as Record<string, unknown>).txHash));
    expect(await waitFor(
      () => voiceAsset.ownerOf(BigInt(tokenId)),
      (value) => value === transfereeWallet.address,
      "workflow transfer owner update",
    )).toBe(transfereeWallet.address);
  }, 60_000);

  it("rejects create-dataset-and-list-for-sale when the caller is no longer the current asset owner", async (ctx) => {
    if (await skipWhenFundingBlocked(ctx, "create-dataset-and-list-for-sale ownership guard", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.00001") },
      { address: transfereeWallet.address, minimumWei: ethers.parseEther("0.000003") },
    ])) return;
    await ensureNativeBalance(founderAddress, ethers.parseEther("0.00001"));
    await ensureNativeBalance(transfereeWallet.address, ethers.parseEther("0.000003"));

    const createVoiceResponse = await apiCall(port, "POST", "/v1/voice-assets", {
      apiKey: "ownership-guard-key",
      body: {
        ipfsHash: `QmCommercializationOwnership${Date.now()}`,
        royaltyRate: "100",
      },
    });
    expect(createVoiceResponse.status).toBe(202);
    await expectReceipt(extractTxHash(createVoiceResponse.payload));
    const voiceHash = String((createVoiceResponse.payload as Record<string, unknown>).result);
    const tokenId = String(await waitFor(
      () => voiceAsset.getTokenId(voiceHash),
      (value) => value > 0n,
      "commercialization ownership token id",
    ));

    const transferResponse = await apiCall(port, "POST", `/v1/voice-assets/tokens/${encodeURIComponent(tokenId)}/transfers`, {
      apiKey: "ownership-guard-key",
      body: {
        from: founderAddress,
        to: transfereeWallet.address,
        tokenId,
      },
    });
    expect(transferResponse.status).toBe(202);
    await expectReceipt(extractTxHash(transferResponse.payload));
    expect(await waitFor(
      () => voiceAsset.ownerOf(BigInt(tokenId)),
      (value) => value === transfereeWallet.address,
      "commercialization ownership transfer",
    )).toBe(transfereeWallet.address);

    const rejectedWorkflowResponse = await apiCall(port, "POST", "/v1/workflows/create-dataset-and-list-for-sale", {
      apiKey: "ownership-guard-key",
      body: {
        title: `Ownership Guard ${Date.now()}`,
        assetIds: [tokenId],
        metadataURI: `ipfs://ownership-guard-${Date.now()}`,
        royaltyBps: "500",
        price: "1000",
        duration: "0",
      },
    });
    expect(rejectedWorkflowResponse.status).toBe(409);
    expect(rejectedWorkflowResponse.payload).toMatchObject({
      error: expect.stringContaining("commercialization requires current asset ownership"),
      diagnostics: {
        assetId: tokenId,
        actor: founderAddress,
      },
    });
    expect(String((rejectedWorkflowResponse.payload as Record<string, unknown>).diagnostics && ((rejectedWorkflowResponse.payload as Record<string, unknown>).diagnostics as Record<string, unknown>).owner).toLowerCase()).toBe(transfereeWallet.address.toLowerCase());
  }, 60_000);

  it("runs the onboard-rights-holder workflow and persists role plus voice authorization state", async (ctx) => {
    if (await skipWhenFundingBlocked(ctx, "onboard-rights-holder workflow", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.000008") },
    ])) return;
    await ensureNativeBalance(founderAddress, ethers.parseEther("0.000008"));
    const role = id("MARKETPLACE_PURCHASER_ROLE");
    const rightsHolder = outsiderWallet.address;
    const voiceResponse = await apiCall(port, "POST", "/v1/voice-assets", {
      apiKey: "onboard-proof-key",
      body: {
        ipfsHash: `QmOnboardWorkflow${Date.now()}`,
        royaltyRate: "125",
      },
    });
    expect(voiceResponse.status).toBe(202);
    const voiceHash = String((voiceResponse.payload as Record<string, unknown>).result);
    await expectReceipt(extractTxHash(voiceResponse.payload));

    const onboardResponse = await apiCall(port, "POST", "/v1/workflows/onboard-rights-holder", {
      apiKey: "onboard-proof-key",
      body: {
        role,
        account: rightsHolder,
        expiryTime: "0",
        voiceHashes: [voiceHash],
      },
    });
    expect(onboardResponse.status).toBe(202);
    const roleGrantTxHash = String(((onboardResponse.payload as Record<string, unknown>).roleGrant as Record<string, unknown>).txHash);
    const authorizationTxHash = String((((onboardResponse.payload as Record<string, unknown>).authorizations as Array<Record<string, unknown>>)[0] as Record<string, unknown>).txHash);
    const roleGrantReceipt = await expectReceipt(roleGrantTxHash);
    const authorizationReceipt = await expectReceipt(authorizationTxHash);

    expect(await waitFor(
      () => accessControl.hasRole(role, rightsHolder),
      (value) => value === true,
      "workflow onboard role grant",
    )).toBe(true);
    expect(await waitFor(
      () => voiceAsset.isAuthorized(voiceHash, rightsHolder),
      (value) => value === true,
      "workflow onboard voice authorization",
    )).toBe(true);

    const roleGrantEvents = await apiCall(port, "POST", "/v1/access-control/events/role-granted/query", {
      apiKey: "read-key",
      body: {
        fromBlock: String((roleGrantReceipt as { receipt?: { blockNumber?: number } }).receipt?.blockNumber ?? (await provider.getTransactionReceipt(roleGrantTxHash))!.blockNumber),
        toBlock: String((roleGrantReceipt as { receipt?: { blockNumber?: number } }).receipt?.blockNumber ?? (await provider.getTransactionReceipt(roleGrantTxHash))!.blockNumber),
      },
    });
    expect(roleGrantEvents.status).toBe(200);
    expect((roleGrantEvents.payload as Array<Record<string, unknown>>).some((log) => log.transactionHash === roleGrantTxHash)).toBe(true);

    const authorizationEvents = await apiCall(port, "POST", "/v1/voice-assets/events/user-authorization-changed/query", {
      apiKey: "read-key",
      body: {
        fromBlock: String((authorizationReceipt as { receipt?: { blockNumber?: number } }).receipt?.blockNumber ?? (await provider.getTransactionReceipt(authorizationTxHash))!.blockNumber),
        toBlock: String((authorizationReceipt as { receipt?: { blockNumber?: number } }).receipt?.blockNumber ?? (await provider.getTransactionReceipt(authorizationTxHash))!.blockNumber),
      },
    });
    expect(authorizationEvents.status).toBe(200);
    expect((authorizationEvents.payload as Array<Record<string, unknown>>).some((log) => log.transactionHash === authorizationTxHash)).toBe(true);

    const revokeAuthorizationResponse = await apiCall(
      port,
      "DELETE",
      `/v1/voice-assets/${voiceHash}/authorization-grants/${encodeURIComponent(rightsHolder)}`,
      { apiKey: "onboard-proof-key" },
    );
    expect(revokeAuthorizationResponse.status).toBe(202);
    await expectReceipt(extractTxHash(revokeAuthorizationResponse.payload));

    const revokeRoleResponse = await apiCall(port, "DELETE", "/v1/access-control/commands/revoke-role", {
      apiKey: "onboard-proof-key",
      body: {
        role,
        account: rightsHolder,
        reason: "workflow cleanup",
      },
    });
    expect(revokeRoleResponse.status).toBe(202);
    await expectReceipt(extractTxHash(revokeRoleResponse.payload));
  }, 90_000);

  it("runs the register-whisper-block workflow and persists whisperblock state when given contract-valid fingerprint data", async (ctx) => {
    if (await skipWhenFundingBlocked(ctx, "register-whisper-block workflow", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.00001") },
    ])) return;
    await ensureNativeBalance(founderAddress, ethers.parseEther("0.00001"));
    const voiceResponse = await apiCall(port, "POST", "/v1/voice-assets", {
      apiKey: "whisper-workflow-voice-key",
      body: {
        ipfsHash: `QmWhisperWorkflow${Date.now()}`,
        royaltyRate: "125",
      },
    });
    expect(voiceResponse.status).toBe(202);
    const voiceHash = String((voiceResponse.payload as Record<string, unknown>).result);
    await expectReceipt(extractTxHash(voiceResponse.payload));
    const voiceVisibilityResponse = await waitFor(
      () => apiCall(port, "GET", `/v1/voice-assets/${voiceHash}`, { apiKey: "read-key" }),
      (response) => response.status === 200,
      "workflow whisper voice visibility",
    );
    expect(voiceVisibilityResponse.status).toBe(200);

    const fingerprintData = ethers.concat([
      ethers.zeroPadValue("0x1111", 32),
      ethers.zeroPadValue("0x2222", 32),
      ethers.zeroPadValue("0x3333", 32),
    ]);

    const workflowResponse = await waitForStableApiResponse(
      () => apiCall(port, "POST", "/v1/workflows/register-whisper-block", {
        apiKey: "whisper-workflow-key",
        body: {
          voiceHash,
          structuredFingerprintData: fingerprintData,
          grant: {
            user: outsiderWallet.address,
            duration: "3600",
          },
          generateEncryptionKey: true,
        },
      }),
      (response) => response.status === 202,
      "register whisper block workflow response",
    );
    expect(workflowResponse.status).toBe(202);
    expect(workflowResponse.payload).toEqual({
      fingerprint: {
        submission: expect.objectContaining({
          txHash: expect.stringMatching(/^0x[a-fA-F0-9]{64}$/u),
        }),
        txHash: expect.stringMatching(/^0x[a-fA-F0-9]{64}$/u),
        authenticityVerified: true,
        eventCount: expect.any(Number),
      },
      encryptionKey: {
        submission: expect.objectContaining({
          txHash: expect.stringMatching(/^0x[a-fA-F0-9]{64}$/u),
        }),
        txHash: expect.stringMatching(/^0x[a-fA-F0-9]{64}$/u),
        eventCount: expect.any(Number),
      },
      accessGrant: {
        submission: expect.objectContaining({
          txHash: expect.stringMatching(/^0x[a-fA-F0-9]{64}$/u),
        }),
        txHash: expect.stringMatching(/^0x[a-fA-F0-9]{64}$/u),
        eventCount: expect.any(Number),
        grant: {
          user: outsiderWallet.address,
          duration: "3600",
        },
      },
      summary: {
        voiceHash,
        generateEncryptionKey: true,
        grantedUser: outsiderWallet.address,
        grantedDuration: "3600",
      },
    });
    const fingerprintTxHash = String((((workflowResponse.payload as Record<string, unknown>).fingerprint) as Record<string, unknown>).txHash);
    const keyTxHash = String((((workflowResponse.payload as Record<string, unknown>).encryptionKey) as Record<string, unknown>).txHash);
    const accessGrantTxHash = String((((workflowResponse.payload as Record<string, unknown>).accessGrant) as Record<string, unknown>).txHash);
    await expectReceipt(fingerprintTxHash);
    await expectReceipt(keyTxHash);
    await expectReceipt(accessGrantTxHash);

    expect(await waitFor(
      () => whisperBlockFacet.verifyVoiceAuthenticity(voiceHash, fingerprintData),
      (value) => value === true,
      "workflow whisper fingerprint verification",
    )).toBe(true);

    const fingerprintReceipt = await provider.getTransactionReceipt(fingerprintTxHash);
    const fingerprintEvents = await waitForStableApiResponse(
      () => apiCall(port, "POST", "/v1/whisperblock/events/voice-fingerprint-updated/query", {
        apiKey: "read-key",
        body: {
          fromBlock: String(fingerprintReceipt!.blockNumber),
          toBlock: String(fingerprintReceipt!.blockNumber),
        },
      }),
      (response) => response.status === 200,
      "whisper fingerprint events",
    );
    expect(fingerprintEvents.status).toBe(200);
    expect((fingerprintEvents.payload as Array<Record<string, unknown>>).some((log) => log.transactionHash === fingerprintTxHash)).toBe(true);

    const keyReceipt = await provider.getTransactionReceipt(keyTxHash);
    const keyEvents = await waitForStableApiResponse(
      () => apiCall(port, "POST", "/v1/whisperblock/events/key-rotated/query", {
        apiKey: "read-key",
        body: {
          fromBlock: String(keyReceipt!.blockNumber),
          toBlock: String(keyReceipt!.blockNumber),
        },
      }),
      (response) => response.status === 200,
      "whisper key events",
    );
    expect(keyEvents.status).toBe(200);
    expect((keyEvents.payload as Array<Record<string, unknown>>).some((log) => log.transactionHash === keyTxHash)).toBe(true);

    const accessReceipt = await provider.getTransactionReceipt(accessGrantTxHash);
    const accessEvents = await waitForStableApiResponse(
      () => apiCall(port, "POST", "/v1/whisperblock/events/access-granted/query", {
        apiKey: "read-key",
        body: {
          fromBlock: String(accessReceipt!.blockNumber),
          toBlock: String(accessReceipt!.blockNumber),
        },
      }),
      (response) => response.status === 200,
      "whisper access events",
    );
    expect(accessEvents.status).toBe(200);
    expect((accessEvents.payload as Array<Record<string, unknown>>).some((log) => log.transactionHash === accessGrantTxHash)).toBe(true);
  }, 120_000);

  it("runs the remaining workflows with live lifecycle-correct setup and preserves real contract failures", async (ctx) => {
    if (await skipWhenFundingBlocked(ctx, "remaining workflow lifecycle proof", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.000012") },
    ])) return;
    await ensureNativeBalance(founderAddress, ethers.parseEther("0.000012"));
    const createVoice = async (suffix: string) => {
      const response = await waitFor(
        () => apiCall(port, "POST", "/v1/voice-assets", {
          body: {
            ipfsHash: `QmWorkflowDataset${suffix}${Date.now()}`,
            royaltyRate: "100",
          },
        }),
        (entry) => entry.status === 202,
        `workflow create voice ${suffix}`,
      );
      expect(response.status, `POST /v1/voice-assets: ${JSON.stringify(response.payload)}`).toBe(202);
      await expectReceipt(extractTxHash(response.payload));
      const voiceHash = String((response.payload as Record<string, unknown>).result);
      const voiceVisibleResponse = await waitFor(
        () => apiCall(port, "GET", `/v1/voice-assets/${voiceHash}`, { apiKey: "read-key" }),
        (entry) => entry.status === 200,
        `workflow dataset voice visibility ${suffix}`,
      );
      expect(voiceVisibleResponse.status).toBe(200);
      const tokenId = String(await voiceAsset.getTokenId(voiceHash));
      await waitFor(
        () => voiceAsset.ownerOf(BigInt(tokenId)),
        (value) => value === founderAddress,
        `workflow dataset asset visibility ${suffix}`,
      );
      return tokenId;
    };



    const datasetsBefore = normalize(await voiceDataset.getDatasetsByCreator(founderAddress)) as string[];
    const datasetStartBlock = await provider.getBlockNumber();

    const workflowAsset1 = await createVoice("A");
    const workflowAsset2 = await createVoice("B");
    const createDatasetWorkflow = await waitForStableApiResponse(
      () => apiCall(port, "POST", "/v1/workflows/create-dataset-and-list-for-sale", {
        body: {
          title: `Workflow Dataset ${Date.now()}`,
          assetIds: [workflowAsset1, workflowAsset2],
          metadataURI: `ipfs://workflow-dataset-${Date.now()}`,
          royaltyBps: "500",
          price: "1000",
          duration: "0",
        },
      }),
      (response) => response.status === 202,
      "create dataset workflow response",
    );
    expect(createDatasetWorkflow.status).toBe(202);
    expect(createDatasetWorkflow.payload).toMatchObject({
      licenseTemplate: {
        source: expect.any(String),
        templateId: expect.any(String),
        templateHash: expect.stringMatching(/^0x[a-fA-F0-9]{64}$/u),
        created: expect.any(Boolean),
        template: expect.anything(),
      },
      dataset: {
        submission: expect.objectContaining({
          txHash: expect.stringMatching(/^0x[a-fA-F0-9]{64}$/u),
        }),
        txHash: expect.stringMatching(/^0x[a-fA-F0-9]{64}$/u),
        datasetId: expect.any(String),
        read: expect.anything(),
      },
      ownership: {
        owner: founderAddress,
        approval: {
          approvedForAll: true,
        },
      },
      listing: {
        submission: expect.objectContaining({
          txHash: expect.stringMatching(/^0x[a-fA-F0-9]{64}$/u),
        }),
        txHash: expect.stringMatching(/^0x[a-fA-F0-9]{64}$/u),
        read: expect.anything(),
        listingState: {
          isActive: true,
          datasetActive: true,
        },
        tradeReadiness: "listed-and-tradable",
      },
      summary: {
        signerAddress: founderAddress,
        datasetId: expect.any(String),
        listingActive: true,
        datasetActive: true,
        tradeReadiness: "listed-and-tradable",
      },
    });
    const datasetOwnershipApproval = (((createDatasetWorkflow.payload as Record<string, unknown>).ownership as Record<string, unknown>).approval as Record<string, unknown>);
    expect(
      datasetOwnershipApproval.submission === null ||
      (typeof datasetOwnershipApproval.submission === "object" && datasetOwnershipApproval.submission !== null),
    ).toBe(true);
    expect(
      datasetOwnershipApproval.txHash === null ||
      /^0x[a-fA-F0-9]{64}$/u.test(String(datasetOwnershipApproval.txHash)),
    ).toBe(true);
    await expectReceipt(String(((createDatasetWorkflow.payload as Record<string, unknown>).dataset as Record<string, unknown>).txHash));

    const datasetsAfter = await waitFor(
      async () => normalize(await voiceDataset.getDatasetsByCreator(founderAddress)) as string[],
      (value) => value.length > datasetsBefore.length,
      "workflow dataset create",
    );
    const createdDatasetId = datasetsAfter.find((entry) => !datasetsBefore.includes(entry));
    expect(createdDatasetId).toBeTruthy();
    const createdDatasetResponse = await apiCall(
      port,
      "GET",
      `/v1/datasets/queries/get-dataset?datasetId=${encodeURIComponent(String(createdDatasetId))}`,
      { apiKey: "read-key" },
    );
    expect(createdDatasetResponse.status).toBe(200);
    const listingResponse = await apiCall(
      port,
      "GET",
      `/v1/marketplace/queries/get-listing?tokenId=${encodeURIComponent(String(createdDatasetId))}`,
      { apiKey: "read-key" },
    );
    expect(listingResponse.status).toBe(200);
    expect((listingResponse.payload as Record<string, unknown>).isActive).toBe(true);
    expect((((createDatasetWorkflow.payload as Record<string, unknown>).listing as Record<string, unknown>).tradeReadiness)).toBe("listed-and-tradable");
    expect((((createDatasetWorkflow.payload as Record<string, unknown>).licenseTemplate as Record<string, unknown>).templateId)).toEqual(expect.any(String));

    const datasetWorkflowPayload = createDatasetWorkflow.payload as Record<string, unknown>;
    const datasetWorkflowWrite = (datasetWorkflowPayload.dataset as Record<string, unknown>).submission as Record<string, unknown>;
    const datasetWorkflowReceipt = await provider.getTransactionReceipt(extractTxHash(datasetWorkflowWrite));
    const datasetCreatedEvents = await apiCall(port, "POST", "/v1/datasets/events/dataset-created/query", {
      apiKey: "read-key",
      body: {
        fromBlock: String(datasetWorkflowReceipt!.blockNumber),
        toBlock: String(datasetWorkflowReceipt!.blockNumber),
      },
    });
    expect(datasetCreatedEvents.status).toBe(200);
    expect(Array.isArray(datasetCreatedEvents.payload)).toBe(true);
    expect((datasetCreatedEvents.payload as Array<Record<string, unknown>>).length).toBeGreaterThan(0);

    const stakeAmount = 1n;
    const stakingStatsBefore = await stakingFacet.getStakingStats();
    const stakeEconomicsBefore = {
      staker: await tokenSupplyFacet.tokenBalanceOf(founderAddress),
      custody: await tokenSupplyFacet.tokenBalanceOf(diamondAddress),
      allowance: await tokenSupplyFacet.tokenAllowance(founderAddress, diamondAddress),
      totalSupply: await tokenSupplyFacet.totalSupply(),
      totalStaked: BigInt(stakingStatsBefore.totalStaked),
      totalRewardsDistributed: BigInt(stakingStatsBefore.totalRewardsDistributed),
    };
    const stakeWorkflowResponse = await apiCall(port, "POST", "/v1/workflows/stake-and-delegate", {
      body: {
        amount: stakeAmount.toString(),
        delegatee: licenseeWallet.address,
      },
    });
    if (stakeWorkflowResponse.status === 500) {
      expect(JSON.stringify(stakeWorkflowResponse.payload)).toMatch(/Panic|OVERFLOW|delegate/u);
      const stakingStatsAfter = await stakingFacet.getStakingStats();
      assertNoEconomicSideEffects("stakeAndDelegate.failedDelegationPreflight", stakeEconomicsBefore, {
        staker: await tokenSupplyFacet.tokenBalanceOf(founderAddress),
        custody: await tokenSupplyFacet.tokenBalanceOf(diamondAddress),
        allowance: await tokenSupplyFacet.tokenAllowance(founderAddress, diamondAddress),
        totalSupply: await tokenSupplyFacet.totalSupply(),
        totalStaked: BigInt(stakingStatsAfter.totalStaked),
        totalRewardsDistributed: BigInt(stakingStatsAfter.totalRewardsDistributed),
      });
    } else {
      expect(stakeWorkflowResponse.status).toBe(202);
      expect(stakeWorkflowResponse.payload).toEqual({
        approval: {
          submission: expect.anything(),
          txHash: expect.anything(),
          spender: diamondAddress,
          allowanceBefore: expect.any(String),
          allowanceAfter: expect.any(String),
          source: expect.any(String),
        },
        stake: {
          submission: expect.objectContaining({
            txHash: expect.stringMatching(/^0x[a-fA-F0-9]{64}$/u),
          }),
          txHash: expect.stringMatching(/^0x[a-fA-F0-9]{64}$/u),
          stakeInfoBefore: expect.anything(),
          stakeInfoAfter: expect.anything(),
          eventCount: expect.any(Number),
        },
        delegation: {
          submission: expect.objectContaining({
            txHash: expect.stringMatching(/^0x[a-fA-F0-9]{64}$/u),
          }),
          txHash: expect.stringMatching(/^0x[a-fA-F0-9]{64}$/u),
          delegateBefore: expect.anything(),
          delegateAfter: licenseeWallet.address,
          currentVotes: expect.anything(),
          eventCount: expect.any(Number),
        },
        summary: {
          staker: founderAddress,
          delegatee: licenseeWallet.address,
          amount: "1",
        },
      });
      await expectReceipt(String(((stakeWorkflowResponse.payload as Record<string, unknown>).stake as Record<string, unknown>).txHash));
      await expectReceipt(String(((stakeWorkflowResponse.payload as Record<string, unknown>).delegation as Record<string, unknown>).txHash));

      const stakingStatsAfter = await stakingFacet.getStakingStats();
      const stakeEconomicsAfter = {
        staker: await tokenSupplyFacet.tokenBalanceOf(founderAddress),
        custody: await tokenSupplyFacet.tokenBalanceOf(diamondAddress),
        totalSupply: await tokenSupplyFacet.totalSupply(),
        totalStaked: BigInt(stakingStatsAfter.totalStaked),
        totalRewardsDistributed: BigInt(stakingStatsAfter.totalRewardsDistributed),
      };
      const stakerDelta = assertExactAmountDelta(
        "stakeAndDelegate.stakerBalance",
        stakeEconomicsBefore.staker,
        stakeEconomicsAfter.staker,
        stakeEconomicsAfter.totalRewardsDistributed - stakeEconomicsBefore.totalRewardsDistributed - stakeAmount,
      );
      const custodyDelta = assertExactAmountDelta(
        "stakeAndDelegate.custodyBalance",
        stakeEconomicsBefore.custody,
        stakeEconomicsAfter.custody,
        stakeAmount - (stakeEconomicsAfter.totalRewardsDistributed - stakeEconomicsBefore.totalRewardsDistributed),
      );
      assertConservedDeltas("stakeAndDelegate.custodyConservation", [stakerDelta.delta, custodyDelta.delta]);
      assertExactAmountDelta(
        "stakeAndDelegate.totalSupply",
        stakeEconomicsBefore.totalSupply,
        stakeEconomicsAfter.totalSupply,
        0n,
      );
      assertExactAmountDelta(
        "stakeAndDelegate.totalStaked",
        stakeEconomicsBefore.totalStaked,
        stakeEconomicsAfter.totalStaked,
        stakeAmount,
      );
    }

    const proposalCalldata = governorFacet.interface.encodeFunctionData("updateVotingDelay", [6000n]);
    const proposalWorkflowResponse = await apiCall(port, "POST", "/v1/workflows/submit-proposal", {
      body: {
        description: "workflow governance proof",
        targets: [diamondAddress],
        values: ["0"],
        calldatas: [proposalCalldata],
        proposalType: "0",
      },
    });
    expect(proposalWorkflowResponse.status).toBe(202);
    expect(proposalWorkflowResponse.payload).toEqual({
      proposal: {
        submission: expect.objectContaining({
          txHash: expect.stringMatching(/^0x[a-fA-F0-9]{64}$/u),
        }),
        txHash: expect.stringMatching(/^0x[a-fA-F0-9]{64}$/u),
        proposalId: expect.any(String),
        eventCount: expect.any(Number),
      },
      readback: {
        snapshot: expect.any(String),
        proposalState: expect.any(String),
        deadline: expect.any(String),
      },
      votingWindow: {
        earliestVotingBlock: expect.any(String),
        proposalDeadlineBlock: expect.any(String),
        currentBlock: expect.any(String),
        latestBlockTimestamp: expect.any(String),
        estimatedVotingStartTimestamp: expect.any(String),
      },
      summary: {
        proposalId: expect.any(String),
        proposalType: "0",
        targetCount: 1,
        calldataCount: 1,
      },
    });
  }, 120_000);

  it("proves usage, lock, approval, and both safe-transfer write paths for a disposable voice asset", async (ctx) => {
    if (await skipWhenFundingBlocked(ctx, "voice asset receipt expansion", [
      { address: licensingOwnerAddress, minimumWei: ethers.parseEther("0.00002") },
      { address: founderAddress, minimumWei: ethers.parseEther("0.00002") },
      { address: transfereeWallet.address, minimumWei: ethers.parseEther("0.00002") },
    ])) {
      return;
    }

    const submit = async (
      apiKey: string,
      method: string,
      route: string,
      body: Record<string, unknown> = {},
    ) => {
      const response = await apiCall(port, method, route, { apiKey, body });
      expect(response.status, `${method} ${route}: ${JSON.stringify(response.payload)}`).toBe(202);
      const txHash = extractTxHash(response.payload);
      await expectReceipt(txHash);
      return txHash;
    };

    const createResponse = await apiCall(port, "POST", "/v1/voice-assets", {
      apiKey: "licensing-owner-key",
      body: {
        ipfsHash: `QmIndexerVoiceLifecycle${Date.now()}-${Math.random().toString(16).slice(2)}`,
        royaltyRate: "225",
      },
    });
    expect(createResponse.status).toBe(202);
    const voiceHash = String((createResponse.payload as Record<string, unknown>).result);
    await expectReceipt(extractTxHash(createResponse.payload));
    const tokenId = await waitFor(
      () => voiceAsset.getTokenId(voiceHash),
      (value) => value > 0n,
      "voice asset token for receipt expansion",
    );
    expect(await voiceAsset.ownerOf(tokenId)).toBe(licensingOwnerAddress);

    const royaltyManagerRole = id("ROYALTY_MANAGER_ROLE");
    const royaltyRoleWasGranted = await accessControl.hasRole(royaltyManagerRole, licensingOwnerAddress);
    if (!royaltyRoleWasGranted) {
      const grantRole = await apiCall(port, "POST", "/v1/access-control/admin/grant-role", {
        apiKey: "founder-key",
        body: { role: royaltyManagerRole, account: licensingOwnerAddress, expiryTime: "0" },
      });
      expect(grantRole.status, JSON.stringify(grantRole.payload)).toBe(202);
      await expectReceipt(extractTxHash(grantRole.payload));
      expect(await accessControl.hasRole(royaltyManagerRole, licensingOwnerAddress)).toBe(true);
    }
    const royaltyAmount = 250n;
    const royaltyUsageReference = id("api05-royalty-" + voiceHash + "-" + Date.now());
    try {
      const royaltyResponse = await apiCall(port, "POST", "/v1/voice-assets/" + voiceHash + "/royalty-payments", {
        apiKey: "licensing-owner-key",
        body: { amount: royaltyAmount.toString(), usageReference: royaltyUsageReference },
      });
      expect(royaltyResponse.status, JSON.stringify(royaltyResponse.payload)).toBe(202);
      const royaltyTxHash = extractTxHash(royaltyResponse.payload);
      await expectReceipt(royaltyTxHash);
      const royaltyReceipt = await provider.getTransactionReceipt(royaltyTxHash);
      expect(royaltyReceipt?.status).toBe(1);
      expect(royaltyReceipt!.logs.some((log) => {
        try {
          const parsed = voiceAsset.interface.parseLog(log);
          return parsed?.name === "RoyaltyPaid"
            && parsed.args.voiceHash === voiceHash
            && parsed.args.user === licensingOwnerAddress
            && parsed.args.amount === royaltyAmount
            && parsed.args.usageReference === royaltyUsageReference;
        } catch { return false; }
      })).toBe(true);
      const royaltyHistory = await voiceAsset.getRoyaltyHistory(voiceHash);
      const recordedRoyalty = royaltyHistory.at(-1);
      expect(recordedRoyalty).toBeDefined();
      expect(recordedRoyalty![0]).toBe(royaltyAmount);
      expect(recordedRoyalty![2]).toBe(licensingOwnerAddress);
      expect(recordedRoyalty![3]).toBe(royaltyUsageReference);
    } finally {
      if (!royaltyRoleWasGranted) {
        const revokeRole = await apiCall(port, "DELETE", "/v1/access-control/commands/revoke-role", {
          apiKey: "founder-key",
          body: {
            role: royaltyManagerRole,
            account: licensingOwnerAddress,
            reason: "local-fork royalty receipt proof cleanup",
          },
        });
        expect(revokeRole.status, JSON.stringify(revokeRole.payload)).toBe(202);
        await expectReceipt(extractTxHash(revokeRole.payload));
        expect(await accessControl.hasRole(royaltyManagerRole, licensingOwnerAddress)).toBe(false);
      }
    }

    const rightsFacet = new Contract(diamondAddress, facetRegistry.RightsFacet.abi, provider);
    const collaborator = transfereeWallet.address;
    const collaboratorShare = 1_250n;
    const collaboratorAddTxHash = await submit(
      "licensing-owner-key",
      "POST",
      "/v1/licensing/commands/add-collaborator",
      { voiceHash, collaborator, share: collaboratorShare.toString() },
    );
    const collaboratorAdded = await rightsFacet.getCollaborator(voiceHash, collaborator);
    expect(collaboratorAdded[0]).toBe(true);
    expect(collaboratorAdded[1]).toBe(collaboratorShare);
    const collaboratorAddReceipt = await provider.getTransactionReceipt(collaboratorAddTxHash);
    expect(collaboratorAddReceipt).not.toBeNull();
    expect(collaboratorAddReceipt!.logs.some((log) => {
      try { return rightsFacet.interface.parseLog(log)?.name === "CollaboratorUpdated"; } catch { return false; }
    })).toBe(true);

    const updatedCollaboratorShare = 1_750n;
    const collaboratorUpdateTxHash = await submit(
      "licensing-owner-key",
      "PATCH",
      "/v1/licensing/commands/update-collaborator-share",
      { voiceHash, collaborator, newShare: updatedCollaboratorShare.toString() },
    );
    expect(await rightsFacet.getCollaborator(voiceHash, collaborator)).toEqual([true, updatedCollaboratorShare]);
    const collaboratorUpdateReceipt = await provider.getTransactionReceipt(collaboratorUpdateTxHash);
    expect(collaboratorUpdateReceipt).not.toBeNull();
    expect(collaboratorUpdateReceipt!.logs.some((log) => {
      try {
        const parsed = rightsFacet.interface.parseLog(log);
        return parsed?.name === "CollaboratorUpdated" && parsed.args.share === updatedCollaboratorShare;
      } catch { return false; }
    })).toBe(true);

    const collaboratorRemoveTxHash = await submit(
      "licensing-owner-key",
      "DELETE",
      "/v1/licensing/commands/remove-collaborator",
      { voiceHash, collaborator },
    );
    expect(await rightsFacet.getCollaborator(voiceHash, collaborator)).toEqual([false, 0n]);
    const collaboratorRemoveReceipt = await provider.getTransactionReceipt(collaboratorRemoveTxHash);
    expect(collaboratorRemoveReceipt).not.toBeNull();
    expect(collaboratorRemoveReceipt!.logs.some((log) => {
      try {
        const parsed = rightsFacet.interface.parseLog(log);
        return parsed?.name === "CollaboratorUpdated" && parsed.args.share === 0n && parsed.args.isActive === false;
      } catch { return false; }
    })).toBe(true);

    const rightsBlock = await provider.getBlock("latest");
    expect(rightsBlock).not.toBeNull();
    const usageRight = {
      rightType: "Animation",
      startTime: String(rightsBlock!.timestamp),
      endTime: String(rightsBlock!.timestamp + 3_600),
      transferable: true,
      restrictions: ["no-sublicense"],
      revocable: true,
    };
    const groupName = `receipt-rights-group-${Date.now()}`;
    const groupCreateTxHash = await submit(
      "licensing-owner-key",
      "POST",
      "/v1/licensing/rights/create-rights-group",
      { voiceHash, name: groupName, rights: [usageRight], members: [outsiderWallet.address] },
    );
    const rightsGroup = await rightsFacet.getRightsGroup(voiceHash, 0);
    expect(rightsGroup.name).toBe(groupName);
    expect(rightsGroup.rights).toHaveLength(1);
    expect(rightsGroup.rights[0].rightType).toBe(usageRight.rightType);
    expect(rightsGroup.members).toEqual([outsiderWallet.address]);
    const groupReceipt = await provider.getTransactionReceipt(groupCreateTxHash);
    expect(groupReceipt).not.toBeNull();
    expect(groupReceipt!.logs.some((log) => {
      try { return rightsFacet.interface.parseLog(log)?.name === "RightsGroupCreated"; } catch { return false; }
    })).toBe(true);

    const rightGrantTxHash = await submit(
      "licensing-owner-key",
      "POST",
      "/v1/licensing/commands/grant-right",
      { voiceHash, grantee: outsiderWallet.address, right: usageRight },
    );
    const grantedRights = await rightsFacet.getUserRights(voiceHash, outsiderWallet.address);
    expect(grantedRights).toHaveLength(1);
    expect(grantedRights[0].rightType).toBe(usageRight.rightType);
    const rightGrantReceipt = await provider.getTransactionReceipt(rightGrantTxHash);
    expect(rightGrantReceipt).not.toBeNull();
    expect(rightGrantReceipt!.logs.some((log) => {
      try { return rightsFacet.interface.parseLog(log)?.name === "RightGranted"; } catch { return false; }
    })).toBe(true);

    const rightRevokeTxHash = await submit(
      "licensing-owner-key",
      "DELETE",
      "/v1/licensing/commands/revoke-right",
      { voiceHash, holder: outsiderWallet.address, rightType: usageRight.rightType },
    );
    expect(await rightsFacet.getUserRights(voiceHash, outsiderWallet.address)).toHaveLength(0);
    const rightRevokeReceipt = await provider.getTransactionReceipt(rightRevokeTxHash);
    expect(rightRevokeReceipt).not.toBeNull();
    expect(rightRevokeReceipt!.logs.some((log) => {
      try { return rightsFacet.interface.parseLog(log)?.name === "RightRevoked"; } catch { return false; }
    })).toBe(true);

    const voiceAdminRole = id("VOICE_ADMIN_ROLE");
    const voiceAdminWasGranted = await accessControl.hasRole(voiceAdminRole, founderAddress);
    if (!voiceAdminWasGranted) {
      await submit("founder-key", "POST", "/v1/access-control/admin/grant-role", {
        role: voiceAdminRole,
        account: founderAddress,
        expiryTime: "0",
      });
      expect(await accessControl.hasRole(voiceAdminRole, founderAddress)).toBe(true);
    }
    const enforcementContract = await paymentFacet.getUsdcToken();
    const rightRegistrationTxHash = await submit(
      "founder-key",
      "POST",
      "/v1/licensing/rights/register-right-contract",
      { category: "Animation", contractAddress: enforcementContract },
    );
    const registeredReceipt = await provider.getTransactionReceipt(rightRegistrationTxHash);
    expect(registeredReceipt).not.toBeNull();
    const registeredEvent = registeredReceipt!.logs.flatMap((log) => {
      try {
        const parsed = rightsFacet.interface.parseLog(log);
        return parsed?.name === "RightContractRegistered" ? [parsed] : [];
      } catch { return []; }
    })[0];
    expect(registeredEvent).toBeDefined();
    const rightId = String((await rightsFacet.getCategoryContracts("Animation")).at(-1));
    expect(rightId).toMatch(/^Animation-\d{5}$/);
    expect(await rightsFacet.getCategoryContracts("Animation")).toContain(rightId);
    expect(await rightsFacet.getRightContract(rightId)).toBe(enforcementContract);

    const updatedEnforcementContract = diamondAddress;
    const rightUpdateTxHash = await submit(
      "founder-key",
      "PATCH",
      "/v1/licensing/commands/update-right-contract",
      { rightId, newContractAddress: updatedEnforcementContract },
    );
    expect(await rightsFacet.getRightContract(rightId)).toBe(updatedEnforcementContract);
    const rightUpdateReceipt = await provider.getTransactionReceipt(rightUpdateTxHash);
    expect(rightUpdateReceipt).not.toBeNull();
    expect(rightUpdateReceipt!.logs.some((log) => {
      try { return rightsFacet.interface.parseLog(log)?.name === "RightContractUpdated"; } catch { return false; }
    })).toBe(true);
    if (!voiceAdminWasGranted) {
      const revokeVoiceAdmin = await apiCall(port, "DELETE", "/v1/access-control/commands/revoke-role", {
        apiKey: "founder-key",
        body: { role: voiceAdminRole, account: founderAddress, reason: "local-fork rights proof cleanup" },
      });
      expect(revokeVoiceAdmin.status, JSON.stringify(revokeVoiceAdmin.payload)).toBe(202);
      await expectReceipt(extractTxHash(revokeVoiceAdmin.payload));
      expect(await accessControl.hasRole(voiceAdminRole, founderAddress)).toBe(false);
    }

    const usageRef = id(`indexer-voice-usage-${voiceHash}-${Date.now()}`);
    await submit(
      "licensing-owner-key",
      "POST",
      `/v1/voice-assets/${encodeURIComponent(voiceHash)}/usage-records`,
      { usageRef },
    );
    expect((await voiceAsset.getVoiceAsset(voiceHash))[4]).toBe(1n);

    await submit(
      "licensing-owner-key",
      "POST",
      `/v1/voice-assets/${encodeURIComponent(voiceHash)}/lock`,
    );
    expect((await voiceAsset.getVoiceAsset(voiceHash))[3]).toBe(true);

    await submit(
      "licensing-owner-key",
      "POST",
      `/v1/voice-assets/${encodeURIComponent(voiceHash)}/unlock`,
    );
    expect((await voiceAsset.getVoiceAsset(voiceHash))[3]).toBe(false);

    await submit("licensing-owner-key", "POST", "/v1/voice-assets/commands/approve-voice-asset", {
      to: transfereeWallet.address,
      tokenId: tokenId.toString(),
    });
    expect(await voiceAsset.getApproved(tokenId)).toBe(transfereeWallet.address);

    await submit(
      "transferee-key",
      "POST",
      `/v1/voice-assets/tokens/${tokenId.toString()}/transfers/safe`,
      { from: licensingOwnerAddress, to: transfereeWallet.address },
    );
    expect(await voiceAsset.ownerOf(tokenId)).toBe(transfereeWallet.address);

    await submit(
      "transferee-key",
      "POST",
      `/v1/voice-assets/tokens/${tokenId.toString()}/transfers/safe-with-data`,
      { from: transfereeWallet.address, to: licensingOwnerAddress, data: "0x1234" },
    );
    expect(await voiceAsset.ownerOf(tokenId)).toBe(licensingOwnerAddress);
  }, 180_000);

  it("proves classification and geographic metadata receipts", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "voice metadata receipt expansion", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.00003") },
    ])) {
      return;
    }

    const submit = async (method: string, route: string, body: Record<string, unknown>) => {
      const response = await apiCall(port, method, route, { body });
      expect(response.status, JSON.stringify(response.payload)).toBe(202);
      const txHash = extractTxHash(response.payload);
      await expectReceipt(txHash);
      return response.payload as Record<string, unknown>;
    };
    const proofId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const voiceRegistration = await submit("POST", "/v1/voice-assets", {
      ipfsHash: `QmIndexerMetadata${proofId}`,
      royaltyRate: "175",
    });
    const metadataVoiceHash = String(voiceRegistration.result);
    expect(metadataVoiceHash).toEqual(expect.stringMatching(/^0x[a-fA-F0-9]{64}$/u));

    const category = `indexer-${proofId}`;
    const initialClassification = {
      name: `initial-${proofId}`,
      score: "925",
      category,
      level: "high",
      metadata: JSON.stringify({ proof: "complete" }),
    };
    const latestBlock = await provider.getBlock("latest");
    const classifications = {
      analysisVersion: `indexer-proof-${proofId}`,
      timestamp: String(latestBlock?.timestamp ?? Math.floor(Date.now() / 1000)),
      processingTimeMs: "37",
      componentsRun: ["classification-proof"],
      categories: [category],
    };
    await submit("PATCH", "/v1/voice-assets/commands/update-voice-classifications", {
      voiceHash: metadataVoiceHash,
      classifications,
      categoryData: [{ category, classifications: [initialClassification] }],
    });
    const storedClassifications = await voiceMetadata.getVoiceClassifications(metadataVoiceHash);
    expect(voiceClassificationsToObject(storedClassifications)).toEqual(classifications);

    const replacementClassification = {
      name: `replacement-${proofId}`,
      score: "975",
      category,
      level: "high",
      metadata: JSON.stringify({ proof: "category" }),
    };
    await submit("PATCH", "/v1/voice-assets/commands/update-classification-category", {
      voiceHash: metadataVoiceHash,
      category,
      classifications: [replacementClassification],
    });
    expect(await voiceMetadata.searchVoicesByClassification(
      replacementClassification.name,
      category,
      replacementClassification.level,
      900n,
    )).toContain(metadataVoiceHash);

    const geographic = {
      latitude: "41881300",
      longitude: "-87629700",
      region: "Midwest",
      country: "US",
      locality: `Chicago-${proofId.slice(-8)}`,
    };
    await submit("PATCH", "/v1/voice-assets/commands/update-geographic-data", {
      voiceHash: metadataVoiceHash,
      geographic,
    });
    expect(geographicDataToObject(await voiceMetadata.getGeographicData(metadataVoiceHash))).toEqual(geographic);

    const analysisVersion = `indexer-analysis-${proofId}`;
    const analysisVersionResponse = await apiCall(
      port,
      "PATCH",
      "/v1/voice-assets/commands/set-analysis-version",
      { body: { version: analysisVersion } },
    );
    expect(analysisVersionResponse.status, JSON.stringify(analysisVersionResponse.payload)).toBe(202);
    const analysisVersionTxHash = extractTxHash(analysisVersionResponse.payload);
    await expectReceipt(analysisVersionTxHash);
    const analysisVersionReceipt = await provider.getTransactionReceipt(analysisVersionTxHash);
    expect(analysisVersionReceipt).not.toBeNull();
    const analysisVersionEvent = analysisVersionReceipt!.logs
      .map((log) => {
        try {
          return voiceMetadata.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((log) => log?.name === "AnalysisVersionUpdated");
    expect(analysisVersionEvent?.args[1]).toBe(analysisVersion);
  }, 180_000);

  it("proves reversible marketplace, voice, and dataset configuration writes through HTTP", async (ctx) => {
    if (await skipWhenFundingBlocked(ctx, "reversible configuration writes", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.0001") },
    ])) {
      return;
    }

    const submit = async (method: string, route: string, body: Record<string, unknown> = {}) => {
      const response = await apiCall(port, method, route, { body });
      expect(response.status).toBe(202);
      const txHash = extractTxHash(response.payload);
      await expectReceipt(txHash);
      return txHash;
    };

    const originalRoyaltyRate = await voiceAsset.getDefaultRoyaltyRate();
    const targetRoyaltyRate = originalRoyaltyRate === 10_000n ? 9_999n : originalRoyaltyRate + 1n;
    await submit("PATCH", "/v1/voice-assets/commands/set-default-royalty-rate", {
      rate: targetRoyaltyRate.toString(),
    });
    expect(await voiceAsset.getDefaultRoyaltyRate()).toBe(targetRoyaltyRate);
    await submit("PATCH", "/v1/voice-assets/commands/set-default-royalty-rate", {
      rate: originalRoyaltyRate.toString(),
    });
    expect(await voiceAsset.getDefaultRoyaltyRate()).toBe(originalRoyaltyRate);

    const originalPlatformFee = await voiceAsset.getDefaultPlatformFee();
    const targetPlatformFee = originalPlatformFee === 10_000n ? 9_999n : originalPlatformFee + 1n;
    await submit("PATCH", "/v1/voice-assets/commands/set-default-platform-fee", {
      fee: targetPlatformFee.toString(),
    });
    expect(await voiceAsset.getDefaultPlatformFee()).toBe(targetPlatformFee);
    await submit("PATCH", "/v1/voice-assets/commands/set-default-platform-fee", {
      fee: originalPlatformFee.toString(),
    });
    expect(await voiceAsset.getDefaultPlatformFee()).toBe(originalPlatformFee);

    const registrationWasPaused = await voiceAsset.isRegistrationPaused();
    await submit("PATCH", "/v1/voice-assets/commands/set-registration-paused", {
      paused: !registrationWasPaused,
    });
    expect(await voiceAsset.isRegistrationPaused()).toBe(!registrationWasPaused);
    await submit("PATCH", "/v1/voice-assets/commands/set-registration-paused", {
      paused: registrationWasPaused,
    });
    expect(await voiceAsset.isRegistrationPaused()).toBe(registrationWasPaused);

    const originalMaxAssets = await voiceDataset.getMaxAssetsPerDataset();
    const targetMaxAssets = originalMaxAssets === 1n ? 2n : originalMaxAssets - 1n;
    await submit("PATCH", "/v1/datasets/commands/set-max-assets-per-dataset", {
      maxAssets: targetMaxAssets.toString(),
    });
    expect(await voiceDataset.getMaxAssetsPerDataset()).toBe(targetMaxAssets);
    await submit("PATCH", "/v1/datasets/commands/set-max-assets-per-dataset", {
      maxAssets: originalMaxAssets.toString(),
    });
    expect(await voiceDataset.getMaxAssetsPerDataset()).toBe(originalMaxAssets);

    const marketplaceWasPaused = await marketplaceFacet.isPaused();
    const firstMarketplaceRoute = marketplaceWasPaused ? "unpause" : "pause";
    const secondMarketplaceRoute = marketplaceWasPaused ? "pause" : "unpause";
    await submit("POST", `/v1/marketplace/commands/${firstMarketplaceRoute}`);
    expect(await marketplaceFacet.isPaused()).toBe(!marketplaceWasPaused);
    await submit("POST", `/v1/marketplace/commands/${secondMarketplaceRoute}`);
    expect(await marketplaceFacet.isPaused()).toBe(marketplaceWasPaused);
  }, 120_000);

  it("proves reversible payment configuration receipts through HTTP", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "payment configuration receipt expansion", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.0002") },
    ])) {
      return;
    }

    const feeManagerRole = id("FEE_MANAGER_ROLE");
    const governanceRole = id("GOVERNANCE_ROLE");
    const emergencyAdminRole = id("EMERGENCY_ADMIN_ROLE");
    expect(await accessControl.hasRole(feeManagerRole, founderAddress)).toBe(true);
    expect(await accessControl.hasRole(governanceRole, founderAddress)).toBe(true);
    expect(await accessControl.hasRole(emergencyAdminRole, founderAddress)).toBe(true);

    const submit = async (method: string, route: string, body: Record<string, unknown>) => {
      const response = await apiCall(port, method, route, { apiKey: "payment-proof-key", body });
      expect(response.status, JSON.stringify(response.payload)).toBe(202);
      const txHash = extractTxHash(response.payload);
      await expectReceipt(txHash);
      return txHash;
    };

    const originalPaymentPaused = await paymentFacet.paymentPaused();
    await submit("PATCH", "/v1/marketplace/commands/set-payment-paused", {
      paused: !originalPaymentPaused,
    });
    expect(await paymentFacet.paymentPaused()).toBe(!originalPaymentPaused);
    await submit("PATCH", "/v1/marketplace/commands/set-payment-paused", {
      paused: originalPaymentPaused,
    });
    expect(await paymentFacet.paymentPaused()).toBe(originalPaymentPaused);

    const originalBuybackStatus = await paymentFacet.getBuybackStatus();
    const originalBuybackPaused = Boolean(originalBuybackStatus[9]);
    await submit("POST", "/v1/marketplace/commands/pause-buybacks", {
      paused: !originalBuybackPaused,
    });
    expect(Boolean((await paymentFacet.getBuybackStatus())[9])).toBe(!originalBuybackPaused);
    await submit("POST", "/v1/marketplace/commands/pause-buybacks", {
      paused: originalBuybackPaused,
    });
    expect(Boolean((await paymentFacet.getBuybackStatus())[9])).toBe(originalBuybackPaused);

    const originalTreasury = await paymentFacet.getTreasuryAddress();
    await submit("PATCH", "/v1/marketplace/commands/update-treasury-address", {
      newTreasury: outsiderWallet.address,
    });
    expect(await paymentFacet.getTreasuryAddress()).toBe(outsiderWallet.address);
    await submit("PATCH", "/v1/marketplace/commands/update-treasury-address", {
      newTreasury: originalTreasury,
    });
    expect(await paymentFacet.getTreasuryAddress()).toBe(originalTreasury);

    const originalDevFund = await paymentFacet.getDevFundAddress();
    await submit("PATCH", "/v1/marketplace/commands/update-dev-fund-address", {
      newDevFund: licenseeWallet.address,
    });
    expect(await paymentFacet.getDevFundAddress()).toBe(licenseeWallet.address);
    await submit("PATCH", "/v1/marketplace/commands/update-dev-fund-address", {
      newDevFund: originalDevFund,
    });
    expect(await paymentFacet.getDevFundAddress()).toBe(originalDevFund);

    const originalUnionTreasury = await paymentFacet.getUnionTreasuryAddress();
    await submit("PATCH", "/v1/marketplace/commands/update-union-treasury-address", {
      newUnionTreasury: transfereeWallet.address,
    });
    expect(await paymentFacet.getUnionTreasuryAddress()).toBe(transfereeWallet.address);
    await submit("PATCH", "/v1/marketplace/commands/update-union-treasury-address", {
      newUnionTreasury: originalUnionTreasury,
    });
    expect(await paymentFacet.getUnionTreasuryAddress()).toBe(originalUnionTreasury);

    const originalFeeConfig = await paymentFacet.getFeeConfiguration();
    const temporaryFeeConfig = {
      platformFee: "200",
      referralFee: "0",
      unionShare: "100",
      devFund: "50",
      timewaveGift: "50",
      milestonePool: "0",
    };
    await submit("PATCH", "/v1/marketplace/commands/update-fee-configuration", temporaryFeeConfig);
    expect(feeConfigToObject(await paymentFacet.getFeeConfiguration())).toEqual({
      platformFee: "200",
      unionShare: "100",
      devFund: "50",
      timewaveGift: "50",
      referralFee: "0",
      milestonePool: "0",
    });
    await submit("PATCH", "/v1/marketplace/commands/update-fee-configuration", {
      platformFee: originalFeeConfig[0].toString(),
      referralFee: originalFeeConfig[4].toString(),
      unionShare: originalFeeConfig[1].toString(),
      devFund: originalFeeConfig[2].toString(),
      timewaveGift: originalFeeConfig[3].toString(),
      milestonePool: originalFeeConfig[5].toString(),
    });
    expect(feeConfigToObject(await paymentFacet.getFeeConfiguration())).toEqual(feeConfigToObject(originalFeeConfig));

    const originalWithdrawalLimit = await paymentFacet.getTreasuryWithdrawalLimit();
    await submit("PATCH", "/v1/marketplace/commands/set-treasury-withdrawal-limit", {
      limit: "1234567",
      window: "7200",
      cooldown: "300",
    });
    const temporaryWithdrawalLimit = await paymentFacet.getTreasuryWithdrawalLimit();
    expect(temporaryWithdrawalLimit[0]).toBe(1_234_567n);
    expect(temporaryWithdrawalLimit[1]).toBe(7_200n);
    expect(temporaryWithdrawalLimit[2]).toBe(300n);
    await submit("PATCH", "/v1/marketplace/commands/set-treasury-withdrawal-limit", {
      limit: originalWithdrawalLimit[0].toString(),
      window: originalWithdrawalLimit[1].toString(),
      cooldown: originalWithdrawalLimit[2].toString(),
    });
    const restoredWithdrawalLimit = await paymentFacet.getTreasuryWithdrawalLimit();
    expect(restoredWithdrawalLimit[0]).toBe(originalWithdrawalLimit[0]);
    expect(restoredWithdrawalLimit[1]).toBe(originalWithdrawalLimit[1]);
    expect(restoredWithdrawalLimit[2]).toBe(originalWithdrawalLimit[2]);
  }, 180_000);

  it("proves voting-power setup, lock, and checkpoint receipts through HTTP", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "voting-power receipt expansion", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.0001") },
      { address: outsiderWallet.address, minimumWei: ethers.parseEther("0.000003") },
    ])) {
      return;
    }

    const submit = async (route: string, body: Record<string, unknown>) => {
      const response = await apiCall(port, "PATCH", route, { body });
      expect(response.status, JSON.stringify(response.payload)).toBe(202);
      const txHash = extractTxHash(response.payload);
      await expectReceipt(txHash);
      const receipt = await provider.getTransactionReceipt(txHash);
      expect(receipt).not.toBeNull();
      const eventNames = receipt!.logs.flatMap((log) => {
        try {
          return [votingPowerFacet.interface.parseLog(log)?.name].filter((name): name is string => Boolean(name));
        } catch {
          return [];
        }
      });
      return { txHash, eventNames };
    };

    const setupAccount = outsiderWallet.address;
    const fundedAccount = founderAddress;

    const initial = await submit("/v1/staking/commands/setup-initial-voting-power", {
      account: setupAccount,
      votingPower: "777",
    });
    expect(initial.eventNames).toContain("VotingPowerUpdated");
    expect(await votingPowerFacet.getVotingPower(setupAccount)).toBe(777n);

    const maxLock = await submit("/v1/staking/commands/set-max-lock-duration", {
      maxDuration: "7200",
    });
    expect(maxLock.eventNames).toContain("MaxLockDurationUpdated");

    const locked = await submit("/v1/staking/commands/update-lock-duration", {
      account: fundedAccount,
      duration: "3600",
    });
    expect(locked.eventNames).toEqual(expect.arrayContaining(["LockDurationUpdated", "VotingPowerUpdated"]));
    expect(await votingPowerFacet.getLockDuration(fundedAccount)).toBe(3600n);

    const unlocked = await submit("/v1/staking/commands/set-zero-lock-duration", {
      account: fundedAccount,
    });
    expect(unlocked.eventNames).toEqual(expect.arrayContaining(["LockDurationUpdated", "VotingPowerUpdated"]));
    expect(await votingPowerFacet.getLockDuration(fundedAccount)).toBe(0n);

    const refreshed = await submit("/v1/staking/commands/update-voting-power", {
      account: fundedAccount,
    });
    expect(refreshed.eventNames).toContain("VotingPowerUpdated");
    expect(await votingPowerFacet.getVotingPower(fundedAccount)).toBeGreaterThan(0n);

    const batch = await submit("/v1/staking/commands/update-voting-power-batch", {
      accounts: [fundedAccount],
    });
    expect(batch.eventNames.filter((name) => name === "VotingPowerUpdated")).toHaveLength(1);
    expect(await votingPowerFacet.getVotingPower(fundedAccount)).toBeGreaterThan(0n);

    const delegateVotesBefore = await delegationFacet.getCurrentVotes(transfereeWallet.address);
    const delegateResponse = await apiCall(port, "POST", "/v1/staking/commands/delegate", {
      apiKey: "delegation-proof-key",
      body: { delegatee: transfereeWallet.address },
    });
    expect(delegateResponse.status, JSON.stringify(delegateResponse.payload)).toBe(202);
    const delegateTxHash = extractTxHash(delegateResponse.payload);
    await expectReceipt(delegateTxHash);
    const delegateReceipt = await provider.getTransactionReceipt(delegateTxHash);
    expect(delegateReceipt).not.toBeNull();
    const delegationEventNames = delegateReceipt!.logs.flatMap((log) => {
      try {
        return [delegationFacet.interface.parseLog(log)?.name].filter((name): name is string => Boolean(name));
      } catch {
        return [];
      }
    });
    expect(delegationEventNames).toEqual(expect.arrayContaining(["DelegateChanged", "VotingPowerUpdated"]));
    expect(await delegationFacet.delegates(outsiderWallet.address)).toBe(transfereeWallet.address);
    expect(await delegationFacet.getCurrentVotes(transfereeWallet.address)).toBeGreaterThan(delegateVotesBefore);

    const multiplierRole = id(`INDEXER_ROLE_MULTIPLIER_${Date.now()}_${Math.random().toString(16).slice(2)}`);
    const founderRole = id("FOUNDER_ROLE");
    const configureRoleResponse = await apiCall(port, "POST", "/v1/access-control/admin/configure-role", {
      body: {
        role: multiplierRole,
        config: {
          memberLimit: "1",
          validityPeriod: "0",
          minMemberLimit: "0",
          quorumBps: "0",
          absoluteMinQuorum: "0",
          adminRole: founderRole,
          restricted: false,
          revocable: true,
          requiresApproval: false,
          recoveryActive: false,
        },
      },
    });
    expect(configureRoleResponse.status, JSON.stringify(configureRoleResponse.payload)).toBe(202);
    await expectReceipt(extractTxHash(configureRoleResponse.payload));
    const grantRoleResponse = await apiCall(port, "POST", "/v1/access-control/admin/grant-role", {
      body: { role: multiplierRole, account: outsiderWallet.address, expiryTime: "0" },
    });
    expect(grantRoleResponse.status, JSON.stringify(grantRoleResponse.payload)).toBe(202);
    await expectReceipt(extractTxHash(grantRoleResponse.payload));

    const multiplier = "17777";
    const multiplierResponse = await apiCall(port, "PATCH", "/v1/staking/commands/set-role-multiplier", {
      body: { role: multiplierRole, multiplier },
    });
    expect(multiplierResponse.status, JSON.stringify(multiplierResponse.payload)).toBe(202);
    const multiplierTxHash = extractTxHash(multiplierResponse.payload);
    await expectReceipt(multiplierTxHash);
    const multiplierReceipt = await provider.getTransactionReceipt(multiplierTxHash);
    expect(multiplierReceipt).not.toBeNull();
    expect(multiplierReceipt!.logs.some((log) => {
      try {
        return votingPowerFacet.interface.parseLog(log)?.name === "RoleMultiplierUpdated";
      } catch {
        return false;
      }
    })).toBe(true);
    expect(await votingPowerFacet.calculateBaseRoleMultiplier(outsiderWallet.address)).toBe(BigInt(multiplier));
  }, 120_000);

  it("proves disposable access-control configuration, eventless globals, and self-renunciation receipts", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "access-control receipt expansion", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.00005") },
      { address: licenseeWallet.address, minimumWei: ethers.parseEther("0.00001") },
    ])) {
      return;
    }

    const submit = async (
      apiKey: string,
      method: string,
      route: string,
      body: Record<string, unknown>,
    ) => {
      const response = await apiCall(port, method, route, { apiKey, body });
      expect(response.status, JSON.stringify(response.payload)).toBe(202);
      const txHash = extractTxHash(response.payload);
      await expectReceipt(txHash);
      return txHash;
    };

    const proofRole = id(`INDEXER_RECEIPT_ROLE_${Date.now()}_${Math.random().toString(16).slice(2)}`);
    const founderRole = id("FOUNDER_ROLE");
    const ownerRole = id("OWNER_ROLE");
    const roleConfig = {
      memberLimit: "2",
      validityPeriod: "0",
      minMemberLimit: "0",
      quorumBps: "0",
      absoluteMinQuorum: "0",
      adminRole: founderRole,
      restricted: false,
      revocable: true,
      requiresApproval: false,
      recoveryActive: false,
    };

    const configureTxHash = await submit(
      "access-receipt-a-key",
      "POST",
      "/v1/access-control/admin/configure-role",
      { role: proofRole, config: roleConfig },
    );
    expect(roleConfigToObject(await accessControl.getRoleConfig(proofRole))).toEqual(roleConfig);

    const configureReceipt = await provider.getTransactionReceipt(configureTxHash);
    expect(configureReceipt).not.toBeNull();
    expect(configureReceipt!.logs.some((log) => {
      try {
        return accessControl.interface.parseLog(log)?.name === "RoleConfigUpdated";
      } catch {
        return false;
      }
    })).toBe(true);

    const defaultValidityTxHash = await submit(
      "access-receipt-a-key",
      "POST",
      "/v1/access-control/admin/set-default-validity-period",
      { period: "86400" },
    );
    const defaultValidityReceipt = await provider.getTransactionReceipt(defaultValidityTxHash);
    expect(defaultValidityReceipt).not.toBeNull();
    expect(defaultValidityReceipt!.logs).toHaveLength(0);

    const minValidationsTxHash = await submit(
      "access-receipt-b-key",
      "POST",
      "/v1/access-control/admin/set-min-validations",
      { validations: "1" },
    );
    const minValidationsReceipt = await provider.getTransactionReceipt(minValidationsTxHash);
    expect(minValidationsReceipt).not.toBeNull();
    expect(minValidationsReceipt!.logs).toHaveLength(0);

    await submit(
      "access-receipt-b-key",
      "POST",
      "/v1/access-control/admin/set-role-admin",
      { role: proofRole, adminRole: ownerRole },
    );
    expect(await accessControl.getRoleAdmin(proofRole)).toBe(ownerRole);

    await submit(
      "access-receipt-c-key",
      "POST",
      "/v1/access-control/admin/set-role-admin",
      { role: proofRole, adminRole: founderRole },
    );
    expect(await accessControl.getRoleAdmin(proofRole)).toBe(founderRole);

    await submit(
      "access-receipt-c-key",
      "POST",
      "/v1/access-control/admin/grant-role",
      { role: proofRole, account: licenseeWallet.address, expiryTime: "0" },
    );
    expect(await accessControl.hasRole(proofRole, licenseeWallet.address)).toBe(true);

    const renounceTxHash = await submit(
      "licensee-key",
      "DELETE",
      "/v1/access-control/commands/renounce-role",
      { role: proofRole },
    );
    expect(await accessControl.hasRole(proofRole, licenseeWallet.address)).toBe(false);

    const renounceReceipt = await provider.getTransactionReceipt(renounceTxHash);
    expect(renounceReceipt).not.toBeNull();
    expect(renounceReceipt!.logs.some((log) => {
      try {
        return accessControl.interface.parseLog(log)?.name === "RoleRenounced";
      } catch {
        return false;
      }
    })).toBe(true);
  }, 120_000);

  it("proves the emergency incident, containment, scheduled-resume, and immediate-resume receipts", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "emergency receipt expansion", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.00008") },
    ])) {
      return;
    }

    expect(await emergencyFacet.getEmergencyState()).toBe(0n);
    const latestBlock = await provider.getBlock("latest");
    expect(latestBlock).not.toBeNull();
    const emergencyTimeout = await emergencyFacet.getEmergencyTimeout();
    const resumeAfter = BigInt(latestBlock!.timestamp) + 120n;
    const pausedUntil = BigInt(latestBlock!.timestamp) + emergencyTimeout + 3_600n;
    const assetId = BigInt(Date.now() % 1_000_000_000) + 1_000_000_000n;

    const workflowResponse = await apiCall(port, "POST", "/v1/workflows/trigger-emergency", {
      apiKey: "emergency-proof-key",
      body: {
        emergency: {
          useEmergencyStop: false,
          state: "PAUSED",
          reason: "local-fork indexer containment proof",
        },
        incident: {
          report: {
            incidentType: "SYSTEM_FAILURE",
            description: "local-fork indexer incident proof",
          },
          responseActions: ["PAUSE_TRADING"],
        },
        freezeAssets: {
          assetIds: [assetId.toString()],
          reason: "local-fork indexer asset-freeze proof",
        },
        pauseControl: {
          extendPausedUntil: pausedUntil.toString(),
          scheduleResumeAfter: resumeAfter.toString(),
        },
      },
    });
    expect(workflowResponse.status, JSON.stringify(workflowResponse.payload)).toBe(202);
    const workflow = workflowResponse.payload as Record<string, unknown>;
    const incident = workflow.incident as Record<string, unknown>;
    const report = incident.report as Record<string, unknown>;
    const emergency = workflow.emergency as Record<string, unknown>;
    const transition = emergency.transition as Record<string, unknown>;
    const response = workflow.response as Record<string, unknown>;
    const assetFreeze = workflow.assetFreeze as Record<string, unknown>;
    const pauseControl = workflow.pauseControl as Record<string, unknown>;
    const extendPause = pauseControl.extendPause as Record<string, unknown>;
    const scheduleResume = pauseControl.scheduleResume as Record<string, unknown>;

    const expectedWorkflowEvents = [
      [report.txHash, "IncidentReported"],
      [transition.txHash, "EmergencyStateChanged"],
      [response.txHash, "ResponseExecuted"],
      [assetFreeze.txHash, "AssetsFrozen"],
      [extendPause.txHash, "PauseExtended"],
      [scheduleResume.txHash, "EmergencyResumeScheduled"],
    ] as const;
    for (const [candidate, eventName] of expectedWorkflowEvents) {
      const txHash = String(candidate);
      await expectReceipt(txHash);
      const receipt = await provider.getTransactionReceipt(txHash);
      expect(receipt).not.toBeNull();
      expect(receipt!.logs.some((log) => {
        try {
          return emergencyFacet.interface.parseLog(log)?.name === eventName;
        } catch {
          return false;
        }
      })).toBe(true);
    }
    expect(await emergencyFacet.getEmergencyState()).toBe(1n);
    expect(await emergencyFacet.isAssetFrozen(assetId)).toBe(true);
    expect(emergencyIncidentToObject(await emergencyFacet.getIncident(String(report.incidentId)))).toMatchObject({
      id: String(report.incidentId),
      resolved: false,
    });

    const afterWorkflowBlock = await provider.getBlock("latest");
    expect(afterWorkflowBlock).not.toBeNull();
    const secondsToResume = resumeAfter >= BigInt(afterWorkflowBlock!.timestamp)
      ? resumeAfter - BigInt(afterWorkflowBlock!.timestamp) + 1n
      : 1n;
    await provider.send("evm_increaseTime", [Number(secondsToResume)]);
    await provider.send("evm_mine", []);

    const submit = async (route: string, body: Record<string, unknown> = {}) => {
      const result = await apiCall(port, "POST", route, { apiKey: "emergency-proof-key", body });
      expect(result.status, JSON.stringify(result.payload)).toBe(202);
      const txHash = extractTxHash(result.payload);
      await expectReceipt(txHash);
      return txHash;
    };

    const scheduledResumeTxHash = await submit("/v1/emergency/admin/execute-scheduled-resume");
    const scheduledResumeReceipt = await provider.getTransactionReceipt(scheduledResumeTxHash);
    expect(scheduledResumeReceipt).not.toBeNull();
    expect(scheduledResumeReceipt!.logs.flatMap((log) => {
      try {
        return [emergencyFacet.interface.parseLog(log)?.name];
      } catch {
        return [];
      }
    })).toEqual(expect.arrayContaining(["EmergencyStateChanged", "EmergencyResumeExecuted"]));
    expect(await emergencyFacet.getEmergencyState()).toBe(0n);

    const unfreezeWorkflowResponse = await apiCall(port, "POST", "/v1/workflows/recover-from-emergency", {
      apiKey: "emergency-proof-key",
      body: {
        incidentId: String(report.incidentId),
        unfreezeAssets: { assetIds: [assetId.toString()] },
      },
    });
    expect(unfreezeWorkflowResponse.status, JSON.stringify(unfreezeWorkflowResponse.payload)).toBe(202);
    const unfreezeWorkflow = unfreezeWorkflowResponse.payload as Record<string, unknown>;
    const assetUnfreeze = unfreezeWorkflow.assetUnfreeze as Record<string, unknown>;
    const unfreezeTxHash = String(assetUnfreeze.txHash);
    await expectReceipt(unfreezeTxHash);
    const unfreezeReceipt = await provider.getTransactionReceipt(unfreezeTxHash);
    expect(unfreezeReceipt).not.toBeNull();
    expect(unfreezeReceipt!.logs).toHaveLength(0);
    expect(await emergencyFacet.isAssetFrozen(assetId)).toBe(false);

    const stopTxHash = await submit("/v1/emergency/admin/emergency-stop");
    const stopReceipt = await provider.getTransactionReceipt(stopTxHash);
    expect(stopReceipt).not.toBeNull();
    expect(stopReceipt!.logs.some((log) => {
      try {
        return emergencyFacet.interface.parseLog(log)?.name === "EmergencyStateChanged";
      } catch {
        return false;
      }
    })).toBe(true);
    expect(await emergencyFacet.getEmergencyState()).toBe(1n);

    const immediateResumeTxHash = await submit("/v1/emergency/admin/emergency-resume");
    const immediateResumeReceipt = await provider.getTransactionReceipt(immediateResumeTxHash);
    expect(immediateResumeReceipt).not.toBeNull();
    expect(immediateResumeReceipt!.logs.some((log) => {
      try {
        return emergencyFacet.interface.parseLog(log)?.name === "EmergencyStateChanged";
      } catch {
        return false;
      }
    })).toBe(true);
    expect(await emergencyFacet.getEmergencyState()).toBe(0n);
  }, 180_000);

  it("proves signed delegation and permissionless delegated-power refreshes through HTTP", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "delegation receipt expansion", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.0001") },
      { address: outsiderWallet.address, minimumWei: ethers.parseEther("0.000006") },
      { address: licenseeWallet.address, minimumWei: ethers.parseEther("0.000006") },
    ])) return;

    const outsiderRole = id("BURNER_ROLE");
    expect(await accessControl.hasRole(outsiderRole, outsiderWallet.address)).toBe(false);
    const delegatee = Wallet.createRandom().address;
    const setupPower = await apiCall(port, "PATCH", "/v1/staking/commands/setup-initial-voting-power", {
      body: { account: outsiderWallet.address, votingPower: "777" },
    });
    expect(setupPower.status, JSON.stringify(setupPower.payload)).toBe(202);
    await expectReceipt(extractTxHash(setupPower.payload));
    const chainId = (await provider.getNetwork()).chainId;
    const nonce = 0n;
    const latestBlock = await provider.getBlock("latest");
    expect(latestBlock).not.toBeNull();
    const expiry = BigInt(latestBlock!.timestamp + 3600);
    const domain = { name: "USpeaks", chainId, verifyingContract: diamondAddress };
    const types = { Delegation: [
      { name: "delegatee", type: "address" },
      { name: "nonce", type: "uint256" },
      { name: "expiry", type: "uint256" },
    ] };
    const signature = await outsiderWallet.signTypedData(domain, types, { delegatee, nonce, expiry });
    const parsedSignature = ethers.Signature.from(signature);
    const signResponse = await apiCall(port, "POST", "/v1/staking/commands/delegate-by-sig", {
      apiKey: "delegation-proof-key",
      headers: { "x-wallet-address": outsiderWallet.address },
      body: { delegatee, nonce: nonce.toString(), expiry: expiry.toString(), v: String(parsedSignature.v), r: parsedSignature.r, s: parsedSignature.s },
    });
    expect(signResponse.status, JSON.stringify(signResponse.payload)).toBe(202);
    const signHash = extractTxHash(signResponse.payload);
    await expectReceipt(signHash);
    const signReceipt = await provider.getTransactionReceipt(signHash);
    expect(signReceipt?.status).toBe(1);
    expect(await delegationFacet.delegates(outsiderWallet.address)).toBe(delegatee);
    expect(await delegationFacet.getTotalVotingPower(delegatee)).toBeGreaterThanOrEqual(777n);
    const delegationEvents = (signReceipt?.logs ?? []).flatMap((log) => {
      try { return [delegationFacet.interface.parseLog(log)?.name].filter((name): name is string => Boolean(name)); } catch { return []; }
    });
    expect(delegationEvents).toContain("DelegateChanged");

    const replay = await apiCall(port, "POST", "/v1/staking/commands/delegate-by-sig", {
      apiKey: "delegation-proof-key",
      headers: { "x-wallet-address": outsiderWallet.address },
      body: { delegatee, nonce: nonce.toString(), expiry: expiry.toString(), v: String(parsedSignature.v), r: parsedSignature.r, s: parsedSignature.s },
    });
    expect(replay.status).not.toBe(202);

    const transferAmount = 100n;
    const changedPower = await apiCall(port, "PATCH", "/v1/staking/commands/setup-initial-voting-power", {
      body: { account: outsiderWallet.address, votingPower: "1000" },
    });
    expect(changedPower.status, JSON.stringify(changedPower.payload)).toBe(202);
    await expectReceipt(extractTxHash(changedPower.payload));
    const votesAfterPowerChange = await delegationFacet.getCurrentVotes(delegatee);
    const singleRefresh = await apiCall(port, "PATCH", "/v1/staking/commands/update-delegated-voting-power", {
      apiKey: "outsider-key",
      body: { account: delegatee },
    });
    expect(singleRefresh.status, JSON.stringify(singleRefresh.payload)).toBe(202);
    const singleHash = extractTxHash(singleRefresh.payload);
    await expectReceipt(singleHash);
    const singleReceipt = await provider.getTransactionReceipt(singleHash);
    expect(singleReceipt?.status).toBe(1);
    expect(await votingPowerFacet.getDelegatedVotingPower(delegatee)).toBe(1000n);
    expect(await delegationFacet.getCurrentVotes(delegatee)).toBeGreaterThan(votesAfterPowerChange);
    expect((singleReceipt?.logs ?? []).some((log) => {
      try { return delegationFacet.interface.parseLog(log)?.name === "DelegateVotesChanged"; } catch { return false; }
    })).toBe(true);

    const setupSecondDelegator = await apiCall(port, "PATCH", "/v1/staking/commands/setup-initial-voting-power", {
      body: { account: licenseeWallet.address, votingPower: "444" },
    });
    expect(setupSecondDelegator.status, JSON.stringify(setupSecondDelegator.payload)).toBe(202);
    await expectReceipt(extractTxHash(setupSecondDelegator.payload));
    const batchDelegatee = Wallet.createRandom().address;
    const batchDelegatedBefore = await votingPowerFacet.getDelegatedVotingPower(batchDelegatee);
    expect(batchDelegatedBefore).toBe(0n);
    const secondNonce = 0n;
    const secondSignature = ethers.Signature.from(await licenseeWallet.signTypedData(domain, types, {
      delegatee: batchDelegatee,
      nonce: secondNonce,
      expiry,
    }));
    const secondDelegation = await apiCall(port, "POST", "/v1/staking/commands/delegate-by-sig", {
      apiKey: "licensee-key",
      headers: { "x-wallet-address": licenseeWallet.address },
      body: {
        delegatee: batchDelegatee,
        nonce: secondNonce.toString(),
        expiry: expiry.toString(),
        v: String(secondSignature.v),
        r: secondSignature.r,
        s: secondSignature.s,
      },
    });
    expect(secondDelegation.status, JSON.stringify(secondDelegation.payload)).toBe(202);
    await expectReceipt(extractTxHash(secondDelegation.payload));
    const batchDelegatedAfterSign = await votingPowerFacet.getDelegatedVotingPower(batchDelegatee);
    expect(batchDelegatedAfterSign).toBe(batchDelegatedBefore + 444n);
    const updateSecondPower = await apiCall(port, "PATCH", "/v1/staking/commands/setup-initial-voting-power", {
      body: { account: licenseeWallet.address, votingPower: "555" },
    });
    expect(updateSecondPower.status, JSON.stringify(updateSecondPower.payload)).toBe(202);
    await expectReceipt(extractTxHash(updateSecondPower.payload));
    const batchVotesBefore = await delegationFacet.getCurrentVotes(batchDelegatee);
    const batchRefresh = await apiCall(port, "PATCH", "/v1/staking/commands/update-delegated-voting-power-batch", {
      apiKey: "outsider-key",
      body: { accounts: [delegatee, batchDelegatee] },
    });
    expect(batchRefresh.status, JSON.stringify(batchRefresh.payload)).toBe(202);
    const batchHash = extractTxHash(batchRefresh.payload);
    await expectReceipt(batchHash);
    const batchReceipt = await provider.getTransactionReceipt(batchHash);
    expect(batchReceipt?.status).toBe(1);
    expect(await votingPowerFacet.getDelegatedVotingPower(delegatee)).toBe(1000n);
    expect(await votingPowerFacet.getDelegatedVotingPower(batchDelegatee)).toBe(batchDelegatedBefore + 555n);
    expect(await delegationFacet.getCurrentVotes(batchDelegatee)).toBeGreaterThan(batchVotesBefore);
    expect((batchReceipt?.logs ?? []).some((log) => {
      try { return delegationFacet.interface.parseLog(log)?.name === "DelegateVotesChanged"; } catch { return false; }
    })).toBe(true);
  }, 180_000);

  it("proves the funded staking reward, claim, and unstake receipt lifecycle", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "staking receipt lifecycle", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.00002") },
    ])) {
      return;
    }

    const epochDurationSeconds = 7n * 24n * 60n * 60n;
    const tokenUnit = 10n ** 10n;
    const rewardFundingAmount = 52n * epochDurationSeconds * tokenUnit;
    const stakeAmount = tokenUnit;
    const stakingApiKey = "staking-proof-key";
    const stakeBefore = await stakingFacet.getStakeInfo(founderAddress);
    const stakingStatsBefore = await stakingFacet.getStakingStats();
    const stakerBalanceBefore = await tokenSupplyFacet.tokenBalanceOf(founderAddress);
    const custodyBalanceBefore = await tokenSupplyFacet.tokenBalanceOf(diamondAddress);

    const submit = async (route: string, body: Record<string, unknown> = {}) => {
      const response = await apiCall(port, "POST", route, { apiKey: stakingApiKey, body });
      expect(response.status, JSON.stringify(response.payload)).toBe(202);
      const txHash = extractTxHash(response.payload);
      await expectReceipt(txHash);
      const receipt = await provider.getTransactionReceipt(txHash);
      expect(receipt).not.toBeNull();
      return { txHash, receipt: receipt! };
    };
    const expectDecodedEvent = async (
      route: string,
      txHash: string,
      blockNumber: number,
    ) => {
      const response = await apiCall(port, "POST", route, {
        apiKey: "read-key",
        body: { fromBlock: String(blockNumber), toBlock: String(blockNumber) },
      });
      expect(response.status, JSON.stringify(response.payload)).toBe(200);
      expect(Array.isArray(response.payload)).toBe(true);
      expect((response.payload as Array<Record<string, unknown>>).some((log) => log.transactionHash === txHash)).toBe(true);
    };

    const approve = async (amount: bigint) => {
      const response = await apiCall(port, "POST", "/v1/tokenomics/commands/token-approve", {
        apiKey: stakingApiKey,
        body: { spender: diamondAddress, amount: amount.toString() },
      });
      expect(response.status, JSON.stringify(response.payload)).toBe(202);
      await expectReceipt(extractTxHash(response.payload));
    };

    await approve(rewardFundingAmount);
    const funding = await submit("/v1/staking/commands/fund-reward-pool", {
      amount: rewardFundingAmount.toString(),
    });
    expect(funding.receipt.logs.some((log) => {
      try {
        return stakingFacet.interface.parseLog(log)?.name === "RewardPoolFunded";
      } catch {
        return false;
      }
    })).toBe(true);
    await expectDecodedEvent(
      "/v1/staking/events/reward-pool-funded/query",
      funding.txHash,
      funding.receipt.blockNumber,
    );
    const stakingStatsAfterFunding = await stakingFacet.getStakingStats();
    expect(stakingStatsAfterFunding.rewardPoolBalance).toBe(
      stakingStatsBefore.rewardPoolBalance + rewardFundingAmount,
    );
    const stakerBalanceAfterFunding = await tokenSupplyFacet.tokenBalanceOf(founderAddress);
    expect(stakerBalanceAfterFunding).toBe(stakerBalanceBefore - rewardFundingAmount);

    await approve(stakeAmount);

    const stake = await submit("/v1/staking/commands/stake", { amount: stakeAmount.toString() });
    expect(stake.receipt.logs.some((log) => {
      try {
        return stakingFacet.interface.parseLog(log)?.name === "Staked";
      } catch {
        return false;
      }
    })).toBe(true);
    await expectDecodedEvent("/v1/staking/events/staked/query", stake.txHash, stake.receipt.blockNumber);

    const stakeAfter = await stakingFacet.getStakeInfo(founderAddress);
    expect(stakeAfter.amount).toBe(stakeBefore.amount + stakeAmount);
    const stakerBalanceAfterStake = await tokenSupplyFacet.tokenBalanceOf(founderAddress);
    expect(stakerBalanceAfterStake).toBeGreaterThanOrEqual(stakerBalanceAfterFunding - stakeAmount);
    const stakeAccruedReward = stakerBalanceAfterStake - (stakerBalanceAfterFunding - stakeAmount);
    expect(await tokenSupplyFacet.tokenBalanceOf(diamondAddress)).toBe(
      custodyBalanceBefore + rewardFundingAmount + stakeAmount - stakeAccruedReward,
    );

    await provider.send("evm_increaseTime", [Number(epochDurationSeconds + 1n)]);
    await provider.send("evm_mine", []);

    const epoch = await submit("/v1/staking/commands/advance-epoch");
    expect(epoch.receipt.logs.some((log) => {
      try {
        return stakingFacet.interface.parseLog(log)?.name === "EpochAdvanced";
      } catch {
        return false;
      }
    })).toBe(true);
    await expectDecodedEvent("/v1/staking/events/epoch-advanced/query", epoch.txHash, epoch.receipt.blockNumber);

    expect(await stakingFacet.getPendingRewards(founderAddress)).toBeGreaterThan(0n);
    const stakerBalanceBeforeClaim = await tokenSupplyFacet.tokenBalanceOf(founderAddress);
    const claim = await submit("/v1/staking/commands/claim-rewards");
    const claimEventNames = claim.receipt.logs.flatMap((log) => {
      try {
        return [stakingFacet.interface.parseLog(log)?.name];
      } catch {
        return [];
      }
    });
    expect(claimEventNames).toContain("RewardsClaimed");
    expect(claimEventNames).toContain("RewardsClaimedDetailed");
    await expectDecodedEvent(
      "/v1/staking/events/rewards-claimed/query",
      claim.txHash,
      claim.receipt.blockNumber,
    );
    await expectDecodedEvent(
      "/v1/staking/events/rewards-claimed-detailed/query",
      claim.txHash,
      claim.receipt.blockNumber,
    );
    const stakerBalanceAfterClaim = await tokenSupplyFacet.tokenBalanceOf(founderAddress);
    const claimedAmount = stakerBalanceAfterClaim - stakerBalanceBeforeClaim;
    expect(claimedAmount).toBeGreaterThan(0n);
    expect(await stakingFacet.getPendingRewards(founderAddress)).toBe(0n);

    const request = await submit("/v1/staking/commands/request-unstake", { amount: stakeAmount.toString() });
    expect(request.receipt.logs.some((log) => {
      try {
        return stakingFacet.interface.parseLog(log)?.name === "UnstakeRequested";
      } catch {
        return false;
      }
    })).toBe(true);
    await expectDecodedEvent(
      "/v1/staking/events/unstake-requested/query",
      request.txHash,
      request.receipt.blockNumber,
    );

    const pendingRequest = await stakingFacet.getUnstakeRequest(founderAddress);
    expect(pendingRequest.amount).toBe(stakeAmount);
    expect(pendingRequest.pending).toBe(true);
    const latestBlock = await provider.getBlock("latest");
    expect(latestBlock).not.toBeNull();
    const secondsToUnlock = pendingRequest.unlockTimestamp >= BigInt(latestBlock!.timestamp)
      ? pendingRequest.unlockTimestamp - BigInt(latestBlock!.timestamp) + 1n
      : 1n;
    await provider.send("evm_increaseTime", [Number(secondsToUnlock)]);
    await provider.send("evm_mine", []);

    const stakerBalanceBeforeExecute = await tokenSupplyFacet.tokenBalanceOf(founderAddress);
    const unstake = await submit("/v1/staking/commands/execute-unstake");
    expect(unstake.receipt.logs.some((log) => {
      try {
        return stakingFacet.interface.parseLog(log)?.name === "Unstaked";
      } catch {
        return false;
      }
    })).toBe(true);
    await expectDecodedEvent("/v1/staking/events/unstaked/query", unstake.txHash, unstake.receipt.blockNumber);

    const stakeRestored = await stakingFacet.getStakeInfo(founderAddress);
    const clearedRequest = await stakingFacet.getUnstakeRequest(founderAddress);
    expect(stakeRestored.amount).toBe(stakeBefore.amount);
    expect(clearedRequest.amount).toBe(0n);
    expect(clearedRequest.pending).toBe(false);
    const stakerBalanceFinal = await tokenSupplyFacet.tokenBalanceOf(founderAddress);
    const custodyBalanceFinal = await tokenSupplyFacet.tokenBalanceOf(diamondAddress);
    expect(stakerBalanceFinal).toBeGreaterThanOrEqual(stakerBalanceBeforeExecute + stakeAmount);
    expect(stakerBalanceFinal + custodyBalanceFinal).toBe(stakerBalanceBefore + custodyBalanceBefore);

    const rejectedExecuteUnstake = await apiCall(port, "POST", "/v1/staking/commands/execute-unstake", {
      apiKey: stakingApiKey,
      body: {},
    });
    expect(rejectedExecuteUnstake.status, JSON.stringify(rejectedExecuteUnstake.payload)).toBe(500);
    expect(JSON.stringify(rejectedExecuteUnstake.payload)).toMatch(/NoUnstakeRequest|revert|execution reverted/i);
  }, 180_000);

  it("fails correctly for validation, signer, and provider errors", async () => {
    const invalidBody = await apiCall(port, "POST", "/v1/voice-assets", {
      body: { ipfsHash: "ipfs://missing-royalty" },
    });
    expect(invalidBody.status).toBe(400);

    const missingKeyResponse = await fetch(`http://127.0.0.1:${port}/v1/voice-assets/queries/get-default-royalty-rate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    });
    expect(missingKeyResponse.status).toBe(401);

    const signerUnavailable = await apiCall(port, "POST", "/v1/voice-assets", {
      apiKey: "read-key",
      body: { ipfsHash: `ipfs://signer-missing/${Date.now()}`, royaltyRate: "100" },
    });
    expect(signerUnavailable.status).toBe(403);
    expect(signerUnavailable.payload).toMatchObject({ error: expect.stringContaining("not permitted for write execution") });

    const defaultRoyaltyRead = await waitForStableApiResponse(
      () => apiCall(port, "POST", "/v1/voice-assets/queries/get-default-royalty-rate", {
        apiKey: "read-key",
        body: {},
      }),
      (response) => response.status === 200,
      "default royalty read",
    );
    expect(defaultRoyaltyRead.status).toBe(200);
    expect(defaultRoyaltyRead.payload).toBe(normalize(await voiceAsset.getDefaultRoyaltyRate()));
  }, 300_000);

  it("proves the caller token burn receipt remains indexable on the local fork", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "token supply burn receipt proof", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.0005") },
    ])) return;

    const amount = 1n;
    const balanceBefore = await tokenSupplyFacet.tokenBalanceOf(founderAddress);
    const supplyBefore = await tokenSupplyFacet.totalSupply();
    expect(balanceBefore).toBeGreaterThanOrEqual(amount);
    const response = await apiCall(port, "DELETE", "/v1/tokenomics/commands/burn", {
      body: { amount: amount.toString() },
    });
    expect(response.status, JSON.stringify(response.payload)).toBe(202);
    const txHash = extractTxHash(response.payload);
    await expectReceipt(txHash);
    const receipt = await provider.getTransactionReceipt(txHash);
    expect(receipt?.status).toBe(1);
    const transferEvents = (receipt?.logs ?? []).flatMap((log) => {
      try {
        const parsed = tokenSupplyFacet.interface.parseLog(log);
        return parsed?.name === "Transfer" ? [parsed] : [];
      } catch {
        return [];
      }
    });
    expect(transferEvents).toHaveLength(1);
    expect(transferEvents[0]?.args.from).toBe(founderAddress);
    expect(transferEvents[0]?.args.to).toBe(ethers.ZeroAddress);
    expect(transferEvents[0]?.args.value).toBe(amount);
    expect(await tokenSupplyFacet.tokenBalanceOf(founderAddress)).toBe(balanceBefore - amount);
    expect(await tokenSupplyFacet.totalSupply()).toBe(supplyBefore - amount);
  }, 180_000);

  it("proves the caller token mint receipt remains indexable on the local fork", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "token supply mint receipt proof", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.0005") },
    ])) return;

    const minterRole = id("MINTER_ROLE");
    if (!(await accessControl.hasRole(minterRole, founderAddress))) {
      const roleReceipt = await (
        await accessControl.connect(founderWallet).grantRole(minterRole, founderAddress, ethers.MaxUint256)
      ).wait();
      expect(roleReceipt?.status).toBe(1);
    }
    const tokenStorageBase = BigInt(id("speak.token.storage"));
    const tokenFlagsSlot = tokenStorageBase + 11n;
    const maxSupplySlot = tokenStorageBase + 12n;
    const originalTokenFlags = BigInt(await provider.getStorage(diamondAddress, ethers.toBeHex(tokenFlagsSlot, 32)));
    const disposableTokenFlags = originalTokenFlags & ~(0xffn << 8n);
    const fixtureSupply = BigInt(await tokenSupplyFacet.totalSupply());
    await provider.send("anvil_setStorageAt", [
      diamondAddress,
      ethers.toBeHex(tokenFlagsSlot, 32),
      ethers.toBeHex(disposableTokenFlags, 32),
    ]);
    await provider.send("anvil_setStorageAt", [
      diamondAddress,
      ethers.toBeHex(maxSupplySlot, 32),
      ethers.toBeHex(fixtureSupply + 100n, 32),
    ]);
    await provider.send("evm_mine", []);
    expect(await tokenSupplyFacet.supplyIsMintingFinished()).toBe(false);

    const recipient = transfereeWallet.address;
    const amount = 17n;
    const balanceBefore = await tokenSupplyFacet.tokenBalanceOf(recipient);
    const supplyBefore = await tokenSupplyFacet.totalSupply();
    const response = await apiCall(port, "POST", "/v1/tokenomics/commands/supply-mint-tokens", {
      body: { to: recipient, amount: amount.toString() },
    });
    expect(response.status, JSON.stringify(response.payload)).toBe(202);
    const txHash = extractTxHash(response.payload);
    await expectReceipt(txHash);
    const receipt = await provider.getTransactionReceipt(txHash);
    expect(receipt?.status).toBe(1);
    const transferEvents = (receipt?.logs ?? []).flatMap((log) => {
      try {
        const parsed = tokenSupplyFacet.interface.parseLog(log);
        return parsed?.name === "Transfer" ? [parsed] : [];
      } catch {
        return [];
      }
    });
    expect(transferEvents).toHaveLength(1);
    expect(transferEvents[0]?.args.from).toBe(ethers.ZeroAddress);
    expect(transferEvents[0]?.args.to).toBe(recipient);
    expect(transferEvents[0]?.args.value).toBe(amount);
    expect(await tokenSupplyFacet.tokenBalanceOf(recipient)).toBe(balanceBefore + amount);
    expect(await tokenSupplyFacet.totalSupply()).toBe(supplyBefore + amount);
  }, 180_000);

  it("proves the approved token burnFrom receipt remains indexable on the local fork", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "token supply burnFrom receipt proof", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.0005") },
      { address: transfereeWallet.address, minimumWei: ethers.parseEther("0.0005") },
    ])) return;

    const amount = 17n;
    const ownerBefore = await tokenSupplyFacet.tokenBalanceOf(founderAddress);
    const recipientBefore = await tokenSupplyFacet.tokenBalanceOf(transfereeWallet.address);
    const supplyBefore = await tokenSupplyFacet.totalSupply();
    expect(ownerBefore).toBeGreaterThanOrEqual(amount);

    const approval = await apiCall(port, "POST", "/v1/tokenomics/commands/token-approve", {
      body: { spender: transfereeWallet.address, amount: amount.toString() },
    });
    expect(approval.status, JSON.stringify(approval.payload)).toBe(202);
    await expectReceipt(extractTxHash(approval.payload));
    expect(await tokenSupplyFacet.tokenAllowance(founderAddress, transfereeWallet.address)).toBe(amount);

    const response = await apiCall(port, "DELETE", "/v1/tokenomics/commands/burn-from", {
      apiKey: "transferee-key",
      body: { account: founderAddress, amount: amount.toString() },
    });
    expect(response.status, JSON.stringify(response.payload)).toBe(202);
    const txHash = extractTxHash(response.payload);
    await expectReceipt(txHash);
    const receipt = await provider.getTransactionReceipt(txHash);
    expect(receipt?.status).toBe(1);
    const transferEvents = (receipt?.logs ?? []).flatMap((log) => {
      try {
        const parsed = tokenSupplyFacet.interface.parseLog(log);
        return parsed?.name === "Transfer" ? [parsed] : [];
      } catch {
        return [];
      }
    });
    expect(transferEvents).toHaveLength(1);
    expect(transferEvents[0]?.args.from).toBe(founderAddress);
    expect(transferEvents[0]?.args.to).toBe(ethers.ZeroAddress);
    expect(transferEvents[0]?.args.value).toBe(amount);
    expect(await tokenSupplyFacet.tokenBalanceOf(founderAddress)).toBe(ownerBefore - amount);
    expect(await tokenSupplyFacet.tokenBalanceOf(transfereeWallet.address)).toBe(recipientBefore);
    expect(await tokenSupplyFacet.totalSupply()).toBe(supplyBefore - amount);
    expect(await tokenSupplyFacet.tokenAllowance(founderAddress, transfereeWallet.address)).toBe(0n);
  }, 180_000);

  it("proves the supply maximum update remains indexable on the local fork", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "token supply maximum receipt proof", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.0005") },
    ])) return;

    const minterRole = id("MINTER_ROLE");
    if (!(await accessControl.hasRole(minterRole, founderAddress))) {
      const roleReceipt = await (
        await accessControl.connect(founderWallet).grantRole(minterRole, founderAddress, ethers.MaxUint256)
      ).wait();
      expect(roleReceipt?.status).toBe(1);
    }
    const tokenStorageBase = BigInt(id("speak.token.storage"));
    const tokenFlagsSlot = tokenStorageBase + 11n;
    const maxSupplySlot = tokenStorageBase + 12n;
    const tokenFlagsBefore = BigInt(await provider.getStorage(diamondAddress, ethers.toBeHex(tokenFlagsSlot, 32)));
    const maximumStorageBefore = BigInt(await provider.getStorage(diamondAddress, ethers.toBeHex(maxSupplySlot, 32)));
    const supplyBefore = await tokenSupplyFacet.totalSupply();
    const fixtureMaximum = supplyBefore + 100n;

    // The deployed fixture has finalized minting, which also gates this setter.
    // Reopen it only in loopback-fork storage, then restore the original slots.
    await provider.send("anvil_setStorageAt", [
      diamondAddress,
      ethers.toBeHex(tokenFlagsSlot, 32),
      ethers.toBeHex(tokenFlagsBefore & ~(0xffn << 8n), 32),
    ]);
    await provider.send("anvil_setStorageAt", [
      diamondAddress,
      ethers.toBeHex(maxSupplySlot, 32),
      ethers.toBeHex(fixtureMaximum, 32),
    ]);
    await provider.send("evm_mine", []);
    const maximumBefore = await tokenSupplyFacet.supplyGetMaximum();
    expect(maximumBefore).toBe(fixtureMaximum);
    expect(maximumBefore).toBeGreaterThan(supplyBefore);

    try {
      const targetMaximum = maximumBefore + 1n;
      const update = await apiCall(port, "POST", "/v1/tokenomics/commands/supply-set-maximum", {
        body: { maxSupply_: targetMaximum.toString() },
      });
      expect(update.status, JSON.stringify(update.payload)).toBe(202);
      const txHash = extractTxHash(update.payload);
      await expectReceipt(txHash);
      const receipt = await provider.getTransactionReceipt(txHash);
      expect(receipt?.status).toBe(1);
      expect(receipt?.logs).toHaveLength(0);
      expect(await tokenSupplyFacet.supplyGetMaximum()).toBe(targetMaximum);

      const readback = await apiCall(port, "POST", "/v1/tokenomics/queries/supply-get-maximum", {
        apiKey: "read-key",
        body: {},
      });
      expect(readback.status).toBe(200);
      expect(readback.payload).toBe(targetMaximum.toString());

      const restore = await apiCall(port, "POST", "/v1/tokenomics/commands/supply-set-maximum", {
        body: { maxSupply_: maximumBefore.toString() },
      });
      expect(restore.status, JSON.stringify(restore.payload)).toBe(202);
      await expectReceipt(extractTxHash(restore.payload));
      expect(await tokenSupplyFacet.supplyGetMaximum()).toBe(maximumBefore);
    } finally {
      await provider.send("anvil_setStorageAt", [
        diamondAddress,
        ethers.toBeHex(tokenFlagsSlot, 32),
        ethers.toBeHex(tokenFlagsBefore, 32),
      ]);
      await provider.send("anvil_setStorageAt", [
        diamondAddress,
        ethers.toBeHex(maxSupplySlot, 32),
        ethers.toBeHex(maximumStorageBefore, 32),
      ]);
      await provider.send("evm_mine", []);
    }
  }, 180_000);

  it("proves the mint finalization receipt remains indexable on the local fork", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "token mint finalization receipt proof", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.0005") },
    ])) return;

    const tokenStorageBase = BigInt(id("speak.token.storage"));
    const tokenFlagsSlot = tokenStorageBase + 11n;
    const originalTokenFlags = BigInt(await provider.getStorage(diamondAddress, ethers.toBeHex(tokenFlagsSlot, 32)));
    await provider.send("anvil_setStorageAt", [
      diamondAddress,
      ethers.toBeHex(tokenFlagsSlot, 32),
      ethers.toBeHex(originalTokenFlags & ~(0xffn << 8n), 32),
    ]);
    await provider.send("evm_mine", []);
    expect(await tokenSupplyFacet.supplyIsMintingFinished()).toBe(false);

    try {
      const response = await apiCall(port, "POST", "/v1/tokenomics/commands/supply-finish-minting", {
        body: {},
      });
      expect(response.status, JSON.stringify(response.payload)).toBe(202);
      const txHash = extractTxHash(response.payload);
      await expectReceipt(txHash);
      const receipt = await provider.getTransactionReceipt(txHash);
      expect(receipt?.status).toBe(1);
      const finalizedEvents = (receipt?.logs ?? []).flatMap((log) => {
        try {
          const parsed = tokenSupplyFacet.interface.parseLog(log);
          return parsed?.name === "MintingFinished" ? [parsed] : [];
        } catch {
          return [];
        }
      });
      expect(finalizedEvents).toHaveLength(1);
      expect(await tokenSupplyFacet.supplyIsMintingFinished()).toBe(true);

      const readback = await apiCall(port, "POST", "/v1/tokenomics/queries/supply-is-minting-finished", {
        apiKey: "read-key",
        body: {},
      });
      expect(readback.status).toBe(200);
      expect(readback.payload).toBe(true);
    } finally {
      await provider.send("anvil_setStorageAt", [
        diamondAddress,
        ethers.toBeHex(tokenFlagsSlot, 32),
        ethers.toBeHex(originalTokenFlags, 32),
      ]);
      await provider.send("evm_mine", []);
    }
  }, 180_000);

  it("proves the oracle staleness configuration update remains indexable on the local fork", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "oracle staleness configuration receipt proof", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.0005") },
    ])) return;

    const oracle = new Contract(diamondAddress, facetRegistry.EchoScoreFacetV3.abi, provider);
    const platformAdminRole = id("PLATFORM_ADMIN_ROLE");
    expect(await accessControl.hasRole(platformAdminRole, founderAddress)).toBe(true);
    const originalConfig = await oracle.getOracleStalenessConfig();
    const originalMaxAge = BigInt(originalConfig.maxAgeSeconds);
    const targetMaxAge = originalMaxAge + 1n;

    try {
      const update = await apiCall(port, "PATCH", "/v1/staking/commands/set-oracle-staleness-config", {
        apiKey: "founder-key",
        body: { maxAgeSeconds: targetMaxAge.toString() },
      });
      expect(update.status, JSON.stringify(update.payload)).toBe(202);
      const updateHash = extractTxHash(update.payload);
      await expectReceipt(updateHash);
      const updateReceipt = await provider.getTransactionReceipt(updateHash);
      expect(updateReceipt?.status).toBe(1);
      const updatedEvents = (updateReceipt?.logs ?? []).flatMap((log) => {
        try {
          const parsed = oracle.interface.parseLog(log);
          return parsed?.name === "OracleStalenessConfigUpdated" ? [parsed] : [];
        } catch {
          return [];
        }
      });
      expect(updatedEvents).toHaveLength(1);
      expect(BigInt(updatedEvents[0]!.args.maxAgeSeconds)).toBe(targetMaxAge);
      const configAfterUpdate = await oracle.getOracleStalenessConfig();
      expect(BigInt(configAfterUpdate.maxAgeSeconds)).toBe(targetMaxAge);

      const readback = await apiCall(port, "POST", "/v1/staking/queries/get-oracle-staleness-config", {
        apiKey: "read-key",
        body: {},
      });
      expect(readback.status).toBe(200);
      expect(readback.payload).toEqual([
        normalize(configAfterUpdate.maxAgeSeconds),
        normalize(configAfterUpdate.lastUpdatedAt),
      ]);
    } finally {
      const currentMaxAge = BigInt((await oracle.getOracleStalenessConfig()).maxAgeSeconds);
      if (currentMaxAge !== originalMaxAge) {
        const restore = await apiCall(port, "PATCH", "/v1/staking/commands/set-oracle-staleness-config", {
          apiKey: "founder-key",
          body: { maxAgeSeconds: originalMaxAge.toString() },
        });
        expect(restore.status, JSON.stringify(restore.payload)).toBe(202);
        await expectReceipt(extractTxHash(restore.payload));
      }
      expect(BigInt((await oracle.getOracleStalenessConfig()).maxAgeSeconds)).toBe(originalMaxAge);
    }
  }, 180_000);

  it("proves the oracle future-drift configuration update remains indexable on the local fork", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "oracle future-drift configuration receipt proof", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.0005") },
    ])) return;

    const oracle = new Contract(diamondAddress, facetRegistry.EchoScoreFacetV3.abi, provider);
    const platformAdminRole = id("PLATFORM_ADMIN_ROLE");
    expect(await accessControl.hasRole(platformAdminRole, founderAddress)).toBe(true);
    const originalMaxFutureSeconds = BigInt(await oracle.getOracleFutureDriftConfig());
    const targetMaxFutureSeconds = originalMaxFutureSeconds + 1n;
    let updateTransactionHash: string | null = null;
    let restoreTransactionHash: string | null = null;

    try {
      const update = await apiCall(port, "PATCH", "/v1/staking/commands/set-oracle-future-drift-config", {
        apiKey: "founder-key",
        body: { maxFutureSeconds: targetMaxFutureSeconds.toString() },
      });
      expect(update.status, JSON.stringify(update.payload)).toBe(202);
      const updateHash = extractTxHash(update.payload);
      updateTransactionHash = updateHash;
      await expectReceipt(updateHash);
      const updateReceipt = await provider.getTransactionReceipt(updateHash);
      expect(updateReceipt?.status).toBe(1);
      const updatedEvents = (updateReceipt?.logs ?? []).flatMap((log) => {
        try {
          const parsed = oracle.interface.parseLog(log);
          return parsed?.name === "OracleFutureDriftConfigUpdated" ? [parsed] : [];
        } catch {
          return [];
        }
      });
      expect(updatedEvents).toHaveLength(1);
      expect(BigInt(updatedEvents[0]!.args.maxFutureSeconds)).toBe(targetMaxFutureSeconds);
      expect(BigInt(await oracle.getOracleFutureDriftConfig())).toBe(targetMaxFutureSeconds);

      const readback = await apiCall(port, "POST", "/v1/staking/queries/get-oracle-future-drift-config", {
        apiKey: "read-key",
        body: {},
      });
      expect(readback.status).toBe(200);
      expect(BigInt(readback.payload as string)).toBe(targetMaxFutureSeconds);
    } finally {
      const currentMaxFutureSeconds = BigInt(await oracle.getOracleFutureDriftConfig());
      if (currentMaxFutureSeconds !== originalMaxFutureSeconds) {
        const restore = await apiCall(port, "PATCH", "/v1/staking/commands/set-oracle-future-drift-config", {
          apiKey: "founder-key",
          body: { maxFutureSeconds: originalMaxFutureSeconds.toString() },
        });
        expect(restore.status, JSON.stringify(restore.payload)).toBe(202);
        restoreTransactionHash = extractTxHash(restore.payload);
        await expectReceipt(restoreTransactionHash);
      }
      expect(BigInt(await oracle.getOracleFutureDriftConfig())).toBe(originalMaxFutureSeconds);
      oracleFutureDriftProofObservations.push({
        methodKey: "EchoScoreFacetV3.setOracleFutureDriftConfig",
        route: "PATCH /v1/staking/commands/set-oracle-future-drift-config",
        actor: "founder fixture signer with PLATFORM_ADMIN_ROLE",
        originalMaxFutureSeconds: originalMaxFutureSeconds.toString(),
        testMaxFutureSeconds: targetMaxFutureSeconds.toString(),
        restoredMaxFutureSeconds: (await oracle.getOracleFutureDriftConfig()).toString(),
        updateTransactionHash,
        restoreTransactionHash,
        event: "EchoScoreFacetV3.OracleFutureDriftConfigUpdated(uint256)",
        canonicalReadbackMatched: true,
        httpReadbackMatched: true,
        finalValueRestored: true,
      });
    }
  }, 180_000);

  it("proves oracle quorum signer configuration through HTTP on the local fork", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "oracle quorum signer receipt proof", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.0005") },
    ])) return;

    const oracle = new Contract(diamondAddress, facetRegistry.EchoScoreFacetV3.abi, provider);
    const platformAdminRole = id("PLATFORM_ADMIN_ROLE");
    expect(await accessControl.hasRole(platformAdminRole, founderAddress)).toBe(true);
    const original = await oracle.getOracleQuorumSigners();
    const originalSigners = Array.from(original.signers as string[]).map((address) => ethers.getAddress(address));
    const originalThreshold = BigInt(original.threshold);
    expect(originalSigners.length).toBeGreaterThan(0);
    expect(originalThreshold).toBeGreaterThan(0n);
    expect(originalThreshold).toBeLessThanOrEqual(BigInt(originalSigners.length));
    const addedSigner = ethers.getAddress(Wallet.createRandom().address);
    expect(originalSigners.some((address) => address.toLowerCase() === addedSigner.toLowerCase())).toBe(false);
    const targetSigners = [...originalSigners, addedSigner];
    let updateTransactionHash: string | null = null;
    let restoreTransactionHash: string | null = null;

    const submit = async (signers: string[], threshold: bigint) => {
      const response = await apiCall(port, "PATCH", "/v1/staking/commands/set-oracle-quorum-signers", {
        apiKey: "founder-key",
        body: { signers, threshold: threshold.toString() },
      });
      expect(response.status, JSON.stringify(response.payload)).toBe(202);
      const txHash = extractTxHash(response.payload);
      await expectReceipt(txHash);
      const receipt = await provider.getTransactionReceipt(txHash);
      expect(receipt?.status).toBe(1);
      const events = (receipt?.logs ?? []).flatMap((log) => {
        try {
          const parsed = oracle.interface.parseLog(log);
          return parsed?.name === "OracleQuorumConfigUpdated" ? [parsed] : [];
        } catch {
          return [];
        }
      });
      expect(events).toHaveLength(1);
      expect(Array.from(events[0]!.args.signers as string[]).map((address) => address.toLowerCase()))
        .toEqual(signers.map((address) => address.toLowerCase()));
      expect(BigInt(events[0]!.args.threshold)).toBe(threshold);
      const canonical = await oracle.getOracleQuorumSigners();
      expect(Array.from(canonical.signers as string[]).map((address) => address.toLowerCase()))
        .toEqual(signers.map((address) => address.toLowerCase()));
      expect(BigInt(canonical.threshold)).toBe(threshold);
      // The generated tuple query has a five-second response cache.
      await delay(6_000);
      const httpReadback = await apiCall(port, "POST", "/v1/staking/queries/get-oracle-quorum-signers", {
        apiKey: "read-key",
        body: {},
      });
      expect(httpReadback.status).toBe(200);
      const httpTuple = httpReadback.payload as [string[], string];
      expect(httpTuple[0].map((address) => address.toLowerCase())).toEqual(signers.map((address) => address.toLowerCase()));
      expect(httpTuple[1]).toBe(threshold.toString());
      return txHash;
    };

    try {
      updateTransactionHash = await submit(targetSigners, originalThreshold);
    } finally {
      const current = await oracle.getOracleQuorumSigners();
      const currentSigners = Array.from(current.signers as string[]).map((address) => ethers.getAddress(address));
      const currentThreshold = BigInt(current.threshold);
      if (currentSigners.length !== originalSigners.length || currentThreshold !== originalThreshold
        || currentSigners.some((address, index) => address.toLowerCase() !== originalSigners[index]?.toLowerCase())) {
        restoreTransactionHash = await submit(originalSigners, originalThreshold);
      }
      const final = await oracle.getOracleQuorumSigners();
      expect(Array.from(final.signers as string[]).map((address) => address.toLowerCase()))
        .toEqual(originalSigners.map((address) => address.toLowerCase()));
      expect(BigInt(final.threshold)).toBe(originalThreshold);
      oracleQuorumSignersProofObservations.push({
        methodKey: "EchoScoreFacetV3.setOracleQuorumSigners",
        route: "PATCH /v1/staking/commands/set-oracle-quorum-signers",
        actor: "founder fixture signer with PLATFORM_ADMIN_ROLE",
        originalSigners,
        originalThreshold: originalThreshold.toString(),
        targetSigners,
        targetThreshold: originalThreshold.toString(),
        updateTransactionHash,
        restoreTransactionHash,
        event: "EchoScoreFacetV3.OracleQuorumConfigUpdated(address[],uint256)",
        updateCanonicalReadbackMatched: true,
        updateHttpReadbackMatched: true,
        restoreCanonicalReadbackMatched: true,
        restoreHttpReadbackMatched: true,
        finalValueRestored: true,
        forkScopedFixture: true,
      });
    }
  }, 180_000);

  it("proves oracle pause and resume through HTTP on the local fork", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "oracle pause and resume receipt proof", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.0005") },
    ])) return;

    const oracle = new Contract(diamondAddress, facetRegistry.EchoScoreFacetV3.abi, provider);
    const platformAdminRole = id("PLATFORM_ADMIN_ROLE");
    expect(await accessControl.hasRole(platformAdminRole, founderAddress)).toBe(true);
    const initialPaused = Boolean(await oracle.isEchoScorePausedV3());
    const transitionOrder = initialPaused ? [false, true] : [true, false];
    let pauseTransactionHash: string | null = null;
    let unpauseTransactionHash: string | null = null;

    for (const paused of transitionOrder) {
      const response = await apiCall(port, "POST", paused
        ? "/v1/staking/commands/pause-echo-score-v3"
        : "/v1/staking/commands/unpause-echo-score-v3", {
        apiKey: "founder-key",
        body: {},
      });
      expect(response.status, JSON.stringify(response.payload)).toBe(202);
      const txHash = extractTxHash(response.payload);
      await expectReceipt(txHash);
      const receipt = await provider.getTransactionReceipt(txHash);
      expect(receipt?.status).toBe(1);
      const expectedEventName = paused ? "Paused" : "Unpaused";
      const expectedEvent = (receipt?.logs ?? []).flatMap((log) => {
        try {
          const parsed = oracle.interface.parseLog(log);
          return parsed?.name === expectedEventName ? [parsed] : [];
        } catch {
          return [];
        }
      });
      expect(expectedEvent).toHaveLength(1);
      expect(String(expectedEvent[0]!.args.admin).toLowerCase()).toBe(founderAddress.toLowerCase());
      expect(Boolean(await oracle.isEchoScorePausedV3())).toBe(paused);
      // The generated paused-state query has a five-second response cache.
      await delay(6_000);
      const httpReadback = await apiCall(port, "POST", "/v1/staking/queries/is-echo-score-paused-v3", {
        apiKey: "read-key",
        body: {},
      });
      expect(httpReadback.status).toBe(200);
      expect(httpReadback.payload).toBe(paused);
      if (paused) pauseTransactionHash = txHash;
      else unpauseTransactionHash = txHash;
    }

    expect(pauseTransactionHash).toMatch(/^0x[a-fA-F0-9]{64}$/u);
    expect(unpauseTransactionHash).toMatch(/^0x[a-fA-F0-9]{64}$/u);
    expect(Boolean(await oracle.isEchoScorePausedV3())).toBe(initialPaused);
    oraclePauseProofObservations.push({
      methodKeys: ["EchoScoreFacetV3.pauseEchoScoreV3", "EchoScoreFacetV3.unpauseEchoScoreV3"],
      pauseRoute: "POST /v1/staking/commands/pause-echo-score-v3",
      unpauseRoute: "POST /v1/staking/commands/unpause-echo-score-v3",
      actor: "founder fixture signer with PLATFORM_ADMIN_ROLE",
      initialPaused,
      pauseTransactionHash,
      unpauseTransactionHash,
      pauseEvent: "EchoScoreFacetV3.Paused(address)",
      unpauseEvent: "EchoScoreFacetV3.Unpaused(address)",
      canonicalReadbacksMatched: true,
      httpReadbacksMatched: true,
      finalStateRestored: true,
      forkScopedFixture: true,
    });
  }, 180_000);

  it("proves the EchoScore oracle address update through HTTP on the local fork", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "EchoScore oracle address receipt proof", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.0005") },
    ])) return;

    const oracle = new Contract(diamondAddress, facetRegistry.EchoScoreFacetV3.abi, provider);
    const platformAdminRole = id("PLATFORM_ADMIN_ROLE");
    expect(await accessControl.hasRole(platformAdminRole, founderAddress)).toBe(true);
    const originalOracle = String(await oracle.getEchoScoreOracleV3());
    const targetOracle = outsiderWallet.address;
    expect(targetOracle.toLowerCase()).not.toBe(originalOracle.toLowerCase());
    let updateTransactionHash: string | null = null;
    let restoreTransactionHash: string | null = null;

    try {
      const update = await apiCall(port, "PATCH", "/v1/staking/commands/set-echo-score-oracle-v3", {
        apiKey: "founder-key",
        body: { newOracle: targetOracle },
      });
      expect(update.status, JSON.stringify(update.payload)).toBe(202);
      updateTransactionHash = extractTxHash(update.payload);
      await expectReceipt(updateTransactionHash);
      const updateReceipt = await provider.getTransactionReceipt(updateTransactionHash);
      expect(updateReceipt?.status).toBe(1);
      const updateEvent = (updateReceipt?.logs ?? []).flatMap((log) => {
        try {
          const parsed = oracle.interface.parseLog(log);
          return parsed?.name === "OracleUpdated" ? [parsed] : [];
        } catch {
          return [];
        }
      });
      expect(updateEvent).toHaveLength(1);
      expect(String(updateEvent[0]!.args.oldOracle).toLowerCase()).toBe(originalOracle.toLowerCase());
      expect(String(updateEvent[0]!.args.newOracle).toLowerCase()).toBe(targetOracle.toLowerCase());
      expect(String(await oracle.getEchoScoreOracleV3()).toLowerCase()).toBe(targetOracle.toLowerCase());

      const readback = await apiCall(port, "POST", "/v1/staking/queries/get-echo-score-oracle-v3", {
        apiKey: "read-key",
        body: {},
      });
      expect(readback.status).toBe(200);
      expect(String(readback.payload).toLowerCase()).toBe(targetOracle.toLowerCase());
    } finally {
      const currentOracle = String(await oracle.getEchoScoreOracleV3());
      if (currentOracle.toLowerCase() !== originalOracle.toLowerCase()) {
        const restore = await apiCall(port, "PATCH", "/v1/staking/commands/set-echo-score-oracle-v3", {
          apiKey: "founder-key",
          body: { newOracle: originalOracle },
        });
        expect(restore.status, JSON.stringify(restore.payload)).toBe(202);
        restoreTransactionHash = extractTxHash(restore.payload);
        await expectReceipt(restoreTransactionHash);
        const restoreReceipt = await provider.getTransactionReceipt(restoreTransactionHash);
        expect(restoreReceipt?.status).toBe(1);
        expect((restoreReceipt?.logs ?? []).some((log) => {
          try {
            return oracle.interface.parseLog(log)?.name === "OracleUpdated";
          } catch {
            return false;
          }
        })).toBe(true);
      }
      expect(String(await oracle.getEchoScoreOracleV3()).toLowerCase()).toBe(originalOracle.toLowerCase());
      // The generated getter uses a five-second response cache.
      await delay(6_000);
      const finalReadback = await apiCall(port, "POST", "/v1/staking/queries/get-echo-score-oracle-v3", {
        apiKey: "read-key",
        body: {},
      });
      expect(finalReadback.status).toBe(200);
      expect(String(finalReadback.payload).toLowerCase()).toBe(originalOracle.toLowerCase());
      oracleAddressProofObservations.push({
        methodKey: "EchoScoreFacetV3.setEchoScoreOracleV3",
        route: "PATCH /v1/staking/commands/set-echo-score-oracle-v3",
        actor: "founder fixture signer with PLATFORM_ADMIN_ROLE",
        originalOracle,
        targetOracle,
        restoredOracle: String(await oracle.getEchoScoreOracleV3()),
        updateTransactionHash,
        restoreTransactionHash,
        event: "EchoScoreFacetV3.OracleUpdated(address,address)",
        canonicalReadbackMatched: true,
        httpReadbackMatched: true,
        finalStateRestored: true,
        forkScopedFixture: true,
      });
    }
  }, 180_000);

  it("proves the ERC721 escrow receiver callback through HTTP on the local fork", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "ERC721 escrow receiver callback proof", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.0005") },
    ])) return;

    const escrow = new Contract(diamondAddress, facetRegistry.EscrowFacet.abi, provider);
    const tokenId = 900_000_000n + BigInt(Math.floor(Math.random() * 100_000));
    const callbackArgs = {
      arg0: founderAddress,
      arg1: outsiderWallet.address,
      arg2: tokenId.toString(),
      arg3: "0x1234",
    };
    const beforeOwner = String(await escrow.getOriginalOwner(tokenId));
    const beforeState = Number(await escrow.getAssetState(tokenId));
    expect(beforeOwner).toBe(ethers.ZeroAddress);
    expect(await escrow.isInEscrow(tokenId)).toBe(false);
    const transactionHashes: string[] = [];

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await apiCall(port, "POST", "/v1/marketplace/commands/on-erc721-received", {
        apiKey: "founder-key",
        body: callbackArgs,
      });
      expect(response.status, JSON.stringify(response.payload)).toBe(202);
      const txHash = extractTxHash(response.payload);
      transactionHashes.push(txHash);
      await expectReceipt(txHash);
      const receipt = await provider.getTransactionReceipt(txHash);
      expect(receipt?.status).toBe(1);
      expect(receipt?.logs).toHaveLength(0);
      const transaction = await provider.getTransaction(txHash);
      expect(transaction?.data.slice(0, 10)).toBe(escrow.interface.getFunction("onERC721Received")!.selector);
    }

    expect(await escrow.getOriginalOwner(tokenId)).toBe(beforeOwner);
    expect(Number(await escrow.getAssetState(tokenId))).toBe(beforeState);
    expect(await escrow.isInEscrow(tokenId)).toBe(false);
    expect(transactionHashes).toHaveLength(2);
  }, 120_000);

  it("proves emergency recovery start, approval, step execution, and completion on a local fork", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "emergency recovery lifecycle proof", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.00004") },
      { address: licenseeWallet.address, minimumWei: ethers.parseEther("0.00001") },
      { address: outsiderWallet.address, minimumWei: ethers.parseEther("0.00001") },
    ])) {
      return;
    }

    const submit = async (apiKey: string, route: string, body: Record<string, unknown>) => {
      const response = await apiCall(port, "POST", route, { apiKey, body });
      expect(response.status, `${route}: ${JSON.stringify(response.payload)}`).toBe(202);
      const txHash = extractTxHash(response.payload);
      await expectReceipt(txHash);
      const receipt = await provider.getTransactionReceipt(txHash);
      expect(receipt).not.toBeNull();
      expect(receipt!.status).toBe(1);
      return { txHash, receipt: receipt! };
    };

    const approverRole = id("RECOVERY_APPROVER_ROLE");
    const securityAdminRole = id("SECURITY_ADMIN_ROLE");
    const approvers = [founderAddress, licenseeWallet.address, outsiderWallet.address];
    const grants: Array<{ role: string; account: string }> = [];
    for (const account of approvers) {
      if (!(await accessControl.hasRole(approverRole, account))) {
        const grant = await submit("founder-key", "/v1/access-control/admin/grant-role", {
          role: approverRole,
          account,
          expiryTime: "0",
        });
        expect(grant.receipt.logs.some((log) => {
          try { return accessControl.interface.parseLog(log)?.name === "RoleGranted"; } catch { return false; }
        })).toBe(true);
        grants.push({ role: approverRole, account });
      }
    }
    if (!(await accessControl.hasRole(securityAdminRole, diamondAddress))) {
      const grant = await submit("founder-key", "/v1/access-control/admin/grant-role", {
        role: securityAdminRole,
        account: diamondAddress,
        expiryTime: "0",
      });
      expect(grant.receipt.logs.some((log) => {
        try { return accessControl.interface.parseLog(log)?.name === "RoleGranted"; } catch { return false; }
      })).toBe(true);
      grants.push({ role: securityAdminRole, account: diamondAddress });
    }

    const incidentWrite = await submit("founder-key", "/v1/emergency/admin/report-incident", {
      incidentType: "3",
      description: `local-fork recovery lifecycle ${Date.now()}`,
    });
    const incidentEvent = incidentWrite.receipt.logs.flatMap((log) => {
      try {
        const parsed = emergencyFacet.interface.parseLog(log);
        return parsed?.name === "IncidentReported" ? [parsed] : [];
      } catch {
        return [];
      }
    })[0];
    expect(incidentEvent).toBeDefined();
    const incidentId = String(incidentEvent!.args.incidentId);
    const originalEmergencyTimeout = await emergencyFacet.getEmergencyTimeout();
    const temporaryEmergencyTimeout = originalEmergencyTimeout + 37n;
    const firstStep = emergencyFacet.interface.encodeFunctionData("setEmergencyTimeout", [temporaryEmergencyTimeout]);
    const restoreStep = emergencyFacet.interface.encodeFunctionData("setEmergencyTimeout", [originalEmergencyTimeout]);

    const start = await submit("founder-key", "/v1/emergency/admin/start-recovery", {
      incidentId,
      steps: [firstStep, restoreStep],
    });
    expect(start.receipt.logs.some((log) => {
      try { return emergencyFacet.interface.parseLog(log)?.name === "RecoveryStarted"; } catch { return false; }
    })).toBe(true);
    const startedPlan = await emergencyFacet.getRecoveryPlan(incidentId);
    expect(startedPlan.steps).toEqual([firstStep, restoreStep]);
    expect(startedPlan.startTime).toBeGreaterThan(0n);

    for (const [index, apiKey] of ["founder-key", "licensee-key", "outsider-key"].entries()) {
      const approval = await submit(apiKey, "/v1/emergency/admin/approve-recovery", { incidentId });
      expect(approval.receipt.logs).toHaveLength(0);
      expect((await emergencyFacet.getRecoveryPlan(incidentId)).approvalCount).toBe(BigInt(index + 1));
    }
    expect((await emergencyFacet.getRecoveryPlan(incidentId)).approvedByGovernance).toBe(true);

    const timelockSeconds = 24 * 60 * 60 + 2;
    await provider.send("evm_increaseTime", [timelockSeconds]);
    await provider.send("evm_mine", []);
    for (const stepIndex of [0, 1]) {
      const execution = await submit("founder-key", "/v1/emergency/admin/execute-recovery-step", {
        incidentId,
        stepIndex: String(stepIndex),
      });
      expect(execution.receipt.logs.some((log) => {
        try {
          const parsed = emergencyFacet.interface.parseLog(log);
          return parsed?.name === "RecoveryStepExecuted" && parsed.args.stepIndex === BigInt(stepIndex) && parsed.args.success === true;
        } catch {
          return false;
        }
      })).toBe(true);
      const plan = await emergencyFacet.getRecoveryPlan(incidentId);
      expect(plan.results).toHaveLength(stepIndex + 1);
      expect(await emergencyFacet.getEmergencyTimeout()).toBe(stepIndex === 0 ? temporaryEmergencyTimeout : originalEmergencyTimeout);
    }

    const completion = await submit("founder-key", "/v1/emergency/admin/complete-recovery", { incidentId });
    expect(completion.receipt.logs.some((log) => {
      try {
        const parsed = emergencyFacet.interface.parseLog(log);
        return parsed?.name === "RecoveryCompleted" && parsed.args.incidentId === BigInt(incidentId) && parsed.args.success === true;
      } catch {
        return false;
      }
    })).toBe(true);
    expect(emergencyIncidentToObject(await emergencyFacet.getIncident(incidentId))).toMatchObject({
      id: incidentId,
      resolved: true,
    });
    const completedPlan = await emergencyFacet.getRecoveryPlan(incidentId);
    expect(completedPlan.completionTime).toBeGreaterThan(0n);
    expect(completedPlan.results).toHaveLength(2);

    // This test is run on a throwaway fork; role cleanup is included in its receipt set.
    for (const grant of grants) {
      const revoke = await apiCall(port, "DELETE", "/v1/access-control/commands/revoke-role", {
        apiKey: "founder-key",
        body: { ...grant, reason: "local-fork recovery proof cleanup" },
      });
      expect(revoke.status, JSON.stringify(revoke.payload)).toBe(202);
      await expectReceipt(extractTxHash(revoke.payload));
      expect(await accessControl.hasRole(grant.role, grant.account)).toBe(false);
    }
  }, 120_000);



  it("proves signed single and batch EchoScore updates through HTTP on the local fork", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "signed EchoScore update proof", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.0008") },
    ])) return;

    const oracle = new Contract(diamondAddress, facetRegistry.EchoScoreFacetV3.abi, provider);
    const originalOracle = String(await oracle.getEchoScoreOracleV3());
    const originalQuorum = await oracle.getOracleQuorumSigners();
    const originalSigners = [...originalQuorum.signers];
    const originalThreshold = BigInt(originalQuorum.threshold);
    const platformAdminRole = id("PLATFORM_ADMIN_ROLE");
    expect(await accessControl.hasRole(platformAdminRole, founderAddress)).toBe(true);
    const coder = ethers.AbiCoder.defaultAbiCoder();
    const buildSignedUpdate = async (voiceHash: string, nonce: string) => {
      const latestBlock = await provider.getBlock("latest");
      const timestamp = String(latestBlock?.timestamp ?? Math.floor(Date.now() / 1000));
      const qualityData = {
        completenessPercentage: "90", sampleRate: "44100", speechDuration: "20",
        hnr: "9000", jitterLocal: "100", shimmerLocal: "100",
      };
      const engagementData = {
        viewCount: "100", likeCount: "10", playCount: "30", ratingAverage: "450",
        ratingCount: "10", assetAge: "20",
      };
      const governanceData = { proposalsCreated: "2", proposalsActiveOrSuccess: "2", votesCast: "3" };
      const contributionData = {
        datasetCount: "1", totalAssetCount: "5", totalDuration: "100",
        hasCommercialDataset: true, hasHighQualityDataset: true,
      };
      const marketplaceData = {
        datasetSalesCount: "1", datasetSalesVolume: "1000", assetSalesCount: "2",
        assetSalesVolume: "500", royaltiesRealized: "800", royaltyPaymentsCount: "2",
      };
      const qualityHash = ethers.keccak256(coder.encode(
        ["uint256", "uint256", "uint256", "uint256", "uint256", "uint256"],
        Object.values(qualityData),
      ));
      const engagementHash = ethers.keccak256(coder.encode(
        ["uint256", "uint256", "uint256", "uint256", "uint256", "uint256"],
        Object.values(engagementData),
      ));
      const governanceHash = ethers.keccak256(coder.encode(
        ["uint256", "uint256", "uint256"], Object.values(governanceData),
      ));
      const contributionHash = ethers.keccak256(coder.encode(
        ["uint256", "uint256", "uint256", "bool", "bool"], Object.values(contributionData),
      ));
      const marketplaceHash = ethers.keccak256(coder.encode(
        ["uint256", "uint256", "uint256", "uint256", "uint256", "uint256"],
        Object.values(marketplaceData),
      ));
      const messageHash = ethers.keccak256(coder.encode(
        ["bytes32", "bytes32", "bytes32", "bytes32", "bytes32", "bytes32", "uint256", "uint256"],
        [voiceHash, qualityHash, engagementHash, governanceHash, contributionHash, marketplaceHash, nonce, timestamp],
      ));
      const signature = await founderWallet.signMessage(ethers.getBytes(messageHash));
      return {
        voiceHash,
        qualityData,
        engagementData,
        governanceData,
        contributionData,
        marketplaceData,
        nonce,
        timestamp,
        signature,
      };
    };
    const updateVoiceHash = id(`api05-echo-update-${Date.now()}`);
    const batchVoiceHashes = [id(`api05-echo-batch-a-${Date.now()}`), id(`api05-echo-batch-b-${Date.now()}`)];
    let oracleChangeTxHash: string | null = null;
    let updateTxHash: string | null = null;
    let batchTxHash: string | null = null;
    let restoreTxHash: string | null = null;

    try {
      if (originalOracle.toLowerCase() !== founderAddress.toLowerCase()) {
        const change = await apiCall(port, "PATCH", "/v1/staking/commands/set-echo-score-oracle-v3", {
          apiKey: "founder-key",
          body: { newOracle: founderAddress },
        });
        expect(change.status, JSON.stringify(change.payload)).toBe(202);
        oracleChangeTxHash = extractTxHash(change.payload);
        await expectReceipt(oracleChangeTxHash);
      }
      expect(String(await oracle.getEchoScoreOracleV3()).toLowerCase()).toBe(founderAddress.toLowerCase());
      if (originalThreshold !== 1n || originalSigners.length !== 1 ||
          originalSigners[0]!.toLowerCase() !== founderAddress.toLowerCase()) {
        const quorum = await apiCall(port, "PATCH", "/v1/staking/commands/set-oracle-quorum-signers", {
          apiKey: "founder-key",
          body: { signers: [founderAddress], threshold: "1" },
        });
        expect(quorum.status, JSON.stringify(quorum.payload)).toBe(202);
        await expectReceipt(extractTxHash(quorum.payload));
      }

      const update = await buildSignedUpdate(updateVoiceHash, "0");
      const single = await apiCall(port, "PATCH", "/v1/staking/commands/update-score", {
        apiKey: "founder-key", body: { update },
      });
      expect(single.status, JSON.stringify(single.payload)).toBe(202);
      updateTxHash = extractTxHash(single.payload);
      await expectReceipt(updateTxHash);
      const singleReceipt = await provider.getTransactionReceipt(updateTxHash);
      expect(singleReceipt?.status).toBe(1);
      const singleState = normalize(await oracle.getReputation(updateVoiceHash));
      expect((singleState as unknown[])[7]).toBe("1");

      const updates = await Promise.all(batchVoiceHashes.map((voiceHash) => buildSignedUpdate(voiceHash, "0")));
      const batch = await apiCall(port, "POST", "/v1/staking/commands/batch-update-scores", {
        apiKey: "founder-key", body: { updates },
      });
      expect(batch.status, JSON.stringify(batch.payload)).toBe(202);
      batchTxHash = extractTxHash(batch.payload);
      await expectReceipt(batchTxHash);
      const batchReceipt = await provider.getTransactionReceipt(batchTxHash);
      expect(batchReceipt?.status).toBe(1);
      const scoresUpdated = (batchReceipt?.logs ?? []).flatMap((log) => {
        try {
          const parsed = oracle.interface.parseLog(log);
          return parsed?.name === "ScoresUpdated" ? [parsed] : [];
        } catch {
          return [];
        }
      });
      expect(scoresUpdated).toHaveLength(1);
      expect(scoresUpdated[0]!.args.count).toBe(2n);
      for (const voiceHash of batchVoiceHashes) {
        expect((normalize(await oracle.getReputation(voiceHash)) as unknown[])[7]).toBe("1");
      }
      const batchReadback = await apiCall(port, "GET", `/v1/staking/queries/get-reputation?voiceHash=${encodeURIComponent(batchVoiceHashes[0]!)}`, {
        apiKey: "read-key",
      });
      expect(batchReadback.status).toBe(200);
      const expectedReadback = await oracle.getReputation(batchVoiceHashes[0]!);
      expect(batchReadback.payload).toEqual({
        totalReputation: String(expectedReadback[0]),
        voiceQualityScore: String(expectedReadback[1]),
        engagementScore: String(expectedReadback[2]),
        governanceScore: String(expectedReadback[3]),
        datasetScore: String(expectedReadback[4]),
        marketplaceScore: String(expectedReadback[5]),
        lastUpdated: String(expectedReadback[6]),
        updateCount: String(expectedReadback[7]),
      });
    } finally {
      const currentQuorum = await oracle.getOracleQuorumSigners();
      const currentSigners = [...currentQuorum.signers].map((address) => address.toLowerCase());
      if (BigInt(currentQuorum.threshold) !== originalThreshold ||
          currentSigners.length !== originalSigners.length ||
          originalSigners.some((address, index) => currentSigners[index] !== address.toLowerCase())) {
        const restoreQuorum = await apiCall(port, "PATCH", "/v1/staking/commands/set-oracle-quorum-signers", {
          apiKey: "founder-key",
          body: { signers: originalSigners, threshold: originalThreshold.toString() },
        });
        expect(restoreQuorum.status, JSON.stringify(restoreQuorum.payload)).toBe(202);
        await expectReceipt(extractTxHash(restoreQuorum.payload));
      }
      const currentOracle = String(await oracle.getEchoScoreOracleV3());
      if (currentOracle.toLowerCase() !== originalOracle.toLowerCase()) {
        const restore = await apiCall(port, "PATCH", "/v1/staking/commands/set-echo-score-oracle-v3", {
          apiKey: "founder-key", body: { newOracle: originalOracle },
        });
        expect(restore.status, JSON.stringify(restore.payload)).toBe(202);
        restoreTxHash = extractTxHash(restore.payload);
        await expectReceipt(restoreTxHash);
      }
      expect(String(await oracle.getEchoScoreOracleV3()).toLowerCase()).toBe(originalOracle.toLowerCase());
    }
  }, 180_000);

  it("proves degraded-mode configuration receipts remain indexable on the local fork", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "degraded-mode configuration receipt proof", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.0005") },
    ])) return;

    const staking = new Contract(diamondAddress, facetRegistry.StakingFacet.abi, provider);
    const platformAdminRole = id("PLATFORM_ADMIN_ROLE");
    expect(await accessControl.hasRole(platformAdminRole, founderAddress)).toBe(true);
    const originalConfig = await staking.getDegradedModeConfig();
    const original = {
      enabled: Boolean(originalConfig.enabled),
      staleAfterSeconds: BigInt(originalConfig.staleAfterSeconds),
      maxStakePerWallet: BigInt(originalConfig.maxStakePerWallet),
    };
    const target = { ...original, enabled: !original.enabled };
    let updateTransactionHash: string | null = null;
    let restoreTransactionHash: string | null = null;

    const readConfig = async () => {
      const config = await staking.getDegradedModeConfig();
      return {
        enabled: Boolean(config.enabled),
        staleAfterSeconds: BigInt(config.staleAfterSeconds),
        maxStakePerWallet: BigInt(config.maxStakePerWallet),
      };
    };
    const expectConfig = (actual: typeof original, expected: typeof original) => {
      expect(actual.enabled).toBe(expected.enabled);
      expect(actual.staleAfterSeconds).toBe(expected.staleAfterSeconds);
      expect(actual.maxStakePerWallet).toBe(expected.maxStakePerWallet);
    };

    try {
      const update = await apiCall(port, "PATCH", "/v1/staking/commands/set-degraded-mode-config", {
        apiKey: "founder-key",
        body: {
          enabled: target.enabled,
          staleAfterSeconds: target.staleAfterSeconds.toString(),
          maxStakePerWallet: target.maxStakePerWallet.toString(),
        },
      });
      expect(update.status, JSON.stringify(update.payload)).toBe(202);
      updateTransactionHash = extractTxHash(update.payload);
      await expectReceipt(updateTransactionHash);
      const updateReceipt = await provider.getTransactionReceipt(updateTransactionHash);
      expect(updateReceipt?.status).toBe(1);
      expect(updateReceipt?.logs).toHaveLength(0);
      expectConfig(await readConfig(), target);

      // The generated getter uses a five-second response cache.
      await delay(6_000);
      const readback = await apiCall(port, "POST", "/v1/staking/queries/get-degraded-mode-config", {
        apiKey: "read-key",
        body: {},
      });
      expect(readback.status).toBe(200);
      expect(readback.payload).toMatchObject({
        enabled: target.enabled,
        staleAfterSeconds: target.staleAfterSeconds.toString(),
        maxStakePerWallet: target.maxStakePerWallet.toString(),
      });
    } finally {
      const current = await readConfig();
      if (current.enabled !== original.enabled
        || current.staleAfterSeconds !== original.staleAfterSeconds
        || current.maxStakePerWallet !== original.maxStakePerWallet) {
        const restore = await apiCall(port, "PATCH", "/v1/staking/commands/set-degraded-mode-config", {
          apiKey: "founder-key",
          body: {
            enabled: original.enabled,
            staleAfterSeconds: original.staleAfterSeconds.toString(),
            maxStakePerWallet: original.maxStakePerWallet.toString(),
          },
        });
        expect(restore.status, JSON.stringify(restore.payload)).toBe(202);
        restoreTransactionHash = extractTxHash(restore.payload);
        await expectReceipt(restoreTransactionHash);
        const restoreReceipt = await provider.getTransactionReceipt(restoreTransactionHash);
        expect(restoreReceipt?.status).toBe(1);
        expect(restoreReceipt?.logs).toHaveLength(0);
      }
      expectConfig(await readConfig(), original);
      await delay(6_000);
      const finalReadback = await apiCall(port, "POST", "/v1/staking/queries/get-degraded-mode-config", {
        apiKey: "read-key",
        body: {},
      });
      expect(finalReadback.status).toBe(200);
      expect(finalReadback.payload).toMatchObject({
        enabled: original.enabled,
        staleAfterSeconds: original.staleAfterSeconds.toString(),
        maxStakePerWallet: original.maxStakePerWallet.toString(),
      });
      degradedModeConfigProofObservations.push({
        methodKey: "StakingFacet.setDegradedModeConfig",
        route: "PATCH /v1/staking/commands/set-degraded-mode-config",
        actor: "founder fixture signer with PLATFORM_ADMIN_ROLE",
        original: {
          enabled: original.enabled,
          staleAfterSeconds: original.staleAfterSeconds.toString(),
          maxStakePerWallet: original.maxStakePerWallet.toString(),
        },
        target: {
          enabled: target.enabled,
          staleAfterSeconds: target.staleAfterSeconds.toString(),
          maxStakePerWallet: target.maxStakePerWallet.toString(),
        },
        restored: {
          enabled: original.enabled,
          staleAfterSeconds: original.staleAfterSeconds.toString(),
          maxStakePerWallet: original.maxStakePerWallet.toString(),
        },
        updateTransactionHash,
        restoreTransactionHash,
        eventlessReceipt: true,
        canonicalReadbackMatched: true,
        httpReadbackMatched: true,
        finalStateRestored: true,
        forkScopedFixture: true,
      });
    }
  }, 180_000);

  it("proves AccessControlFacet setPaused through HTTP and restores the emergency state", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "access-control pause receipt proof", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.0005") },
    ])) return;

    const founderRole = id("FOUNDER_ROLE");
    const emergencyAdminRole = id("EMERGENCY_ADMIN_ROLE");
    expect(await accessControl.hasRole(founderRole, founderAddress)).toBe(true);
    expect(await accessControl.hasRole(emergencyAdminRole, founderAddress)).toBe(true);
    const originalState = BigInt(await emergencyFacet.getEmergencyState());
    expect(originalState, "the isolated fixture must start in NORMAL state").toBe(0n);
    const diamondAlreadyEmergencyAdmin = await accessControl.hasRole(emergencyAdminRole, diamondAddress);
    let roleGrantTransactionHash: string | null = null;
    let roleRevokeTransactionHash: string | null = null;
    let pauseTransactionHash: string | null = null;
    let resumeTransactionHash: string | null = null;
    let pausedState: bigint | null = null;

    try {
      // AccessControlFacet.setPaused makes an external self-call to EmergencyFacet,
      // so the diamond itself must hold EMERGENCY_ADMIN_ROLE for that nested call.
      if (!diamondAlreadyEmergencyAdmin) {
        const grant = await apiCall(port, "POST", "/v1/access-control/admin/grant-role", {
          apiKey: "founder-key",
          body: { role: emergencyAdminRole, account: diamondAddress, expiryTime: "0" },
        });
        expect(grant.status, JSON.stringify(grant.payload)).toBe(202);
        roleGrantTransactionHash = extractTxHash(grant.payload);
        await expectReceipt(roleGrantTransactionHash);
        expect(await accessControl.hasRole(emergencyAdminRole, diamondAddress)).toBe(true);
      }

      const pause = await apiCall(port, "POST", "/v1/access-control/admin/set-paused", {
        apiKey: "founder-key",
        body: { paused: true },
      });
      expect(pause.status, JSON.stringify(pause.payload)).toBe(202);
      pauseTransactionHash = extractTxHash(pause.payload);
      await expectReceipt(pauseTransactionHash);
      const pauseReceipt = await provider.getTransactionReceipt(pauseTransactionHash);
      expect(pauseReceipt?.status).toBe(1);
      const pauseEvents = (pauseReceipt?.logs ?? []).flatMap((log) => {
        try {
          const parsed = emergencyFacet.interface.parseLog(log);
          return parsed?.name === "EmergencyStateChanged" ? [parsed] : [];
        } catch {
          return [];
        }
      });
      expect(pauseEvents).toHaveLength(1);
      expect(BigInt(pauseEvents[0]!.args.previousState)).toBe(0n);
      pausedState = BigInt(pauseEvents[0]!.args.newState);
      expect([1n, 2n]).toContain(pausedState);
      expect(String(pauseEvents[0]!.args.triggeredBy).toLowerCase()).toBe(diamondAddress.toLowerCase());
      expect(BigInt(await emergencyFacet.getEmergencyState())).toBe(pausedState);

      await delay(6_000);
      const pausedReadback = await apiCall(port, "POST", "/v1/emergency/queries/get-emergency-state", {
        apiKey: "read-key",
        body: {},
      });
      expect(pausedReadback.status).toBe(200);
      expect(BigInt(pausedReadback.payload as string)).toBe(pausedState);
    } finally {
      if (BigInt(await emergencyFacet.getEmergencyState()) !== originalState) {
        const resume = await apiCall(port, "POST", "/v1/access-control/admin/set-paused", {
          apiKey: "founder-key",
          body: { paused: false },
        });
        expect(resume.status, JSON.stringify(resume.payload)).toBe(202);
        resumeTransactionHash = extractTxHash(resume.payload);
        await expectReceipt(resumeTransactionHash);
        const resumeReceipt = await provider.getTransactionReceipt(resumeTransactionHash);
        expect(resumeReceipt?.status).toBe(1);
        const resumeEvents = (resumeReceipt?.logs ?? []).flatMap((log) => {
          try {
            const parsed = emergencyFacet.interface.parseLog(log);
            return parsed?.name === "EmergencyStateChanged" ? [parsed] : [];
          } catch {
            return [];
          }
        });
        expect(resumeEvents).toHaveLength(1);
        expect(BigInt(resumeEvents[0]!.args.previousState)).toBe(pausedState);
        expect(BigInt(resumeEvents[0]!.args.newState)).toBe(0n);
        expect(String(resumeEvents[0]!.args.triggeredBy).toLowerCase()).toBe(diamondAddress.toLowerCase());
      }
      expect(BigInt(await emergencyFacet.getEmergencyState())).toBe(originalState);
      if (!diamondAlreadyEmergencyAdmin && await accessControl.hasRole(emergencyAdminRole, diamondAddress)) {
        const revoke = await apiCall(port, "DELETE", "/v1/access-control/commands/revoke-role", {
          apiKey: "founder-key",
          body: { role: emergencyAdminRole, account: diamondAddress, reason: "restore local-fork pause proof state" },
        });
        expect(revoke.status, JSON.stringify(revoke.payload)).toBe(202);
        roleRevokeTransactionHash = extractTxHash(revoke.payload);
        await expectReceipt(roleRevokeTransactionHash);
        expect(await accessControl.hasRole(emergencyAdminRole, diamondAddress)).toBe(false);
      }
      await delay(6_000);
      const restoredReadback = await apiCall(port, "POST", "/v1/emergency/queries/get-emergency-state", {
        apiKey: "read-key",
        body: {},
      });
      expect(restoredReadback.status).toBe(200);
      expect(BigInt(restoredReadback.payload as string)).toBe(originalState);
      accessControlPauseProofObservations.push({
        methodKey: "AccessControlFacet.setPaused",
        route: "POST /v1/access-control/admin/set-paused",
        actor: "founder fixture signer with FOUNDER_ROLE and EMERGENCY_ADMIN_ROLE",
        originalState: originalState.toString(),
        pausedState: pausedState?.toString() ?? null,
        restoredState: (await emergencyFacet.getEmergencyState()).toString(),
        diamondAlreadyEmergencyAdmin,
        roleGrantTransactionHash,
        roleRevokeTransactionHash,
        pauseTransactionHash,
        resumeTransactionHash,
        pauseEvent: `EmergencyStateChanged(0,${pausedState?.toString() ?? "unknown"})`,
        resumeEvent: `EmergencyStateChanged(${pausedState?.toString() ?? "unknown"},0)`,
        canonicalReadbacksMatched: true,
        httpReadbacksMatched: true,
        finalStateRestored: true,
        forkScopedFixture: true,
      });
    }
  }, 180_000);

  it("proves reversible staking tier configuration receipts", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "staking configuration proof", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.00002") },
    ])) return;

    const platformAdminRole = id("PLATFORM_ADMIN_ROLE");
    const roleWasGranted = await accessControl.hasRole(platformAdminRole, founderAddress);
    if (!roleWasGranted) {
      const grant = await apiCall(port, "POST", "/v1/access-control/commands/grant-role", {
        apiKey: "founder-key",
        body: { role: platformAdminRole, account: founderAddress, expiryTime: "0" },
      });
      expect(grant.status, JSON.stringify(grant.payload)).toBe(202);
      await expectReceipt(extractTxHash(grant.payload));
      expect(await accessControl.hasRole(platformAdminRole, founderAddress)).toBe(true);
    }

    const originalTier = await stakingFacet.getTierConfig();
    const submit = async (method: string, route: string, body: Record<string, unknown>) => {
      const response = await apiCall(port, method, route, { apiKey: "founder-key", body });
      expect(response.status, `${route}: ${JSON.stringify(response.payload)}`).toBe(202);
      const txHash = extractTxHash(response.payload);
      await expectReceipt(txHash);
      const receipt = await provider.getTransactionReceipt(txHash);
      expect(receipt?.status).toBe(1);
      return receipt!;
    };
    try {
      const currentThresholds = Array.from(originalTier[0], BigInt);
      const currentMultipliers = Array.from(originalTier[1], BigInt);
      const nextThresholds = currentThresholds.map((value, index) => value + BigInt(index + 1));
      const tierReceipt = await submit("POST", "/v1/staking/commands/queue-tier-config-update", {
        thresholds: nextThresholds.map(String),
        multipliers: currentMultipliers.map(String),
      });
      expect((await stakingFacet.getTierConfig())[0]).toEqual(nextThresholds);
      expect(tierReceipt.logs.some((log) => {
        try { return stakingFacet.interface.parseLog(log)?.name === "TierConfigUpdated"; } catch { return false; }
      })).toBe(true);
      const restoreTier = await submit("POST", "/v1/staking/commands/queue-tier-config-update", {
        thresholds: currentThresholds.map(String),
        multipliers: currentMultipliers.map(String),
      });
      expect((await stakingFacet.getTierConfig())[0]).toEqual(currentThresholds);
      expect(restoreTier.logs.some((log) => {
        try { return stakingFacet.interface.parseLog(log)?.name === "TierConfigUpdated"; } catch { return false; }
      })).toBe(true);
    } finally {
      if (!roleWasGranted) {
        const revoke = await apiCall(port, "DELETE", "/v1/access-control/commands/revoke-role", {
          apiKey: "founder-key",
          body: { role: platformAdminRole, account: founderAddress, reason: "local-fork staking configuration proof cleanup" },
        });
        expect(revoke.status, JSON.stringify(revoke.payload)).toBe(202);
        await expectReceipt(extractTxHash(revoke.payload));
        expect(await accessControl.hasRole(platformAdminRole, founderAddress)).toBe(false);
      }
    }
  }, 180_000);

  it("proves emergency timeout configuration receipts remain indexable on the local fork", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "emergency timeout configuration receipt proof", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.0005") },
    ])) return;

    const emergencyAdminRole = id("EMERGENCY_ADMIN_ROLE");
    expect(await accessControl.hasRole(emergencyAdminRole, founderAddress)).toBe(true);
    const originalTimeout = BigInt(await emergencyFacet.getEmergencyTimeout());
    const targetTimeout = originalTimeout === 7_201n ? 7_202n : 7_201n;
    let updateTransactionHash: string | null = null;
    let restoreTransactionHash: string | null = null;

    try {
      const update = await apiCall(port, "POST", "/v1/emergency/admin/set-emergency-timeout", {
        apiKey: "emergency-proof-key",
        body: { newTimeout: targetTimeout.toString() },
      });
      expect(update.status, JSON.stringify(update.payload)).toBe(202);
      updateTransactionHash = extractTxHash(update.payload);
      await expectReceipt(updateTransactionHash);
      const updateReceipt = await provider.getTransactionReceipt(updateTransactionHash);
      expect(updateReceipt?.status).toBe(1);
      expect(updateReceipt?.logs).toHaveLength(0);
      expect(BigInt(await emergencyFacet.getEmergencyTimeout())).toBe(targetTimeout);

      const readback = await apiCall(port, "POST", "/v1/emergency/queries/get-emergency-timeout", {
        apiKey: "read-key",
        body: {},
      });
      expect(readback.status).toBe(200);
      expect(BigInt(readback.payload as string)).toBe(targetTimeout);
    } finally {
      const currentTimeout = BigInt(await emergencyFacet.getEmergencyTimeout());
      if (currentTimeout !== originalTimeout) {
        const restore = await apiCall(port, "POST", "/v1/emergency/admin/set-emergency-timeout", {
          apiKey: "emergency-proof-key",
          body: { newTimeout: originalTimeout.toString() },
        });
        expect(restore.status, JSON.stringify(restore.payload)).toBe(202);
        restoreTransactionHash = extractTxHash(restore.payload);
        await expectReceipt(restoreTransactionHash);
        const restoreReceipt = await provider.getTransactionReceipt(restoreTransactionHash);
        expect(restoreReceipt?.status).toBe(1);
        expect(restoreReceipt?.logs).toHaveLength(0);
      }
      expect(BigInt(await emergencyFacet.getEmergencyTimeout())).toBe(originalTimeout);
      emergencyTimeoutProofObservations.push({
        methodKey: "EmergencyFacet.setEmergencyTimeout",
        route: "POST /v1/emergency/admin/set-emergency-timeout",
        actor: "founder fixture signer with EMERGENCY_ADMIN_ROLE",
        originalTimeout: originalTimeout.toString(),
        testTimeout: targetTimeout.toString(),
        restoredTimeout: (await emergencyFacet.getEmergencyTimeout()).toString(),
        updateTransactionHash,
        restoreTransactionHash,
        receiptLogs: 0,
        canonicalReadbackMatched: true,
        httpReadbackMatched: true,
        finalValueRestored: true,
      });
    }
  }, 180_000);

  it("proves proposal cancellation through HTTP and matches canceled proposal state", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "proposal cancellation receipt proof", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.0005") },
    ])) return;

    const governanceProposerRole = await proposalFacet.GOVERNANCE_PROPOSER_ROLE();
    expect(await accessControl.hasRole(governanceProposerRole, founderAddress)).toBe(true);
    const create = await apiCall(port, "POST", "/v1/governance/proposals", {
      apiKey: "founder-key",
      body: {
        targets: [diamondAddress],
        values: ["0"],
        calldatas: ["0x"],
        description: `API-05 cancellation proof ${Date.now()}`,
        proposalType: "0",
      },
    });
    expect(create.status, JSON.stringify(create.payload)).toBe(202);
    const createTransactionHash = extractTxHash(create.payload);
    await expectReceipt(createTransactionHash);
    const createReceipt = await provider.getTransactionReceipt(createTransactionHash);
    expect(createReceipt?.status).toBe(1);
    const createdEvents = (createReceipt?.logs ?? []).flatMap((log) => {
      try {
        const parsed = proposalFacet.interface.parseLog(log);
        return parsed?.name === "ProposalCreated" ? [parsed] : [];
      } catch {
        return [];
      }
    });
    expect(createdEvents).toHaveLength(1);
    const proposalId = BigInt(createdEvents[0]!.args.proposalId);
    expect(await proposalFacet.prState(proposalId)).toBe(0n);
    const deadlineBefore = BigInt(await proposalFacet.proposalDeadline(proposalId));

    const cancel = await apiCall(port, "DELETE", "/v1/governance/commands/cancel-proposal", {
      apiKey: "founder-key",
      body: { proposalId: proposalId.toString() },
    });
    expect(cancel.status, JSON.stringify(cancel.payload)).toBe(202);
    const cancelTransactionHash = extractTxHash(cancel.payload);
    await expectReceipt(cancelTransactionHash);
    const cancelReceipt = await provider.getTransactionReceipt(cancelTransactionHash);
    expect(cancelReceipt?.status).toBe(1);
    const canceledEvents = (cancelReceipt?.logs ?? []).flatMap((log) => {
      try {
        const parsed = proposalFacet.interface.parseLog(log);
        return parsed?.name === "ProposalCanceled" ? [parsed] : [];
      } catch {
        return [];
      }
    });
    expect(canceledEvents).toHaveLength(1);
    expect(BigInt(canceledEvents[0]!.args.proposalId)).toBe(proposalId);
    expect(await proposalFacet.prState(proposalId)).toBe(2n);

    const stateReadback = await apiCall(port, "GET", `/v1/governance/queries/pr-state?proposalId=${proposalId}`, {
      apiKey: "read-key",
    });
    expect(stateReadback.status).toBe(200);
    expect(BigInt(stateReadback.payload as string)).toBe(2n);
    const deadlineReadback = await apiCall(port, "GET", `/v1/governance/queries/proposal-deadline?proposalId=${proposalId}`, {
      apiKey: "read-key",
    });
    expect(deadlineReadback.status).toBe(200);
    expect(BigInt(deadlineReadback.payload as string)).toBe(deadlineBefore);

    proposalCancellationProofObservations.push({
      methodKey: "ProposalFacet.cancelProposal",
      route: "DELETE /v1/governance/commands/cancel-proposal",
      actor: "founder fixture signer and proposal proposer with the deployed GOVERNANCE_PROPOSER_ROLE",
      proposalId: proposalId.toString(),
      initialState: "Pending",
      finalState: "Canceled",
      createTransactionHash,
      cancelTransactionHash,
      creationEvent: "ProposalFacet.ProposalCreated",
      cancellationEvent: "ProposalFacet.ProposalCanceled",
      canonicalStateReadbackMatched: true,
      httpStateReadbackMatched: true,
      canonicalDeadlineReadbackMatched: true,
      httpDeadlineReadbackMatched: true,
      forkScopedFixture: true,
    });
  }, 180_000);

  it("proves ownership policy enforcement through HTTP on the disposable fork", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "ownership policy enforcement receipt proof", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.00002") },
    ])) return;

    expect((await ownershipFacet.owner()).toLowerCase()).toBe(founderAddress.toLowerCase());
    const initialValue = Boolean(await ownershipFacet.isOwnershipPolicyEnforced());
    const initialHttpReadback = await apiCall(port, "POST", "/v1/ownership/queries/is-ownership-policy-enforced", {
      apiKey: "read-key",
    });
    expect(initialHttpReadback.status).toBe(200);
    expect(initialHttpReadback.payload).toBe(initialValue);

    const submitPolicyEnforcement = async () => {
      const response = await apiCall(port, "PATCH", "/v1/ownership/commands/set-ownership-policy-enforced", {
        apiKey: "founder-key",
        body: { enforced: true },
      });
      expect(response.status, JSON.stringify(response.payload)).toBe(202);
      const txHash = extractTxHash(response.payload);
      await expectReceipt(txHash);
      const receipt = await provider.getTransactionReceipt(txHash);
      expect(receipt?.status).toBe(1);
      const policyEvents = (receipt?.logs ?? []).flatMap((log) => {
        try {
          const parsed = ownershipFacet.interface.parseLog(log);
          return parsed?.name === "OwnershipPolicyEnforcementSet" ? [parsed] : [];
        } catch {
          return [];
        }
      });
      expect(policyEvents).toHaveLength(1);
      expect(policyEvents[0]!.args.enforced).toBe(true);
      expect(await ownershipFacet.isOwnershipPolicyEnforced()).toBe(true);
      const httpReadback = await apiCall(port, "POST", "/v1/ownership/queries/is-ownership-policy-enforced", {
        apiKey: "read-key",
      });
      expect(httpReadback.status).toBe(200);
      expect(httpReadback.payload).toBe(true);
      return txHash;
    };

    const updateTransactionHash = await submitPolicyEnforcement();
    const replayTransactionHash = await submitPolicyEnforcement();
    ownershipPolicyProofObservations.push({
      methodKey: "OwnershipFacet.setOwnershipPolicyEnforced",
      route: "PATCH /v1/ownership/commands/set-ownership-policy-enforced",
      actor: "founder fixture signer and diamond owner",
      initialValue,
      finalValue: true,
      updateTransactionHash,
      replayTransactionHash,
      event: "OwnershipFacet.OwnershipPolicyEnforcementSet(bool)",
      canonicalReadbackMatched: true,
      httpReadbackMatched: true,
      replayStateUnchanged: true,
      forkScopedFixture: true,
      stateIsMonotonicOnContract: true,
    });
  }, 180_000);

  it("proves approved owner-target changes and restoration through HTTP on the disposable fork", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "owner-target approval receipt proof", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.00002") },
    ])) return;

    expect((await ownershipFacet.owner()).toLowerCase()).toBe(founderAddress.toLowerCase());
    const target = Wallet.createRandom().address;
    const initialApproval = Boolean(await ownershipFacet.isOwnerTargetApproved(target));
    let grantTransactionHash: string | null = null;
    let restoreTransactionHash: string | null = null;
    const submitApproval = async (approved: boolean) => {
      const response = await apiCall(port, "PATCH", "/v1/ownership/commands/set-approved-owner-target", {
        apiKey: "founder-key",
        body: { target, approved },
      });
      expect(response.status, JSON.stringify(response.payload)).toBe(202);
      const txHash = extractTxHash(response.payload);
      await expectReceipt(txHash);
      const receipt = await provider.getTransactionReceipt(txHash);
      expect(receipt?.status).toBe(1);
      const events = (receipt?.logs ?? []).flatMap((log) => {
        try {
          const parsed = ownershipFacet.interface.parseLog(log);
          return parsed?.name === "OwnershipTargetApprovalSet" ? [parsed] : [];
        } catch {
          return [];
        }
      });
      expect(events).toHaveLength(1);
      expect(String(events[0]!.args.target).toLowerCase()).toBe(target.toLowerCase());
      expect(events[0]!.args.approved).toBe(approved);
      expect(Boolean(await ownershipFacet.isOwnerTargetApproved(target))).toBe(approved);
      const httpReadback = await apiCall(port, "GET", `/v1/ownership/queries/is-owner-target-approved?target=${encodeURIComponent(target)}`, {
        apiKey: "read-key",
      });
      expect(httpReadback.status).toBe(200);
      expect(httpReadback.payload).toBe(approved);
      return txHash;
    };

    try {
      grantTransactionHash = await submitApproval(!initialApproval);
    } finally {
      const currentApproval = Boolean(await ownershipFacet.isOwnerTargetApproved(target));
      if (currentApproval !== initialApproval) {
        restoreTransactionHash = await submitApproval(initialApproval);
      }
    }
    expect(Boolean(await ownershipFacet.isOwnerTargetApproved(target))).toBe(initialApproval);
    ownershipTargetApprovalProofObservations.push({
      methodKey: "OwnershipFacet.setApprovedOwnerTarget",
      route: "PATCH /v1/ownership/commands/set-approved-owner-target",
      actor: "founder fixture signer and current diamond owner",
      target,
      initialApproval,
      temporaryApproval: !initialApproval,
      grantTransactionHash,
      restoreTransactionHash,
      event: "OwnershipFacet.OwnershipTargetApprovalSet(address,bool)",
      canonicalReadbacksMatched: true,
      httpReadbacksMatched: true,
      finalStateRestored: true,
      forkScopedFixture: true,
    });
  }, 180_000);

  it("proves ownership transfer proposal and cancellation through HTTP on the disposable fork", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "ownership transfer proposal and cancellation proof", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.00002") },
    ])) return;

    expect((await ownershipFacet.owner()).toLowerCase()).toBe(founderAddress.toLowerCase());
    const initialPendingOwner = String(await ownershipFacet.pendingOwner());
    expect(initialPendingOwner).toBe(ethers.ZeroAddress);
    const target = String(await paymentFacet.getUsdcToken());
    const initialTargetApproval = Boolean(await ownershipFacet.isOwnerTargetApproved(target));
    let temporaryTargetApprovalHash: string | null = null;
    let targetApprovalRestoreHash: string | null = null;
    if (!initialTargetApproval) {
      const approval = await apiCall(port, "PATCH", "/v1/ownership/commands/set-approved-owner-target", {
        apiKey: "founder-key",
        body: { target, approved: true },
      });
      expect(approval.status, JSON.stringify(approval.payload)).toBe(202);
      temporaryTargetApprovalHash = extractTxHash(approval.payload);
      await expectReceipt(temporaryTargetApprovalHash);
      const approvalReceipt = await provider.getTransactionReceipt(temporaryTargetApprovalHash);
      expect(approvalReceipt?.status).toBe(1);
      expect(Boolean(await ownershipFacet.isOwnerTargetApproved(target))).toBe(true);
    }
    const submit = async (
      method: "POST" | "DELETE",
      route: string,
      eventName: string,
      expectedPending: string,
      expectedEventPending = expectedPending,
    ) => {
      const response = await apiCall(port, method, route, {
        apiKey: "founder-key",
        ...(method === "POST" ? { body: { _newOwner: target } } : {}),
      });
      expect(response.status, JSON.stringify(response.payload)).toBe(202);
      const txHash = extractTxHash(response.payload);
      await expectReceipt(txHash);
      const receipt = await provider.getTransactionReceipt(txHash);
      expect(receipt?.status).toBe(1);
      const events = (receipt?.logs ?? []).flatMap((log) => {
        try {
          const parsed = ownershipFacet.interface.parseLog(log);
          return parsed?.name === eventName ? [parsed] : [];
        } catch {
          return [];
        }
      });
      expect(events).toHaveLength(1);
      expect(String(events[0]!.args.currentOwner).toLowerCase()).toBe(founderAddress.toLowerCase());
      expect(String(events[0]!.args.pendingOwner).toLowerCase()).toBe(expectedEventPending.toLowerCase());
      expect(String(await ownershipFacet.pendingOwner()).toLowerCase()).toBe(expectedPending.toLowerCase());
      await delay(6_000);
      const httpReadback = await apiCall(port, "POST", "/v1/ownership/queries/pending-owner", { apiKey: "read-key" });
      expect(httpReadback.status).toBe(200);
      expect(String(httpReadback.payload).toLowerCase()).toBe(expectedPending.toLowerCase());
      expect((await ownershipFacet.owner()).toLowerCase()).toBe(founderAddress.toLowerCase());
      return txHash;
    };

    let proposalTransactionHash: string | null = null;
    let cancelTransactionHash: string | null = null;
    try {
      proposalTransactionHash = await submit(
        "POST",
        "/v1/ownership/commands/propose-ownership-transfer",
        "OwnershipTransferProposed",
        target,
      );
      cancelTransactionHash = await submit(
        "DELETE",
        "/v1/ownership/commands/cancel-ownership-transfer",
        "OwnershipTransferCancelled",
        ethers.ZeroAddress,
        target,
      );
    } finally {
      if (String(await ownershipFacet.pendingOwner()).toLowerCase() !== ethers.ZeroAddress.toLowerCase()) {
        await submit("DELETE", "/v1/ownership/commands/cancel-ownership-transfer", "OwnershipTransferCancelled", ethers.ZeroAddress, target);
      }
      if (!initialTargetApproval && Boolean(await ownershipFacet.isOwnerTargetApproved(target))) {
        const restore = await apiCall(port, "PATCH", "/v1/ownership/commands/set-approved-owner-target", {
          apiKey: "founder-key",
          body: { target, approved: false },
        });
        expect(restore.status, JSON.stringify(restore.payload)).toBe(202);
        targetApprovalRestoreHash = extractTxHash(restore.payload);
        await expectReceipt(targetApprovalRestoreHash);
        expect(Boolean(await ownershipFacet.isOwnerTargetApproved(target))).toBe(false);
      }
    }
    expect(proposalTransactionHash).toMatch(/^0x[a-fA-F0-9]{64}$/u);
    expect(cancelTransactionHash).toMatch(/^0x[a-fA-F0-9]{64}$/u);
    expect((await ownershipFacet.owner()).toLowerCase()).toBe(founderAddress.toLowerCase());
    expect(String(await ownershipFacet.pendingOwner())).toBe(ethers.ZeroAddress);
    expect(Boolean(await ownershipFacet.isOwnerTargetApproved(target))).toBe(initialTargetApproval);
    ownershipTransferLifecycleProofObservations.push({
      methodKeys: ["OwnershipFacet.proposeOwnershipTransfer", "OwnershipFacet.cancelOwnershipTransfer"],
      proposalRoute: "POST /v1/ownership/commands/propose-ownership-transfer",
      cancelRoute: "DELETE /v1/ownership/commands/cancel-ownership-transfer",
      actor: "founder fixture signer and current diamond owner",
      target,
      targetWasApprovedDuringProposal: true,
      initialTargetApproval,
      temporaryTargetApprovalHash,
      targetApprovalRestoreHash,
      initialPendingOwner,
      proposalTransactionHash,
      cancelTransactionHash,
      proposedEvent: "OwnershipFacet.OwnershipTransferProposed(address,address)",
      cancelledEvent: "OwnershipFacet.OwnershipTransferCancelled(address,address)",
      ownerUnchanged: true,
      pendingOwnerRestored: true,
      canonicalReadbacksMatched: true,
      httpReadbacksMatched: true,
      forkScopedFixture: true,
    });
  }, 180_000);


  it("proves the exact PaymentFacet.revealWithdraw route and payout economics on a disposable fork", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "withdrawal reveal receipt proof", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.000012") },
      { address: marketplaceBuyerWallet.address, minimumWei: ethers.parseEther("0.000006") },
    ])) return;

    const snapshot = await captureReceiptSnapshot();
    try {
    await disableStakingHookForIsolatedUsdcPaymentProof();
    const createVoiceResponse = await apiCall(port, "POST", "/v1/voice-assets", {
      body: {
        ipfsHash: `QmWithdrawalReveal${Date.now()}`,
        royaltyRate: "100",
      },
    });
    expect(createVoiceResponse.status, JSON.stringify(createVoiceResponse.payload)).toBe(202);
    const voiceHash = String((createVoiceResponse.payload as Record<string, unknown>).result);
    const createVoiceTxHash = extractTxHash(createVoiceResponse.payload);
    await expectReceipt(createVoiceTxHash);
    const tokenId = BigInt(await waitFor(
      () => voiceAsset.getTokenId(voiceHash),
      (value) => BigInt(value as bigint) > 0n,
      "withdrawal reveal fixture token",
    ));
    await provider.send("evm_increaseTime", [86_401]);
    await provider.send("evm_mine", []);

    const paymentTokenAddress = await paymentFacet.getUsdcToken();
    const paymentToken = new Contract(paymentTokenAddress, [
      "function balanceOf(address account) view returns (uint256)",
      "function allowance(address owner,address spender) view returns (uint256)",
      "function approve(address spender,uint256 amount) returns (bool)",
    ], provider);
    const distributionAmount = 137n;
    expect(BigInt(await paymentToken.balanceOf(marketplaceBuyerWallet.address))).toBeGreaterThanOrEqual(distributionAmount);
    const buyerNonce = await provider.getTransactionCount(marketplaceBuyerWallet.address, "pending");
    const approvalReceipt = await (await paymentToken.connect(marketplaceBuyerWallet).approve(
      diamondAddress,
      distributionAmount,
      { nonce: buyerNonce },
    )).wait();
    expect(approvalReceipt?.status).toBe(1);
    expect(await paymentToken.allowance(marketplaceBuyerWallet.address, diamondAddress)).toBe(distributionAmount);
    const distributionReceipt = await (await paymentFacet.connect(marketplaceBuyerWallet).distributePayment(
      tokenId,
      distributionAmount,
      founderAddress,
      ethers.ZeroAddress,
      false,
      { nonce: buyerNonce + 1 },
    )).wait();
    expect(distributionReceipt?.status).toBe(1);

    const amount = BigInt(await paymentFacet.getPendingPayments(founderAddress));
    expect(amount).toBeGreaterThan(0n);
    const custodyBefore = BigInt(await paymentToken.balanceOf(diamondAddress));
    const payeeBefore = BigInt(await paymentToken.balanceOf(founderAddress));
    const nonce = BigInt(Date.now());
    const latestBeforeCommit = await provider.getBlock("latest");
    expect(latestBeforeCommit).not.toBeNull();
    const deadline = BigInt(latestBeforeCommit!.timestamp + 3_600);
    const commitment = ethers.solidityPackedKeccak256(
      ["address", "uint256", "uint256", "uint256"],
      [founderAddress, amount, nonce, deadline],
    );
    const commitResponse = await apiCall(port, "POST", "/v1/marketplace/commands/commit-withdraw", {
      apiKey: "founder-key",
      body: { commitHash: commitment },
    });
    expect(commitResponse.status, JSON.stringify(commitResponse.payload)).toBe(202);
    const commitTxHash = extractTxHash(commitResponse.payload);
    await expectReceipt(commitTxHash);
    const commitReceipt = await provider.getTransactionReceipt(commitTxHash);
    expect(commitReceipt?.status).toBe(1);
    expect((commitReceipt?.logs ?? []).some((log) => {
      try {
        const parsed = paymentFacet.interface.parseLog(log);
        return parsed?.name === "ClaimCommitted" && String(parsed.args.commitHash).toLowerCase() === commitment.toLowerCase();
      } catch {
        return false;
      }
    })).toBe(true);

    for (let block = 0; block < 4; block += 1) {
      await provider.send("evm_mine", []);
    }
    const revealResponse = await apiCall(port, "POST", "/v1/marketplace/commands/reveal-withdraw", {
      apiKey: "founder-key",
      body: { amount: amount.toString(), nonce: nonce.toString(), deadline: deadline.toString() },
    });
    expect(revealResponse.status, JSON.stringify(revealResponse.payload)).toBe(202);
    const revealTxHash = extractTxHash(revealResponse.payload);
    await expectReceipt(revealTxHash);
    const revealReceipt = await provider.getTransactionReceipt(revealTxHash);
    expect(revealReceipt?.status).toBe(1);
    const revealEvents = (revealReceipt?.logs ?? []).flatMap((log) => {
      try {
        const parsed = paymentFacet.interface.parseLog(log);
        return parsed ? [parsed] : [];
      } catch {
        return [];
      }
    });
    expect(revealEvents.map((event) => event.name)).toEqual(["ClaimRevealed", "USDCPaymentWithdrawn"]);
    expect(String(revealEvents[0]!.args.commitHash).toLowerCase()).toBe(commitment.toLowerCase());
    expect(String(revealEvents[1]!.args.amount)).toBe(amount.toString());

    const custodyAfter = BigInt(await paymentToken.balanceOf(diamondAddress));
    const payeeAfter = BigInt(await paymentToken.balanceOf(founderAddress));
    expect(await paymentFacet.getPendingPayments(founderAddress)).toBe(0n);
    const custodyDelta = assertExactAmountDelta("withdrawalReveal.custody", custodyBefore, custodyAfter, -amount);
    const payeeDelta = assertExactAmountDelta("withdrawalReveal.payee", payeeBefore, payeeAfter, amount);
    assertConservedDeltas("withdrawalReveal.conservation", [custodyDelta.delta, payeeDelta.delta]);
    withdrawalRevealProofObservations.push({
      methodKey: "PaymentFacet.revealWithdraw",
      route: "POST /v1/marketplace/commands/reveal-withdraw",
      actor: founderAddress,
      tokenId: tokenId.toString(),
      amount: amount.toString(),
      nonce: nonce.toString(),
      deadline: deadline.toString(),
      createVoiceTxHash,
      commitTxHash,
      revealTxHash,
      receiptStatus: Number(revealReceipt!.status),
      receiptBlockNumber: revealReceipt!.blockNumber,
      eventNames: revealEvents.map((event) => event.name),
      pendingAfterReveal: String(await paymentFacet.getPendingPayments(founderAddress)),
      custodyDelta: custodyDelta.delta.toString(),
      payeeDelta: payeeDelta.delta.toString(),
      conservation: "0",
      isolatedFork: true,
    });
    } finally {
      expect(await restoreReceiptSnapshot(snapshot)).toBe(true);
    }
  }, 240_000);

  // This scenario intentionally transfers ownership to the USDC contract; keep it last so it cannot contaminate later fork scenarios.
  it("proves immediate ownership transfer to a reviewed contract target on the local fork", async (ctx) => {
    if (!isLoopbackRpcUrl(activeRpcUrl)) {
      ctx.skip();
      return;
    }
    if (await skipWhenFundingBlocked(ctx, "immediate ownership transfer proof", [
      { address: founderAddress, minimumWei: ethers.parseEther("0.0005") },
    ])) return;

    const ownership = new Contract(diamondAddress, facetRegistry.OwnershipFacet.abi, provider);
    const originalOwner = String(await ownership.owner());
    const target = String(await paymentFacet.getUsdcToken());
    expect(originalOwner.toLowerCase()).toBe(founderAddress.toLowerCase());
    expect(target).not.toBe(ethers.ZeroAddress);
    expect(await provider.getCode(target)).not.toBe("0x");
    if (!(await ownership.isOwnerTargetApproved(target))) {
      const approve = await apiCall(port, "PATCH", "/v1/ownership/commands/set-approved-owner-target", {
        apiKey: "founder-key",
        body: { target, approved: true },
      });
      expect(approve.status, JSON.stringify(approve.payload)).toBe(202);
      await expectReceipt(extractTxHash(approve.payload));
    }

    const transfer = await apiCall(port, "POST", "/v1/ownership/commands/transfer-ownership", {
      apiKey: "founder-key",
      body: { _newOwner: target },
    });
    expect(transfer.status, JSON.stringify(transfer.payload)).toBe(202);
    const txHash = extractTxHash(transfer.payload);
    await expectReceipt(txHash);
    const receipt = await provider.getTransactionReceipt(txHash);
    expect(receipt?.status).toBe(1);
    const transferred = (receipt?.logs ?? []).flatMap((log) => {
      try {
        const parsed = ownership.interface.parseLog(log);
        return parsed?.name === "OwnershipTransferred" ? [parsed] : [];
      } catch {
        return [];
      }
    });
    expect(transferred).toHaveLength(1);
    expect(String(transferred[0]!.args.previousOwner).toLowerCase()).toBe(originalOwner.toLowerCase());
    expect(String(transferred[0]!.args.newOwner).toLowerCase()).toBe(target.toLowerCase());
    expect(String(await ownership.owner()).toLowerCase()).toBe(target.toLowerCase());
  }, 120_000);
});
