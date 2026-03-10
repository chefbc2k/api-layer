import { invokeRead, invokeWrite, queryEvent } from "../runtime/invoke.js";
import type { FacetWrapperContext } from "../types.js";

export function createMarketplaceFacetWrapper(context: FacetWrapperContext) {
  return {
    facetName: "MarketplaceFacet" as const,
    read: {
    getListing: (...args: unknown[]) => invokeRead(context, "MarketplaceFacet", "getListing", args, false, 30),
    isPaused: (...args: unknown[]) => invokeRead(context, "MarketplaceFacet", "isPaused", args, false, 5),
    },
    write: {
    cancelListing: (...args: unknown[]) => invokeWrite(context, "MarketplaceFacet", "cancelListing", args),
    listAsset: (...args: unknown[]) => invokeWrite(context, "MarketplaceFacet", "listAsset", args),
    pause: (...args: unknown[]) => invokeWrite(context, "MarketplaceFacet", "pause", args),
    purchaseAsset: (...args: unknown[]) => invokeWrite(context, "MarketplaceFacet", "purchaseAsset", args),
    unpause: (...args: unknown[]) => invokeWrite(context, "MarketplaceFacet", "unpause", args),
    updateListingPrice: (...args: unknown[]) => invokeWrite(context, "MarketplaceFacet", "updateListingPrice", args),
    },
    events: {
    AssetEscrowed: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "MarketplaceFacet", "AssetEscrowed", fromBlock, toBlock) },
    AssetListed: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "MarketplaceFacet", "AssetListed", fromBlock, toBlock) },
    AssetPurchased: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "MarketplaceFacet", "AssetPurchased", fromBlock, toBlock) },
    ListingCancelled: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "MarketplaceFacet", "ListingCancelled", fromBlock, toBlock) },
    ListingPriceUpdated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "MarketplaceFacet", "ListingPriceUpdated", fromBlock, toBlock) },
    MarketplacePaused: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "MarketplaceFacet", "MarketplacePaused", fromBlock, toBlock) },
    MarketplaceUnpaused: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "MarketplaceFacet", "MarketplaceUnpaused", fromBlock, toBlock) },
    },
  };
}
