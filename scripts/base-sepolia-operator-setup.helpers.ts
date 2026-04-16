export type FixtureStatus = "ready" | "partial" | "blocked";

export type FundingCandidate = {
  label: string;
  address: string;
  spendable: bigint;
};

export type ListingReadbackPayload = {
  tokenId?: string;
  seller?: string;
  price?: string;
  createdAt?: string;
  createdBlock?: string;
  lastUpdateBlock?: string;
  expiresAt?: string;
  isActive?: boolean;
};

export type MarketplaceFixtureCandidate = {
  voiceHash: string;
  tokenId: string;
  listingReadback: {
    status: number;
    payload: ListingReadbackPayload | null;
  };
};

export const ONE_DAY = 24n * 60n * 60n;

export function isExpiredListing(
  listing: ListingReadbackPayload | null | undefined,
  latestTimestamp: bigint,
): boolean {
  if (!listing?.expiresAt) {
    return false;
  }
  return BigInt(listing.expiresAt) <= latestTimestamp;
}

export function isPurchaseReadyListing(
  listing: ListingReadbackPayload | null | undefined,
  latestTimestamp: bigint,
): boolean {
  if (!listing?.isActive || !listing.createdAt || isExpiredListing(listing, latestTimestamp)) {
    return false;
  }
  return BigInt(listing.createdAt) + ONE_DAY <= latestTimestamp;
}

export function classifyCandidatePriority(
  candidate: MarketplaceFixtureCandidate,
  latestTimestamp: bigint,
): number {
  const listing = candidate.listingReadback.payload;
  if (isPurchaseReadyListing(listing, latestTimestamp)) {
    return 3;
  }
  if (candidate.listingReadback.status === 200 && listing?.isActive === true && !isExpiredListing(listing, latestTimestamp)) {
    return 2;
  }
  return 1;
}

export function selectPreferredMarketplaceFixtureCandidate(
  candidates: MarketplaceFixtureCandidate[],
  latestTimestamp: bigint,
): MarketplaceFixtureCandidate | null {
  if (candidates.length === 0) {
    return null;
  }
  return [...candidates].sort((left, right) => {
    const priority = classifyCandidatePriority(right, latestTimestamp) - classifyCandidatePriority(left, latestTimestamp);
    if (priority !== 0) {
      return priority;
    }
    const leftCreatedAt = BigInt(left.listingReadback.payload?.createdAt ?? "0");
    const rightCreatedAt = BigInt(right.listingReadback.payload?.createdAt ?? "0");
    if (leftCreatedAt !== rightCreatedAt) {
      return Number(leftCreatedAt - rightCreatedAt);
    }
    return left.tokenId.localeCompare(right.tokenId);
  })[0] ?? null;
}

export function mergeMarketplaceCandidateVoiceHashes(
  sellerOwnedVoiceHashes: string[],
  sellerEscrowedVoiceHashes: string[],
): string[] {
  return [...new Set([...sellerOwnedVoiceHashes, ...sellerEscrowedVoiceHashes])];
}

export function rankFundingCandidates(
  candidates: FundingCandidate[],
  recipient: string,
): FundingCandidate[] {
  const recipientAddress = recipient.toLowerCase();
  return [...candidates]
    .filter((candidate) => candidate.address.toLowerCase() !== recipientAddress && candidate.spendable > 0n)
    .sort((left, right) => {
      if (left.spendable === right.spendable) {
        return left.label.localeCompare(right.label);
      }
      return left.spendable > right.spendable ? -1 : 1;
    });
}
