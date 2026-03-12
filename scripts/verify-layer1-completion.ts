import { createApiServer } from "../packages/api/src/app.js";
import { loadRepoEnv, readConfigFromEnv } from "../packages/client/src/runtime/config.js";
import { Wallet } from "ethers";

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

async function main() {
  const repoEnv = loadRepoEnv();
  const config = readConfigFromEnv(repoEnv);
  const founderKey = repoEnv.PRIVATE_KEY ?? "";
  const founderAddress = founderKey ? new Wallet(founderKey).address : "0x0000000000000000000000000000000000000000";
  process.env.API_LAYER_KEYS_JSON = JSON.stringify({
    "founder-key": { label: "founder", signerId: "founder", roles: ["service"], allowGasless: false },
    "read-key": { label: "reader", roles: ["service"], allowGasless: false },
  });
  process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({
    founder: founderKey,
  });

  const endpointRegistry = await (await import("../generated/manifests/http-endpoint-registry.json", { assert: { type: "json" } })).default;
  const endpoints = endpointRegistry.methods as Record<string, EndpointDefinition>;

  const server = createApiServer({ port: 0 }).listen();
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

    results.governanceLegacyProposeExposed = Boolean(endpoints["ProposalFacet.propose(string,string,address[],uint256[],bytes[],uint8)"]);

    console.log(JSON.stringify(results, null, 2));
  } finally {
    server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
