import path from "node:path";

import { generatedManifestDir, readJson, writeJson } from "./utils.js";

type RpcRegistry = {
  generatedAt: string;
  methods: Record<string, unknown>;
  events: Record<string, unknown>;
};

async function main(): Promise<void> {
  const abiRegistry = await readJson<RpcRegistry>(path.join(generatedManifestDir, "abi-method-registry.json"));
  const rpcRegistry = {
    generatedAt: new Date().toISOString(),
    methods: abiRegistry.methods,
    events: abiRegistry.events,
  };
  await writeJson(path.join(generatedManifestDir, "rpc-method-registry.json"), rpcRegistry);
  console.log(`generated RPC registry with ${Object.keys(rpcRegistry.methods).length} methods and ${Object.keys(rpcRegistry.events).length} events`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
