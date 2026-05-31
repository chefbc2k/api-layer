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

import { runClaimRewardCampaignWorkflow } from "./claim-reward-campaign.js";

describe("runClaimRewardCampaignWorkflow", () => {
  const auth = {
    apiKey: "test-key",
    label: "test",
    roles: ["service"],
    allowGasless: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.API_LAYER_SIGNER_MAP_JSON;
  });

  it("claims rewards and confirms claimed, claimable, and campaign totals in order", async () => {
    const sequence: string[] = [];
    const context = {
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, label: string, work: (provider: {
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
        }) => Promise<unknown>) => {
          sequence.push(`receipt:${label}`);
          return work({
            getTransactionReceipt: vi.fn(async () => ({ blockNumber: 601 })),
          });
        }),
      },
    } as never;
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      getCampaign: vi.fn()
        .mockImplementationOnce(async () => {
          sequence.push("campaign-before");
          return { statusCode: 200, body: { totalClaimed: "10", paused: false } };
        })
        .mockImplementationOnce(async () => {
          sequence.push("campaign-after");
          return { statusCode: 200, body: { totalClaimed: "30", paused: false } };
        }),
      claimableAmount: vi.fn()
        .mockImplementationOnce(async () => {
          sequence.push("claimable-before");
          return { statusCode: 200, body: "20" };
        })
        .mockImplementationOnce(async () => {
          sequence.push("claimable-after");
          return { statusCode: 200, body: "0" };
        }),
      claimed: vi.fn()
        .mockImplementationOnce(async () => {
          sequence.push("claimed-before");
          return { statusCode: 200, body: "5" };
        })
        .mockImplementationOnce(async () => {
          sequence.push("claimed-after");
          return { statusCode: 200, body: "25" };
        }),
      claim: vi.fn().mockImplementation(async () => {
        sequence.push("claim");
        return { statusCode: 202, body: { txHash: "0xclaim-write", result: "20" } };
      }),
      claimedEventQuery: vi.fn().mockImplementation(async () => {
        sequence.push("claimed-events");
        return [{ transactionHash: "0xclaim-receipt", amount: "20" }];
      }),
    });
    mocks.waitForWorkflowWriteReceipt.mockImplementationOnce(async () => {
      sequence.push("wait-claim");
      return "0xclaim-receipt";
    });

    const result = await runClaimRewardCampaignWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      campaignId: "14",
      totalAllocation: "100",
      proof: ["0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],
    });

    expect(sequence).toEqual([
      "campaign-before",
      "claimable-before",
      "claimed-before",
      "claim",
      "wait-claim",
      "receipt:workflow.claimRewardCampaign.claim.receipt",
      "claimed-events",
      "claimed-after",
      "claimable-after",
      "campaign-after",
    ]);
    expect(result).toEqual({
      campaign: {
        before: { totalClaimed: "10", paused: false },
        after: { totalClaimed: "30", paused: false },
      },
      claimable: {
        before: "20",
        after: "0",
      },
      claimed: {
        before: "5",
        after: "25",
        claimedNow: "20",
      },
      claim: {
        submission: { txHash: "0xclaim-write", result: "20" },
        txHash: "0xclaim-receipt",
        eventCount: 1,
      },
      summary: {
        campaignId: "14",
        claimer: "0x00000000000000000000000000000000000000aa",
        totalAllocation: "100",
      },
    });
  });

  it("can derive the claimer from signer auth and fall back to event-derived claimed amount", async () => {
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({
      "signer-1": "0x59c6995e998f97a5a0044976f7d0b6d62f4ea6b2dff7e94ece66d3bb5dc4080a",
    });
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      getCampaign: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { totalClaimed: "0", paused: false } })
        .mockResolvedValueOnce({ statusCode: 200, body: { totalClaimed: "15", paused: false } }),
      claimableAmount: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "15" })
        .mockResolvedValueOnce({ statusCode: 200, body: "0" }),
      claimed: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "0" })
        .mockResolvedValueOnce({ statusCode: 200, body: "15" }),
      claim: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xclaim-write", result: null } }),
      claimedEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xclaim-receipt", amount: "15" }]),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xclaim-receipt");
    const context = {
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: {
          getTransactionReceipt?: (txHash: string) => Promise<unknown>;
        }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 602 })),
        })),
      },
    } as never;

    const result = await runClaimRewardCampaignWorkflow(context, {
      ...auth,
      signerId: "signer-1",
    }, undefined, {
      campaignId: "15",
      totalAllocation: "15",
      proof: ["0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"],
    });

    expect(result.claimed.claimedNow).toBe("15");
    expect(result.summary.claimer).toMatch(/^0x[a-fA-F0-9]{40}$/u);
  });

  it("throws when post-claim claimed balance never increases", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: TimerHandler) => {
      if (typeof callback === "function") {
        callback();
      }
      return 0 as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      getCampaign: vi.fn().mockResolvedValue({ statusCode: 200, body: { totalClaimed: "5", paused: false } }),
      claimableAmount: vi.fn().mockResolvedValue({ statusCode: 200, body: "10" }),
      claimed: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "5" })
        .mockResolvedValue({ statusCode: 200, body: "5" }),
      claim: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xclaim-write", result: "10" } }),
      claimedEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xclaim-receipt", amount: "10" }]),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xclaim-receipt");
    const context = {
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: {
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
        }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 603 })),
        })),
      },
    } as never;

    await expect(runClaimRewardCampaignWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      campaignId: "16",
      totalAllocation: "10",
      proof: ["0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"],
    })).rejects.toThrow("claimRewardCampaign.claimedAfter readback timeout");
    setTimeoutSpy.mockRestore();
  });

  it("normalizes insufficient campaign funding into an explicit workflow block", async () => {
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      getCampaign: vi.fn().mockResolvedValue({ statusCode: 200, body: { totalClaimed: "0", paused: false } }),
      claimableAmount: vi.fn().mockResolvedValue({ statusCode: 200, body: "2" }),
      claimed: vi.fn().mockResolvedValue({ statusCode: 200, body: "0" }),
      claim: vi.fn().mockRejectedValue({
        message: "execution reverted: InsufficientCampaignFunding(uint256,uint256)",
        diagnostics: { cause: "execution reverted: InsufficientCampaignFunding(uint256,uint256)" },
      }),
      claimedEventQuery: vi.fn(),
    });

    try {
      await runClaimRewardCampaignWorkflow({
        providerRouter: { withProvider: vi.fn() },
      } as never, auth, "0x00000000000000000000000000000000000000aa", {
        campaignId: "17",
        totalAllocation: "2",
        proof: [],
      });
      throw new Error("expected workflow to throw");
    } catch (error) {
      expect((error as { statusCode?: number }).statusCode).toBe(409);
      expect((error as Error).message).toBe("claim-reward-campaign blocked by setup/state: campaign has no token funding");
    }
  });

  it("supports claim flows without a mined receipt by accepting increasing readbacks", async () => {
    const claimedEventQuery = vi.fn();
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      getCampaign: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { totalClaimed: "10", paused: false } })
        .mockResolvedValueOnce({ statusCode: 200, body: { totalClaimed: "11", paused: false } }),
      claimableAmount: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "1" })
        .mockResolvedValueOnce({ statusCode: 200, body: "0" }),
      claimed: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "5" })
        .mockResolvedValueOnce({ statusCode: 200, body: "6" }),
      claim: vi.fn().mockResolvedValue({ statusCode: 202, body: { accepted: true } }),
      claimedEventQuery,
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue(null);

    const result = await runClaimRewardCampaignWorkflow({
      providerRouter: { withProvider: vi.fn() },
    } as never, auth, "0x00000000000000000000000000000000000000aa", {
      campaignId: "18",
      totalAllocation: "1",
      proof: ["0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"],
    });

    expect(result.claimed).toEqual({
      before: "5",
      after: "6",
      claimedNow: null,
    });
    expect(result.claim).toEqual({
      submission: { accepted: true },
      txHash: null,
      eventCount: 0,
    });
    expect(claimedEventQuery).not.toHaveBeenCalled();
  });

  it("retries through non-200 claimed and campaign readbacks before confirming progress", async () => {
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      getCampaign: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { totalClaimed: "10", paused: false } })
        .mockResolvedValueOnce({ statusCode: 503, body: { error: "lagging indexer" } })
        .mockResolvedValueOnce({ statusCode: 200, body: { totalClaimed: "18", paused: false } }),
      claimableAmount: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "8" })
        .mockResolvedValueOnce({ statusCode: 200, body: "0" }),
      claimed: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "2" })
        .mockResolvedValueOnce({ statusCode: 503, body: { error: "lagging indexer" } })
        .mockResolvedValueOnce({ statusCode: 200, body: "10" }),
      claim: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xclaim-write", result: "8" } }),
      claimedEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xclaim-receipt", amount: "8" }]),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xclaim-receipt");
    const context = {
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: {
          getTransactionReceipt?: (txHash: string) => Promise<unknown>;
        }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 604 })),
        })),
      },
    } as never;
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: TimerHandler) => {
      if (typeof callback === "function") {
        callback();
      }
      return 0 as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);

    const result = await runClaimRewardCampaignWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      campaignId: "21",
      totalAllocation: "8",
      proof: ["0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"],
    });

    expect(result.claimed).toEqual({
      before: "2",
      after: "10",
      claimedNow: "8",
    });
    expect(result.campaign).toEqual({
      before: { totalClaimed: "10", paused: false },
      after: { totalClaimed: "18", paused: false },
    });
    setTimeoutSpy.mockRestore();
  });

  it.each([
    [
      "campaign not found",
      {
        message: "execution reverted: CampaignNotFound(uint256)",
        diagnostics: { selector: "0x2c067cd7", nested: { reason: "CampaignNotFound" } },
      },
      "claim-reward-campaign blocked by setup/state: campaign not found",
    ],
    [
      "campaign paused",
      {
        message: "execution reverted: CampaignPaused()",
        diagnostics: { selector: "0xab1902ee", paused: true },
      },
      "claim-reward-campaign blocked by setup/state: campaign is paused",
    ],
    [
      "invalid merkle proof",
      {
        message: "execution reverted: InvalidMerkleProof(bytes32[])",
        diagnostics: { selector: "0xb05e92fa", attempts: 2 },
      },
      "claim-reward-campaign blocked by invalid proof inputs",
    ],
    [
      "nothing to claim",
      {
        message: "execution reverted: NothingToClaim()",
        diagnostics: { selector: "0x969bf728", claimable: 0n },
      },
      "claim-reward-campaign blocked by missing claim eligibility: zero claimable amount",
    ],
    [
      "invalid allocation",
      {
        message: "execution reverted: InvalidAllocation(uint256)",
        diagnostics: { selector: "0x0baf7432", requested: 999 },
      },
      "claim-reward-campaign blocked by invalid allocation input",
    ],
    [
      "campaign cap exceeded",
      {
        message: "execution reverted: ExceedsCampaignCap(uint256)",
        diagnostics: { selector: "0x939fc1db", capReached: true },
      },
      "claim-reward-campaign blocked by campaign cap",
    ],
  ])("normalizes %s reverts into workflow-specific 409 errors", async (_label, claimError, expectedMessage) => {
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      getCampaign: vi.fn().mockResolvedValue({ statusCode: 200, body: { totalClaimed: "0", paused: false } }),
      claimableAmount: vi.fn().mockResolvedValue({ statusCode: 200, body: "5" }),
      claimed: vi.fn().mockResolvedValue({ statusCode: 200, body: "0" }),
      claim: vi.fn().mockRejectedValue(claimError),
      claimedEventQuery: vi.fn(),
    });

    await expect(runClaimRewardCampaignWorkflow({
      providerRouter: { withProvider: vi.fn() },
    } as never, auth, "0x00000000000000000000000000000000000000aa", {
      campaignId: "19",
      totalAllocation: "5",
      proof: [],
    })).rejects.toMatchObject({
      statusCode: 409,
      message: expectedMessage,
      diagnostics: claimError.diagnostics,
    });
  });

  it("normalizes selector-only claim failures when the thrown value has no message field", async () => {
    const claimError = {
      diagnostics: {
        selector: "0x939fc1db",
        nested: {
          reason: "ExceedsCampaignCap",
        },
      },
    };
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      getCampaign: vi.fn().mockResolvedValue({ statusCode: 200, body: { totalClaimed: "0", paused: false } }),
      claimableAmount: vi.fn().mockResolvedValue({ statusCode: 200, body: "5" }),
      claimed: vi.fn().mockResolvedValue({ statusCode: 200, body: "0" }),
      claim: vi.fn().mockRejectedValue(claimError),
      claimedEventQuery: vi.fn(),
    });

    await expect(runClaimRewardCampaignWorkflow({
      providerRouter: { withProvider: vi.fn() },
    } as never, auth, "0x00000000000000000000000000000000000000aa", {
      campaignId: "19",
      totalAllocation: "5",
      proof: [],
    })).rejects.toMatchObject({
      statusCode: 409,
      message: "claim-reward-campaign blocked by campaign cap",
      diagnostics: claimError.diagnostics,
    });
  });

  it("rethrows unknown claim failures unchanged", async () => {
    const claimError = new Error("unexpected claim failure");
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      getCampaign: vi.fn().mockResolvedValue({ statusCode: 200, body: { totalClaimed: "0", paused: false } }),
      claimableAmount: vi.fn().mockResolvedValue({ statusCode: 200, body: "1" }),
      claimed: vi.fn().mockResolvedValue({ statusCode: 200, body: "0" }),
      claim: vi.fn().mockRejectedValue(claimError),
      claimedEventQuery: vi.fn(),
    });

    await expect(runClaimRewardCampaignWorkflow({
      providerRouter: { withProvider: vi.fn() },
    } as never, auth, "0x00000000000000000000000000000000000000aa", {
      campaignId: "20",
      totalAllocation: "1",
      proof: [],
    })).rejects.toBe(claimError);
  });
});
