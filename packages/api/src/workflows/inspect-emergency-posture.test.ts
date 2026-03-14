import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createEmergencyPrimitiveService: vi.fn(),
}));

vi.mock("../modules/emergency/primitives/generated/index.js", () => ({
  createEmergencyPrimitiveService: mocks.createEmergencyPrimitiveService,
}));

import { runInspectEmergencyPostureWorkflow } from "./inspect-emergency-posture.js";

describe("inspect-emergency-posture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns structured posture, incident, recovery, asset, and withdrawal inspection", async () => {
    mocks.createEmergencyPrimitiveService.mockReturnValue({
      getEmergencyState: vi.fn().mockResolvedValue({ statusCode: 200, body: "1" }),
      isEmergencyStopped: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      getEmergencyTimeout: vi.fn().mockResolvedValue({ statusCode: 200, body: "3600" }),
      getIncident: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: {
          id: "7",
          incidentType: "1",
          description: "bug",
          reporter: "0x00000000000000000000000000000000000000aa",
          timestamp: "10",
          resolved: false,
          actions: ["0", "1"],
          approvers: ["0x00000000000000000000000000000000000000bb"],
          resolutionTime: "0",
        },
      }),
      getRecoveryPlan: vi.fn().mockResolvedValue({ statusCode: 200, body: [["0x1234"], true, "10", "0", "2", []] }),
      isAssetFrozen: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: true })
        .mockResolvedValueOnce({ statusCode: 200, body: false }),
      getApprovalCount: vi.fn().mockResolvedValue({ statusCode: 200, body: "2" }),
      isRecipientWhitelisted: vi.fn().mockResolvedValue({ statusCode: 200, body: true }),
    });

    const result = await runInspectEmergencyPostureWorkflow(
      { providerRouter: {}, apiKeys: {} } as never,
      { apiKey: "admin", label: "admin", roles: ["service"], allowGasless: false },
      "0x00000000000000000000000000000000000000cc",
      {
        incidentId: "7",
        assetIds: ["1", "2"],
        withdrawal: {
          requestId: `0x${"1".repeat(64)}`,
          recipient: "0x00000000000000000000000000000000000000dd",
        },
      },
    );

    expect(result).toEqual({
      posture: {
        currentState: "1",
        currentStateLabel: "PAUSED",
        isEmergencyStopped: false,
        emergencyTimeout: "3600",
      },
      incident: expect.objectContaining({
        id: "7",
        incidentTypeLabel: "SMART_CONTRACT_BUG",
      }),
      recovery: expect.objectContaining({
        approvalCount: "2",
        phase: "executing",
      }),
      assets: [
        { assetId: "1", frozen: true },
        { assetId: "2", frozen: false },
      ],
      withdrawal: {
        requestId: `0x${"1".repeat(64)}`,
        approvalCount: "2",
        recipient: "0x00000000000000000000000000000000000000dd",
        recipientWhitelisted: true,
        instantRequest: false,
      },
      summary: expect.objectContaining({
        currentStateLabel: "PAUSED",
        frozenAssetCount: 1,
      }),
    });
  });

  it("supports posture-only inspection", async () => {
    mocks.createEmergencyPrimitiveService.mockReturnValue({
      getEmergencyState: vi.fn().mockResolvedValue({ statusCode: 200, body: "0" }),
      isEmergencyStopped: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      getEmergencyTimeout: vi.fn().mockResolvedValue({ statusCode: 200, body: "7200" }),
    });

    const result = await runInspectEmergencyPostureWorkflow(
      { providerRouter: {}, apiKeys: {} } as never,
      { apiKey: "reader", label: "reader", roles: ["service"], allowGasless: false },
      undefined,
      {},
    );

    expect(result.summary).toEqual({
      currentState: "0",
      currentStateLabel: "NORMAL",
      emergencyStopped: false,
      incidentId: null,
      incidentResolved: null,
      recoveryPhase: null,
      frozenAssetCount: 0,
      withdrawalRequestTracked: false,
      recipientWhitelisted: null,
    });
  });
});
