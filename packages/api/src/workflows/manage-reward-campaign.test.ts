import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createTokenomicsPrimitiveService: vi.fn(),
  waitForWorkflowWriteReceipt: vi.fn(),
}));

vi.mock("../modules/tokenomics/primitives/generated/index.js", () => ({
  createTokenomicsPrimitiveService: mocks.createTokenomicsPrimitiveService,
}));

vi.mock("./wait-for-write.js", () => ({
  waitForWorkflowWriteReceipt: mocks.waitForWorkflowWriteReceipt,
}));

import { manageRewardCampaignSchema, runManageRewardCampaignWorkflow } from "./manage-reward-campaign.js";

describe("runManageRewardCampaignWorkflow", () => {
  const auth = {
    apiKey: "test-key",
    label: "test",
    roles: ["service"],
    allowGasless: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates the merkle root and then unpauses in deterministic order", async () => {
    const sequence: string[] = [];
    const context = {
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, label: string, work: (provider: {
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
        }) => Promise<unknown>) => {
          sequence.push(`receipt:${label}`);
          return work({
            getTransactionReceipt: vi.fn(async (txHash: string) => ({ blockNumber: txHash === "0xroot-receipt" ? 501 : 502 })),
          });
        }),
      },
    } as never;
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      getCampaign: vi.fn()
        .mockImplementationOnce(async () => {
          sequence.push("get-before");
          return {
            statusCode: 200,
            body: { merkleRoot: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", paused: true },
          };
        })
        .mockImplementationOnce(async () => {
          sequence.push("get-after-root");
          return {
            statusCode: 200,
            body: { merkleRoot: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", paused: true },
          };
        })
        .mockImplementationOnce(async () => {
          sequence.push("get-after-unpause");
          return {
            statusCode: 200,
            body: { merkleRoot: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", paused: false },
          };
        }),
      setMerkleRoot: vi.fn().mockImplementation(async () => {
        sequence.push("set-merkle-root");
        return { statusCode: 202, body: { txHash: "0xroot-write" } };
      }),
      campaignMerkleRootUpdatedEventQuery: vi.fn().mockImplementation(async () => {
        sequence.push("merkle-root-events");
        return [{ transactionHash: "0xroot-receipt" }];
      }),
      unpauseCampaign: vi.fn().mockImplementation(async () => {
        sequence.push("unpause-campaign");
        return { statusCode: 202, body: { txHash: "0xunpause-write" } };
      }),
      campaignUnpausedEventQuery: vi.fn().mockImplementation(async () => {
        sequence.push("unpause-events");
        return [{ transactionHash: "0xunpause-receipt" }];
      }),
      pauseCampaign: vi.fn(),
      campaignPausedEventQuery: vi.fn(),
    });
    mocks.waitForWorkflowWriteReceipt
      .mockImplementationOnce(async () => {
        sequence.push("wait-root");
        return "0xroot-receipt";
      })
      .mockImplementationOnce(async () => {
        sequence.push("wait-unpause");
        return "0xunpause-receipt";
      });

    const result = await runManageRewardCampaignWorkflow(context, auth, undefined, {
      campaignId: "11",
      newMerkleRoot: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      paused: false,
    });

    expect(sequence).toEqual([
      "get-before",
      "set-merkle-root",
      "wait-root",
      "receipt:workflow.manageRewardCampaign.setMerkleRoot.receipt",
      "merkle-root-events",
      "get-after-root",
      "unpause-campaign",
      "wait-unpause",
      "receipt:workflow.manageRewardCampaign.unpause.receipt",
      "unpause-events",
      "get-after-unpause",
    ]);
    expect(result).toEqual({
      campaign: {
        before: { merkleRoot: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", paused: true },
        after: { merkleRoot: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", paused: false },
      },
      merkleRootUpdate: {
        requested: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        submission: { txHash: "0xroot-write" },
        txHash: "0xroot-receipt",
        merkleRootAfter: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        eventCount: 1,
        source: "updated",
      },
      pauseState: {
        requested: false,
        action: "unpause",
        submission: { txHash: "0xunpause-write" },
        txHash: "0xunpause-receipt",
        pausedAfter: false,
        eventCount: 1,
        source: "unpaused",
      },
      summary: {
        campaignId: "11",
        requestedMerkleRoot: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        requestedPaused: false,
        finalMerkleRoot: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        finalPaused: false,
      },
    });
  });

  it("returns stable unchanged branches when the requested state already matches", async () => {
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      getCampaign: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: { merkleRoot: "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc", paused: true },
      }),
      setMerkleRoot: vi.fn(),
      campaignMerkleRootUpdatedEventQuery: vi.fn(),
      unpauseCampaign: vi.fn(),
      pauseCampaign: vi.fn(),
      campaignPausedEventQuery: vi.fn(),
      campaignUnpausedEventQuery: vi.fn(),
    });

    const result = await runManageRewardCampaignWorkflow({
      providerRouter: { withProvider: vi.fn() },
    } as never, auth, "0x00000000000000000000000000000000000000aa", {
      campaignId: "12",
      newMerkleRoot: "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      paused: true,
    });

    expect(result.merkleRootUpdate.source).toBe("unchanged");
    expect(result.pauseState.source).toBe("unchanged");
    expect(result.merkleRootUpdate.txHash).toBeNull();
    expect(result.pauseState.txHash).toBeNull();
  });

  it("supports a pause-only change with the merkle-root step left as not-requested", async () => {
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      getCampaign: vi.fn()
        .mockResolvedValueOnce({
          statusCode: 200,
          body: { merkleRoot: "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd", paused: false },
        })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: { merkleRoot: "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd", paused: true },
        }),
      pauseCampaign: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xpause-write" } }),
      campaignPausedEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xpause-receipt" }]),
      setMerkleRoot: vi.fn(),
      campaignMerkleRootUpdatedEventQuery: vi.fn(),
      unpauseCampaign: vi.fn(),
      campaignUnpausedEventQuery: vi.fn(),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xpause-receipt");
    const context = {
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: {
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
        }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 503 })),
        })),
      },
    } as never;

    const result = await runManageRewardCampaignWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      campaignId: "13",
      paused: true,
    });

    expect(result.merkleRootUpdate.source).toBe("not-requested");
    expect(result.pauseState.source).toBe("paused");
    expect(result.pauseState.action).toBe("pause");
    expect(result.pauseState.eventCount).toBe(1);
  });

  it("supports a merkle-root-only change when the write receipt never resolves", async () => {
    const campaignMerkleRootUpdatedEventQuery = vi.fn();
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      getCampaign: vi.fn()
        .mockResolvedValueOnce({
          statusCode: 200,
          body: { merkleRoot: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", paused: false },
        })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: { merkleRoot: "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", paused: false },
        }),
      setMerkleRoot: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xroot-write" } }),
      campaignMerkleRootUpdatedEventQuery,
      unpauseCampaign: vi.fn(),
      pauseCampaign: vi.fn(),
      campaignPausedEventQuery: vi.fn(),
      campaignUnpausedEventQuery: vi.fn(),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue(null);

    const result = await runManageRewardCampaignWorkflow({
      providerRouter: { withProvider: vi.fn() },
    } as never, auth, undefined, {
      campaignId: "14",
      newMerkleRoot: "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    });

    expect(campaignMerkleRootUpdatedEventQuery).not.toHaveBeenCalled();
    expect(result.merkleRootUpdate.txHash).toBeNull();
    expect(result.merkleRootUpdate.eventCount).toBe(0);
    expect(result.pauseState.source).toBe("not-requested");
  });

  it("preserves the prior pause state when the pause write has no receipt", async () => {
    const campaignPausedEventQuery = vi.fn();
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      getCampaign: vi.fn()
        .mockResolvedValueOnce({
          statusCode: 200,
          body: { merkleRoot: "0xabababababababababababababababababababababababababababababababab", paused: false },
        })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: { merkleRoot: "0xabababababababababababababababababababababababababababababababab", paused: true },
        }),
      pauseCampaign: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xpause-write" } }),
      campaignPausedEventQuery,
      setMerkleRoot: vi.fn(),
      campaignMerkleRootUpdatedEventQuery: vi.fn(),
      unpauseCampaign: vi.fn(),
      campaignUnpausedEventQuery: vi.fn(),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue(null);

    const result = await runManageRewardCampaignWorkflow({
      providerRouter: { withProvider: vi.fn() },
    } as never, auth, "0x00000000000000000000000000000000000000aa", {
      campaignId: "15",
      paused: true,
    });

    expect(campaignPausedEventQuery).not.toHaveBeenCalled();
    expect(result.pauseState.txHash).toBeNull();
    expect(result.pauseState.eventCount).toBe(0);
    expect(result.pauseState.source).toBe("paused");
  });

  it("rejects requests that omit both mutable campaign fields", () => {
    expect(() => manageRewardCampaignSchema.parse({
      campaignId: "13",
    })).toThrow("manage-reward-campaign expected at least one requested change");
  });

  it("keeps the merkle update event count at zero when the write receipt never resolves", async () => {
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      getCampaign: vi.fn()
        .mockResolvedValueOnce({
          statusCode: 200,
          body: { merkleRoot: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", paused: false },
        })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: { merkleRoot: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", paused: false },
        }),
      setMerkleRoot: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xroot-write" } }),
      campaignMerkleRootUpdatedEventQuery: vi.fn(),
      unpauseCampaign: vi.fn(),
      pauseCampaign: vi.fn(),
      campaignPausedEventQuery: vi.fn(),
      campaignUnpausedEventQuery: vi.fn(),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValueOnce(null);

    const result = await runManageRewardCampaignWorkflow({
      providerRouter: { withProvider: vi.fn() },
    } as never, auth, undefined, {
      campaignId: "14",
      newMerkleRoot: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    });

    expect(result.merkleRootUpdate).toMatchObject({
      requested: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      txHash: null,
      eventCount: 0,
      source: "updated",
    });
    expect(result.pauseState.source).toBe("not-requested");
  });

  it("keeps the pause event count at zero when the receipt never resolves", async () => {
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      getCampaign: vi.fn()
        .mockResolvedValueOnce({
          statusCode: 200,
          body: { merkleRoot: "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd", paused: false },
        })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: { merkleRoot: "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd", paused: true },
        }),
      pauseCampaign: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xpause-write" } }),
      campaignPausedEventQuery: vi.fn(),
      setMerkleRoot: vi.fn(),
      campaignMerkleRootUpdatedEventQuery: vi.fn(),
      unpauseCampaign: vi.fn(),
      campaignUnpausedEventQuery: vi.fn(),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValueOnce(null);

    const result = await runManageRewardCampaignWorkflow({
      providerRouter: { withProvider: vi.fn() },
    } as never, auth, undefined, {
      campaignId: "15",
      paused: true,
    });

    expect(result.merkleRootUpdate.source).toBe("not-requested");
    expect(result.pauseState).toMatchObject({
      action: "pause",
      txHash: null,
      eventCount: 0,
      source: "paused",
    });
  });

  it("falls back to the merkle readback when the pause readback omits merkleRoot", async () => {
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      getCampaign: vi.fn()
        .mockResolvedValueOnce({
          statusCode: 200,
          body: { merkleRoot: "0x1111111111111111111111111111111111111111111111111111111111111111", paused: false },
        })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: { merkleRoot: "0x2222222222222222222222222222222222222222222222222222222222222222" },
        })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: { paused: true },
        }),
      setMerkleRoot: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xroot-write" } }),
      pauseCampaign: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xpause-write" } }),
      campaignMerkleRootUpdatedEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xroot-receipt" }]),
      campaignPausedEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xpause-receipt" }]),
      unpauseCampaign: vi.fn(),
      campaignUnpausedEventQuery: vi.fn(),
    });
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce("0xroot-receipt")
      .mockResolvedValueOnce("0xpause-receipt");

    const context = {
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: {
          getTransactionReceipt: () => Promise<unknown>;
        }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async (txHash: string) => ({ blockNumber: txHash === "0xroot-receipt" ? 601 : 602 })),
        })),
      },
    } as never;

    const result = await runManageRewardCampaignWorkflow(context, auth, undefined, {
      campaignId: "16",
      newMerkleRoot: "0x2222222222222222222222222222222222222222222222222222222222222222",
      paused: true,
    });

    expect(result).toMatchObject({
      merkleRootUpdate: {
        requested: "0x2222222222222222222222222222222222222222222222222222222222222222",
        merkleRootAfter: "0x2222222222222222222222222222222222222222222222222222222222222222",
      },
      pauseState: {
        requested: true,
        pausedAfter: true,
      },
      summary: {
        finalMerkleRoot: null,
        finalPaused: true,
      },
    });
  });

  it("falls back to the pre-update pause flag when the merkle readback omits paused", async () => {
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      getCampaign: vi.fn()
        .mockResolvedValueOnce({
          statusCode: 200,
          body: { merkleRoot: "0x3333333333333333333333333333333333333333333333333333333333333333", paused: false },
        })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: { merkleRoot: "0x4444444444444444444444444444444444444444444444444444444444444444" },
        }),
      setMerkleRoot: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xroot-write" } }),
      campaignMerkleRootUpdatedEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xroot-receipt" }]),
      pauseCampaign: vi.fn(),
      campaignPausedEventQuery: vi.fn(),
      unpauseCampaign: vi.fn(),
      campaignUnpausedEventQuery: vi.fn(),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValueOnce("0xroot-receipt");

    const context = {
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: {
          getTransactionReceipt: () => Promise<unknown>;
        }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 701 })),
        })),
      },
    } as never;

    const result = await runManageRewardCampaignWorkflow(context, auth, undefined, {
      campaignId: "17",
      newMerkleRoot: "0x4444444444444444444444444444444444444444444444444444444444444444",
    });

    expect(result).toMatchObject({
      merkleRootUpdate: {
        merkleRootAfter: "0x4444444444444444444444444444444444444444444444444444444444444444",
      },
      pauseState: {
        requested: null,
        pausedAfter: false,
        source: "not-requested",
      },
      summary: {
        finalMerkleRoot: "0x4444444444444444444444444444444444444444444444444444444444444444",
        finalPaused: null,
      },
    });
  });

  it("falls back to the pre-update merkle root when the confirmed readback only satisfied the predicate once", async () => {
    let merkleRootReads = 0;
    const ephemeralReadback = {
      get merkleRoot() {
        merkleRootReads += 1;
        return merkleRootReads === 1
          ? "0x6666666666666666666666666666666666666666666666666666666666666666"
          : undefined;
      },
    };
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      getCampaign: vi.fn()
        .mockResolvedValueOnce({
          statusCode: 200,
          body: { merkleRoot: "0x5555555555555555555555555555555555555555555555555555555555555555", paused: false },
        })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: ephemeralReadback,
        }),
      setMerkleRoot: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xroot-write" } }),
      campaignMerkleRootUpdatedEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xroot-receipt" }]),
      pauseCampaign: vi.fn(),
      campaignPausedEventQuery: vi.fn(),
      unpauseCampaign: vi.fn(),
      campaignUnpausedEventQuery: vi.fn(),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValueOnce("0xroot-receipt");

    const context = {
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: {
          getTransactionReceipt: () => Promise<unknown>;
        }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 801 })),
        })),
      },
    } as never;

    const result = await runManageRewardCampaignWorkflow(context, auth, undefined, {
      campaignId: "18",
      newMerkleRoot: "0x6666666666666666666666666666666666666666666666666666666666666666",
    });

    expect(result).toMatchObject({
      merkleRootUpdate: {
        requested: "0x6666666666666666666666666666666666666666666666666666666666666666",
        merkleRootAfter: "0x5555555555555555555555555555555555555555555555555555555555555555",
      },
      summary: {
        finalMerkleRoot: null,
      },
    });
  });

  it("falls back to a null merkle root when neither the prior campaign nor the confirmed readback retains it", async () => {
    vi.resetModules();
    const createTokenomicsPrimitiveService = vi.fn().mockReturnValue({
      setMerkleRoot: vi.fn().mockResolvedValue({ body: { txHash: "0xroot-write" } }),
    });
    const waitForWorkflowReadback = vi.fn()
      .mockResolvedValueOnce({ statusCode: 200, body: {} })
      .mockResolvedValueOnce({ statusCode: 200, body: {} });

    vi.doMock("../modules/tokenomics/primitives/generated/index.js", () => ({
      createTokenomicsPrimitiveService,
    }));
    vi.doMock("./wait-for-write.js", () => ({
      waitForWorkflowWriteReceipt: vi.fn().mockResolvedValue("0xroot-receipt"),
    }));
    vi.doMock("./reward-campaign-helpers.js", () => ({
      asRecord: (value: unknown) => (value && typeof value === "object" ? value as Record<string, unknown> : null),
      hasTransactionHash: vi.fn().mockReturnValue(true),
      readWorkflowReceipt: vi.fn().mockResolvedValue({ blockNumber: 1 }),
      waitForWorkflowEventQuery: vi.fn().mockResolvedValue([]),
      waitForWorkflowReadback,
    }));

    const { runManageRewardCampaignWorkflow: runWorkflow } = await import("./manage-reward-campaign.js");
    const result = await runWorkflow({} as never, auth, undefined, {
      campaignId: "19",
      newMerkleRoot: "0x7777777777777777777777777777777777777777777777777777777777777777",
    });

    expect(waitForWorkflowReadback).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      merkleRootUpdate: {
        requested: "0x7777777777777777777777777777777777777777777777777777777777777777",
        merkleRootAfter: null,
      },
      summary: {
        finalMerkleRoot: null,
      },
    });
  });

  it("falls back to a null pause state when the campaign never exposed one", async () => {
    vi.resetModules();
    const createTokenomicsPrimitiveService = vi.fn().mockReturnValue({
      pauseCampaign: vi.fn().mockResolvedValue({ body: { txHash: "0xpause-write" } }),
    });
    const waitForWorkflowReadback = vi.fn().mockResolvedValue({ statusCode: 200, body: {} });

    vi.doMock("../modules/tokenomics/primitives/generated/index.js", () => ({
      createTokenomicsPrimitiveService,
    }));
    vi.doMock("./wait-for-write.js", () => ({
      waitForWorkflowWriteReceipt: vi.fn().mockResolvedValue(null),
    }));
    vi.doMock("./reward-campaign-helpers.js", () => ({
      asRecord: (value: unknown) => (value && typeof value === "object" ? value as Record<string, unknown> : null),
      hasTransactionHash: vi.fn().mockReturnValue(true),
      readWorkflowReceipt: vi.fn(),
      waitForWorkflowEventQuery: vi.fn(),
      waitForWorkflowReadback,
    }));

    const { runManageRewardCampaignWorkflow: runWorkflow } = await import("./manage-reward-campaign.js");
    const result = await runWorkflow({} as never, auth, undefined, {
      campaignId: "20",
      paused: true,
    });

    expect(waitForWorkflowReadback).toHaveBeenCalled();
    expect(result).toMatchObject({
      pauseState: {
        requested: true,
        pausedAfter: null,
        source: "paused",
      },
      summary: {
        finalPaused: null,
      },
    });
  });

});
