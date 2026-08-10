import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { JsonRpcProvider } from "ethers";

import { createApiServer } from "../packages/api/src/app.js";
import { loadRepoEnv } from "../packages/client/src/runtime/config.js";
import { isLoopbackRpcUrl, resolveRuntimeConfig } from "./alchemy-debug-lib.js";
import { rootDir, writeJson } from "./utils.js";
import {
  buildReadRequest,
  classifySafeReadGap,
  fixtureValue,
  proofFixtureOverrides,
  selectAbiFunction,
  type AbiFunction,
  type EndpointDefinition,
  type LocalForkFixture,
  type ProofArtifacts,
} from "./verify-local-fork-safe-read-values.js";

const outputIndex = process.argv.indexOf("--output");
const outputPath = outputIndex >= 0 && process.argv[outputIndex + 1]
  ? process.argv[outputIndex + 1]
  : path.join(".runtime", "local-fork-proofs", "safe-reads.json");

async function readOptionalArtifact(name: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path.join(rootDir, ".runtime", "local-fork-proofs", name), "utf8")) as unknown;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

async function discoverCampaignId(port: number, apiKey: string): Promise<string | null> {
  const headers = { "content-type": "application/json", "x-api-key": apiKey };
  const countResponse = await fetch(`http://127.0.0.1:${port}/v1/tokenomics/queries/campaign-count`, {
    method: "POST",
    headers,
    body: "{}",
    signal: AbortSignal.timeout(20_000),
  });
  const countPayload = await countResponse.json().catch(() => null);
  if (countResponse.status !== 200 || !/^\d+$/u.test(String(countPayload))) return null;
  for (let campaignId = BigInt(String(countPayload)); campaignId > 0n; campaignId -= 1n) {
    const response = await fetch(
      `http://127.0.0.1:${port}/v1/tokenomics/queries/get-campaign?campaignId=${campaignId}`,
      { method: "GET", headers, signal: AbortSignal.timeout(20_000) },
    );
    if (response.status === 200) return campaignId.toString();
  }
  return null;
}

