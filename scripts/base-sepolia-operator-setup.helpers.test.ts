import { describe, expect, it } from "vitest";

import {
  classifyCandidatePriority,
  isExpiredListing,
  isPurchaseReadyListing,
  mergeMarketplaceCandidateVoiceHashes,
  rankFundingCandidates,
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

  it("treats missing or inactive listings as not purchase-ready", () => {
    expect(isPurchaseReadyListing(undefined, 10n)).toBe(false);
    expect(isPurchaseReadyListing({ tokenId: "11", isActive: false, createdAt: "1" }, 10n)).toBe(false);
    expect(isPurchaseReadyListing({ tokenId: "11", isActive: true }, 10n)).toBe(false);
  });

  it("treats expiration as a hard stop for both readiness and active-age checks", () => {
    expect(isExpiredListing(undefined, 10n)).toBe(false);
    expect(isExpiredListing({ tokenId: "11", expiresAt: "10", isActive: true }, 10n)).toBe(true);
    expect(isPurchaseReadyListing({
      tokenId: "11",
      createdAt: "1",
      expiresAt: "10",
      isActive: true,
    }, 1n + 24n * 60n * 60n)).toBe(false);
  });

  it("classifies marketplace candidates by purchase readiness before general activeness", () => {
    expect(classifyCandidatePriority({
      voiceHash: "0xready",
      tokenId: "1",
      listingReadback: {
        status: 200,
        payload: { tokenId: "1", createdAt: "1", isActive: true },
      },
    }, 1n + 24n * 60n * 60n)).toBe(4);

    expect(classifyCandidatePriority({
      voiceHash: "0xactive",
      tokenId: "2",
      listingReadback: {
        status: 200,
        payload: { tokenId: "2", createdAt: "10", isActive: true },
      },
    }, 20n)).toBe(3);

    expect(classifyCandidatePriority({
      voiceHash: "0xexpired",
      tokenId: "22",
      listingReadback: {
        status: 200,
        payload: { tokenId: "22", createdAt: "1", expiresAt: "2", isActive: true },
      },
    }, 20n)).toBe(2);

    expect(classifyCandidatePriority({
      voiceHash: "0xmissing",
      tokenId: "3",
      listingReadback: {
        status: 404,
        payload: null,
      },
    }, 20n)).toBe(1);
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

  it("uses older listings and token id as tie-breakers when priorities match", () => {
    const byAge = selectPreferredMarketplaceFixtureCandidate([
      {
        voiceHash: "0xolder",
        tokenId: "9",
        listingReadback: {
          status: 200,
          payload: { tokenId: "9", createdAt: "10", isActive: true },
        },
      },
      {
        voiceHash: "0xnewer",
        tokenId: "8",
        listingReadback: {
          status: 200,
          payload: { tokenId: "8", createdAt: "20", isActive: true },
        },
      },
    ], 40n);

    expect(byAge?.tokenId).toBe("9");

    const byTokenId = selectPreferredMarketplaceFixtureCandidate([
      {
        voiceHash: "0xb",
        tokenId: "11",
        listingReadback: {
          status: 200,
          payload: { tokenId: "11", createdAt: "10", isActive: true },
        },
      },
      {
        voiceHash: "0xa",
        tokenId: "10",
        listingReadback: {
          status: 200,
          payload: { tokenId: "10", createdAt: "10", isActive: true },
        },
      },
    ], 40n);

    expect(byTokenId?.tokenId).toBe("10");
  });

  it("returns null when no marketplace candidates are available", () => {
    expect(selectPreferredMarketplaceFixtureCandidate([], 10n)).toBeNull();
  });

  it("treats missing createdAt values as the oldest tie-breaker among equal-priority active listings", () => {
    const candidate = selectPreferredMarketplaceFixtureCandidate([
      {
        voiceHash: "0xmissing-created-at",
        tokenId: "12",
        listingReadback: {
          status: 200,
          payload: { tokenId: "12", isActive: true },
        },
      },
      {
        voiceHash: "0xwith-created-at",
        tokenId: "13",
        listingReadback: {
          status: 200,
          payload: { tokenId: "13", createdAt: "50", isActive: true },
        },
      },
    ], 60n);

    expect(candidate?.tokenId).toBe("12");
  });

  it("merges seller-owned and escrowed voice hashes without dropping escrow-only candidates", () => {
    expect(
      mergeMarketplaceCandidateVoiceHashes(
        ["0xowned-1", "0xowned-2"],
        ["0xescrow-1", "0xowned-2", "0xescrow-2"],
      ),
    ).toEqual(["0xowned-1", "0xowned-2", "0xescrow-1", "0xescrow-2"]);
  });

  it("ranks funding candidates by spendable balance and excludes the recipient", () => {
    expect(
      rankFundingCandidates(
        [
          { label: "founder", address: "0xaaa", spendable: 5n },
          { label: "seller", address: "0xbbb", spendable: 0n },
          { label: "buyer", address: "0xccc", spendable: 9n },
          { label: "licensee", address: "0xddd", spendable: 7n },
        ],
        "0xccc",
      ),
    ).toEqual([
      { label: "licensee", address: "0xddd", spendable: 7n },
      { label: "founder", address: "0xaaa", spendable: 5n },
    ]);
  });

  it("sorts equal-spendable funding candidates by label and filters recipient case-insensitively", () => {
    expect(
      rankFundingCandidates(
        [
          { label: "zeta", address: "0xAAA", spendable: 2n },
          { label: "alpha", address: "0xbbb", spendable: 2n },
          { label: "self", address: "0xCcC", spendable: 5n },
        ],
        "0xccc",
      ),
    ).toEqual([
      { label: "alpha", address: "0xbbb", spendable: 2n },
      { label: "zeta", address: "0xAAA", spendable: 2n },
    ]);
  });
});
