import { describe, expect, it } from "vitest";

import {
  buildWriteSelectorMap,
  collectSuccessfulTracedWrites,
  collectTransactionHashes,
  evaluateReceiptExpectation,
  mergePersistentProofReports,
  projectionTableNames,
  receiptProofArtifactEligibility,
  summarizePersistentProofReports,
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

  it("attributes only successful diamond writes observed in a call trace", () => {
    const diamondAddress = "0x0000000000000000000000000000000000000001";
    const selectors = buildWriteSelectorMap();
    const outer = [...selectors.entries()].find(([, write]) => write.methodKey === "MarketplaceFacet.purchaseAsset")!;
    const payment = [...selectors.entries()].find(([, write]) => write.methodKey === "PaymentFacet.distributePaymentFrom")!;
    const escrow = [...selectors.entries()].find(([, write]) => write.methodKey === "EscrowFacet.releaseAsset")!;
    const reverted = [...selectors.entries()].find(([, write]) => write.methodKey === "EscrowFacet.updateAssetState")!;

    expect(collectSuccessfulTracedWrites({
      to: diamondAddress,
      input: `${outer[0]}${"00".repeat(32)}`,
      calls: [
        { to: diamondAddress.toUpperCase(), input: payment[0] },
        { to: diamondAddress, input: escrow[0], calls: [{ to: diamondAddress, input: payment[0] }] },
        { to: diamondAddress, input: reverted[0], error: "execution reverted" },
        { to: "0x0000000000000000000000000000000000000002", input: reverted[0] },
      ],
    }, diamondAddress).map(({ methodKey }) => methodKey)).toEqual([
      "EscrowFacet.releaseAsset",
      "MarketplaceFacet.purchaseAsset",
      "PaymentFacet.distributePaymentFrom",
    ]);
  });

  it("does not credit successful descendants of a reverted trace branch", () => {
    const diamondAddress = "0x0000000000000000000000000000000000000001";
    const selectors = buildWriteSelectorMap();
    const escrow = [...selectors.entries()].find(([, write]) => write.methodKey === "EscrowFacet.releaseAsset")!;
    expect(collectSuccessfulTracedWrites({
      to: diamondAddress,
      input: "0xdeadbeef",
      calls: [{
        to: diamondAddress,
        input: "0xdeadbeef",
        error: "execution reverted",
        calls: [{ to: diamondAddress, input: escrow[0] }],
      }],
    }, diamondAddress)).toEqual([]);
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
  });
});
