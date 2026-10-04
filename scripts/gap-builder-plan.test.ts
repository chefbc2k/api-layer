import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { buildGapBuilderPlan, main, renderGapBuilderPlanMarkdown } from "./gap-builder-plan.js";

const temporaryDirectories: string[] = [];

function item(id: string, classification: "needs fixture" | "needs indexer proof" | "unsafe on live network", facetName = "PaymentFacet") {
  return {
    id,
    kind: id.includes(".Event") ? "event" as const : "function" as const,
    facetName,
    name: id.split(".").at(-1) ?? id,
    category: id.includes(".Event") ? "event" as const : "write" as const,
    classification,
    gaps: [
      "no workflow proof reference",
      "no negative-path proof reference",
      "no successful verify-artifact route evidence",
    ],
    endpoint: { method: "POST", path: `/v1/${facetName}/${id}` },
    proofDepth: { level: "inventory", score: 0, maximumScore: 8 },
  };
}

function report() {
  return {
    generatedAt: "2026-09-27T00:00:00.000Z",
    totals: {
      classificationCounts: {
        ready: 1,
        "needs fixture": 3,
        "unsafe on live network": 2,
        "needs contract change": 0,
        "needs API guard": 0,
        "needs indexer proof": 1,
      },
    },
    facets: [{
      facetName: "PaymentFacet",
      functions: [
        item("PaymentFacet.distributePayment", "needs fixture"),
        item("PaymentFacet.setPaymentPaused", "needs fixture"),
        item("PaymentFacet.emergencyWithdraw", "unsafe on live network"),
      ],
      events: [item("PaymentFacet.Event.PaymentDistributed", "needs indexer proof")],
    }, {
      facetName: "GovernanceFacet",
      functions: [
        item("GovernanceFacet.cancelProposal", "needs fixture", "GovernanceFacet"),
        item("GovernanceFacet.diamondCut", "unsafe on live network", "GovernanceFacet"),
      ],
      events: [],
    }],
  };
}

afterEach(async () => {
  vi.useRealTimers();
  await Promise.all(temporaryDirectories.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("gap-builder plan", () => {
  it("selects and groups multiple actionable gaps instead of one-item slices", () => {
    const plan = buildGapBuilderPlan(report(), { maxItems: 5, minBatchItems: 5 });

    expect(plan.totals).toMatchObject({ nonReady: 6, selected: 5 });
    expect(plan.batches.map((batch) => batch.facetName)).toEqual(["GovernanceFacet", "PaymentFacet"]);
    expect(plan.batches.flatMap((batch) => batch.items).map((entry) => entry.id)).toEqual([
      "GovernanceFacet.diamondCut",
      "GovernanceFacet.cancelProposal",
      "PaymentFacet.emergencyWithdraw",
      "PaymentFacet.distributePayment",
      "PaymentFacet.setPaymentPaused",
    ]);
    expect(plan.batches[0].verification).toContain("pnpm run test:actor-negative-paths");
  });

  it("fails when a run would select fewer than the required batch size", () => {
    expect(() => buildGapBuilderPlan(report(), { maxItems: 2, minBatchItems: 3 }))
      .toThrow("below minimum batch size");
  });

  it("selects every remaining item when fewer than the minimum batch size remain", () => {
    const plan = buildGapBuilderPlan(report(), { maxItems: 40, minBatchItems: 10 });

    expect(plan.totals).toMatchObject({ nonReady: 6, selected: 6 });
    expect(plan.batches.flatMap((batch) => batch.items)).toHaveLength(6);
  });

  it("does not create a one-item facet slice at the batch cutoff", () => {
    const plan = buildGapBuilderPlan(report(), { maxItems: 3, minBatchItems: 1 });

    expect(plan.totals.selected).toBe(2);
    expect(plan.batches).toHaveLength(1);
    expect(plan.batches[0].items).toHaveLength(2);
  });

  it("renders direct implementation instructions and verification commands", () => {
    const markdown = renderGapBuilderPlanMarkdown(buildGapBuilderPlan(report(), { maxItems: 6, minBatchItems: 1 }));

    expect(markdown).toContain("# Gap Builder Plan");
    expect(markdown).toContain("Add unit, workflow, and negative-path fixtures");
    expect(markdown).toContain("pnpm run test:indexer:assurance");
    expect(markdown).toContain("pnpm run coverage:check");
  });

  it("writes persistent JSON and Markdown artifacts from the repository report", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-27T01:02:03.000Z"));
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "gap-builder-plan-"));
    temporaryDirectories.push(tempDir);

    await main(["--output-dir", tempDir, "--max-items", "4", "--min-batch-items", "4"]);

    const [json, markdown] = await Promise.all([
      readFile(path.join(tempDir, "gap-builder-plan.json"), "utf8"),
      readFile(path.join(tempDir, "gap-builder-plan.md"), "utf8"),
    ]);
    expect(JSON.parse(json)).toMatchObject({
      generatedAt: "2026-09-27T01:02:03.000Z",
      totals: { selected: 4 },
    });
    expect(markdown).toContain("Selected this run: `4`");
  });

  it("rejects invalid numeric CLI arguments", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "gap-builder-plan-"));
    temporaryDirectories.push(tempDir);
    const reportPath = path.join(tempDir, "report.json");
    await writeFile(reportPath, JSON.stringify(report()), "utf8");

    await expect(main(["--report", reportPath, "--max-items", "-1"]))
      .rejects.toThrow("--max-items must be a non-negative integer");
  });

  it("fails loudly when a zero-sized plan leaves actionable gaps", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "gap-builder-plan-"));
    temporaryDirectories.push(tempDir);
    const reportPath = path.join(tempDir, "report.json");
    await writeFile(reportPath, JSON.stringify(report()), "utf8");

    await expect(main([
      "--report", reportPath,
      "--output-dir", tempDir,
      "--max-items", "0",
      "--fail-on-empty",
    ])).rejects.toThrow("gap-builder found non-ready items but selected none");
  });
});
