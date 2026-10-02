import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAddress, Interface } from "ethers";

import { facetRegistry } from "../../../../../client/src/generated/registry.js";
import { createAccessControlPrimitiveService } from "./generated/service.js";

const role = `0x${"22".repeat(32)}`;
const account = "0x00000000000000000000000000000000000000bb";
const diamondAddress = "0x0000000000000000000000000000000000000001";

const readCases = [
  {
    operationId: "debugRoleIndexState",
    key: "AccessControlFacet.debugRoleIndexState",
    wireParams: [role],
    abiOutputs: [account, true, true, 2n, 2n],
    body: [getAddress(account), true, true, "2", "2"],
  },
  {
    operationId: "getOwnerOperationalRoles",
    key: "AccessControlFacet.getOwnerOperationalRoles",
    wireParams: [account],
    abiOutputs: [[role]],
    body: [role],
  },
  {
    operationId: "getRequiredSigners",
    key: "AccessControlFacet.getRequiredSigners",
    wireParams: [role],
    abiOutputs: [2n],
    body: "2",
  },
  {
    operationId: "isFounderSunsetActive",
    key: "AccessControlFacet.isFounderSunsetActive",
    wireParams: [],
    abiOutputs: [false],
    body: false,
  },
  {
    operationId: "isRoleActive",
    key: "AccessControlFacet.isRoleActive",
    wireParams: [role, account],
    abiOutputs: [true],
    body: true,
  },
] as const;

describe("access-control primitive read fixtures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(readCases)("executes $key through ABI-native state fixtures", async (testCase) => {
    const iface = new Interface(facetRegistry.AccessControlFacet.abi);
    const runner = {
      call: vi.fn(async (transaction: { to?: string; data?: string }) => {
        expect(transaction.to).toBe(diamondAddress);
        expect(transaction.data).toBe(iface.encodeFunctionData(testCase.operationId, [...testCase.wireParams]));
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
    const service = createAccessControlPrimitiveService({
      addressBook,
      providerRouter,
      cache,
    } as never);
    const request = {
      auth: { apiKey: "reader-key", label: "reader", roles: ["read-only"], allowGasless: false },
      api: { executionSource: "auto" as const, gaslessMode: "none" as const },
      walletAddress: undefined,
      wireParams: [...testCase.wireParams],
    };

    await expect(service[testCase.operationId](request)).resolves.toEqual({
      statusCode: 200,
      body: testCase.body,
    });
    expect(providerRouter.withProvider).toHaveBeenCalledWith("read", testCase.key, expect.any(Function));
    expect(addressBook.resolveFacetAddress).toHaveBeenCalledWith("AccessControlFacet");
    expect(runner.call).toHaveBeenCalledOnce();
    expect(cache.set).toHaveBeenCalledWith(
      expect.stringContaining(`AccessControlFacet:${testCase.operationId}`),
      expect.anything(),
      5,
    );
  });
});
