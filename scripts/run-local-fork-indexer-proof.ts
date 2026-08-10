import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { JsonRpcProvider, type TransactionReceipt, type TransactionResponse } from "ethers";
import { Pool } from "pg";

import { getAllWriteInvariantDefinitions } from "../packages/client/src/index.js";
import { EventIndexer } from "../packages/indexer/src/worker.js";
import { projectionTables } from "../packages/indexer/src/projections/tables.js";
import {
  buildWriteSelectorMap,
  collectTransactionHashes,
  evaluateReceiptExpectation,
  projectionTableNames,
  type IndexedEventRow,
} from "./indexer-receipt-proof-lib.js";
import { fileExists, rootDir, writeJson } from "./utils.js";

const run = promisify(execFile);
const proofDir = path.join(rootDir, ".runtime", "local-fork-proofs");
const artifactPaths = [
  "layer1-core.json",
  "layer1-completion.json",
  "layer1-remaining.json",
  "marketplace-purchase.json",
  "governance.json",
].map((name) => path.join(proofDir, name));
const outputPath = path.join(proofDir, "event-indexer.json");

type ReceiptProof = {
  txHash: string;
  blockNumber: number;
  transaction: TransactionResponse;
  receipt: TransactionReceipt;
  methodKey: string;
  definition: ReturnType<typeof getAllWriteInvariantDefinitions>[string];
};

async function availablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("failed to allocate a PostgreSQL receipt-proof port"));
        return;
      }
      server.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
}

async function commandPath(command: string): Promise<string> {
  try {
    return (await run("which", [command])).stdout.trim();
  } catch {
    throw new Error(`${command} is required for the local-fork indexer receipt proof`);
  }
}

async function loadArtifactHashes(): Promise<Set<string>> {
  const hashes = new Set<string>();
  for (const artifactPath of artifactPaths) {
    if (!(await fileExists(artifactPath))) {
      continue;
    }
    collectTransactionHashes(JSON.parse(await readFile(artifactPath, "utf8")), hashes);
  }
  if (hashes.size === 0) {
    throw new Error(`no workflow transaction hashes found under ${proofDir}`);
  }
  return hashes;
}

async function loadReceiptProofs(provider: JsonRpcProvider, diamondAddress: string): Promise<ReceiptProof[]> {
  const selectors = buildWriteSelectorMap();
  const proofs: ReceiptProof[] = [];
  for (const txHash of await loadArtifactHashes()) {
    const [transaction, receipt] = await Promise.all([
      provider.getTransaction(txHash),
      provider.getTransactionReceipt(txHash),
    ]);
    if (!transaction || !receipt) {
      throw new Error(`workflow artifact transaction is unavailable on the active fork: ${txHash}`);
    }
    if (transaction.to?.toLowerCase() !== diamondAddress.toLowerCase()) {
      continue;
    }
    if (Number(receipt.status) !== 1) {
      throw new Error(`workflow artifact transaction reverted: ${txHash}`);
    }
    const selector = transaction.data.slice(0, 10).toLowerCase();
    const write = selectors.get(selector);
    if (!write) {
      throw new Error(`diamond transaction ${txHash} has unregistered write selector ${selector}`);
    }
    proofs.push({
      txHash,
      blockNumber: receipt.blockNumber,
      transaction,
      receipt,
      methodKey: write.methodKey,
      definition: write.definition,
    });
  }
  if (proofs.length === 0) {
    throw new Error("workflow artifacts contained no successful writes to the configured diamond");
  }
  return proofs.sort((left, right) => left.blockNumber - right.blockNumber || left.txHash.localeCompare(right.txHash));
}

async function applyMigrations(psql: string, port: number): Promise<void> {
  const args = ["-h", "127.0.0.1", "-p", String(port), "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"];
  await run(psql, [...args, "-c", "create role anon; create role authenticated; create role service_role; create schema auth;"]);
  await run(psql, [...args, "-c", "create function auth.uid() returns uuid language sql stable as 'select null::uuid';"]);
  await run(psql, [...args, "-c", "create function auth.jwt() returns json language sql stable as 'select json_build_object();';"]);
  await run(psql, [
    ...args,
    "-f", "db/migrations/0001_initial.sql",
    "-f", "db/migrations/0002_hardening.sql",
    "-f", "db/migrations/0003_indexer_block_journal.sql",
  ], { cwd: rootDir });
}

async function tableCounts(pool: Pool): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  const raw = await pool.query<{ count: string }>("SELECT count(*)::text AS count FROM raw_events");
  counts.raw_events = Number(raw.rows[0].count);
  for (const table of projectionTables) {
    const result = await pool.query<{ count: string }>(`SELECT count(*)::text AS count FROM ${table}`);
    counts[table] = Number(result.rows[0].count);
  }
  return counts;
}

async function projectedTablesFor(pool: Pool, proof: ReceiptProof): Promise<string[]> {
  const projected: string[] = [];
  for (const table of projectionTableNames(proof.definition)) {
    const result = await pool.query<{ present: boolean }>(
      `SELECT EXISTS (
        SELECT 1
        FROM ${table} projection
        JOIN raw_events raw ON raw.id = projection.source_raw_event_id
        WHERE raw.tx_hash = $1
          AND raw.canonical_status = 'canonical'
          AND raw.is_orphaned = FALSE
          AND projection.canonical_status = 'canonical'
          AND projection.is_orphaned = FALSE
      ) AS present`,
      [proof.txHash],
    );
    if (result.rows[0].present) {
      projected.push(table);
    }
  }
  return projected;
}

