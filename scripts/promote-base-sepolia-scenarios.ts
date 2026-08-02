import { spawn } from "node:child_process";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { JsonRpcProvider, Wallet, getAddress, isAddress, ZeroAddress } from "ethers";
import { parse } from "dotenv";

import { isLoopbackRpcUrl } from "./alchemy-debug-lib.js";
import type { DomainClassification } from "./verify-report.js";

const BASE_SEPOLIA_CHAIN_ID = 84_532;
const ENV_PATH = path.resolve(".env");
const FIXTURE_PATH = path.resolve(".runtime/base-sepolia-operator-fixtures.json");
const GOVERNANCE_OUTPUT_PATH = path.resolve("verify-governance-output.json");
const MARKETPLACE_OUTPUT_PATH = path.resolve("verify-marketplace-purchase-output.json");
const OUTPUT_PATH = path.resolve("verify-base-sepolia-promotion-output.json");

type ReadinessCheck = {
  name: string;
  ready: boolean;
  detail: string;
};

type PromotionReadiness = {
  status: "ready" | "blocked";
  checks: ReadinessCheck[];
  blockers: string[];
};

type ScenarioResult = {
  id: "marketplace-purchase" | "governance";
  command: string;
  status: "proven" | "blocked" | "failed" | "skipped";
  finalClassification: DomainClassification;
  reason: string;
  report: unknown | null;
};

type SetupFixture = {
  network?: {
    chainId?: number | string;
    rpcUrl?: string;
    runtimeRpcUrl?: string;
    forkedFrom?: string | null;
    diamondAddress?: string;
  };
  setup?: { status?: string; blockers?: string[] };
  actors?: Record<string, { address?: string }>;
  marketplace?: {
    usdcFunding?: {
      buyerBalance?: string;
      buyerAllowance?: string;
    };
    agedListingFixture?: {
      status?: string;
      purchaseReadiness?: string;
      reason?: string;
      listing?: { readback?: { payload?: { price?: string } } };
    };
  };
  governance?: { status?: string; reason?: string };
};

type PromotionEvidence = {
  txHashes: string[];
  blockNumbers: Array<number | string>;
  actors: string[];
  stateDeltas: Array<{ path: string; value: unknown }>;
  decodedEvents: Array<{ path: string; value: unknown }>;
};

type PromotionOutput = {
  generatedAt: string;
  target: {
    network: string | null;
    chainId: number | null;
    rpcOrigin: string | null;
    diamondAddress: string | null;
  };
  readiness: PromotionReadiness;
  liveTarget: {
    checked: boolean;
    chainId: number | null;
    diamondCodePresent: boolean | null;
    error: string | null;
  };
  safety: {
    destructiveProtocolAdminWrites: "disabled";
    reason: string;
    setupHelpers: string[];
  };
  setup: SetupFixture | null;
  scenarios: ScenarioResult[];
  evidence: PromotionEvidence;
  finalClassification: DomainClassification;
};

function envEnabled(value: string | undefined): boolean {
  return value === "1" || value?.trim().toLowerCase() === "true";
}

