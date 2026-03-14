import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runCatalogListingOperationsWorkflow: vi.fn(),
}));

vi.mock("./catalog-listing-operations.js", async () => {
  const actual = await vi.importActual<typeof import("./catalog-listing-operations.js")>("./catalog-listing-operations.js");
  return {
    ...actual,
    runCatalogListingOperationsWorkflow: mocks.runCatalogListingOperationsWorkflow,
  };
});

import { createWorkflowRouter } from "./index.js";

describe("catalog-listing-operations workflow route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runCatalogListingOperationsWorkflow.mockResolvedValue({
      packaging: {
        before: { datasetId: "11", active: true },
        templateLifecycle: null,
        maintenance: {
          appendAssets: null,
          removeAsset: null,
          setLicense: null,
          setMetadata: null,
          setRoyalty: null,
          setDatasetStatus: null,
        },
        after: { datasetId: "11", active: true },
      },
      listing: {
        inspectionBefore: { summary: { hasListing: true, inEscrow: true } },
        reprice: null,
        cancellation: null,
        release: null,
        relist: null,
        inspectionAfter: { summary: { hasListing: true, inEscrow: true } },
        tradeReadiness: "listed-and-tradable",
        isTradable: true,
        escrowState: { inEscrow: true },
      },
      summary: {
        datasetId: "11",
        templateIdApplied: null,
        packageUpdated: false,
        listingInspected: true,
        listingUpdated: false,
        tradeReadiness: "listed-and-tradable",
        isTradable: true,
        relisted: false,
        released: false,
        activeListing: true,
        datasetActive: true,
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the structured catalog/listing response over the router path", async () => {
    const router = createWorkflowRouter({
      apiKeys: {
        "seller-key": {
          apiKey: "seller-key",
          label: "seller",
          roles: ["service"],
          allowGasless: false,
        },
      },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/catalog-listing-operations");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
        dataset: {
          datasetId: "11",
        },
        listing: {
          inspect: true,
        },
      },
      header(name: string) {
        if (name.toLowerCase() === "x-api-key") {
          return "seller-key";
        }
        return undefined;
      },
    };
    const response = {
      statusCode: 200,
      payload: undefined as unknown,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: unknown) {
        this.payload = payload;
        return this;
      },
    };

    await handler(request, response);

    expect(response.statusCode).toBe(202);
    expect(response.payload).toEqual(expect.objectContaining({
      packaging: expect.any(Object),
      listing: expect.objectContaining({
        tradeReadiness: "listed-and-tradable",
        isTradable: true,
      }),
      summary: expect.objectContaining({
        datasetId: "11",
      }),
    }));
  });

  it("rejects invalid catalog/listing input before invoking child workflows", async () => {
    const router = createWorkflowRouter({
      apiKeys: {
        "seller-key": {
          apiKey: "seller-key",
          label: "seller",
          roles: ["service"],
          allowGasless: false,
        },
      },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/catalog-listing-operations");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
        dataset: {
          datasetId: "bad-id",
        },
      },
      header(name: string) {
        if (name.toLowerCase() === "x-api-key") {
          return "seller-key";
        }
        return undefined;
      },
    };
    const response = {
      statusCode: 200,
      payload: undefined as unknown,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: unknown) {
        this.payload = payload;
        return this;
      },
    };

    await handler(request, response);

    expect(response.statusCode).toBe(400);
    expect(response.payload).toMatchObject({
      error: expect.stringContaining("Invalid"),
    });
    expect(mocks.runCatalogListingOperationsWorkflow).not.toHaveBeenCalled();
  });

  it("rejects conflicting template lifecycle and explicit license id before invoking child workflows", async () => {
    const router = createWorkflowRouter({
      apiKeys: {
        "seller-key": {
          apiKey: "seller-key",
          label: "seller",
          roles: ["service"],
          allowGasless: false,
        },
      },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/catalog-listing-operations");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
        dataset: {
          datasetId: "11",
          templateLifecycle: {
            create: {},
          },
          maintenance: {
            setLicenseTemplateId: "9",
          },
        },
      },
      header(name: string) {
        if (name.toLowerCase() === "x-api-key") {
          return "seller-key";
        }
        return undefined;
      },
    };
    const response = {
      statusCode: 200,
      payload: undefined as unknown,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: unknown) {
        this.payload = payload;
        return this;
      },
    };

    await handler(request, response);

    expect(response.statusCode).toBe(400);
    expect(response.payload).toMatchObject({
      error: expect.stringContaining("setLicenseTemplateId cannot be combined with templateLifecycle"),
    });
    expect(mocks.runCatalogListingOperationsWorkflow).not.toHaveBeenCalled();
  });
});
