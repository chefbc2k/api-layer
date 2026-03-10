import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export const rootDir = path.resolve(currentDir, "..");
export const parentRepoDir = path.resolve(rootDir, "..");
export const generatedDir = path.join(rootDir, "generated");
export const generatedAbiDir = path.join(generatedDir, "abis");
export const generatedManifestDir = path.join(generatedDir, "manifests");
export const localAbiSourceDir = path.join(rootDir, "abis");
export const localScenarioSnapshotDir = path.join(rootDir, "scenario-adapter");

export async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

export async function resetDir(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
}

export async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

export async function writeJson(filePath: string, value: unknown): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function copyTree(sourceDir: string, targetDir: string): Promise<void> {
  await ensureDir(targetDir);
  for (const entry of await readdir(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      await copyTree(sourcePath, targetPath);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    await ensureDir(path.dirname(targetPath));
    await writeFile(targetPath, await readFile(sourcePath));
  }
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

export function pascalToCamel(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function normalizeCandidate(value: string): string {
  return path.isAbsolute(value) ? value : path.resolve(rootDir, value);
}

async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    return (await stat(dirPath)).isDirectory();
  } catch {
    return false;
  }
}

async function firstExistingDirectory(candidates: string[]): Promise<string | null> {
  for (const candidate of candidates) {
    if (await directoryExists(candidate)) {
      return candidate;
    }
  }
  return null;
}

export async function resolveAbiSourceDir(): Promise<string> {
  const explicit = process.env.API_LAYER_ABI_SOURCE_DIR;
  const candidates = [
    explicit ? normalizeCandidate(explicit) : null,
    localAbiSourceDir,
    path.join(parentRepoDir, "api", "abis"),
    path.join(path.dirname(rootDir), "CONTRACTS", "api", "abis"),
  ].filter((value): value is string => Boolean(value));

  const resolved = await firstExistingDirectory(candidates);
  if (!resolved) {
    throw new Error(
      `unable to locate ABI source directory; checked ${candidates.join(", ")}`,
    );
  }
  return resolved;
}

export async function resolveScenarioSourceDir(): Promise<string | null> {
  const explicit = process.env.API_LAYER_SCENARIO_SOURCE_DIR;
  const candidates = [
    explicit ? normalizeCandidate(explicit) : null,
    path.join(parentRepoDir, "scripts", "deployment", "scenarios"),
    path.join(path.dirname(rootDir), "CONTRACTS", "scripts", "deployment", "scenarios"),
  ].filter((value): value is string => Boolean(value));

  return firstExistingDirectory(candidates);
}
