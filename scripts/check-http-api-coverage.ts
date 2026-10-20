import path from "node:path";

import { loadAbiRegistry, type ReviewedApiSurfaceFile } from "./api-surface-lib.js";
import { generatedManifestDir, readJson } from "./utils.js";

type EndpointDefinition = {
  path: string;
  httpMethod: string;
  operationId: string;
};

type EndpointRegistry = {
  methods: Record<string, EndpointDefinition>;
  events: Record<string, EndpointDefinition>;
};

function validateSection(
  kind: "method" | "event",
  registryEntries: Record<string, unknown>,
  reviewedEntries: Record<string, unknown>,
  generatedEntries: Record<string, EndpointDefinition>,
  problems: string[],
): void {
  const registryKeys = new Set(Object.keys(registryEntries));
  const reviewedKeys = new Set(Object.keys(reviewedEntries));
  const generatedKeys = new Set(Object.keys(generatedEntries));

  for (const key of registryKeys) {
    if (!reviewedKeys.has(key)) {
      problems.push(`missing reviewed API surface ${kind} entry ${key}`);
    }
    if (!generatedKeys.has(key)) {
      problems.push(`missing generated HTTP endpoint ${kind} entry ${key}`);
    }
  }

  for (const key of reviewedKeys) {
    if (!registryKeys.has(key)) {
      problems.push(`stale reviewed API surface ${kind} entry ${key}`);
    }
  }

  for (const key of generatedKeys) {
    if (!registryKeys.has(key)) {
      problems.push(`stale generated HTTP endpoint ${kind} entry ${key}`);
    }
  }

  if (generatedKeys.size !== registryKeys.size) {
    problems.push(`expected ${registryKeys.size} generated ${kind}s, found ${generatedKeys.size}`);
  }
}

async function main(): Promise<void> {
  const registry = await loadAbiRegistry();
  const reviewed = await readJson<ReviewedApiSurfaceFile>(path.resolve("reviewed", "reviewed-api-surface.json"));
  const endpointRegistry = await readJson<EndpointRegistry>(
    path.join(generatedManifestDir, "http-endpoint-registry.json"),
  );

  const problems: string[] = [];

  validateSection("method", registry.methods, reviewed.methods, endpointRegistry.methods, problems);
  validateSection("event", registry.events, reviewed.events, endpointRegistry.events, problems);

  const routeKeys = new Set<string>();
  for (const [kind, entries] of [
    ["method", endpointRegistry.methods],
    ["event", endpointRegistry.events],
  ] as const) {
    for (const [key, definition] of Object.entries(entries)) {
      const routeKey = `${definition.httpMethod.toUpperCase()} ${definition.path}`;
      if (routeKeys.has(routeKey)) {
        problems.push(`duplicate HTTP route ${routeKey} via ${kind} ${key}`);
      }
      routeKeys.add(routeKey);
    }
  }

  if (problems.length > 0) {
    throw new Error(problems.join("\n"));
  }
  console.log(
    `validated HTTP coverage for ${Object.keys(registry.methods).length} methods and ${Object.keys(registry.events).length} events across ${routeKeys.size} unique routes`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
