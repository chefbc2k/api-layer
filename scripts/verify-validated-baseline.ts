import { buildTxDebugReport, closeRuntimeEnvironment, loadRuntimeEnvironment, printRuntimeHeader, runScenarioCommand } from "./alchemy-debug-lib.js";

function parityStatus(contractExitCode: number, apiExitCode: number, invocationCount: number): "parity confirmed" | "API-layer defect" | "unproven" {
  if (contractExitCode === 0 && apiExitCode === 0 && invocationCount > 0) {
    return "parity confirmed";
  }
  if (contractExitCode === 0 && apiExitCode !== 0) {
    return "API-layer defect";
  }
  return "unproven";
}

function lastApiTxHash(diagnostics: Record<string, unknown> | null): string | null {
  if (!diagnostics) {
    return null;
  }
  const invocations = Array.isArray(diagnostics.invocations) ? diagnostics.invocations : [];
  for (let index = invocations.length - 1; index >= 0; index -= 1) {
    const candidate = invocations[index] as { response?: { txHash?: string } };
    const txHash = candidate?.response?.txHash;
    if (typeof txHash === "string" && txHash.startsWith("0x")) {
      return txHash;
    }
  }
  return null;
}

async function main(): Promise<void> {
  const runtime = await loadRuntimeEnvironment();
  printRuntimeHeader(runtime);

  try {
    const scenarioCommand = process.env.API_LAYER_SCENARIO_COMMAND;
    if (!scenarioCommand) {
      console.log(JSON.stringify({
        status: "baseline verified",
        alchemyDiagnosticsEnabled: runtime.config.alchemyDiagnosticsEnabled,
        alchemySimulationEnabled: runtime.config.alchemySimulationEnabled,
      }, null, 2));
      return;
    }

    const contractResult = await runScenarioCommand(runtime, "contract", scenarioCommand);
    const apiResult = await runScenarioCommand(runtime, "api", scenarioCommand);
    const invocationCount = Array.isArray(apiResult.diagnostics?.invocations) ? apiResult.diagnostics.invocations.length : 0;
    const txHash = lastApiTxHash(apiResult.diagnostics);
    const failureDebug = txHash && apiResult.exitCode !== 0 ? await buildTxDebugReport(runtime, txHash) : null;

    console.log(JSON.stringify({
      scenario: scenarioCommand,
      contractResult: {
        exitCode: contractResult.exitCode,
      },
      apiResult: {
        exitCode: apiResult.exitCode,
        diagnostics: apiResult.diagnostics,
      },
      parityStatus: parityStatus(contractResult.exitCode, apiResult.exitCode, invocationCount),
      failureDebug,
    }, null, 2));

    if (contractResult.exitCode !== 0 || apiResult.exitCode !== 0) {
      process.exitCode = 1;
    }
  } finally {
    await closeRuntimeEnvironment(runtime);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
