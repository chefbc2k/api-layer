import path from "node:path";

import { loadAbiRegistry, type ReviewedApiSurfaceFile } from "./api-surface-lib.js";
import { generatedManifestDir, readJson } from "./utils.js";

async function main(): Promise<void> {
  const registry = await loadAbiRegistry();
  const reviewed = await readJson<ReviewedApiSurfaceFile>(path.resolve("reviewed", "reviewed-api-surface.json"));
  const endpointRegistry = await readJson<{ methods: Record<string, { path: string; httpMethod: string; operationId: string }> }>(
    path.join(generatedManifestDir, "http-endpoint-registry.json"),
  );

  const registryKeys = new Set(Object.keys(registry.methods));
  const reviewedKeys = new Set(Object.keys(reviewed.methods));
  const generatedKeys = new Set(Object.keys(endpointRegistry.methods));

  const problems: string[] = [];

  for (const key of registryKeys) {
    if (!reviewedKeys.has(key)) {
      problems.push(`missing reviewed API surface entry ${key}`);
    }
    if (!generatedKeys.has(key)) {
      problems.push(`missing generated HTTP endpoint entry ${key}`);
    }
  }

  for (const key of reviewedKeys) {
    if (!registryKeys.has(key)) {
      problems.push(`stale reviewed API surface entry ${key}`);
    }
  }

  const routeKeys = new Set<string>();
  for (const [key, definition] of Object.entries(endpointRegistry.methods)) {
    const routeKey = `${definition.httpMethod} ${definition.path}`;
    if (routeKeys.has(routeKey)) {
      problems.push(`duplicate HTTP route ${routeKey} via ${key}`);
    }
    routeKeys.add(routeKey);
  }

  if (Object.keys(endpointRegistry.methods).length !== Object.keys(registry.methods).length) {
    problems.push(`expected ${Object.keys(registry.methods).length} generated methods, found ${Object.keys(endpointRegistry.methods).length}`);
  }

  if (problems.length > 0) {
    throw new Error(problems.join("\n"));
  }
  console.log(`validated HTTP coverage for ${Object.keys(registry.methods).length} methods`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
