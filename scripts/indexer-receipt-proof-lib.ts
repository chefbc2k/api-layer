import { id } from "ethers";

import {
  getAllAbiEventDefinitions,
  getAllWriteInvariantDefinitions,
} from "../packages/client/src/index.js";

type WriteDefinition = ReturnType<typeof getAllWriteInvariantDefinitions>[string];
type EventDefinitions = ReturnType<typeof getAllAbiEventDefinitions>;

export type IndexedEventRow = {
  facet_name: string | null;
  event_name: string;
  event_signature: string | null;
};

export type ReceiptExpectationResult = {
  txHash: string;
  methodKey: string;
  expectedEventMode: "all" | "one-of" | "none";
  expectedEventKeys: string[];
  indexedEventKeys: string[];
  expectedProjectionTables: string[];
  projectedTables: string[];
  failures: string[];
};

export type ReceiptProofArtifactEligibility = {
  eligible: boolean;
  reason: string | null;
};

export type PersistentReceiptEvidence = {
  txHash?: unknown;
  postgres?: {
    rawEvents?: { rowCount?: unknown };
    projections?: Array<{ rowCount?: unknown }>;
  };
  source?: { workflowArtifacts?: unknown };
};

export type PersistentMethodReport = Record<string, unknown> & {
  evidence?: PersistentReceiptEvidence[];
};

export type PersistentProofReports = Record<string, PersistentMethodReport>;

const TX_HASH_PATTERN = /^0x[0-9a-fA-F]{64}$/u;

export function receiptProofArtifactEligibility(value: unknown): ReceiptProofArtifactEligibility {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { eligible: false, reason: "artifact root is not an object" };
  }
  const artifact = value as Record<string, unknown>;
  for (const field of ["status", "summary"] as const) {
    if (field in artifact && artifact[field] !== "proven working") {
      return { eligible: false, reason: `${field} is ${JSON.stringify(artifact[field])}` };
    }
  }
  return { eligible: true, reason: null };
}

export function collectTransactionHashes(value: unknown, hashes = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const entry of value) {
      collectTransactionHashes(entry, hashes);
    }
    return hashes;
  }
  if (!value || typeof value !== "object") {
    return hashes;
  }
  for (const [key, entry] of Object.entries(value)) {
    if (key === "transactionHashes" && Array.isArray(entry)) {
      for (const candidate of entry) {
        if (typeof candidate === "string" && TX_HASH_PATTERN.test(candidate)) {
          hashes.add(candidate.toLowerCase());
        }
      }
      continue;
    }
    if ((key === "txHash" || key === "transactionHash" || key === "hash") && typeof entry === "string" && TX_HASH_PATTERN.test(entry)) {
      hashes.add(entry.toLowerCase());
      continue;
    }
    collectTransactionHashes(entry, hashes);
  }
  return hashes;
}

export function mergePersistentProofReports(
  previous: PersistentProofReports,
  current: PersistentProofReports,
): PersistentProofReports {
  const methodKeys = [...new Set([...Object.keys(previous), ...Object.keys(current)])]
    .sort((left, right) => left.localeCompare(right));
  return Object.fromEntries(methodKeys.map((methodKey) => {
    const priorReport = previous[methodKey];
    const currentReport = current[methodKey];
    const evidence = [...(priorReport?.evidence ?? []), ...(currentReport?.evidence ?? [])];
    const uniqueEvidence = new Map<string, PersistentReceiptEvidence>();
    for (const entry of evidence) {
      if (typeof entry.txHash === "string" && TX_HASH_PATTERN.test(entry.txHash)) {
        uniqueEvidence.set(entry.txHash.toLowerCase(), entry);
      }
    }
    return [methodKey, {
      ...(priorReport ?? {}),
      ...(currentReport ?? {}),
      evidence: [...uniqueEvidence.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([, entry]) => entry),
    }];
  }));
}

