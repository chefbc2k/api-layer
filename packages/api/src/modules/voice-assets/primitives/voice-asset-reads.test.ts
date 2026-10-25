import { getAddress, Interface } from "ethers";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { facetRegistry } from "../../../../../client/src/generated/registry.js";
import { createVoiceAssetsPrimitiveService } from "./generated/service.js";

const voiceHash = `0x${"31".repeat(32)}`;
const secondVoiceHash = `0x${"32".repeat(32)}`;
const tokenId = 42n;
const owner = getAddress("0x00000000000000000000000000000000000000aa");
const diamondAddress = "0x0000000000000000000000000000000000000001";

const voiceAssetReadCases = [
  {
    key: "VoiceAssetFacet.getVoiceAssetDetails",
    operationId: "getVoiceAssetDetails",
    abiMethod: "getVoiceAssetDetails",
    wrapperKey: "getVoiceAssetDetails",
    wireParams: [voiceHash],
    abiParams: [voiceHash],
    abiOutputs: [owner, true, 1_729_123_456n],
    body: [owner, true, "1729123456"],
    cacheTtlSeconds: 5,
  },
  {
    key: "VoiceAssetFacet.getVoiceAssetsByOwner",
    operationId: "getVoiceAssetsByOwner",
    abiMethod: "getVoiceAssetsByOwner",
    wrapperKey: "getVoiceAssetsByOwner",
    wireParams: [owner],
    abiParams: [owner],
    abiOutputs: [[voiceHash, secondVoiceHash]],
    body: [voiceHash, secondVoiceHash],
    cacheTtlSeconds: 5,
  },
  {
    key: "VoiceAssetFacet.tokenURI",
    operationId: "tokenUri",
    abiMethod: "tokenURI",
    wrapperKey: "tokenURI",
    wireParams: [tokenId.toString()],
    abiParams: [tokenId],
    abiOutputs: ["ipfs://voice-assets/42/metadata.json"],
    body: "ipfs://voice-assets/42/metadata.json",
    cacheTtlSeconds: 5,
  },
  {
    key: "VoiceAssetFacet.symbol",
    operationId: "symbol",
    abiMethod: "symbol",
    wrapperKey: "symbol",
    wireParams: [],
    abiParams: [],
    abiOutputs: ["VOICE"],
    body: "VOICE",
    cacheTtlSeconds: 600,
  },
  {
    key: "VoiceAssetFacet.name",
    operationId: "name",
    abiMethod: "name",
    wrapperKey: "name",
    wireParams: [],
    abiParams: [],
    abiOutputs: ["uSpeaks Voice Assets"],
    body: "uSpeaks Voice Assets",
    cacheTtlSeconds: 600,
  },
] as const;

describe("voice-asset primitive read fixtures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(voiceAssetReadCases)("executes $key through ABI-native state fixtures", async (testCase) => {
    const iface = new Interface(facetRegistry.VoiceAssetFacet.abi);
    const runner = {
      call: vi.fn(async (transaction: { to?: string; data?: string }) => {
        expect(transaction.to).toBe(diamondAddress);
        expect(transaction.data).toBe(iface.encodeFunctionData(testCase.abiMethod, [...testCase.abiParams]));
        return iface.encodeFunctionResult(testCase.abiMethod, [...testCase.abiOutputs]);
      }),
    };
    const providerRouter = {
      withProvider: vi.fn(async (
        _kind: string,
        _method: string,
        work: (provider: unknown, providerName: "cbdp") => Promise<unknown>,
      ) => work(runner, "cbdp")),
    };
    const cache = {
      get: vi.fn().mockReturnValue(null),
      set: vi.fn(),
    };
    const addressBook = {
      resolveFacetAddress: vi.fn().mockReturnValue(diamondAddress),
    };
    const service = createVoiceAssetsPrimitiveService({
      addressBook,
      providerRouter,
      cache,
    } as never);

    await expect(service[testCase.operationId]({
      auth: {
        apiKey: "voice-asset-reader-key",
        label: "voice asset reader",
        roles: ["read-only"],
        allowGasless: false,
      },
      api: { executionSource: "auto", gaslessMode: "none" },
      walletAddress: undefined,
      wireParams: [...testCase.wireParams],
    })).resolves.toEqual({
      statusCode: 200,
      body: testCase.body,
    });

    expect(providerRouter.withProvider).toHaveBeenCalledWith(
      "read",
      `VoiceAssetFacet.${testCase.wrapperKey}`,
      expect.any(Function),
    );
    expect(addressBook.resolveFacetAddress).toHaveBeenCalledWith("VoiceAssetFacet");
    expect(runner.call).toHaveBeenCalledOnce();
    expect(cache.get).toHaveBeenCalledWith(
      expect.stringContaining(`VoiceAssetFacet:${testCase.wrapperKey}`),
    );
    expect(cache.set).toHaveBeenCalledWith(
      expect.stringContaining(`VoiceAssetFacet:${testCase.wrapperKey}`),
      expect.anything(),
      testCase.cacheTtlSeconds,
    );
  });
});
