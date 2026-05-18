import { mkdtemp, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  copyTree,
  ensureDir,
  fileExists,
  localAbiSourceDir,
  localDeploymentManifestPath,
  pascalToCamel,
  parentRepoDir,
  readJson,
  resetDir,
  resolveAbiSourceDir,
  resolveDeploymentManifestPath,
  resolveScenarioSourceDir,
  writeJson,
} from "./utils.js";

describe("script utils", () => {
  const originalEnv = { ...process.env };
  let tempDir = "";

  beforeEach(async () => {
    process.env = { ...originalEnv };
    tempDir = await mkdtemp(path.join(os.tmpdir(), "api-layer-utils-"));
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    await resetDir(tempDir).catch(() => undefined);
  });

  it("creates, resets, serializes, and copies directory trees", async () => {
    const nestedDir = path.join(tempDir, "nested", "child");
    await ensureDir(nestedDir);
    await writeJson(path.join(nestedDir, "data.json"), { ok: true });
    await writeFile(path.join(nestedDir, "plain.txt"), "hello", "utf8");
    await mkdir(path.join(tempDir, "nested", "empty-dir"), { recursive: true });
    await writeFile(path.join(tempDir, "nested", "symlink-target.txt"), "target", "utf8");

    await expect(fileExists(path.join(nestedDir, "data.json"))).resolves.toBe(true);
    await expect(readJson<{ ok: boolean }>(path.join(nestedDir, "data.json"))).resolves.toEqual({ ok: true });

    const targetDir = path.join(tempDir, "copied");
    await copyTree(path.join(tempDir, "nested"), targetDir);

    await expect(readFile(path.join(targetDir, "child", "plain.txt"), "utf8")).resolves.toBe("hello");
    await expect(fileExists(path.join(targetDir, "empty-dir"))).resolves.toBe(true);
    await expect(fileExists(path.join(targetDir, "symlink-target.txt"))).resolves.toBe(true);

    await resetDir(targetDir);
    await expect(fileExists(path.join(targetDir, "child", "plain.txt"))).resolves.toBe(false);
  });

  it("skips non-file tree entries and resolves explicit relative source paths from the repo root", async () => {
    const sourceDir = path.join(tempDir, "tree");
    const nestedDir = path.join(sourceDir, "child");
    const linkedDir = path.join(tempDir, "linked-abi");
    const scenarioDir = path.join(tempDir, "linked-scenarios");
    await mkdir(nestedDir, { recursive: true });
    await mkdir(linkedDir, { recursive: true });
    await mkdir(scenarioDir, { recursive: true });
    await writeFile(path.join(nestedDir, "plain.txt"), "hello", "utf8");
    await writeFile(path.join(sourceDir, "target.txt"), "target", "utf8");
    await symlink(path.join(sourceDir, "target.txt"), path.join(sourceDir, "linked.txt"));

    process.env.API_LAYER_ABI_SOURCE_DIR = path.relative(process.cwd(), linkedDir);
    process.env.API_LAYER_SCENARIO_SOURCE_DIR = path.relative(process.cwd(), scenarioDir);

    const targetDir = path.join(tempDir, "copied-relative");
    await copyTree(sourceDir, targetDir);

    await expect(fileExists(path.join(targetDir, "child", "plain.txt"))).resolves.toBe(true);
    await expect(fileExists(path.join(targetDir, "linked.txt"))).resolves.toBe(false);
    await expect(resolveAbiSourceDir()).resolves.toBe(linkedDir);
    await expect(resolveScenarioSourceDir()).resolves.toBe(scenarioDir);
  });

  it("resolves explicit ABI, scenario, and deployment manifest paths", async () => {
    const abiDir = path.join(tempDir, "abis");
    const scenarioDir = path.join(tempDir, "scenarios");
    const manifestPath = path.join(tempDir, "deployment-manifest.json");
    await mkdir(abiDir, { recursive: true });
    await mkdir(scenarioDir, { recursive: true });
    await writeFile(manifestPath, "{}\n", "utf8");

    process.env.API_LAYER_ABI_SOURCE_DIR = abiDir;
    process.env.API_LAYER_SCENARIO_SOURCE_DIR = scenarioDir;
    process.env.API_LAYER_DEPLOYMENT_MANIFEST = manifestPath;

    await expect(resolveAbiSourceDir()).resolves.toBe(abiDir);
    await expect(resolveScenarioSourceDir()).resolves.toBe(scenarioDir);
    await expect(resolveDeploymentManifestPath()).resolves.toBe(manifestPath);
  });

  it("resolves explicit relative deployment manifest paths from the repo root", async () => {
    const manifestPath = path.join(tempDir, "relative-manifest.json");
    await writeFile(manifestPath, "{}\n", "utf8");

    process.env.API_LAYER_DEPLOYMENT_MANIFEST = path.relative(process.cwd(), manifestPath);

    await expect(resolveDeploymentManifestPath()).resolves.toBe(manifestPath);
  });

  it("ignores deployment manifest candidates that exist as directories", async () => {
    const directoryManifest = path.join(tempDir, "manifest-dir");
    await mkdir(directoryManifest, { recursive: true });

    process.env.API_LAYER_DEPLOYMENT_MANIFEST = directoryManifest;

    const resolved = await resolveDeploymentManifestPath();
    expect(
      resolved === null
      || resolved === localDeploymentManifestPath
      || path.normalize(resolved).endsWith(path.join("artifacts", "release-readiness", "deployment-manifest.json")),
    ).toBe(true);
    expect(resolved).not.toBe(directoryManifest);
  });

  it("falls back to the local ABI directory and returns null for missing optional inputs", async () => {
    process.env.API_LAYER_ABI_SOURCE_DIR = path.join(tempDir, "missing-abis");
    process.env.API_LAYER_SCENARIO_SOURCE_DIR = path.join(tempDir, "missing-scenarios");
    process.env.API_LAYER_DEPLOYMENT_MANIFEST = path.join(tempDir, "missing-manifest.json");

    await expect(resolveAbiSourceDir()).resolves.toBe(localAbiSourceDir);
    const scenarioDir = await resolveScenarioSourceDir();
    const manifestPath = await resolveDeploymentManifestPath();

    expect(scenarioDir === null || path.normalize(scenarioDir).endsWith(path.join("scripts", "deployment", "scenarios"))).toBe(true);
    expect(
      manifestPath === null
      || manifestPath === localDeploymentManifestPath
      || path.normalize(manifestPath).endsWith(path.join("artifacts", "release-readiness", "deployment-manifest.json")),
    ).toBe(true);
  });

  it("resolves repository fallback inputs when explicit env vars are absent", async () => {
    delete process.env.API_LAYER_ABI_SOURCE_DIR;
    delete process.env.API_LAYER_SCENARIO_SOURCE_DIR;
    delete process.env.API_LAYER_DEPLOYMENT_MANIFEST;

    await expect(resolveAbiSourceDir()).resolves.toBe(localAbiSourceDir);

    const scenarioDir = await resolveScenarioSourceDir();
    expect(
      scenarioDir === null
      || path.normalize(scenarioDir).endsWith(path.join("scripts", "deployment", "scenarios")),
    ).toBe(true);

    const manifestPath = await resolveDeploymentManifestPath();
    expect(
      manifestPath === null
      || manifestPath === localDeploymentManifestPath
      || path.normalize(manifestPath).endsWith(path.join("artifacts", "release-readiness", "deployment-manifest.json")),
    ).toBe(true);
  });

  it("returns false when a file path does not exist", async () => {
    await expect(fileExists(path.join(tempDir, "missing.txt"))).resolves.toBe(false);
  });

  it("converts PascalCase identifiers to camelCase", () => {
    expect(pascalToCamel("VoiceAssetFacet")).toBe("voiceAssetFacet");
    expect(pascalToCamel("X")).toBe("x");
  });
});
