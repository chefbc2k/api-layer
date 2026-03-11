import { describe, expect, it } from "vitest";

import { decodeParamsFromWire, decodeResultFromWire, serializeParamsToWire, serializeResultToWire } from "./abi-codec.js";
import { getAbiMethodDefinition } from "./abi-registry.js";

describe("abi-codec", () => {
  it("serializes bigint params as decimal strings", () => {
    const definition = getAbiMethodDefinition("DelegationFacet.delegateBySig");
    expect(definition).not.toBeNull();

    const wire = serializeParamsToWire(definition!, [
      "0x0000000000000000000000000000000000000001",
      3n,
      123456789n,
      27,
      "0x" + "11".repeat(32),
      "0x" + "22".repeat(32),
    ]);

    expect(wire).toEqual([
      "0x0000000000000000000000000000000000000001",
      "3",
      "123456789",
      "27",
      "0x" + "11".repeat(32),
      "0x" + "22".repeat(32),
    ]);

    expect(decodeParamsFromWire(definition!, wire)).toEqual([
      "0x0000000000000000000000000000000000000001",
      3n,
      123456789n,
      27n,
      "0x" + "11".repeat(32),
      "0x" + "22".repeat(32),
    ]);
  });

  it("serializes tuple payloads and decodes integer results", () => {
    const writeDefinition = getAbiMethodDefinition("PaymentFacet.setBuybackConfigStruct");
    const readDefinition = getAbiMethodDefinition("PaymentFacet.getTreasuryWithdrawalLimit");

    expect(writeDefinition).not.toBeNull();
    expect(readDefinition).not.toBeNull();

    const wire = serializeParamsToWire(writeDefinition!, [
      [
        1n,
        2n,
        3n,
        4n,
        "0x0000000000000000000000000000000000000002",
        "0x0000000000000000000000000000000000000003",
        "0x0000000000000000000000000000000000000004",
      ],
    ]);

    expect(wire).toEqual([
      ["1", "2", "3", "4", "0x0000000000000000000000000000000000000002", "0x0000000000000000000000000000000000000003", "0x0000000000000000000000000000000000000004"],
    ]);

    const resultWire = serializeResultToWire(readDefinition!, [25n, 30n, 60n, 10n, 100n]);
    expect(resultWire).toEqual(["25", "30", "60", "10", "100"]);
    expect(decodeResultFromWire(readDefinition!, resultWire)).toEqual([25n, 30n, 60n, 10n, 100n]);
  });
});
