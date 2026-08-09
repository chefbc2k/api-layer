import { z } from "zod";
import { id, type Log, type Provider } from "ethers";
import type { PoolClient } from "pg";

import { getAllWriteInvariantDefinitions, ProviderRouter, readConfigFromEnv } from "../../client/src/index.js";
import { buildEventRegistry, decodeEvent, isAmbiguousEvent, resolveExpectedEvent, type EventDecodeResult } from "./events.js";
import { IndexerDatabase } from "./db.js";
import { projectEvent } from "./projections/index.js";
import { rebuildCurrentRows, sanitizeArgs } from "./projections/common.js";
import { projectionTables } from "./projections/tables.js";

const envSchema = z.object({
  SUPABASE_DB_URL: z.string().min(1),
  API_LAYER_INDEXER_START_BLOCK: z.coerce.bigint().default(0n),
  API_LAYER_INDEXER_POLL_INTERVAL_MS: z.coerce.number().default(5_000),
  API_LAYER_FINALITY_CONFIRMATIONS: z.coerce.number().default(20),
});

type CheckpointRow = {
  cursor_block: string;
  finalized_block: string;
  cursor_block_hash: string | null;
};

type StoredBlockRow = {
  block_number: string;
  block_hash: string;
};

type BlockJournalEntry = {
  blockNumber: bigint;
  blockHash: string;
  parentHash: string | null;
};

type CallTrace = {
  input?: unknown;
  calls?: unknown;
};

type WriteExpectation = {
  methodKey: string;
  eventKeys: string[];
};

function buildWriteExpectations(): Map<string, WriteExpectation> {
  return new Map(Object.entries(getAllWriteInvariantDefinitions()).map(([methodKey, definition]) => [
    id(definition.signature).slice(0, 10).toLowerCase(),
    { methodKey, eventKeys: definition.invariants.indexerExpectations.events },
  ]));
}

function collectTraceSelectors(value: unknown, selectors = new Set<string>()): Set<string> {
  if (!value || typeof value !== "object") {
    return selectors;
  }
  const trace = value as CallTrace;
  if (typeof trace.input === "string" && /^0x[0-9a-fA-F]{8}/u.test(trace.input)) {
    selectors.add(trace.input.slice(0, 10).toLowerCase());
  }
  if (Array.isArray(trace.calls)) {
    for (const call of trace.calls) {
      collectTraceSelectors(call, selectors);
    }
  }
  return selectors;
}

export class EventIndexer {
  private readonly config = readConfigFromEnv();
  private readonly env = envSchema.parse(process.env);
  private readonly db = new IndexerDatabase(this.env.SUPABASE_DB_URL);
  private readonly providerRouter = new ProviderRouter({
    chainId: this.config.chainId,
    cbdpRpcUrl: this.config.cbdpRpcUrl,
    alchemyRpcUrl: this.config.alchemyRpcUrl,
    errorThreshold: this.config.providerErrorThreshold,
    errorWindowMs: this.config.providerErrorWindowMs,
    recoveryCooldownMs: this.config.providerRecoveryCooldownMs,
  });
  private readonly eventRegistry = buildEventRegistry();
  private readonly writeExpectations = buildWriteExpectations();

  private async resolveAmbiguousLog(log: Log, decoded: EventDecodeResult): Promise<EventDecodeResult> {
    if (!decoded || !isAmbiguousEvent(decoded)) {
      return decoded;
    }
    const transaction = await this.providerRouter.withProvider("events", "indexer.transaction", (provider: Provider) =>
      provider.getTransaction(log.transactionHash),
    );
    const selector = transaction?.data.slice(0, 10).toLowerCase();
    const expectation = selector ? this.writeExpectations.get(selector) : undefined;
    const outerResolved = expectation ? resolveExpectedEvent(decoded, expectation.eventKeys) : decoded;
    if (!isAmbiguousEvent(outerResolved)) {
      return outerResolved;
    }

    try {
      const trace = await this.providerRouter.withProvider("events", "indexer.transactionTrace", async (provider: Provider) => {
        const traceProvider = provider as Provider & {
          send?: (method: string, params: unknown[]) => Promise<unknown>;
        };
        if (!traceProvider.send) {
          return null;
        }
        return traceProvider.send("debug_traceTransaction", [log.transactionHash, { tracer: "callTracer" }]);
      });
      const expectedEventKeys = [...collectTraceSelectors(trace)]
        .flatMap((traceSelector) => this.writeExpectations.get(traceSelector)?.eventKeys ?? []);
      return expectedEventKeys.length > 0
        ? resolveExpectedEvent(outerResolved, expectedEventKeys)
        : outerResolved;
    } catch {
      return outerResolved;
    }
  }

