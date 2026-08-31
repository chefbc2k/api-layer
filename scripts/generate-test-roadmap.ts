import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { ensureDir, rootDir } from "./utils.js";

export const GAP_CLASSIFICATIONS = [
  "ready",
  "needs fixture",
  "unsafe on live network",
  "needs contract change",
  "needs API guard",
  "needs indexer proof",
] as const;

type GapClassification = (typeof GAP_CLASSIFICATIONS)[number];
type Network = "local-fork" | "base-sepolia";

type ManifestMethod = {
  name: string;
  signature: string;
  wrapperKey: string;
  mutability: string;
  category: "read" | "write";
};

type ManifestEvent = {
  name: string;
  signature: string;
  wrapperKey: string;
};

type ContractManifest = {
  totals: {
    facetCount: number;
    functionCount: number;
    eventCount: number;
  };
  facets: Array<{
    facetName: string;
    facetKey: string;
    functions: ManifestMethod[];
    events: ManifestEvent[];
  }>;
};

type Endpoint = {
  httpMethod?: string;
  path?: string;
  operationId?: string;
  classification?: string;
};

type Registry = {
  methods: Record<string, Endpoint>;
  events: Record<string, Endpoint>;
};

type ReviewedApiSurface = {
  methods: Record<string, Endpoint>;
  events: Record<string, Endpoint>;
};

type VerifyDomain = {
  routes?: string[];
  classification?: string;
  finalClassification?: string;
  evidence?: unknown[];
  [key: string]: unknown;
};

type VerifyArtifact = {
  path: string;
  reports: Record<string, VerifyDomain>;
};

type TestSource = {
  path: string;
  content: string;
};

type VerifyEvidence = {
  artifact: string;
  domain: string;
  route: string;
  network: Network;
};

type ProofFlags = {
  abiManifest: boolean;
  rpcRegistry: boolean;
  httpRegistry: boolean;
  reviewedApiSurface: boolean;
  unit: boolean;
  workflow: boolean;
  localFork: boolean;
  baseSepolia: boolean;
  negativePath: boolean;
  economic: boolean;
  redTeam: boolean;
  indexer: boolean;
};

type ItemEvidence = {
  tests: string[];
  workflowTests: string[];
  negativePathTests: string[];
  economicTests: string[];
  redTeamTests: string[];
  indexerTests: string[];
  verifyArtifacts: VerifyEvidence[];
};

export type GapItem = {
  id: string;
  key: string;
  kind: "function" | "event";
  facetName: string;
  name: string;
  wrapperKey: string;
  signature: string;
  category: "read" | "write" | "event";
  mutability: string | null;
  endpoint: { method: string; path: string } | null;
  apiExclusion: string | null;
  proof: ProofFlags;
  proofDepth: {
    level: "inventory" | "unit" | "workflow" | "live" | "adversarial" | "indexer";
    score: number;
    maximumScore: number;
  };
  classification: GapClassification;
  gaps: string[];
  evidence: ItemEvidence;
};

export type GapFacet = {
  facetName: string;
  facetKey: string;
  summary: {
    functionCount: number;
    eventCount: number;
    classification: GapClassification;
    classificationCounts: Record<GapClassification, number>;
    proofDepth: {
      minimumLevel: GapItem["proofDepth"]["level"];
      maximumLevel: GapItem["proofDepth"]["level"];
      averageScore: number;
      maximumScore: number;
    };
  };
  functions: GapItem[];
  events: GapItem[];
};

export type GapReport = {
  schemaVersion: 1;
  generatedAt: string;
  methodology: {
    testAttribution: string;
    liveAttribution: string;
    classificationPolicy: string;
  };
  inputs: {
    contractManifest: string;
    httpEndpointRegistry: string;
    rpcMethodRegistry: string;
    reviewedApiSurface: string;
    testFiles: string[];
    verifyArtifacts: string[];
  };
  totals: {
    facetCount: number;
    functionCount: number;
    eventCount: number;
    itemCount: number;
    proofCounts: Record<keyof ProofFlags, number>;
    classificationCounts: Record<GapClassification, number>;
  };
  facets: GapFacet[];
};

type BuildGapReportInput = {
  manifest: ContractManifest;
  httpRegistry: Registry;
  rpcRegistry: Registry;
  reviewedApiSurface: ReviewedApiSurface;
  tests: TestSource[];
  verifyArtifacts: VerifyArtifact[];
  generatedAt: string;
};

