import { z } from "zod";

import type { AbiParameter, EventRequestSchema, HttpEventDefinition, HttpMethodDefinition, RequestSchemas } from "./route-types.js";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ZERO_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000";
const TEMPLATE_IDENTITY_MANAGED_KEYS = new Set<string>([]);

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

function isManagedTemplateIdentityField(definition: HttpMethodDefinition, path: string[], component: AbiParameter): boolean {
  return TEMPLATE_IDENTITY_MANAGED_KEYS.has(definition.key) &&
    path[0] === "template" &&
    ["creator", "createdAt", "updatedAt"].includes(component.name ?? "");
}

function isManagedTemplateTuple(definition: HttpMethodDefinition, path: string[]): boolean {
  return TEMPLATE_IDENTITY_MANAGED_KEYS.has(definition.key) && path[0] === "template";
}

function buildWireScalarSchema(definition: HttpMethodDefinition, param: AbiParameter, path: string[]): z.ZodTypeAny {
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
      (param.components ?? [])
        .filter((component, index) => {
          const key = component.name && component.name.length > 0 ? component.name : String(index);
          return !isManagedTemplateIdentityField(definition, [...path, key], component);
        })
        .map((component, index) => {
          const key = component.name && component.name.length > 0 ? component.name : String(index);
          let schema = buildWireSchema(definition, component, [...path, key]);
          if (component.name === "licenseHash" && component.type === "bytes32") {
            schema = schema.optional().default(ZERO_HASH);
          }
          return [key, schema];
        }),
    );
    const objectSchema = z.object(componentSchemas).passthrough();
    if (isManagedTemplateTuple(definition, path)) {
      return objectSchema.transform((value) => ({
        creator: ZERO_ADDRESS,
        createdAt: "0",
        updatedAt: "0",
        ...value,
      }));
    }
    return objectSchema;
  }
  if (/^bytes(\d+)?$/u.test(param.type)) {
    return z.string().regex(/^0x[0-9a-fA-F]*$/u, "invalid hex string");
  }
  return z.unknown();
}

export function buildWireSchema(definition: HttpMethodDefinition, param: AbiParameter, path: string[] = []): z.ZodTypeAny {
  const { baseType, lengths } = parseArrayType(param.type);
  const scalarParam = { ...param, type: baseType };
  let schema = buildWireScalarSchema(definition, scalarParam, path);
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
      return [binding.field, buildWireSchema(definition, input, [binding.field])];
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
