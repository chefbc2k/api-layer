import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createVoiceAssetsPrimitiveService: vi.fn(),
}));

vi.mock("../modules/voice-assets/primitives/generated/index.js", () => ({
  createVoiceAssetsPrimitiveService: mocks.createVoiceAssetsPrimitiveService,
}));

import { runInspectLegacyMigrationPostureWorkflow } from "./inspect-legacy-migration-posture.js";

describe("runInspectLegacyMigrationPostureWorkflow", () => {
  const auth = {
    apiKey: "legacy-owner-key",
    label: "owner",
    roles: ["service"],
    allowGasless: false,
  };
  const context = {} as never;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns legacy posture with plan and readiness summary", async () => {
    const service = {
      getLegacyPlan: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: {
          memo: "family trust",
          voiceAssets: [`0x${"1".repeat(64)}`],
          datasetIds: ["12"],
          beneficiaries: [{ account: "0x00000000000000000000000000000000000000bb" }],
          conditions: {
            requiresProof: true,
            minApprovals: "2",
          },
          isActive: true,
          isExecuted: false,
        },
      }),
      isInheritanceReady: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: { result: true },
      }),
    };
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue(service);

    const result = await runInspectLegacyMigrationPostureWorkflow(context, auth, undefined, {
      owner: "0x00000000000000000000000000000000000000aa",
      voiceHash: `0x${"2".repeat(64)}`,
    });

    expect(service.getLegacyPlan).toHaveBeenCalledOnce();
    expect(service.isInheritanceReady).toHaveBeenCalledOnce();
    expect(result.summary).toEqual({
      owner: "0x00000000000000000000000000000000000000aa",
      voiceHash: `0x${"2".repeat(64)}`,
      hasPlan: true,
      beneficiaryCount: 1,
      voiceAssetCount: 1,
      inheritanceReady: true,
    });
    expect(result.legacy.summary).toEqual({
      beneficiaryCount: 1,
      voiceAssetCount: 1,
      datasetCount: 1,
      requiresProof: true,
      minApprovals: "2",
      active: true,
      executed: false,
    });
  });

  it("uses walletAddress when owner is omitted and skips readiness when voiceHash is absent", async () => {
    const service = {
      getLegacyPlan: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: {
          memo: "",
          voiceAssets: [],
          datasetIds: [],
          beneficiaries: [],
          conditions: {},
          isActive: false,
          isExecuted: false,
        },
      }),
      isInheritanceReady: vi.fn(),
    };
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue(service);

    const result = await runInspectLegacyMigrationPostureWorkflow(context, auth, "0x00000000000000000000000000000000000000cc", {});

    expect(result.summary.owner).toBe("0x00000000000000000000000000000000000000cc");
    expect(result.summary.hasPlan).toBe(false);
    expect(result.summary.inheritanceReady).toBeNull();
    expect(service.isInheritanceReady).not.toHaveBeenCalled();
  });
});
