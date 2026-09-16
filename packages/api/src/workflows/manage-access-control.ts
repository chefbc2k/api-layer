import { z } from "zod";

import { createAccessControlPrimitiveService } from "../modules/access-control/primitives/generated/index.js";
import type { AuthContext } from "../shared/auth.js";
import type { ApiExecutionContext } from "../shared/execution-context.js";
import { HttpError } from "../shared/errors.js";
import { waitForWorkflowWriteReceipt } from "./wait-for-write.js";

const bytes32Schema = z.string().regex(/^0x[a-fA-F0-9]{64}$/u);
const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/u);
const uintSchema = z.string().regex(/^\d+$/u);

const roleConfigSchema = z.object({
  memberLimit: uintSchema,
  validityPeriod: uintSchema,
  minMemberLimit: uintSchema,
  quorumBps: uintSchema,
  absoluteMinQuorum: uintSchema,
  adminRole: bytes32Schema,
  restricted: z.boolean(),
  revocable: z.boolean(),
  requiresApproval: z.boolean(),
  recoveryActive: z.boolean(),
});

const membershipActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("revoke"),
    account: addressSchema,
    reason: z.string().min(1),
  }),
  z.object({
    action: z.literal("renounce"),
    account: addressSchema,
  }),
]);

export const manageAccessControlSchema = z.object({
  role: bytes32Schema,
  config: roleConfigSchema.optional(),
  defaultValidityPeriod: uintSchema.optional(),
  minValidations: uintSchema.optional(),
  adminRole: bytes32Schema.optional(),
  membership: membershipActionSchema.optional(),
}).refine((body) => (
  body.config !== undefined
  || body.defaultValidityPeriod !== undefined
  || body.minValidations !== undefined
  || body.adminRole !== undefined
  || body.membership !== undefined
), {
  message: "manage-access-control expected at least one policy or membership change",
});

type PrimitiveService = ReturnType<typeof createAccessControlPrimitiveService>;

export async function runManageAccessControlWorkflow(
  context: ApiExecutionContext,
  auth: AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof manageAccessControlSchema>,
) {
  const access = createAccessControlPrimitiveService(context);
  const request = (wireParams: unknown[]) => ({
    auth,
    api: { executionSource: "auto" as const, gaslessMode: "none" as const },
    walletAddress,
    wireParams,
  });

  const config = body.config
    ? await submitAndRead(
      context,
      "manageAccessControl.configureRole",
      () => access.configureRole(request([body.role, body.config!])),
      () => access.getRoleConfig(request([body.role])),
    )
    : null;
  if (config && !matchesRecord(config.readback, body.config!)) {
    throw new HttpError(409, "manage-access-control configureRole readback mismatch");
  }

  const defaultValidityPeriod = body.defaultValidityPeriod !== undefined
    ? await submitOnly(
      context,
      "manageAccessControl.setDefaultValidityPeriod",
      () => access.setDefaultValidityPeriod(request([body.defaultValidityPeriod!])),
    )
    : null;

  const minValidations = body.minValidations !== undefined
    ? await submitOnly(
      context,
      "manageAccessControl.setMinValidations",
      () => access.setMinValidations(request([body.minValidations!])),
    )
    : null;

  const adminRole = body.adminRole
    ? await submitAndRead(
      context,
      "manageAccessControl.setRoleAdmin",
      () => access.setRoleAdmin(request([body.role, body.adminRole!])),
      () => access.getRoleAdmin(request([body.role])),
    )
    : null;
  if (adminRole && String(adminRole.readback).toLowerCase() !== body.adminRole!.toLowerCase()) {
    throw new HttpError(409, "manage-access-control setRoleAdmin readback mismatch");
  }

  const membership = body.membership
    ? await runMembershipAction(context, access, request, walletAddress, body.role, body.membership)
    : null;

  return {
    config,
    defaultValidityPeriod,
    minValidations,
    adminRole,
    membership,
    summary: {
      role: body.role,
      configured: config !== null,
      defaultValidityPeriodUpdated: defaultValidityPeriod !== null,
      minValidationsUpdated: minValidations !== null,
      adminRoleUpdated: adminRole !== null,
      membershipAction: body.membership?.action ?? null,
    },
  };
}

async function runMembershipAction(
  context: ApiExecutionContext,
  access: PrimitiveService,
  request: (wireParams: unknown[]) => {
    auth: AuthContext;
    api: { executionSource: "auto"; gaslessMode: "none" };
    walletAddress: string | undefined;
    wireParams: unknown[];
  },
  walletAddress: string | undefined,
  role: string,
  membership: z.infer<typeof membershipActionSchema>,
) {
  if (
    membership.action === "renounce"
    && (!walletAddress || walletAddress.toLowerCase() !== membership.account.toLowerCase())
  ) {
    throw new HttpError(400, "manage-access-control renounce account must match x-wallet-address");
  }
  const before = await access.hasRole(request([role, membership.account]));
  if (before.body !== true) {
    throw new HttpError(409, `manage-access-control cannot ${membership.action}: account does not hold role`);
  }

  const write = membership.action === "revoke"
    ? await submitOnly(
      context,
      "manageAccessControl.revokeRole",
      () => access.revokeRole(request([role, membership.account, membership.reason])),
    )
    : await submitOnly(
      context,
      "manageAccessControl.renounceRole",
      () => access.renounceRole(request([role])),
    );
  const after = await access.hasRole(request([role, membership.account]));
  if (after.body !== false) {
    throw new HttpError(409, `manage-access-control ${membership.action} readback still has role`);
  }
  return {
    action: membership.action,
    account: membership.account,
    before: true,
    after: false,
    ...write,
  };
}

async function submitOnly(
  context: ApiExecutionContext,
  label: string,
  submit: () => Promise<{ body: unknown }>,
) {
  const submission = await submit();
  const txHash = await waitForWorkflowWriteReceipt(context, submission.body, label);
  if (!txHash) {
    throw new HttpError(504, `${label} receipt did not resolve`);
  }
  return { submission: submission.body, txHash };
}

async function submitAndRead(
  context: ApiExecutionContext,
  label: string,
  submit: () => Promise<{ body: unknown }>,
  read: () => Promise<{ body: unknown }>,
) {
  const write = await submitOnly(context, label, submit);
  const readback = await read();
  return { ...write, readback: readback.body };
}

function matchesRecord(readback: unknown, expected: Record<string, unknown>): boolean {
  if (!readback || typeof readback !== "object" || Array.isArray(readback)) {
    return false;
  }
  const record = readback as Record<string, unknown>;
  return Object.entries(expected).every(([key, value]) => record[key] === value);
}
