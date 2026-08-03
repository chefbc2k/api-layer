import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  buildWriteInvariantRegistry,
  type AbiRegistry,
  type ReviewedWriteInvariantFile,
} from "./write-invariants-lib.js";
import { generatedManifestDir, readJson, writeJson } from "./utils.js";

export async function generateWriteInvariantRegistry(args: {
  abiRegistryPath?: string;
  reviewedMetadataPath?: string;
  outputPath?: string;
  generatedAt?: string;
} = {}): Promise<ReturnType<typeof buildWriteInvariantRegistry>> {
  const abiRegistryPath = args.abiRegistryPath ?? path.join(generatedManifestDir, "abi-method-registry.json");
  const reviewedMetadataPath = args.reviewedMetadataPath ?? path.resolve("reviewed", "reviewed-write-invariants.json");
  const outputPath = args.outputPath ?? path.join(generatedManifestDir, "write-invariant-registry.json");
  const [abiRegistry, reviewed] = await Promise.all([
    readJson<AbiRegistry>(abiRegistryPath),
    readJson<ReviewedWriteInvariantFile>(reviewedMetadataPath),
  ]);
  const output = buildWriteInvariantRegistry(abiRegistry, reviewed, args.generatedAt ?? new Date().toISOString());
  await writeJson(outputPath, output);
  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  generateWriteInvariantRegistry()
    .then((output) => {
      console.log(`write invariant coverage OK: ${output.totals.metadataCount}/${output.totals.writeMethodCount} ABI write methods`);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
