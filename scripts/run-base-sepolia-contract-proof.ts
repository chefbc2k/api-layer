import { spawn } from "node:child_process";

import { closeRuntimeEnvironment, loadRuntimeEnvironment, printRuntimeHeader } from "./alchemy-debug-lib.js";

async function main(): Promise<void> {
  const runtime = await loadRuntimeEnvironment();
  printRuntimeHeader(runtime);

  const env = {
    ...process.env,
    ...runtime.env,
    API_LAYER_RUN_CONTRACT_INTEGRATION: "1",
    API_LAYER_TEST_FOUNDER_PRIVATE_KEY: runtime.env.PRIVATE_KEY,
  };

  try {
    const vitestArgs = ["vitest", "run", "packages/api/src/app.contract-integration.test.ts", ...process.argv.slice(2)];
    await new Promise<void>((resolve, reject) => {
      const child = spawn("pnpm", vitestArgs, {
        cwd: process.cwd(),
        stdio: "inherit",
        env,
      });
      child.on("exit", (code) => {
        if (code === 0) {
          resolve();
          return;
        }
        reject(new Error(`pnpm ${vitestArgs.join(" ")} failed with ${code}`));
      });
    });
  } finally {
    await closeRuntimeEnvironment(runtime);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
