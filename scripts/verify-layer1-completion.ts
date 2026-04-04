import { createApiServer } from "../packages/api/src/app.js";
import { loadRepoEnv } from "../packages/client/src/runtime/config.js";
import { resolveRuntimeConfig } from "./alchemy-debug-lib.js";
import { Wallet } from "ethers";
import { buildVerifyReportOutput, getOutputPath, writeVerifyReportOutput } from "./verify-report.js";

type ApiCallOptions = {
  apiKey?: string;
  body?: unknown;
};

type EndpointDefinition = {
  httpMethod: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  inputShape: {
    kind: "none" | "query" | "body" | "path+body";
    bindings: Array<{ name: string; source: "path" | "query" | "body"; field: string }>;
  };
};

async function apiCall(port: number, method: string, path: string, options: ApiCallOptions = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(options.apiKey === undefined ? { "x-api-key": "founder-key" } : options.apiKey ? { "x-api-key": options.apiKey } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const payload = await response.json().catch(() => null);
  return { status: response.status, payload };
}

function buildPath(definition: EndpointDefinition, params: Record<string, string>): string {
  if (definition.httpMethod !== "GET") {
    return definition.path;
  }
  const search = new URLSearchParams();
  for (const binding of definition.inputShape.bindings ?? []) {
    if (binding.source !== "query") {
      continue;
    }
    const value = params[binding.field];
    if (value !== undefined) {
      search.set(binding.field, value);
    }
  }
  const query = search.toString();
  return query ? `${definition.path}?${query}` : definition.path;
}

function isCompletionEvidenceHealthy(value: unknown): boolean {
  if (value && typeof value === "object" && "status" in value) {
    return (value as { status?: unknown }).status === 200;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).every((entry) => entry === true);
  }
  return false;
}

async function main() {
  const repoEnv = loadRepoEnv();
  const { config } = await resolveRuntimeConfig(repoEnv);
  const founderKey = repoEnv.PRIVATE_KEY ?? "";
  const founderAddress = founderKey ? new Wallet(founderKey).address : "0x0000000000000000000000000000000000000000";
  process.env.RPC_URL = config.cbdpRpcUrl;
  process.env.ALCHEMY_RPC_URL = config.alchemyRpcUrl;
  process.env.API_LAYER_KEYS_JSON = JSON.stringify({
    "founder-key": { label: "founder", signerId: "founder", roles: ["service"], allowGasless: false },
    "read-key": { label: "reader", roles: ["service"], allowGasless: false },
  });
  process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({
    founder: founderKey,
  });
  process.env.API_LAYER_SIGNER_API_KEYS_JSON = JSON.stringify({
    [founderAddress.toLowerCase()]: {
      apiKey: "founder-key",
      signerId: "founder",
      privateKey: founderKey,
      label: "founder",
      roles: ["service"],
      allowGasless: false,
    },
  });
  process.env.API_LAYER_API_KEY = "founder-key";
  process.env.API_LAYER_READ_API_KEY = "read-key";

  const endpointRegistry = await (await import("../generated/manifests/http-endpoint-registry.json", { assert: { type: "json" } })).default;
  const endpoints = endpointRegistry.methods as Record<string, EndpointDefinition>;
  const outputPath = getOutputPath();

  const server = createApiServer({ port: 0, quiet: true }).listen();
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 8787;

  try {
    const results: Record<string, unknown> = {};

    const communityRewards = endpoints["CommunityRewardsFacet.campaignCount"];
    results.communityRewards = communityRewards
      ? await apiCall(port, communityRewards.httpMethod, buildPath(communityRewards, {}), { apiKey: "read-key" })
      : { status: 0, payload: "missing route" };

    const vesting = endpoints["VestingFacet.hasVestingSchedule"];
    results.vesting = vesting
      ? await apiCall(
        port,
        vesting.httpMethod,
        buildPath(vesting, { beneficiary: founderAddress }),
        { apiKey: "read-key" },
      )
      : { status: 0, payload: "missing route" };

    const escrow = endpoints["EscrowFacet.isInEscrow"];
    results.escrow = escrow
      ? await apiCall(
        port,
        escrow.httpMethod,
        buildPath(escrow, { tokenId: "0" }),
        { apiKey: "read-key" },
      )
      : { status: 0, payload: "missing route" };

    const rights = endpoints["RightsFacet.rightIdExists"];
    results.rights = rights
      ? await apiCall(
        port,
        rights.httpMethod,
        buildPath(rights, { rightId: "Narration" }),
        { apiKey: "read-key" },
      )
      : { status: 0, payload: "missing route" };

    const legacyView = endpoints["LegacyViewFacet.getLegacyPlan"];
    results.legacyView = legacyView
      ? await apiCall(
        port,
        legacyView.httpMethod,
        buildPath(legacyView, { owner: founderAddress }),
        { apiKey: "read-key" },
      )
      : { status: 0, payload: "missing route" };

    results.legacyWriteRoutes = {
      createLegacyPlan: Boolean(endpoints["LegacyFacet.createLegacyPlan"]),
      initiateInheritance: Boolean(endpoints["LegacyExecutionFacet.initiateInheritance"]),
    };

    results.governanceLegacyProposeExposed = Boolean(endpoints["ProposalFacet.propose(address[],uint256[],bytes[],string,uint8)"]);

    const report = buildVerifyReportOutput({
      completion: {
        routes: [
          communityRewards ? `${communityRewards.httpMethod} ${communityRewards.path}` : "missing CommunityRewardsFacet.campaignCount",
          vesting ? `${vesting.httpMethod} ${vesting.path}` : "missing VestingFacet.hasVestingSchedule",
          escrow ? `${escrow.httpMethod} ${escrow.path}` : "missing EscrowFacet.isInEscrow",
          rights ? `${rights.httpMethod} ${rights.path}` : "missing RightsFacet.rightIdExists",
          legacyView ? `${legacyView.httpMethod} ${legacyView.path}` : "missing LegacyViewFacet.getLegacyPlan",
        ],
        actors: ["read-key", "founder-key"],
        executionResult: "completion readback inspection",
        evidence: Object.entries(results).map(([route, value]) => ({
          route,
          actor: route.includes("legacy") ? "founder-key" : "read-key",
          status: value && typeof value === "object" && "status" in value && typeof (value as { status?: unknown }).status === "number"
            ? (value as { status: number }).status
            : undefined,
          postState: value,
        })),
        finalClassification: Object.values(results).every(isCompletionEvidenceHealthy) ? "proven working" : "deeper issue remains",
      },
    });
    writeVerifyReportOutput(outputPath, report);
    console.log(JSON.stringify(report, null, 2));
  } finally {
    server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
