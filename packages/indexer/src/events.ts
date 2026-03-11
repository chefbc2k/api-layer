import { Interface, type Log } from "ethers";

import { facetRegistry, getAllAbiEventDefinitions } from "../../client/src/index.js";
import type { AbiEventDefinition } from "../../client/src/runtime/abi-registry.js";

type EventDescriptor = {
  facetName: string;
  eventName: string;
  wrapperKey: string;
  fullEventKey: string;
  iface: Interface;
};

export type DecodedEvent = {
  facetName: string;
  eventName: string;
  wrapperKey: string;
  fullEventKey: string;
  args: Record<string, unknown>;
  signature: string;
};

export function buildEventRegistry(): Map<string, EventDescriptor[]> {
  const registry = new Map<string, EventDescriptor[]>();
  for (const [eventKey, eventDefinition] of Object.entries(getAllAbiEventDefinitions()) as Array<[string, AbiEventDefinition]>) {
    const iface = new Interface(facetRegistry[eventDefinition.facetName as keyof typeof facetRegistry].abi);
    const resolved = iface.getEvent(eventDefinition.wrapperKey);
    if (!resolved) {
      continue;
    }
    const topic = resolved.topicHash;
    const existing = registry.get(topic) ?? [];
    existing.push({
      facetName: eventDefinition.facetName,
      eventName: eventDefinition.eventName,
      wrapperKey: eventDefinition.wrapperKey,
      fullEventKey: eventKey,
      iface,
    });
    registry.set(topic, existing);
  }
  return registry;
}

export function decodeEvent(registry: Map<string, EventDescriptor[]>, log: Log): DecodedEvent | null {
  const topic0 = log.topics[0];
  if (!topic0) {
    return null;
  }
  const candidates = registry.get(topic0) ?? [];
  for (const candidate of candidates) {
    try {
      const parsed = candidate.iface.parseLog(log);
      if (!parsed) {
        continue;
      }
      return {
        facetName: candidate.facetName,
        eventName: candidate.eventName,
        wrapperKey: candidate.wrapperKey,
        fullEventKey: candidate.fullEventKey,
        args: parsed.args.toObject(),
        signature: parsed.signature,
      };
    } catch {
      continue;
    }
  }
  return null;
}
