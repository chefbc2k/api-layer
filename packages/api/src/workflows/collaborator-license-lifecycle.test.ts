import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "../shared/errors.js";

const mocks = vi.hoisted(() => ({
  createLicensingPrimitiveService: vi.fn(),
  waitForWorkflowWriteReceipt: vi.fn(),
  runOnboardRightsHolderWorkflow: vi.fn(),
  runManageLicenseTemplateLifecycleWorkflow: vi.fn(),
}));

vi.mock("../modules/licensing/primitives/generated/index.js", () => ({
  createLicensingPrimitiveService: mocks.createLicensingPrimitiveService,
}));

vi.mock("./wait-for-write.js", () => ({
  waitForWorkflowWriteReceipt: mocks.waitForWorkflowWriteReceipt,
}));

vi.mock("./onboard-rights-holder.js", async () => {
  const actual = await vi.importActual<typeof import("./onboard-rights-holder.js")>("./onboard-rights-holder.js");
  return {
    ...actual,
    runOnboardRightsHolderWorkflow: mocks.runOnboardRightsHolderWorkflow,
  };
});

vi.mock("./manage-license-template-lifecycle.js", async () => {
  const actual = await vi.importActual<typeof import("./manage-license-template-lifecycle.js")>("./manage-license-template-lifecycle.js");
  return {
    ...actual,
    runManageLicenseTemplateLifecycleWorkflow: mocks.runManageLicenseTemplateLifecycleWorkflow,
  };
});

import {
  collaboratorLicenseLifecycleWorkflowSchema,
  runCollaboratorLicenseLifecycleWorkflow,
} from "./collaborator-license-lifecycle.js";

