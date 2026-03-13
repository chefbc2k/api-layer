import { z } from "zod";

import type { AuthContext } from "../shared/auth.js";
import type { ApiExecutionContext } from "../shared/execution-context.js";
import { HttpError } from "../shared/errors.js";
import { runSubmitProposalWorkflow, submitProposalWorkflowSchema } from "./submit-proposal.js";
import { runVoteOnProposalWorkflow, voteOnProposalWorkflowSchema } from "./vote-on-proposal.js";

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/u);

export const governanceAdminFlowWorkflowSchema = z.object({
  proposal: submitProposalWorkflowSchema,
  vote: z.object({
    support: voteOnProposalWorkflowSchema.shape.support,
    reason: z.string().optional(),
    apiKey: z.string().min(1).optional(),
    walletAddress: addressSchema.optional(),
  }).optional(),
});

export async function runGovernanceAdminFlowWorkflow(
  context: ApiExecutionContext,
  auth: AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof governanceAdminFlowWorkflowSchema>,
) {
  const proposalResult = await runSubmitProposalWorkflow(context, auth, walletAddress, body.proposal);
  const proposalId = typeof proposalResult.proposal?.proposalId === "string"
    ? proposalResult.proposal.proposalId
    : null;
  if (!proposalId) {
    throw new Error("governance-admin-flow requires submit-proposal to return proposalId");
  }
  if (proposalResult.readback.snapshot === undefined || proposalResult.readback.deadline === undefined || proposalResult.readback.proposalState === undefined) {
    throw new Error("governance-admin-flow requires confirmed proposal readback");
  }

  let voteResult: Awaited<ReturnType<typeof runVoteOnProposalWorkflow>> | null = null;
  if (body.vote) {
    const earliestVotingBlock = parseBigInt(proposalResult.votingWindow.earliestVotingBlock);
    const currentBlock = parseBigInt(proposalResult.votingWindow.currentBlock);
    const proposalState = parseBigInt(proposalResult.readback.proposalState);

    if (currentBlock !== null && earliestVotingBlock !== null && currentBlock < earliestVotingBlock) {
      throw new HttpError(
        409,
        `governance-admin-flow vote blocked by timing: proposal ${proposalId} is not yet votable; currentBlock=${currentBlock.toString()} earliestVotingBlock=${earliestVotingBlock.toString()}`,
      );
    }
    if (proposalState !== 1n) {
      throw new HttpError(
        409,
        `governance-admin-flow vote blocked by state: proposal ${proposalId} is not Active; proposalState=${proposalResult.readback.proposalState}`,
      );
    }

    const voteAuth = body.vote.apiKey
      ? resolveChildAuthContext(context, body.vote.apiKey)
      : auth;
    const voteWalletAddress = body.vote.walletAddress ?? walletAddress;
    voteResult = await runVoteOnProposalWorkflow(context, voteAuth, voteWalletAddress, {
      proposalId,
      support: body.vote.support,
      reason: body.vote.reason ?? "workflow vote",
    });

    if (voteResult.summary.proposalId !== proposalId) {
      throw new Error("governance-admin-flow vote result proposalId mismatch");
    }
    if (asRecord(voteResult.vote.receipt)?.hasVoted !== true) {
      throw new Error("governance-admin-flow requires confirmed vote receipt");
    }
  }

  return {
    proposal: {
      ...proposalResult.proposal,
      readback: proposalResult.readback,
    },
    votingWindow: {
      ...proposalResult.votingWindow,
      proposalState: proposalResult.readback.proposalState,
    },
    vote: voteResult
      ? {
          proposalWindow: voteResult.proposalWindow,
          result: voteResult.vote,
          summary: voteResult.summary,
        }
      : null,
    summary: {
      proposalId,
      proposalType: proposalResult.summary.proposalType,
      voteRequested: Boolean(body.vote),
      voteCast: Boolean(voteResult),
      voteSupport: body.vote?.support ?? null,
      voter: voteResult?.summary.voter ?? body.vote?.walletAddress ?? walletAddress ?? null,
    },
  };
}

function resolveChildAuthContext(
  context: ApiExecutionContext,
  apiKey: string,
): AuthContext {
  const childAuth = context.apiKeys[apiKey];
  if (!childAuth) {
    throw new HttpError(400, "governance-admin-flow received unknown vote apiKey");
  }
  return childAuth;
}

function parseBigInt(value: unknown): bigint | null {
  return typeof value === "string" && /^\d+$/u.test(value) ? BigInt(value) : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}