  private async getCheckpoint(): Promise<{ cursorBlock: bigint; finalizedBlock: bigint; cursorBlockHash: string | null }> {
    const result = await this.db.query<CheckpointRow>(
      `SELECT cursor_block, finalized_block, cursor_block_hash FROM indexer_checkpoints WHERE chain_id = $1`,
      [this.config.chainId],
    );
    if (result.rowCount === 0) {
      return {
        cursorBlock: this.env.API_LAYER_INDEXER_START_BLOCK,
        finalizedBlock: 0n,
        cursorBlockHash: null,
      };
    }
    const row = result.rows[0];
    return {
      cursorBlock: BigInt(row.cursor_block),
      finalizedBlock: BigInt(row.finalized_block),
      cursorBlockHash: row.cursor_block_hash,
    };
  }

  private async saveCheckpoint(
    cursorBlock: bigint,
    finalizedBlock: bigint,
    cursorBlockHash: string | null,
    client?: PoolClient,
  ): Promise<void> {
    const query = client ? client.query.bind(client) : this.db.query.bind(this.db);
    await query(
      `
        INSERT INTO indexer_checkpoints (chain_id, cursor_block, finalized_block, cursor_block_hash)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (chain_id)
        DO UPDATE SET
          cursor_block = EXCLUDED.cursor_block,
          finalized_block = EXCLUDED.finalized_block,
          cursor_block_hash = EXCLUDED.cursor_block_hash,
          updated_at = timezone('utc', now())
      `,
      [this.config.chainId, cursorBlock.toString(), finalizedBlock.toString(), cursorBlockHash],
    );
  }

  private async rollbackToAncestor(
    fromBlock: bigint,
    ancestor: { blockNumber: bigint; blockHash: string | null },
    finalizedBlock: bigint,
  ): Promise<void> {
    await this.db.withTransaction(async (client) => {
      await client.query(
        `
          UPDATE raw_events
          SET canonical_status = 'orphaned',
              is_orphaned = TRUE,
              orphaned_at = timezone('utc', now())
          WHERE chain_id = $1
            AND block_number >= $2
            AND canonical_status != 'orphaned'
        `,
        [this.config.chainId, fromBlock.toString()],
      );
      for (const table of projectionTables) {
        await client.query(
          `
            UPDATE ${table}
            SET canonical_status = 'orphaned',
                is_orphaned = TRUE,
                is_current = FALSE,
                updated_at = timezone('utc', now())
            WHERE chain_id = $1
              AND last_updated_block >= $2
              AND canonical_status != 'orphaned'
          `,
          [this.config.chainId, fromBlock.toString()],
        );
        await rebuildCurrentRows(client, table);
      }
      await client.query(
        `
          UPDATE indexer_blocks
          SET canonical_status = 'orphaned',
              is_orphaned = TRUE,
              orphaned_at = timezone('utc', now())
          WHERE chain_id = $1
            AND block_number >= $2
            AND canonical_status != 'orphaned'
        `,
        [this.config.chainId, fromBlock.toString()],
      );
      await this.saveCheckpoint(
        ancestor.blockNumber,
        finalizedBlock < ancestor.blockNumber ? finalizedBlock : ancestor.blockNumber,
        ancestor.blockHash,
        client,
      );
    });
  }