export function summarizePersistentProofReports(
  reports: PersistentProofReports,
  catalogWriteMethods: number,
  skippedArtifacts = 0,
) {
  const receipts = new Map<string, PersistentReceiptEvidence>();
  const artifacts = new Set<string>();
  for (const report of Object.values(reports)) {
    for (const evidence of report.evidence ?? []) {
      if (typeof evidence.txHash === "string" && TX_HASH_PATTERN.test(evidence.txHash)) {
        receipts.set(evidence.txHash.toLowerCase(), evidence);
      }
      if (Array.isArray(evidence.source?.workflowArtifacts)) {
        for (const artifact of evidence.source.workflowArtifacts) {
          if (typeof artifact === "string") {
            artifacts.add(artifact);
          }
        }
      }
    }
  }
  const rowCount = (value: unknown): number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : 0;
  const rawEvents = [...receipts.values()]
    .reduce((sum, evidence) => sum + rowCount(evidence.postgres?.rawEvents?.rowCount), 0);
  const projectionRows = [...receipts.values()].reduce(
    (sum, evidence) => sum + (evidence.postgres?.projections ?? [])
      .reduce((projectionSum, projection) => projectionSum + rowCount(projection.rowCount), 0),
    0,
  );
  return {
    artifactTransactionHashes: receipts.size,
    includedArtifacts: artifacts.size,
    skippedArtifacts,
    indexedReceipts: receipts.size,
    provenWriteMethods: Object.keys(reports).length,
    catalogWriteMethods,
    remainingWriteMethods: catalogWriteMethods - Object.keys(reports).length,
    rawEvents,
    projectionRows,
  };
}

export function buildWriteSelectorMap(
  definitions = getAllWriteInvariantDefinitions(),
): Map<string, { methodKey: string; definition: WriteDefinition }> {
  const selectors = new Map<string, { methodKey: string; definition: WriteDefinition }>();
  for (const [methodKey, definition] of Object.entries(definitions)) {
    const selector = id(definition.signature).slice(0, 10).toLowerCase();
    const existing = selectors.get(selector);
    if (existing) {
      throw new Error(`write selector collision ${selector}: ${existing.methodKey}, ${methodKey}`);
    }
    selectors.set(selector, { methodKey, definition });
  }
  return selectors;
}

export function projectionTableNames(definition: WriteDefinition): string[] {
  return [...new Set(definition.invariants.indexerExpectations.projections.map((projection) => projection.split(":", 1)[0]))]
    .sort((left, right) => left.localeCompare(right));
}

function rowMatchesEvent(
  row: IndexedEventRow,
  eventKey: string,
  definitions: EventDefinitions,
): boolean {
  const definition = definitions[eventKey];
  return Boolean(
    definition
    && row.facet_name === definition.facetName
    && row.event_name === definition.eventName
    && row.event_signature === definition.signature,
  );
}

export function indexedEventKeys(
  rows: IndexedEventRow[],
  definitions = getAllAbiEventDefinitions(),
): string[] {
  const keys = new Set<string>();
  for (const row of rows) {
    for (const eventKey of Object.keys(definitions)) {
      if (rowMatchesEvent(row, eventKey, definitions)) {
        keys.add(eventKey);
      }
    }
  }
  return [...keys].sort((left, right) => left.localeCompare(right));
}

export function evaluateReceiptExpectation(args: {
  txHash: string;
  methodKey: string;
  definition: WriteDefinition;
  indexedRows: IndexedEventRow[];
  projectedTables: string[];
  eventDefinitions?: EventDefinitions;
}): ReceiptExpectationResult {
  const eventDefinitions = args.eventDefinitions ?? getAllAbiEventDefinitions();
  const expected = args.definition.invariants.emittedEvents;
  const indexed = indexedEventKeys(args.indexedRows, eventDefinitions);
  const observedExpected = expected.events.filter((eventKey) => indexed.includes(eventKey));
  const expectedTables = projectionTableNames(args.definition);
  const projected = [...new Set(args.projectedTables)].sort((left, right) => left.localeCompare(right));
  const failures: string[] = [];

  if (expected.mode === "all" && observedExpected.length !== expected.events.length) {
    failures.push(`missing declared events: ${expected.events.filter((eventKey) => !observedExpected.includes(eventKey)).join(", ")}`);
  }
  if (expected.mode === "one-of" && observedExpected.length === 0) {
    failures.push(`missing every declared event variant: ${expected.events.join(", ")}`);
  }
  if (expected.mode === "none" && expected.events.length !== 0) {
    failures.push("event mode none contains declared events");
  }

  const missingTables = expectedTables.filter((table) => !projected.includes(table));
  if (missingTables.length > 0) {
    failures.push(`missing declared projections: ${missingTables.join(", ")}`);
  }

  return {
    txHash: args.txHash,
    methodKey: args.methodKey,
    expectedEventMode: expected.mode,
    expectedEventKeys: expected.events,
    indexedEventKeys: indexed,
    expectedProjectionTables: expectedTables,
    projectedTables: projected,
    failures,
  };
}
