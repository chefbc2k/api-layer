import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApiServer } from "../app.js";

const originalEnv = { ...process.env };
const role = `0x${"11".repeat(32)}`;
const address = "0x00000000000000000000000000000000000000aa";

const adminWriteCases = [
  {
    key: "AccessControlFacet.emergencyForceAdd",
    path: "/v1/access-control/admin/emergency-force-add",
    body: { role, account: address },
    denial: "unauthorized read-only emergency role change",
  },
  {
    key: "AccessControlFacet.executeFounderSunset",
    path: "/v1/access-control/admin/execute-founder-sunset",
    body: {},
    denial: "unauthorized read-only founder sunset execution",
  },
  {
    key: "AccessControlFacet.scheduleFounderSunset",
    path: "/v1/access-control/admin/schedule-founder-sunset",
    body: { executeAt: "1" },
    denial: "unauthorized read-only founder sunset scheduling",
  },
  {
    key: "AccessControlFacet.setPaused",
    path: "/v1/access-control/admin/set-paused",
    body: { paused: true },
    denial: "unauthorized read-only access-control suspension",
  },
  {
    key: "AccessControlFacet.setRecoveryActive",
    path: "/v1/access-control/admin/set-recovery-active",
    body: { role, active: true },
    denial: "unauthorized read-only recovery change",
  },
  {
    key: "DiamondCutFacet.diamondCut",
    path: "/v1/diamond-admin/admin/diamond-cut",
    body: { facetCuts: [], initContract: address, initCalldata: "0x" },
    denial: "unauthorized read-only diamond cut",
  },
  {
    key: "DiamondCutFacet.setTrustedInitCodehash",
    path: "/v1/diamond-admin/admin/set-trusted-init-codehash",
    body: { initContract: address, expectedCodehash: role },
    denial: "unauthorized read-only trusted codehash change",
  },
  {
    key: "DiamondCutFacet.setTrustedInitContract",
    path: "/v1/diamond-admin/admin/set-trusted-init-contract",
    body: { initContract: address, trusted: true },
    denial: "unauthorized read-only trusted contract change",
  },
  {
    key: "DiamondCutFacet.setTrustedInitSelector",
    path: "/v1/diamond-admin/admin/set-trusted-init-selector",
    body: { initContract: address, selector: "0x12345678", trusted: true },
    denial: "unauthorized read-only trusted selector change",
  },
  {
    key: "EmergencyFacet.approveRecovery",
    path: "/v1/emergency/admin/approve-recovery",
    body: { incidentId: "1" },
    denial: "unauthorized read-only recovery approval",
  },
  {
    key: "EmergencyFacet.completeRecovery",
    path: "/v1/emergency/admin/complete-recovery",
    body: { incidentId: "1" },
    denial: "unauthorized read-only recovery completion",
  },
  {
    key: "EmergencyFacet.executeRecoveryAction",
    path: "/v1/emergency/admin/execute-recovery-action",
    body: { action: "0x1234", stepIndex: "0" },
    denial: "unauthorized read-only recovery action execution",
  },
  {
    key: "EmergencyFacet.executeRecoveryStep",
    path: "/v1/emergency/admin/execute-recovery-step",
    body: { incidentId: "1", stepIndex: "0" },
    denial: "unauthorized read-only recovery step execution",
  },
  {
    key: "EmergencyFacet.setEmergencyTimeout",
    path: "/v1/emergency/admin/set-emergency-timeout",
    body: { newTimeout: "3600" },
    denial: "unauthorized read-only emergency timeout change",
  },
  {
    key: "EmergencyFacet.setResumeDelay",
    path: "/v1/emergency/admin/set-resume-delay",
    body: { newDelay: "3600" },
    denial: "unauthorized read-only resume delay change",
  },
  {
    key: "EmergencyFacet.startRecovery",
    path: "/v1/emergency/admin/start-recovery",
    body: { incidentId: "1", steps: ["0x1234"] },
    denial: "unauthorized read-only recovery start",
  },
  {
    key: "EmergencyWithdrawalFacet.approveEmergencyWithdrawal",
    path: "/v1/emergency/admin/approve-emergency-withdrawal",
    body: { requestId: role },
    denial: "unauthorized emergency-withdrawal approval",
  },
  {
    key: "EmergencyWithdrawalFacet.executeWithdrawal",
    path: "/v1/emergency/admin/execute-withdrawal",
    body: { requestId: role },
    denial: "unauthorized emergency-withdrawal execution",
  },
  {
    key: "EmergencyWithdrawalFacet.requestEmergencyWithdrawal",
    path: "/v1/emergency/admin/request-emergency-withdrawal",
    body: { token: address, amount: "1", recipient: address },
    denial: "unauthorized emergency-withdrawal request",
  },
  {
    key: "EmergencyWithdrawalFacet.setRecipientWhitelist",
    path: "/v1/emergency/admin/set-recipient-whitelist",
    body: { recipient: address, whitelisted: true },
    denial: "unauthorized emergency-withdrawal recipient allowlist change",
  },
  {
    key: "EmergencyWithdrawalFacet.updateWithdrawalConfig",
    path: "/v1/emergency/admin/update-withdrawal-config",
    body: {
      delay: "3600",
      maxInstant: "1000000",
      requiredApprovals: "2",
      requiresEmergencyAdmin: true,
      daily24hLimit: "10000000",
    },
    denial: "unauthorized emergency-withdrawal configuration change",
  },
  {
    key: "MultiSigFacet.addOperationType",
    path: "/v1/multisig/admin/add-operation-type",
    body: { operationType: role },
    denial: "unauthorized multisig operation-type addition",
  },
  {
    key: "MultiSigFacet.addOperator",
    path: "/v1/multisig/admin/add-operator",
    body: { operator: address },
    denial: "unauthorized multisig operator addition",
  },
  {
    key: "MultiSigFacet.approveOperation",
    path: "/v1/multisig/admin/approve-operation",
    body: { operationId: role },
    denial: "unauthorized multisig operation approval",
  },
  {
    key: "MultiSigFacet.execute",
    path: "/v1/multisig/admin/execute",
    body: { recipient: address, value: "0", data: "0x" },
    denial: "unauthorized multisig transaction execution",
  },
  {
    key: "MultiSigFacet.executeOperation",
    path: "/v1/multisig/admin/execute-operation",
    body: { operationId: role },
    denial: "unauthorized multisig operation execution",
  },
  {
    key: "MultiSigFacet.muSetPaused",
    path: "/v1/multisig/admin/mu-set-paused",
    body: { paused: true },
    denial: "unauthorized multisig pause change",
  },
  {
    key: "MultiSigFacet.proposeOperation",
    path: "/v1/multisig/admin/propose-operation",
    body: { actions: ["0x1234"], requiredApprovals: "1" },
    denial: "unauthorized multisig operation proposal",
  },
  {
    key: "MultiSigFacet.setOperationConfig",
    path: "/v1/multisig/admin/set-operation-config",
    body: {
      operationType: role,
      config: {
        minApprovals: "1",
        maxApprovals: "2",
        allowsCancellation: true,
      },
    },
    denial: "unauthorized multisig operation configuration change",
  },
  {
    key: "MultiSigFacet.submitTransaction",
    path: "/v1/multisig/admin/submit-transaction",
    body: { recipient: address, value: "0", data: "0x" },
    denial: "unauthorized multisig transaction submission",
  },
  {
    key: "UpgradeControllerFacet.approveUpgrade",
    path: "/v1/diamond-admin/admin/approve-upgrade",
    body: { upgradeId: role },
    denial: "unauthorized or replayed upgrade approval",
  },
  {
    key: "UpgradeControllerFacet.executeUpgrade",
    path: "/v1/diamond-admin/admin/execute-upgrade",
    body: { facetCuts: [], initContract: address, initCalldata: "0x", upgradeId: role },
    denial: "unauthorized or stale upgrade execution",
  },
  {
    key: "UpgradeControllerFacet.freezeUpgradeControl",
    path: "/v1/diamond-admin/admin/freeze-upgrade-control",
    body: {},
    denial: "unauthorized or replayed upgrade-control freeze",
  },
  {
    key: "UpgradeControllerFacet.proposeDiamondCut",
    path: "/v1/diamond-admin/admin/propose-diamond-cut",
    body: { facetCuts: [], initContract: address, initCalldata: "0x" },
    denial: "unauthorized or stale diamond-cut proposal",
  },
  {
    key: "UpgradeControllerFacet.setUpgradeControlEnforced",
    path: "/v1/diamond-admin/admin/set-upgrade-control-enforced",
    body: { enforced: true },
    denial: "unauthorized or replayed upgrade-control enforcement change",
  },
] as const;

