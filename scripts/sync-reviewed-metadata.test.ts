import { describe, expect, it } from "vitest";

import { mergeManagedProjectionDefaults } from "./sync-reviewed-event-projections.js";
import { mergeProjectionOnlyInvariant } from "./sync-reviewed-write-invariants.js";
import type { WriteInvariant } from "./write-invariants-lib.js";

const currentInvariant = {
  requiredActor: { kind: "role", roles: ["REVIEWED_ROLE"], description: "reviewed actor" },
  indexerExpectations: { mode: "raw-event-only", events: [], projections: [], assertion: "stale" },
} as WriteInvariant;

const derivedInvariant = {
  requiredActor: { kind: "role", roles: ["DERIVED_ROLE"], description: "derived actor" },
  indexerExpectations: {
    mode: "required",
    events: ["CommunityRewardsFacet.Claimed"],
    projections: ["reward_claims:ledger"],
    assertion: "refreshed",
  },
} as WriteInvariant;

describe("reviewed metadata synchronization", () => {
  it("replaces stale managed reward projections without touching unrelated events", () => {
    const unrelated = { domain: "marketplace", projectionMode: "rawOnly" as const, targets: [] };
    const merged = mergeManagedProjectionDefaults({
      "MarketplaceFacet.ListingCreated": unrelated,
      "CommunityRewardsFacet.Claimed": { domain: "tokenomics", projectionMode: "rawOnly", targets: [] },
    });

    expect(merged["MarketplaceFacet.ListingCreated"]).toBe(unrelated);
    expect(merged["CommunityRewardsFacet.Claimed"]).toEqual({
      domain: "tokenomics",
      projectionMode: "ledger",
      targets: [{ table: "reward_claims", mode: "ledger" }],
    });
  });

  it("refreshes only indexer expectations for managed reward writes", () => {
    const merged = mergeProjectionOnlyInvariant("CommunityRewardsFacet.claim", currentInvariant, derivedInvariant);

    expect(merged.requiredActor).toBe(currentInvariant.requiredActor);
    expect(merged.indexerExpectations).toBe(derivedInvariant.indexerExpectations);
  });

  it("preserves unrelated reviewed writes and derives missing managed writes", () => {
    expect(mergeProjectionOnlyInvariant("MarketplaceFacet.purchaseAsset", currentInvariant, derivedInvariant))
      .toBe(currentInvariant);
    expect(mergeProjectionOnlyInvariant("CommunityRewardsFacet.claim", undefined, derivedInvariant))
      .toBe(derivedInvariant);
  });
});
