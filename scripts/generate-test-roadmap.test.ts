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
        content: "it('rejects an unauthorized write with unchanged balance and price', () => setThing())",
      },
      { path: "scripts/red-team-set.test.ts", content: "it('blocks replay mutation', () => setThing())" },
      { path: "packages/indexer/src/events.test.ts", content: "it('projects the event', () => decodeEvent('ThingSet'))" },
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

function failClosedGuardArtifact(): Parameters<typeof buildGapReport>[0]["verifyArtifacts"][number] {
  return {
    path: "verify-control-plane-guard-output.json",
    reports: {
      guard: {
        classification: "proven working",
        finalClassification: "proven working",
        network: "Base Sepolia live-network guard",
        proofKind: "fail-closed-before-provider",
        routes: ["POST /v1/test"],
        evidence: [{
          methodKey: "TestFacet.setThing",
          route: "POST /v1/test",
          status: 403,
          result: "fail-closed before provider execution",
        }],
      },
    },
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

  it.each([
    "http://127.0.0.1:8548",
    "http://127.42.0.9:8548",
    "http://localhost:8548",
    "http://rpc.localhost:8548",
    "http://[::1]:8548",
  ])("classifies nested loopback RPC evidence as local-fork proof (%s)", (rpcUrl) => {
    const input = baseInput();
    input.verifyArtifacts = [{
      path: "verify-loopback-output.json",
      reports: {
        read: {
          classification: "proven working",
          routes: ["GET /v1/test/:id"],
          evidence: [{ receipt: { diagnostics: { rpcUrl } } }],
        },
      },
    }];

    const read = buildGapReport(input).facets[0].functions[0];

    expect(read.proof).toMatchObject({ localFork: true, baseSepolia: false });
    expect(read.evidence.verifyArtifacts).toEqual([
      expect.objectContaining({
        artifact: "verify-loopback-output.json",
        network: "local-fork",
      }),
    ]);
  });

  it("accepts exact-route fail-closed live-network guard evidence for an admin write", () => {
    const input = baseInput();
    input.httpRegistry.methods["TestFacet.setThing"].classification = "admin";
    input.reviewedApiSurface.methods["TestFacet.setThing"].classification = "admin";
    input.verifyArtifacts = [failClosedGuardArtifact()];

    const report = buildGapReport(input);
    const write = report.facets[0].functions[1];

    expect(write).toMatchObject({
      classification: "ready",
      proof: { baseSepolia: true, localFork: false, workflow: true, negativePath: true },
    });
    expect(write.evidence.verifyArtifacts).toEqual([
      expect.objectContaining({
        artifact: "verify-control-plane-guard-output.json",
        proofKind: "fail-closed-before-provider",
      }),
    ]);
  });

  it("rejects incomplete or mismatched fail-closed live-network guard evidence", () => {
    const invalidGuardCases: Array<{
      name: string;
      mutate: (report: Parameters<typeof buildGapReport>[0]["verifyArtifacts"][number]["reports"][string]) => void;
    }> = [
      { name: "empty evidence", mutate: (report) => { report.evidence = []; } },
      {
        name: "wrong ABI key",
        mutate: (report) => { report.evidence = [{ methodKey: "OtherFacet.setThing", route: "POST /v1/test", status: 403, result: "fail-closed before provider execution" }]; },
      },
      {
        name: "wrong route evidence",
        mutate: (report) => { report.evidence = [{ methodKey: "TestFacet.setThing", route: "POST /v1/other", status: 403, result: "fail-closed before provider execution" }]; },
      },
      {
        name: "non-forbidden status",
        mutate: (report) => { report.evidence = [{ methodKey: "TestFacet.setThing", route: "POST /v1/test", status: 401, result: "fail-closed before provider execution" }]; },
      },
      {
        name: "wrong execution result",
        mutate: (report) => { report.evidence = [{ methodKey: "TestFacet.setThing", route: "POST /v1/test", status: 403, result: "provider execution attempted" }]; },
      },
      { name: "missing live-network marker", mutate: (report) => { delete report.network; } },
      { name: "conflicting final classification", mutate: (report) => { report.finalClassification = "blocked by setup/state"; } },
      { name: "unknown proof kind", mutate: (report) => { report.proofKind = "asserted-without-execution"; } },
    ];

    for (const invalidCase of invalidGuardCases) {
      const input = baseInput();
      input.httpRegistry.methods["TestFacet.setThing"].classification = "admin";
      input.reviewedApiSurface.methods["TestFacet.setThing"].classification = "admin";
      const artifact = failClosedGuardArtifact();
      invalidCase.mutate(artifact.reports.guard);
      input.verifyArtifacts = [artifact];

      const write = buildGapReport(input).facets[0].functions[1];

      expect(write.proof.baseSepolia, invalidCase.name).toBe(false);
      expect(write.classification, invalidCase.name).toBe("unsafe on live network");
      expect(write.evidence.verifyArtifacts, invalidCase.name).toEqual([]);
    }
  });

  it("does not attribute fail-closed guard evidence to a non-admin endpoint", () => {
    const input = baseInput();
    input.verifyArtifacts = [failClosedGuardArtifact()];

    const write = buildGapReport(input).facets[0].functions[1];

    expect(write.proof.baseSepolia).toBe(false);
    expect(write.evidence.verifyArtifacts).toEqual([]);
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
    expect(byName.propose.classification).toBe("needs API guard");
    expect(byName.propose.apiExclusion).toBeNull();
    expect(byName.propose.gaps).toEqual(expect.arrayContaining([
      "missing HTTP registry entry",
      "missing reviewed API surface entry",
    ]));
    expect(report.facets[0].events[0]).toMatchObject({
      classification: "needs indexer proof",
      gaps: expect.arrayContaining(["no event-specific indexer test reference"]),
    });
  });

  it("does not attribute identifier substrings as proof", () => {
    const input = baseInput();
    input.tests = [{
      path: "scripts/local-fork-lock.test.ts",
      content: "it('calls forgetThing, resetThing, and replayThingSet with PaymentFacetHelper and treasuryPriceFixture', () => {})",
    }];
    input.verifyArtifacts = [];

    const report = buildGapReport(input);

    expect(report.facets[0].functions[0].proof.unit).toBe(false);
    expect(report.facets[0].functions[1].proof).toMatchObject({
      unit: false,
      workflow: false,
      negativePath: false,
      economic: false,
    });
    expect(report.facets[0].events[0].proof.unit).toBe(false);
  });

  it("does not attribute weak method names that appear only inside prose", () => {
    const input = baseInput();
    input.tests = [{
      path: "packages/api/src/workflows/unrelated.integration.test.ts",
      content: "it('rejects an unauthorized setThing with unchanged balance', () => {})",
    }];
    input.verifyArtifacts = [];

    const write = buildGapReport(input).facets[0].functions[1];

    expect(write.proof).toMatchObject({ unit: false, workflow: false, negativePath: false });
  });

  it("does not attribute a signature embedded at the end of another signature", () => {
    const input = baseInput();
    input.manifest.facets[0].functions[1] = {
      name: "stake",
      wrapperKey: "stake",
      signature: "stake(uint256)",
      mutability: "nonpayable",
      category: "write",
    };
    const methods = { "TestFacet.stake": endpoint("POST", "/v1/stake", "stake") };
    input.httpRegistry = { methods, events: input.httpRegistry.events };
    input.rpcRegistry = { methods, events: input.rpcRegistry.events };
    input.reviewedApiSurface = { methods, events: input.reviewedApiSurface.events };
    input.tests = [{
      path: "packages/api/src/workflows/request-unstake.integration.test.ts",
      content: "const signature = 'requestUnstake(uint256)';",
    }];
    input.verifyArtifacts = [];

    expect(buildGapReport(input).facets[0].functions[1].proof.unit).toBe(false);
  });

  it("rejects longer route prefixes while allowing exact routes with query strings and fragments", () => {
    const prefixInput = baseInput();
    prefixInput.tests = [{
      path: "packages/api/src/route-prefix.test.ts",
      content: "request('/v1/test/extended'); request('/v1/test-child');",
    }];
    prefixInput.verifyArtifacts = [];

    expect(buildGapReport(prefixInput).facets[0].functions[1].proof.unit).toBe(false);

    const exactInput = baseInput();
    exactInput.tests = [{
      path: "packages/api/src/exact-route.test.ts",
      content: "request('/v1/test?mode=exact'); request('/v1/test#proof');",
    }];
    exactInput.verifyArtifacts = [];

    expect(buildGapReport(exactInput).facets[0].functions[1].proof.unit).toBe(true);
  });

  it("accepts bounded qualified keys, exact signatures, and executable weak references", () => {
    const input = baseInput();
    input.tests = [
      { path: "packages/api/src/key.test.ts", content: "const key = 'TestFacet.getThing';" },
      { path: "packages/api/src/signature.test.ts", content: "const signature = 'setThing(uint256)';" },
      { path: "packages/api/src/identifier.test.ts", content: "setThing();" },
      { path: "packages/indexer/src/event.test.ts", content: "decodeEvent('ThingSet');" },
    ];
    input.verifyArtifacts = [];

    const report = buildGapReport(input);

    expect(report.facets[0].functions[0].evidence.tests).toEqual(["packages/api/src/key.test.ts"]);
    expect(report.facets[0].functions[1].evidence.tests).toEqual([
      "packages/api/src/identifier.test.ts",
      "packages/api/src/signature.test.ts",
    ]);
    expect(report.facets[0].events[0].evidence.tests).toEqual(["packages/indexer/src/event.test.ts"]);
  });

  it("does not attribute incidental identifiers, object fields, or metadata literals", () => {
    const input = baseInput();
    input.manifest.facets[0].functions = [{
      name: "owner",
      wrapperKey: "owner",
      signature: "owner()",
      mutability: "view",
      category: "read",
    }];
    input.manifest.facets[0].events = [];
    input.manifest.totals = { facetCount: 1, functionCount: 1, eventCount: 0 };
    const methods = { "TestFacet.owner": endpoint("POST", "/v1/test/owner", "owner") };
    input.httpRegistry = { methods, events: {} };
    input.rpcRegistry = { methods, events: {} };
    input.reviewedApiSurface = { methods, events: {} };
    input.tests = [{
      path: "packages/api/src/unrelated-owner.test.ts",
      content: [
        "const owner = '0x0000000000000000000000000000000000000001';",
        "const result = { owner };",
        "const outputs = [{ name: 'owner', type: 'address' }];",
      ].join("\n"),
    }];
    input.verifyArtifacts = [];

    expect(buildGapReport(input).facets[0].functions[0].proof.unit).toBe(false);
  });

  it("scopes keyed matrices to known ABI keys declared by supported key properties", () => {
    const input = baseInput();
    input.tests = [{
      path: "packages/api/src/workflows/keyed.integration.test.ts",
      content: [
        "const cases = [",
        "  { key: 'TestFacet.getThing' },",
        "  { methodKey: 'TestFacet.getThing' },",
        "  { eventKey: 'TestFacet.ThingSet' },",
        "];",
        "setThing();",
      ].join("\n"),
    }];
    input.verifyArtifacts = [];

    const report = buildGapReport(input);

    expect(report.facets[0].functions[0].proof.unit).toBe(true);
    expect(report.facets[0].functions[1].proof.unit).toBe(false);
    expect(report.facets[0].events[0].proof.unit).toBe(true);
  });

  it("does not treat the TypeScript symbol keyword as VoiceAssetFacet.symbol evidence", () => {
    const input = baseInput();
    input.manifest.facets[0].functions = [{
      name: "symbol",
      wrapperKey: "symbol",
      signature: "symbol()",
      mutability: "view",
      category: "read",
    }];
    input.manifest.facets[0].events = [];
    input.manifest.totals = { facetCount: 1, functionCount: 1, eventCount: 0 };
    const methods = { "TestFacet.symbol": endpoint("POST", "/v1/test/symbol", "symbol") };
    input.httpRegistry = { methods, events: {} };
    input.rpcRegistry = { methods, events: {} };
    input.reviewedApiSurface = { methods, events: {} };
    input.tests = [{
      path: "scripts/custom-coverage-provider.test.ts",
      content: "type CoverageFiles = Map<string | symbol, unknown>;",
    }];
    input.verifyArtifacts = [];

    expect(buildGapReport(input).facets[0].functions[0].proof.unit).toBe(false);
  });

  it("does not attribute identifiers embedded in another route's kebab-case operation", () => {
    const input = baseInput();
    input.manifest.facets[0].functions = [{
      name: "approve",
      wrapperKey: "approve",
      signature: "approve()",
      mutability: "view",
      category: "read",
    }];
    input.manifest.facets[0].events = [];
    input.manifest.totals = { facetCount: 1, functionCount: 1, eventCount: 0 };
    const methods = {
      "TestFacet.approve": endpoint("POST", "/v1/token/approve", "approve"),
    };
    input.httpRegistry = { methods, events: {} };
    input.rpcRegistry = { methods, events: {} };
    input.reviewedApiSurface = { methods, events: {} };
    input.tests = [{
      path: "packages/api/src/foreign-route.test.ts",
      content: "it('POST /v1/emergency/approve-recovery rejects unauthorized callers', () => {})",
    }];
    input.verifyArtifacts = [];

    const report = buildGapReport(input);

    expect(report.facets[0].functions[0].proof.unit).toBe(false);
    expect(report.facets[0].functions[0].classification).toBe("needs fixture");
  });

  it("marks same-facet overloaded event route collisions as non-ready", () => {
    const input = baseInput();
    input.manifest.facets[0].functions = [];
    input.manifest.facets[0].events = [
      { name: "ThingSet", wrapperKey: "ThingSet(uint256)", signature: "ThingSet(uint256)" },
      { name: "ThingSet", wrapperKey: "ThingSet(bytes32)", signature: "ThingSet(bytes32)" },
    ];
    input.manifest.totals = { facetCount: 1, functionCount: 0, eventCount: 2 };
    const sharedRoute = "/v1/test/events/thing-set/query/test";
    const events = {
      "TestFacet.ThingSet(uint256)": endpoint("POST", sharedRoute, "thingSetUint256EventQuery"),
      "TestFacet.ThingSet(bytes32)": endpoint("POST", sharedRoute, "thingSetBytes32EventQuery"),
    };
    input.httpRegistry = { methods: {}, events };
    input.rpcRegistry = { methods: {}, events };
    input.reviewedApiSurface = { methods: {}, events };
    input.tests = [{
      path: "packages/indexer/src/events.test.ts",
      content: "TestFacet.ThingSet(uint256) TestFacet.ThingSet(bytes32)",
    }];
    input.verifyArtifacts = [];

    const report = buildGapReport(input);
    const expectedGap = `duplicate HTTP route POST ${sharedRoute} shared by event TestFacet.ThingSet(uint256), event TestFacet.ThingSet(bytes32)`;

    expect(report.totals.classificationCounts).toMatchObject({ ready: 0, "needs API guard": 2 });
    for (const item of report.facets[0].events) {
      expect(item).toMatchObject({
        classification: "needs API guard",
        endpoint: { method: "POST", path: sharedRoute },
        proof: { httpRegistry: false, reviewedApiSurface: true, unit: true, indexer: true },
      });
      expect(item.gaps).toContain(expectedGap);
      expect(item.gaps).not.toContain("missing HTTP registry entry");
    }
  });

  it("detects duplicate routes across method and event registry sections", () => {
    const input = baseInput();
    const sharedRoute = "/v1/test";
    input.httpRegistry.events["TestFacet.ThingSet"] = endpoint("POST", sharedRoute, "thingSetEventQuery");
    input.reviewedApiSurface.events["TestFacet.ThingSet"] = endpoint("POST", sharedRoute, "thingSetEventQuery");
    input.verifyArtifacts = [];

    const report = buildGapReport(input);
    const write = report.facets[0].functions[1];
    const eventItem = report.facets[0].events[0];
    const expectedGap = `duplicate HTTP route POST ${sharedRoute} shared by function TestFacet.setThing, event TestFacet.ThingSet`;

    expect(write).toMatchObject({ classification: "needs API guard", proof: { httpRegistry: false } });
    expect(eventItem).toMatchObject({ classification: "needs API guard", proof: { httpRegistry: false } });
    expect(write.gaps).toContain(expectedGap);
    expect(eventItem.gaps).toContain(expectedGap);
  });

  it("does not treat role-oriented payment language as economic proof", () => {
    const input = baseInput();
    input.tests = [{
      path: "scripts/actor-negative-paths-lib.test.ts",
      content: "it('locks payment and treasury price role boundaries', () => setThing())",
    }];
    input.verifyArtifacts = [];

    const report = buildGapReport(input);

    expect(report.facets[0].functions[1].proof).toMatchObject({
      unit: true,
      economic: false,
    });
  });

  it("does not count a matching operation identifier as its own proof keyword", () => {
    const input = baseInput();
    input.httpRegistry.methods["TestFacet.setThing"].operationId = "settlement";
    input.tests = [{
      path: "packages/api/src/settlement.test.ts",
      content: "it('calls the operation', () => settlement())",
    }];
    input.verifyArtifacts = [];

    const report = buildGapReport(input);

    expect(report.facets[0].functions[1].proof).toMatchObject({
      unit: true,
      economic: false,
    });
  });

  it("loads repository-shaped inputs and writes both persistent artifacts", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "api-test-gap-report-"));
    temporaryDirectories.push(tempDir);
    await Promise.all([
      mkdir(path.join(tempDir, "generated/manifests"), { recursive: true }),
      mkdir(path.join(tempDir, "reviewed"), { recursive: true }),
      mkdir(path.join(tempDir, "packages/sample/nested"), { recursive: true }),
      mkdir(path.join(tempDir, "scripts"), { recursive: true }),
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
    await Promise.all([
      writeFile(path.join(tempDir, "scripts/generate-test-roadmap.test.ts"), "getThing ThingSet"),
      writeFile(path.join(tempDir, "scripts/gap-builder-plan.test.ts"), "setThing ThingSet"),
      writeFile(path.join(tempDir, "scripts/api-surface-lib.test.ts"), "getThing setThing ThingSet"),
      writeFile(path.join(tempDir, "scripts/write-invariants-lib.test.ts"), "getThing ThingSet"),
    ]);

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
