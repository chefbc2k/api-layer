import { z } from "zod";
import { type Log, type Provider } from "ethers";

import { ProviderRouter, readConfigFromEnv } from "../../client/src/index.js";
import { buildEventRegistry, decodeEvent } from "./events.js";
import { IndexerDatabase } from "./db.js";
import { projectEvent } from "./projections/index.js";

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

  private async saveCheckpoint(cursorBlock: bigint, finalizedBlock: bigint, cursorBlockHash: string | null): Promise<void> {
    await this.db.query(
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

  private async markOrphaned(fromBlock: bigint): Promise<void> {
    await this.db.query(
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
  }

  private async detectReorg(checkpoint: { cursorBlock: bigint; cursorBlockHash: string | null }): Promise<boolean> {
    if (!checkpoint.cursorBlock || !checkpoint.cursorBlockHash) {
      return false;
    }
    const block = await this.providerRouter.withProvider("events", "indexer.detectReorg", (provider: Provider) =>
      provider.getBlock(Number(checkpoint.cursorBlock)),
    );
    if (!block || block.hash === checkpoint.cursorBlockHash) {
      return false;
    }
    await this.markOrphaned(checkpoint.cursorBlock);
    await this.saveCheckpoint(checkpoint.cursorBlock - 1n, checkpoint.cursorBlock > 1n ? checkpoint.cursorBlock - 1n : 0n, null);
    return true;
  }

  private async insertRawLog(log: Log, decoded: ReturnType<typeof decodeEvent>, confirmations: number): Promise<number> {
    const result = await this.db.query<{ id: number }>(
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
        decoded?.facetName ?? null,
        JSON.stringify(decoded?.args ?? {}),
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

    for (const log of logs) {
      const decoded = decodeEvent(this.eventRegistry, log);
      const confirmations = Number(head - BigInt(log.blockNumber));
      const rawEventId = await this.insertRawLog(log, decoded, confirmations);
      if (!decoded) {
        continue;
      }
      await this.db.withTransaction(async (client) => {
        await projectEvent({
          client,
          rawEventId,
          txHash: log.transactionHash,
          blockNumber: BigInt(log.blockNumber),
          blockHash: log.blockHash,
          isOrphaned: false,
          decoded,
        });
      });
    }

    const block = await this.providerRouter.withProvider("events", "indexer.blockHash", (provider: Provider) => provider.getBlock(Number(toBlock)));
    const finalizedBlock = head > BigInt(this.env.API_LAYER_FINALITY_CONFIRMATIONS)
      ? head - BigInt(this.env.API_LAYER_FINALITY_CONFIRMATIONS)
      : 0n;
    await this.saveCheckpoint(toBlock, finalizedBlock, block?.hash ?? null);
  }

  async backfill(): Promise<void> {
    const checkpoint = await this.getCheckpoint();
    await this.detectReorg(checkpoint);
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
