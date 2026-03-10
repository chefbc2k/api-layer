import { invokeRead, invokeWrite, queryEvent } from "../runtime/invoke.js";
import type { FacetWrapperContext } from "../types.js";

export function createBurnThresholdFacetWrapper(context: FacetWrapperContext) {
  return {
    facetName: "BurnThresholdFacet" as const,
    read: {
    thresholdCalculateExcess: (...args: unknown[]) => invokeRead(context, "BurnThresholdFacet", "thresholdCalculateExcess", args, false, 5),
    thresholdGetBurnLimit: (...args: unknown[]) => invokeRead(context, "BurnThresholdFacet", "thresholdGetBurnLimit", args, false, 5),
    },
    write: {
    thresholdBurnExcess: (...args: unknown[]) => invokeWrite(context, "BurnThresholdFacet", "thresholdBurnExcess", args),
    thresholdBurnTokens: (...args: unknown[]) => invokeWrite(context, "BurnThresholdFacet", "thresholdBurnTokens", args),
    thresholdBurnTokensFrom: (...args: unknown[]) => invokeWrite(context, "BurnThresholdFacet", "thresholdBurnTokensFrom", args),
    thresholdSetBurnLimit: (...args: unknown[]) => invokeWrite(context, "BurnThresholdFacet", "thresholdSetBurnLimit", args),
    },
    events: {
    BurnThresholdUpdated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "BurnThresholdFacet", "BurnThresholdUpdated", fromBlock, toBlock) },
    ThresholdBurn: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "BurnThresholdFacet", "ThresholdBurn", fromBlock, toBlock) },
    Transfer: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "BurnThresholdFacet", "Transfer", fromBlock, toBlock) },
    },
  };
}
