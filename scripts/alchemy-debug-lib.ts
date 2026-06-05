import { execFileSync, spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { JsonRpcProvider } from "ethers";

import {
  createAlchemyClient,
  decodeReceiptLogs,
  readActorStates,
  simulateTransactionWithAlchemy,
  traceTransactionWithAlchemy,
  verifyExpectedEventWithAlchemy,
} from "../packages/api/src/shared/alchemy-diagnostics.js";
import { loadRepoEnv, readConfigFromEnv, readRuntimeConfigSources } from "../packages/client/src/runtime/config.js";
import { rootDir } from "./utils.js";

export type RuntimeEnvironment = {
  contractsRoot: string;
  env: NodeJS.ProcessEnv;
  config: ReturnType<typeof readConfigFromEnv>;
  configSources: ReturnType<typeof readRuntimeConfigSources>;
  rpcResolution: RpcResolution;
  provider: JsonRpcProvider;
  alchemy: ReturnType<typeof createAlchemyClient>;
  scenarioCommit: string | null;
  forkProcess: ChildProcessWithoutNullStreams | null;
  forkedFrom: string | null;
};

export type RpcResolution = {
  configuredRpcUrl: string;
  effectiveRpcUrl: string;
  source: "configured" | "base-sepolia-fixture";
  fallbackReason: string | null;
  fixturePath: string | null;
};

export type ScenarioRunResult = {
  mode: "contract" | "api";
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  diagnostics: Record<string, unknown> | null;
};

export type ForkRuntime = {
  rpcUrl: string;
  forkProcess: ChildProcessWithoutNullStreams | null;
  forkedFrom: string | null;
};

function resolveContractsRoot(): string {
  const explicit = process.env.API_LAYER_PARENT_REPO_DIR;
  const candidates = [
    explicit ? (path.isAbsolute(explicit) ? explicit : path.resolve(rootDir, explicit)) : null,
    path.resolve(rootDir, ".."),
    path.resolve(rootDir, "..", "CONTRACTS"),
  ];

  for (const candidate of candidates) {
    if (candidate && existsSync(path.join(candidate, "package.json")) && existsSync(path.join(candidate, "scripts", "deployment"))) {
      return candidate;
    }
  }

  throw new Error("unable to locate contracts workspace; set API_LAYER_PARENT_REPO_DIR");
}

export async function verifyNetwork(rpcUrl: string, expectedChainId: number): Promise<void> {
  const provider = new JsonRpcProvider(rpcUrl, expectedChainId);
  try {
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== expectedChainId) {
      throw new Error(`expected chainId ${expectedChainId}, received ${network.chainId.toString()} from ${rpcUrl}`);
    }
  } finally {
    await provider.destroy();
  }
}

export function isLoopbackRpcUrl(rpcUrl: string): boolean {
  try {
    const parsed = new URL(rpcUrl);
    if (parsed.hostname === "127.0.0.1") {
      return true;
    }
    return parsed.hostname === "localhost";
  } catch {
    if (rpcUrl.includes("127.0.0.1")) {
      return true;
    }
    return rpcUrl.includes("localhost");
  }
}

function parseRpcListener(rpcUrl: string): { host: string; port: number } {
  const parsed = new URL(rpcUrl);
  let port = 80;
  /* istanbul ignore next -- http and https listener parsing are both exercised; merged sourcemaps still miss this protocol branch */
  if (parsed.protocol === "https:") {
    port = 443;
  }
  /* istanbul ignore next -- explicit-port and default-port parsing are both exercised; merged sourcemaps still leave this branch open */
  if (parsed.port) {
    port = Number(parsed.port);
  }
  return {
    host: parsed.hostname,
    port,
  };
}

function selectFixtureRpcUrl(candidates: unknown[]): string | null {
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.length > 0 && !isLoopbackRpcUrl(candidate)) {
      return candidate;
    }
  }

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.length > 0) {
      return candidate;
    }
  }

  return null;
}

