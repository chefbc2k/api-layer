import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

  it("can target at least a percentage of remaining gaps without one-item slices", () => {
    const plan = buildGapBuilderPlan(report(), { maxItems: 40, minBatchItems: 1, targetPercent: 50 });

    expect(plan.totals).toMatchObject({ nonReady: 6, selected: 4 });
    expect(plan.batches.flatMap((batch) => batch.items).map((entry) => entry.id)).toEqual([
      "GovernanceFacet.diamondCut",
      "GovernanceFacet.cancelProposal",
      "PaymentFacet.emergencyWithdraw",
      "PaymentFacet.distributePayment",
    ]);
  });

  it("focuses on matching IDs or facets and treats blank focus as unfiltered", () => {
    const byId = buildGapBuilderPlan(report(), { maxItems: 10, minBatchItems: 1, focus: "CANCELPROPOSAL" });
    expect(byId.totals).toMatchObject({ nonReady: 1, selected: 1 });
    expect(byId.batches[0].items[0].id).toBe("GovernanceFacet.cancelProposal");

    const byFacet = buildGapBuilderPlan(report(), { maxItems: 10, minBatchItems: 1, focus: " paymentfacet " });
    expect(byFacet.totals.nonReady).toBe(4);

    const blank = buildGapBuilderPlan(report(), { maxItems: 10, minBatchItems: 1, focus: "  " });
    expect(blank.totals.nonReady).toBe(6);
  });

  it("creates classification-specific work for API guards, read fixtures, events, and contract gaps", () => {
    const source = report();
    const read = { ...item("ReadFacet.readPolicy", "needs fixture", "ReadFacet"), category: "read" as const, gaps: [] };
    const guard = { ...item("GuardFacet.adminAction", "needs fixture", "GuardFacet"), classification: "needs API guard" as const, gaps: [] };
    const contract = { ...item("ContractFacet.newWrite", "needs fixture", "ContractFacet"), classification: "needs contract change" as const, gaps: [] };
    const event = { ...item("EventFacet.EventChanged", "needs indexer proof", "EventFacet"), kind: "event" as const, category: "event" as const, classification: "needs contract change" as const, endpoint: null, gaps: [] };
    source.facets = [
      { facetName: "ReadFacet", functions: [read], events: [] },
      { facetName: "GuardFacet", functions: [guard], events: [] },
      { facetName: "ContractFacet", functions: [contract], events: [] },
      { facetName: "EventFacet", functions: [], events: [event] },
    ];

    const plan = buildGapBuilderPlan(source, { maxItems: 10, minBatchItems: 1 });
    const selected = plan.batches.flatMap((batch) => batch.items);
    expect(selected.find(({ id }) => id === read.id)?.requiredWork)
      .toContain("Add a direct unit or workflow fixture that exercises the read with realistic state.");
    expect(selected.find(({ id }) => id === guard.id)?.requiredWork)
      .toContain("Add or restore the reviewed HTTP/API guard for this ABI surface.");
    expect(selected.find(({ id }) => id === event.id)?.requiredWork)
      .toContain("Add event-specific indexer/projection proof and replay/idempotency coverage.");
    expect(selected.find(({ id }) => id === contract.id)?.requiredWork).toEqual([]);
    expect(plan.batches.find(({ facetName }) => facetName === "EventFacet")?.verification)
      .toContain("pnpm run test:indexer:assurance");
    expect(renderGapBuilderPlanMarkdown(plan)).toContain("`ABI-only`");
  });

  it("uses the percentage target instead of the fixed item limit", () => {
    const plan = buildGapBuilderPlan(report(), { maxItems: 1, minBatchItems: 1, targetPercent: 100 });

    expect(plan.totals).toMatchObject({ nonReady: 6, selected: 6 });
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
    const reportPath = path.join(tempDir, "report.json");
    await writeFile(reportPath, JSON.stringify(report()), "utf8");

    await main([
      "--report", reportPath,
      "--output-dir", tempDir,
      "--max-items", "4",
      "--min-batch-items", "4",
    ]);

    const [json, markdown] = await Promise.all([
      readFile(path.join(tempDir, "gap-builder-plan.json"), "utf8"),
      readFile(path.join(tempDir, "gap-builder-plan.md"), "utf8"),
    ]);
    expect(JSON.parse(json)).toMatchObject({
      generatedAt: "2026-09-27T01:02:03.000Z",
      totals: { selected: 4 },
    });
    expect(markdown).toContain("Selected this run: `4`");
    await main(["--report", reportPath, "--output-dir", tempDir, "--focus"]);
  });

  it("uses the default report and output paths without leaving generated files changed", async () => {
    const jsonPath = path.join(process.cwd(), "output/gap-builder-plan.json");
    const markdownPath = path.join(process.cwd(), "output/gap-builder-plan.md");
    const [previousJson, previousMarkdown] = await Promise.all([
      readFile(jsonPath),
      readFile(markdownPath),
    ]);
    try {
      await main([]);
      expect(JSON.parse(await readFile(jsonPath, "utf8")).sourceGeneratedAt).toBeTruthy();
      expect(await readFile(markdownPath, "utf8")).toContain("# Gap Builder Plan");
    } finally {
      await Promise.all([
        writeFile(jsonPath, previousJson),
        writeFile(markdownPath, previousMarkdown),
      ]);
    }
  });

  it("writes a percent-targeted plan from the CLI", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-27T01:02:03.000Z"));
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "gap-builder-plan-"));
    temporaryDirectories.push(tempDir);
    const reportPath = path.join(tempDir, "report.json");
    await writeFile(reportPath, JSON.stringify(report()), "utf8");

    await main([
      "--report", reportPath,
      "--output-dir", tempDir,
      "--target-percent", "50",
      "--min-batch-items", "1",
    ]);

    const plan = JSON.parse(await readFile(path.join(tempDir, "gap-builder-plan.json"), "utf8"));
    expect(plan.totals).toMatchObject({ nonReady: 6, selected: 4 });
  });

  it("rejects invalid numeric CLI arguments", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "gap-builder-plan-"));
    temporaryDirectories.push(tempDir);
    const reportPath = path.join(tempDir, "report.json");
    await writeFile(reportPath, JSON.stringify(report()), "utf8");

    await expect(main(["--report", reportPath, "--max-items", "-1"]))
      .rejects.toThrow("--max-items must be a non-negative integer");
  });

  it.each(["0", "-1", "not-a-number", "101"])("rejects invalid percentage CLI argument %s", async (value) => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "gap-builder-plan-"));
    temporaryDirectories.push(tempDir);
    const reportPath = path.join(tempDir, "report.json");
    await writeFile(reportPath, JSON.stringify(report()), "utf8");

    await expect(main(["--report", reportPath, "--target-percent", value]))
      .rejects.toThrow("--target-percent must be a number greater than 0 and at most 100");
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

  it("allows an empty plan when the report has no actionable gaps", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "gap-builder-plan-"));
    temporaryDirectories.push(tempDir);
    const reportPath = path.join(tempDir, "report.json");
    const cleanReport = report();
    cleanReport.facets = [];
    await writeFile(reportPath, JSON.stringify(cleanReport), "utf8");

    await expect(main([
      "--report", reportPath,
      "--output-dir", tempDir,
      "--fail-on-empty",
    ])).resolves.toBeUndefined();

    const plan = JSON.parse(await readFile(path.join(tempDir, "gap-builder-plan.json"), "utf8"));
    expect(plan.totals).toMatchObject({ nonReady: 0, selected: 0 });
  });

  it("logs CLI planning failures and sets a failing process status", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "gap-builder-cli-error-"));
    temporaryDirectories.push(tempDir);
    const previousArgv = [...process.argv];
    const previousExitCode = process.exitCode;
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "gap-builder-plan.ts");
      process.argv.splice(0, process.argv.length, process.argv[0] ?? "node", script,
        "--report", path.join(tempDir, "missing-report.json"), "--output-dir", tempDir);
      vi.resetModules();
      await import("./gap-builder-plan.js");
      await vi.waitFor(() => expect(process.exitCode).toBe(1));
      expect(error).toHaveBeenCalledOnce();
    } finally {
      process.argv.splice(0, process.argv.length, ...previousArgv);
      process.exitCode = previousExitCode;
      error.mockRestore();
      vi.resetModules();
    }
  });

  it("does not auto-run when the process has no script path", async () => {
    const previousArgv = [...process.argv];
    try {
      process.argv.splice(0, process.argv.length, process.argv[0] ?? "node");
      vi.resetModules();
      await import("./gap-builder-plan.js");
    } finally {
      process.argv.splice(0, process.argv.length, ...previousArgv);
      vi.resetModules();
    }
  });
});
