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

export function extractResult(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const result = (payload as Record<string, unknown>).result;
  return typeof result === "string" ? result : null;
}

export function extractProposalIdFromReceipt(receipt: { logs?: ReadonlyArray<unknown> } | null): string | null {
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
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const [snapshot, proposalState, deadline] = await Promise.all([
        governance.proposalSnapshot({
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
        governance.proposalDeadline({
          auth,
          api: { executionSource: "live", gaslessMode: "none" },
          walletAddress,
          wireParams: [proposalId],
        }),
      ]);
      if (snapshot.statusCode === 200 && proposalState.statusCode === 200 && deadline.statusCode === 200) {
        return { snapshot, proposalState, deadline };
      }
      lastError = { snapshot: snapshot.body, proposalState: proposalState.body, deadline: deadline.body };
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`proposal ${proposalId} window lookup failed: ${String((lastError as { message?: string })?.message ?? JSON.stringify(lastError))}`);
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
  if (!proposalId) {
    throw new Error("proposal id could not be derived from workflow response or receipt");
  }

  const { snapshot, proposalState, deadline } = await readProposalWindow(governance, auth, walletAddress, proposalId);
  const proposalCreatedEvents = proposalReceipt
    ? await waitForWorkflowEventQuery(
        () => governance.proposalCreatedEventQuery({
          auth,
          fromBlock: BigInt(proposalReceipt.blockNumber),
          toBlock: BigInt(proposalReceipt.blockNumber),
        }),
        (logs) => hasTransactionHash(logs, proposalTxHash),
        "submitProposal.proposalCreated",
      )
    : [];

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
    proposal: {
      submission: proposal.body,
      txHash: proposalTxHash,
      proposalId,
      eventCount: proposalCreatedEvents.length,
    },
    readback: {
      snapshot: snapshot.body,
      proposalState: proposalState.body,
      deadline: deadline.body,
    },
    votingWindow: {
      earliestVotingBlock,
      proposalDeadlineBlock: deadline.body,
      currentBlock: String(currentBlock),
      latestBlockTimestamp: String(latestBlock?.timestamp ?? 0),
      estimatedVotingStartTimestamp,
    },
    summary: {
      proposalId,
      proposalType: body.proposalType,
      targetCount: body.targets.length,
      calldataCount: body.calldatas.length,
    },
  };
}

async function waitForWorkflowEventQuery(
  read: () => Promise<unknown[]>,
  ready: (logs: unknown[]) => boolean,
  label: string,
) {
  let lastLogs: unknown[] = [];
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const logs = await read();
    lastLogs = logs;
    if (ready(logs)) {
      return logs;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${label} event query timeout: ${JSON.stringify(lastLogs)}`);
}

function hasTransactionHash(logs: unknown[], txHash: string | null): boolean {
  if (!txHash) {
    return false;
  }
  return logs.some((entry) => {
    if (!entry || typeof entry !== "object") {
      return false;
    }
    return (entry as Record<string, unknown>).transactionHash === txHash;
  });
}
