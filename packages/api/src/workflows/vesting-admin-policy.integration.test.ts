import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import { createWorkflowRouter } from "./index.js";

describe("vesting admin policy workflow routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the structured inspect-vesting-admin-policy workflow result over the router path", async () => {
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      getMinTwaveVestingDuration: vi.fn().mockResolvedValue({ statusCode: 200, body: "7776000" }),
      getQuarterlyUnlockRate: vi.fn().mockResolvedValue({ statusCode: 200, body: "2500" }),
    });
    const router = createWorkflowRouter({
      apiKeys: { "test-key": { apiKey: "test-key", label: "test", roles: ["service"], allowGasless: false } },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/inspect-vesting-admin-policy");
    const handler = layer?.route?.stack?.[0]?.handle;
    const request = {
      body: {},
      header(name: string) {
        return name.toLowerCase() === "x-api-key" ? "test-key" : undefined;
      },
    };
    const response = {
      statusCode: 200,
      payload: undefined as unknown,
      status(code: number) { this.statusCode = code; return this; },
      json(payload: unknown) { this.payload = payload; return this; },
    };

    await handler(request, response);

    expect(response.statusCode).toBe(202);
    expect(response.payload).toMatchObject({
      standardVesting: { readable: false },
      timewave: { minimumDuration: "7776000", quarterlyUnlockRate: "2500" },
    });
  });

  it("returns the structured update-vesting-admin-policy workflow result over the router path", async () => {
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      getMinTwaveVestingDuration: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "7776000" })
        .mockResolvedValueOnce({ statusCode: 200, body: "5184000" }),
      getQuarterlyUnlockRate: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "2500" })
        .mockResolvedValueOnce({ statusCode: 200, body: "2000" }),
      setMinimumVestingDuration: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xstandard" } }),
      setMinimumTwaveVestingDuration: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xtwave-min" } }),
      setQuarterlyUnlockRate: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xtwave-rate" } }),
    });
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce("0xstandard-receipt")
      .mockResolvedValueOnce("0xtwave-min-receipt")
      .mockResolvedValueOnce("0xtwave-rate-receipt");
    const router = createWorkflowRouter({
      apiKeys: { "test-key": { apiKey: "test-key", label: "test", roles: ["service"], allowGasless: false } },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/update-vesting-admin-policy");
    const handler = layer?.route?.stack?.[0]?.handle;
    const request = {
      body: {
        standardMinimumDuration: "86400",
        twaveMinimumDuration: "5184000",
        twaveQuarterlyUnlockRate: "2000",
      },
      header(name: string) {
        return name.toLowerCase() === "x-api-key" ? "test-key" : undefined;
      },
    };
    const response = {
      statusCode: 200,
      payload: undefined as unknown,
      status(code: number) { this.statusCode = code; return this; },
      json(payload: unknown) { this.payload = payload; return this; },
    };

    await handler(request, response);

    expect(response.statusCode).toBe(202);
    expect(response.payload).toMatchObject({
      standardVesting: {
        minimumDuration: {
          txHash: "0xstandard-receipt",
          confirmation: "receipt-only",
        },
      },
      timewave: {
        minimumDuration: {
          txHash: "0xtwave-min-receipt",
          after: "5184000",
        },
        quarterlyUnlockRate: {
          txHash: "0xtwave-rate-receipt",
          after: "2000",
        },
      },
    });
  });

  it("rejects invalid update-vesting-admin-policy input before invoking primitives", async () => {
    const router = createWorkflowRouter({
      apiKeys: { "test-key": { apiKey: "test-key", label: "test", roles: ["service"], allowGasless: false } },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/update-vesting-admin-policy");
    const handler = layer?.route?.stack?.[0]?.handle;
    const request = {
      body: {},
      header(name: string) {
        return name.toLowerCase() === "x-api-key" ? "test-key" : undefined;
      },
    };
    const response = {
      statusCode: 200,
      payload: undefined as unknown,
      status(code: number) { this.statusCode = code; return this; },
      json(payload: unknown) { this.payload = payload; return this; },
    };

    await handler(request, response);

    expect(response.statusCode).toBe(400);
    expect(mocks.createTokenomicsPrimitiveService).not.toHaveBeenCalled();
  });
});
