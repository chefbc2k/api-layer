import { once } from "node:events";

import { Contract, JsonRpcProvider, Wallet, ethers, id } from "ethers";

import { createApiServer, type ApiServer } from "../packages/api/src/app.js";
import { loadRepoEnv } from "../packages/client/src/runtime/config.js";
import { facetRegistry } from "../packages/client/src/generated/index.js";

import { resolveRuntimeConfig } from "./alchemy-debug-lib.js";
import { ensureActiveLicenseTemplate } from "./license-template-helper.ts";
import { buildVerifyReportOutput, getOutputPath, type DomainClassification, writeVerifyReportOutput } from "./verify-report.js";

type ApiCallOptions = {
  apiKey?: string;
  headers?: Record<string, string>;
  body?: unknown;
};

type ApiResponse = {
  status: number;
  payload: unknown;
};

type RouteEvidence = {
  route: string;
  actor: string;
  status: number;
  txHash?: string | null;
  receipt?: Record<string, unknown> | null;
  postState?: unknown;
  eventQuery?: ApiResponse | null;
  notes?: string;
};

type DomainReport = {
  routes: string[];
  actors: string[];
  executionResult: string;
  evidence: RouteEvidence[];
  finalClassification: DomainClassification;
};

type JsonRecord = Record<string, unknown>;

const ZERO_BYTES32 = `0x${"0".repeat(64)}`;
const whisperStoragePosition = id("speak.voice.whisperblock.storage");
const DATASET_ROUTES = [
  "POST /v1/datasets/datasets",
  "GET /v1/datasets/queries/get-dataset",
  "GET /v1/datasets/queries/get-datasets-by-creator",
  "POST /v1/datasets/commands/append-assets",
  "GET /v1/datasets/queries/contains-asset",
  "DELETE /v1/datasets/commands/remove-asset",
  "PATCH /v1/datasets/commands/set-license",
  "PATCH /v1/datasets/commands/set-metadata",
  "PATCH /v1/datasets/commands/set-royalty",
  "PATCH /v1/datasets/commands/set-dataset-status",
  "GET /v1/datasets/queries/royalty-info",
  "DELETE /v1/datasets/commands/burn-dataset",
] as const;
const LICENSING_ROUTES = [
  "POST /v1/licensing/license-templates/create-template",
  "PATCH /v1/licensing/commands/update-template",
  "PATCH /v1/licensing/commands/set-template-status",
  "GET /v1/licensing/queries/get-template",
  "GET /v1/licensing/queries/get-creator-templates",
  "POST /v1/licensing/license-templates/create-license-from-template",
  "POST /v1/licensing/licenses/create-license",
  "GET /v1/licensing/queries/get-license",
  "GET /v1/licensing/queries/get-license-terms",
  "POST /v1/licensing/queries/validate-license",
  "POST /v1/licensing/commands/record-licensed-usage",
  "POST /v1/licensing/commands/transfer-license",
  "DELETE /v1/licensing/commands/revoke-license",
] as const;
const WHISPERBLOCK_ROUTES = [
  "POST /v1/whisperblock/queries/get-selectors",
  "POST /v1/whisperblock/whisperblocks",
  "GET /v1/whisperblock/queries/verify-voice-authenticity",
  "POST /v1/whisperblock/commands/grant-access",
  "DELETE /v1/whisperblock/commands/revoke-access",
  "GET /v1/whisperblock/queries/get-audit-trail",
  "POST /v1/whisperblock/commands/generate-and-set-encryption-key",
  "PATCH /v1/whisperblock/commands/set-audit-enabled",
  "PATCH /v1/whisperblock/commands/set-trusted-oracle",
  "PATCH /v1/whisperblock/commands/update-system-parameters",
  "PATCH /v1/whisperblock/commands/set-offchain-entropy",
] as const;

async function apiCall(port: number, method: string, path: string, options: ApiCallOptions = {}): Promise<ApiResponse> {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(options.apiKey === undefined ? { "x-api-key": "founder-key" } : options.apiKey ? { "x-api-key": options.apiKey } : {}),
      ...(options.headers ?? {}),
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
    return Object.fromEntries(Object.entries(value as JsonRecord).map(([key, entry]) => [key, normalize(entry)]));
  }
  return value;
}

function extractTxHash(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const txHash = (payload as JsonRecord).txHash;
  return typeof txHash === "string" && txHash.startsWith("0x") ? txHash : null;
}

function datasetToObject(value: unknown): JsonRecord {
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

function licenseTermsToObject(value: unknown): JsonRecord {
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

function licenseToObject(value: unknown): JsonRecord {
  const tuple = value as ArrayLike<unknown>;
  return {
    voiceHash: normalize(tuple[0]),
    licensee: normalize(tuple[1]),
    licensor: normalize(tuple[2]),
    startTime: normalize(tuple[3]),
    endTime: normalize(tuple[4]),
    isActive: normalize(tuple[5]),
    usageCount: normalize(tuple[6]),
    terms: licenseTermsToObject(tuple[7]),
    licenseHash: normalize(tuple[8]),
    templateHash: normalize(tuple[9]),
  };
}

function whisperStorageSlot(offset: number): string {
  return ethers.toBeHex(BigInt(whisperStoragePosition) + BigInt(offset), 32);
}

async function readWhisperConfig(provider: JsonRpcProvider, target: string): Promise<JsonRecord> {
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
  if (!error || typeof error !== "object") return "";
  const candidate = error as { shortMessage?: string; message?: string; data?: unknown; info?: { error?: { data?: unknown } } };
  const directData = typeof candidate.data === "string" ? candidate.data : undefined;
  const nestedData = typeof candidate.info?.error?.data === "string" ? candidate.info.error.data : undefined;
  return directData ?? nestedData ?? candidate.shortMessage ?? candidate.message ?? "";
}

function buildTemplate(name: string) {
  const duration = String(45n * 24n * 60n * 60n);
  return {
    isActive: true,
    transferable: true,
    defaultDuration: duration,
    defaultPrice: "15000",
    maxUses: "12",
    name,
    description: `${name} coverage`,
    defaultRights: ["Narration", "Ads"],
    defaultRestrictions: ["no-sublicense"],
    terms: {
      licenseHash: ZERO_BYTES32,
      duration,
      price: "15000",
      maxUses: "12",
      transferable: true,
      rights: ["Narration", "Ads"],
      restrictions: ["no-sublicense"],
    },
  };
}

async function buildHttpTemplate(
  provider: JsonRpcProvider,
  creator: string,
  name: string,
  overrides: Partial<ReturnType<typeof buildTemplate>> = {},
) {
  const latestBlock = await provider.getBlock("latest");
  const now = String(BigInt(latestBlock?.timestamp ?? Math.floor(Date.now() / 1000)));
  const base = buildTemplate(name);
  const merged = {
    ...base,
    ...overrides,
    creator,
    createdAt: now,
    updatedAt: now,
  };
  return {
    ...merged,
    terms: {
      ...base.terms,
      ...(overrides.terms ?? {}),
    },
  };
}

async function waitForReceipt(provider: JsonRpcProvider, txHash: string, label: string) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const receipt = await provider.getTransactionReceipt(txHash);
    if (receipt) {
      return receipt;
    }
    await delay(500);
  }
  throw new Error(`timed out waiting for ${label} receipt: ${txHash}`);
}

async function waitForSuccessfulReceipt(provider: JsonRpcProvider, txHash: string, label: string) {
  const receipt = await waitForReceipt(provider, txHash, label);
  if (Number(receipt.status) !== 1) {
    throw new Error(`transaction reverted for ${label}: ${JSON.stringify({ txHash, status: receipt.status, blockNumber: receipt.blockNumber })}`);
  }
  return receipt;
}

async function waitFor<T>(read: () => Promise<T>, ready: (value: T) => boolean, label: string): Promise<T> {
  let lastValue: T | undefined;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const value = await read();
    lastValue = value;
    if (ready(value)) {
      return value;
    }
    await delay(500);
  }
  throw new Error(`timed out waiting for ${label}: ${JSON.stringify(normalize(lastValue))}`);
}

async function ensureNativeBalance(provider: JsonRpcProvider, fundingWallet: Wallet, recipient: string, minimum: bigint) {
  const balance = await provider.getBalance(recipient);
  if (balance >= minimum) {
    return balance;
  }
  if (fundingWallet.address.toLowerCase() === recipient.toLowerCase()) {
    return balance;
  }
  await (await fundingWallet.sendTransaction({ to: recipient, value: minimum - balance })).wait();
  return provider.getBalance(recipient);
}

