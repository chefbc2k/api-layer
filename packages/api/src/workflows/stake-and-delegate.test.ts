import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createStakingPrimitiveService: vi.fn(),
  createTokenomicsPrimitiveService: vi.fn(),
  waitForWorkflowWriteReceipt: vi.fn(),
}));

vi.mock("../modules/staking/primitives/generated/index.js", () => ({
  createStakingPrimitiveService: mocks.createStakingPrimitiveService,
}));

vi.mock("../modules/tokenomics/primitives/generated/index.js", () => ({
  createTokenomicsPrimitiveService: mocks.createTokenomicsPrimitiveService,
}));

vi.mock("./wait-for-write.js", () => ({
  waitForWorkflowWriteReceipt: mocks.waitForWorkflowWriteReceipt,
}));

import { runStakeAndDelegateWorkflow } from "./stake-and-delegate.js";

describe("runStakeAndDelegateWorkflow", () => {
  const auth = {
    apiKey: "test-key",
    label: "test",
    roles: ["service"],
    allowGasless: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("approves, stakes, delegates, and returns a structured result in order", async () => {
    const sequence: string[] = [];
    const receiptByTxHash = new Map([
      ["0xstake-receipt", { blockNumber: 11 }],
      ["0xdelegate-receipt", { blockNumber: 12 }],
    ]);
    const context = {
      addressBook: {
        toJSON: () => ({ diamond: "0x0000000000000000000000000000000000000ddd" }),
      },
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, label: string, work: (provider: {
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
        }) => Promise<unknown>) => {
          sequence.push(`receipt:${label}`);
          return work({
            getTransactionReceipt: vi.fn(async (txHash: string) => receiptByTxHash.get(txHash) ?? null),
          });
        }),
      },
    } as never;
    const tokenomics = {
      tokenAllowance: vi.fn()
        .mockImplementationOnce(async () => {
          sequence.push("read-allowance-before");
          return { statusCode: 200, body: "0" };
        })
        .mockImplementationOnce(async () => {
          sequence.push("read-allowance-after");
          return { statusCode: 200, body: "100" };
        }),
      tokenApprove: vi.fn().mockImplementation(async () => {
        sequence.push("approve");
        return { statusCode: 202, body: { txHash: "0xapprove-write" } };
      }),
    };
    const staking = {
      getStakeInfo: vi.fn()
        .mockImplementationOnce(async () => {
          sequence.push("read-stake-before");
          return { statusCode: 200, body: { amount: "0" } };
        })
        .mockImplementationOnce(async () => {
          sequence.push("read-stake-after");
          return { statusCode: 200, body: { amount: "100" } };
        }),
      stake: vi.fn().mockImplementation(async () => {
        sequence.push("stake");
        return { statusCode: 202, body: { txHash: "0xstake-write" } };
      }),
      stakedEventQuery: vi.fn().mockImplementation(async () => {
        sequence.push("staked-events");
        return { statusCode: 200, body: [{ transactionHash: "0xstake-receipt" }] };
      }),
      delegates: vi.fn()
        .mockImplementationOnce(async () => {
          sequence.push("read-delegate-before");
          return { statusCode: 200, body: "0x0000000000000000000000000000000000000000" };
        })
        .mockImplementationOnce(async () => {
          sequence.push("read-delegate-after");
          return { statusCode: 200, body: "0x00000000000000000000000000000000000000bb" };
        }),
      delegate: vi.fn().mockImplementation(async () => {
        sequence.push("delegate");
        return { statusCode: 202, body: { txHash: "0xdelegate-write" } };
      }),
      getCurrentVotes: vi.fn().mockImplementation(async () => {
        sequence.push("read-current-votes");
        return { statusCode: 200, body: "100" };
      }),
      delegateChangedAddressAddressAddressEventQuery: vi.fn().mockImplementation(async () => {
        sequence.push("delegate-events");
        return { statusCode: 200, body: [{ transactionHash: "0xdelegate-receipt" }] };
      }),
    };
    mocks.createTokenomicsPrimitiveService.mockReturnValue(tokenomics);
    mocks.createStakingPrimitiveService.mockReturnValue(staking);
    mocks.waitForWorkflowWriteReceipt
      .mockImplementationOnce(async () => {
        sequence.push("wait-approve");
        return "0xapprove-receipt";
      })
      .mockImplementationOnce(async () => {
        sequence.push("wait-stake");
        return "0xstake-receipt";
      })
      .mockImplementationOnce(async () => {
        sequence.push("wait-delegate");
        return "0xdelegate-receipt";
      });

    const result = await runStakeAndDelegateWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      amount: "100",
      delegatee: "0x00000000000000000000000000000000000000bb",
    });

    expect(sequence).toEqual([
      "read-allowance-before",
      "approve",
      "wait-approve",
      "read-allowance-after",
      "read-stake-before",
      "stake",
      "wait-stake",
      "receipt:workflow.stakeAndDelegate.stake.receipt",
      "read-stake-after",
      "staked-events",
      "read-delegate-before",
      "delegate",
      "wait-delegate",
      "receipt:workflow.stakeAndDelegate.delegate.receipt",
      "read-delegate-after",
      "read-current-votes",
      "delegate-events",
    ]);
    expect(result).toEqual({
      approval: {
        submission: { txHash: "0xapprove-write" },
        txHash: "0xapprove-receipt",
        spender: "0x0000000000000000000000000000000000000ddd",
        allowanceBefore: "0",
        allowanceAfter: "100",
        source: "approved",
      },
      stake: {
        submission: { txHash: "0xstake-write" },
        txHash: "0xstake-receipt",
        stakeInfoBefore: { amount: "0" },
        stakeInfoAfter: { amount: "100" },
        eventCount: 1,
      },
      delegation: {
        submission: { txHash: "0xdelegate-write" },
        txHash: "0xdelegate-receipt",
        delegateBefore: "0x0000000000000000000000000000000000000000",
        delegateAfter: "0x00000000000000000000000000000000000000bb",
        currentVotes: "100",
        eventCount: 1,
      },
      summary: {
        staker: "0x00000000000000000000000000000000000000aa",
        delegatee: "0x00000000000000000000000000000000000000bb",
        amount: "100",
      },
    });
  });

  it("skips approval when existing allowance already covers the stake amount", async () => {
    const context = {
      addressBook: {
        toJSON: () => ({ diamond: "0x0000000000000000000000000000000000000ddd" }),
      },
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: {
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
        }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 22 })),
        })),
      },
    } as never;
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      tokenAllowance: vi.fn().mockResolvedValue({ statusCode: 200, body: "1000" }),
      tokenApprove: vi.fn(),
    });
    mocks.createStakingPrimitiveService.mockReturnValue({
      getStakeInfo: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { amount: "20" } })
        .mockResolvedValueOnce({ statusCode: 200, body: { amount: "120" } }),
      stake: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xstake-write" } }),
      stakedEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xstake-receipt" }]),
      delegates: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "0x00000000000000000000000000000000000000cc" })
        .mockResolvedValueOnce({ statusCode: 200, body: "0x00000000000000000000000000000000000000bb" }),
      delegate: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xdelegate-write" } }),
      getCurrentVotes: vi.fn().mockResolvedValue({ statusCode: 200, body: "120" }),
      delegateChangedAddressAddressAddressEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xdelegate-receipt" }]),
    });
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce("0xstake-receipt")
      .mockResolvedValueOnce("0xdelegate-receipt");

    const result = await runStakeAndDelegateWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      amount: "100",
      delegatee: "0x00000000000000000000000000000000000000bb",
    });

    expect(result.approval).toEqual({
      submission: null,
      txHash: null,
      spender: "0x0000000000000000000000000000000000000ddd",
      allowanceBefore: "1000",
      allowanceAfter: "1000",
      source: "existing",
    });
  });

  it("retries allowance, stake-info, and delegation readbacks before succeeding", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: TimerHandler) => {
      if (typeof callback === "function") {
        callback();
      }
      return 0 as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);
    const context = {
      addressBook: {
        toJSON: () => ({ diamond: "0x0000000000000000000000000000000000000ddd" }),
      },
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: {
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
        }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async (txHash: string) => ({ blockNumber: txHash === "0xstake-receipt" ? 31 : 32 })),
        })),
      },
    } as never;
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      tokenAllowance: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "0" })
        .mockResolvedValueOnce({ statusCode: 200, body: "50" }),
      tokenApprove: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xapprove-write" } }),
    });
    mocks.createStakingPrimitiveService.mockReturnValue({
      getStakeInfo: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { amount: "0" } })
        .mockResolvedValueOnce({ statusCode: 200, body: { amount: "40" } })
        .mockResolvedValueOnce({ statusCode: 200, body: { amount: "50" } }),
      stake: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xstake-write" } }),
      stakedEventQuery: vi.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ transactionHash: "0xstake-receipt" }]),
      delegates: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "0x0000000000000000000000000000000000000000" })
        .mockResolvedValueOnce({ statusCode: 200, body: "0x0000000000000000000000000000000000000000" })
        .mockResolvedValueOnce({ statusCode: 200, body: "0x00000000000000000000000000000000000000bb" }),
      delegate: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xdelegate-write" } }),
      getCurrentVotes: vi.fn().mockResolvedValue({ statusCode: 200, body: "50" }),
      delegateChangedAddressAddressAddressEventQuery: vi.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ transactionHash: "0xdelegate-receipt" }]),
    });
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce("0xapprove-receipt")
      .mockResolvedValueOnce("0xstake-receipt")
      .mockResolvedValueOnce("0xdelegate-receipt");

    const result = await runStakeAndDelegateWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      amount: "50",
      delegatee: "0x00000000000000000000000000000000000000bb",
    });

    expect(result.stake.eventCount).toBe(1);
    expect(result.delegation.eventCount).toBe(1);
    setTimeoutSpy.mockRestore();
  });

  it("throws when delegation readback never stabilizes", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: TimerHandler) => {
      if (typeof callback === "function") {
        callback();
      }
      return 0 as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);
    const context = {
      addressBook: {
        toJSON: () => ({ diamond: "0x0000000000000000000000000000000000000ddd" }),
      },
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: {
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
        }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 41 })),
        })),
      },
    } as never;
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      tokenAllowance: vi.fn().mockResolvedValue({ statusCode: 200, body: "100" }),
      tokenApprove: vi.fn(),
    });
    mocks.createStakingPrimitiveService.mockReturnValue({
      getStakeInfo: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { amount: "0" } })
        .mockResolvedValueOnce({ statusCode: 200, body: { amount: "100" } }),
      stake: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xstake-write" } }),
      stakedEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xstake-receipt" }]),
      delegates: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "0x0000000000000000000000000000000000000000" })
        .mockResolvedValue({ statusCode: 200 }),
      delegate: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xdelegate-write" } }),
      getCurrentVotes: vi.fn(),
      delegateChangedAddressAddressAddressEventQuery: vi.fn(),
    });
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce("0xstake-receipt")
      .mockResolvedValueOnce("0xdelegate-receipt");

    await expect(runStakeAndDelegateWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      amount: "100",
      delegatee: "0x00000000000000000000000000000000000000bb",
    })).rejects.toThrow("stakeAndDelegate.delegateAfter readback timeout");
    setTimeoutSpy.mockRestore();
  });

  it("derives the staker from signer auth and treats missing pre-stake info as zero", async () => {
    const previousSignerMap = process.env.API_LAYER_SIGNER_MAP_JSON;
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({
      "staking-signer": "0x59c6995e998f97a5a0044966f094538c5f1c59d6a16c7a3d57ed4ac5f5f5d7c7",
    });
    const receiptByTxHash = new Map([
      ["0xstake-receipt", { blockNumber: 61 }],
      ["0xdelegate-receipt", { blockNumber: 62 }],
    ]);
    const context = {
      addressBook: {
        toJSON: () => ({ diamond: "0x0000000000000000000000000000000000000ddd" }),
      },
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: {
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
        }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async (txHash: string) => receiptByTxHash.get(txHash) ?? null),
        })),
      },
    } as never;
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      tokenAllowance: vi.fn().mockResolvedValue({ statusCode: 200, body: "100" }),
      tokenApprove: vi.fn(),
    });
    mocks.createStakingPrimitiveService.mockReturnValue({
      getStakeInfo: vi.fn()
        .mockRejectedValueOnce(new Error("missing"))
        .mockResolvedValueOnce({ statusCode: 200, body: { amount: "100" } }),
      stake: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xstake-write" } }),
      stakedEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xstake-receipt" }]),
      delegates: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "0x0000000000000000000000000000000000000000" })
        .mockResolvedValueOnce({ statusCode: 200, body: "0x00000000000000000000000000000000000000bb" }),
      delegate: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xdelegate-write" } }),
      getCurrentVotes: vi.fn().mockResolvedValue({ statusCode: 200, body: "100" }),
      delegateChangedAddressAddressAddressEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xdelegate-receipt" }]),
    });
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce("0xstake-receipt")
      .mockResolvedValueOnce("0xdelegate-receipt");

    const result = await runStakeAndDelegateWorkflow(context, { ...auth, signerId: "staking-signer" }, undefined, {
      amount: "100",
      delegatee: "0x00000000000000000000000000000000000000bb",
    });

    expect(result.summary.delegatee).toBe("0x00000000000000000000000000000000000000bb");
    expect(result.stake.stakeInfoBefore).toEqual({ amount: "0" });
    process.env.API_LAYER_SIGNER_MAP_JSON = previousSignerMap;
  });

  it("surfaces EchoScore-too-low stake reverts as an explicit workflow state block", async () => {
    const context = {
      addressBook: {
        toJSON: () => ({ diamond: "0x0000000000000000000000000000000000000ddd" }),
      },
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: {
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
        }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 22 })),
        })),
      },
    } as never;
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      tokenAllowance: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "0" })
        .mockResolvedValueOnce({ statusCode: 200, body: "1" }),
      tokenApprove: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xapprove-write" } }),
    });
    mocks.createStakingPrimitiveService.mockReturnValue({
      getStakeInfo: vi.fn().mockResolvedValue({ statusCode: 200, body: { amount: "0" } }),
      stake: vi.fn().mockRejectedValue({
        message: "execution reverted",
        diagnostics: {
          simulation: {
            topLevelCall: {
              error: "execution reverted: 0xbf5d1cac000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003e8",
            },
          },
        },
      }),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValueOnce("0xapprove-receipt");

    await expect(async () => {
      try {
        await runStakeAndDelegateWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
          amount: "1",
          delegatee: "0x00000000000000000000000000000000000000bb",
        });
      } catch (error) {
        expect(error).toMatchObject({
          statusCode: 409,
        });
        expect((error as Error).message).toBe("stake-and-delegate blocked by stake rule violation: EchoScore too low (0 < 1000)");
        throw error;
      }
    }).rejects.toThrow("stake-and-delegate blocked by stake rule violation: EchoScore too low (0 < 1000)");
  });
});
