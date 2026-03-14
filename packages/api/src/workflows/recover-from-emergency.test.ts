import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createEmergencyPrimitiveService: vi.fn(),
  waitForWorkflowWriteReceipt: vi.fn(),
}));

vi.mock("../modules/emergency/primitives/generated/index.js", () => ({
  createEmergencyPrimitiveService: mocks.createEmergencyPrimitiveService,
}));

vi.mock("./wait-for-write.js", () => ({
  waitForWorkflowWriteReceipt: mocks.waitForWorkflowWriteReceipt,
}));

import { runRecoverFromEmergencyWorkflow } from "./recover-from-emergency.js";

describe("recover-from-emergency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce("0xstart")
      .mockResolvedValueOnce("0xapprove")
      .mockResolvedValueOnce("0xstep")
      .mockResolvedValueOnce("0xcomplete")
      .mockResolvedValueOnce("0xresume");
  });

  it("runs start, approve, execute, complete, and immediate resume", async () => {
    const getIncident = vi.fn()
      .mockResolvedValueOnce({
        statusCode: 200,
        body: {
          id: "9",
          incidentType: "0",
          description: "incident",
          reporter: "0x00000000000000000000000000000000000000aa",
          timestamp: "10",
          resolved: false,
          actions: [],
          approvers: [],
          resolutionTime: "0",
        },
      })
      .mockResolvedValueOnce({
        statusCode: 200,
        body: {
          id: "9",
          incidentType: "0",
          description: "incident",
          reporter: "0x00000000000000000000000000000000000000aa",
          timestamp: "10",
          resolved: true,
          actions: [],
          approvers: [],
          resolutionTime: "40",
        },
      })
      .mockResolvedValueOnce({
        statusCode: 200,
        body: {
          id: "9",
          incidentType: "0",
          description: "incident",
          reporter: "0x00000000000000000000000000000000000000aa",
          timestamp: "10",
          resolved: true,
          actions: [],
          approvers: [],
          resolutionTime: "40",
        },
      })
      .mockResolvedValueOnce({
        statusCode: 200,
        body: {
          id: "9",
          incidentType: "0",
          description: "incident",
          reporter: "0x00000000000000000000000000000000000000aa",
          timestamp: "10",
          resolved: true,
          actions: [],
          approvers: [],
          resolutionTime: "40",
        },
      });
    const getRecoveryPlan = vi.fn()
      .mockResolvedValueOnce({ statusCode: 200, body: [[], false, "0", "0", "0", []] })
      .mockResolvedValueOnce({ statusCode: 200, body: [["0x1234"], false, "20", "0", "0", []] })
      .mockResolvedValueOnce({ statusCode: 200, body: [["0x1234"], true, "20", "0", "1", []] })
      .mockResolvedValueOnce({ statusCode: 200, body: [["0x1234"], true, "20", "0", "1", ["0xab"]] })
      .mockResolvedValueOnce({ statusCode: 200, body: [["0x1234"], true, "20", "40", "1", ["0xab"]] })
      .mockResolvedValueOnce({ statusCode: 200, body: [["0x1234"], true, "20", "40", "1", ["0xab"]] })
      .mockResolvedValueOnce({ statusCode: 200, body: [["0x1234"], true, "20", "40", "1", ["0xab"]] });

    mocks.createEmergencyPrimitiveService.mockReturnValue({
      getEmergencyState: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "3" })
        .mockResolvedValueOnce({ statusCode: 200, body: "0" })
        .mockResolvedValueOnce({ statusCode: 200, body: "0" })
        .mockResolvedValueOnce({ statusCode: 200, body: "0" }),
      isEmergencyStopped: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      getEmergencyTimeout: vi.fn().mockResolvedValue({ statusCode: 200, body: "3600" }),
      getIncident,
      getRecoveryPlan,
      startRecovery: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xstart" } }),
      approveRecovery: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xapprove" } }),
      executeRecoveryStep: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xstep" } }),
      completeRecovery: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xcomplete" } }),
      emergencyResume: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xresume" } }),
      scheduleEmergencyResume: vi.fn(),
      executeScheduledResume: vi.fn(),
      recoveryStartedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xstart" }] }),
      recoveryStepExecutedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xstep" }] }),
      recoveryCompletedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xcomplete" }] }),
      emergencyStateChangedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xresume" }] }),
      emergencyResumeExecutedEventQuery: vi.fn(),
    });

    const result = await runRecoverFromEmergencyWorkflow(
      {
        apiKeys: {},
        providerRouter: {
          withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: { getTransactionReceipt: () => Promise<unknown>; }) => Promise<unknown>) => work({
            getTransactionReceipt: vi.fn(async () => ({ blockNumber: 100 })),
          })),
        },
      } as never,
      { apiKey: "admin", label: "admin", roles: ["service"], allowGasless: false },
      "0x00000000000000000000000000000000000000aa",
      {
        incidentId: "9",
        start: {
          steps: ["0x1234"],
        },
        approve: {},
        execute: {
          stepIndices: ["0"],
        },
        complete: {},
        resume: {
          mode: "immediate",
        },
      },
    );

    expect(result.summary).toEqual({
      incidentId: "9",
      recoveryPhaseBefore: "not-started",
      recoveryPhaseAfter: "completed",
      completed: true,
      resumedToNormal: true,
      executedStepCount: 1,
      resumeMode: "immediate",
    });
    expect(result.recovery.start?.eventCount).toBe(1);
    expect(result.recovery.executedSteps[0]?.eventCount).toBe(1);
    expect(result.recovery.completion?.eventCount).toBe(1);
  });

  it("supports scheduled resume mode", async () => {
    mocks.waitForWorkflowWriteReceipt.mockReset();
    mocks.waitForWorkflowWriteReceipt.mockResolvedValueOnce("0xschedule");
    mocks.createEmergencyPrimitiveService.mockReturnValue({
      getEmergencyState: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "1" })
        .mockResolvedValueOnce({ statusCode: 200, body: "1" })
        .mockResolvedValueOnce({ statusCode: 200, body: "1" }),
      isEmergencyStopped: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      getEmergencyTimeout: vi.fn().mockResolvedValue({ statusCode: 200, body: "3600" }),
      getIncident: vi.fn()
        .mockResolvedValueOnce({
          statusCode: 200,
          body: {
            id: "9",
            incidentType: "0",
            description: "incident",
            reporter: "0x00000000000000000000000000000000000000aa",
            timestamp: "10",
            resolved: false,
            actions: [],
            approvers: [],
            resolutionTime: "0",
          },
        })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: {
            id: "9",
            incidentType: "0",
            description: "incident",
            reporter: "0x00000000000000000000000000000000000000aa",
            timestamp: "10",
            resolved: false,
            actions: [],
            approvers: [],
            resolutionTime: "0",
          },
        }),
      getRecoveryPlan: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: [[], false, "0", "0", "0", []] })
        .mockResolvedValueOnce({ statusCode: 200, body: [[], false, "0", "0", "0", []] }),
      scheduleEmergencyResume: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xschedule" } }),
      emergencyResumeScheduledEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xschedule" }] }),
    });

    const result = await runRecoverFromEmergencyWorkflow(
      {
        apiKeys: {},
        providerRouter: {
          withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: { getTransactionReceipt: () => Promise<unknown>; }) => Promise<unknown>) => work({
            getTransactionReceipt: vi.fn(async () => ({ blockNumber: 100 })),
          })),
        },
      } as never,
      { apiKey: "admin", label: "admin", roles: ["service"], allowGasless: false },
      undefined,
      {
        incidentId: "9",
        resume: {
          mode: "schedule",
          executeAfter: "999",
        },
      },
    );

    expect(result.recovery.resume?.mode).toBe("schedule");
    expect(result.summary.resumeMode).toBe("schedule");
  });

  it("normalizes recovery step state conflicts", async () => {
    mocks.createEmergencyPrimitiveService.mockReturnValue({
      getEmergencyState: vi.fn().mockResolvedValue({ statusCode: 200, body: "3" }),
      isEmergencyStopped: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      getEmergencyTimeout: vi.fn().mockResolvedValue({ statusCode: 200, body: "3600" }),
      getIncident: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: {
          id: "9",
          incidentType: "0",
          description: "incident",
          reporter: "0x00000000000000000000000000000000000000aa",
          timestamp: "10",
          resolved: false,
          actions: [],
          approvers: [],
          resolutionTime: "0",
        },
      }),
      getRecoveryPlan: vi.fn().mockResolvedValue({ statusCode: 200, body: [[], false, "0", "0", "0", []] }),
      executeRecoveryStep: vi.fn().mockRejectedValue(new Error("SecurityErrors.RecoveryNotStarted(9)")),
    });

    await expect(runRecoverFromEmergencyWorkflow(
      { apiKeys: {}, providerRouter: {} } as never,
      { apiKey: "admin", label: "admin", roles: ["service"], allowGasless: false },
      undefined,
      {
        incidentId: "9",
        execute: {
          stepIndices: ["0"],
        },
      },
    )).rejects.toEqual(expect.objectContaining({
      statusCode: 409,
    }));
  });
});
