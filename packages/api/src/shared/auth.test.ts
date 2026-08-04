import { describe, expect, it } from "vitest";

import { assertWriteAuthorized, authenticate, loadApiKeys } from "./auth.js";

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
          walletAddress: "0x00000000000000000000000000000000000000aa",
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
        walletAddress: "0x00000000000000000000000000000000000000aa",
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

  it.each([
    "service",
    "founder",
    "admin",
    "operator",
    "buyer",
    "seller",
    "licensee",
    "collaborator",
  ])("allows the %s API role to reach contract write preflight", (role) => {
    expect(() => assertWriteAuthorized({
      apiKey: `${role}-key`,
      label: role,
      allowGasless: false,
      roles: [role.toUpperCase()],
    })).not.toThrow();
  });

  it.each(["read-only", "reader", "auditor"])("rejects the non-writing %s API role", (role) => {
    expect(() => assertWriteAuthorized({
      apiKey: `${role}-key`,
      label: role,
      allowGasless: false,
      roles: [role],
    })).toThrow("API key not permitted for write execution");
  });

  it("rejects keys with no write-capable role even when role values are blank", () => {
    expect(() => assertWriteAuthorized({
      apiKey: "empty-key",
      label: "empty",
      allowGasless: false,
      roles: ["  "],
    })).toThrow("API key not permitted for write execution");
  });
});
