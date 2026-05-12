import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(__dirname, "..");
const coverageDir = path.join(rootDir, "coverage");
const coverageTmpDir = path.join(coverageDir, ".tmp");

export const coverageVitestArgs = [
  "exec",
  "vitest",
  "run",
  "--coverage.enabled",
  "true",
  "--coverage.provider=v8",
  "--coverage.reporter=text",
  "--maxWorkers",
  "1",
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

export function buildCoverageEnv(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  return {
    ...env,
    API_LAYER_RUN_CONTRACT_INTEGRATION: "0",
  };
}

export async function resetCoverageDir(
  rmFn: typeof rm = rm,
  mkdirFn: typeof mkdir = mkdir,
): Promise<void> {
  await rmFn(coverageDir, { recursive: true, force: true });
  await mkdirFn(coverageDir, { recursive: true });
  await mkdirFn(coverageTmpDir, { recursive: true });
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
  const coverageEnv = buildCoverageEnv(env);

  const child = spawnFn(
    "pnpm",
    [...coverageVitestArgs],
    {
      cwd: rootDir,
      stdio: "inherit",
      env: coverageEnv,
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
