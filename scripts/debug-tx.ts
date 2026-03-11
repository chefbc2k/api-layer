import { buildTxDebugReport, closeRuntimeEnvironment, loadRuntimeEnvironment, printRuntimeHeader } from "./alchemy-debug-lib.js";

async function main(): Promise<void> {
  const txHash = process.argv[2];
  if (!txHash) {
    throw new Error("usage: pnpm run debug:tx -- <txHash>");
  }

  const runtime = await loadRuntimeEnvironment();
  printRuntimeHeader(runtime);
  try {
    console.log(JSON.stringify(await buildTxDebugReport(runtime, txHash), null, 2));
  } finally {
    await closeRuntimeEnvironment(runtime);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
