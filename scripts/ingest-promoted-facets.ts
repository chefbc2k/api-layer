import path from "node:path";

import { readJson, writeJson } from "./utils.js";

type AbiEntry = {
  type?: string;
};

const facetSources: Array<{ name: string; source: string }> = [
  {
    name: "EscrowFacet",
    source: "/Users/chef/Public/CONTRACTS/abis/contracts/marketplace/facets/EscrowFacet.sol/EscrowFacet.json",
  },
  {
    name: "RightsFacet",
    source: "/Users/chef/Public/CONTRACTS/abis/contracts/voice/facets/RightsFacet.sol/RightsFacet.json",
  },
  {
    name: "VestingFacet",
    source: "/Users/chef/Public/CONTRACTS/abis/contracts/token/vesting/VestingFacet.sol/VestingFacet.json",
  },
  {
    name: "CommunityRewardsFacet",
    source: "/Users/chef/Public/CONTRACTS/abis/contracts/token/distribution/CommunityRewardsFacet.sol/CommunityRewardsFacet.json",
  },
  {
    name: "LegacyFacet",
    source: "/Users/chef/Public/CONTRACTS/abis/contracts/voice/facets/LegacyFacet.sol/LegacyFacet.json",
  },
  {
    name: "LegacyViewFacet",
    source: "/Users/chef/Public/CONTRACTS/abis/contracts/voice/facets/LegacyViewFacet.sol/LegacyViewFacet.json",
  },
  {
    name: "LegacyExecutionFacet",
    source: "/Users/chef/Public/CONTRACTS/abis/contracts/voice/facets/LegacyExecutionFacet.sol/LegacyExecutionFacet.json",
  },
];

async function main(): Promise<void> {
  const targetDir = path.resolve("abis", "facets");
  for (const facet of facetSources) {
    const raw = await readJson<unknown>(facet.source);
    const abi = Array.isArray(raw) ? raw : (raw as { abi?: AbiEntry[] }).abi;
    if (!Array.isArray(abi)) {
      throw new Error(`invalid ABI for ${facet.name} from ${facet.source}`);
    }
    await writeJson(path.join(targetDir, `${facet.name}.json`), abi);
  }
  console.log(`ingested ${facetSources.length} promoted facets into ${targetDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
