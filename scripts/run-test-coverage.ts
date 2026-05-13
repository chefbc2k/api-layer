import { readdir, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(__dirname, "..");
const coverageDir = path.join(rootDir, "coverage");
const coverageTmpDir = path.join(coverageDir, ".tmp");
const coverageShardDir = path.join(rootDir, ".runtime", "coverage-shards");
const require = createRequire(import.meta.url);
const testRoots = [
  path.join(rootDir, "packages"),
  path.join(rootDir, "scripts"),
  path.join(rootDir, "scenario-adapter"),
] as const;

export const coverageVitestArgs = [
  "exec",
  "vitest",
  "run",
  "--coverage.enabled",
  "true",
  "--silent",
  "passed-only",
  "--hideSkippedTests",
  "--maxWorkers",
  "1",
  "--hookTimeout",
  "600000",
  "--teardownTimeout",
  "600000",
] as const;

export type CoverageShard = {
  name: string;
  files: string[];
};

export type CoverageRuntimeDeps = {
  env?: NodeJS.ProcessEnv;
  mkdirFn?: typeof mkdir;
  processExit?: (code?: number) => never;
  processKill?: typeof process.kill;
  readFileFn?: typeof readFile;
  readdirFn?: typeof readdir;
  rmFn?: typeof rm;
  spawnFn?: typeof spawn;
  writeFileFn?: typeof writeFile;
};

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error;
}

export function buildCoverageEnv(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const patchPath = path.join(rootDir, "scripts", "coverage-fs-patch.cjs");
  const nodeOptions = env.NODE_OPTIONS?.trim();
  const patchOption = `--require ${patchPath}`;

  return {
    ...env,
    API_LAYER_RUN_CONTRACT_INTEGRATION: "0",
    NODE_OPTIONS: nodeOptions ? `${patchOption} ${nodeOptions}` : patchOption,
  };
}

export async function resetCoverageDir(
  rmFn: typeof rm = rm,
  mkdirFn: typeof mkdir = mkdir,
): Promise<void> {
  await rmFn(coverageDir, { recursive: true, force: true });
  await mkdirFn(coverageDir, { recursive: true });
  await mkdirFn(coverageTmpDir, { recursive: true });
  await mkdirFn(coverageShardDir, { recursive: true });
}

function shardArgs(shard: CoverageShard): string[] {
  return [
    ...coverageVitestArgs,
    "--coverage.clean",
    "false",
    "--coverage.reporter",
    "json",
    "--coverage.reportsDirectory",
    path.join(coverageShardDir, shard.name),
    ...shard.files,
  ];
}

function splitIntoShards(files: string[], shardCount: number, prefix: string): CoverageShard[] {
  if (files.length === 0) {
    return [];
  }
  const normalizedShardCount = Math.max(1, Math.min(shardCount, files.length));
  const shards = Array.from({ length: normalizedShardCount }, (_, index) => ({
    name: `${prefix}-${String(index + 1).padStart(2, "0")}`,
    files: [] as string[],
  }));
  files.forEach((file, index) => {
    shards[index % normalizedShardCount].files.push(file);
  });
  return shards;
}

async function collectTestFiles(
  readdirFn: typeof readdir = readdir,
  currentPath: string,
): Promise<string[]> {
  const entries = await readdirFn(currentPath, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const entryPath = path.join(currentPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectTestFiles(readdirFn, entryPath));
      continue;
    }
    if (entryPath.endsWith(".test.ts")) {
      files.push(path.relative(rootDir, entryPath));
    }
  }
  return files;
}

export async function discoverCoverageShards(
  readdirFn: typeof readdir = readdir,
): Promise<CoverageShard[]> {
  const discovered = (await Promise.all(testRoots.map(async (root) => {
    try {
      return await collectTestFiles(readdirFn, root);
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError?.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }))).flat().sort((left, right) => left.localeCompare(right));

  const workflowUnit = discovered.filter((file) => file.includes("packages/api/src/workflows/") && !file.includes(".integration."));
  const workflowIntegration = discovered.filter((file) => file.includes("packages/api/src/workflows/") && file.includes(".integration."));
  const everythingElse = discovered.filter((file) => !file.includes("packages/api/src/workflows/"));

  return [
    ...splitIntoShards(workflowUnit, 2, "workflow-unit"),
    ...splitIntoShards(workflowIntegration, 1, "workflow-integration"),
    ...splitIntoShards(everythingElse, 1, "non-workflow"),
  ];
}

async function runCoverageShard(
  shard: CoverageShard,
  coverageEnv: NodeJS.ProcessEnv,
  spawnFn: typeof spawn,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawnFn(
      "pnpm",
      shardArgs(shard),
      {
        cwd: rootDir,
        stdio: "inherit",
        env: coverageEnv,
      },
    );

    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`coverage shard ${shard.name} exited with signal ${signal}`));
        return;
      }
      if ((code ?? 1) !== 0) {
        reject(new Error(`coverage shard ${shard.name} failed with exit code ${code ?? 1}`));
        return;
      }
      resolve();
    });

    child.on("error", reject);
  });
}

