import { getAddress, Interface } from "ethers";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { facetRegistry } from "../../../../../client/src/generated/registry.js";
import { createLicensingPrimitiveService } from "./generated/service.js";

const diamondAddress = "0x0000000000000000000000000000000000000001";
const voiceHash = `0x${"41".repeat(32)}`;
const collaborator = getAddress("0x00000000000000000000000000000000000000bb");

describe("rights primitive read fixtures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("executes RightsFacet.getCollaborator against realistic collaborator state", async () => {
    const iface = new Interface(facetRegistry.RightsFacet.abi);
    const runner = {
      call: vi.fn(async (transaction: { to?: string; data?: string }) => {
        expect(transaction.to).toBe(diamondAddress);
        expect(transaction.data).toBe(iface.encodeFunctionData("getCollaborator", [voiceHash, collaborator]));
        return iface.encodeFunctionResult("getCollaborator", [true, 2_500n]);
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
    const service = createLicensingPrimitiveService({
      addressBook,
      providerRouter,
      cache,
    } as never);

    await expect(service.getCollaborator({
      auth: {
        apiKey: "rights-reader-key",
        label: "rights reader",
        roles: ["read-only"],
        allowGasless: false,
      },
      api: { executionSource: "auto", gaslessMode: "none" },
      walletAddress: undefined,
      wireParams: [voiceHash, collaborator],
    })).resolves.toEqual({
      statusCode: 200,
      body: [true, "2500"],
    });

    expect(providerRouter.withProvider).toHaveBeenCalledWith(
      "read",
      "RightsFacet.getCollaborator",
      expect.any(Function),
    );
    expect(addressBook.resolveFacetAddress).toHaveBeenCalledWith("RightsFacet");
    expect(runner.call).toHaveBeenCalledOnce();
    expect(cache.get).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
  });
});
