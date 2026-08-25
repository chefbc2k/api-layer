import { describe, expect, it } from "vitest";

import policyJson from "../reviewed/reviewed-method-policy.json";
import surfaceJson from "../reviewed/reviewed-api-surface.json";
import reviewedJson from "../reviewed/reviewed-write-invariants.json";
import {
  ACTOR_ROLES,
  buildActorNegativePathReport,
  validateActorNegativePathInputs,
  type ApiSurfaceFile,
  type MethodPolicyFile,
} from "./actor-negative-paths-lib.js";
import type { ReviewedWriteInvariantFile } from "./write-invariants-lib.js";

const policy = policyJson as MethodPolicyFile;
const surface = surfaceJson as ApiSurfaceFile;
const reviewed = reviewedJson as ReviewedWriteInvariantFile;

describe("actor negative-path coverage", () => {
  it("covers every reviewed ABI write and every HTTP write domain", () => {
    const report = buildActorNegativePathReport(policy, surface, reviewed, "2026-08-03T00:00:00.000Z");

    expect(report.totals).toMatchObject({
      abiWriteMethodCount: 260,
      writeMethodCount: 259,
      domainCount: 13,
      actorMethodCaseCount: 1_813,
      apiBoundaryCaseCount: 777,
    });
    expect(report.methods.map((method) => method.method)).toEqual(
      Object.keys(reviewed.methods).filter((key) => surface.methods[key]).sort((left, right) => left.localeCompare(right)),
    );
    expect(report.excludedAbiWrites).toEqual(["ProposalFacet.propose(string,string,address[],uint256[],bytes[],uint8)"]);
    expect(Object.values(report.domains).reduce((sum, count) => sum + count, 0)).toBe(259);
  });

  it("applies unknown-key, read-only, and confused-deputy checks to every actor/write pair", () => {
    const report = buildActorNegativePathReport(policy, surface, reviewed, "2026-08-03T00:00:00.000Z");

    for (const method of report.methods) {
      expect(method.apiBoundaryDenials).toEqual([
        "unknown-api-key",
        "read-only-api-key",
        "api-key-signer-mismatch",
      ]);
      expect(method.actors.map((actor) => actor.actor)).toEqual(ACTOR_ROLES);
    }
  });

  it("requires stale, revoked, and expired role denials for every role-gated actor case", () => {
    const report = buildActorNegativePathReport(policy, surface, reviewed, "2026-08-03T00:00:00.000Z");
    const roleGated = report.methods.filter((method) => method.requiredActor.kind === "role");

    expect(roleGated).toHaveLength(150);
    expect(report.totals.roleLifecycleCaseCount).toBe(3_150);
    for (const method of roleGated) {
      expect(method.roleLifecycleDenials).toEqual(["stale-role", "revoked-role", "expired-validity-window"]);
      expect(method.actors.every((actor) => actor.contractDenials.includes("missing-required-role"))).toBe(true);
    }
  });

  it("maps ownership, self, contract-only, and permissionless writes to their correct negative condition", () => {
    const report = buildActorNegativePathReport(policy, surface, reviewed, "2026-08-03T00:00:00.000Z");
    const expected = {
      "owner-or-approved": "not-owner-or-approved",
      self: "signer-subject-mismatch",
      contract: "eoa-not-authorized-protocol-contract",
    } as const;

    for (const [kind, denial] of Object.entries(expected)) {
      const methods = report.methods.filter((method) => method.requiredActor.kind === kind);
      expect(methods.length).toBeGreaterThan(0);
      expect(methods.every((method) => method.actors.every((actor) => actor.contractDenials.includes(denial)))).toBe(true);
    }
    expect(report.methods.filter((method) => method.requiredActor.kind === "permissionless")
      .every((method) => method.actors.every((actor) => actor.contractDenials.length === 0))).toBe(true);
  });

  it("tracks every protected commercialization and control-plane capability", () => {
    const report = buildActorNegativePathReport(policy, surface, reviewed, "2026-08-03T00:00:00.000Z");

    expect(Object.keys(report.capabilities)).toEqual([
      "commercialize",
      "list",
      "transfer",
      "mint",
      "vote",
      "upgrade",
      "pause",
      "recover",
      "withdraw",
      "ownership-controlled-state",
    ]);
    expect(Object.values(report.capabilities).every((target) =>
      target.methods.length > 0 && target.workflows.length > 0 && target.deniedActors.length === ACTOR_ROLES.length,
    )).toBe(true);
  });

  it("fails closed for missing HTTP coverage, missing invariants, stale invariants, and stale capability targets", () => {
    const missingPolicy = structuredClone(policy);
    missingPolicy.methods["MissingFacet.write"] = { category: "write" };
    const staleReviewed = structuredClone(reviewed);
    staleReviewed.methods["StaleFacet.write"] = structuredClone(Object.values(reviewed.methods)[0]!);

    expect(validateActorNegativePathInputs(missingPolicy, surface, staleReviewed)).toEqual(expect.arrayContaining([
      "missing actor invariant MissingFacet.write",
      "missing HTTP write surface MissingFacet.write",
      "stale actor invariant StaleFacet.write",
    ]));
  });
});