async function runCoverageMonolith(
  coverageEnv: NodeJS.ProcessEnv,
  spawnFn: typeof spawn,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
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
        reject(new Error(`coverage run exited with signal ${signal}`));
        return;
      }
      if ((code ?? 1) !== 0) {
        reject(new Error(`coverage run failed with exit code ${code ?? 1}`));
        return;
      }
      resolve();
    });

    child.on("error", reject);
  });
}

async function mergeCoverageReports(
  shards: CoverageShard[],
  readFileFn: typeof readFile = readFile,
  readdirFn: typeof readdir = readdir,
  writeFileFn: typeof writeFile = writeFile,
): Promise<void> {
  const coveragePackageEntry = require.resolve("@vitest/coverage-istanbul");
  const coveragePackageNodeModulesDir = path.resolve(path.dirname(coveragePackageEntry), "../../..");
  const [{ default: libCoverage }, { default: libReport }, { default: reports }] = await Promise.all([
    import(path.join(coveragePackageNodeModulesDir, "istanbul-lib-coverage", "index.js")),
    import(path.join(coveragePackageNodeModulesDir, "istanbul-lib-report", "index.js")),
    import(path.join(coveragePackageNodeModulesDir, "istanbul-reports", "index.js")),
  ]);
  const coverageMap = libCoverage.createCoverageMap({});
  const fallbackShardNames = shards.map((shard) => shard.name);
  let shardNames = fallbackShardNames;
  try {
    const entries = await readdirFn(coverageShardDir);
    const discovered = entries
      .map((entry) => typeof entry === "string" ? entry : entry?.name)
      .filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
      .sort((left, right) => left.localeCompare(right));
    if (discovered.length > 0) {
      shardNames = discovered;
    }
  } catch (error) {
    if (!isErrnoException(error) || error.code !== "ENOENT") {
      throw error;
    }
  }

  for (const shardName of shardNames) {
    const coveragePath = path.join(coverageShardDir, shardName, "coverage-final.json");
    try {
      const raw = await readFileFn(coveragePath, "utf8");
      coverageMap.merge(JSON.parse(raw));
      continue;
    } catch (error) {
      if (!isErrnoException(error) || error.code !== "ENOENT") {
        throw error;
      }
    }

    const shardTmpDir = path.join(coverageShardDir, shardName, ".tmp");
    const fragmentNames = (await readdirFn(shardTmpDir))
      .filter((entry) => /^coverage-\d+\.json$/u.test(entry))
      .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
    if (fragmentNames.length === 0) {
      throw new Error(`missing merged coverage artifact and shard fragments for ${shardName}`);
    }
    for (const fragmentName of fragmentNames) {
      const raw = await readFileFn(path.join(shardTmpDir, fragmentName), "utf8");
      coverageMap.merge(JSON.parse(raw));
    }
  }

  await writeFileFn(
    path.join(coverageDir, "coverage-final.json"),
    JSON.stringify(coverageMap.toJSON(), null, 2),
  );

  const context = libReport.createContext({
    dir: coverageDir,
    coverageMap,
  });
  reports.create("text").execute(context);
  reports.create("json-summary").execute(context);
  reports.create("lcovonly").execute(context);
}

export async function runCoverage({
  env = process.env,
  mkdirFn = mkdir,
  processExit = process.exit,
  rmFn = rm,
  spawnFn = spawn,
}: CoverageRuntimeDeps = {}): Promise<void> {
  await resetCoverageDir(rmFn, mkdirFn);
  const coverageEnv = buildCoverageEnv(env);
  try {
    await runCoverageMonolith(coverageEnv, spawnFn);
  } catch (error) {
    console.error(error);
    processExit(1);
    return;
  }
  processExit(0);
}

export async function main(): Promise<void> {
  await runCoverage();
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  void main();
}
