import { describe, expect, it, vi } from "vitest";
import { Interface, type Log } from "ethers";

const mocks = vi.hoisted(() => ({
  facetRegistry: {
    TestFacet: {
      abi: [
        "event TestEvent(address indexed owner, uint256 amount)",
        "event AlternateEvent(address indexed owner)",
      ],
    },
  },
  getAllAbiEventDefinitions: () => ({
    "TestFacet.TestEvent": {
      facetName: "TestFacet",
      eventName: "TestEvent",
      wrapperKey: "TestEvent",
    },
    "TestFacet.MissingEvent": {
      facetName: "TestFacet",
      eventName: "MissingEvent",
      wrapperKey: "DoesNotExist",
    },
  }),
}));

vi.mock("../../client/src/index.js", () => ({
  facetRegistry: mocks.facetRegistry,
  getAllAbiEventDefinitions: mocks.getAllAbiEventDefinitions,
}));

import { buildEventRegistry, decodeEvent } from "./events.js";

describe("buildEventRegistry", () => {
  it("indexes resolvable ABI events and skips missing wrappers", () => {
    const registry = buildEventRegistry();
    const iface = new Interface(["event TestEvent(address indexed owner, uint256 amount)"]);
    const fragment = iface.getEvent("TestEvent");

    expect(fragment).toBeTruthy();
    expect(registry.get(fragment!.topicHash)).toEqual([
      expect.objectContaining({
        facetName: "TestFacet",
        eventName: "TestEvent",
        wrapperKey: "TestEvent",
        fullEventKey: "TestFacet.TestEvent",
      }),
    ]);
    expect([...registry.values()].flat()).not.toContainEqual(expect.objectContaining({ fullEventKey: "TestFacet.MissingEvent" }));
  });
});

describe("decodeEvent", () => {
  it("returns null when the log has no topic0", () => {
    expect(decodeEvent(new Map(), { topics: [] } as unknown as Log)).toBeNull();
  });

  it("decodes the first matching candidate", () => {
    const registry = buildEventRegistry();
    const iface = new Interface(["event TestEvent(address indexed owner, uint256 amount)"]);
    const fragment = iface.getEvent("TestEvent");
    const encoded = iface.encodeEventLog(fragment!, ["0x00000000000000000000000000000000000000aa", 42n]);
    const log = {
      address: "0x0000000000000000000000000000000000000001",
      data: encoded.data,
      topics: encoded.topics,
      transactionHash: "0xtx",
      blockHash: "0xblock",
      blockNumber: 1,
      index: 0,
      removed: false,
    } as unknown as Log;

    expect(decodeEvent(registry, log)).toMatchObject({
      facetName: "TestFacet",
      eventName: "TestEvent",
      wrapperKey: "TestEvent",
      fullEventKey: "TestFacet.TestEvent",
      signature: "TestEvent(address,uint256)",
      args: {
        owner: "0x00000000000000000000000000000000000000AA",
        amount: 42n,
      },
    });
  });

  it("returns null when all candidates fail to parse", () => {
    const iface = new Interface(["event TestEvent(address indexed owner, uint256 amount)"]);
    const fragment = iface.getEvent("TestEvent");
    const encoded = iface.encodeEventLog(fragment!, ["0x00000000000000000000000000000000000000aa", 42n]);
    const badRegistry = new Map([
      [encoded.topics[0], [{
        facetName: "BrokenFacet",
        eventName: "Broken",
        wrapperKey: "Broken",
        fullEventKey: "BrokenFacet.Broken",
        iface: new Interface(["event Broken(address indexed owner)"]),
      }]],
    ]);

    const log = {
      address: "0x0000000000000000000000000000000000000001",
      data: encoded.data,
      topics: encoded.topics,
      transactionHash: "0xtx",
      blockHash: "0xblock",
      blockNumber: 1,
      index: 0,
      removed: false,
    } as unknown as Log;

    expect(decodeEvent(badRegistry, log)).toBeNull();
  });

  it("falls through malformed candidates until a later candidate decodes successfully", () => {
    const iface = new Interface(["event TestEvent(address indexed owner, uint256 amount)"]);
    const fragment = iface.getEvent("TestEvent");
    const encoded = iface.encodeEventLog(fragment!, ["0x00000000000000000000000000000000000000aa", 42n]);
    const log = {
      address: "0x0000000000000000000000000000000000000001",
      data: encoded.data,
      topics: encoded.topics,
      transactionHash: "0xtx",
      blockHash: "0xblock",
      blockNumber: 1,
      index: 0,
      removed: false,
    } as unknown as Log;
    const mixedRegistry = new Map([
      [encoded.topics[0], [
        {
          facetName: "BrokenFacet",
          eventName: "Broken",
          wrapperKey: "Broken",
          fullEventKey: "BrokenFacet.Broken",
          iface: new Interface(["event Broken(address indexed owner)"]),
        },
        {
          facetName: "TestFacet",
          eventName: "TestEvent",
          wrapperKey: "TestEvent",
          fullEventKey: "TestFacet.TestEvent",
          iface,
        },
      ]],
    ]);

    expect(decodeEvent(mixedRegistry, log)).toMatchObject({
      facetName: "TestFacet",
      eventName: "TestEvent",
      fullEventKey: "TestFacet.TestEvent",
      args: {
        owner: "0x00000000000000000000000000000000000000AA",
        amount: 42n,
      },
    });
  });

  it("skips candidates that parse to null before accepting a later match", () => {
    const iface = new Interface(["event TestEvent(address indexed owner, uint256 amount)"]);
    const fragment = iface.getEvent("TestEvent");
    const encoded = iface.encodeEventLog(fragment!, ["0x00000000000000000000000000000000000000aa", 42n]);
    const log = {
      address: "0x0000000000000000000000000000000000000001",
      data: encoded.data,
      topics: encoded.topics,
      transactionHash: "0xtx",
      blockHash: "0xblock",
      blockNumber: 1,
      index: 0,
      removed: false,
    } as unknown as Log;
    const mixedRegistry = new Map([
      [encoded.topics[0], [
        {
          facetName: "NullFacet",
          eventName: "NullEvent",
          wrapperKey: "NullEvent",
          fullEventKey: "NullFacet.NullEvent",
          iface: { parseLog: () => null },
        },
        {
          facetName: "TestFacet",
          eventName: "TestEvent",
          wrapperKey: "TestEvent",
          fullEventKey: "TestFacet.TestEvent",
          iface,
        },
      ]],
    ]);

    expect(decodeEvent(mixedRegistry as never, log)).toMatchObject({
      facetName: "TestFacet",
      eventName: "TestEvent",
      fullEventKey: "TestFacet.TestEvent",
    });
  });

  it("returns null when the topic is not present in the registry", () => {
    const iface = new Interface(["event TestEvent(address indexed owner, uint256 amount)"]);
    const fragment = iface.getEvent("TestEvent");
    const encoded = iface.encodeEventLog(fragment!, ["0x00000000000000000000000000000000000000aa", 42n]);

    expect(decodeEvent(new Map(), {
      address: "0x0000000000000000000000000000000000000001",
      data: encoded.data,
      topics: encoded.topics,
      transactionHash: "0xtx",
      blockHash: "0xblock",
      blockNumber: 1,
      index: 0,
      removed: false,
    } as unknown as Log)).toBeNull();
  });
});
