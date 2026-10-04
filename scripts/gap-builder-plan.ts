import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ensureDir, rootDir } from "./utils.js";

type GapClassification =
  | "ready"
  | "needs fixture"
  | "unsafe on live network"
  | "needs contract change"
  | "needs API guard"
  | "needs indexer proof";

type GapItem = {
  id: string;
  kind: "function" | "event";
  facetName: string;
  name: string;
  category: "read" | "write" | "event";
  classification: GapClassification;
  gaps: string[];
  endpoint: { method: string; path: string } | null;
  proofDepth: { level: string; score: number; maximumScore: number };
};

type GapReport = {
  generatedAt: string;
  totals: {
    classificationCounts: Record<GapClassification, number>;
  };
  facets: Array<{
    facetName: string;
    functions: GapItem[];
    events: GapItem[];
  }>;
};

export type GapBuilderPlanOptions = {
  maxItems: number;
  minBatchItems: number;
  targetPercent?: number | null;
  focus?: string | null;
};

export type GapBuilderPlan = {
  generatedAt: string;
  sourceGeneratedAt: string;
  totals: {
    nonReady: number;
    selected: number;
    byClassification: Record<GapClassification, number>;
  };
  batches: Array<{
    facetName: string;
    objective: string;
    items: Array<{
      id: string;
      kind: GapItem["kind"];
      category: GapItem["category"];
      classification: GapClassification;
      endpoint: GapItem["endpoint"];
      gaps: string[];
      requiredWork: string[];
    }>;
    verification: string[];
  }>;
};

const classificationPriority: Record<GapClassification, number> = {
  "needs API guard": 0,
  "unsafe on live network": 1,
  "needs fixture": 2,
  "needs indexer proof": 3,
  "needs contract change": 4,
  ready: 5,
};

function compareGapItems(left: GapItem, right: GapItem): number {
  return (
    classificationPriority[left.classification] - classificationPriority[right.classification] ||
    left.facetName.localeCompare(right.facetName) ||
    left.category.localeCompare(right.category) ||
    left.id.localeCompare(right.id)
  );
}

function selectGroupedItems(items: GapItem[], maxItems: number, allowSmallOverage = false): GapItem[] {
  const byFacet = new Map<string, GapItem[]>();
  for (const item of items) {
    byFacet.set(item.facetName, [...(byFacet.get(item.facetName) ?? []), item]);
  }

  const selected: GapItem[] = [];
  for (const facetItems of byFacet.values()) {
    const remaining = maxItems - selected.length;
    if (remaining <= 0) {
      break;
    }
    if (facetItems.length <= remaining) {
      selected.push(...facetItems);
      continue;
    }
    // Never turn a related multi-item facet into a one-item batch just to fill
    // the final slot. A plan may contain fewer than maxItems in that edge case.
    if (remaining >= 2) {
      selected.push(...facetItems.slice(0, remaining));
    } else if (allowSmallOverage && facetItems.length >= 2) {
      selected.push(...facetItems.slice(0, 2));
    }
  }
  return selected;
}

function requiredWorkFor(item: GapItem): string[] {
  const work = new Set<string>();
  if (item.classification === "needs API guard") {
    work.add("Add or restore the reviewed HTTP/API guard for this ABI surface.");
  }
  if (item.classification === "unsafe on live network") {
    work.add("Add fail-closed live-network gating plus focused negative-path coverage before any live execution.");
  }
  if (item.classification === "needs fixture") {
    work.add(item.category === "read"
      ? "Add a direct unit or workflow fixture that exercises the read with realistic state."
      : "Add unit, workflow, and negative-path fixtures that preflight the write before mutation.");
  }
  if (item.classification === "needs indexer proof" || item.kind === "event") {
    work.add("Add event-specific indexer/projection proof and replay/idempotency coverage.");
  }
  if (item.gaps.some((gap) => gap.includes("verify-artifact"))) {
    work.add("Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.");
  }
  if (item.gaps.some((gap) => gap.includes("workflow"))) {
    work.add("Route the proof through an executable workflow or route-level integration test.");
  }
  if (item.gaps.some((gap) => gap.includes("negative-path"))) {
    work.add("Add explicit unauthorized, stale-state, or replay rejection coverage.");
  }
  return [...work];
}

function verificationFor(items: GapItem[]): string[] {
  const commands = new Set<string>([
    "pnpm run test:gap-report",
    "pnpm run coverage:check",
  ]);
  if (items.some((item) => item.classification === "needs indexer proof" || item.kind === "event")) {
    commands.add("pnpm run test:indexer:assurance");
  }
  if (items.some((item) => item.category === "write" || item.classification === "unsafe on live network")) {
    commands.add("pnpm run test:actor-negative-paths");
  }
  return [...commands];
}

