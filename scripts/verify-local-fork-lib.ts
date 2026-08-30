import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { fileExists, readJson, rootDir, writeJson } from "./utils.js";

export type LocalForkCliOptions = {
  outputPath: string;
  allowLive: boolean;
  allowLiveDestructive: boolean;
  continueOnGap: boolean;
};

export type ProofStage = {
  id: string;
  description: string;
  command: string;
  args: string[];
  destructive: boolean;
  artifactPath?: string;
  maxAttempts?: number;
  requiredArtifactSummary?: string;
};

export type CommandResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

export type StageResult = ProofStage & {
  status: "passed" | "failed";
  exitCode: number;
  attemptCount: number;
  checkpointRestores: number;
  stdoutTail: string;
  stderrTail: string;
  artifact: unknown | null;
};

export type StageCheckpoint = {
  create(stage: ProofStage): Promise<string>;
  restore(stage: ProofStage, checkpointId: string): Promise<void>;
};

export type StructuredGap = {
  id: string;
  classification: "runner failure" | "proof gap" | "needs fixture" | "unsafe on live network";
  stageId: string | null;
  methodKey: string | null;
  route: string | null;
  detail: string;
};

export type LocalForkRunLock = {
  filePath: string;
  release(): Promise<void>;
};

type LocalForkRunLockOptions = {
  lockDir?: string;
  pid?: number;
  cwd?: string;
  isProcessAlive?: (pid: number) => boolean;
};

type ReviewedMethod = {
  rateLimitKind?: "read" | "write";
  classification?: string;
};

type ReviewedSurface = {
  methods?: Record<string, ReviewedMethod>;
  events?: Record<string, unknown>;
};

type SafeReadArtifact = {
  gaps?: Array<{
    methodKey?: string;
    route?: string;
    classification?: string;
    detail?: string;
  }>;
};

const DEFAULT_OUTPUT_PATH = path.join(".runtime", "local-fork-assurance-report.json");
const PROOF_DIR = path.join(".runtime", "local-fork-proofs");

function defaultProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

export async function acquireLocalForkRunLock(
  rpcUrl: string,
  options: LocalForkRunLockOptions = {},
): Promise<LocalForkRunLock> {
  const lockDir = options.lockDir ?? os.tmpdir();
  const pid = options.pid ?? process.pid;
  const cwd = options.cwd ?? process.cwd();
  const isProcessAlive = options.isProcessAlive ?? defaultProcessAlive;
  const rpcKey = createHash("sha256").update(rpcUrl).digest("hex").slice(0, 16);
  const filePath = path.join(lockDir, `uspeaks-api-layer-local-fork-${rpcKey}.lock`);
  const ownerToken = randomUUID();
  const lockContents = JSON.stringify({ rpcUrl, pid, cwd, ownerToken, startedAt: new Date().toISOString() });

  await mkdir(lockDir, { recursive: true });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const handle = await open(filePath, "wx");
      try {
        await handle.writeFile(lockContents, "utf8");
      } finally {
        await handle.close();
      }
      return {
        filePath,
        release: async () => {
          try {
            const current = JSON.parse(await readFile(filePath, "utf8")) as { ownerToken?: unknown };
            if (current.ownerToken === ownerToken) {
              await rm(filePath, { force: true });
            }
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
              throw error;
            }
          }
        },
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }
      let current: { pid?: unknown; cwd?: unknown } | null = null;
      try {
        current = JSON.parse(await readFile(filePath, "utf8")) as Exclude<typeof current, null>;
      } catch {
        const lockStat = await stat(filePath).catch(() => null);
        if (lockStat && Date.now() - lockStat.mtimeMs < 30_000) {
          throw new Error(`local-fork runner lock is initializing for ${rpcUrl}`);
        }
      }
      const activePid = current && typeof current.pid === "number" ? current.pid : null;
      if (activePid !== null && isProcessAlive(activePid)) {
        const activeCwd = current && typeof current.cwd === "string" ? ` in ${current.cwd}` : "";
        throw new Error(`local-fork runner already active for ${rpcUrl} (pid ${activePid}${activeCwd})`);
      }
      await rm(filePath, { force: true });
    }
  }

  throw new Error(`unable to acquire local-fork runner lock for ${rpcUrl}`);
}

