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

import { runManageRewardCampaignWorkflow } from "./manage-reward-campaign.js";

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
});
