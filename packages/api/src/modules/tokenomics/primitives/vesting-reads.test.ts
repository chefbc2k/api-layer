import { getAddress, Interface } from "ethers";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { facetRegistry } from "../../../../../client/src/generated/registry.js";
import { createTokenomicsPrimitiveService } from "./generated/service.js";

const diamondAddress = "0x0000000000000000000000000000000000000001";
const beneficiary = getAddress("0x00000000000000000000000000000000000000cc");

const vestingReadCases = [
  {
    key: "VestingFacet.getStandardVestingSchedule",
    operationId: "getStandardVestingSchedule",
    abiOutputs: [[
      1n,
      1_000_000n,
      250_000n,
      1_729_123_456n,
      31_536_000n,
      2_592_000n,
      1_731_715_456n,
      true,
      false,
      2_500n,
    ]],
    body: {
      vestingType: "1",
      totalAmount: "1000000",
      releasedAmount: "250000",
      startTime: "1729123456",
      duration: "31536000",
      cliff: "2592000",
      lastReleaseTime: "1731715456",
      revocable: true,
      revoked: false,
      sellablePercentage: "2500",
    },
  },
  {
    key: "VestingFacet.getVestingTotalAmount",
    operationId: "getVestingTotalAmount",
    abiOutputs: [1_000_000n, 250_000n, 100_000n],
    body: ["1000000", "250000", "100000"],
  },
] as const;

describe("vesting primitive read fixtures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(vestingReadCases)("executes $key against realistic vesting state", async (testCase) => {
    const iface = new Interface(facetRegistry.VestingFacet.abi);
    const runner = {
      call: vi.fn(async (transaction: { to?: string; data?: string }) => {
        expect(transaction.to).toBe(diamondAddress);
        expect(transaction.data).toBe(iface.encodeFunctionData(testCase.operationId, [beneficiary]));
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
    const service = createTokenomicsPrimitiveService({
      addressBook,
      providerRouter,
      cache,
    } as never);

    await expect(service[testCase.operationId]({
      auth: {
        apiKey: "vesting-reader-key",
        label: "vesting reader",
        roles: ["read-only"],
        allowGasless: false,
      },
      api: { executionSource: "auto", gaslessMode: "none" },
      walletAddress: undefined,
      wireParams: [beneficiary],
    })).resolves.toEqual({
      statusCode: 200,
      body: testCase.body,
    });

    expect(providerRouter.withProvider).toHaveBeenCalledWith("read", testCase.key, expect.any(Function));
    expect(addressBook.resolveFacetAddress).toHaveBeenCalledWith("VestingFacet");
    expect(runner.call).toHaveBeenCalledOnce();
    expect(cache.get).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
  });
});
