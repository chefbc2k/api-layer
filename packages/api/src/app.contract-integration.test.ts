import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Contract, JsonRpcProvider, NonceManager, Wallet } from "ethers";

import { createApiServer, type ApiServer } from "./app.js";
import { facetRegistry } from "../../client/src/generated/index.js";

const DEFAULT_FOUNDER_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const DEFAULT_SECONDARY_PRIVATE_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

const liveIntegrationEnabled =
  process.env.API_LAYER_RUN_CONTRACT_INTEGRATION === "1" &&
  Boolean(process.env.API_LAYER_DIAMOND_ADDRESS ?? process.env.DIAMOND_ADDRESS);

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

describeLive("HTTP API contract integration", () => {
  let server: ReturnType<ApiServer["listen"]>;
  let port = 0;
  let provider: JsonRpcProvider;
  let founderWallet: Wallet;
  let founderSigner: NonceManager;
  let founderAddress: string;
  let secondaryWallet: Wallet;
  let secondarySigner: NonceManager;
  let secondaryAddress: string;
  let diamondAddress: string;
  let voiceAsset: Contract;
  let voiceMetadata: Contract;
  let token: Contract;
  let staking: Contract;
  let delegation: Contract;
  let echoScore: Contract;
  let primaryVoiceHash = "";

  async function expectReceipt(txHash: string) {
    await provider.waitForTransaction(txHash);
    const txStatus = await apiCall(port, "GET", `/v1/transactions/${txHash}`, { apiKey: "read-key" });
    expect(txStatus.status).toBe(200);
    expect(txStatus.payload).toMatchObject({
      source: "rpc",
      receipt: {
        hash: txHash,
        status: 1,
      },
    });
    return txStatus.payload;
  }

  beforeAll(async () => {
    const founderPrivateKey = process.env.API_LAYER_TEST_FOUNDER_PRIVATE_KEY ?? DEFAULT_FOUNDER_PRIVATE_KEY;
    const secondaryPrivateKey = process.env.API_LAYER_TEST_SECONDARY_PRIVATE_KEY ?? DEFAULT_SECONDARY_PRIVATE_KEY;
    const rpcUrl = process.env.CBDP_RPC_URL ?? process.env.RPC_URL ?? "http://127.0.0.1:8545";

    process.env.API_LAYER_CHAIN_ID = process.env.API_LAYER_CHAIN_ID ?? process.env.CHAIN_ID ?? "31337";
    process.env.CBDP_RPC_URL = rpcUrl;
    process.env.ALCHEMY_RPC_URL = process.env.ALCHEMY_RPC_URL ?? rpcUrl;
    process.env.API_LAYER_DIAMOND_ADDRESS = process.env.API_LAYER_DIAMOND_ADDRESS ?? process.env.DIAMOND_ADDRESS;
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
    delete process.env.ALCHEMY_API_KEY;

    diamondAddress = String(process.env.API_LAYER_DIAMOND_ADDRESS);
    provider = new JsonRpcProvider(rpcUrl, Number(process.env.API_LAYER_CHAIN_ID));
    founderWallet = new Wallet(founderPrivateKey, provider);
    founderSigner = new NonceManager(founderWallet);
    founderAddress = await founderWallet.getAddress();
    secondaryWallet = new Wallet(secondaryPrivateKey, provider);
    secondarySigner = new NonceManager(secondaryWallet);
    secondaryAddress = await secondaryWallet.getAddress();

    voiceAsset = new Contract(diamondAddress, facetRegistry.VoiceAssetFacet.abi, provider);
    voiceMetadata = new Contract(diamondAddress, facetRegistry.VoiceMetadataFacet.abi, provider);
    token = new Contract(diamondAddress, facetRegistry.TokenSupplyFacet.abi, provider);
    staking = new Contract(diamondAddress, facetRegistry.StakingFacet.abi, provider);
    delegation = new Contract(diamondAddress, facetRegistry.DelegationFacet.abi, provider);
    echoScore = new Contract(diamondAddress, facetRegistry.EchoScoreFacetV3.abi, provider);

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

    const readResponse = await apiCall(port, "GET", `/v1/voice-assets/${primaryVoiceHash}`, {
      apiKey: "read-key",
    });
    expect(readResponse.status).toBe(200);

    const directVoice = await voiceAsset.getVoiceAsset(primaryVoiceHash);
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
    const authorizeResponse = await apiCall(port, "POST", `/v1/voice-assets/${primaryVoiceHash}/authorization-grants`, {
      body: { user: secondaryAddress },
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

    const authorizedRead = await apiCall(
      port,
      "GET",
      `/v1/voice-assets/queries/is-authorized?voiceHash=${encodeURIComponent(primaryVoiceHash)}&user=${encodeURIComponent(secondaryAddress)}`,
      { apiKey: "read-key" },
    );
    expect(authorizedRead.status).toBe(200);
    expect(authorizedRead.payload).toBe(true);
    expect(await voiceAsset.isAuthorized(primaryVoiceHash, secondaryAddress)).toBe(true);

    const voiceAfterUpdate = await voiceAsset.getVoiceAsset(primaryVoiceHash);
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
      `/v1/voice-assets/${primaryVoiceHash}/authorization-grants/${encodeURIComponent(secondaryAddress)}`,
    );
    expect(revokeResponse.status).toBe(202);
    await expectReceipt(extractTxHash(revokeResponse.payload));
    expect(await voiceAsset.isAuthorized(primaryVoiceHash, secondaryAddress)).toBe(false);
  });

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
    const featuresRead = await apiCall(
      port,
      "GET",
      `/v1/voice-assets/queries/get-basic-acoustic-features?voiceHash=${encodeURIComponent(workflowVoiceHash)}`,
      { apiKey: "read-key" },
    );
    expect(featuresRead.status).toBe(200);
    expect(featuresRead.payload).toEqual(features);
    expect(normalize(await voiceMetadata.getBasicAcousticFeatures(workflowVoiceHash))).toEqual(features);
  });

  it("stakes and delegates through HTTP after a real token approval", async () => {
    const day = 24n * 60n * 60n;
    const tokenUnit = 10n ** 10n;
    const thresholds = [10_000n, 50_000n, 200_000n, 500_000n].map((value) => value * tokenUnit);
    const multipliers = [15_000n, 12_500n, 10_000n, 7_500n, 5_000n];
    const rewardFundAmount = 1_000_000n * tokenUnit;
    let stakingInitialized = true;

    try {
      await staking.getStakingStats();
      const config = await staking.getDegradedModeConfig();
      stakingInitialized = Boolean(config.maxStakePerWallet > 0n || config.staleAfterSeconds > 0n);
    } catch {
      stakingInitialized = false;
    }

    if (!stakingInitialized) {
      await (await staking.connect(founderSigner).initStaking(day, day, 1000n, thresholds, multipliers)).wait();
    }

    await (await staking.connect(founderSigner).setDegradedModeConfig(true, 1n, 50_000n * tokenUnit)).wait();
    await (await echoScore.connect(founderSigner).setOracleStalenessConfig(1n)).wait();
    await provider.send("evm_increaseTime", [2]);
    await provider.send("evm_mine", []);
    await (await token.connect(founderSigner).approve(diamondAddress, rewardFundAmount)).wait();
    await (await staking.connect(founderSigner).fundRewardPool(rewardFundAmount)).wait();

    const stakeAmount = "1000";
    await (await token.connect(founderSigner).approve(diamondAddress, BigInt(stakeAmount))).wait();

    const stakeResponse = await apiCall(port, "POST", "/v1/staking/commands/stake", {
      body: { amount: stakeAmount },
    });
    expect(stakeResponse.status).toBe(202);
    await expectReceipt(extractTxHash(stakeResponse.payload));

    const stakeRead = await apiCall(
      port,
      "GET",
      `/v1/staking/queries/get-stake-info?user=${encodeURIComponent(founderAddress)}`,
      { apiKey: "read-key" },
    );
    expect(stakeRead.status).toBe(200);
    expect(stakeRead.payload).toEqual(normalize(await staking.getStakeInfo(founderAddress)));

    const delegateResponse = await apiCall(port, "POST", "/v1/staking/commands/delegate", {
      body: { delegatee: secondaryAddress },
    });
    expect(delegateResponse.status).toBe(202);
    await expectReceipt(extractTxHash(delegateResponse.payload));

    const delegatesRead = await apiCall(
      port,
      "GET",
      `/v1/staking/queries/delegates?account=${encodeURIComponent(founderAddress)}`,
      { apiKey: "read-key" },
    );
    expect(delegatesRead.status).toBe(200);
    expect(delegatesRead.payload).toBe(secondaryAddress);
    expect(await delegation.delegates(founderAddress)).toBe(secondaryAddress);
  });

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

    const savedEnv = { ...process.env };
    process.env.CBDP_RPC_URL = "http://127.0.0.1:65535";
    process.env.ALCHEMY_RPC_URL = "http://127.0.0.1:65534";
    const unavailableServer = createApiServer({ port: 0 }).listen();
    const unavailableAddress = unavailableServer.address();
    const unavailablePort = typeof unavailableAddress === "object" && unavailableAddress ? unavailableAddress.port : 8787;

    try {
      const providerUnavailable = await apiCall(unavailablePort, "GET", `/v1/voice-assets/${primaryVoiceHash}`, {
        apiKey: "read-key",
      });
      expect(providerUnavailable.status).toBe(500);
    } finally {
      unavailableServer.close();
      process.env = savedEnv;
    }
  });
});
