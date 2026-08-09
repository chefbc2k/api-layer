import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { IndexerDatabase } from "./db.js";
import { projectEvent } from "./projections/index.js";
import { rebuildCurrentRows } from "./projections/common.js";

const configuredConnectionString = process.env.API_LAYER_INDEXER_TEST_DB_URL;
const connectionString = configuredConnectionString ?? "postgresql://postgres@127.0.0.1:1/unconfigured";

const db = new IndexerDatabase(connectionString);

async function insertRawEvent(txHash: string, blockNumber: bigint): Promise<number> {
  const result = await db.query<{ id: number }>(
    `
      INSERT INTO raw_events (
        chain_id, tx_hash, log_index, block_number, block_hash, contract_address,
        facet_name, event_name, event_signature, decoded_args
      ) VALUES ($1, $2, 0, $3, $4, $5, $6, $7, $8, $9::jsonb)
      RETURNING id
    `,
    [
      84532,
      txHash,
      blockNumber.toString(),
      `0xblock-${blockNumber}`,
      "0x0000000000000000000000000000000000000001",
      "MarketplaceFacet",
      "AssetListed",
      "AssetListed(uint256,address,uint256)",
      JSON.stringify({ tokenId: "1", seller: "0x00000000000000000000000000000000000000aa", price: "100" }),
    ],
  );
  return result.rows[0].id;
}

async function projectListing(rawEventId: number, txHash: string, blockNumber: bigint): Promise<void> {
  await db.withTransaction(async (client) => {
    await projectEvent({
      chainId: 84532,
      client,
      rawEventId,
      txHash,
      blockNumber,
      blockHash: `0xblock-${blockNumber}`,
      isOrphaned: false,
      decoded: {
        facetName: "MarketplaceFacet",
        eventName: "AssetListed",
        wrapperKey: "AssetListed",
        fullEventKey: "MarketplaceFacet.AssetListed",
        signature: "AssetListed(uint256,address,uint256)",
        args: {
          tokenId: 1n,
          seller: "0x00000000000000000000000000000000000000aa",
          price: 100n,
        },
      },
    });
  });
}

describe.skipIf(!configuredConnectionString)("PostgreSQL indexer assurance", () => {
  beforeAll(async () => {
    await db.query("TRUNCATE market_listings, raw_events, indexer_blocks RESTART IDENTITY CASCADE");
  });

  afterAll(async () => {
    await db.close();
  });

  it("keeps duplicate projection replay idempotent under real unique constraints", async () => {
    const rawEventId = await insertRawEvent("0xreplay", 10n);

    await projectListing(rawEventId, "0xreplay", 10n);
    await projectListing(rawEventId, "0xreplay", 10n);

    const rows = await db.query<{ count: string; current_count: string }>(
      `SELECT count(*)::text AS count, count(*) FILTER (WHERE is_current)::text AS current_count FROM market_listings`,
    );
    expect(rows.rows[0]).toEqual({ count: "1", current_count: "1" });
  });

  it("rolls raw ingestion and projection back together after a partial-range failure", async () => {
    const rawCountBefore = await db.query<{ count: string }>("SELECT count(*)::text AS count FROM raw_events");
    const projectionCountBefore = await db.query<{ count: string }>("SELECT count(*)::text AS count FROM market_listings");

    await expect(db.withTransaction(async (client) => {
      const raw = await client.query<{ id: number }>(
        `
          INSERT INTO raw_events (
            chain_id, tx_hash, log_index, block_number, block_hash, contract_address,
            facet_name, event_name, event_signature, decoded_args
          ) VALUES (84532, '0xrollback', 0, 11, '0xblock-11', '0xdiamond',
            'MarketplaceFacet', 'AssetListed', 'AssetListed(uint256,address,uint256)', '{}'::jsonb)
          RETURNING id
        `,
      );
      await projectEvent({
        chainId: 84532,
        client,
        rawEventId: raw.rows[0].id,
        txHash: "0xrollback",
        blockNumber: 11n,
        blockHash: "0xblock-11",
        isOrphaned: false,
        decoded: {
          facetName: "MarketplaceFacet",
          eventName: "AssetListed",
          wrapperKey: "AssetListed",
          fullEventKey: "MarketplaceFacet.AssetListed",
          signature: "AssetListed(uint256,address,uint256)",
          args: { tokenId: 2n, seller: "0x00000000000000000000000000000000000000bb", price: 200n },
        },
      });
      throw new Error("simulated second-log projection failure");
    })).rejects.toThrow("simulated second-log projection failure");

    await expect(db.query("SELECT count(*)::text AS count FROM raw_events")).resolves.toMatchObject({ rows: rawCountBefore.rows });
    await expect(db.query("SELECT count(*)::text AS count FROM market_listings")).resolves.toMatchObject({ rows: projectionCountBefore.rows });
  });

  it("orphans a replaced projection and rebuilds the prior canonical current row", async () => {
    const replacementRawEventId = await insertRawEvent("0xreplacement", 11n);
    await projectListing(replacementRawEventId, "0xreplacement", 11n);

    await db.withTransaction(async (client) => {
      await client.query(
        "UPDATE raw_events SET canonical_status = 'orphaned', is_orphaned = TRUE WHERE chain_id = 84532 AND block_number >= 11",
      );
      await client.query(
        "UPDATE market_listings SET canonical_status = 'orphaned', is_orphaned = TRUE, is_current = FALSE WHERE chain_id = 84532 AND last_updated_block >= 11",
      );
      await rebuildCurrentRows(client, "market_listings");
    });

    const rows = await db.query<{ block_number: string; canonical_status: string; is_current: boolean }>(
      "SELECT block_number::text, canonical_status, is_current FROM market_listings ORDER BY block_number",
    );
    expect(rows.rows).toEqual([
      { block_number: "10", canonical_status: "canonical", is_current: true },
      { block_number: "11", canonical_status: "orphaned", is_current: false },
    ]);
  });

  it("journals empty canonical blocks and admits replacements only after orphaning", async () => {
    const insert = `
      INSERT INTO indexer_blocks (
        chain_id, block_number, block_hash, parent_hash, canonical_status, is_orphaned
      ) VALUES (84532, 20, $1, '0xblock-19', 'canonical', FALSE)
      ON CONFLICT (chain_id, block_number, block_hash)
      DO UPDATE SET canonical_status = 'canonical', is_orphaned = FALSE, orphaned_at = NULL
    `;
    await db.query(insert, ["0xold-20"]);
    await db.query(insert, ["0xold-20"]);
    await expect(db.query(insert, ["0xnew-20"])).rejects.toThrow();

    await db.query(`
      UPDATE indexer_blocks
      SET canonical_status = 'orphaned', is_orphaned = TRUE, orphaned_at = timezone('utc', now())
      WHERE chain_id = 84532 AND block_number = 20
    `);
    await db.query(insert, ["0xnew-20"]);

    const rows = await db.query<{ block_hash: string; canonical_status: string; is_orphaned: boolean }>(
      "SELECT block_hash, canonical_status, is_orphaned FROM indexer_blocks WHERE block_number = 20 ORDER BY block_hash",
    );
    expect(rows.rows).toEqual([
      { block_hash: "0xnew-20", canonical_status: "canonical", is_orphaned: false },
      { block_hash: "0xold-20", canonical_status: "orphaned", is_orphaned: true },
    ]);
  });
});
