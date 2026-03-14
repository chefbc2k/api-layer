import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runManageLicenseTemplateLifecycleWorkflow: vi.fn(),
  runCollaboratorLicenseLifecycleWorkflow: vi.fn(),
}));

vi.mock("./manage-license-template-lifecycle.js", async () => {
  const actual = await vi.importActual<typeof import("./manage-license-template-lifecycle.js")>("./manage-license-template-lifecycle.js");
  return {
    ...actual,
    runManageLicenseTemplateLifecycleWorkflow: mocks.runManageLicenseTemplateLifecycleWorkflow,
  };
});

vi.mock("./collaborator-license-lifecycle.js", async () => {
  const actual = await vi.importActual<typeof import("./collaborator-license-lifecycle.js")>("./collaborator-license-lifecycle.js");
  return {
    ...actual,
    runCollaboratorLicenseLifecycleWorkflow: mocks.runCollaboratorLicenseLifecycleWorkflow,
  };
});

import { createWorkflowRouter } from "./index.js";

describe("rights/licensing workflow routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runManageLicenseTemplateLifecycleWorkflow.mockResolvedValue({
      template: {
        source: "created",
        templateHash: `0x${"0".repeat(63)}1`,
        templateId: "1",
        current: { isActive: true },
      },
      create: { submission: { txHash: "0xcreate" }, txHash: "0xcreate", eventCount: 1 },
      update: null,
      status: null,
      summary: {
        templateHash: `0x${"0".repeat(63)}1`,
        templateId: "1",
        source: "created",
        created: true,
        updated: false,
        statusChanged: false,
        active: true,
      },
    });
    mocks.runCollaboratorLicenseLifecycleWorkflow.mockResolvedValue({
      collaboratorSetup: {
        voiceHash: `0x${"1".repeat(64)}`,
        collaborators: [],
        summary: {
          requestedCollaboratorCount: 0,
          completedCollaboratorCount: 0,
          roleGrantCount: 0,
          voiceAuthorizationCount: 0,
          collaboratorShareCount: 0,
        },
      },
      templateLifecycle: null,
      license: {
        issuance: {
          mode: "direct",
          templateHashUsed: `0x${"0".repeat(64)}`,
          submission: { txHash: "0xissue" },
          txHash: "0xissue",
          read: { licensee: "0x00000000000000000000000000000000000000cc" },
          validation: { isValid: true },
          licenseTerms: null,
          eventCount: 1,
        },
        usage: null,
        transfer: null,
        revoke: null,
      },
      summary: {
        voiceHash: `0x${"1".repeat(64)}`,
        licensee: "0x00000000000000000000000000000000000000cc",
        currentLicensee: "0x00000000000000000000000000000000000000cc",
        templateHashUsed: `0x${"0".repeat(64)}`,
        issueMode: "direct",
        collaboratorCount: 0,
        roleGrantCount: 0,
        voiceAuthorizationCount: 0,
        collaboratorShareCount: 0,
        validationPerformed: true,
        usageRecorded: false,
        transferredTo: null,
        revoked: false,
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the structured template lifecycle response over the router path", async () => {
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
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/manage-license-template-lifecycle");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: { create: {} },
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
      template: expect.any(Object),
      summary: expect.objectContaining({
        templateId: "1",
      }),
    }));
  });

  it("returns the structured collaborator-license lifecycle response over the router path", async () => {
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
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/collaborator-license-lifecycle");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
        voiceAsset: {
          voiceHash: `0x${"1".repeat(64)}`,
        },
        collaborators: [],
        issue: {
          mode: "direct",
          licensee: "0x00000000000000000000000000000000000000cc",
          terms: {
            licenseHash: `0x${"0".repeat(64)}`,
            duration: "86400",
            price: "0",
            maxUses: "7",
            transferable: true,
            rights: ["Podcast"],
            restrictions: [],
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
      collaboratorSetup: expect.any(Object),
      license: expect.any(Object),
      summary: expect.objectContaining({
        issueMode: "direct",
      }),
    }));
  });

  it("rejects invalid rights/licensing input before invoking child workflows", async () => {
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
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/collaborator-license-lifecycle");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
        voiceAsset: {
          voiceHash: "bad-hash",
        },
        collaborators: [],
        issue: {
          mode: "direct",
          licensee: "0x00000000000000000000000000000000000000cc",
          terms: {
            licenseHash: `0x${"0".repeat(64)}`,
            duration: "86400",
            price: "0",
            maxUses: "7",
            transferable: true,
            rights: ["Podcast"],
            restrictions: [],
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

    expect(response.statusCode).toBe(400);
    expect(response.payload).toMatchObject({
      error: expect.stringContaining("Invalid"),
    });
    expect(mocks.runCollaboratorLicenseLifecycleWorkflow).not.toHaveBeenCalled();
  });

  it("rejects invalid template lifecycle input before invoking child workflows", async () => {
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
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/manage-license-template-lifecycle");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
        update: {
          template: {
            isActive: true,
            transferable: true,
            defaultDuration: "86400",
            defaultPrice: "1",
            maxUses: "1",
            name: "",
            description: "invalid",
            defaultRights: ["Narration"],
            defaultRestrictions: [],
            terms: {
              licenseHash: `0x${"0".repeat(64)}`,
              duration: "86400",
              price: "1",
              maxUses: "1",
              transferable: true,
              rights: ["Narration"],
              restrictions: [],
            },
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

    expect(response.statusCode).toBe(400);
    expect(response.payload).toMatchObject({
      error: expect.stringContaining("templateHash or create is required"),
    });
    expect(mocks.runManageLicenseTemplateLifecycleWorkflow).not.toHaveBeenCalled();
  });
});
