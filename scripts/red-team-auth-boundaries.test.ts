import { afterEach, describe, expect, it } from "vitest";
import { Wallet } from "ethers";

import { authenticate, loadApiKeys } from "../packages/api/src/shared/auth.js";
import { __testOnly } from "../packages/api/src/shared/execution-context.js";

const originalSignerMap = process.env.API_LAYER_SIGNER_MAP_JSON;
const prototypePropertyNames = ["constructor", "toString", "valueOf", "hasOwnProperty", "__proto__"];

describe("red-team API key and signer-map boundaries", () => {
  afterEach(() => {
    if (originalSignerMap === undefined) {
      delete process.env.API_LAYER_SIGNER_MAP_JSON;
    } else {
      process.env.API_LAYER_SIGNER_MAP_JSON = originalSignerMap;
    }
  });

  it.each(prototypePropertyNames)("rejects inherited %s as an unconfigured API key", (apiKey) => {
    expect(() => authenticate({}, apiKey)).toThrow("invalid x-api-key");
  });

  it("accepts a prototype-named API key only when it is explicitly configured", () => {
    const keys = loadApiKeys({
      API_LAYER_KEYS_JSON: JSON.stringify({
        constructor: {
          label: "explicit constructor key",
          roles: ["read-only"],
        },
      }),
    });

    expect(authenticate(keys, "constructor")).toMatchObject({
      apiKey: "constructor",
      label: "explicit constructor key",
      roles: ["read-only"],
    });
  });

  it.each(prototypePropertyNames)("rejects inherited %s as an unconfigured signer mapping", async (signerId) => {
    process.env.API_LAYER_SIGNER_MAP_JSON = "{}";

    await expect(__testOnly.signerRunnerFor(
      { signerRunners: new Map() } as never,
      {
        apiKey: "adversarial-key",
        label: "adversarial",
        signerId,
        roles: ["service"],
        allowGasless: false,
      },
      null as never,
      "red-team",
    )).rejects.toThrow(`missing private key for signer ${signerId}`);
  });

  it("accepts a prototype-named signer only when the mapping owns that key", async () => {
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({
      constructor: `0x${"11".repeat(32)}`,
    });

    const signer = await __testOnly.signerRunnerFor(
      { signerRunners: new Map() } as never,
      {
        apiKey: "explicit-key",
        label: "explicit signer",
        signerId: "constructor",
        roles: ["service"],
        allowGasless: false,
      },
      null as never,
      "red-team",
    );

    await expect(signer?.getAddress()).resolves.toBe("0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A");
  });

  it("revalidates each API key wallet binding before reusing a cached signer", async () => {
    const privateKey = `0x${"11".repeat(32)}`;
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({ shared: privateKey });
    const context = { signerRunners: new Map() } as never;

    await __testOnly.signerRunnerFor(
      context,
      {
        apiKey: "cache-primer",
        label: "cache primer",
        signerId: "shared",
        roles: ["service"],
        allowGasless: false,
      },
      null as never,
      "red-team",
    );

    await expect(__testOnly.signerRunnerFor(
      context,
      {
        apiKey: "confused-deputy",
        label: "mismatched cached signer",
        signerId: "shared",
        walletAddress: new Wallet(`0x${"22".repeat(32)}`).address,
        roles: ["service"],
        allowGasless: false,
      },
      null as never,
      "red-team",
    )).rejects.toThrow("configured walletAddress does not match signerId");
  });

  it("does not reuse a cached wallet after the signer mapping rotates", async () => {
    const originalPrivateKey = `0x${"11".repeat(32)}`;
    const rotatedPrivateKey = `0x${"22".repeat(32)}`;
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({ rotating: originalPrivateKey });
    const context = { signerRunners: new Map() } as never;

    const original = await __testOnly.signerRunnerFor(
      context,
      {
        apiKey: "rotation-test",
        label: "rotation test",
        signerId: "rotating",
        roles: ["service"],
        allowGasless: false,
      },
      null as never,
      "red-team",
    );

    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({ rotating: rotatedPrivateKey });
    const rotated = await __testOnly.signerRunnerFor(
      context,
      {
        apiKey: "rotation-test",
        label: "rotation test",
        signerId: "rotating",
        roles: ["service"],
        allowGasless: false,
      },
      null as never,
      "red-team",
    );

    expect(original?.address).toBe(new Wallet(originalPrivateKey).address);
    expect(rotated?.address).toBe(new Wallet(rotatedPrivateKey).address);
    expect(rotated).not.toBe(original);
  });

  it("does not let a rotated signer inherit the prior wallet nonce domain", async () => {
    const originalPrivateKey = `0x${"33".repeat(32)}`;
    const rotatedPrivateKey = `0x${"44".repeat(32)}`;
    const auth = {
      apiKey: "rotation-nonce-test",
      label: "rotation nonce test",
      signerId: "rotating",
      roles: ["service"],
      allowGasless: false,
    };
    const context = {
      signerRunners: new Map(),
      signerQueues: new Map(),
      signerNonces: new Map<string, number>(),
    };

    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({
      rotating: originalPrivateKey,
      alias: originalPrivateKey,
    });
    const original = await __testOnly.signerRunnerFor(
      context as never,
      auth,
      null as never,
      "red-team",
    );
    const originalQueueKey = __testOnly.signerQueueKey("red-team", original?.address);
    context.signerNonces.set(originalQueueKey, 41);
    const alias = await __testOnly.signerRunnerFor(
      context as never,
      { ...auth, apiKey: "alias-key", signerId: "alias" },
      null as never,
      "red-team",
    );
    const aliasQueueKey = __testOnly.signerQueueKey("red-team", alias?.address);

    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({ rotating: rotatedPrivateKey });
    const rotated = await __testOnly.signerRunnerFor(
      context as never,
      auth,
      null as never,
      "red-team",
    );
    const rotatedQueueKey = __testOnly.signerQueueKey("red-team", rotated?.address);

    expect(aliasQueueKey).toBe(originalQueueKey);
    expect(rotatedQueueKey).not.toBe(originalQueueKey);
    expect(context.signerNonces.get(originalQueueKey)).toBe(41);
    expect(context.signerNonces.has(rotatedQueueKey)).toBe(false);
  });

  it("does not classify an already-known signed transaction as safe to resubmit", () => {
    expect(__testOnly.isNonceExpiredError(new Error("already known"))).toBe(false);
    expect(__testOnly.isNonceExpiredError({ message: "ALREADY KNOWN" })).toBe(false);
    expect(__testOnly.isNonceExpiredError(new Error("nonce too low"))).toBe(true);
  });
});
