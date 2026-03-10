import { Interface, type EventFragment, type Log } from "ethers";

import { facetRegistry } from "../../client/src/index.js";

type EventDescriptor = {
  facetName: string;
  eventName: string;
  iface: Interface;
};

export type DecodedEvent = {
  facetName: string;
  eventName: string;
  args: Record<string, unknown>;
  signature: string;
};

export function buildEventRegistry(): Map<string, EventDescriptor[]> {
  const registry = new Map<string, EventDescriptor[]>();
  for (const facet of Object.values(facetRegistry)) {
    const iface = new Interface(facet.abi);
    for (const fragment of iface.fragments) {
      if (fragment.type !== "event") {
        continue;
      }
      const eventFragment = fragment as EventFragment;
      const resolved = iface.getEvent(eventFragment.name);
      if (!resolved) {
        continue;
      }
      const topic = resolved.topicHash;
      const existing = registry.get(topic) ?? [];
      existing.push({
        facetName: facet.facetName,
        eventName: eventFragment.name,
        iface,
      });
      registry.set(topic, existing);
    }
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
        eventName: parsed.name,
        args: parsed.args.toObject(),
        signature: parsed.signature,
      };
    } catch {
      continue;
    }
  }
  return null;
}
