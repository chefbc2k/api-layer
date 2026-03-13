import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAccessControlPrimitiveService: vi.fn(),
  createVoiceAssetsPrimitiveService: vi.fn(),
  waitForWorkflowWriteReceipt: vi.fn(),
}));

vi.mock("../modules/access-control/primitives/generated/index.js", () => ({
  createAccessControlPrimitiveService: mocks.createAccessControlPrimitiveService,
}));

vi.mock("../modules/voice-assets/primitives/generated/index.js", () => ({
  createVoiceAssetsPrimitiveService: mocks.createVoiceAssetsPrimitiveService,
}));

vi.mock("./wait-for-write.js", () => ({
  waitForWorkflowWriteReceipt: mocks.waitForWorkflowWriteReceipt,
}));

import { runOnboardRightsHolderWorkflow } from "./onboard-rights-holder.js";

describe("runOnboardRightsHolderWorkflow", () => {
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

  it("grants the role, confirms it, and authorizes each voice in order", async () => {
    const sequence: string[] = [];
    const access = {
      grantRole: vi.fn().mockImplementation(async () => {
        sequence.push("grant-role");
        return { statusCode: 202, body: { txHash: "0xrole", result: true } };
      }),
      hasRole: vi.fn().mockImplementation(async () => {
        sequence.push("read-role");
        return { statusCode: 200, body: true };
      }),
    };
    const voiceAssets = {
      authorizeUser: vi.fn()
        .mockImplementationOnce(async () => {
          sequence.push("authorize-voice-1");
          return { statusCode: 202, body: { txHash: "0xauth1" } };
        })
        .mockImplementationOnce(async () => {
          sequence.push("authorize-voice-2");
          return { statusCode: 202, body: { txHash: "0xauth2" } };
        }),
      isAuthorized: vi.fn()
        .mockImplementationOnce(async () => {
          sequence.push("read-auth-1");
          return { statusCode: 200, body: true };
        })
        .mockImplementationOnce(async () => {
          sequence.push("read-auth-2");
          return { statusCode: 200, body: true };
        }),
    };
    mocks.createAccessControlPrimitiveService.mockReturnValue(access);
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue(voiceAssets);
    mocks.waitForWorkflowWriteReceipt
      .mockImplementationOnce(async () => {
        sequence.push("wait-role");
        return "0xreceipt-role";
      })
      .mockImplementationOnce(async () => {
        sequence.push("wait-auth-1");
        return "0xreceipt-auth-1";
      })
      .mockImplementationOnce(async () => {
        sequence.push("wait-auth-2");
        return "0xreceipt-auth-2";
      });

    const result = await runOnboardRightsHolderWorkflow(context, auth, "0xwallet", {
      role: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      account: "0x00000000000000000000000000000000000000aa",
      expiryTime: "0",
      voiceHashes: [
        "0x1111111111111111111111111111111111111111111111111111111111111111",
        "0x2222222222222222222222222222222222222222222222222222222222222222",
      ],
    });

    expect(sequence).toEqual([
      "grant-role",
      "wait-role",
      "read-role",
      "authorize-voice-1",
      "wait-auth-1",
      "read-auth-1",
      "authorize-voice-2",
      "wait-auth-2",
      "read-auth-2",
    ]);
    expect(result).toEqual({
      roleGrant: {
        submission: { txHash: "0xrole", result: true },
        txHash: "0xreceipt-role",
        hasRole: true,
      },
      authorizations: [
        {
          voiceHash: "0x1111111111111111111111111111111111111111111111111111111111111111",
          authorization: { txHash: "0xauth1" },
          txHash: "0xreceipt-auth-1",
          isAuthorized: true,
        },
        {
          voiceHash: "0x2222222222222222222222222222222222222222222222222222222222222222",
          authorization: { txHash: "0xauth2" },
          txHash: "0xreceipt-auth-2",
          isAuthorized: true,
        },
      ],
      summary: {
        role: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        account: "0x00000000000000000000000000000000000000aa",
        expiryTime: "0",
        requestedVoiceCount: 2,
        authorizedVoiceCount: 2,
      },
    });
  });

  it("returns only the role grant result when no voices are requested", async () => {
    const access = {
      grantRole: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xrole", result: true },
      }),
      hasRole: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: true,
      }),
    };
    const voiceAssets = {
      authorizeUser: vi.fn(),
      isAuthorized: vi.fn(),
    };
    mocks.createAccessControlPrimitiveService.mockReturnValue(access);
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue(voiceAssets);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xreceipt-role");

    const result = await runOnboardRightsHolderWorkflow(context, auth, undefined, {
      role: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      account: "0x00000000000000000000000000000000000000bb",
      expiryTime: "10",
      voiceHashes: [],
    });

    expect(result.authorizations).toEqual([]);
    expect(result.summary).toEqual({
      role: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      account: "0x00000000000000000000000000000000000000bb",
      expiryTime: "10",
      requestedVoiceCount: 0,
      authorizedVoiceCount: 0,
    });
    expect(voiceAssets.authorizeUser).not.toHaveBeenCalled();
    expect(voiceAssets.isAuthorized).not.toHaveBeenCalled();
  });

  it("retries role and authorization readbacks before succeeding", async () => {
    const access = {
      grantRole: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xrole", result: true },
      }),
      hasRole: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: false })
        .mockResolvedValueOnce({ statusCode: 200, body: true }),
    };
    const voiceAssets = {
      authorizeUser: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xauth" },
      }),
      isAuthorized: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: false })
        .mockResolvedValueOnce({ statusCode: 200, body: true }),
    };
    mocks.createAccessControlPrimitiveService.mockReturnValue(access);
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue(voiceAssets);
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce("0xreceipt-role")
      .mockResolvedValueOnce("0xreceipt-auth");

    const result = await runOnboardRightsHolderWorkflow(context, auth, undefined, {
      role: "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      account: "0x00000000000000000000000000000000000000cc",
      expiryTime: "20",
      voiceHashes: [
        "0x3333333333333333333333333333333333333333333333333333333333333333",
      ],
    });

    expect(access.hasRole).toHaveBeenCalledTimes(2);
    expect(voiceAssets.isAuthorized).toHaveBeenCalledTimes(2);
    expect(result.roleGrant.hasRole).toBe(true);
    expect(result.authorizations).toHaveLength(1);
  });

  it("throws when the role readback never stabilizes", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: TimerHandler) => {
      if (typeof callback === "function") {
        callback();
      }
      return 0 as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);
    const access = {
      grantRole: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xrole", result: true },
      }),
      hasRole: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: false,
      }),
    };
    const voiceAssets = {
      authorizeUser: vi.fn(),
      isAuthorized: vi.fn(),
    };
    mocks.createAccessControlPrimitiveService.mockReturnValue(access);
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue(voiceAssets);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xreceipt-role");

    await expect(runOnboardRightsHolderWorkflow(context, auth, undefined, {
      role: "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      account: "0x00000000000000000000000000000000000000dd",
      expiryTime: "0",
      voiceHashes: [],
    })).rejects.toThrow("onboardRightsHolder.hasRole readback timeout");
    expect(access.hasRole).toHaveBeenCalledTimes(20);
    setTimeoutSpy.mockRestore();
  });
});
