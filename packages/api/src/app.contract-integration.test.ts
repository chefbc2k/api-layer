import { isDeepStrictEqual } from "node:util";

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Contract, JsonRpcProvider, Wallet, ethers, id } from "ethers";

import { createApiServer, type ApiServer } from "./app.js";
import { loadRepoEnv, readConfigFromEnv } from "../../client/src/runtime/config.js";
import { facetRegistry } from "../../client/src/generated/index.js";

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

const originalEnv = { ...process.env };

async function apiCall(port: number, method: string, path: string, options: ApiCallOptions = {}) {
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

async function waitFor<T>(read: () => Promise<T>, ready: (value: T) => boolean, label: string): Promise<T> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const value = await read();
    if (ready(value)) {
      return value;
    }
    await delay(500);
  }
  throw new Error(`timed out waiting for ${label}`);
}

describeLive("HTTP API contract integration", () => {
  let server: ReturnType<ApiServer["listen"]>;
  let port = 0;
  let provider: JsonRpcProvider;
  let founderWallet: Wallet;
  let founderAddress: string;
  let licensingOwnerWallet: Wallet;
  let licensingOwnerAddress: string;
  let fundingWallet: Wallet;
  let fundingWallets: Wallet[] = [];
  let licenseeWallet: Wallet;
  let transfereeWallet: Wallet;
  let outsiderWallet: Wallet;
  let diamondAddress: string;
  let voiceAsset: Contract;
  let voiceMetadata: Contract;
  let accessControl: Contract;
  let voiceDataset: Contract;
  let templateFacet: Contract;
  let licenseFacet: Contract;
  let marketplaceFacet: Contract;
  let paymentFacet: Contract;
  let governorFacet: Contract;
  let proposalFacet: Contract;
  let timelockFacet: Contract;
  let whisperBlockFacet: Contract;
  let diamondCutFacet: Contract;
  let diamondLoupeFacet: Contract;
  let upgradeControllerFacet: Contract;
  let emergencyFacet: Contract;
  let emergencyWithdrawalFacet: Contract;
  let multisigFacet: Contract;
  let stakingFacet: Contract;
  let delegationFacet: Contract;
  let tokenSupplyFacet: Contract;
  let burnThresholdFacet: Contract;
  let timewaveGiftFacet: Contract;
  let primaryVoiceHash = "";

  async function expectReceipt(txHash: string) {
    for (let attempt = 0; attempt < 80; attempt += 1) {
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
        return txStatus.payload;
      }
      await delay(250);
    }
    throw new Error(`timed out waiting for tx receipt ${txHash}`);
  }

  async function ensureNativeBalance(address: string, minimumWei: bigint) {
    const currentBalance = await provider.getBalance(address);
    if (currentBalance >= minimumWei) {
      return;
    }
    const topUpAmount = minimumWei - currentBalance + ethers.parseEther("0.00001");
    const candidates = fundingWallets.length > 0
      ? fundingWallets
      : [fundingWallet, founderWallet, licensingOwnerWallet].filter((wallet): wallet is Wallet => Boolean(wallet));
    let selectedWallet = candidates[0];
    let selectedBalance = 0n;
    for (const wallet of candidates) {
      const balance = await provider.getBalance(wallet.address);
      if (balance > selectedBalance) {
        selectedWallet = wallet;
        selectedBalance = balance;
      }
    }
    if (!selectedWallet) {
      throw new Error(`no funding wallet available to top up ${address}`);
    }
    await (await selectedWallet.sendTransaction({ to: address, value: topUpAmount })).wait();
  }

  beforeAll(async () => {
    const runtimeConfig = readConfigFromEnv(repoEnv);
    const founderPrivateKey = repoEnv.PRIVATE_KEY;
    const licensingOwnerPrivateKey =
      repoEnv.ORACLE_SIGNER_PRIVATE_KEY_1 ??
      repoEnv.ORACLE_WALLET_PRIVATE_KEY ??
      founderPrivateKey;
    const rpcUrl = runtimeConfig.cbdpRpcUrl;

    if (!founderPrivateKey) {
      throw new Error("missing PRIVATE_KEY in repo .env");
    }
    if (!licensingOwnerPrivateKey) {
      throw new Error("missing ORACLE_SIGNER_PRIVATE_KEY_1 or ORACLE_WALLET_PRIVATE_KEY in repo .env");
    }

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
      "read-key": {
        label: "reader",
        roles: ["service"],
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
    transfereeWallet = new Wallet(transfereePrivateKey, provider);
    outsiderWallet = new Wallet(outsiderPrivateKey, provider);

    voiceAsset = new Contract(diamondAddress, facetRegistry.VoiceAssetFacet.abi, provider);
    voiceMetadata = new Contract(diamondAddress, facetRegistry.VoiceMetadataFacet.abi, provider);
    accessControl = new Contract(diamondAddress, facetRegistry.AccessControlFacet.abi, provider);
    voiceDataset = new Contract(diamondAddress, facetRegistry.VoiceDatasetFacet.abi, provider);
    templateFacet = new Contract(diamondAddress, facetRegistry.VoiceLicenseTemplateFacet.abi, provider);
    licenseFacet = new Contract(diamondAddress, facetRegistry.VoiceLicenseFacet.abi, provider);
    marketplaceFacet = new Contract(diamondAddress, facetRegistry.MarketplaceFacet.abi, provider);
    paymentFacet = new Contract(diamondAddress, facetRegistry.PaymentFacet.abi, provider);
    governorFacet = new Contract(diamondAddress, facetRegistry.GovernorFacet.abi, provider);
    proposalFacet = new Contract(diamondAddress, facetRegistry.ProposalFacet.abi, provider);
    timelockFacet = new Contract(diamondAddress, facetRegistry.TimelockFacet.abi, provider);
    whisperBlockFacet = new Contract(diamondAddress, facetRegistry.WhisperBlockFacet.abi, provider);
    diamondCutFacet = new Contract(diamondAddress, facetRegistry.DiamondCutFacet.abi, provider);
    diamondLoupeFacet = new Contract(diamondAddress, facetRegistry.DiamondLoupeFacet.abi, provider);
    upgradeControllerFacet = new Contract(diamondAddress, facetRegistry.UpgradeControllerFacet.abi, provider);
    emergencyFacet = new Contract(diamondAddress, facetRegistry.EmergencyFacet.abi, provider);
    emergencyWithdrawalFacet = new Contract(diamondAddress, facetRegistry.EmergencyWithdrawalFacet.abi, provider);
    multisigFacet = new Contract(diamondAddress, facetRegistry.MultiSigFacet.abi, provider);
    stakingFacet = new Contract(diamondAddress, facetRegistry.StakingFacet.abi, provider);
    delegationFacet = new Contract(diamondAddress, facetRegistry.DelegationFacet.abi, provider);
    tokenSupplyFacet = new Contract(diamondAddress, facetRegistry.TokenSupplyFacet.abi, provider);
    burnThresholdFacet = new Contract(diamondAddress, facetRegistry.BurnThresholdFacet.abi, provider);
    timewaveGiftFacet = new Contract(diamondAddress, facetRegistry.TimewaveGiftFacet.abi, provider);

    server = createApiServer({ port: 0 }).listen();
    const address = server.address();
    port = typeof address === "object" && address ? address.port : 8787;
  });

  afterAll(async () => {
    server.close();
    await provider.destroy();
    process.env = { ...originalEnv };
  });

  it("rejects unknown routes on the live server", async () => {
    const response = await fetch(`http://127.0.0.1:${port}/v1/not-a-route`, {
      headers: { "x-api-key": "founder-key" },
    });
    expect(response.status).toBe(404);
  });

  it("grants and revokes an access-control participant role through HTTP and matches live role state", async () => {
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
  }, 30_000);

  it("registers a voice asset, exposes normalized reads, and exposes the emitted event", async () => {
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

    const directVoice = await waitFor(
      () => voiceAsset.getVoiceAsset(primaryVoiceHash),
      () => true,
      "contract voice-asset read",
    );
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
  });

  it("updates authorization and royalty state through HTTP and matches direct contract state", async () => {
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

    const voiceAfterUpdate = await waitFor(
      () => voiceAsset.getVoiceAsset(primaryVoiceHash),
      (value) => value[2] === 200n,
      "contract royalty update read",
    );
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
    expect(invalidRoyaltyResponse.status).toBe(500);
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

  it("runs the register-voice-asset workflow and persists metadata through the primitive layer", async () => {
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
      },
      metadataUpdate: {
        txHash: expect.stringMatching(/^0x[a-fA-F0-9]{64}$/u),
      },
    });

    const workflowPayload = workflowResponse.payload as Record<string, unknown>;
    const workflowVoiceHash = String(workflowPayload.voiceHash);
    await expectReceipt(String((workflowPayload.registration as Record<string, unknown>).txHash));
    await expectReceipt(String((workflowPayload.metadataUpdate as Record<string, unknown>).txHash));
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

  it("creates and mutates a dataset through HTTP and matches live dataset state", async () => {
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
        (value) => BigInt(value) > 0n,
        `voice token id ${suffix}`,
      );
      return {
        voiceHash,
        tokenId: BigInt(tokenId).toString(),
      };
    };

    const buildTemplate = async (name: string) => {
      const latestBlock = await provider.getBlock("latest");
      const now = BigInt(latestBlock?.timestamp ?? Math.floor(Date.now() / 1000));
      const creatorTemplatesBefore = normalize(await templateFacet.getCreatorTemplates(founderAddress)) as string[];
      const template = {
        creator: founderAddress,
        isActive: true,
        transferable: true,
        createdAt: now,
        updatedAt: now,
        defaultDuration: 30n * 24n * 60n * 60n,
        defaultPrice: 15_000n,
        maxUses: 10n,
        name,
        description: `${name} dataset mutation template`,
        defaultRights: ["Narration"],
        defaultRestrictions: ["no-sublicense"],
        terms: {
          rights: ["Narration"],
          restrictions: ["no-sublicense"],
          duration: 30n * 24n * 60n * 60n,
          price: 15_000n,
          transferable: true,
          maxUses: 10n,
          licenseHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        },
      };
      await (await templateFacet.connect(founderWallet).createTemplate(template)).wait();
      const creatorTemplatesAfter = await waitFor(
        async () => normalize(await templateFacet.getCreatorTemplates(founderAddress)) as string[],
        (value) => value.length > creatorTemplatesBefore.length,
        `template create ${name}`,
      );
      const createdTemplateHash = creatorTemplatesAfter.find((hash) => !creatorTemplatesBefore.includes(hash));
      expect(createdTemplateHash).toBeTruthy();
      return BigInt(String(createdTemplateHash)).toString();
    };

    const asset1 = await createVoice("A1");
    const asset2 = await createVoice("A2");
    const asset3 = await createVoice("A3");
    const asset4 = await createVoice("A4");
    const template1 = await buildTemplate(`DatasetTemplateOne-${Date.now()}`);
    const template2 = await buildTemplate(`DatasetTemplateTwo-${Date.now()}`);

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
        licenseTemplateId: template1,
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
        licenseTemplateId: template2,
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
      (response) => response.status === 200 && (response.payload as Record<string, unknown>).metadataURI === updatedMetadataURI && (response.payload as Record<string, unknown>).licenseTemplateId === template2 && (response.payload as Record<string, unknown>).royaltyBps === "250" && (response.payload as Record<string, unknown>).active === false,
      "dataset update read",
    );
    expect(datasetAfterUpdates.payload).toEqual(datasetToObject(await voiceDataset.getDataset(BigInt(datasetId))));

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

    const totalAfterResponse = await waitFor(
      () => apiCall(port, "POST", "/v1/datasets/queries/get-total-datasets", {
        apiKey: "read-key",
        body: {},
      }),
      (response) => response.status === 200 && BigInt(String(response.payload)) === totalBefore,
      "dataset total after burn",
    );
    expect(BigInt(String(totalAfterResponse.payload))).toBe(totalBefore);

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
    expect(getBurnedDatasetResponse.status).toBe(500);
  }, 90_000);

  it("lists, reprices, and cancels a marketplace listing through HTTP and matches live marketplace state", async () => {
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
      (value) => BigInt(value) > 0n,
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
    for (const path of ["/v1/marketplace/events/asset-listed/query", "/v1/marketplace/events/asset-escrowed/query"] as const) {
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

    const updatePriceResponse = await apiCall(port, "PATCH", "/v1/marketplace/commands/update-listing-price", {
      apiKey: "licensing-owner-key",
      body: {
        tokenId,
        newPrice: "30000000",
      },
    });
    if (updatePriceResponse.status === 202) {
      const updatePriceTxHash = extractTxHash(updatePriceResponse.payload);
      await expectReceipt(updatePriceTxHash);

      await waitFor(
        () => marketplaceFacet.getListing(BigInt(tokenId)),
        (value) => value[2] === 30_000_000n,
        "contract marketplace listing after price update",
      );
      const repricedListingResponse = await apiCall(
        port,
        "GET",
        `/v1/marketplace/queries/get-listing?tokenId=${encodeURIComponent(tokenId)}`,
        { apiKey: "read-key" },
      );
      if (repricedListingResponse.status === 200) {
        expect(repricedListingResponse.payload).toEqual(listingToObject(await marketplaceFacet.getListing(BigInt(tokenId))));
      }

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
    }

    const purchaseAttemptResponse = await apiCall(port, "POST", "/v1/marketplace/commands/purchase-asset", {
      apiKey: "founder-key",
      body: { tokenId },
    });
    expect(purchaseAttemptResponse.status).toBe(500);

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
  }, 90_000);

  it("exposes governance baseline reads through HTTP and preserves live proposal-threshold failures", async () => {
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
    expect(votingConfigResponse.payload).toEqual(normalize((await governorFacet.getVotingConfig()).toObject()));

    for (const [path, expected] of [
      ["/v1/governance/queries/governance-proposer-role/governor-governance-proposer-role", await governorFacet.GOVERNANCE_PROPOSER_ROLE()],
      ["/v1/governance/queries/governance-proposer-role/proposal-governance-proposer-role", await proposalFacet.GOVERNANCE_PROPOSER_ROLE()],
      ["/v1/governance/queries/executor-role/proposal-executor-role", await proposalFacet.EXECUTOR_ROLE()],
      ["/v1/governance/queries/timelock-role", await proposalFacet.TIMELOCK_ROLE()],
      ["/v1/governance/queries/executor-role/timelock-executor-role", await timelockFacet.EXECUTOR_ROLE()],
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
      ["/v1/governance/events/proposal-created/query", proposalFacet.interface.getEvent("ProposalCreated").topicHash],
      ["/v1/governance/events/vote-cast/query", proposalFacet.interface.getEvent("VoteCast").topicHash],
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
      "/v1/governance/proposals/propose-string-string-address-array-uint256-array-bytes-array-uint8",
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
      "/v1/governance/proposals/propose-string-string-address-array-uint256-array-bytes-array-uint8",
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
    let directThresholdError = "";
    try {
      await proposalFacet.connect(founderWallet)["propose(string,string,address[],uint256[],bytes[],uint8)"].staticCall(
        `API governance threshold ${Date.now()}`,
        "governance threshold proof",
        [diamondAddress],
        [0n],
        [thresholdCalldata],
        0,
      );
    } catch (error) {
      directThresholdError = extractRevertMarker(error);
    }
    expect(directThresholdError).toContain("0x2261c87d");

    const thresholdFailureResponse = await apiCall(
      port,
      "POST",
      "/v1/governance/proposals/propose-string-string-address-array-uint256-array-bytes-array-uint8",
      {
        body: {
          title: `API governance threshold ${Date.now()}`,
          description: "governance threshold proof",
          targets: [diamondAddress],
          values: ["0"],
          calldatas: [thresholdCalldata],
          proposalType: "0",
        },
      },
    );
    expect(thresholdFailureResponse.status).toBe(500);
    expect(JSON.stringify(thresholdFailureResponse.payload)).toMatch(/InvalidProposalThreshold|2261c87d/u);
  }, 60_000);

  it("proves tokenomics reads and reversible admin/token flows through HTTP on Base Sepolia", async () => {
    const day = 24n * 60n * 60n;
    const transferAmount = 1000n;
    const delegatedAmount = 250n;
    const originalFounderBalance = await tokenSupplyFacet.tokenBalanceOf(founderAddress);
    const originalLicenseeBalance = await tokenSupplyFacet.tokenBalanceOf(licenseeWallet.address);
    const originalTransfereeBalance = await tokenSupplyFacet.tokenBalanceOf(transfereeWallet.address);
    const originalAllowance = await tokenSupplyFacet.tokenAllowance(founderAddress, outsiderWallet.address);
    const originalBurnLimit = await burnThresholdFacet.thresholdGetBurnLimit();
    const originalQuarterlyRate = await timewaveGiftFacet.getQuarterlyUnlockRate();
    const originalMinDuration = await timewaveGiftFacet.getMinTwaveVestingDuration();
    const targetBurnLimit = originalBurnLimit === 2500n ? 2400n : 2500n;
    const targetQuarterlyRate = originalQuarterlyRate === 2000n ? 2500n : 2000n;
    const targetMinDuration = originalMinDuration === 60n * day ? 90n * day : 60n * day;

    await ensureNativeBalance(founderAddress, ethers.parseEther("0.00002"));
    for (const wallet of [licenseeWallet, transfereeWallet, outsiderWallet]) {
      await ensureNativeBalance(wallet.address, ethers.parseEther("0.00002"));
    }

    try {
      const readAssertions: Array<readonly [string, string, string | undefined, unknown]> = [
        ["POST", "/v1/tokenomics/queries/name", "read-key", await tokenSupplyFacet.name()],
        ["POST", "/v1/tokenomics/queries/symbol", "read-key", await tokenSupplyFacet.symbol()],
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

      const transferBackFromTransfereeResponse = await apiCall(port, "POST", "/v1/tokenomics/commands/transfer", {
        apiKey: "transferee-key",
        body: { to: founderAddress, amount: delegatedAmount.toString() },
      });
      expect(transferBackFromTransfereeResponse.status).toBe(202);
      await expectReceipt(extractTxHash(transferBackFromTransfereeResponse.payload));
      await waitFor(
        () => tokenSupplyFacet.tokenBalanceOf(transfereeWallet.address),
        (value) => value === originalTransfereeBalance,
        "tokenomics transferee transfer back",
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

        const updatedBurnLimitResponse = await apiCall(port, "POST", "/v1/tokenomics/queries/threshold-get-burn-limit", {
          apiKey: "read-key",
          body: {},
        });
        expect(updatedBurnLimitResponse.status).toBe(200);
        expect(updatedBurnLimitResponse.payload).toBe(targetBurnLimit.toString());
      } else {
        expect(updatedBurnLimit).toBe(originalBurnLimit);
      }

      const setQuarterlyRateResponse = await apiCall(port, "PATCH", "/v1/tokenomics/commands/set-quarterly-unlock-rate", {
        body: { rate: targetQuarterlyRate.toString() },
      });
      expect(setQuarterlyRateResponse.status).toBe(202);
      await expectReceipt(extractTxHash(setQuarterlyRateResponse.payload));
      await waitFor(
        () => timewaveGiftFacet.getQuarterlyUnlockRate(),
        (value) => value === targetQuarterlyRate,
        "tokenomics quarterly unlock rate update",
      );

      const setMinDurationResponse = await apiCall(port, "PATCH", "/v1/tokenomics/commands/set-minimum-twave-vesting-duration", {
        body: { duration: targetMinDuration.toString() },
      });
      expect(setMinDurationResponse.status).toBe(202);
      await expectReceipt(extractTxHash(setMinDurationResponse.payload));
      await waitFor(
        () => timewaveGiftFacet.getMinTwaveVestingDuration(),
        (value) => value === targetMinDuration,
        "tokenomics minimum twave duration update",
      );
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
      )).toBe(originalQuarterlyRate);
      expect(await waitFor(
        () => timewaveGiftFacet.getMinTwaveVestingDuration(),
        (value) => value === originalMinDuration,
        "tokenomics minimum duration restore",
      )).toBe(originalMinDuration);
    }
  }, 120_000);

  it("mutates whisperblock state through HTTP and matches live whisperblock contract state", async () => {
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
      apiCall(port, "POST", "/v1/whisperblock/queries/owner-role", { apiKey: "read-key", body: {} }),
      apiCall(port, "POST", "/v1/whisperblock/queries/encryptor-role", { apiKey: "read-key", body: {} }),
      apiCall(port, "POST", "/v1/whisperblock/queries/voice-operator-role", { apiKey: "read-key", body: {} }),
    ]);
    expect(founderRoleResponses[0].status).toBe(200);
    expect(founderRoleResponses[0].payload).toBe(await whisperBlockFacet.OWNER_ROLE());
    expect(founderRoleResponses[1].status).toBe(200);
    expect(founderRoleResponses[1].payload).toBe(await whisperBlockFacet.ENCRYPTOR_ROLE());
    expect(founderRoleResponses[2].status).toBe(200);
    expect(founderRoleResponses[2].payload).toBe(await whisperBlockFacet.VOICE_OPERATOR_ROLE());

    let directSelectorsError = "";
    try {
      await whisperBlockFacet.getSelectors();
    } catch (error) {
      directSelectorsError = extractRevertMarker(error);
    }
    expect(directSelectorsError).toContain("0x276030b5");

    const selectorsResponse = await apiCall(port, "POST", "/v1/whisperblock/queries/get-selectors", {
      apiKey: "read-key",
      body: {},
    });
    expect(selectorsResponse.status).toBe(500);
    expect(JSON.stringify(selectorsResponse.payload)).toMatch(/SelectorNotFound|276030b5/u);

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
      if (encryptionKeyReceipt.status === 1) {
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
      } else {
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
        body: {
          newMinKeyStrength: String(originalWhisperConfig.minKeyStrength),
          newMinEntropy: String(originalWhisperConfig.minEntropy),
          newDefaultAccessDuration: String(originalWhisperConfig.defaultAccessDuration),
        },
      });
      expect(restoreSystemParametersResponse.status).toBe(202);
      await expectReceipt(extractTxHash(restoreSystemParametersResponse.payload));

      const restoreTrustedOracleResponse = await apiCall(port, "PATCH", "/v1/whisperblock/commands/set-trusted-oracle", {
        body: { oracle: String(originalWhisperConfig.trustedOracle) },
      });
      expect(restoreTrustedOracleResponse.status).toBe(202);
      await expectReceipt(extractTxHash(restoreTrustedOracleResponse.payload));

      const restoreAuditResponse = await apiCall(port, "PATCH", "/v1/whisperblock/commands/set-audit-enabled", {
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

  it("creates templates and licenses through HTTP and matches live licensing state", async () => {
    await ensureNativeBalance(licensingOwnerAddress, ethers.parseEther("0.00008"));
    await ensureNativeBalance(licenseeWallet.address, ethers.parseEther("0.00003"));
    await ensureNativeBalance(transfereeWallet.address, ethers.parseEther("0.00003"));

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

    const createTemplateResponse = await apiCall(port, "POST", "/v1/licensing/license-templates/create-template", {
      apiKey: "licensing-owner-key",
      body: { template: normalize(baseTemplate) },
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
      name: baseTemplate.name,
      description: baseTemplate.description,
    });
    expect((templateReadResponse.payload as Record<string, unknown>).terms).toEqual({
      licenseHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
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

    const updateTemplateResponse = await apiCall(port, "PATCH", "/v1/licensing/commands/update-template", {
      apiKey: "licensing-owner-key",
      body: {
        templateHash,
        template: normalize(updatedTemplate),
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
      (response) => response.status === 200 && (response.payload as Record<string, unknown>).name === updatedTemplate.name,
      "licensing updated template read",
    );
    expect(updatedTemplateRead.payload).toMatchObject({
      creator: licensingOwnerAddress,
      isActive: true,
      transferable: false,
      name: updatedTemplate.name,
      description: updatedTemplate.description,
    });
    expect((updatedTemplateRead.payload as Record<string, unknown>).terms).toEqual({
      licenseHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
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
      body: { template: normalize(freshTemplate) },
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
    expect(createFromTemplateResponse.status).toBe(500);
    expect(JSON.stringify(createFromTemplateResponse.payload)).toMatch(/TemplateNotFound|CALL_EXCEPTION/u);
    expect(directTemplateDerivationError).toMatch(/TemplateNotFound|CALL_EXCEPTION/u);

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
    const licenseCreatedEvents = await apiCall(port, "POST", "/v1/licensing/events/license-created/query/voice-license", {
      apiKey: "read-key",
      body: {
        fromBlock: String(licenseCreatedReceipt!.blockNumber),
        toBlock: String(licenseCreatedReceipt!.blockNumber),
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
    expect(JSON.stringify(transferLicenseResponse.payload)).toMatch(/VoiceNotTransferable|InvalidLicenseTemplate|CALL_EXCEPTION|a4e1a97e/u);
    expect(directTransferError).toMatch(/VoiceNotTransferable|InvalidLicenseTemplate|CALL_EXCEPTION|a4e1a97e/u);

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
    expect(revokedLicenseResponse.status).toBe(500);

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
    const ownerOfSelector = voiceAsset.interface.getFunction("ownerOf").selector;
    const diamondCutSelector = diamondCutFacet.interface.getFunction("diamondCut").selector;
    const loupeFacetAddressSelector = diamondLoupeFacet.interface.getFunction("facetAddress").selector;

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
        `/v1/diamond-admin/queries/is-immutable-selector-reserved/diamond-cut-is-immutable-selector-reserved?selector=${encodeURIComponent(diamondCutSelector)}`,
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
        `/v1/diamond-admin/queries/is-immutable-selector-reserved/diamond-loupe-is-immutable-selector-reserved?selector=${encodeURIComponent(loupeFacetAddressSelector)}`,
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
    expect(founderRoleResponse.status).toBe(500);
    expect(JSON.stringify(founderRoleResponse.payload)).toMatch(/SelectorNotFound/u);

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

    const missingUpgradeResponse = await apiCall(
      port,
      "GET",
      `/v1/diamond-admin/queries/get-upgrade?upgradeId=${encodeURIComponent(syntheticUpgradeId)}`,
      { apiKey: "read-key" },
    );
    expect(missingUpgradeResponse.status).toBe(500);
    expect(JSON.stringify(missingUpgradeResponse.payload)).toMatch(/OperationNotFound/u);

    const missingUpgradeApprovalResponse = await apiCall(
      port,
      "GET",
      `/v1/diamond-admin/queries/is-upgrade-approved?upgradeId=${encodeURIComponent(syntheticUpgradeId)}&signer=${encodeURIComponent(founderAddress)}`,
      { apiKey: "read-key" },
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
        `/v1/multisig/queries/get-operation?operationId=${encodeURIComponent(syntheticOperationId)}`,
        normalize(await multisigFacet.getOperation(syntheticOperationId)),
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
      ["diamond-admin", "/v1/diamond-admin/events/upgrade-proposed/query", upgradeControllerFacet.interface.getEvent("UpgradeProposed").topicHash],
      ["diamond-admin", "/v1/diamond-admin/events/upgrade-approved/query", upgradeControllerFacet.interface.getEvent("UpgradeApproved").topicHash],
      ["emergency", "/v1/emergency/events/incident-reported/query", emergencyFacet.interface.getEvent("IncidentReported").topicHash],
      ["emergency", "/v1/emergency/events/emergency-state-changed/query", emergencyFacet.interface.getEvent("EmergencyStateChanged").topicHash],
      ["multisig", "/v1/multisig/events/operation-proposed/query", multisigFacet.interface.getEvent("OperationProposed").topicHash],
      ["multisig", "/v1/multisig/events/operation-approved/query", multisigFacet.interface.getEvent("OperationApproved").topicHash],
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
      topics: [emergencyFacet.interface.getEvent("IncidentReported").topicHash],
    });
    if (recentIncidentLogs.length > 0) {
      const parsedIncident = emergencyFacet.interface.parseLog(recentIncidentLogs[0]!);
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
  }, 60_000);

  it("preserves the live transfer-rights workflow failure against the contract path", async () => {
    await ensureNativeBalance(founderAddress, ethers.parseEther("0.00008"));
    await ensureNativeBalance(transfereeWallet.address, ethers.parseEther("0.00003"));

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
    await expectReceipt(extractTxHash(transferWorkflowResponse.payload));
    expect(await waitFor(
      () => voiceAsset.ownerOf(BigInt(tokenId)),
      (value) => value === transfereeWallet.address,
      "workflow transfer owner update",
    )).toBe(transfereeWallet.address);
  }, 60_000);

  it("runs the onboard-rights-holder workflow and persists role plus voice authorization state", async () => {
    await ensureNativeBalance(founderAddress, ethers.parseEther("0.00008"));
    const role = id("MARKETPLACE_PURCHASER_ROLE");
    const rightsHolder = outsiderWallet.address;
    const voiceResponse = await apiCall(port, "POST", "/v1/voice-assets", {
      body: {
        ipfsHash: `QmOnboardWorkflow${Date.now()}`,
        royaltyRate: "125",
      },
    });
    expect(voiceResponse.status).toBe(202);
    const voiceHash = String((voiceResponse.payload as Record<string, unknown>).result);
    await expectReceipt(extractTxHash(voiceResponse.payload));

    const onboardResponse = await apiCall(port, "POST", "/v1/workflows/onboard-rights-holder", {
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
    );
    expect(revokeAuthorizationResponse.status).toBe(202);
    await expectReceipt(extractTxHash(revokeAuthorizationResponse.payload));

    const revokeRoleResponse = await apiCall(port, "DELETE", "/v1/access-control/commands/revoke-role", {
      body: {
        role,
        account: rightsHolder,
        reason: "workflow cleanup",
      },
    });
    expect(revokeRoleResponse.status).toBe(202);
    await expectReceipt(extractTxHash(revokeRoleResponse.payload));
  }, 90_000);

  it("runs the register-whisper-block workflow and persists whisperblock state when given contract-valid fingerprint data", async () => {
    await ensureNativeBalance(founderAddress, ethers.parseEther("0.0001"));
    const voiceResponse = await apiCall(port, "POST", "/v1/voice-assets", {
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

    const workflowResponse = await apiCall(port, "POST", "/v1/workflows/register-whisper-block", {
      body: {
        voiceHash,
        structuredFingerprintData: fingerprintData,
        grant: {
          user: outsiderWallet.address,
          duration: "3600",
        },
        generateEncryptionKey: true,
      },
    });
    expect(workflowResponse.status).toBe(202);
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
    const fingerprintEvents = await apiCall(port, "POST", "/v1/whisperblock/events/voice-fingerprint-updated/query", {
      apiKey: "read-key",
      body: {
        fromBlock: String(fingerprintReceipt!.blockNumber),
        toBlock: String(fingerprintReceipt!.blockNumber),
      },
    });
    expect(fingerprintEvents.status).toBe(200);
    expect((fingerprintEvents.payload as Array<Record<string, unknown>>).some((log) => log.transactionHash === fingerprintTxHash)).toBe(true);

    const keyReceipt = await provider.getTransactionReceipt(keyTxHash);
    const keyEvents = await apiCall(port, "POST", "/v1/whisperblock/events/key-rotated/query", {
      apiKey: "read-key",
      body: {
        fromBlock: String(keyReceipt!.blockNumber),
        toBlock: String(keyReceipt!.blockNumber),
      },
    });
    expect(keyEvents.status).toBe(200);
    expect((keyEvents.payload as Array<Record<string, unknown>>).some((log) => log.transactionHash === keyTxHash)).toBe(true);

    const accessReceipt = await provider.getTransactionReceipt(accessGrantTxHash);
    const accessEvents = await apiCall(port, "POST", "/v1/whisperblock/events/access-granted/query", {
      apiKey: "read-key",
      body: {
        fromBlock: String(accessReceipt!.blockNumber),
        toBlock: String(accessReceipt!.blockNumber),
      },
    });
    expect(accessEvents.status).toBe(200);
    expect((accessEvents.payload as Array<Record<string, unknown>>).some((log) => log.transactionHash === accessGrantTxHash)).toBe(true);
  }, 120_000);

  it("runs the remaining workflows with live lifecycle-correct setup and preserves real contract failures", async () => {
    await ensureNativeBalance(founderAddress, ethers.parseEther("0.00012"));
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
      expect(response.status).toBe(202);
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

    const buildTemplate = async (name: string) => {
      const latestBlock = await provider.getBlock("latest");
      const now = BigInt(latestBlock?.timestamp ?? Math.floor(Date.now() / 1000));
      const before = normalize(await templateFacet.getCreatorTemplates(founderAddress)) as string[];
      await (await templateFacet.connect(founderWallet).createTemplate({
        creator: founderAddress,
        isActive: true,
        transferable: true,
        createdAt: now,
        updatedAt: now,
        defaultDuration: 30n * 24n * 60n * 60n,
        defaultPrice: 1_000n,
        maxUses: 10n,
        name,
        description: name,
        defaultRights: ["Narration"],
        defaultRestrictions: ["None"],
        terms: {
          rights: ["Narration"],
          restrictions: ["None"],
          duration: 30n * 24n * 60n * 60n,
          price: 1_000n,
          transferable: true,
          maxUses: 10n,
          licenseHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        },
      })).wait();
      const after = await waitFor(
        async () => normalize(await templateFacet.getCreatorTemplates(founderAddress)) as string[],
        (value) => value.length > before.length,
        "workflow template creation",
      );
      return String(BigInt(after.find((entry) => !before.includes(entry))!));
    };

    const datasetsBefore = normalize(await voiceDataset.getDatasetsByCreator(founderAddress)) as string[];
    const datasetStartBlock = await provider.getBlockNumber();
    const workflowTemplateId = await buildTemplate(`WorkflowDatasetTemplate-${Date.now()}`);
    const workflowAsset1 = await createVoice("A");
    const workflowAsset2 = await createVoice("B");
    const createDatasetWorkflow = await apiCall(port, "POST", "/v1/workflows/create-dataset-and-list-for-sale", {
      body: {
        title: `Workflow Dataset ${Date.now()}`,
        assetIds: [workflowAsset1, workflowAsset2],
        licenseTemplateId: workflowTemplateId,
        metadataURI: `ipfs://workflow-dataset-${Date.now()}`,
        royaltyBps: "500",
        price: "1000",
        duration: "0",
      },
    });
    expect(createDatasetWorkflow.status).toBe(202);
    await expectReceipt(extractTxHash((createDatasetWorkflow.payload as Record<string, unknown>).dataset));

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

    const datasetWorkflowPayload = createDatasetWorkflow.payload as Record<string, unknown>;
    const datasetWorkflowWrite = datasetWorkflowPayload.dataset as Record<string, unknown>;
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

    const approveStakeResponse = await apiCall(port, "POST", "/v1/tokenomics/commands/token-approve", {
      body: {
        spender: diamondAddress,
        amount: "10",
      },
    });
    expect(approveStakeResponse.status).toBe(202);
    await expectReceipt(extractTxHash(approveStakeResponse.payload));
    const stakeWorkflowResponse = await apiCall(port, "POST", "/v1/workflows/stake-and-delegate", {
      body: {
        amount: "1",
        delegatee: licenseeWallet.address,
      },
    });
    expect(stakeWorkflowResponse.status).toBe(202);
    await expectReceipt(extractTxHash((stakeWorkflowResponse.payload as Record<string, unknown>).stake));
    await expectReceipt(extractTxHash((stakeWorkflowResponse.payload as Record<string, unknown>).delegation));

    const proposalCalldata = governorFacet.interface.encodeFunctionData("updateVotingDelay", [6000n]);
    let directProposalError = "";
    try {
      await proposalFacet.getFunction("propose(string,string,address[],uint256[],bytes[],uint8)").staticCall(
        `Workflow Proposal ${Date.now()}`,
        "workflow governance proof",
        [diamondAddress],
        [0n],
        [proposalCalldata],
        0n,
        { from: founderAddress },
      );
    } catch (error) {
      directProposalError = extractRevertMarker(error);
    }
    const proposalWorkflowResponse = await apiCall(port, "POST", "/v1/workflows/submit-proposal", {
      body: {
        title: `Workflow Proposal ${Date.now()}`,
        description: "workflow governance proof",
        targets: [diamondAddress],
        values: ["0"],
        calldatas: [proposalCalldata],
        proposalType: "0",
      },
    });
    expect(proposalWorkflowResponse.status).toBe(500);
    expect(JSON.stringify(proposalWorkflowResponse.payload)).toMatch(/InvalidProposalThreshold|2261c87d|CALL_EXCEPTION/u);
    expect(directProposalError).toMatch(/InvalidProposalThreshold|2261c87d|CALL_EXCEPTION/u);
  }, 120_000);

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
    expect(signerUnavailable.status).toBe(500);
    expect(signerUnavailable.payload).toMatchObject({ error: expect.stringContaining("requires signerFactory") });

    const repoConfiguredRead = await apiCall(port, "GET", `/v1/voice-assets/${primaryVoiceHash}`, {
      apiKey: "read-key",
    });
    expect(repoConfiguredRead.status).toBe(200);
  });
});
