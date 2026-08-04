export const WRITE_INVARIANT_SCHEMA_VERSION = 1 as const;

export type AbiMethod = {
  facetName: string;
  wrapperKey: string;
  methodName: string;
  signature: string;
  category: "read" | "write";
  inputs: Array<{ name?: string; type: string }>;
};

export type AbiEvent = {
  facetName: string;
  wrapperKey: string;
  eventName: string;
  projection?: {
    projectionMode: "rawOnly" | "ledger" | "current" | "mixed";
    targets: Array<{ table: string; mode: "ledger" | "current" }>;
  };
};

export type AbiRegistry = {
  methods: Record<string, AbiMethod>;
  events: Record<string, AbiEvent>;
};

export type WriteInvariant = {
  abiSignature: string;
  requiredActor: {
    kind: "self" | "role" | "owner-or-approved" | "contract" | "permissionless";
    roles: string[];
    description: string;
  };
  preconditions: Array<{
    kind: "authorization" | "argument" | "lifecycle" | "funding" | "timing" | "protocol-state";
    description: string;
  }>;
  postStateReadbacks: {
    mode: "required" | "none";
    checks: Array<{ method: string; assertion: string }>;
    rationale: string;
  };
  emittedEvents: {
    mode: "all" | "one-of" | "none";
    events: string[];
    rationale: string;
  };
  balanceEffects: {
    mode: "tracked" | "none";
    effects: Array<{
      asset: "native" | "erc20" | "erc721" | "protocol-accounting";
      direction: "increase" | "decrease" | "transfer" | "mint" | "burn" | "lock" | "unlock";
      accounts: string[];
      assertion: string;
    }>;
    rationale: string;
  };
  replayConstraints: {
    mode: "idempotent" | "state-transition" | "nonce-and-deadline" | "unique-reference" | "repeatable";
    keyFields: string[];
    assertion: string;
  };
  liveNetworkSafety: {
    classification: "safe-with-fixture" | "fork-only" | "never-automate-live";
    requiresExplicitOptIn: boolean;
    rationale: string;
  };
  indexerExpectations: {
    mode: "required" | "raw-event-only" | "none";
    events: string[];
    projections: string[];
    assertion: string;
  };
};

export type ReviewedWriteInvariantFile = {
  version: number;
  reviewedAt: string;
  methods: Record<string, WriteInvariant>;
};

