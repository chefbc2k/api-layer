import path from "node:path";
import { fileURLToPath } from "node:url";

import { createApiServer } from "../packages/api/src/app.js";
import { loadRepoEnv } from "../packages/client/src/runtime/config.js";
import { facetRegistry } from "../packages/client/src/generated/index.js";
import { Contract, JsonRpcProvider, Wallet, ethers } from "ethers";

import { isLoopbackRpcUrl, resolveRuntimeConfig, startLocalForkIfNeeded } from "./alchemy-debug-lib.js";
import { runWithTransientRpcRetries } from "./transient-rpc-retry.js";
import { buildVerifyReportOutput, getOutputPath, writeVerifyReportOutput } from "./verify-report.js";

type ApiCallOptions = {
  apiKey?: string;
  body?: unknown;
};

type ApiResponse = {
  status: number;
  payload: unknown;
};

type TxStatusPayload = {
  receipt?: {
    status?: number | string;
    hash?: string;
    transactionHash?: string;
    blockNumber?: number | string;
  } | null;
  diagnostics?: {
    decodedLogs?: Array<{
      eventName?: string | null;
      args?: Record<string, unknown>;
    }>;
  } | null;
};

type GovernanceEvidence = {
  step: string;
  actor: string;
  status: number | string;
  postState: unknown;
};

type GovernanceDomainReport = {
  routes: string[];
  actors: string[];
  executionResult: string;
  evidence: GovernanceEvidence[];
  finalClassification: "proven working" | "blocked by setup/state" | "deeper issue remains";
};

const ACTIVE_PROPOSAL_STATE = "1";
const DEFAULT_POLL_INTERVAL_MS = Number(process.env.GOVERNANCE_PROOF_POLL_INTERVAL_MS ?? "15000");
const DEFAULT_MAX_WAIT_MS = Number(process.env.GOVERNANCE_PROOF_MAX_WAIT_MS ?? String(3 * 60 * 1000));

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

function extractTxHash(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const txHash = (payload as Record<string, unknown>).txHash;
  return typeof txHash === "string" && txHash.startsWith("0x") ? txHash : null;
}

function asString(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  return null;
}

export function proposalIdFromSubmit(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const record = payload as Record<string, unknown>;
  const direct = asString(record.proposalId);
  if (direct) {
    return direct;
  }
  const proposal = record.proposal;
  if (proposal && typeof proposal === "object") {
    const nested = asString((proposal as Record<string, unknown>).proposalId);
    if (nested) {
      return nested;
    }
  }
  const summary = record.summary;
  if (summary && typeof summary === "object") {
    return asString((summary as Record<string, unknown>).proposalId);
  }
  return null;
}

function proposalIdFromTransactionStatus(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const diagnostics = (payload as TxStatusPayload).diagnostics;
  const decodedLogs = diagnostics?.decodedLogs;
  if (!Array.isArray(decodedLogs)) {
    return null;
  }
  for (const log of decodedLogs) {
    if (log?.eventName !== "ProposalCreated") {
      continue;
    }
    return asString(log.args?.proposalId);
  }
  return null;
}

async function getTransactionStatus(port: number, txHash: string): Promise<ApiResponse> {
  return apiCall(port, "GET", `/v1/transactions/${txHash}`, { apiKey: "read-key" });
}

async function waitForActiveProposal(provider: JsonRpcProvider, rpcUrl: string, port: number, proposalId: string): Promise<{
  snapshotBlock: string | null;
  deadlineBlock: string | null;
  currentBlock: string | null;
  proposalState: string | null;
  timedOut: boolean;
}> {
  const deadlineAt = Date.now() + DEFAULT_MAX_WAIT_MS;
  let latestSnapshotBlock: string | null = null;
  let latestDeadlineBlock: string | null = null;
  let latestCurrentBlock: string | null = null;
  let latestState: string | null = null;

  while (Date.now() <= deadlineAt) {
    const [snapshotResp, deadlineResp, stateResp] = await Promise.all([
      apiCall(port, "GET", `/v1/governance/queries/proposal-snapshot?proposalId=${encodeURIComponent(proposalId)}`, { apiKey: "read-key" }),
      apiCall(port, "GET", `/v1/governance/queries/proposal-deadline?proposalId=${encodeURIComponent(proposalId)}`, { apiKey: "read-key" }),
      apiCall(port, "GET", `/v1/governance/queries/pr-state?proposalId=${encodeURIComponent(proposalId)}`, { apiKey: "read-key" }),
    ]);

    latestSnapshotBlock = asString(snapshotResp.payload);
    latestDeadlineBlock = asString(deadlineResp.payload);
    latestState = asString(stateResp.payload);

    latestCurrentBlock = String(await currentBlockFromProvider(provider));

    if (
      latestState !== ACTIVE_PROPOSAL_STATE &&
      isLoopbackRpcUrl(rpcUrl) &&
      latestSnapshotBlock &&
      BigInt(latestCurrentBlock) <= BigInt(latestSnapshotBlock)
    ) {
      const delta = BigInt(latestSnapshotBlock) - BigInt(latestCurrentBlock);
      const blocksToMine = delta >= 0n ? delta + 1n : 1n;
      await provider.send("anvil_mine", [ethers.toQuantity(blocksToMine)]);
      latestCurrentBlock = String(await currentBlockFromProvider(provider));
      continue;
    }

    if (latestState === ACTIVE_PROPOSAL_STATE) {
      return {
        snapshotBlock: latestSnapshotBlock,
        deadlineBlock: latestDeadlineBlock,
        currentBlock: latestCurrentBlock,
        proposalState: latestState,
        timedOut: false,
      };
    }

    await new Promise((resolve) => setTimeout(resolve, DEFAULT_POLL_INTERVAL_MS));
  }

  return {
    snapshotBlock: latestSnapshotBlock,
    deadlineBlock: latestDeadlineBlock,
    currentBlock: latestCurrentBlock,
    proposalState: latestState,
    timedOut: true,
  };
}

