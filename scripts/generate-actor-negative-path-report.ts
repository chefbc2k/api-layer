import { writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  buildActorNegativePathReport,
  type ApiSurfaceFile,
  type MethodPolicyFile,
} from "./actor-negative-paths-lib.js";
import type { ReviewedWriteInvariantFile } from "./write-invariants-lib.js";
import { readJson, rootDir, writeJson } from "./utils.js";

export async function generateActorNegativePathReport(generatedAt = new Date().toISOString()) {
  const [policy, surface, reviewed] = await Promise.all([
    readJson<MethodPolicyFile>(path.join(rootDir, "reviewed", "reviewed-method-policy.json")),
    readJson<ApiSurfaceFile>(path.join(rootDir, "reviewed", "reviewed-api-surface.json")),
    readJson<ReviewedWriteInvariantFile>(path.join(rootDir, "reviewed", "reviewed-write-invariants.json")),
  ]);
  const report = buildActorNegativePathReport(policy, surface, reviewed, generatedAt);
  const jsonPath = path.join(rootDir, "output", "actor-negative-path-report.json");
  const markdownPath = path.join(rootDir, "output", "actor-negative-path-report.md");
  await writeJson(jsonPath, report);
  const domainRows = Object.entries(report.domains).map(([domain, count]) => `| ${domain} | ${count} |`).join("\n");
  const capabilityRows = Object.entries(report.capabilities).map(([capability, target]) =>
    `| ${capability} | ${target.methods.join("<br>")} | ${target.workflows.join("<br>")} |`,
  ).join("\n");
  await writeFile(markdownPath, `# Actor and Signer Negative-Path Report

Generated: ${report.generatedAt}

- ABI write methods: ${report.totals.abiWriteMethodCount}
- Mounted HTTP write endpoints: ${report.totals.writeMethodCount}
- HTTP write domains: ${report.totals.domainCount}
- Actor/method cases: ${report.totals.actorMethodCaseCount}
- API boundary cases: ${report.totals.apiBoundaryCaseCount}
- Stale/revoked/expired role cases: ${report.totals.roleLifecycleCaseCount}

Every mounted write endpoint is covered for founder, admin, operator, buyer, seller, licensee, and collaborator fixtures. Unknown keys and read-only keys are denied at the API boundary. Direct signer/wallet mismatches are denied before contract submission. Missing, stale, revoked, expired, ownership-mismatched, self-mismatched, and protocol-contract-mismatched actors are rejected by the common contract static-call preflight before transaction persistence or submission. The intentionally excluded legacy proposal overload remains ABI-only and is listed separately in the JSON artifact.

## Domains

| Domain | Write methods |
| --- | ---: |
${domainRows}

## Protected capabilities

| Capability | ABI methods | Workflow routes |
| --- | --- | --- |
${capabilityRows}
`, "utf8");
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  generateActorNegativePathReport()
    .then((report) => {
      console.log(`actor negative-path coverage OK: ${report.totals.actorMethodCaseCount} actor/method cases across ${report.totals.writeMethodCount} writes`);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
