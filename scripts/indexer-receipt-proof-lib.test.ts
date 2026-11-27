import { describe, expect, it } from "vitest";

import {
  buildWriteSelectorMap,
  collectWriteInvocationsFromCallTrace,
  collectTransactionHashes,
  defaultReceiptProofArtifactProducers,
  evaluateReceiptExpectation,
  indexedEventKeys,
  mergePersistentProofReports,
  projectionTableNames,
  receiptProofArtifactEligibility,
  summarizePersistentProofReports,
} from "./indexer-receipt-proof-lib.js";

describe("local-fork receipt-to-indexer proof", () => {
  it("includes the control-plane admin receipt batch in durable proof inputs", () => {
    expect(defaultReceiptProofArtifactProducers["control-plane-admin-receipts.json"])
      .toBe("packages/api/src/app.contract-integration.test.ts");
  });

  it("collects and deduplicates transaction hashes from nested workflow artifacts", () => {
    const first = `0x${"11".repeat(32)}`;
    const second = `0x${"22".repeat(32)}`;
    expect([...collectTransactionHashes({
      reports: [{ txHash: first }, { receipt: { hash: second } }, { transactionHash: first }],
      transactionHashes: [second, "not-a-hash"],
    })])
      .toEqual([first, second]);
  });

  it("rejects failed workflow artifacts before collecting reverted fork receipts", () => {
    expect(receiptProofArtifactEligibility(null)).toEqual({ eligible: false, reason: "artifact root is not an object" });
    expect(receiptProofArtifactEligibility([])).toEqual({ eligible: false, reason: "artifact root is not an object" });
    expect(receiptProofArtifactEligibility({ status: "proven working", transactionHashes: [] }))
      .toEqual({ eligible: true, reason: null });
    expect(receiptProofArtifactEligibility({ summary: "proven working", reports: {} }))
      .toEqual({ eligible: true, reason: null });
    expect(receiptProofArtifactEligibility({ reports: {} })).toEqual({ eligible: true, reason: null });
    expect(receiptProofArtifactEligibility({ summary: "deeper issues remain", reports: {} }))
      .toEqual({ eligible: false, reason: 'summary is "deeper issues remain"' });
    expect(receiptProofArtifactEligibility({ status: "failed", transactionHashes: [] }))
      .toEqual({ eligible: false, reason: 'status is "failed"' });
  });

  it("attributes every generated write selector without collisions", () => {
    const selectors = buildWriteSelectorMap();
    expect(selectors.size).toBe(260);
    expect([...selectors.values()].some(({ methodKey }) => methodKey === "MarketplaceFacet.purchaseAsset")).toBe(true);
    const definition = selectors.values().next().value!.definition;
    expect(() => buildWriteSelectorMap({ first: definition, second: definition })).toThrow(/write selector collision/u);
  });

  it("attributes successful nested diamond self-calls and ignores reverted targets", () => {
    const diamond = `0x${"ab".repeat(20)}`;
    const selectors = buildWriteSelectorMap();
    const execute = [...selectors.entries()].find(([, value]) => value.methodKey === "TimelockFacet.execute")!;
    const updateDelay = [...selectors.entries()].find(([, value]) => value.methodKey === "TimelockFacet.updateMinDelay")!;
    const updateVotingDelay = [...selectors.entries()].find(([, value]) => value.methodKey === "GovernorFacet.updateVotingDelay")!;
    const failedTarget = [...selectors.entries()].find(([, value]) => value.methodKey === "GovernorFacet.updateVotingPeriod")!;

    expect(collectWriteInvocationsFromCallTrace({
      to: diamond,
      input: `${execute[0]}${"00".repeat(64)}`,
      calls: [{ to: diamond, input: `${updateDelay[0]}${"00".repeat(32)}` }, {
        to: `0x${"ef".repeat(20)}`,
        input: "0x12345678",
        calls: [{ to: diamond.toUpperCase(), input: `${updateVotingDelay[0]}${"00".repeat(32)}` }],
      }, { to: diamond, input: `${failedTarget[0]}${"00".repeat(32)}`, error: "execution reverted" }],
    }, diamond, selectors).map(({ methodKey, callPath }) => ({ methodKey, callPath }))).toEqual([
      { methodKey: "TimelockFacet.execute", callPath: [] },
      { methodKey: "TimelockFacet.updateMinDelay", callPath: [0] },
      { methodKey: "GovernorFacet.updateVotingDelay", callPath: [1, 0] },
    ]);
  });

  it("deduplicates repeated successful internal calls to the same write method per receipt", () => {
    const diamond = `0x${"cd".repeat(20)}`;
    const selectors = buildWriteSelectorMap();
    const update = [...selectors.entries()].find(([, value]) => value.methodKey === "GovernorFacet.updateVotingDelay")!;
    const invocations = collectWriteInvocationsFromCallTrace({
      to: diamond,
      input: "0x12345678",
      calls: [
        { to: diamond, input: `${update[0]}${"00".repeat(32)}` },
        { to: diamond, input: `${update[0]}${"11".repeat(32)}` },
      ],
    }, diamond, selectors);

    expect(invocations).toHaveLength(1);
    expect(invocations[0]).toMatchObject({ methodKey: "GovernorFacet.updateVotingDelay", callPath: [0] });
  });

  it("normalizes projection declarations to table names", () => {
    const writes = [...buildWriteSelectorMap().values()];
    const purchase = writes
      .find(({ methodKey }) => methodKey === "MarketplaceFacet.purchaseAsset")!;
    expect(projectionTableNames(purchase.definition)).toEqual(["market_sales"]);
    const createCampaign = writes
      .find(({ methodKey }) => methodKey === "CommunityRewardsFacet.createCampaign")!;
    expect(projectionTableNames(createCampaign.definition)).toEqual(["reward_campaigns"]);
    const claim = writes
      .find(({ methodKey }) => methodKey === "CommunityRewardsFacet.claim")!;
    expect(projectionTableNames(claim.definition)).toEqual(["reward_claims"]);
    expect(projectionTableNames({
      ...purchase.definition,
      invariants: {
        ...purchase.definition.invariants,
        indexerExpectations: {
          ...purchase.definition.invariants.indexerExpectations,
          projections: ["z_table:id", "a_table:id", "a_table:other"],
        },
      },
    } as never)).toEqual(["a_table", "z_table"]);
  });

  it("accepts all-event and one-of evidence and reports missing projections", () => {
    const writes = [...buildWriteSelectorMap().values()];
    const purchase = writes.find(({ methodKey }) => methodKey === "MarketplaceFacet.purchaseAsset")!;
    const result = evaluateReceiptExpectation({
      txHash: `0x${"33".repeat(32)}`,
      methodKey: purchase.methodKey,
      definition: purchase.definition,
      indexedRows: purchase.definition.invariants.emittedEvents.events.map((eventKey) => {
        const [facetName, wrapperKey] = eventKey.split(".", 2);
        return { facet_name: facetName, event_name: wrapperKey, event_signature: eventKey };
      }),
      projectedTables: [],
      eventDefinitions: Object.fromEntries(purchase.definition.invariants.emittedEvents.events.map((eventKey) => {
        const [facetName, eventName] = eventKey.split(".", 2);
        return [eventKey, { facetName, eventName, signature: eventKey }];
      })) as never,
    });
    expect(result.failures).toEqual(["missing declared projections: market_sales"]);
    expect(evaluateReceiptExpectation({
      txHash: `0x${"33".repeat(32)}`,
      methodKey: purchase.methodKey,
      definition: purchase.definition,
      indexedRows: [],
      projectedTables: ["market_sales", "extra_table"],
    }).failures[0]).toContain("missing declared events:");

    const oneOf = writes.find(({ definition }) => definition.invariants.emittedEvents.mode === "one-of")!;
    const selected = oneOf.definition.invariants.emittedEvents.events[0];
    const [facetName, eventName] = selected.split(".", 2);
    const oneOfResult = evaluateReceiptExpectation({
      txHash: `0x${"44".repeat(32)}`,
      methodKey: oneOf.methodKey,
      definition: oneOf.definition,
      indexedRows: [{ facet_name: facetName, event_name: eventName, event_signature: selected }],
      projectedTables: projectionTableNames(oneOf.definition),
      eventDefinitions: Object.fromEntries(oneOf.definition.invariants.emittedEvents.events.map((eventKey) => {
        const [candidateFacet, candidateEvent] = eventKey.split(".", 2);
        return [eventKey, { facetName: candidateFacet, eventName: candidateEvent, signature: eventKey }];
      })) as never,
    });
    expect(oneOfResult.failures).toEqual([]);
    expect(evaluateReceiptExpectation({
      txHash: `0x${"44".repeat(32)}`,
      methodKey: oneOf.methodKey,
      definition: oneOf.definition,
      indexedRows: [],
      projectedTables: projectionTableNames(oneOf.definition),
      eventDefinitions: Object.fromEntries(oneOf.definition.invariants.emittedEvents.events.map((eventKey) => {
        const [candidateFacet, candidateEvent] = eventKey.split(".", 2);
        return [eventKey, { facetName: candidateFacet, eventName: candidateEvent, signature: eventKey }];
      })) as never,
    }).failures).toContain(`missing every declared event variant: ${oneOf.definition.invariants.emittedEvents.events.join(", ")}`);

    expect(indexedEventKeys([
      { facet_name: "wrong", event_name: eventName, event_signature: selected },
      { facet_name: facetName, event_name: "wrong", event_signature: selected },
      { facet_name: facetName, event_name: eventName, event_signature: "wrong" },
    ], { [selected]: { facetName, eventName, signature: selected } } as never)).toEqual([]);
  });

  it("accepts an eventless write receipt without inventing a projection", () => {
    const write = [...buildWriteSelectorMap().values()]
      .find(({ methodKey }) => methodKey === "EmergencyFacet.setEmergencyTimeout")!;
    expect(write.definition.invariants.emittedEvents).toMatchObject({ mode: "none", events: [] });
    expect(write.definition.invariants.indexerExpectations).toMatchObject({ mode: "none", events: [], projections: [] });

    expect(evaluateReceiptExpectation({
      txHash: `0x${"55".repeat(32)}`,
      methodKey: write.methodKey,
      definition: write.definition,
      indexedRows: [],
      projectedTables: [],
    }).failures).toEqual([]);
    expect(evaluateReceiptExpectation({
      txHash: `0x${"55".repeat(32)}`,
      methodKey: write.methodKey,
      definition: {
        ...write.definition,
        invariants: {
          ...write.definition.invariants,
          emittedEvents: { mode: "none", events: ["EmergencyFacet.Unexpected"] },
        },
      } as never,
      indexedRows: [],
      projectedTables: [],
    }).failures).toContain("event mode none contains declared events");
  });

  it("merges durable method proof without losing receipts from earlier fork runs", () => {
    const first = `0x${"66".repeat(32)}`;
    const second = `0x${"77".repeat(32)}`;
    const reports = mergePersistentProofReports({
      "ExistingFacet.write": {
        result: "proven working",
        evidence: [{
          txHash: first,
          postgres: { rawEvents: { rowCount: 2 }, projections: [{ rowCount: 1 }] },
          source: { workflowArtifacts: ["previous.json"] },
        }],
      },
    }, {
      "ExistingFacet.write": {
        result: "proven working",
        evidence: [{ txHash: first }],
      },
      "NewFacet.write": {
        result: "proven working",
        evidence: [{
          txHash: second,
          postgres: { rawEvents: { rowCount: 1 }, projections: [] },
          source: { workflowArtifacts: ["current.json"] },
        }],
      },
    });

    expect(Object.keys(reports)).toEqual(["ExistingFacet.write", "NewFacet.write"]);
    expect(reports["ExistingFacet.write"].evidence).toHaveLength(1);
    expect(summarizePersistentProofReports(reports, 260)).toEqual({
      artifactTransactionHashes: 2,
      includedArtifacts: 1,
      skippedArtifacts: 0,
      indexedReceipts: 2,
      provenWriteMethods: 2,
      catalogWriteMethods: 260,
      remainingWriteMethods: 258,
      rawEvents: 1,
      projectionRows: 0,
    });

    const sortedEvidence = mergePersistentProofReports({}, {
      "SortedFacet.write": { evidence: [
        { txHash: `0x${"99".repeat(32)}` },
        { txHash: `0x${"88".repeat(32)}` },
      ] },
    });
    expect(sortedEvidence["SortedFacet.write"].evidence?.map((entry) => entry.txHash))
      .toEqual([`0x${"88".repeat(32)}`, `0x${"99".repeat(32)}`]);
    const priorOnly = mergePersistentProofReports({
      "PriorFacet.write": { result: "old", evidence: [{ txHash: `0x${"ab".repeat(32)}` }] },
    }, {});
    expect(priorOnly["PriorFacet.write"].result).toBe("old");
    expect(priorOnly["PriorFacet.write"].evidence).toHaveLength(1);
    expect(mergePersistentProofReports({}, {
      "InvalidFacet.write": { evidence: [{ txHash: "not-a-transaction-hash" }] },
    })["InvalidFacet.write"].evidence).toEqual([]);

    const invalidRows = {
      "NoEvidence.write": {},
      "InvalidFacet.write": {
        evidence: [
          { txHash: "invalid", postgres: { rawEvents: { rowCount: 5 } } },
          { txHash: `0x${"88".repeat(32)}`, postgres: {
            rawEvents: { rowCount: -1 },
            projections: [{ rowCount: 1.5 }, { rowCount: Number.MAX_SAFE_INTEGER + 1 }],
          }, source: { workflowArtifacts: ["one.json", 7, "one.json"] } },
        ],
      },
    };
    expect(summarizePersistentProofReports(invalidRows, 2, 3)).toMatchObject({
      artifactTransactionHashes: 1,
      includedArtifacts: 1,
      skippedArtifacts: 3,
      rawEvents: 0,
      projectionRows: 0,
    });
  });

  it("collects hashes from array roots and caller-provided sets while ignoring malformed entries", () => {
    const initial = new Set([`0x${"aa".repeat(32)}`]);
    const result = collectTransactionHashes([
      { transactionHashes: [null, 4, `0x${"bb".repeat(32)}`] },
      { hash: "0x1234", nested: [{ transactionHash: `0x${"CC".repeat(32)}` }] },
      false,
    ], initial);
    expect([...result]).toEqual([`0x${"aa".repeat(32)}`, `0x${"bb".repeat(32)}`, `0x${"cc".repeat(32)}`]);
  });

  it("sorts multiple indexed event keys deterministically", () => {
    const definitions = {
      "ZuluFacet.Zulu": { facetName: "ZuluFacet", eventName: "Zulu", signature: "Zulu(uint256)" },
      "AlphaFacet.Alpha": { facetName: "AlphaFacet", eventName: "Alpha", signature: "Alpha(uint256)" },
    } as never;
    expect(indexedEventKeys([
      { facet_name: "ZuluFacet", event_name: "Zulu", event_signature: "Zulu(uint256)" },
      { facet_name: "AlphaFacet", event_name: "Alpha", event_signature: "Alpha(uint256)" },
    ], definitions)).toEqual(["AlphaFacet.Alpha", "ZuluFacet.Zulu"]);
    expect(indexedEventKeys([])).toEqual([]);
  });
});
