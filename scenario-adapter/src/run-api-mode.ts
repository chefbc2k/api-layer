import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(currentDir, "..");
const registerPath = path.join(rootDir, "register.cjs");

function resolveContractsRoot(): string {
  const explicit = process.env.API_LAYER_PARENT_REPO_DIR;
  if (explicit) {
    return path.isAbsolute(explicit) ? explicit : path.resolve(rootDir, explicit);
  }

  const candidates = [
    path.resolve(rootDir, "..", ".."),
    path.resolve(rootDir, "..", "..", "CONTRACTS"),
  ];

  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, "package.json")) && existsSync(path.join(candidate, "scripts", "deployment"))) {
      return candidate;
    }
  }

  throw new Error(
    `unable to locate contracts workspace; set API_LAYER_PARENT_REPO_DIR to the contracts repo root`,
  );
}

const command = process.env.API_LAYER_SCENARIO_COMMAND;
if (!command) {
  throw new Error(
    "missing API_LAYER_SCENARIO_COMMAND; local Anvil defaults are disabled. Use pnpm run scenario:api:base-sepolia with an explicit scenario command.",
  );
}
const [bin, ...args] = command.split(" ");

const child = spawn(bin, args, {
  cwd: resolveContractsRoot(),
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_OPTIONS: [process.env.NODE_OPTIONS, `--require ${registerPath}`].filter(Boolean).join(" "),
  },
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