export function buildGapBuilderPlan(report: GapReport, options: GapBuilderPlanOptions): GapBuilderPlan {
  const focus = options.focus?.trim().toLowerCase() || null;
  const allItems = report.facets
    .flatMap((facet) => [...facet.functions, ...facet.events])
    .filter((item) => item.classification !== "ready")
    .filter((item) => !focus || item.id.toLowerCase().includes(focus) || item.facetName.toLowerCase().includes(focus))
    .sort(compareGapItems);
  const targetCount = options.targetPercent
    ? Math.ceil(allItems.length * (options.targetPercent / 100))
    : options.maxItems;
  const selected = selectGroupedItems(allItems, targetCount, Boolean(options.targetPercent));
  if (
    selected.length > 0
    && selected.length < options.minBatchItems
    && allItems.length >= options.minBatchItems
  ) {
    throw new Error(`gap-builder selected ${selected.length} items, below minimum batch size ${options.minBatchItems}`);
  }

  const byFacet = new Map<string, GapItem[]>();
  for (const item of selected) {
    byFacet.set(item.facetName, [...(byFacet.get(item.facetName) ?? []), item]);
  }

  return {
    generatedAt: new Date().toISOString(),
    sourceGeneratedAt: report.generatedAt,
    totals: {
      nonReady: allItems.length,
      selected: selected.length,
      byClassification: report.totals.classificationCounts,
    },
    batches: [...byFacet.entries()].map(([facetName, items]) => ({
      facetName,
      objective: `Reduce ${facetName} launch blockers across ${items.length} gap item${items.length === 1 ? "" : "s"}.`,
      items: items.map((item) => ({
        id: item.id,
        kind: item.kind,
        category: item.category,
        classification: item.classification,
        endpoint: item.endpoint,
        gaps: item.gaps,
        requiredWork: requiredWorkFor(item),
      })),
      verification: verificationFor(items),
    })),
  };
}

export function renderGapBuilderPlanMarkdown(plan: GapBuilderPlan): string {
  const lines = [
    "# Gap Builder Plan",
    "",
    `Generated: \`${plan.generatedAt}\``,
    `Source gap report: \`${plan.sourceGeneratedAt}\``,
    "",
    "## Summary",
    "",
    `- Non-ready items in scope: \`${plan.totals.nonReady}\``,
    `- Selected this run: \`${plan.totals.selected}\``,
    "",
  ];

  for (const batch of plan.batches) {
    lines.push(`## ${batch.facetName}`, "", batch.objective, "");
    for (const item of batch.items) {
      lines.push(`- \`${item.id}\` (${item.classification})`);
      lines.push(`  - Endpoint: ${item.endpoint ? `\`${item.endpoint.method} ${item.endpoint.path}\`` : "`ABI-only`"}`);
      lines.push(`  - Required work: ${item.requiredWork.join(" ")}`);
    }
    lines.push("", `Verification: ${batch.verification.map((command) => `\`${command}\``).join(", ")}`, "");
  }

  return `${lines.join("\n")}\n`;
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function numberArg(args: string[], name: string, fallback: number): number {
  const index = args.indexOf(name);
  if (index === -1) {
    return fallback;
  }
  const value = Number(args[index + 1]);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return value;
}

function percentArg(args: string[], name: string): number | null {
  const index = args.indexOf(name);
  if (index === -1) {
    return null;
  }
  const value = Number(args[index + 1]);
  if (!Number.isFinite(value) || value <= 0 || value > 100) {
    throw new Error(`${name} must be a number greater than 0 and at most 100`);
  }
  return value;
}

function stringArg(args: string[], name: string): string | null {
  const index = args.indexOf(name);
  return index === -1 ? null : args[index + 1] ?? null;
}

export async function main(args = process.argv.slice(2)): Promise<void> {
  const reportPath = path.resolve(rootDir, stringArg(args, "--report") ?? "output/api-test-gap-report.json");
  const outputDir = path.resolve(rootDir, stringArg(args, "--output-dir") ?? "output");
  const plan = buildGapBuilderPlan(await readJson<GapReport>(reportPath), {
    maxItems: numberArg(args, "--max-items", 40),
    minBatchItems: numberArg(args, "--min-batch-items", 10),
    targetPercent: percentArg(args, "--target-percent"),
    focus: stringArg(args, "--focus"),
  });
  await ensureDir(outputDir);
  await Promise.all([
    writeFile(path.join(outputDir, "gap-builder-plan.json"), `${JSON.stringify(plan, null, 2)}\n`, "utf8"),
    writeFile(path.join(outputDir, "gap-builder-plan.md"), renderGapBuilderPlanMarkdown(plan), "utf8"),
  ]);
  if (args.includes("--fail-on-empty") && plan.totals.selected === 0 && plan.totals.nonReady > 0) {
    throw new Error("gap-builder found non-ready items but selected none");
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
