import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  assertRunnerSafety,
  buildLocalForkProofPlan,
  collectStructuredGaps,
  parseLocalForkCliOptions,
  runProofStages,
  summarizeReviewedSurface,
  type ProofStage,
} from "./verify-local-fork-lib.js";
import { fixtureValue } from "./verify-local-fork-safe-read-values.js";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("local-fork CLI and safety guards", () => {
  it("defaults to a local runtime report and parses explicit live acknowledgements", () => {
    expect(parseLocalForkCliOptions([])).toEqual({
      outputPath: path.join(".runtime", "local-fork-assurance-report.json"),
      allowLive: false,
      allowLiveDestructive: false,
      continueOnGap: false,
    });
    expect(parseLocalForkCliOptions([
      "--",
      "--output",
      "proof.json",
      "--allow-live",
      "--allow-live-destructive",
      "--continue-on-gap",
    ])).toEqual({
      outputPath: "proof.json",
      allowLive: true,
      allowLiveDestructive: true,
      continueOnGap: true,
    });
    expect(() => parseLocalForkCliOptions(["--unknown"])).toThrow("unknown option");
    expect(() => parseLocalForkCliOptions(["--output"])).toThrow("requires a value");
  });

  it("allows loopback by default and requires two explicit flags for destructive live stages", () => {
    const stages = buildLocalForkProofPlan();
    expect(assertRunnerSafety("http://127.0.0.1:8548", { allowLive: false, allowLiveDestructive: false }, stages)).toBe("local-fork");
    expect(() => assertRunnerSafety("https://sepolia.base.org", { allowLive: false, allowLiveDestructive: false }, stages)).toThrow("--allow-live");
    expect(() => assertRunnerSafety("https://sepolia.base.org", { allowLive: true, allowLiveDestructive: false }, stages)).toThrow("both --allow-live");
    expect(assertRunnerSafety("https://sepolia.base.org", { allowLive: true, allowLiveDestructive: true }, stages)).toBe("live");
    expect(assertRunnerSafety(
      "https://sepolia.base.org",
      { allowLive: true, allowLiveDestructive: false },
      stages.filter((stage) => !stage.destructive),
    )).toBe("live");
  });
});

describe("local-fork proof planning and reporting", () => {
  it("contains deterministic inventory, fixture, read, write, and lifecycle stages", () => {
    const plan = buildLocalForkProofPlan();
    expect(plan.map((stage) => stage.id)).toEqual([
      "generate-inventory",
      "provision-fixtures",
      "http-contract-proof",
      "probe-safe-reads",
      "layer1-core-proof",
      "layer1-completion-proof",
      "layer1-remaining-proof",
      "marketplace-purchase-proof",
      "governance-proof",
    ]);
    expect(plan.filter((stage) => stage.destructive).length).toBeGreaterThan(0);
    expect(plan.find((stage) => stage.id === "probe-safe-reads")?.artifactPath).toContain("safe-reads.json");
  });

  it("executes sequentially, captures artifacts, and stops at the first failure by default", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "local-fork-runner-"));
    tempDirs.push(dir);
    const artifactPath = path.join(dir, "nested", "proof.json");
    const stages: ProofStage[] = [
      { id: "one", description: "one", command: "test", args: [], destructive: false, artifactPath },
      { id: "two", description: "two", command: "test", args: [], destructive: true },
      { id: "three", description: "three", command: "test", args: [], destructive: false },
    ];
    const seen: string[] = [];
    const results = await runProofStages({
      stages,
      env: {},
      continueOnGap: false,
      execute: async (stage) => {
        seen.push(stage.id);
        if (stage.id === "one") {
          fs.writeFileSync(artifactPath, JSON.stringify({ summary: "proven working" }));
        }
        return { exitCode: stage.id === "two" ? 2 : 0, stdout: "x".repeat(5_000), stderr: "failure" };
      },
    });
    expect(seen).toEqual(["one", "two"]);
    expect(fs.existsSync(path.dirname(artifactPath))).toBe(true);
    expect(results[0].artifact).toEqual({ summary: "proven working" });
    expect(results[0].attemptCount).toBe(1);
    expect(results[0].stdoutTail).toHaveLength(4_000);
    expect(results[1].status).toBe("failed");
  });

  it("normalizes command, artifact, and safe-read gaps", () => {
    const plan = buildLocalForkProofPlan();
    const base = plan[0];
    const gaps = collectStructuredGaps([
      { ...base, status: "failed", exitCode: 1, attemptCount: 1, stdoutTail: "", stderrTail: "boom", artifact: null },
      {
        ...plan.find((stage) => stage.id === "probe-safe-reads")!,
        status: "passed",
        exitCode: 0,
        attemptCount: 1,
        stdoutTail: "",
        stderrTail: "",
        artifact: { gaps: [{ methodKey: "Facet.read", route: "GET /read", classification: "needs fixture", detail: "missing id" }] },
      },
      {
        ...plan.find((stage) => stage.id === "governance-proof")!,
        status: "passed",
        exitCode: 0,
        attemptCount: 1,
        stdoutTail: "",
        stderrTail: "",
        artifact: { summary: "blocked by setup/state" },
      },
    ]);
    expect(gaps.map((gap) => gap.classification)).toEqual(["runner failure", "needs fixture", "proof gap"]);
  });

  it("summarizes read, regular write, admin write, and event inventory", () => {
    expect(summarizeReviewedSurface({
      methods: {
        read: { rateLimitKind: "read", classification: "query" },
        write: { rateLimitKind: "write", classification: "command" },
        admin: { rateLimitKind: "write", classification: "admin" },
      },
      events: { Event: {} },
    })).toEqual({
      methodCount: 3,
      safeReadCount: 1,
      fixtureCandidateWriteCount: 1,
      adminWriteCount: 1,
      eventCount: 1,
    });
  });
});

describe("safe-read fixture values", () => {
  const fixture = {
    actors: {
      founder: { address: "0x0000000000000000000000000000000000000001" },
      seller: { address: "0x0000000000000000000000000000000000000002" },
      licensee: { address: "0x0000000000000000000000000000000000000003" },
    },
    marketplace: {
      agedListingFixture: {
        voiceHash: `0x${"ab".repeat(32)}`,
        tokenId: "42",
        listing: { readback: { payload: { price: "1000" } } },
      },
    },
  };

  it("builds deterministic scalar, array, and tuple values from fixtures", () => {
    expect(fixtureValue({ name: "owner", type: "address" }, fixture, 99, 123)).toBe(fixture.actors.seller.address);
    expect(fixtureValue({ name: "tokenId", type: "uint256" }, fixture, 99, 123)).toBe("42");
    expect(fixtureValue({ name: "blockNumber", type: "uint256" }, fixture, 99, 123)).toBe("99");
    expect(fixtureValue({ name: "voiceHash", type: "bytes32" }, fixture, 99, 123)).toBe(fixture.marketplace.agedListingFixture.voiceHash);
    expect(fixtureValue({ name: "beneficiaries", type: "address[]" }, fixture, 99, 123)).toEqual([fixture.actors.founder.address]);
    expect(fixtureValue({
      name: "query",
      type: "tuple",
      components: [
        { name: "enabled", type: "bool" },
        { name: "at", type: "uint64" },
      ],
    }, fixture, 99, 123)).toEqual({ enabled: false, at: "0" });
  });
});
