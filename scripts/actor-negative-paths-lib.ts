import type { ReviewedWriteInvariantFile, WriteInvariant } from "./write-invariants-lib.js";

export const ACTOR_ROLES = [
  "founder",
  "admin",
  "operator",
  "buyer",
  "seller",
  "licensee",
  "collaborator",
] as const;

export type ActorRole = typeof ACTOR_ROLES[number];
export type MethodPolicyFile = {
  methods: Record<string, { category: "read" | "write" }>;
};
export type ApiSurfaceFile = {
  methods: Record<string, { domain: string; path: string; operationId: string }>;
};

export type ActorNegativePathMethod = {
  method: string;
  domain: string;
  path: string;
  requiredActor: WriteInvariant["requiredActor"];
  apiBoundaryDenials: ["unknown-api-key", "read-only-api-key", "api-key-signer-mismatch"];
  roleLifecycleDenials: Array<"stale-role" | "revoked-role" | "expired-validity-window">;
  actors: Array<{
    actor: ActorRole;
    contractDenials: string[];
  }>;
};

export const HTTP_EXCLUDED_WRITE_METHODS = [
  "ProposalFacet.propose(string,string,address[],uint256[],bytes[],uint8)",
] as const;

const capabilityTargets = {
  commercialize: {
    methods: ["VoiceDatasetFacet.createDataset", "MarketplaceFacet.listAsset"],
    workflows: ["/v1/workflows/commercialize-voice-asset", "/v1/workflows/rights-aware-commercialize-voice-asset"],
  },
  list: { methods: ["MarketplaceFacet.listAsset"], workflows: ["/v1/workflows/create-marketplace-listing"] },
  transfer: { methods: ["VoiceAssetFacet.transferFromVoiceAsset", "OwnershipFacet.transferOwnership"], workflows: ["/v1/workflows/transfer-rights"] },
  mint: { methods: ["TokenSupplyFacet.supplyMintTokens", "VoiceAssetFacet.registerVoiceAsset"], workflows: ["/v1/workflows/register-voice-asset"] },
  vote: { methods: ["ProposalFacet.prCastVote"], workflows: ["/v1/workflows/vote-on-proposal"] },
  upgrade: { methods: ["DiamondCutFacet.diamondCut", "UpgradeControllerFacet.executeUpgrade"], workflows: ["/v1/workflows/governance-execution-flow"] },
  pause: { methods: ["AccessControlFacet.setPaused", "MarketplaceFacet.pause", "StakingFacet.setStakingPaused"], workflows: ["/v1/workflows/trigger-emergency"] },
  recover: { methods: ["EmergencyFacet.startRecovery", "EmergencyFacet.completeRecovery"], workflows: ["/v1/workflows/recover-from-emergency"] },
  withdraw: { methods: ["EmergencyWithdrawalFacet.executeWithdrawal", "PaymentFacet.withdrawPayments", "VoiceLicenseFacet.withdrawLicenseRevenue"], workflows: ["/v1/workflows/emergency-withdrawal-sequence", "/v1/workflows/withdraw-marketplace-payments"] },
  "ownership-controlled-state": { methods: ["RightsFacet.grantRight", "VoiceDatasetFacet.setMetadata", "OwnershipFacet.proposeOwnershipTransfer"], workflows: ["/v1/workflows/onboard-rights-holder"] },
} as const;

function contractDenialsFor(kind: WriteInvariant["requiredActor"]["kind"]): string[] {
  switch (kind) {
    case "role":
      return ["missing-required-role"];
    case "owner-or-approved":
      return ["not-owner-or-approved"];
    case "self":
      return ["signer-subject-mismatch"];
    case "contract":
      return ["eoa-not-authorized-protocol-contract"];
    case "permissionless":
      return [];
  }
}

export function validateActorNegativePathInputs(
  policy: MethodPolicyFile,
  surface: ApiSurfaceFile,
  reviewed: ReviewedWriteInvariantFile,
): string[] {
  const problems: string[] = [];
  const writeKeys = Object.entries(policy.methods)
    .filter(([, method]) => method.category === "write")
    .map(([key]) => key)
    .sort();
  const invariantKeys = Object.keys(reviewed.methods).sort();

  for (const key of writeKeys) {
    if (!reviewed.methods[key]) problems.push(`missing actor invariant ${key}`);
    if (!surface.methods[key] && !HTTP_EXCLUDED_WRITE_METHODS.includes(key as typeof HTTP_EXCLUDED_WRITE_METHODS[number])) {
      problems.push(`missing HTTP write surface ${key}`);
    }
  }
  for (const key of invariantKeys) {
    if (!writeKeys.includes(key)) problems.push(`stale actor invariant ${key}`);
  }
  for (const [capability, target] of Object.entries(capabilityTargets)) {
    for (const method of target.methods) {
      if (!reviewed.methods[method]) problems.push(`${capability}: missing protected capability method ${method}`);
    }
  }
  return problems;
}

export function buildActorNegativePathReport(
  policy: MethodPolicyFile,
  surface: ApiSurfaceFile,
  reviewed: ReviewedWriteInvariantFile,
  generatedAt: string,
) {
  const problems = validateActorNegativePathInputs(policy, surface, reviewed);
  if (problems.length > 0) throw new Error(problems.join("\n"));

  const methods: ActorNegativePathMethod[] = Object.entries(reviewed.methods)
    .filter(([method]) => Boolean(surface.methods[method]))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([method, invariant]) => ({
      method,
      domain: surface.methods[method]!.domain,
      path: surface.methods[method]!.path,
      requiredActor: invariant.requiredActor,
      apiBoundaryDenials: ["unknown-api-key", "read-only-api-key", "api-key-signer-mismatch"],
      roleLifecycleDenials: invariant.requiredActor.kind === "role"
        ? ["stale-role", "revoked-role", "expired-validity-window"]
        : [],
      actors: ACTOR_ROLES.map((actor) => ({
        actor,
        contractDenials: contractDenialsFor(invariant.requiredActor.kind),
      })),
    }));

  const domains = Object.fromEntries(
    [...new Set(methods.map((method) => method.domain))]
      .sort()
      .map((domain) => [domain, methods.filter((method) => method.domain === domain).length]),
  );
  const roleGatedMethodCount = methods.filter((method) => method.requiredActor.kind === "role").length;

  return {
    schemaVersion: 1,
    generatedAt,
    totals: {
      abiWriteMethodCount: Object.keys(reviewed.methods).length,
      writeMethodCount: methods.length,
      domainCount: Object.keys(domains).length,
      actorMethodCaseCount: methods.length * ACTOR_ROLES.length,
      apiBoundaryCaseCount: methods.length * 3,
      roleLifecycleCaseCount: roleGatedMethodCount * ACTOR_ROLES.length * 3,
    },
    actors: ACTOR_ROLES,
    excludedAbiWrites: HTTP_EXCLUDED_WRITE_METHODS,
    domains,
    capabilities: Object.fromEntries(
      Object.entries(capabilityTargets).map(([capability, target]) => [capability, {
        ...target,
        deniedActors: ACTOR_ROLES,
        boundaryDenials: ["unknown-api-key", "read-only-api-key", "api-key-signer-mismatch"],
      }]),
    ),
    methods,
  };
}
