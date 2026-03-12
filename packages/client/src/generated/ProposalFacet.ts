import { invokeRead, invokeWrite, queryEvent } from "../runtime/invoke.js";
import type { FacetWrapperContext } from "../types.js";

export function createProposalFacetWrapper(context: FacetWrapperContext) {
  return {
    facetName: "ProposalFacet" as const,
    read: {
    GOVERNANCE_PROPOSER_ROLE: (...args: unknown[]) => invokeRead(context, "ProposalFacet", "GOVERNANCE_PROPOSER_ROLE", args, false, 5),
    TIMELOCK_ROLE: (...args: unknown[]) => invokeRead(context, "ProposalFacet", "TIMELOCK_ROLE", args, false, 5),
    getActiveProposals: (...args: unknown[]) => invokeRead(context, "ProposalFacet", "getActiveProposals", args, false, 30),
    getProposalTypeConfig: (...args: unknown[]) => invokeRead(context, "ProposalFacet", "getProposalTypeConfig", args, false, 30),
    getProposerProposals: (...args: unknown[]) => invokeRead(context, "ProposalFacet", "getProposerProposals", args, false, 30),
    getReceipt: (...args: unknown[]) => invokeRead(context, "ProposalFacet", "getReceipt", args, false, 5),
    prState: (...args: unknown[]) => invokeRead(context, "ProposalFacet", "prState", args, false, 5),
    proposalDeadline: (...args: unknown[]) => invokeRead(context, "ProposalFacet", "proposalDeadline", args, false, 5),
    proposalExists: (...args: unknown[]) => invokeRead(context, "ProposalFacet", "proposalExists", args, false, 5),
    proposalSnapshot: (...args: unknown[]) => invokeRead(context, "ProposalFacet", "proposalSnapshot", args, false, 5),
    proposalVotes: (...args: unknown[]) => invokeRead(context, "ProposalFacet", "proposalVotes", args, false, 5),
    queue: (...args: unknown[]) => invokeRead(context, "ProposalFacet", "queue", args, false, 5),
    state: (...args: unknown[]) => invokeRead(context, "ProposalFacet", "state", args, false, 5),
    },
    write: {
    cancelProposal: (...args: unknown[]) => invokeWrite(context, "ProposalFacet", "cancelProposal", args),
    prCastVote: (...args: unknown[]) => invokeWrite(context, "ProposalFacet", "prCastVote", args),
    prExecute: (...args: unknown[]) => invokeWrite(context, "ProposalFacet", "prExecute", args),
    prQueue: (...args: unknown[]) => invokeWrite(context, "ProposalFacet", "prQueue", args),
    "propose(string,string,address[],uint256[],bytes[],uint8)": (...args: unknown[]) => invokeWrite(context, "ProposalFacet", "propose(string,string,address[],uint256[],bytes[],uint8)", args),
    "propose(address[],uint256[],bytes[],string,uint8)": (...args: unknown[]) => invokeWrite(context, "ProposalFacet", "propose(address[],uint256[],bytes[],string,uint8)", args),
    setProposalTypeConfig: (...args: unknown[]) => invokeWrite(context, "ProposalFacet", "setProposalTypeConfig", args),
    },
    events: {
    ProposalCanceled: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "ProposalFacet", "ProposalCanceled", fromBlock, toBlock) },
    ProposalCreated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "ProposalFacet", "ProposalCreated", fromBlock, toBlock) },
    ProposalExecuted: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "ProposalFacet", "ProposalExecuted", fromBlock, toBlock) },
    ProposalQueued: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "ProposalFacet", "ProposalQueued", fromBlock, toBlock) },
    ProposalTypeConfigSet: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "ProposalFacet", "ProposalTypeConfigSet", fromBlock, toBlock) },
    VoteCast: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "ProposalFacet", "VoteCast", fromBlock, toBlock) },
    },
  };
}