const actorRoles = ["buyer", "seller", "licensee", "collaborator"] as const;

async function startServer() {
  const server = createApiServer({ port: 0, quiet: true }).listen();
  await new Promise<void>((resolve) => {
    if (server.listening) {
      resolve();
      return;
    }
    server.once("listening", () => resolve());
  });
  const boundAddress = server.address();
  if (!boundAddress || typeof boundAddress === "string") {
    throw new Error("control-plane safety server did not bind a TCP port");
  }
  return { server, port: boundAddress.port };
}

async function closeServer(server: Awaited<ReturnType<typeof startServer>>["server"]) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

describe("control-plane admin route safety", () => {
  beforeEach(() => {
    process.env.RPC_URL = "http://127.0.0.1:8545";
    process.env.ALCHEMY_RPC_URL = "http://127.0.0.1:8545";
    process.env.DIAMOND_ADDRESS = "0x0000000000000000000000000000000000000001";
    process.env.API_LAYER_KEYS_JSON = JSON.stringify({
      "read-only-key": {
        label: "read-only",
        signerId: "reader",
        roles: ["read-only"],
        allowGasless: false,
      },
      "read-only-key-2": {
        label: "read-only",
        signerId: "reader",
        roles: ["read-only"],
        allowGasless: false,
      },
      "founder-key": {
        label: "founder",
        signerId: "founder",
        roles: ["founder"],
        allowGasless: false,
      },
      "founder-key-2": {
        label: "founder",
        signerId: "founder",
        roles: ["founder"],
        allowGasless: false,
      },
      ...Object.fromEntries(actorRoles.map((actorRole) => [
        `${actorRole}-key`,
        {
          label: actorRole,
          signerId: actorRole,
          roles: [actorRole],
          allowGasless: false,
        },
      ])),
      ...Object.fromEntries(actorRoles.map((actorRole) => [
        `${actorRole}-key-2`,
        {
          label: actorRole,
          signerId: actorRole,
          roles: [actorRole],
          allowGasless: false,
        },
      ])),
    });
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("rejects every selected unauthorized admin write before provider execution", async () => {
    const { server, port } = await startServer();

    try {
      for (const [caseIndex, testCase] of adminWriteCases.entries()) {
        const response = await fetch(`http://127.0.0.1:${port}${testCase.path}`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": caseIndex < 30 ? "read-only-key" : "read-only-key-2",
          },
          body: JSON.stringify(testCase.body),
          signal: AbortSignal.timeout(2_500),
        });
        const payload = await response.json();

        expect(response.status, `${testCase.key}: ${testCase.denial}`).toBe(403);
        expect(payload, testCase.key).toEqual({ error: "API key not permitted for write execution" });
      }
    } finally {
      await closeServer(server);
    }
  });

  it("rejects actor-scoped write roles from every selected admin route before provider execution", async () => {
    const { server, port } = await startServer();

    try {
      for (const actorRole of actorRoles) {
        for (const [caseIndex, testCase] of adminWriteCases.entries()) {
          const response = await fetch(`http://127.0.0.1:${port}${testCase.path}`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-api-key": `${actorRole}-key${caseIndex < 30 ? "" : "-2"}`,
            },
            body: JSON.stringify(testCase.body),
            signal: AbortSignal.timeout(2_500),
          });
          const payload = await response.json();

          expect(response.status, `${actorRole}: ${testCase.key}: ${testCase.denial}`).toBe(403);
          expect(payload, `${actorRole}: ${testCase.key}`).toEqual({ error: "API key not permitted for admin execution" });
        }
      }
    } finally {
      await closeServer(server);
    }
  });

  it("fails closed for every selected admin route on a live RPC without explicit opt-in", async () => {
    process.env.RPC_URL = "https://sepolia.base.org";
    process.env.ALCHEMY_RPC_URL = "https://sepolia.base.org";
    process.env.API_LAYER_ALLOW_LIVE_ADMIN_WRITES = "false";
    const { server, port } = await startServer();

    try {
      for (const [caseIndex, testCase] of adminWriteCases.entries()) {
        const response = await fetch(`http://127.0.0.1:${port}${testCase.path}`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": caseIndex < 30 ? "founder-key" : "founder-key-2",
          },
          body: JSON.stringify(testCase.body),
          signal: AbortSignal.timeout(2_500),
        });
        const payload = await response.json();

        expect(response.status, `${testCase.key}: live-network gate`).toBe(403);
        expect(payload, testCase.key).toEqual({
          error: "API key not permitted for live admin execution; set API_LAYER_ALLOW_LIVE_ADMIN_WRITES=true to opt in",
        });
      }
    } finally {
      await closeServer(server);
    }
  });
});
