import type { PoolClient } from "pg";

import type { DecodedEvent } from "../events.js";
import { upsertProjection } from "./common.js";

type ProjectEventInput = {
  client: PoolClient;
  rawEventId: number;
  txHash: string;
  blockNumber: bigint;
  blockHash: string;
  isOrphaned: boolean;
  decoded: DecodedEvent;
};

function entityId(decoded: DecodedEvent, fallback: string): string {
  const args = decoded.args as Record<string, unknown>;
  const candidate = args.voiceHash ?? args.tokenId ?? args.proposalId ?? args.operationId ?? args.scheduleId ?? args.licenseId ?? args.templateId ?? args.datasetId ?? args.listingId ?? args.withdrawalId;
  return String(candidate ?? fallback);
}

export async function projectEvent(input: ProjectEventInput): Promise<void> {
  const args = input.decoded.args;
  const context = {
    client: input.client,
    rawEventId: input.rawEventId,
    txHash: input.txHash,
    blockNumber: input.blockNumber,
    blockHash: input.blockHash,
    isOrphaned: input.isOrphaned,
    decodedArgs: args,
  };

  const name = input.decoded.eventName;
  if (/Voice|Asset/i.test(name)) {
    await upsertProjection(context, "voice_assets", entityId(input.decoded, input.txHash), { eventName: name, ...args });
  }
  if (/Dataset/i.test(name)) {
    await upsertProjection(context, "voice_datasets", entityId(input.decoded, input.txHash), { eventName: name, ...args });
    if (/AssetAdded|Append/i.test(name)) {
      await upsertProjection(context, "voice_dataset_members", `${entityId(input.decoded, input.txHash)}:${String(args.assetId ?? args.voiceHash ?? input.txHash)}`, { eventName: name, ...args });
    }
  }
  if (/Template/i.test(name)) {
    await upsertProjection(context, "voice_license_templates", entityId(input.decoded, input.txHash), { eventName: name, ...args });
  }
  if (/License/i.test(name)) {
    await upsertProjection(context, "voice_licenses", entityId(input.decoded, input.txHash), { eventName: name, ...args });
  }
  if (/Listing|Marketplace/i.test(name)) {
    await upsertProjection(context, "market_listings", entityId(input.decoded, input.txHash), { eventName: name, ...args });
  }
  if (/Purchase|Sale|Settlement/i.test(name)) {
    await upsertProjection(context, "market_sales", entityId(input.decoded, input.txHash), { eventName: name, ...args });
  }
  if (/Payment|Distribution|Buyback/i.test(name)) {
    await upsertProjection(context, "payment_flows", entityId(input.decoded, input.txHash), { eventName: name, ...args });
  }
  if (/Withdraw/i.test(name)) {
    await upsertProjection(context, "payment_withdrawals", entityId(input.decoded, input.txHash), { eventName: name, ...args });
  }
  if (/Stake|Unstake|Epoch/i.test(name)) {
    await upsertProjection(context, "staking_positions", entityId(input.decoded, input.txHash), { eventName: name, ...args });
  }
  if (/Reward|Claim/i.test(name)) {
    await upsertProjection(context, "staking_rewards", entityId(input.decoded, input.txHash), { eventName: name, ...args });
  }
  if (/Proposal/i.test(name)) {
    await upsertProjection(context, "governance_proposals", entityId(input.decoded, input.txHash), { eventName: name, ...args });
  }
  if (/Vote/i.test(name)) {
    await upsertProjection(context, "governance_votes", entityId(input.decoded, input.txHash), { eventName: name, ...args });
  }
  if (/Delegat/i.test(name)) {
    await upsertProjection(context, "governance_delegations", entityId(input.decoded, input.txHash), { eventName: name, ...args });
  }
  if (/Timelock|CallScheduled|CallExecuted|MinDelay/i.test(name)) {
    await upsertProjection(context, "timelock_operations", entityId(input.decoded, input.txHash), { eventName: name, ...args });
  }
  if (/Emergency|Recovery/i.test(name)) {
    await upsertProjection(context, "emergency_incidents", entityId(input.decoded, input.txHash), { eventName: name, ...args });
  }
  if (/EmergencyWithdrawal/i.test(name)) {
    await upsertProjection(context, "emergency_withdrawals", entityId(input.decoded, input.txHash), { eventName: name, ...args });
  }
  if (/Vesting|Unlock|Release/i.test(name)) {
    await upsertProjection(context, "vesting_schedules", entityId(input.decoded, input.txHash), { eventName: name, ...args });
    if (/Release|Claim/i.test(name)) {
      await upsertProjection(context, "vesting_releases", entityId(input.decoded, input.txHash), { eventName: name, ...args });
    }
  }
  if (/Operation|Approval|Execution/i.test(name) && /MultiSig|Owner|Upgrade/i.test(input.decoded.facetName + name)) {
    await upsertProjection(context, "multisig_operations", entityId(input.decoded, input.txHash), { eventName: name, ...args });
  }
  if (/Upgrade/i.test(name)) {
    await upsertProjection(context, "upgrade_requests", entityId(input.decoded, input.txHash), { eventName: name, ...args });
  }
  if (/Ownership/i.test(name)) {
    await upsertProjection(context, "ownership_transfers", entityId(input.decoded, input.txHash), { eventName: name, ...args });
  }
}

