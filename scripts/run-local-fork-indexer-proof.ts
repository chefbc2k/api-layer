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
  "http-contract-receipts.json",
  "layer1-core.json",
  "layer1-completion.json",
  "layer1-remaining.json",
  "marketplace-purchase.json",
  "governance.json",
].map((name) => path.join(proofDir, name));
const outputPath = path.join(proofDir, "event-indexer.json");
const artifactProducers: Record<string, string> = {
  "http-contract-receipts.json": "packages/api/src/app.contract-integration.test.ts",
  "layer1-core.json": "scripts/verify-layer1-live.ts",
  "layer1-completion.json": "scripts/verify-layer1-completion.ts",
  "layer1-remaining.json": "scripts/verify-layer1-remaining.ts",
  "marketplace-purchase.json": "scripts/verify-marketplace-purchase-live.ts",
  "governance.json": "scripts/verify-governance-workflows.ts",
};

type ReceiptProof = {
  txHash: string;
  blockNumber: number;
  transaction: TransactionResponse;
  receipt: TransactionReceipt;
  methodKey: string;
  definition: ReturnType<typeof getAllWriteInvariantDefinitions>[string];
  sourceArtifacts: string[];
  sourceScripts: string[];
};

type RawEventEvidenceRow = IndexedEventRow & {
  id: string;
  log_index: number;
  decoded_args: Record<string, unknown>;
};

type ProjectionEvidenceRow = {
  row_id: string;
  source_raw_event_id: string;
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

async function loadArtifactHashes(): Promise<Map<string, string[]>> {
  const hashes = new Map<string, string[]>();
  for (const artifactPath of artifactPaths) {
    if (!(await fileExists(artifactPath))) {
      continue;
    }
    const source = path.relative(rootDir, artifactPath);
    for (const hash of collectTransactionHashes(JSON.parse(await readFile(artifactPath, "utf8")))) {
      hashes.set(hash, [...new Set([...(hashes.get(hash) ?? []), source])].sort());
    }
  }
  if (hashes.size === 0) {
    throw new Error(`no workflow transaction hashes found under ${proofDir}`);
  }
  return hashes;
}

async function loadReceiptProofs(provider: JsonRpcProvider, diamondAddress: string): Promise<ReceiptProof[]> {
  const selectors = buildWriteSelectorMap();
  const proofs: ReceiptProof[] = [];
  for (const [txHash, sourceArtifacts] of await loadArtifactHashes()) {
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
      sourceArtifacts,
      sourceScripts: [...new Set(sourceArtifacts
        .map((source) => artifactProducers[path.basename(source)])
        .filter((producer): producer is string => Boolean(producer)))].sort(),
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

async function postgresEvidenceFor(pool: Pool, proof: ReceiptProof) {
  const raw = await pool.query<RawEventEvidenceRow>(
    `SELECT id::text, log_index, facet_name, event_name, event_signature, decoded_args
     FROM raw_events
     WHERE tx_hash = $1 AND canonical_status = 'canonical' AND is_orphaned = FALSE
     ORDER BY log_index`,
    [proof.txHash],
  );
  const projections: Array<{ table: string; rowCount: number; rows: ProjectionEvidenceRow[] }> = [];
  for (const table of projectionTableNames(proof.definition)) {
    const result = await pool.query<ProjectionEvidenceRow>(
      `SELECT projection.id::text AS row_id, projection.source_raw_event_id::text
       FROM ${table} projection
        JOIN raw_events raw ON raw.id = projection.source_raw_event_id
        WHERE raw.tx_hash = $1
          AND raw.canonical_status = 'canonical'
          AND raw.is_orphaned = FALSE
          AND projection.canonical_status = 'canonical'
          AND projection.is_orphaned = FALSE
       ORDER BY projection.id`,
      [proof.txHash],
    );
    projections.push({ table, rowCount: result.rows.length, rows: result.rows });
  }
  const block = await pool.query<{ block_number: string; block_hash: string }>(
    `SELECT block_number::text, block_hash
     FROM indexer_blocks
     WHERE block_number = $1 AND canonical_status = 'canonical' AND is_orphaned = FALSE`,
    [proof.blockNumber],
  );
  return {
    rawEvents: { table: "raw_events", rowCount: raw.rows.length, rows: raw.rows },
    projections,
    blockJournal: { table: "indexer_blocks", rowCount: block.rows.length, rows: block.rows },
  };
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
        const postgres = await postgresEvidenceFor(pool, proof);
        const expectation = evaluateReceiptExpectation({
          txHash: proof.txHash,
          methodKey: proof.methodKey,
          definition: proof.definition,
          indexedRows: postgres.rawEvents.rows,
          projectedTables: postgres.projections.filter((entry) => entry.rowCount > 0).map((entry) => entry.table),
        });
        results.push({
          ...expectation,
          blockNumber: proof.blockNumber,
          receiptStatus: Number(proof.receipt.status),
          receiptLogCount: proof.receipt.logs.length,
          transactionSelector: proof.transaction.data.slice(0, 10).toLowerCase(),
          affectedFacet: proof.methodKey.split(".", 1)[0],
          methodSignature: proof.definition.signature,
          decodedEvents: postgres.rawEvents.rows.map((row) => ({
            rawEventId: row.id,
            logIndex: row.log_index,
            facetName: row.facet_name,
            eventName: row.event_name,
            eventSignature: row.event_signature,
            decodedArgs: row.decoded_args,
          })),
          postgres,
          source: {
            workflowArtifacts: proof.sourceArtifacts,
            producers: proof.sourceScripts,
            ingestionScript: "scripts/run-local-fork-indexer-proof.ts",
          },
        });
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
    const receiptReplay = new Map<string, Awaited<ReturnType<typeof postgresEvidenceFor>>>();
    for (const proof of proofs) {
      const after = await postgresEvidenceFor(pool, proof);
      const before = results.find((result) => result.txHash === proof.txHash)!.postgres;
      if (JSON.stringify(after) !== JSON.stringify(before)) {
        throw new Error(`indexer replay changed receipt evidence for ${proof.methodKey} ${proof.txHash}`);
      }
      receiptReplay.set(proof.txHash, after);
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
      schemaVersion: 2,
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
      receipts: results.map((result) => ({
        ...result,
        replay: {
          status: "idempotent",
          before: result.postgres,
          after: receiptReplay.get(result.txHash),
        },
      })),
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
