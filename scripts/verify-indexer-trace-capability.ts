import { JsonRpcProvider } from "ethers";

import { loadRepoEnv } from "../packages/client/src/runtime/config.js";
import {
  BASE_SEPOLIA_CHAIN_ID,
  findRecentSuccessfulTransaction,
  probeCallTracer,
  redactRpcEndpoint,
  selectTraceRpcUrl,
} from "./indexer-trace-capability-lib.js";
import { rootDir, writeJson } from "./utils.js";

async function main(): Promise<void> {
  const selection = selectTraceRpcUrl(loadRepoEnv());
  const provider = new JsonRpcProvider(selection.rpcUrl, undefined, { batchMaxCount: 1 });
  try {
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    if (chainId !== BASE_SEPOLIA_CHAIN_ID) {
      throw new Error(`trace capability proof expected Base Sepolia ${BASE_SEPOLIA_CHAIN_ID}, received ${chainId}`);
    }
    const transaction = await findRecentSuccessfulTransaction(provider);
    const trace = await probeCallTracer(provider, transaction.txHash);
    const report = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      status: "proven working",
      rpc: {
        endpoint: redactRpcEndpoint(selection.rpcUrl),
        source: selection.source,
        chainId,
      },
      capability: {
        method: "debug_traceTransaction",
        tracer: "callTracer",
        traceKind: trace.traceKind,
      },
      evidence: transaction,
    };
    const outputPath = `${rootDir}/output/indexer-trace-capability.json`;
    await writeJson(outputPath, report);
    process.stdout.write(`${JSON.stringify({ status: report.status, output: outputPath, rpc: report.rpc, capability: report.capability }, null, 2)}\n`);
  } finally {
    await provider.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
