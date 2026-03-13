import type { RouteResult } from "../shared/route-types.js";
import { asRecord, normalizeAddress, readWorkflowReceipt, waitForWorkflowEventQuery, waitForWorkflowReadback } from "./reward-campaign-helpers.js";

export { asRecord, normalizeAddress, readWorkflowReceipt, waitForWorkflowEventQuery, waitForWorkflowReadback };

export async function readListingWithStabilization(
  marketplace: {
    getListing: (request: unknown) => Promise<RouteResult>;
  },
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  tokenId: string,
) {
  let lastRead: RouteResult | null = null;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    lastRead = await marketplace.getListing({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [tokenId],
    });
    const listing = asRecord(lastRead.body);
    if (listing?.tokenId === tokenId || typeof listing?.isActive === "boolean") {
      return lastRead;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return lastRead;
}

export async function safeReadRoute(read: () => Promise<RouteResult>): Promise<RouteResult | null> {
  try {
    return await read();
  } catch {
    return null;
  }
}

export async function readMarketplaceEscrowState(
  marketplace: {
    getAssetState: (request: unknown) => Promise<RouteResult>;
    getOriginalOwner: (request: unknown) => Promise<RouteResult>;
    isInEscrow: (request: unknown) => Promise<RouteResult>;
  },
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  tokenId: string,
) {
  const [assetState, originalOwner, inEscrow] = await Promise.all([
    safeReadRoute(() => marketplace.getAssetState({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [tokenId],
    })),
    safeReadRoute(() => marketplace.getOriginalOwner({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [tokenId],
    })),
    safeReadRoute(() => marketplace.isInEscrow({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [tokenId],
    })),
  ]);

  return {
    assetState: assetState?.body ?? null,
    originalOwner: originalOwner?.body ?? null,
    inEscrow: inEscrow?.body ?? null,
  };
}

export async function readOwnerOf(
  voiceAssets: {
    ownerOf: (request: unknown) => Promise<RouteResult>;
  },
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  tokenId: string,
) {
  const read = await voiceAssets.ownerOf({
    auth,
    api: { executionSource: "live", gaslessMode: "none" },
    walletAddress,
    wireParams: [tokenId],
  });
  return read;
}