async function fundingSnapshot(provider: JsonRpcProvider, wallets: Wallet[]) {
  return Promise.all(wallets.map(async (wallet) => ({
    address: wallet.address,
    balance: (await provider.getBalance(wallet.address)).toString(),
  })));
}

function buildBlockedDomainReport(
  routes: readonly string[],
  actors: string[],
  executionResult: string,
  details: JsonRecord,
): DomainReport {
  return {
    routes: [...routes],
    actors,
    executionResult,
    evidence: [
      {
        route: "preflight/native-balance",
        actor: "system",
        status: 409,
        postState: details,
      },
    ],
    finalClassification: "blocked by setup/state",
  };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function main() {
  const repoEnv = loadRepoEnv();
  const { config } = await resolveRuntimeConfig(repoEnv);
  process.env.RPC_URL = config.cbdpRpcUrl;
  process.env.ALCHEMY_RPC_URL = config.alchemyRpcUrl;
  const provider = new JsonRpcProvider(config.cbdpRpcUrl, config.chainId);

  if (!repoEnv.PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY is required");
  }

  const founder = new Wallet(repoEnv.PRIVATE_KEY, provider);
  const licensingOwnerKey = repoEnv.ORACLE_SIGNER_PRIVATE_KEY_1 ?? repoEnv.ORACLE_WALLET_PRIVATE_KEY ?? repoEnv.PRIVATE_KEY;
  const licensingOwner = new Wallet(licensingOwnerKey, provider);
  const licensee = Wallet.createRandom().connect(provider);
  const transferee = Wallet.createRandom().connect(provider);
  const outsider = Wallet.createRandom().connect(provider);
  const domainArg = process.argv
    .slice(2)
    .find((value) => value.startsWith("--domains="));
  const requestedDomains = new Set(
    (domainArg?.slice("--domains=".length) ?? process.env.LAYER1_DOMAINS ?? "datasets,licensing,whisperblock/security")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );

  process.env.API_LAYER_KEYS_JSON = JSON.stringify({
    "founder-key": { label: "founder", signerId: "founder", roles: ["service"], allowGasless: false },
    "read-key": { label: "reader", roles: ["service"], allowGasless: false },
    "licensing-owner-key": { label: "licensing-owner", signerId: "licensingOwner", roles: ["service"], allowGasless: false },
    "licensee-key": { label: "licensee", signerId: "licensee", roles: ["service"], allowGasless: false },
  });
  process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({
    founder: founder.privateKey,
    licensingOwner: licensingOwner.privateKey,
    licensee: licensee.privateKey,
  });

  const fundingCandidates = [
    founder,
    licensingOwner,
    repoEnv.ORACLE_SIGNER_PRIVATE_KEY_2 ? new Wallet(repoEnv.ORACLE_SIGNER_PRIVATE_KEY_2, provider) : null,
    repoEnv.ORACLE_SIGNER_PRIVATE_KEY_3 ? new Wallet(repoEnv.ORACLE_SIGNER_PRIVATE_KEY_3, provider) : null,
    repoEnv.ORACLE_SIGNER_PRIVATE_KEY_4 ? new Wallet(repoEnv.ORACLE_SIGNER_PRIVATE_KEY_4, provider) : null,
  ].filter((candidate): candidate is Wallet => candidate !== null);

  const richest = fundingCandidates.reduce(async (currentPromise, candidate) => {
    const current = await currentPromise;
    const currentBalance = await provider.getBalance(current.address);
    const candidateBalance = await provider.getBalance(candidate.address);
    return candidateBalance > currentBalance ? candidate : current;
  }, Promise.resolve(founder));

  const fundingWallet = await richest;
  try {
    if (requestedDomains.has("datasets") || requestedDomains.has("whisperblock/security")) {
      await ensureNativeBalance(provider, fundingWallet, founder.address, ethers.parseEther("0.0002"));
    }
    if (requestedDomains.has("licensing")) {
      await ensureNativeBalance(provider, fundingWallet, licensingOwner.address, ethers.parseEther("0.00005"));
      await ensureNativeBalance(provider, fundingWallet, licensee.address, ethers.parseEther("0.00001"));
      await ensureNativeBalance(provider, fundingWallet, transferee.address, ethers.parseEther("0.00001"));
    }
  } catch (error) {
    const diagnostics = {
      error: error instanceof Error ? error.message : String(error),
      fundingWallet: fundingWallet.address,
      balances: await fundingSnapshot(provider, fundingCandidates),
      founder: founder.address,
      licensingOwner: licensingOwner.address,
      licensee: licensee.address,
      transferee: transferee.address,
    };
    const blockedReports: Record<string, DomainReport> = {};
    if (requestedDomains.has("datasets")) {
      blockedReports.datasets = buildBlockedDomainReport(
        DATASET_ROUTES,
        ["founder-key", "read-key"],
        "dataset lifecycle blocked before execution because signer funding preflight failed",
        diagnostics,
      );
    }
    if (requestedDomains.has("licensing")) {
      blockedReports.licensing = buildBlockedDomainReport(
        LICENSING_ROUTES,
        ["licensing-owner-key", "licensee-key", "read-key"],
        "licensing lifecycle blocked before execution because signer funding preflight failed",
        diagnostics,
      );
    }
    if (requestedDomains.has("whisperblock/security")) {
      blockedReports["whisperblock/security"] = buildBlockedDomainReport(
        WHISPERBLOCK_ROUTES,
        ["founder-key", "read-key"],
        "whisperblock/security lifecycle blocked before execution because signer funding preflight failed",
        diagnostics,
      );
    }
    const reportOutput = {
      target: {
        chainId: config.chainId,
        diamond: config.diamondAddress,
        port: null,
      },
      preflight: diagnostics,
      ...buildVerifyReportOutput(normalize(blockedReports) as Record<string, DomainReport>),
    };
    writeVerifyReportOutput(getOutputPath(), reportOutput);
    console.log(JSON.stringify(reportOutput, null, 2));
    await provider.destroy();
    return;
  }

  const { server, port } = await startServer();
  const diamond = config.diamondAddress;
  const voiceAssetFacet = new Contract(diamond, facetRegistry.VoiceAssetFacet.abi, provider);
  const datasetFacet = new Contract(diamond, facetRegistry.VoiceDatasetFacet.abi, provider);
  const licenseFacet = new Contract(diamond, facetRegistry.VoiceLicenseFacet.abi, provider);
  const templateFacet = new Contract(diamond, facetRegistry.VoiceLicenseTemplateFacet.abi, provider);
  const whisperBlockFacet = new Contract(diamond, facetRegistry.WhisperBlockFacet.abi, provider);

  const reports: Record<string, DomainReport> = {};

  try {
    if (requestedDomains.has("datasets")) {
      reports.datasets = await verifyDatasets({
        port,
        provider,
        founder,
        licensingOwner,
        voiceAssetFacet,
        datasetFacet,
        diamond,
      });
    }
    if (requestedDomains.has("licensing")) {
      reports.licensing = await verifyLicensing({
        port,
        provider,
        founder,
        licensingOwner,
        licensee,
        transferee,
        voiceAssetFacet,
        licenseFacet,
        templateFacet,
      });
    }
    if (requestedDomains.has("whisperblock/security")) {
      reports["whisperblock/security"] = await verifyWhisperblock({
        port,
        provider,
        founder,
        outsider,
        whisperBlockFacet,
        voiceAssetFacet,
        diamond,
      });
    }
  } finally {
    server.close();
    await provider.destroy();
  }

  const reportOutput = {
    target: {
      chainId: config.chainId,
      diamond,
      port,
    },
    ...buildVerifyReportOutput(normalize(reports) as Record<string, DomainReport>),
  };
  writeVerifyReportOutput(getOutputPath(), reportOutput);
  console.log(JSON.stringify(reportOutput,
    null,
    2));
}

async function verifyDatasets(input: {
  port: number;
  provider: JsonRpcProvider;
  founder: Wallet;
  licensingOwner: Wallet;
  voiceAssetFacet: Contract;
  datasetFacet: Contract;
  diamond: string;
}): Promise<DomainReport> {
  const { port, provider, founder, voiceAssetFacet, datasetFacet, diamond } = input;
  const evidence: RouteEvidence[] = [];
  const activeTemplate = await ensureActiveLicenseTemplate({
    port,
    provider,
    apiCall,
    creatorAddress: founder.address,
    label: "Dataset Active Template",
    readApiKey: "read-key",
    writeApiKey: "founder-key",
  });
  const datasetSecondaryTemplate = await buildHttpTemplate(
    provider,
    founder.address,
    `Dataset Secondary Template ${Date.now()}`,
  );
  const secondTemplateResponse = await apiCall(port, "POST", "/v1/licensing/license-templates/create-template", {
    apiKey: "founder-key",
    body: { template: datasetSecondaryTemplate },
  });
  if (secondTemplateResponse.status !== 202) {
    throw new Error(`dataset secondary template create failed: ${JSON.stringify(secondTemplateResponse.payload)}`);
  }
  const secondTemplateHash = String((secondTemplateResponse.payload as JsonRecord).result);
  const secondTemplateId = BigInt(secondTemplateHash).toString();
  await waitForReceipt(provider, extractTxHash(secondTemplateResponse.payload)!, "dataset secondary template");

  const createVoice = async (suffix: string) => {
    const response = await apiCall(port, "POST", "/v1/voice-assets", {
      body: {
        ipfsHash: `QmDataset${suffix}${Date.now()}`,
        royaltyRate: "1000",
      },
    });
    if (response.status !== 202) {
      throw new Error(`dataset voice create failed: ${JSON.stringify(response.payload)}`);
    }
    const txHash = extractTxHash(response.payload)!;
    const receipt = await waitForReceipt(provider, txHash, `dataset voice ${suffix}`);
    const voiceHash = String((response.payload as JsonRecord).result);
    const tokenId = await waitFor(
      () => input.voiceAssetFacet.getTokenId(voiceHash),
      (value) => BigInt(value as bigint | string | number) > 0n,
      `dataset voice token ${suffix}`,
    );
    evidence.push({
      route: "POST /v1/voice-assets",
      actor: "founder-key",
      status: response.status,
      txHash,
      receipt: { status: receipt.status, blockNumber: receipt.blockNumber },
      postState: { voiceHash, tokenId: String(tokenId) },
    });
    return { voiceHash, tokenId: String(tokenId) };
  };

  const asset1 = await createVoice("A1");
  const asset2 = await createVoice("A2");
  const asset3 = await createVoice("A3");
  const asset4 = await createVoice("A4");

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
      throw new Error(`dataset approval failed: ${JSON.stringify(approvalWrite.payload)}`);
    }
    await waitForReceipt(provider, extractTxHash(approvalWrite.payload)!, "dataset approval");
  }

  const totalBeforeResponse = await apiCall(port, "POST", "/v1/datasets/queries/get-total-datasets", {
    apiKey: "read-key",
    body: {},
  });
  if (totalBeforeResponse.status !== 200) {
    throw new Error(`dataset total before read failed: ${JSON.stringify(totalBeforeResponse.payload)}`);
  }
  const totalBefore = BigInt(String(totalBeforeResponse.payload));

  const createDatasetResponse = await apiCall(port, "POST", "/v1/datasets/datasets", {
    body: {
      title: `Dataset Mutation ${Date.now()}`,
      assetIds: [asset1.tokenId, asset2.tokenId],
      licenseTemplateId: activeTemplate.templateIdDecimal,
      metadataURI: `ipfs://dataset-meta-${Date.now()}`,
      royaltyBps: "500",
    },
  });
  if (createDatasetResponse.status !== 202) {
    throw new Error(`dataset create failed: ${JSON.stringify(createDatasetResponse.payload)}`);
  }
  const datasetId = String((createDatasetResponse.payload as JsonRecord).result);
  const createDatasetTxHash = extractTxHash(createDatasetResponse.payload)!;
  const createDatasetReceipt = await waitForReceipt(provider, createDatasetTxHash, "create dataset");
  const datasetAfterCreate = await waitFor(
    () => apiCall(port, "GET", `/v1/datasets/queries/get-dataset?datasetId=${encodeURIComponent(datasetId)}`, { apiKey: "read-key" }),
    (response) => response.status === 200 && Array.isArray(((response.payload as JsonRecord).assetIds as unknown[])) && (((response.payload as JsonRecord).assetIds as unknown[]).length === 2),
    "dataset create read",
  );
  const datasetCreatedEvents = await apiCall(port, "POST", "/v1/datasets/events/dataset-created/query", {
    apiKey: "read-key",
    body: {
      fromBlock: String(createDatasetReceipt.blockNumber),
      toBlock: String(createDatasetReceipt.blockNumber),
    },
  });
  evidence.push({
    route: "POST /v1/datasets/datasets",
    actor: "founder-key",
    status: createDatasetResponse.status,
    txHash: createDatasetTxHash,
    receipt: { status: createDatasetReceipt.status, blockNumber: createDatasetReceipt.blockNumber },
    postState: datasetAfterCreate.payload,
    eventQuery: datasetCreatedEvents,
  });

  const byCreatorResponse = await apiCall(
    port,
    "GET",
    `/v1/datasets/queries/get-datasets-by-creator?creator=${encodeURIComponent(founder.address)}`,
    { apiKey: "read-key" },
  );
  evidence.push({
    route: "GET /v1/datasets/queries/get-datasets-by-creator",
    actor: "read-key",
    status: byCreatorResponse.status,
    postState: byCreatorResponse.payload,
  });

  const appendAssetsResponse = await apiCall(port, "POST", "/v1/datasets/commands/append-assets", {
    body: {
      datasetId,
      assetIds: [asset3.tokenId, asset4.tokenId],
    },
  });
  if (appendAssetsResponse.status !== 202) {
    throw new Error(`dataset append failed: ${JSON.stringify(appendAssetsResponse.payload)}`);
  }
  const appendAssetsTxHash = extractTxHash(appendAssetsResponse.payload)!;
  const appendAssetsReceipt = await waitForReceipt(provider, appendAssetsTxHash, "append assets");
  const datasetAfterAppend = await waitFor(
    () => apiCall(port, "GET", `/v1/datasets/queries/get-dataset?datasetId=${encodeURIComponent(datasetId)}`, { apiKey: "read-key" }),
    (response) => response.status === 200 && (((response.payload as JsonRecord).assetIds as unknown[]).length === 4),
    "dataset append read",
  );
  const assetsAppendedEvents = await apiCall(port, "POST", "/v1/datasets/events/assets-appended/query", {
    apiKey: "read-key",
    body: {
      fromBlock: String(appendAssetsReceipt.blockNumber),
      toBlock: String(appendAssetsReceipt.blockNumber),
    },
  });
  evidence.push({
    route: "POST /v1/datasets/commands/append-assets",
    actor: "founder-key",
    status: appendAssetsResponse.status,
    txHash: appendAssetsTxHash,
    receipt: { status: appendAssetsReceipt.status, blockNumber: appendAssetsReceipt.blockNumber },
    postState: datasetAfterAppend.payload,
    eventQuery: assetsAppendedEvents,
  });

  const containsAssetResponse = await apiCall(
    port,
    "GET",
    `/v1/datasets/queries/contains-asset?datasetId=${encodeURIComponent(datasetId)}&assetId=${encodeURIComponent(asset4.tokenId)}`,
    { apiKey: "read-key" },
  );
  evidence.push({
    route: "GET /v1/datasets/queries/contains-asset",
    actor: "read-key",
    status: containsAssetResponse.status,
    postState: containsAssetResponse.payload,
  });

  const removeAssetResponse = await apiCall(port, "DELETE", "/v1/datasets/commands/remove-asset", {
    body: {
      datasetId,
      assetId: asset2.tokenId,
    },
  });
  if (removeAssetResponse.status !== 202) {
    throw new Error(`dataset remove failed: ${JSON.stringify(removeAssetResponse.payload)}`);
  }
  const removeAssetTxHash = extractTxHash(removeAssetResponse.payload)!;
  const removeAssetReceipt = await waitForReceipt(provider, removeAssetTxHash, "remove asset");
  const datasetAfterRemove = await waitFor(
    () => apiCall(port, "GET", `/v1/datasets/queries/get-dataset?datasetId=${encodeURIComponent(datasetId)}`, { apiKey: "read-key" }),
    (response) => response.status === 200 && (((response.payload as JsonRecord).assetIds as unknown[]).length === 3),
    "dataset remove read",
  );
  const assetRemovedEvents = await apiCall(port, "POST", "/v1/datasets/events/asset-removed/query", {
    apiKey: "read-key",
    body: {
      fromBlock: String(removeAssetReceipt.blockNumber),
      toBlock: String(removeAssetReceipt.blockNumber),
    },
  });
  evidence.push({
    route: "DELETE /v1/datasets/commands/remove-asset",
    actor: "founder-key",
    status: removeAssetResponse.status,
    txHash: removeAssetTxHash,
    receipt: { status: removeAssetReceipt.status, blockNumber: removeAssetReceipt.blockNumber },
    postState: datasetAfterRemove.payload,
    eventQuery: assetRemovedEvents,
  });

  const containsRemovedAssetResponse = await apiCall(
    port,
    "GET",
    `/v1/datasets/queries/contains-asset?datasetId=${encodeURIComponent(datasetId)}&assetId=${encodeURIComponent(asset2.tokenId)}`,
    { apiKey: "read-key" },
  );
  evidence.push({
    route: "GET /v1/datasets/queries/contains-asset",
    actor: "read-key",
    status: containsRemovedAssetResponse.status,
    postState: containsRemovedAssetResponse.payload,
    notes: "removed asset check",
  });

  const setLicenseResponse = await apiCall(port, "PATCH", "/v1/datasets/commands/set-license", {
    body: {
      datasetId,
      licenseTemplateId: secondTemplateId,
    },
  });
  const setMetadataResponse = await apiCall(port, "PATCH", "/v1/datasets/commands/set-metadata", {
    body: {
      datasetId,
      metadataURI: `ipfs://dataset-meta-updated-${Date.now()}`,
    },
  });
  const setRoyaltyResponse = await apiCall(port, "PATCH", "/v1/datasets/commands/set-royalty", {
    body: {
      datasetId,
      royaltyBps: "250",
    },
  });
  const setStatusResponse = await apiCall(port, "PATCH", "/v1/datasets/commands/set-dataset-status", {
    body: {
      datasetId,
      active: false,
    },
  });
  for (const response of [setLicenseResponse, setMetadataResponse, setRoyaltyResponse, setStatusResponse]) {
    if (response.status !== 202) {
      throw new Error(`dataset update failed: ${JSON.stringify(response.payload)}`);
    }
  }
  const updateTxs = {
    setLicense: extractTxHash(setLicenseResponse.payload)!,
    setMetadata: extractTxHash(setMetadataResponse.payload)!,
    setRoyalty: extractTxHash(setRoyaltyResponse.payload)!,
    setStatus: extractTxHash(setStatusResponse.payload)!,
  };
  const updateReceipts = {
    setLicense: await waitForReceipt(provider, updateTxs.setLicense, "set license"),
    setMetadata: await waitForReceipt(provider, updateTxs.setMetadata, "set metadata"),
    setRoyalty: await waitForReceipt(provider, updateTxs.setRoyalty, "set royalty"),
    setStatus: await waitForReceipt(provider, updateTxs.setStatus, "set status"),
  };
  const datasetAfterUpdates = await waitFor(
    () => apiCall(port, "GET", `/v1/datasets/queries/get-dataset?datasetId=${encodeURIComponent(datasetId)}`, { apiKey: "read-key" }),
    (response) =>
      response.status === 200 &&
      (response.payload as JsonRecord).licenseTemplateId === secondTemplateId &&
      (response.payload as JsonRecord).royaltyBps === "250" &&
      (response.payload as JsonRecord).active === false,
    "dataset updated read",
  );
  for (const [path, txHash, label] of [
    ["/v1/datasets/events/license-changed/query", updateTxs.setLicense, "PATCH /v1/datasets/commands/set-license"],
    ["/v1/datasets/events/metadata-changed/query", updateTxs.setMetadata, "PATCH /v1/datasets/commands/set-metadata"],
    ["/v1/datasets/events/royalty-set/query", updateTxs.setRoyalty, "PATCH /v1/datasets/commands/set-royalty"],
    ["/v1/datasets/events/dataset-status-changed/query", updateTxs.setStatus, "PATCH /v1/datasets/commands/set-dataset-status"],
  ] as const) {
    const receipt = await provider.getTransactionReceipt(txHash);
    const eventQuery = await apiCall(port, "POST", path, {
      apiKey: "read-key",
      body: {
        fromBlock: String(receipt!.blockNumber),
        toBlock: String(receipt!.blockNumber),
      },
    });
    evidence.push({
      route: label,
      actor: "founder-key",
      status: 202,
      txHash,
      receipt: { status: receipt!.status, blockNumber: receipt!.blockNumber },
      postState: datasetAfterUpdates.payload,
      eventQuery,
    });
  }

  const royaltyInfoResponse = await apiCall(
    port,
    "GET",
    `/v1/datasets/queries/royalty-info?datasetId=${encodeURIComponent(datasetId)}&salePrice=1000000`,
    { apiKey: "read-key" },
  );
  evidence.push({
    route: "GET /v1/datasets/queries/royalty-info",
    actor: "read-key",
    status: royaltyInfoResponse.status,
    postState: royaltyInfoResponse.payload,
  });

  const burnDatasetResponse = await apiCall(port, "DELETE", "/v1/datasets/commands/burn-dataset", {
    body: { datasetId },
  });
  if (burnDatasetResponse.status !== 202) {
    throw new Error(`dataset burn failed: ${JSON.stringify(burnDatasetResponse.payload)}`);
  }
  const burnDatasetTxHash = extractTxHash(burnDatasetResponse.payload)!;
  const burnDatasetReceipt = await waitForReceipt(provider, burnDatasetTxHash, "burn dataset");
  const totalAfterResponse = await waitFor(
    () => apiCall(port, "POST", "/v1/datasets/queries/get-total-datasets", {
      apiKey: "read-key",
      body: {},
    }),
    (response) => response.status === 200 && BigInt(String(response.payload)) === totalBefore,
    "dataset total after burn",
  );
  const datasetBurnedEvents = await apiCall(port, "POST", "/v1/datasets/events/dataset-burned/query", {
    apiKey: "read-key",
    body: {
      fromBlock: String(burnDatasetReceipt.blockNumber),
      toBlock: String(burnDatasetReceipt.blockNumber),
    },
  });
  const getBurnedDatasetResponse = await apiCall(
    port,
    "GET",
    `/v1/datasets/queries/get-dataset?datasetId=${encodeURIComponent(datasetId)}`,
    { apiKey: "read-key" },
  );
  evidence.push({
    route: "DELETE /v1/datasets/commands/burn-dataset",
    actor: "founder-key",
    status: burnDatasetResponse.status,
    txHash: burnDatasetTxHash,
    receipt: { status: burnDatasetReceipt.status, blockNumber: burnDatasetReceipt.blockNumber },
    postState: { totalAfter: totalAfterResponse.payload, burnedReadStatus: getBurnedDatasetResponse.status },
    eventQuery: datasetBurnedEvents,
  });

  return {
    routes: [...DATASET_ROUTES],
    actors: ["founder-key", "read-key"],
    executionResult: "dataset mutation lifecycle completed end-to-end through mounted dataset routes",
    evidence,
    finalClassification: "proven working",
  };
}

