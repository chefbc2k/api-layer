import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Wallet } from "ethers";

import { createApiServer } from "../packages/api/src/app.js";
import { buildTxDebugReport, closeRuntimeEnvironment, loadRuntimeEnvironment, printRuntimeHeader } from "./alchemy-debug-lib.js";

type SignerApiKeyEntry =
  | string
  | {
      apiKey: string;
      signerId?: string;
      privateKey?: string;
      label?: string;
      roles?: string[];
      allowGasless?: boolean;
    };

function mergeSignerConfig(env: NodeJS.ProcessEnv): void {
  const raw = env.API_LAYER_SIGNER_API_KEYS_JSON;
  if (!raw) {
    return;
  }

  const parsed = JSON.parse(raw) as Record<string, SignerApiKeyEntry>;
  const apiKeys = env.API_LAYER_KEYS_JSON ? JSON.parse(env.API_LAYER_KEYS_JSON) as Record<string, { label: string; signerId?: string; roles: string[]; allowGasless: boolean }> : {};
  const signerMap = env.API_LAYER_SIGNER_MAP_JSON ? JSON.parse(env.API_LAYER_SIGNER_MAP_JSON) as Record<string, string> : {};
  const normalized: Record<string, string> = {};

  for (const [address, entry] of Object.entries(parsed)) {
    if (typeof entry === "string") {
      normalized[address.toLowerCase()] = entry;
      continue;
    }
    normalized[address.toLowerCase()] = entry.apiKey;
    if (!apiKeys[entry.apiKey]) {
      apiKeys[entry.apiKey] = {
        label: entry.label ?? entry.signerId ?? address,
        signerId: entry.signerId,
        roles: entry.roles ?? ["service"],
        allowGasless: entry.allowGasless ?? false,
      };
    }
    if (entry.signerId && entry.privateKey && !signerMap[entry.signerId]) {
      signerMap[entry.signerId] = entry.privateKey;
    }
  }

  env.API_LAYER_SIGNER_API_KEYS_JSON = JSON.stringify(normalized);
  if (Object.keys(apiKeys).length > 0) {
    env.API_LAYER_KEYS_JSON = JSON.stringify(apiKeys);
  }
  if (Object.keys(signerMap).length > 0) {
    env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify(signerMap);
  }
}

function ensureDefaultSignerConfig(env: NodeJS.ProcessEnv): void {
  if (env.API_LAYER_KEYS_JSON && env.API_LAYER_SIGNER_MAP_JSON) {
    mergeSignerConfig(env);
    return;
  }

  const founderPrivateKey = env.PRIVATE_KEY ?? env.API_LAYER_TEST_FOUNDER_PRIVATE_KEY;
  if (!founderPrivateKey) {
    throw new Error("missing PRIVATE_KEY or API_LAYER_TEST_FOUNDER_PRIVATE_KEY for API-mode scenario signing");
  }

  const founderAddress = new Wallet(founderPrivateKey).address.toLowerCase();
  const apiKeys: Record<string, { label: string; signerId?: string; roles: string[]; allowGasless: boolean }> = {
    "founder-key": {
      label: "founder",
      signerId: "founder",
      roles: ["service"],
      allowGasless: false,
    },
    "read-key": {
      label: "reader",
      roles: ["service"],
      allowGasless: false,
    },
  };
  const signerMap: Record<string, string> = {
    founder: founderPrivateKey,
  };
  const signerApiKeys: Record<string, SignerApiKeyEntry> = {
    [founderAddress]: {
      apiKey: "founder-key",
      signerId: "founder",
      privateKey: founderPrivateKey,
      label: "founder",
    },
  };

  const oraclePrivateKey = env.ORACLE_WALLET_PRIVATE_KEY;
  if (oraclePrivateKey) {
    signerMap.oracle = oraclePrivateKey;
    apiKeys["oracle-key"] = {
      label: "oracle",
      signerId: "oracle",
      roles: ["service"],
      allowGasless: false,
    };
    signerApiKeys[new Wallet(oraclePrivateKey).address.toLowerCase()] = {
      apiKey: "oracle-key",
      signerId: "oracle",
      privateKey: oraclePrivateKey,
      label: "oracle",
    };
  }

  env.API_LAYER_KEYS_JSON = JSON.stringify(apiKeys);
  env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify(signerMap);
  env.API_LAYER_SIGNER_API_KEYS_JSON = JSON.stringify(signerApiKeys);
  env.API_LAYER_API_KEY = env.API_LAYER_API_KEY ?? "founder-key";
  env.API_LAYER_READ_API_KEY = env.API_LAYER_READ_API_KEY ?? "read-key";
  mergeSignerConfig(env);
}

function lastTxHash(diagnostics: Record<string, unknown> | null): string | null {
  if (!diagnostics) {
    return null;
  }
  const invocations = Array.isArray(diagnostics.invocations) ? diagnostics.invocations : [];
  for (let index = invocations.length - 1; index >= 0; index -= 1) {
    const txHash = (invocations[index] as { response?: { txHash?: string } })?.response?.txHash;
    if (typeof txHash === "string" && txHash.startsWith("0x")) {
      return txHash;
    }
  }
  return null;
}

async function main(): Promise<void> {
  const runtime = await loadRuntimeEnvironment();
  printRuntimeHeader(runtime);
  const originalEnv = { ...process.env };

  const env = { ...process.env, ...runtime.env };
  if (!env.API_LAYER_SCENARIO_COMMAND) {
    throw new Error("set API_LAYER_SCENARIO_COMMAND to the scenario script you want to replay through the HTTP API");
  }

  ensureDefaultSignerConfig(env);

  const diagnosticsDir = env.API_LAYER_SCENARIO_DIAGNOSTICS_PATH ? null : await mkdtemp(path.join(tmpdir(), "api-layer-base-sepolia-"));
  const diagnosticsPath = env.API_LAYER_SCENARIO_DIAGNOSTICS_PATH ?? path.join(diagnosticsDir ?? tmpdir(), "scenario-api.json");
  env.API_LAYER_SCENARIO_DIAGNOSTICS_PATH = diagnosticsPath;
  process.env = { ...process.env, ...env };

  const server = createApiServer({ port: 0 }).listen();
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 8787;
  env.API_LAYER_API_URL = env.API_LAYER_API_URL ?? `http://127.0.0.1:${port}`;

  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn("tsx", ["scenario-adapter/src/run-api-mode.ts"], {
        cwd: process.cwd(),
        stdio: "inherit",
        env,
      });
      child.on("exit", async (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        let diagnostics: Record<string, unknown> | null = null;
        try {
          diagnostics = JSON.parse(await readFile(diagnosticsPath, "utf8")) as Record<string, unknown>;
        } catch {
          diagnostics = null;
        }
        const txHash = lastTxHash(diagnostics);
        const failureDebug = txHash ? await buildTxDebugReport(runtime, txHash) : null;
        console.error(JSON.stringify({
          scenario: env.API_LAYER_SCENARIO_COMMAND,
          diagnostics,
          failureDebug,
        }, null, 2));
        reject(new Error(`tsx scenario-adapter/src/run-api-mode.ts failed with ${code}`));
      });
    });
  } finally {
    server.close();
    if (diagnosticsDir) {
      await rm(diagnosticsDir, { recursive: true, force: true });
    }
    process.env = originalEnv;
    await closeRuntimeEnvironment(runtime);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
