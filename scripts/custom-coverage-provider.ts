import { readdir, readFile } from "node:fs/promises";

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
    const provider = this as IstanbulCoverageProvider & {
      pendingPromises: Promise<unknown>[];
      coverageFilesDirectory: string;
      ctx: {
        getProjectByName?: (name: string) => unknown;
        projects?: unknown[];
      };
    };

    await Promise.all(provider.pendingPromises);
    provider.pendingPromises = [];

    const discoveredFiles = (await readdir(provider.coverageFilesDirectory))
      .filter((entry) => entry.startsWith("coverage-") && entry.endsWith(".json"))
      .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

    callbacks.onDebug?.(`aggregating ${discoveredFiles.length} discovered coverage files from ${provider.coverageFilesDirectory}`);

    for (const entry of discoveredFiles) {
      const filename = `${provider.coverageFilesDirectory}/${entry}`;
      const contents = await readFile(filename, "utf-8");
      callbacks.onFileRead(JSON.parse(contents));
    }

    await callbacks.onFinished(provider.ctx.getProjectByName?.("") ?? provider.ctx.projects?.[0], "ssr");
  }

  override async cleanAfterRun(): Promise<void> {
    this.coverageFiles = new Map();
  }
}

export default {
  ...istanbulModule,
  async getProvider() {
    return new StableIstanbulCoverageProvider();
  },
};
