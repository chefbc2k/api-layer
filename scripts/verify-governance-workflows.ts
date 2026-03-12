import { createApiServer } from "../packages/api/src/app.js";
import { loadRepoEnv, readConfigFromEnv } from "../packages/client/src/runtime/config.js";
import { facetRegistry } from "../packages/client/src/generated/index.js";
import { Contract, JsonRpcProvider, Wallet } from "ethers";

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

const ACTIVE_PROPOSAL_STATE = "1";
const DEFAULT_POLL_INTERVAL_MS = Number(process.env.GOVERNANCE_PROOF_POLL_INTERVAL_MS ?? "60000");
const DEFAULT_MAX_WAIT_MS = Number(process.env.GOVERNANCE_PROOF_MAX_WAIT_MS ?? String(30 * 60 * 60 * 1000));

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

function proposalIdFromSubmit(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const proposalId = (payload as Record<string, unknown>).proposalId;
  return asString(proposalId);
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

async function waitForActiveProposal(provider: JsonRpcProvider, port: number, proposalId: string): Promise<{
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

async function main(): Promise<void> {
  const repoEnv = loadRepoEnv();
  const config = readConfigFromEnv(repoEnv);
  const provider = new JsonRpcProvider(config.cbdpRpcUrl, config.chainId);
  const founderKey = repoEnv.PRIVATE_KEY;
  const founderAddress = repoEnv.SENDER;

  if (!founderKey || !founderAddress) {
    throw new Error("PRIVATE_KEY and SENDER must be configured in .env");
  }

  process.env.API_LAYER_KEYS_JSON = JSON.stringify({
    "founder-key": { label: "founder", signerId: "founder", roles: ["service"], allowGasless: false },
    "read-key": { label: "reader", roles: ["service"], allowGasless: false },
  });
  process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({
    founder: founderKey,
  });

  const founder = new Wallet(founderKey, provider);
  const governorFacet = new Contract(config.diamondAddress, facetRegistry.GovernorFacet.abi, provider);
  const server = createApiServer({ port: 0 }).listen();
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 8787;

  const evidence: Record<string, unknown> = {
    A: {
      chain: "Base Sepolia",
      chainId: config.chainId,
      diamond: config.diamondAddress,
      rpcUrl: config.cbdpRpcUrl,
      alchemyRpcUrl: config.alchemyRpcUrl,
    },
    B: {
      workflowRoutes: [
        "POST /v1/workflows/submit-proposal",
        "POST /v1/workflows/vote-on-proposal",
      ],
      supportingRoutes: [
        "GET /v1/governance/queries/proposal-snapshot",
        "GET /v1/governance/queries/pr-state",
        "GET /v1/governance/queries/proposal-deadline",
        "GET /v1/transactions/:txHash",
      ],
    },
    C: {
      apiKey: "founder-key",
      actor: founder.address,
    },
  };

  try {
    const currentVotingConfig = await governorFacet.getVotingConfig();
    const currentVotingDelay = currentVotingConfig[0];
    const proposalCalldata = governorFacet.interface.encodeFunctionData("updateVotingDelay", [currentVotingDelay]);
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
    evidence.D = {
      submitProposal: submitResp.status === 202 ? "accepted" : "failed",
      voteOnProposal: "not-run-yet",
    };
    evidence.E = {
      submitProposal: {
        httpStatus: submitResp.status,
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
      },
    };

    if (submitResp.status !== 202 || !resolvedProposalId || !proposalTxHash || proposalReceiptStatus !== "1") {
      evidence.F = "broken";
      console.log(JSON.stringify(normalize(evidence), null, 2));
      process.exitCode = 1;
      return;
    }

    const activation = await waitForActiveProposal(provider, port, resolvedProposalId);
    (evidence.E as Record<string, unknown>).proposalActivation = activation;

    if (activation.timedOut) {
      evidence.D = {
        submitProposal: "accepted",
        voteOnProposal: "not-run",
      };
      evidence.F = "blocked by setup/state";
      console.log(JSON.stringify(normalize(evidence), null, 2));
      return;
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

    evidence.D = {
      submitProposal: "accepted",
      voteOnProposal: voteResp.status === 202 ? "accepted" : "failed",
    };
    (evidence.E as Record<string, unknown>).voteOnProposal = {
      httpStatus: voteResp.status,
      txHash: voteTxHash,
      receipt: voteTxStatus?.payload ?? null,
      proposalId: resolvedProposalId,
      proposalState: votePayload?.proposalStateAfterVote ?? votePayload?.proposalState ?? activation.proposalState,
      snapshotBlock: votePayload?.snapshot ?? activation.snapshotBlock,
      currentBlock: String(latestBlock),
    };

    const voteReceiptStatus = receiptStatus(voteTxStatus?.payload ?? null);
    const voteSucceeded = voteResp.status === 202 && voteTxHash && voteReceiptStatus === "1";
    evidence.F = voteSucceeded ? "proven working" : "broken";
    console.log(JSON.stringify(normalize(evidence), null, 2));
    if (!voteSucceeded) {
      process.exitCode = 1;
    }
  } finally {
    server.close();
    await provider.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
