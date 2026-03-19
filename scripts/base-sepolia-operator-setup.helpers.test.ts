import { describe, expect, it } from "vitest";

import {
  isPurchaseReadyListing,
  mergeMarketplaceCandidateVoiceHashes,
  selectPreferredMarketplaceFixtureCandidate,
} from "./base-sepolia-operator-setup.helpers.js";

describe("base-sepolia marketplace fixture helpers", () => {
  it("treats fresh listings on old assets as not purchase-ready", () => {
    expect(isPurchaseReadyListing({
      tokenId: "110",
      createdAt: "1900",
      isActive: true,
    }, 1900n + 60n)).toBe(false);
  });

  it("prefers an active listing past the trading lock over fresher or inactive candidates", () => {
    const candidate = selectPreferredMarketplaceFixtureCandidate([
      {
        voiceHash: "0xfresh",
        tokenId: "110",
        listingReadback: {
          status: 200,
          payload: {
            tokenId: "110",
            createdAt: "1900",
            isActive: true,
          },
        },
      },
      {
        voiceHash: "0xready",
        tokenId: "83",
        listingReadback: {
          status: 200,
          payload: {
            tokenId: "83",
            createdAt: "100",
            isActive: true,
          },
        },
      },
      {
        voiceHash: "0xinactive",
        tokenId: "92",
        listingReadback: {
          status: 200,
          payload: {
            tokenId: "92",
            createdAt: "50",
            isActive: false,
          },
        },
      },
    ], 100n + 24n * 60n * 60n + 10n);

    expect(candidate?.tokenId).toBe("83");
  });

  it("merges seller-owned and escrowed voice hashes without dropping escrow-only candidates", () => {
    expect(
      mergeMarketplaceCandidateVoiceHashes(
        ["0xowned-1", "0xowned-2"],
        ["0xescrow-1", "0xowned-2", "0xescrow-2"],
      ),
    ).toEqual(["0xowned-1", "0xowned-2", "0xescrow-1", "0xescrow-2"]);
  });
});
