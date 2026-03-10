import { invokeRead, invokeWrite, queryEvent } from "../runtime/invoke.js";
import type { FacetWrapperContext } from "../types.js";

export function createGovernorFacetWrapper(context: FacetWrapperContext) {
  return {
    facetName: "GovernorFacet" as const,
    read: {
    GOVERNANCE_PROPOSER_ROLE: (...args: unknown[]) => invokeRead(context, "GovernorFacet", "GOVERNANCE_PROPOSER_ROLE", args, false, 5),
    getRoleMultiplier: (...args: unknown[]) => invokeRead(context, "GovernorFacet", "getRoleMultiplier", args, false, 600),
    getVotingConfig: (...args: unknown[]) => invokeRead(context, "GovernorFacet", "getVotingConfig", args, false, 600),
    },
    write: {
    setDefaultGasLimit: (...args: unknown[]) => invokeWrite(context, "GovernorFacet", "setDefaultGasLimit", args),
    setTrustedTarget: (...args: unknown[]) => invokeWrite(context, "GovernorFacet", "setTrustedTarget", args),
    updateProposalThreshold: (...args: unknown[]) => invokeWrite(context, "GovernorFacet", "updateProposalThreshold", args),
    updateQuorumNumerator: (...args: unknown[]) => invokeWrite(context, "GovernorFacet", "updateQuorumNumerator", args),
    updateVotingDelay: (...args: unknown[]) => invokeWrite(context, "GovernorFacet", "updateVotingDelay", args),
    updateVotingPeriod: (...args: unknown[]) => invokeWrite(context, "GovernorFacet", "updateVotingPeriod", args),
    },
    events: {
    TargetGasLimitUpdated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "GovernorFacet", "TargetGasLimitUpdated", fromBlock, toBlock) },
    TrustedTargetUpdated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "GovernorFacet", "TrustedTargetUpdated", fromBlock, toBlock) },
    },
  };
}
