import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runInspectEmergencyPostureWorkflow: vi.fn(),
  runTriggerEmergencyWorkflow: vi.fn(),
  runRecoverFromEmergencyWorkflow: vi.fn(),
  runEmergencyWithdrawalSequenceWorkflow: vi.fn(),
}));

vi.mock("./inspect-emergency-posture.js", async () => {
  const actual = await vi.importActual<typeof import("./inspect-emergency-posture.js")>("./inspect-emergency-posture.js");
  return {
    ...actual,
    runInspectEmergencyPostureWorkflow: mocks.runInspectEmergencyPostureWorkflow,
  };
});

vi.mock("./trigger-emergency.js", async () => {
  const actual = await vi.importActual<typeof import("./trigger-emergency.js")>("./trigger-emergency.js");
  return {
    ...actual,
    runTriggerEmergencyWorkflow: mocks.runTriggerEmergencyWorkflow,
  };
});

vi.mock("./recover-from-emergency.js", async () => {
  const actual = await vi.importActual<typeof import("./recover-from-emergency.js")>("./recover-from-emergency.js");
  return {
    ...actual,
    runRecoverFromEmergencyWorkflow: mocks.runRecoverFromEmergencyWorkflow,
  };
});

vi.mock("./emergency-withdrawal-sequence.js", async () => {
  const actual = await vi.importActual<typeof import("./emergency-withdrawal-sequence.js")>("./emergency-withdrawal-sequence.js");
  return {
    ...actual,
    runEmergencyWithdrawalSequenceWorkflow: mocks.runEmergencyWithdrawalSequenceWorkflow,
  };
});

import { createWorkflowRouter } from "./index.js";

describe("emergency incident response workflow routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runInspectEmergencyPostureWorkflow.mockResolvedValue({
      posture: { currentState: "1", currentStateLabel: "PAUSED", isEmergencyStopped: false, emergencyTimeout: "3600" },
      incident: null,
      recovery: null,
      assets: [],
      withdrawal: null,
      summary: { currentState: "1", currentStateLabel: "PAUSED" },
    });
    mocks.runTriggerEmergencyWorkflow.mockResolvedValue({
      posture: { before: {}, after: {} },
      incident: { usedIncidentId: "7", report: null },
      emergency: { transition: { mode: "trigger-emergency" } },
      response: null,
      assetFreeze: null,
      pauseControl: null,
      summary: { incidentId: "7", resultingStateLabel: "PAUSED" },
    });
    mocks.runRecoverFromEmergencyWorkflow.mockResolvedValue({
      posture: { before: {}, after: {} },
      recovery: { before: null, start: null, approval: null, executedSteps: [], completion: null, resume: null, after: null },
      incident: { before: null, after: null },
      summary: { incidentId: "7", resumedToNormal: false },
    });
    mocks.runEmergencyWithdrawalSequenceWorkflow.mockResolvedValue({
      whitelist: null,
      request: { requestId: `0x${"1".repeat(64)}` },
      approvals: [],
      execute: null,
      withdrawalState: { executed: false },
      summary: { requestId: `0x${"1".repeat(64)}`, executed: false },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns structured emergency workflow responses over the router path", async () => {
    const router = createWorkflowRouter({
      apiKeys: {
        "admin-key": {
          apiKey: "admin-key",
          label: "admin",
          roles: ["service"],
          allowGasless: false,
        },
      },
    } as never);

    const requestFactory = (body: unknown) => ({
      body,
      header(name: string) {
        if (name.toLowerCase() === "x-api-key") {
          return "admin-key";
        }
        return undefined;
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

    const inspectHandler = router.stack.find((entry) => entry.route?.path === "/v1/workflows/inspect-emergency-posture")?.route?.stack?.[0]?.handle;
    const triggerHandler = router.stack.find((entry) => entry.route?.path === "/v1/workflows/trigger-emergency")?.route?.stack?.[0]?.handle;
    const recoverHandler = router.stack.find((entry) => entry.route?.path === "/v1/workflows/recover-from-emergency")?.route?.stack?.[0]?.handle;
    const withdrawalHandler = router.stack.find((entry) => entry.route?.path === "/v1/workflows/emergency-withdrawal-sequence")?.route?.stack?.[0]?.handle;

    const inspectResponse = responseFactory();
    await inspectHandler(requestFactory({ incidentId: "7" }), inspectResponse);
    expect(inspectResponse.statusCode).toBe(202);
    expect(inspectResponse.payload).toEqual(expect.objectContaining({
      posture: expect.any(Object),
      summary: expect.any(Object),
    }));

    const triggerResponse = responseFactory();
    await triggerHandler(requestFactory({
      emergency: {
        state: "PAUSED",
        reason: "incident",
      },
    }), triggerResponse);
    expect(triggerResponse.statusCode).toBe(202);
    expect(triggerResponse.payload).toEqual(expect.objectContaining({
      emergency: expect.any(Object),
      summary: expect.any(Object),
    }));

    const recoverResponse = responseFactory();
    await recoverHandler(requestFactory({
      incidentId: "7",
      resume: {
        mode: "immediate",
      },
    }), recoverResponse);
    expect(recoverResponse.statusCode).toBe(202);
    expect(recoverResponse.payload).toEqual(expect.objectContaining({
      recovery: expect.any(Object),
      summary: expect.any(Object),
    }));

    const withdrawalResponse = responseFactory();
    await withdrawalHandler(requestFactory({
      token: "0x00000000000000000000000000000000000000bb",
      amount: "1",
      recipient: "0x00000000000000000000000000000000000000cc",
    }), withdrawalResponse);
    expect(withdrawalResponse.statusCode).toBe(202);
    expect(withdrawalResponse.payload).toEqual(expect.objectContaining({
      request: expect.any(Object),
      summary: expect.any(Object),
    }));
  });

  it("rejects invalid emergency workflow input before invoking child workflows", async () => {
    const router = createWorkflowRouter({
      apiKeys: {
        "admin-key": {
          apiKey: "admin-key",
          label: "admin",
          roles: ["service"],
          allowGasless: false,
        },
      },
    } as never);
    const handler = router.stack.find((entry) => entry.route?.path === "/v1/workflows/trigger-emergency")?.route?.stack?.[0]?.handle;
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

    await handler({
      body: {
        emergency: {
          state: "RECOVERY",
          reason: "bad",
          useEmergencyStop: true,
        },
      },
      header(name: string) {
        return name.toLowerCase() === "x-api-key" ? "admin-key" : undefined;
      },
    }, response);

    expect(response.statusCode).toBe(400);
    expect(response.payload).toEqual(expect.objectContaining({
      error: expect.stringContaining("useEmergencyStop requires PAUSED state"),
    }));
    expect(mocks.runTriggerEmergencyWorkflow).not.toHaveBeenCalled();
  });
});
