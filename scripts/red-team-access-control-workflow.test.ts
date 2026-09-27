import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAccessControlPrimitiveService: vi.fn(),
  waitForWorkflowWriteReceipt: vi.fn(),
}));

vi.mock("../packages/api/src/modules/access-control/primitives/generated/index.js", () => ({
  createAccessControlPrimitiveService: mocks.createAccessControlPrimitiveService,
}));

vi.mock("../packages/api/src/workflows/wait-for-write.js", () => ({
  waitForWorkflowWriteReceipt: mocks.waitForWorkflowWriteReceipt,
}));

import { runManageAccessControlWorkflow } from "../packages/api/src/workflows/manage-access-control.js";

const ROLE = `0x${"11".repeat(32)}`;
const MUTATED_ROLE = `0x${"12".repeat(32)}`;
const ADMIN_ROLE = `0x${"22".repeat(32)}`;
const ACCOUNT = "0x00000000000000000000000000000000000000aa";
const DEPUTY = "0x00000000000000000000000000000000000000bb";
const auth = {
  apiKey: "founder-key",
  label: "founder",
  roles: ["service"],
  allowGasless: false,
};
const baseConfig = {
  memberLimit: "2",
  validityPeriod: "0",
  minMemberLimit: "0",
  quorumBps: "0",
  absoluteMinQuorum: "0",
  adminRole: ADMIN_ROLE,
  restricted: false,
  revocable: true,
  requiresApproval: false,
  recoveryActive: false,
};

describe("red-team access-control workflow ordering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.waitForWorkflowWriteReceipt.mockImplementation(async (_context, _body, label: string) => `0x${label}`);
  });

  it("blocks a replayed revoke before a mutated policy can spend a second write", async () => {
    const state = {
      config: { ...baseConfig },
      member: true,
    };
    const configureRole = vi.fn(async (request: { wireParams: unknown[] }) => {
      state.config = { ...(request.wireParams[1] as typeof baseConfig) };
      return { body: { txHash: "0xconfigure" } };
    });
    const service = {
      configureRole,
      getRoleConfig: vi.fn(async () => ({ body: state.config })),
      hasRole: vi.fn(async () => ({ body: state.member })),
      revokeRole: vi.fn(async () => {
        state.member = false;
        return { body: { txHash: "0xrevoke" } };
      }),
    };
    mocks.createAccessControlPrimitiveService.mockReturnValue(service);

    await runManageAccessControlWorkflow({} as never, auth, undefined, {
      role: ROLE,
      config: baseConfig,
      membership: { action: "revoke", account: ACCOUNT, reason: "rotation" },
    });

    const replayConfig = { ...baseConfig, memberLimit: "999" };
    await expect(runManageAccessControlWorkflow({} as never, auth, undefined, {
      role: ROLE,
      config: replayConfig,
      membership: { action: "revoke", account: ACCOUNT, reason: "replay" },
    })).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining("account does not hold role"),
    });

    expect(configureRole).toHaveBeenCalledTimes(1);
    expect(service.revokeRole).toHaveBeenCalledTimes(1);
    expect(state).toEqual({ config: baseConfig, member: false });
  });

  it.each([
    ["missing wallet", undefined],
    ["different deputy wallet", DEPUTY],
  ])("rejects a confused-deputy renounce with a %s before any policy mutation", async (_label, walletAddress) => {
    const service = {
      configureRole: vi.fn(),
      getRoleConfig: vi.fn(),
      hasRole: vi.fn(),
      renounceRole: vi.fn(),
    };
    mocks.createAccessControlPrimitiveService.mockReturnValue(service);

    await expect(runManageAccessControlWorkflow({} as never, auth, walletAddress, {
      role: ROLE,
      config: baseConfig,
      membership: { action: "renounce", account: ACCOUNT },
    })).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining("must match x-wallet-address"),
    });

    expect(service.configureRole).not.toHaveBeenCalled();
    expect(service.hasRole).not.toHaveBeenCalled();
    expect(service.renounceRole).not.toHaveBeenCalled();
    expect(mocks.waitForWorkflowWriteReceipt).not.toHaveBeenCalled();
  });

  it("blocks a stale renounce before changing role policy", async () => {
    const service = {
      configureRole: vi.fn(),
      getRoleConfig: vi.fn(),
      hasRole: vi.fn().mockResolvedValue({ body: false }),
      renounceRole: vi.fn(),
    };
    mocks.createAccessControlPrimitiveService.mockReturnValue(service);

    await expect(runManageAccessControlWorkflow({} as never, auth, ACCOUNT, {
      role: ROLE,
      config: baseConfig,
      membership: { action: "renounce", account: ACCOUNT },
    })).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining("account does not hold role"),
    });

    expect(service.hasRole).toHaveBeenCalledWith(expect.objectContaining({ wireParams: [ROLE, ACCOUNT] }));
    expect(service.configureRole).not.toHaveBeenCalled();
    expect(service.renounceRole).not.toHaveBeenCalled();
    expect(mocks.waitForWorkflowWriteReceipt).not.toHaveBeenCalled();
  });

  it("binds membership preflight to the exact mutated role ID before changing global policy", async () => {
    const setDefaultValidityPeriod = vi.fn();
    const hasRole = vi.fn(async (request: { wireParams: unknown[] }) => ({
      body: request.wireParams[0] === ROLE,
    }));
    mocks.createAccessControlPrimitiveService.mockReturnValue({
      hasRole,
      setDefaultValidityPeriod,
      revokeRole: vi.fn(),
    });

    await expect(runManageAccessControlWorkflow({} as never, auth, undefined, {
      role: MUTATED_ROLE,
      defaultValidityPeriod: "86400",
      membership: { action: "revoke", account: ACCOUNT, reason: "mutated role" },
    })).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining("account does not hold role"),
    });

    expect(hasRole).toHaveBeenCalledWith(expect.objectContaining({ wireParams: [MUTATED_ROLE, ACCOUNT] }));
    expect(setDefaultValidityPeriod).not.toHaveBeenCalled();
    expect(mocks.waitForWorkflowWriteReceipt).not.toHaveBeenCalled();
  });
});
