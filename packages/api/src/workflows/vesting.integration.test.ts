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

describe("vesting workflow routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the structured create-beneficiary-vesting workflow result over the router path", async () => {
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      hasVestingSchedule: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: false })
        .mockResolvedValueOnce({ statusCode: 200, body: true }),
      getStandardVestingSchedule: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: {} })
        .mockResolvedValueOnce({ statusCode: 200, body: { totalAmount: "1000", revoked: false } }),
      getVestingDetails: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: {} })
        .mockResolvedValueOnce({ statusCode: 200, body: { totalAmount: "1000", revoked: false } }),
      getVestingReleasableAmount: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "0" })
        .mockResolvedValueOnce({ statusCode: 200, body: "0" }),
      getVestingTotalAmount: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { totalVested: "0", totalReleased: "0", releasable: "0" } })
        .mockResolvedValueOnce({ statusCode: 200, body: { totalVested: "1000", totalReleased: "0", releasable: "0" } }),
      createFounderVesting: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xcreate" } }),
      vestingScheduleCreatedEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xcreate-receipt" }]),
      createCexVesting: vi.fn(),
      createDevFundVesting: vi.fn(),
      createPublicVesting: vi.fn(),
      createTeamVesting: vi.fn(),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xcreate-receipt");

    const router = createWorkflowRouter({
      apiKeys: { "test-key": { apiKey: "test-key", label: "test", roles: ["service"], allowGasless: false } },
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: {
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
        }) => Promise<unknown>) => work({ getTransactionReceipt: vi.fn(async () => ({ blockNumber: 1001 })) })),
      },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/create-beneficiary-vesting");
    const handler = layer?.route?.stack?.[0]?.handle;
    const request = {
      body: {
        beneficiary: "0x00000000000000000000000000000000000000bb",
        amount: "1000",
        scheduleKind: "founder",
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
      create: { txHash: "0xcreate-receipt", eventCount: 1, scheduleKind: "founder" },
      summary: { beneficiary: "0x00000000000000000000000000000000000000bb" },
    });
  });

  it("returns the structured inspect-beneficiary-vesting workflow result over the router path", async () => {
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      hasVestingSchedule: vi.fn().mockResolvedValue({ statusCode: 200, body: true }),
      getStandardVestingSchedule: vi.fn().mockResolvedValue({ statusCode: 200, body: { totalAmount: "1000", revoked: false } }),
      getVestingDetails: vi.fn().mockResolvedValue({ statusCode: 200, body: { releasedAmount: "50" } }),
      getVestingReleasableAmount: vi.fn().mockResolvedValue({ statusCode: 200, body: "20" }),
      getVestingTotalAmount: vi.fn().mockResolvedValue({ statusCode: 200, body: { totalVested: "200", totalReleased: "50", releasable: "20" } }),
    });
    const router = createWorkflowRouter({
      apiKeys: { "test-key": { apiKey: "test-key", label: "test", roles: ["service"], allowGasless: false } },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/inspect-beneficiary-vesting");
    const handler = layer?.route?.stack?.[0]?.handle;
    const request = {
      body: { beneficiary: "0x00000000000000000000000000000000000000bb" },
      header(name: string) { return name.toLowerCase() === "x-api-key" ? "test-key" : undefined; },
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
      summary: { hasSchedule: true },
    });
  });

  it("returns the structured release-beneficiary-vesting workflow result over the router path", async () => {
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      hasVestingSchedule: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: true })
        .mockResolvedValueOnce({ statusCode: 200, body: true }),
      getStandardVestingSchedule: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { releasedAmount: "10", totalAmount: "1000", revoked: false } })
        .mockResolvedValueOnce({ statusCode: 200, body: { releasedAmount: "30", totalAmount: "1000", revoked: false } }),
      getVestingDetails: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { releasedAmount: "10" } })
        .mockResolvedValueOnce({ statusCode: 200, body: { releasedAmount: "30" } }),
      getVestingReleasableAmount: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "20" })
        .mockResolvedValueOnce({ statusCode: 200, body: "0" }),
      getVestingTotalAmount: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { totalVested: "100", totalReleased: "10", releasable: "20" } })
        .mockResolvedValueOnce({ statusCode: 200, body: { totalVested: "120", totalReleased: "30", releasable: "0" } }),
      releaseStandardVestingFor: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xrelease", result: "20" } }),
      releaseStandardVesting: vi.fn(),
      tokensReleasedEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xrelease-receipt", amount: "20" }]),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xrelease-receipt");

    const router = createWorkflowRouter({
      apiKeys: { "test-key": { apiKey: "test-key", label: "test", roles: ["service"], allowGasless: false } },
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: {
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
        }) => Promise<unknown>) => work({ getTransactionReceipt: vi.fn(async () => ({ blockNumber: 1002 })) })),
      },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/release-beneficiary-vesting");
    const handler = layer?.route?.stack?.[0]?.handle;
    const request = {
      body: { beneficiary: "0x00000000000000000000000000000000000000bb", mode: "for" },
      header(name: string) { return name.toLowerCase() === "x-api-key" ? "test-key" : undefined; },
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
      release: { txHash: "0xrelease-receipt", releasedNow: "20", eventCount: 1 },
    });
  });

  it("returns the structured revoke-beneficiary-vesting workflow result over the router path", async () => {
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      hasVestingSchedule: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: true })
        .mockResolvedValueOnce({ statusCode: 200, body: true }),
      getStandardVestingSchedule: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { revoked: false, totalAmount: "1000" } })
        .mockResolvedValueOnce({ statusCode: 200, body: { revoked: true, totalAmount: "1000" } }),
      getVestingDetails: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { revoked: false } })
        .mockResolvedValueOnce({ statusCode: 200, body: { revoked: true } }),
      getVestingReleasableAmount: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "0" })
        .mockResolvedValueOnce({ statusCode: 200, body: "0" }),
      getVestingTotalAmount: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { totalVested: "1000", totalReleased: "0", releasable: "0" } })
        .mockResolvedValueOnce({ statusCode: 200, body: { totalVested: "1000", totalReleased: "0", releasable: "0" } }),
      revokeVestingSchedule: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xrevoke" } }),
      vestingScheduleRevokedEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xrevoke-receipt" }]),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xrevoke-receipt");

    const router = createWorkflowRouter({
      apiKeys: { "test-key": { apiKey: "test-key", label: "test", roles: ["service"], allowGasless: false } },
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: {
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
        }) => Promise<unknown>) => work({ getTransactionReceipt: vi.fn(async () => ({ blockNumber: 1003 })) })),
      },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/revoke-beneficiary-vesting");
    const handler = layer?.route?.stack?.[0]?.handle;
    const request = {
      body: { beneficiary: "0x00000000000000000000000000000000000000bb" },
      header(name: string) { return name.toLowerCase() === "x-api-key" ? "test-key" : undefined; },
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
      revoke: { txHash: "0xrevoke-receipt", eventCount: 1 },
      summary: { revokedAfter: true },
    });
  });
});
