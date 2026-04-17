import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createEmergencyPrimitiveService: vi.fn(),
  runInspectEmergencyPostureWorkflow: vi.fn(),
  waitForWorkflowWriteReceipt: vi.fn(),
  waitForWorkflowReadback: vi.fn(),
  readWorkflowReceipt: vi.fn(),
  waitForWorkflowEventQuery: vi.fn(),
}));

vi.mock("../modules/emergency/primitives/generated/index.js", () => ({
  createEmergencyPrimitiveService: mocks.createEmergencyPrimitiveService,
}));

vi.mock("./inspect-emergency-posture.js", () => ({
  runInspectEmergencyPostureWorkflow: mocks.runInspectEmergencyPostureWorkflow,
}));

vi.mock("./wait-for-write.js", () => ({
  waitForWorkflowWriteReceipt: mocks.waitForWorkflowWriteReceipt,
}));

vi.mock("./emergency-helpers.js", async () => {
  const actual = await vi.importActual<typeof import("./emergency-helpers.js")>("./emergency-helpers.js");
  return {
    ...actual,
    waitForWorkflowReadback: mocks.waitForWorkflowReadback,
    readWorkflowReceipt: mocks.readWorkflowReceipt,
    waitForWorkflowEventQuery: mocks.waitForWorkflowEventQuery,
  };
});

import { runRecoverFromEmergencyWorkflow } from "./recover-from-emergency.js";

describe("recover-from-emergency null-path coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xcomplete");
    mocks.readWorkflowReceipt.mockResolvedValue({ blockNumber: 100 });
    mocks.waitForWorkflowEventQuery.mockResolvedValue([{ transactionHash: "0xcomplete" }]);
    mocks.waitForWorkflowReadback.mockResolvedValue({ body: {} });

    mocks.runInspectEmergencyPostureWorkflow
      .mockResolvedValueOnce({
        posture: {
          currentState: "3",
          currentStateLabel: "RECOVERY",
          isEmergencyStopped: false,
          emergencyTimeout: "3600",
        },
        incident: {
          id: "9",
          incidentType: "0",
          incidentTypeLabel: "SECURITY_BREACH",
          description: "incident",
          reporter: "0x00000000000000000000000000000000000000aa",
          timestamp: "10",
          resolved: false,
          actions: [],
          actionLabels: [],
          approvers: [],
          resolutionTime: "0",
        },
        recovery: null,
        summary: {},
      })
      .mockResolvedValueOnce({
        posture: {
          currentState: "0",
          currentStateLabel: "NORMAL",
          isEmergencyStopped: false,
          emergencyTimeout: "3600",
        },
        incident: {
          id: "9",
          incidentType: "0",
          incidentTypeLabel: "SECURITY_BREACH",
          description: "incident",
          reporter: "0x00000000000000000000000000000000000000aa",
          timestamp: "10",
          resolved: false,
          actions: [],
          actionLabels: [],
          approvers: [],
          resolutionTime: "0",
        },
        recovery: null,
        summary: {},
      });

    mocks.createEmergencyPrimitiveService.mockReturnValue({
      completeRecovery: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xcomplete" } }),
      recoveryCompletedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xcomplete" }] }),
      getIncident: vi.fn(),
      getRecoveryPlan: vi.fn(),
    });
  });

  it("falls back to null recovery phases and empty completion payloads", async () => {
    const result = await runRecoverFromEmergencyWorkflow(
      { apiKeys: {}, providerRouter: {} } as never,
      { apiKey: "admin", label: "admin", roles: ["service"], allowGasless: false },
      undefined,
      {
        incidentId: "9",
        complete: {},
      },
    );

    expect(result.recovery.completion).toMatchObject({
      txHash: "0xcomplete",
      eventCount: 1,
      incident: expect.objectContaining({
        id: null,
        resolved: null,
      }),
      recovery: expect.objectContaining({
        steps: [],
        completionTime: null,
        phase: "not-started",
      }),
    });
    expect(result.summary).toEqual({
      incidentId: "9",
      recoveryPhaseBefore: null,
      recoveryPhaseAfter: null,
      completed: false,
      resumedToNormal: true,
      executedStepCount: 0,
      resumeMode: null,
    });
  });
});
