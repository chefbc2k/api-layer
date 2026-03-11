import { Wallet } from "ethers";

import { buildSimulationReport, closeRuntimeEnvironment, loadRuntimeEnvironment, printRuntimeHeader } from "./alchemy-debug-lib.js";

function readFlag(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  return process.argv[index + 1];
}

async function main(): Promise<void> {
  const calldata = process.argv[2];
  if (!calldata) {
    throw new Error("usage: pnpm run debug:simulate -- <calldata> [--from 0x...] [--to 0x...] [--gas 0x...] [--gas-price 0x...] [--value 0x...]");
  }

  const runtime = await loadRuntimeEnvironment();
  printRuntimeHeader(runtime);
  try {
    const from =
      readFlag("--from") ??
      (runtime.env.PRIVATE_KEY ? new Wallet(runtime.env.PRIVATE_KEY).address : undefined);
    if (!from) {
      throw new Error("missing sender address; pass --from or configure PRIVATE_KEY in .env");
    }

    console.log(JSON.stringify(await buildSimulationReport(runtime, {
      calldata,
      from,
      to: readFlag("--to"),
      gas: readFlag("--gas"),
      gasPrice: readFlag("--gas-price"),
      value: readFlag("--value"),
    }), null, 2));
  } finally {
    await closeRuntimeEnvironment(runtime);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
