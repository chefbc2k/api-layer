import { describe, expect, it, vi } from "vitest";
import { Interface, type Log } from "ethers";

import {
  facetRegistry,
  getAllAbiEventDefinitions,
} from "../../client/src/index.js";
import type { AbiEventDefinition, AbiParameter } from "../../client/src/runtime/abi-registry.js";
import { buildEventRegistry, decodeEvent, isAmbiguousEvent, type DecodedEvent } from "./events.js";
import { projectEvent } from "./projections/index.js";

const AMBIGUOUS_EVENT_KEYS = [
  "BurnThresholdFacet.Transfer",
  "DelegationFacet.VotingPowerUpdated",
  "EscrowFacet.AssetEscrowed",
  "MarketplaceFacet.AssetEscrowed",
  "TokenSupplyFacet.Approval",
  "TokenSupplyFacet.Transfer",
  "VoiceAssetFacet.Approval",
  "VoiceAssetFacet.Transfer",
  "VoiceAssetFacet.VoiceAssetUsed",
  "VoiceDatasetFacet.Transfer",
  "VoiceLicenseFacet.LicenseCreated(bytes32,address,bytes32,uint256,uint256)",
  "VoiceLicenseFacet.VoiceAssetUsed",
  "VoiceLicenseTemplateFacet.LicenseCreated",
  "VotingPowerFacet.VotingPowerUpdated",
].sort();

function sampleValue(parameter: AbiParameter): unknown {
  const array = parameter.type.match(/^(.*)\[(\d*)\]$/);
  if (array) {
    const length = array[2] ? Number(array[2]) : 1;
    return Array.from({ length }, () => sampleValue({ ...parameter, type: array[1] }));
  }
  if (parameter.type === "tuple") {
    return (parameter.components ?? []).map((component) => sampleValue(component));
  }
  if (parameter.type === "address") {
    return "0x00000000000000000000000000000000000000aa";
  }
  if (parameter.type === "bool") {
    return true;
  }
  if (parameter.type === "string") {
    return "event-assurance";
  }
  if (parameter.type === "bytes") {
    return "0x1234";
  }
  const fixedBytes = parameter.type.match(/^bytes(\d+)$/);
  if (fixedBytes) {
    return `0x${"11".repeat(Number(fixedBytes[1]))}`;
  }
  if (/^u?int\d*$/.test(parameter.type)) {
    return 1n;
  }
  throw new Error(`missing event assurance sample for ABI type ${parameter.type}`);
}

function encodeLog(definition: AbiEventDefinition, index: number): Log {
  const facet = facetRegistry[definition.facetName as keyof typeof facetRegistry];
  const iface = new Interface(facet.abi);
  const fragment = iface.getEvent(definition.wrapperKey);
  if (!fragment) {
    throw new Error(`missing generated event fragment ${definition.facetName}.${definition.wrapperKey}`);
  }
  const encoded = iface.encodeEventLog(fragment, definition.inputs.map((input) => sampleValue(input)));
  return {
    address: "0x0000000000000000000000000000000000000001",
    data: encoded.data,
    topics: encoded.topics,
    transactionHash: `0x${index.toString(16).padStart(64, "0")}`,
    blockHash: `0x${(index + 1).toString(16).padStart(64, "0")}`,
    blockNumber: index + 1,
    index,
    removed: false,
  } as unknown as Log;
}

describe("generated event-to-indexer assurance", () => {
  it("registers and decodes the complete generated event inventory without silent facet selection", () => {
    const definitions = Object.entries(getAllAbiEventDefinitions()).sort(([left], [right]) => left.localeCompare(right));
    const registry = buildEventRegistry();
    const registeredKeys = [...registry.values()]
      .flatMap((candidates) => candidates.map((candidate) => candidate.fullEventKey))
      .sort((left, right) => left.localeCompare(right));
    const ambiguousKeys: string[] = [];

    expect(definitions).toHaveLength(214);
    expect(registeredKeys).toEqual(definitions.map(([eventKey]) => eventKey));

    definitions.forEach(([eventKey, definition], index) => {
      const decoded = decodeEvent(registry, encodeLog(definition, index));
      expect(decoded, eventKey).not.toBeNull();
      if (isAmbiguousEvent(decoded!)) {
        expect(decoded!.candidateEventKeys, eventKey).toContain(eventKey);
        ambiguousKeys.push(eventKey);
        return;
      }
      expect(decoded, eventKey).toMatchObject({
        facetName: definition.facetName,
        eventName: definition.eventName,
        wrapperKey: definition.wrapperKey,
        fullEventKey: eventKey,
        signature: definition.signature,
      });
    });

    expect(ambiguousKeys.sort()).toEqual(AMBIGUOUS_EVENT_KEYS);
  });

  it("projects every unambiguous generated event target into the reviewed Postgres table", async () => {
    const definitions = Object.entries(getAllAbiEventDefinitions()).sort(([left], [right]) => left.localeCompare(right));
    const registry = buildEventRegistry();
    const client = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    let expectedQueryCount = 0;
    let provenTargetCount = 0;

    for (const [eventKey, definition] of definitions) {
      const decoded = decodeEvent(registry, encodeLog(definition, provenTargetCount));
      if (!decoded || isAmbiguousEvent(decoded)) {
        continue;
      }
      const callsBefore = client.query.mock.calls.length;
      await projectEvent({
        chainId: 84532,
        client: client as never,
        rawEventId: provenTargetCount + 1,
        txHash: `0x${(provenTargetCount + 1).toString(16).padStart(64, "0")}`,
        blockNumber: BigInt(provenTargetCount + 1),
        blockHash: `0x${(provenTargetCount + 2).toString(16).padStart(64, "0")}`,
        isOrphaned: false,
        decoded: decoded as DecodedEvent,
      });

      const queryCount = definition.projection.targets.reduce(
        (count, target) => count + (target.mode === "current" ? 2 : 1),
        0,
      );
      expectedQueryCount += queryCount;
      provenTargetCount += definition.projection.targets.length;
      expect(client.query.mock.calls.length - callsBefore, eventKey).toBe(queryCount);
      for (const target of definition.projection.targets) {
        expect(
          client.query.mock.calls.some(([sql]) => String(sql).includes(`INSERT INTO ${target.table}`)),
          `${eventKey} -> ${target.table}`,
        ).toBe(true);
      }
    }

    const expectedProvenTargets = definitions
      .filter(([eventKey]) => !AMBIGUOUS_EVENT_KEYS.includes(eventKey))
      .reduce((count, [, definition]) => count + definition.projection.targets.length, 0);
    expect(provenTargetCount).toBe(expectedProvenTargets);
    expect(client.query).toHaveBeenCalledTimes(expectedQueryCount);
  });
});
