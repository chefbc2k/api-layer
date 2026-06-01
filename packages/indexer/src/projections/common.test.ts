import { describe, expect, it, vi } from "vitest";

import { inferProjectionRecord, insertProjectionRecord, rebuildCurrentRows, sanitizeArgs } from "./common.js";

describe("projection common helpers", () => {
  it("sanitizes nested args and infers normalized projection records", () => {
    const args = {
      seller: "0x00000000000000000000000000000000000000aa",
      buyer: "0x00000000000000000000000000000000000000bb",
      asset: "0x00000000000000000000000000000000000000cc",
      price: 25n,
      platformFee: 5n,
      saleId: 7n,
      support: "2",
      tuple: [{ amount: 9n }],
    };

    expect(sanitizeArgs(args)).toEqual({
      seller: "0x00000000000000000000000000000000000000aa",
      buyer: "0x00000000000000000000000000000000000000bb",
      asset: "0x00000000000000000000000000000000000000cc",
      price: "25",
      platformFee: "5",
      saleId: "7",
      support: "2",
      tuple: [{ amount: "9" }],
    });

    expect(inferProjectionRecord("market_sales", "current", "sale-7", args)).toEqual({
      entityId: "sale-7",
      mode: "current",
      actorAddress: "0x00000000000000000000000000000000000000aa",
      subjectAddress: null,
      relatedAddress: "0x00000000000000000000000000000000000000cc",
      status: null,
      metadataUri: null,
      amount: "25",
      secondaryAmount: "5",
      proposalId: null,
      assetId: null,
      datasetId: null,
      licenseId: null,
      templateId: null,
      listingId: null,
      saleId: "7",
      operationId: null,
      withdrawalId: null,
      support: 2,
      eventPayload: {
        seller: "0x00000000000000000000000000000000000000aa",
        buyer: "0x00000000000000000000000000000000000000bb",
        asset: "0x00000000000000000000000000000000000000cc",
        price: "25",
        platformFee: "5",
        saleId: "7",
        support: "2",
        tuple: [{ amount: "9" }],
      },
    });
  });

  it("updates prior canonical current rows before inserting a fresh current record", async () => {
    const client = {
      query: vi.fn().mockResolvedValue(undefined),
    };

    await insertProjectionRecord({
      client: client as never,
      chainId: 84532,
      rawEventId: 99,
      txHash: "0xtx",
      blockNumber: 123n,
      blockHash: "0xblock",
      isOrphaned: false,
      facetName: "MarketFacet",
      eventName: "SaleCompleted",
      eventSignature: "SaleCompleted(uint256)",
      decodedArgs: {},
    }, "market_sales", {
      entityId: "sale-7",
      mode: "current",
      actorAddress: "0x1",
      subjectAddress: "0x2",
      relatedAddress: "0x3",
      status: "filled",
      metadataUri: "ipfs://meta",
      amount: "25",
      secondaryAmount: "5",
      proposalId: "11",
      assetId: "12",
      datasetId: "13",
      licenseId: "14",
      templateId: "15",
      listingId: "16",
      saleId: "17",
      operationId: "18",
      withdrawalId: "19",
      support: 3,
      eventPayload: { ok: true },
    });

    expect(client.query).toHaveBeenCalledTimes(2);
    expect(client.query.mock.calls[0][0]).toContain("UPDATE market_sales");
    expect(client.query.mock.calls[0][1]).toEqual(["sale-7"]);
    expect(client.query.mock.calls[1][0]).toContain("INSERT INTO market_sales");
    expect(client.query.mock.calls[1][1]).toEqual([
      "sale-7",
      84532,
      "0xtx",
      "123",
      "0xblock",
      "MarketFacet",
      "SaleCompleted",
      "SaleCompleted(uint256)",
      "{\"ok\":true}",
      99,
      "canonical",
      false,
      true,
      "0x1",
      "0x2",
      "0x3",
      "filled",
      "ipfs://meta",
      "25",
      "5",
      "11",
      "12",
      "13",
      "14",
      "15",
      "16",
      "17",
      "18",
      "19",
      3,
    ]);
  });

  it("inserts orphaned ledger rows without first clearing current state and can rebuild currents", async () => {
    const client = {
      query: vi.fn().mockResolvedValue(undefined),
    };

    await insertProjectionRecord({
      client: client as never,
      chainId: 84532,
      rawEventId: 100,
      txHash: "0xtx2",
      blockNumber: 124n,
      blockHash: "0xblock2",
      isOrphaned: true,
      facetName: "GovernanceFacet",
      eventName: "VoteCast",
      eventSignature: "VoteCast(uint256)",
      decodedArgs: {},
    }, "governance_votes", {
      entityId: "vote-1",
      mode: "ledger",
      eventPayload: { orphaned: true },
    });

    expect(client.query).toHaveBeenCalledTimes(1);
    expect(client.query.mock.calls[0][1][10]).toBe("orphaned");
    expect(client.query.mock.calls[0][1][11]).toBe(true);
    expect(client.query.mock.calls[0][1][12]).toBe(false);

    await rebuildCurrentRows(client as never, "governance_votes");

    expect(client.query).toHaveBeenCalledTimes(3);
    expect(client.query.mock.calls[1][0]).toBe("UPDATE governance_votes SET is_current = FALSE WHERE is_current = TRUE");
    expect(client.query.mock.calls[2][0]).toContain("WITH latest AS");
  });

  it("normalizes alternate arg aliases and non-finite numeric support values", () => {
    expect(inferProjectionRecord("licenses", "ledger", "license-1", {
      buyer: "0x00000000000000000000000000000000000000bb",
      recipient: "0x00000000000000000000000000000000000000cc",
      target: "0x00000000000000000000000000000000000000dd",
      newVotes: 12n,
      quorum: 4n,
      metadata: "ipfs://meta",
      trusted: true,
      tokenId: 99n,
      purchaseId: 44n,
      id: 123n,
      requestId: 55n,
      support: "nan",
    })).toEqual({
      entityId: "license-1",
      mode: "ledger",
      actorAddress: "0x00000000000000000000000000000000000000bb",
      subjectAddress: "0x00000000000000000000000000000000000000cc",
      relatedAddress: "0x00000000000000000000000000000000000000dd",
      status: "true",
      metadataUri: "ipfs://meta",
      amount: "12",
      secondaryAmount: "4",
      proposalId: null,
      assetId: "99",
      datasetId: null,
      licenseId: null,
      templateId: null,
      listingId: null,
      saleId: "44",
      operationId: "123",
      withdrawalId: "55",
      support: null,
      eventPayload: {
        buyer: "0x00000000000000000000000000000000000000bb",
        recipient: "0x00000000000000000000000000000000000000cc",
        target: "0x00000000000000000000000000000000000000dd",
        newVotes: "12",
        quorum: "4",
        metadata: "ipfs://meta",
        trusted: true,
        tokenId: "99",
        purchaseId: "44",
        id: "123",
        requestId: "55",
        support: "nan",
      },
    });
  });

  it("treats nullish numeric support values as absent", () => {
    expect(inferProjectionRecord("licenses", "ledger", "license-2", {
      account: "0x00000000000000000000000000000000000000dd",
      support: undefined,
    }).support).toBeNull();
  });
});
