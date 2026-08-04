import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildWriteInvariantRegistry,
  validateWriteInvariantMetadata,
  type AbiRegistry,
  type ReviewedWriteInvariantFile,
  type WriteInvariant,
} from "./write-invariants-lib.js";
import { generatedManifestDir, readJson } from "./utils.js";

const registry: AbiRegistry = {
  methods: {
    "ExampleFacet.getValue": {
      facetName: "ExampleFacet",
      wrapperKey: "getValue",
      methodName: "getValue",
      signature: "getValue(uint256)",
      category: "read",
      inputs: [{ name: "id", type: "uint256" }],
    },
    "ExampleFacet.setValue": {
      facetName: "ExampleFacet",
      wrapperKey: "setValue",
      methodName: "setValue",
      signature: "setValue(uint256,uint256)",
      category: "write",
      inputs: [{ name: "id", type: "uint256" }, { name: "value", type: "uint256" }],
    },
  },
  events: {
    "ExampleFacet.ValueUpdated": {
      facetName: "ExampleFacet",
      wrapperKey: "ValueUpdated",
      eventName: "ValueUpdated",
      projection: { projectionMode: "current", targets: [{ table: "values", mode: "current" }] },
    },
  },
};

function invariant(): WriteInvariant {
  return {
    abiSignature: "setValue(uint256,uint256)",
    requiredActor: { kind: "role", roles: ["CONFIG_ADMIN_ROLE"], description: "Configuration administrator." },
    preconditions: [{ kind: "authorization", description: "Caller has CONFIG_ADMIN_ROLE." }],
    postStateReadbacks: {
      mode: "required",
      checks: [{ method: "ExampleFacet.getValue", assertion: "Value equals the submitted value." }],
      rationale: "The stored value has a direct getter.",
    },
    emittedEvents: {
      mode: "all",
      events: ["ExampleFacet.ValueUpdated"],
      rationale: "The update must emit its canonical event.",
    },
    balanceEffects: { mode: "none", effects: [], rationale: "This configuration write moves no value." },
    replayConstraints: { mode: "idempotent", keyFields: ["id", "value"], assertion: "Replaying the same value is a no-op." },
    liveNetworkSafety: {
      classification: "fork-only",
      requiresExplicitOptIn: true,
      rationale: "Configuration mutation is destructive outside a fork.",
    },
    indexerExpectations: {
      mode: "required",
      events: ["ExampleFacet.ValueUpdated"],
      projections: ["values:current"],
      assertion: "The current-value projection converges after the event is replayed.",
    },
  };
}

function reviewed(method: WriteInvariant = invariant()): ReviewedWriteInvariantFile {
  return { version: 1, reviewedAt: "2026-08-03", methods: { "ExampleFacet.setValue": method } };
}

describe("write invariant metadata", () => {
  it("builds a generated registry containing every and only ABI write method", () => {
    const output = buildWriteInvariantRegistry(registry, reviewed(), "2026-08-03T12:00:00.000Z");
    expect(output.totals).toEqual({ writeMethodCount: 1, metadataCount: 1 });
    expect(Object.keys(output.methods)).toEqual(["ExampleFacet.setValue"]);
    expect(output.methods["ExampleFacet.setValue"]?.invariants.requiredActor.roles).toEqual(["CONFIG_ADMIN_ROLE"]);
  });

  it("rejects missing and stale metadata instead of silently deriving it", () => {
    expect(validateWriteInvariantMetadata(registry, { version: 1, reviewedAt: "2026-08-03", methods: {} }))
      .toContain("missing reviewed write invariant metadata ExampleFacet.setValue");
    const stale = reviewed();
    stale.methods["ExampleFacet.removedWrite"] = invariant();
    expect(validateWriteInvariantMetadata(registry, stale))
      .toContain("stale reviewed write invariant metadata ExampleFacet.removedWrite");
  });

  it("rejects ABI drift and stale read/event references", () => {
    const value = invariant();
    value.abiSignature = "setValue(uint256)";
    value.postStateReadbacks.checks[0]!.method = "ExampleFacet.removedRead";
    value.emittedEvents.events[0] = "ExampleFacet.RemovedEvent";
    value.indexerExpectations.events[0] = "ExampleFacet.RemovedEvent";
    const problems = validateWriteInvariantMetadata(registry, reviewed(value));
    expect(problems).toEqual(expect.arrayContaining([
      expect.stringContaining("ABI signature mismatch"),
      expect.stringContaining("references non-read ABI method ExampleFacet.removedRead"),
      expect.stringContaining("emitted event reference is stale or missing ExampleFacet.RemovedEvent"),
      expect.stringContaining("indexer event reference is stale or missing ExampleFacet.RemovedEvent"),
    ]));
  });

  it("rejects structurally empty invariant sections", () => {
    const value = invariant();
    value.requiredActor.roles = [];
    value.preconditions = [];
    value.postStateReadbacks.checks = [];
    value.balanceEffects = { mode: "tracked", effects: [], rationale: "Expected movement." };
    value.liveNetworkSafety.requiresExplicitOptIn = false;
    const problems = validateWriteInvariantMetadata(registry, reviewed(value));
    expect(problems).toEqual(expect.arrayContaining([
      expect.stringContaining("must name at least one role"),
      expect.stringContaining("preconditions must contain at least one assertion"),
      expect.stringContaining("required post-state readbacks must contain at least one check"),
      expect.stringContaining("tracked balance effects must contain at least one assertion"),
      expect.stringContaining("writes must require explicit opt-in"),
    ]));
  });

  it("covers every write in the current generated ABI registry", async () => {
    const [currentRegistry, currentReviewed] = await Promise.all([
      readJson<AbiRegistry>(path.join(generatedManifestDir, "abi-method-registry.json")),
      readJson<ReviewedWriteInvariantFile>(path.resolve("reviewed", "reviewed-write-invariants.json")),
    ]);
    const output = buildWriteInvariantRegistry(currentRegistry, currentReviewed, "2026-08-03T12:00:00.000Z");
    const writeCount = Object.values(currentRegistry.methods).filter((method) => method.category === "write").length;
    expect(writeCount).toBe(260);
    expect(output.totals).toEqual({ writeMethodCount: writeCount, metadataCount: writeCount });
    expect(Object.values(output.methods).every((method) => method.invariants.preconditions.length > 0)).toBe(true);
  });
});
