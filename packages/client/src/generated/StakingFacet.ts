import { invokeRead, invokeWrite, queryEvent } from "../runtime/invoke.js";
import type { FacetWrapperContext } from "../types.js";

export function createStakingFacetWrapper(context: FacetWrapperContext) {
  return {
    facetName: "StakingFacet" as const,
    read: {
    getDegradedModeConfig: (...args: unknown[]) => invokeRead(context, "StakingFacet", "getDegradedModeConfig", args, false, 5),
    getEffectiveApy: (...args: unknown[]) => invokeRead(context, "StakingFacet", "getEffectiveApy", args, false, 5),
    getPendingRewards: (...args: unknown[]) => invokeRead(context, "StakingFacet", "getPendingRewards", args, true, null),
    getRewardBreakdown: (...args: unknown[]) => invokeRead(context, "StakingFacet", "getRewardBreakdown", args, true, null),
    getStakeAgeMultiplier: (...args: unknown[]) => invokeRead(context, "StakingFacet", "getStakeAgeMultiplier", args, true, null),
    getStakeInfo: (...args: unknown[]) => invokeRead(context, "StakingFacet", "getStakeInfo", args, true, null),
    getStakingStats: (...args: unknown[]) => invokeRead(context, "StakingFacet", "getStakingStats", args, false, 5),
    getTier: (...args: unknown[]) => invokeRead(context, "StakingFacet", "getTier", args, false, 5),
    getTierConfig: (...args: unknown[]) => invokeRead(context, "StakingFacet", "getTierConfig", args, false, 5),
    getUnstakeRequest: (...args: unknown[]) => invokeRead(context, "StakingFacet", "getUnstakeRequest", args, true, null),
    isDegradedModeActive: (...args: unknown[]) => invokeRead(context, "StakingFacet", "isDegradedModeActive", args, false, 5),
    },
    write: {
    advanceEpoch: (...args: unknown[]) => invokeWrite(context, "StakingFacet", "advanceEpoch", args),
    claimRewards: (...args: unknown[]) => invokeWrite(context, "StakingFacet", "claimRewards", args),
    executeUnstake: (...args: unknown[]) => invokeWrite(context, "StakingFacet", "executeUnstake", args),
    fundRewardPool: (...args: unknown[]) => invokeWrite(context, "StakingFacet", "fundRewardPool", args),
    initStaking: (...args: unknown[]) => invokeWrite(context, "StakingFacet", "initStaking", args),
    initStakingWithToken: (...args: unknown[]) => invokeWrite(context, "StakingFacet", "initStakingWithToken", args),
    queueTierConfigUpdate: (...args: unknown[]) => invokeWrite(context, "StakingFacet", "queueTierConfigUpdate", args),
    requestUnstake: (...args: unknown[]) => invokeWrite(context, "StakingFacet", "requestUnstake", args),
    setDegradedModeConfig: (...args: unknown[]) => invokeWrite(context, "StakingFacet", "setDegradedModeConfig", args),
    setEchoScoreBoost: (...args: unknown[]) => invokeWrite(context, "StakingFacet", "setEchoScoreBoost", args),
    setStakingPaused: (...args: unknown[]) => invokeWrite(context, "StakingFacet", "setStakingPaused", args),
    stake: (...args: unknown[]) => invokeWrite(context, "StakingFacet", "stake", args),
    },
    events: {
    EpochAdvanced: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "StakingFacet", "EpochAdvanced", fromBlock, toBlock) },
    RewardPoolFunded: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "StakingFacet", "RewardPoolFunded", fromBlock, toBlock) },
    RewardsClaimed: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "StakingFacet", "RewardsClaimed", fromBlock, toBlock) },
    RewardsClaimedDetailed: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "StakingFacet", "RewardsClaimedDetailed", fromBlock, toBlock) },
    Staked: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "StakingFacet", "Staked", fromBlock, toBlock) },
    StakingInitialized: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "StakingFacet", "StakingInitialized", fromBlock, toBlock) },
    StakingPaused: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "StakingFacet", "StakingPaused", fromBlock, toBlock) },
    TierConfigUpdated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "StakingFacet", "TierConfigUpdated", fromBlock, toBlock) },
    UnstakeRequested: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "StakingFacet", "UnstakeRequested", fromBlock, toBlock) },
    Unstaked: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "StakingFacet", "Unstaked", fromBlock, toBlock) },
    },
  };
}