async function runProof(databaseUrl: string, provider: JsonRpcProvider, proofs: ReceiptProof[]): Promise<void> {
  process.env.SUPABASE_DB_URL = databaseUrl;
  process.env.API_LAYER_FINALITY_CONFIRMATIONS = "0";
  process.env.API_LAYER_INDEXER_START_BLOCK = "0";
  const pool = new Pool({ connectionString: databaseUrl });
  const indexer = new EventIndexer();
  try {
    const head = BigInt(await provider.getBlockNumber());
    const byBlock = new Map<number, ReceiptProof[]>();
    for (const proof of proofs) {
      byBlock.set(proof.blockNumber, [...(byBlock.get(proof.blockNumber) ?? []), proof]);
    }
    const results = [];
    for (const [blockNumber, blockProofs] of [...byBlock.entries()].sort(([left], [right]) => left - right)) {
      await indexer.ingestRange(BigInt(blockNumber), BigInt(blockNumber), head);
      for (const proof of blockProofs) {
        const raw = await pool.query<IndexedEventRow>(
          `SELECT facet_name, event_name, event_signature
           FROM raw_events
           WHERE tx_hash = $1 AND canonical_status = 'canonical' AND is_orphaned = FALSE
           ORDER BY log_index`,
          [proof.txHash],
        );
        results.push(evaluateReceiptExpectation({
          txHash: proof.txHash,
          methodKey: proof.methodKey,
          definition: proof.definition,
          indexedRows: raw.rows,
          projectedTables: await projectedTablesFor(pool, proof),
        }));
      }
    }

    const failures = results.flatMap((result) => result.failures.map((failure) => `${result.methodKey} ${result.txHash}: ${failure}`));
    if (failures.length > 0) {
      throw new Error(`receipt-to-indexer assertions failed:\n${failures.join("\n")}`);
    }

    const beforeReplay = await tableCounts(pool);
    for (const blockNumber of [...byBlock.keys()].sort((left, right) => left - right)) {
      await indexer.ingestRange(BigInt(blockNumber), BigInt(blockNumber), head);
    }
    const afterReplay = await tableCounts(pool);
    if (JSON.stringify(afterReplay) !== JSON.stringify(beforeReplay)) {
      throw new Error(`indexer replay changed persisted row counts: ${JSON.stringify({ beforeReplay, afterReplay })}`);
    }

    const allMethods = Object.keys(getAllWriteInvariantDefinitions());
    const provenMethodKeys = [...new Set(results.map((result) => result.methodKey))].sort((left, right) => left.localeCompare(right));
    const traceProbeTxHash = proofs.at(-1)!.txHash;
    let callTracer: { status: "supported" | "unsupported"; detail?: string };
    try {
      await provider.send("debug_traceTransaction", [traceProbeTxHash, { tracer: "callTracer" }]);
      callTracer = { status: "supported" };
    } catch (error) {
      callTracer = { status: "unsupported", detail: error instanceof Error ? error.message : String(error) };
    }
    const report = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      status: "proven working",
      network: {
        chainId: Number((await provider.getNetwork()).chainId),
        rpcKind: "local-fork",
        callTracer,
      },
      totals: {
        artifactTransactionHashes: (await loadArtifactHashes()).size,
        indexedReceipts: results.length,
        provenWriteMethods: provenMethodKeys.length,
        catalogWriteMethods: allMethods.length,
        remainingWriteMethods: allMethods.length - provenMethodKeys.length,
        rawEvents: beforeReplay.raw_events,
        projectionRows: Object.entries(beforeReplay)
          .filter(([table]) => table !== "raw_events")
          .reduce((sum, [, count]) => sum + count, 0),
      },
      replay: {
        status: "idempotent",
        before: beforeReplay,
        after: afterReplay,
      },
      provenMethodKeys,
      remainingMethodKeys: allMethods.filter((methodKey) => !provenMethodKeys.includes(methodKey)),
      receipts: results,
    };
    await writeJson(outputPath, report);
    process.stdout.write(`${JSON.stringify({ status: report.status, output: outputPath, totals: report.totals }, null, 2)}\n`);
  } finally {
    await Promise.all([indexer.close(), pool.end()]);
  }
}

async function main(): Promise<void> {
  const rpcUrl = process.env.RPC_URL ?? process.env.CBDP_RPC_URL;
  const diamondAddress = process.env.DIAMOND_ADDRESS;
  if (!rpcUrl || !diamondAddress) {
    throw new Error("RPC_URL/CBDP_RPC_URL and DIAMOND_ADDRESS are required for the local-fork indexer receipt proof");
  }
  const provider = new JsonRpcProvider(rpcUrl);
  const proofs = await loadReceiptProofs(provider, diamondAddress);
  const [initdb, pgCtl, psql] = await Promise.all([
    commandPath("initdb"),
    commandPath("pg_ctl"),
    commandPath("psql"),
  ]);
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "api-indexer-receipts-"));
  const data = path.join(temporaryRoot, "data");
  const log = path.join(temporaryRoot, "postgres.log");
  const port = await availablePort();
  let started = false;
  try {
    await run(initdb, ["-D", data, "-A", "trust", "-U", "postgres", "--no-locale"]);
    await mkdir(path.join(temporaryRoot, "socket"));
    await run(pgCtl, ["-D", data, "-o", `-p ${port} -h 127.0.0.1`, "-l", log, "start"]);
    started = true;
    await applyMigrations(psql, port);
    await runProof(`postgresql://postgres@127.0.0.1:${port}/postgres`, provider, proofs);
  } finally {
    await provider.destroy();
    if (started) {
      await run(pgCtl, ["-D", data, "stop"]).catch(() => undefined);
    }
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
