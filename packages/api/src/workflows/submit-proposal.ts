import { Interface } from "ethers";
import { z } from "zod";

import type { ApiExecutionContext } from "../shared/execution-context.js";
import { createGovernancePrimitiveService } from "../modules/governance/primitives/generated/index.js";
import { waitForWorkflowWriteReceipt } from "./wait-for-write.js";
import { facetRegistry } from "../../../client/src/generated/index.js";

export const submitProposalWorkflowSchema = z.object({
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

function extractProposalIdFromReceipt(receipt: { logs?: ReadonlyArray<unknown> } | null): string | null {
  if (!receipt?.logs?.length) {
    return null;
  }
  const iface = new Interface(facetRegistry.ProposalFacet.abi);
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log as Parameters<Interface["parseLog"]>[0]);
      if (parsed?.name === "ProposalCreated") {
        return String(parsed.args.proposalId);
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function readProposalWindow(
  governance: ReturnType<typeof createGovernancePrimitiveService>,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  proposalId: string,
): Promise<{
  snapshot: Awaited<ReturnType<typeof governance.proposalSnapshot>>;
  proposalState: Awaited<ReturnType<typeof governance.prState>>;
  deadline: Awaited<ReturnType<typeof governance.proposalDeadline>>;
}> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const [snapshot, proposalState, deadline] = await Promise.all([
        governance.proposalSnapshot({
          auth,
          api: { executionSource: "auto", gaslessMode: "none" },
          walletAddress,
          wireParams: [proposalId],
        }),
        governance.prState({
          auth,
          api: { executionSource: "auto", gaslessMode: "none" },
          walletAddress,
          wireParams: [proposalId],
        }),
        governance.proposalDeadline({
          auth,
          api: { executionSource: "auto", gaslessMode: "none" },
          walletAddress,
          wireParams: [proposalId],
        }),
      ]);
      return { snapshot, proposalState, deadline };
    } catch (error) {
      if (attempt === 4) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw new Error(`proposal ${proposalId} window lookup failed`);
}

export async function runSubmitProposalWorkflow(
  context: ApiExecutionContext,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof submitProposalWorkflowSchema>,
) {
  const governance = createGovernancePrimitiveService(context);
  const proposal = await governance.proposeAddressArrayUint256ArrayBytesArrayStringUint8({
    auth,
    api: { executionSource: "auto", gaslessMode: "none" },
    walletAddress,
    wireParams: [body.targets, body.values, body.calldatas, body.description, body.proposalType],
  });

  const proposalTxHash = await waitForWorkflowWriteReceipt(context, proposal.body, "submitProposal.proposal");
  const proposalReceipt = proposalTxHash
    ? await context.providerRouter.withProvider(
        "read",
        "workflow.submitProposal.proposalReceipt",
        (provider) => provider.getTransactionReceipt(proposalTxHash),
      )
    : null;
  const proposalId = extractProposalIdFromReceipt(proposalReceipt) ?? extractResult(proposal.body);

  let snapshot: Awaited<ReturnType<typeof governance.proposalSnapshot>> | null = null;
  let proposalState: Awaited<ReturnType<typeof governance.prState>> | null = null;
  let deadline: Awaited<ReturnType<typeof governance.proposalDeadline>> | null = null;
  let proposalReadbackError: string | null = null;

  if (proposalId) {
    try {
      ({ snapshot, proposalState, deadline } = await readProposalWindow(governance, auth, walletAddress, proposalId));
    } catch (error) {
      proposalReadbackError = String((error as { message?: string })?.message ?? error);
    }
  } else {
    proposalReadbackError = "proposal id could not be derived from workflow response or receipt";
  }

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
    proposalState: proposalState?.body ?? null,
    proposalReadbackError,
    votingWindow: {
      earliestVotingBlock,
      proposalDeadlineBlock: deadline?.body ?? null,
      currentBlock: String(currentBlock),
      estimatedVotingStartTimestamp,
    },
  };
}
