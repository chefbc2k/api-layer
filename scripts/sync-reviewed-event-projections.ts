import path from "node:path";

import { domainByFacet } from "./api-surface-lib.js";
import { readJson, writeJson } from "./utils.js";

type Manifest = {
  facets: Array<{
    facetName: string;
    events: Array<{
      name: string;
      signature: string;
      wrapperKey: string;
    }>;
  }>;
};

type ReviewedEventProjectionFile = {
  version: number;
  events: Record<
    string,
    {
      domain: string;
      projectionMode: "rawOnly" | "ledger" | "current" | "mixed";
      targets: Array<{ table: string; mode: "ledger" | "current" }>;
    }
  >;
};

const reviewedEventProjectionPath = path.resolve("reviewed", "reviewed-event-projections.json");

async function main(): Promise<void> {
  const manifest = await readJson<Manifest>(path.join("generated", "manifests", "contract-manifest.json"));
  const existing = await readJson<ReviewedEventProjectionFile>(reviewedEventProjectionPath);

  const next: ReviewedEventProjectionFile = {
    version: 1,
    events: { ...existing.events },
  };

  let added = 0;
  for (const facet of manifest.facets) {
    const domain = domainByFacet[facet.facetName];
    if (!domain) {
      throw new Error(`missing domain mapping for ${facet.facetName}`);
    }
    for (const event of facet.events) {
      const key = `${facet.facetName}.${event.wrapperKey}`;
      if (next.events[key]) {
        continue;
      }
      next.events[key] = {
        domain,
        projectionMode: "rawOnly",
        targets: [],
      };
      added += 1;
    }
  }

  const sorted = Object.fromEntries(Object.entries(next.events).sort(([left], [right]) => left.localeCompare(right)));
  await writeJson(reviewedEventProjectionPath, {
    version: next.version,
    events: sorted,
  });

  console.log(`synced reviewed event projections (added ${added})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