const inputPaths = {
  contractManifest: "generated/manifests/contract-manifest.json",
  httpEndpointRegistry: "generated/manifests/http-endpoint-registry.json",
  rpcMethodRegistry: "generated/manifests/rpc-method-registry.json",
  reviewedApiSurface: "reviewed/reviewed-api-surface.json",
} as const;

const apiExclusions: Record<string, string> = {
  "ProposalFacet.propose(string,string,address[],uint256[],bytes[],uint8)":
    "legacy overloaded proposal variant is intentionally excluded from the HTTP surface",
};

const negativeKeywords = [
  "reject", "revert", "unauthorized", "forbidden", "invalid", "mismatch", "failure", "fails", "error",
];
const economicKeywords = [
  "balance", "allowance", "settlement", "revenue", "payment", "treasury", "delta", "conservation", "price",
];
const redTeamKeywords = ["red-team", "red team", "fuzz", "mutation", "adversarial", "confused deputy", "replay"];

function emptyClassificationCounts(): Record<GapClassification, number> {
  return Object.fromEntries(GAP_CLASSIFICATIONS.map((classification) => [classification, 0])) as Record<GapClassification, number>;
}

const proofLevelOrder: Array<GapItem["proofDepth"]["level"]> = [
  "inventory", "unit", "workflow", "live", "adversarial", "indexer",
];

const classificationSeverity: GapClassification[] = [
  "needs contract change", "needs API guard", "needs indexer proof", "unsafe on live network", "needs fixture", "ready",
];

function relativePath(baseDir: string, filePath: string): string {
  return path.relative(baseDir, filePath).split(path.sep).join("/");
}

async function findFiles(dir: string, predicate: (name: string) => boolean): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findFiles(entryPath, predicate));
    } else if (entry.isFile() && predicate(entry.name)) {
      files.push(entryPath);
    }
  }
  return files.sort();
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function endpointRoute(endpoint: Endpoint | undefined): string | null {
  return endpoint?.httpMethod && endpoint.path ? `${endpoint.httpMethod.toUpperCase()} ${endpoint.path}` : null;
}

function itemTokens(key: string, name: string, wrapperKey: string, signature: string, endpoint: Endpoint | undefined): string[] {
  return [...new Set([key, name, wrapperKey, signature, endpoint?.operationId, endpoint?.path].filter((value): value is string => Boolean(value)))];
}

function tokenIndexes(content: string, token: string): number[] {
  const indexes: number[] = [];
  const requiresIdentifierBoundary = /^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(token);
  let index = content.indexOf(token);
  while (index >= 0) {
    const before = content[index - 1];
    const after = content[index + token.length];
    const hasIdentifierBoundary = !requiresIdentifierBoundary
      || (!before?.match(/[A-Za-z0-9_$]/u) && !after?.match(/[A-Za-z0-9_$]/u));
    if (hasIdentifierBoundary) indexes.push(index);
    index = content.indexOf(token, index + token.length);
  }
  return indexes;
}

function matchingTests(tests: TestSource[], tokens: string[]): TestSource[] {
  return tests.filter((test) => tokens.some((token) => tokenIndexes(test.content, token).length > 0));
}

function hasKeywordNearToken(content: string, tokens: string[], keywords: string[]): boolean {
  const lower = content.toLowerCase();
  for (const token of tokens) {
    for (const index of tokenIndexes(content, token)) {
      const window = lower.slice(Math.max(0, index - 1_000), Math.min(lower.length, index + token.length + 1_000));
      if (keywords.some((keyword) => window.includes(keyword))) {
        return true;
      }
    }
  }
  return false;
}

function artifactNetwork(report: VerifyDomain): Network {
  const serialized = JSON.stringify(report).toLowerCase();
  return serialized.includes("localfork") || serialized.includes("local fork") || serialized.includes("loopback") || serialized.includes("forkedfrom")
    ? "local-fork"
    : "base-sepolia";
}