function rpcOrigin(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function validPrivateKey(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  try {
    new Wallet(value);
    return true;
  } catch {
    return false;
  }
}

function distinctWallets(env: NodeJS.ProcessEnv): boolean {
  const keys = [env.PRIVATE_KEY, env.ORACLE_SIGNER_PRIVATE_KEY_1, env.ORACLE_SIGNER_PRIVATE_KEY_2];
  if (!keys.every(validPrivateKey)) {
    return false;
  }
  const addresses = keys.map((key) => new Wallet(key!).address.toLowerCase());
  return new Set(addresses).size === addresses.length;
}

function founderMatchesSender(env: NodeJS.ProcessEnv): boolean {
  if (!validPrivateKey(env.PRIVATE_KEY) || !env.SENDER || !isAddress(env.SENDER)) {
    return false;
  }
  return new Wallet(env.PRIVATE_KEY!).address.toLowerCase() === env.SENDER.toLowerCase();
}

export function assessPromotionReadiness(env: NodeJS.ProcessEnv, envFilePresent = true): PromotionReadiness {
  const rpcUrl = env.RPC_URL ?? env.CBDP_RPC_URL;
  const diamondAddress = env.DIAMOND_ADDRESS ?? env.API_LAYER_DIAMOND_ADDRESS;
  const checks: ReadinessCheck[] = [
    {
      name: "env-file",
      ready: envFilePresent,
      detail: envFilePresent ? ".env is present" : ".env is missing",
    },
    {
      name: "explicit-live-opt-in",
      ready: envEnabled(env.API_LAYER_BASE_SEPOLIA_PROMOTION_READY),
      detail: envEnabled(env.API_LAYER_BASE_SEPOLIA_PROMOTION_READY)
        ? "API_LAYER_BASE_SEPOLIA_PROMOTION_READY is explicitly enabled"
        : "set API_LAYER_BASE_SEPOLIA_PROMOTION_READY=true in .env",
    },
    {
      name: "network",
      ready: env.NETWORK?.trim().toLowerCase() === "base-sepolia",
      detail: `NETWORK=${env.NETWORK ?? "missing"}`,
    },
    {
      name: "chain-id",
      ready: Number(env.CHAIN_ID) === BASE_SEPOLIA_CHAIN_ID,
      detail: `CHAIN_ID=${env.CHAIN_ID ?? "missing"}`,
    },
    {
      name: "direct-live-rpc",
      ready: Boolean(rpcUrl && rpcOrigin(rpcUrl) && !isLoopbackRpcUrl(rpcUrl)),
      detail: rpcUrl && rpcOrigin(rpcUrl)
        ? `RPC origin is ${rpcOrigin(rpcUrl)}${isLoopbackRpcUrl(rpcUrl) ? " (loopback is not allowed)" : ""}`
        : "RPC_URL/CBDP_RPC_URL is missing or invalid",
    },
    {
      name: "direct-diagnostics-rpc",
      ready: Boolean(env.ALCHEMY_RPC_URL && rpcOrigin(env.ALCHEMY_RPC_URL) && !isLoopbackRpcUrl(env.ALCHEMY_RPC_URL)),
      detail: env.ALCHEMY_RPC_URL && rpcOrigin(env.ALCHEMY_RPC_URL)
        ? `Alchemy RPC origin is ${rpcOrigin(env.ALCHEMY_RPC_URL)}${isLoopbackRpcUrl(env.ALCHEMY_RPC_URL) ? " (loopback is not allowed)" : ""}`
        : "ALCHEMY_RPC_URL is missing or invalid",
    },
    {
      name: "diamond-address",
      ready: Boolean(diamondAddress && isAddress(diamondAddress) && getAddress(diamondAddress) !== ZeroAddress),
      detail: diamondAddress && isAddress(diamondAddress) ? `diamond=${getAddress(diamondAddress)}` : "DIAMOND_ADDRESS is missing or invalid",
    },
    {
      name: "required-actors",
      ready: [env.PRIVATE_KEY, env.ORACLE_SIGNER_PRIVATE_KEY_1, env.ORACLE_SIGNER_PRIVATE_KEY_2].every(validPrivateKey),
      detail: "founder, seller, and buyer private keys must be valid",
    },
    {
      name: "distinct-actors",
      ready: distinctWallets(env),
      detail: "founder, seller, and buyer must resolve to distinct addresses",
    },
    {
      name: "founder-sender",
      ready: founderMatchesSender(env),
      detail: "SENDER must be valid and match PRIVATE_KEY",
    },
  ];
  const blockers = checks.filter((check) => !check.ready).map((check) => `${check.name}: ${check.detail}`);
  return {
    status: blockers.length === 0 ? "ready" : "blocked",
    checks,
    blockers,
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function writeOutput(output: PromotionOutput): void {
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
}

async function runCommand(command: string, args: string[], env: NodeJS.ProcessEnv): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
}

function uniqueValues<T>(values: T[]): T[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = JSON.stringify(value);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function safeBigInt(value: unknown): bigint {
  try {
    return BigInt(typeof value === "string" || typeof value === "number" || typeof value === "bigint" ? value : 0);
  } catch {
    return 0n;
  }
}

export function collectPromotionEvidence(values: unknown[]): PromotionEvidence {
  const txHashes: string[] = [];
  const blockNumbers: Array<number | string> = [];
  const actors: string[] = [];
  const stateDeltas: Array<{ path: string; value: unknown }> = [];
  const decodedEvents: Array<{ path: string; value: unknown }> = [];

  const visit = (value: unknown, valuePath: string): void => {
    if (Array.isArray(value)) {
      value.forEach((entry, index) => visit(entry, `${valuePath}[${index}]`));
      return;
    }
    if (!value || typeof value !== "object") {
      return;
    }
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      const entryPath = valuePath ? `${valuePath}.${key}` : key;
      if ((key === "txHash" || key === "transactionHash") && typeof entry === "string" && /^0x[0-9a-fA-F]{64}$/.test(entry)) {
        txHashes.push(entry);
      }
      if (key === "blockNumber" && (typeof entry === "number" || typeof entry === "string")) {
        blockNumbers.push(entry);
      }
      if (key === "actors" && Array.isArray(entry)) {
        actors.push(...entry.filter((actor): actor is string => typeof actor === "string"));
      }
      if ((key === "actors" || key === "actorWallets") && entry && typeof entry === "object" && !Array.isArray(entry)) {
        for (const [label, actor] of Object.entries(entry as Record<string, unknown>)) {
          actors.push(label);
          if (typeof actor === "string" && isAddress(actor)) {
            actors.push(getAddress(actor));
          } else if (actor && typeof actor === "object") {
            const address = (actor as { address?: unknown }).address;
            if (typeof address === "string" && isAddress(address)) {
              actors.push(getAddress(address));
            }
          }
        }
      }
      if (/delta$/i.test(key)) {
        stateDeltas.push({ path: entryPath, value: entry });
      }
      if (key === "decodedLogs" || key === "events" || /Events$/.test(key)) {
        decodedEvents.push({ path: entryPath, value: entry });
      }
      visit(entry, entryPath);
    }
  };

  values.forEach((value, index) => visit(value, `sources[${index}]`));
  return {
    txHashes: uniqueValues(txHashes),
    blockNumbers: uniqueValues(blockNumbers),
    actors: uniqueValues(actors),
    stateDeltas: uniqueValues(stateDeltas),
    decodedEvents: uniqueValues(decodedEvents),
  };
}

function reportClassification(report: unknown): DomainClassification {
  if (!report || typeof report !== "object") {
    return "deeper issue remains";
  }
  const summary = (report as { summary?: unknown }).summary;
  if (
    summary === "proven working" ||
    summary === "blocked by setup/state" ||
    summary === "semantically clarified but not fully proven" ||
    summary === "deeper issue remains"
  ) {
    return summary;
  }
  return "deeper issue remains";
}

function scenarioGate(fixture: SetupFixture, id: ScenarioResult["id"]): { ready: boolean; reason: string } {
  if (id === "governance") {
    return fixture.governance?.status === "ready"
      ? { ready: true, reason: "governance proposer role and voting power are ready" }
      : { ready: false, reason: fixture.governance?.reason ?? "governance readiness is incomplete" };
  }

  const listing = fixture.marketplace?.agedListingFixture;
  const funding = fixture.marketplace?.usdcFunding;
  const price = safeBigInt(listing?.listing?.readback?.payload?.price);
  const balance = safeBigInt(funding?.buyerBalance);
  const allowance = safeBigInt(funding?.buyerAllowance);
  const ready = listing?.status === "ready" && listing.purchaseReadiness === "purchase-ready" && price > 0n && balance >= price && allowance >= price;
  return ready
    ? { ready: true, reason: "aged listing, buyer funds, and allowance are ready" }
    : { ready: false, reason: listing?.reason ?? "marketplace fixture, buyer funds, or allowance is incomplete" };
}

function baseOutput(env: NodeJS.ProcessEnv, readiness: PromotionReadiness): PromotionOutput {
  const diamondAddress = env.DIAMOND_ADDRESS ?? env.API_LAYER_DIAMOND_ADDRESS;
  return {
    generatedAt: new Date().toISOString(),
    target: {
      network: env.NETWORK ?? null,
      chainId: Number.isFinite(Number(env.CHAIN_ID)) ? Number(env.CHAIN_ID) : null,
      rpcOrigin: rpcOrigin(env.RPC_URL ?? env.CBDP_RPC_URL),
      diamondAddress: diamondAddress && isAddress(diamondAddress) ? getAddress(diamondAddress) : null,
    },
    readiness,
    liveTarget: {
      checked: false,
      chainId: null,
      diamondCodePresent: null,
      error: null,
    },
    safety: {
      destructiveProtocolAdminWrites: "disabled",
      reason: "the promotion runner only invokes fixture-backed user workflows; diamond upgrades, ownership changes, pause/recovery, treasury withdrawal, and other destructive admin writes are excluded",
      setupHelpers: [
        "native user funding",
        "test-token funding",
        "buyer allowance",
        "aged marketplace listing",
        "governance role and voting-power readiness",
      ],
    },
    setup: null,
    scenarios: [],
    evidence: collectPromotionEvidence([]),
    finalClassification: readiness.status === "ready" ? "semantically clarified but not fully proven" : "blocked by setup/state",
  };
}

async function main(): Promise<void> {
  const envFilePresent = existsSync(ENV_PATH);
  const fileEnv = envFilePresent ? parse(readFileSync(ENV_PATH, "utf8")) : {};
  const readiness = assessPromotionReadiness(fileEnv, envFilePresent);
  const output = baseOutput(fileEnv, readiness);

  if (readiness.status !== "ready") {
    writeOutput(output);
    console.error(JSON.stringify(output, null, 2));
    process.exitCode = 2;
    return;
  }

  const rpcUrl = fileEnv.RPC_URL ?? fileEnv.CBDP_RPC_URL!;
  const diamondAddress = fileEnv.DIAMOND_ADDRESS ?? fileEnv.API_LAYER_DIAMOND_ADDRESS!;
  const provider = new JsonRpcProvider(rpcUrl, BASE_SEPOLIA_CHAIN_ID, { staticNetwork: true });
  try {
    const [network, code] = await Promise.all([provider.getNetwork(), provider.getCode(diamondAddress)]);
    output.liveTarget = {
      checked: true,
      chainId: Number(network.chainId),
      diamondCodePresent: code !== "0x",
      error: null,
    };
    if (Number(network.chainId) !== BASE_SEPOLIA_CHAIN_ID || code === "0x") {
      output.readiness.status = "blocked";
      output.readiness.blockers.push("live-target: RPC chain or deployed diamond code does not match Base Sepolia readiness");
      output.finalClassification = "blocked by setup/state";
      writeOutput(output);
      process.exitCode = 2;
      return;
    }
  } catch (error) {
    output.liveTarget = {
      checked: true,
      chainId: null,
      diamondCodePresent: null,
      error: error instanceof Error ? error.message : String(error),
    };
    output.readiness.status = "blocked";
    output.readiness.blockers.push(`live-target: ${output.liveTarget.error}`);
    output.finalClassification = "blocked by setup/state";
    writeOutput(output);
    process.exitCode = 2;
    return;
  } finally {
    await provider.destroy();
  }

  if (process.argv.includes("--preflight")) {
    output.finalClassification = "semantically clarified but not fully proven";
    writeOutput(output);
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  const childEnv = { ...process.env, ...fileEnv };
  const fixtureMtimeBefore = existsSync(FIXTURE_PATH) ? statSync(FIXTURE_PATH).mtimeMs : 0;
  const setupExit = await runCommand("pnpm", ["run", "setup:base-sepolia"], childEnv);
  const fixtureWasRefreshed = existsSync(FIXTURE_PATH) && statSync(FIXTURE_PATH).mtimeMs > fixtureMtimeBefore;
  if (setupExit !== 0 || !fixtureWasRefreshed) {
    output.readiness.status = "blocked";
    output.readiness.blockers.push(`setup:base-sepolia exited ${setupExit} or did not refresh its fixture artifact`);
    output.finalClassification = "blocked by setup/state";
    writeOutput(output);
    process.exitCode = 2;
    return;
  }

  const fixture = readJson<SetupFixture>(FIXTURE_PATH);
  output.setup = fixture;
  const runtimeRpcUrl = fixture.network?.runtimeRpcUrl;
  if (
    fixture.setup?.status !== "ready" ||
    !runtimeRpcUrl ||
    isLoopbackRpcUrl(runtimeRpcUrl) ||
    Number(fixture.network?.chainId) !== BASE_SEPOLIA_CHAIN_ID ||
    fixture.network?.forkedFrom
  ) {
    output.readiness.status = "blocked";
    output.readiness.blockers.push(...(fixture.setup?.blockers ?? []));
    output.readiness.blockers.push("setup artifact did not prove a direct, ready Base Sepolia runtime");
    output.finalClassification = "blocked by setup/state";
    output.evidence = collectPromotionEvidence([fixture]);
    writeOutput(output);
    process.exitCode = 2;
    return;
  }

  const scenarios: Array<{
    id: ScenarioResult["id"];
    command: string;
    args: string[];
    outputPath: string;
  }> = [
    {
      id: "marketplace-purchase",
      command: "pnpm run verify:marketplace:purchase:base-sepolia",
      args: ["run", "verify:marketplace:purchase:base-sepolia"],
      outputPath: MARKETPLACE_OUTPUT_PATH,
    },
    {
      id: "governance",
      command: "pnpm run verify:governance:base-sepolia",
      args: ["run", "verify:governance:base-sepolia"],
      outputPath: GOVERNANCE_OUTPUT_PATH,
    },
  ];

  for (const scenario of scenarios) {
    const gate = scenarioGate(fixture, scenario.id);
    if (!gate.ready) {
      output.scenarios.push({
        id: scenario.id,
        command: scenario.command,
        status: "skipped",
        finalClassification: "blocked by setup/state",
        reason: gate.reason,
        report: null,
      });
      continue;
    }

    const reportMtimeBefore = existsSync(scenario.outputPath) ? statSync(scenario.outputPath).mtimeMs : 0;
    const exitCode = await runCommand("pnpm", scenario.args, childEnv);
    const reportWasRefreshed = existsSync(scenario.outputPath) && statSync(scenario.outputPath).mtimeMs > reportMtimeBefore;
    const report = reportWasRefreshed ? readJson<unknown>(scenario.outputPath) : null;
    const classification = reportClassification(report);
    output.scenarios.push({
      id: scenario.id,
      command: scenario.command,
      status: exitCode !== 0 ? "failed" : classification === "proven working" ? "proven" : "blocked",
      finalClassification: exitCode !== 0 ? "deeper issue remains" : classification,
      reason: exitCode !== 0 ? `command exited ${exitCode}` : `proof report classified ${classification}`,
      report,
    });
  }

  output.evidence = collectPromotionEvidence([fixture, ...output.scenarios.map((scenario) => scenario.report)]);
  output.finalClassification = output.scenarios.length > 0 && output.scenarios.every((scenario) => scenario.finalClassification === "proven working")
    ? "proven working"
    : output.scenarios.some((scenario) => scenario.finalClassification === "deeper issue remains")
      ? "deeper issue remains"
      : "blocked by setup/state";
  writeOutput(output);
  console.log(JSON.stringify(output, null, 2));
  if (output.finalClassification !== "proven working") {
    process.exitCode = 2;
  }
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
