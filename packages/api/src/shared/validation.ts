import { z } from "zod";

import type { AbiParameter, EventRequestSchema, HttpEventDefinition, HttpMethodDefinition, RequestSchemas } from "./route-types.js";

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
    const componentSchemas = Object.fromEntries(
      (param.components ?? []).map((component, index) => [component.name && component.name.length > 0 ? component.name : String(index), buildWireSchema(component)]),
    );
    return z.record(z.string(), z.unknown()).and(z.object(componentSchemas));
  }
  if (/^bytes(\d+)?$/u.test(param.type)) {
    return z.string().regex(/^0x[0-9a-fA-F]*$/u, "invalid hex string");
  }
  return z.unknown();
}

export function buildWireSchema(param: AbiParameter): z.ZodTypeAny {
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

function buildObjectSchema(definition: HttpMethodDefinition, source: "path" | "query" | "body"): z.ZodTypeAny {
  const fields = definition.inputShape.bindings.filter((binding) => binding.source === source);
  if (fields.length === 0) {
    return z.object({}).passthrough();
  }
  const shape = Object.fromEntries(
    fields.map((binding) => {
      const inputIndex = definition.inputShape.bindings.findIndex((candidate) => candidate === binding);
      const input = definition.inputs.find((candidate) => candidate.name === binding.name) ?? definition.inputs[inputIndex];
      if (!input || source !== "body") {
        return [binding.field, z.unknown()];
      }
      return [binding.field, buildWireSchema(input)];
    }),
  );
  return z.object(shape).passthrough();
}

export function buildMethodRequestSchemas(definition: HttpMethodDefinition): RequestSchemas {
  return {
    path: buildObjectSchema(definition, "path"),
    query: buildObjectSchema(definition, "query"),
    body: buildObjectSchema(definition, "body"),
  };
}

export function buildEventRequestSchema(_definition: HttpEventDefinition): EventRequestSchema {
  return {
    body: z.object({
      fromBlock: z.string().regex(/^\d+$/u).optional(),
      toBlock: z.union([z.literal("latest"), z.string().regex(/^\d+$/u)]).optional(),
    }),
  };
}

export function coerceHttpInput(param: AbiParameter, raw: unknown, source: "path" | "query" | "body"): unknown {
  if (raw === undefined || source === "body") {
    return raw;
  }
  if (param.type === "bool" && typeof raw === "string") {
    if (raw === "true") {
      return true;
    }
    if (raw === "false") {
      return false;
    }
  }
  const { lengths, baseType } = parseArrayType(param.type);
  if ((lengths.length > 0 || baseType === "tuple") && typeof raw === "string") {
    return JSON.parse(raw);
  }
  return raw;
}

export function buildWireParams(definition: HttpMethodDefinition, parsed: { path: Record<string, unknown>; query: Record<string, unknown>; body: Record<string, unknown> }): unknown[] {
  return definition.inputs.map((input, index) => {
    const fallbackName = input.name && input.name.length > 0 ? input.name : `arg${index}`;
    const binding = definition.inputShape.bindings.find((candidate) => candidate.name === fallbackName) ??
      definition.inputShape.bindings[index];
    if (!binding) {
      return undefined;
    }
    const raw = binding.source === "path"
      ? parsed.path[binding.field]
      : binding.source === "query"
        ? parsed.query[binding.field]
        : parsed.body[binding.field];
    return coerceHttpInput(input, raw, binding.source);
  });
}
