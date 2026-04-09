import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ZERO_BYTES32,
  asRecord,
  collaboratorReadMatches,
  decimalTemplateIdToHash,
  extractScalarResult,
  hasTransactionHash,
  normalizeEventLogs,
  readTemplateHashFromPayload,
  readWorkflowReceipt,
  templateHashToDecimal,
  waitForWorkflowEventQuery,
  waitForWorkflowReadback,
} from "./rights-licensing-helpers.js";

describe("rights licensing helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("coerces records and scalar workflow results", () => {
    expect(ZERO_BYTES32).toBe(`0x${"0".repeat(64)}`);
    expect(asRecord({ ok: true })).toEqual({ ok: true });
    expect(asRecord("nope")).toBeNull();

    expect(extractScalarResult({ result: "7" })).toBe("7");
    expect(extractScalarResult({ result: 7 })).toBe("7");
    expect(extractScalarResult({ result: 7n })).toBe("7");
    expect(extractScalarResult({ result: { nested: true } })).toBeNull();
    expect(extractScalarResult(null)).toBeNull();
  });

  it("round-trips template ids and validates template hashes", () => {
    const hash = decimalTemplateIdToHash("15");
    expect(hash).toMatch(/^0x[a-f0-9]{64}$/u);
    expect(templateHashToDecimal(hash)).toBe("15");

    expect(readTemplateHashFromPayload({ result: hash })).toBe(hash);
    expect(readTemplateHashFromPayload({ result: "15" })).toBeNull();
    expect(readTemplateHashFromPayload({ result: `0x${"g".repeat(64)}` })).toBeNull();
  });

  it("reads confirmed workflow receipts and throws when the receipt is missing", async () => {
    const withProvider = vi.fn()
      .mockImplementationOnce(async (_mode, _label, work) => work({
        getTransactionReceipt: vi.fn().mockResolvedValue({ hash: "0xabc", status: 1n }),
      }))
      .mockImplementationOnce(async (_mode, _label, work) => work({
        getTransactionReceipt: vi.fn().mockResolvedValue(null),
      }));
    const context = {
      providerRouter: { withProvider },
    } as never;

    await expect(readWorkflowReceipt(context, "0xabc", "license.issue"))
      .resolves.toEqual({ hash: "0xabc", status: 1n });
    await expect(readWorkflowReceipt(context, "0xdef", "license.issue"))
      .rejects.toThrow("license.issue receipt missing after confirmation: 0xdef");
    expect(withProvider).toHaveBeenNthCalledWith(
      1,
      "read",
      "workflow.license.issue.receipt",
      expect.any(Function),
    );
  });

  it("retries readbacks until ready and surfaces the last failure on timeout", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: TimerHandler) => {
      if (typeof callback === "function") {
        callback();
      }
      return 0 as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);
    const read = vi.fn()
      .mockRejectedValueOnce(new Error("temporary unavailable"))
      .mockResolvedValueOnce({ statusCode: 202, body: { ok: false } })
      .mockResolvedValueOnce({ statusCode: 200, body: { ok: true } });

    await expect(waitForWorkflowReadback(
      read,
      (result) => result.statusCode === 200 && (result.body as { ok?: boolean }).ok === true,
      "license.readback",
    )).resolves.toEqual({ statusCode: 200, body: { ok: true } });

    const timeoutRead = vi.fn().mockResolvedValue({ statusCode: 202, body: { ok: false } });
    await expect(waitForWorkflowReadback(timeoutRead, () => false, "license.readback"))
      .rejects.toThrow('license.readback readback timeout: {"ok":false}');

    const errorRead = vi.fn().mockRejectedValue(new Error("still broken"));
    await expect(waitForWorkflowReadback(errorRead, () => false, "license.readback"))
      .rejects.toThrow("license.readback readback timeout: still broken");

    expect(setTimeoutSpy).toHaveBeenCalled();
  });

  it("retries event queries, normalizes route results, and reports the last logs on timeout", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: TimerHandler) => {
      if (typeof callback === "function") {
        callback();
      }
      return 0 as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);

    const eventRead = vi.fn()
      .mockRejectedValueOnce(new Error("event index lagging"))
      .mockResolvedValueOnce({ statusCode: 200, body: [{ transactionHash: "0x1" }] })
      .mockResolvedValueOnce([{ transactionHash: "0x2" }]);

    await expect(waitForWorkflowEventQuery(
      eventRead,
      (logs) => hasTransactionHash(logs, "0x2"),
      "license.events",
    )).resolves.toEqual([{ transactionHash: "0x2" }]);

    const timeoutRead = vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0x3" }] });
    await expect(waitForWorkflowEventQuery(timeoutRead, () => false, "license.events"))
      .rejects.toThrow('license.events event query timeout: [{"transactionHash":"0x3"}]');

    const errorRead = vi.fn().mockRejectedValue(new Error("query failed"));
    await expect(waitForWorkflowEventQuery(errorRead, () => false, "license.events"))
      .rejects.toThrow("license.events event query timeout: query failed");

    expect(normalizeEventLogs([{ transactionHash: "0x4" }])).toEqual([{ transactionHash: "0x4" }]);
    expect(normalizeEventLogs({ statusCode: 200, body: [{ transactionHash: "0x5" }] })).toEqual([{ transactionHash: "0x5" }]);
    expect(normalizeEventLogs({ statusCode: 200, body: "not-an-array" })).toEqual([]);
    expect(setTimeoutSpy).toHaveBeenCalled();
  });

  it("matches collaborator reads and transaction hashes across tuple and object payloads", () => {
    expect(hasTransactionHash([{ transactionHash: "0xabc" }], "0xabc")).toBe(true);
    expect(hasTransactionHash([{ transactionHash: "0xabc" }], null)).toBe(false);
    expect(hasTransactionHash([{ transactionHash: "0xabc" }], "0xdef")).toBe(false);

    expect(collaboratorReadMatches([true, 15n], true, "15")).toBe(true);
    expect(collaboratorReadMatches({ isActive: false, share: "9" }, false, "9")).toBe(true);
    expect(collaboratorReadMatches({ isActive: false, share: "9" }, true, "9")).toBe(false);
    expect(collaboratorReadMatches("invalid", true, "1")).toBe(false);
  });
});
