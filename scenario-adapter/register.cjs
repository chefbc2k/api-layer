const fs = require("node:fs");
const path = require("node:path");

const { Interface } = require("ethers");
const ethersModule = require("ethers");

const rootDir = path.resolve(__dirname, "..");
const manifestPath = path.join(rootDir, "generated", "manifests", "contract-manifest.json");
const endpointRegistryPath = path.join(rootDir, "generated", "manifests", "http-endpoint-registry.json");
const apiBaseUrl = process.env.API_LAYER_API_URL || process.env.API_LAYER_RPC_URL || "http://127.0.0.1:8787";
const apiKey = process.env.API_LAYER_API_KEY || "";

if (!fs.existsSync(manifestPath)) {
  throw new Error(`scenario adapter requires generated manifest: ${manifestPath}`);
}
if (!fs.existsSync(endpointRegistryPath)) {
  throw new Error(`scenario adapter requires generated endpoint registry: ${endpointRegistryPath}`);
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

async function invoke(method, params) {
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
  const response = await fetch(`${apiBaseUrl}${requestPath}${query.size > 0 ? `?${query.toString()}` : ""}`, {
    method: definition.httpMethod,
    headers: {
      ...(definition.httpMethod === "GET" ? {} : { "content-type": "application/json" }),
      ...(apiKey ? { "x-api-key": apiKey } : {}),
    },
    body: definition.httpMethod === "GET"
      ? undefined
      : JSON.stringify(body, (_key, value) => typeof value === "bigint" ? value.toString() : value),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
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
        return invoke("events.query", [
          {
            facetName: filter.facetName,
            eventName: filter.eventName,
            fromBlock: fromBlock == null ? undefined : String(fromBlock),
            toBlock: toBlock == null ? undefined : String(toBlock),
          },
        ]);
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
          const callable = (...args) => invoke(`${facetName}.${directName}`, args);
          callable.staticCall = (...args) => invoke(`${facetName}.${directName}`, args);
          callable.send = (...args) => invoke(`${facetName}.${directName}`, args);
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