describe("runCollaboratorLicenseLifecycleWorkflow", () => {
  const auth = {
    apiKey: "owner-key",
    label: "owner",
    roles: ["service"],
    allowGasless: false,
  };
  const context = {
    apiKeys: {
      "licensee-key": {
        apiKey: "licensee-key",
        label: "licensee",
        roles: ["service"],
        allowGasless: false,
      },
    },
    providerRouter: {
      withProvider: vi.fn().mockResolvedValue({
        blockNumber: 123n,
        status: 1n,
      }),
    },
  } as never;
  const voiceHash = "0x1111111111111111111111111111111111111111111111111111111111111111";
  const role = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runOnboardRightsHolderWorkflow.mockResolvedValue({
      roleGrant: {
        submission: { txHash: "0xrole" },
        txHash: "0xrole",
        hasRole: true,
      },
      authorizations: [
        {
          voiceHash,
          authorization: { txHash: "0xauth" },
          txHash: "0xauth",
          isAuthorized: true,
        },
      ],
      summary: {
        role,
        account: "0x00000000000000000000000000000000000000bb",
        expiryTime: "3600",
        requestedVoiceCount: 1,
        authorizedVoiceCount: 1,
      },
    });
    mocks.runManageLicenseTemplateLifecycleWorkflow.mockResolvedValue({
      template: {
        source: "created",
        templateHash: `0x${"0".repeat(63)}5`,
        templateId: "5",
        current: { isActive: true },
      },
      create: { submission: { txHash: "0xtemplate" }, txHash: "0xtemplate", eventCount: 1 },
      update: null,
      status: null,
      summary: {
        templateHash: `0x${"0".repeat(63)}5`,
        templateId: "5",
        source: "created",
        created: true,
        updated: false,
        statusChanged: false,
        active: true,
      },
    });
    const service = {
      addCollaborator: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xcollab" },
      }),
      updateCollaboratorShare: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xcollab-update" },
      }),
      getCollaborator: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: { isActive: true, share: "2500" },
      }),
      collaboratorUpdatedEventQuery: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: [{ transactionHash: "0xcollab" }, { transactionHash: "0xcollab-update" }],
      }),
      createLicense: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xissue-direct" },
      }),
      issueLicense: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xissue-template" },
      }),
      getLicense: vi.fn()
        .mockResolvedValue({
          statusCode: 200,
          body: { licensee: "0x00000000000000000000000000000000000000cc", templateHash: `0x${"0".repeat(64)}` },
        }),
      validateLicense: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: { isValid: true },
      }),
      getLicenseTerms: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: { transferable: true },
      }),
      recordLicensedUsage: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xusage" },
      }),
      isUsageRefUsed: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: true,
      }),
      getUsageCount: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: "1",
      }),
      transferLicense: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xtransfer" },
      }),
      revokeLicense: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xrevoke" },
      }),
      licenseCreatedBytes32AddressBytes32Uint256Uint256EventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xissue-direct" }] }),
      licenseCreatedBytes32Bytes32AddressUint256Uint256EventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [] }),
      licenseCreatedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xissue-template" }] }),
      licenseUsedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xusage" }] }),
      licenseTransferredEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xtransfer" }] }),
      licenseRevokedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xrevoke" }] }),
    };
    mocks.createLicensingPrimitiveService.mockReturnValue(service);
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce("0xcollab")
      .mockResolvedValueOnce("0xissue-direct")
      .mockResolvedValueOnce("0xcollab-update")
      .mockResolvedValueOnce("0xissue-template")
      .mockResolvedValueOnce("0xusage")
      .mockResolvedValueOnce("0xtransfer")
      .mockResolvedValueOnce("0xrevoke");
  });

  it("runs collaborator handoff plus direct issue and validate flow", async () => {
    const result = await runCollaboratorLicenseLifecycleWorkflow(context, auth, undefined, {
      voiceAsset: { voiceHash },
      collaborators: [
        {
          account: "0x00000000000000000000000000000000000000bb",
          rightsHolder: {
            role,
            expiryTime: "3600",
            authorizeVoice: true,
          },
          collaboratorShare: {
            mode: "add",
            share: "2500",
          },
        },
      ],
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
          restrictions: ["no-derivatives"],
        },
      },
      licenseeActor: {
        apiKey: "licensee-key",
      },
    });

    expect(result.collaboratorSetup.summary).toEqual({
      requestedCollaboratorCount: 1,
      completedCollaboratorCount: 1,
      roleGrantCount: 1,
      voiceAuthorizationCount: 1,
      collaboratorShareCount: 1,
    });
    expect(result.license.issuance.mode).toBe("direct");
    expect(result.license.issuance.templateHashUsed).toBe(`0x${"0".repeat(64)}`);
    expect(result.summary.validationPerformed).toBe(true);
  });

  it("runs template-based issue plus usage transfer and revoke", async () => {
    const service = mocks.createLicensingPrimitiveService.mock.results[0]?.value ?? mocks.createLicensingPrimitiveService();
    service.getLicense
      .mockResolvedValueOnce({
        statusCode: 200,
        body: { licensee: "0x00000000000000000000000000000000000000cc", templateHash: `0x${"0".repeat(63)}5` },
      })
      .mockResolvedValueOnce({
        statusCode: 200,
        body: { licensee: "0x00000000000000000000000000000000000000dd", templateHash: `0x${"0".repeat(63)}5` },
      })
      .mockResolvedValueOnce({
        statusCode: 500,
        body: { error: "revoked" },
      });

    const result = await runCollaboratorLicenseLifecycleWorkflow(context, auth, undefined, {
      voiceAsset: { voiceHash },
      collaborators: [
        {
          account: "0x00000000000000000000000000000000000000bb",
          collaboratorShare: {
            mode: "update",
            share: "2500",
          },
        },
      ],
      templateLifecycle: {
        create: {},
      },
      issue: {
        mode: "template",
        licensee: "0x00000000000000000000000000000000000000cc",
        duration: "86400",
      },
      licenseeActor: {
        apiKey: "licensee-key",
      },
      usage: {
        usageRef: `0x${"1".repeat(64)}`,
      },
      transfer: {
        to: "0x00000000000000000000000000000000000000dd",
      },
      revoke: {
        reason: "end of term",
      },
    });

    expect(mocks.runManageLicenseTemplateLifecycleWorkflow).toHaveBeenCalledOnce();
    expect(result.license.issuance.mode).toBe("template");
    expect(result.license.usage?.usageRef).toBe(`0x${"1".repeat(64)}`);
    expect(result.license.transfer?.to).toBe("0x00000000000000000000000000000000000000dd");
    expect(result.license.revoke?.reason).toBe("end of term");
    expect(result.summary.revoked).toBe(true);
  });

  it("keeps transfer and revoke event counts at zero when receipts are unavailable", async () => {
    const service = mocks.createLicensingPrimitiveService.mock.results[0]?.value ?? mocks.createLicensingPrimitiveService();
    service.licenseTransferredEventQuery.mockClear();
    service.licenseRevokedEventQuery.mockClear();
    service.getLicense
      .mockResolvedValueOnce({
        statusCode: 200,
        body: { licensee: "0x00000000000000000000000000000000000000cc", templateHash: `0x${"0".repeat(63)}5` },
      })
      .mockResolvedValueOnce({
        statusCode: 200,
        body: { licensee: "0x00000000000000000000000000000000000000dd", templateHash: `0x${"0".repeat(63)}5` },
      })
      .mockResolvedValueOnce({
        statusCode: 500,
        body: { error: "revoked" },
      });

    mocks.waitForWorkflowWriteReceipt.mockReset();
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce("0xcollab")
      .mockResolvedValueOnce("0xissue-template")
      .mockResolvedValueOnce("0xusage")
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const result = await runCollaboratorLicenseLifecycleWorkflow(context, auth, undefined, {
      voiceAsset: { voiceHash },
      collaborators: [
        {
          account: "0x00000000000000000000000000000000000000bb",
          collaboratorShare: {
            mode: "add",
            share: "2500",
          },
        },
      ],
      templateLifecycle: {
        create: {},
      },
      issue: {
        mode: "template",
        licensee: "0x00000000000000000000000000000000000000cc",
        duration: "86400",
      },
      licenseeActor: {
        apiKey: "licensee-key",
      },
      usage: {
        usageRef: `0x${"2".repeat(64)}`,
      },
      transfer: {
        to: "0x00000000000000000000000000000000000000dd",
      },
      revoke: {
        reason: "operator recovery",
      },
    });

    expect(result.license.transfer).toMatchObject({
      txHash: null,
      eventCount: 0,
      to: "0x00000000000000000000000000000000000000dd",
    });
    expect(result.license.revoke).toMatchObject({
      txHash: null,
      eventCount: 0,
      reason: "operator recovery",
    });
    expect(service.licenseTransferredEventQuery).not.toHaveBeenCalled();
    expect(service.licenseRevokedEventQuery).not.toHaveBeenCalled();
  });

  it("keeps collaborator and issuance event counts at zero when those receipts are unavailable", async () => {
    const service = mocks.createLicensingPrimitiveService.mock.results[0]?.value ?? mocks.createLicensingPrimitiveService();
    service.collaboratorUpdatedEventQuery.mockClear();
    service.licenseCreatedBytes32AddressBytes32Uint256Uint256EventQuery.mockClear();
    service.licenseCreatedBytes32Bytes32AddressUint256Uint256EventQuery.mockClear();
    service.licenseCreatedEventQuery.mockClear();

    mocks.waitForWorkflowWriteReceipt.mockReset();
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const explicitTemplateHash = `0x${"9".repeat(64)}`;
    const result = await runCollaboratorLicenseLifecycleWorkflow(context, auth, undefined, {
      voiceAsset: { voiceHash },
      collaborators: [
        {
          account: "0x00000000000000000000000000000000000000bb",
          collaboratorShare: {
            mode: "add",
            share: "2500",
          },
        },
      ],
      issue: {
        mode: "template",
        licensee: "0x00000000000000000000000000000000000000cc",
        templateHash: explicitTemplateHash,
        duration: "86400",
      },
    });

    expect(result.collaboratorSetup.collaborators[0]?.collaboratorShare).toMatchObject({
      mode: "add",
      txHash: null,
      eventCount: 0,
      share: "2500",
    });
    expect(result.license.issuance).toMatchObject({
      mode: "template",
      templateHashUsed: explicitTemplateHash,
      txHash: null,
      eventCount: 0,
    });
    expect(result.summary.templateHashUsed).toBe(explicitTemplateHash);
    expect(service.collaboratorUpdatedEventQuery).not.toHaveBeenCalled();
    expect(service.licenseCreatedBytes32AddressBytes32Uint256Uint256EventQuery).not.toHaveBeenCalled();
    expect(service.licenseCreatedBytes32Bytes32AddressUint256Uint256EventQuery).not.toHaveBeenCalled();
    expect(service.licenseCreatedEventQuery).not.toHaveBeenCalled();
  });

  it("propagates collaborator authorization failure", async () => {
    mocks.runOnboardRightsHolderWorkflow.mockResolvedValueOnce({
      roleGrant: {
        submission: { txHash: "0xrole" },
        txHash: "0xrole",
        hasRole: true,
      },
      authorizations: [
        {
          voiceHash,
          authorization: { txHash: "0xauth" },
          txHash: "0xauth",
          isAuthorized: false,
        },
      ],
      summary: {
        role,
        account: "0x00000000000000000000000000000000000000bb",
        expiryTime: "3600",
        requestedVoiceCount: 1,
        authorizedVoiceCount: 0,
      },
    });

    await expect(
      runCollaboratorLicenseLifecycleWorkflow(context, auth, undefined, {
        voiceAsset: { voiceHash },
        collaborators: [
          {
            account: "0x00000000000000000000000000000000000000bb",
            rightsHolder: {
              role,
              expiryTime: "3600",
              authorizeVoice: true,
            },
          },
        ],
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
      }),
    ).rejects.toThrow("per-voice authorization confirmation");
  });

  it("propagates collaborator role confirmation failure", async () => {
    mocks.runOnboardRightsHolderWorkflow.mockResolvedValueOnce({
      roleGrant: {
        submission: { txHash: "0xrole" },
        txHash: "0xrole",
        hasRole: false,
      },
      authorizations: [],
      summary: {
        role,
        account: "0x00000000000000000000000000000000000000bb",
        expiryTime: "3600",
        requestedVoiceCount: 0,
        authorizedVoiceCount: 0,
      },
    });

    await expect(
      runCollaboratorLicenseLifecycleWorkflow(context, auth, undefined, {
        voiceAsset: { voiceHash },
        collaborators: [
          {
            account: "0x00000000000000000000000000000000000000bb",
            rightsHolder: {
              role,
              expiryTime: "3600",
              authorizeVoice: false,
            },
          },
        ],
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
      }),
    ).rejects.toThrow("failed role confirmation");
  });

  it("propagates external licensee actor precondition errors", async () => {
    await expect(
      runCollaboratorLicenseLifecycleWorkflow(context, auth, undefined, {
        voiceAsset: { voiceHash },
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
        licenseeActor: {
          apiKey: "missing-key",
        },
      }),
    ).rejects.toThrow("unknown licensee apiKey");
    expect(mocks.waitForWorkflowWriteReceipt).not.toHaveBeenCalled();
  });

  it("propagates child template-lifecycle failures", async () => {
    mocks.runManageLicenseTemplateLifecycleWorkflow.mockRejectedValueOnce(new Error("template lifecycle failed"));

    await expect(
      runCollaboratorLicenseLifecycleWorkflow(context, auth, undefined, {
        voiceAsset: { voiceHash },
        collaborators: [],
        templateLifecycle: {
          create: {},
        },
        issue: {
          mode: "template",
          licensee: "0x00000000000000000000000000000000000000cc",
          duration: "86400",
        },
      }),
    ).rejects.toThrow("template lifecycle failed");
  });

  it("leaves license terms null when no external licensee actor is used", async () => {
    mocks.waitForWorkflowWriteReceipt.mockReset();
    mocks.waitForWorkflowWriteReceipt.mockResolvedValueOnce("0xissue-direct");

    const result = await runCollaboratorLicenseLifecycleWorkflow(context, auth, undefined, {
      voiceAsset: { voiceHash },
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
    });

    expect(result.license.issuance.licenseTerms).toBeNull();
    const service = mocks.createLicensingPrimitiveService.mock.results.at(-1)?.value;
    expect(service.getLicenseTerms).not.toHaveBeenCalled();
  });

  it("fails template issuance when neither the body nor lifecycle produces a template hash", async () => {
    mocks.runManageLicenseTemplateLifecycleWorkflow.mockResolvedValueOnce({
      template: {
        source: "created",
        templateHash: null,
        templateId: "5",
        current: { isActive: true },
      },
      create: { submission: { txHash: "0xtemplate" }, txHash: "0xtemplate", eventCount: 1 },
      update: null,
      status: null,
      summary: {
        templateHash: null,
        templateId: "5",
        source: "created",
        created: true,
        updated: false,
        statusChanged: false,
        active: true,
      },
    });

    await expect(
      runCollaboratorLicenseLifecycleWorkflow(context, auth, undefined, {
        voiceAsset: { voiceHash },
        collaborators: [],
        templateLifecycle: {
          create: {},
        },
        issue: {
          mode: "template",
          licensee: "0x00000000000000000000000000000000000000cc",
          duration: "86400",
        },
      }),
    ).rejects.toThrow("requires templateHash for template issue mode");
  });

  it("rejects template issue mode when no template hash is available", async () => {
    mocks.runManageLicenseTemplateLifecycleWorkflow.mockResolvedValueOnce({
      template: {
        source: "created",
        templateHash: null,
        templateId: null,
        current: { isActive: true },
      },
      create: null,
      update: null,
      status: null,
      summary: {
        templateHash: null,
        templateId: null,
        source: "created",
        created: false,
        updated: false,
        statusChanged: false,
        active: true,
      },
    });

    await expect(
      runCollaboratorLicenseLifecycleWorkflow(context, auth, undefined, {
        voiceAsset: { voiceHash },
        collaborators: [],
        templateLifecycle: {
          create: {},
        },
        issue: {
          mode: "template",
          licensee: "0x00000000000000000000000000000000000000cc",
          duration: "86400",
        },
      }),
    ).rejects.toThrow("requires templateHash for template issue mode");
  });

  it("supports role-only collaborator setup without per-voice authorization or collaborator share", async () => {
    mocks.waitForWorkflowWriteReceipt.mockReset();
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xissue-direct");
    mocks.runOnboardRightsHolderWorkflow.mockResolvedValueOnce({
      roleGrant: {
        submission: { txHash: "0xrole-only" },
        txHash: "0xrole-only",
        hasRole: true,
      },
      authorizations: [],
      summary: {
        role,
        account: "0x00000000000000000000000000000000000000bb",
        expiryTime: "3600",
        requestedVoiceCount: 0,
        authorizedVoiceCount: 0,
      },
    });

    const result = await runCollaboratorLicenseLifecycleWorkflow(context, auth, undefined, {
      voiceAsset: { voiceHash },
      collaborators: [
        {
          account: "0x00000000000000000000000000000000000000bb",
          rightsHolder: {
            role,
            expiryTime: "3600",
            authorizeVoice: false,
          },
        },
      ],
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
    });

    expect(result.collaboratorSetup.collaborators[0]).toEqual({
      account: "0x00000000000000000000000000000000000000bb",
      rightsHolder: expect.objectContaining({
        roleGrant: expect.objectContaining({ hasRole: true }),
        authorizations: [],
      }),
      collaboratorShare: null,
    });
    expect(result.summary.voiceAuthorizationCount).toBe(0);
    expect(result.license.issuance.licenseTerms).toBeNull();
  });

  it("accepts raw event arrays from license-created queries", async () => {
    const service = mocks.createLicensingPrimitiveService.mock.results[0]?.value ?? mocks.createLicensingPrimitiveService();
    service.licenseCreatedBytes32AddressBytes32Uint256Uint256EventQuery.mockResolvedValueOnce([{ transactionHash: "0xissue-direct" }]);
    service.licenseCreatedBytes32Bytes32AddressUint256Uint256EventQuery.mockResolvedValueOnce([]);
    service.licenseCreatedEventQuery.mockResolvedValueOnce({ statusCode: 200, body: [] });

    mocks.waitForWorkflowWriteReceipt.mockReset();
    mocks.waitForWorkflowWriteReceipt.mockResolvedValueOnce("0xissue-direct");

    const result = await runCollaboratorLicenseLifecycleWorkflow(context, auth, undefined, {
      voiceAsset: { voiceHash },
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
    });

    expect(result.license.issuance.eventCount).toBe(1);
  });

  it("validates collaborator entry and template issue schema requirements", () => {
    expect(() => collaboratorLicenseLifecycleWorkflowSchema.parse({
      voiceAsset: { voiceHash },
      collaborators: [
        {
          account: "0x00000000000000000000000000000000000000bb",
        },
      ],
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
    })).toThrow("each collaborator entry must include rightsHolder and/or collaboratorShare");

    expect(() => collaboratorLicenseLifecycleWorkflowSchema.parse({
      voiceAsset: { voiceHash },
      collaborators: [],
      issue: {
        mode: "template",
        licensee: "0x00000000000000000000000000000000000000cc",
        duration: "86400",
      },
    })).toThrow("template issue mode requires templateHash or templateLifecycle");

    expect(collaboratorLicenseLifecycleWorkflowSchema.parse({
      voiceAsset: { voiceHash },
      collaborators: [
        {
          account: "0x00000000000000000000000000000000000000bb",
          collaboratorShare: {
            share: "2500",
          },
        },
      ],
      templateLifecycle: {
        create: {},
      },
      issue: {
        mode: "template",
        licensee: "0x00000000000000000000000000000000000000cc",
        duration: "86400",
      },
    })).toMatchObject({
      issue: {
        mode: "template",
      },
    });
  });
});
