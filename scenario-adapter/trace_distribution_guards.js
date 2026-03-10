#!/usr/bin/env node
"use strict";

require("dotenv").config();
const { ethers } = require("ethers");
const { advanceTime, expectRevert, sendAndWait } = require("./lib/access_helpers");
const { bootstrapDistribution } = require("./lib/distribution_helpers");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";

async function main() {
  const { provider, emergency, diamondAddress, token, rewards, user1, user2, TOKEN_UNIT, hashLeaf, buildMerkle, getProof } =
    await bootstrapDistribution(RPC_URL);

  const user1Address = await user1.getAddress();
  const user2Address = await user2.getAddress();
  const alloc1 = 1_000n * TOKEN_UNIT;
  const alloc2 = 1_500n * TOKEN_UNIT;
  const leaves = [hashLeaf(user1Address, alloc1), hashLeaf(user2Address, alloc2)];
  const { root } = buildMerkle(leaves);
  const start = BigInt((await provider.getBlock("latest")).timestamp) + 10n;
  const cap = alloc1;

  await sendAndWait(rewards.createCampaign(root, start, 0n, 0n, 0n, cap, { gasLimit: 2_000_000 }), "createCampaign");
  await advanceTime(provider, 11);

  await expectRevert(
    () => rewards.connect(user1).claim.staticCall(1n, alloc1, getProof(leaves, 1), { gasLimit: 2_000_000 }),
    "claim:badProof"
  );
  await expectRevert(
    () => rewards.connect(user1).claim.staticCall(1n, alloc1, getProof(leaves, 0), { gasLimit: 2_000_000 }),
    "claim:insufficientFunding"
  );

  await sendAndWait(token.transfer(diamondAddress, alloc1, { gasLimit: 1_000_000 }), "fundPartialCampaign");
  await sendAndWait(rewards.connect(user1).claim(1n, alloc1, getProof(leaves, 0), { gasLimit: 2_000_000 }), "claim:user1");

  await expectRevert(
    () => rewards.connect(user2).claim.staticCall(1n, alloc2, getProof(leaves, 1), { gasLimit: 2_000_000 }),
    "claim:capExceeded"
  );
  await expectRevert(
    () => rewards.connect(user1).claim.staticCall(1n, alloc1, getProof(leaves, 0), { gasLimit: 2_000_000 }),
    "claim:nothingToClaim"
  );

  await sendAndWait(rewards.pauseCampaign(1n, { gasLimit: 1_000_000 }), "pauseCampaign");
  await expectRevert(
    () => rewards.connect(user2).claim.staticCall(1n, alloc2, getProof(leaves, 1), { gasLimit: 2_000_000 }),
    "claim:campaignPaused"
  );
  await sendAndWait(rewards.unpauseCampaign(1n, { gasLimit: 1_000_000 }), "unpauseCampaign");

  await sendAndWait(emergency.emergencyStop({ gasLimit: 2_000_000 }), "emergencyStop");
  await expectRevert(
    () => rewards.connect(user2).claim.staticCall(1n, alloc2, getProof(leaves, 1), { gasLimit: 2_000_000 }),
    "claim:emergencyStopped"
  );

  console.log("TRACE_DISTRIBUTION_GUARDS: PASS");
}

main().catch((err) => {
  console.error("TRACE_DISTRIBUTION_GUARDS: FAIL");
  console.error(err);
  process.exit(1);
});
