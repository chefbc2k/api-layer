import { closeRuntimeEnvironment, loadRuntimeEnvironment, printRuntimeHeader } from "./alchemy-debug-lib.js";
import { traceTransactionWithAlchemy } from "../packages/api/src/shared/alchemy-diagnostics.js";

async function main(): Promise<void> {
  const txHash = process.argv[2];
  if (!txHash) {
    throw new Error("usage: pnpm run debug:trace -- <txHash>");
  }

  const runtime = await loadRuntimeEnvironment();
  printRuntimeHeader(runtime);
  try {
    console.log(JSON.stringify(
      await traceTransactionWithAlchemy(runtime.alchemy, txHash, runtime.config.alchemyTraceTimeout),
      null,
      2,
    ));
  } finally {
    await closeRuntimeEnvironment(runtime);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
