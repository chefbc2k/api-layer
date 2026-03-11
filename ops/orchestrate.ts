import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const apiLayerRoot = path.resolve(currentDir, "..");

function resolveContractsRoot(): string {
  const explicit = process.env.API_LAYER_PARENT_REPO_DIR;
  if (explicit) {
    return path.isAbsolute(explicit) ? explicit : path.resolve(apiLayerRoot, explicit);
  }

  const candidates = [
    path.resolve(apiLayerRoot, ".."),
    path.resolve(apiLayerRoot, "..", "CONTRACTS"),
  ];

  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, "package.json")) && existsSync(path.join(candidate, "api", "abis"))) {
      return candidate;
    }
  }

  throw new Error(
    `unable to locate contracts workspace; set API_LAYER_PARENT_REPO_DIR to the contracts repo root`,
  );
}

async function run(command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv = process.env): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: "inherit", env });
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} failed with ${code}`));
    });
  });
}

async function main(): Promise<void> {
  const contractsRoot = resolveContractsRoot();
  await run("npm", ["run", "compile"], contractsRoot);
  await run("pnpm", ["run", "codegen"], apiLayerRoot);
  try {
    await run("supabase", ["start"], apiLayerRoot);
  } catch {
    console.warn("supabase CLI not available; skipped local stack start");
  }
  try {
    await run("redis-server", ["--daemonize", "yes"], apiLayerRoot);
  } catch {
    console.warn("redis-server not available; skipped Redis startup");
  }
  console.log("Start API and indexer in separate shells:");
  console.log("  pnpm run dev:api");
  console.log("  pnpm run dev:indexer");
  console.log("Run API-mode scenarios with an explicit command:");
  console.log("  API_LAYER_SCENARIO_COMMAND='node scenario-adapter/trace_access_bootstrap_invariants.js' pnpm run scenario:api");
  console.log("Resolve the validated Base Sepolia baseline:");
  console.log("  pnpm run baseline:show");
  console.log("Run the contract-real HTTP proof suite on Base Sepolia:");
  console.log("  pnpm run test:contract:base-sepolia");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
