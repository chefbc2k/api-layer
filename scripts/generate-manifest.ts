import path from "node:path";
import { readdir } from "node:fs/promises";
import { id } from "ethers";

import { generatedAbiDir, generatedManifestDir, pascalToCamel, readJson, resolveDeploymentManifestPath, writeJson } from "./utils.js";

type AbiInput = {
  type: string;
  name?: string;
  stateMutability?: string;
  inputs?: Array<{ name?: string; type: string; indexed?: boolean; components?: AbiInput[] }>;
  anonymous?: boolean;
  components?: AbiInput[];
};

function canonicalType(input: { type: string; components?: AbiInput[] }): string {
  if (input.type === "tuple" && input.components) {
    return "(" + input.components.map(canonicalType).join(",") + ")";
  }
  if (input.type === "tuple[]" && input.components) {
    return "(" + input.components.map(canonicalType).join(",") + ")[]";
  }
  return input.type;
}

type ManifestFunction = {
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
};

type ManifestEvent = {
  name: string;
  signature: string;
  wrapperKey: string;
  topicHash: string | null;
};

type FacetManifest = {
  facetName: string;
  facetKey: string;
  abiPath: string;
  functions: ManifestFunction[];
  events: ManifestEvent[];
};

type ReviewedMethodPolicy = {
  category: "read" | "write";
  liveRequired: boolean;
  cacheClass: "none" | "short" | "queryJoin" | "static" | "assetMetadata";
  executionSources: Array<"live" | "cache" | "indexed">;
  gaslessModes: Array<"signature" | "cdpSmartWallet">;
};

type ReviewedMethodPolicyFile = {
  version: number;
  methods: Record<string, ReviewedMethodPolicy>;
};

type DeploymentManifest = {
  selectorToFacet: Array<{
    selector: string;
    facetName: string;
  }>;
};

const reviewedMethodPolicyPath = path.resolve("reviewed", "reviewed-method-policy.json");

function signatureFor(entry: AbiInput): string {
  const inputs = (entry.inputs ?? []).map(canonicalType).join(",");
  return `${entry.name ?? "anonymous"}(${inputs})`;
}

function isRead(entry: AbiInput): boolean {
  return entry.type === "function" && (entry.stateMutability === "view" || entry.stateMutability === "pure");
}

function selectorFor(entry: AbiInput): string {
  return id(signatureFor(entry)).slice(0, 10).toLowerCase();
}

function cacheTtlSeconds(cacheClass: ReviewedMethodPolicy["cacheClass"]): number | null {
  switch (cacheClass) {
    case "none":
      return null;
    case "short":
      return 5;
    case "queryJoin":
      return 30;
    case "static":
      return 600;
    case "assetMetadata":
      return 3600;
  }
}

