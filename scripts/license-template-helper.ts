import type { JsonRpcProvider } from "ethers";

const ZERO_BYTES32 = `0x${"0".repeat(64)}`;

export type ApiCallOptions = {
  apiKey?: string;
  body?: unknown;
};

export type ApiCall = (
  port: number,
  method: string,
  path: string,
  options?: ApiCallOptions,
) => Promise<{ status: number; payload: unknown }>;

export type EndpointDefinition = {
  httpMethod: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  inputShape: {
    kind: "none" | "query" | "body" | "path+body";
    bindings: Array<{ name: string; source: "path" | "query" | "body"; field: string }>;
  };
};

export type ActiveTemplate = {
  templateHashHex: string;
  templateIdDecimal: string;
  created: boolean;
};

type EnsureActiveTemplateOptions = {
  port: number;
  provider: JsonRpcProvider;
  apiCall: ApiCall;
  creatorAddress: string;
  label: string;
  readApiKey?: string;
  writeApiKey?: string;
  endpointRegistry?: Record<string, EndpointDefinition>;
  buildPath?: (definition: EndpointDefinition, params: Record<string, string>) => string;
  onRoute?: (route: string) => void;
};

export async function ensureActiveLicenseTemplate(options: EnsureActiveTemplateOptions): Promise<ActiveTemplate> {
  const {
    port,
    provider,
    apiCall,
    creatorAddress,
    label,
    readApiKey = "read-key",
    writeApiKey = "founder-key",
    endpointRegistry,
    buildPath,
    onRoute,
  } = options;
  const creatorTemplatesEndpoint = endpointRegistry?.["VoiceLicenseTemplateFacet.getCreatorTemplates"] ?? null;
  const getTemplateEndpoint = endpointRegistry?.["VoiceLicenseTemplateFacet.getTemplate"] ?? null;
  const createTemplateEndpoint = endpointRegistry?.["VoiceLicenseTemplateFacet.createTemplate"] ?? null;

  trackRoute(creatorTemplatesEndpoint, onRoute);
  trackRoute(getTemplateEndpoint, onRoute);
  trackRoute(createTemplateEndpoint, onRoute);

  const creatorTemplatesPath = creatorTemplatesEndpoint && buildPath
    ? buildPath(creatorTemplatesEndpoint, { creator: creatorAddress })
    : `/v1/licensing/queries/get-creator-templates?creator=${encodeURIComponent(creatorAddress)}`;
  const creatorTemplatesResponse = await apiCall(
    port,
    creatorTemplatesEndpoint?.httpMethod ?? "GET",
    creatorTemplatesPath,
    { apiKey: readApiKey },
  );
  const templateHashes = Array.isArray(creatorTemplatesResponse.payload)
    ? creatorTemplatesResponse.payload.map((entry) => String(entry)).reverse()
    : [];

  for (const templateHashHex of templateHashes) {
    const getTemplatePath = getTemplateEndpoint && buildPath
      ? buildPath(getTemplateEndpoint, { templateHash: templateHashHex })
      : `/v1/licensing/queries/get-template?templateHash=${encodeURIComponent(templateHashHex)}`;
    const templateResponse = await apiCall(
      port,
      getTemplateEndpoint?.httpMethod ?? "GET",
      getTemplatePath,
      { apiKey: readApiKey },
    );
    if ((templateResponse.payload as Record<string, unknown> | null)?.isActive === true) {
      return {
        templateHashHex,
        templateIdDecimal: BigInt(templateHashHex).toString(),
        created: false,
      };
    }
  }

  const createTemplatePath = createTemplateEndpoint?.path ?? "/v1/licensing/license-templates/create-template";
  const createTemplateResponse = await apiCall(
    port,
    createTemplateEndpoint?.httpMethod ?? "POST",
    createTemplatePath,
    {
      apiKey: writeApiKey,
      body: {
        template: buildDefaultTemplate(label),
      },
    },
  );
  if (createTemplateResponse.status !== 202) {
    throw new Error(`license template create failed: ${JSON.stringify(createTemplateResponse.payload)}`);
  }

  const txHash = extractTxHash(createTemplateResponse.payload);
  if (txHash) {
    await waitForReceipt(provider, txHash, "license template create");
  }

  const templateHashHex = String((createTemplateResponse.payload as Record<string, unknown>).result ?? "");
  if (!templateHashHex.startsWith("0x")) {
    throw new Error(`license template create returned invalid hash: ${JSON.stringify(createTemplateResponse.payload)}`);
  }

  return {
    templateHashHex,
    templateIdDecimal: BigInt(templateHashHex).toString(),
    created: true,
  };
}

function buildDefaultTemplate(label: string) {
  const duration = String(45n * 24n * 60n * 60n);
  const price = "15000";
  const maxUses = "12";
  return {
    isActive: true,
    transferable: true,
    defaultDuration: duration,
    defaultPrice: price,
    maxUses,
    name: `${label} ${Date.now()}`,
    description: "Auto-created for Layer 1 dataset verification",
    defaultRights: ["Narration", "Ads"],
    defaultRestrictions: ["no-sublicense"],
    terms: {
      licenseHash: ZERO_BYTES32,
      duration,
      price,
      maxUses,
      transferable: true,
      rights: ["Narration", "Ads"],
      restrictions: ["no-sublicense"],
    },
  };
}

function trackRoute(endpoint: EndpointDefinition | null, onRoute?: (route: string) => void) {
  if (!endpoint || !onRoute) {
    return;
  }
  onRoute(`${endpoint.httpMethod} ${endpoint.path}`);
}

function extractTxHash(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const txHash = (payload as Record<string, unknown>).txHash;
  return typeof txHash === "string" ? txHash : null;
}

async function waitForReceipt(provider: JsonRpcProvider, txHash: string, label: string) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const receipt = await provider.getTransactionReceipt(txHash);
    if (receipt) {
      return receipt;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`timed out waiting for ${label} receipt: ${txHash}`);
}
