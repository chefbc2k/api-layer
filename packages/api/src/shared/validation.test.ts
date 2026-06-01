import { describe, expect, it } from "vitest";

import {
  buildEventRequestSchema,
  buildMethodRequestSchemas,
  buildWireParams,
  buildWireSchema,
  coerceHttpInput,
} from "./validation.js";
import type { HttpMethodDefinition } from "./route-types.js";

const writeDefinition: HttpMethodDefinition = {
  key: "MarketplaceFacet.createListing",
  facetName: "MarketplaceFacet",
  wrapperKey: "createListing",
  methodName: "createListing",
  signature: "createListing(uint256,bool,bytes32[2],tuple)",
  category: "write",
  mutability: "nonpayable",
  liveRequired: true,
  cacheClass: "none",
  cacheTtlSeconds: null,
  executionSources: ["live"],
  gaslessModes: [],
  inputs: [
    { name: "assetId", type: "uint256" },
    { name: "featured", type: "bool" },
    { name: "proof", type: "bytes32[2]" },
    {
      name: "licenseConfig",
      type: "tuple",
      components: [
        { name: "licenseHash", type: "bytes32" },
        { name: "recipient", type: "address" },
        { type: "string" },
      ],
    },
    { type: "string" },
  ],
  outputs: [],
  domain: "marketplace",
  resource: "listings",
  classification: "create",
  httpMethod: "POST",
  path: "/v1/marketplace/listings/:assetId",
  inputShape: {
    kind: "path+body",
    bindings: [
      { name: "assetId", source: "path", field: "assetId" },
      { name: "featured", source: "body", field: "featured" },
      { name: "proof", source: "body", field: "proof" },
      { name: "licenseConfig", source: "body", field: "licenseConfig" },
      { name: "arg4", source: "query", field: "note" },
    ],
  },
  outputShape: { kind: "void" },
  operationId: "createMarketplaceListing",
  rateLimitKind: "write",
  supportsGasless: false,
  notes: "",
};

const managedTemplateDefinition: HttpMethodDefinition = {
  key: "VoiceLicenseTemplateFacet.createTemplate",
  facetName: "VoiceLicenseTemplateFacet",
  wrapperKey: "createTemplate",
  methodName: "createTemplate",
  signature: "createTemplate((address,bool,uint256,uint256,(bytes32,bool)))",
  category: "write",
  mutability: "nonpayable",
  liveRequired: true,
  cacheClass: "none",
  cacheTtlSeconds: null,
  executionSources: ["live"],
  gaslessModes: [],
  inputs: [{
    name: "template",
    type: "tuple",
    components: [
      { name: "creator", type: "address" },
      { name: "isActive", type: "bool" },
      { name: "createdAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      {
        name: "terms",
        type: "tuple",
        components: [
          { name: "licenseHash", type: "bytes32" },
          { name: "transferable", type: "bool" },
        ],
      },
    ],
  }],
  outputs: [],
  domain: "licensing",
  resource: "license-templates",
  classification: "create",
  httpMethod: "POST",
  path: "/v1/licensing/license-templates/create-template",
  inputShape: {
    kind: "body",
    bindings: [{ name: "template", source: "body", field: "template" }],
  },
  outputShape: { kind: "void" },
  operationId: "createTemplate",
  rateLimitKind: "write",
  supportsGasless: false,
  notes: "",
};

