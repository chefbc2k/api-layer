import { Interface } from "ethers";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { facetRegistry } from "../../../../../client/src/generated/registry.js";
import { createGovernancePrimitiveService } from "./generated/service.js";

const proposalId = 73n;
const diamondAddress = "0x0000000000000000000000000000000000000001";

const proposalReadCases = [
  {
    operationId: "proposalExists",
    key: "ProposalFacet.proposalExists",
    abiOutputs: [true],
    body: true,
  },
  {
    operationId: "proposalVotes",
    key: "ProposalFacet.proposalVotes",
    abiOutputs: [[13n, 89n, 5n]],
    body: {
      againstVotes: "13",
      forVotes: "89",
      abstainVotes: "5",
    },
  },
] as const;

describe("proposal primitive read fixtures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(proposalReadCases)("executes $key against realistic proposal state", async (testCase) => {
    const iface = new Interface(facetRegistry.ProposalFacet.abi);
    const runner = {
      call: vi.fn(async (transaction: { to?: string; data?: string }) => {
        expect(transaction.to).toBe(diamondAddress);
        expect(transaction.data).toBe(iface.encodeFunctionData(testCase.operationId, [proposalId]));
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
    const service = createGovernancePrimitiveService({
      addressBook,
      providerRouter,
      cache,
    } as never);

    await expect(service[testCase.operationId]({
      auth: {
        apiKey: "governance-reader-key",
        label: "governance reader",
        roles: ["read-only"],
        allowGasless: false,
      },
      api: { executionSource: "auto", gaslessMode: "none" },
      walletAddress: undefined,
      wireParams: [proposalId.toString()],
    })).resolves.toEqual({
      statusCode: 200,
      body: testCase.body,
    });

    expect(providerRouter.withProvider).toHaveBeenCalledWith("read", testCase.key, expect.any(Function));
    expect(addressBook.resolveFacetAddress).toHaveBeenCalledWith("ProposalFacet");
    expect(runner.call).toHaveBeenCalledOnce();
    expect(cache.set).toHaveBeenCalledWith(
      expect.stringContaining(`ProposalFacet:${testCase.operationId}`),
      expect.anything(),
      5,
    );
  });
});
