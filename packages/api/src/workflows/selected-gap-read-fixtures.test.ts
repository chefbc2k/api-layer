import { getAddress, Interface } from "ethers";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { facetRegistry } from "../../../client/src/generated/registry.js";
import { createMarketplacePrimitiveService } from "../modules/marketplace/primitives/generated/service.js";
import { createOwnershipPrimitiveService } from "../modules/ownership/primitives/generated/service.js";
import { createTokenomicsPrimitiveService } from "../modules/tokenomics/primitives/generated/service.js";
import { createVoiceAssetsPrimitiveService } from "../modules/voice-assets/primitives/generated/service.js";
import type { PrimitiveInvocationRequest, RouteResult } from "../shared/route-types.js";

const diamondAddress = "0x0000000000000000000000000000000000000001";
const account = getAddress("0x00000000000000000000000000000000000000aa");
const pendingOwner = getAddress("0x00000000000000000000000000000000000000bb");
const campaignId = 9n;
const tokenId = 42n;
const totalAllocation = 1_000_000n;
const activationTime = 1_729_123_456n;

type PrimitiveService = Record<string, (request: PrimitiveInvocationRequest) => Promise<RouteResult>>;

const readCases = [
  {
    key: "CommunityRewardsFacet.claimableAmount",
    facetName: "CommunityRewardsFacet",
    operationId: "claimableAmount",
    abi: facetRegistry.CommunityRewardsFacet.abi,
    createService: createTokenomicsPrimitiveService,
    wireParams: [campaignId.toString(), account, totalAllocation.toString()],
    abiParams: [campaignId, account, totalAllocation],
    abiOutputs: [275_000n],
    body: "275000",
    cacheTtlSeconds: null,
  },
  {
    key: "EscrowFacet.getOriginalOwner",
    facetName: "EscrowFacet",
    operationId: "getOriginalOwner",
    abi: facetRegistry.EscrowFacet.abi,
    createService: createMarketplacePrimitiveService,
    wireParams: [tokenId.toString()],
    abiParams: [tokenId],
    abiOutputs: [account],
    body: account,
    cacheTtlSeconds: null,
  },
  {
    key: "EscrowFacet.isInEscrow",
    facetName: "EscrowFacet",
    operationId: "isInEscrow",
    abi: facetRegistry.EscrowFacet.abi,
    createService: createMarketplacePrimitiveService,
    wireParams: [tokenId.toString()],
    abiParams: [tokenId],
    abiOutputs: [true],
    body: true,
    cacheTtlSeconds: null,
  },
  {
    key: "LegacyViewFacet.validateBeneficiary",
    facetName: "LegacyViewFacet",
    operationId: "validateBeneficiary",
    abi: facetRegistry.LegacyViewFacet.abi,
    createService: createVoiceAssetsPrimitiveService,
    wireParams: [["2500", activationTime.toString(), account, true, true, "child"]],
    abiParams: [[2_500n, activationTime, account, true, true, "child"]],
    abiOutputs: [],
    body: null,
    cacheTtlSeconds: null,
  },
  {
    key: "OwnershipFacet.isOwnershipPolicyEnforced",
    facetName: "OwnershipFacet",
    operationId: "isOwnershipPolicyEnforced",
    abi: facetRegistry.OwnershipFacet.abi,
    createService: createOwnershipPrimitiveService,
    wireParams: [],
    abiParams: [],
    abiOutputs: [true],
    body: true,
    cacheTtlSeconds: 5,
  },
  {
    key: "OwnershipFacet.pendingOwner",
    facetName: "OwnershipFacet",
    operationId: "pendingOwner",
    abi: facetRegistry.OwnershipFacet.abi,
    createService: createOwnershipPrimitiveService,
    wireParams: [],
    abiParams: [],
    abiOutputs: [pendingOwner],
    body: pendingOwner,
    cacheTtlSeconds: 5,
  },
] as const;

describe("selected gap primitive read fixtures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(readCases)("executes $key through its generated primitive service", async (testCase) => {
    const iface = new Interface(testCase.abi);
    const runner = {
      call: vi.fn(async (transaction: { to?: string; data?: string }) => {
        expect(transaction.to).toBe(diamondAddress);
        expect(transaction.data).toBe(iface.encodeFunctionData(testCase.operationId, [...testCase.abiParams]));
        return iface.encodeFunctionResult(testCase.operationId, [...testCase.abiOutputs]);
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
    const service = testCase.createService({
      addressBook,
      providerRouter,
      cache,
    } as never) as unknown as PrimitiveService;

    await expect(service[testCase.operationId]({
      auth: {
        apiKey: "selected-gap-reader-key",
        label: "selected gap reader",
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

    expect(providerRouter.withProvider).toHaveBeenCalledWith("read", testCase.key, expect.any(Function));
    expect(addressBook.resolveFacetAddress).toHaveBeenCalledWith(testCase.facetName);
    expect(runner.call).toHaveBeenCalledOnce();
    if (testCase.cacheTtlSeconds === null) {
      expect(cache.get).not.toHaveBeenCalled();
      expect(cache.set).not.toHaveBeenCalled();
    } else {
      expect(cache.get).toHaveBeenCalledWith(
        expect.stringContaining(`${testCase.facetName}:${testCase.operationId}`),
      );
      expect(cache.set).toHaveBeenCalledWith(
        expect.stringContaining(`${testCase.facetName}:${testCase.operationId}`),
        expect.anything(),
        testCase.cacheTtlSeconds,
      );
    }
  });
});
