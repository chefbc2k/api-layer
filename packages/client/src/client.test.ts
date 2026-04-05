import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  AddressBook: vi.fn(),
  LocalCache: vi.fn(),
  ProviderRouter: vi.fn(),
  createFacetWrappers: vi.fn(),
}));

vi.mock("./runtime/address-book.js", () => ({
  AddressBook: mocks.AddressBook,
}));

vi.mock("./runtime/cache.js", () => ({
  LocalCache: mocks.LocalCache,
}));

vi.mock("./runtime/provider-router.js", () => ({
  ProviderRouter: mocks.ProviderRouter,
}));

vi.mock("./generated/createFacetWrappers.js", () => ({
  createFacetWrappers: mocks.createFacetWrappers,
}));

vi.mock("./generated/subsystems.js", () => ({
  subsystemRegistry: { voiceAssets: ["register"] },
}));

import { createUspeaksClient } from "./client.js";

describe("createUspeaksClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.AddressBook.mockImplementation((addresses) => ({ kind: "address-book", addresses }));
    mocks.LocalCache.mockImplementation(() => ({ kind: "cache" }));
    mocks.ProviderRouter.mockImplementation((options) => ({ kind: "provider-router", options }));
    mocks.createFacetWrappers.mockImplementation((context) => ({ kind: "facets", context }));
  });

  it("requires either a provider router or router options", () => {
    expect(() => createUspeaksClient({
      addresses: { diamond: "0x0000000000000000000000000000000000000001" },
    })).toThrow("createUspeaksClient requires providerRouter or providerRouterOptions");
  });

  it("reuses the provided provider router and cache", () => {
    const providerRouter = { tag: "router" };
    const cache = { tag: "cache" };
    const signerFactory = vi.fn();

    const client = createUspeaksClient({
      providerRouter: providerRouter as never,
      cache: cache as never,
      executionSource: "live",
      signerFactory,
      addresses: {
        diamond: "0x0000000000000000000000000000000000000001",
        facets: { TestFacet: "0x0000000000000000000000000000000000000002" },
      },
    });

    expect(mocks.ProviderRouter).not.toHaveBeenCalled();
    expect(mocks.LocalCache).not.toHaveBeenCalled();
    expect(mocks.AddressBook).toHaveBeenCalledWith({
      diamond: "0x0000000000000000000000000000000000000001",
      facets: { TestFacet: "0x0000000000000000000000000000000000000002" },
    });
    expect(mocks.createFacetWrappers).toHaveBeenCalledWith({
      addressBook: { kind: "address-book", addresses: expect.any(Object) },
      providerRouter,
      cache,
      executionSource: "live",
      signerFactory,
    });
    expect(client).toMatchObject({
      providerRouter,
      cache,
      addressBook: { kind: "address-book" },
      facets: {
        kind: "facets",
        context: expect.objectContaining({
          providerRouter,
          cache,
          executionSource: "live",
          signerFactory,
        }),
      },
      subsystems: { voiceAssets: ["register"] },
    });
  });

  it("builds default router and cache instances when only router options are provided", () => {
    const client = createUspeaksClient({
      providerRouterOptions: { chainId: 84532 } as never,
      addresses: { diamond: "0x0000000000000000000000000000000000000001" },
    });

    expect(mocks.ProviderRouter).toHaveBeenCalledWith({ chainId: 84532 });
    expect(mocks.LocalCache).toHaveBeenCalledOnce();
    expect(client.providerRouter).toEqual({ kind: "provider-router", options: { chainId: 84532 } });
    expect(client.cache).toEqual({ kind: "cache" });
  });
});
