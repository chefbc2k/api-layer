import { createApiServer } from "../packages/api/src/app.js";
import { loadRepoEnv, readConfigFromEnv } from "../packages/client/src/runtime/config.js";
import { facetRegistry } from "../packages/client/src/generated/index.js";
import { Contract, JsonRpcProvider, Wallet, ethers } from "ethers";

type ApiCallOptions = {
  apiKey?: string;
  body?: unknown;
};

async function apiCall(port: number, method: string, path: string, options: ApiCallOptions = {}) {
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
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, normalize(v)]));
  }
  return value;
}

function extractTxHash(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const txHash = (payload as Record<string, unknown>).txHash;
  return typeof txHash === "string" ? txHash : null;
}

function omitTemplateIdentity(template: Record<string, unknown>): Record<string, unknown> {
  const { creator: _creator, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = template;
  return rest;
}

function payloadError(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return String(payload);
  }
  const error = (payload as Record<string, unknown>).error;
  return typeof error === "string" ? error : JSON.stringify(payload);
}

async function expectReceipt(provider: JsonRpcProvider, txHash: string) {
  for (let i = 0; i < 80; i += 1) {
    const receipt = await provider.getTransactionReceipt(txHash);
    if (receipt) return receipt;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return null;
}

async function ensureNativeBalance(provider: JsonRpcProvider, fundingWallet: Wallet, recipient: string, minimum: bigint) {
  const balance = await provider.getBalance(recipient);
  if (balance >= minimum) {
    return balance;
  }
  const receipt = await (await fundingWallet.sendTransaction({ to: recipient, value: minimum - balance })).wait();
  return receipt ? await provider.getBalance(recipient) : balance;
}

async function waitForValue<T>(read: () => Promise<T>, accept: (value: T) => boolean, attempts = 20, delayMs = 500): Promise<T> {
  let lastValue: T | undefined;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const value = await read();
    lastValue = value;
    if (accept(value)) {
      return value;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return lastValue as T;
}

function id(label: string) {
  return ethers.id(label);
}

async function main() {
  const repoEnv = loadRepoEnv();
  const runtimeConfig = readConfigFromEnv(repoEnv);
  const provider = new JsonRpcProvider(runtimeConfig.cbdpRpcUrl, runtimeConfig.chainId);
  const founderKey = repoEnv.PRIVATE_KEY!;
  const licensingOwnerKey = repoEnv.ORACLE_SIGNER_PRIVATE_KEY_1 ?? repoEnv.ORACLE_WALLET_PRIVATE_KEY ?? founderKey;
  const founder = new Wallet(founderKey, provider);
  const licensingOwner = new Wallet(licensingOwnerKey, provider);
  const licensee = Wallet.createRandom().connect(provider);

  process.env.API_LAYER_KEYS_JSON = JSON.stringify({
    "founder-key": { label: "founder", signerId: "founder", roles: ["service"], allowGasless: false },
    "read-key": { label: "reader", roles: ["service"], allowGasless: false },
    "licensing-owner-key": { label: "licensing-owner", signerId: "licensingOwner", roles: ["service"], allowGasless: false },
    "licensee-key": { label: "licensee", signerId: "licensee", roles: ["service"], allowGasless: false },
  });
  process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({
    founder: founderKey,
    licensingOwner: licensingOwnerKey,
    licensee: licensee.privateKey,
  });

  const server = createApiServer({ port: 0 }).listen();
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 8787;

  const diamond = runtimeConfig.diamondAddress;
  const governorFacet = new Contract(diamond, facetRegistry.GovernorFacet.abi, provider);
  const delegationFacet = new Contract(diamond, facetRegistry.DelegationFacet.abi, provider);
  const voiceAssetFacet = new Contract(diamond, facetRegistry.VoiceAssetFacet.abi, provider);
  const whisperBlockFacet = new Contract(diamond, facetRegistry.WhisperBlockFacet.abi, provider);
  const diamondCutFacet = new Contract(diamond, facetRegistry.DiamondCutFacet.abi, provider);

  try {
    const results: Record<string, unknown> = {};

    // licensing remediation proof
    const fundingCandidates = [
      founder,
      licensingOwner,
      ...(repoEnv.ORACLE_SIGNER_PRIVATE_KEY_2 ? [new Wallet(repoEnv.ORACLE_SIGNER_PRIVATE_KEY_2, provider)] : []),
      ...(repoEnv.ORACLE_SIGNER_PRIVATE_KEY_3 ? [new Wallet(repoEnv.ORACLE_SIGNER_PRIVATE_KEY_3, provider)] : []),
      ...(repoEnv.ORACLE_SIGNER_PRIVATE_KEY_4 ? [new Wallet(repoEnv.ORACLE_SIGNER_PRIVATE_KEY_4, provider)] : []),
      ...(repoEnv.ORACLE_WALLET_PRIVATE_KEY ? [new Wallet(repoEnv.ORACLE_WALLET_PRIVATE_KEY, provider)] : []),
    ];
    let richest = fundingCandidates[0];
    let richestBal = 0n;
    for (const wallet of fundingCandidates) {
      const bal = await provider.getBalance(wallet.address);
      if (bal > richestBal) {
        richest = wallet;
        richestBal = bal;
      }
    }
    const licenseeBal = await provider.getBalance(licensee.address);
    if (licenseeBal < ethers.parseEther("0.00003")) {
      const topup = ethers.parseEther("0.00004") - licenseeBal;
      await (await richest.sendTransaction({ to: licensee.address, value: topup })).wait();
    }
    const requiredGasBalance = ethers.parseEther("0.00005");
    await ensureNativeBalance(provider, richest, founder.address, requiredGasBalance);
    await ensureNativeBalance(provider, richest, licensingOwner.address, requiredGasBalance);
    await ensureNativeBalance(provider, richest, licensee.address, requiredGasBalance);



    // governance remediation proof
    const founderAddress = await founder.getAddress();
    const proposerRole = id("GOVERNANCE_PROPOSER_ROLE");
    const hasRoleResp = await apiCall(
      port,
      "GET",
      `/v1/access-control/queries/has-role?role=${encodeURIComponent(proposerRole)}&account=${encodeURIComponent(founderAddress)}`,
      { apiKey: "read-key" },
    );
    const threshold = await governorFacet.getVotingConfig().then((tuple: any) => tuple[2]);
    const currentVotes = await delegationFacet.getCurrentVotes(founderAddress);
    const proposalCalldata = governorFacet.interface.encodeFunctionData("updateVotingDelay", [6000n]);
    const submitResp = await apiCall(port, "POST", "/v1/workflows/submit-proposal", {
      body: {
        description: "focused governance verification",
        targets: [diamond],
        values: ["0"],
        calldatas: [proposalCalldata],
        proposalType: "0",
      },
    });
    results.submitProposal = {
      actor: founderAddress,
      proposerRole: hasRoleResp.payload,
      threshold: threshold.toString(),
      currentVotes: currentVotes.toString(),
      response: submitResp,
    };

    // vote-on-proposal timing gate proof
    const activeResp = await apiCall(port, "POST", "/v1/governance/queries/get-active-proposals", {
      apiKey: "read-key",
      body: {},
    });
    const proposalIds = Array.isArray(activeResp.payload) ? activeResp.payload.map((entry) => String(entry)) : [];
    let voteResult: Record<string, unknown>;
    if (proposalIds.length === 0) {
      voteResult = {
        actor: founderAddress,
        activeProposals: proposalIds,
        response: null,
      };
    } else {
      const proposalId = proposalIds[0]!;
      const snapshotResp = await apiCall(port, "GET", `/v1/governance/queries/proposal-snapshot?proposalId=${encodeURIComponent(proposalId)}`, { apiKey: "read-key" });
      const deadlineResp = await apiCall(port, "GET", `/v1/governance/queries/proposal-deadline?proposalId=${encodeURIComponent(proposalId)}`, { apiKey: "read-key" });
      const voteResp = await apiCall(port, "POST", "/v1/workflows/vote-on-proposal", {
        body: {
          proposalId,
          support: "1",
          reason: "focused vote verification",
        },
      });
      voteResult = {
        actor: founderAddress,
        activeProposals: proposalIds,
        proposalId,
        snapshot: snapshotResp.payload,
        deadline: deadlineResp.payload,
        response: voteResp,
        receipt: extractTxHash(voteResp.payload) ? await expectReceipt(provider, extractTxHash(voteResp.payload)!) : null,
      };
    }
    results.voteOnProposal = voteResult;

    // marketplace + datasets workflow semantics proof
    const datasetVoiceResponseA = await apiCall(port, "POST", "/v1/voice-assets", {
      body: {
        ipfsHash: `QmFocusedDatasetA-${Date.now()}`,
        royaltyRate: "125",
      },
    });
    await expectReceipt(provider, extractTxHash(datasetVoiceResponseA.payload)!);
    const datasetVoiceResponseB = await apiCall(port, "POST", "/v1/voice-assets", {
      body: {
        ipfsHash: `QmFocusedDatasetB-${Date.now()}`,
        royaltyRate: "125",
      },
    });
    await expectReceipt(provider, extractTxHash(datasetVoiceResponseB.payload)!);
    const founderVoiceHashes = await waitForValue(
      async () => Array.from(await voiceAssetFacet.getVoiceAssetsByOwner(founderAddress)) as string[],
      (voiceHashes) => voiceHashes.length >= 2,
    );
    const datasetAssetIdA = String(await voiceAssetFacet.getTokenId(founderVoiceHashes.at(-1)!));
    const datasetAssetIdB = String(await voiceAssetFacet.getTokenId(founderVoiceHashes.at(-2)!));


    // whisperblock + admin proof
    const whisperSelectorsResp = await apiCall(port, "POST", "/v1/whisperblock/queries/get-selectors", {
      apiKey: "read-key",
      body: {},
    });
    const founderRoleResp = await apiCall(port, "POST", "/v1/diamond-admin/queries/founder-role", {
      apiKey: "read-key",
      body: {},
    });
    results.whisperblockSecurity = {
      getSelectors: whisperSelectorsResp,
      directSelectors: normalize(await whisperBlockFacet.getSelectors()),
    };
    results.adminEmergencyMultisig = {
      founderRole: founderRoleResp,
      directFounderRole: await diamondCutFacet.FOUNDER_ROLE(),
    };

    console.log(JSON.stringify(normalize(results), null, 2));
  } finally {
    server.close();
    await provider.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
