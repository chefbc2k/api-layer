import type { PoolClient } from "pg";

import { getAbiEventDefinition } from "../../../client/src/index.js";
import type { DecodedEvent } from "../events.js";
import { inferProjectionRecord, insertProjectionRecord, type ProjectionTable } from "./common.js";

type ProjectEventInput = {
  chainId: number;
  client: PoolClient;
  rawEventId: number;
  txHash: string;
  blockNumber: bigint;
  blockHash: string;
  isOrphaned: boolean;
  decoded: DecodedEvent;
};

function firstDefined(args: Record<string, unknown>, keys: string[], fallback: string): string {
  for (const key of keys) {
    const value = args[key];
    if (value !== undefined && value !== null) {
      return typeof value === "bigint" ? value.toString() : String(value);
    }
  }
  return fallback;
}

function entityIdFor(table: ProjectionTable, decoded: DecodedEvent, fallback: string): string {
  const args = decoded.args as Record<string, unknown>;
  switch (table) {
    case "voice_assets":
      return firstDefined(args, ["assetId", "tokenId", "voiceHash"], fallback);
    case "voice_datasets":
      return firstDefined(args, ["datasetId"], fallback);
    case "voice_dataset_members":
      return `${firstDefined(args, ["datasetId"], fallback)}:${firstDefined(args, ["assetId", "tokenId", "voiceHash"], fallback)}`;
    case "voice_license_templates":
      return firstDefined(args, ["templateId"], fallback);
    case "voice_licenses":
      return firstDefined(args, ["licenseId"], fallback);
    case "market_listings":
      return firstDefined(args, ["listingId"], fallback);
    case "market_sales":
      return `${decoded.fullEventKey}:${fallback}`;
    case "payment_flows":
      return `${decoded.fullEventKey}:${fallback}`;
    case "payment_withdrawals":
      return firstDefined(args, ["withdrawalId", "requestId"], fallback);
    case "staking_positions":
      return firstDefined(args, ["account", "user", "staker"], fallback);
    case "staking_rewards":
      return `${firstDefined(args, ["account", "user", "staker"], fallback)}:${fallback}`;
    case "governance_proposals":
      return firstDefined(args, ["proposalId"], fallback);
    case "governance_votes":
      return `${firstDefined(args, ["proposalId"], fallback)}:${firstDefined(args, ["voter"], fallback)}`;
    case "governance_delegations":
      return firstDefined(args, ["delegator", "delegate", "delegatee", "account"], fallback);
    case "timelock_operations":
      return firstDefined(args, ["operationId", "id"], fallback);
    case "emergency_incidents":
      return `${decoded.fullEventKey}:${fallback}`;
    case "emergency_withdrawals":
      return firstDefined(args, ["withdrawalId", "requestId"], fallback);
    case "vesting_schedules":
      return firstDefined(args, ["scheduleId", "vestingId"], fallback);
    case "vesting_releases":
      return `${firstDefined(args, ["scheduleId", "vestingId"], fallback)}:${fallback}`;
    case "multisig_operations":
      return firstDefined(args, ["operationId", "id"], fallback);
    case "upgrade_requests":
      return firstDefined(args, ["operationId", "upgradeId", "id"], fallback);
    case "ownership_transfers":
      return fallback;
  }
  return fallback;
}

export async function projectEvent(input: ProjectEventInput): Promise<void> {
  const eventDefinition = getAbiEventDefinition(input.decoded.fullEventKey);
  if (!eventDefinition) {
    throw new Error(`missing event definition for ${input.decoded.fullEventKey}`);
  }

  for (const target of eventDefinition.projection.targets) {
    const entityId = entityIdFor(target.table as ProjectionTable, input.decoded, `${input.txHash}:${input.rawEventId}`);
    await insertProjectionRecord(
      {
        client: input.client,
        chainId: input.chainId,
        rawEventId: input.rawEventId,
        txHash: input.txHash,
        blockNumber: input.blockNumber,
        blockHash: input.blockHash,
        isOrphaned: input.isOrphaned,
        facetName: input.decoded.facetName,
        eventName: input.decoded.wrapperKey,
        eventSignature: input.decoded.signature,
        decodedArgs: input.decoded.args,
      },
      target.table as ProjectionTable,
      inferProjectionRecord(target.table as ProjectionTable, target.mode, entityId, input.decoded.args),
    );
  }
}
