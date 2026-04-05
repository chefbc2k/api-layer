import { access, readdir, readFile } from "node:fs/promises";

import istanbulModule from "@vitest/coverage-istanbul";
import { IstanbulCoverageProvider } from "@vitest/coverage-istanbul/dist/provider.js";

class StableIstanbulCoverageProvider extends IstanbulCoverageProvider {
  override async readCoverageFiles(
    callbacks: {
      onFileRead: (coverage: unknown) => void;
      onFinished: (project: unknown, transformMode: string) => Promise<void>;
      onDebug: { enabled?: boolean; (message: string): void };
    },
  ): Promise<void> {
    try {
      await super.readCoverageFiles(callbacks);
      return;
    } catch (error) {
      if (!isMissingCoverageFileError(error)) {
        throw error;
      }
      callbacks.onDebug?.(`coverage file missing during aggregation; falling back to discovered files in ${this.coverageFilesDirectory}`);
    }

    const discoveredFiles = (await readdir(this.coverageFilesDirectory))
      .filter((entry) => entry.startsWith("coverage-") && entry.endsWith(".json"))
      .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

    for (const entry of discoveredFiles) {
      const filename = `${this.coverageFilesDirectory}/${entry}`;
      try {
        await access(filename);
      } catch {
        continue;
      }
      const contents = await readFile(filename, "utf-8");
      callbacks.onFileRead(JSON.parse(contents));
    }

    await callbacks.onFinished(this.ctx.getProjectByName?.("") ?? this.ctx.projects?.[0], "ssr");
  }

  override async cleanAfterRun(): Promise<void> {
    this.coverageFiles = new Map();
  }
}

function isMissingCoverageFileError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const record = error as { code?: unknown; path?: unknown };
  return record.code === "ENOENT" && typeof record.path === "string" && record.path.includes("/coverage/.tmp/coverage-");
}

export default {
  ...istanbulModule,
  async getProvider() {
    return new StableIstanbulCoverageProvider();
  },
};