function isLoopbackRpcUrl(rpcUrl: string): boolean {
  try {
    const hostname = new URL(rpcUrl).hostname;
    return hostname === "127.0.0.1" || hostname === "localhost";
  } catch {
    return rpcUrl.includes("127.0.0.1") || rpcUrl.includes("localhost");
  }
}

function optionValue(argv: string[], flag: string): string | null {
  const index = argv.indexOf(flag);
  if (index < 0) {
    return null;
  }
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

export function parseLocalForkCliOptions(argv: string[]): LocalForkCliOptions {
  const knownFlags = new Set([
    "--",
    "--output",
    "--allow-live",
    "--allow-live-destructive",
    "--continue-on-gap",
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      continue;
    }
    if (!knownFlags.has(arg)) {
      throw new Error(`unknown option ${arg}`);
    }
    if (arg === "--output") {
      index += 1;
    }
  }

  return {
    outputPath: optionValue(argv, "--output") ?? DEFAULT_OUTPUT_PATH,
    allowLive: argv.includes("--allow-live"),
    allowLiveDestructive: argv.includes("--allow-live-destructive"),
    continueOnGap: argv.includes("--continue-on-gap"),
  };
}

export function assertRunnerSafety(
  rpcUrl: string,
  options: Pick<LocalForkCliOptions, "allowLive" | "allowLiveDestructive">,
  stages: ProofStage[],
): "local-fork" | "live" {
  if (isLoopbackRpcUrl(rpcUrl)) {
    return "local-fork";
  }
  if (!options.allowLive) {
    throw new Error(
      `refusing non-loopback RPC ${rpcUrl}; pass --allow-live to acknowledge a live-network proof run`,
    );
  }
  if (stages.some((stage) => stage.destructive) && !options.allowLiveDestructive) {
    throw new Error(
      "refusing destructive/admin proof stages on a live network; pass both --allow-live and --allow-live-destructive",
    );
  }
  return "live";
}

export function buildLocalForkProofPlan(): ProofStage[] {
  return [
    {
      id: "generate-inventory",
      description: "regenerate ABI, wrapper, and HTTP inventory before probing",
      command: "pnpm",
      args: ["run", "codegen"],
      destructive: false,
    },
    {
      id: "provision-fixtures",
      description: "provision actors, funds, approvals, roles, and an aged listing",
      command: "pnpm",
      args: ["run", "setup:base-sepolia"],
      destructive: true,
      artifactPath: path.join(".runtime", "base-sepolia-operator-fixtures.json"),
    },
    {
      id: "http-contract-proof",
      description: "run fixture-backed HTTP reads and writes with direct contract readbacks",
      command: "pnpm",
      args: ["vitest", "run", "packages/api/src/app.contract-integration.test.ts", "--maxWorkers", "1"],
      destructive: true,
      maxAttempts: 2,
    },
    {
      id: "layer1-core-proof",
      description: "record core workflow transaction, receipt, event, and state evidence",
      command: "pnpm",
      args: ["tsx", "scripts/verify-layer1-live.ts", "--output", path.join(PROOF_DIR, "layer1-core.json")],
      destructive: true,
      maxAttempts: 2,
      artifactPath: path.join(PROOF_DIR, "layer1-core.json"),
      requiredArtifactSummary: "proven working",
    },
    {
      id: "layer1-completion-proof",
      description: "record completion read evidence for remaining endpoint groups",
      command: "pnpm",
      args: ["tsx", "scripts/verify-layer1-completion.ts", "--output", path.join(PROOF_DIR, "layer1-completion.json")],
      destructive: false,
      artifactPath: path.join(PROOF_DIR, "layer1-completion.json"),
      requiredArtifactSummary: "proven working",
    },
    {
      id: "layer1-remaining-proof",
      description: "record fixture-backed lifecycle evidence for remaining domains",
      command: "pnpm",
      args: ["tsx", "scripts/verify-layer1-remaining.ts", "--output", path.join(PROOF_DIR, "layer1-remaining.json")],
      destructive: true,
      maxAttempts: 2,
      artifactPath: path.join(PROOF_DIR, "layer1-remaining.json"),
      requiredArtifactSummary: "proven working",
    },
    {
      id: "marketplace-purchase-proof",
      description: "record purchase settlement pre-state, transaction, receipt, event, and post-state",
      command: "pnpm",
      args: [
        "tsx",
        "scripts/verify-marketplace-purchase-live.ts",
        "--output",
        path.join(PROOF_DIR, "marketplace-purchase.json"),
      ],
      destructive: true,
      maxAttempts: 2,
      artifactPath: path.join(PROOF_DIR, "marketplace-purchase.json"),
      requiredArtifactSummary: "proven working",
    },
    {
      id: "governance-proof",
      description: "record proposal and vote pre-state, transactions, receipts, events, and post-state",
      command: "pnpm",
      args: [
        "tsx",
        "scripts/verify-governance-workflows.ts",
        "--output",
        path.join(PROOF_DIR, "governance.json"),
      ],
      destructive: true,
      maxAttempts: 2,
      artifactPath: path.join(PROOF_DIR, "governance.json"),
      requiredArtifactSummary: "proven working",
    },
    {
      id: "probe-safe-reads",
      description: "execute every reviewed read and event endpoint with lifecycle fixture inputs",
      command: "pnpm",
      args: [
        "tsx",
        "scripts/verify-local-fork-safe-reads.ts",
        "--output",
        path.join(PROOF_DIR, "safe-reads.json"),
      ],
      destructive: false,
      artifactPath: path.join(PROOF_DIR, "safe-reads.json"),
    },
  ];
}

function tail(value: string, maxLength = 4_000): string {
  return value.length <= maxLength ? value : value.slice(-maxLength);
}

export async function executeCommand(
  stage: ProofStage,
  env: NodeJS.ProcessEnv,
  cwd = rootDir,
): Promise<CommandResult> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    const child = spawn(stage.command, stage.args, {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (chunk) => {
      const value = chunk.toString();
      stdout += value;
      process.stdout.write(value);
    });
    child.stderr.on("data", (chunk) => {
      const value = chunk.toString();
      stderr += value;
      process.stderr.write(value);
    });
    child.on("error", (error) => {
      stderr += error.message;
    });
    child.on("close", (code) => {
      resolve({ exitCode: code ?? 1, stdout, stderr });
    });
  });
}

