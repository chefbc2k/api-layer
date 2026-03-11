const fs = require("node:fs");
const path = require("node:path");

const { Interface } = require("ethers");
const ethersModule = require("ethers");

const rootDir = path.resolve(__dirname, "..");
const manifestPath = path.join(rootDir, "generated", "manifests", "contract-manifest.json");
const endpointRegistryPath = path.join(rootDir, "generated", "manifests", "http-endpoint-registry.json");
const apiBaseUrl = process.env.API_LAYER_API_URL || process.env.API_LAYER_RPC_URL;
const defaultApiKey = process.env.API_LAYER_API_KEY || "";
const defaultReadApiKey = process.env.API_LAYER_READ_API_KEY || defaultApiKey;
const diagnosticsPath = process.env.API_LAYER_SCENARIO_DIAGNOSTICS_PATH || "";
const signerApiKeys = (() => {
  const raw = process.env.API_LAYER_SIGNER_API_KEYS_JSON;
  if (!raw) {
    return new Map();
  }
  return new Map(
    Object.entries(JSON.parse(raw)).map(([address, entry]) => [
      address.toLowerCase(),
      typeof entry === "string" ? { apiKey: entry } : entry,
    ]),
  );
})();
const scenarioDiagnostics = {
  scenarioCommand: process.env.API_LAYER_SCENARIO_COMMAND || null,
  startedAt: new Date().toISOString(),
  invocations: [],
  failures: [],
};

