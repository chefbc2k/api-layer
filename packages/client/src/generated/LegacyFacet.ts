import { invokeRead, invokeWrite, queryEvent } from "../runtime/invoke.js";
import type { FacetWrapperContext } from "../types.js";

export function createLegacyFacetWrapper(context: FacetWrapperContext) {
  return {
    facetName: "LegacyFacet" as const,
    read: {

    },
    write: {
    addBeneficiary: (...args: unknown[]) => invokeWrite(context, "LegacyFacet", "addBeneficiary", args),
    addDatasets: (...args: unknown[]) => invokeWrite(context, "LegacyFacet", "addDatasets", args),
    addInheritanceRequirement: (...args: unknown[]) => invokeWrite(context, "LegacyFacet", "addInheritanceRequirement", args),
    addVoiceAssets: (...args: unknown[]) => invokeWrite(context, "LegacyFacet", "addVoiceAssets", args),
    createLegacyPlan: (...args: unknown[]) => invokeWrite(context, "LegacyFacet", "createLegacyPlan", args),
    setBeneficiaryRelationship: (...args: unknown[]) => invokeWrite(context, "LegacyFacet", "setBeneficiaryRelationship", args),
    setInheritanceConditions: (...args: unknown[]) => invokeWrite(context, "LegacyFacet", "setInheritanceConditions", args),
    setMaxBeneficiaries: (...args: unknown[]) => invokeWrite(context, "LegacyFacet", "setMaxBeneficiaries", args),
    setMinTimelockPeriod: (...args: unknown[]) => invokeWrite(context, "LegacyFacet", "setMinTimelockPeriod", args),
    },
    events: {
    BeneficiaryUpdated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "LegacyFacet", "BeneficiaryUpdated", fromBlock, toBlock) },
    InheritanceConditionsUpdated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "LegacyFacet", "InheritanceConditionsUpdated", fromBlock, toBlock) },
    LegacyPlanCreated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "LegacyFacet", "LegacyPlanCreated", fromBlock, toBlock) },
    },
  };
}