export async function readOptionalJson(filePath: string | undefined): Promise<unknown | null> {
  if (!filePath) {
    return null;
  }
  const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(rootDir, filePath);
  if (!(await fileExists(resolved))) {
    return null;
  }
  return JSON.parse(await readFile(resolved, "utf8")) as unknown;
}

export async function runProofStages(args: {
  stages: ProofStage[];
  env: NodeJS.ProcessEnv;
  continueOnGap: boolean;
  execute?: typeof executeCommand;
  checkpoint?: StageCheckpoint;
}): Promise<StageResult[]> {
  const execute = args.execute ?? executeCommand;
  const results: StageResult[] = [];
  for (const stage of args.stages) {
    if (stage.artifactPath) {
      const artifactPath = path.isAbsolute(stage.artifactPath)
        ? stage.artifactPath
        : path.resolve(rootDir, stage.artifactPath);
      await mkdir(path.dirname(artifactPath), { recursive: true });
      await rm(artifactPath, { force: true });
    }
    let commandResult: CommandResult = { exitCode: 1, stdout: "", stderr: "stage did not run" };
    let attemptCount = 0;
    let checkpointRestores = 0;
    let checkpointFailure = false;
    const maxAttempts = stage.destructive && !args.checkpoint ? 1 : stage.maxAttempts ?? 1;
    while (attemptCount < maxAttempts) {
      attemptCount += 1;
      if (stage.artifactPath) {
        const artifactPath = path.isAbsolute(stage.artifactPath)
          ? stage.artifactPath
          : path.resolve(rootDir, stage.artifactPath);
        await rm(artifactPath, { force: true });
      }
      let checkpointId: string | null = null;
      if (stage.destructive && args.checkpoint) {
        try {
          checkpointId = await args.checkpoint.create(stage);
        } catch (error) {
          commandResult = {
            exitCode: 1,
            stdout: "",
            stderr: `failed to create local-fork checkpoint: ${error instanceof Error ? error.message : String(error)}`,
          };
          checkpointFailure = true;
          break;
        }
      }
      commandResult = await execute(stage, args.env);
      if (commandResult.exitCode === 0 && stage.requiredArtifactSummary) {
        const attemptArtifact = await readOptionalJson(stage.artifactPath);
        const summary = attemptArtifact && typeof attemptArtifact === "object"
          ? (attemptArtifact as Record<string, unknown>).summary
          : null;
        if (summary !== stage.requiredArtifactSummary) {
          commandResult = {
            ...commandResult,
            exitCode: 1,
            stderr: `${commandResult.stderr}\nproof artifact summary was ${JSON.stringify(summary)}; expected ${JSON.stringify(stage.requiredArtifactSummary)}`.trim(),
          };
        }
      }
      if (commandResult.exitCode === 0) {
        break;
      }
      if (checkpointId && args.checkpoint) {
        try {
          await args.checkpoint.restore(stage, checkpointId);
          checkpointRestores += 1;
        } catch (error) {
          commandResult = {
            ...commandResult,
            stderr: `${commandResult.stderr}\nfailed to restore local-fork checkpoint: ${error instanceof Error ? error.message : String(error)}`.trim(),
          };
          checkpointFailure = true;
          break;
        }
      }
      if (attemptCount < maxAttempts) {
        console.warn(`retrying ${stage.id} after exit ${commandResult.exitCode} (${attemptCount}/${maxAttempts})`);
      }
    }
    const artifact = await readOptionalJson(stage.artifactPath);
    results.push({
      ...stage,
      status: commandResult.exitCode === 0 ? "passed" : "failed",
      exitCode: commandResult.exitCode,
      attemptCount,
      checkpointRestores,
      stdoutTail: tail(commandResult.stdout),
      stderrTail: tail(commandResult.stderr),
      artifact,
    });
    if (checkpointFailure || (commandResult.exitCode !== 0 && !args.continueOnGap)) {
      break;
    }
  }
  return results;
}

