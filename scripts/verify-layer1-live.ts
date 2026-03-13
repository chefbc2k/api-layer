import { createApiServer } from "../packages/api/src/app.js";
import { loadRepoEnv, readConfigFromEnv } from "../packages/client/src/runtime/config.js";
import { facetRegistry } from "../packages/client/src/generated/index.js";
import { Contract, Interface, JsonRpcProvider, Wallet, ethers } from "ethers";
import fs from "node:fs";
import path from "node:path";

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

type DomainResult = {
  routes: Array<string>;
  actors: Array<string>;
  result: "proven working" | "blocked by setup/state" | "semantically clarified but not fully proven" | "deeper issue remains";
  evidence: Record<string, unknown>;
};

async function apiCall(port: number, method: string, url: string, options: ApiCallOptions = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${url}`, {
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

function normalize(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, normalize(entry)]));
  }
  return value;
}

function extractTxHash(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const value = (payload as Record<string, unknown>).txHash;
  return typeof value === "string" ? value : null;
}

async function waitForReceipt(provider: JsonRpcProvider, txHash: string, label: string) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const receipt = await provider.getTransactionReceipt(txHash);
    if (receipt) {
      return receipt;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`timeout waiting for ${label} receipt`);
}

function buildPath(definition: EndpointDefinition, params: Record<string, string>): string {
  let path = definition.path;
  for (const match of path.match(/:([A-Za-z0-9_]+)/gu) ?? []) {
    const key = match.slice(1);
    const value = params[key];
    if (value !== undefined) {
      path = path.replace(match, value);
    }
  }
  if (definition.httpMethod !== "GET") {
    return path;
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
  return query ? `${path}?${query}` : path;
}

function endpointByKey(registry: Record<string, EndpointDefinition>, key: string): EndpointDefinition | null {
  return registry[key] ?? null;
}

async function main() {
  const repoEnv = loadRepoEnv();
  const config = readConfigFromEnv(repoEnv);
  const provider = new JsonRpcProvider(config.cbdpRpcUrl, config.chainId);
  const founderKey = repoEnv.PRIVATE_KEY ?? "";
  const founder = founderKey ? new Wallet(founderKey, provider) : null;
  const licensee = Wallet.createRandom().connect(provider);

  process.env.API_LAYER_KEYS_JSON = JSON.stringify({
    "founder-key": { label: "founder", signerId: "founder", roles: ["service"], allowGasless: false },
    "read-key": { label: "reader", roles: ["service"], allowGasless: false },
    "licensee-key": { label: "licensee", signerId: "licensee", roles: ["service"], allowGasless: false },
  });
  process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({
    founder: founderKey,
    licensee: licensee.privateKey,
  });

  const endpointRegistry = JSON.parse(
    fs.readFileSync(path.join("generated", "manifests", "http-endpoint-registry.json"), "utf8"),
  ).methods as Record<string, EndpointDefinition>;

  const server = createApiServer({ port: 0 }).listen();
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 8787;

  const results: Record<string, DomainResult> = {};
  const actors = {
    founder: founder?.address ?? "0x0000000000000000000000000000000000000000",
    licensee: licensee.address,
  };

  try {
    // 1. Governance
    {
      const domain: DomainResult = {
        routes: [],
        actors: ["founder-key"],
        result: "blocked by setup/state",
        evidence: {},
      };
      const proposeEndpoint = endpointByKey(endpointRegistry, "ProposalFacet.propose(address[],uint256[],bytes[],string,uint8)");
      if (!proposeEndpoint) {
        domain.result = "deeper issue remains";
        domain.evidence.error = "missing modern propose endpoint";
      } else {
        domain.routes.push(`${proposeEndpoint.httpMethod} ${proposeEndpoint.path}`);
        const iface = new Interface(facetRegistry.TokenSupplyFacet.abi);
        const calldata = iface.encodeFunctionData("name", []);
        const proposeResp = await apiCall(port, proposeEndpoint.httpMethod, proposeEndpoint.path, {
          body: {
            targets: [config.diamondAddress],
            values: ["0"],
            calldatas: [calldata],
            description: `Layer1 proof ${Date.now()}`,
            proposalType: "0",
          },
        });
        domain.evidence.submit = proposeResp;
        const proposeTxHash = extractTxHash(proposeResp.payload);
        if (proposeTxHash) {
          domain.evidence.submitTxHash = proposeTxHash;
          const receipt = await waitForReceipt(provider, proposeTxHash, "governance submit");
          domain.evidence.submitReceipt = { status: receipt.status, blockNumber: receipt.blockNumber };
        }

        const proposalId = (proposeResp.payload as Record<string, unknown>)?.proposalId as string | undefined;
        if (proposalId) {
          const snapshotEndpoint = endpointByKey(endpointRegistry, "ProposalFacet.proposalSnapshot");
          const stateEndpoint = endpointByKey(endpointRegistry, "ProposalFacet.prState");
          if (snapshotEndpoint) {
            domain.routes.push(`${snapshotEndpoint.httpMethod} ${snapshotEndpoint.path}`);
          }
          if (stateEndpoint) {
            domain.routes.push(`${stateEndpoint.httpMethod} ${stateEndpoint.path}`);
          }
          const snapshotResp = snapshotEndpoint
            ? await apiCall(
              port,
              snapshotEndpoint.httpMethod,
              buildPath(snapshotEndpoint, { proposalId }),
              { apiKey: "read-key" },
            )
            : { status: 0, payload: "missing proposalSnapshot endpoint" };
          const stateResp = stateEndpoint
            ? await apiCall(
              port,
              stateEndpoint.httpMethod,
              buildPath(stateEndpoint, { proposalId }),
              { apiKey: "read-key" },
            )
            : { status: 0, payload: "missing prState endpoint" };
          domain.evidence.snapshot = snapshotResp;
          domain.evidence.state = stateResp;
          domain.result = stateResp.status === 200 && String(stateResp.payload) === "1"
            ? "proven working"
            : "blocked by setup/state";
        } else {
          domain.result = proposeResp.status === 202 ? "semantically clarified but not fully proven" : "deeper issue remains";
        }
      }
      results.governance = domain;
    }

    // 2. Licensing
    {
      const domain: DomainResult = {
        routes: [],
        actors: ["founder-key", "licensee-key"],
        result: "semantically clarified but not fully proven",
        evidence: {},
      };
      const createTemplateEndpoint = endpointByKey(endpointRegistry, "VoiceLicenseTemplateFacet.createTemplate");
      if (!createTemplateEndpoint) {
        domain.evidence.note = "createTemplate not in mounted surface; licensing proof skipped";
      } else {
        domain.routes.push(`${createTemplateEndpoint.httpMethod} ${createTemplateEndpoint.path}`);
      }

      const getTemplateEndpoint = endpointByKey(endpointRegistry, "VoiceLicenseTemplateFacet.getTemplate");
      if (getTemplateEndpoint) {
        domain.routes.push(`${getTemplateEndpoint.httpMethod} ${getTemplateEndpoint.path}`);
      }

      const getTermsEndpoint = endpointByKey(endpointRegistry, "VoiceLicenseFacet.getLicenseTerms");
      if (getTermsEndpoint) {
        domain.routes.push(`${getTermsEndpoint.httpMethod} ${getTermsEndpoint.path}`);
      }
      results.licensing = domain;
    }

    // 3. Marketplace
    {
      const domain: DomainResult = {
        routes: [],
        actors: ["founder-key"],
        result: "deeper issue remains",
        evidence: {},
      };
      const createVoiceEndpoint = endpointByKey(endpointRegistry, "VoiceAssetFacet.registerVoiceAsset");
      if (createVoiceEndpoint) {
        domain.routes.push(`${createVoiceEndpoint.httpMethod} ${createVoiceEndpoint.path}`);
      }
      const voiceResp = createVoiceEndpoint
        ? await apiCall(port, createVoiceEndpoint.httpMethod, createVoiceEndpoint.path, {
        body: { ipfsHash: `QmLayer1Mkt-${Date.now()}`, royaltyRate: "175" },
      })
        : { status: 0, payload: "missing registerVoiceAsset endpoint" };
      domain.evidence.createVoice = voiceResp;
      const voiceTxHash = extractTxHash(voiceResp.payload);
      if (voiceTxHash) {
        await waitForReceipt(provider, voiceTxHash, "market voice");
      }
      const voiceHash = (voiceResp.payload as Record<string, unknown>)?.result as string | undefined;
      if (voiceHash) {
        const tokenIdEndpoint = endpointByKey(endpointRegistry, "VoiceAssetFacet.getTokenId");
        const tokenIdResp = tokenIdEndpoint
          ? await apiCall(
            port,
            tokenIdEndpoint.httpMethod,
            buildPath(tokenIdEndpoint, { voiceHash }),
            { apiKey: "read-key" },
          )
          : { status: 0, payload: "missing getTokenId endpoint" };
        if (tokenIdEndpoint) {
          domain.routes.push(`${tokenIdEndpoint.httpMethod} ${tokenIdEndpoint.path}`);
        }
        domain.evidence.tokenId = tokenIdResp;
        const tokenId = String(tokenIdResp.payload);

        const approvalEndpoint = endpointByKey(endpointRegistry, "VoiceAssetFacet.setApprovalForAll");
        if (approvalEndpoint) {
          domain.routes.push(`${approvalEndpoint.httpMethod} ${approvalEndpoint.path}`);
        }
        const approvalResp = approvalEndpoint
          ? await apiCall(port, approvalEndpoint.httpMethod, approvalEndpoint.path, {
          body: { operator: config.diamondAddress, approved: true },
        })
          : { status: 0, payload: "missing setApprovalForAll endpoint" };
        domain.evidence.approval = approvalResp;
        const approvalTxHash = extractTxHash(approvalResp.payload);
        if (approvalTxHash) {
          await waitForReceipt(provider, approvalTxHash, "approval");
        }

        const listEndpoint = endpointByKey(endpointRegistry, "MarketplaceFacet.listAsset");
        if (listEndpoint) {
          domain.routes.push(`${listEndpoint.httpMethod} ${listEndpoint.path}`);
        }
        const listResp = listEndpoint
          ? await apiCall(port, listEndpoint.httpMethod, listEndpoint.path, {
          body: { tokenId, price: "1000", duration: "0" },
        })
          : { status: 0, payload: "missing listAsset endpoint" };
        domain.evidence.list = listResp;
        const listTxHash = extractTxHash(listResp.payload);
        if (listTxHash) {
          const listReceipt = await waitForReceipt(provider, listTxHash, "list asset");
          domain.evidence.listReceipt = { status: listReceipt.status, blockNumber: listReceipt.blockNumber };

          const eventEndpoint = endpointByKey(endpointRegistry, "MarketplaceFacet.AssetListed");
          if (eventEndpoint) {
            domain.routes.push(`${eventEndpoint.httpMethod} ${eventEndpoint.path}`);
          }
          const eventResp = eventEndpoint
            ? await apiCall(port, eventEndpoint.httpMethod, eventEndpoint.path, {
            apiKey: "read-key",
            body: { fromBlock: String(listReceipt.blockNumber), toBlock: String(listReceipt.blockNumber) },
          })
            : { status: 0, payload: "missing AssetListed endpoint" };
          domain.evidence.assetListedEvent = eventResp;
        }

        const getListingEndpoint = endpointByKey(endpointRegistry, "MarketplaceFacet.getListing");
        if (getListingEndpoint) {
          domain.routes.push(`${getListingEndpoint.httpMethod} ${getListingEndpoint.path}`);
          const listingResp = await apiCall(
            port,
            getListingEndpoint.httpMethod,
            buildPath(getListingEndpoint, { tokenId }),
            { apiKey: "read-key" },
          );
          domain.evidence.listingRead = listingResp;
        }
      }

      domain.result = (domain.evidence as Record<string, any>).list?.status === 202 ? "proven working" : "deeper issue remains";
      results.marketplace = domain;
    }

    // 4. Datasets
    {
      const domain: DomainResult = {
        routes: [],
        actors: ["founder-key"],
        result: "deeper issue remains",
        evidence: {},
      };
      const createVoiceEndpoint = endpointByKey(endpointRegistry, "VoiceAssetFacet.registerVoiceAsset");
      const tokenIdEndpoint = endpointByKey(endpointRegistry, "VoiceAssetFacet.getTokenId");
      if (createVoiceEndpoint) domain.routes.push(`${createVoiceEndpoint.httpMethod} ${createVoiceEndpoint.path}`);
      if (tokenIdEndpoint) domain.routes.push(`${tokenIdEndpoint.httpMethod} ${tokenIdEndpoint.path}`);

      const voiceA = createVoiceEndpoint
        ? await apiCall(port, createVoiceEndpoint.httpMethod, createVoiceEndpoint.path, {
        body: { ipfsHash: `QmLayer1DataA-${Date.now()}`, royaltyRate: "175" },
      })
        : { status: 0, payload: "missing registerVoiceAsset endpoint" };
      const voiceB = createVoiceEndpoint
        ? await apiCall(port, createVoiceEndpoint.httpMethod, createVoiceEndpoint.path, {
        body: { ipfsHash: `QmLayer1DataB-${Date.now()}`, royaltyRate: "175" },
      })
        : { status: 0, payload: "missing registerVoiceAsset endpoint" };
      domain.evidence.voiceA = voiceA;
      domain.evidence.voiceB = voiceB;
      const txA = extractTxHash(voiceA.payload);
      const txB = extractTxHash(voiceB.payload);
      if (txA) await waitForReceipt(provider, txA, "dataset voice A");
      if (txB) await waitForReceipt(provider, txB, "dataset voice B");
      const voiceHashA = (voiceA.payload as Record<string, unknown>)?.result as string | undefined;
      const voiceHashB = (voiceB.payload as Record<string, unknown>)?.result as string | undefined;
      if (voiceHashA && voiceHashB) {
        const tokenA = tokenIdEndpoint
          ? await apiCall(port, tokenIdEndpoint.httpMethod, buildPath(tokenIdEndpoint, { voiceHash: voiceHashA }), { apiKey: "read-key" })
          : { status: 0, payload: "missing getTokenId endpoint" };
        const tokenB = tokenIdEndpoint
          ? await apiCall(port, tokenIdEndpoint.httpMethod, buildPath(tokenIdEndpoint, { voiceHash: voiceHashB }), { apiKey: "read-key" })
          : { status: 0, payload: "missing getTokenId endpoint" };
        domain.evidence.tokenA = tokenA;
        domain.evidence.tokenB = tokenB;

        const createTemplateEndpoint = endpointByKey(endpointRegistry, "VoiceLicenseTemplateFacet.createTemplate");
        if (createTemplateEndpoint) domain.routes.push(`${createTemplateEndpoint.httpMethod} ${createTemplateEndpoint.path}`);
        const templateResp = createTemplateEndpoint
          ? await apiCall(port, createTemplateEndpoint.httpMethod, createTemplateEndpoint.path, {
          body: {
            template: {
              isActive: true,
              transferable: true,
              defaultDuration: (30n * 24n * 60n * 60n).toString(),
              defaultPrice: "10000",
              maxUses: "10",
              name: `Layer1 Dataset Template ${Date.now()}`,
              description: "dataset template",
              defaultRights: ["Narration"],
              defaultRestrictions: ["no-sublicense"],
              terms: {
                licenseHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
                duration: (30n * 24n * 60n * 60n).toString(),
                price: "10000",
                maxUses: "10",
                transferable: true,
                rights: ["Narration"],
                restrictions: ["no-sublicense"],
              },
            },
          },
        })
          : { status: 0, payload: "missing createTemplate endpoint" };
        domain.evidence.template = templateResp;
        const templateHash = (templateResp.payload as Record<string, unknown>)?.result as string | undefined;
        if (templateHash) {
          const createDatasetEndpoint = endpointByKey(endpointRegistry, "VoiceDatasetFacet.createDataset");
          if (createDatasetEndpoint) domain.routes.push(`${createDatasetEndpoint.httpMethod} ${createDatasetEndpoint.path}`);
          const datasetResp = createDatasetEndpoint
            ? await apiCall(port, createDatasetEndpoint.httpMethod, createDatasetEndpoint.path, {
            body: {
              title: `Layer1 Dataset ${Date.now()}`,
              assetIds: [String(tokenA.payload), String(tokenB.payload)],
              licenseTemplateId: BigInt(templateHash).toString(),
              metadataURI: `ipfs://layer1-dataset-${Date.now()}`,
              royaltyBps: "500",
            },
          })
            : { status: 0, payload: "missing createDataset endpoint" };
          domain.evidence.dataset = datasetResp;
          const datasetTxHash = extractTxHash(datasetResp.payload);
          if (datasetTxHash) {
            const receipt = await waitForReceipt(provider, datasetTxHash, "create dataset");
            domain.evidence.datasetReceipt = { status: receipt.status, blockNumber: receipt.blockNumber };
            const eventEndpoint = endpointByKey(endpointRegistry, "VoiceDatasetFacet.DatasetCreated");
            if (eventEndpoint) domain.routes.push(`${eventEndpoint.httpMethod} ${eventEndpoint.path}`);
            const eventResp = eventEndpoint
              ? await apiCall(port, eventEndpoint.httpMethod, eventEndpoint.path, {
              apiKey: "read-key",
              body: { fromBlock: String(receipt.blockNumber), toBlock: String(receipt.blockNumber) },
            })
              : { status: 0, payload: "missing DatasetCreated endpoint" };
            domain.evidence.datasetCreatedEvent = eventResp;
          }
          const datasetId = (datasetResp.payload as Record<string, unknown>)?.result as string | undefined;
          if (datasetId) {
            const getDatasetEndpoint = endpointByKey(endpointRegistry, "VoiceDatasetFacet.getDataset");
            if (getDatasetEndpoint) {
              domain.routes.push(`${getDatasetEndpoint.httpMethod} ${getDatasetEndpoint.path}`);
              const readResp = await apiCall(
                port,
                getDatasetEndpoint.httpMethod,
                buildPath(getDatasetEndpoint, { datasetId }),
                { apiKey: "read-key" },
              );
              domain.evidence.datasetRead = readResp;
            }
          }
        }
      }
      domain.result = (domain.evidence as Record<string, any>).dataset?.status === 202 ? "proven working" : "deeper issue remains";
      results.datasets = domain;
    }

    // 5. Voice-assets
    {
      const domain: DomainResult = {
        routes: [],
        actors: ["founder-key"],
        result: "deeper issue remains",
        evidence: {},
      };
      const createVoiceEndpoint = endpointByKey(endpointRegistry, "VoiceAssetFacet.registerVoiceAsset");
      if (createVoiceEndpoint) domain.routes.push(`${createVoiceEndpoint.httpMethod} ${createVoiceEndpoint.path}`);
      const voiceResp = createVoiceEndpoint
        ? await apiCall(port, createVoiceEndpoint.httpMethod, createVoiceEndpoint.path, {
        body: { ipfsHash: `QmLayer1Voice-${Date.now()}`, royaltyRate: "175" },
      })
        : { status: 0, payload: "missing registerVoiceAsset endpoint" };
      domain.evidence.createVoice = voiceResp;
      const voiceTxHash = extractTxHash(voiceResp.payload);
      if (voiceTxHash) {
        const receipt = await waitForReceipt(provider, voiceTxHash, "voice asset");
        domain.evidence.createVoiceReceipt = { status: receipt.status, blockNumber: receipt.blockNumber };
        const eventEndpoint = endpointByKey(endpointRegistry, "VoiceAssetFacet.VoiceAssetRegistered");
        if (eventEndpoint) domain.routes.push(`${eventEndpoint.httpMethod} ${eventEndpoint.path}`);
        const eventResp = eventEndpoint
          ? await apiCall(port, eventEndpoint.httpMethod, eventEndpoint.path, {
          apiKey: "read-key",
          body: { fromBlock: String(receipt.blockNumber), toBlock: String(receipt.blockNumber) },
        })
          : { status: 0, payload: "missing VoiceAssetRegistered endpoint" };
        domain.evidence.registeredEvent = eventResp;
      }
      const voiceHash = (voiceResp.payload as Record<string, unknown>)?.result as string | undefined;
      if (voiceHash) {
        const getVoiceEndpoint = endpointByKey(endpointRegistry, "VoiceAssetFacet.getVoiceAsset");
        if (getVoiceEndpoint) {
          domain.routes.push(`${getVoiceEndpoint.httpMethod} ${getVoiceEndpoint.path}`);
          const readResp = await apiCall(
            port,
            getVoiceEndpoint.httpMethod,
            buildPath(getVoiceEndpoint, { voiceHash }),
            { apiKey: "read-key" },
          );
          domain.evidence.voiceRead = readResp;
        }
      }
      domain.result = voiceResp.status === 202 ? "proven working" : "deeper issue remains";
      results["voice-assets"] = domain;
    }

    // 6. Tokenomics
    {
      const domain: DomainResult = {
        routes: [],
        actors: ["read-key"],
        result: "deeper issue remains",
        evidence: {},
      };
      const totalSupplyEndpoint = endpointByKey(endpointRegistry, "TokenSupplyFacet.totalSupply");
      const campaignCountEndpoint = endpointByKey(endpointRegistry, "CommunityRewardsFacet.campaignCount");
      const vestingEndpoint = endpointByKey(endpointRegistry, "VestingFacet.hasVestingSchedule");
      if (totalSupplyEndpoint) domain.routes.push(`${totalSupplyEndpoint.httpMethod} ${totalSupplyEndpoint.path}`);
      if (campaignCountEndpoint) domain.routes.push(`${campaignCountEndpoint.httpMethod} ${campaignCountEndpoint.path}`);
      if (vestingEndpoint) domain.routes.push(`${vestingEndpoint.httpMethod} ${vestingEndpoint.path}`);
      const totalSupplyResp = totalSupplyEndpoint
        ? await apiCall(port, totalSupplyEndpoint.httpMethod, buildPath(totalSupplyEndpoint, {}), { apiKey: "read-key" })
        : { status: 0, payload: "missing totalSupply endpoint" };
      const campaignCountResp = campaignCountEndpoint
        ? await apiCall(port, campaignCountEndpoint.httpMethod, buildPath(campaignCountEndpoint, {}), { apiKey: "read-key" })
        : { status: 0, payload: "missing campaignCount endpoint" };
      const vestingResp = vestingEndpoint
        ? await apiCall(port, vestingEndpoint.httpMethod, buildPath(vestingEndpoint, { beneficiary: actors.founder }), { apiKey: "read-key" })
        : { status: 0, payload: "missing hasVestingSchedule endpoint" };
      domain.evidence.totalSupply = totalSupplyResp;
      domain.evidence.campaignCount = campaignCountResp;
      domain.evidence.vestingSchedule = vestingResp;
      domain.result = totalSupplyResp.status === 200 && campaignCountResp.status === 200 && vestingResp.status === 200
        ? "proven working"
        : "deeper issue remains";
      results.tokenomics = domain;
    }

    // 7. Access-control
    {
      const domain: DomainResult = {
        routes: [],
        actors: ["read-key"],
        result: "deeper issue remains",
        evidence: {},
      };
      const role = ethers.id("PROPOSER_ROLE");
      const hasRoleEndpoint = endpointByKey(endpointRegistry, "AccessControlFacet.hasRole");
      if (hasRoleEndpoint) {
        domain.routes.push(`${hasRoleEndpoint.httpMethod} ${hasRoleEndpoint.path}`);
      }
      const hasRoleResp = hasRoleEndpoint
        ? await apiCall(
          port,
          hasRoleEndpoint.httpMethod,
          buildPath(hasRoleEndpoint, { role, account: actors.founder }),
          { apiKey: "read-key" },
        )
        : { status: 0, payload: "missing hasRole endpoint" };
      domain.evidence.hasRole = hasRoleResp;
      domain.result = hasRoleResp.status === 200 ? "proven working" : "deeper issue remains";
      results["access-control"] = domain;
    }

    // 8. Admin / Emergency / Multisig
    {
      const domain: DomainResult = {
        routes: [],
        actors: ["read-key"],
        result: "deeper issue remains",
        evidence: {},
      };
      const founderRoleEndpoint = endpointByKey(endpointRegistry, "DiamondCutFacet.FOUNDER_ROLE");
      if (founderRoleEndpoint) {
        domain.routes.push(`${founderRoleEndpoint.httpMethod} ${founderRoleEndpoint.path}`);
      }
      const founderRoleResp = founderRoleEndpoint
        ? await apiCall(port, founderRoleEndpoint.httpMethod, founderRoleEndpoint.path, { apiKey: "read-key", body: {} })
        : { status: 0, payload: "missing FOUNDER_ROLE endpoint" };
      domain.evidence.founderRole = founderRoleResp;

      const emergencyEndpoint = endpointByKey(endpointRegistry, "EmergencyFacet.getEmergencyState");
      if (emergencyEndpoint) {
        domain.routes.push(`${emergencyEndpoint.httpMethod} ${emergencyEndpoint.path}`);
      }
      const emergencyResp = emergencyEndpoint
        ? await apiCall(port, emergencyEndpoint.httpMethod, emergencyEndpoint.path, { apiKey: "read-key", body: {} })
        : { status: 0, payload: "missing getEmergencyState endpoint" };
      domain.evidence.emergencyState = emergencyResp;

      const multisigEndpoint = endpointByKey(endpointRegistry, "MultiSigFacet.isOperator");
      if (multisigEndpoint) {
        domain.routes.push(`${multisigEndpoint.httpMethod} ${multisigEndpoint.path}`);
      }
      const multisigResp = multisigEndpoint
        ? await apiCall(
          port,
          multisigEndpoint.httpMethod,
          buildPath(multisigEndpoint, { account: actors.founder }),
          { apiKey: "read-key" },
        )
        : { status: 0, payload: "missing multisig read endpoint" };
      domain.evidence.isOperator = multisigResp;

      domain.result = founderRoleResp.status === 200 && emergencyResp.status === 200 && multisigResp.status === 200
        ? "proven working"
        : "deeper issue remains";
      results["admin/emergency/multisig"] = domain;
    }

    console.log(JSON.stringify(normalize(results), null, 2));
  } finally {
    server.close();
    await provider.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