if (!fs.existsSync(manifestPath)) {
  throw new Error(`scenario adapter requires generated manifest: ${manifestPath}`);
}
if (!fs.existsSync(endpointRegistryPath)) {
  throw new Error(`scenario adapter requires generated endpoint registry: ${endpointRegistryPath}`);
}
if (!apiBaseUrl) {
  throw new Error("scenario adapter requires API_LAYER_API_URL");
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const endpointRegistry = JSON.parse(fs.readFileSync(endpointRegistryPath, "utf8"));
const facetAbis = new Map();
for (const facet of manifest.facets) {
  const abiPath = path.join(rootDir, facet.abiPath);
  facetAbis.set(facet.facetName, JSON.parse(fs.readFileSync(abiPath, "utf8")));
}

function identifyFacet(abi) {
  const functionSet = new Set(abi.filter((entry) => entry.type === "function").map((entry) => `${entry.name}(${(entry.inputs || []).map((input) => input.type).join(",")})`));
  for (const facet of manifest.facets) {
    const candidateAbi = facetAbis.get(facet.facetName);
    const candidateSet = new Set(candidateAbi.filter((entry) => entry.type === "function").map((entry) => `${entry.name}(${(entry.inputs || []).map((input) => input.type).join(",")})`));
    if (functionSet.size !== candidateSet.size) {
      continue;
    }
    let match = true;
    for (const signature of functionSet) {
      if (!candidateSet.has(signature)) {
        match = false;
        break;
      }
    }
    if (match) {
      return facet.facetName;
    }
  }
  return null;
}

function summarizePayload(payload) {
  if (!payload || typeof payload !== "object") {
    return payload;
  }
  return {
    txHash: payload.txHash || null,
    requestId: payload.requestId || null,
    relay: payload.relay ? { userOperationHash: payload.relay.userOperationHash || null } : null,
    diagnostics: payload.diagnostics || null,
  };
}

function writeScenarioDiagnostics() {
  if (!diagnosticsPath) {
    return;
  }
  fs.mkdirSync(path.dirname(diagnosticsPath), { recursive: true });
  fs.writeFileSync(diagnosticsPath, `${JSON.stringify({
    ...scenarioDiagnostics,
    finishedAt: new Date().toISOString(),
  }, null, 2)}\n`);
}

process.on("exit", writeScenarioDiagnostics);
process.on("beforeExit", writeScenarioDiagnostics);
process.on("uncaughtException", (error) => {
  scenarioDiagnostics.failures.push({
    phase: "uncaughtException",
    error: error && error.message ? error.message : String(error),
  });
  writeScenarioDiagnostics();
});
process.on("unhandledRejection", (error) => {
  scenarioDiagnostics.failures.push({
    phase: "unhandledRejection",
    error: error && error.message ? error.message : String(error),
  });
  writeScenarioDiagnostics();
});

async function resolveApiKey(runner, httpMethod) {
  const fallback = httpMethod === "GET" ? defaultReadApiKey : defaultApiKey;
  if (!runner) {
    return { apiKey: fallback, signerAddress: null, resolution: "fallback-no-runner" };
  }

  try {
    const address = typeof runner.getAddress === "function"
      ? await runner.getAddress()
      : runner.address;
    if (address) {
      const entry = signerApiKeys.get(String(address).toLowerCase());
      if (entry && entry.apiKey) {
        return {
          apiKey: entry.apiKey,
          signerAddress: String(address),
          resolution: "mapped",
        };
      }
      return {
        apiKey: fallback,
        signerAddress: String(address),
        resolution: "fallback-unmapped-signer",
      };
    }
  } catch {
    return { apiKey: fallback, signerAddress: null, resolution: "fallback-address-error" };
  }

  return { apiKey: fallback, signerAddress: null, resolution: "fallback-no-address" };
}

async function invoke(method, params, runner) {
  const definition = endpointRegistry.methods[method];
  if (!definition) {
    throw new Error(`missing HTTP endpoint definition for ${method}`);
  }
  let requestPath = definition.path;
  const query = new URLSearchParams();
  const body = {};
  definition.inputShape.bindings.forEach((binding, index) => {
    const value = params[index];
    if (binding.source === "path") {
      requestPath = requestPath.replace(`:${binding.field}`, encodeURIComponent(String(value)));
      return;
    }
    if (binding.source === "query") {
      query.set(binding.field, typeof value === "string" ? value : JSON.stringify(value));
      return;
    }
    body[binding.field] = value;
  });
  const apiKeyContext = await resolveApiKey(runner, definition.httpMethod);
  const invocation = {
    kind: "method",
    method,
    httpMethod: definition.httpMethod,
    path: requestPath,
    query: Object.fromEntries(query.entries()),
    signerAddress: apiKeyContext.signerAddress,
    signerResolution: apiKeyContext.resolution,
    startedAt: new Date().toISOString(),
  };
  scenarioDiagnostics.invocations.push(invocation);
  const response = await fetch(`${apiBaseUrl}${requestPath}${query.size > 0 ? `?${query.toString()}` : ""}`, {
    method: definition.httpMethod,
    headers: {
      ...(definition.httpMethod === "GET" ? {} : { "content-type": "application/json" }),
      ...(apiKeyContext.apiKey ? { "x-api-key": apiKeyContext.apiKey } : {}),
    },
    body: definition.httpMethod === "GET"
      ? undefined
      : JSON.stringify(body, (_key, value) => typeof value === "bigint" ? value.toString() : value),
  });
  const payload = await response.json().catch(() => ({}));
  invocation.status = response.status;
  invocation.response = summarizePayload(payload.result ?? payload);
  if (!response.ok) {
    scenarioDiagnostics.failures.push({
      phase: "http",
      method,
      httpMethod: definition.httpMethod,
      path: requestPath,
      signerAddress: apiKeyContext.signerAddress,
      signerResolution: apiKeyContext.resolution,
      status: response.status,
      payload,
    });
    writeScenarioDiagnostics();
    throw new Error(payload.error || `HTTP ${response.status}`);
  }
  return reviveBigInts(payload.result ?? payload);
}

async function invokeEvent(facetName, eventName, request, runner) {
  const definition = endpointRegistry.events?.[`${facetName}.${eventName}`];
  if (!definition) {
    throw new Error(`missing HTTP event definition for ${facetName}.${eventName}`);
  }
  const apiKeyContext = await resolveApiKey(runner, definition.httpMethod);
  const invocation = {
    kind: "event",
    method: `${facetName}.${eventName}`,
    httpMethod: definition.httpMethod,
    path: definition.path,
    signerAddress: apiKeyContext.signerAddress,
    signerResolution: apiKeyContext.resolution,
    startedAt: new Date().toISOString(),
  };
  scenarioDiagnostics.invocations.push(invocation);
  const response = await fetch(`${apiBaseUrl}${definition.path}`, {
    method: definition.httpMethod,
    headers: {
      "content-type": "application/json",
      ...(apiKeyContext.apiKey ? { "x-api-key": apiKeyContext.apiKey } : {}),
    },
    body: JSON.stringify(request),
  });
  const payload = await response.json().catch(() => ({}));
  invocation.status = response.status;
  invocation.response = summarizePayload(payload.result ?? payload);
  if (!response.ok) {
    scenarioDiagnostics.failures.push({
      phase: "event-http",
      method: `${facetName}.${eventName}`,
      httpMethod: definition.httpMethod,
      path: definition.path,
      signerAddress: apiKeyContext.signerAddress,
      signerResolution: apiKeyContext.resolution,
      status: response.status,
      payload,
    });
    writeScenarioDiagnostics();
    throw new Error(payload.error || `HTTP ${response.status}`);
  }
  return reviveBigInts(payload.result ?? payload);
}

function reviveBigInts(value) {
  if (typeof value === "string" && /^-?\\d+$/.test(value)) {
    return BigInt(value);
  }
  if (Array.isArray(value)) {
    return value.map(reviveBigInts);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, reviveBigInts(entry)]));
  }
  return value;
}

