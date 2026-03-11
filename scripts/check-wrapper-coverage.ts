import path from "node:path";

import { generatedManifestDir, readJson } from "./utils.js";

type Manifest = {
  totals: { functionCount: number; eventCount: number };
  facets: Array<{
    facetName: string;
    functions: Array<{ wrapperKey: string; category: "read" | "write" }>;
    events: Array<{ wrapperKey: string }>;
  }>;
};

type WrapperCoverage = {
  facets: Record<string, { read: string[]; write: string[]; events: string[] }>;
};

type RpcRegistry = {
  methods: Record<string, unknown>;
  events: Record<string, unknown>;
};

function diff(expected: string[], actual: string[]): { missing: string[]; extra: string[] } {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  return {
    missing: expected.filter((value) => !actualSet.has(value)),
    extra: actual.filter((value) => !expectedSet.has(value)),
  };
}

async function main(): Promise<void> {
  const manifest = await readJson<Manifest>(path.join(generatedManifestDir, "contract-manifest.json"));
  const coverage = await readJson<WrapperCoverage>(path.join(generatedManifestDir, "wrapper-coverage.json"));
  const rpcRegistry = await readJson<RpcRegistry>(path.join(generatedManifestDir, "rpc-method-registry.json"));
  const problems: string[] = [];
  const expectedMethodKeys: string[] = [];
  const expectedEventKeys: string[] = [];

  for (const facet of manifest.facets) {
    const facetCoverage = coverage.facets[facet.facetName];
    if (!facetCoverage) {
      problems.push(`${facet.facetName}: missing generated coverage entry`);
      continue;
    }

    const expectedReads = [...new Set(facet.functions.filter((item) => item.category === "read").map((item) => item.wrapperKey))];
    const expectedWrites = [...new Set(facet.functions.filter((item) => item.category === "write").map((item) => item.wrapperKey))];
    const expectedEvents = [...new Set(facet.events.map((item) => item.wrapperKey))];
    expectedMethodKeys.push(...facet.functions.map((item) => `${facet.facetName}.${item.wrapperKey}`));
    expectedEventKeys.push(...facet.events.map((item) => `${facet.facetName}.${item.wrapperKey}`));

    for (const [label, expected, actual] of [
      ["read", expectedReads, facetCoverage.read],
      ["write", expectedWrites, facetCoverage.write],
      ["events", expectedEvents, facetCoverage.events],
    ] as const) {
      const mismatch = diff(expected, actual);
      if (mismatch.missing.length || mismatch.extra.length) {
        problems.push(
          `${facet.facetName}.${label}: missing=[${mismatch.missing.join(", ")}] extra=[${mismatch.extra.join(", ")}]`,
        );
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(`wrapper coverage mismatch:\n${problems.join("\n")}`);
  }

  const methodCoverage = diff(
    [...new Set(expectedMethodKeys)].sort(),
    Object.keys(rpcRegistry.methods).sort(),
  );
  const eventCoverage = diff(
    [...new Set(expectedEventKeys)].sort(),
    Object.keys(rpcRegistry.events).sort(),
  );
  if (methodCoverage.missing.length || methodCoverage.extra.length || eventCoverage.missing.length || eventCoverage.extra.length) {
    throw new Error(
      [
        "generated RPC registry mismatch:",
        `methods missing=[${methodCoverage.missing.join(", ")}] extra=[${methodCoverage.extra.join(", ")}]`,
        `events missing=[${eventCoverage.missing.join(", ")}] extra=[${eventCoverage.extra.join(", ")}]`,
      ].join("\n"),
    );
  }

  console.log(
    `wrapper coverage OK: ${manifest.totals.functionCount} functions, ${manifest.totals.eventCount} events`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
