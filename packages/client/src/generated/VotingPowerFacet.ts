import { invokeRead, invokeWrite, queryEvent } from "../runtime/invoke.js";
import type { FacetWrapperContext } from "../types.js";

export function createVotingPowerFacetWrapper(context: FacetWrapperContext) {
  return {
    facetName: "VotingPowerFacet" as const,
    read: {
    MAX_BATCH_SIZE: (...args: unknown[]) => invokeRead(context, "VotingPowerFacet", "MAX_BATCH_SIZE", args, false, 5),
    calculateBaseRoleMultiplier: (...args: unknown[]) => invokeRead(context, "VotingPowerFacet", "calculateBaseRoleMultiplier", args, false, 5),
    getDelegatedVotingPower: (...args: unknown[]) => invokeRead(context, "VotingPowerFacet", "getDelegatedVotingPower", args, false, 5),
    getLatestCheckpoint: (...args: unknown[]) => invokeRead(context, "VotingPowerFacet", "getLatestCheckpoint", args, false, 5),
    getLockDuration: (...args: unknown[]) => invokeRead(context, "VotingPowerFacet", "getLockDuration", args, false, 5),
    getLockTimestamp: (...args: unknown[]) => invokeRead(context, "VotingPowerFacet", "getLockTimestamp", args, false, 5),
    getPastVotes: (...args: unknown[]) => invokeRead(context, "VotingPowerFacet", "getPastVotes", args, false, 5),
    getVotes: (...args: unknown[]) => invokeRead(context, "VotingPowerFacet", "getVotes", args, false, 5),
    getVotingPower: (...args: unknown[]) => invokeRead(context, "VotingPowerFacet", "getVotingPower", args, false, 5),
    getVotingPowerWithDelegations: (...args: unknown[]) => invokeRead(context, "VotingPowerFacet", "getVotingPowerWithDelegations", args, false, 5),
    },
    write: {
    setMaxLockDuration: (...args: unknown[]) => invokeWrite(context, "VotingPowerFacet", "setMaxLockDuration", args),
    setRoleMultiplier: (...args: unknown[]) => invokeWrite(context, "VotingPowerFacet", "setRoleMultiplier", args),
    setZeroLockDuration: (...args: unknown[]) => invokeWrite(context, "VotingPowerFacet", "setZeroLockDuration", args),
    setupInitialVotingPower: (...args: unknown[]) => invokeWrite(context, "VotingPowerFacet", "setupInitialVotingPower", args),
    updateLockDuration: (...args: unknown[]) => invokeWrite(context, "VotingPowerFacet", "updateLockDuration", args),
    updateVotingPower: (...args: unknown[]) => invokeWrite(context, "VotingPowerFacet", "updateVotingPower", args),
    updateVotingPowerBatch: (...args: unknown[]) => invokeWrite(context, "VotingPowerFacet", "updateVotingPowerBatch", args),
    },
    events: {
    LockDurationUpdated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VotingPowerFacet", "LockDurationUpdated", fromBlock, toBlock) },
    MaxLockDurationUpdated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VotingPowerFacet", "MaxLockDurationUpdated", fromBlock, toBlock) },
    RoleMultiplierUpdated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VotingPowerFacet", "RoleMultiplierUpdated", fromBlock, toBlock) },
    VotingPowerUpdated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VotingPowerFacet", "VotingPowerUpdated", fromBlock, toBlock) },
    },
  };
}
