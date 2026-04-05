import { afterEach, describe, expect, it, vi } from "vitest";

import {
  extractTxHash,
  nativeTransferSpendable,
  retryApiRead,
  roleId,
  toJsonValue,
} from "./base-sepolia-operator-setup.js";

describe("base sepolia operator setup helpers", () => {
  afterEach(() => {
    vi.useRealTimers();
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
});
