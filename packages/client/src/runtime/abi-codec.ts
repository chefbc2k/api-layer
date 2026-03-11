import { z } from "zod";

import type { AbiMethodDefinition, AbiParameter } from "./abi-registry.js";

function parseArrayType(type: string): { baseType: string; lengths: Array<number | null> } {
  const lengths: Array<number | null> = [];
  let current = type;
  while (current.endsWith("]")) {
    const match = current.match(/^(.*)\[(\d*)\]$/u);
    if (!match) {
      break;
    }
    current = match[1];
    lengths.unshift(match[2] === "" ? null : Number(match[2]));
  }
  return { baseType: current, lengths };
}

function integerWireSchema(type: string): z.ZodType<string> {
  return z.string().regex(type.startsWith("uint") ? /^\d+$/u : /^-?\d+$/u, `invalid ${type} decimal string`);
}

function buildWireScalarSchema(param: AbiParameter): z.ZodTypeAny {
  if (/^u?int\d*$/u.test(param.type)) {
    return integerWireSchema(param.type);
  }
  if (param.type === "address") {
    return z.string().regex(/^0x[a-fA-F0-9]{40}$/u, "invalid address");
  }
  if (param.type === "bool") {
    return z.boolean();
  }
  if (param.type === "string") {
    return z.string();
  }
  if (param.type === "tuple") {
    const componentSchemas = param.components ?? [];
    return z.union([
      z.array(z.unknown()).superRefine((value, ctx) => validateWireTupleArray(componentSchemas, value, ctx)),
      z.record(z.string(), z.unknown()).superRefine((value, ctx) => validateWireTupleObject(componentSchemas, value, ctx)),
    ]);
  }
  if (/^bytes(\d+)?$/u.test(param.type)) {
    return z.string().regex(/^0x[0-9a-fA-F]*$/u, "invalid hex string");
  }
  return z.unknown();
}

function buildWireSchema(param: AbiParameter): z.ZodTypeAny {
  const { baseType, lengths } = parseArrayType(param.type);
  const scalarParam = { ...param, type: baseType };
  let schema = buildWireScalarSchema(scalarParam);
  for (const length of lengths) {
    schema = z.array(schema).superRefine((value, ctx) => {
      if (length !== null && value.length !== length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `expected array length ${length}`,
        });
      }
    });
  }
  return schema;
}

function validateWireTupleArray(components: AbiParameter[], value: unknown[], ctx: z.RefinementCtx): void {
  if (value.length !== components.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `expected tuple length ${components.length}`,
    });
  }
  components.forEach((component, index) => {
    const result = buildWireSchema(component).safeParse(value[index]);
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({
          ...issue,
          path: [index, ...issue.path],
        });
      }
    }
  });
}

function validateWireTupleObject(
  components: AbiParameter[],
  value: Record<string, unknown>,
  ctx: z.RefinementCtx,
): void {
  components.forEach((component, index) => {
    const key = component.name && component.name.length > 0 ? component.name : String(index);
    const result = buildWireSchema(component).safeParse(value[key]);
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({
          ...issue,
          path: [key, ...issue.path],
        });
      }
    }
  });
}

function serializeScalarToWire(param: AbiParameter, value: unknown): unknown {
  if (/^u?int\d*$/u.test(param.type)) {
    if (typeof value === "bigint") {
      return value.toString();
    }
    if (typeof value === "number") {
      if (!Number.isSafeInteger(value)) {
        throw new Error(`unsafe integer for ${param.type}`);
      }
      return value.toString();
    }
    if (typeof value === "string") {
      return value;
    }
    throw new Error(`expected integer-compatible value for ${param.type}`);
  }
  if (param.type === "tuple") {
    const components = param.components ?? [];
    if (Array.isArray(value)) {
      return components.map((component, index) => serializeToWire(component, value[index]));
    }
    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      const result: Record<string, unknown> = {};
      components.forEach((component, index) => {
        const key = component.name && component.name.length > 0 ? component.name : String(index);
        result[key] = serializeToWire(component, record[key] ?? record[String(index)]);
      });
      return result;
    }
    throw new Error("expected tuple-compatible value");
  }
  return value;
}

export function serializeToWire(param: AbiParameter, value: unknown): unknown {
  const { baseType, lengths } = parseArrayType(param.type);
  if (lengths.length === 0) {
    return serializeScalarToWire(param, value);
  }
  if (!Array.isArray(value)) {
    throw new Error(`expected array value for ${param.type}`);
  }
  const [head, ...tail] = lengths;
  if (head !== null && value.length !== head) {
    throw new Error(`expected array length ${head} for ${param.type}`);
  }
  const childType = `${baseType}${tail.map((length) => `[${length == null ? "" : length}]`).join("")}`;
  return value.map((entry) => serializeToWire({ ...param, type: childType }, entry));
}

