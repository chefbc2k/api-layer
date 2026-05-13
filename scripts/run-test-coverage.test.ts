import { EventEmitter } from "node:events";

import { describe, expect, it, vi } from "vitest";

import {
  buildCoverageEnv,
  discoverCoverageShards,
  coverageVitestArgs,
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

    expect(rmFn).toHaveBeenCalledWith(expect.stringMatching(/\/coverage$/), {
      recursive: true,
      force: true,
    });
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

  it("spawns the monolithic vitest coverage run and exits after success", async () => {
    const spawnFn = vi.fn().mockImplementation(() => {
      const child = new EventEmitter() as EventEmitter & { on: typeof EventEmitter.prototype.on };
      queueMicrotask(() => {
        child.emit("exit", 0, null);
      });
      return child;
    });
    const processExit = vi.fn((code?: number) => {
      throw new Error(`exit:${code}`);
    });

    const runPromise = runCoverage({
      env: { NODE_OPTIONS: "--inspect" },
      mkdirFn: vi.fn().mockResolvedValue(undefined) as any,
      processExit: processExit as any,
      rmFn: vi.fn().mockResolvedValue(undefined) as any,
      spawnFn: spawnFn as any,
    });

    await expect(runPromise).rejects.toThrow("exit:0");

    expect(spawnFn).toHaveBeenCalledWith(
      "pnpm",
      [...coverageVitestArgs],
      expect.objectContaining({
        stdio: "inherit",
        env: {
          API_LAYER_RUN_CONTRACT_INTEGRATION: "0",
          NODE_OPTIONS: expect.stringMatching(/--require .*scripts\/coverage-fs-patch\.cjs --inspect$/),
        },
      }),
    );
    expect(spawnFn).toHaveBeenCalledTimes(1);

  }, 20_000);

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
          return [{ name: "workflows", isDirectory: () => true }, { name: "shared", isDirectory: () => true }] as any;
        }
        if (target.endsWith("/packages/api/src/workflows")) {
          return [
            { name: "alpha.test.ts", isDirectory: () => false },
            { name: "beta.test.ts", isDirectory: () => false },
            { name: "gamma.integration.test.ts", isDirectory: () => false },
          ] as any;
        }
        if (target.endsWith("/packages/api/src/shared")) {
          return [{ name: "delta.test.ts", isDirectory: () => false }] as any;
        }
        throw Object.assign(new Error("missing"), { code: "ENOENT" });
      }) as any;

    await expect(discoverCoverageShards(readdirFn)).resolves.toEqual([
      { name: "workflow-unit-01", files: ["packages/api/src/workflows/alpha.test.ts"] },
      { name: "workflow-unit-02", files: ["packages/api/src/workflows/beta.test.ts"] },
      { name: "workflow-integration-01", files: ["packages/api/src/workflows/gamma.integration.test.ts"] },
      { name: "non-workflow-01", files: ["packages/api/src/shared/delta.test.ts"] },
    ]);
  });
});
