import { describe, expect, it } from "vitest";

import { getMethodMetadata } from "./method-policy.js";

describe("getMethodMetadata", () => {
  it("loads exact metadata from the generated manifest", () => {
    expect(getMethodMetadata("StakingFacet.claimRewards")).toMatchObject({
      category: "write",
      liveRequired: true,
      facetName: "StakingFacet",
    });

    expect(getMethodMetadata("AccessControlFacet.getRoleAdmin")).toMatchObject({
      category: "read",
      liveRequired: false,
      cacheTtlSeconds: 600,
    });
  });
});