export function summarizeReviewedSurface(reviewed: ReviewedSurface): {
  methodCount: number;
  safeReadCount: number;
  fixtureCandidateWriteCount: number;
  adminWriteCount: number;
  eventCount: number;
} {
  const methods = Object.values(reviewed.methods ?? {});
  return {
    methodCount: methods.length,
    safeReadCount: methods.filter((method) => method.rateLimitKind === "read").length,
    fixtureCandidateWriteCount: methods.filter(
      (method) => method.rateLimitKind === "write" && method.classification !== "admin",
    ).length,
    adminWriteCount: methods.filter(
      (method) => method.rateLimitKind === "write" && method.classification === "admin",
    ).length,
    eventCount: Object.keys(reviewed.events ?? {}).length,
  };
}

function proofArtifactGaps(stage: StageResult): StructuredGap[] {
  if (stage.status === "failed") {
    return [{
      id: `stage:${stage.id}`,
      classification: "runner failure",
      stageId: stage.id,
      methodKey: null,
      route: null,
      detail: `command exited with ${stage.exitCode}: ${stage.stderrTail || stage.stdoutTail}`,
    }];
  }
  if (stage.id === "probe-safe-reads" && stage.artifact && typeof stage.artifact === "object") {
    const artifact = stage.artifact as SafeReadArtifact;
    return (artifact.gaps ?? []).map((gap, index) => ({
      id: `safe-read:${gap.methodKey ?? index}`,
      classification: gap.classification === "needs fixture" ? "needs fixture" : "proof gap",
      stageId: stage.id,
      methodKey: gap.methodKey ?? null,
      route: gap.route ?? null,
      detail: gap.detail ?? "safe read did not return a successful proof response",
    }));
  }
  if (stage.artifact && typeof stage.artifact === "object") {
    const summary = (stage.artifact as { summary?: unknown }).summary;
    if (typeof summary === "string" && summary !== "proven working") {
      return [{
        id: `artifact:${stage.id}`,
        classification: "proof gap",
        stageId: stage.id,
        methodKey: null,
        route: null,
        detail: `proof artifact summary is ${summary}`,
      }];
    }
  }
  return [];
}

export function collectStructuredGaps(stages: StageResult[]): StructuredGap[] {
  return stages.flatMap((stage) => proofArtifactGaps(stage));
}

export async function loadReviewedSurface(): Promise<ReviewedSurface> {
  return readJson<ReviewedSurface>(path.join(rootDir, "reviewed", "reviewed-api-surface.json"));
}

export async function persistLocalForkReport(outputPath: string, report: unknown): Promise<void> {
  const resolved = path.isAbsolute(outputPath) ? outputPath : path.resolve(rootDir, outputPath);
  await writeJson(resolved, report);
}
