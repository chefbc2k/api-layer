import { loadRuntimeEnvironment } from "./alchemy-debug-lib.js";

async function main(): Promise<void> {
  const runtime = await loadRuntimeEnvironment();
  try {
    console.log(
      JSON.stringify(
        {
          envPath: runtime.configSources.envPath,
          network: runtime.configSources.values.NETWORK.value ?? null,
          chainId: runtime.config.chainId,
          diamondAddress: runtime.config.diamondAddress,
          rpcUrl: runtime.config.cbdpRpcUrl,
          alchemyRpcUrl: runtime.config.alchemyRpcUrl,
          alchemyApiKeyConfigured: Boolean(runtime.config.alchemyApiKey),
          signerConfigured: Boolean(runtime.env.PRIVATE_KEY),
          oracleSignerConfigured: Boolean(runtime.env.ORACLE_WALLET_PRIVATE_KEY),
          scenarioBaselineCommit: runtime.scenarioCommit,
        },
        null,
        2,
      ),
    );
  } finally {
    await runtime.provider.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