function createProxyContract(address, abi, runner) {
  const facetName = identifyFacet(abi);
  if (!facetName) {
    return new OriginalContract(address, abi, runner);
  }

  const iface = new Interface(abi);
  const state = {
    address,
    abi,
    runner,
    interface: iface,
    facetName,
  };

  const filters = new Proxy(
    {},
    {
      get(_target, eventName) {
        return (...args) => ({
          __apiLayerFilter: true,
          facetName,
          eventName: String(eventName),
          args,
        });
      },
    },
  );

  return new Proxy(
    {
      target: address,
      runner,
      interface: iface,
      filters,
      connect(nextRunner) {
        return createProxyContract(address, abi, nextRunner);
      },
      async queryFilter(filter, fromBlock, toBlock) {
        if (!filter || !filter.__apiLayerFilter) {
          throw new Error("API-mode queryFilter requires adapter-generated filter");
        }
        return invokeEvent(
          filter.facetName,
          filter.eventName,
          {
            fromBlock: fromBlock == null ? undefined : String(fromBlock),
            toBlock: toBlock == null ? undefined : String(toBlock),
          },
          runner,
        );
      },
      async getAddress() {
        return address;
      },
    },
    {
      get(target, prop) {
        if (prop in target) {
          return target[prop];
        }
        if (typeof prop !== "string" || prop === "then") {
          return undefined;
        }
        const functionMatch = iface.fragments.find((fragment) => {
          if (fragment.type !== "function") {
            return false;
          }
          const signature = `${fragment.name}(${(fragment.inputs || []).map((input) => input.type).join(",")})`;
          return fragment.name === prop || signature === prop;
        });
        if (functionMatch) {
          const methodName = `${functionMatch.name}(${(functionMatch.inputs || []).map((input) => input.type).join(",")})`;
          const directName = iface.fragments.filter((fragment) => fragment.type === "function" && fragment.name === functionMatch.name).length > 1 ? methodName : functionMatch.name;
          const callable = (...args) => invoke(`${facetName}.${directName}`, args, state.runner);
          callable.staticCall = (...args) => invoke(`${facetName}.${directName}`, args, state.runner);
          callable.send = (...args) => invoke(`${facetName}.${directName}`, args, state.runner);
          return callable;
        }
        return undefined;
      },
    },
  );
}

const OriginalContract = ethersModule.ethers.Contract;
ethersModule.ethers.Contract = function Contract(address, abi, runner) {
  return createProxyContract(address, abi, runner);
};
ethersModule.Contract = ethersModule.ethers.Contract;
ethersModule.Contract = ethersModule.ethers.Contract;
