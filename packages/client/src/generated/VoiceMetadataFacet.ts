import { invokeRead, invokeWrite, queryEvent } from "../runtime/invoke.js";
import type { FacetWrapperContext } from "../types.js";

export function createVoiceMetadataFacetWrapper(context: FacetWrapperContext) {
  return {
    facetName: "VoiceMetadataFacet" as const,
    read: {
    getBasicAcousticFeatures: (...args: unknown[]) => invokeRead(context, "VoiceMetadataFacet", "getBasicAcousticFeatures", args, false, 3600),
    getGeographicData: (...args: unknown[]) => invokeRead(context, "VoiceMetadataFacet", "getGeographicData", args, false, 3600),
    getVoiceCategories: (...args: unknown[]) => invokeRead(context, "VoiceMetadataFacet", "getVoiceCategories", args, false, 5),
    getVoiceClassifications: (...args: unknown[]) => invokeRead(context, "VoiceMetadataFacet", "getVoiceClassifications", args, false, 3600),
    searchVoicesByClassification: (...args: unknown[]) => invokeRead(context, "VoiceMetadataFacet", "searchVoicesByClassification", args, false, 5),
    searchVoicesByClassificationPaginated: (...args: unknown[]) => invokeRead(context, "VoiceMetadataFacet", "searchVoicesByClassificationPaginated", args, false, 5),
    },
    write: {
    setAnalysisVersion: (...args: unknown[]) => invokeWrite(context, "VoiceMetadataFacet", "setAnalysisVersion", args),
    },
    events: {
    AnalysisVersionUpdated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VoiceMetadataFacet", "AnalysisVersionUpdated", fromBlock, toBlock) },
    BasicAcousticFeaturesUpdated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VoiceMetadataFacet", "BasicAcousticFeaturesUpdated", fromBlock, toBlock) },
    ClassificationCategoryUpdated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VoiceMetadataFacet", "ClassificationCategoryUpdated", fromBlock, toBlock) },
    GeographicDataUpdated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VoiceMetadataFacet", "GeographicDataUpdated", fromBlock, toBlock) },
    VoiceClassificationsUpdated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VoiceMetadataFacet", "VoiceClassificationsUpdated", fromBlock, toBlock) },
    },
  };
}
