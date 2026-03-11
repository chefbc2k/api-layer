import type { PoolClient } from "pg";

import type { ProjectionTable } from "./tables.js";
export type { ProjectionTable } from "./tables.js";

export type ProjectionContext = {
  client: PoolClient;
  chainId: number;
  rawEventId: number;
  txHash: string;
  blockNumber: bigint;
  blockHash: string;
  isOrphaned: boolean;
  facetName: string;
  eventName: string;
  eventSignature: string;
  decodedArgs: Record<string, unknown>;
};

export type ProjectionRecord = {
  entityId: string;
  mode: "current" | "ledger";
  actorAddress?: string | null;
  subjectAddress?: string | null;
  relatedAddress?: string | null;
  status?: string | null;
  metadataUri?: string | null;
  amount?: string | null;
  secondaryAmount?: string | null;
  proposalId?: string | null;
  assetId?: string | null;
  datasetId?: string | null;
  licenseId?: string | null;
  templateId?: string | null;
  listingId?: string | null;
  saleId?: string | null;
  operationId?: string | null;
  withdrawalId?: string | null;
  support?: number | null;
  eventPayload: Record<string, unknown>;
};

function toNullableText(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  return typeof value === "bigint" ? value.toString() : String(value);
}

function toNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null) {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function sanitizeArgs(value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeArgs(entry));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, sanitizeArgs(entry)]));
  }
  return value;
}

export function inferProjectionRecord(
  table: ProjectionTable,
  mode: "current" | "ledger",
  entityId: string,
  args: Record<string, unknown>,
): ProjectionRecord {
  const actorAddress = toNullableText(
    args.account ?? args.user ?? args.owner ?? args.operator ?? args.voter ?? args.delegator ?? args.proposer ?? args.seller ?? args.buyer,
  );
  const subjectAddress = toNullableText(
    args.to ?? args.from ?? args.delegate ?? args.delegatee ?? args.licensee ?? args.creator ?? args.recipient,
  );
  const relatedAddress = toNullableText(
    args.asset ?? args.token ?? args.paymentToken ?? args.currency ?? args.treasury ?? args.contractAddress ?? args.target,
  );
  const amount = toNullableText(
    args.amount ?? args.value ?? args.paymentAmount ?? args.rewardAmount ?? args.price ?? args.forVotes ?? args.newVotes,
  );
  const secondaryAmount = toNullableText(
    args.feeAmount ?? args.oldVotes ?? args.platformFee ?? args.royaltyAmount ?? args.quorum,
  );

  return {
    entityId,
    mode,
    actorAddress,
    subjectAddress,
    relatedAddress,
    status: toNullableText(args.status ?? args.state ?? args.approved ?? args.executed ?? args.trusted),
    metadataUri: toNullableText(args.uri ?? args.metadataURI ?? args.metadata ?? args.description),
    amount,
    secondaryAmount,
    proposalId: toNullableText(args.proposalId),
    assetId: toNullableText(args.assetId ?? args.tokenId ?? args.voiceHash),
    datasetId: toNullableText(args.datasetId),
    licenseId: toNullableText(args.licenseId),
    templateId: toNullableText(args.templateId),
    listingId: toNullableText(args.listingId),
    saleId: toNullableText(args.saleId ?? args.purchaseId),
    operationId: toNullableText(args.operationId ?? args.id),
    withdrawalId: toNullableText(args.withdrawalId ?? args.requestId),
    support: toNullableNumber(args.support),
    eventPayload: sanitizeArgs(args) as Record<string, unknown>,
  };
}

export async function insertProjectionRecord(
  context: ProjectionContext,
  table: ProjectionTable,
  record: ProjectionRecord,
): Promise<void> {
  if (record.mode === "current" && !context.isOrphaned) {
    await context.client.query(
      `
        UPDATE ${table}
        SET is_current = FALSE
        WHERE entity_id = $1
          AND canonical_status = 'canonical'
          AND is_orphaned = FALSE
          AND is_current = TRUE
      `,
      [record.entityId],
    );
  }

  await context.client.query(
    `
      INSERT INTO ${table} (
        entity_id,
        chain_id,
        tx_hash,
        block_number,
        block_hash,
        facet_name,
        event_name,
        event_signature,
        event_payload,
        last_updated_block,
        last_event_id,
        source_raw_event_id,
        canonical_status,
        is_orphaned,
        is_current,
        actor_address,
        subject_address,
        related_address,
        status,
        metadata_uri,
        amount,
        secondary_amount,
        proposal_id,
        asset_id,
        dataset_id,
        license_id,
        template_id,
        listing_id,
        sale_id,
        operation_id,
        withdrawal_id,
        support
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $4, $10, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22,
        $23, $24, $25, $26, $27, $28, $29, $30
      )
      ON CONFLICT (source_raw_event_id, entity_id)
      DO UPDATE SET
        canonical_status = EXCLUDED.canonical_status,
        is_orphaned = EXCLUDED.is_orphaned,
        is_current = EXCLUDED.is_current,
        event_payload = EXCLUDED.event_payload,
        last_updated_block = EXCLUDED.last_updated_block,
        last_event_id = EXCLUDED.last_event_id
    `,
    [
      record.entityId,
      context.chainId,
      context.txHash,
      context.blockNumber.toString(),
      context.blockHash,
      context.facetName,
      context.eventName,
      context.eventSignature,
      JSON.stringify(record.eventPayload),
      context.rawEventId,
      context.isOrphaned ? "orphaned" : "canonical",
      context.isOrphaned,
      record.mode === "current" && !context.isOrphaned,
      record.actorAddress ?? null,
      record.subjectAddress ?? null,
      record.relatedAddress ?? null,
      record.status ?? null,
      record.metadataUri ?? null,
      record.amount ?? null,
      record.secondaryAmount ?? null,
      record.proposalId ?? null,
      record.assetId ?? null,
      record.datasetId ?? null,
      record.licenseId ?? null,
      record.templateId ?? null,
      record.listingId ?? null,
      record.saleId ?? null,
      record.operationId ?? null,
      record.withdrawalId ?? null,
      record.support ?? null,
    ],
  );
}

export async function rebuildCurrentRows(client: PoolClient, table: ProjectionTable): Promise<void> {
  await client.query(`UPDATE ${table} SET is_current = FALSE WHERE is_current = TRUE`);
  await client.query(
    `
      WITH latest AS (
        SELECT DISTINCT ON (entity_id) id
        FROM ${table}
        WHERE canonical_status = 'canonical'
          AND is_orphaned = FALSE
        ORDER BY entity_id, last_updated_block DESC, last_event_id DESC, id DESC
      )
      UPDATE ${table}
      SET is_current = TRUE
      WHERE id IN (SELECT id FROM latest)
    `,
  );
}
