import path from "node:path";

import { generatedAbiDir, generatedManifestDir, readJson, writeJson } from "./utils.js";

type AbiParameter = {
  name?: string;
  type: string;
  internalType?: string;
  components?: AbiParameter[];
  indexed?: boolean;
};

type AbiEntry = {
  type: string;
  name?: string;
  stateMutability?: string;
  inputs?: AbiParameter[];
  outputs?: AbiParameter[];
  anonymous?: boolean;
};

type Manifest = {
  facets: Array<{
    facetName: string;
    functions: Array<{
      name: string;
      signature: string;
      wrapperKey: string;
      mutability: string;
      category: "read" | "write";
      liveRequired: boolean;
      cacheClass: "none" | "short" | "queryJoin" | "static" | "assetMetadata";
      executionSources: Array<"live" | "cache" | "indexed">;
      gaslessModes: Array<"signature" | "cdpSmartWallet">;
      cacheTtlSeconds: number | null;
    }>;
    events: Array<{
      name: string;
      signature: string;
      wrapperKey: string;
      topicHash: string | null;
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

function canonicalType(input: { type: string; components?: AbiParameter[] }): string {
  if (input.type === "tuple" && input.components) {
    return "(" + input.components.map(canonicalType).join(",") + ")";
  }
  if (input.type === "tuple[]" && input.components) {
    return "(" + input.components.map(canonicalType).join(",") + ")[]";
  }
  return input.type;
}

function signatureFor(entry: AbiEntry): string {
  const inputs = (entry.inputs ?? []).map(canonicalType).join(",");
  return `${entry.name ?? "anonymous"}(${inputs})`;
}

async function main(): Promise<void> {
  const manifest = await readJson<Manifest>(path.join(generatedManifestDir, "contract-manifest.json"));
  const reviewedEventProjection = await readJson<ReviewedEventProjectionFile>(path.resolve("reviewed", "reviewed-event-projections.json"));
  const methodRegistry: Record<string, unknown> = {};
  const eventRegistry: Record<string, unknown> = {};
  const problems: string[] = [];

  for (const facet of manifest.facets) {
    const abi = await readJson<AbiEntry[]>(path.join(generatedAbiDir, "facets", `${facet.facetName}.json`));
    const functionEntries = abi.filter((entry) => entry.type === "function" && entry.name);
    const eventEntries = abi.filter((entry) => entry.type === "event" && entry.name);

    for (const method of facet.functions) {
      const match = functionEntries.find((entry) => {
        const wrapperKey = signatureFor(entry);
        return method.wrapperKey === wrapperKey || (method.wrapperKey === entry.name && method.signature === wrapperKey);
      });
      if (!match) {
        problems.push(`missing ABI entry for method ${facet.facetName}.${method.wrapperKey}`);
        continue;
      }
      methodRegistry[`${facet.facetName}.${method.wrapperKey}`] = {
        facetName: facet.facetName,
        wrapperKey: method.wrapperKey,
        methodName: method.name,
        signature: method.signature,
        category: method.category,
        mutability: method.mutability,
        liveRequired: method.liveRequired,
        cacheClass: method.cacheClass,
        cacheTtlSeconds: method.cacheTtlSeconds,
        executionSources: method.executionSources,
        gaslessModes: method.gaslessModes,
        inputs: match.inputs ?? [],
        outputs: match.outputs ?? [],
      };
    }

    for (const event of facet.events) {
      const match = eventEntries.find((entry) => {
        const wrapperKey = signatureFor(entry);
        return event.wrapperKey === wrapperKey || (event.wrapperKey === entry.name && event.signature === wrapperKey);
      });
      if (!match) {
        problems.push(`missing ABI entry for event ${facet.facetName}.${event.wrapperKey}`);
        continue;
      }
      const eventKey = `${facet.facetName}.${event.wrapperKey}`;
      const projection = reviewedEventProjection.events[eventKey];
      if (!projection) {
        problems.push(`missing reviewed event projection for ${eventKey}`);
      }
      eventRegistry[eventKey] = {
        facetName: facet.facetName,
        wrapperKey: event.wrapperKey,
        eventName: event.name,
        signature: event.signature,
        topicHash: event.topicHash,
        anonymous: Boolean(match.anonymous),
        inputs: match.inputs ?? [],
        projection: projection ?? { domain: "rawOnly", projectionMode: "rawOnly", targets: [] },
      };
    }
  }

  if (problems.length > 0) {
    throw new Error(problems.join("\n"));
  }

  await writeJson(path.join(generatedManifestDir, "abi-method-registry.json"), {
    generatedAt: new Date().toISOString(),
    methods: methodRegistry,
    events: eventRegistry,
  });
  console.log(`generated ABI registry with ${Object.keys(methodRegistry).length} methods and ${Object.keys(eventRegistry).length} events`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
