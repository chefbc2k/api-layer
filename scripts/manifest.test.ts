import path from "node:path";

import { describe, expect, it } from "vitest";

import { generatedManifestDir, readJson } from "./utils.js";

describe("generated manifest", () => {
  it("matches the current ABI inventory totals", async () => {
    const manifest = await readJson<{
      totals: {
        facetCount: number;
        functionCount: number;
        eventCount: number;
        subsystemCount: number;
      };
      facets: Array<{
        functions: unknown[];
        events: unknown[];
      }>;
      subsystems: unknown[];
    }>(path.join(generatedManifestDir, "contract-manifest.json"));

    expect(manifest.totals.facetCount).toBe(manifest.facets.length);
    expect(manifest.totals.functionCount).toBe(
      manifest.facets.reduce((total, facet) => total + facet.functions.length, 0),
    );
    expect(manifest.totals.eventCount).toBe(
      manifest.facets.reduce((total, facet) => total + facet.events.length, 0),
    );
    expect(manifest.totals.subsystemCount).toBe(manifest.subsystems.length);
  });
});
