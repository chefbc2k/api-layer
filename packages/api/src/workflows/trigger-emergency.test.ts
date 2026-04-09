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

import { runTriggerEmergencyWorkflow, triggerEmergencyWorkflowSchema } from "./trigger-emergency.js";

describe("trigger-emergency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce("0xreport")
      .mockResolvedValueOnce("0xtrigger")
      .mockResolvedValueOnce("0xresponse")
      .mockResolvedValueOnce("0xfreeze")
      .mockResolvedValueOnce("0xextend")
      .mockResolvedValueOnce("0xschedule");
  });

  it("runs incident report, emergency transition, response, freeze, and pause controls", async () => {
    const getIncident = vi.fn()
      .mockResolvedValueOnce({
        statusCode: 200,
        body: {
          id: "7",
          incidentType: "0",
          description: "breach",
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
          id: "7",
          incidentType: "0",
          description: "breach",
          reporter: "0x00000000000000000000000000000000000000aa",
          timestamp: "10",
          resolved: false,
          actions: ["0", "1"],
          approvers: [],
          resolutionTime: "0",
        },
      });

    mocks.createEmergencyPrimitiveService.mockReturnValue({
      getEmergencyState: vi.fn().mockResolvedValue({ statusCode: 200, body: "1" }),
      isEmergencyStopped: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      getEmergencyTimeout: vi.fn().mockResolvedValue({ statusCode: 200, body: "3600" }),
      reportIncident: vi.fn().mockResolvedValue({ statusCode: 202, body: "7" }),
      getIncident,
      triggerEmergency: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xtrigger" } }),
      emergencyStop: vi.fn(),
      executeResponse: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xresponse" } }),
      freezeAssets: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xfreeze" } }),
      isAssetFrozen: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: true })
        .mockResolvedValueOnce({ statusCode: 200, body: true }),
      extendPausedUntil: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xextend" } }),
      scheduleEmergencyResume: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xschedule" } }),
      incidentReportedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xreport" }] }),
      emergencyStateChangedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xtrigger" }] }),
      responseExecutedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xresponse" }] }),
      assetsFrozenEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xfreeze" }] }),
      pauseExtendedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xextend" }] }),
      emergencyResumeScheduledEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xschedule" }] }),
    });

    const result = await runTriggerEmergencyWorkflow(
      {
        apiKeys: {},
        providerRouter: {
          withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: { getTransactionReceipt: (txHash: string) => Promise<unknown>; }) => Promise<unknown>) => work({
            getTransactionReceipt: vi.fn(async (txHash: string) => ({ blockNumber: txHash === "0xreport" ? 101 : 102 })),
          })),
        },
      } as never,
      { apiKey: "admin", label: "admin", roles: ["service"], allowGasless: false },
      "0x00000000000000000000000000000000000000aa",
      {
        emergency: {
          state: "PAUSED",
          reason: "incident response",
          useEmergencyStop: false,
        },
        incident: {
          report: {
            incidentType: "SECURITY_BREACH",
            description: "breach",
          },
          responseActions: ["PAUSE_TRADING", "FREEZE_ASSETS"],
        },
        freezeAssets: {
          assetIds: ["1", "2"],
          reason: "containment",
        },
        pauseControl: {
          extendPausedUntil: "999",
          scheduleResumeAfter: "1200",
        },
      },
    );

    expect(result.summary).toEqual({
      incidentId: "7",
      requestedState: "PAUSED",
      resultingState: "1",
      resultingStateLabel: "PAUSED",
      responseExecuted: true,
      assetsFrozen: 2,
      resumeScheduled: true,
      pauseExtended: true,
    });
    expect(result.incident.report?.eventCount).toBe(1);
    expect(result.response?.eventCount).toBe(1);
  });

  it("supports emergency-stop mode without incident setup", async () => {
    mocks.waitForWorkflowWriteReceipt.mockReset();
    mocks.waitForWorkflowWriteReceipt.mockResolvedValueOnce("0xstop");
    mocks.createEmergencyPrimitiveService.mockReturnValue({
      getEmergencyState: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "1" })
        .mockResolvedValueOnce({ statusCode: 200, body: "1" })
        .mockResolvedValueOnce({ statusCode: 200, body: "1" }),
      isEmergencyStopped: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      getEmergencyTimeout: vi.fn().mockResolvedValue({ statusCode: 200, body: "3600" }),
      emergencyStop: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xstop" } }),
      triggerEmergency: vi.fn(),
      emergencyStateChangedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xstop" }] }),
    });

    const result = await runTriggerEmergencyWorkflow(
      {
        apiKeys: {},
        providerRouter: {
          withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: { getTransactionReceipt: () => Promise<unknown>; }) => Promise<unknown>) => work({
            getTransactionReceipt: vi.fn(async () => ({ blockNumber: 1 })),
          })),
        },
      } as never,
      { apiKey: "admin", label: "admin", roles: ["service"], allowGasless: false },
      undefined,
      {
        emergency: {
          state: "PAUSED",
          reason: "stop",
          useEmergencyStop: true,
        },
      },
    );

    expect(result.emergency.transition.mode).toBe("emergency-stop");
    expect(result.summary.incidentId).toBeNull();
  });

  it("normalizes authority failures from child writes", async () => {
    mocks.createEmergencyPrimitiveService.mockReturnValue({
      getEmergencyState: vi.fn().mockResolvedValue({ statusCode: 200, body: "0" }),
      isEmergencyStopped: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      getEmergencyTimeout: vi.fn().mockResolvedValue({ statusCode: 200, body: "3600" }),
      triggerEmergency: vi.fn().mockRejectedValue(new Error("SecurityErrors.NotEmergencyAdmin(sender)")),
    });

    await expect(runTriggerEmergencyWorkflow(
      { apiKeys: {}, providerRouter: {} } as never,
      { apiKey: "admin", label: "admin", roles: ["service"], allowGasless: false },
      undefined,
      {
        emergency: {
          state: "LOCKED_DOWN",
          reason: "deny",
          useEmergencyStop: false,
        },
      },
    )).rejects.toEqual(expect.objectContaining({
      statusCode: 409,
    }));
  });

  it("rejects unknown actor overrides", async () => {
    await expect(runTriggerEmergencyWorkflow(
      { apiKeys: {}, providerRouter: {} } as never,
      { apiKey: "admin", label: "admin", roles: ["service"], allowGasless: false },
      undefined,
      {
        emergency: {
          state: "PAUSED",
          reason: "bad actor",
          actor: { apiKey: "missing" },
          useEmergencyStop: false,
        },
      },
    )).rejects.toEqual(expect.objectContaining({
      statusCode: 400,
      message: "trigger-emergency received unknown emergency transition apiKey",
    }));
  });

  it("accepts an incident id without a report and handles null receipts for recovery transitions", async () => {
    mocks.waitForWorkflowWriteReceipt.mockReset();
    mocks.waitForWorkflowWriteReceipt.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    const emergency = {
      getEmergencyState: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "0" })
        .mockResolvedValueOnce({ statusCode: 200, body: "3" })
        .mockResolvedValueOnce({ statusCode: 200, body: "3" }),
      isEmergencyStopped: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      getEmergencyTimeout: vi.fn().mockResolvedValue({ statusCode: 200, body: "3600" }),
      triggerEmergency: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xrecover" } }),
      executeResponse: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xresponse" } }),
      getIncident: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: {
          id: "9",
          incidentType: "3",
          description: "restore",
          reporter: "0x00000000000000000000000000000000000000aa",
          timestamp: "22",
          resolved: false,
          actions: ["4"],
          approvers: [],
          resolutionTime: "0",
        },
      }),
      emergencyStateChangedEventQuery: vi.fn(),
      responseExecutedEventQuery: vi.fn(),
    };
    mocks.createEmergencyPrimitiveService.mockReturnValue(emergency);

    const result = await runTriggerEmergencyWorkflow(
      { apiKeys: {}, providerRouter: {} } as never,
      { apiKey: "admin", label: "admin", roles: ["service"], allowGasless: false },
      undefined,
      {
        emergency: {
          state: "RECOVERY",
          reason: "recover safely",
          useEmergencyStop: false,
        },
        incident: {
          id: "9",
          responseActions: ["RESTORE_STATE"],
        },
        pauseControl: {},
      },
    );

    expect(result.incident.report).toBeNull();
    expect(result.response).toMatchObject({
      txHash: null,
      eventCount: 0,
      incidentId: "9",
    });
    expect(result.pauseControl).toEqual({
      extendPause: null,
      scheduleResume: null,
    });
    expect(result.summary).toEqual({
      incidentId: "9",
      requestedState: "RECOVERY",
      resultingState: "3",
      resultingStateLabel: "RECOVERY",
      responseExecuted: true,
      assetsFrozen: 0,
      resumeScheduled: false,
      pauseExtended: false,
    });
    expect(emergency.emergencyStateChangedEventQuery).not.toHaveBeenCalled();
    expect(emergency.responseExecutedEventQuery).not.toHaveBeenCalled();
  });

  it("enforces schema refinements for emergency-stop state and response action context", () => {
    const invalidStop = triggerEmergencyWorkflowSchema.safeParse({
      emergency: {
        state: "LOCKED_DOWN",
        reason: "bad",
        useEmergencyStop: true,
      },
    });
    const missingIncidentContext = triggerEmergencyWorkflowSchema.safeParse({
      emergency: {
        state: "PAUSED",
        reason: "bad",
        useEmergencyStop: false,
      },
      incident: {
        responseActions: ["PAUSE_TRADING"],
      },
    });

    expect(invalidStop.success).toBe(false);
    expect(missingIncidentContext.success).toBe(false);
    expect(invalidStop.error?.issues.map((issue) => issue.message)).toContain("trigger-emergency useEmergencyStop requires PAUSED state");
    expect(missingIncidentContext.error?.issues.map((issue) => issue.message)).toContain(
      "trigger-emergency responseActions require incident id or incident report",
    );
  });

  it("accepts child actor overrides and tolerates missing receipts across non-report writes", async () => {
    mocks.waitForWorkflowWriteReceipt.mockReset();
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce("0xreport")
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const childAuth = { apiKey: "child-key", label: "child", roles: ["service"], allowGasless: false };
    const triggerEmergency = vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xtrigger" } });
    const executeResponse = vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xresponse" } });
    const freezeAssets = vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xfreeze" } });
    const extendPausedUntil = vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xextend" } });
    const scheduleEmergencyResume = vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xschedule" } });

    mocks.createEmergencyPrimitiveService.mockReturnValue({
      getEmergencyState: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "0" })
        .mockResolvedValueOnce({ statusCode: 200, body: "2" })
        .mockResolvedValueOnce({ statusCode: 200, body: "2" }),
      isEmergencyStopped: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      getEmergencyTimeout: vi.fn().mockResolvedValue({ statusCode: 200, body: "3600" }),
      reportIncident: vi.fn().mockResolvedValue({ statusCode: 202, body: "7" }),
      getIncident: vi.fn()
        .mockResolvedValueOnce({
          statusCode: 200,
          body: {
            id: "7",
            incidentType: "0",
            description: "breach",
            reporter: "0x00000000000000000000000000000000000000bb",
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
            id: "7",
            incidentType: "0",
            description: "breach",
            reporter: "0x00000000000000000000000000000000000000bb",
            timestamp: "10",
            resolved: false,
            actions: ["2"],
            approvers: [],
            resolutionTime: "0",
          },
        }),
      triggerEmergency,
      emergencyStop: vi.fn(),
      executeResponse,
      freezeAssets,
      isAssetFrozen: vi.fn().mockResolvedValue({ statusCode: 200, body: true }),
      extendPausedUntil,
      scheduleEmergencyResume,
      incidentReportedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xreport" }] }),
      emergencyStateChangedEventQuery: vi.fn(),
      responseExecutedEventQuery: vi.fn(),
      assetsFrozenEventQuery: vi.fn(),
      pauseExtendedEventQuery: vi.fn(),
      emergencyResumeScheduledEventQuery: vi.fn(),
    });

    const result = await runTriggerEmergencyWorkflow(
      {
        apiKeys: { "child-key": childAuth },
        providerRouter: {
          withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: { getTransactionReceipt: (txHash: string) => Promise<unknown>; }) => Promise<unknown>) => work({
            getTransactionReceipt: vi.fn(async (txHash: string) => ({ blockNumber: txHash === "0xreport" ? 101 : 102 })),
          })),
        },
      } as never,
      { apiKey: "admin", label: "admin", roles: ["service"], allowGasless: false },
      "0x00000000000000000000000000000000000000aa",
      {
        emergency: {
          state: "LOCKED_DOWN",
          reason: "lock",
          actor: { apiKey: "child-key", walletAddress: "0x00000000000000000000000000000000000000bb" },
          useEmergencyStop: false,
        },
        incident: {
          report: {
            actor: { apiKey: "child-key", walletAddress: "0x00000000000000000000000000000000000000bb" },
            incidentType: "SECURITY_BREACH",
            description: "breach",
          },
          responseActions: ["LOCK_TRANSFERS"],
        },
        freezeAssets: {
          actor: { apiKey: "child-key", walletAddress: "0x00000000000000000000000000000000000000bb" },
          assetIds: ["1"],
          reason: "containment",
        },
        pauseControl: {
          actor: { apiKey: "child-key", walletAddress: "0x00000000000000000000000000000000000000bb" },
          extendPausedUntil: "999",
          scheduleResumeAfter: "1200",
        },
      },
    );

    expect(result.summary).toEqual({
      incidentId: "7",
      requestedState: "LOCKED_DOWN",
      resultingState: "2",
      resultingStateLabel: "LOCKED_DOWN",
      responseExecuted: true,
      assetsFrozen: 1,
      resumeScheduled: true,
      pauseExtended: true,
    });
    expect(result.response).toMatchObject({ txHash: null, eventCount: 0 });
    expect(result.assetFreeze).toMatchObject({ txHash: null, eventCount: 0 });
    expect(result.pauseControl).toEqual({
      extendPause: { submission: { txHash: "0xextend" }, txHash: null, eventCount: 0, pausedUntil: "999" },
      scheduleResume: { submission: { txHash: "0xschedule" }, txHash: null, eventCount: 0, executeAfter: "1200" },
    });
    expect(triggerEmergency).toHaveBeenCalledWith(expect.objectContaining({
      auth: childAuth,
      walletAddress: "0x00000000000000000000000000000000000000bb",
    }));
    expect(executeResponse).toHaveBeenCalledWith(expect.objectContaining({
      auth: childAuth,
      walletAddress: "0x00000000000000000000000000000000000000bb",
    }));
    expect(freezeAssets).toHaveBeenCalledWith(expect.objectContaining({
      auth: childAuth,
      walletAddress: "0x00000000000000000000000000000000000000bb",
    }));
    expect(extendPausedUntil).toHaveBeenCalledWith(expect.objectContaining({
      auth: childAuth,
      walletAddress: "0x00000000000000000000000000000000000000bb",
    }));
  });

  it.each([
    [
      "report-incident",
      {
        emergency: { state: "PAUSED" as const, reason: "incident response", useEmergencyStop: false },
        incident: { report: { incidentType: "SECURITY_BREACH" as const, description: "breach" } },
      },
      {
        reportIncident: vi.fn().mockRejectedValue(new Error("SecurityErrors.NotEmergencyAdmin(sender)")),
      },
    ],
    [
      "execute-response",
      {
        emergency: { state: "RECOVERY" as const, reason: "recover", useEmergencyStop: false },
        incident: { id: "9", responseActions: ["RESTORE_STATE" as const] },
      },
      {
        executeResponse: vi.fn().mockRejectedValue(new Error("SecurityErrors.NotEmergencyAdmin(sender)")),
      },
    ],
    [
      "freeze-assets",
      {
        emergency: { state: "PAUSED" as const, reason: "freeze", useEmergencyStop: false },
        freezeAssets: { assetIds: ["1"], reason: "containment" },
      },
      {
        freezeAssets: vi.fn().mockRejectedValue(new Error("SecurityErrors.NotEmergencyAdmin(sender)")),
      },
    ],
    [
      "extend-paused-until",
      {
        emergency: { state: "PAUSED" as const, reason: "extend", useEmergencyStop: false },
        pauseControl: { extendPausedUntil: "999" },
      },
      {
        extendPausedUntil: vi.fn().mockRejectedValue(new Error("SecurityErrors.NotEmergencyAdmin(sender)")),
      },
    ],
    [
      "schedule-emergency-resume",
      {
        emergency: { state: "PAUSED" as const, reason: "resume later", useEmergencyStop: false },
        pauseControl: { scheduleResumeAfter: "1200" },
      },
      {
        scheduleEmergencyResume: vi.fn().mockRejectedValue(new Error("SecurityErrors.NotEmergencyAdmin(sender)")),
      },
    ],
  ])("normalizes %s failures", async (_label, body, overrides) => {
    mocks.waitForWorkflowWriteReceipt.mockReset();
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xtrigger");

    mocks.createEmergencyPrimitiveService.mockReturnValue({
      getEmergencyState: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "0" })
        .mockResolvedValueOnce({ statusCode: 200, body: body.emergency.state === "RECOVERY" ? "3" : "1" })
        .mockResolvedValueOnce({ statusCode: 200, body: body.emergency.state === "RECOVERY" ? "3" : "1" }),
      isEmergencyStopped: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      getEmergencyTimeout: vi.fn().mockResolvedValue({ statusCode: 200, body: "3600" }),
      reportIncident: vi.fn(),
      getIncident: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: {
          id: "9",
          incidentType: "0",
          description: "incident",
          reporter: "0x00000000000000000000000000000000000000aa",
          timestamp: "10",
          resolved: false,
          actions: ["4"],
          approvers: [],
          resolutionTime: "0",
        },
      }),
      triggerEmergency: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xtrigger" } }),
      emergencyStop: vi.fn(),
      executeResponse: vi.fn(),
      freezeAssets: vi.fn(),
      isAssetFrozen: vi.fn().mockResolvedValue({ statusCode: 200, body: true }),
      extendPausedUntil: vi.fn(),
      scheduleEmergencyResume: vi.fn(),
      emergencyStateChangedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xtrigger" }] }),
      incidentReportedEventQuery: vi.fn(),
      responseExecutedEventQuery: vi.fn(),
      assetsFrozenEventQuery: vi.fn(),
      pauseExtendedEventQuery: vi.fn(),
      emergencyResumeScheduledEventQuery: vi.fn(),
      ...overrides,
    });

    await expect(runTriggerEmergencyWorkflow(
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
      body,
    )).rejects.toEqual(expect.objectContaining({
      statusCode: 409,
    }));
  });
});
