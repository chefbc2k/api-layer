import { z } from "zod";

import type { ApiExecutionContext } from "../shared/execution-context.js";
import type { RouteResult } from "../shared/route-types.js";
import { createGovernancePrimitiveService } from "../modules/governance/primitives/generated/index.js";
import { waitForWorkflowWriteReceipt } from "./wait-for-write.js";

export const voteOnProposalWorkflowSchema = z.object({
  proposalId: z.string().regex(/^\d+$/u),
  support: z.string().regex(/^\d+$/u),
  reason: z.string().default("workflow vote"),
});

const ACTIVE_PROPOSAL_STATE = 1n;

export async function runVoteOnProposalWorkflow(
  context: ApiExecutionContext,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof voteOnProposalWorkflowSchema>,
) {
  const governance = createGovernancePrimitiveService(context);
  const voterAddress = await resolveWorkflowVoterAddress(context, auth, walletAddress);
  const { snapshot, deadline, proposalState } = await waitForProposalWindow(governance, auth, walletAddress, body.proposalId);

  const currentBlock = await context.providerRouter.withProvider(
    "read",
    "workflow.voteOnProposal.blockNumber",
    (provider) => provider.getBlockNumber(),
  );
  const earliestVotingBlock = typeof snapshot.body === "string" ? BigInt(snapshot.body) : null;
  const currentState = BigInt(String(proposalState.body));
  if (earliestVotingBlock !== null && BigInt(currentBlock) < earliestVotingBlock) {
    throw new Error(
      `proposal ${body.proposalId} is not yet votable; currentBlock=${currentBlock} earliestVotingBlock=${earliestVotingBlock.toString()} proposalState=${currentState.toString()}`,
    );
  }
  if (currentState !== ACTIVE_PROPOSAL_STATE) {
    throw new Error(
      `proposal ${body.proposalId} is not Active; proposalState=${currentState.toString()} currentBlock=${currentBlock} earliestVotingBlock=${earliestVotingBlock?.toString() ?? "unknown"}`,
    );
  }

  const vote = await governance.prCastVote({
    auth,
    api: { executionSource: "auto", gaslessMode: "none" },
    walletAddress,
    wireParams: [body.proposalId, body.support, body.reason],
  });
  const voteTxHash = await waitForWorkflowWriteReceipt(context, vote.body, "voteOnProposal.vote");

  const updatedProposalState = await waitForWorkflowReadback(
    () => governance.prState({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [body.proposalId],
    }),
    (result) => result.statusCode === 200,
    `voteOnProposal.stateAfterVote.${body.proposalId}`,
  );
  const voteReceipt = await waitForWorkflowReadback(
    () => governance.getReceipt({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [body.proposalId, voterAddress],
    }),
    (result) => {
      const receipt = asRecord(result.body);
      return result.statusCode === 200 && receipt?.hasVoted === true;
    },
    `voteOnProposal.voteReceipt.${body.proposalId}`,
  );
  const voteCastEvents = voteTxHash
    ? await waitForVoteCastEvents(context, governance, auth, voteTxHash)
    : [];

  return {
    proposalWindow: {
      proposalId: body.proposalId,
      snapshot: snapshot.body,
      deadline: deadline.body,
      proposalState: proposalState.body,
      currentBlock: String(currentBlock),
    },
    vote: {
      submission: vote.body,
      txHash: voteTxHash,
      receipt: voteReceipt.body,
      proposalStateAfterVote: updatedProposalState.body,
      eventCount: voteCastEvents.length,
    },
    summary: {
      proposalId: body.proposalId,
      support: body.support,
      voter: voterAddress,
      reason: body.reason,
    },
  };
}

async function waitForProposalWindow(
  governance: ReturnType<typeof createGovernancePrimitiveService>,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  proposalId: string,
) {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const [snapshot, deadline, proposalState] = await Promise.all([
        governance.proposalSnapshot({
          auth,
          api: { executionSource: "live", gaslessMode: "none" },
          walletAddress,
          wireParams: [proposalId],
        }),
        governance.proposalDeadline({
          auth,
          api: { executionSource: "live", gaslessMode: "none" },
          walletAddress,
          wireParams: [proposalId],
        }),
        governance.prState({
          auth,
          api: { executionSource: "live", gaslessMode: "none" },
          walletAddress,
          wireParams: [proposalId],
        }),
      ]);
      if (snapshot.statusCode === 200 && deadline.statusCode === 200 && proposalState.statusCode === 200) {
        return { snapshot, deadline, proposalState };
      }
      lastError = { snapshot: snapshot.body, deadline: deadline.body, proposalState: proposalState.body };
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`proposal ${proposalId} window lookup failed: ${String((lastError as { message?: string })?.message ?? JSON.stringify(lastError))}`);
}

async function waitForWorkflowReadback(
  read: () => Promise<RouteResult>,
  ready: (result: RouteResult) => boolean,
  label: string,
) {
  let lastResult: RouteResult | null = null;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const result = await read();
    lastResult = result;
    if (ready(result)) {
      return result;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${label} readback timeout: ${JSON.stringify(lastResult?.body ?? null)}`);
}

async function waitForVoteCastEvents(
  context: ApiExecutionContext,
  governance: ReturnType<typeof createGovernancePrimitiveService>,
  auth: import("../shared/auth.js").AuthContext,
  voteTxHash: string,
) {
  const voteReceipt = await context.providerRouter.withProvider(
    "read",
    "workflow.voteOnProposal.voteReceipt",
    (provider) => provider.getTransactionReceipt(voteTxHash),
  );
  if (!voteReceipt) {
    return [];
  }
  let lastLogs: unknown[] = [];
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await governance.voteCastEventQuery({
      auth,
      fromBlock: BigInt(voteReceipt.blockNumber),
      toBlock: BigInt(voteReceipt.blockNumber),
    });
    lastLogs = Array.isArray(response) ? response : [];
    if (lastLogs.some((entry) => asRecord(entry)?.transactionHash === voteTxHash)) {
      return lastLogs;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`voteOnProposal.voteCast event query timeout: ${JSON.stringify(lastLogs)}`);
}

async function resolveWorkflowVoterAddress(
  context: ApiExecutionContext,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
): Promise<string> {
  if (walletAddress) {
    return walletAddress;
  }
  return context.providerRouter.withProvider(
    "read",
    "workflow.voteOnProposal.voter",
    async (provider) => {
      const privateKey = requestSignerPrivateKey(auth);
      if (!privateKey) {
        throw new Error("vote-on-proposal requires signer-backed auth");
      }
      const { Wallet } = await import("ethers");
      return new Wallet(privateKey, provider).getAddress();
    },
  );
}

function requestSignerPrivateKey(auth: import("../shared/auth.js").AuthContext): string | null {
  if (!auth.signerId) {
    return null;
  }
  const raw = process.env.API_LAYER_SIGNER_MAP_JSON;
  if (!raw) {
    return null;
  }
  const signerMap = JSON.parse(raw) as Record<string, string>;
  return signerMap[auth.signerId] ?? null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}
