import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runInspectRevenuePostureWorkflow: vi.fn(),
  runTreasuryRevenueOperationsWorkflow: vi.fn(),
}));

vi.mock("./inspect-revenue-posture.js", async () => {
  const actual = await vi.importActual<typeof import("./inspect-revenue-posture.js")>("./inspect-revenue-posture.js");
  return {
    ...actual,
    runInspectRevenuePostureWorkflow: mocks.runInspectRevenuePostureWorkflow,
  };
});

vi.mock("./treasury-revenue-operations.js", async () => {
  const actual = await vi.importActual<typeof import("./treasury-revenue-operations.js")>("./treasury-revenue-operations.js");
  return {
    ...actual,
    runTreasuryRevenueOperationsWorkflow: mocks.runTreasuryRevenueOperationsWorkflow,
  };
});

import { createWorkflowRouter } from "./index.js";

describe("treasury revenue workflow routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runInspectRevenuePostureWorkflow.mockResolvedValue({
      funding: { paymentToken: "0x00000000000000000000000000000000000000cc" },
      revenue: { metrics: { totalVolume: "100" }, assetRevenues: [] },
      pending: { snapshot: { treasury: "3" }, additionalPayees: [] },
      treasuryControls: null,
      summary: { includeTreasuryControls: false },
    });
    mocks.runTreasuryRevenueOperationsWorkflow.mockResolvedValue({
      posture: {
        before: { status: "completed", result: { funding: { paymentToken: "0x00000000000000000000000000000000000000cc" } }, block: null },
        after: { status: "completed", result: { funding: { paymentToken: "0x00000000000000000000000000000000000000cc" } }, block: null },
      },
      payouts: {
        sweeps: [],
      },
      summary: {
        story: "treasury revenue operations",
        sweepCount: 0,
        completedSweepCount: 0,
        blockedSteps: [],
        externalPreconditions: [],
        paymentToken: "0x00000000000000000000000000000000000000cc",
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns structured responses for inspect-revenue-posture and treasury-revenue-operations", async () => {
    const router = createWorkflowRouter({
      apiKeys: {
        "finance-key": {
          apiKey: "finance-key",
          label: "finance",
          roles: ["service"],
          allowGasless: false,
        },
      },
    } as never);

    const inspectHandler = router.stack.find((entry) => entry.route?.path === "/v1/workflows/inspect-revenue-posture")?.route?.stack?.[0]?.handle;
    const opsHandler = router.stack.find((entry) => entry.route?.path === "/v1/workflows/treasury-revenue-operations")?.route?.stack?.[0]?.handle;

    const requestFactory = (body: unknown) => ({
      body,
      header(name: string) {
        return name.toLowerCase() === "x-api-key" ? "finance-key" : undefined;
      },
    });
    const responseFactory = () => ({
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
    });

    const inspectResponse = responseFactory();
    await inspectHandler(requestFactory({}), inspectResponse);
    expect(inspectResponse.statusCode).toBe(202);
    expect(inspectResponse.payload).toEqual(expect.objectContaining({
      funding: expect.any(Object),
      revenue: expect.any(Object),
      pending: expect.any(Object),
      summary: expect.any(Object),
    }));

    const opsResponse = responseFactory();
    await opsHandler(requestFactory({ payouts: { sweeps: [{ label: "seller" }] } }), opsResponse);
    expect(opsResponse.statusCode).toBe(202);
    expect(opsResponse.payload).toEqual(expect.objectContaining({
      posture: expect.any(Object),
      payouts: expect.any(Object),
      summary: expect.any(Object),
    }));
  });

  it("rejects invalid treasury revenue input before child workflow execution", async () => {
    const router = createWorkflowRouter({
      apiKeys: {
        "finance-key": {
          apiKey: "finance-key",
          label: "finance",
          roles: ["service"],
          allowGasless: false,
        },
      },
    } as never);
    const inspectHandler = router.stack.find((entry) => entry.route?.path === "/v1/workflows/inspect-revenue-posture")?.route?.stack?.[0]?.handle;
    const opsHandler = router.stack.find((entry) => entry.route?.path === "/v1/workflows/treasury-revenue-operations")?.route?.stack?.[0]?.handle;

    const inspectResponse = {
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
    await inspectHandler({
      body: { additionalPayees: ["bad"] },
      header(name: string) {
        return name.toLowerCase() === "x-api-key" ? "finance-key" : undefined;
      },
    }, inspectResponse);
    expect(inspectResponse.statusCode).toBe(400);
    expect(mocks.runInspectRevenuePostureWorkflow).not.toHaveBeenCalled();

    const opsResponse = {
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
    await opsHandler({
      body: { payouts: { sweeps: [] } },
      header(name: string) {
        return name.toLowerCase() === "x-api-key" ? "finance-key" : undefined;
      },
    }, opsResponse);
    expect(opsResponse.statusCode).toBe(400);
    expect(mocks.runTreasuryRevenueOperationsWorkflow).not.toHaveBeenCalled();
  });
});