async function main(): Promise<void> {
  const facetsDir = path.join(generatedAbiDir, "facets");
  const subsystemsDir = path.join(generatedAbiDir, "subsystems");
  const facetFiles = (await readdir(facetsDir)).filter((name) => name.endsWith(".json")).sort();
  const subsystemFiles = (await readdir(subsystemsDir)).filter((name) => name.endsWith(".json")).sort();
  const reviewedMethodPolicy = await readJson<ReviewedMethodPolicyFile>(reviewedMethodPolicyPath);
  const deploymentManifestPath = await resolveDeploymentManifestPath();
  const deploymentManifest = deploymentManifestPath
    ? await readJson<DeploymentManifest>(deploymentManifestPath)
    : null;
  const mountedSelectorsByFacet = new Map<string, Set<string>>();
  for (const entry of deploymentManifest?.selectorToFacet ?? []) {
    const selectors = mountedSelectorsByFacet.get(entry.facetName) ?? new Set<string>();
    selectors.add(entry.selector.toLowerCase());
    mountedSelectorsByFacet.set(entry.facetName, selectors);
  }

  const facets: FacetManifest[] = [];
  let totalFunctions = 0;
  let totalEvents = 0;
  const policyProblems: string[] = [];

  for (const fileName of facetFiles) {
    const abi = await readJson<AbiInput[]>(path.join(facetsDir, fileName));
    const facetName = fileName.replace(/\.json$/u, "");
    const mountedSelectors = mountedSelectorsByFacet.get(facetName) ?? null;
    const functionEntries = abi.filter((entry) =>
      entry.type === "function" &&
      entry.name &&
      (mountedSelectors === null || mountedSelectors.has(selectorFor(entry))),
    );
    const eventEntries = abi.filter((entry) => entry.type === "event" && entry.name);
    const functionNameCounts = new Map<string, number>();
    const eventNameCounts = new Map<string, number>();

    for (const entry of functionEntries) {
      functionNameCounts.set(entry.name ?? "", (functionNameCounts.get(entry.name ?? "") ?? 0) + 1);
    }
    for (const entry of eventEntries) {
      eventNameCounts.set(entry.name ?? "", (eventNameCounts.get(entry.name ?? "") ?? 0) + 1);
    }

    const functions = functionEntries
      .map<ManifestFunction>((entry) => {
        const signature = signatureFor(entry);
        const wrapperKey = (functionNameCounts.get(entry.name ?? "") ?? 0) > 1 ? signature : (entry.name ?? "");
        const policyKey = `${facetName}.${wrapperKey}`;
        const reviewedPolicy = reviewedMethodPolicy.methods[policyKey];
        if (!reviewedPolicy) {
          policyProblems.push(`missing reviewed method policy for ${policyKey}`);
        }
        const abiCategory = isRead(entry) ? "read" : "write";
        if (reviewedPolicy && reviewedPolicy.category !== abiCategory) {
          policyProblems.push(`category mismatch for ${policyKey}: abi=${abiCategory} reviewed=${reviewedPolicy.category}`);
        }
        return {
          name: entry.name ?? "",
          signature,
          wrapperKey,
          mutability: entry.stateMutability ?? "nonpayable",
          category: reviewedPolicy?.category ?? abiCategory,
          liveRequired: reviewedPolicy?.liveRequired ?? false,
          cacheClass: reviewedPolicy?.cacheClass ?? "none",
          executionSources: reviewedPolicy?.executionSources ?? ["live"],
          gaslessModes: reviewedPolicy?.gaslessModes ?? [],
          cacheTtlSeconds: cacheTtlSeconds(reviewedPolicy?.cacheClass ?? "none"),
        };
      });
    const events = eventEntries
      .map<ManifestEvent>((entry) => ({
        name: entry.name ?? "",
        signature: signatureFor(entry),
        wrapperKey: (eventNameCounts.get(entry.name ?? "") ?? 0) > 1 ? signatureFor(entry) : (entry.name ?? ""),
        topicHash: null,
      }));

    totalFunctions += functions.length;
    totalEvents += events.length;

    facets.push({
      facetName,
      facetKey: pascalToCamel(facetName.replace(/Facet$/u, "")),
      abiPath: `generated/abis/facets/${fileName}`,
      functions,
      events,
    });
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    totals: {
      facetCount: facets.length,
      functionCount: totalFunctions,
      eventCount: totalEvents,
      subsystemCount: subsystemFiles.length,
    },
    facets,
    subsystems: subsystemFiles.map((fileName) => ({
      name: fileName.replace(/\.json$/u, ""),
      abiPath: `generated/abis/subsystems/${fileName}`,
    })),
  };

  const reviewedMethodKeys = new Set(Object.keys(reviewedMethodPolicy.methods));
  const manifestMethodKeys = new Set(
    facets.flatMap((facet) => facet.functions.map((method) => `${facet.facetName}.${method.wrapperKey}`)),
  );
  for (const reviewedKey of reviewedMethodKeys) {
    if (!manifestMethodKeys.has(reviewedKey)) {
      policyProblems.push(`stale reviewed method policy entry ${reviewedKey}`);
    }
  }
  if (policyProblems.length > 0) {
    throw new Error(policyProblems.join("\n"));
  }

  await writeJson(path.join(generatedManifestDir, "contract-manifest.json"), manifest);
  if (deploymentManifestPath) {
    console.log(`filtered manifest functions against ${deploymentManifestPath}`);
  }
  console.log(`generated manifest with ${totalFunctions} functions and ${totalEvents} events`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
