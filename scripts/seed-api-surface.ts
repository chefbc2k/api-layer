import path from "node:path";

import { buildEventSurface, buildMethodSurface, loadAbiRegistry, sortObject, toCamelCase, toKebabCase, type ApiSurfaceEvent, type ApiSurfaceMethod, type ReviewedApiSurfaceFile } from "./api-surface-lib.js";
import { writeJson } from "./utils.js";

function ensureUniqueOperationIds<T extends ApiSurfaceMethod | ApiSurfaceEvent>(
  entries: Record<string, T>,
  facetNameKey: "facetName",
): Record<string, T> {
  const grouped = new Map<string, string[]>();
  for (const [key, entry] of Object.entries(entries)) {
    const groupKey = `${entry.domain}:${entry.operationId}`;
    const current = grouped.get(groupKey) ?? [];
    current.push(key);
    grouped.set(groupKey, current);
  }

  for (const keys of grouped.values()) {
    if (keys.length <= 1) {
      continue;
    }
    for (const key of keys) {
      const entry = entries[key];
      const facetPrefix = toCamelCase(entry[facetNameKey].replace(/Facet$/u, ""));
      entries[key] = {
        ...entry,
        operationId: `${facetPrefix}${entry.operationId.charAt(0).toUpperCase()}${entry.operationId.slice(1)}`,
      };
    }
  }

  return entries;
}

function ensureUniquePaths(methods: Record<string, ApiSurfaceMethod>): Record<string, ApiSurfaceMethod> {
  const routeGroups = new Map<string, string[]>();
  for (const [key, method] of Object.entries(methods)) {
    const routeKey = `${method.httpMethod} ${method.path}`;
    const entries = routeGroups.get(routeKey) ?? [];
    entries.push(key);
    routeGroups.set(routeKey, entries);
  }

  for (const keys of routeGroups.values()) {
    if (keys.length <= 1) {
      continue;
    }
    for (const key of keys) {
      methods[key] = {
        ...methods[key],
        path: `${methods[key].path}/${toKebabCase(methods[key].operationId)}`,
      };
    }
  }

  const secondPass = new Map<string, string[]>();
  for (const [key, method] of Object.entries(methods)) {
    const routeKey = `${method.httpMethod} ${method.path}`;
    const entries = secondPass.get(routeKey) ?? [];
    entries.push(key);
    secondPass.set(routeKey, entries);
  }

  for (const keys of secondPass.values()) {
    if (keys.length <= 1) {
      continue;
    }
    for (const key of keys) {
      methods[key] = {
        ...methods[key],
        path: `${methods[key].path}/${toKebabCase(methods[key].facetName.replace(/Facet$/u, ""))}`,
      };
    }
  }

  return methods;
}

function ensureUniqueEventPaths(events: Record<string, ApiSurfaceEvent>): Record<string, ApiSurfaceEvent> {
  const routeGroups = new Map<string, string[]>();
  for (const [key, event] of Object.entries(events)) {
    const routeKey = `${event.httpMethod} ${event.path}`;
    const entries = routeGroups.get(routeKey) ?? [];
    entries.push(key);
    routeGroups.set(routeKey, entries);
  }
  for (const keys of routeGroups.values()) {
    if (keys.length <= 1) {
      continue;
    }
    for (const key of keys) {
      events[key] = {
        ...events[key],
        path: `${events[key].path}/${toKebabCase(events[key].facetName.replace(/Facet$/u, ""))}`,
      };
    }
  }
  return events;
}

async function main(): Promise<void> {
  const registry = await loadAbiRegistry();
  const methods = ensureUniquePaths(ensureUniqueOperationIds(Object.fromEntries(
    Object.entries(registry.methods).map(([key, method]) => [key, buildMethodSurface(method)]),
  ), "facetName"));
  const events = ensureUniqueEventPaths(ensureUniqueOperationIds(Object.fromEntries(
    Object.entries(registry.events).map(([key, event]) => [key, buildEventSurface(event)]),
  ), "facetName"));

  const reviewed: ReviewedApiSurfaceFile = {
    version: 1,
    generatedAt: new Date().toISOString(),
    methods: sortObject(methods),
    events: sortObject(events),
  };

  await writeJson(path.resolve("reviewed", "reviewed-api-surface.json"), reviewed);
  console.log(`seeded reviewed API surface with ${Object.keys(methods).length} methods and ${Object.keys(events).length} events`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