  private async detectReorg(checkpoint: {
    cursorBlock: bigint;
    finalizedBlock: bigint;
    cursorBlockHash: string | null;
  }): Promise<typeof checkpoint> {
    if (!checkpoint.cursorBlock || !checkpoint.cursorBlockHash) {
      return checkpoint;
    }
    const block = await this.providerRouter.withProvider("events", "indexer.detectReorg", (provider: Provider) =>
      provider.getBlock(Number(checkpoint.cursorBlock)),
    );
    if (!block || block.hash === checkpoint.cursorBlockHash) {
      return checkpoint;
    }

    const stored = await this.db.query<StoredBlockRow>(
      `
        SELECT block_number, block_hash
        FROM indexer_blocks
        WHERE chain_id = $1
          AND block_number <= $2
          AND canonical_status = 'canonical'
          AND is_orphaned = FALSE
        ORDER BY block_number DESC
      `,
      [this.config.chainId, checkpoint.cursorBlock.toString()],
    );
    const commonAncestor = await this.providerRouter.withProvider(
      "events",
      "indexer.commonAncestor",
      async (provider: Provider) => {
        for (const candidate of stored.rows) {
          const canonical = await provider.getBlock(Number(candidate.block_number));
          if (canonical?.hash === candidate.block_hash) {
            return { blockNumber: BigInt(candidate.block_number), blockHash: candidate.block_hash };
          }
        }
        return null;
      },
    );
    const fallbackBlock = this.env.API_LAYER_INDEXER_START_BLOCK < checkpoint.cursorBlock
      ? this.env.API_LAYER_INDEXER_START_BLOCK
      : 0n;
    const ancestor = commonAncestor ?? { blockNumber: fallbackBlock, blockHash: null };
    await this.rollbackToAncestor(ancestor.blockNumber + 1n, ancestor, checkpoint.finalizedBlock);
    return {
      cursorBlock: ancestor.blockNumber,
      finalizedBlock: checkpoint.finalizedBlock < ancestor.blockNumber
        ? checkpoint.finalizedBlock
        : ancestor.blockNumber,
      cursorBlockHash: ancestor.blockHash,
    };
  }

  private async saveBlockJournal(client: PoolClient, blocks: BlockJournalEntry[]): Promise<void> {
    for (const block of blocks) {
      await client.query(
        `
          INSERT INTO indexer_blocks (
            chain_id, block_number, block_hash, parent_hash, canonical_status, is_orphaned
          ) VALUES ($1, $2, $3, $4, 'canonical', FALSE)
          ON CONFLICT (chain_id, block_number, block_hash)
          DO UPDATE SET
            parent_hash = EXCLUDED.parent_hash,
            canonical_status = 'canonical',
            is_orphaned = FALSE,
            orphaned_at = NULL
        `,
        [this.config.chainId, block.blockNumber.toString(), block.blockHash, block.parentHash],
      );
    }
  }

  private async insertRawLog(client: PoolClient, log: Log, decoded: EventDecodeResult, confirmations: number): Promise<number> {
    const ambiguous = decoded && isAmbiguousEvent(decoded) ? decoded : null;
    const resolved = decoded && !isAmbiguousEvent(decoded) ? decoded : null;
    const decodedArgs = ambiguous
      ? {
          _candidateEventKeys: ambiguous.candidateEventKeys,
          _candidateArgs: ambiguous.candidateArgs,
        }
      : resolved?.args ?? {};
    const result = await client.query<{ id: number }>(
      `
        INSERT INTO raw_events (
          chain_id,
          tx_hash,
          log_index,
          block_number,
          block_hash,
          contract_address,
          event_name,
          event_signature,
          facet_name,
          decoded_args,
          observed_at,
          confirmations,
          canonical_status,
          is_orphaned
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, timezone('utc', now()), $11, 'canonical', FALSE)
        ON CONFLICT (chain_id, tx_hash, log_index)
        DO UPDATE SET
          block_number = EXCLUDED.block_number,
          block_hash = EXCLUDED.block_hash,
          event_name = EXCLUDED.event_name,
          event_signature = EXCLUDED.event_signature,
          facet_name = EXCLUDED.facet_name,
          decoded_args = EXCLUDED.decoded_args,
          confirmations = EXCLUDED.confirmations,
          canonical_status = 'canonical',
          is_orphaned = FALSE,
          orphaned_at = NULL
        RETURNING id
      `,
      [
        this.config.chainId,
        log.transactionHash,
        log.index,
        log.blockNumber.toString(),
        log.blockHash,
        log.address,
        decoded?.eventName ?? "Unknown",
        decoded?.signature ?? null,
        resolved?.facetName ?? null,
        JSON.stringify(sanitizeArgs(decodedArgs)),
        confirmations,
      ],
    );
    return result.rows[0].id;
  }

