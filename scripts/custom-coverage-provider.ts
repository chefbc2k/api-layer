import { readFile } from "node:fs/promises";

import istanbulModule from "@vitest/coverage-istanbul";
import { IstanbulCoverageProvider } from "@vitest/coverage-istanbul/dist/provider.js";

function isRetryableCoverageReadError(error: unknown): boolean {
  if (error && typeof error === "object" && "code" in error && (error as { code?: unknown }).code === "ENOENT") {
    return true;
  }
  if (!(error instanceof SyntaxError)) {
    return false;
  }
  return error.message.includes("Unexpected end of JSON input")
    || error.message.includes("Unterminated string")
    || error.message.includes("Unterminated fractional number")
    || error.message.includes("Expected ',' or '}'");
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function readCoverageJson(filename: string): Promise<unknown> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const contents = await readFile(filename, "utf-8");
      return JSON.parse(contents);
    } catch (error) {
      if (!isRetryableCoverageReadError(error) || attempt === 39) {
        throw error;
      }
      await sleep(50);
    }
  }
  throw new Error(`unreachable coverage read state for ${filename}`);
}

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
          callbacks.onFileRead(await readCoverageJson(filename));
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
