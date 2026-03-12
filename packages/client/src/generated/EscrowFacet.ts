import { invokeRead, invokeWrite, queryEvent } from "../runtime/invoke.js";
import type { FacetWrapperContext } from "../types.js";

export function createEscrowFacetWrapper(context: FacetWrapperContext) {
  return {
    facetName: "EscrowFacet" as const,
    read: {
    getAssetState: (...args: unknown[]) => invokeRead(context, "EscrowFacet", "getAssetState", args, false, null),
    getOriginalOwner: (...args: unknown[]) => invokeRead(context, "EscrowFacet", "getOriginalOwner", args, false, null),
    isInEscrow: (...args: unknown[]) => invokeRead(context, "EscrowFacet", "isInEscrow", args, false, null),
    },
    write: {
    escrowAsset: (...args: unknown[]) => invokeWrite(context, "EscrowFacet", "escrowAsset", args),
    onERC721Received: (...args: unknown[]) => invokeWrite(context, "EscrowFacet", "onERC721Received", args),
    releaseAsset: (...args: unknown[]) => invokeWrite(context, "EscrowFacet", "releaseAsset", args),
    updateAssetState: (...args: unknown[]) => invokeWrite(context, "EscrowFacet", "updateAssetState", args),
    },
    events: {
    AssetEscrowed: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "EscrowFacet", "AssetEscrowed", fromBlock, toBlock) },
    AssetReleased: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "EscrowFacet", "AssetReleased", fromBlock, toBlock) },
    AssetStateUpdated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "EscrowFacet", "AssetStateUpdated", fromBlock, toBlock) },
    },
  };
}