function verifyEvidenceFor(route: string | null, artifacts: VerifyArtifact[]): VerifyEvidence[] {
  if (!route) {
    return [];
  }
  const evidence: VerifyEvidence[] = [];
  for (const artifact of artifacts) {
    for (const [domain, report] of Object.entries(artifact.reports)) {
      const classification = report.classification ?? report.finalClassification;
      if (classification === "proven working" && report.routes?.includes(route)) {
        evidence.push({
          artifact: artifact.path,
          domain,
          route,
          network: artifactNetwork(report),
        });
      }
    }
  }
  return evidence;
}

function proofDepth(proof: ProofFlags): GapItem["proofDepth"] {
  const scoredDimensions: Array<keyof ProofFlags> = [
    "unit", "workflow", "localFork", "baseSepolia", "negativePath", "economic", "redTeam", "indexer",
  ];
  const score = scoredDimensions.filter((dimension) => proof[dimension]).length;
  const level = proof.indexer
    ? "indexer"
    : proof.redTeam || proof.negativePath || proof.economic
      ? "adversarial"
      : proof.localFork || proof.baseSepolia
        ? "live"
        : proof.workflow
          ? "workflow"
          : proof.unit
            ? "unit"
            : "inventory";
  return { level, score, maximumScore: scoredDimensions.length };
}

function classifyFunction(
  proof: ProofFlags,
  category: "read" | "write",
  endpoint: Endpoint | undefined,
  exclusion: string | null,
): GapClassification {
  if (!proof.rpcRegistry) {
    return "needs contract change";
  }
  if (exclusion) {
    return "unsafe on live network";
  }
  if (!proof.httpRegistry || !proof.reviewedApiSurface) {
    return "needs API guard";
  }
  const isAdmin = endpoint?.classification === "admin";
  if (isAdmin && !proof.localFork && !proof.baseSepolia) {
    return "unsafe on live network";
  }
  if (!proof.unit || (category === "write" && (!proof.workflow || !proof.negativePath))) {
    return "needs fixture";
  }
  return "ready";
}

function classifyEvent(proof: ProofFlags): GapClassification {
  if (!proof.rpcRegistry) {
    return "needs contract change";
  }
  if (!proof.httpRegistry || !proof.reviewedApiSurface || !proof.indexer) {
    return "needs indexer proof";
  }
  if (!proof.unit && !proof.localFork && !proof.baseSepolia) {
    return "needs fixture";
  }
  return "ready";
}

function gapsFor(item: {
  kind: "function" | "event";
  category: "read" | "write" | "event";
  proof: ProofFlags;
  exclusion: string | null;
}): string[] {
  const gaps: string[] = [];
  if (!item.proof.rpcRegistry) gaps.push("missing RPC registry entry");
  if (!item.proof.httpRegistry && !item.exclusion) gaps.push("missing HTTP registry entry");
  if (!item.proof.reviewedApiSurface && !item.exclusion) gaps.push("missing reviewed API surface entry");
  if (item.exclusion) gaps.push(item.exclusion);
  if (!item.proof.unit) gaps.push("no directly attributable test reference");
  if (item.kind === "function" && item.category === "write" && !item.proof.workflow) gaps.push("no workflow proof reference");
  if (item.kind === "function" && item.category === "write" && !item.proof.negativePath) gaps.push("no negative-path proof reference");
  if (!item.proof.localFork && !item.proof.baseSepolia) gaps.push("no successful verify-artifact route evidence");
  if (item.kind === "event" && !item.proof.indexer) gaps.push("no event-specific indexer test reference");
  return gaps;
}

function buildEvidence(
  tests: TestSource[],
  tokens: string[],
  verifyEvidence: VerifyEvidence[],
  kind: "function" | "event",
): ItemEvidence {
  const matches = matchingTests(tests, tokens);
  const paths = (sources: TestSource[]) => sources.map((source) => source.path).sort();
  return {
    tests: paths(matches),
    workflowTests: paths(matches.filter((test) => test.path.includes("/workflows/") || test.path.endsWith(".integration.test.ts"))),
    negativePathTests: paths(matches.filter((test) => hasKeywordNearToken(test.content, tokens, negativeKeywords))),
    economicTests: paths(matches.filter((test) => hasKeywordNearToken(test.content, tokens, economicKeywords))),
    redTeamTests: paths(matches.filter((test) => test.path.includes("red-team") || hasKeywordNearToken(test.content, tokens, redTeamKeywords))),
    indexerTests: kind === "event" ? paths(matches.filter((test) => test.path.startsWith("packages/indexer/"))) : [],
    verifyArtifacts: verifyEvidence,
  };
}

