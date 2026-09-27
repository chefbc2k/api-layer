import { describe, expect, it } from "vitest";

import {
  buildWriteSelectorMap,
  collectWriteInvocationsFromCallTrace,
  collectTransactionHashes,
  evaluateReceiptExpectation,
  projectionTableNames,
  receiptProofArtifactEligibility,
} from "./indexer-receipt-proof-lib.js";

describe("local-fork receipt-to-indexer proof", () => {
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
    expect(receiptProofArtifactEligibility({ status: "proven working", transactionHashes: [] }))
      .toEqual({ eligible: true, reason: null });
    expect(receiptProofArtifactEligibility({ summary: "proven working", reports: {} }))
      .toEqual({ eligible: true, reason: null });
    expect(receiptProofArtifactEligibility({ summary: "deeper issues remain", reports: {} }))
      .toEqual({ eligible: false, reason: 'summary is "deeper issues remain"' });
    expect(receiptProofArtifactEligibility({ status: "failed", transactionHashes: [] }))
      .toEqual({ eligible: false, reason: 'status is "failed"' });
  });

  it("attributes every generated write selector without collisions", () => {
    const selectors = buildWriteSelectorMap();
    expect(selectors.size).toBe(260);
    expect([...selectors.values()].some(({ methodKey }) => methodKey === "MarketplaceFacet.purchaseAsset")).toBe(true);
  });

  it("attributes successful nested diamond self-calls from call traces", () => {
    const diamond = `0x${"ab".repeat(20)}`;
    const selectors = buildWriteSelectorMap();
    const execute = [...selectors.entries()].find(([, value]) => value.methodKey === "TimelockFacet.execute")!;
    const updateDelay = [...selectors.entries()].find(([, value]) => value.methodKey === "TimelockFacet.updateMinDelay")!;
    const updateVotingDelay = [...selectors.entries()].find(([, value]) => value.methodKey === "GovernorFacet.updateVotingDelay")!;
    const failedTarget = [...selectors.entries()].find(([, value]) => value.methodKey === "GovernorFacet.updateVotingPeriod")!;

    expect(collectWriteInvocationsFromCallTrace({
      to: diamond,
      input: `${execute[0]}${"00".repeat(64)}`,
      calls: [{
        to: diamond,
        input: `${updateDelay[0]}${"00".repeat(32)}`,
      }, {
        to: `0x${"ef".repeat(20)}`,
        input: "0x12345678",
        calls: [{
          to: diamond.toUpperCase(),
          input: `${updateVotingDelay[0]}${"00".repeat(32)}`,
        }],
      }, {
        to: diamond,
        input: `${failedTarget[0]}${"00".repeat(32)}`,
        error: "execution reverted",
      }],
    }, diamond, selectors).map(({ methodKey, callPath }) => ({ methodKey, callPath }))).toEqual([
      { methodKey: "TimelockFacet.execute", callPath: [] },
      { methodKey: "TimelockFacet.updateMinDelay", callPath: [0] },
      { methodKey: "GovernorFacet.updateVotingDelay", callPath: [1, 0] },
    ]);
  });

  it("deduplicates repeated successful internal calls to the same write method", () => {
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
  });

  it("accepts an eventless write receipt without inventing a projection", () => {
    const write = [...buildWriteSelectorMap().values()]
      .find(({ methodKey }) => methodKey === "VoiceDatasetFacet.setMaxAssetsPerDataset")!;
    expect(write.definition.invariants.emittedEvents).toMatchObject({ mode: "none", events: [] });
    expect(write.definition.invariants.indexerExpectations).toMatchObject({ mode: "none", events: [], projections: [] });

    expect(evaluateReceiptExpectation({
      txHash: `0x${"55".repeat(32)}`,
      methodKey: write.methodKey,
      definition: write.definition,
      indexedRows: [],
      projectedTables: [],
    }).failures).toEqual([]);
  });
});
