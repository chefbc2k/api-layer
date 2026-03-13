import { invokeRead, invokeWrite, queryEvent } from "../runtime/invoke.js";
import type { FacetWrapperContext } from "../types.js";

export function createDiamondCutFacetWrapper(context: FacetWrapperContext) {
  return {
    facetName: "DiamondCutFacet" as const,
    read: {
    FOUNDER_ROLE: (...args: unknown[]) => invokeRead(context, "DiamondCutFacet", "FOUNDER_ROLE", args, false, 5),
    getTrustedInitCodehash: (...args: unknown[]) => invokeRead(context, "DiamondCutFacet", "getTrustedInitCodehash", args, false, 5),
    isImmutableSelectorReserved: (...args: unknown[]) => invokeRead(context, "DiamondCutFacet", "isImmutableSelectorReserved", args, false, 5),
    isTrustedInitSelector: (...args: unknown[]) => invokeRead(context, "DiamondCutFacet", "isTrustedInitSelector", args, false, 5),
    isTrustedInitSelectorPolicyEnabled: (...args: unknown[]) => invokeRead(context, "DiamondCutFacet", "isTrustedInitSelectorPolicyEnabled", args, false, 5),
    },
    write: {
    diamondCut: (...args: unknown[]) => invokeWrite(context, "DiamondCutFacet", "diamondCut", args),
    setTrustedInitCodehash: (...args: unknown[]) => invokeWrite(context, "DiamondCutFacet", "setTrustedInitCodehash", args),
    setTrustedInitContract: (...args: unknown[]) => invokeWrite(context, "DiamondCutFacet", "setTrustedInitContract", args),
    setTrustedInitSelector: (...args: unknown[]) => invokeWrite(context, "DiamondCutFacet", "setTrustedInitSelector", args),
    },
    events: {
    DiamondCut: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "DiamondCutFacet", "DiamondCut", fromBlock, toBlock) },
    DiamondCutEvent: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "DiamondCutFacet", "DiamondCutEvent", fromBlock, toBlock) },
    TrustedInitCodehashSet: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "DiamondCutFacet", "TrustedInitCodehashSet", fromBlock, toBlock) },
    TrustedInitContractSet: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "DiamondCutFacet", "TrustedInitContractSet", fromBlock, toBlock) },
    TrustedInitSelectorSet: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "DiamondCutFacet", "TrustedInitSelectorSet", fromBlock, toBlock) },
    },
  };
}