  private async processRange(fromBlock: bigint, toBlock: bigint, head: bigint): Promise<void> {
    if (toBlock < fromBlock) {
      return;
    }
    const logs = await this.providerRouter.withProvider("events", "indexer.getLogs", (provider: Provider) =>
      provider.getLogs({
        fromBlock: Number(fromBlock),
        toBlock: Number(toBlock),
        address: this.config.diamondAddress,
      }),
    );

    const preparedLogs = await Promise.all(logs.map(async (log) => ({
      log,
      decoded: await this.resolveAmbiguousLog(log, decodeEvent(this.eventRegistry, log)),
      confirmations: Number(head - BigInt(log.blockNumber)),
    })));
    const blocks = await this.providerRouter.withProvider("events", "indexer.blockJournal", async (provider: Provider) => {
      const entries: BlockJournalEntry[] = [];
      for (let blockNumber = fromBlock; blockNumber <= toBlock; blockNumber += 1n) {
        const block = await provider.getBlock(Number(blockNumber));
        if (!block?.hash) {
          throw new Error(`missing canonical block ${blockNumber}`);
        }
        entries.push({
          blockNumber,
          blockHash: block.hash,
          parentHash: block.parentHash ?? null,
        });
      }
      return entries;
    });
    const finalizedBlock = head > BigInt(this.env.API_LAYER_FINALITY_CONFIRMATIONS)
      ? head - BigInt(this.env.API_LAYER_FINALITY_CONFIRMATIONS)
      : 0n;

    await this.db.withTransaction(async (client) => {
      for (const { log, decoded, confirmations } of preparedLogs) {
        const rawEventId = await this.insertRawLog(client, log, decoded, confirmations);
        if (!decoded || isAmbiguousEvent(decoded)) {
          continue;
        }
        await projectEvent({
          chainId: this.config.chainId,
          client,
          rawEventId,
          txHash: log.transactionHash,
          blockNumber: BigInt(log.blockNumber),
          blockHash: log.blockHash,
          isOrphaned: false,
          decoded,
        });
      }
      await this.saveBlockJournal(client, blocks);
      await this.saveCheckpoint(toBlock, finalizedBlock, blocks.at(-1)?.blockHash ?? null, client);
    });
  }

  async backfill(): Promise<void> {
    const storedCheckpoint = await this.getCheckpoint();
    const checkpoint = await this.detectReorg(storedCheckpoint);
    const head = BigInt(await this.providerRouter.withProvider("events", "indexer.head", (provider: Provider) => provider.getBlockNumber()));
    const target = head;
    const step = 500n;
    for (let cursor = checkpoint.cursorBlock + 1n; cursor <= target; cursor += step) {
      const end = cursor + step - 1n > target ? target : cursor + step - 1n;
      await this.processRange(cursor, end, head);
    }
  }

  async runRealtime(): Promise<void> {
    for (;;) {
      await this.backfill();
      await new Promise((resolve) => setTimeout(resolve, this.env.API_LAYER_INDEXER_POLL_INTERVAL_MS));
    }
  }
}
