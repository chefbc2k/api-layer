import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAccessControlPrimitiveService: vi.fn(),
  waitForWorkflowWriteReceipt: vi.fn(),
}));

vi.mock("../modules/access-control/primitives/generated/index.js", () => ({
  createAccessControlPrimitiveService: mocks.createAccessControlPrimitiveService,
}));

vi.mock("./wait-for-write.js", () => ({
  waitForWorkflowWriteReceipt: mocks.waitForWorkflowWriteReceipt,
}));

import { manageAccessControlSchema, runManageAccessControlWorkflow } from "./manage-access-control.js";
import { createWorkflowRouter } from "./index.js";

describe("runManageAccessControlWorkflow", () => {
  const auth = {
    apiKey: "founder-key",
    label: "founder",
    roles: ["service"],
    allowGasless: false,
  };
  const role = `0x${"11".repeat(32)}`;
  const founderRole = `0x${"22".repeat(32)}`;
  const ownerRole = `0x${"33".repeat(32)}`;
  const account = "0x00000000000000000000000000000000000000aa";
  const config = {
    memberLimit: "2",
    validityPeriod: "0",
    minMemberLimit: "0",
    quorumBps: "0",
    absoluteMinQuorum: "0",
    adminRole: founderRole,
    restricted: false,
    revocable: true,
    requiresApproval: false,
    recoveryActive: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("configures role policy, confirms eventless globals, changes the admin, and revokes membership", async () => {
    const sequence: string[] = [];
    const service = {
      configureRole: vi.fn(async () => {
        sequence.push("configureRole");
        return { body: { txHash: "0xconfigure" } };
      }),
      getRoleConfig: vi.fn(async () => {
        sequence.push("getRoleConfig");
        return { body: config };
      }),
      setDefaultValidityPeriod: vi.fn(async () => {
        sequence.push("setDefaultValidityPeriod");
        return { body: { txHash: "0xvalidity" } };
      }),
      setMinValidations: vi.fn(async () => {
        sequence.push("setMinValidations");
        return { body: { txHash: "0xmin" } };
      }),
      setRoleAdmin: vi.fn(async () => {
        sequence.push("setRoleAdmin");
        return { body: { txHash: "0xadmin" } };
      }),
      getRoleAdmin: vi.fn(async () => {
        sequence.push("getRoleAdmin");
        return { body: ownerRole };
      }),
      hasRole: vi.fn()
        .mockImplementationOnce(async () => {
          sequence.push("hasRole:before");
          return { body: true };
        })
        .mockImplementationOnce(async () => {
          sequence.push("hasRole:after");
          return { body: false };
        }),
      revokeRole: vi.fn(async () => {
        sequence.push("revokeRole");
        return { body: { txHash: "0xrevoke" } };
      }),
      renounceRole: vi.fn(),
    };
    mocks.createAccessControlPrimitiveService.mockReturnValue(service);
    mocks.waitForWorkflowWriteReceipt.mockImplementation(async (_context, _body, label: string) => {
      sequence.push(`receipt:${label}`);
      return `0xreceipt-${label}`;
    });

    const result = await runManageAccessControlWorkflow({} as never, auth, undefined, {
      role,
      config,
      defaultValidityPeriod: "86400",
      minValidations: "1",
      adminRole: ownerRole,
      membership: { action: "revoke", account, reason: "rotation" },
    });

    expect(sequence).toEqual([
      "configureRole",
      "receipt:manageAccessControl.configureRole",
      "getRoleConfig",
      "setDefaultValidityPeriod",
      "receipt:manageAccessControl.setDefaultValidityPeriod",
      "setMinValidations",
      "receipt:manageAccessControl.setMinValidations",
      "setRoleAdmin",
      "receipt:manageAccessControl.setRoleAdmin",
      "getRoleAdmin",
      "hasRole:before",
      "revokeRole",
      "receipt:manageAccessControl.revokeRole",
      "hasRole:after",
    ]);
    expect(result).toMatchObject({
      config: { txHash: "0xreceipt-manageAccessControl.configureRole", readback: config },
      defaultValidityPeriod: { txHash: "0xreceipt-manageAccessControl.setDefaultValidityPeriod" },
      minValidations: { txHash: "0xreceipt-manageAccessControl.setMinValidations" },
      adminRole: { txHash: "0xreceipt-manageAccessControl.setRoleAdmin", readback: ownerRole },
      membership: {
        action: "revoke",
        account,
        before: true,
        after: false,
        txHash: "0xreceipt-manageAccessControl.revokeRole",
      },
      summary: {
        role,
        configured: true,
        defaultValidityPeriodUpdated: true,
        minValidationsUpdated: true,
        adminRoleUpdated: true,
        membershipAction: "revoke",
      },
    });
  });

  it("renounces a held role and proves the membership readback changed", async () => {
    const renounceRole = vi.fn().mockResolvedValue({ body: { txHash: "0xrenounce" } });
    const hasRole = vi.fn()
      .mockResolvedValueOnce({ body: true })
      .mockResolvedValueOnce({ body: false });
    mocks.createAccessControlPrimitiveService.mockReturnValue({
      hasRole,
      renounceRole,
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xrenounce-receipt");

    const result = await runManageAccessControlWorkflow({} as never, auth, account, {
      role,
      membership: { action: "renounce", account },
    });

    expect(renounceRole).toHaveBeenCalledWith(expect.objectContaining({
      walletAddress: account,
      wireParams: [role],
    }));
    expect(result.membership).toMatchObject({
      action: "renounce",
      account,
      before: true,
      after: false,
      txHash: "0xrenounce-receipt",
    });
  });

  it("rejects revokeRole when the receipt-confirmed readback still reports membership", async () => {
    mocks.createAccessControlPrimitiveService.mockReturnValue({
      hasRole: vi.fn().mockResolvedValue({ body: true }),
      revokeRole: vi.fn().mockResolvedValue({ body: { txHash: "0xrevoke" } }),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xrevoke-receipt");

    await expect(runManageAccessControlWorkflow({} as never, auth, undefined, {
      role,
      membership: { action: "revoke", account, reason: "negative-path proof" },
    })).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining("readback still has role"),
    });
  });

  it("rejects renounceRole when the readback account is not bound to the request wallet", async () => {
    mocks.createAccessControlPrimitiveService.mockReturnValue({
      hasRole: vi.fn(),
      renounceRole: vi.fn(),
    });

    await expect(runManageAccessControlWorkflow({} as never, auth, undefined, {
      role,
      membership: { action: "renounce", account },
    })).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining("must match x-wallet-address"),
    });
    expect(mocks.waitForWorkflowWriteReceipt).not.toHaveBeenCalled();
  });

  it("rejects empty or malformed access-control requests before any write", () => {
    expect(() => manageAccessControlSchema.parse({ role })).toThrow(/at least one policy or membership change/u);
    expect(() => manageAccessControlSchema.parse({
      role,
      membership: { action: "revoke", account: "not-an-address", reason: "invalid" },
    })).toThrow(/Invalid string/u);
    expect(mocks.createAccessControlPrimitiveService).not.toHaveBeenCalled();
  });

  it("mounts the authenticated manage-access-control API workflow", async () => {
    mocks.createAccessControlPrimitiveService.mockReturnValue({
      setDefaultValidityPeriod: vi.fn().mockResolvedValue({ body: { txHash: "0xvalidity" } }),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xvalidity-receipt");
    const router = createWorkflowRouter({
      apiKeys: { "founder-key": auth },
    } as never);
    const handler = router.stack.find((entry) => entry.route?.path === "/v1/workflows/manage-access-control")?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: { role, defaultValidityPeriod: "86400" },
      header(name: string) {
        return name.toLowerCase() === "x-api-key" ? "founder-key" : undefined;
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
    expect(response.payload).toMatchObject({
      defaultValidityPeriod: { txHash: "0xvalidity-receipt" },
      summary: { role, defaultValidityPeriodUpdated: true },
    });
  });
});
