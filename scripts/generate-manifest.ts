import path from "node:path";
import { readdir } from "node:fs/promises";

import { generatedAbiDir, generatedManifestDir, pascalToCamel, readJson, writeJson } from "./utils.js";

type AbiInput = {
  type: string;
  name?: string;
  stateMutability?: string;
  inputs?: Array<{ name?: string; type: string; indexed?: boolean }>;
  anonymous?: boolean;
};

type ManifestFunction = {
  name: string;
  signature: string;
  wrapperKey: string;
  mutability: string;
  category: "read" | "write";
  liveRequired: boolean;
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

const LIVE_REQUIRED_PATTERNS = [
  /approve/i,
  /allowance/i,
  /balance/i,
  /withdraw/i,
  /claim/i,
  /reward/i,
  /stake/i,
  /unstake/i,
  /buyback/i,
  /fee/i,
  /treasury/i,
  /payout/i,
];

function signatureFor(entry: AbiInput): string {
  const inputs = (entry.inputs ?? []).map((input) => input.type).join(",");
  return `${entry.name ?? "anonymous"}(${inputs})`;
}

function isRead(entry: AbiInput): boolean {
  return entry.type === "function" && (entry.stateMutability === "view" || entry.stateMutability === "pure");
}

function isLiveRequired(name: string): boolean {
  return LIVE_REQUIRED_PATTERNS.some((pattern) => pattern.test(name));
}

function cacheTtlSeconds(entry: AbiInput, liveRequired: boolean): number | null {
  if (!isRead(entry)) {
    return null;
  }
  if (liveRequired) {
    return null;
  }
  const name = entry.name ?? "";
  if (/getListing|getLicense|getProposal|getOperation|getStake|getRewards/i.test(name)) {
    return 30;
  }
  if (/name|symbol|decimals|getSelectors|getRole|getMinDelay|getVotingConfig/i.test(name)) {
    return 600;
  }
  if (/getGeographicData|getVoiceClassifications|getBasicAcousticFeatures/i.test(name)) {
    return 3600;
  }
  return 5;
}

async function main(): Promise<void> {
  const facetsDir = path.join(generatedAbiDir, "facets");
  const subsystemsDir = path.join(generatedAbiDir, "subsystems");
  const facetFiles = (await readdir(facetsDir)).filter((name) => name.endsWith(".json")).sort();
  const subsystemFiles = (await readdir(subsystemsDir)).filter((name) => name.endsWith(".json")).sort();

  const facets: FacetManifest[] = [];
  let totalFunctions = 0;
  let totalEvents = 0;

  for (const fileName of facetFiles) {
    const abi = await readJson<AbiInput[]>(path.join(facetsDir, fileName));
    const facetName = fileName.replace(/\.json$/u, "");
    const functionEntries = abi.filter((entry) => entry.type === "function" && entry.name);
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
        const liveRequired = isLiveRequired(entry.name ?? "");
        const category = isRead(entry) ? "read" : "write";
        const signature = signatureFor(entry);
        return {
          name: entry.name ?? "",
          signature,
          wrapperKey: (functionNameCounts.get(entry.name ?? "") ?? 0) > 1 ? signature : (entry.name ?? ""),
          mutability: entry.stateMutability ?? "nonpayable",
          category,
          liveRequired,
          cacheTtlSeconds: cacheTtlSeconds(entry, liveRequired),
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

  await writeJson(path.join(generatedManifestDir, "contract-manifest.json"), manifest);
  console.log(`generated manifest with ${totalFunctions} functions and ${totalEvents} events`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
