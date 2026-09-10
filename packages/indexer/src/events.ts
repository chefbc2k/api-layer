import { Interface, type Log } from "ethers";

import { facetRegistry, getAbiEventDefinition, getAllAbiEventDefinitions } from "../../client/src/index.js";
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

export type AmbiguousEvent = {
  eventName: string;
  signature: string;
  candidateEventKeys: string[];
  candidateArgs: Record<string, Record<string, unknown>>;
};

export type EventDecodeResult = DecodedEvent | AmbiguousEvent | null;

export function isAmbiguousEvent(event: Exclude<EventDecodeResult, null>): event is AmbiguousEvent {
  return "candidateEventKeys" in event;
}

export function resolveExpectedEvent(
  event: Exclude<EventDecodeResult, null>,
  expectedEventKeys: readonly string[],
): Exclude<EventDecodeResult, null> {
  if (!isAmbiguousEvent(event)) {
    return event;
  }
  const matches = event.candidateEventKeys.filter((eventKey) => expectedEventKeys.includes(eventKey));
  if (matches.length !== 1) {
    return event;
  }
  const fullEventKey = matches[0];
  const definition = getAbiEventDefinition(fullEventKey);
  const args = event.candidateArgs[fullEventKey];
  if (!definition || !args) {
    return event;
  }
  return {
    facetName: definition.facetName,
    eventName: definition.eventName,
    wrapperKey: definition.wrapperKey,
    fullEventKey,
    args,
    signature: event.signature,
  };
}

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

export const decodeEvent = (registry: Map<string, EventDescriptor[]>, log: Log): EventDecodeResult => {
  const topic0 = log.topics[0];
  if (!topic0) {
    return null;
  }
  const candidates = registry.get(topic0);
  if (!candidates || candidates.length === 0) {
    return null;
  }
  const matches: DecodedEvent[] = [];
  for (const candidate of candidates) {
    try {
      const parsed = candidate.iface.parseLog(log);
      if (!parsed) {
        continue;
      }
      matches.push({
        facetName: candidate.facetName,
        eventName: candidate.eventName,
        wrapperKey: candidate.wrapperKey,
        fullEventKey: candidate.fullEventKey,
        args: parsed.args.toObject(),
        signature: parsed.signature,
      });
    } catch {
      continue;
    }
  }
  if (matches.length === 0) {
    return null;
  }
  if (matches.length === 1) {
    return matches[0];
  }
  return {
    eventName: matches[0].eventName,
    signature: matches[0].signature,
    candidateEventKeys: matches.map((match) => match.fullEventKey),
    candidateArgs: Object.fromEntries(matches.map((match) => [match.fullEventKey, match.args])),
  };
};
