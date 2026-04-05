import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  copyTree,
  ensureDir,
  fileExists,
  pascalToCamel,
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

    await expect(fileExists(path.join(nestedDir, "data.json"))).resolves.toBe(true);
    await expect(readJson<{ ok: boolean }>(path.join(nestedDir, "data.json"))).resolves.toEqual({ ok: true });

    const targetDir = path.join(tempDir, "copied");
    await copyTree(path.join(tempDir, "nested"), targetDir);

    await expect(readFile(path.join(targetDir, "child", "plain.txt"), "utf8")).resolves.toBe("hello");

    await resetDir(targetDir);
    await expect(fileExists(path.join(targetDir, "child", "plain.txt"))).resolves.toBe(false);
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

  it("falls back to the local ABI directory and returns null for missing optional inputs", async () => {
    process.env.API_LAYER_ABI_SOURCE_DIR = path.join(tempDir, "missing-abis");
    process.env.API_LAYER_SCENARIO_SOURCE_DIR = path.join(tempDir, "missing-scenarios");
    process.env.API_LAYER_DEPLOYMENT_MANIFEST = path.join(tempDir, "missing-manifest.json");

    await expect(resolveAbiSourceDir()).resolves.toBe(path.join(process.cwd(), "abis"));
    await expect(resolveScenarioSourceDir()).resolves.toSatisfy((value) => value === null || value.endsWith("/scenarios"));
    await expect(resolveDeploymentManifestPath()).resolves.toSatisfy(
      (value) => value === null || value.endsWith("/deployment-manifest.json"),
    );
  });

  it("converts PascalCase identifiers to camelCase", () => {
    expect(pascalToCamel("VoiceAssetFacet")).toBe("voiceAssetFacet");
  });
});
