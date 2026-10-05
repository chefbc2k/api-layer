import { describe, expect, it, vi } from "vitest";

import type { DecodedEvent } from "../events.js";
import { projectEvent } from "./index.js";

const owner = "0x00000000000000000000000000000000000000AA";
const recipient = "0x00000000000000000000000000000000000000BB";

const semanticIdentityCases = [
  {
    eventKey: "ProposalFacet.ProposalTypeConfigSet",
    signature: "ProposalTypeConfigSet(uint8,uint256,uint256,uint256)",
    expectedEntityId: "proposal-type-config:2",
    firstArgs: { proposalType: 2n, threshold: 100n, quorum: 20n, delay: 60n },
    secondArgs: { proposalType: 2n, threshold: 200n, quorum: 30n, delay: 120n },
  },
  {
    eventKey: "EmergencyWithdrawalFacet.RecipientWhitelisted",
    signature: "RecipientWhitelisted(address,bool)",
    expectedEntityId: `recipient-whitelist:${recipient.toLowerCase()}`,
    firstArgs: { recipient, whitelisted: true },
    secondArgs: { recipient, whitelisted: false },
  },
  {
    eventKey: "EmergencyWithdrawalFacet.WithdrawalConfigUpdated",
    signature: "WithdrawalConfigUpdated(uint256,uint256,uint256,bool,uint256)",
    expectedEntityId: "withdrawal-config:global",
    firstArgs: {
      delay: 60n,
      maxInstant: 100n,
      requiredApprovals: 1n,
      requiresEmergencyAdmin: false,
      daily24hLimit: 1_000n,
    },
    secondArgs: {
      delay: 120n,
      maxInstant: 200n,
      requiredApprovals: 2n,
      requiresEmergencyAdmin: true,
      daily24hLimit: 2_000n,
    },
  },
  {
    eventKey: "EmergencyWithdrawalFacet.EmergencyWithdrawal",
    signature: "EmergencyWithdrawal(address,address,uint256,uint256)",
    expectedEntityId: `instant-withdrawal:${owner.toLowerCase()}:${recipient.toLowerCase()}`,
    firstArgs: { owner, recipient, amount: 100n, timestamp: 1_000n },
    secondArgs: { owner, recipient, amount: 200n, timestamp: 2_000n },
  },
] as const;

function decodedEvent(
  eventKey: string,
  signature: string,
  args: Record<string, unknown>,
): DecodedEvent {
  const [facetName, wrapperKey] = eventKey.split(".");
  return {
    facetName,
    eventName: wrapperKey,
    wrapperKey,
    fullEventKey: eventKey,
    args,
    signature,
  };
}

describe("event projection semantic identities", () => {
  it.each(semanticIdentityCases)(
    "keeps distinct $eventKey raw events on the same semantic entity",
    async (testCase) => {
      const client = { query: vi.fn().mockResolvedValue({ rows: [] }) };

      await projectEvent({
        chainId: 84532,
        client: client as never,
        rawEventId: 701,
        txHash: `0x${"11".repeat(32)}`,
        blockNumber: 10_001n,
        blockHash: `0x${"aa".repeat(32)}`,
        isOrphaned: false,
        decoded: decodedEvent(testCase.eventKey, testCase.signature, testCase.firstArgs),
      });
      await projectEvent({
        chainId: 84532,
        client: client as never,
        rawEventId: 702,
        txHash: `0x${"22".repeat(32)}`,
        blockNumber: 10_002n,
        blockHash: `0x${"bb".repeat(32)}`,
        isOrphaned: false,
        decoded: decodedEvent(testCase.eventKey, testCase.signature, testCase.secondArgs),
      });

      const updateCalls = client.query.mock.calls.filter(([sql]) => String(sql).includes("SET is_current = FALSE"));
      const insertCalls = client.query.mock.calls.filter(([sql]) => String(sql).includes("INSERT INTO"));

      expect(updateCalls).toHaveLength(2);
      expect(insertCalls).toHaveLength(2);
      expect(updateCalls.map(([, params]) => params)).toEqual([
        [testCase.expectedEntityId],
        [testCase.expectedEntityId],
      ]);
      expect(insertCalls.map(([, params]) => params[0])).toEqual([
        testCase.expectedEntityId,
        testCase.expectedEntityId,
      ]);
      expect(insertCalls.map(([, params]) => params[2])).toEqual([
        `0x${"11".repeat(32)}`,
        `0x${"22".repeat(32)}`,
      ]);
      expect(insertCalls.map(([, params]) => params[9])).toEqual([701, 702]);
    },
  );
});
