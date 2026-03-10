import { invokeRead, invokeWrite, queryEvent } from "../runtime/invoke.js";
import type { FacetWrapperContext } from "../types.js";

export function createDelegationFacetWrapper(context: FacetWrapperContext) {
  return {
    facetName: "DelegationFacet" as const,
    read: {
    DELEGATION_TYPEHASH: (...args: unknown[]) => invokeRead(context, "DelegationFacet", "DELEGATION_TYPEHASH", args, false, 5),
    DOMAIN_TYPEHASH: (...args: unknown[]) => invokeRead(context, "DelegationFacet", "DOMAIN_TYPEHASH", args, false, 5),
    delegates: (...args: unknown[]) => invokeRead(context, "DelegationFacet", "delegates", args, false, 5),
    getCurrentVotes: (...args: unknown[]) => invokeRead(context, "DelegationFacet", "getCurrentVotes", args, false, 5),
    getDelegatedVotingPower: (...args: unknown[]) => invokeRead(context, "DelegationFacet", "getDelegatedVotingPower", args, false, 5),
    getPriorVotes: (...args: unknown[]) => invokeRead(context, "DelegationFacet", "getPriorVotes", args, false, 5),
    getTotalVotingPower: (...args: unknown[]) => invokeRead(context, "DelegationFacet", "getTotalVotingPower", args, false, 5),
    },
    write: {
    delegate: (...args: unknown[]) => invokeWrite(context, "DelegationFacet", "delegate", args),
    delegateBySig: (...args: unknown[]) => invokeWrite(context, "DelegationFacet", "delegateBySig", args),
    updateDelegatedVotingPower: (...args: unknown[]) => invokeWrite(context, "DelegationFacet", "updateDelegatedVotingPower", args),
    updateDelegatedVotingPowerBatch: (...args: unknown[]) => invokeWrite(context, "DelegationFacet", "updateDelegatedVotingPowerBatch", args),
    },
    events: {
    "DelegateChanged(address,address,address)": { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "DelegationFacet", "DelegateChanged(address,address,address)", fromBlock, toBlock) },
    "DelegateVotesChanged(address,uint256,uint256)": { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "DelegationFacet", "DelegateVotesChanged(address,uint256,uint256)", fromBlock, toBlock) },
    VotingPowerUpdated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "DelegationFacet", "VotingPowerUpdated", fromBlock, toBlock) },
    },
  };
}
