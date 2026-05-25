import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ensureActiveLicenseTemplate, type ApiCall } from "./license-template-helper.ts";

describe("ensureActiveLicenseTemplate", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reuses the newest active creator template and tracks registry routes", async () => {
    const calls: Array<{ method: string; path: string }> = [];
    const routes: string[] = [];
    const apiCall: ApiCall = vi.fn(async (_port, method, path) => {
      calls.push({ method, path });
      if (path === "/creator/0xCreator") {
        return { status: 200, payload: ["0x01", "0x02"] };
      }
      if (path === "/template/0x02") {
        return { status: 200, payload: { isActive: true } };
      }
      throw new Error(`unexpected path ${path}`);
    });

    const result = await ensureActiveLicenseTemplate({
      port: 8453,
      provider: { getTransactionReceipt: vi.fn() } as never,
      apiCall,
      creatorAddress: "0xCreator",
      label: "Verifier",
      endpointRegistry: {
        "VoiceLicenseTemplateFacet.getCreatorTemplates": {
          httpMethod: "GET",
          path: "/creator/:creator",
          inputShape: { kind: "query", bindings: [] },
        },
        "VoiceLicenseTemplateFacet.getTemplate": {
          httpMethod: "GET",
          path: "/template/:templateHash",
          inputShape: { kind: "query", bindings: [] },
        },
        "VoiceLicenseTemplateFacet.createTemplate": {
          httpMethod: "POST",
          path: "/template/create",
          inputShape: { kind: "body", bindings: [] },
        },
      },
      buildPath(definition, params) {
        if (definition.path === "/creator/:creator") {
          return `/creator/${params.creator}`;
        }
        return `/template/${params.templateHash}`;
      },
      onRoute(route) {
        routes.push(route);
      },
    });

    expect(result).toEqual({
      templateHashHex: "0x02",
      templateIdDecimal: "2",
      created: false,
    });
    expect(routes).toEqual([
      "GET /creator/:creator",
      "GET /template/:templateHash",
      "POST /template/create",
    ]);
    expect(calls).toEqual([
      { method: "GET", path: "/creator/0xCreator" },
      { method: "GET", path: "/template/0x02" },
    ]);
  });

  it("creates a default template when no active template exists and waits for the receipt", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_735_337_245_857);
    const provider = {
      getTransactionReceipt: vi.fn().mockResolvedValue({ status: 1, blockNumber: 123 }),
    };
    const apiCall: ApiCall = vi.fn(async (_port, method, path, options) => {
      if (path.includes("get-creator-templates")) {
        return { status: 200, payload: ["0x10"] };
      }
      if (path.includes("get-template")) {
        return { status: 200, payload: { isActive: false } };
      }
      expect(method).toBe("POST");
      expect(path).toBe("/v1/licensing/license-templates/create-template");
      expect(options).toMatchObject({
        apiKey: "founder-key",
        body: {
          template: {
            isActive: true,
            transferable: true,
            defaultDuration: String(45n * 24n * 60n * 60n),
            defaultPrice: "15000",
            maxUses: "12",
            name: "Dataset Verifier 1735337245857",
            description: "Auto-created for Layer 1 dataset verification",
            defaultRights: ["Narration", "Ads"],
            defaultRestrictions: ["no-sublicense"],
            terms: {
              licenseHash: `0x${"0".repeat(64)}`,
              duration: String(45n * 24n * 60n * 60n),
              price: "15000",
              maxUses: "12",
              transferable: true,
              rights: ["Narration", "Ads"],
              restrictions: ["no-sublicense"],
            },
          },
        },
      });
      return {
        status: 202,
        payload: {
          txHash: "0xabc",
          result: "0x20",
        },
      };
    });

    const result = await ensureActiveLicenseTemplate({
      port: 8453,
      provider: provider as never,
      apiCall,
      creatorAddress: "0xCreator",
      label: "Dataset Verifier",
    });

    expect(result).toEqual({
      templateHashHex: "0x20",
      templateIdDecimal: "32",
      created: true,
    });
    expect(provider.getTransactionReceipt).toHaveBeenCalledWith("0xabc");
  });

  it("throws when template creation does not return an accepted write", async () => {
    const apiCall: ApiCall = vi.fn(async (_port, _method, path) => {
      if (path.includes("get-creator-templates")) {
        return { status: 200, payload: [] };
      }
      return { status: 400, payload: { error: "bad request" } };
    });

    await expect(
      ensureActiveLicenseTemplate({
        port: 8453,
        provider: { getTransactionReceipt: vi.fn() } as never,
        apiCall,
        creatorAddress: "0xCreator",
        label: "Verifier",
      }),
    ).rejects.toThrow('license template create failed: {"error":"bad request"}');
  });

  it("throws when template creation returns an invalid hash payload", async () => {
    const apiCall: ApiCall = vi.fn(async (_port, _method, path) => {
      if (path.includes("get-creator-templates")) {
        return { status: 200, payload: [] };
      }
      return {
        status: 202,
        payload: {
          result: "not-a-hash",
        },
      };
    });

    await expect(
      ensureActiveLicenseTemplate({
        port: 8453,
        provider: { getTransactionReceipt: vi.fn() } as never,
        apiCall,
        creatorAddress: "0xCreator",
        label: "Verifier",
      }),
    ).rejects.toThrow('license template create returned invalid hash: {"result":"not-a-hash"}');
  });

  it("treats non-object create payloads as missing tx hashes and invalid template hashes", async () => {
    const provider = {
      getTransactionReceipt: vi.fn(),
    };
    const apiCall: ApiCall = vi.fn(async (_port, _method, path) => {
      if (path.includes("get-creator-templates")) {
        return { status: 200, payload: [] };
      }
      return {
        status: 202,
        payload: "0xnot-an-object",
      };
    });

    await expect(
      ensureActiveLicenseTemplate({
        port: 8453,
        provider: provider as never,
        apiCall,
        creatorAddress: "0xCreator",
        label: "Verifier",
      }),
    ).rejects.toThrow('license template create returned invalid hash: "0xnot-an-object"');
    expect(provider.getTransactionReceipt).not.toHaveBeenCalled();
  });

  it("accepts a created template response that omits txHash when the hash result is still valid", async () => {
    const provider = {
      getTransactionReceipt: vi.fn(),
    };
    const apiCall: ApiCall = vi.fn(async (_port, _method, path) => {
      if (path.includes("get-creator-templates")) {
        return { status: 200, payload: [] };
      }
      return {
        status: 202,
        payload: {
          result: "0x21",
        },
      };
    });

    await expect(
      ensureActiveLicenseTemplate({
        port: 8453,
        provider: provider as never,
        apiCall,
        creatorAddress: "0xCreator",
        label: "Verifier",
      }),
    ).resolves.toEqual({
      templateHashHex: "0x21",
      templateIdDecimal: "33",
      created: true,
    });
    expect(provider.getTransactionReceipt).not.toHaveBeenCalled();
  });

  it("creates a template when creator templates payload is malformed and uses endpoint defaults without a path builder", async () => {
    const apiCall: ApiCall = vi.fn(async (_port, method, path, options) => {
      if (path === "/v1/licensing/queries/get-creator-templates?creator=0xCreator") {
        return { status: 200, payload: { unexpected: true } };
      }
      expect(method).toBe("POST");
      expect(path).toBe("/custom/template/create");
      expect(options?.apiKey).toBe("writer-key");
      return {
        status: 202,
        payload: {
          result: "0x30",
        },
      };
    });

    await expect(
      ensureActiveLicenseTemplate({
        port: 8453,
        provider: { getTransactionReceipt: vi.fn() } as never,
        apiCall,
        creatorAddress: "0xCreator",
        label: "Verifier",
        writeApiKey: "writer-key",
        endpointRegistry: {
          "VoiceLicenseTemplateFacet.createTemplate": {
            httpMethod: "POST",
            path: "/custom/template/create",
            inputShape: { kind: "body", bindings: [] },
          },
        },
      }),
    ).resolves.toEqual({
      templateHashHex: "0x30",
      templateIdDecimal: "48",
      created: true,
    });
  });

  it("times out when the template creation receipt never arrives", async () => {
    vi.useFakeTimers();
    const provider = {
      getTransactionReceipt: vi.fn().mockResolvedValue(null),
    };
    const apiCall: ApiCall = vi.fn(async (_port, _method, path) => {
      if (path.includes("get-creator-templates")) {
        return { status: 200, payload: [] };
      }
      return {
        status: 202,
        payload: {
          txHash: "0xdef",
          result: "0x21",
        },
      };
    });

    const pending = ensureActiveLicenseTemplate({
      port: 8453,
      provider: provider as never,
      apiCall,
      creatorAddress: "0xCreator",
      label: "Verifier",
    });
    const assertion = expect(pending).rejects.toThrow("timed out waiting for license template create receipt: 0xdef");
    await vi.runAllTimersAsync();
    await assertion;
    expect(provider.getTransactionReceipt).toHaveBeenCalledTimes(120);
  });
});