describe("validation helpers", () => {
  it("validates scalar, tuple, and fixed-array wire schemas", () => {
    expect(buildWireSchema(writeDefinition, { type: "int256" }).parse("-15")).toBe("-15");
    expect(buildWireSchema(writeDefinition, { type: "uint256" }).parse("15")).toBe("15");
    expect(buildWireSchema(writeDefinition, { type: "address" }).parse("0x00000000000000000000000000000000000000AA"))
      .toBe("0x00000000000000000000000000000000000000AA");
    expect(buildWireSchema(writeDefinition, { type: "bool" }).parse(true)).toBe(true);
    expect(buildWireSchema(writeDefinition, { type: "string" }).parse("hello")).toBe("hello");
    expect(buildWireSchema(writeDefinition, { type: "bytes32" }).parse("0x1234")).toBe("0x1234");
    expect(buildWireSchema(writeDefinition, { type: "bytes" }).parse("0xdeadbeef")).toBe("0xdeadbeef");
    expect(buildWireSchema(writeDefinition, { type: "function" }).parse({ opaque: true })).toEqual({ opaque: true });

    const tupleSchema = buildWireSchema(writeDefinition, writeDefinition.inputs[3], ["licenseConfig"]);
    expect(tupleSchema.parse({
      recipient: "0x00000000000000000000000000000000000000BB",
      2: "terms-v1",
    })).toEqual({
      licenseHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
      recipient: "0x00000000000000000000000000000000000000BB",
      2: "terms-v1",
    });

    const fixedArraySchema = buildWireSchema(writeDefinition, { type: "bytes32[2]" });
    expect(fixedArraySchema.parse(["0x01", "0x02"])).toEqual(["0x01", "0x02"]);
    expect(() => fixedArraySchema.parse(["0x01"])).toThrow("expected array length 2");
    expect(() => buildWireSchema(writeDefinition, { type: "uint256" }).parse("1.5")).toThrow("invalid uint256 decimal string");
    expect(() => buildWireSchema(writeDefinition, { type: "address" }).parse("0x1234")).toThrow("invalid address");

    expect(buildWireSchema(writeDefinition, { type: "]" }).parse("opaque")).toBe("opaque");
  });

  it("builds method and event schemas from the route definition", () => {
    const schemas = buildMethodRequestSchemas(writeDefinition);
    expect(schemas.path.parse({ assetId: "12", extra: true })).toEqual({ assetId: "12", extra: true });
    expect(schemas.query.parse({ note: 42 })).toEqual({ note: 42 });
    expect(schemas.body.parse({
      featured: true,
      proof: ["0x01", "0x02"],
      licenseConfig: {
        recipient: "0x00000000000000000000000000000000000000BB",
        2: "terms-v1",
      },
    })).toEqual({
      featured: true,
      proof: ["0x01", "0x02"],
      licenseConfig: {
        licenseHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        recipient: "0x00000000000000000000000000000000000000BB",
        2: "terms-v1",
      },
    });

    const noInputSchemas = buildMethodRequestSchemas({
      ...writeDefinition,
      inputs: [],
      inputShape: { kind: "none", bindings: [] },
    });
    expect(noInputSchemas.body.parse({ passthrough: true })).toEqual({ passthrough: true });

    const eventSchema = buildEventRequestSchema({
      key: "MarketplaceFacet.ListingCreated",
      facetName: "MarketplaceFacet",
      wrapperKey: "ListingCreated",
      eventName: "ListingCreated",
      signature: "ListingCreated(uint256)",
      topicHash: null,
      anonymous: false,
      inputs: [],
      projection: { domain: "marketplace", projectionMode: "rawOnly", targets: [] },
      domain: "marketplace",
      operationId: "listingCreatedEventQuery",
      httpMethod: "POST",
      path: "/v1/events/listing-created",
      notes: "",
    });
    expect(eventSchema.body.parse({ fromBlock: "10", toBlock: "latest" })).toEqual({
      fromBlock: "10",
      toBlock: "latest",
    });
    expect(eventSchema.body.parse({ toBlock: "12" })).toEqual({ toBlock: "12" });
  });

  it("coerces query and path values into wire parameters", () => {
    expect(coerceHttpInput({ type: "bool" }, "true", "query")).toBe(true);
    expect(coerceHttpInput({ type: "bool" }, "false", "query")).toBe(false);
    expect(coerceHttpInput({ type: "bool" }, "TRUE", "query")).toBe("TRUE");
    expect(coerceHttpInput({ type: "tuple" }, "{\"recipient\":\"0xabc\"}", "query")).toEqual({ recipient: "0xabc" });
    expect(coerceHttpInput({ type: "bytes32[]" }, "[\"0x1\"]", "path")).toEqual(["0x1"]);
    expect(() => coerceHttpInput({ type: "tuple" }, "{not-json", "query")).toThrow(SyntaxError);
    expect(coerceHttpInput({ type: "uint256" }, "12", "query")).toBe("12");
    expect(coerceHttpInput({ type: "uint256" }, undefined, "query")).toBeUndefined();
    expect(coerceHttpInput({ type: "uint256" }, "15", "body")).toBe("15");

    expect(buildWireParams(writeDefinition, {
      path: { assetId: "12" },
      query: { note: "alpha" },
      body: {
        featured: false,
        proof: "[\"0x01\",\"0x02\"]",
        licenseConfig: "{\"recipient\":\"0x00000000000000000000000000000000000000BB\",\"2\":\"terms-v1\"}",
      },
    })).toEqual([
      "12",
      false,
      "[\"0x01\",\"0x02\"]",
      "{\"recipient\":\"0x00000000000000000000000000000000000000BB\",\"2\":\"terms-v1\"}",
      "alpha",
    ]);
  });

  it("defaults managed template identity fields while preserving explicit passthrough values", () => {
    const schema = buildWireSchema(managedTemplateDefinition, managedTemplateDefinition.inputs[0], ["template"]);

    expect(schema.parse({
      isActive: true,
      terms: {
        transferable: false,
      },
    })).toEqual({
      creator: "0x0000000000000000000000000000000000000000",
      isActive: true,
      createdAt: "0",
      updatedAt: "0",
      terms: {
        licenseHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        transferable: false,
      },
    });

    expect(schema.parse({
      creator: "0x00000000000000000000000000000000000000CC",
      isActive: false,
      createdAt: "12",
      updatedAt: "13",
      terms: {
        licenseHash: "0x" + "11".repeat(32),
        transferable: true,
      },
    })).toEqual({
      creator: "0x00000000000000000000000000000000000000CC",
      isActive: false,
      createdAt: "12",
      updatedAt: "13",
      terms: {
        licenseHash: "0x" + "11".repeat(32),
        transferable: true,
      },
    });
  });

  it("only defaults top-level managed template identity fields and preserves nested tuple values", () => {
    const nestedManagedDefinition: HttpMethodDefinition = {
      ...managedTemplateDefinition,
      inputs: [{
        name: "template",
        type: "tuple",
        components: [
          { name: "creator", type: "address" },
          { name: "createdAt", type: "uint256" },
          { name: "updatedAt", type: "uint256" },
          {
            name: "terms",
            type: "tuple",
            components: [
              { name: "creator", type: "address" },
              { name: "createdAt", type: "uint256" },
              { name: "updatedAt", type: "uint256" },
            ],
          },
        ],
      }],
    };

    const schema = buildWireSchema(nestedManagedDefinition, nestedManagedDefinition.inputs[0], ["template"]);

    expect(schema.parse({
      terms: {
        creator: "0x00000000000000000000000000000000000000DD",
        createdAt: "44",
        updatedAt: "45",
      },
    })).toEqual({
      creator: "0x0000000000000000000000000000000000000000",
      createdAt: "0",
      updatedAt: "0",
      terms: {
        creator: "0x00000000000000000000000000000000000000DD",
        createdAt: "44",
        updatedAt: "45",
      },
    });
  });

  it("falls back to unknown schemas for non-body bindings and unnamed body inputs", () => {
    const definition = {
      ...writeDefinition,
      inputs: [{ type: "string" }],
      inputShape: {
        kind: "path+query+body",
        bindings: [
          { name: "missingPath", source: "path", field: "assetId" },
          { name: "missingQuery", source: "query", field: "note" },
          { name: "missingBody", source: "body", field: "payload" },
        ],
      },
    };

    const schemas = buildMethodRequestSchemas(definition);
    expect(schemas.path.parse({ assetId: 12 })).toEqual({ assetId: 12 });
    expect(schemas.query.parse({ note: false })).toEqual({ note: false });
    expect(schemas.body.parse({ payload: { opaque: true } })).toEqual({ payload: { opaque: true } });
  });

  it("returns undefined for unbound inputs", () => {
    const definition = {
      ...writeDefinition,
      inputs: [
        { name: "assetId", type: "uint256" },
        { name: "unbound", type: "string" },
      ],
      inputShape: {
        kind: "path",
        bindings: [{ name: "assetId", source: "path", field: "assetId" }],
      },
    };

    expect(buildWireParams(definition, {
      path: { assetId: "88" },
      query: {},
      body: {},
    })).toEqual(["88", undefined]);
  });
});
