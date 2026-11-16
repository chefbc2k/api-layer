import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const sdkRequire = createRequire(require.resolve("@coinbase/cdp-sdk"));
// Resolve the actual SDK dependency, not the API's separate Zod 4 installation.
const cjs = sdkRequire("zod").z;
const zodRoot = dirname(sdkRequire.resolve("zod/package.json"));
const sdkRoot = dirname(sdkRequire.resolve("@coinbase/cdp-sdk"));

describe("SDK Zod 3 upper-bound security backport", () => {
  for (const dialect of ["cjs", "esm"] as const) {
    async function schemaLibrary() {
      return dialect === "cjs" ? cjs : (await import(pathToFileURL(join(zodRoot, "index.js")).href)).z;
    }
    it(`${dialect}: rejects oversized max/exact arrays before touching elements, preserving nested issue paths`, async () => {
      const z = await schemaLibrary();
      for (const schema of [z.array(z.string()).max(2, "bounded"), z.array(z.string()).length(2, "bounded")]) {
        let touched = 0;
        const input = new Array(20);
        Object.defineProperty(input, 0, { get() { touched++; throw new Error("must not traverse"); } });
        const result = z.object({ rules: schema }).safeParse({ rules: input });
        expect(result.success).toBe(false);
        expect(result.error.issues).toMatchObject([{ code: "too_big", path: ["rules"], message: "bounded" }]);
        expect(result.error.issues).toHaveLength(1);
        expect(touched).toBe(0);
      }
    });
    it(`${dialect}: rejects over-limit async arrays/sets without running element refinements`, async () => {
      const z = await schemaLibrary();
      let parsed = 0;
      const element = z.string().refine(async () => { parsed++; return true; });
      for (const [schema, value] of [[z.array(element).max(1), ["a", "b"]], [z.set(element).max(1), new Set(["a", "b"])]]) {
        const result = await schema.safeParseAsync(value);
        expect(result.success).toBe(false);
        expect(result.error.issues).toHaveLength(1);
        expect(result.error.issues[0].code).toBe("too_big");
      }
      expect(parsed).toBe(0);
    });
    it(`${dialect}: preserves valid boundary values, lower bounds, transformations and element errors`, async () => {
      const z = await schemaLibrary();
      expect(z.array(z.string().transform((s: string) => s.toUpperCase())).max(2).parse(["a", "b"])).toEqual(["A", "B"]);
      expect(z.array(z.string()).length(2).safeParse(["a"]).error.issues[0].code).toBe("too_small");
      expect(z.array(z.string()).max(2).safeParse([1]).error.issues[0].path).toEqual([0]);
      expect(z.set(z.string()).max(2).parse(new Set(["a", "b"]))).toEqual(new Set(["a", "b"]));
      expect(z.set(z.string()).min(1).safeParse(new Set()).error.issues[0].code).toBe("too_small");
      expect(z.array(z.string()).safeParse({}).error.issues[0].code).toBe("invalid_type");
    });
  }
  for (const dialect of ["cjs", "esm"] as const) {
    for (const edition of ["v4", "v4/mini"]) {
      it(`${dialect} ${edition}: rejects bounded arrays, maps and sets without element traversal`, async () => {
        const lib = dialect === "cjs" ? sdkRequire(`zod/${edition}`) : await import(pathToFileURL(join(zodRoot, edition, "index.js")).href);
        let parsed = 0;
        const element = lib.string().check(lib.refine(() => { parsed++; return true; }));
        const cases = [
          [lib.array(element).check(lib.maxLength(1)), ["a", "b"]],
          [lib.array(element).check(lib.length(1)), ["a", "b"]],
          [lib.set(element).check(lib.maxSize(1)), new Set(["a", "b"])],
          [lib.map(element, element).check(lib.maxSize(1)), new Map([["a", "b"], ["c", "d"]])],
        ];
        for (const [schema, input] of cases) {
          const result = await lib.safeParseAsync(schema, input);
          expect(result.success).toBe(false);
          expect(result.error.issues).toHaveLength(1);
          expect(result.error.issues[0].code).toBe("too_big");
        }
        expect(parsed).toBe(0);
        expect(lib.parse(lib.array(lib.string()).check(lib.maxLength(2)), ["a", "b"])).toEqual(["a", "b"]);
        expect(lib.safeParse(lib.set(lib.string()).check(lib.maxSize(1)), []).error.issues[0].code).toBe("invalid_type");
      });
    }
    it(`${dialect} v4: preserves an earlier rewriting check before a later upper bound`, async () => {
      const lib = dialect === "cjs" ? sdkRequire("zod/v4") : await import(pathToFileURL(join(zodRoot, "v4/index.js")).href);
      expect(lib.array(lib.number()).overwrite((a: number[]) => a.slice(0, 2)).max(2).parse([1, 2, 3])).toEqual([1, 2]);
    });
  }
  it("uses patched Zod 3 below the real SDK and bounds create/update policy traversal", () => {
    expect(sdkRequire("zod/package.json").version).toBe("3.25.76");
    const sdk = sdkRequire("@coinbase/cdp-sdk");
    const policy = { scope: "account", rules: [{ operation: "signEvmHash", action: "reject" }] };
    expect(sdk.CreatePolicyBodySchema.parse(policy)).toEqual(policy);
    expect(sdk.UpdatePolicyBodySchema.parse({ rules: policy.rules })).toEqual({ rules: policy.rules });
    for (const schema of [sdk.CreatePolicyBodySchema, sdk.UpdatePolicyBodySchema]) {
      const result = schema.safeParse({ ...policy, rules: new Array(500).fill(null) });
      expect(result.success).toBe(false);
      expect(result.error.issues).toMatchObject([{ code: "too_big", path: ["rules"], maximum: 10 }]);
      expect(result.error.issues).toHaveLength(1);
    }
    const evm = sdkRequire(join(sdkRoot, "policies/evmSchema.js"));
    const result = evm.EvmAddressCriterionSchema.safeParse({ type: "evmAddress", operator: "in", addresses: new Array(301).fill("invalid") });
    expect(result.error.issues).toMatchObject([{ code: "too_big", path: ["addresses"], maximum: 300 }]);
    expect(result.error.issues).toHaveLength(1);
  });
});
