import { describe, expect, it } from "vitest";

import {
  buildWriteSelectorMap,
  collectTransactionHashes,
  evaluateReceiptExpectation,
  projectionTableNames,
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

  it("attributes every generated write selector without collisions", () => {
    const selectors = buildWriteSelectorMap();
    expect(selectors.size).toBe(260);
    expect([...selectors.values()].some(({ methodKey }) => methodKey === "MarketplaceFacet.purchaseAsset")).toBe(true);
  });

  it("normalizes projection declarations to table names", () => {
    const purchase = [...buildWriteSelectorMap().values()]
      .find(({ methodKey }) => methodKey === "MarketplaceFacet.purchaseAsset")!;
    expect(projectionTableNames(purchase.definition)).toEqual(["market_sales"]);
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
});
