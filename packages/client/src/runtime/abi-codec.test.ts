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

  it("serializes tuple object outputs into named wire objects", () => {
    const definition = {
      signature: "tupleResult()",
      outputs: [{
        type: "tuple",
        components: [
          { name: "count", type: "uint256" },
          { name: "owner", type: "address" },
          {
            name: "nested",
            type: "tuple",
            components: [{ name: "flag", type: "bool" }],
          },
        ],
      }],
      outputShape: { kind: "object" },
    };

    const wire = serializeResultToWire(definition as never, [9n, "0x0000000000000000000000000000000000000009", [true]]);

    expect(wire).toEqual({
      count: "9",
      owner: "0x0000000000000000000000000000000000000009",
      nested: {
        flag: true,
      },
    });
    expect(decodeResultFromWire(definition as never, wire)).toEqual({
      count: 9n,
      owner: "0x0000000000000000000000000000000000000009",
      nested: {
        flag: true,
      },
    });
  });

  it("rejects invalid param and response shapes", () => {
    const paramsDefinition = {
      signature: "setTuple((uint256,address)[2])",
      inputs: [{
        type: "tuple[2]",
        components: [
          { name: "amount", type: "uint256" },
          { name: "owner", type: "address" },
        ],
      }],
    };
    const resultDefinition = {
      signature: "result(uint256,address)",
      outputs: [
        { type: "uint256" },
        { type: "address" },
      ],
    };

    expect(() => serializeParamsToWire(paramsDefinition as never, [[{ amount: "1", owner: "0x0000000000000000000000000000000000000001" }]])).toThrow(
      "expected array length 2 for tuple[2]",
    );
    expect(() => serializeParamsToWire({
      signature: "unsafe(uint256)",
      inputs: [{ type: "uint256" }],
    } as never, [Number.MAX_SAFE_INTEGER + 1])).toThrow("unsafe integer for uint256");
    expect(() => decodeResultFromWire(resultDefinition as never, ["1"])).toThrow(
      "invalid response for result(uint256,address): expected 2 outputs",
    );
    expect(() => decodeResultFromWire(resultDefinition as never, ["abc", "0x0000000000000000000000000000000000000001"])).toThrow(
      "invalid response item 0 for result(uint256,address): invalid uint256 decimal string",
    );
  });
});
