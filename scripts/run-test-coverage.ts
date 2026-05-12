import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(__dirname, "..");
const coverageDir = path.join(rootDir, "coverage");

export const coverageVitestArgs = [
  "exec",
  "vitest",
  "run",
  "--coverage.enabled",
  "true",
  "--coverage.reporter=text",
  "--maxWorkers",
  "1",
  "--no-file-parallelism",
  "--poolOptions.forks.singleFork",
  "true",
  "--hookTimeout",
  "600000",
  "--teardownTimeout",
  "600000",
] as const;

export type CoverageRuntimeDeps = {
  env?: NodeJS.ProcessEnv;
  mkdirFn?: typeof mkdir;
  processExit?: (code?: number) => never;
  processKill?: typeof process.kill;
  rmFn?: typeof rm;
  spawnFn?: typeof spawn;
};

export async function resetCoverageDir(
  rmFn: typeof rm = rm,
  mkdirFn: typeof mkdir = mkdir,
): Promise<void> {
  await rmFn(coverageDir, { recursive: true, force: true });
  await mkdirFn(coverageDir, { recursive: true });
}

export async function runCoverage({
  env = process.env,
  mkdirFn = mkdir,
  processExit = process.exit,
  processKill = process.kill,
  rmFn = rm,
  spawnFn = spawn,
}: CoverageRuntimeDeps = {}): Promise<void> {
  await resetCoverageDir(rmFn, mkdirFn);

  const child = spawnFn(
    "pnpm",
    [...coverageVitestArgs],
    {
      cwd: rootDir,
      stdio: "inherit",
      env,
    },
  );

  child.on("exit", (code, signal) => {
    if (signal) {
      processKill(process.pid, signal);
      return;
    }
    processExit(code ?? 1);
  });

  child.on("error", (error) => {
    console.error(error);
    processExit(1);
  });
}

export async function main(): Promise<void> {
  await runCoverage();
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  void main();
}