export type GeneratedWriteInvariantRegistry = {
  schemaVersion: typeof WRITE_INVARIANT_SCHEMA_VERSION;
  generatedAt: string;
  totals: { writeMethodCount: number; metadataCount: number };
  methods: Record<string, AbiMethod & { invariants: WriteInvariant }>;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function requireDescription(problems: string[], key: string, path: string, value: unknown): void {
  if (!isNonEmptyString(value)) problems.push(`${key}: ${path} must be a non-empty string`);
}

function requireEnum(problems: string[], key: string, path: string, value: unknown, allowed: readonly string[]): void {
  if (typeof value !== "string" || !allowed.includes(value)) {
    problems.push(`${key}: ${path} must be one of ${allowed.join(", ")}`);
  }
}

export function validateWriteInvariantMetadata(
  registry: AbiRegistry,
  reviewed: ReviewedWriteInvariantFile,
): string[] {
  const problems: string[] = [];
  if (reviewed.version !== WRITE_INVARIANT_SCHEMA_VERSION) {
    problems.push(`unsupported write invariant metadata version ${reviewed.version}`);
  }
  requireDescription(problems, "metadata", "reviewedAt", reviewed.reviewedAt);

  const writeKeys = Object.entries(registry.methods)
    .filter(([, method]) => method.category === "write")
    .map(([key]) => key)
    .sort();
  const writeKeySet = new Set(writeKeys);

  for (const key of writeKeys) {
    if (!reviewed.methods[key]) problems.push(`missing reviewed write invariant metadata ${key}`);
  }
  for (const key of Object.keys(reviewed.methods).sort()) {
    if (!writeKeySet.has(key)) problems.push(`stale reviewed write invariant metadata ${key}`);
  }

  for (const key of writeKeys) {
    const method = registry.methods[key];
    const invariant = reviewed.methods[key];
    if (!method || !invariant) continue;
    if (invariant.abiSignature !== method.signature) {
      problems.push(`${key}: ABI signature mismatch metadata=${invariant.abiSignature} abi=${method.signature}`);
    }

    requireEnum(problems, key, "requiredActor.kind", invariant.requiredActor?.kind, ["self", "role", "owner-or-approved", "contract", "permissionless"]);
    requireDescription(problems, key, "requiredActor.description", invariant.requiredActor?.description);
    if (invariant.requiredActor?.kind === "role" && (invariant.requiredActor.roles ?? []).length === 0) {
      problems.push(`${key}: role actor metadata must name at least one role`);
    }
    if (!Array.isArray(invariant.preconditions) || invariant.preconditions.length === 0) {
      problems.push(`${key}: preconditions must contain at least one assertion`);
    } else {
      invariant.preconditions.forEach((item, index) => {
        requireEnum(problems, key, `preconditions[${index}].kind`, item.kind, ["authorization", "argument", "lifecycle", "funding", "timing", "protocol-state"]);
        requireDescription(problems, key, `preconditions[${index}].description`, item.description);
      });
    }

    const readbacks = invariant.postStateReadbacks;
    requireEnum(problems, key, "postStateReadbacks.mode", readbacks?.mode, ["required", "none"]);
    requireDescription(problems, key, "postStateReadbacks.rationale", readbacks?.rationale);
    if (readbacks?.mode === "required" && (readbacks.checks ?? []).length === 0) {
      problems.push(`${key}: required post-state readbacks must contain at least one check`);
    }
    if (readbacks?.mode === "none" && (readbacks.checks ?? []).length > 0) {
      problems.push(`${key}: post-state readbacks marked none must not contain checks`);
    }
    for (const [index, check] of (readbacks?.checks ?? []).entries()) {
      const referenced = registry.methods[check.method];
      if (!referenced || referenced.category !== "read") {
        problems.push(`${key}: postStateReadbacks.checks[${index}] references non-read ABI method ${check.method}`);
      }
      requireDescription(problems, key, `postStateReadbacks.checks[${index}].assertion`, check.assertion);
    }

    const emitted = invariant.emittedEvents;
    requireEnum(problems, key, "emittedEvents.mode", emitted?.mode, ["all", "one-of", "none"]);
    requireDescription(problems, key, "emittedEvents.rationale", emitted?.rationale);
    if ((emitted?.mode === "all" || emitted?.mode === "one-of") && (emitted.events ?? []).length === 0) {
      problems.push(`${key}: emitted events mode ${emitted.mode} must name at least one event`);
    }
    if (emitted?.mode === "none" && (emitted.events ?? []).length > 0) {
      problems.push(`${key}: emitted events marked none must not name events`);
    }
    for (const eventKey of emitted?.events ?? []) {
      if (!registry.events[eventKey]) problems.push(`${key}: emitted event reference is stale or missing ${eventKey}`);
    }

    const balances = invariant.balanceEffects;
    requireEnum(problems, key, "balanceEffects.mode", balances?.mode, ["tracked", "none"]);
    requireDescription(problems, key, "balanceEffects.rationale", balances?.rationale);
    if (balances?.mode === "tracked" && (balances.effects ?? []).length === 0) {
      problems.push(`${key}: tracked balance effects must contain at least one assertion`);
    }
    if (balances?.mode === "none" && (balances.effects ?? []).length > 0) {
      problems.push(`${key}: balance effects marked none must not contain assertions`);
    }
    for (const [index, effect] of (balances?.effects ?? []).entries()) {
      requireEnum(problems, key, `balanceEffects.effects[${index}].asset`, effect.asset, ["native", "erc20", "erc721", "protocol-accounting"]);
      requireEnum(problems, key, `balanceEffects.effects[${index}].direction`, effect.direction, ["increase", "decrease", "transfer", "mint", "burn", "lock", "unlock"]);
      if ((effect.accounts ?? []).length === 0) problems.push(`${key}: balanceEffects.effects[${index}] must name affected accounts`);
      requireDescription(problems, key, `balanceEffects.effects[${index}].assertion`, effect.assertion);
    }

    requireEnum(problems, key, "replayConstraints.mode", invariant.replayConstraints?.mode, ["idempotent", "state-transition", "nonce-and-deadline", "unique-reference", "repeatable"]);
    requireDescription(problems, key, "replayConstraints.assertion", invariant.replayConstraints?.assertion);
    requireEnum(problems, key, "liveNetworkSafety.classification", invariant.liveNetworkSafety?.classification, ["safe-with-fixture", "fork-only", "never-automate-live"]);
    requireDescription(problems, key, "liveNetworkSafety.rationale", invariant.liveNetworkSafety?.rationale);
    if (invariant.liveNetworkSafety?.classification !== "safe-with-fixture" && !invariant.liveNetworkSafety?.requiresExplicitOptIn) {
      problems.push(`${key}: ${invariant.liveNetworkSafety?.classification} writes must require explicit opt-in`);
    }

    const indexer = invariant.indexerExpectations;
    requireEnum(problems, key, "indexerExpectations.mode", indexer?.mode, ["required", "raw-event-only", "none"]);
    requireDescription(problems, key, "indexerExpectations.assertion", indexer?.assertion);
    if (indexer && indexer.mode !== "none" && (indexer.events ?? []).length === 0) {
      problems.push(`${key}: indexer mode ${indexer.mode} must name at least one event`);
    }
    if (indexer?.mode === "none" && ((indexer.events ?? []).length > 0 || (indexer.projections ?? []).length > 0)) {
      problems.push(`${key}: indexer expectations marked none must not name events or projections`);
    }
    for (const eventKey of indexer?.events ?? []) {
      if (!registry.events[eventKey]) problems.push(`${key}: indexer event reference is stale or missing ${eventKey}`);
      if (!(emitted?.events ?? []).includes(eventKey)) problems.push(`${key}: indexer event ${eventKey} is not an emitted-event expectation`);
    }
    if (indexer) {
      const expectedProjections = [...new Set(indexer.events.flatMap((eventKey) =>
        registry.events[eventKey]?.projection?.targets.map((target) => `${target.table}:${target.mode}`) ?? [],
      ))].sort();
      const actualProjections = [...new Set(indexer.projections ?? [])].sort();
      if (JSON.stringify(actualProjections) !== JSON.stringify(expectedProjections)) {
        problems.push(`${key}: indexer projections mismatch metadata=[${actualProjections.join(", ")}] abi=[${expectedProjections.join(", ")}]`);
      }
      const expectedMode = indexer.events.length === 0 ? "none" : expectedProjections.length === 0 ? "raw-event-only" : "required";
      if (indexer.mode !== expectedMode) {
        problems.push(`${key}: indexer mode mismatch metadata=${indexer.mode} expected=${expectedMode}`);
      }
    }
  }

  return problems;
}

export function buildWriteInvariantRegistry(
  registry: AbiRegistry,
  reviewed: ReviewedWriteInvariantFile,
  generatedAt: string,
): GeneratedWriteInvariantRegistry {
  const problems = validateWriteInvariantMetadata(registry, reviewed);
  if (problems.length > 0) throw new Error(problems.join("\n"));

  const methods = Object.fromEntries(
    Object.entries(registry.methods)
      .filter(([, method]) => method.category === "write")
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, method]) => [key, { ...method, invariants: reviewed.methods[key] }]),
  );
  return {
    schemaVersion: WRITE_INVARIANT_SCHEMA_VERSION,
    generatedAt,
    totals: { writeMethodCount: Object.keys(methods).length, metadataCount: Object.keys(reviewed.methods).length },
    methods,
  };
}
