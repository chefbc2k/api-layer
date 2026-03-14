import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createLicensingPrimitiveService: vi.fn(),
  waitForWorkflowWriteReceipt: vi.fn(),
}));

vi.mock("../modules/licensing/primitives/generated/index.js", () => ({
  createLicensingPrimitiveService: mocks.createLicensingPrimitiveService,
}));

vi.mock("./wait-for-write.js", () => ({
  waitForWorkflowWriteReceipt: mocks.waitForWorkflowWriteReceipt,
}));

import { runManageLicenseTemplateLifecycleWorkflow } from "./manage-license-template-lifecycle.js";

describe("runManageLicenseTemplateLifecycleWorkflow", () => {
  const auth = {
    apiKey: "licensing-owner-key",
    label: "owner",
    roles: ["service"],
    allowGasless: false,
  };
  const context = {
    providerRouter: {
      withProvider: vi.fn().mockResolvedValue({
        blockNumber: 123n,
        status: 1n,
      }),
    },
  } as never;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates, updates, and changes template status", async () => {
    const service = {
      createTemplate: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xcreate", result: `0x${"0".repeat(63)}1` },
      }),
      getTemplate: vi.fn()
        .mockResolvedValueOnce({
          statusCode: 200,
          body: {
            isActive: true,
            transferable: true,
            defaultDuration: "3888000",
            defaultPrice: "15000",
            maxUses: "12",
            name: "Template A",
            description: "Template A",
            defaultRights: ["Narration"],
            defaultRestrictions: [],
            terms: {
              duration: "3888000",
              price: "15000",
              maxUses: "12",
              transferable: true,
              rights: ["Narration"],
              restrictions: [],
            },
          },
        })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: {
            isActive: false,
            transferable: false,
            defaultDuration: "7776000",
            defaultPrice: "25000",
            maxUses: "24",
            name: "Template B",
            description: "Template B",
            defaultRights: ["Audiobook"],
            defaultRestrictions: ["territory-us"],
            terms: {
              duration: "7776000",
              price: "25000",
              maxUses: "24",
              transferable: false,
              rights: ["Audiobook"],
              restrictions: ["territory-us"],
            },
          },
        })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: {
            isActive: false,
            transferable: false,
            defaultDuration: "7776000",
            defaultPrice: "25000",
            maxUses: "24",
            name: "Template B",
            description: "Template B",
            defaultRights: ["Audiobook"],
            defaultRestrictions: ["territory-us"],
            terms: {
              duration: "7776000",
              price: "25000",
              maxUses: "24",
              transferable: false,
              rights: ["Audiobook"],
              restrictions: ["territory-us"],
            },
          },
        }),
      updateTemplate: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xupdate" },
      }),
      setTemplateStatus: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xstatus" },
      }),
      isTemplateActive: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: false,
      }),
      voiceLicenseTemplateTemplateUpdatedEventQuery: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: [
          { transactionHash: "0xcreate" },
          { transactionHash: "0xupdate" },
          { transactionHash: "0xstatus" },
        ],
      }),
    };
    mocks.createLicensingPrimitiveService.mockReturnValue(service);
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce("0xcreate")
      .mockResolvedValueOnce("0xupdate")
      .mockResolvedValueOnce("0xstatus");

    const result = await runManageLicenseTemplateLifecycleWorkflow(context, auth, undefined, {
      create: {},
      update: {
        template: {
          isActive: false,
          transferable: false,
          defaultDuration: "7776000",
          defaultPrice: "25000",
          maxUses: "24",
          name: "Template B",
          description: "Template B",
          defaultRights: ["Audiobook"],
          defaultRestrictions: ["territory-us"],
          terms: {
            licenseHash: `0x${"0".repeat(64)}`,
            duration: "7776000",
            price: "25000",
            maxUses: "24",
            transferable: false,
            rights: ["Audiobook"],
            restrictions: ["territory-us"],
          },
        },
      },
      setActive: false,
    });

    expect(result.summary).toEqual({
      templateHash: `0x${"0".repeat(63)}1`,
      templateId: "1",
      source: "created",
      created: true,
      updated: true,
      statusChanged: true,
      active: false,
    });
    expect(result.create?.txHash).toBe("0xcreate");
    expect(result.update?.txHash).toBe("0xupdate");
    expect(result.status?.txHash).toBe("0xstatus");
  });

  it("manages an existing template without creating a new one", async () => {
    const service = {
      createTemplate: vi.fn(),
      getTemplate: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: {
          isActive: true,
          transferable: true,
          defaultDuration: "3888000",
          defaultPrice: "15000",
          maxUses: "12",
          name: "Template A",
          description: "Template A",
          defaultRights: ["Narration"],
          defaultRestrictions: [],
          terms: {
            duration: "3888000",
            price: "15000",
            maxUses: "12",
            transferable: true,
            rights: ["Narration"],
            restrictions: [],
          },
        },
      }),
      updateTemplate: vi.fn(),
      setTemplateStatus: vi.fn(),
      isTemplateActive: vi.fn(),
      voiceLicenseTemplateTemplateUpdatedEventQuery: vi.fn(),
    };
    mocks.createLicensingPrimitiveService.mockReturnValue(service);

    const result = await runManageLicenseTemplateLifecycleWorkflow(context, auth, undefined, {
      templateHash: `0x${"0".repeat(63)}2`,
    });

    expect(service.createTemplate).not.toHaveBeenCalled();
    expect(result.summary.source).toBe("existing");
    expect(result.summary.templateId).toBe("2");
  });

  it("creates a custom template without a receipt-backed event query", async () => {
    const customTemplate = {
      isActive: true,
      transferable: false,
      defaultDuration: "86400",
      defaultPrice: "123",
      maxUses: "3",
      name: "Custom Template",
      description: "Custom Template",
      defaultRights: ["Podcast"],
      defaultRestrictions: ["no-ads"],
      terms: {
        licenseHash: `0x${"0".repeat(64)}`,
        duration: "86400",
        price: "123",
        maxUses: "3",
        transferable: false,
        rights: ["Podcast"],
        restrictions: ["no-ads"],
      },
    };
    const service = {
      createTemplate: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xcreate-custom", result: `0x${"0".repeat(63)}4` },
      }),
      getTemplate: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: customTemplate,
      }),
      updateTemplate: vi.fn(),
      setTemplateStatus: vi.fn(),
      isTemplateActive: vi.fn(),
      voiceLicenseTemplateTemplateUpdatedEventQuery: vi.fn(),
    };
    mocks.createLicensingPrimitiveService.mockReturnValue(service);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValueOnce(null);

    const result = await runManageLicenseTemplateLifecycleWorkflow(context, auth, undefined, {
      create: {
        template: customTemplate,
      },
    });

    expect(service.createTemplate).toHaveBeenCalledWith(expect.objectContaining({
      wireParams: [customTemplate],
    }));
    expect(result.create).toEqual({
      submission: { txHash: "0xcreate-custom", result: `0x${"0".repeat(63)}4` },
      txHash: null,
      eventCount: 0,
    });
    expect(result.summary.active).toBe(true);
  });

  it("updates an existing template without a receipt-backed event query", async () => {
    const updatedTemplate = {
      isActive: true,
      transferable: false,
      defaultDuration: "172800",
      defaultPrice: "456",
      maxUses: "5",
      name: "Updated Template",
      description: "Updated Template",
      defaultRights: ["Narration"],
      defaultRestrictions: ["territory-us"],
      terms: {
        duration: "172800",
        price: "456",
        maxUses: "5",
        transferable: false,
        rights: ["Narration"],
        restrictions: ["territory-us"],
      },
    };
    const service = {
      createTemplate: vi.fn(),
      getTemplate: vi.fn()
        .mockResolvedValueOnce({
          statusCode: 200,
          body: {
            isActive: true,
            transferable: true,
            defaultDuration: "86400",
            defaultPrice: "123",
            maxUses: "3",
            name: "Template A",
            description: "Template A",
            defaultRights: ["Podcast"],
            defaultRestrictions: [],
            terms: {
              duration: "86400",
              price: "123",
              maxUses: "3",
              transferable: true,
              rights: ["Podcast"],
              restrictions: [],
            },
          },
        })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: updatedTemplate,
        }),
      updateTemplate: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xupdate-existing" },
      }),
      setTemplateStatus: vi.fn(),
      isTemplateActive: vi.fn(),
      voiceLicenseTemplateTemplateUpdatedEventQuery: vi.fn(),
    };
    mocks.createLicensingPrimitiveService.mockReturnValue(service);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValueOnce(null);

    const result = await runManageLicenseTemplateLifecycleWorkflow(context, auth, undefined, {
      templateHash: `0x${"0".repeat(63)}8`,
      update: {
        template: {
          ...updatedTemplate,
          terms: {
            licenseHash: `0x${"0".repeat(64)}`,
            ...updatedTemplate.terms,
          },
        },
      },
    });

    expect(result.update).toEqual({
      submission: { txHash: "0xupdate-existing" },
      txHash: null,
      eventCount: 0,
      read: updatedTemplate,
    });
    expect(result.summary.updated).toBe(true);
    expect(result.summary.statusChanged).toBe(false);
  });

  it("changes template status without a receipt-backed event query", async () => {
    const service = {
      createTemplate: vi.fn(),
      getTemplate: vi.fn()
        .mockResolvedValueOnce({
          statusCode: 200,
          body: {
            isActive: false,
            transferable: true,
            defaultDuration: "86400",
            defaultPrice: "123",
            maxUses: "3",
            name: "Template C",
            description: "Template C",
            defaultRights: ["Podcast"],
            defaultRestrictions: [],
            terms: {
              duration: "86400",
              price: "123",
              maxUses: "3",
              transferable: true,
              rights: ["Podcast"],
              restrictions: [],
            },
          },
        })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: {
            isActive: true,
            transferable: true,
            defaultDuration: "86400",
            defaultPrice: "123",
            maxUses: "3",
            name: "Template C",
            description: "Template C",
            defaultRights: ["Podcast"],
            defaultRestrictions: [],
            terms: {
              duration: "86400",
              price: "123",
              maxUses: "3",
              transferable: true,
              rights: ["Podcast"],
              restrictions: [],
            },
          },
        }),
      updateTemplate: vi.fn(),
      setTemplateStatus: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xstatus-existing" },
      }),
      isTemplateActive: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: true,
      }),
      voiceLicenseTemplateTemplateUpdatedEventQuery: vi.fn(),
    };
    mocks.createLicensingPrimitiveService.mockReturnValue(service);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValueOnce(null);

    const result = await runManageLicenseTemplateLifecycleWorkflow(context, auth, undefined, {
      templateHash: `0x${"0".repeat(63)}9`,
      setActive: true,
    });

    expect(result.status).toEqual({
      submission: { txHash: "0xstatus-existing" },
      txHash: null,
      active: true,
      eventCount: 0,
    });
    expect(result.summary.statusChanged).toBe(true);
    expect(result.summary.active).toBe(true);
  });

  it("throws when template readback never stabilizes after create", async () => {
    vi.useFakeTimers();
    const service = {
      createTemplate: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xcreate", result: `0x${"0".repeat(63)}3` },
      }),
      getTemplate: vi.fn().mockResolvedValue({
        statusCode: 500,
        body: { error: "not ready" },
      }),
      updateTemplate: vi.fn(),
      setTemplateStatus: vi.fn(),
      isTemplateActive: vi.fn(),
      voiceLicenseTemplateTemplateUpdatedEventQuery: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: [{ transactionHash: "0xcreate" }],
      }),
    };
    mocks.createLicensingPrimitiveService.mockReturnValue(service);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xcreate");

    const result = runManageLicenseTemplateLifecycleWorkflow(context, auth, undefined, {
      create: {},
    });
    const expectation = expect(result).rejects.toThrow("initialTemplate readback timeout");

    await vi.runAllTimersAsync();

    await expectation;
  });
});
