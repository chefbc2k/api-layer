import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { resolveDatasetLicenseTemplate } from "./license-template.js";

describe("resolveDatasetLicenseTemplate", () => {
  const context = {} as never;
  const auth = {
    apiKey: "test-key",
    label: "test",
    roles: ["service"],
    allowGasless: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("confirms a requested template id through template readback", async () => {
    const licensing = {
      getTemplate: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: { isActive: true, name: "Requested Template" },
      }),
      getCreatorTemplates: vi.fn(),
      createTemplate: vi.fn(),
    };
    mocks.createLicensingPrimitiveService.mockReturnValue(licensing);

    const result = await resolveDatasetLicenseTemplate(
      context,
      auth,
      "0xwallet",
      "0x00000000000000000000000000000000000000aa",
      "7",
    );

    expect(result).toEqual({
      templateHash: `0x${"0".repeat(63)}7`,
      templateId: "7",
      created: false,
      source: "requested",
      template: { isActive: true, name: "Requested Template" },
    });
    expect(licensing.getTemplate).toHaveBeenCalledWith({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress: "0xwallet",
      wireParams: [`0x${"0".repeat(63)}7`],
    });
    expect(licensing.getCreatorTemplates).not.toHaveBeenCalled();
    expect(licensing.createTemplate).not.toHaveBeenCalled();
  });

  it("reuses the newest active creator template when no template id is provided", async () => {
    const licensing = {
      getCreatorTemplates: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: [
          `0x${"0".repeat(63)}1`,
          `0x${"0".repeat(63)}2`,
        ],
      }),
      getTemplate: vi.fn()
        .mockResolvedValueOnce({
          statusCode: 200,
          body: { isActive: true, name: "Newest Active Template" },
        }),
      createTemplate: vi.fn(),
    };
    mocks.createLicensingPrimitiveService.mockReturnValue(licensing);

    const result = await resolveDatasetLicenseTemplate(
      context,
      auth,
      undefined,
      "0x00000000000000000000000000000000000000bb",
    );

    expect(result).toEqual({
      templateHash: `0x${"0".repeat(63)}2`,
      templateId: "2",
      created: false,
      source: "existing-active",
      template: { isActive: true, name: "Newest Active Template" },
    });
    expect(licensing.createTemplate).not.toHaveBeenCalled();
  });

  it("creates and confirms a template when no active template exists", async () => {
    const licensing = {
      getCreatorTemplates: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: [],
      }),
      getTemplate: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: { isActive: true, name: "Auto Dataset Template" },
      }),
      createTemplate: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xcreate", result: `0x${"0".repeat(63)}a` },
      }),
    };
    mocks.createLicensingPrimitiveService.mockReturnValue(licensing);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xreceipt-template");

    const result = await resolveDatasetLicenseTemplate(
      context,
      auth,
      undefined,
      "0x00000000000000000000000000000000000000cc",
    );

    expect(result).toEqual({
      templateHash: `0x${"0".repeat(63)}a`,
      templateId: "10",
      created: true,
      source: "created",
      template: { isActive: true, name: "Auto Dataset Template" },
    });
    expect(mocks.waitForWorkflowWriteReceipt).toHaveBeenCalledWith(
      context,
      { txHash: "0xcreate", result: `0x${"0".repeat(63)}a` },
      "licenseTemplate.create",
    );
  });

  it("throws when requested template readback never stabilizes", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: TimerHandler) => {
      if (typeof callback === "function") {
        callback();
      }
      return 0 as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);
    const licensing = {
      getTemplate: vi.fn().mockResolvedValue({
        statusCode: 404,
        body: { error: "not found" },
      }),
      getCreatorTemplates: vi.fn(),
      createTemplate: vi.fn(),
    };
    mocks.createLicensingPrimitiveService.mockReturnValue(licensing);

    await expect(resolveDatasetLicenseTemplate(
      context,
      auth,
      undefined,
      "0x00000000000000000000000000000000000000dd",
      "9",
    )).rejects.toThrow("licenseTemplate.requested template readback timeout");
    expect(licensing.getTemplate).toHaveBeenCalledTimes(20);
    setTimeoutSpy.mockRestore();
  });
});