function currentBlockFromProvider(provider: JsonRpcProvider): Promise<number> {
  return provider.getBlockNumber();
}

function receiptStatus(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const receipt = (payload as TxStatusPayload).receipt;
  return receipt?.status === undefined ? null : String(receipt.status);
}

async function ensureNativeBalance(provider: JsonRpcProvider, rpcUrl: string, recipient: string, minimum: bigint): Promise<bigint> {
  const balance = await provider.getBalance(recipient);
  if (balance >= minimum) {
    return balance;
  }
  if (isLoopbackRpcUrl(rpcUrl)) {
    const targetBalance = (minimum > ethers.parseEther("0.02") ? minimum : ethers.parseEther("0.02")) + ethers.parseEther("0.005");
    await provider.send("anvil_setBalance", [recipient, ethers.toQuantity(targetBalance)]);
    return provider.getBalance(recipient);
  }
  return balance;
}

export function isInsufficientFundsPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") {
    return false;
  }
  const error = (payload as { error?: unknown }).error;
  return typeof error === "string" && error.toLowerCase().includes("insufficient funds");
}

export function buildGovernanceOutput(report: GovernanceDomainReport) {
  return buildVerifyReportOutput({ governance: report });
}

async function runGovernanceProofOnce() {
  const repoEnv = loadRepoEnv();
  const runtimeConfig = await resolveRuntimeConfig(repoEnv);
  const forkRuntime = await startLocalForkIfNeeded(runtimeConfig);
  const { config } = runtimeConfig;
  process.env.RPC_URL = forkRuntime.rpcUrl;
  process.env.ALCHEMY_RPC_URL = config.alchemyRpcUrl;
  const provider = new JsonRpcProvider(forkRuntime.rpcUrl, config.chainId);
  const founderKey = repoEnv.PRIVATE_KEY;
  const founderAddress = repoEnv.SENDER;

  if (!founderKey || !founderAddress) {
    throw new Error("PRIVATE_KEY and SENDER must be configured in .env");
  }

  process.env.API_LAYER_KEYS_JSON = JSON.stringify({
    "founder-key": { label: "founder", signerId: "founder", roles: ["service"], allowGasless: false },
    "read-key": { label: "reader", roles: ["read-only"], allowGasless: false },
  });
  process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({
    founder: founderKey,
  });
  process.env.API_LAYER_SIGNER_API_KEYS_JSON = JSON.stringify({
    [founderAddress.toLowerCase()]: {
      apiKey: "founder-key",
      signerId: "founder",
      privateKey: founderKey,
      label: "founder",
      roles: ["service"],
      allowGasless: false,
    },
  });

  const founder = new Wallet(founderKey, provider);
  const governorFacet = new Contract(config.diamondAddress, facetRegistry.GovernorFacet.abi, provider);
  const server = createApiServer({ port: 0 }).listen();
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 8787;

  const routes = [
    "POST /v1/workflows/submit-proposal",
    "POST /v1/workflows/vote-on-proposal",
    "GET /v1/governance/queries/proposal-snapshot",
    "GET /v1/governance/queries/pr-state",
    "GET /v1/governance/queries/proposal-deadline",
    "GET /v1/transactions/:txHash",
  ];
  const actors = ["founder-key", "read-key"];
  const evidence: GovernanceEvidence[] = [];

  try {
    await ensureNativeBalance(provider, forkRuntime.rpcUrl, founder.address, ethers.parseEther("0.00005"));
    const currentVotingConfig = await governorFacet.getVotingConfig();
    const currentVotingDelay = BigInt(currentVotingConfig[0]);
    const proposedVotingDelay = currentVotingDelay === 6000n ? 6001n : 6000n;
    const proposalCalldata = governorFacet.interface.encodeFunctionData("updateVotingDelay", [proposedVotingDelay]);
    const submitDescription = `api-layer governance proof ${Date.now()}`;

    const submitResp = await apiCall(port, "POST", "/v1/workflows/submit-proposal", {
      body: {
        description: submitDescription,
        targets: [config.diamondAddress],
        values: ["0"],
        calldatas: [proposalCalldata],
        proposalType: "0",
      },
    });

    const submitPayload = submitResp.payload as Record<string, unknown> | null;
    const proposalBody = submitPayload?.proposal;
    const proposalTxHash = extractTxHash(proposalBody);
    const proposalId = proposalIdFromSubmit(submitResp.payload);
    const proposalTxStatus = proposalTxHash ? await getTransactionStatus(port, proposalTxHash) : null;
    const proposalIdFromReceipt = proposalIdFromTransactionStatus(proposalTxStatus?.payload ?? null);
    const resolvedProposalId = proposalId ?? proposalIdFromReceipt;
    const proposalReceiptStatus = receiptStatus(proposalTxStatus?.payload ?? null);
    evidence.push({
      step: "submitProposal",
      actor: "founder-key",
      status: submitResp.status,
      postState: normalize({
        payload: submitResp.payload,
        txHash: proposalTxHash,
        receipt: proposalTxStatus?.payload ?? null,
        proposalId: resolvedProposalId,
        proposalState: submitPayload?.proposalState ?? null,
        proposalReadbackError: submitPayload?.proposalReadbackError ?? null,
        snapshotBlock: submitPayload?.votingWindow && typeof submitPayload.votingWindow === "object"
          ? (submitPayload.votingWindow as Record<string, unknown>).earliestVotingBlock ?? null
          : null,
        currentBlock: submitPayload?.votingWindow && typeof submitPayload.votingWindow === "object"
          ? (submitPayload.votingWindow as Record<string, unknown>).currentBlock ?? null
          : null,
        currentVotingDelay: currentVotingDelay.toString(),
        proposedVotingDelay: proposedVotingDelay.toString(),
      }),
    });

    if (submitResp.status !== 202 || !resolvedProposalId || !proposalTxHash || proposalReceiptStatus !== "1") {
      return buildGovernanceOutput({
        routes,
        actors,
        executionResult: "governance proposal submission failed before voting",
        evidence,
        finalClassification: isInsufficientFundsPayload(submitResp.payload) ? "blocked by setup/state" : "deeper issue remains",
      });
    }

    const activation = await waitForActiveProposal(provider, forkRuntime.rpcUrl, port, resolvedProposalId);
    evidence.push({
      step: "proposalActivation",
      actor: "read-key",
      status: activation.timedOut ? "timeout" : "active",
      postState: normalize(activation),
    });

    if (activation.timedOut) {
      return buildGovernanceOutput({
        routes,
        actors,
        executionResult: "governance proposal accepted but did not become active before timeout",
        evidence,
        finalClassification: "blocked by setup/state",
      });
    }

    const voteResp = await apiCall(port, "POST", "/v1/workflows/vote-on-proposal", {
      body: {
        proposalId: resolvedProposalId,
        support: "1",
        reason: "api-layer governance proof",
      },
    });
    const votePayload = voteResp.payload as Record<string, unknown> | null;
    const voteBody = votePayload?.vote;
    const voteTxHash = extractTxHash(voteBody);
    const voteTxStatus = voteTxHash ? await getTransactionStatus(port, voteTxHash) : null;
    const latestBlock = await currentBlockFromProvider(provider);

    evidence.push({
      step: "voteOnProposal",
      actor: "founder-key",
      status: voteResp.status,
      postState: normalize({
        txHash: voteTxHash,
        receipt: voteTxStatus?.payload ?? null,
        proposalId: resolvedProposalId,
        proposalState: votePayload?.proposalStateAfterVote ?? votePayload?.proposalState ?? activation.proposalState,
        snapshotBlock: votePayload?.snapshot ?? activation.snapshotBlock,
        currentBlock: String(latestBlock),
      }),
    });

    const voteReceiptStatus = receiptStatus(voteTxStatus?.payload ?? null);
    const voteSucceeded = voteResp.status === 202 && voteTxHash && voteReceiptStatus === "1";
    if (!voteSucceeded) {
      process.exitCode = 1;
      return buildGovernanceOutput({
        routes,
        actors,
        executionResult: "governance voting submission failed after proposal activation",
        evidence,
        finalClassification: "deeper issue remains",
      });
    }
    return buildGovernanceOutput({
      routes,
      actors,
      executionResult: "governance proposal submission and voting completed through HTTP workflows",
      evidence,
      finalClassification: "proven working",
    });
  } finally {
    server.close();
    await provider.destroy();
  }
}

async function main(): Promise<void> {
  const outputPath = getOutputPath();
  const output = await runWithTransientRpcRetries(runGovernanceProofOnce, {
    label: "verify:governance:base-sepolia",
    maxAttempts: Number(process.env.API_LAYER_TRANSIENT_RPC_MAX_ATTEMPTS ?? "3"),
    baseDelayMs: Number(process.env.API_LAYER_TRANSIENT_RPC_BASE_DELAY_MS ?? "1500"),
    log: (message) => console.warn(message),
  });
  writeVerifyReportOutput(outputPath, output);
  console.log(JSON.stringify(output, null, 2));
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
