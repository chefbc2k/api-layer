import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  asRecord,
  extractCampaignIdFromLogs,
  extractClaimedAmountFromLogs,
  extractScalarResult,
  hasTransactionHash,
  normalizeAddress,
  readBigInt,
  readWorkflowReceipt,
  resolveWorkflowAccountAddress,
  waitForWorkflowEventQuery,
  waitForWorkflowReadback,
} from "./reward-campaign-helpers.js";

describe("reward campaign helpers", () => {
  beforeEach(() => {
    delete process.env.API_LAYER_SIGNER_MAP_JSON;
  });

  it("normalizes scalar, bigint, address, and log extraction helpers", () => {
    expect(asRecord(null)).toBeNull();
    expect(asRecord({ ok: true })).toEqual({ ok: true });
    expect(extractScalarResult({ result: "7" })).toBe("7");
    expect(extractScalarResult({ result: 8 })).toBe("8");
    expect(extractScalarResult({ result: 9n })).toBe("9");
    expect(extractScalarResult({ result: false })).toBeNull();
    expect(readBigInt("11")).toBe(11n);
    expect(readBigInt(12)).toBe(12n);
    expect(readBigInt(13n)).toBe(13n);
    expect(readBigInt("bad")).toBe(0n);
    expect(normalizeAddress("0x00000000000000000000000000000000000000AA")).toBe("0x00000000000000000000000000000000000000aa");
    expect(normalizeAddress("bad")).toBeNull();
    expect(hasTransactionHash([{ transactionHash: "0xabc" }], "0xabc")).toBe(true);
    expect(hasTransactionHash([{ transactionHash: "0xabc" }], null)).toBe(false);
    expect(extractCampaignIdFromLogs([{ transactionHash: "0xabc", campaignId: 5 }], "0xabc")).toBe("5");
    expect(extractCampaignIdFromLogs([{ transactionHash: "0xabc" }], "0xabc")).toBeNull();
    expect(extractClaimedAmountFromLogs([{ transactionHash: "0xabc", amount: 15n }], "0xabc")).toBe("15");
    expect(extractClaimedAmountFromLogs([{ transactionHash: "0xabc" }], "0xabc")).toBeNull();
  });

  it("resolves wallet and signer-backed workflow accounts", async () => {
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({
      "signer-1": "0x59c6995e998f97a5a0044976f7d0b6d62f4ea6b2dff7e94ece66d3bb5dc4080a",
    });
    const context = {
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: Record<string, never>) => Promise<unknown>) => work({})),
      },
    } as never;

    await expect(resolveWorkflowAccountAddress(context, { signerId: "signer-1" } as never, undefined, "rewardTest")).resolves.toMatch(/^0x[a-fA-F0-9]{40}$/u);
    await expect(resolveWorkflowAccountAddress(context, { signerId: "missing" } as never, undefined, "rewardTest")).rejects.toThrow("rewardTest requires signer-backed auth");
    await expect(resolveWorkflowAccountAddress(context, { signerId: "signer-1" } as never, "0x00000000000000000000000000000000000000bb", "rewardTest")).resolves.toBe("0x00000000000000000000000000000000000000bb");
  });

  it("reads receipts and retries readback and event queries until they stabilize", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: TimerHandler) => {
      if (typeof callback === "function") {
        callback();
      }
      return 0 as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);
    const context = {
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: {
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
        }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async (txHash: string) => txHash === "0xok" ? { blockNumber: 1 } : null),
        })),
      },
    } as never;

    await expect(readWorkflowReceipt(context, "0xok", "rewardTest.receipt")).resolves.toEqual({ blockNumber: 1 });
    await expect(readWorkflowReceipt(context, "0xmissing", "rewardTest.receipt")).rejects.toThrow("rewardTest.receipt receipt missing after confirmation");

    let readAttempts = 0;
    await expect(waitForWorkflowReadback(async () => {
      readAttempts += 1;
      if (readAttempts === 1) {
        throw new Error("temporary");
      }
      return { statusCode: 200, body: "ready" };
    }, (result) => result.body === "ready", "rewardTest.readback")).resolves.toEqual({ statusCode: 200, body: "ready" });

    let eventAttempts = 0;
    await expect(waitForWorkflowEventQuery(async () => {
      eventAttempts += 1;
      return eventAttempts < 2 ? [] : [{ transactionHash: "0xok" }];
    }, (logs) => hasTransactionHash(logs, "0xok"), "rewardTest.event")).resolves.toEqual([{ transactionHash: "0xok" }]);

    await expect(waitForWorkflowReadback(async () => ({ statusCode: 200, body: "stuck" }), () => false, "rewardTest.readbackFail")).rejects.toThrow("rewardTest.readbackFail readback timeout");
    await expect(waitForWorkflowEventQuery(async () => [], () => false, "rewardTest.eventFail")).rejects.toThrow("rewardTest.eventFail event query timeout");

    expect(setTimeoutSpy).toHaveBeenCalled();
    setTimeoutSpy.mockRestore();
  });
});
