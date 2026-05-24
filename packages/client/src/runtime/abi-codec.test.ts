import { describe, expect, it } from "vitest";

import {
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
});
