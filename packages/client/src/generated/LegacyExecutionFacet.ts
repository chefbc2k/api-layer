import { invokeRead, invokeWrite, queryEvent } from "../runtime/invoke.js";
import type { FacetWrapperContext } from "../types.js";

export function createLegacyExecutionFacetWrapper(context: FacetWrapperContext) {
  return {
    facetName: "LegacyExecutionFacet" as const,
    read: {

    },
    write: {
    approveInheritance: (...args: unknown[]) => invokeWrite(context, "LegacyExecutionFacet", "approveInheritance", args),
    delegateRights: (...args: unknown[]) => invokeWrite(context, "LegacyExecutionFacet", "delegateRights", args),
    executeInheritance: (...args: unknown[]) => invokeWrite(context, "LegacyExecutionFacet", "executeInheritance", args),
    initiateInheritance: (...args: unknown[]) => invokeWrite(context, "LegacyExecutionFacet", "initiateInheritance", args),
    },
    events: {
    InheritanceActivated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "LegacyExecutionFacet", "InheritanceActivated", fromBlock, toBlock) },
    InheritanceApproved: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "LegacyExecutionFacet", "InheritanceApproved", fromBlock, toBlock) },
    RightsDelegated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "LegacyExecutionFacet", "RightsDelegated", fromBlock, toBlock) },
    },
  };
}
