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

import { runCreateRewardCampaignWorkflow } from "./create-reward-campaign.js";

describe("runCreateRewardCampaignWorkflow", () => {
  const auth = {
    apiKey: "test-key",
    label: "test",
    roles: ["service"],
    allowGasless: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a reward campaign and confirms count, event, and campaign readback in order", async () => {
    const sequence: string[] = [];
    const context = {
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, label: string, work: (provider: {
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
        }) => Promise<unknown>) => {
          sequence.push(`receipt:${label}`);
          return work({
            getTransactionReceipt: vi.fn(async () => ({ blockNumber: 401 })),
          });
        }),
      },
    } as never;
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      campaignCount: vi.fn()
        .mockImplementationOnce(async () => {
          sequence.push("campaign-count-before");
          return { statusCode: 200, body: "7" };
        })
        .mockImplementationOnce(async () => {
          sequence.push("campaign-count-after");
          return { statusCode: 200, body: "8" };
        }),
      createCampaign: vi.fn().mockImplementation(async () => {
        sequence.push("create-campaign");
        return { statusCode: 202, body: { txHash: "0xcreate-write", result: null } };
      }),
      campaignCreatedEventQuery: vi.fn().mockImplementation(async () => {
        sequence.push("campaign-created-events");
        return [{ transactionHash: "0xcreate-receipt", campaignId: "8" }];
      }),
      getCampaign: vi.fn().mockImplementation(async () => {
        sequence.push("get-campaign");
        return {
          statusCode: 200,
          body: {
            merkleRoot: "0x1111111111111111111111111111111111111111111111111111111111111111",
            startTime: "1000",
            cliffSeconds: "100",
            durationSeconds: "900",
            tgeUnlockBps: "500",
            maxTotalClaimable: "1000000",
            totalClaimed: "0",
            paused: false,
          },
        };
      }),
    });
    mocks.waitForWorkflowWriteReceipt.mockImplementationOnce(async () => {
      sequence.push("wait-create");
      return "0xcreate-receipt";
    });

    const result = await runCreateRewardCampaignWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      merkleRoot: "0x1111111111111111111111111111111111111111111111111111111111111111",
      startTime: "1000",
      cliffSeconds: "100",
      durationSeconds: "900",
      tgeUnlockBps: "500",
      maxTotalClaimable: "1000000",
    });

    expect(sequence).toEqual([
      "campaign-count-before",
      "create-campaign",
      "wait-create",
      "receipt:workflow.createRewardCampaign.create.receipt",
      "campaign-created-events",
      "campaign-count-after",
      "get-campaign",
    ]);
    expect(result).toEqual({
      campaign: {
        submission: { txHash: "0xcreate-write", result: null },
        txHash: "0xcreate-receipt",
        campaignId: "8",
        read: {
          merkleRoot: "0x1111111111111111111111111111111111111111111111111111111111111111",
          startTime: "1000",
          cliffSeconds: "100",
          durationSeconds: "900",
          tgeUnlockBps: "500",
          maxTotalClaimable: "1000000",
          totalClaimed: "0",
          paused: false,
        },
        eventCount: 1,
      },
      counts: {
        before: "7",
        after: "8",
      },
      summary: {
        campaignId: "8",
        merkleRoot: "0x1111111111111111111111111111111111111111111111111111111111111111",
        startTime: "1000",
        cliffSeconds: "100",
        durationSeconds: "900",
        tgeUnlockBps: "500",
        maxTotalClaimable: "1000000",
      },
    });
  });

  it("retries event, count, and campaign readback and can fall back to the write result for campaign id", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: TimerHandler) => {
      if (typeof callback === "function") {
        callback();
      }
      return 0 as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      campaignCount: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "9" })
        .mockResolvedValueOnce({ statusCode: 200, body: "9" })
        .mockResolvedValueOnce({ statusCode: 200, body: "10" }),
      createCampaign: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xcreate-write", result: "10" },
      }),
      campaignCreatedEventQuery: vi.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ transactionHash: "0xcreate-receipt" }]),
      getCampaign: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { paused: true } })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: {
            merkleRoot: "0x2222222222222222222222222222222222222222222222222222222222222222",
            startTime: "2000",
            cliffSeconds: "200",
            durationSeconds: "1200",
            tgeUnlockBps: "750",
            maxTotalClaimable: "2000000",
            totalClaimed: "0",
            paused: false,
          },
        }),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xcreate-receipt");
    const context = {
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: {
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
        }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 402 })),
        })),
      },
    } as never;

    const result = await runCreateRewardCampaignWorkflow(context, auth, undefined, {
      merkleRoot: "0x2222222222222222222222222222222222222222222222222222222222222222",
      startTime: "2000",
      cliffSeconds: "200",
      durationSeconds: "1200",
      tgeUnlockBps: "750",
      maxTotalClaimable: "2000000",
    });

    expect(result.campaign.campaignId).toBe("10");
    expect(result.campaign.eventCount).toBe(1);
    expect(setTimeoutSpy).toHaveBeenCalled();
    setTimeoutSpy.mockRestore();
  });

  it("throws when campaign id cannot be derived from either the write result or event query", async () => {
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      campaignCount: vi.fn().mockResolvedValue({ statusCode: 200, body: "1" }),
      createCampaign: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xcreate-write", result: null },
      }),
      campaignCreatedEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xcreate-receipt" }]),
      getCampaign: vi.fn(),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xcreate-receipt");
    const context = {
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: {
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
        }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 403 })),
        })),
      },
    } as never;

    await expect(runCreateRewardCampaignWorkflow(context, auth, undefined, {
      merkleRoot: "0x3333333333333333333333333333333333333333333333333333333333333333",
      startTime: "3000",
      cliffSeconds: "300",
      durationSeconds: "1800",
      tgeUnlockBps: "900",
      maxTotalClaimable: "3000000",
    })).rejects.toThrow("create-reward-campaign could not derive campaign id");
  });
});