async function main(): Promise<void> {
  const repoEnv = loadRepoEnv();
  const { config } = await resolveRuntimeConfig(repoEnv);
  const liveRunAcknowledged = process.argv.includes("--allow-live") || process.env.API_LAYER_ASSURANCE_MODE === "live";
  if (!isLoopbackRpcUrl(config.cbdpRpcUrl) && !liveRunAcknowledged) {
    throw new Error(`safe-read probe refuses non-loopback RPC ${config.cbdpRpcUrl} without --allow-live`);
  }
  process.env.RPC_URL = config.cbdpRpcUrl;
  process.env.ALCHEMY_RPC_URL = config.cbdpRpcUrl;
  const readApiKeys = Array.from({ length: 8 }, (_, index) => `local-fork-read-${index}`);
  process.env.API_LAYER_KEYS_JSON = JSON.stringify(Object.fromEntries(
    readApiKeys.map((apiKey, index) => [
      apiKey,
      { label: `local-fork-reader-${index}`, roles: ["read-only"], allowGasless: false },
    ]),
  ));
  process.env.API_LAYER_API_KEY = readApiKeys[0];
  process.env.API_LAYER_READ_API_KEY = readApiKeys[0];

  const reviewed = JSON.parse(
    await readFile(path.join(rootDir, "reviewed", "reviewed-api-surface.json"), "utf8"),
  ) as { methods: Record<string, EndpointDefinition>; events: Record<string, EndpointDefinition> };
  const fixture = JSON.parse(
    await readFile(path.join(rootDir, ".runtime", "base-sepolia-operator-fixtures.json"), "utf8"),
  ) as LocalForkFixture;
  const proofArtifacts: ProofArtifacts = {
    core: await readOptionalArtifact("layer1-core.json"),
    remaining: await readOptionalArtifact("layer1-remaining.json"),
    governance: await readOptionalArtifact("governance.json"),
  };
  const provider = new JsonRpcProvider(config.cbdpRpcUrl, config.chainId);
  const latestBlock = await provider.getBlock("latest");
  const blockNumber = latestBlock?.number ?? await provider.getBlockNumber();
  const timestamp = latestBlock?.timestamp ?? Math.floor(Date.now() / 1_000);
  const server = createApiServer({ port: 0, quiet: true }).listen();
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 8787;
  const probes: Array<Record<string, unknown>> = [];
  const gaps: Array<Record<string, unknown>> = [];

  try {
    const campaignId = await discoverCampaignId(port, readApiKeys[0]);
    for (const [methodKey, endpoint] of Object.entries(reviewed.methods).sort(([left], [right]) => left.localeCompare(right))) {
      if (endpoint.rateLimitKind !== "read") {
        continue;
      }
      const abi = JSON.parse(
        await readFile(path.join(rootDir, "abis", "facets", `${endpoint.facetName}.json`), "utf8"),
      ) as AbiFunction[];
      const abiFunction = selectAbiFunction(methodKey, endpoint, abi);
      const inputs = abiFunction?.inputs ?? [];
      const overrides = proofFixtureOverrides(methodKey, proofArtifacts);
      if (methodKey.startsWith("CommunityRewardsFacet.") && campaignId) overrides.campaignId = campaignId;
      const values = inputs.map((input) => fixtureValue(input, fixture, blockNumber, timestamp, overrides));
      const request = buildReadRequest(endpoint, inputs, values);
      const apiKey = readApiKeys[probes.length % readApiKeys.length];
      try {
        const response = await fetch(`http://127.0.0.1:${port}${request.route}`, {
          method: endpoint.httpMethod,
          headers: { "content-type": "application/json", "x-api-key": apiKey },
          body: request.body ? JSON.stringify(request.body) : undefined,
          signal: AbortSignal.timeout(20_000),
        });
        const payload = await response.json().catch(() => null);
        const proof = { methodKey, route: `${endpoint.httpMethod} ${request.route}`, status: response.status, payload };
        probes.push(proof);
        if (response.status === 200) {
          continue;
        }
        gaps.push({
          methodKey,
          route: `${endpoint.httpMethod} ${endpoint.path}`,
          classification: classifySafeReadGap(response.status, payload),
          detail: `safe read returned HTTP ${response.status}`,
          response: payload,
        });
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        probes.push({ methodKey, route: `${endpoint.httpMethod} ${request.route}`, status: 0, error: detail });
        gaps.push({
          methodKey,
          route: `${endpoint.httpMethod} ${endpoint.path}`,
          classification: "proof gap",
          detail: `safe read request failed: ${detail}`,
        });
      }
    }

    for (const [eventKey, endpoint] of Object.entries(reviewed.events).sort(([left], [right]) => left.localeCompare(right))) {
      const apiKey = readApiKeys[probes.length % readApiKeys.length];
      try {
        const response = await fetch(`http://127.0.0.1:${port}${endpoint.path}`, {
          method: endpoint.httpMethod,
          headers: { "content-type": "application/json", "x-api-key": apiKey },
          body: JSON.stringify({ fromBlock: String(blockNumber), toBlock: String(blockNumber) }),
          signal: AbortSignal.timeout(20_000),
        });
        const payload = await response.json().catch(() => null);
        const proof = { methodKey: eventKey, route: `${endpoint.httpMethod} ${endpoint.path}`, status: response.status, payload };
        probes.push(proof);
        if (response.status === 200) {
          continue;
        }
        gaps.push({
          methodKey: eventKey,
          route: `${endpoint.httpMethod} ${endpoint.path}`,
          classification: "proof gap",
          detail: `event read returned HTTP ${response.status}`,
          response: payload,
        });
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        probes.push({ methodKey: eventKey, route: `${endpoint.httpMethod} ${endpoint.path}`, status: 0, error: detail });
        gaps.push({
          methodKey: eventKey,
          route: `${endpoint.httpMethod} ${endpoint.path}`,
          classification: "proof gap",
          detail: `event read request failed: ${detail}`,
        });
      }
    }
  } finally {
    server.closeAllConnections?.();
    server.closeIdleConnections?.();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await provider.destroy();
  }

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    network: { chainId: config.chainId, rpcUrl: config.cbdpRpcUrl, diamondAddress: config.diamondAddress },
    status: gaps.length === 0 ? "proven working" : "gaps remain",
    totals: {
      reviewedReadCount: Object.values(reviewed.methods).filter((method) => method.rateLimitKind === "read").length,
      reviewedEventCount: Object.keys(reviewed.events).length,
      attempted: probes.length,
      passed: probes.length - gaps.length,
      gaps: gaps.length,
    },
    probes,
    gaps,
  };
  await writeJson(path.isAbsolute(outputPath) ? outputPath : path.resolve(rootDir, outputPath), report);
  console.log(JSON.stringify({ status: report.status, totals: report.totals, outputPath }, null, 2));
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
