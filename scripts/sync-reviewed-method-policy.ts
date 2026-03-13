import path from "node:path";
import { readdir } from "node:fs/promises";

import { id } from "ethers";

import { generatedAbiDir, readJson, resolveDeploymentManifestPath, writeJson } from "./utils.js";

type AbiInput = {
  type: string;
  name?: string;
  stateMutability?: string;
  inputs?: Array<{ type: string; components?: AbiInput[] }>;
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

function selectorFor(entry: AbiInput): string {
  return id(signatureFor(entry)).slice(0, 10).toLowerCase();
}

function isRead(entry: AbiInput): boolean {
  return entry.type === "function" && (entry.stateMutability === "view" || entry.stateMutability === "pure");
}

function defaultPolicy(entry: AbiInput): ReviewedMethodPolicy {
  return {
    category: isRead(entry) ? "read" : "write",
    liveRequired: false,
    cacheClass: "none",
    executionSources: ["live"],
    gaslessModes: [],
  };
}

async function main(): Promise<void> {
  const existing = await readJson<ReviewedMethodPolicyFile>(reviewedMethodPolicyPath);
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

  const facetsDir = path.join(generatedAbiDir, "facets");
  const facetFiles = (await readdir(facetsDir)).filter((name) => name.endsWith(".json")).sort();
  const nextMethods: Record<string, ReviewedMethodPolicy> = {};

  for (const fileName of facetFiles) {
    const facetName = fileName.replace(/\.json$/u, "");
    const abi = await readJson<AbiInput[]>(path.join(facetsDir, fileName));
    const mountedSelectors = mountedSelectorsByFacet.get(facetName) ?? null;
    const functionEntries = abi
      .filter((entry) =>
        entry.type === "function" &&
        entry.name &&
        (mountedSelectors === null || mountedSelectors.has(selectorFor(entry))),
      );

    const functionNameCounts = new Map<string, number>();
    for (const entry of functionEntries) {
      functionNameCounts.set(entry.name ?? "", (functionNameCounts.get(entry.name ?? "") ?? 0) + 1);
    }

    for (const entry of functionEntries) {
      const signature = signatureFor(entry);
      const wrapperKey = (functionNameCounts.get(entry.name ?? "") ?? 0) > 1 ? signature : (entry.name ?? "");
      const key = `${facetName}.${wrapperKey}`;
      nextMethods[key] = existing.methods[key] ?? defaultPolicy(entry);
    }
  }

  await writeJson(reviewedMethodPolicyPath, {
    version: 1,
    methods: Object.fromEntries(Object.entries(nextMethods).sort(([left], [right]) => left.localeCompare(right))),
  });

  console.log(
    `synced reviewed method policy for ${Object.keys(nextMethods).length} mounted methods` +
      (deploymentManifestPath ? ` using ${deploymentManifestPath}` : ""),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
