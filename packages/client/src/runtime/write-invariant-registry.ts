import writeInvariantRegistry from "../../../../generated/manifests/write-invariant-registry.json";

import type { AbiMethodDefinition } from "./abi-registry.js";

export type WriteInvariant = {
  emittedEvents: {
    mode: "all" | "one-of" | "none";
    events: string[];
    rationale: string;
  };
  indexerExpectations: {
    mode: "required" | "raw-event-only" | "none";
    events: string[];
    projections: string[];
    assertion: string;
  };
};

export type WriteInvariantDefinition = AbiMethodDefinition & {
  invariants: WriteInvariant;
};

type RegistryShape = {
  methods: Record<string, WriteInvariantDefinition>;
};

const typedRegistry = writeInvariantRegistry as unknown as RegistryShape;

export function getWriteInvariantDefinition(methodKey: string): WriteInvariantDefinition | null {
  return typedRegistry.methods[methodKey] ?? null;
}

export function getAllWriteInvariantDefinitions(): Record<string, WriteInvariantDefinition> {
  return typedRegistry.methods;
}
