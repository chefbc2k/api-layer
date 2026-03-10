import { invokeRead, invokeWrite, queryEvent } from "../runtime/invoke.js";
import type { FacetWrapperContext } from "../types.js";

export function createTimewaveGiftFacetWrapper(context: FacetWrapperContext) {
  return {
    facetName: "TimewaveGiftFacet" as const,
    read: {
    canTransferVesting: (...args: unknown[]) => invokeRead(context, "TimewaveGiftFacet", "canTransferVesting", args, false, 5),
    getMinTwaveVestingDuration: (...args: unknown[]) => invokeRead(context, "TimewaveGiftFacet", "getMinTwaveVestingDuration", args, false, 5),
    getNextUnlockTime: (...args: unknown[]) => invokeRead(context, "TimewaveGiftFacet", "getNextUnlockTime", args, false, 5),
    getQuarterlyUnlockRate: (...args: unknown[]) => invokeRead(context, "TimewaveGiftFacet", "getQuarterlyUnlockRate", args, false, 5),
    getReleasableTwaveAmount: (...args: unknown[]) => invokeRead(context, "TimewaveGiftFacet", "getReleasableTwaveAmount", args, false, 5),
    getVestedTwaveAmount: (...args: unknown[]) => invokeRead(context, "TimewaveGiftFacet", "getVestedTwaveAmount", args, false, 5),
    getVestingTwaveSchedule: (...args: unknown[]) => invokeRead(context, "TimewaveGiftFacet", "getVestingTwaveSchedule", args, false, 5),
    isFullyVested: (...args: unknown[]) => invokeRead(context, "TimewaveGiftFacet", "isFullyVested", args, false, 5),
    isVestingActive: (...args: unknown[]) => invokeRead(context, "TimewaveGiftFacet", "isVestingActive", args, false, 5),
    },
    write: {
    batchReleaseTwaveVesting: (...args: unknown[]) => invokeWrite(context, "TimewaveGiftFacet", "batchReleaseTwaveVesting", args),
    createUsdcVestingSchedule: (...args: unknown[]) => invokeWrite(context, "TimewaveGiftFacet", "createUsdcVestingSchedule", args),
    releaseTwaveVesting: (...args: unknown[]) => invokeWrite(context, "TimewaveGiftFacet", "releaseTwaveVesting", args),
    releaseTwaveVestingFor: (...args: unknown[]) => invokeWrite(context, "TimewaveGiftFacet", "releaseTwaveVestingFor", args),
    revokeTwaveVesting: (...args: unknown[]) => invokeWrite(context, "TimewaveGiftFacet", "revokeTwaveVesting", args),
    setMinimumTwaveVestingDuration: (...args: unknown[]) => invokeWrite(context, "TimewaveGiftFacet", "setMinimumTwaveVestingDuration", args),
    setQuarterlyUnlockRate: (...args: unknown[]) => invokeWrite(context, "TimewaveGiftFacet", "setQuarterlyUnlockRate", args),
    transferTwaveVesting: (...args: unknown[]) => invokeWrite(context, "TimewaveGiftFacet", "transferTwaveVesting", args),
    },
    events: {
    TokensVested: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "TimewaveGiftFacet", "TokensVested", fromBlock, toBlock) },
    VestingRevoked: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "TimewaveGiftFacet", "VestingRevoked", fromBlock, toBlock) },
    "VestingScheduleCreated(address,uint256,uint256,uint256,uint256,bool)": { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "TimewaveGiftFacet", "VestingScheduleCreated(address,uint256,uint256,uint256,uint256,bool)", fromBlock, toBlock) },
    VestingTransferred: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "TimewaveGiftFacet", "VestingTransferred", fromBlock, toBlock) },
    },
  };
}
