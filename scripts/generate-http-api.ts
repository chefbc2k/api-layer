import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildOperationId, loadAbiRegistry, sortObject, toCamelCase, toKebabCase, type ReviewedApiSurfaceFile } from "./api-surface-lib.js";
import { generatedManifestDir, readJson, resetDir } from "./utils.js";

type DomainEntry = {
  methods: Array<Record<string, unknown>>;
  events: Array<Record<string, unknown>>;
};

const apiSrcDir = path.resolve("packages", "api", "src");
const modulesDir = path.join(apiSrcDir, "modules");

function toPascal(value: string): string {
  return value
    .split(/[^A-Za-z0-9]+/u)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function literal(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

function methodSchemaExport(operationId: string): string {
  return `${operationId}RequestSchemas`;
}

function eventSchemaExport(operationId: string): string {
  return `${operationId}RequestSchema`;
}

function buildMappingSource(domainPascal: string, methods: unknown[], events: unknown[]): string {
  return `import type { HttpEventDefinition, HttpMethodDefinition } from "../../../../shared/route-types.js";

export const ${toCamelCase(domainPascal)}MethodDefinitions: HttpMethodDefinition[] = ${literal(methods)} as HttpMethodDefinition[];
export const ${toCamelCase(domainPascal)}EventDefinitions: HttpEventDefinition[] = ${literal(events)} as HttpEventDefinition[];
`;
}

function buildSchemasSource(domainPascal: string, methods: Array<{ operationId: string }>, events: Array<{ operationId: string }>): string {
  const domainCamel = toCamelCase(domainPascal);
  const methodSchemas = methods.map((method) =>
    `export const ${methodSchemaExport(method.operationId)} = buildMethodRequestSchemas(${domainCamel}MethodDefinitions.find((definition) => definition.operationId === "${method.operationId}")!);`,
  ).join("\n");
  const eventSchemas = events.map((event) =>
    `export const ${eventSchemaExport(event.operationId)} = buildEventRequestSchema(${domainCamel}EventDefinitions.find((definition) => definition.operationId === "${event.operationId}")!);`,
  ).join("\n");
  return `import { buildEventRequestSchema, buildMethodRequestSchemas } from "../../../../shared/validation.js";
import { ${domainCamel}EventDefinitions, ${domainCamel}MethodDefinitions } from "./mapping.js";

${methodSchemas}
${eventSchemas}
`;
}

function buildDtoSource(methods: Array<{ operationId: string }>, events: Array<{ operationId: string }>): string {
  const methodTypes = methods.flatMap((method) => {
    const base = toPascal(method.operationId);
    const schema = methodSchemaExport(method.operationId);
    return [
      `export type ${base}Path = import("zod").infer<typeof ${schema}.path>;`,
      `export type ${base}Query = import("zod").infer<typeof ${schema}.query>;`,
      `export type ${base}Body = import("zod").infer<typeof ${schema}.body>;`,
    ];
  });
  const eventTypes = events.flatMap((event) => {
    const base = toPascal(event.operationId);
    const schema = eventSchemaExport(event.operationId);
    return [
      `export type ${base}Body = import("zod").infer<typeof ${schema}.body>;`,
    ];
  });
  return `import {
${methods.map((method) => `  ${methodSchemaExport(method.operationId)},`).join("\n")}
${events.map((event) => `  ${eventSchemaExport(event.operationId)},`).join("\n")}
} from "./schemas.js";

${[...methodTypes, ...eventTypes].join("\n")}
`;
}

function buildServiceSource(domainPascal: string, methods: Array<{ operationId: string }>, events: Array<{ operationId: string }>): string {
  const domainCamel = toCamelCase(domainPascal);
  const methodEntries = methods.map((method) =>
    `    ${method.operationId}: (request) => executeHttpMethodDefinition(context, ${domainCamel}MethodDefinitions.find((definition) => definition.operationId === "${method.operationId}")!, request),`,
  ).join("\n");
  const eventEntries = events.map((event) =>
    `    ${event.operationId}: (request) => executeHttpEventDefinition(context, ${domainCamel}EventDefinitions.find((definition) => definition.operationId === "${event.operationId}")!, request),`,
  ).join("\n");
  return `import type { ApiExecutionContext } from "../../../../shared/execution-context.js";
import { executeHttpEventDefinition, executeHttpMethodDefinition } from "../../../../shared/execution-context.js";
import type { EventInvocationRequest, PrimitiveInvocationRequest } from "../../../../shared/route-types.js";
import { ${domainCamel}EventDefinitions, ${domainCamel}MethodDefinitions } from "./mapping.js";

export function create${domainPascal}PrimitiveService(context: ApiExecutionContext) {
  return {
${methods.map((method) => `    ${method.operationId}: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, ${domainCamel}MethodDefinitions.find((definition) => definition.operationId === "${method.operationId}")!, request),`).join("\n")}
${events.map((event) => `    ${event.operationId}: (request: EventInvocationRequest) => executeHttpEventDefinition(context, ${domainCamel}EventDefinitions.find((definition) => definition.operationId === "${event.operationId}")!, request),`).join("\n")}
  };
}
`;
}

function buildControllerSource(domainPascal: string, methods: Array<{ operationId: string }>, events: Array<{ operationId: string }>): string {
  const domainCamel = toCamelCase(domainPascal);
  const methodEntries = methods.map((method) =>
    `    ${method.operationId}: createMethodRequestHandler(${domainCamel}MethodDefinitions.find((definition) => definition.operationId === "${method.operationId}")!, ${methodSchemaExport(method.operationId)}, service.${method.operationId}),`,
  ).join("\n");
  const eventEntries = events.map((event) =>
    `    ${event.operationId}: createEventRequestHandler(${domainCamel}EventDefinitions.find((definition) => definition.operationId === "${event.operationId}")!, ${eventSchemaExport(event.operationId)}, service.${event.operationId}),`,
  ).join("\n");
  return `import type { ApiExecutionContext } from "../../../../shared/execution-context.js";
import { createEventRequestHandler, createMethodRequestHandler } from "../../../../shared/route-factory.js";
import { create${domainPascal}PrimitiveService } from "./service.js";
import {
${methods.map((method) => `  ${methodSchemaExport(method.operationId)},`).join("\n")}
${events.map((event) => `  ${eventSchemaExport(event.operationId)},`).join("\n")}
} from "./schemas.js";
import { ${domainCamel}EventDefinitions, ${domainCamel}MethodDefinitions } from "./mapping.js";

export function create${domainPascal}PrimitiveController(context: ApiExecutionContext): Record<string, import("express").RequestHandler> {
  const service = create${domainPascal}PrimitiveService(context);
  return {
${methodEntries}
${eventEntries}
  };
}
`;
}

function buildRoutesSource(domainPascal: string, methods: Array<{ operationId: string }>, events: Array<{ operationId: string }>): string {
  const domainCamel = toCamelCase(domainPascal);
  const attachments = [
    ...methods.map((method) => `  registerRoute(router, ${domainCamel}MethodDefinitions.find((definition) => definition.operationId === "${method.operationId}")!, controller["${method.operationId}"]);`),
    ...events.map((event) => `  registerRoute(router, ${domainCamel}EventDefinitions.find((definition) => definition.operationId === "${event.operationId}")!, controller["${event.operationId}"]);`),
  ].join("\n");
  return `import { Router } from "express";

import type { ApiExecutionContext } from "../../../../shared/execution-context.js";
import { registerRoute } from "../../../../shared/route-factory.js";
import { create${domainPascal}PrimitiveController } from "./controller.js";
import { ${domainCamel}EventDefinitions, ${domainCamel}MethodDefinitions } from "./mapping.js";

export function create${domainPascal}PrimitiveRouter(context: ApiExecutionContext): Router {
  const router = Router();
  const controller = create${domainPascal}PrimitiveController(context);
${attachments}
  return router;
}
`;
}

function buildIndexSource(domainPascal: string): string {
  return `export { create${domainPascal}PrimitiveRouter } from "./routes.js";
export { create${domainPascal}PrimitiveController } from "./controller.js";
export { create${domainPascal}PrimitiveService } from "./service.js";
export * from "./dto.js";
export * from "./mapping.js";
`;
}

function buildMarkdown(definitions: Array<{ key: string; domain: string; facetName: string; wrapperKey: string; httpMethod: string; path: string; classification: string }>): string {
  const rows = definitions.map((definition) =>
    `| ${definition.domain} | ${definition.facetName} | \`${definition.wrapperKey}\` | ${definition.classification} | \`${definition.httpMethod}\` | \`${definition.path}\` |`,
  );
  return [
    "# HTTP Endpoint Registry",
    "",
    "| Domain | ABI | Function | Class | Method | Path |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
}

async function main(): Promise<void> {
  const abiRegistry = await loadAbiRegistry();
  const reviewed = await readJson<ReviewedApiSurfaceFile>(path.resolve("reviewed", "reviewed-api-surface.json"));
  const grouped = new Map<string, DomainEntry>();
  const registryMethods: Record<string, unknown> = {};
  const registryEvents: Record<string, unknown> = {};

  for (const [key, surface] of Object.entries(reviewed.methods)) {
    const abiMethod = abiRegistry.methods[key];
    if (!abiMethod) {
      throw new Error(`missing ABI method registry entry for ${key}`);
    }
    const definition = {
      key,
      ...surface,
      ...abiMethod,
    };
    registryMethods[key] = definition;
    const current = grouped.get(surface.domain) ?? { methods: [], events: [] };
    current.methods.push(definition);
    grouped.set(surface.domain, current);
  }

  for (const [key, surface] of Object.entries(reviewed.events)) {
    const abiEvent = abiRegistry.events[key];
    if (!abiEvent) {
      throw new Error(`missing ABI event registry entry for ${key}`);
    }
    const definition = {
      key,
      ...surface,
      ...abiEvent,
    };
    registryEvents[key] = definition;
    const current = grouped.get(surface.domain) ?? { methods: [], events: [] };
    current.events.push(definition);
    grouped.set(surface.domain, current);
  }

  await writeFile(
    path.join(generatedManifestDir, "http-endpoint-registry.json"),
    `${JSON.stringify({
      generatedAt: new Date().toISOString(),
      methods: sortObject(registryMethods),
      events: sortObject(registryEvents),
    }, null, 2)}\n`,
    "utf8",
  );

  await writeFile(
    path.join(generatedManifestDir, "http-endpoint-registry.md"),
    buildMarkdown(
      Object.entries(registryMethods).map(([key, value]) => {
        const method = value as { domain: string; facetName: string; wrapperKey: string; httpMethod: string; path: string; classification: string };
        return {
          key,
          ...method,
        };
      }),
    ),
    "utf8",
  );

  for (const [domain, entry] of grouped) {
    const domainPascal = toPascal(domain);
    const generatedDir = path.join(modulesDir, domain, "primitives", "generated");
    await resetDir(generatedDir);
    await ensureDir(generatedDir);

    const methods = entry.methods
      .map((method) => ({ operationId: String(method.operationId) }))
      .sort((left, right) => left.operationId.localeCompare(right.operationId));
    const events = entry.events
      .map((event) => ({ operationId: String(event.operationId) }))
      .sort((left, right) => left.operationId.localeCompare(right.operationId));

    await writeFile(path.join(generatedDir, "mapping.ts"), buildMappingSource(domainPascal, entry.methods, entry.events), "utf8");
    await writeFile(path.join(generatedDir, "schemas.ts"), buildSchemasSource(domainPascal, methods, events), "utf8");
    await writeFile(path.join(generatedDir, "dto.ts"), buildDtoSource(methods, events), "utf8");
    await writeFile(path.join(generatedDir, "service.ts"), buildServiceSource(domainPascal, methods, events), "utf8");
    await writeFile(path.join(generatedDir, "controller.ts"), buildControllerSource(domainPascal, methods, events), "utf8");
    await writeFile(path.join(generatedDir, "routes.ts"), buildRoutesSource(domainPascal, methods, events), "utf8");
    await writeFile(path.join(generatedDir, "index.ts"), buildIndexSource(domainPascal), "utf8");
  }

  console.log(`generated HTTP API artifacts for ${grouped.size} domains`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
