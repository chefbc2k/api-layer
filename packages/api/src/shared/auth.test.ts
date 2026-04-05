import { describe, expect, it } from "vitest";

import { authenticate, loadApiKeys } from "./auth.js";

describe("auth", () => {
  it("returns an empty api key map when the environment is unset", () => {
    expect(loadApiKeys({})).toEqual({});
  });

  it("parses api keys and applies schema defaults", () => {
    const keys = loadApiKeys({
      API_LAYER_KEYS_JSON: JSON.stringify({
        "founder-key": {
          label: "founder",
          signerId: "founder",
        },
        "reader-key": {
          label: "reader",
          allowGasless: true,
          roles: ["reader"],
        },
      }),
    });

    expect(keys).toEqual({
      "founder-key": {
        apiKey: "founder-key",
        label: "founder",
        signerId: "founder",
        allowGasless: false,
        roles: ["service"],
      },
      "reader-key": {
        apiKey: "reader-key",
        label: "reader",
        allowGasless: true,
        roles: ["reader"],
      },
    });
  });

  it("throws when the request does not include an api key", () => {
    expect(() => authenticate({}, undefined)).toThrow("missing x-api-key");
  });

  it("throws when the request references an unknown api key", () => {
    expect(() =>
      authenticate(
        {
          "founder-key": {
            apiKey: "founder-key",
            label: "founder",
            allowGasless: false,
            roles: ["service"],
          },
        },
        "reader-key",
      ),
    ).toThrow("invalid x-api-key");
  });

  it("returns the authenticated context for a known api key", () => {
    const context = {
      apiKey: "founder-key",
      label: "founder",
      signerId: "founder",
      allowGasless: false,
      roles: ["service"],
    };

    expect(authenticate({ "founder-key": context }, "founder-key")).toBe(context);
  });
});