function buildItem(args: {
  occurrence: number;
  facetName: string;
  kind: "function" | "event";
  entry: ManifestMethod | ManifestEvent;
  httpRegistry: Registry;
  rpcRegistry: Registry;
  reviewed: ReviewedApiSurface;
  tests: TestSource[];
  artifacts: VerifyArtifact[];
}): GapItem {
  const { occurrence, facetName, kind, entry, httpRegistry, rpcRegistry, reviewed, tests, artifacts } = args;
  const key = `${facetName}.${entry.wrapperKey}`;
  const registrySection = kind === "function" ? "methods" : "events";
  const endpoint = httpRegistry[registrySection][key];
  const reviewedEndpoint = reviewed[registrySection][key];
  const rpcEntry = rpcRegistry[registrySection][key];
  const route = endpointRoute(endpoint);
  const tokens = itemTokens(key, entry.name, entry.wrapperKey, entry.signature, endpoint ?? reviewedEndpoint);
  const artifactEvidence = verifyEvidenceFor(route, artifacts);
  const evidence = buildEvidence(tests, tokens, artifactEvidence, kind);
  const exclusion = kind === "function" ? apiExclusions[key] ?? null : null;
  const proof: ProofFlags = {
    abiManifest: true,
    rpcRegistry: Boolean(rpcEntry),
    httpRegistry: Boolean(endpoint),
    reviewedApiSurface: Boolean(reviewedEndpoint),
    unit: evidence.tests.length > 0,
    workflow: evidence.workflowTests.length > 0,
    localFork: artifactEvidence.some((item) => item.network === "local-fork"),
    baseSepolia: artifactEvidence.some((item) => item.network === "base-sepolia"),
    negativePath: evidence.negativePathTests.length > 0,
    economic: evidence.economicTests.length > 0 || artifactEvidence.some((item) => {
      const artifact = artifacts.find((candidate) => candidate.path === item.artifact);
      const domain = artifact?.reports[item.domain];
      return domain ? economicKeywords.some((keyword) => JSON.stringify(domain).toLowerCase().includes(keyword)) : false;
    }),
    redTeam: evidence.redTeamTests.length > 0,
    indexer: evidence.indexerTests.length > 0,
  };
  const category = kind === "function" ? (entry as ManifestMethod).category : "event";
  const classification = kind === "function"
    ? classifyFunction(proof, category as "read" | "write", endpoint ?? reviewedEndpoint, exclusion)
    : classifyEvent(proof);
  return {
    id: occurrence > 1 ? `${key}#${occurrence}` : key,
    key,
    kind,
    facetName,
    name: entry.name,
    wrapperKey: entry.wrapperKey,
    signature: entry.signature,
    category,
    mutability: kind === "function" ? (entry as ManifestMethod).mutability : null,
    endpoint: endpoint?.httpMethod && endpoint.path ? { method: endpoint.httpMethod, path: endpoint.path } : null,
    apiExclusion: exclusion,
    proof,
    proofDepth: proofDepth(proof),
    classification,
    gaps: gapsFor({ kind, category, proof, exclusion }),
    evidence,
  };
}

