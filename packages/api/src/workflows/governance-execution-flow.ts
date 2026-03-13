import { z } from "zod";

import type { AuthContext } from "../shared/auth.js";
import type { ApiExecutionContext } from "../shared/execution-context.js";
import { governanceAdminFlowWorkflowSchema, runGovernanceAdminFlowWorkflow } from "./governance-admin-flow.js";

export const governanceExecutionFlowWorkflowSchema = governanceAdminFlowWorkflowSchema;

export async function runGovernanceExecutionFlowWorkflow(
  context: ApiExecutionContext,
  auth: AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof governanceExecutionFlowWorkflowSchema>,
) {
  const governance = await runGovernanceAdminFlowWorkflow(context, auth, walletAddress, body);

  const proposalId = typeof governance.summary.proposalId === "string"
    ? governance.summary.proposalId
    : null;
  if (!proposalId) {
    throw new Error("governance-execution-flow requires governance-admin-flow to return proposalId");
  }

  const proposalState = getCurrentProposalState(governance);
  const executionReadiness = deriveExecutionReadiness(governance, proposalState);

  return {
    proposal: governance.proposal,
    votingWindow: governance.votingWindow,
    vote: governance.vote,
    executionReadiness,
    summary: {
      proposalId,
      proposalType: governance.summary.proposalType,
      currentProposalState: executionReadiness.proposalState,
      currentProposalStateLabel: executionReadiness.proposalStateLabel,
      voteRequested: governance.summary.voteRequested,
      voteCast: governance.summary.voteCast,
      queueEligible: executionReadiness.queueEligible,
      executeEligible: executionReadiness.executeEligible,
      nextGovernanceStep: executionReadiness.nextGovernanceStep,
      voter: governance.summary.voter,
    },
  };
}

function getCurrentProposalState(governance: Awaited<ReturnType<typeof runGovernanceAdminFlowWorkflow>>): string | null {
  const afterVote = governance.vote?.result?.proposalStateAfterVote;
  if (typeof afterVote === "string" && /^\d+$/u.test(afterVote)) {
    return afterVote;
  }
  const fromWindow = governance.votingWindow?.proposalState;
  return typeof fromWindow === "string" && /^\d+$/u.test(fromWindow) ? fromWindow : null;
}

function deriveExecutionReadiness(
  governance: Awaited<ReturnType<typeof runGovernanceAdminFlowWorkflow>>,
  proposalState: string | null,
) {
  const stateCode = proposalState;
  const deadline = typeof governance.proposal.readback?.deadline === "string"
    ? governance.proposal.readback.deadline
    : null;
  const currentBlock = typeof governance.votingWindow?.currentBlock === "string"
    ? governance.votingWindow.currentBlock
    : null;
  const deadlineBlock = parseBigInt(deadline);
  const currentBlockNumber = parseBigInt(currentBlock);
  const proposalStateLabel = mapProposalStateLabel(stateCode);
  const votingClosed = deadlineBlock !== null && currentBlockNumber !== null
    ? currentBlockNumber > deadlineBlock
    : null;

  switch (stateCode) {
    case "0":
      return {
        proposalState: stateCode,
        proposalStateLabel,
        deadline,
        currentBlock,
        votingClosed,
        queueEligible: false,
        executeEligible: false,
        phase: "pending",
        nextGovernanceStep: "wait-for-voting-window",
        readinessBasis: "proposal-state-derived",
      };
    case "1":
      return {
        proposalState: stateCode,
        proposalStateLabel,
        deadline,
        currentBlock,
        votingClosed,
        queueEligible: false,
        executeEligible: false,
        phase: "active",
        nextGovernanceStep: "vote-or-wait-for-close",
        readinessBasis: "proposal-state-derived",
      };
    case "2":
      return {
        proposalState: stateCode,
        proposalStateLabel,
        deadline,
        currentBlock,
        votingClosed,
        queueEligible: false,
        executeEligible: false,
        phase: "canceled",
        nextGovernanceStep: "none-terminal",
        readinessBasis: "proposal-state-derived",
      };
    case "3":
      return {
        proposalState: stateCode,
        proposalStateLabel,
        deadline,
        currentBlock,
        votingClosed,
        queueEligible: false,
        executeEligible: false,
        phase: "defeated",
        nextGovernanceStep: "none-terminal",
        readinessBasis: "proposal-state-derived",
      };
    case "4":
      return {
        proposalState: stateCode,
        proposalStateLabel,
        deadline,
        currentBlock,
        votingClosed,
        queueEligible: true,
        executeEligible: false,
        phase: "succeeded-awaiting-queue",
        nextGovernanceStep: "queue-when-governance-operator-is-ready",
        readinessBasis: "proposal-state-derived",
      };
    case "5":
      return {
        proposalState: stateCode,
        proposalStateLabel,
        deadline,
        currentBlock,
        votingClosed,
        queueEligible: false,
        executeEligible: false,
        phase: "queued-awaiting-execution-window",
        nextGovernanceStep: "execution-readiness-depends-on-timelock-state-not-surfaced-here",
        readinessBasis: "proposal-state-derived",
      };
    case "6":
      return {
        proposalState: stateCode,
        proposalStateLabel,
        deadline,
        currentBlock,
        votingClosed,
        queueEligible: false,
        executeEligible: false,
        phase: "expired",
        nextGovernanceStep: "none-terminal",
        readinessBasis: "proposal-state-derived",
      };
    case "7":
      return {
        proposalState: stateCode,
        proposalStateLabel,
        deadline,
        currentBlock,
        votingClosed,
        queueEligible: false,
        executeEligible: false,
        phase: "executed",
        nextGovernanceStep: "none-terminal",
        readinessBasis: "proposal-state-derived",
      };
    default:
      return {
        proposalState: stateCode,
        proposalStateLabel,
        deadline,
        currentBlock,
        votingClosed,
        queueEligible: false,
        executeEligible: false,
        phase: "unknown",
        nextGovernanceStep: "inspect-proposal-state",
        readinessBasis: "proposal-state-derived",
      };
  }
}

function mapProposalStateLabel(value: string | null): string {
  switch (value) {
    case "0":
      return "Pending";
    case "1":
      return "Active";
    case "2":
      return "Canceled";
    case "3":
      return "Defeated";
    case "4":
      return "Succeeded";
    case "5":
      return "Queued";
    case "6":
      return "Expired";
    case "7":
      return "Executed";
    default:
      return "Unknown";
  }
}

function parseBigInt(value: unknown): bigint | null {
  return typeof value === "string" && /^\d+$/u.test(value) ? BigInt(value) : null;
}
