import { invokeRead, invokeWrite, queryEvent } from "../runtime/invoke.js";
import type { FacetWrapperContext } from "../types.js";

export function createVoiceDatasetFacetWrapper(context: FacetWrapperContext) {
  return {
    facetName: "VoiceDatasetFacet" as const,
    read: {
    containsAsset: (...args: unknown[]) => invokeRead(context, "VoiceDatasetFacet", "containsAsset", args, false, 5),
    getDataset: (...args: unknown[]) => invokeRead(context, "VoiceDatasetFacet", "getDataset", args, false, 5),
    getDatasetsByCreator: (...args: unknown[]) => invokeRead(context, "VoiceDatasetFacet", "getDatasetsByCreator", args, false, 5),
    getMaxAssetsPerDataset: (...args: unknown[]) => invokeRead(context, "VoiceDatasetFacet", "getMaxAssetsPerDataset", args, false, 5),
    getTotalDatasets: (...args: unknown[]) => invokeRead(context, "VoiceDatasetFacet", "getTotalDatasets", args, false, 5),
    royaltyInfo: (...args: unknown[]) => invokeRead(context, "VoiceDatasetFacet", "royaltyInfo", args, false, 5),
    },
    write: {
    appendAssets: (...args: unknown[]) => invokeWrite(context, "VoiceDatasetFacet", "appendAssets", args),
    burnDataset: (...args: unknown[]) => invokeWrite(context, "VoiceDatasetFacet", "burnDataset", args),
    createDataset: (...args: unknown[]) => invokeWrite(context, "VoiceDatasetFacet", "createDataset", args),
    removeAsset: (...args: unknown[]) => invokeWrite(context, "VoiceDatasetFacet", "removeAsset", args),
    setDatasetStatus: (...args: unknown[]) => invokeWrite(context, "VoiceDatasetFacet", "setDatasetStatus", args),
    setLicense: (...args: unknown[]) => invokeWrite(context, "VoiceDatasetFacet", "setLicense", args),
    setMaxAssetsPerDataset: (...args: unknown[]) => invokeWrite(context, "VoiceDatasetFacet", "setMaxAssetsPerDataset", args),
    setMetadata: (...args: unknown[]) => invokeWrite(context, "VoiceDatasetFacet", "setMetadata", args),
    setRoyalty: (...args: unknown[]) => invokeWrite(context, "VoiceDatasetFacet", "setRoyalty", args),
    },
    events: {
    AssetRemoved: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VoiceDatasetFacet", "AssetRemoved", fromBlock, toBlock) },
    AssetsAppended: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VoiceDatasetFacet", "AssetsAppended", fromBlock, toBlock) },
    DatasetBurned: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VoiceDatasetFacet", "DatasetBurned", fromBlock, toBlock) },
    DatasetCreated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VoiceDatasetFacet", "DatasetCreated", fromBlock, toBlock) },
    DatasetRoyaltyPayeeSet: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VoiceDatasetFacet", "DatasetRoyaltyPayeeSet", fromBlock, toBlock) },
    DatasetStatusChanged: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VoiceDatasetFacet", "DatasetStatusChanged", fromBlock, toBlock) },
    LicenseChanged: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VoiceDatasetFacet", "LicenseChanged", fromBlock, toBlock) },
    MetadataChanged: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VoiceDatasetFacet", "MetadataChanged", fromBlock, toBlock) },
    RoyaltySet: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VoiceDatasetFacet", "RoyaltySet", fromBlock, toBlock) },
    Transfer: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VoiceDatasetFacet", "Transfer", fromBlock, toBlock) },
    },
  };
}
