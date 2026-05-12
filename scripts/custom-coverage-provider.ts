import { readFile } from "node:fs/promises";

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
      coverageFiles: Map<
        string | symbol,
        Record<string, Record<string, string>>
      >;
      ctx: {
        getProjectByName: (name: string | symbol) => unknown;
        projects?: unknown[];
      };
    };

    await Promise.all(provider.pendingPromises);
    provider.pendingPromises = [];
    const total = Array.from(provider.coverageFiles.values()).reduce((count, coveragePerProject) => {
      return count + Object.values(coveragePerProject).reduce((transformCount, coverageByTestfiles) => {
        return transformCount + Object.keys(coverageByTestfiles).length;
      }, 0);
    }, 0);

    let index = 0;
    for (const [projectName, coveragePerProject] of provider.coverageFiles.entries()) {
      for (const [transformMode, coverageByTestfiles] of Object.entries(coveragePerProject)) {
        const filenames = Object.values(coverageByTestfiles)
          .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
        const project = provider.ctx.getProjectByName(projectName) ?? provider.ctx.projects?.[0];

        for (const filename of filenames) {
          index += 1;
          callbacks.onDebug?.(`Reading coverage results ${index}/${total}`);
          const contents = await readFile(filename, "utf-8");
          callbacks.onFileRead(JSON.parse(contents));
        }

        await callbacks.onFinished(project, transformMode);
      }
    }
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
