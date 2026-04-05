import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const rootDir = path.resolve(__dirname, "..");
const coverageDir = path.join(rootDir, "coverage");
const coverageTmpDir = path.join(coverageDir, ".tmp");
const coverageFsPatch = path.join(rootDir, "scripts", "coverage-fs-patch.cjs");

async function resetCoverageDir(): Promise<void> {
  await rm(coverageDir, { recursive: true, force: true });
  await mkdir(coverageTmpDir, { recursive: true });
}

async function ensureCoverageTmpDir(): Promise<void> {
  await mkdir(coverageTmpDir, { recursive: true });
}

async function main(): Promise<void> {
  await resetCoverageDir();
  const keeper = setInterval(() => {
    void ensureCoverageTmpDir();
  }, 50);
  const existingNodeOptions = process.env.NODE_OPTIONS?.trim();
  const preloadFlag = `--require=${coverageFsPatch}`;
  const nodeOptions = existingNodeOptions ? `${preloadFlag} ${existingNodeOptions}` : preloadFlag;

  const child = spawn(
    "pnpm",
    [
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
    ],
    {
      cwd: rootDir,
      stdio: "inherit",
      env: {
        ...process.env,
        NODE_OPTIONS: nodeOptions,
      },
    },
  );

  child.on("exit", (code, signal) => {
    clearInterval(keeper);
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });

  child.on("error", (error) => {
    clearInterval(keeper);
    console.error(error);
    process.exit(1);
  });
}

void main();
