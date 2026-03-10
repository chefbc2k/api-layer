import type { PoolClient } from "pg";

export type ProjectionContext = {
  client: PoolClient;
  rawEventId: number;
  txHash: string;
  blockNumber: bigint;
  blockHash: string;
  isOrphaned: boolean;
  decodedArgs: Record<string, unknown>;
};

export async function upsertProjection(
  context: ProjectionContext,
  table: string,
  entityId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await context.client.query(
    `
      INSERT INTO ${table} (
        entity_id,
        tx_hash,
        block_number,
        block_hash,
        payload,
        last_updated_block,
        last_event_id,
        is_orphaned
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, $3, $6, $7)
      ON CONFLICT (entity_id)
      DO UPDATE SET
        tx_hash = EXCLUDED.tx_hash,
        block_number = EXCLUDED.block_number,
        block_hash = EXCLUDED.block_hash,
        payload = EXCLUDED.payload,
        last_updated_block = EXCLUDED.last_updated_block,
        last_event_id = EXCLUDED.last_event_id,
        is_orphaned = EXCLUDED.is_orphaned
    `,
    [entityId, context.txHash, context.blockNumber.toString(), context.blockHash, JSON.stringify(payload), context.rawEventId, context.isOrphaned],
  );
}

