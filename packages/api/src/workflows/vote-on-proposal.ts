import { z } from "zod";

import type { ApiExecutionContext } from "../shared/execution-context.js";
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
  const snapshot = await governance.proposalSnapshot({
    auth,
    api: { executionSource: "auto", gaslessMode: "none" },
    walletAddress,
    wireParams: [body.proposalId],
  });
  const deadline = await governance.proposalDeadline({
    auth,
    api: { executionSource: "auto", gaslessMode: "none" },
    walletAddress,
    wireParams: [body.proposalId],
  });
  const proposalState = await governance.prState({
    auth,
    api: { executionSource: "auto", gaslessMode: "none" },
    walletAddress,
    wireParams: [body.proposalId],
  });

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
  await waitForWorkflowWriteReceipt(context, vote.body, "voteOnProposal.vote");

  const updatedProposalState = await governance.prState({
    auth,
    api: { executionSource: "auto", gaslessMode: "none" },
    walletAddress,
    wireParams: [body.proposalId],
  });

  return {
    proposalId: body.proposalId,
    snapshot: snapshot.body,
    deadline: deadline.body,
    proposalState: proposalState.body,
    proposalStateAfterVote: updatedProposalState.body,
    vote: vote.body,
    currentBlock: String(currentBlock),
  };
}
