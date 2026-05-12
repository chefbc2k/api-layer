import { beforeEach, describe, expect, it, vi } from "vitest";

const readFileMock = vi.fn();

vi.mock("node:fs/promises", () => ({
  readFile: readFileMock,
}));

describe("custom coverage provider", () => {
  beforeEach(() => {
    readFileMock.mockReset();
  });

  it("reads tracked coverage files in numeric order and finishes against the named project", async () => {
    const customProviderModule = await import("./custom-coverage-provider.js");
    const provider = await customProviderModule.default.getProvider() as {
      pendingPromises: Promise<unknown>[];
      coverageFiles: Map<string | symbol, Record<string, Record<string, string>>>;
      ctx: { getProjectByName: (name: string | symbol) => unknown; projects?: unknown[] };
      readCoverageFiles: (callbacks: {
        onFileRead: (coverage: unknown) => void;
        onFinished: (project: unknown, transformMode: string) => Promise<void>;
        onDebug?: (message: string) => void;
      }) => Promise<void>;
      cleanAfterRun: () => Promise<void>;
    };

    provider.pendingPromises = [Promise.resolve("done")];
    provider.coverageFiles = new Map([
      ["project-a", {
        ssr: {
          "test-b": "/tmp/coverage/coverage-10.json",
          "test-a": "/tmp/coverage/coverage-2.json",
        },
        web: {
          "test-c": "/tmp/coverage/coverage-11.json",
        },
      }],
    ]);
    provider.ctx = {
      getProjectByName: vi.fn().mockReturnValue("named-project"),
      projects: ["fallback-project"],
    };

    readFileMock.mockImplementation(async (filename: string) => {
      if (filename.endsWith("coverage-2.json")) {
        return JSON.stringify({ id: 2 });
      }
      if (filename.endsWith("coverage-10.json")) {
        return JSON.stringify({ id: 10 });
      }
      if (filename.endsWith("coverage-11.json")) {
        return JSON.stringify({ id: 11 });
      }
      throw new Error(`unexpected file ${filename}`);
    });

    const onFileRead = vi.fn();
    const onFinished = vi.fn().mockResolvedValue(undefined);
    const onDebug = vi.fn();

    await provider.readCoverageFiles({ onFileRead, onFinished, onDebug });

    expect(provider.pendingPromises).toEqual([]);
    expect(readFileMock.mock.calls.map(([filename]) => filename)).toEqual([
      "/tmp/coverage/coverage-2.json",
      "/tmp/coverage/coverage-10.json",
      "/tmp/coverage/coverage-11.json",
    ]);
    expect(onFileRead.mock.calls.map(([coverage]) => coverage)).toEqual([{ id: 2 }, { id: 10 }, { id: 11 }]);
    expect(onDebug.mock.calls.map(([message]) => message)).toEqual([
      "Reading coverage results 1/3",
      "Reading coverage results 2/3",
      "Reading coverage results 3/3",
    ]);
    expect(onFinished.mock.calls).toEqual([
      ["named-project", "ssr"],
      ["named-project", "web"],
    ]);
  });

  it("falls back to the first project and clears cached coverage files after the run", async () => {
    const customProviderModule = await import("./custom-coverage-provider.js");
    const provider = await customProviderModule.default.getProvider() as {
      pendingPromises: Promise<unknown>[];
      coverageFiles: Map<string | symbol, Record<string, Record<string, string>>>;
      ctx: { getProjectByName: (name: string | symbol) => unknown; projects?: unknown[] };
      readCoverageFiles: (callbacks: {
        onFileRead: (coverage: unknown) => void;
        onFinished: (project: unknown, transformMode: string) => Promise<void>;
      }) => Promise<void>;
      cleanAfterRun: () => Promise<void>;
    };

    provider.pendingPromises = [];
    provider.coverageFiles = new Map([
      ["project-a", {
        browser: {},
        ssr: {},
        web: {},
      }],
    ]);
    provider.ctx = {
      getProjectByName: vi.fn().mockReturnValue(undefined),
      projects: ["fallback-project"],
    };

    const onFinished = vi.fn().mockResolvedValue(undefined);
    await provider.readCoverageFiles({
      onFileRead: vi.fn(),
      onFinished,
    });

    expect(onFinished.mock.calls).toEqual([
      ["fallback-project", "browser"],
      ["fallback-project", "ssr"],
      ["fallback-project", "web"],
    ]);

    await provider.cleanAfterRun();
    expect(provider.coverageFiles.size).toBe(0);
  });
});
