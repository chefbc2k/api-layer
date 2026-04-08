import { ethers } from "ethers";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  apiCall,
  applyNativeSetupTopUps,
  buildUsdcFundingStatus,
  createEmptyAgedListingFixture,
  createFallbackMarketplaceFixture,
  createGovernanceStatus,
  createInactivePreferredMarketplaceFixture,
  createPreferredMarketplaceFixture,
  ensureNativeBalance,
  ensureRole,
  extractTxHash,
  nativeTransferSpendable,
  retryApiRead,
  roleId,
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
  });

  it("records fallback and inactive preferred listing outcomes", () => {
    expect(createFallbackMarketplaceFixture(
      { voiceHash: "0xvoice", tokenId: "99" },
      { status: 202, payload: { txHash: "0xlist" } },
      { status: 200, payload: { isActive: true } },
      { status: 202, payload: { txHash: "0xapproval" } },
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
    });
  });

  it("marks fallback listings blocked when activation never succeeds", () => {
    expect(createFallbackMarketplaceFixture(
      { voiceHash: "0xvoice", tokenId: "101" },
      { status: 500, payload: { error: "listing failed" } },
      { status: 404, payload: null },
      null,
    )).toMatchObject({
      voiceHash: "0xvoice",
      tokenId: "101",
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

  it("applies native setup top-ups across founder and optional actors", async () => {
    const founder = { address: "0xfounder" } as any;
    const buyer = { address: "0xbuyer" } as any;
    const licensee = { address: "0xlicensee" } as any;
    const status = {
      actors: {
        founder: { address: founder.address },
        buyer: { address: buyer.address },
        licensee: { address: licensee.address },
      },
      setup: { status: "ready", blockers: [] as string[] },
      marketplace: {},
    };
    const ensureNativeBalanceFn = vi.fn()
      .mockResolvedValueOnce({ funded: true, balance: "500", attemptedFunders: [], fundingStrategy: "transfer" })
      .mockResolvedValueOnce({ funded: false, balance: "25", attemptedFunders: [], blockedReason: "buyer still short" })
      .mockResolvedValueOnce({ funded: false, balance: "40", attemptedFunders: [] });

    await applyNativeSetupTopUps({
      status,
      fundingWallets: [founder, buyer, licensee],
      availableSpecsForFunding: new Map(),
      founder,
      buyer,
      licensee,
      transferee: null,
      rpcUrl: "https://base-sepolia.example",
      ensureNativeBalanceFn,
    });

    expect(ensureNativeBalanceFn).toHaveBeenCalledTimes(3);
    expect(status.actors).toMatchObject({
      founder: {
        nativeTopUp: { balance: "500", fundingStrategy: "transfer" },
        nativeBalanceAfterSetup: "500",
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
});
