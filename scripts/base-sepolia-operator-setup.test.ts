import { afterEach, describe, expect, it, vi } from "vitest";

import {
  apiCall,
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
});