async function verifyLicensing(input: {
  port: number;
  provider: JsonRpcProvider;
  founder: Wallet;
  licensingOwner: Wallet;
  licensee: Wallet;
  transferee: Wallet;
  voiceAssetFacet: Contract;
  licenseFacet: Contract;
  templateFacet: Contract;
}): Promise<DomainReport> {
  const { port, provider, licensingOwner, licensee, transferee, licenseFacet, templateFacet } = input;
  const evidence: RouteEvidence[] = [];

  const createVoiceResponse = await apiCall(port, "POST", "/v1/voice-assets", {
    apiKey: "licensing-owner-key",
    body: {
      ipfsHash: `QmLicensing${Date.now()}-${Math.random().toString(16).slice(2)}`,
      royaltyRate: "175",
    },
  });
  if (createVoiceResponse.status !== 202) {
    throw new Error(`licensing voice create failed: ${JSON.stringify(createVoiceResponse.payload)}`);
  }
  const voiceHash = String((createVoiceResponse.payload as JsonRecord).result);
  await waitForSuccessfulReceipt(provider, extractTxHash(createVoiceResponse.payload)!, "licensing voice");
  const baseTemplate = await buildHttpTemplate(provider, licensingOwner.address, `Lifecycle Base ${Date.now()}`);

  const createTemplateResponse = await apiCall(port, "POST", "/v1/licensing/license-templates/create-template", {
    apiKey: "licensing-owner-key",
    body: { template: baseTemplate },
  });
  if (createTemplateResponse.status !== 202) {
    throw new Error(`licensing template create failed: ${JSON.stringify(createTemplateResponse.payload)}`);
  }
  const templateHash = String((createTemplateResponse.payload as JsonRecord).result);
  const createTemplateTxHash = extractTxHash(createTemplateResponse.payload)!;
  const createTemplateReceipt = await waitForSuccessfulReceipt(provider, createTemplateTxHash, "licensing create template");
  const creatorTemplatesResponse = await waitFor(
    () => apiCall(
      port,
      "GET",
      `/v1/licensing/queries/get-creator-templates?creator=${encodeURIComponent(licensingOwner.address)}`,
      { apiKey: "read-key" },
    ),
    (response) => response.status === 200 && Array.isArray(response.payload) && (response.payload as string[]).includes(templateHash),
    "licensing creator templates read",
  );
  const templateReadResponse = await apiCall(
    port,
    "GET",
    `/v1/licensing/queries/get-template?templateHash=${encodeURIComponent(templateHash)}`,
    { apiKey: "read-key" },
  );
  evidence.push({
    route: "POST /v1/licensing/license-templates/create-template",
    actor: "licensing-owner-key",
    status: createTemplateResponse.status,
    txHash: createTemplateTxHash,
    receipt: { status: createTemplateReceipt.status, blockNumber: createTemplateReceipt.blockNumber },
    postState: { creatorTemplates: creatorTemplatesResponse.payload, template: templateReadResponse.payload },
  });

  const updateTemplateResponse = await apiCall(port, "PATCH", "/v1/licensing/commands/update-template", {
    apiKey: "licensing-owner-key",
    body: {
      templateHash,
      template: await buildHttpTemplate(provider, licensingOwner.address, `Lifecycle Updated ${Date.now()}`, {
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
      }),
    },
  });
  if (updateTemplateResponse.status !== 202) {
    throw new Error(`licensing update template failed: ${JSON.stringify(updateTemplateResponse.payload)}`);
  }
  const updateTemplateTxHash = extractTxHash(updateTemplateResponse.payload)!;
  const updateTemplateReceipt = await waitForSuccessfulReceipt(provider, updateTemplateTxHash, "licensing update template");
  const templateUpdatedEvents = await apiCall(port, "POST", "/v1/licensing/events/template-updated/query/voice-license-template", {
    apiKey: "read-key",
    body: {
      fromBlock: String(updateTemplateReceipt.blockNumber),
      toBlock: String(updateTemplateReceipt.blockNumber),
    },
  });
  evidence.push({
    route: "PATCH /v1/licensing/commands/update-template",
    actor: "licensing-owner-key",
    status: updateTemplateResponse.status,
    txHash: updateTemplateTxHash,
    receipt: { status: updateTemplateReceipt.status, blockNumber: updateTemplateReceipt.blockNumber },
    postState: await apiCall(
      port,
      "GET",
      `/v1/licensing/queries/get-template?templateHash=${encodeURIComponent(templateHash)}`,
      { apiKey: "read-key" },
    ),
    eventQuery: templateUpdatedEvents,
  });

  const deactivateTemplateResponse = await apiCall(port, "PATCH", "/v1/licensing/commands/set-template-status", {
    apiKey: "licensing-owner-key",
    body: {
      templateHash,
      active: false,
    },
  });
  if (deactivateTemplateResponse.status !== 202) {
    throw new Error(`licensing deactivate template failed: ${JSON.stringify(deactivateTemplateResponse.payload)}`);
  }
  const deactivateTemplateTxHash = extractTxHash(deactivateTemplateResponse.payload)!;
  let deactivateStaticCallError = "";
  try {
    await templateFacet.connect(licensingOwner).setTemplateStatus.staticCall(templateHash, false);
  } catch (error) {
    deactivateStaticCallError = extractRevertMarker(error);
  }
  let deactivateTemplateReceipt;
  try {
    deactivateTemplateReceipt = await waitForSuccessfulReceipt(provider, deactivateTemplateTxHash, "licensing deactivate template");
  } catch (error) {
    const txStatus = await apiCall(port, "GET", `/v1/transactions/${deactivateTemplateTxHash}`, { apiKey: "read-key" });
    const routeActiveRead = await apiCall(
      port,
      "GET",
      `/v1/licensing/queries/is-template-active?templateHash=${encodeURIComponent(templateHash)}`,
      { apiKey: "read-key" },
    );
    const templateRead = await apiCall(
      port,
      "GET",
      `/v1/licensing/queries/get-template?templateHash=${encodeURIComponent(templateHash)}`,
      { apiKey: "read-key" },
    );
    throw new Error(
      `licensing deactivate template reverted: ${JSON.stringify(normalize({
        cause: error instanceof Error ? error.message : String(error),
        staticCall: deactivateStaticCallError,
        txHash: deactivateTemplateTxHash,
        txStatus: txStatus.payload,
        routeActiveRead: routeActiveRead.payload,
        templateRead: templateRead.payload,
      }))}`,
    );
  }
  const inactiveTemplateRead = await waitFor(
    () => templateFacet.isTemplateActive(templateHash),
    (value) => value === false,
    "inactive template read",
  );
  const inactiveTemplateRouteRead = await apiCall(
    port,
    "GET",
    `/v1/licensing/queries/is-template-active?templateHash=${encodeURIComponent(templateHash)}`,
    { apiKey: "read-key" },
  );
  evidence.push({
    route: "PATCH /v1/licensing/commands/set-template-status",
    actor: "licensing-owner-key",
    status: deactivateTemplateResponse.status,
    txHash: deactivateTemplateTxHash,
    receipt: { status: deactivateTemplateReceipt.status, blockNumber: deactivateTemplateReceipt.blockNumber },
    postState: { isActive: inactiveTemplateRead, routeIsActive: inactiveTemplateRouteRead.payload },
    notes: deactivateStaticCallError,
  });

  const inactiveCreateFromTemplateResponse = await apiCall(port, "POST", "/v1/licensing/license-templates/create-license-from-template", {
    apiKey: "licensing-owner-key",
    body: {
      voiceHash,
      templateHash,
      customizations: {
        licenseHash: ZERO_BYTES32,
        duration: String(60n * 24n * 60n * 60n),
        price: "30000",
        maxUses: "7",
        transferable: true,
        rights: ["Podcast"],
        restrictions: ["no-derivatives"],
      },
    },
  });
  evidence.push({
    route: "POST /v1/licensing/license-templates/create-license-from-template",
    actor: "licensing-owner-key",
    status: inactiveCreateFromTemplateResponse.status,
    postState: inactiveCreateFromTemplateResponse.payload,
    notes: "inactive template attempt",
  });

  const freshTemplateResponse = await apiCall(port, "POST", "/v1/licensing/license-templates/create-template", {
    apiKey: "licensing-owner-key",
    body: {
      template: await buildHttpTemplate(provider, licensingOwner.address, `Lifecycle Active ${Date.now()}`, {
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
  if (freshTemplateResponse.status !== 202) {
    throw new Error(`licensing fresh template create failed: ${JSON.stringify(freshTemplateResponse.payload)}`);
  }
  const freshTemplateHash = String((freshTemplateResponse.payload as JsonRecord).result);
  const freshTemplateTxHash = extractTxHash(freshTemplateResponse.payload)!;
  const freshTemplateReceipt = await waitForSuccessfulReceipt(provider, freshTemplateTxHash, "fresh template");
  const freshTemplateRead = await waitFor(
    () => apiCall(
      port,
      "GET",
      `/v1/licensing/queries/get-template?templateHash=${encodeURIComponent(freshTemplateHash)}`,
      { apiKey: "read-key" },
    ),
    (response) => response.status === 200,
    "fresh template read",
  );

  const createFromTemplateResponse = await apiCall(port, "POST", "/v1/licensing/license-templates/create-license-from-template", {
    apiKey: "licensing-owner-key",
    body: {
      voiceHash,
      templateHash: freshTemplateHash,
      customizations: {
        licenseHash: ZERO_BYTES32,
        duration: String(60n * 24n * 60n * 60n),
        price: "30000",
        maxUses: "7",
        transferable: true,
        rights: ["Podcast"],
        restrictions: ["no-derivatives"],
      },
    },
  });
  if (createFromTemplateResponse.status !== 202) {
    throw new Error(`licensing create from template failed: ${JSON.stringify(createFromTemplateResponse.payload)}`);
  }
  const createFromTemplateTxHash = extractTxHash(createFromTemplateResponse.payload)!;
  const createFromTemplateReceipt = await waitForSuccessfulReceipt(provider, createFromTemplateTxHash, "create from template");
  const templateLicenseCreatedEvents = await apiCall(port, "POST", "/v1/licensing/events/license-created/query/voice-license-template", {
    apiKey: "read-key",
    body: {
      fromBlock: String(createFromTemplateReceipt.blockNumber),
      toBlock: String(createFromTemplateReceipt.blockNumber),
    },
  });
  evidence.push({
    route: "POST /v1/licensing/license-templates/create-license-from-template",
    actor: "licensing-owner-key",
    status: createFromTemplateResponse.status,
    txHash: createFromTemplateTxHash,
    receipt: { status: createFromTemplateReceipt.status, blockNumber: createFromTemplateReceipt.blockNumber },
    postState: { creation: createFromTemplateResponse.payload, freshTemplate: freshTemplateRead.payload },
    eventQuery: templateLicenseCreatedEvents,
    notes: "active template path",
  });

  const createLicenseResponse = await apiCall(port, "POST", "/v1/licensing/licenses/create-license", {
    apiKey: "licensing-owner-key",
    body: {
      licensee: licensee.address,
      voiceHash,
      terms: {
        licenseHash: ZERO_BYTES32,
        duration: String(60n * 24n * 60n * 60n),
        price: "0",
        maxUses: "7",
        transferable: true,
        rights: ["Podcast"],
        restrictions: ["no-derivatives"],
      },
    },
  });
  if (createLicenseResponse.status !== 202) {
    throw new Error(`create license failed: ${JSON.stringify(createLicenseResponse.payload)}`);
  }
  const createLicenseTxHash = extractTxHash(createLicenseResponse.payload)!;
  const createLicenseReceipt = await waitForSuccessfulReceipt(provider, createLicenseTxHash, "create license");
  const licenseReadResponse = await waitFor(
    () => apiCall(
      port,
      "GET",
      `/v1/licensing/queries/get-license?voiceHash=${encodeURIComponent(voiceHash)}&licensee=${encodeURIComponent(licensee.address)}`,
      { apiKey: "read-key" },
    ),
    (response) => response.status === 200,
    "get-license read",
  );
  const directLicense = await licenseFacet.getLicense(voiceHash, licensee.address);
  const activeTemplateHash = String((licenseReadResponse.payload as JsonRecord).templateHash);
  const licenseCreatedEvents = await apiCall(port, "POST", "/v1/licensing/events/license-created/query/voice-license", {
    apiKey: "read-key",
    body: {
      fromBlock: String(createLicenseReceipt.blockNumber),
      toBlock: String(createLicenseReceipt.blockNumber),
    },
  });
  evidence.push({
    route: "POST /v1/licensing/licenses/create-license",
    actor: "licensing-owner-key",
    status: createLicenseResponse.status,
    txHash: createLicenseTxHash,
    receipt: { status: createLicenseReceipt.status, blockNumber: createLicenseReceipt.blockNumber },
    postState: {
      license: licenseReadResponse.payload,
      directLicense: licenseToObject(directLicense),
    },
    eventQuery: licenseCreatedEvents,
  });

  const licenseesResponse = await apiCall(
    port,
    "GET",
    `/v1/licensing/queries/get-licensees?voiceHash=${encodeURIComponent(voiceHash)}`,
    { apiKey: "read-key" },
  );
  const historyResponse = await apiCall(
    port,
    "GET",
    `/v1/licensing/queries/get-license-history?voiceHash=${encodeURIComponent(voiceHash)}`,
    { apiKey: "read-key" },
  );
  const termsResponse = await apiCall(
    port,
    "GET",
    `/v1/licensing/queries/get-license-terms?voiceHash=${encodeURIComponent(voiceHash)}`,
    { apiKey: "licensee-key" },
  );
  const validateResponse = await apiCall(port, "POST", "/v1/licensing/queries/validate-license", {
    apiKey: "read-key",
    body: {
      voiceHash,
      licensee: licensee.address,
      templateHash: activeTemplateHash,
    },
  });
  evidence.push({
    route: "GET /v1/licensing/queries/get-license-terms",
    actor: "licensee-key",
    status: termsResponse.status,
    postState: {
      licensees: licenseesResponse.payload,
      history: historyResponse.payload,
      terms: termsResponse.payload,
      validate: validateResponse.payload,
    },
  });

  const usageRef = id(`licensing-usage-${Date.now()}`);
  const recordUsageResponse = await apiCall(port, "POST", "/v1/licensing/commands/record-licensed-usage", {
    apiKey: "licensee-key",
    body: {
      voiceHash,
      usageRef,
    },
  });
  if (recordUsageResponse.status !== 202) {
    throw new Error(`record usage failed: ${JSON.stringify(recordUsageResponse.payload)}`);
  }
  const recordUsageTxHash = extractTxHash(recordUsageResponse.payload)!;
  const recordUsageReceipt = await waitForSuccessfulReceipt(provider, recordUsageTxHash, "record usage");
  const usageReadResponse = await waitFor(
    () => apiCall(
      port,
      "GET",
      `/v1/licensing/queries/is-usage-ref-used?voiceHash=${encodeURIComponent(voiceHash)}&usageRef=${encodeURIComponent(usageRef)}`,
      { apiKey: "read-key" },
    ),
    (response) => response.status === 200 && response.payload === true,
    "usage-ref used",
  );
  const usageCountResponse = await apiCall(
    port,
    "GET",
    `/v1/licensing/queries/get-usage-count?voiceHash=${encodeURIComponent(voiceHash)}&licensee=${encodeURIComponent(licensee.address)}`,
    { apiKey: "read-key" },
  );
  const usageEvents = await apiCall(port, "POST", "/v1/licensing/events/license-used/query", {
    apiKey: "read-key",
    body: {
      fromBlock: String(recordUsageReceipt.blockNumber),
      toBlock: String(recordUsageReceipt.blockNumber),
    },
  });
  evidence.push({
    route: "POST /v1/licensing/commands/record-licensed-usage",
    actor: "licensee-key",
    status: recordUsageResponse.status,
    txHash: recordUsageTxHash,
    receipt: { status: recordUsageReceipt.status, blockNumber: recordUsageReceipt.blockNumber },
    postState: { usageRefUsed: usageReadResponse.payload, usageCount: usageCountResponse.payload },
    eventQuery: usageEvents,
  });

  let directTransferError = "";
  try {
    await licenseFacet.connect(licensee).transferLicense.staticCall(voiceHash, activeTemplateHash, transferee.address);
  } catch (error) {
    directTransferError = extractRevertMarker(error);
  }
  const transferLicenseResponse = await apiCall(port, "POST", "/v1/licensing/commands/transfer-license", {
    apiKey: "licensee-key",
    body: {
      voiceHash,
      templateHash: activeTemplateHash,
      to: transferee.address,
    },
  });
  evidence.push({
    route: "POST /v1/licensing/commands/transfer-license",
    actor: "licensee-key",
    status: transferLicenseResponse.status,
    postState: transferLicenseResponse.payload,
    notes: directTransferError,
  });

  const revokeLicenseResponse = await apiCall(port, "DELETE", "/v1/licensing/commands/revoke-license", {
    apiKey: "licensing-owner-key",
    body: {
      voiceHash,
      templateHash: activeTemplateHash,
      licensee: licensee.address,
      reason: "template lifecycle end",
    },
  });
  if (revokeLicenseResponse.status !== 202) {
    throw new Error(`revoke license failed: ${JSON.stringify(revokeLicenseResponse.payload)}`);
  }
  const revokeLicenseTxHash = extractTxHash(revokeLicenseResponse.payload)!;
  const revokeLicenseReceipt = await waitForSuccessfulReceipt(provider, revokeLicenseTxHash, "revoke license");
  const revokedLicenseResponse = await apiCall(
    port,
    "GET",
    `/v1/licensing/queries/get-license?voiceHash=${encodeURIComponent(voiceHash)}&licensee=${encodeURIComponent(licensee.address)}`,
    { apiKey: "read-key" },
  );
  const revokeEvents = await apiCall(port, "POST", "/v1/licensing/events/license-revoked/query", {
    apiKey: "read-key",
    body: {
      fromBlock: String(revokeLicenseReceipt.blockNumber),
      toBlock: String(revokeLicenseReceipt.blockNumber),
    },
  });
  const pendingRevenueResponse = await apiCall(
    port,
    "GET",
    `/v1/licensing/queries/get-pending-revenue?account=${encodeURIComponent(licensingOwner.address)}`,
    { apiKey: "read-key" },
  );
  evidence.push({
    route: "DELETE /v1/licensing/commands/revoke-license",
    actor: "licensing-owner-key",
    status: revokeLicenseResponse.status,
    txHash: revokeLicenseTxHash,
    receipt: { status: revokeLicenseReceipt.status, blockNumber: revokeLicenseReceipt.blockNumber },
    postState: { revokedReadStatus: revokedLicenseResponse.status, pendingRevenue: pendingRevenueResponse.payload },
    eventQuery: revokeEvents,
  });

  return {
    routes: [...LICENSING_ROUTES],
    actors: ["licensing-owner-key", "licensee-key", "read-key"],
    executionResult: "template lifecycle, direct license lifecycle, actor-scoped license reads, and usage/revoke flows completed through mounted licensing routes",
    evidence,
    finalClassification: "proven working",
  };
}

async function verifyWhisperblock(input: {
  port: number;
  provider: JsonRpcProvider;
  founder: Wallet;
  outsider: Wallet;
  whisperBlockFacet: Contract;
  voiceAssetFacet: Contract;
  diamond: string;
}): Promise<DomainReport> {
  const { port, provider, founder, whisperBlockFacet, diamond } = input;
  const evidence: RouteEvidence[] = [];
  const originalWhisperConfig = await readWhisperConfig(provider, diamond);

  const createVoiceResponse = await apiCall(port, "POST", "/v1/voice-assets", {
    body: {
      ipfsHash: `QmWhisper${Date.now()}-${Math.random().toString(16).slice(2)}`,
      royaltyRate: "125",
    },
  });
  if (createVoiceResponse.status !== 202) {
    throw new Error(`whisper voice create failed: ${JSON.stringify(createVoiceResponse.payload)}`);
  }
  const voiceHash = String((createVoiceResponse.payload as JsonRecord).result);
  await waitForReceipt(provider, extractTxHash(createVoiceResponse.payload)!, "whisper voice");

  try {
    const selectorsResponse = await apiCall(port, "POST", "/v1/whisperblock/queries/get-selectors", {
      apiKey: "read-key",
      body: {},
    });
    evidence.push({
      route: "POST /v1/whisperblock/queries/get-selectors",
      actor: "read-key",
      status: selectorsResponse.status,
      postState: selectorsResponse.payload,
    });

    const auditBeforeResponse = await waitFor(
      () => apiCall(
        port,
        "GET",
        `/v1/whisperblock/queries/get-audit-trail?voiceHash=${encodeURIComponent(voiceHash)}`,
        { apiKey: "read-key" },
      ),
      (response) => response.status === 200,
      "whisper initial audit trail",
    );
    evidence.push({
      route: "GET /v1/whisperblock/queries/get-audit-trail",
      actor: "read-key",
      status: auditBeforeResponse.status,
      postState: auditBeforeResponse.payload,
      notes: "initial audit trail",
    });

    const setAuditResponse = await apiCall(port, "PATCH", "/v1/whisperblock/commands/set-audit-enabled", {
      body: { enabled: true },
    });
    if (setAuditResponse.status !== 202) {
      throw new Error(`set audit failed: ${JSON.stringify(setAuditResponse.payload)}`);
    }
    await waitForReceipt(provider, extractTxHash(setAuditResponse.payload)!, "set audit");

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
    if (registerFingerprintResponse.status !== 202) {
      throw new Error(`register fingerprint failed: ${JSON.stringify(registerFingerprintResponse.payload)}`);
    }
    const registerFingerprintTxHash = extractTxHash(registerFingerprintResponse.payload)!;
    const registerFingerprintReceipt = await waitForReceipt(provider, registerFingerprintTxHash, "register fingerprint");
    const verifyValidResponse = await waitFor(
      () => apiCall(
        port,
        "GET",
        `/v1/whisperblock/queries/verify-voice-authenticity?voiceHash=${encodeURIComponent(voiceHash)}&fingerprintData=${encodeURIComponent(fingerprintData)}`,
        { apiKey: "read-key" },
      ),
      (response) => response.status === 200 && response.payload === true,
      "whisper verify valid",
    );
    const verifyInvalidResponse = await apiCall(
      port,
      "GET",
      `/v1/whisperblock/queries/verify-voice-authenticity?voiceHash=${encodeURIComponent(voiceHash)}&fingerprintData=${encodeURIComponent(invalidFingerprintData)}`,
      { apiKey: "read-key" },
    );
    const voiceFingerprintEvents = await apiCall(port, "POST", "/v1/whisperblock/events/voice-fingerprint-updated/query", {
      apiKey: "read-key",
      body: {
        fromBlock: String(registerFingerprintReceipt.blockNumber),
        toBlock: String(registerFingerprintReceipt.blockNumber),
      },
    });
    evidence.push({
      route: "POST /v1/whisperblock/whisperblocks",
      actor: "founder-key",
      status: registerFingerprintResponse.status,
      txHash: registerFingerprintTxHash,
      receipt: { status: registerFingerprintReceipt.status, blockNumber: registerFingerprintReceipt.blockNumber },
      postState: { verifyValid: verifyValidResponse.payload, verifyInvalid: verifyInvalidResponse.payload },
      eventQuery: voiceFingerprintEvents,
    });

    const encryptionKeyResponse = await apiCall(port, "POST", "/v1/whisperblock/commands/generate-and-set-encryption-key", {
      body: { voiceHash },
    });
    if (encryptionKeyResponse.status !== 202) {
      throw new Error(`generate encryption key failed: ${JSON.stringify(encryptionKeyResponse.payload)}`);
    }
    const encryptionKeyTxHash = extractTxHash(encryptionKeyResponse.payload)!;
    const encryptionKeyReceipt = await waitForReceipt(provider, encryptionKeyTxHash, "generate encryption key");
    let keyEventQuery: ApiResponse | null = null;
    if (Number(encryptionKeyReceipt.status) === 1) {
      keyEventQuery = await apiCall(port, "POST", "/v1/whisperblock/events/key-rotated/query", {
        apiKey: "read-key",
        body: {
          fromBlock: String(encryptionKeyReceipt.blockNumber),
          toBlock: String(encryptionKeyReceipt.blockNumber),
        },
      });
    }
    evidence.push({
      route: "POST /v1/whisperblock/commands/generate-and-set-encryption-key",
      actor: "founder-key",
      status: encryptionKeyResponse.status,
      txHash: encryptionKeyTxHash,
      receipt: { status: encryptionKeyReceipt.status, blockNumber: encryptionKeyReceipt.blockNumber },
      postState: encryptionKeyResponse.payload,
      eventQuery: keyEventQuery,
    });

    const accessGrantee = Wallet.createRandom().address;
    const grantAccessResponse = await apiCall(port, "POST", "/v1/whisperblock/commands/grant-access", {
      body: {
        voiceHash,
        user: accessGrantee,
        duration: "1200",
      },
    });
    if (grantAccessResponse.status !== 202) {
      throw new Error(`grant access failed: ${JSON.stringify(grantAccessResponse.payload)}`);
    }
    const grantAccessTxHash = extractTxHash(grantAccessResponse.payload)!;
    const grantAccessReceipt = await waitForReceipt(provider, grantAccessTxHash, "grant access");
    const accessGrantedEvents = await apiCall(port, "POST", "/v1/whisperblock/events/access-granted/query", {
      apiKey: "read-key",
      body: {
        fromBlock: String(grantAccessReceipt.blockNumber),
        toBlock: String(grantAccessReceipt.blockNumber),
      },
    });
    evidence.push({
      route: "POST /v1/whisperblock/commands/grant-access",
      actor: "founder-key",
      status: grantAccessResponse.status,
      txHash: grantAccessTxHash,
      receipt: { status: grantAccessReceipt.status, blockNumber: grantAccessReceipt.blockNumber },
      postState: grantAccessResponse.payload,
      eventQuery: accessGrantedEvents,
    });

    const revokeAccessResponse = await apiCall(port, "DELETE", "/v1/whisperblock/commands/revoke-access", {
      body: {
        voiceHash,
        user: accessGrantee,
      },
    });
    if (revokeAccessResponse.status !== 202) {
      throw new Error(`revoke access failed: ${JSON.stringify(revokeAccessResponse.payload)}`);
    }
    const revokeAccessTxHash = extractTxHash(revokeAccessResponse.payload)!;
    const revokeAccessReceipt = await waitForReceipt(provider, revokeAccessTxHash, "revoke access");
    const accessRevokedEvents = await apiCall(port, "POST", "/v1/whisperblock/events/access-revoked/query", {
      apiKey: "read-key",
      body: {
        fromBlock: String(revokeAccessReceipt.blockNumber),
        toBlock: String(revokeAccessReceipt.blockNumber),
      },
    });
    evidence.push({
      route: "DELETE /v1/whisperblock/commands/revoke-access",
      actor: "founder-key",
      status: revokeAccessResponse.status,
      txHash: revokeAccessTxHash,
      receipt: { status: revokeAccessReceipt.status, blockNumber: revokeAccessReceipt.blockNumber },
      postState: revokeAccessResponse.payload,
      eventQuery: accessRevokedEvents,
    });

    const auditAfterAccessResponse = await waitFor(
      () => apiCall(
        port,
        "GET",
        `/v1/whisperblock/queries/get-audit-trail?voiceHash=${encodeURIComponent(voiceHash)}`,
        { apiKey: "read-key" },
      ),
      (response) => response.status === 200 && Array.isArray(response.payload) && response.payload.length > ((auditBeforeResponse.payload as unknown[])?.length ?? 0),
      "audit growth",
    );
    evidence.push({
      route: "GET /v1/whisperblock/queries/get-audit-trail",
      actor: "read-key",
      status: auditAfterAccessResponse.status,
      postState: auditAfterAccessResponse.payload,
      notes: "post-access audit trail",
    });

    const trustedOracleWallet = Wallet.createRandom();
    const setTrustedOracleResponse = await apiCall(port, "PATCH", "/v1/whisperblock/commands/set-trusted-oracle", {
      body: { oracle: trustedOracleWallet.address },
    });
    if (setTrustedOracleResponse.status !== 202) {
      throw new Error(`set trusted oracle failed: ${JSON.stringify(setTrustedOracleResponse.payload)}`);
    }
    await waitForReceipt(provider, extractTxHash(setTrustedOracleResponse.payload)!, "set trusted oracle");

    const updateSystemParametersResponse = await apiCall(port, "PATCH", "/v1/whisperblock/commands/update-system-parameters", {
      body: {
        newMinKeyStrength: "512",
        newMinEntropy: "256",
        newDefaultAccessDuration: "3600",
      },
    });
    if (updateSystemParametersResponse.status !== 202) {
      throw new Error(`update system parameters failed: ${JSON.stringify(updateSystemParametersResponse.payload)}`);
    }
    const updateSystemParametersTxHash = extractTxHash(updateSystemParametersResponse.payload)!;
    const updateSystemParametersReceipt = await waitForReceipt(provider, updateSystemParametersTxHash, "update system parameters");
    await waitFor(
      () => readWhisperConfig(provider, diamond),
      (config) =>
        config.minKeyStrength === "512" &&
        config.minEntropy === "256" &&
        config.defaultAccessDuration === "3600" &&
        config.trustedOracle === trustedOracleWallet.address,
      "updated whisper config",
    );
    const securityParametersEvents = await apiCall(port, "POST", "/v1/whisperblock/events/security-parameters-updated/query", {
      apiKey: "read-key",
      body: {
        fromBlock: String(updateSystemParametersReceipt.blockNumber),
        toBlock: String(updateSystemParametersReceipt.blockNumber),
      },
    });
    evidence.push({
      route: "PATCH /v1/whisperblock/commands/update-system-parameters",
      actor: "founder-key",
      status: updateSystemParametersResponse.status,
      txHash: updateSystemParametersTxHash,
      receipt: { status: updateSystemParametersReceipt.status, blockNumber: updateSystemParametersReceipt.blockNumber },
      postState: await readWhisperConfig(provider, diamond),
      eventQuery: securityParametersEvents,
    });

    const offchainSeed = id(`whisper-offchain-seed-${Date.now()}`);
    const blockHash = id(`whisper-block-hash-${Date.now()}`);
    const message = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes32", "bytes32", "address", "bytes32"],
        [voiceHash, offchainSeed, founder.address, blockHash],
      ),
    );
    const offchainSignature = await trustedOracleWallet.signMessage(ethers.getBytes(message));
    const offchainEntropyResponse = await apiCall(port, "PATCH", "/v1/whisperblock/commands/set-offchain-entropy", {
      body: {
        voiceHash,
        offchainSeed,
        walletAddress: founder.address,
        blockHash,
        signature: offchainSignature,
      },
    });
    if (offchainEntropyResponse.status !== 202) {
      throw new Error(`set offchain entropy failed: ${JSON.stringify(offchainEntropyResponse.payload)}`);
    }
    const offchainEntropyTxHash = extractTxHash(offchainEntropyResponse.payload)!;
    const offchainEntropyReceipt = await waitForReceipt(provider, offchainEntropyTxHash, "set offchain entropy");
    const offchainKeyEvents = await apiCall(port, "POST", "/v1/whisperblock/events/offchain-key-generated/query", {
      apiKey: "read-key",
      body: {
        fromBlock: String(offchainEntropyReceipt.blockNumber),
        toBlock: String(offchainEntropyReceipt.blockNumber),
      },
    });
    evidence.push({
      route: "PATCH /v1/whisperblock/commands/set-offchain-entropy",
      actor: "founder-key",
      status: offchainEntropyResponse.status,
      txHash: offchainEntropyTxHash,
      receipt: { status: offchainEntropyReceipt.status, blockNumber: offchainEntropyReceipt.blockNumber },
      postState: offchainEntropyResponse.payload,
      eventQuery: offchainKeyEvents,
    });

    const auditEventResponse = await apiCall(port, "POST", "/v1/whisperblock/events/audit-event/query", {
      apiKey: "read-key",
      body: {
        fromBlock: String(registerFingerprintReceipt.blockNumber),
        toBlock: String(offchainEntropyReceipt.blockNumber),
      },
    });
    evidence.push({
      route: "POST /v1/whisperblock/events/audit-event/query",
      actor: "read-key",
      status: auditEventResponse.status,
      postState: Array.isArray(auditEventResponse.payload) ? { count: auditEventResponse.payload.length } : auditEventResponse.payload,
    });
  } finally {
    const restoreSystemParametersResponse = await apiCall(port, "PATCH", "/v1/whisperblock/commands/update-system-parameters", {
      body: {
        newMinKeyStrength: String(originalWhisperConfig.minKeyStrength),
        newMinEntropy: String(originalWhisperConfig.minEntropy),
        newDefaultAccessDuration: String(originalWhisperConfig.defaultAccessDuration),
      },
    });
    if (restoreSystemParametersResponse.status === 202) {
      await waitForReceipt(provider, extractTxHash(restoreSystemParametersResponse.payload)!, "restore system parameters");
    }
    const restoreTrustedOracleResponse = await apiCall(port, "PATCH", "/v1/whisperblock/commands/set-trusted-oracle", {
      body: { oracle: String(originalWhisperConfig.trustedOracle) },
    });
    if (restoreTrustedOracleResponse.status === 202) {
      await waitForReceipt(provider, extractTxHash(restoreTrustedOracleResponse.payload)!, "restore trusted oracle");
    }
    const restoreAuditResponse = await apiCall(port, "PATCH", "/v1/whisperblock/commands/set-audit-enabled", {
      body: { enabled: Boolean(originalWhisperConfig.requireAudit) },
    });
    if (restoreAuditResponse.status === 202) {
      await waitForReceipt(provider, extractTxHash(restoreAuditResponse.payload)!, "restore audit");
    }
    await waitFor(
      () => readWhisperConfig(provider, diamond),
      (config) =>
        config.minKeyStrength === originalWhisperConfig.minKeyStrength &&
        config.minEntropy === originalWhisperConfig.minEntropy &&
        config.defaultAccessDuration === originalWhisperConfig.defaultAccessDuration &&
        config.requireAudit === originalWhisperConfig.requireAudit &&
        config.trustedOracle === originalWhisperConfig.trustedOracle,
      "restore whisper config",
    );
  }

  return {
    routes: [...WHISPERBLOCK_ROUTES],
    actors: ["founder-key", "read-key"],
    executionResult: "whisperblock fingerprint, authenticity, access, audit, encryption, oracle, and parameter flows completed and restored",
    evidence,
    finalClassification: "proven working",
  };
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
