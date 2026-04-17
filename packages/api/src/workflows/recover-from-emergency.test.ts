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

import { recoverFromEmergencyWorkflowSchema, runRecoverFromEmergencyWorkflow } from "./recover-from-emergency.js";

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

  it("supports execute-scheduled resume mode and schema guardrails", async () => {
    mocks.waitForWorkflowWriteReceipt.mockReset();
    mocks.waitForWorkflowWriteReceipt.mockResolvedValueOnce("0xexecute");
    mocks.createEmergencyPrimitiveService.mockReturnValue({
      getEmergencyState: vi.fn().mockResolvedValue({ statusCode: 200, body: "0" }),
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
      executeScheduledResume: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xexecute" } }),
      emergencyResumeExecutedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xexecute" }] }),
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
          mode: "execute-scheduled",
        },
      },
    );

    expect(result.recovery.resume?.mode).toBe("execute-scheduled");
    expect(result.recovery.resume?.eventCount).toBe(1);
    expect(result.summary.resumeMode).toBe("execute-scheduled");

    expect(() => recoverFromEmergencyWorkflowSchema.parse({ incidentId: "9" })).toThrow(
      "recover-from-emergency expected at least one recovery action",
    );
    expect(() => recoverFromEmergencyWorkflowSchema.parse({
      incidentId: "9",
      resume: {
        mode: "schedule",
      },
    })).toThrow("recover-from-emergency schedule resume requires executeAfter");
  });

  it("accepts governance approval readbacks without count growth and tolerates missing receipts", async () => {
    mocks.waitForWorkflowWriteReceipt.mockReset();
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("0xapprove")
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const approveRecovery = vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xapprove" } });
    const executeRecoveryStep = vi.fn()
      .mockResolvedValueOnce({ statusCode: 202, body: { txHash: "0xstep-0" } })
      .mockResolvedValueOnce({ statusCode: 202, body: { txHash: "0xstep-1" } });
    const completeRecovery = vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xcomplete" } });

    mocks.createEmergencyPrimitiveService.mockReturnValue({
      getEmergencyState: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "3" })
        .mockResolvedValueOnce({ statusCode: 200, body: "3" }),
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
        }),
      getRecoveryPlan: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: [[], false, "0", "0", "0", []] })
        .mockResolvedValueOnce({ statusCode: 200, body: [["0x1234", "0x5678"], false, "20", "0", "0", []] })
        .mockResolvedValueOnce({ statusCode: 200, body: [["0x1234", "0x5678"], true, "20", "0", "0", []] })
        .mockResolvedValueOnce({ statusCode: 200, body: [["0x1234", "0x5678"], true, "20", "0", "0", ["0xaa"]] })
        .mockResolvedValueOnce({ statusCode: 200, body: [["0x1234", "0x5678"], true, "20", "0", "0", ["0xaa", "0xbb"]] })
        .mockResolvedValueOnce({ statusCode: 200, body: [["0x1234", "0x5678"], true, "20", "40", "0", ["0xaa", "0xbb"]] })
        .mockResolvedValueOnce({ statusCode: 200, body: [["0x1234", "0x5678"], true, "20", "40", "0", ["0xaa", "0xbb"]] }),
      startRecovery: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xstart" } }),
      approveRecovery,
      executeRecoveryStep,
      completeRecovery,
      recoveryStartedEventQuery: vi.fn(),
      recoveryStepExecutedEventQuery: vi.fn(),
      recoveryCompletedEventQuery: vi.fn(),
    });

    const result = await runRecoverFromEmergencyWorkflow(
      { apiKeys: {}, providerRouter: {} } as never,
      { apiKey: "admin", label: "admin", roles: ["service"], allowGasless: false },
      undefined,
      {
        incidentId: "9",
        start: {
          steps: ["0x1234", "0x5678"],
        },
        approve: {},
        execute: {
          stepIndices: ["0", "1"],
        },
        complete: {},
      },
    );

    expect(result.recovery.start).toMatchObject({ txHash: null, eventCount: 0 });
    expect(result.recovery.approval?.recovery.approvedByGovernance).toBe(true);
    expect(result.recovery.executedSteps).toHaveLength(2);
    expect(result.recovery.executedSteps.every((step) => step.eventCount === 0)).toBe(true);
    expect(result.recovery.completion).toMatchObject({ txHash: null, eventCount: 0 });
    expect(approveRecovery).toHaveBeenCalledOnce();
    expect(executeRecoveryStep).toHaveBeenCalledTimes(2);
    expect(completeRecovery).toHaveBeenCalledOnce();
  });

  it("covers missing prior recovery state for approval", async () => {
    mocks.waitForWorkflowWriteReceipt.mockReset();
    mocks.waitForWorkflowWriteReceipt.mockResolvedValueOnce("0xapprove");

    const approveRecovery = vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xapprove" } });

    mocks.createEmergencyPrimitiveService.mockReturnValue({
      getEmergencyState: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "3" })
        .mockResolvedValueOnce({ statusCode: 200, body: "3" }),
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
        .mockResolvedValueOnce({ statusCode: 200, body: null })
        .mockResolvedValueOnce({ statusCode: 200, body: [[], false, "0", "0", "1", []] })
        .mockResolvedValueOnce({ statusCode: 200, body: null })
        .mockResolvedValue({ statusCode: 200, body: null }),
      approveRecovery,
      recoveryStartedEventQuery: vi.fn(),
      recoveryCompletedEventQuery: vi.fn(),
    });

    const context = {
      apiKeys: {},
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: { getTransactionReceipt: () => Promise<unknown>; }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 100 })),
        })),
      },
    } as never;
    const auth = { apiKey: "admin", label: "admin", roles: ["service"], allowGasless: false };

    const approval = await runRecoverFromEmergencyWorkflow(
      context,
      auth,
      undefined,
      {
        incidentId: "9",
        approve: {},
      },
    );
    expect(approval.recovery.approval?.recovery.approvalCount).toBe("1");
  });

  it("covers missing prior recovery state for execution", async () => {
    mocks.waitForWorkflowWriteReceipt.mockReset();
    mocks.waitForWorkflowWriteReceipt.mockResolvedValueOnce("0xstep");

    const executeRecoveryStep = vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xstep" } });

    mocks.createEmergencyPrimitiveService.mockReturnValue({
      getEmergencyState: vi.fn()
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
        .mockResolvedValueOnce({ statusCode: 200, body: null })
        .mockResolvedValueOnce({ statusCode: 200, body: [[], false, "0", "0", "0", ["0xaa"]] })
        .mockResolvedValueOnce({ statusCode: 200, body: null }),
      executeRecoveryStep,
      recoveryStepExecutedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xstep" }] }),
    });

    const context = {
      apiKeys: {},
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: { getTransactionReceipt: () => Promise<unknown>; }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 100 })),
        })),
      },
    } as never;
    const auth = { apiKey: "admin", label: "admin", roles: ["service"], allowGasless: false };

    const execution = await runRecoverFromEmergencyWorkflow(
      context,
      auth,
      undefined,
      {
        incidentId: "9",
        execute: {
          stepIndices: ["0"],
        },
      },
    );
    expect(execution.recovery.executedSteps[0]).toMatchObject({
      stepIndex: "0",
      txHash: "0xstep",
      eventCount: 1,
    });
  });

  it("supports scheduled resume mode when the write receipt never resolves", async () => {
    mocks.waitForWorkflowWriteReceipt.mockReset();
    mocks.waitForWorkflowWriteReceipt.mockResolvedValueOnce(null);
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
        .mockResolvedValueOnce({ statusCode: 200, body: null })
        .mockResolvedValueOnce({ statusCode: 200, body: null }),
      scheduleEmergencyResume: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xschedule" } }),
      emergencyResumeScheduledEventQuery: vi.fn(),
    });

    const context = {
      apiKeys: {},
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: { getTransactionReceipt: () => Promise<unknown>; }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 100 })),
        })),
      },
    } as never;
    const auth = { apiKey: "admin", label: "admin", roles: ["service"], allowGasless: false };

    const scheduledResume = await runRecoverFromEmergencyWorkflow(
      context,
      auth,
      undefined,
      {
        incidentId: "9",
        resume: {
          mode: "schedule",
          executeAfter: "999",
        },
      },
    );
    expect(scheduledResume.recovery.resume).toMatchObject({
      mode: "schedule",
      txHash: null,
      eventCount: 0,
    });
  });

  it("supports execute-scheduled resume mode when the write receipt never resolves", async () => {
    mocks.waitForWorkflowWriteReceipt.mockReset();
    mocks.waitForWorkflowWriteReceipt.mockResolvedValueOnce(null);
    mocks.createEmergencyPrimitiveService.mockReturnValue({
      getEmergencyState: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "0" })
        .mockResolvedValueOnce({ statusCode: 200, body: "0" })
        .mockResolvedValueOnce({ statusCode: 200, body: "0" })
        .mockResolvedValueOnce({ statusCode: 200, body: "0" }),
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
        .mockResolvedValueOnce({ statusCode: 200, body: null })
        .mockResolvedValueOnce({ statusCode: 200, body: null }),
      executeScheduledResume: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xexecute" } }),
      emergencyResumeExecutedEventQuery: vi.fn(),
    });

    const context = {
      apiKeys: {},
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: { getTransactionReceipt: () => Promise<unknown>; }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 100 })),
        })),
      },
    } as never;
    const auth = { apiKey: "admin", label: "admin", roles: ["service"], allowGasless: false };

    const executeScheduledResume = await runRecoverFromEmergencyWorkflow(
      context,
      auth,
      undefined,
      {
        incidentId: "9",
        resume: {
          mode: "execute-scheduled",
        },
      },
    );
    expect(executeScheduledResume.recovery.resume).toMatchObject({
      mode: "execute-scheduled",
      txHash: null,
      eventCount: 0,
    });
  });

  it("supports immediate resume mode when the write receipt never resolves", async () => {
    mocks.waitForWorkflowWriteReceipt.mockReset();
    mocks.waitForWorkflowWriteReceipt.mockResolvedValueOnce(null);
    mocks.createEmergencyPrimitiveService.mockReturnValue({
      getEmergencyState: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "0" })
        .mockResolvedValueOnce({ statusCode: 200, body: "0" })
        .mockResolvedValueOnce({ statusCode: 200, body: "0" })
        .mockResolvedValueOnce({ statusCode: 200, body: "0" }),
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
        .mockResolvedValueOnce({ statusCode: 200, body: null })
        .mockResolvedValueOnce({ statusCode: 200, body: null }),
      emergencyResume: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xresume" } }),
      emergencyStateChangedEventQuery: vi.fn(),
    });

    const context = {
      apiKeys: {},
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: { getTransactionReceipt: () => Promise<unknown>; }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 100 })),
        })),
      },
    } as never;
    const auth = { apiKey: "admin", label: "admin", roles: ["service"], allowGasless: false };

    const immediateResume = await runRecoverFromEmergencyWorkflow(
      context,
      auth,
      undefined,
      {
        incidentId: "9",
        resume: {
          mode: "immediate",
        },
      },
    );
    expect(immediateResume.recovery.resume).toMatchObject({
      mode: "immediate",
      txHash: null,
      eventCount: 0,
    });
  });

  it.each([
    [
      "start-recovery",
      {
        incidentId: "9",
        start: { steps: ["0x1234"] },
      },
      {
        startRecovery: vi.fn().mockRejectedValue(new Error("SecurityErrors.NotEmergencyAdmin(sender)")),
      },
    ],
    [
      "approve-recovery",
      {
        incidentId: "9",
        approve: {},
      },
      {
        approveRecovery: vi.fn().mockRejectedValue(new Error("SecurityErrors.NotEmergencyAdmin(sender)")),
      },
    ],
    [
      "complete-recovery",
      {
        incidentId: "9",
        complete: {},
      },
      {
        completeRecovery: vi.fn().mockRejectedValue(new Error("SecurityErrors.NotEmergencyAdmin(sender)")),
      },
    ],
    [
      "schedule-resume",
      {
        incidentId: "9",
        resume: { mode: "schedule" as const, executeAfter: "999" },
      },
      {
        scheduleEmergencyResume: vi.fn().mockRejectedValue(new Error("SecurityErrors.NotEmergencyAdmin(sender)")),
      },
    ],
    [
      "execute-scheduled-resume",
      {
        incidentId: "9",
        resume: { mode: "execute-scheduled" as const },
      },
      {
        executeScheduledResume: vi.fn().mockRejectedValue(new Error("SecurityErrors.NotEmergencyAdmin(sender)")),
      },
    ],
    [
      "emergency-resume",
      {
        incidentId: "9",
        resume: { mode: "immediate" as const },
      },
      {
        emergencyResume: vi.fn().mockRejectedValue(new Error("SecurityErrors.NotEmergencyAdmin(sender)")),
      },
    ],
  ])("normalizes %s failures", async (_label, body, overrides) => {
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
      startRecovery: vi.fn(),
      approveRecovery: vi.fn(),
      executeRecoveryStep: vi.fn(),
      completeRecovery: vi.fn(),
      emergencyResume: vi.fn(),
      scheduleEmergencyResume: vi.fn(),
      executeScheduledResume: vi.fn(),
      ...overrides,
    });

    await expect(runRecoverFromEmergencyWorkflow(
      { apiKeys: {}, providerRouter: {} } as never,
      { apiKey: "admin", label: "admin", roles: ["service"], allowGasless: false },
      undefined,
      body,
    )).rejects.toEqual(expect.objectContaining({
      statusCode: 409,
    }));
  });
});
