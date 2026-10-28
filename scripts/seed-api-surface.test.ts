import { describe, expect, it } from "vitest";

import { buildReviewedApiSurface } from "./seed-api-surface.js";

describe("reviewed API surface seeding", () => {
  it("keeps the intentionally unmounted legacy proposal overload out of the HTTP surface", async () => {
    const surface = await buildReviewedApiSurface();

    expect(surface.methods).not.toHaveProperty(
      "ProposalFacet.propose(string,string,address[],uint256[],bytes[],uint8)",
    );
  });
});
