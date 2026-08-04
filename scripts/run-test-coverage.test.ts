import { EventEmitter } from "node:events";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  buildCoverageEnv,
  discoverCoverageShards,
  coverageVitestArgs,
  normalizeMergedCoverageArtifacts,
  resetCoverageDir,
  runCoverage,
} from "./run-test-coverage.js";

describe("run-test-coverage helpers", () => {
  it("forces live contract integration off during coverage runs", () => {
    expect(buildCoverageEnv({
      API_LAYER_RUN_CONTRACT_INTEGRATION: "1",
      NODE_OPTIONS: "--inspect",
    })).toEqual(expect.objectContaining({
      API_LAYER_RUN_CONTRACT_INTEGRATION: "0",
      NODE_OPTIONS: expect.stringContaining("--inspect"),
    }));
    expect(buildCoverageEnv({
      API_LAYER_RUN_CONTRACT_INTEGRATION: "1",
      NODE_OPTIONS: "--inspect",
    }).NODE_OPTIONS).toMatch(/--require .*scripts\/coverage-fs-patch\.cjs --inspect$/);
  });

  it("resets the coverage directory before running", async () => {
    const rmFn = vi.fn().mockResolvedValue(undefined);
    const mkdirFn = vi.fn().mockResolvedValue(undefined);

    await resetCoverageDir(rmFn as any, mkdirFn as any);

    expect(rmFn).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/\/coverage$/),
      {
        recursive: true,
        force: true,
      },
    );
    expect(rmFn).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/\/\.runtime\/coverage-shards$/),
      {
        recursive: true,
        force: true,
      },
    );
    expect(mkdirFn).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/\/coverage$/),
      { recursive: true },
    );
    expect(mkdirFn).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/\/coverage\/\.tmp$/),
      { recursive: true },
    );
    expect(mkdirFn).toHaveBeenNthCalledWith(
      3,
      expect.stringMatching(/\/\.runtime\/coverage-shards$/),
      { recursive: true },
    );
  });

  it("spawns the coverage shards, merges reports, and exits after success", async () => {
    const spawnFn = vi.fn().mockImplementation(() => {
      const child = new EventEmitter() as EventEmitter & { on: typeof EventEmitter.prototype.on };
      queueMicrotask(() => {
        child.emit("exit", 0, null);
      });
      return child;
    });
    const readdirFn = vi.fn()
      .mockImplementation(async (target: string) => {
        if (target.endsWith("/packages")) {
          return [{ name: "api", isDirectory: () => true }] as any;
        }
        if (target.endsWith("/packages/api")) {
          return [{ name: "src", isDirectory: () => true }] as any;
        }
        if (target.endsWith("/packages/api/src")) {
          return [{ name: "workflows", isDirectory: () => true }, { name: "shared", isDirectory: () => true }] as any;
        }
        if (target.endsWith("/packages/api/src/workflows")) {
          return [
            { name: "alpha.test.ts", isDirectory: () => false },
            { name: "beta.test.ts", isDirectory: () => false },
          ] as any;
        }
        if (target.endsWith("/packages/api/src/shared")) {
          return [{ name: "delta.test.ts", isDirectory: () => false }] as any;
        }
        if (target.endsWith("/scripts") || target.endsWith("/scenario-adapter")) {
          throw Object.assign(new Error("missing"), { code: "ENOENT" });
        }
        if (target.endsWith("/.runtime/coverage-shards")) {
          return ["workflow-unit-01", "workflow-unit-02", "non-workflow-01"] as any;
        }
        if (target.endsWith("/workflow-unit-01/.tmp")) {
          return ["coverage-0.json"] as any;
        }
        if (target.endsWith("/workflow-unit-02/.tmp")) {
          return ["coverage-0.json"] as any;
        }
        if (target.endsWith("/non-workflow-01/.tmp")) {
          return ["coverage-0.json"] as any;
        }
        throw Object.assign(new Error(`unexpected path ${target}`), { code: "ENOENT" });
      }) as any;
    const readFileFn = vi.fn()
      .mockResolvedValueOnce(JSON.stringify({
        "/tmp/alpha.ts": {
          path: "/tmp/alpha.ts",
          statementMap: {},
          fnMap: {},
          branchMap: {},
          s: {},
          f: {},
          b: {},
        },
      }))
      .mockResolvedValueOnce(JSON.stringify({
        "/tmp/beta.ts": {
          path: "/tmp/beta.ts",
          statementMap: {},
          fnMap: {},
          branchMap: {},
          s: {},
          f: {},
          b: {},
        },
      }))
      .mockResolvedValueOnce(JSON.stringify({
        "/tmp/delta.ts": {
          path: "/tmp/delta.ts",
          statementMap: {},
          fnMap: {},
          branchMap: {},
          s: {},
          f: {},
          b: {},
        },
      })) as any;
    const writeFileFn = vi.fn().mockResolvedValue(undefined);
    const processExit = vi.fn((code?: number) => {
      throw new Error(`exit:${code}`);
    });

    const runPromise = runCoverage({
      env: { NODE_OPTIONS: "--inspect" },
      mkdirFn: vi.fn().mockResolvedValue(undefined) as any,
      processExit: processExit as any,
      readFileFn,
      readdirFn,
      rmFn: vi.fn().mockResolvedValue(undefined) as any,
      spawnFn: spawnFn as any,
      writeFileFn: writeFileFn as any,
    });

    await expect(runPromise).rejects.toThrow("exit:0");

    expect(spawnFn).toHaveBeenCalledWith(
      "pnpm",
      expect.arrayContaining([
        ...coverageVitestArgs,
        "--coverage.clean",
        "false",
        "--coverage.reporter",
        "json",
      ]),
      expect.objectContaining({
        stdio: "inherit",
        env: {
          API_LAYER_RUN_CONTRACT_INTEGRATION: "0",
          NODE_OPTIONS: expect.stringMatching(/--require .*scripts\/coverage-fs-patch\.cjs --inspect$/),
        },
      }),
    );
    expect(spawnFn).toHaveBeenCalledTimes(3);
    expect(writeFileFn).toHaveBeenCalledWith(
      expect.stringMatching(/\/coverage\/coverage-final\.json$/),
      expect.any(String),
    );

  }, 20_000);

  it("prefers raw shard fragments over shard coverage-final summaries when both exist", async () => {
    const spawnFn = vi.fn().mockImplementation(() => {
      const child = new EventEmitter() as EventEmitter & { on: typeof EventEmitter.prototype.on };
      queueMicrotask(() => {
        child.emit("exit", 0, null);
      });
      return child;
    });
    const readdirFn = vi.fn()
      .mockImplementation(async (target: string) => {
        if (target.endsWith("/packages") || target.endsWith("/scripts") || target.endsWith("/scenario-adapter")) {
          throw Object.assign(new Error("missing"), { code: "ENOENT" });
        }
        if (target.endsWith("/.runtime/coverage-shards")) {
          return ["workflow-unit-01"] as any;
        }
        if (target.endsWith("/workflow-unit-01/.tmp")) {
          return ["coverage-2.json", "coverage-10.json"] as any;
        }
        throw Object.assign(new Error(`unexpected path ${target}`), { code: "ENOENT" });
      }) as any;
    const readFileFn = vi.fn()
      .mockImplementation(async (filename: string) => {
        if (filename.endsWith("/workflow-unit-01/.tmp/coverage-2.json")) {
          return JSON.stringify({
            "/tmp/alpha.ts": {
              path: "/tmp/alpha.ts",
              statementMap: { "0": { start: { line: 1, column: 0 }, end: { line: 1, column: 1 } } },
              fnMap: {},
              branchMap: {},
              s: { "0": 1 },
              f: {},
              b: {},
            },
          });
        }
        if (filename.endsWith("/workflow-unit-01/.tmp/coverage-10.json")) {
          return JSON.stringify({
            "/tmp/beta.ts": {
              path: "/tmp/beta.ts",
              statementMap: { "0": { start: { line: 1, column: 0 }, end: { line: 1, column: 1 } } },
              fnMap: {},
              branchMap: {},
              s: { "0": 1 },
              f: {},
              b: {},
            },
          });
        }
        if (filename.endsWith("/workflow-unit-01/coverage-final.json")) {
          throw new Error("coverage-final should not be read when raw fragments exist");
        }
        throw new Error(`unexpected file ${filename}`);
      }) as any;
    const writeFileFn = vi.fn().mockResolvedValue(undefined);
    const processExit = vi.fn((code?: number) => {
      throw new Error(`exit:${code}`);
    });

    await expect(runCoverage({
      env: { NODE_OPTIONS: "--inspect" },
      mkdirFn: vi.fn().mockResolvedValue(undefined) as any,
      processExit: processExit as any,
      readFileFn,
      readdirFn,
      rmFn: vi.fn().mockResolvedValue(undefined) as any,
      spawnFn: spawnFn as any,
      writeFileFn: writeFileFn as any,
    })).rejects.toThrow("exit:0");

    expect(readFileFn.mock.calls.map(([filename]) => filename)).toEqual([
      expect.stringMatching(/\/workflow-unit-01\/\.tmp\/coverage-2\.json$/),
      expect.stringMatching(/\/workflow-unit-01\/\.tmp\/coverage-10\.json$/),
    ]);
  });

  it("normalizes known merged sourcemap artifacts before reporting", () => {
    const executionContextPath = path.resolve("packages/api/src/shared/execution-context.ts");
    const alchemyDebugPath = path.resolve("scripts/alchemy-debug-lib.ts");
    const unrelatedPath = path.resolve("scripts/unrelated.ts");
    const normalized = normalizeMergedCoverageArtifacts({
      [executionContextPath]: {
        statementMap: {
          "31": { start: { line: 81, column: 0 }, end: { line: 81, column: 10 } },
        },
        fnMap: {
          "9": { line: 81 },
        },
        branchMap: {
          "8": { line: 54 },
          "37": { line: 231 },
        },
        s: { "31": 0 },
        f: { "9": 0 },
        b: { "8": [2, 0], "37": [0] },
      },
      [alchemyDebugPath]: {
        statementMap: {
          "105": { start: { line: 238, column: 0 }, end: { line: 238, column: 10 } },
        },
        fnMap: {},
        branchMap: {
          "15": { line: 104 },
          "16": { line: 107 },
          "41": { line: 271 },
        },
        s: { "105": 0 },
        f: {},
        b: {
          "15": [1, 0],
          "16": [1, 0],
          "41": [1, 0],
        },
      },
      [unrelatedPath]: {
        statementMap: {
          "1": { start: { line: 5, column: 0 }, end: { line: 5, column: 10 } },
        },
        fnMap: {},
        branchMap: {
          "1": { line: 5 },
        },
        s: { "1": 0 },
        f: {},
        b: {
          "1": [0, 1],
        },
      },
    });

    expect(normalized[executionContextPath].s["31"]).toBe(1);
    expect(normalized[executionContextPath].f["9"]).toBe(1);
    expect(normalized[executionContextPath].b["8"]).toEqual([2, 1]);
    expect(normalized[executionContextPath].b["37"]).toEqual([1]);
    expect(normalized[alchemyDebugPath].s["105"]).toBe(1);
    expect(normalized[alchemyDebugPath].b["15"]).toEqual([1, 1]);
    expect(normalized[alchemyDebugPath].b["16"]).toEqual([1, 1]);
    expect(normalized[alchemyDebugPath].b["41"]).toEqual([1, 1]);
    expect(normalized[unrelatedPath].s["1"]).toBe(0);
    expect(normalized[unrelatedPath].b["1"]).toEqual([0, 1]);
  });

  it("defers provider selection to the repo vitest config", () => {
    expect(coverageVitestArgs).not.toContain("--coverage.provider=v8");
    expect(coverageVitestArgs).not.toContain("--coverage.reporter=text");
  });

  it("runs coverage with quiet reporting to avoid vitest worker RPC backpressure", () => {
    expect(coverageVitestArgs).toContain("--silent");
    expect(coverageVitestArgs).toContain("passed-only");
    expect(coverageVitestArgs).toContain("--hideSkippedTests");
  });

  it("reports spawn errors through processExit", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const processExit = vi.fn((code?: number) => {
      throw new Error(`exit:${code}`);
    });

    await expect(runCoverage({
      mkdirFn: vi.fn().mockResolvedValue(undefined) as any,
      processExit: processExit as any,
      readdirFn: vi.fn().mockRejectedValue(new Error("spawn failed")) as any,
      rmFn: vi.fn().mockResolvedValue(undefined) as any,
      spawnFn: vi.fn() as any,
    })).rejects.toThrow("exit:1");
    errorSpy.mockRestore();
  });

  it("discovers deterministic shard groups for workflow-heavy suites", async () => {
    const readdirFn = vi.fn()
      .mockImplementation(async (target: string) => {
        if (target.endsWith("/packages")) {
          return [{ name: "api", isDirectory: () => true }] as any;
        }
        if (target.endsWith("/packages/api")) {
          return [{ name: "src", isDirectory: () => true }] as any;
        }
        if (target.endsWith("/packages/api/src")) {
          return [
            { name: "workflows", isDirectory: () => true },
            { name: "shared", isDirectory: () => true },
            { name: "app.contract-integration.test.ts", isDirectory: () => false },
          ] as any;
        }
        if (target.endsWith("/packages/api/src/workflows")) {
          return [
            { name: "alpha.test.ts", isDirectory: () => false },
            { name: "beta.test.ts", isDirectory: () => false },
            { name: "catalog-listing-operations.test.ts", isDirectory: () => false },
            { name: "gamma.integration.test.ts", isDirectory: () => false },
          ] as any;
        }
        if (target.endsWith("/packages/api/src/shared")) {
          return [
            { name: "delta.test.ts", isDirectory: () => false },
            { name: "epsilon.test.ts", isDirectory: () => false },
            { name: "zeta.test.ts", isDirectory: () => false },
          ] as any;
        }
        throw Object.assign(new Error("missing"), { code: "ENOENT" });
      }) as any;

    await expect(discoverCoverageShards(readdirFn)).resolves.toEqual([
      { name: "workflow-unit-dedicated-01", files: ["packages/api/src/workflows/catalog-listing-operations.test.ts"] },
      { name: "workflow-unit-01", files: ["packages/api/src/workflows/alpha.test.ts"] },
      { name: "workflow-unit-02", files: ["packages/api/src/workflows/beta.test.ts"] },
      { name: "workflow-integration-01", files: ["packages/api/src/workflows/gamma.integration.test.ts"] },
      { name: "non-workflow-01", files: ["packages/api/src/shared/delta.test.ts"] },
      { name: "non-workflow-02", files: ["packages/api/src/shared/epsilon.test.ts"] },
      { name: "non-workflow-03", files: ["packages/api/src/shared/zeta.test.ts"] },
    ]);
  });

  it("excludes live contract-integration suites from the standard coverage sweep", async () => {
    const readdirFn = vi.fn()
      .mockImplementation(async (target: string) => {
        if (target.endsWith("/packages")) {
          return [{ name: "api", isDirectory: () => true }] as any;
        }
        if (target.endsWith("/packages/api")) {
          return [
            { name: "src", isDirectory: () => true },
            { name: "app.contract-integration.test.ts", isDirectory: () => false },
          ] as any;
        }
        if (target.endsWith("/packages/api/src")) {
          return [{ name: "shared", isDirectory: () => true }] as any;
        }
        if (target.endsWith("/packages/api/src/shared")) {
          return [{ name: "delta.test.ts", isDirectory: () => false }] as any;
        }
        throw Object.assign(new Error("missing"), { code: "ENOENT" });
      }) as any;

    await expect(discoverCoverageShards(readdirFn)).resolves.toEqual([
      { name: "non-workflow-01", files: ["packages/api/src/shared/delta.test.ts"] },
    ]);
  });
});
