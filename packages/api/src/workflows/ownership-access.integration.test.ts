import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import { createWorkflowRouter } from "./index.js";

describe("ownership/access workflow routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the structured onboard-rights-holder workflow result over the router path", async () => {
    mocks.createAccessControlPrimitiveService.mockReturnValue({
      grantRole: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xrole" },
      }),
      hasRole: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: true,
      }),
    });
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue({
      authorizeUser: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xauth" },
      }),
      isAuthorized: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: true,
      }),
      transferFromVoiceAsset: vi.fn(),
      safeTransferFromAddressAddressUint256: vi.fn(),
      safeTransferFromAddressAddressUint256Bytes: vi.fn(),
      ownerOf: vi.fn(),
    });
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce("0xreceipt-role")
      .mockResolvedValueOnce("0xreceipt-auth");

    const router = createWorkflowRouter({
      apiKeys: {
        "test-key": {
          apiKey: "test-key",
          label: "test",
          roles: ["service"],
          allowGasless: false,
        },
      },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/onboard-rights-holder");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
        role: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        account: "0x00000000000000000000000000000000000000aa",
        expiryTime: "0",
        voiceHashes: [
          "0x1111111111111111111111111111111111111111111111111111111111111111",
        ],
      },
      header(name: string) {
        if (name.toLowerCase() === "x-api-key") {
          return "test-key";
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
    expect(response.payload).toEqual({
      roleGrant: {
        submission: {
          txHash: "0xrole",
        },
        txHash: "0xreceipt-role",
        hasRole: true,
      },
      authorizations: [
        {
          voiceHash: "0x1111111111111111111111111111111111111111111111111111111111111111",
          authorization: {
            txHash: "0xauth",
          },
          txHash: "0xreceipt-auth",
          isAuthorized: true,
        },
      ],
      summary: {
        role: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        account: "0x00000000000000000000000000000000000000aa",
        expiryTime: "0",
        requestedVoiceCount: 1,
        authorizedVoiceCount: 1,
      },
    });
  });

  it("returns the structured transfer-rights workflow result over the router path", async () => {
    mocks.createAccessControlPrimitiveService.mockReturnValue({
      grantRole: vi.fn(),
      hasRole: vi.fn(),
    });
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue({
      authorizeUser: vi.fn(),
      isAuthorized: vi.fn(),
      transferFromVoiceAsset: vi.fn(),
      safeTransferFromAddressAddressUint256: vi.fn(),
      safeTransferFromAddressAddressUint256Bytes: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xtransfer" },
      }),
      ownerOf: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: "0x00000000000000000000000000000000000000bb",
      }),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xreceipt-transfer");

    const router = createWorkflowRouter({
      apiKeys: {
        "test-key": {
          apiKey: "test-key",
          label: "test",
          roles: ["service"],
          allowGasless: false,
        },
      },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/transfer-rights");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
        from: "0x0000000000000000000000000000000000000001",
        to: "0x00000000000000000000000000000000000000bb",
        tokenId: "17",
        safe: true,
        data: "0x1234",
      },
      header(name: string) {
        if (name.toLowerCase() === "x-api-key") {
          return "test-key";
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
    expect(response.payload).toEqual({
      transfer: {
        mode: "safe-with-data",
        submission: {
          txHash: "0xtransfer",
        },
        txHash: "0xreceipt-transfer",
        owner: "0x00000000000000000000000000000000000000bb",
      },
      summary: {
        from: "0x0000000000000000000000000000000000000001",
        to: "0x00000000000000000000000000000000000000bb",
        tokenId: "17",
        safe: true,
        hasData: true,
      },
    });
  });

  it("rejects invalid onboard-rights-holder input before invoking primitives", async () => {
    const router = createWorkflowRouter({
      apiKeys: {
        "test-key": {
          apiKey: "test-key",
          label: "test",
          roles: ["service"],
          allowGasless: false,
        },
      },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/onboard-rights-holder");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
        role: "bad-role",
        account: "0x00000000000000000000000000000000000000aa",
        expiryTime: "0",
        voiceHashes: [],
      },
      header(name: string) {
        if (name.toLowerCase() === "x-api-key") {
          return "test-key";
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
      error: expect.stringContaining("Invalid string"),
    });
    expect(mocks.createAccessControlPrimitiveService).not.toHaveBeenCalled();
    expect(mocks.createVoiceAssetsPrimitiveService).not.toHaveBeenCalled();
  });

  it("rejects invalid transfer-rights input before invoking primitives", async () => {
    const router = createWorkflowRouter({
      apiKeys: {
        "test-key": {
          apiKey: "test-key",
          label: "test",
          roles: ["service"],
          allowGasless: false,
        },
      },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/transfer-rights");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
        from: "0x0000000000000000000000000000000000000001",
        to: "0x00000000000000000000000000000000000000bb",
        tokenId: "bad-token-id",
        safe: false,
      },
      header(name: string) {
        if (name.toLowerCase() === "x-api-key") {
          return "test-key";
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
      error: expect.stringContaining("Invalid string"),
    });
    expect(mocks.createVoiceAssetsPrimitiveService).not.toHaveBeenCalled();
  });
});
