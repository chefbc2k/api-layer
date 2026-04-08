import { beforeEach, describe, expect, it, vi } from "vitest";

const readdirMock = vi.fn();
const readFileMock = vi.fn();

vi.mock("node:fs/promises", () => ({
  readdir: readdirMock,
  readFile: readFileMock,
}));

describe("custom coverage provider", () => {
  beforeEach(() => {
    readdirMock.mockReset();
    readFileMock.mockReset();
  });

  it("aggregates discovered coverage files in numeric order and finishes against the named project", async () => {
    const customProviderModule = await import("./custom-coverage-provider.js");
    const provider = await customProviderModule.default.getProvider() as {
      pendingPromises: Promise<unknown>[];
      coverageFilesDirectory: string;
      ctx: { getProjectByName?: (name: string) => unknown; projects?: unknown[] };
      readCoverageFiles: (callbacks: {
        onFileRead: (coverage: unknown) => void;
        onFinished: (project: unknown, transformMode: string) => Promise<void>;
        onDebug?: (message: string) => void;
      }) => Promise<void>;
      cleanAfterRun: () => Promise<void>;
      coverageFiles: Map<string, unknown>;
    };

    provider.pendingPromises = [Promise.resolve("done")];
    provider.coverageFilesDirectory = "/tmp/coverage";
    provider.ctx = {
      getProjectByName: vi.fn().mockReturnValue("named-project"),
      projects: ["fallback-project"],
    };

    readdirMock.mockResolvedValue(["notes.txt", "coverage-10.json", "coverage-2.json"]);
    readFileMock.mockImplementation(async (filename: string) => {
      if (filename.endsWith("coverage-2.json")) {
        return JSON.stringify({ id: 2 });
      }
      if (filename.endsWith("coverage-10.json")) {
        return JSON.stringify({ id: 10 });
      }
      throw new Error(`unexpected file ${filename}`);
    });

    const onFileRead = vi.fn();
    const onFinished = vi.fn().mockResolvedValue(undefined);
    const onDebug = vi.fn();

    await provider.readCoverageFiles({ onFileRead, onFinished, onDebug });

    expect(provider.pendingPromises).toEqual([]);
    expect(readdirMock).toHaveBeenCalledWith("/tmp/coverage");
    expect(readFileMock.mock.calls.map(([filename]) => filename)).toEqual([
      "/tmp/coverage/coverage-2.json",
      "/tmp/coverage/coverage-10.json",
    ]);
    expect(onFileRead.mock.calls.map(([coverage]) => coverage)).toEqual([{ id: 2 }, { id: 10 }]);
    expect(onDebug).toHaveBeenCalledWith("aggregating 2 discovered coverage files from /tmp/coverage");
    expect(onFinished).toHaveBeenCalledWith("named-project", "ssr");
  });

  it("falls back to the first project and clears cached coverage files after the run", async () => {
    const customProviderModule = await import("./custom-coverage-provider.js");
    const provider = await customProviderModule.default.getProvider() as {
      pendingPromises: Promise<unknown>[];
      coverageFilesDirectory: string;
      ctx: { getProjectByName?: (name: string) => unknown; projects?: unknown[] };
      readCoverageFiles: (callbacks: {
        onFileRead: (coverage: unknown) => void;
        onFinished: (project: unknown, transformMode: string) => Promise<void>;
      }) => Promise<void>;
      cleanAfterRun: () => Promise<void>;
      coverageFiles: Map<string, unknown>;
    };

    provider.pendingPromises = [];
    provider.coverageFilesDirectory = "/tmp/coverage";
    provider.ctx = { projects: ["fallback-project"] };
    provider.coverageFiles = new Map([["stale", { ok: true }]]);

    readdirMock.mockResolvedValue([]);

    const onFinished = vi.fn().mockResolvedValue(undefined);
    await provider.readCoverageFiles({
      onFileRead: vi.fn(),
      onFinished,
    });

    expect(onFinished).toHaveBeenCalledWith("fallback-project", "ssr");

    await provider.cleanAfterRun();
    expect(provider.coverageFiles.size).toBe(0);
  });
});
