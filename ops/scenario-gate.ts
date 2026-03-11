import { spawn } from "node:child_process";

type ScenarioCase = {
  label: string;
  command: string;
};

type ScenarioResult = {
  label: string;
  code: number;
  classification: "wrapper" | "validation" | "provider" | "indexer" | "gasless" | "contract-behavior" | "unknown";
};

function classify(output: string): ScenarioResult["classification"] {
  const normalized = output.toLowerCase();
  if (normalized.includes("invalid param") || normalized.includes("invalid response") || normalized.includes("does not allow")) {
    return "validation";
  }
  if (normalized.includes("provider") || normalized.includes("failover") || normalized.includes("rpc http")) {
    return "provider";
  }
  if (normalized.includes("indexer") || normalized.includes("projection") || normalized.includes("orphan")) {
    return "indexer";
  }
  if (normalized.includes("gasless") || normalized.includes("smart-wallet") || normalized.includes("delegatebysig")) {
    return "gasless";
  }
  if (normalized.includes("unknown function") || normalized.includes("unknown facet") || normalized.includes("wrapper")) {
    return "wrapper";
  }
  if (normalized.includes("revert") || normalized.includes("assert") || normalized.includes("invariant")) {
    return "contract-behavior";
  }
  return "unknown";
}

async function runCase(testCase: ScenarioCase): Promise<ScenarioResult> {
  const [command, ...args] = testCase.command.split(" ");
  let output = "";
  const code = await new Promise<number>((resolve) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });
    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    });
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(text);
    });
    child.on("exit", (exitCode) => resolve(exitCode ?? 1));
  });
  return {
    label: testCase.label,
    code,
    classification: code === 0 ? "unknown" : classify(output),
  };
}

async function main(): Promise<void> {
  const foundryCommand =
    process.env.API_LAYER_SCENARIO_FOUNDARY_COMMAND ??
    process.env.API_LAYER_SCENARIO_FOUNDRY_COMMAND ??
    "node scenario-adapter/run_anvil_happy_paths.js";
  const jsPackCommand =
    process.env.API_LAYER_SCENARIO_JS_PACK_COMMAND ??
    "node scenario-adapter/run_anvil_happy_paths.js";
  const cases: ScenarioCase[] = [
    { label: "foundry-happy-paths", command: foundryCommand },
    { label: "js-deployment-pack", command: jsPackCommand },
  ];

  const failures: ScenarioResult[] = [];
  for (const testCase of cases) {
    const result = await runCase(testCase);
    if (result.code !== 0) {
      failures.push(result);
    }
  }

  if (failures.length > 0) {
    throw new Error(
      failures.map((failure) => `${failure.label}: ${failure.classification} (exit ${failure.code})`).join("\n"),
    );
  }

  console.log("scenario gate passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