function decodeScalarFromWire(param: AbiParameter, value: unknown): unknown {
  if (/^u?int\d*$/u.test(param.type)) {
    return BigInt(String(value));
  }
  if (param.type === "tuple") {
    const components = param.components ?? [];
    if (Array.isArray(value)) {
      return components.map((component, index) => decodeFromWire(component, value[index]));
    }
    const record = value as Record<string, unknown>;
    const decoded: Record<string, unknown> = {};
    components.forEach((component, index) => {
      const key = component.name && component.name.length > 0 ? component.name : String(index);
      decoded[key] = decodeFromWire(component, record[key]);
    });
    return decoded;
  }
  return value;
}

export function decodeFromWire(param: AbiParameter, value: unknown): unknown {
  const { baseType, lengths } = parseArrayType(param.type);
  if (lengths.length === 0) {
    return decodeScalarFromWire(param, value);
  }
  const [head, ...tail] = lengths;
  const values = value as unknown[];
  if (head !== null && values.length !== head) {
    throw new Error(`expected array length ${head} for ${param.type}`);
  }
  const childType = `${baseType}${tail.map((length) => `[${length == null ? "" : length}]`).join("")}`;
  return values.map((entry) => decodeFromWire({ ...param, type: childType }, entry));
}

export function validateWireParams(definition: Pick<AbiMethodDefinition, "inputs" | "signature">, params: unknown[]): void {
  if (params.length !== definition.inputs.length) {
    throw new Error(`expected ${definition.inputs.length} params for ${definition.signature}, received ${params.length}`);
  }
  definition.inputs.forEach((input, index) => {
    const result = buildWireSchema(input).safeParse(params[index]);
    if (!result.success) {
      throw new Error(`invalid param ${index} for ${definition.signature}: ${result.error.issues[0]?.message ?? "validation failed"}`);
    }
  });
}

export function serializeParamsToWire(definition: Pick<AbiMethodDefinition, "inputs" | "signature">, params: unknown[]): unknown[] {
  if (params.length !== definition.inputs.length) {
    throw new Error(`expected ${definition.inputs.length} params for ${definition.signature}, received ${params.length}`);
  }
  const serialized = definition.inputs.map((input, index) => serializeToWire(input, params[index]));
  validateWireParams(definition, serialized);
  return serialized;
}

export function decodeParamsFromWire(definition: Pick<AbiMethodDefinition, "inputs" | "signature">, params: unknown[]): unknown[] {
  validateWireParams(definition, params);
  return definition.inputs.map((input, index) => decodeFromWire(input, params[index]));
}

export function serializeResultToWire(definition: Pick<AbiMethodDefinition, "outputs" | "signature">, result: unknown): unknown {
  if (definition.outputs.length === 0) {
    return null;
  }
  if (definition.outputs.length === 1) {
    const serialized = serializeToWire(definition.outputs[0], result);
    const validation = buildWireSchema(definition.outputs[0]).safeParse(serialized);
    if (!validation.success) {
      throw new Error(`invalid result for ${definition.signature}: ${validation.error.issues[0]?.message ?? "validation failed"}`);
    }
    return serialized;
  }
  const source = Array.isArray(result) ? result : (result as ArrayLike<unknown>);
  const serialized = definition.outputs.map((output, index) => serializeToWire(output, source[index]));
  definition.outputs.forEach((output, index) => {
    const validation = buildWireSchema(output).safeParse(serialized[index]);
    if (!validation.success) {
      throw new Error(`invalid result item ${index} for ${definition.signature}: ${validation.error.issues[0]?.message ?? "validation failed"}`);
    }
  });
  return serialized;
}

export function decodeResultFromWire(definition: Pick<AbiMethodDefinition, "outputs" | "signature">, payload: unknown): unknown {
  if (definition.outputs.length === 0) {
    return null;
  }
  if (definition.outputs.length === 1) {
    const validation = buildWireSchema(definition.outputs[0]).safeParse(payload);
    if (!validation.success) {
      throw new Error(`invalid response for ${definition.signature}: ${validation.error.issues[0]?.message ?? "validation failed"}`);
    }
    return decodeFromWire(definition.outputs[0], payload);
  }
  if (!Array.isArray(payload)) {
    throw new Error(`invalid response for ${definition.signature}: expected array`);
  }
  if (payload.length !== definition.outputs.length) {
    throw new Error(`invalid response for ${definition.signature}: expected ${definition.outputs.length} outputs`);
  }
  return definition.outputs.map((output, index) => {
    const validation = buildWireSchema(output).safeParse(payload[index]);
    if (!validation.success) {
      throw new Error(`invalid response item ${index} for ${definition.signature}: ${validation.error.issues[0]?.message ?? "validation failed"}`);
    }
    return decodeFromWire(output, payload[index]);
  });
}
