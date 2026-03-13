import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import { createWorkflowRouter } from "./index.js";

describe("stake-and-delegate workflow route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the structured staking workflow result over the router path", async () => {
    const receiptByTxHash = new Map([
      ["0xstake-receipt", { blockNumber: 51 }],
      ["0xdelegate-receipt", { blockNumber: 52 }],
    ]);
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      tokenAllowance: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "0" })
        .mockResolvedValueOnce({ statusCode: 200, body: "10" }),
      tokenApprove: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xapprove-write" } }),
    });
    mocks.createStakingPrimitiveService.mockReturnValue({
      getStakeInfo: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { amount: "0" } })
        .mockResolvedValueOnce({ statusCode: 200, body: { amount: "10" } }),
      stake: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xstake-write" } }),
      stakedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xstake-receipt" }] }),
      delegates: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "0x0000000000000000000000000000000000000000" })
        .mockResolvedValueOnce({ statusCode: 200, body: "0x00000000000000000000000000000000000000bb" }),
      delegate: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xdelegate-write" } }),
      getCurrentVotes: vi.fn().mockResolvedValue({ statusCode: 200, body: "10" }),
      delegateChangedAddressAddressAddressEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xdelegate-receipt" }] }),
    });
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce("0xapprove-receipt")
      .mockResolvedValueOnce("0xstake-receipt")
      .mockResolvedValueOnce("0xdelegate-receipt");

    const router = createWorkflowRouter({
      apiKeys: {
        "test-key": {
          apiKey: "test-key",
          label: "test",
          roles: ["service"],
          allowGasless: false,
        },
      },
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
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/stake-and-delegate");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
        amount: "10",
        delegatee: "0x00000000000000000000000000000000000000bb",
      },
      header(name: string) {
        if (name.toLowerCase() === "x-api-key") {
          return "test-key";
        }
        if (name.toLowerCase() === "x-wallet-address") {
          return "0x00000000000000000000000000000000000000aa";
        }
        return undefined;
      },
    };
    const response = {
      statusCode: 200,
      payload: undefined as unknown,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: unknown) {
        this.payload = payload;
        return this;
      },
    };

    await handler(request, response);

    expect(response.statusCode).toBe(202);
    expect(response.payload).toEqual({
      approval: {
        submission: { txHash: "0xapprove-write" },
        txHash: "0xapprove-receipt",
        spender: "0x0000000000000000000000000000000000000ddd",
        allowanceBefore: "0",
        allowanceAfter: "10",
        source: "approved",
      },
      stake: {
        submission: { txHash: "0xstake-write" },
        txHash: "0xstake-receipt",
        stakeInfoBefore: { amount: "0" },
        stakeInfoAfter: { amount: "10" },
        eventCount: 1,
      },
      delegation: {
        submission: { txHash: "0xdelegate-write" },
        txHash: "0xdelegate-receipt",
        delegateBefore: "0x0000000000000000000000000000000000000000",
        delegateAfter: "0x00000000000000000000000000000000000000bb",
        currentVotes: "10",
        eventCount: 1,
      },
      summary: {
        staker: "0x00000000000000000000000000000000000000aa",
        delegatee: "0x00000000000000000000000000000000000000bb",
        amount: "10",
      },
    });
  });

  it("rejects invalid staking workflow input before invoking primitives", async () => {
    const router = createWorkflowRouter({
      apiKeys: {
        "test-key": {
          apiKey: "test-key",
          label: "test",
          roles: ["service"],
          allowGasless: false,
        },
      },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/stake-and-delegate");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
        amount: "bad",
        delegatee: "0x00000000000000000000000000000000000000bb",
      },
      header(name: string) {
        if (name.toLowerCase() === "x-api-key") {
          return "test-key";
        }
        return undefined;
      },
    };
    const response = {
      statusCode: 200,
      payload: undefined as unknown,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: unknown) {
        this.payload = payload;
        return this;
      },
    };

    await handler(request, response);

    expect(response.statusCode).toBe(400);
    expect(response.payload).toMatchObject({
      error: expect.stringContaining("Invalid string"),
    });
    expect(mocks.createTokenomicsPrimitiveService).not.toHaveBeenCalled();
    expect(mocks.createStakingPrimitiveService).not.toHaveBeenCalled();
  });

  it("returns a state-blocked response when stake simulation reports EchoScoreTooLow", async () => {
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
      stakedEventQuery: vi.fn(),
      delegates: vi.fn(),
      delegate: vi.fn(),
      getCurrentVotes: vi.fn(),
      delegateChangedAddressAddressAddressEventQuery: vi.fn(),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValueOnce("0xapprove-receipt");

    const router = createWorkflowRouter({
      apiKeys: {
        "test-key": {
          apiKey: "test-key",
          label: "test",
          roles: ["service"],
          allowGasless: false,
        },
      },
      addressBook: {
        toJSON: () => ({ diamond: "0x0000000000000000000000000000000000000ddd" }),
      },
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: {
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
        }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 77 })),
        })),
      },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/stake-and-delegate");
    const handler = layer?.route?.stack?.[0]?.handle;
    const request = {
      body: {
        amount: "1",
        delegatee: "0x00000000000000000000000000000000000000bb",
      },
      header(name: string) {
        if (name.toLowerCase() === "x-api-key") {
          return "test-key";
        }
        if (name.toLowerCase() === "x-wallet-address") {
          return "0x00000000000000000000000000000000000000aa";
        }
        return undefined;
      },
    };
    const response = {
      statusCode: 200,
      payload: undefined as unknown,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: unknown) {
        this.payload = payload;
        return this;
      },
    };

    await handler(request, response);

    expect(response.statusCode).toBe(409);
    expect(response.payload).toMatchObject({
      error: "stake-and-delegate blocked by stake rule violation: EchoScore too low (0 < 1000)",
    });
  });
});
