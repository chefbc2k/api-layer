import { isDeepStrictEqual } from "node:util";

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Contract, JsonRpcProvider, Wallet, id } from "ethers";

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
  let diamondAddress: string;
  let voiceAsset: Contract;
  let voiceMetadata: Contract;
  let accessControl: Contract;
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

  beforeAll(async () => {
    const runtimeConfig = readConfigFromEnv(repoEnv);
    const founderPrivateKey = repoEnv.PRIVATE_KEY;
    const rpcUrl = runtimeConfig.cbdpRpcUrl;

    if (!founderPrivateKey) {
      throw new Error("missing PRIVATE_KEY in repo .env");
    }

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
    });
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({
      founder: founderPrivateKey,
    });

    diamondAddress = runtimeConfig.diamondAddress;
    provider = new JsonRpcProvider(rpcUrl, runtimeConfig.chainId);
    founderWallet = new Wallet(founderPrivateKey, provider);
    founderAddress = await founderWallet.getAddress();

    voiceAsset = new Contract(diamondAddress, facetRegistry.VoiceAssetFacet.abi, provider);
    voiceMetadata = new Contract(diamondAddress, facetRegistry.VoiceMetadataFacet.abi, provider);
    accessControl = new Contract(diamondAddress, facetRegistry.AccessControlFacet.abi, provider);

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
