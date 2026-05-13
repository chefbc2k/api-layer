import { EventEmitter } from "node:events";

import { describe, expect, it, vi } from "vitest";

import {
  buildCoverageEnv,
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
  });

  it("spawns vitest with coverage args and exits with the child code", async () => {
    const child = new EventEmitter() as EventEmitter & { on: typeof EventEmitter.prototype.on };
    const spawnFn = vi.fn().mockReturnValue(child);
    const processExit = vi.fn((code?: number) => {
      throw new Error(`exit:${code}`);
    });

    await runCoverage({
      env: { NODE_OPTIONS: "--inspect" },
      mkdirFn: vi.fn().mockResolvedValue(undefined) as any,
      processExit: processExit as any,
      rmFn: vi.fn().mockResolvedValue(undefined) as any,
      spawnFn: spawnFn as any,
    });

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

    expect(() => child.emit("exit", 0, null)).toThrow("exit:0");
  });

  it("defers provider selection to the repo vitest config", () => {
    expect(coverageVitestArgs).not.toContain("--coverage.provider=v8");
    expect(coverageVitestArgs).not.toContain("--coverage.reporter=text");
  });

  it("runs coverage with quiet reporting to avoid vitest worker RPC backpressure", () => {
    expect(coverageVitestArgs).toContain("--silent");
    expect(coverageVitestArgs).toContain("passed-only");
    expect(coverageVitestArgs).toContain("--reporter");
    expect(coverageVitestArgs).toContain("basic");
    expect(coverageVitestArgs).toContain("--hideSkippedTests");
  });

  it("forwards child signals to process.kill", async () => {
    const child = new EventEmitter() as EventEmitter & { on: typeof EventEmitter.prototype.on };
    const processKill = vi.fn();

    await runCoverage({
      mkdirFn: vi.fn().mockResolvedValue(undefined) as any,
      processExit: vi.fn() as any,
      processKill: processKill as any,
      rmFn: vi.fn().mockResolvedValue(undefined) as any,
      spawnFn: vi.fn().mockReturnValue(child) as any,
    });

    child.emit("exit", null, "SIGTERM");
    expect(processKill).toHaveBeenCalledWith(process.pid, "SIGTERM");
  });

  it("falls back to exit code 1 when the child exits without a code or signal", async () => {
    const child = new EventEmitter() as EventEmitter & { on: typeof EventEmitter.prototype.on };
    const processExit = vi.fn((code?: number) => {
      throw new Error(`exit:${code}`);
    });

    await runCoverage({
      mkdirFn: vi.fn().mockResolvedValue(undefined) as any,
      processExit: processExit as any,
      rmFn: vi.fn().mockResolvedValue(undefined) as any,
      spawnFn: vi.fn().mockReturnValue(child) as any,
    });

    expect(() => child.emit("exit", null, null)).toThrow("exit:1");
  });

  it("reports spawn errors through processExit", async () => {
    const child = new EventEmitter() as EventEmitter & { on: typeof EventEmitter.prototype.on };
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const processExit = vi.fn((code?: number) => {
      throw new Error(`exit:${code}`);
    });

    await runCoverage({
      mkdirFn: vi.fn().mockResolvedValue(undefined) as any,
      processExit: processExit as any,
      rmFn: vi.fn().mockResolvedValue(undefined) as any,
      spawnFn: vi.fn().mockReturnValue(child) as any,
    });

    expect(() => child.emit("error", new Error("spawn failed"))).toThrow("exit:1");
    errorSpy.mockRestore();
  });
});