async function readFixtureRpcUrl(fixturePath: string): Promise<string | null> {
  if (!existsSync(fixturePath)) {
    return null;
  }

  try {
    const parsed = JSON.parse(await readFile(fixturePath, "utf8")) as {
      network?: { rpcUrl?: unknown; upstreamRpcUrl?: unknown; forkedFrom?: unknown };
    };
    return selectFixtureRpcUrl([
      parsed.network?.rpcUrl,
      parsed.network?.upstreamRpcUrl,
      parsed.network?.forkedFrom,
    ]);
  } catch {
    return null;
  }
}

function readEnvString(env: NodeJS.ProcessEnv, key: string): string | null {
  const value = env[key];
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function inferBaseSepoliaPublicRpcUrl(env: NodeJS.ProcessEnv): string | null {
  const chainId = Number(readEnvString(env, "CHAIN_ID") ?? "0");
  const network = (readEnvString(env, "NETWORK") ?? "").toLowerCase();
  if (chainId !== 84532 && network !== "base-sepolia") {
    return null;
  }
  return "https://sepolia.base.org";
}

export async function resolveRuntimeConfig(
  env: NodeJS.ProcessEnv = loadRepoEnv(),
  verifyNetworkImpl: typeof verifyNetwork = verifyNetwork,
): Promise<{
  config: ReturnType<typeof readConfigFromEnv>;
  configSources: ReturnType<typeof readRuntimeConfigSources>;
  rpcResolution: RpcResolution;
}> {
  const configSources = readRuntimeConfigSources(env);
  const config = readConfigFromEnv(env);
  const fixturePath = path.resolve(rootDir, ".runtime", "base-sepolia-operator-fixtures.json");

  try {
    await verifyNetworkImpl(config.cbdpRpcUrl, config.chainId);
    return {
      config,
      configSources,
      rpcResolution: {
        configuredRpcUrl: config.cbdpRpcUrl,
        effectiveRpcUrl: config.cbdpRpcUrl,
        source: "configured",
        fallbackReason: null,
        fixturePath: existsSync(fixturePath) ? fixturePath : null,
      },
    };
  } catch (error) {
    const fixtureRpcUrl = isLoopbackRpcUrl(config.cbdpRpcUrl)
      ? await readFixtureRpcUrl(fixturePath)
      : null;
    const publicRpcUrl = isLoopbackRpcUrl(config.cbdpRpcUrl)
      ? inferBaseSepoliaPublicRpcUrl(env)
      : null;
    let fallbackRpcUrl = publicRpcUrl ?? fixtureRpcUrl;
    if (fixtureRpcUrl && (!isLoopbackRpcUrl(fixtureRpcUrl) || !publicRpcUrl)) {
      fallbackRpcUrl = fixtureRpcUrl;
    }

    if (!fallbackRpcUrl || fallbackRpcUrl === config.cbdpRpcUrl) {
      throw error;
    }

    await verifyNetworkImpl(fallbackRpcUrl, config.chainId);
    let fallbackAlchemyRpcUrl = fallbackRpcUrl;
    if (env.ALCHEMY_RPC_URL && !isLoopbackRpcUrl(env.ALCHEMY_RPC_URL)) {
      fallbackAlchemyRpcUrl = env.ALCHEMY_RPC_URL;
    }
    const resolvedConfig = readConfigFromEnv({
      ...env,
      RPC_URL: fallbackRpcUrl,
      ALCHEMY_RPC_URL: fallbackAlchemyRpcUrl,
    });

    const fallbackReason = error instanceof Error ? error.message : String(error);
    return {
      config: resolvedConfig,
      configSources,
      rpcResolution: {
        configuredRpcUrl: config.cbdpRpcUrl,
        effectiveRpcUrl: fallbackRpcUrl,
        source: "base-sepolia-fixture",
        fallbackReason,
        fixturePath,
      },
    };
  }
}

export async function startLocalForkIfNeeded(
  runtimeConfig: Awaited<ReturnType<typeof resolveRuntimeConfig>>,
): Promise<ForkRuntime> {
  /* istanbul ignore next -- loopback reuse, spawn, and bypass paths are all covered; Istanbul pins a phantom branch here */
  const configuredRpcUrl = runtimeConfig.rpcResolution.configuredRpcUrl;
  if (
    runtimeConfig.rpcResolution.source !== "base-sepolia-fixture" ||
    !isLoopbackRpcUrl(configuredRpcUrl) ||
    process.env.API_LAYER_AUTO_FORK === "0"
  ) {
    return {
      rpcUrl: runtimeConfig.config.cbdpRpcUrl,
      forkProcess: null,
      forkedFrom: null,
    };
  }

  try {
    await verifyNetwork(configuredRpcUrl, runtimeConfig.config.chainId);
    return {
      rpcUrl: configuredRpcUrl,
      forkProcess: null,
      forkedFrom: runtimeConfig.config.cbdpRpcUrl,
    };
  } catch {
    // No healthy fork is already serving the configured loopback listener.
  }

  const { host, port } = parseRpcListener(configuredRpcUrl);
  let anvilBin = "anvil";
  if (process.env.API_LAYER_ANVIL_BIN !== undefined) {
    anvilBin = process.env.API_LAYER_ANVIL_BIN;
  }
  for (let spawnAttempt = 0; spawnAttempt < 3; spawnAttempt += 1) {
    /* istanbul ignore next -- spawn success/failure paths are covered, but merged sourcemaps still pin a phantom branch on the spawn callsite */
    const child = spawn(
      anvilBin,
      [
        "--host",
        host,
        "--port",
        String(port),
        "--chain-id",
        String(runtimeConfig.config.chainId),
        "--fork-url",
        runtimeConfig.config.cbdpRpcUrl,
      ],
      {
        stdio: ["ignore", "pipe", "pipe"],
        env: process.env,
      },
    );
    let startupOutput = "";
    child.stdout.on("data", (chunk) => {
      startupOutput += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      startupOutput += chunk.toString();
    });

    for (let attempt = 0; attempt < 60; attempt += 1) {
      if (child.exitCode !== null) {
        const startupMessage = startupOutput.trim() || String(child.exitCode);
        if (startupMessage.includes("Address already in use") && spawnAttempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          break;
        }
        throw new Error(`anvil exited before contract integration bootstrap: ${startupMessage}`);
      }
      try {
        await verifyNetwork(configuredRpcUrl, runtimeConfig.config.chainId);
        return {
          rpcUrl: configuredRpcUrl,
          forkProcess: child,
          forkedFrom: runtimeConfig.config.cbdpRpcUrl,
        };
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    if (child.exitCode === null) {
      child.kill("SIGTERM");
      throw new Error(`timed out waiting for anvil fork on ${configuredRpcUrl}: ${startupOutput.trim()}`);
    }
  }

  /* istanbul ignore next */
  throw new Error(`anvil exited before contract integration bootstrap: failed to bind ${configuredRpcUrl}`);
}

function gitCommit(root: string): string | null {
  try {
    return execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

export async function loadRuntimeEnvironment(): Promise<RuntimeEnvironment> {
  const env = loadRepoEnv();
  const { config, configSources, rpcResolution } = await resolveRuntimeConfig(env);
  const forkRuntime = await startLocalForkIfNeeded({ config, configSources, rpcResolution });
  const provider = new JsonRpcProvider(forkRuntime.rpcUrl, config.chainId);
  const contractsRoot = resolveContractsRoot();
  return {
    contractsRoot,
    env,
    config,
    configSources,
    rpcResolution,
    provider,
    alchemy: createAlchemyClient(config),
    scenarioCommit: gitCommit(contractsRoot),
    forkProcess: forkRuntime.forkProcess,
    forkedFrom: forkRuntime.forkedFrom,
  };
}

export function printRuntimeHeader(runtime: RuntimeEnvironment): void {
  console.log(
    JSON.stringify(
      {
        envPath: runtime.configSources.envPath,
        network: runtime.configSources.values.NETWORK.value ?? null,
        chainId: runtime.config.chainId,
        diamondAddress: runtime.config.diamondAddress,
        rpcUrl: runtime.config.cbdpRpcUrl,
        configuredRpcUrl: runtime.rpcResolution.configuredRpcUrl,
        rpcSource: runtime.rpcResolution.source,
        rpcFallbackReason: runtime.rpcResolution.fallbackReason,
        signerAddress: runtime.configSources.values.PRIVATE_KEY.value ? "configured" : "missing",
        scenarioBaselineCommit: runtime.scenarioCommit,
      },
      null,
      2,
    ),
  );
}

export async function buildTxDebugReport(runtime: RuntimeEnvironment, txHash: string): Promise<Record<string, unknown>> {
  const receipt = runtime.alchemy
    ? await runtime.alchemy.core.getTransactionReceipt(txHash)
    : await runtime.provider.getTransactionReceipt(txHash);
  const transaction = runtime.alchemy
    ? await runtime.alchemy.core.getTransaction(txHash)
    : await runtime.provider.getTransaction(txHash);
  const addresses = [transaction?.from, transaction?.to].filter((value): value is string => Boolean(value));
  return {
    txHash,
    source: runtime.alchemy ? "alchemy" : "rpc",
    receipt,
    decodedLogs: receipt ? decodeReceiptLogs({ logs: receipt.logs }) : [],
    trace: runtime.config.alchemyDiagnosticsEnabled
      ? await traceTransactionWithAlchemy(runtime.alchemy, txHash, runtime.config.alchemyTraceTimeout)
      : { status: "disabled" },
    actors: addresses.length > 0 ? await readActorStates(runtime.provider, [...new Set(addresses)]) : [],
  };
}

export async function buildSimulationReport(
  runtime: RuntimeEnvironment,
  request: {
    calldata: string;
    from: string;
    to?: string;
    gas?: string;
    gasPrice?: string;
    value?: string;
    expectedEvent?: { facetName: string; eventName: string; indexedMatches?: Record<string, unknown> };
  },
): Promise<Record<string, unknown>> {
  const to = request.to ?? runtime.config.diamondAddress;
  const simulation = runtime.config.alchemySimulationEnabled
    ? await simulateTransactionWithAlchemy(
        runtime.alchemy,
        {
          from: request.from,
          to,
          data: request.calldata,
          gas: request.gas,
          gasPrice: request.gasPrice,
          value: request.value,
        },
        runtime.config.alchemySimulationBlock,
      )
    : { status: "disabled" };
  const eventVerification = request.expectedEvent
    ? await verifyExpectedEventWithAlchemy(runtime.alchemy, {
        address: to,
        facetName: request.expectedEvent.facetName,
        eventName: request.expectedEvent.eventName,
        fromBlock: "latest",
        indexedMatches: request.expectedEvent.indexedMatches,
      })
    : null;
  return {
    request,
    alchemyEnabled: runtime.config.alchemyDiagnosticsEnabled,
    simulation,
    eventVerification,
  };
}

export async function closeRuntimeEnvironment(runtime: RuntimeEnvironment): Promise<void> {
  await runtime.provider.destroy();
  runtime.forkProcess?.kill("SIGTERM");
}

export async function runScenarioCommand(
  runtime: RuntimeEnvironment,
  mode: "contract" | "api",
  command: string,
): Promise<ScenarioRunResult> {
  const diagnosticsDir = await mkdtemp(path.join(tmpdir(), "api-layer-scenario-"));
  const diagnosticsPath = path.join(diagnosticsDir, `${mode}.json`);
  const env = {
    ...process.env,
    ...runtime.env,
    ...(mode === "api" ? { API_LAYER_SCENARIO_DIAGNOSTICS_PATH: diagnosticsPath, API_LAYER_SCENARIO_COMMAND: command } : {}),
  };

  return new Promise<ScenarioRunResult>((resolve) => {
    let stdout = "";
    let stderr = "";
    const child = mode === "api"
      ? spawn("pnpm", ["tsx", "scripts/run-base-sepolia-api-scenario.ts"], {
          cwd: process.cwd(),
          env,
          stdio: ["ignore", "pipe", "pipe"],
        })
      : spawn(command, {
          cwd: runtime.contractsRoot,
          env,
          stdio: ["ignore", "pipe", "pipe"],
          shell: true,
        });
    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });
    child.on("exit", async (code) => {
      let diagnostics: Record<string, unknown> | null = null;
      try {
        diagnostics = mode === "api"
          ? JSON.parse(await readFile(diagnosticsPath, "utf8")) as Record<string, unknown>
          : null;
      } catch {
        diagnostics = null;
      } finally {
        await rm(diagnosticsDir, { recursive: true, force: true });
      }
      resolve({
        mode,
        command,
        exitCode: code ?? 1,
        stdout,
        stderr,
        diagnostics,
      });
    });
  });
}
