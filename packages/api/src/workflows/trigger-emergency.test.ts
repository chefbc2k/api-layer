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

import { runTriggerEmergencyWorkflow } from "./trigger-emergency.js";

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
});
