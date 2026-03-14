import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runInspectLegacyMigrationPostureWorkflow: vi.fn(),
  runLegacyMigrationRecoveryWorkflow: vi.fn(),
}));

vi.mock("./inspect-legacy-migration-posture.js", async () => {
  const actual = await vi.importActual<typeof import("./inspect-legacy-migration-posture.js")>("./inspect-legacy-migration-posture.js");
  return {
    ...actual,
    runInspectLegacyMigrationPostureWorkflow: mocks.runInspectLegacyMigrationPostureWorkflow,
  };
});

vi.mock("./legacy-migration-recovery.js", async () => {
  const actual = await vi.importActual<typeof import("./legacy-migration-recovery.js")>("./legacy-migration-recovery.js");
  return {
    ...actual,
    runLegacyMigrationRecoveryWorkflow: mocks.runLegacyMigrationRecoveryWorkflow,
  };
});

import { createWorkflowRouter } from "./index.js";

describe("legacy migration workflow routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runInspectLegacyMigrationPostureWorkflow.mockResolvedValue({
      legacy: {
        owner: "0x00000000000000000000000000000000000000aa",
        plan: {},
        readiness: { result: false },
        summary: {
          beneficiaryCount: 0,
          voiceAssetCount: 0,
          datasetCount: 0,
          requiresProof: null,
          minApprovals: null,
          active: false,
          executed: false,
        },
      },
      summary: {
        owner: "0x00000000000000000000000000000000000000aa",
        voiceHash: null,
        hasPlan: false,
        beneficiaryCount: 0,
        voiceAssetCount: 0,
        inheritanceReady: null,
      },
    });
    mocks.runLegacyMigrationRecoveryWorkflow.mockResolvedValue({
      legacy: {
        before: {
          summary: {
            hasPlan: false,
          },
        },
        planLifecycle: {
          createPlan: { txHash: "0xcreate-plan", eventCount: 1 },
        },
        migration: {
          approvals: [],
          execution: null,
          delegation: null,
        },
      },
      normalization: {
        voiceHash: `0x${"1".repeat(64)}`,
        accessSetup: [],
        security: null,
        custody: null,
      },
      summary: {
        owner: "0x00000000000000000000000000000000000000aa",
        normalizationVoiceHash: `0x${"1".repeat(64)}`,
        beneficiaryCount: 0,
        voiceAssetCountAdded: 1,
        datasetCountAdded: 0,
        inheritanceApprovalCount: 0,
        inheritanceExecuted: false,
        delegationApplied: false,
        normalizationApplied: false,
        custodyOwner: null,
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the structured legacy posture response over the router path", async () => {
    const router = createWorkflowRouter({
      apiKeys: {
        "owner-key": {
          apiKey: "owner-key",
          label: "owner",
          roles: ["service"],
          allowGasless: false,
        },
      },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/inspect-legacy-migration-posture");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
        owner: "0x00000000000000000000000000000000000000aa",
      },
      header(name: string) {
        if (name.toLowerCase() === "x-api-key") {
          return "owner-key";
        }
        return undefined;
      },
    };
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

    await handler(request, response);

    expect(response.statusCode).toBe(202);
    expect(response.payload).toEqual(expect.objectContaining({
      legacy: expect.any(Object),
      summary: expect.objectContaining({
        owner: "0x00000000000000000000000000000000000000aa",
      }),
    }));
  });

  it("returns the structured legacy migration response over the router path", async () => {
    const router = createWorkflowRouter({
      apiKeys: {
        "owner-key": {
          apiKey: "owner-key",
          label: "owner",
          roles: ["service"],
          allowGasless: false,
        },
      },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/legacy-migration-recovery");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
        legacy: {
          execution: {
            voiceHash: `0x${"1".repeat(64)}`,
          },
        },
      },
      header(name: string) {
        if (name.toLowerCase() === "x-api-key") {
          return "owner-key";
        }
        return undefined;
      },
    };
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

    await handler(request, response);

    expect(response.statusCode).toBe(202);
    expect(response.payload).toEqual(expect.objectContaining({
      legacy: expect.any(Object),
      normalization: expect.any(Object),
      summary: expect.objectContaining({
        normalizationVoiceHash: `0x${"1".repeat(64)}`,
      }),
    }));
  });

  it("rejects invalid legacy migration input before invoking child workflows", async () => {
    const router = createWorkflowRouter({
      apiKeys: {
        "owner-key": {
          apiKey: "owner-key",
          label: "owner",
          roles: ["service"],
          allowGasless: false,
        },
      },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/legacy-migration-recovery");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
        legacy: {},
        normalization: {
          accessSetup: [
            {
              role: `0x${"a".repeat(64)}`,
              account: "0x00000000000000000000000000000000000000ee",
              expiryTime: "3600",
              authorizeVoice: true,
            },
          ],
        },
      },
      header(name: string) {
        if (name.toLowerCase() === "x-api-key") {
          return "owner-key";
        }
        return undefined;
      },
    };
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

    await handler(request, response);

    expect(response.statusCode).toBe(400);
    expect(response.payload).toEqual(expect.objectContaining({
      error: expect.stringContaining("legacy-migration-recovery requires voiceHash for post-migration access normalization"),
    }));
    expect(mocks.runLegacyMigrationRecoveryWorkflow).not.toHaveBeenCalled();
  });
});
