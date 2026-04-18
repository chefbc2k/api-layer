import { ethers } from "ethers";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  advanceLocalForkPastMarketplaceTradingLock,
  apiCall,
  applyNativeSetupTopUps,
  applyDomainSetupStatus,
  buildWalletContext,
  buildUsdcFundingStatus,
  collectSellerEscrowedVoiceHashes,
  createEmptyAgedListingFixture,
  createFallbackMarketplaceFixture,
  createGovernanceStatus,
  createInitialStatus,
  createInactivePreferredMarketplaceFixture,
  createLicensingStatus,
  createPreferredMarketplaceFixture,
  ensureNativeBalance,
  ensureRole,
  extractTxHash,
  nativeTransferSpendable,
  persistSetupStatus,
  populateSetupStatus,
  prepareAgedListingFixture,
  retryApiRead,
  roleId,
  setApiLayerActorEnvironment,
  toJsonValue,
  waitForReceipt,
} from "./base-sepolia-operator-setup.js";

describe("base sepolia operator setup helpers", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("serializes nested bigint values to JSON-safe strings", () => {
    expect(
      toJsonValue({
        amount: 5n,
        nested: [1n, { other: 2n }],
      }),
    ).toEqual({
      amount: "5",
      nested: ["1", { other: "2" }],
    });
  });

  it("extracts transaction hashes and rejects malformed payloads", () => {
    expect(extractTxHash({ txHash: "0xabc" })).toBe("0xabc");
    expect(() => extractTxHash(null)).toThrow("missing tx payload");
    expect(() => extractTxHash({ txHash: "abc" })).toThrow("missing txHash");
  });

  it("retries reads until the condition is satisfied", async () => {
    vi.useFakeTimers();
    const read = vi.fn()
      .mockResolvedValueOnce({ ready: false })
      .mockResolvedValueOnce({ ready: false })
      .mockResolvedValueOnce({ ready: true });

    const resultPromise = retryApiRead(read, (value) => value.ready, 3, 25);
    await vi.advanceTimersByTimeAsync(50);

    await expect(resultPromise).resolves.toEqual({ ready: true });
    expect(read).toHaveBeenCalledTimes(3);
  });

  it("advances a local fork past the marketplace trading lock when a listing is still fresh", async () => {
    const provider = {
      getBlock: vi.fn().mockResolvedValue({ timestamp: 1_000 }),
      send: vi.fn().mockResolvedValue(undefined),
    };

    await expect(advanceLocalForkPastMarketplaceTradingLock({
      provider: provider as any,
      rpcUrl: "http://127.0.0.1:8548",
      listing: {
        createdAt: "1000",
        expiresAt: "999999",
        isActive: true,
      },
    })).resolves.toEqual({
      advanced: true,
      secondsAdvanced: "86401",
      readyAt: "87401",
    });
    expect(provider.send).toHaveBeenNthCalledWith(1, "evm_increaseTime", [86401]);
    expect(provider.send).toHaveBeenNthCalledWith(2, "evm_mine", []);
  });

  it("hashes role names consistently", () => {
    expect(roleId("PROPOSER_ROLE")).toMatch(/^0x[a-f0-9]{64}$/);
  });

  it("builds the default blocked aged-listing fixture", () => {
    expect(createEmptyAgedListingFixture()).toEqual({
      voiceHash: null,
      tokenId: null,
      activeListing: false,
      purchaseReadiness: "unverified",
      status: "blocked",
      reason: "missing aged seller asset",
      approval: null,
      listing: null,
      localForkTimeAdvance: null,
    });
  });

  it("classifies preferred marketplace fixtures as ready, partial, or blocked", () => {
    const purchaseReady = createPreferredMarketplaceFixture({
      voiceHash: "0xvoice-ready",
      tokenId: "11",
      listingReadback: {
        status: 200,
        payload: {
          isActive: true,
          createdAt: "0",
        },
      },
    }, 100_000n);
    const activeButYoung = createPreferredMarketplaceFixture({
      voiceHash: "0xvoice-partial",
      tokenId: "12",
      listingReadback: {
        status: 200,
        payload: {
          isActive: true,
          createdAt: "99999",
        },
      },
    }, 100_000n);
    const inactive = createPreferredMarketplaceFixture({
      voiceHash: "0xvoice-blocked",
      tokenId: "13",
      listingReadback: {
        status: 200,
        payload: {
          isActive: false,
          createdAt: "0",
        },
      },
    }, 100_000n);
    const expired = createPreferredMarketplaceFixture({
      voiceHash: "0xvoice-expired",
      tokenId: "14",
      listingReadback: {
        status: 200,
        payload: {
          isActive: true,
          createdAt: "0",
          expiresAt: "10",
        },
      },
    }, 100_000n);

    expect(purchaseReady).toMatchObject({
      voiceHash: "0xvoice-ready",
      tokenId: "11",
      activeListing: true,
      purchaseReadiness: "purchase-ready",
      status: "ready",
      reason: "listing is active and older than the marketplace contract's 1 day trading lock",
    });
    expect(activeButYoung).toMatchObject({
      voiceHash: "0xvoice-partial",
      tokenId: "12",
      activeListing: true,
      purchaseReadiness: "listed-not-yet-purchase-proven",
      status: "partial",
      reason: "active listing exists, but it is still within the marketplace contract's 1 day trading lock",
    });
    expect(inactive).toMatchObject({
      voiceHash: "0xvoice-blocked",
      tokenId: "13",
      activeListing: false,
      purchaseReadiness: "unverified",
      status: "blocked",
      reason: "seller owns aged assets, but none currently have an active listing",
    });
    expect(expired).toMatchObject({
      voiceHash: "0xvoice-expired",
      tokenId: "14",
      activeListing: true,
      purchaseReadiness: "unverified",
      status: "blocked",
      reason: "listing remains active in readback, but its expiration time has already passed",
    });
  });

  it("records fallback and inactive preferred listing outcomes", () => {
    expect(createFallbackMarketplaceFixture(
      { voiceHash: "0xvoice", tokenId: "99" },
      { status: 202, payload: { txHash: "0xlist" } },
      { status: 200, payload: { isActive: true } },
      { status: 202, payload: { txHash: "0xapproval" } },
      100_000n,
    )).toMatchObject({
      voiceHash: "0xvoice",
      tokenId: "99",
      activeListing: true,
      purchaseReadiness: "listed-not-yet-purchase-proven",
      status: "partial",
      reason: "listing was activated during setup, but it is still within the marketplace contract's 1 day trading lock",
      approval: { status: 202, payload: { txHash: "0xapproval" } },
      listing: {
        submission: { status: 202, payload: { txHash: "0xlist" } },
        readback: { status: 200, payload: { isActive: true } },
      },
      localForkTimeAdvance: null,
    });

    expect(createInactivePreferredMarketplaceFixture({
      voiceHash: "0xvoice",
      tokenId: "100",
      listingReadback: { status: 404, payload: null },
    }, { status: 202, payload: { txHash: "0xapproval" } })).toMatchObject({
      voiceHash: "0xvoice",
      tokenId: "100",
      activeListing: false,
      purchaseReadiness: "unverified",
      status: "blocked",
      reason: "seller owns aged assets, but none currently have an active listing",
      approval: { status: 202, payload: { txHash: "0xapproval" } },
      localForkTimeAdvance: null,
    });
  });

  it("marks fallback listings blocked when the refreshed listing is already expired", () => {
    expect(createFallbackMarketplaceFixture(
      { voiceHash: "0xvoice", tokenId: "101" },
      { status: 500, payload: { error: "listing failed" } },
      { status: 200, payload: { isActive: true, createdAt: "0", expiresAt: "10" } },
      null,
      100_000n,
    )).toMatchObject({
      voiceHash: "0xvoice",
      tokenId: "101",
      activeListing: true,
      purchaseReadiness: "unverified",
      status: "blocked",
      reason: "listing remains active in readback, but its expiration time has already passed",
      localForkTimeAdvance: null,
    });
  });

  it("marks fallback listings blocked when activation never succeeds", () => {
    expect(createFallbackMarketplaceFixture(
      { voiceHash: "0xvoice", tokenId: "102" },
      { status: 500, payload: { error: "listing failed" } },
      { status: 404, payload: null },
      null,
      100_000n,
    )).toMatchObject({
      voiceHash: "0xvoice",
      tokenId: "102",
      activeListing: false,
      purchaseReadiness: "unverified",
      status: "blocked",
      reason: "listing could not be activated",
      approval: null,
      listing: {
        submission: { status: 500, payload: { error: "listing failed" } },
        readback: { status: 404, payload: null },
      },
      localForkTimeAdvance: null,
    });
  });

  it("classifies governance readiness from proposer role and voting power", () => {
    expect(createGovernanceStatus({
      founderAddress: "0xfounder",
      proposerRolePresent: true,
      threshold: 100n,
      currentVotes: 120n,
      currentVotesAfterSetup: 120n,
      tokenBalance: 500n,
      mintingFinished: true,
    })).toMatchObject({
      proposerAddress: "0xfounder",
      proposerRolePresent: true,
      threshold: "100",
      currentVotes: "120",
      currentVotesAfterSetup: "120",
      tokenBalance: "500",
      mintingFinished: true,
      bootstrapRepairAttempted: false,
      status: "ready",
      reason: "promoted baseline already provides proposer role access and founder voting power",
    });

    expect(createGovernanceStatus({
      founderAddress: "0xfounder",
      proposerRolePresent: false,
      threshold: 100n,
      currentVotes: 50n,
      currentVotesAfterSetup: 50n,
      tokenBalance: 500n,
      mintingFinished: false,
    })).toMatchObject({
      proposerAddress: "0xfounder",
      proposerRolePresent: false,
      threshold: "100",
      currentVotes: "50",
      currentVotesAfterSetup: "50",
      tokenBalance: "500",
      mintingFinished: false,
      bootstrapRepairAttempted: false,
      status: "partial",
      reason: "promoted baseline is expected to be ready without API-side bootstrap repair; inspect live role or voting power state",
    });
  });

  it("computes native spendable balance after gas reserve", async () => {
    const spendable = await nativeTransferSpendable({
      address: "0x1234",
      provider: {
        getBalance: vi.fn().mockResolvedValue(1_000_000_050_000n),
        getFeeData: vi.fn().mockResolvedValue({ gasPrice: 1n }),
      },
    } as any);

    expect(spendable).toBe(29_000n);
  });

  it("returns zero native spendable balance when max fee reserve exceeds balance", async () => {
    const spendable = await nativeTransferSpendable({
      address: "0x1234",
      provider: {
        getBalance: vi.fn().mockResolvedValue(1_000n),
        getFeeData: vi.fn().mockResolvedValue({ maxFeePerGas: 1_000n, gasPrice: 1n }),
      },
    } as any);

    expect(spendable).toBe(0n);
  });

  it("posts API calls with JSON headers, auth, and parsed payloads", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 202,
      json: vi.fn().mockResolvedValue({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      apiCall(8787, "POST", "/v1/test", {
        apiKey: "founder-key",
        body: { enabled: true },
      }),
    ).resolves.toEqual({
      status: 202,
      payload: { ok: true },
    });

    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8787/v1/test", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": "founder-key",
      },
      body: JSON.stringify({ enabled: true }),
    });
  });

  it("omits auth and body when apiCall receives no options", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: vi.fn().mockResolvedValue({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiCall(8787, "GET", "/v1/test")).resolves.toEqual({
      status: 200,
      payload: { ok: true },
    });

    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8787/v1/test", {
      method: "GET",
      headers: {
        "content-type": "application/json",
      },
      body: undefined,
    });
  });

  it("tolerates API responses that do not return JSON bodies", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      status: 204,
      json: vi.fn().mockRejectedValue(new Error("no json")),
    }));

    await expect(apiCall(8787, "GET", "/v1/empty")).resolves.toEqual({
      status: 204,
      payload: null,
    });
  });

  it("waits for a successful receipt and rejects reverted transactions", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        status: 200,
        json: vi.fn().mockResolvedValue({ receipt: { status: 1 } }),
      })
      .mockResolvedValueOnce({
        status: 200,
        json: vi.fn().mockResolvedValue({ receipt: { status: 0 } }),
      });
    vi.stubGlobal("fetch", fetchMock);

    await expect(waitForReceipt(8787, "0xabc")).resolves.toBeUndefined();
    await expect(waitForReceipt(8787, "0xdef")).rejects.toThrow("transaction reverted: 0xdef");
  });

  it("times out when receipts never materialize", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      status: 404,
      json: vi.fn().mockResolvedValue(null),
    }));

    const receiptExpectation = expect(waitForReceipt(8787, "0xnever")).rejects.toThrow("timed out waiting for receipt 0xnever");
    await vi.runAllTimersAsync();
    await receiptExpectation;
  });

  it("returns the last retry value when the condition never becomes true", async () => {
    vi.useFakeTimers();
    const read = vi.fn()
      .mockResolvedValueOnce({ ready: false, attempts: 1 })
      .mockResolvedValueOnce({ ready: false, attempts: 2 });

    const resultPromise = retryApiRead(read, (value) => value.ready, 2, 25);
    await vi.runAllTimersAsync();

    await expect(resultPromise).resolves.toEqual({ ready: false, attempts: 2 });
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("throws when retryApiRead is called with zero attempts", async () => {
    await expect(retryApiRead(async () => ({ ready: false }), (value) => value.ready, 0)).rejects.toThrow(
      "retryApiRead received no values",
    );
  });

  it("reports native top-ups as already satisfied when the target has enough balance", async () => {
    const provider = {
      getBalance: vi.fn().mockResolvedValue(100n),
      getFeeData: vi.fn().mockResolvedValue({ gasPrice: 1n }),
    };
    const target = { address: "0xtarget", provider } as any;

    await expect(ensureNativeBalance([], new Map(), target, 50n)).resolves.toEqual({
      funded: false,
      balance: "100",
      attemptedFunders: [],
    });
  });

  it("tops up balances from ranked funders and records the transfer receipts", async () => {
    const balances = new Map<string, bigint>([
      ["0xtarget", 1_000_000_000_005n],
      ["0xfunder-a", 1_000_000_000_050n],
      ["0xfunder-b", 1_000_000_000_080n],
    ]);
    const provider = {
      getBalance: vi.fn(async (address: string) => balances.get(address) ?? 0n),
      getFeeData: vi.fn().mockResolvedValue({ gasPrice: 0n }),
    };
    const target = { address: "0xtarget", provider } as any;
    const makeWallet = (address: string, txHash?: string) => ({
      address,
      provider,
      sendTransaction: vi.fn(async ({ to, value }: { to: string; value: bigint }) => {
        balances.set(address, (balances.get(address) ?? 0n) - value);
        balances.set(to, (balances.get(to) ?? 0n) + value);
        return {
          wait: vi.fn().mockResolvedValue({ status: 1, hash: txHash ?? `hash-${address}` }),
        };
      }),
    });
    const funderA = makeWallet("0xfunder-a", "0xaaa");
    const funderB = makeWallet("0xfunder-b", "0xbbb");

    const result = await ensureNativeBalance(
      [funderA, funderB, target],
      new Map([
        ["0xfunder-a", "seller"],
        ["0xfunder-b", "founder"],
      ]),
      target,
      1_000_000_000_060n,
    );

    expect(result).toEqual({
      funded: true,
      balance: "1000000000085",
      fundingStrategy: "transfer",
      attemptedFunders: [
        { label: "founder", address: "0xfunder-b", spendable: "80" },
        { label: "seller", address: "0xfunder-a", spendable: "50" },
      ],
      fundingTransactions: [
        { label: "founder", address: "0xfunder-b", txHash: "0xbbb", amount: "80" },
      ],
    });
    expect(funderA.sendTransaction).not.toHaveBeenCalled();
    expect(funderB.sendTransaction).toHaveBeenCalledTimes(1);
  });

  it("seeds the target balance directly on a loopback fork", async () => {
    const provider = {
      getBalance: vi.fn()
        .mockResolvedValueOnce(5n)
        .mockResolvedValueOnce(60n),
      send: vi.fn().mockResolvedValue(undefined),
    };
    const target = { address: "0xtarget", provider } as any;

    const result = await ensureNativeBalance([], new Map(), target, 50n, "http://127.0.0.1:8545");

    expect(provider.send).toHaveBeenCalledWith("anvil_setBalance", [
      "0xtarget",
      ethers.toQuantity(50n + ethers.parseEther("0.00001")),
    ]);
    expect(result).toEqual({
      funded: true,
      balance: "60",
      fundingStrategy: "local-rpc-balance-seed",
      attemptedFunders: [],
    });
  });

  it("reports funding blockers when no available signer can satisfy the deficit", async () => {
    const balances = new Map<string, bigint>([
      ["0xtarget", 1_000_000_000_005n],
      ["0xfunder", 1_000_000_000_010n],
    ]);
    const provider = {
      getBalance: vi.fn(async (address: string) => balances.get(address) ?? 0n),
      getFeeData: vi.fn().mockResolvedValue({ gasPrice: 0n }),
    };
    const target = { address: "0xtarget", provider } as any;
    const funder = {
      address: "0xfunder",
      provider,
      sendTransaction: vi.fn().mockResolvedValue({
        wait: vi.fn().mockResolvedValue({ status: 0, hash: "0xdead" }),
      }),
    } as any;

    const result = await ensureNativeBalance([funder, target], new Map([["0xfunder", "seller"]]), target, 1_000_000_000_050n);

    expect(result.funded).toBe(false);
    expect(result.balance).toBe("1000000000005");
    expect(result.attemptedFunders).toEqual([{ label: "seller", address: "0xfunder", spendable: "10" }]);
    expect(result.blockedReason).toContain("need 45 additional wei");
  });

  it("detects existing roles, grants missing ones, and reports grant failures", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        status: 200,
        json: vi.fn().mockResolvedValue(true),
      })
      .mockResolvedValueOnce({
        status: 404,
        json: vi.fn().mockResolvedValue(false),
      })
      .mockResolvedValueOnce({
        status: 202,
        json: vi.fn().mockResolvedValue({ txHash: "0xgrant" }),
      })
      .mockResolvedValueOnce({
        status: 200,
        json: vi.fn().mockResolvedValue({ receipt: { status: 1 } }),
      })
      .mockResolvedValueOnce({
        status: 404,
        json: vi.fn().mockResolvedValue(false),
      })
      .mockResolvedValueOnce({
        status: 500,
        json: vi.fn().mockResolvedValue({ error: "boom" }),
      });
    vi.stubGlobal("fetch", fetchMock);

    await expect(ensureRole(8787, "ROLE", "0x1")).resolves.toEqual({ status: "present" });
    await expect(ensureRole(8787, "ROLE", "0x2")).resolves.toEqual({ status: "granted" });
    await expect(ensureRole(8787, "ROLE", "0x3")).resolves.toEqual({
      status: "failed",
      error: JSON.stringify({ error: "boom" }),
    });
  });

  it("applies native setup top-ups across founder, seller, and optional actors", async () => {
    const founder = { address: "0xfounder" } as any;
    const seller = { address: "0xseller" } as any;
    const buyer = { address: "0xbuyer" } as any;
    const licensee = { address: "0xlicensee" } as any;
    const status = {
      actors: {
        founder: { address: founder.address },
        seller: { address: seller.address },
        buyer: { address: buyer.address },
        licensee: { address: licensee.address },
      },
      setup: { status: "ready", blockers: [] as string[] },
      marketplace: {},
    };
    const ensureNativeBalanceFn = vi.fn()
      .mockResolvedValueOnce({ funded: true, balance: "500", attemptedFunders: [], fundingStrategy: "transfer" })
      .mockResolvedValueOnce({ funded: true, balance: "55", attemptedFunders: [] })
      .mockResolvedValueOnce({ funded: false, balance: "25", attemptedFunders: [], blockedReason: "buyer still short" })
      .mockResolvedValueOnce({ funded: false, balance: "40", attemptedFunders: [] });

    await applyNativeSetupTopUps({
      status,
      fundingWallets: [founder, seller, buyer, licensee],
      availableSpecsForFunding: new Map(),
      founder,
      seller,
      buyer,
      licensee,
      transferee: null,
      rpcUrl: "https://base-sepolia.example",
      ensureNativeBalanceFn,
    });

    expect(ensureNativeBalanceFn).toHaveBeenCalledTimes(4);
    expect(status.actors).toMatchObject({
      founder: {
        nativeTopUp: { balance: "500", fundingStrategy: "transfer" },
        nativeBalanceAfterSetup: "500",
      },
      seller: {
        nativeTopUp: { balance: "55" },
        nativeBalanceAfterSetup: "55",
      },
      buyer: {
        nativeTopUp: { balance: "25", blockedReason: "buyer still short" },
        nativeBalanceAfterSetup: "25",
      },
      licensee: {
        nativeTopUp: { balance: "40" },
        nativeBalanceAfterSetup: "40",
      },
    });
    expect(status.setup).toEqual({
      status: "blocked",
      blockers: ["buyer: buyer still short"],
    });
  });

  it("uses the reduced seller minimum while keeping optional actors on the default floor", async () => {
    const founder = { address: "0xfounder" } as any;
    const seller = { address: "0xseller" } as any;
    const buyer = { address: "0xbuyer" } as any;
    const licensee = { address: "0xlicensee" } as any;
    const transferee = { address: "0xtransferee" } as any;
    const status = {
      actors: {
        founder: { address: founder.address },
        seller: { address: seller.address },
        buyer: { address: buyer.address },
        licensee: { address: licensee.address },
        transferee: { address: transferee.address },
      },
      setup: { status: "ready", blockers: [] as string[] },
      marketplace: {},
    };
    const ensureNativeBalanceFn = vi.fn().mockResolvedValue({
      funded: true,
      balance: "500",
      attemptedFunders: [],
    });

    await applyNativeSetupTopUps({
      status,
      fundingWallets: [founder, seller, buyer, licensee, transferee],
      availableSpecsForFunding: new Map(),
      founder,
      seller,
      buyer,
      licensee,
      transferee,
      rpcUrl: "https://base-sepolia.example",
      ensureNativeBalanceFn,
    });

    expect(ensureNativeBalanceFn).toHaveBeenNthCalledWith(
      1,
      expect.any(Array),
      expect.any(Map),
      founder,
      ethers.parseEther("0.00005"),
      "https://base-sepolia.example",
    );
    expect(ensureNativeBalanceFn).toHaveBeenNthCalledWith(
      2,
      expect.any(Array),
      expect.any(Map),
      seller,
      ethers.parseEther("0.00005"),
      "https://base-sepolia.example",
    );
    expect(ensureNativeBalanceFn).toHaveBeenNthCalledWith(
      3,
      expect.any(Array),
      expect.any(Map),
      buyer,
      ethers.parseEther("0.00004"),
      "https://base-sepolia.example",
    );
    expect(ensureNativeBalanceFn).toHaveBeenNthCalledWith(
      4,
      expect.any(Array),
      expect.any(Map),
      licensee,
      ethers.parseEther("0.00004"),
      "https://base-sepolia.example",
    );
    expect(ensureNativeBalanceFn).toHaveBeenNthCalledWith(
      5,
      expect.any(Array),
      expect.any(Map),
      transferee,
      ethers.parseEther("0.00004"),
      "https://base-sepolia.example",
    );
  });

  it("raises the seller gas floor on a loopback fork so marketplace repair writes can execute", async () => {
    const founder = { address: "0xfounder" } as any;
    const seller = { address: "0xseller" } as any;
    const status = {
      actors: {
        founder: { address: founder.address },
        seller: { address: seller.address },
      },
      setup: { status: "ready", blockers: [] as string[] },
      marketplace: {},
    };
    const ensureNativeBalanceFn = vi.fn().mockResolvedValue({
      funded: true,
      balance: "500",
      attemptedFunders: [],
    });

    await applyNativeSetupTopUps({
      status,
      fundingWallets: [founder, seller],
      availableSpecsForFunding: new Map(),
      founder,
      seller,
      buyer: null,
      licensee: null,
      transferee: null,
      rpcUrl: "http://127.0.0.1:8548",
      ensureNativeBalanceFn,
    });

    expect(ensureNativeBalanceFn).toHaveBeenNthCalledWith(
      2,
      expect.any(Array),
      expect.any(Map),
      seller,
      ethers.parseEther("0.001"),
      "http://127.0.0.1:8548",
    );
  });

  it("builds wallet context and actor env mappings from repo env keys", () => {
    const provider = {
      getBalance: vi.fn(),
    } as any;
    const founder = ethers.Wallet.createRandom();
    const seller = ethers.Wallet.createRandom();
    const buyer = ethers.Wallet.createRandom();
    const licensee = ethers.Wallet.createRandom();

    const context = buildWalletContext({
      PRIVATE_KEY: founder.privateKey,
      ORACLE_SIGNER_PRIVATE_KEY_1: seller.privateKey,
      ORACLE_SIGNER_PRIVATE_KEY_2: buyer.privateKey,
      ORACLE_SIGNER_PRIVATE_KEY_3: licensee.privateKey,
    } as any, provider);

    expect(context.availableSpecs.map((entry) => entry.label)).toEqual(["founder", "seller", "buyer", "licensee"]);
    expect(context.availableSpecsForFunding.get(context.founder.address.toLowerCase())).toBe("founder");
    expect(context.availableSpecsForFunding.get(context.seller.address.toLowerCase())).toBe("seller");
    expect(context.transferee).toBeNull();

    setApiLayerActorEnvironment(context);
    expect(JSON.parse(process.env.API_LAYER_KEYS_JSON ?? "{}")).toMatchObject({
      "founder-key": { signerId: "founder" },
      "seller-key": { signerId: "seller" },
      "buyer-key": { signerId: "buyer" },
      "licensee-key": { signerId: "licensee" },
    });
    expect(JSON.parse(process.env.API_LAYER_SIGNER_MAP_JSON ?? "{}")).toMatchObject({
      founder: founder.privateKey,
      seller: seller.privateKey,
      buyer: buyer.privateKey,
      licensee: licensee.privateKey,
    });
  });

  it("rejects repo envs that omit the founder private key", () => {
    expect(() => buildWalletContext({} as any, {} as any)).toThrow("missing PRIVATE_KEY in repo .env");
  });

  it("creates the initial status payload with actor native balances", async () => {
    const founder = ethers.Wallet.createRandom();
    const seller = ethers.Wallet.createRandom();
    const balances = new Map<string, bigint>([
      [founder.address, 111n],
      [seller.address, 222n],
    ]);

    const status = await createInitialStatus({
      chainId: 84532,
      fixtureRpcUrl: "https://rpc.example",
      runtimeRpcUrl: "http://127.0.0.1:8548",
      forkedFrom: "https://fork.example",
      diamondAddress: "0xdiamond",
      availableSpecs: [
        { label: "founder", privateKey: founder.privateKey },
        { label: "seller", privateKey: seller.privateKey },
      ],
      provider: {
        getBalance: vi.fn(async (address: string) => balances.get(address) ?? 0n),
      },
    });

    expect(status).toMatchObject({
      network: {
        chainId: 84532,
        rpcUrl: "https://rpc.example",
        upstreamRpcUrl: "https://rpc.example",
        runtimeRpcUrl: "http://127.0.0.1:8548",
        forkedFrom: "https://fork.example",
        diamondAddress: "0xdiamond",
      },
      setup: {
        status: "ready",
        blockers: [],
      },
      actors: {
        founder: {
          address: founder.address,
          nativeBalance: "111",
        },
        seller: {
          address: seller.address,
          nativeBalance: "222",
        },
      },
    });
  });

  it("propagates partial and blocked domain states into setup status", () => {
    const status = {
      actors: {},
      setup: { status: "ready", blockers: [] as string[] },
      marketplace: {},
      governance: {},
      licensing: {},
    };

    applyDomainSetupStatus(status as any, "governance", "partial", "votes still below threshold");
    expect(status.setup).toEqual({
      status: "partial",
      blockers: ["governance: votes still below threshold"],
    });

    applyDomainSetupStatus(status as any, "marketplace", "blocked", "listing could not be activated");
    expect(status.setup).toEqual({
      status: "blocked",
      blockers: [
        "governance: votes still below threshold",
        "marketplace: listing could not be activated",
      ],
    });
  });

  it("stores the upstream rpc separately from the fork runtime endpoint", async () => {
    const founder = ethers.Wallet.createRandom();

    const status = await createInitialStatus({
      chainId: 84532,
      fixtureRpcUrl: "https://base-sepolia.example",
      runtimeRpcUrl: "http://127.0.0.1:8548",
      forkedFrom: "https://base-sepolia.example",
      diamondAddress: "0xdiamond",
      availableSpecs: [
        { label: "founder", privateKey: founder.privateKey },
      ],
      provider: {
        getBalance: vi.fn(async () => 111n),
      },
    });

    expect(status).toMatchObject({
      network: {
        rpcUrl: "https://base-sepolia.example",
        upstreamRpcUrl: "https://base-sepolia.example",
        runtimeRpcUrl: "http://127.0.0.1:8548",
        forkedFrom: "https://base-sepolia.example",
      },
    });
  });

  it("populates marketplace, governance, and licensing status through injected setup helpers", async () => {
    const provider = {} as any;
    const founder = ethers.Wallet.createRandom().connect(provider);
    const seller = ethers.Wallet.createRandom().connect(provider);
    const buyer = ethers.Wallet.createRandom().connect(provider);
    const licensee = ethers.Wallet.createRandom().connect(provider);
    const transferee = ethers.Wallet.createRandom().connect(provider);

    const status = {
      actors: {},
      setup: { status: "ready", blockers: [] as string[] },
      marketplace: {},
      governance: {},
      licensing: {},
    };
    const applyNativeSetupTopUpsFn = vi.fn(async ({ status: setupStatus }: { status: typeof status }) => {
      setupStatus.setup.status = "ready";
    });
    const buildUsdcFundingStatusFn = vi.fn().mockResolvedValue({ buyerBalanceAfterTransfer: "25000000" });
    const collectSellerEscrowedVoiceHashesFn = vi.fn().mockResolvedValue(["0xescrowed"]);
    const prepareAgedListingFixtureFn = vi.fn().mockResolvedValue({ tokenId: "11", status: "ready" });
    const getCurrentVotes = vi.fn()
      .mockResolvedValueOnce(123n)
      .mockResolvedValueOnce(456n);
    const providerWithBlock = {
      getBlock: vi.fn().mockResolvedValue({ timestamp: 1000 }),
    } as any;

    await populateSetupStatus({
      status,
      fundingWallets: [founder, seller, buyer, licensee, transferee],
      availableSpecsForFunding: new Map([[founder.address.toLowerCase(), "founder"]]),
      founder,
      seller,
      buyer,
      licensee,
      transferee,
      rpcUrl: "http://127.0.0.1:8548",
      erc20: null,
      availableSpecs: [
        { label: "founder", privateKey: founder.privateKey },
        { label: "seller", privateKey: seller.privateKey },
      ],
      provider: providerWithBlock,
      port: 8787,
      diamondAddress: "0xdiamond",
      usdcAddress: "0xusdc",
      voiceAsset: {
        getVoiceAssetsByOwner: vi.fn(async (address: string) => (address === seller.address ? ["0xseller"] : ["0xescrowed"])),
        getVoiceAsset: vi.fn().mockResolvedValue({ createdAt: "0" }),
        getTokenId: vi.fn().mockResolvedValue(11n),
      },
      escrow: {
        getOriginalOwner: vi.fn().mockResolvedValue(seller.address),
      },
      accessControl: {
        hasRole: vi.fn().mockResolvedValue(true),
      },
      governorFacet: {
        getVotingConfig: vi.fn().mockResolvedValue([0n, 0n, 100n]),
      },
      delegationFacet: {
        getCurrentVotes,
      },
      tokenSupply: {
        tokenBalanceOf: vi.fn().mockResolvedValue(999n),
        supplyIsMintingFinished: vi.fn().mockResolvedValue(true),
      },
      applyNativeSetupTopUpsFn: applyNativeSetupTopUpsFn as any,
      buildUsdcFundingStatusFn: buildUsdcFundingStatusFn as any,
      collectSellerEscrowedVoiceHashesFn: collectSellerEscrowedVoiceHashesFn as any,
      prepareAgedListingFixtureFn: prepareAgedListingFixtureFn as any,
    });

    expect(applyNativeSetupTopUpsFn).toHaveBeenCalledTimes(1);
    expect(buildUsdcFundingStatusFn).toHaveBeenCalledTimes(1);
    expect(collectSellerEscrowedVoiceHashesFn).toHaveBeenCalledWith({
      escrowVoiceHashes: ["0xescrowed"],
      voiceAsset: expect.any(Object),
      escrow: expect.any(Object),
      sellerAddress: seller.address,
    });
    expect(prepareAgedListingFixtureFn).toHaveBeenCalledWith({
      candidateVoiceHashes: ["0xseller", "0xescrowed"],
      voiceAsset: expect.any(Object),
      sellerAddress: seller.address,
      diamondAddress: "0xdiamond",
      port: 8787,
      latestTimestamp: 1000n,
      provider: providerWithBlock,
      rpcUrl: "http://127.0.0.1:8548",
      marketplace: undefined,
    });
    expect(status.marketplace).toMatchObject({
      usdcFunding: { buyerBalanceAfterTransfer: "25000000" },
      agedListingFixture: { tokenId: "11", status: "ready" },
    });
    expect(status.governance).toMatchObject({
      proposerAddress: founder.address,
      status: "ready",
      currentVotes: "123",
      currentVotesAfterSetup: "456",
      tokenBalance: "999",
    });
    expect(status.licensing).toEqual({
      lifecycle: {
        activeLicenseLifecycle: "issueLicense/createLicense -> getLicenseTerms/transferLicense as licensee-scoped operations",
      },
      recommendedActors: {
        licensor: seller.address,
        licensee: licensee.address,
        transferee: transferee.address,
      },
    });
    expect(status.setup).toEqual({
      status: "ready",
      blockers: [],
    });
  });

  it("marks setup blocked when injected fixture preparation remains blocked", async () => {
    const provider = {} as any;
    const founder = ethers.Wallet.createRandom().connect(provider);
    const seller = ethers.Wallet.createRandom().connect(provider);

    const status = {
      actors: {},
      setup: { status: "ready", blockers: [] as string[] },
      marketplace: {},
      governance: {},
      licensing: {},
    };

    await populateSetupStatus({
      status,
      fundingWallets: [founder, seller],
      availableSpecsForFunding: new Map([[founder.address.toLowerCase(), "founder"]]),
      founder,
      seller,
      buyer: null,
      licensee: null,
      transferee: null,
      rpcUrl: "http://127.0.0.1:8548",
      erc20: null,
      availableSpecs: [
        { label: "founder", privateKey: founder.privateKey },
        { label: "seller", privateKey: seller.privateKey },
      ],
      provider: {
        getBlock: vi.fn().mockResolvedValue({ timestamp: 1000 }),
      } as any,
      port: 8787,
      diamondAddress: "0xdiamond",
      usdcAddress: null,
      voiceAsset: {
        getVoiceAssetsByOwner: vi.fn(async (address: string) => (address === seller.address ? ["0xseller"] : [])),
        getVoiceAsset: vi.fn().mockResolvedValue({ createdAt: "0" }),
        getTokenId: vi.fn().mockResolvedValue(11n),
      },
      escrow: {
        getOriginalOwner: vi.fn().mockResolvedValue(seller.address),
      },
      accessControl: {
        hasRole: vi.fn().mockResolvedValue(true),
      },
      governorFacet: {
        getVotingConfig: vi.fn().mockResolvedValue([0n, 0n, 100n]),
      },
      delegationFacet: {
        getCurrentVotes: vi.fn().mockResolvedValue(456n),
      },
      tokenSupply: {
        tokenBalanceOf: vi.fn().mockResolvedValue(999n),
        supplyIsMintingFinished: vi.fn().mockResolvedValue(true),
      },
      applyNativeSetupTopUpsFn: vi.fn(async ({ status: setupStatus }: { status: typeof status }) => {
        setupStatus.setup.status = "ready";
      }) as any,
      buildUsdcFundingStatusFn: vi.fn().mockResolvedValue(null) as any,
      collectSellerEscrowedVoiceHashesFn: vi.fn().mockResolvedValue([]) as any,
      prepareAgedListingFixtureFn: vi.fn().mockResolvedValue({
        tokenId: "11",
        status: "blocked",
        reason: "listing could not be activated",
      }) as any,
    });

    expect(status.setup).toEqual({
      status: "blocked",
      blockers: ["marketplace: listing could not be activated"],
    });
  });

  it("persists setup status to disk using JSON-safe serialization", async () => {
    const mkdirFn = vi.fn().mockResolvedValue(undefined);
    const writeFileFn = vi.fn().mockResolvedValue(undefined);
    const logFn = vi.fn();

    await persistSetupStatus(
      {
        setup: { status: "ready" },
        actors: { founder: { nativeBalance: 5n } },
      },
      { mkdirFn: mkdirFn as any, writeFileFn: writeFileFn as any, logFn },
    );

    expect(mkdirFn).toHaveBeenCalledWith(expect.stringContaining(".runtime"), { recursive: true });
    expect(writeFileFn).toHaveBeenCalledWith(
      expect.stringContaining("base-sepolia-operator-fixtures.json"),
      expect.stringContaining("\"nativeBalance\": \"5\""),
      "utf8",
    );
    expect(logFn).toHaveBeenCalledWith(expect.stringContaining("\"status\": \"ready\""));
  });

  it("builds USDC funding status with signer transfer and approval repair", async () => {
    const provider = {} as any;
    const founder = ethers.Wallet.createRandom().connect(provider);
    const buyer = ethers.Wallet.createRandom().connect(provider);
    const availableSpecs = [
      { label: "founder", privateKey: founder.privateKey },
      { label: "buyer", privateKey: buyer.privateKey },
    ];
    const balances = new Map<string, bigint>([
      [founder.address, 50_000_000n],
      [buyer.address, 1_000_000n],
    ]);
    const allowances = new Map<string, bigint>([
      [buyer.address, 0n],
    ]);
    const transfer = vi.fn(async (to: string, amount: bigint) => {
      balances.set(founder.address, (balances.get(founder.address) ?? 0n) - amount);
      balances.set(to, (balances.get(to) ?? 0n) + amount);
      return {
        wait: vi.fn().mockResolvedValue({ hash: "0xtransfer" }),
      };
    });
    const erc20 = {
      balanceOf: vi.fn(async (address: string) => balances.get(address) ?? 0n),
      allowance: vi.fn(async (owner: string) => allowances.get(owner) ?? 0n),
      connect: vi.fn(() => ({ transfer })),
    };
    const apiCallFn = vi.fn().mockResolvedValue({
      status: 202,
      payload: { txHash: "0xapprove" },
    });
    const waitForReceiptFn = vi.fn(async () => {
      allowances.set(buyer.address, balances.get(buyer.address) ?? 0n);
    });

    const result = await buildUsdcFundingStatus({
      erc20,
      availableSpecs,
      buyer,
      provider,
      port: 8787,
      diamondAddress: "0xdiamond",
      usdcAddress: "0xusdc",
      apiCallFn,
      waitForReceiptFn,
    });

    expect(result).toMatchObject({
      token: "0xusdc",
      buyerBalance: "1000000",
      buyerAllowance: "0",
      transferTxHash: "0xtransfer",
      buyerBalanceAfterTransfer: "25000000",
      buyerAllowanceAfterApproval: "25000000",
      approval: {
        status: 202,
        payload: { txHash: "0xapprove" },
      },
      richestSigner: {
        label: "founder",
        address: founder.address,
        balance: 50_000_000n,
      },
    });
    expect(erc20.connect).toHaveBeenCalledTimes(1);
    expect(transfer).toHaveBeenCalledWith(buyer.address, 24_000_000n);
    expect(apiCallFn).toHaveBeenCalledWith(8787, "POST", "/v1/tokenomics/commands/token-approve", {
      apiKey: "buyer-key",
      body: { spender: "0xdiamond", amount: "25000000" },
    });
    expect(waitForReceiptFn).toHaveBeenCalledWith(8787, "0xapprove");
  });

  it("returns stable USDC funding metadata when no transfer or approval repair is needed", async () => {
    const provider = {} as any;
    const buyer = ethers.Wallet.createRandom().connect(provider);
    const availableSpecs = [
      { label: "buyer", privateKey: buyer.privateKey },
    ];
    const erc20 = {
      balanceOf: vi.fn(async () => 30_000_000n),
      allowance: vi.fn(async () => 30_000_000n),
      connect: vi.fn(),
    };
    const apiCallFn = vi.fn();
    const waitForReceiptFn = vi.fn();

    const result = await buildUsdcFundingStatus({
      erc20,
      availableSpecs,
      buyer,
      provider,
      port: 8787,
      diamondAddress: "0xdiamond",
      usdcAddress: "0xusdc",
      apiCallFn: apiCallFn as any,
      waitForReceiptFn: waitForReceiptFn as any,
    });

    expect(result).toMatchObject({
      token: "0xusdc",
      buyerBalance: "30000000",
      buyerAllowance: "30000000",
      richestSigner: {
        label: "buyer",
        address: buyer.address,
        balance: 30_000_000n,
      },
    });
    expect(result).not.toHaveProperty("transferTxHash");
    expect(result).not.toHaveProperty("approval");
    expect(erc20.connect).not.toHaveBeenCalled();
    expect(apiCallFn).not.toHaveBeenCalled();
    expect(waitForReceiptFn).not.toHaveBeenCalled();
  });

  it("records approval failures without waiting for a receipt when buyer remains underfunded", async () => {
    const provider = {} as any;
    const buyer = ethers.Wallet.createRandom().connect(provider);
    const availableSpecs = [
      { label: "buyer", privateKey: buyer.privateKey },
    ];
    const erc20 = {
      balanceOf: vi.fn(async () => 4_000n),
      allowance: vi.fn(async () => 0n),
      connect: vi.fn(),
    };
    const apiCallFn = vi.fn().mockResolvedValue({
      status: 400,
      payload: { error: "allowance denied" },
    });
    const waitForReceiptFn = vi.fn();

    const result = await buildUsdcFundingStatus({
      erc20,
      availableSpecs,
      buyer,
      provider,
      port: 8787,
      diamondAddress: "0xdiamond",
      usdcAddress: "0xusdc",
      apiCallFn: apiCallFn as any,
      waitForReceiptFn: waitForReceiptFn as any,
    });

    expect(result).toMatchObject({
      token: "0xusdc",
      buyerBalance: "4000",
      buyerAllowance: "0",
      richestSigner: {
        label: "buyer",
        address: buyer.address,
        balance: 4_000n,
      },
      approval: {
        status: 400,
        payload: { error: "allowance denied" },
      },
      buyerAllowanceAfterApproval: "0",
    });
    expect(result).not.toHaveProperty("transferTxHash");
    expect(erc20.connect).not.toHaveBeenCalled();
    expect(apiCallFn).toHaveBeenCalledTimes(1);
    expect(waitForReceiptFn).not.toHaveBeenCalled();
  });

  it("returns null USDC funding status when the ERC20 contract or buyer is unavailable", async () => {
    const provider = {} as any;
    const buyer = ethers.Wallet.createRandom().connect(provider);

    await expect(buildUsdcFundingStatus({
      erc20: null,
      availableSpecs: [],
      buyer,
      provider,
      port: 8787,
      diamondAddress: "0xdiamond",
      usdcAddress: "0xusdc",
    })).resolves.toBeNull();

    const erc20 = {
      balanceOf: vi.fn(),
      allowance: vi.fn(),
      connect: vi.fn(),
    };

    await expect(buildUsdcFundingStatus({
      erc20,
      availableSpecs: [],
      buyer: null,
      provider,
      port: 8787,
      diamondAddress: "0xdiamond",
      usdcAddress: "0xusdc",
    })).resolves.toBeNull();

    expect(erc20.balanceOf).not.toHaveBeenCalled();
    expect(erc20.allowance).not.toHaveBeenCalled();
    expect(erc20.connect).not.toHaveBeenCalled();
  });

  it("collects only escrowed voice hashes still owned by the seller", async () => {
    const voiceAsset = {
      getTokenId: vi.fn(async (voiceHash: string) => `${voiceHash}-token`),
    };
    const escrow = {
      getOriginalOwner: vi.fn(async (tokenId: string) => {
        if (tokenId === "0xvoice-a-token") {
          return "0xSeller";
        }
        if (tokenId === "0xvoice-b-token") {
          return "0xOther";
        }
        throw new Error("missing original owner");
      }),
    };

    await expect(collectSellerEscrowedVoiceHashes({
      escrowVoiceHashes: ["0xvoice-a", "0xvoice-b", "0xvoice-c"],
      voiceAsset,
      escrow,
      sellerAddress: "0xseller",
    })).resolves.toEqual(["0xvoice-a"]);
  });

  it("prepares a purchase-ready aged listing fixture from an existing active listing", async () => {
    const apiCallFn = vi.fn()
      .mockResolvedValueOnce({ status: 200, payload: true })
      .mockResolvedValueOnce({
        status: 200,
        payload: {
          isActive: true,
          createdAt: "0",
        },
      });

    const result = await prepareAgedListingFixture({
      candidateVoiceHashes: ["0xvoice-ready"],
      voiceAsset: {
        getVoiceAsset: vi.fn().mockResolvedValue({ createdAt: "0" }),
        getTokenId: vi.fn().mockResolvedValue(11n),
      },
      sellerAddress: "0xseller",
      diamondAddress: "0xdiamond",
      port: 8787,
      latestTimestamp: 100_000n,
      apiCallFn: apiCallFn as any,
    });

    expect(result).toMatchObject({
      voiceHash: "0xvoice-ready",
      tokenId: "11",
      activeListing: true,
      purchaseReadiness: "purchase-ready",
      status: "ready",
      approval: null,
      listing: {
        submission: null,
        readback: {
          status: 200,
          payload: {
            isActive: true,
            createdAt: "0",
          },
        },
      },
    });
  });

  it("reads seller approval once and prioritizes the oldest aged listing candidate", async () => {
    const apiCallFn = vi.fn()
      .mockResolvedValueOnce({ status: 200, payload: true })
      .mockResolvedValueOnce({
        status: 200,
        payload: {
          isActive: true,
          createdAt: "0",
        },
      });

    const result = await prepareAgedListingFixture({
      candidateVoiceHashes: ["0xnewer", "0xolder"],
      voiceAsset: {
        getVoiceAsset: vi.fn(async (voiceHash: string) => ({
          createdAt: voiceHash === "0xnewer" ? "50" : "0",
        })),
        getTokenId: vi.fn(async (voiceHash: string) => (voiceHash === "0xnewer" ? 22n : 11n)),
      },
      sellerAddress: "0xseller",
      diamondAddress: "0xdiamond",
      port: 8787,
      latestTimestamp: 100_000n,
      apiCallFn: apiCallFn as any,
    });

    expect(result).toMatchObject({
      voiceHash: "0xolder",
      tokenId: "11",
      activeListing: true,
      purchaseReadiness: "purchase-ready",
      status: "ready",
    });
    expect(apiCallFn).toHaveBeenCalledTimes(2);
    expect(apiCallFn).toHaveBeenNthCalledWith(
      1,
      8787,
      "GET",
      "/v1/voice-assets/queries/is-approved-for-all?owner=0xseller&operator=0xdiamond",
      { apiKey: "read-key" },
    );
    expect(apiCallFn).toHaveBeenNthCalledWith(
      2,
      8787,
      "GET",
      "/v1/marketplace/queries/get-listing?tokenId=11",
      { apiKey: "read-key" },
    );
  });

  it("uses direct marketplace readbacks during setup scans when provided", async () => {
    const apiCallFn = vi.fn().mockResolvedValueOnce({ status: 200, payload: true });
    const marketplace = {
      getListing: vi.fn(async (tokenId: bigint) => {
        if (tokenId === 11n) {
          return [11n, "0xseller", 1000n, 0n, 10n, 10n, 200000n, true] as const;
        }
        throw new Error("missing listing");
      }),
    };

    const result = await prepareAgedListingFixture({
      candidateVoiceHashes: ["0xolder"],
      voiceAsset: {
        getVoiceAsset: vi.fn().mockResolvedValue({ createdAt: "0" }),
        getTokenId: vi.fn().mockResolvedValue(11n),
      },
      sellerAddress: "0xseller",
      diamondAddress: "0xdiamond",
      port: 8787,
      latestTimestamp: 100_000n,
      marketplace,
      apiCallFn: apiCallFn as any,
    });

    expect(result).toMatchObject({
      voiceHash: "0xolder",
      tokenId: "11",
      activeListing: true,
      purchaseReadiness: "purchase-ready",
      status: "ready",
      listing: {
        readback: {
          status: 200,
          payload: {
            tokenId: "11",
            seller: "0xseller",
            price: "1000",
            createdAt: "0",
            createdBlock: "10",
            lastUpdateBlock: "10",
            expiresAt: "200000",
            isActive: true,
          },
        },
      },
    });
    expect(apiCallFn).toHaveBeenCalledTimes(1);
    expect(marketplace.getListing).toHaveBeenCalledWith(11n);
  });

  it("ages an existing active listing on a local fork before returning the preferred fixture", async () => {
    const apiCallFn = vi.fn()
      .mockResolvedValueOnce({ status: 200, payload: true })
      .mockResolvedValueOnce({
        status: 200,
        payload: {
          tokenId: "11",
          seller: "0xseller",
          price: "1000",
          createdAt: "100000",
          expiresAt: "200000",
          isActive: true,
        },
      });
    const retryApiReadFn = vi.fn(async (read: () => Promise<unknown>, condition: (value: any) => boolean) => {
      const value = await read();
      expect(condition(value)).toBe(true);
      return value;
    });
    const provider = {
      getBlock: vi.fn()
        .mockResolvedValueOnce({ timestamp: 100_000 })
        .mockResolvedValueOnce({ timestamp: 186_401 }),
      send: vi.fn().mockResolvedValue(undefined),
    };
    const marketplace = {
      getListing: vi.fn(async (tokenId: bigint) => {
        if (tokenId === 11n) {
          return [11n, "0xseller", 1000n, 100000n, 10n, 10n, 200000n, true] as const;
        }
        throw new Error("missing listing");
      }),
    };

    const result = await prepareAgedListingFixture({
      candidateVoiceHashes: ["0xolder"],
      voiceAsset: {
        getVoiceAsset: vi.fn().mockResolvedValue({ createdAt: "0" }),
        getTokenId: vi.fn().mockResolvedValue(11n),
      },
      sellerAddress: "0xseller",
      diamondAddress: "0xdiamond",
      port: 8787,
      latestTimestamp: 100_000n,
      provider: provider as any,
      rpcUrl: "http://127.0.0.1:8548",
      marketplace,
      apiCallFn: apiCallFn as any,
      retryApiReadFn: retryApiReadFn as any,
    });

    expect(result).toMatchObject({
      voiceHash: "0xolder",
      tokenId: "11",
      activeListing: true,
      purchaseReadiness: "purchase-ready",
      status: "ready",
      reason: "listing is active and older than the marketplace contract's 1 day trading lock",
      localForkTimeAdvance: {
        attempted: true,
        advanced: true,
        secondsAdvanced: "86401",
        readyAt: "186401",
        latestTimestampAfterAdvance: "186401",
      },
      listing: {
        submission: null,
        readback: {
          status: 200,
          payload: {
            tokenId: "11",
            seller: "0xseller",
            price: "1000",
            createdAt: "100000",
            expiresAt: "200000",
            isActive: true,
          },
        },
      },
    });
    expect(provider.send).toHaveBeenNthCalledWith(1, "evm_increaseTime", [86401]);
    expect(provider.send).toHaveBeenNthCalledWith(2, "evm_mine", []);
    expect(apiCallFn).toHaveBeenCalledTimes(1);
    expect(retryApiReadFn).toHaveBeenCalledTimes(1);
    expect(marketplace.getListing).toHaveBeenCalledTimes(2);
    expect(marketplace.getListing).toHaveBeenNthCalledWith(1, 11n);
    expect(marketplace.getListing).toHaveBeenNthCalledWith(2, 11n);
  });

  it("repairs an expired active direct listing on a local fork before returning the fixture", async () => {
    const apiCallFn = vi.fn()
      .mockResolvedValueOnce({ status: 200, payload: true })
      .mockResolvedValueOnce({ status: 202, payload: { txHash: "0xcancel" } })
      .mockResolvedValueOnce({ status: 202, payload: { txHash: "0xlist" } })
      .mockResolvedValueOnce({
        status: 200,
        payload: {
          tokenId: "11",
          seller: "0xseller",
          price: "1000",
          createdAt: "100000",
          expiresAt: "200000",
          isActive: true,
        },
      })
      .mockResolvedValueOnce({
        status: 200,
        payload: {
          tokenId: "11",
          seller: "0xseller",
          price: "1000",
          createdAt: "100000",
          expiresAt: "200000",
          isActive: true,
        },
      });
    const waitForReceiptFn = vi.fn().mockResolvedValue(undefined);
    const retryApiReadFn = vi.fn(async (read: () => Promise<unknown>, condition: (value: any) => boolean) => {
      const value = await read();
      expect(condition(value)).toBe(true);
      return value;
    });
    const marketplace = {
      getListing: vi.fn(async (tokenId: bigint) => {
        if (tokenId === 11n) {
          const callIndex = marketplace.getListing.mock.calls.filter(([candidateTokenId]) => candidateTokenId === 11n).length;
          if (callIndex === 1) {
            return [11n, "0xseller", 1000n, 0n, 10n, 10n, 10n, true] as const;
          }
          if (callIndex === 2) {
            return [11n, "0xseller", 1000n, 0n, 10n, 11n, 10n, false] as const;
          }
          return [11n, "0xseller", 1000n, 100000n, 12n, 12n, 200000n, true] as const;
        }
        throw new Error("missing listing");
      }),
    };
    const provider = {
      getBlock: vi.fn()
        .mockResolvedValueOnce({ timestamp: 100_000 })
        .mockResolvedValueOnce({ timestamp: 186_401 }),
      send: vi.fn().mockResolvedValue(undefined),
    };

    const result = await prepareAgedListingFixture({
      candidateVoiceHashes: ["0xolder-missing", "0xexpired-active"],
      voiceAsset: {
        getVoiceAsset: vi.fn(async (voiceHash: string) => ({
          createdAt: voiceHash === "0xolder-missing" ? "0" : "1",
        })),
        getTokenId: vi.fn(async (voiceHash: string) => (voiceHash === "0xolder-missing" ? 10n : 11n)),
      },
      sellerAddress: "0xseller",
      diamondAddress: "0xdiamond",
      port: 8787,
      latestTimestamp: 100_000n,
      provider: provider as any,
      rpcUrl: "http://127.0.0.1:8548",
      marketplace,
      apiCallFn: apiCallFn as any,
      waitForReceiptFn,
      retryApiReadFn: retryApiReadFn as any,
    });

    expect(result).toMatchObject({
      voiceHash: "0xexpired-active",
      tokenId: "11",
      activeListing: true,
      purchaseReadiness: "purchase-ready",
      status: "ready",
      reason: "listing is active and older than the marketplace contract's 1 day trading lock",
      localForkTimeAdvance: {
        attempted: true,
        advanced: true,
        secondsAdvanced: "86401",
        readyAt: "186401",
        latestTimestampAfterAdvance: "186401",
      },
      listing: {
        submission: { status: 202, payload: { txHash: "0xlist" } },
        readback: {
          status: 200,
          payload: {
            tokenId: "11",
            seller: "0xseller",
            price: "1000",
            createdAt: "100000",
            expiresAt: "200000",
            isActive: true,
          },
        },
      },
    });
    expect(waitForReceiptFn).toHaveBeenNthCalledWith(1, 8787, "0xcancel");
    expect(waitForReceiptFn).toHaveBeenNthCalledWith(2, 8787, "0xlist");
    expect(provider.send).toHaveBeenNthCalledWith(1, "evm_increaseTime", [86401]);
    expect(provider.send).toHaveBeenNthCalledWith(2, "evm_mine", []);
    expect(apiCallFn).toHaveBeenCalledTimes(3);
    expect(marketplace.getListing).toHaveBeenCalledTimes(5);
  });

  it("prepares a fallback aged listing fixture by approving and listing the first aged asset", async () => {
    const apiCallFn = vi.fn()
      .mockResolvedValueOnce({ status: 200, payload: false })
      .mockResolvedValueOnce({ status: 202, payload: { txHash: "0xapprove" } })
      .mockResolvedValueOnce({ status: 404, payload: null })
      .mockResolvedValueOnce({ status: 202, payload: { txHash: "0xlist" } })
      .mockResolvedValueOnce({
        status: 200,
        payload: {
          isActive: true,
          createdAt: "99999",
        },
      });
    const waitForReceiptFn = vi.fn().mockResolvedValue(undefined);
    const retryApiReadFn = vi.fn(async (read: () => Promise<unknown>) => {
      await read();
      return {
        status: 200,
        payload: {
          isActive: true,
          createdAt: "99999",
        },
      };
    });

    const result = await prepareAgedListingFixture({
      candidateVoiceHashes: ["0xyoung", "0xfallback"],
      voiceAsset: {
        getVoiceAsset: vi.fn(async (voiceHash: string) => ({ createdAt: voiceHash === "0xyoung" ? "100001" : "0" })),
        getTokenId: vi.fn(async (voiceHash: string) => (voiceHash === "0xyoung" ? 1n : 2n)),
      },
      sellerAddress: "0xseller",
      diamondAddress: "0xdiamond",
      port: 8787,
      latestTimestamp: 100_000n,
      apiCallFn: apiCallFn as any,
      waitForReceiptFn,
      retryApiReadFn: retryApiReadFn as any,
    });

    expect(result).toMatchObject({
      voiceHash: "0xfallback",
      tokenId: "2",
      activeListing: true,
      purchaseReadiness: "listed-not-yet-purchase-proven",
      status: "partial",
      approval: { status: 202, payload: { txHash: "0xapprove" } },
      listing: {
        submission: { status: 202, payload: { txHash: "0xlist" } },
        readback: { status: 200, payload: { isActive: true, createdAt: "99999" } },
      },
    });
    expect(waitForReceiptFn).toHaveBeenNthCalledWith(1, 8787, "0xapprove");
    expect(waitForReceiptFn).toHaveBeenNthCalledWith(2, 8787, "0xlist");
    expect(retryApiReadFn).toHaveBeenCalledTimes(1);
  });

  it("falls back from an inactive preferred listing without waiting on a failed list transaction", async () => {
    const apiCallFn = vi.fn()
      .mockResolvedValueOnce({ status: 200, payload: true })
      .mockResolvedValueOnce({
        status: 200,
        payload: {
          isActive: false,
          createdAt: "0",
        },
      })
      .mockResolvedValueOnce({
        status: 500,
        payload: { error: "listing failed" },
      })
      .mockResolvedValueOnce({
        status: 404,
        payload: null,
      });
    const waitForReceiptFn = vi.fn();
    const retryApiReadFn = vi.fn(async (read: () => Promise<unknown>) => {
      await read();
      return {
        status: 404,
        payload: null,
      };
    });

    const result = await prepareAgedListingFixture({
      candidateVoiceHashes: ["0xinactive"],
      voiceAsset: {
        getVoiceAsset: vi.fn().mockResolvedValue({ createdAt: "0" }),
        getTokenId: vi.fn().mockResolvedValue(33n),
      },
      sellerAddress: "0xseller",
      diamondAddress: "0xdiamond",
      port: 8787,
      latestTimestamp: 100_000n,
      apiCallFn: apiCallFn as any,
      waitForReceiptFn,
      retryApiReadFn: retryApiReadFn as any,
    });

    expect(result).toMatchObject({
      voiceHash: "0xinactive",
      tokenId: "33",
      activeListing: false,
      purchaseReadiness: "unverified",
      status: "blocked",
      reason: "listing could not be activated",
      approval: null,
      listing: {
        submission: { status: 500, payload: { error: "listing failed" } },
        readback: { status: 404, payload: null },
      },
    });
    expect(waitForReceiptFn).not.toHaveBeenCalled();
    expect(retryApiReadFn).toHaveBeenCalledTimes(1);
  });

  it("returns the default blocked fixture when no aged asset is eligible", async () => {
    const apiCallFn = vi.fn();

    const result = await prepareAgedListingFixture({
      candidateVoiceHashes: ["0xfuture-voice"],
      voiceAsset: {
        getVoiceAsset: vi.fn().mockResolvedValue({ createdAt: "100001" }),
        getTokenId: vi.fn(),
      },
      sellerAddress: "0xseller",
      diamondAddress: "0xdiamond",
      port: 8787,
      latestTimestamp: 100_000n,
      apiCallFn: apiCallFn as any,
    });

    expect(result).toEqual(createEmptyAgedListingFixture());
    expect(apiCallFn).not.toHaveBeenCalled();
  });

  it("builds the licensing status payload with actor guidance", () => {
    expect(createLicensingStatus({
      sellerAddress: "0xseller",
      licenseeAddress: "0xlicensee",
      transfereeAddress: null,
    })).toEqual({
      lifecycle: {
        activeLicenseLifecycle: "issueLicense/createLicense -> getLicenseTerms/transferLicense as licensee-scoped operations",
      },
      recommendedActors: {
        licensor: "0xseller",
        licensee: "0xlicensee",
        transferee: null,
      },
    });
  });
});
