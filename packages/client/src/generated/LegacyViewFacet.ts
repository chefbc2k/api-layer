import { invokeRead, invokeWrite, queryEvent } from "../runtime/invoke.js";
import type { FacetWrapperContext } from "../types.js";

export function createLegacyViewFacetWrapper(context: FacetWrapperContext) {
  return {
    facetName: "LegacyViewFacet" as const,
    read: {
    getLegacyPlan: (...args: unknown[]) => invokeRead(context, "LegacyViewFacet", "getLegacyPlan", args, false, null),
    isInheritanceReady: (...args: unknown[]) => invokeRead(context, "LegacyViewFacet", "isInheritanceReady", args, false, null),
    validateBeneficiaries: (...args: unknown[]) => invokeRead(context, "LegacyViewFacet", "validateBeneficiaries", args, false, null),
    validateBeneficiary: (...args: unknown[]) => invokeRead(context, "LegacyViewFacet", "validateBeneficiary", args, false, null),
    },
    write: {

    },
    events: {

    },
  };
}
