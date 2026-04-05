import { describe, expect, it } from "vitest";

import { AddressBook } from "./address-book.js";

describe("AddressBook", () => {
  it("returns a facet-specific address when one is configured", () => {
    const book = new AddressBook({
      diamond: "0x0000000000000000000000000000000000000001",
      facets: {
        VoiceAssetFacet: "0x0000000000000000000000000000000000000002",
      },
    });

    expect(book.resolveFacetAddress("VoiceAssetFacet")).toBe("0x0000000000000000000000000000000000000002");
  });

  it("falls back to the diamond address and returns the original JSON payload", () => {
    const addresses = { diamond: "0x0000000000000000000000000000000000000001" };
    const book = new AddressBook(addresses);

    expect(book.resolveFacetAddress("UnknownFacet")).toBe(addresses.diamond);
    expect(book.toJSON()).toBe(addresses);
  });
});
