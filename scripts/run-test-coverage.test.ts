import { EventEmitter } from "node:events";

import { describe, expect, it, vi } from "vitest";

import {
  buildCoverageNodeOptions,
  coverageVitestArgs,
  ensureCoverageTmpDir,
  resetCoverageDir,
  runCoverage,
} from "./run-test-coverage.js";

describe("run-test-coverage helpers", () => {
  it("prepends the fs patch to node options", () => {
    expect(buildCoverageNodeOptions(undefined)).toContain("coverage-fs-patch.cjs");
    expect(buildCoverageNodeOptions("--inspect")).toContain("--inspect");
  });

  it("resets the coverage directory before running", async () => {
    const rmFn = vi.fn().mockResolvedValue(undefined);
    const mkdirFn = vi.fn().mockResolvedValue(undefined);

    await resetCoverageDir(rmFn as any, mkdirFn as any);

    expect(rmFn).toHaveBeenCalledOnce();
    expect(mkdirFn).toHaveBeenCalledOnce();
  });

  it("ignores missing parent directory races when ensuring the temp dir", async () => {
    const mkdirFn = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error("missing"), { code: "ENOENT" }))
      .mockResolvedValue(undefined);

    await expect(ensureCoverageTmpDir(mkdirFn as any)).resolves.toBeUndefined();
    await expect(ensureCoverageTmpDir(mkdirFn as any)).resolves.toBeUndefined();
  });

  it("spawns vitest with coverage args and exits with the child code", async () => {
    const child = new EventEmitter() as EventEmitter & { on: typeof EventEmitter.prototype.on };
    const spawnFn = vi.fn().mockReturnValue(child);
    const clearIntervalFn = vi.fn();
    const setIntervalFn = vi.fn().mockReturnValue(77);
    const processExit = vi.fn((code?: number) => {
      throw new Error(`exit:${code}`);
    });

    await runCoverage({
      clearIntervalFn,
      env: { NODE_OPTIONS: "--inspect" },
      mkdirFn: vi.fn().mockResolvedValue(undefined) as any,
      processExit: processExit as any,
      rmFn: vi.fn().mockResolvedValue(undefined) as any,
      setIntervalFn: setIntervalFn as any,
      spawnFn: spawnFn as any,
    });

    expect(spawnFn).toHaveBeenCalledWith(
      "pnpm",
      [...coverageVitestArgs],
      expect.objectContaining({
        stdio: "inherit",
        env: expect.objectContaining({
          NODE_OPTIONS: expect.stringContaining("--inspect"),
        }),
      }),
    );

    expect(() => child.emit("exit", 0, null)).toThrow("exit:0");
    expect(clearIntervalFn).toHaveBeenCalledWith(77);
  });

  it("forwards child signals to process.kill", async () => {
    const child = new EventEmitter() as EventEmitter & { on: typeof EventEmitter.prototype.on };
    const processKill = vi.fn();

    await runCoverage({
      mkdirFn: vi.fn().mockResolvedValue(undefined) as any,
      processExit: vi.fn() as any,
      processKill: processKill as any,
      rmFn: vi.fn().mockResolvedValue(undefined) as any,
      setIntervalFn: vi.fn().mockReturnValue(12) as any,
      spawnFn: vi.fn().mockReturnValue(child) as any,
    });

    child.emit("exit", null, "SIGTERM");
    expect(processKill).toHaveBeenCalledWith(process.pid, "SIGTERM");
  });

  it("reports spawn errors through processExit", async () => {
    const child = new EventEmitter() as EventEmitter & { on: typeof EventEmitter.prototype.on };
    const clearIntervalFn = vi.fn();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const processExit = vi.fn((code?: number) => {
      throw new Error(`exit:${code}`);
    });

    await runCoverage({
      clearIntervalFn,
      mkdirFn: vi.fn().mockResolvedValue(undefined) as any,
      processExit: processExit as any,
      rmFn: vi.fn().mockResolvedValue(undefined) as any,
      setIntervalFn: vi.fn().mockReturnValue(9) as any,
      spawnFn: vi.fn().mockReturnValue(child) as any,
    });

    expect(() => child.emit("error", new Error("spawn failed"))).toThrow("exit:1");
    expect(clearIntervalFn).toHaveBeenCalledWith(9);
    errorSpy.mockRestore();
  });

  it("treats an empty NODE_OPTIONS string like an unset value", () => {
    expect(buildCoverageNodeOptions("")).toMatch(/^--require=/);
    expect(buildCoverageNodeOptions("   ")).toMatch(/^--require=/);
  });
});
