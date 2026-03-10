const fs = require("node:fs");
const path = require("node:path");

const { Interface } = require("ethers");
const ethersModule = require("ethers");

const rootDir = path.resolve(__dirname, "..");
const manifestPath = path.join(rootDir, "generated", "manifests", "contract-manifest.json");
const rpcEndpoint = process.env.API_LAYER_RPC_URL || "http://127.0.0.1:8787";
const apiKey = process.env.API_LAYER_API_KEY || "";

if (!fs.existsSync(manifestPath)) {
  throw new Error(`scenario adapter requires generated manifest: ${manifestPath}`);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
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
  const response = await fetch(rpcEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(apiKey ? { "x-api-key": apiKey } : {}),
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `${Date.now()}`,
      method,
      params,
    }),
  });
  const payload = await response.json();
  if (payload.error) {
    throw new Error(payload.error.message || "RPC error");
  }
  return payload.result;
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
