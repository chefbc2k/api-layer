import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  GAP_CLASSIFICATIONS,
  buildGapReport,
  loadGapReportInput,
  renderGapReportMarkdown,
  writeGapReport,
} from "./generate-test-roadmap.js";

const temporaryDirectories: string[] = [];

function endpoint(method: string, route: string, operationId: string, classification = "command") {
  return { httpMethod: method, path: route, operationId, classification };
}

function baseInput(): Parameters<typeof buildGapReport>[0] {
  const getThing = {
    name: "getThing",
    wrapperKey: "getThing",
    signature: "getThing(uint256)",
    mutability: "view",
    category: "read" as const,
  };
  const setThing = {
    name: "setThing",
    wrapperKey: "setThing",
    signature: "setThing(uint256)",
    mutability: "nonpayable",
    category: "write" as const,
  };
  const thingSet = {
    name: "ThingSet",
    wrapperKey: "ThingSet",
    signature: "ThingSet(uint256)",
  };
  const methods = {
    "TestFacet.getThing": endpoint("GET", "/v1/test/:id", "getThing"),
    "TestFacet.setThing": endpoint("POST", "/v1/test", "setThing"),
  };
  const events = {
    "TestFacet.ThingSet": endpoint("POST", "/v1/test/events/thing-set/query", "thingSetEventQuery"),
  };
  return {
    manifest: {
      totals: { facetCount: 1, functionCount: 2, eventCount: 2 },
      facets: [{
        facetName: "TestFacet",
        facetKey: "test",
        functions: [getThing, setThing],
        events: [thingSet, thingSet],
      }],
    },
    httpRegistry: { methods, events },
    rpcRegistry: { methods, events },
    reviewedApiSurface: { methods, events },
    tests: [
      { path: "packages/api/src/read.test.ts", content: "it('reads', () => getThing(1))" },
      {
        path: "packages/api/src/workflows/set-thing.integration.test.ts",
        content: "it('rejects an unauthorized setThing with unchanged balance and price', () => {})",
      },
      { path: "scripts/red-team-set.test.ts", content: "it('blocks replay mutation for setThing', () => {})" },
      { path: "packages/indexer/src/events.test.ts", content: "it('projects ThingSet', () => {})" },
    ],
    verifyArtifacts: [{
      path: "verify-test-output.json",
      reports: {
        read: {
          classification: "proven working",
          routes: ["GET /v1/test/:id", "POST /v1/test/events/thing-set/query"],
          evidence: [{ network: "base-sepolia" }],
        },
        write: {
          finalClassification: "proven working",
          routes: ["POST /v1/test"],
          evidence: [{ localFork: true, settlement: { balanceDelta: "1" } }],
        },
        ignored: {
          classification: "blocked by setup/state",
          routes: ["POST /v1/test"],
          evidence: [],
        },
      },
    }],
    generatedAt: "2026-08-03T00:00:00.000Z",
  };
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("API test gap report", () => {
  it("classifies proof depth per function and duplicate event occurrence", () => {
    const report = buildGapReport(baseInput());

    expect(report.totals).toMatchObject({ facetCount: 1, functionCount: 2, eventCount: 2, itemCount: 4 });
    expect(Object.keys(report.totals.classificationCounts)).toEqual(GAP_CLASSIFICATIONS);
    expect(report.totals.classificationCounts.ready).toBe(4);
    expect(report.facets[0].summary).toMatchObject({
      classification: "ready",
      proofDepth: { minimumLevel: "live", maximumLevel: "indexer", averageScore: 3.5, maximumScore: 8 },
    });

    const [read, write] = report.facets[0].functions;
    expect(read).toMatchObject({
      classification: "ready",
      proof: { unit: true, baseSepolia: true, localFork: false },
      proofDepth: { level: "live" },
    });
    expect(write).toMatchObject({
      classification: "ready",
      proof: {
        workflow: true,
        localFork: true,
        negativePath: true,
        economic: true,
        redTeam: true,
      },
      proofDepth: { level: "adversarial" },
    });
    expect(write.evidence.verifyArtifacts).toEqual([
      expect.objectContaining({ artifact: "verify-test-output.json", network: "local-fork" }),
    ]);

    const [firstEvent, secondEvent] = report.facets[0].events;
    expect(firstEvent.id).toBe("TestFacet.ThingSet");
    expect(secondEvent.id).toBe("TestFacet.ThingSet#2");
    expect(firstEvent).toMatchObject({
      classification: "ready",
      proof: { indexer: true, baseSepolia: true },
      proofDepth: { level: "indexer" },
    });
  });

  it("uses the required conservative gap classifications", () => {
    const input = baseInput();
    const proposalKey = "ProposalFacet.propose(string,string,address[],uint256[],bytes[],uint8)";
    input.manifest.facets = [{
      facetName: "ProposalFacet",
      facetKey: "proposal",
      functions: [
        { name: "missingRpc", wrapperKey: "missingRpc", signature: "missingRpc()", mutability: "view", category: "read" },
        { name: "missingApi", wrapperKey: "missingApi", signature: "missingApi()", mutability: "view", category: "read" },
        { name: "adminWrite", wrapperKey: "adminWrite", signature: "adminWrite()", mutability: "nonpayable", category: "write" },
        { name: "plainWrite", wrapperKey: "plainWrite", signature: "plainWrite()", mutability: "nonpayable", category: "write" },
        { name: "propose", wrapperKey: "propose(string,string,address[],uint256[],bytes[],uint8)", signature: "propose(string,string,address[],uint256[],bytes[],uint8)", mutability: "nonpayable", category: "write" },
      ],
      events: [{ name: "Unprojected", wrapperKey: "Unprojected", signature: "Unprojected()" }],
    }];
    input.manifest.totals = { facetCount: 1, functionCount: 5, eventCount: 1 };
    const rpcMethods = {
      "ProposalFacet.missingApi": {},
      "ProposalFacet.adminWrite": {},
      "ProposalFacet.plainWrite": {},
      [proposalKey]: {},
    };
    const httpMethods = {
      "ProposalFacet.adminWrite": endpoint("POST", "/v1/admin", "adminWrite", "admin"),
      "ProposalFacet.plainWrite": endpoint("POST", "/v1/plain", "plainWrite"),
    };
    input.rpcRegistry = { methods: rpcMethods, events: { "ProposalFacet.Unprojected": {} } };
    input.httpRegistry = { methods: httpMethods, events: { "ProposalFacet.Unprojected": endpoint("POST", "/v1/events/unprojected/query", "unprojectedEventQuery") } };
    input.reviewedApiSurface = { methods: httpMethods, events: input.httpRegistry.events };
    input.tests = [];
    input.verifyArtifacts = [];

    const report = buildGapReport(input);
    const byName = Object.fromEntries(report.facets[0].functions.map((item) => [item.name, item]));
    expect(byName.missingRpc.classification).toBe("needs contract change");
    expect(byName.missingApi.classification).toBe("needs API guard");
    expect(byName.adminWrite.classification).toBe("unsafe on live network");
    expect(byName.plainWrite.classification).toBe("needs fixture");
    expect(byName.propose.classification).toBe("unsafe on live network");
    expect(byName.propose.apiExclusion).toContain("intentionally excluded");
    expect(report.facets[0].events[0]).toMatchObject({
      classification: "needs indexer proof",
      gaps: expect.arrayContaining(["no event-specific indexer test reference"]),
    });
  });

  it("loads repository-shaped inputs and writes both persistent artifacts", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "api-test-gap-report-"));
    temporaryDirectories.push(tempDir);
    await Promise.all([
      mkdir(path.join(tempDir, "generated/manifests"), { recursive: true }),
      mkdir(path.join(tempDir, "reviewed"), { recursive: true }),
      mkdir(path.join(tempDir, "packages/sample/nested"), { recursive: true }),
    ]);
    const input = baseInput();
    const jsonFiles: Array<[string, unknown]> = [
      ["generated/manifests/contract-manifest.json", input.manifest],
      ["generated/manifests/http-endpoint-registry.json", input.httpRegistry],
      ["generated/manifests/rpc-method-registry.json", input.rpcRegistry],
      ["reviewed/reviewed-api-surface.json", input.reviewedApiSurface],
      ["verify-empty-output.json", { summary: "proven working" }],
    ];
    await Promise.all(jsonFiles.map(async ([filePath, value]) => {
      await writeFile(path.join(tempDir, filePath), `${JSON.stringify(value)}\n`);
    }));
    await writeFile(path.join(tempDir, "packages/sample/nested/example.test.ts"), "getThing ThingSet");

    const loaded = await loadGapReportInput(tempDir, "2026-08-03T01:02:03.000Z");
    expect(loaded.tests.map((test) => test.path)).toEqual(["packages/sample/nested/example.test.ts"]);
    expect(loaded.verifyArtifacts).toEqual([{ path: "verify-empty-output.json", reports: {} }]);

    const report = buildGapReport(loaded);
    const outputDir = path.join(tempDir, "output");
    await writeGapReport(report, outputDir);
    const [json, markdown] = await Promise.all([
      readFile(path.join(outputDir, "api-test-gap-report.json"), "utf8"),
      readFile(path.join(outputDir, "api-test-gap-report.md"), "utf8"),
    ]);
    expect(JSON.parse(json).totals.itemCount).toBe(4);
    expect(markdown).toContain("# API Test Gap Report");
    expect(markdown).toContain("## TestFacet");
    expect(markdown).toContain("`TestFacet.ThingSet#2`");
  });

  it("renders empty facet tables and an empty inventory deterministically", () => {
    const input = baseInput();
    input.manifest.facets = [{ facetName: "EmptyFacet", facetKey: "empty", functions: [], events: [] }];
    input.manifest.totals = { facetCount: 1, functionCount: 0, eventCount: 0 };
    input.httpRegistry = { methods: {}, events: {} };
    input.rpcRegistry = { methods: {}, events: {} };
    input.reviewedApiSurface = { methods: {}, events: {} };
    input.tests = [];
    input.verifyArtifacts = [];

    const report = buildGapReport(input);
    expect(report.totals.itemCount).toBe(0);
    expect(report.totals.proofCounts).toEqual(expect.objectContaining({ abiManifest: 0, indexer: 0 }));
    expect(report.facets[0].summary).toMatchObject({
      classification: "ready",
      proofDepth: { minimumLevel: "inventory", maximumLevel: "inventory", averageScore: 0 },
    });
    const markdown = renderGapReportMarkdown(report);
    expect(markdown.match(/\| _none_ \|/gu)).toHaveLength(2);
  });
});
