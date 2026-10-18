import { afterEach, describe, expect, it } from "vitest";

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
});
