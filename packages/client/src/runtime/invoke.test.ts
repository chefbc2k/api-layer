import { beforeEach, describe, expect, it, vi } from "vitest";
import { Interface, type Log } from "ethers";

const mocks = vi.hoisted(() => ({
  contractCalls: [] as Array<{ args: unknown[]; runner: unknown }>,
  functionImpl: vi.fn(),
}));

vi.mock("ethers", async () => {
  const actual = await vi.importActual<typeof import("ethers")>("ethers");

  class MockContract {
    constructor(_address: string, _abi: unknown, readonly runner: unknown) {}

    getFunction(_methodName: string) {
      return (...args: unknown[]) => {
        mocks.contractCalls.push({ args, runner: this.runner });
        return mocks.functionImpl(...args);
      };
    }
  }

  return {
    ...actual,
    Contract: MockContract,
  };
});

vi.mock("../generated/registry.js", () => ({
  facetRegistry: {
    AccessControlFacet: {
      abi: [
        "function readValue(uint256 value) view returns (uint256)",
        "function writeValue(uint256 value) returns (uint256)",
        "event ValueSet(uint256 indexed value)",
      ],
    },
  },
}));

import { decodeLog, invokeRead, invokeWrite, queryEvent } from "./invoke.js";

describe("invoke runtime helpers", () => {
  beforeEach(() => {
    mocks.contractCalls.length = 0;
    mocks.functionImpl.mockReset();
  });

  it("returns cached reads without touching the provider", async () => {
    const providerRouter = { withProvider: vi.fn() };
    const cache = { get: vi.fn().mockReturnValue("cached"), set: vi.fn() };

    const result = await invokeRead({
      executionSource: "fixture",
      providerRouter,
      cache,
      addressBook: { resolveFacetAddress: vi.fn() },
    } as never, "AccessControlFacet", "readValue", [1], false, 60);

    expect(result).toBe("cached");
    expect(cache.get).toHaveBeenCalledWith("AccessControlFacet:readValue:[1]");
    expect(providerRouter.withProvider).not.toHaveBeenCalled();
  });

  it("executes uncached reads through the provider and stores the result", async () => {
    const provider = { tag: "provider" };
    const signer = { tag: "signer" };
    const providerRouter = {
      withProvider: vi.fn().mockImplementation(async (_mode, _method, work) => work(provider)),
    };
    const cache = { get: vi.fn().mockReturnValue(null), set: vi.fn() };
    const addressBook = { resolveFacetAddress: vi.fn().mockReturnValue("0x0000000000000000000000000000000000000001") };
    const signerFactory = vi.fn().mockResolvedValue(signer);
    mocks.functionImpl.mockResolvedValue("fresh");

    const result = await invokeRead({
      executionSource: "fixture",
      providerRouter,
      cache,
      addressBook,
      signerFactory,
    } as never, "AccessControlFacet", "readValue", [7n], false, 120);

    expect(result).toBe("fresh");
    expect(providerRouter.withProvider).toHaveBeenCalledWith("read", "AccessControlFacet.readValue", expect.any(Function));
    expect(signerFactory).toHaveBeenCalledWith(provider);
    expect(addressBook.resolveFacetAddress).toHaveBeenCalledWith("AccessControlFacet");
    expect(mocks.contractCalls).toEqual([{ args: [7n], runner: signer }]);
    expect(cache.set).toHaveBeenCalledWith("AccessControlFacet:readValue:[\"7\"]", "fresh", 120);
  });

  it("bypasses cache on live reads and uses the provider when no signer factory exists", async () => {
    const provider = { tag: "provider" };
    const providerRouter = {
      withProvider: vi.fn().mockImplementation(async (_mode, _method, work) => work(provider)),
    };
    const cache = { get: vi.fn(), set: vi.fn() };
    const addressBook = { resolveFacetAddress: vi.fn().mockReturnValue("0x0000000000000000000000000000000000000001") };
    mocks.functionImpl.mockResolvedValue("live");

    const result = await invokeRead({
      executionSource: "live",
      providerRouter,
      cache,
      addressBook,
    } as never, "AccessControlFacet", "readValue", [3], false, 60);

    expect(result).toBe("live");
    expect(cache.get).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
    expect(mocks.contractCalls).toEqual([{ args: [3], runner: provider }]);
  });

  it("bypasses cache for fixture reads when the endpoint is marked live-required", async () => {
    const provider = { tag: "provider" };
    const providerRouter = {
      withProvider: vi.fn().mockImplementation(async (_mode, _method, work) => work(provider)),
    };
    const cache = { get: vi.fn(), set: vi.fn() };
    const addressBook = { resolveFacetAddress: vi.fn().mockReturnValue("0x0000000000000000000000000000000000000001") };
    mocks.functionImpl.mockResolvedValue("fresh-live-required");

    const result = await invokeRead({
      executionSource: "fixture",
      providerRouter,
      cache,
      addressBook,
    } as never, "AccessControlFacet", "readValue", [5], true, 60);

    expect(result).toBe("fresh-live-required");
    expect(cache.get).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
    expect(mocks.contractCalls).toEqual([{ args: [5], runner: provider }]);
  });

  it("bypasses cache for fixture reads when the TTL is disabled", async () => {
    const provider = { tag: "provider" };
    const providerRouter = {
      withProvider: vi.fn().mockImplementation(async (_mode, _method, work) => work(provider)),
    };
    const cache = { get: vi.fn(), set: vi.fn() };
    const addressBook = { resolveFacetAddress: vi.fn().mockReturnValue("0x0000000000000000000000000000000000000001") };
    mocks.functionImpl.mockResolvedValue("fresh-no-ttl");

    const result = await invokeRead({
      executionSource: "fixture",
      providerRouter,
      cache,
      addressBook,
    } as never, "AccessControlFacet", "readValue", [6], false, null);

    expect(result).toBe("fresh-no-ttl");
    expect(cache.get).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
    expect(mocks.contractCalls).toEqual([{ args: [6], runner: provider }]);
  });

  it("requires signerFactory for writes and forwards writes through the write provider", async () => {
    await expect(invokeWrite({
      providerRouter: { withProvider: vi.fn() },
    } as never, "AccessControlFacet", "writeValue", [1])).rejects.toThrow("requires signerFactory");

    const provider = { tag: "provider" };
    const signer = { tag: "writer" };
    const providerRouter = {
      withProvider: vi.fn().mockImplementation(async (_mode, _method, work) => work(provider)),
    };
    const signerFactory = vi.fn().mockResolvedValue(signer);
    const addressBook = { resolveFacetAddress: vi.fn().mockReturnValue("0x0000000000000000000000000000000000000001") };
    mocks.functionImpl.mockResolvedValue("written");

    await expect(invokeWrite({
      providerRouter,
      signerFactory,
      addressBook,
    } as never, "AccessControlFacet", "writeValue", [9])).resolves.toBe("written");

    expect(providerRouter.withProvider).toHaveBeenCalledWith("write", "AccessControlFacet.writeValue", expect.any(Function));
    expect(mocks.contractCalls).toEqual([{ args: [9], runner: signer }]);
  });

  it("queries and decodes logs through the event provider", async () => {
    const iface = new Interface(["event ValueSet(uint256 indexed value)"]);
    const fragment = iface.getEvent("ValueSet");
    const encoded = iface.encodeEventLog(fragment!, [55n]);
    const log = {
      address: "0x0000000000000000000000000000000000000001",
      data: encoded.data,
      topics: encoded.topics,
      transactionHash: "0xtx",
      blockHash: "0xblock",
      blockNumber: 123,
      index: 0,
      removed: false,
    } as unknown as Log;
    const provider = { getLogs: vi.fn().mockResolvedValue([log]) };
    const providerRouter = {
      withProvider: vi.fn().mockImplementation(async (_mode, _method, work) => work(provider)),
    };
    const addressBook = { resolveFacetAddress: vi.fn().mockReturnValue("0x0000000000000000000000000000000000000001") };

    await expect(queryEvent({
      providerRouter,
      addressBook,
    } as never, "AccessControlFacet", "ValueSet", 120n, 130n)).resolves.toEqual([log]);

    expect(provider.getLogs).toHaveBeenCalledWith({
      address: "0x0000000000000000000000000000000000000001",
      topics: [fragment!.topicHash],
      fromBlock: 120,
      toBlock: 130,
    });
    expect(decodeLog("AccessControlFacet", log)?.args.toObject()).toMatchObject({ value: 55n });
    expect(decodeLog("AccessControlFacet", { ...log, topics: ["0xdeadbeef"] } as unknown as Log)).toBeNull();
  });

  it("supports latest-block event queries and surfaces unknown event lookups", async () => {
    const provider = { getLogs: vi.fn().mockResolvedValue([]) };
    const providerRouter = {
      withProvider: vi.fn().mockImplementation(async (_mode, _method, work) => work(provider)),
    };
    const addressBook = { resolveFacetAddress: vi.fn().mockReturnValue("0x0000000000000000000000000000000000000001") };

    await expect(queryEvent({
      providerRouter,
      addressBook,
    } as never, "AccessControlFacet", "ValueSet", undefined, "latest")).resolves.toEqual([]);

    expect(provider.getLogs).toHaveBeenCalledWith({
      address: "0x0000000000000000000000000000000000000001",
      topics: [expect.any(String)],
      fromBlock: undefined,
      toBlock: "latest",
    });

    await expect(queryEvent({
      providerRouter,
      addressBook,
    } as never, "AccessControlFacet", "MissingEvent")).rejects.toThrow();
  });

  it("surfaces explicit unknown-event null fragments from the interface lookup", async () => {
    const provider = { getLogs: vi.fn().mockResolvedValue([]) };
    const providerRouter = {
      withProvider: vi.fn().mockImplementation(async (_mode, _method, work) => work(provider)),
    };
    const addressBook = { resolveFacetAddress: vi.fn().mockReturnValue("0x0000000000000000000000000000000000000001") };
    const getEventSpy = vi.spyOn(Interface.prototype, "getEvent").mockReturnValueOnce(null as never);

    await expect(queryEvent({
      providerRouter,
      addressBook,
    } as never, "AccessControlFacet", "ValueSet")).rejects.toThrow("unknown event AccessControlFacet.ValueSet");

    expect(provider.getLogs).not.toHaveBeenCalled();
    getEventSpy.mockRestore();
  });

  it("returns null when log decoding throws", () => {
    const parseLogSpy = vi.spyOn(Interface.prototype, "parseLog").mockImplementationOnce(() => {
      throw new Error("bad log");
    });

    expect(decodeLog("AccessControlFacet", { topics: ["0xdeadbeef"] } as unknown as Log)).toBeNull();

    parseLogSpy.mockRestore();
  });

  it("omits both block bounds when callers pass nullish filters", async () => {
    const provider = { getLogs: vi.fn().mockResolvedValue([]) };
    const providerRouter = {
      withProvider: vi.fn().mockImplementation(async (_mode, _method, work) => work(provider)),
    };
    const addressBook = { resolveFacetAddress: vi.fn().mockReturnValue("0x0000000000000000000000000000000000000001") };

    await expect(queryEvent({
      providerRouter,
      addressBook,
    } as never, "AccessControlFacet", "ValueSet", undefined, undefined)).resolves.toEqual([]);

    expect(provider.getLogs).toHaveBeenCalledWith({
      address: "0x0000000000000000000000000000000000000001",
      topics: [expect.any(String)],
      fromBlock: undefined,
      toBlock: undefined,
    });
  });

  it("omits bounded block filters when callers pass nullish values", async () => {
    const provider = { getLogs: vi.fn().mockResolvedValue([]) };
    const providerRouter = {
      withProvider: vi.fn().mockImplementation(async (_mode, _method, work) => work(provider)),
    };
    const addressBook = { resolveFacetAddress: vi.fn().mockReturnValue("0x0000000000000000000000000000000000000001") };

    await expect(queryEvent({
      providerRouter,
      addressBook,
    } as never, "AccessControlFacet", "ValueSet", null as never, null as never)).resolves.toEqual([]);

    expect(provider.getLogs).toHaveBeenCalledWith({
      address: "0x0000000000000000000000000000000000000001",
      topics: [expect.any(String)],
      fromBlock: undefined,
      toBlock: undefined,
    });
  });

  it("normalizes bigint upper bounds while leaving the lower bound unset", async () => {
    const provider = { getLogs: vi.fn().mockResolvedValue([]) };
    const providerRouter = {
      withProvider: vi.fn().mockImplementation(async (_mode, _method, work) => work(provider)),
    };
    const addressBook = { resolveFacetAddress: vi.fn().mockReturnValue("0x0000000000000000000000000000000000000001") };

    await expect(queryEvent({
      providerRouter,
      addressBook,
    } as never, "AccessControlFacet", "ValueSet", undefined, 155n)).resolves.toEqual([]);

    expect(provider.getLogs).toHaveBeenCalledWith({
      address: "0x0000000000000000000000000000000000000001",
      topics: [expect.any(String)],
      fromBlock: undefined,
      toBlock: 155,
    });
  });
});
