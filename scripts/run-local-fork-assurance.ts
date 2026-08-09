import { execFileSync } from "node:child_process";
import path from "node:path";

import {
  closeRuntimeEnvironment,
  loadRuntimeEnvironment,
  type RuntimeEnvironment,
} from "./alchemy-debug-lib.js";
import {
  assertRunnerSafety,
  buildLocalForkProofPlan,
  collectStructuredGaps,
  loadReviewedSurface,
  parseLocalForkCliOptions,
  persistLocalForkReport,
  runProofStages,
  summarizeReviewedSurface,
} from "./verify-local-fork-lib.js";

function runtimeRpcUrl(runtime: RuntimeEnvironment): string {
  if (runtime.forkProcess || runtime.forkedFrom) {
    return runtime.rpcResolution.configuredRpcUrl;
  }
  return runtime.config.cbdpRpcUrl;
}

function currentCommit(): string | null {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const options = parseLocalForkCliOptions(process.argv.slice(2));
  const stages = buildLocalForkProofPlan();
  const runtime = await loadRuntimeEnvironment();
  const rpcUrl = runtimeRpcUrl(runtime);

  try {
    const mode = assertRunnerSafety(rpcUrl, options, stages);
    const env = {
      ...process.env,
      ...runtime.env,
      RPC_URL: rpcUrl,
      CBDP_RPC_URL: rpcUrl,
      ALCHEMY_RPC_URL: rpcUrl,
      API_LAYER_AUTO_FORK: "0",
      API_LAYER_RUN_CONTRACT_INTEGRATION: "1",
      API_LAYER_TEST_FOUNDER_PRIVATE_KEY: runtime.env.PRIVATE_KEY,
      API_LAYER_ASSURANCE_MODE: mode,
    };
    const stageResults = await runProofStages({
      stages,
      env,
      continueOnGap: options.continueOnGap,
    });
    const reviewed = await loadReviewedSurface();
    const gaps = collectStructuredGaps(stageResults);
    const fixtureStage = stageResults.find((stage) => stage.id === "provision-fixtures");
    const report = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      status: stageResults.some((stage) => stage.status === "failed")
        ? "failed"
        : gaps.length > 0
          ? "passed with structured gaps"
          : "proven working",
      source: {
        commit: currentCommit(),
        branch: (() => {
          try {
            return execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
          } catch {
            return null;
          }
        })(),
      },
      network: {
        mode,
        rpcUrl,
        chainId: runtime.config.chainId,
        diamondAddress: runtime.config.diamondAddress,
        forkedFrom: runtime.forkedFrom,
        runnerStartedFork: Boolean(runtime.forkProcess),
      },
      safety: {
        liveRunExplicitlyAllowed: options.allowLive,
        liveDestructiveRunExplicitlyAllowed: options.allowLiveDestructive,
        destructiveStagesDefaultToLocalFork: true,
      },
      inventory: summarizeReviewedSurface(reviewed),
      fixtures: fixtureStage?.artifact ?? null,
      stages: stageResults,
      gaps,
    };
    await persistLocalForkReport(options.outputPath, report);
    console.log(JSON.stringify({ status: report.status, output: path.resolve(options.outputPath), gaps: gaps.length }, null, 2));
    if (stageResults.some((stage) => stage.status === "failed")) {
      process.exitCode = 1;
    }
  } finally {
    await closeRuntimeEnvironment(runtime);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
