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
      };
    }>(path.join(generatedManifestDir, "contract-manifest.json"));

    expect(manifest.totals.facetCount).toBe(26);
    expect(manifest.totals.functionCount).toBe(430);
    expect(manifest.totals.eventCount).toBe(188);
  });
});