export function buildGapReport(input: BuildGapReportInput): GapReport {
  const occurrences = new Map<string, number>();
  const facets = input.manifest.facets.map<GapFacet>((facet) => {
    const makeItem = (kind: "function" | "event", entry: ManifestMethod | ManifestEvent): GapItem => {
      const key = `${facet.facetName}.${entry.wrapperKey}`;
      const occurrence = (occurrences.get(key) ?? 0) + 1;
      occurrences.set(key, occurrence);
      return buildItem({
        occurrence,
        facetName: facet.facetName,
        kind,
        entry,
        httpRegistry: input.httpRegistry,
        rpcRegistry: input.rpcRegistry,
        reviewed: input.reviewedApiSurface,
        tests: input.tests,
        artifacts: input.verifyArtifacts,
      });
    };
    const functions = facet.functions.map((entry) => makeItem("function", entry));
    const events = facet.events.map((entry) => makeItem("event", entry));
    const items = [...functions, ...events];
    const classificationCounts = emptyClassificationCounts();
    for (const item of items) classificationCounts[item.classification] += 1;
    const levelIndexes = items.map((item) => proofLevelOrder.indexOf(item.proofDepth.level));
    return {
      facetName: facet.facetName,
      facetKey: facet.facetKey,
      summary: {
        functionCount: functions.length,
        eventCount: events.length,
        classification: classificationSeverity.find((classification) => classificationCounts[classification] > 0) ?? "ready",
        classificationCounts,
        proofDepth: {
          minimumLevel: proofLevelOrder[Math.min(...levelIndexes)] ?? "inventory",
          maximumLevel: proofLevelOrder[Math.max(...levelIndexes)] ?? "inventory",
          averageScore: items.length === 0
            ? 0
            : Number((items.reduce((sum, item) => sum + item.proofDepth.score, 0) / items.length).toFixed(2)),
          maximumScore: 8,
        },
      },
      functions,
      events,
    };
  });

  const items = facets.flatMap((facet) => [...facet.functions, ...facet.events]);
  const classificationCounts = emptyClassificationCounts();
  for (const item of items) classificationCounts[item.classification] += 1;
  const proofKeys = Object.keys(items[0]?.proof ?? {
    abiManifest: false, rpcRegistry: false, httpRegistry: false, reviewedApiSurface: false,
    unit: false, workflow: false, localFork: false, baseSepolia: false,
    negativePath: false, economic: false, redTeam: false, indexer: false,
  }) as Array<keyof ProofFlags>;
  const proofCounts = Object.fromEntries(
    proofKeys.map((key) => [key, items.filter((item) => item.proof[key]).length]),
  ) as Record<keyof ProofFlags, number>;

  return {
    schemaVersion: 1,
    generatedAt: input.generatedAt,
    methodology: {
      testAttribution: "A protocol test is attributed when its source directly mentions the ABI key, identifier-bounded name or wrapper key, signature, identifier-bounded operation id, or HTTP path; negative/economic/red-team depth additionally requires a nearby proof keyword. The gap reporter's own tests are excluded to avoid self-attribution.",
      liveAttribution: "A successful verify domain is attributed only by an exact generated HTTP method/path match. Fork markers classify local-fork proof; other tracked verify artifacts classify Base Sepolia proof.",
      classificationPolicy: "Mechanical gaps dominate; intentionally excluded/admin operations without live proof are unsafe on live network; writes require unit, workflow, and negative-path evidence; events require event-specific indexer tests.",
    },
    inputs: {
      ...inputPaths,
      testFiles: input.tests.map((test) => test.path),
      verifyArtifacts: input.verifyArtifacts.map((artifact) => artifact.path),
    },
    totals: {
      facetCount: facets.length,
      functionCount: facets.reduce((sum, facet) => sum + facet.functions.length, 0),
      eventCount: facets.reduce((sum, facet) => sum + facet.events.length, 0),
      itemCount: items.length,
      proofCounts,
      classificationCounts,
    },
    facets,
  };
}

function mark(value: boolean): string {
  return value ? "yes" : "—";
}

function escapeCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

