import { EventEmitter } from "node:events";

import { describe, expect, it, vi } from "vitest";

import {
  coverageVitestArgs,
  resetCoverageDir,
  runCoverage,
} from "./run-test-coverage.js";

describe("run-test-coverage helpers", () => {
  it("resets the coverage directory before running", async () => {
    const rmFn = vi.fn().mockResolvedValue(undefined);
    const mkdirFn = vi.fn().mockResolvedValue(undefined);

    await resetCoverageDir(rmFn as any, mkdirFn as any);

    expect(rmFn).toHaveBeenCalledOnce();
    expect(mkdirFn).toHaveBeenCalledTimes(2);
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
        env: { NODE_OPTIONS: "--inspect" },
      }),
    );

    expect(() => child.emit("exit", 0, null)).toThrow("exit:0");
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
