import { invokeRead, invokeWrite, queryEvent } from "../runtime/invoke.js";
import type { FacetWrapperContext } from "../types.js";

export function createDiamondLoupeFacetWrapper(context: FacetWrapperContext) {
  return {
    facetName: "DiamondLoupeFacet" as const,
    read: {
    facetAddress: (...args: unknown[]) => invokeRead(context, "DiamondLoupeFacet", "facetAddress", args, false, 5),
    facetAddresses: (...args: unknown[]) => invokeRead(context, "DiamondLoupeFacet", "facetAddresses", args, false, 5),
    facetFunctionSelectors: (...args: unknown[]) => invokeRead(context, "DiamondLoupeFacet", "facetFunctionSelectors", args, false, 5),
    facets: (...args: unknown[]) => invokeRead(context, "DiamondLoupeFacet", "facets", args, false, 5),
    },
    write: {

    },
    events: {

    },
  };
}
