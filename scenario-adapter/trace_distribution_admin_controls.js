#!/usr/bin/env node
"use strict";

require("dotenv").config();
const { ethers } = require("ethers");
const { bootstrapDistribution } = require("./lib/distribution_helpers");
const { expectRevert, sendAndWait } = require("./lib/access_helpers");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";

async function main() {
  const { provider, rewards, user1, TOKEN_UNIT, hashLeaf, buildMerkle } = await bootstrapDistribution(RPC_URL);
  const user1Address = await user1.getAddress();
  const alloc1 = 500n * TOKEN_UNIT;
  const root1 = buildMerkle([hashLeaf(user1Address, alloc1)]).root;
  const root2 = buildMerkle([hashLeaf(user1Address, alloc1 + TOKEN_UNIT)]).root;
  const start = BigInt((await provider.getBlock("latest")).timestamp) + 10n;

  await expectRevert(
    () => rewards.connect(user1).createCampaign.staticCall(root1, start, 0n, 100n, 0n, alloc1, { gasLimit: 2_000_000 }),
    "createCampaign:notTimelock"
  );
  await expectRevert(
    () => rewards.createCampaign.staticCall(ethers.ZeroHash, start, 0n, 100n, 0n, alloc1, { gasLimit: 2_000_000 }),
    "createCampaign:zeroRoot"
  );
  await expectRevert(
    () => rewards.createCampaign.staticCall(root1, start, 0n, 100n, 10001n, alloc1, { gasLimit: 2_000_000 }),
    "createCampaign:tgeTooHigh"
  );
  await expectRevert(
    () => rewards.createCampaign.staticCall(root1, start, 0n, 100n, 0n, 0n, { gasLimit: 2_000_000 }),
    "createCampaign:zeroCap"
  );

  await sendAndWait(rewards.createCampaign(root1, start, 0n, 100n, 1000n, alloc1, { gasLimit: 2_000_000 }), "createCampaign");
  await sendAndWait(rewards.pauseCampaign(1n, { gasLimit: 1_000_000 }), "pauseCampaign");
  if (!(await rewards.getCampaign(1n)).paused) throw new Error("campaign should be paused");
  await sendAndWait(rewards.unpauseCampaign(1n, { gasLimit: 1_000_000 }), "unpauseCampaign");
  if ((await rewards.getCampaign(1n)).paused) throw new Error("campaign should be unpaused");
  await sendAndWait(rewards.setMerkleRoot(1n, root2, { gasLimit: 1_000_000 }), "setMerkleRoot");
  if ((await rewards.getCampaign(1n)).merkleRoot !== root2) throw new Error("merkle root update failed");

  await expectRevert(() => rewards.pauseCampaign.staticCall(999n, { gasLimit: 1_000_000 }), "pauseCampaign:notFound");
  await expectRevert(() => rewards.setMerkleRoot.staticCall(1n, ethers.ZeroHash, { gasLimit: 1_000_000 }), "setMerkleRoot:zero");

  console.log("TRACE_DISTRIBUTION_ADMIN_CONTROLS: PASS");
}

main().catch((err) => {
  console.error("TRACE_DISTRIBUTION_ADMIN_CONTROLS: FAIL");
  console.error(err);
  process.exit(1);
});