export function renderGapReportMarkdown(report: GapReport): string {
  const lines = [
    "# API Test Gap Report",
    "",
    `Generated: \`${report.generatedAt}\``,
    "",
    "This report is an evidence inventory, not a claim that generated parity alone proves protocol safety. Test attribution is static and conservative; inspect the linked evidence arrays in the JSON artifact before promoting an item.",
    "",
    "## Summary",
    "",
    `- Facets: \`${report.totals.facetCount}\``,
    `- Functions: \`${report.totals.functionCount}\``,
    `- Events: \`${report.totals.eventCount}\``,
    `- Items: \`${report.totals.itemCount}\``,
    "",
    "| Classification | Count |",
    "| --- | ---: |",
    ...GAP_CLASSIFICATIONS.map((classification) => `| ${classification} | ${report.totals.classificationCounts[classification]} |`),
    "",
    "| Proof dimension | Items |",
    "| --- | ---: |",
    ...Object.entries(report.totals.proofCounts).map(([dimension, count]) => `| ${dimension} | ${count} |`),
    "",
    "## Methodology",
    "",
    `- ${report.methodology.testAttribution}`,
    `- ${report.methodology.liveAttribution}`,
    `- ${report.methodology.classificationPolicy}`,
    "",
  ];

  for (const facet of report.facets) {
    lines.push(`## ${facet.facetName}`, "");
    lines.push(
      `Facet classification: **${facet.summary.classification}**. Proof depth spans \`${facet.summary.proofDepth.minimumLevel}\` to \`${facet.summary.proofDepth.maximumLevel}\` with an average score of \`${facet.summary.proofDepth.averageScore}/${facet.summary.proofDepth.maximumScore}\`.`,
      "",
    );
    lines.push("### Functions", "");
    lines.push("| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |", "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
    for (const item of facet.functions) {
      lines.push(`| \`${escapeCell(item.wrapperKey)}\` | ${item.category} | ${mark(item.proof.unit)} | ${mark(item.proof.workflow)} | ${mark(item.proof.localFork)} | ${mark(item.proof.baseSepolia)} | ${mark(item.proof.negativePath)} | ${mark(item.proof.economic)} | ${mark(item.proof.redTeam)} | ${item.proofDepth.level} ${item.proofDepth.score}/${item.proofDepth.maximumScore} | ${item.classification} |`);
    }
    if (facet.functions.length === 0) lines.push("| _none_ | — | — | — | — | — | — | — | — | — | — |");
    lines.push("", "### Events", "");
    lines.push("| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |", "| --- | --- | --- | --- | --- | --- | --- |");
    for (const item of facet.events) {
      lines.push(`| \`${escapeCell(item.id)}\` | ${mark(item.proof.unit)} | ${mark(item.proof.localFork)} | ${mark(item.proof.baseSepolia)} | ${mark(item.proof.indexer)} | ${item.proofDepth.level} ${item.proofDepth.score}/${item.proofDepth.maximumScore} | ${item.classification} |`);
    }
    if (facet.events.length === 0) lines.push("| _none_ | — | — | — | — | — | — |");
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

export async function loadGapReportInput(baseDir: string, generatedAt = new Date().toISOString()): Promise<BuildGapReportInput> {
  const resolveInput = (filePath: string) => path.join(baseDir, filePath);
  const testRoots = ["packages", "scripts", "scenario-adapter"];
  const inventoryOnlyTests = new Set(["generate-test-roadmap.test.ts", "write-invariants-lib.test.ts"]);
  const testPaths = (await Promise.all(testRoots.map(async (testRoot) => {
    try {
      return await findFiles(
        path.join(baseDir, testRoot),
        (name) => name.endsWith(".test.ts") && !inventoryOnlyTests.has(name),
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }))).flat().sort();
  const artifactPaths = (await readdir(baseDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && /^verify-.*-output\.json$/u.test(entry.name))
    .map((entry) => path.join(baseDir, entry.name))
    .sort();
  return {
    manifest: await readJson<ContractManifest>(resolveInput(inputPaths.contractManifest)),
    httpRegistry: await readJson<Registry>(resolveInput(inputPaths.httpEndpointRegistry)),
    rpcRegistry: await readJson<Registry>(resolveInput(inputPaths.rpcMethodRegistry)),
    reviewedApiSurface: await readJson<ReviewedApiSurface>(resolveInput(inputPaths.reviewedApiSurface)),
    tests: await Promise.all(testPaths.map(async (filePath) => ({
      path: relativePath(baseDir, filePath),
      content: await readFile(filePath, "utf8"),
    }))),
    verifyArtifacts: await Promise.all(artifactPaths.map(async (filePath) => ({
      path: relativePath(baseDir, filePath),
      reports: (await readJson<{ reports?: Record<string, VerifyDomain> }>(filePath)).reports ?? {},
    }))),
    generatedAt,
  };
}

export async function writeGapReport(report: GapReport, outputDir: string): Promise<void> {
  await ensureDir(outputDir);
  await Promise.all([
    writeFile(path.join(outputDir, "api-test-gap-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(path.join(outputDir, "api-test-gap-report.md"), renderGapReportMarkdown(report), "utf8"),
  ]);
}

export async function main(baseDir = rootDir): Promise<void> {
  const input = await loadGapReportInput(baseDir);
  const report = buildGapReport(input);
  const outputDir = path.join(baseDir, "output");
  await writeGapReport(report, outputDir);
  console.log(
    `generated API test gap report for ${report.totals.facetCount} facets, ${report.totals.functionCount} functions, and ${report.totals.eventCount} events`,
  );
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
