import { z } from "zod";

import type { ApiExecutionContext } from "../shared/execution-context.js";
import { createGovernancePrimitiveService } from "../modules/governance/primitives/generated/index.js";
import { waitForWorkflowWriteReceipt } from "./wait-for-write.js";

export const submitProposalWorkflowSchema = z.object({
  title: z.string().optional(),
  description: z.string(),
  targets: z.array(z.string().regex(/^0x[a-fA-F0-9]{40}$/u)),
  values: z.array(z.string().regex(/^\d+$/u)),
  calldatas: z.array(z.string().regex(/^0x[0-9a-fA-F]*$/u)),
  proposalType: z.string().regex(/^\d+$/u),
});

function extractResult(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const result = (payload as Record<string, unknown>).result;
  return typeof result === "string" ? result : null;
}

export async function runSubmitProposalWorkflow(
  context: ApiExecutionContext,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof submitProposalWorkflowSchema>,
) {
  const governance = createGovernancePrimitiveService(context);
  const proposal = body.title
    ? await governance.proposeStringStringAddressArrayUint256ArrayBytesArrayUint8({
        auth,
        api: { executionSource: "auto", gaslessMode: "none" },
        walletAddress,
        wireParams: [body.title, body.description, body.targets, body.values, body.calldatas, body.proposalType],
      })
    : await governance.proposeAddressArrayUint256ArrayBytesArrayStringUint8({
        auth,
        api: { executionSource: "auto", gaslessMode: "none" },
        walletAddress,
        wireParams: [body.targets, body.values, body.calldatas, body.description, body.proposalType],
      });

  await waitForWorkflowWriteReceipt(context, proposal.body, "submitProposal.proposal");
  const proposalId = extractResult(proposal.body);

  const snapshot = proposalId
    ? await governance.proposalSnapshot({
        auth,
        api: { executionSource: "auto", gaslessMode: "none" },
        walletAddress,
        wireParams: [proposalId],
      })
    : null;
  const deadline = proposalId
    ? await governance.proposalDeadline({
        auth,
        api: { executionSource: "auto", gaslessMode: "none" },
        walletAddress,
        wireParams: [proposalId],
      })
    : null;

  const currentBlock = await context.providerRouter.withProvider(
    "read",
    "workflow.submitProposal.blockNumber",
    (provider) => provider.getBlockNumber(),
  );
  const latestBlock = await context.providerRouter.withProvider(
    "read",
    "workflow.submitProposal.latestBlock",
    (provider) => provider.getBlock("latest"),
  );

  const earliestVotingBlock = snapshot?.body ?? null;
  const estimatedVotingStartTimestamp = typeof earliestVotingBlock === "string" && latestBlock
    ? String(BigInt(latestBlock.timestamp) + (BigInt(earliestVotingBlock) - BigInt(currentBlock)) * 15n)
    : null;

  return {
    proposal: proposal.body,
    proposalId,
    votingWindow: {
      earliestVotingBlock,
      proposalDeadlineBlock: deadline?.body ?? null,
      currentBlock: String(currentBlock),
      estimatedVotingStartTimestamp,
    },
  };
}
