import { describe, expect, it } from "vitest";

import {
  abiCodecInternals,
  decodeFromWire,
  decodeParamsFromWire,
  decodeResultFromWire,
  serializeParamsToWire,
  serializeResultToWire,
  serializeToWire,
  validateWireParams,
} from "./abi-codec.js";
import { getAbiMethodDefinition } from "./abi-registry.js";

describe("abi-codec", () => {
  it("validates integer bounds, fixed bytes, function pointers, empty tuples, and malformed array types", () => {
    const definition = {
      signature: "redTeamProbe(uint8,int8,bytes32,bytes,function,tuple)",
      inputs: [
        { type: "uint8" },
        { type: "int8" },
        { type: "bytes32" },
        { type: "bytes" },
        { type: "function" },
        { type: "tuple" },
      ],
    };
    const valid = [
      "255",
      "-128",
      `0x${"11".repeat(32)}`,
      "0xdeadbeef",
      `0x${"22".repeat(24)}`,
      {},
    ];

    expect(() => validateWireParams(definition as never, valid)).not.toThrow();
    expect(() => validateWireParams({
      signature: "unsuffixed(uint,int)",
      inputs: [{ type: "uint" }, { type: "int" }],
    } as never, ["1", "-1"])).not.toThrow();
    expect(() => validateWireParams(definition as never, ["256", ...valid.slice(1)])).toThrow("uint8 value out of range");
    expect(() => validateWireParams(definition as never, [valid[0], "128", ...valid.slice(2)])).toThrow("int8 value out of range");
  });

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

  it("serializes and decodes object-backed tuple payloads with named and numeric fallback keys", () => {
    const definition = {
      signature: "objectTupleResult()",
      outputs: [{
        type: "tuple",
        components: [
          { name: "count", type: "uint256" },
          { type: "bool" },
          {
            name: "nested",
            type: "tuple",
            components: [
              { name: "owner", type: "address" },
            ],
          },
        ],
      }],
      outputShape: { kind: "object" },
    };

    const wire = serializeResultToWire(definition as never, {
      count: 12n,
      1: false,
      nested: { owner: "0x0000000000000000000000000000000000000012" },
    });

    expect(wire).toEqual({
      count: "12",
      1: false,
      nested: {
        owner: "0x0000000000000000000000000000000000000012",
      },
    });
    expect(decodeResultFromWire(definition as never, wire)).toEqual({
      count: 12n,
      1: false,
      nested: {
        owner: "0x0000000000000000000000000000000000000012",
      },
    });
    expect(decodeFromWire(definition.outputs[0] as never, wire)).toEqual({
      count: 12n,
      1: false,
      nested: {
        owner: "0x0000000000000000000000000000000000000012",
      },
    });
  });

  it("normalizes object-backed tuple outputs when only explicit named keys are present", () => {
    const tupleParam = {
      type: "tuple",
      components: [
        { name: "owner", type: "address" },
        { name: "count", type: "uint256" },
      ],
    };

    expect(abiCodecInternals.tupleToNamedObject(tupleParam as never, {
      owner: "0x0000000000000000000000000000000000000007",
      count: "9",
    })).toEqual({
      owner: "0x0000000000000000000000000000000000000007",
      count: "9",
    });
  });

  it("normalizes nested fixed-length tuple arrays through the tuple output helper", () => {
    expect(abiCodecInternals.normalizeTupleOutputs({
      type: "tuple[2][1]",
      components: [{ name: "owner", type: "address" }],
    } as never, [[
      ["0x0000000000000000000000000000000000000001"],
      ["0x0000000000000000000000000000000000000002"],
    ]])).toEqual([[
      { owner: "0x0000000000000000000000000000000000000001" },
      { owner: "0x0000000000000000000000000000000000000002" },
    ]]);
  });

  it("normalizes unnamed tuple components from both positional and object-backed outputs", () => {
    const definition = {
      signature: "mixedTupleResult()",
      outputs: [{
        type: "tuple",
        components: [
          { name: "count", type: "uint256" },
          { type: "bool" },
        ],
      }],
      outputShape: { kind: "object" },
    };

    expect(serializeResultToWire(definition as never, [3n, true])).toEqual({
      count: "3",
      1: true,
    });

    expect(decodeResultFromWire(definition as never, {
      count: "4",
      1: false,
    })).toEqual({
      count: 4n,
      1: false,
    });
  });

  it("normalizes nested tuple arrays from positional and object-backed outputs with unnamed components", () => {
    const definition = {
      signature: "nestedTupleArrayResult()",
      outputs: [{
        type: "tuple",
        components: [
          {
            name: "items",
            type: "tuple[]",
            components: [
              { type: "bool" },
              {
                name: "meta",
                type: "tuple",
                components: [{ name: "count", type: "uint256" }],
              },
            ],
          },
        ],
      }],
      outputShape: { kind: "object" },
    };

    expect(serializeResultToWire(definition as never, [
      [
        [true, [9n]],
      ],
    ])).toEqual({
      items: [
        {
          0: true,
          meta: {
            count: "9",
          },
        },
      ],
    });

    expect(decodeResultFromWire(definition as never, {
      items: [
        {
          0: false,
          meta: {
            count: "12",
          },
        },
      ],
    })).toEqual({
      items: [
        {
          0: false,
          meta: {
            count: 12n,
          },
        },
      ],
    });
  });

  it("supports tuple normalization when component metadata is omitted entirely", () => {
    expect(abiCodecInternals.tupleToNamedObject({ type: "tuple" } as never, ["ignored"])).toEqual({});
    expect(abiCodecInternals.tupleToNamedObject({ type: "tuple" } as never, { arbitrary: true })).toEqual({});
  });

  it("falls back to numeric tuple keys during object normalization and decode", () => {
    const tupleParam = {
      type: "tuple",
      components: [
        { name: "owner", type: "address" },
        { type: "uint256" },
      ],
    };

    expect(abiCodecInternals.tupleToNamedObject(tupleParam as never, {
      owner: "0x0000000000000000000000000000000000000007",
      1: "9",
    })).toEqual({
      owner: "0x0000000000000000000000000000000000000007",
      1: "9",
    });

    expect(decodeFromWire(tupleParam as never, {
      owner: "0x0000000000000000000000000000000000000008",
      1: "10",
    })).toEqual({
      owner: "0x0000000000000000000000000000000000000008",
      1: 10n,
    });
  });

  it("uses numeric fallback keys for named tuple components when object payloads omit the component name", () => {
    const tupleParam = {
      type: "tuple",
      components: [
        { name: "owner", type: "address" },
        { name: "count", type: "uint256" },
      ],
    };

    expect(abiCodecInternals.tupleToNamedObject(tupleParam as never, {
      owner: "0x0000000000000000000000000000000000000007",
      1: "9",
    })).toEqual({
      owner: "0x0000000000000000000000000000000000000007",
      count: "9",
    });
  });

  it("prefers numeric tuple fallback keys when named tuple fields are explicitly undefined", () => {
    const tupleParam = {
      type: "tuple",
      components: [
        { name: "owner", type: "address" },
        { name: "count", type: "uint256" },
      ],
    };

    expect(abiCodecInternals.tupleToNamedObject(tupleParam as never, {
      owner: undefined,
      0: "0x000000000000000000000000000000000000000a",
      count: undefined,
      1: "12",
    })).toEqual({
      owner: "0x000000000000000000000000000000000000000a",
      count: "12",
    });
  });

  it("prefers explicit named tuple fields over numeric fallback slots", () => {
    const tupleParam = {
      type: "tuple",
      components: [
        { name: "owner", type: "address" },
        { name: "count", type: "uint256" },
      ],
    };

    expect(abiCodecInternals.tupleToNamedObject(tupleParam as never, {
      owner: "0x0000000000000000000000000000000000000007",
      count: "5",
      1: "9",
    })).toEqual({
      owner: "0x0000000000000000000000000000000000000007",
      count: "5",
    });
  });

  it("uses numeric fallback keys for nested named tuple components during object normalization", () => {
    const tupleParam = {
      type: "tuple",
      components: [
        {
          name: "meta",
          type: "tuple",
          components: [
            { name: "count", type: "uint256" },
          ],
        },
      ],
    };

    expect(abiCodecInternals.tupleToNamedObject(tupleParam as never, {
      0: {
        count: "11",
      },
    })).toEqual({
      meta: {
        count: "11",
      },
    });
  });

  it("serializes and decodes fixed-length nested arrays inside tuples", () => {
    const param = {
      type: "tuple[1]",
      components: [
        { name: "owners", type: "address[2]" },
      ],
    };

    const wire = serializeToWire(param as never, [{
      owners: [
        "0x0000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000002",
      ],
    }]);

    expect(wire).toEqual([{
      owners: [
        "0x0000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000002",
      ],
    }]);

    expect(decodeFromWire(param as never, wire)).toEqual([{
      owners: [
        "0x0000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000002",
      ],
    }]);
  });

  it("normalizes object-shaped tuple results that rely on numeric fallback keys", () => {
    const definition = {
      signature: "tupleObjectFallback()",
      outputs: [{
        type: "tuple",
        components: [
          { name: "count", type: "uint256" },
          { type: "bool" },
        ],
      }],
      outputShape: { kind: "object" },
    };

    expect(serializeResultToWire(definition as never, {
      count: 6n,
      1: true,
    })).toEqual({
      count: "6",
      1: true,
    });
  });

  it("supports empty outputs and array-like multi-output result payloads", () => {
    const emptyDefinition = {
      signature: "noResult()",
      outputs: [],
    };
    const multiDefinition = {
      signature: "arrayLikeResult(uint256,address)",
      outputs: [
        { type: "uint256" },
        { type: "address" },
      ],
    };

    expect(serializeResultToWire(emptyDefinition as never, undefined)).toBeNull();
    expect(decodeResultFromWire(emptyDefinition as never, undefined)).toBeNull();
    expect(serializeResultToWire(multiDefinition as never, {
      0: 9n,
      1: "0x0000000000000000000000000000000000000009",
      length: 2,
    })).toEqual([
      "9",
      "0x0000000000000000000000000000000000000009",
    ]);
  });

  it("rejects named tuple outputs when nested tuple values are missing or malformed", () => {
    const definition = {
      signature: "tupleResult()",
      outputs: [{
        type: "tuple",
        components: [
          {
            name: "items",
            type: "tuple[]",
            components: [{ name: "amount", type: "uint256" }],
          },
          {
            name: "meta",
            type: "tuple",
            components: [{ name: "flag", type: "bool" }],
          },
        ],
      }],
      outputShape: { kind: "object" },
    };

    expect(() => serializeResultToWire(definition as never, {
      items: undefined,
      meta: undefined,
    })).toThrow("invalid result for tupleResult(): expected array value for tuple[]");
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

  it("validates tuple objects, bytes, addresses, and signed integer strings", () => {
    const definition = {
      signature: "complex((address,bytes32,int256)[2],bytes,address)",
      inputs: [
        {
          type: "tuple[2]",
          components: [
            { name: "owner", type: "address" },
            { name: "salt", type: "bytes32" },
            { name: "delta", type: "int256" },
          ],
        },
        { type: "bytes" },
        { type: "address" },
      ],
    };

    expect(() => validateWireParams(definition as never, [[
      { owner: "0x0000000000000000000000000000000000000001", salt: "0x" + "11".repeat(32), delta: "-5" },
      { owner: "0x0000000000000000000000000000000000000002", salt: "0x" + "22".repeat(32), delta: "7" },
    ], "0x1234", "0x0000000000000000000000000000000000000003"])).not.toThrow();

    expect(() => validateWireParams(definition as never, [[
      { owner: "0x0000000000000000000000000000000000000001", salt: "0x" + "11".repeat(32), delta: "-5" },
    ], "0x1234", "0x0000000000000000000000000000000000000003"])).toThrow(
      "invalid param 0 for complex((address,bytes32,int256)[2],bytes,address): expected array length 2",
    );
    expect(() => validateWireParams(definition as never, [[
      { owner: "not-an-address", salt: "0x" + "11".repeat(32), delta: "-5" },
      { owner: "0x0000000000000000000000000000000000000002", salt: "0x" + "22".repeat(32), delta: "7" },
    ], "0x1234", "0x0000000000000000000000000000000000000003"])).toThrow("invalid address");
    expect(() => validateWireParams(definition as never, [[
      { owner: "0x0000000000000000000000000000000000000001", salt: "xyz", delta: "-5" },
      { owner: "0x0000000000000000000000000000000000000002", salt: "0x" + "22".repeat(32), delta: "7" },
    ], "0x1234", "0x0000000000000000000000000000000000000003"])).toThrow("invalid hex string");
  });

  it("surfaces tuple-array length validation for positional tuple payloads", () => {
    const definition = {
      signature: "tupleArray((uint256,address))",
      inputs: [{
        type: "tuple",
        components: [
          { type: "uint256" },
          { type: "address" },
        ],
      }],
    };

    expect(() => validateWireParams(definition as never, [["1"]])).toThrow(
      "invalid param 0 for tupleArray((uint256,address)): expected tuple length 2",
    );
  });

  it("serializes and decodes tuple objects with positional fallback and nested arrays", () => {
    const param = {
      type: "tuple[][2]",
      components: [
        { name: "amount", type: "uint256" },
        {
          name: "meta",
          type: "tuple",
          components: [
            { name: "flag", type: "bool" },
            { name: "label", type: "string" },
          ],
        },
      ],
    };

    const value = [
      [
        { amount: 1n, meta: { flag: true, label: "alpha" } },
        { amount: 3n, meta: { flag: false, label: "gamma" } },
      ],
      [
        { 0: 2n, 1: { flag: false, label: "beta" } },
        { amount: 4n, meta: { flag: true, label: "delta" } },
      ],
    ];

    const wire = serializeToWire(param as never, value);
    expect(wire).toEqual([
      [
        { amount: "1", meta: { flag: true, label: "alpha" } },
        { amount: "3", meta: { flag: false, label: "gamma" } },
      ],
      [
        { amount: "2", meta: { flag: false, label: "beta" } },
        { amount: "4", meta: { flag: true, label: "delta" } },
      ],
    ]);
    expect(decodeFromWire(param as never, wire)).toEqual([
      [
        { amount: 1n, meta: { flag: true, label: "alpha" } },
        { amount: 3n, meta: { flag: false, label: "gamma" } },
      ],
      [
        { amount: 2n, meta: { flag: false, label: "beta" } },
        { amount: 4n, meta: { flag: true, label: "delta" } },
      ],
    ]);
  });

  it("rejects incompatible scalar, tuple, and array inputs during direct serialization", () => {
    expect(() => serializeToWire({ type: "uint256" } as never, { bad: true })).toThrow(
      "expected integer-compatible value for uint256",
    );
    expect(() => serializeToWire({ type: "tuple", components: [{ type: "uint256" }] } as never, null)).toThrow(
      "expected tuple-compatible value",
    );
    expect(() => serializeToWire({ type: "uint256[2]" } as never, "not-an-array")).toThrow(
      "expected array value for uint256[2]",
    );
    expect(() => decodeFromWire({ type: "uint256[2]" } as never, ["1"])).toThrow(
      "expected array length 2 for uint256[2]",
    );
  });

  it("supports empty outputs, array-like multi-results, and object-shaped tuple payload normalization", () => {
    expect(serializeResultToWire({ signature: "noop()", outputs: [] } as never, "ignored")).toBeNull();
    expect(decodeResultFromWire({ signature: "noop()", outputs: [] } as never, "ignored")).toBeNull();

    const tupleObjectDefinition = {
      signature: "tupleObject()",
      outputs: [{
        type: "tuple",
        components: [
          { name: "count", type: "uint256" },
          {
            name: "nested",
            type: "tuple[]",
            components: [{ name: "owner", type: "address" }],
          },
        ],
      }],
      outputShape: { kind: "object" },
    };

    expect(serializeResultToWire(tupleObjectDefinition as never, {
      count: 4n,
      nested: [{ owner: "0x0000000000000000000000000000000000000004" }],
    })).toEqual({
      count: "4",
      nested: [{ owner: "0x0000000000000000000000000000000000000004" }],
    });

    const multipleOutputs = {
      signature: "multi()",
      outputs: [{ type: "uint256" }, { type: "bool" }],
    };

    expect(serializeResultToWire(multipleOutputs as never, { 0: 8n, 1: true, length: 2 } as ArrayLike<unknown>)).toEqual(["8", true]);
    expect(() => decodeResultFromWire({ signature: "single(uint256)", outputs: [{ type: "uint256" }] } as never, { nope: true })).toThrow(
      "invalid response for single(uint256): Invalid input: expected string, received object",
    );
    expect(() => serializeResultToWire({ signature: "badResult(address)", outputs: [{ type: "address" }] } as never, "nope")).toThrow(
      "invalid result for badResult(address): invalid address",
    );
  });

  it("normalizes sparse tuple-object outputs without crashing on missing nested tuple arrays", () => {
    const definition = {
      signature: "sparseTupleObject()",
      outputs: [{
        type: "tuple",
        components: [
          { name: "count", type: "uint256" },
          {
            name: "nested",
            type: "tuple[]",
            components: [{ name: "owner", type: "address" }],
          },
        ],
      }],
      outputShape: { kind: "object" },
    };

    expect(() => serializeResultToWire(definition as never, { count: 4n })).toThrow("expected array value for tuple[]");
  });

  it("rejects wrong parameter counts on encode and decode entrypoints", () => {
    const definition = {
      signature: "counted(uint256,bool)",
      inputs: [{ type: "uint256" }, { type: "bool" }],
    };

    expect(() => serializeParamsToWire(definition as never, ["1"])).toThrow(
      "expected 2 params for counted(uint256,bool), received 1",
    );
    expect(() => decodeParamsFromWire(definition as never, ["1"])).toThrow(
      "expected 2 params for counted(uint256,bool), received 1",
    );
  });

  it("decodes valid single-result tuples and rejects non-array multi-result payloads", () => {
    const singleOutput = {
      signature: "singleTuple()",
      outputs: [{
        type: "tuple",
        components: [
          { name: "count", type: "uint256" },
          { name: "enabled", type: "bool" },
        ],
      }],
    };
    const multiOutput = {
      signature: "pair(uint256,address)",
      outputs: [
        { type: "uint256" },
        { type: "address" },
      ],
    };

    expect(decodeResultFromWire(singleOutput as never, { count: "5", enabled: true })).toEqual({
      count: 5n,
      enabled: true,
    });
    expect(() => decodeResultFromWire(multiOutput as never, { 0: "1" })).toThrow(
      "invalid response for pair(uint256,address): expected array",
    );
  });

  it("decodes tuple arrays directly from wire payloads", () => {
    expect(decodeFromWire({
      type: "tuple",
      components: [
        { name: "count", type: "uint256" },
        { name: "enabled", type: "bool" },
      ],
    } as never, ["7", false])).toEqual([7n, false]);
  });

  it("normalizes array-shaped tuple object results with unnamed component fallbacks", () => {
    const definition = {
      signature: "arrayTupleObject()",
      outputs: [{
        type: "tuple",
        components: [
          { type: "uint256" },
          { name: "enabled", type: "bool" },
        ],
      }],
      outputShape: { kind: "object" },
    };

    expect(serializeResultToWire(definition as never, [4n, true])).toEqual({
      0: "4",
      enabled: true,
    });
    expect(decodeResultFromWire(definition as never, ["4", true])).toEqual([4n, true]);
  });

  it("normalizes mixed named and unnamed nested tuple components from array payloads", () => {
    const definition = {
      signature: "nestedArrayTupleObject()",
      outputs: [{
        type: "tuple",
        components: [
          {
            name: "nested",
            type: "tuple",
            components: [
              { type: "uint256" },
              { name: "enabled", type: "bool" },
            ],
          },
        ],
      }],
      outputShape: { kind: "object" },
    };

    expect(serializeResultToWire(definition as never, [[12n, true]])).toEqual({
      nested: {
        0: "12",
        enabled: true,
      },
    });
  });

  it("normalizes object-shaped tuple object results with unnamed component fallbacks", () => {
    const definition = {
      signature: "objectTupleObject()",
      outputs: [{
        type: "tuple",
        components: [
          { type: "uint256" },
          { name: "enabled", type: "bool" },
        ],
      }],
      outputShape: { kind: "object" },
    };

    expect(serializeResultToWire(definition as never, {
      0: 9n,
      enabled: false,
    })).toEqual({
      0: "9",
      enabled: false,
    });
    expect(decodeResultFromWire(definition as never, {
      0: "9",
      enabled: false,
    })).toEqual({
      0: 9n,
      enabled: false,
    });
  });

  it("decodes object-backed tuple payloads through unnamed numeric fallback keys", () => {
    expect(decodeFromWire({
      type: "tuple",
      components: [
        { type: "uint256" },
        { name: "enabled", type: "bool" },
      ],
    } as never, {
      0: "7",
      enabled: true,
    })).toEqual({
      0: 7n,
      enabled: true,
    });
  });

  it("normalizes nested object-backed tuple results with unnamed component fallbacks", () => {
    const definition = {
      signature: "nestedObjectTupleResult()",
      outputs: [{
        type: "tuple",
        components: [
          {
            name: "nested",
            type: "tuple",
            components: [
              { type: "uint256" },
              { name: "enabled", type: "bool" },
            ],
          },
        ],
      }],
      outputShape: { kind: "object" },
    };

    expect(serializeResultToWire(definition as never, {
      nested: {
        0: 12n,
        enabled: true,
      },
    })).toEqual({
      nested: {
        0: "12",
        enabled: true,
      },
    });

    expect(decodeResultFromWire(definition as never, {
      nested: {
        0: "12",
        enabled: true,
      },
    })).toEqual({
      nested: {
        0: 12n,
        enabled: true,
      },
    });
  });

  it("rejects invalid items in multi-output result serialization", () => {
    expect(() => serializeResultToWire({
      signature: "pair(uint256,address)",
      outputs: [
        { type: "uint256" },
        { type: "address" },
      ],
    } as never, [8n, "nope"])).toThrow(
      "invalid result item 1 for pair(uint256,address): invalid address",
    );
    expect(() => serializeResultToWire({
      signature: "pair(uint256,bool)",
      outputs: [
        { type: "uint256" },
        { type: "bool" },
      ],
    } as never, ["not-a-decimal", true])).toThrow(
      "invalid result item 0 for pair(uint256,bool): invalid uint256 decimal string",
    );
  });

  it("supports bool, string, and bytes payloads across direct encode and decode helpers", () => {
    expect(serializeToWire({ type: "bool" } as never, true)).toBe(true);
    expect(serializeToWire({ type: "string" } as never, "alpha")).toBe("alpha");
    expect(serializeToWire({ type: "bytes" } as never, "0x1234")).toBe("0x1234");
    expect(decodeFromWire({ type: "bool" } as never, false)).toBe(false);
    expect(decodeFromWire({ type: "string" } as never, "beta")).toBe("beta");
    expect(decodeFromWire({ type: "bytes32" } as never, "0x" + "11".repeat(32))).toBe("0x" + "11".repeat(32));
  });

  it("preserves non-array dynamic tuple leaves until validation rejects the result payload", () => {
    const definition = {
      signature: "dynamicTupleLeaf()",
      outputs: [{
        type: "tuple[][]",
        components: [{ type: "uint256" }],
      }],
    };

    expect(() => serializeResultToWire(definition as never, "not-an-array")).toThrow(
      "invalid result for dynamicTupleLeaf(): expected array value for tuple[][]",
    );
  });

  it("surfaces validation failures for object-shaped tuple results with non-array tuple-array leaves", () => {
    const definition = {
      signature: "dynamicTupleLeafObject()",
      outputs: [{
        type: "tuple",
        components: [
          {
            name: "items",
            type: "tuple[]",
            components: [{ name: "amount", type: "uint256" }],
          },
        ],
      }],
      outputShape: { kind: "object" },
    };

    expect(() => serializeResultToWire(definition as never, {
      items: "not-an-array",
    })).toThrow(
      "invalid result for dynamicTupleLeafObject(): expected array value for tuple[]",
    );
  });

  it("serializes and decodes unnamed tuple components through numeric fallback keys", () => {
    const definition = {
      signature: "unnamed((uint256,bool))",
      inputs: [{
        type: "tuple",
        components: [
          { type: "uint256" },
          { type: "bool" },
        ],
      }],
      outputs: [{
        type: "tuple",
        components: [
          { type: "uint256" },
          { type: "bool" },
        ],
      }],
    };

    const paramsWire = serializeParamsToWire(definition as never, [{ 0: 7n, 1: true }]);
    expect(paramsWire).toEqual([{ 0: "7", 1: true }]);
    expect(decodeParamsFromWire(definition as never, paramsWire)).toEqual([{ 0: 7n, 1: true }]);
    expect(decodeResultFromWire(definition as never, { 0: "9", 1: false })).toEqual({ 0: 9n, 1: false });
  });

  it("decodes named tuple params from wire objects without array coercion", () => {
    const definition = {
      signature: "named((uint256,address))",
      inputs: [{
        type: "tuple",
        components: [
          { name: "count", type: "uint256" },
          { name: "owner", type: "address" },
        ],
      }],
    };

    expect(decodeParamsFromWire(definition as never, [{
      count: "4",
      owner: "0x0000000000000000000000000000000000000004",
    }])).toEqual([{
      count: 4n,
      owner: "0x0000000000000000000000000000000000000004",
    }]);
  });

  it("normalizes unnamed tuple result objects and tuple arrays through numeric fallback keys", () => {
    const tupleObjectDefinition = {
      signature: "unnamedTupleObject()",
      outputs: [{
        type: "tuple",
        components: [
          { type: "uint256" },
          { type: "bool" },
        ],
      }],
      outputShape: { kind: "object" },
    };
    const tupleArrayParam = {
      type: "tuple[]",
      components: [
        { type: "uint256" },
        { type: "bool" },
      ],
    };

    expect(serializeResultToWire(tupleObjectDefinition as never, [11n, true])).toEqual({
      0: "11",
      1: true,
    });
    expect(serializeResultToWire(tupleObjectDefinition as never, { 0: 12n, 1: false })).toEqual({
      0: "12",
      1: false,
    });
    expect(decodeFromWire(tupleArrayParam as never, [{ 0: "13", 1: true }])).toEqual([
      { 0: 13n, 1: true },
    ]);
  });

  it("treats tuple definitions without components as empty tuple objects", () => {
    const tupleParam = { type: "tuple" };
    const tupleResultDefinition = {
      signature: "emptyTuple()",
      outputs: [tupleParam],
      outputShape: { kind: "object" },
    };

    expect(serializeToWire(tupleParam as never, {})).toEqual({});
    expect(decodeFromWire(tupleParam as never, {})).toEqual({});
    expect(serializeResultToWire(tupleResultDefinition as never, {})).toEqual({});
  });

  it("falls back to positional tuple keys when named object fields are missing", () => {
    const tupleParam = {
      type: "tuple",
      components: [
        { name: "count", type: "uint256" },
        { name: "enabled", type: "bool" },
      ],
    };
    const definition = {
      signature: "namedTupleFallback()",
      outputs: [tupleParam],
      outputShape: { kind: "object" },
    };

    expect(serializeToWire(tupleParam as never, { 0: 5n, 1: false })).toEqual({
      count: "5",
      enabled: false,
    });
    expect(serializeResultToWire(definition as never, { 0: 6n, 1: true })).toEqual({
      count: "6",
      enabled: true,
    });
    expect(decodeFromWire(tupleParam as never, { count: "7", enabled: false })).toEqual({
      count: 7n,
      enabled: false,
    });
  });

  it("passes through malformed tuple-array outputs until result validation rejects them", () => {
    const definition = {
      signature: "brokenTupleArrayResult()",
      outputs: [{
        type: "tuple[]",
        components: [{ name: "count", type: "uint256" }],
      }],
    };

    expect(() => serializeResultToWire(definition as never, { bad: true })).toThrow(
      "invalid result for brokenTupleArrayResult(): expected array value for tuple[]",
    );
  });

  it("preserves scalar fallback values in tuple-object normalization internals", () => {
    expect(abiCodecInternals.tupleToNamedObject({
      type: "tuple",
      components: [{ name: "count", type: "uint256" }],
    } as never, "leave-me-alone")).toBe("leave-me-alone");

    expect(abiCodecInternals.normalizeTupleOutputs({
      type: "tuple[]",
      components: [{ name: "count", type: "uint256" }],
    } as never, "still-not-an-array")).toBe("still-not-an-array");
  });

  it("normalizes tuple internals when tuple metadata and names are omitted", () => {
    expect(abiCodecInternals.tupleToNamedObject({
      type: "tuple",
      components: undefined,
    } as never, ["ignored"])).toEqual({});

    expect(abiCodecInternals.tupleToNamedObject({
      type: "tuple",
      components: [{ type: "uint256" }, { name: "enabled", type: "bool" }],
    } as never, {
      0: "14",
      enabled: false,
    })).toEqual({
      0: "14",
      enabled: false,
    });
  });

  it("decodes unnamed tuple objects and empty tuple definitions from wire payloads", () => {
    expect(decodeFromWire({
      type: "tuple",
      components: [{ type: "uint256" }, { type: "bool" }],
    } as never, {
      0: "5",
      1: true,
    })).toEqual({
      0: 5n,
      1: true,
    });

    expect(decodeParamsFromWire({
      signature: "emptyTupleInput(( ))",
      inputs: [{ type: "tuple", components: undefined }],
    } as never, [{}])).toEqual([{}]);
  });

  it("falls back from missing named tuple object fields to positional wire keys", () => {
    expect(abiCodecInternals.tupleToNamedObject({
      type: "tuple",
      components: [{ name: "count", type: "uint256" }],
    } as never, {
      0: "15",
    })).toEqual({
      count: "15",
    });

    expect(abiCodecInternals.tupleToNamedObject({
      type: "tuple",
      components: undefined,
    } as never, {
      arbitrary: "ignored",
    })).toEqual({});

    expect(decodeFromWire({
      type: "tuple",
      components: undefined,
    } as never, {})).toEqual({});
  });

  it("normalizes object-backed named tuple leaves from positional fallback keys", () => {
    expect(abiCodecInternals.tupleToNamedObject({
      type: "tuple",
      components: [
        {
          name: "nested",
          type: "tuple",
          components: [{ name: "count", type: "uint256" }],
        },
      ],
    } as never, {
      0: {
        0: "16",
      },
    })).toEqual({
      nested: {
        count: "16",
      },
    });
  });

  it("normalizes object-backed unnamed tuple leaves through positional object keys", () => {
    expect(abiCodecInternals.tupleToNamedObject({
      type: "tuple",
      components: [{ type: "uint256" }],
    } as never, {
      0: "17",
    })).toEqual({
      0: "17",
    });
  });

  it("normalizes object-backed tuples when unnamed components rely on numeric fallback keys", () => {
    expect(abiCodecInternals.tupleToNamedObject({
      type: "tuple",
      components: [
        { name: "owner", type: "address" },
        { type: "uint256" },
      ],
    } as never, {
      owner: "0x0000000000000000000000000000000000000018",
      1: "19",
    })).toEqual({
      owner: "0x0000000000000000000000000000000000000018",
      1: "19",
    });
  });

  it("normalizes tuple-object internals when unnamed components rely on numeric fallback keys", () => {
    expect(abiCodecInternals.tupleToNamedObject({
      type: "tuple",
      components: [
        { type: "uint256" },
        { name: "flag", type: "bool" },
      ],
    } as never, {
      0: "9",
      flag: true,
    })).toEqual({
      0: "9",
      flag: true,
    });

    expect(abiCodecInternals.normalizeTupleOutputs({
      type: "tuple[][]",
      components: [{ type: "uint256" }],
    } as never, [
      [{ 0: "3" }],
    ])).toEqual([
      [{ 0: "3" }],
    ]);
  });

  it("serializes multi-output array results without coercing them through array-like object handling", () => {
    const definition = {
      signature: "multiArrayResult(uint256,bool)",
      outputs: [{ type: "uint256" }, { type: "bool" }],
    };

    expect(serializeResultToWire(definition as never, [9n, false])).toEqual(["9", false]);
  });

  it("accepts pre-serialized integer strings across encode and decode entrypoints", () => {
    const definition = {
      signature: "signed(int256,uint256)",
      inputs: [{ type: "int256" }, { type: "uint256" }],
    };

    expect(serializeParamsToWire(definition as never, ["-7", "11"])).toEqual(["-7", "11"]);
    expect(decodeParamsFromWire(definition as never, ["-7", "11"])).toEqual([-7n, 11n]);
  });

  it("serializes and decodes nested dynamic arrays without fixed-length suffixes", () => {
    const param = { type: "uint256[][]" };
    const definition = {
      signature: "matrix(uint256[][])",
      inputs: [param],
      outputs: [param],
    };
    const value = [
      [1n, 2n],
      [3n],
    ];
    const wire = [["1", "2"], ["3"]];

    expect(serializeToWire(param as never, value)).toEqual(wire);
    expect(decodeFromWire(param as never, wire)).toEqual(value);
    expect(serializeParamsToWire(definition as never, [value])).toEqual([wire]);
    expect(decodeParamsFromWire(definition as never, [wire])).toEqual([value]);
    expect(serializeResultToWire(definition as never, value)).toEqual(wire);
    expect(decodeResultFromWire(definition as never, wire)).toEqual(value);
  });

  it("rejects param-count mismatches across encode and decode entrypoints", () => {
    const definition = {
      signature: "signed(int256,uint256)",
      inputs: [{ type: "int256" }, { type: "uint256" }],
    };

    expect(() => serializeParamsToWire(definition as never, ["-7"])).toThrow(
      "expected 2 params for signed(int256,uint256), received 1",
    );
    expect(() => decodeParamsFromWire(definition as never, ["-7"])).toThrow(
      "expected 2 params for signed(int256,uint256), received 1",
    );
  });

  it("surfaces nested tuple validation failures from positional payloads", () => {
    const definition = {
      signature: "tupleArray((uint256,bool))",
      inputs: [{
        type: "tuple",
        components: [
          { name: "count", type: "uint256" },
          { name: "enabled", type: "bool" },
        ],
      }],
    };

    expect(() => validateWireParams(definition as never, [["nope", true]])).toThrow(
      "invalid param 0 for tupleArray((uint256,bool)): invalid uint256 decimal string",
    );
  });

  it("surfaces tuple-length mismatches from positional payloads", () => {
    const definition = {
      signature: "tupleArray((uint256,bool))",
      inputs: [{
        type: "tuple",
        components: [
          { name: "count", type: "uint256" },
          { name: "enabled", type: "bool" },
        ],
      }],
    };

    expect(() => validateWireParams(definition as never, [["1", true, "extra"]])).toThrow(
      "invalid param 0 for tupleArray((uint256,bool)): expected tuple length 2",
    );
  });

  it("normalizes nested tuple-array object outputs and preserves malformed scalar leaves for validation", () => {
    const definition = {
      signature: "nestedTupleArray()",
      outputs: [{
        type: "tuple",
        components: [
          {
            name: "items",
            type: "tuple[]",
            components: [{ name: "count", type: "uint256" }],
          },
        ],
      }],
      outputShape: { kind: "object" },
    };

    expect(serializeResultToWire(definition as never, [[{ count: 3n }, { count: 5n }]])).toEqual({
      items: [{ count: "3" }, { count: "5" }],
    });

    expect(() => serializeResultToWire(definition as never, ["not-an-array"])).toThrow(
      "expected array value for tuple[]",
    );
  });

  it("passes through malformed tuple outputs that cannot be normalized into named objects", () => {
    const tupleDefinition = {
      signature: "brokenTuple()",
      outputs: [{
        type: "tuple",
        components: [{ name: "count", type: "uint256" }],
      }],
      outputShape: { kind: "object" },
    };
    const tupleArrayDefinition = {
      signature: "brokenTupleArray()",
      outputs: [{
        type: "tuple[]",
        components: [{ name: "count", type: "uint256" }],
      }],
    };

    expect(() => serializeResultToWire(tupleDefinition as never, "not-an-object")).toThrow(
      "invalid result for brokenTuple(): expected tuple-compatible value",
    );
    expect(() => serializeResultToWire(tupleArrayDefinition as never, "not-an-array")).toThrow(
      "invalid result for brokenTupleArray(): expected array value for tuple[]",
    );
  });

  it("surfaces non-Error thrown values while formatting single-result serialization failures", () => {
    const definition = {
      signature: "stringThrown()",
      outputs: [{
        get type() {
          throw "string-backed failure";
        },
      }],
    };

    expect(() => serializeResultToWire(definition as never, "ignored")).toThrow(
      "invalid result for stringThrown(): string-backed failure",
    );
  });

  it("stringifies thrown objects without message fields for single-result serialization failures", () => {
    const definition = {
      signature: "objectWithoutMessageThrown()",
      outputs: [{
        get type() {
          throw { reason: "missing-message" };
        },
      }],
    };

    expect(() => serializeResultToWire(definition as never, "ignored")).toThrow(
      "invalid result for objectWithoutMessageThrown(): [object Object]",
    );
  });

  it("stringifies thrown objects without message fields for multi-result serialization failures", () => {
    const definition = {
      signature: "multiObjectWithoutMessageThrown()",
      outputs: [
        { type: "uint256" },
        {
          get type() {
            throw { reason: "missing-message" };
          },
        },
      ],
    };

    expect(() => serializeResultToWire(definition as never, [1n, "ignored"])).toThrow(
      "invalid result item 1 for multiObjectWithoutMessageThrown(): [object Object]",
    );
  });

  it("handles unknown scalar types and malformed array suffixes permissively", () => {
    const passthroughDefinition = {
      signature: "mystery(customType,bad])",
      inputs: [
        { type: "customType" },
        { type: "uint256bad]" },
      ],
    };

    expect(() => validateWireParams(passthroughDefinition as never, [{ ok: true }, ["still-accepted"]])).not.toThrow();
  });

  it("validates plain string parameters through the wire schema builder", () => {
    const definition = {
      signature: "setLabel(string)",
      inputs: [{ type: "string" }],
    };

    expect(() => validateWireParams(definition as never, ["voice-label"])).not.toThrow();
    expect(decodeParamsFromWire(definition as never, ["voice-label"])).toEqual(["voice-label"]);
  });

  it("normalizes object-shaped tuple results and surfaces nested array validation failures", () => {
    const definition = {
      signature: "objectTupleResult()",
      outputs: [{
        type: "tuple",
        components: [
          { name: "count", type: "uint256" },
          {
            name: "nested",
            type: "tuple",
            components: [
              { name: "items", type: "uint256[]" },
            ],
          },
        ],
      }],
      outputShape: { kind: "object" },
    };

    const wire = serializeResultToWire(definition as never, {
      count: 9n,
      nested: {
        items: [1n, 2n],
      },
    });

    expect(wire).toEqual({
      count: "9",
      nested: {
        items: ["1", "2"],
      },
    });

    expect(() => serializeResultToWire(definition as never, {
      count: 9n,
      nested: {},
    })).toThrow("invalid result for objectTupleResult(): expected array");
  });

  it("rejects invalid multi-output serialization inputs and non-array response payloads", () => {
    const definition = {
      signature: "multiResult(uint256,address)",
      outputs: [
        { type: "uint256" },
        { type: "address" },
      ],
    };

    expect(() => serializeResultToWire(definition as never, [{ bad: true }, "0x0000000000000000000000000000000000000001"])).toThrow(
      "invalid result item 0 for multiResult(uint256,address): expected integer-compatible value for uint256",
    );
    expect(() => decodeResultFromWire(definition as never, {
      0: "1",
      1: "0x0000000000000000000000000000000000000001",
      length: 2,
    })).toThrow("invalid response for multiResult(uint256,address): expected array");
  });

  it("surfaces single and multi-output validation failures after serialization succeeds", () => {
    const singleDefinition = {
      signature: "single(bytes32)",
      outputs: [{ type: "bytes32" }],
    };
    const multiSerializeDefinition = {
      signature: "pair(address,uint256)",
      outputs: [{ type: "address" }, { type: "uint256" }],
    };
    const multiValidateDefinition = {
      signature: "pair(bytes32,address)",
      outputs: [{ type: "bytes32" }, { type: "address" }],
    };

    expect(() => serializeResultToWire(singleDefinition as never, "not-hex")).toThrow(
      "invalid result for single(bytes32): invalid hex string",
    );
    expect(() => serializeResultToWire(multiSerializeDefinition as never, [
      "0x0000000000000000000000000000000000000001",
      { bad: true },
    ])).toThrow(
      "invalid result item 1 for pair(address,uint256): expected integer-compatible value for uint256",
    );
    expect(() => serializeResultToWire(multiValidateDefinition as never, [
      "not-hex",
      "0x0000000000000000000000000000000000000001",
    ])).toThrow(
      "invalid result item 0 for pair(bytes32,address): invalid hex string",
    );
  });

  it("surfaces direct response validation failures for single and multi-output payloads", () => {
    const singleDefinition = {
      signature: "single(bytes32)",
      outputs: [{ type: "bytes32" }],
    };
    const multiDefinition = {
      signature: "pair(uint256,bool)",
      outputs: [{ type: "uint256" }, { type: "bool" }],
    };

    expect(() => decodeResultFromWire(singleDefinition as never, "not-hex")).toThrow(
      "invalid response for single(bytes32): invalid hex string",
    );
    expect(() => decodeResultFromWire(multiDefinition as never, ["7", "nope"])).toThrow(
      "invalid response item 1 for pair(uint256,bool): Invalid input: expected boolean, received string",
    );
  });

  it("keeps named tuple objects stable when object-shaped output normalization re-runs", () => {
    const definition = {
      signature: "namedTupleResult()",
      outputs: [{
        type: "tuple",
        components: [
          { name: "count", type: "uint256" },
          {
            name: "nested",
            type: "tuple",
            components: [{ name: "label", type: "string" }],
          },
        ],
      }],
      outputShape: { kind: "object" },
    };

    const wire = serializeResultToWire(definition as never, {
      count: 5n,
      nested: { label: "ready" },
    });

    expect(wire).toEqual({
      count: "5",
      nested: { label: "ready" },
    });
    expect(decodeResultFromWire(definition as never, wire)).toEqual({
      count: 5n,
      nested: { label: "ready" },
    });
  });

  it("rejects malformed object-shaped tuple leaves during direct response decoding", () => {
    const definition = {
      signature: "objectTupleDecode()",
      outputs: [{
        type: "tuple",
        components: [
          { name: "count", type: "uint256" },
          {
            name: "nested",
            type: "tuple",
            components: [{ name: "flag", type: "bool" }],
          },
        ],
      }],
    };

    expect(() => decodeResultFromWire(definition as never, {
      count: "9",
      nested: { flag: "not-bool" },
    })).toThrow("invalid response for objectTupleDecode(): Invalid input");
  });

  it("handles tuple parameters and outputs without declared component metadata", () => {
    const tupleParam = { type: "tuple" };
    const tupleArrayParam = { type: "tuple[]" };
    const tupleOutputDefinition = {
      signature: "tupleUnknown()",
      outputs: [{ type: "tuple", components: [] }],
    };
    const objectShapedTupleOutputDefinition = {
      signature: "tupleUnknownObject()",
      outputs: [{ type: "tuple[]", components: [] }],
      outputShape: { kind: "object" },
    };

    expect(() => validateWireParams({
      signature: "tupleUnknown(tuple)",
      inputs: [tupleParam],
    } as never, [[]])).not.toThrow();
    expect(serializeToWire(tupleParam as never, ["alpha", true])).toEqual([]);
    expect(serializeToWire(tupleParam as never, { anything: "goes" })).toEqual({});
    expect(decodeFromWire(tupleParam as never, ["alpha", true])).toEqual([]);
    expect(decodeFromWire(tupleParam as never, { anything: "goes" })).toEqual({});
    expect(decodeResultFromWire(tupleOutputDefinition as never, { extra: "value" })).toEqual({});
    expect(() => serializeResultToWire(objectShapedTupleOutputDefinition as never, "not-an-array")).toThrow(
      "invalid result for tupleUnknownObject(): expected array value for tuple[]",
    );
    expect(serializeToWire(tupleArrayParam as never, [[1], [2]])).toEqual([[], []]);
    expect(decodeFromWire(tupleArrayParam as never, [[1], [2]])).toEqual([[], []]);
  });

  it("normalizes unnamed tuple-object outputs and open-ended array types", () => {
    const unnamedTupleObjectDefinition = {
      signature: "unnamedTupleObject()",
      outputs: [{
        type: "tuple",
        components: [
          { type: "uint256" },
          { type: "bool" },
        ],
      }],
      outputShape: { kind: "object" },
    };
    const nestedOpenArrayDefinition = {
      signature: "nestedOpenArray()",
      outputs: [{
        type: "tuple[]",
        components: [
          { name: "count", type: "uint256[]" },
        ],
      }],
      outputShape: { kind: "object" },
    };

    expect(serializeResultToWire(unnamedTupleObjectDefinition as never, ["7", false])).toEqual({
      0: "7",
      1: false,
    });
    expect(serializeResultToWire(unnamedTupleObjectDefinition as never, { 0: "9", 1: true })).toEqual({
      0: "9",
      1: true,
    });
    expect(serializeResultToWire(nestedOpenArrayDefinition as never, [
      { count: ["1", "2"] },
      { count: ["3"] },
    ])).toEqual([
      { count: ["1", "2"] },
      { count: ["3"] },
    ]);
  });

  it("passes through non-normalizable tuple leaves until result validation rejects them", () => {
    const tupleObjectDefinition = {
      signature: "tupleLeafPassthrough()",
      outputs: [{
        type: "tuple",
        components: [
          { name: "count", type: "uint256" },
        ],
      }],
      outputShape: { kind: "object" },
    };
    const tupleArrayDefinition = {
      signature: "tupleArrayLeafPassthrough()",
      outputs: [{
        type: "tuple[]",
        components: [
          { name: "count", type: "uint256" },
        ],
      }],
      outputShape: { kind: "object" },
    };

    expect(() => serializeResultToWire(tupleObjectDefinition as never, 7n)).toThrow(
      "invalid result for tupleLeafPassthrough(): expected tuple-compatible value",
    );
    expect(() => serializeResultToWire(tupleArrayDefinition as never, 7n)).toThrow(
      "invalid result for tupleArrayLeafPassthrough(): expected array value for tuple[]",
    );
  });

  it("uses positional fallbacks for unnamed tuple components across object and result decoding paths", () => {
    const unnamedTupleParam = {
      type: "tuple",
      components: [
        { type: "uint256" },
        { name: "flag", type: "bool" },
      ],
    };
    const unnamedTupleResult = {
      signature: "unnamedTupleResult()",
      outputs: [unnamedTupleParam],
      outputShape: { kind: "object" },
    };
    const multiOutput = {
      signature: "multiArrayPath()",
      outputs: [{ type: "uint256" }, { type: "bool" }],
    };

    expect(serializeToWire(unnamedTupleParam as never, { 0: 12n, flag: true })).toEqual({
      0: "12",
      flag: true,
    });
    expect(decodeFromWire(unnamedTupleParam as never, { 0: "12", flag: true })).toEqual({
      0: 12n,
      flag: true,
    });
    expect(serializeResultToWire(unnamedTupleResult as never, { 0: 15n, flag: false })).toEqual({
      0: "15",
      flag: false,
    });
    expect(decodeResultFromWire(unnamedTupleResult as never, { 0: "15", flag: false })).toEqual({
      0: 15n,
      flag: false,
    });
    expect(decodeResultFromWire(multiOutput as never, ["8", true])).toEqual([8n, true]);
  });

  it("falls back to numeric tuple keys when named object fields are omitted", () => {
    const tupleParam = {
      type: "tuple",
      components: [
        { name: "count", type: "uint256" },
        { name: "enabled", type: "bool" },
      ],
    };
    const tupleResult = {
      signature: "numericFallbackTuple()",
      outputs: [tupleParam],
      outputShape: { kind: "object" },
    };

    expect(serializeToWire(tupleParam as never, { 0: 12n, 1: true })).toEqual({
      count: "12",
      enabled: true,
    });
    expect(decodeFromWire(tupleParam as never, { count: "5", 1: false })).toEqual({
      count: 5n,
      enabled: undefined,
    });
    expect(serializeResultToWire(tupleResult as never, { 0: 9n, 1: true })).toEqual({
      count: "9",
      enabled: true,
    });
  });

  it("falls back to numeric tuple result keys when named fields are explicitly undefined", () => {
    const tupleResult = {
      signature: "numericFallbackTupleUndefined()",
      outputs: [{
        type: "tuple",
        components: [
          { name: "count", type: "uint256" },
          { name: "enabled", type: "bool" },
        ],
      }],
      outputShape: { kind: "object" },
    };

    expect(serializeResultToWire(tupleResult as never, {
      count: undefined,
      0: 15n,
      enabled: undefined,
      1: false,
    })).toEqual({
      count: "15",
      enabled: false,
    });
  });

  it("preserves malformed nested tuple-array leaves until output validation rejects them", () => {
    const definition = {
      signature: "malformedTupleLeaf()",
      outputs: [{
        type: "tuple",
        components: [
          {
            name: "nested",
            type: "tuple[]",
            components: [{ name: "owner", type: "address" }],
          },
        ],
      }],
      outputShape: { kind: "object" },
    };

    expect(() => serializeResultToWire(definition as never, {
      nested: "not-an-array",
    })).toThrow("invalid result for malformedTupleLeaf(): expected array");
  });

  it("rejects object-shaped tuple results when nested tuple-array leaves are null", () => {
    const sparseNestedTupleDefinition = {
      signature: "sparseNestedTuple()",
      outputs: [{
        type: "tuple",
        components: [
          { name: "count", type: "uint256" },
          {
            name: "nested",
            type: "tuple[]",
            components: [{ name: "owner", type: "address" }],
          },
        ],
      }],
      outputShape: { kind: "object" },
    };

    expect(() => decodeResultFromWire(sparseNestedTupleDefinition as never, {
      count: "3",
      nested: null,
    })).toThrow("invalid response for sparseNestedTuple(): Invalid input");
  });

  it("keeps unnamed tuple component indices across direct object encode and decode paths", () => {
    const tupleParam = {
      type: "tuple",
      components: [
        { type: "uint256" },
        { name: "enabled", type: "bool" },
      ],
    };

    expect(serializeToWire(tupleParam as never, { 0: 12n, enabled: true })).toEqual({
      0: "12",
      enabled: true,
    });
    expect(decodeFromWire(tupleParam as never, { 0: "13", enabled: false })).toEqual({
      0: 13n,
      enabled: false,
    });
  });

  it("normalizes nested dynamic tuple arrays from both positional and keyed object result payloads", () => {
    const tupleResult = {
      signature: "nestedDynamicTupleResult()",
      outputs: [{
        type: "tuple",
        components: [
          {
            type: "tuple[][]",
            components: [{ type: "uint256" }],
          },
          { name: "enabled", type: "bool" },
        ],
      }],
      outputShape: { kind: "object" },
    };

    expect(serializeResultToWire(tupleResult as never, [
      [
        [1n, 2n].map((count) => [count]),
        [[3n]],
      ],
      true,
    ])).toEqual({
      0: [
        [{ 0: "1" }, { 0: "2" }],
        [{ 0: "3" }],
      ],
      enabled: true,
    });

    expect(serializeResultToWire(tupleResult as never, {
      0: [
        [{ 0: 4n }],
        [{ 0: 5n }, { 0: 6n }],
      ],
      enabled: false,
    })).toEqual({
      0: [
        [{ 0: "4" }],
        [{ 0: "5" }, { 0: "6" }],
      ],
      enabled: false,
    });
  });

  it("falls back to positional tuple result keys when named object fields are missing", () => {
    const tupleResult = {
      signature: "fallbackTupleResult()",
      outputs: [{
        type: "tuple",
        components: [
          { name: "count", type: "uint256" },
          { name: "enabled", type: "bool" },
        ],
      }],
      outputShape: { kind: "object" },
    };

    expect(serializeResultToWire(tupleResult as never, {
      count: undefined,
      0: 21n,
      enabled: undefined,
      1: true,
    })).toEqual({
      count: "21",
      enabled: true,
    });
  });

  it("normalizes object-backed tuple components whose declared name is an empty string", () => {
    expect(abiCodecInternals.tupleToNamedObject({
      type: "tuple",
      components: [
        { name: "", type: "uint256" },
        { name: "enabled", type: "bool" },
      ],
    } as never, {
      0: "22",
      enabled: true,
    })).toEqual({
      0: "22",
      enabled: true,
    });
  });

  it("prefers thrown object messages when formatting single-result serialization failures", () => {
    const definition = {
      signature: "objectThrown()",
      outputs: [{
        get type() {
          throw { message: "object-backed failure" };
        },
      }],
    };

    expect(() => serializeResultToWire(definition as never, "ignored")).toThrow(
      "invalid result for objectThrown(): object-backed failure",
    );
  });
});
