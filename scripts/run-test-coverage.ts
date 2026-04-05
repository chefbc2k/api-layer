import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(__dirname, "..");
const coverageDir = path.join(rootDir, "coverage");
const coverageTmpDir = path.join(coverageDir, ".tmp");
const coverageFsPatch = path.join(rootDir, "scripts", "coverage-fs-patch.cjs");

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
  "60000",
  "--teardownTimeout",
  "60000",
] as const;

export type CoverageRuntimeDeps = {
  clearIntervalFn?: typeof clearInterval;
  env?: NodeJS.ProcessEnv;
  keepAliveMs?: number;
  mkdirFn?: typeof mkdir;
  processExit?: (code?: number) => never;
  processKill?: typeof process.kill;
  rmFn?: typeof rm;
  setIntervalFn?: typeof setInterval;
  spawnFn?: typeof spawn;
};

export async function resetCoverageDir(
  rmFn: typeof rm = rm,
  mkdirFn: typeof mkdir = mkdir,
): Promise<void> {
  await rmFn(coverageDir, { recursive: true, force: true });
  await mkdirFn(coverageTmpDir, { recursive: true });
}

export async function ensureCoverageTmpDir(
  mkdirFn: typeof mkdir = mkdir,
): Promise<void> {
  try {
    await mkdirFn(coverageTmpDir, { recursive: true });
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) {
      throw error;
    }
  }
}

export function buildCoverageNodeOptions(existingNodeOptions = process.env.NODE_OPTIONS?.trim()): string {
  const preloadFlag = `--require=${coverageFsPatch}`;
  return existingNodeOptions ? `${preloadFlag} ${existingNodeOptions}` : preloadFlag;
}

export async function runCoverage({
  clearIntervalFn = clearInterval,
  env = process.env,
  keepAliveMs = 50,
  mkdirFn = mkdir,
  processExit = process.exit,
  processKill = process.kill,
  rmFn = rm,
  setIntervalFn = setInterval,
  spawnFn = spawn,
}: CoverageRuntimeDeps = {}): Promise<void> {
  await resetCoverageDir(rmFn, mkdirFn);
  const keeper = setIntervalFn(() => {
    void ensureCoverageTmpDir(mkdirFn);
  }, keepAliveMs);
  const nodeOptions = buildCoverageNodeOptions(env.NODE_OPTIONS?.trim());

  const child = spawnFn(
    "pnpm",
    [...coverageVitestArgs],
    {
      cwd: rootDir,
      stdio: "inherit",
      env: {
        ...env,
        NODE_OPTIONS: nodeOptions,
      },
    },
  );

  child.on("exit", (code, signal) => {
    clearIntervalFn(keeper);
    if (signal) {
      processKill(process.pid, signal);
      return;
    }
    processExit(code ?? 1);
  });

  child.on("error", (error) => {
    clearIntervalFn(keeper);
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
