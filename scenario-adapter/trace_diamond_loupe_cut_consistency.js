#!/usr/bin/env node
"use strict";

require("dotenv").config();
const { ethers } = require("ethers");
const {
  loadArtifact,
  selectorsForAbi,
  deployBaseDiamondWithAccess,
  deploy,
  sendAndWait
} = require("./lib/reentrancy_real_helpers");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";

async function main() {
  const { founder, diamondAddress, diamondCut } = await deployBaseDiamondWithAccess(RPC_URL);

  const loupeArtifact = loadArtifact("out/DiamondLoupeFacet.sol/DiamondLoupeFacet.json");
  const rewardsArtifact = loadArtifact("out/CommunityRewardsFacet.sol/CommunityRewardsFacet.json");

  const loupe = new ethers.Contract(diamondAddress, loupeArtifact.abi, founder);
  const rewardsV1 = await deploy(
    new ethers.ContractFactory(rewardsArtifact.abi, rewardsArtifact.bytecode.object, founder),
    "CommunityRewardsFacetV1"
  );
  const rewardsV2 = await deploy(
    new ethers.ContractFactory(rewardsArtifact.abi, rewardsArtifact.bytecode.object, founder),
    "CommunityRewardsFacetV2"
  );

  const selectors = selectorsForAbi(rewardsArtifact.abi);
  await sendAndWait(
    diamondCut.diamondCut(
      [{ facetAddress: await rewardsV1.getAddress(), action: 0, functionSelectors: selectors }],
      ethers.ZeroAddress,
      "0x",
      { gasLimit: 5_000_000 }
    ),
    "diamondCut:addCommunityRewardsV1"
  );

  const diamondAsRewards = new ethers.Contract(diamondAddress, rewardsArtifact.abi, founder);
  if (await diamondAsRewards.campaignCount() !== 0n) throw new Error("campaignCount should be zero after add");
  if (
    (await loupe.facetAddress(diamondAsRewards.interface.getFunction("campaignCount").selector)).toLowerCase()
      !== (await rewardsV1.getAddress()).toLowerCase()
  ) {
    throw new Error("loupe facetAddress mismatch after add");
  }

  await sendAndWait(
    diamondCut.diamondCut(
      [{ facetAddress: await rewardsV2.getAddress(), action: 1, functionSelectors: selectors }],
      ethers.ZeroAddress,
      "0x",
      { gasLimit: 5_000_000 }
    ),
    "diamondCut:replaceCommunityRewardsV2"
  );

  if (
    (await loupe.facetAddress(diamondAsRewards.interface.getFunction("campaignCount").selector)).toLowerCase()
      !== (await rewardsV2.getAddress()).toLowerCase()
  ) {
    throw new Error("loupe facetAddress mismatch after replace");
  }

  await sendAndWait(
    diamondCut.diamondCut(
      [{ facetAddress: ethers.ZeroAddress, action: 2, functionSelectors: selectors }],
      ethers.ZeroAddress,
      "0x",
      { gasLimit: 5_000_000 }
    ),
    "diamondCut:removeCommunityRewards"
  );

  try {
    await diamondAsRewards.campaignCount.staticCall();
    throw new Error("campaignCount should be removed");
  } catch {}

  const remaining = await loupe.facetAddress(diamondAsRewards.interface.getFunction("campaignCount").selector);
  if (remaining !== ethers.ZeroAddress) throw new Error(`removed selector should resolve to zero address: ${remaining}`);

  console.log("TRACE_DIAMOND_LOUPE_CUT_CONSISTENCY: PASS");
}

main().catch((err) => {
  console.error("TRACE_DIAMOND_LOUPE_CUT_CONSISTENCY: FAIL");
  console.error(err);
  process.exit(1);
});
