#!/usr/bin/env node
"use strict";

require("dotenv").config();
const { ethers } = require("ethers");
const { advanceTime, sendAndWait } = require("./lib/access_helpers");
const { bootstrapDistribution } = require("./lib/distribution_helpers");

const RPC_URL = process.env.RPC_URL;

async function main() {
  const { provider, founder, founderAddress, diamondAddress, token, rewards, user1, user2, TOKEN_UNIT, hashLeaf, buildMerkle, getProof } =
    await bootstrapDistribution(RPC_URL);

  const user1Address = await user1.getAddress();
  const user2Address = await user2.getAddress();
  const alloc1 = 1_000n * TOKEN_UNIT;
  const alloc2 = 2_000n * TOKEN_UNIT;
  const leaves = [hashLeaf(user1Address, alloc1), hashLeaf(user2Address, alloc2)];
  const { root } = buildMerkle(leaves);
  const start = BigInt((await provider.getBlock("latest")).timestamp) + 60n;
  const cliff = 300n;
  const duration = 1200n;
  const tgeUnlockBps = 2000n;
  const cap = alloc1 + alloc2;

  await sendAndWait(
    rewards.createCampaign(root, start, cliff, duration, tgeUnlockBps, cap, { gasLimit: 2_000_000 }),
    "createCampaign"
  );
  await sendAndWait(token.transfer(diamondAddress, cap), "fundDiamondForCampaign");

  const campaign = await rewards.getCampaign(1n);
  if (campaign.merkleRoot !== root) throw new Error("merkle root mismatch");

  const proof1 = getProof(leaves, 0);
  const proof2 = getProof(leaves, 1);

  const beforeStartClaimable = await rewards.claimableAmount(1n, user1Address, alloc1);
  if (beforeStartClaimable !== 0n) throw new Error(`claimable before start should be zero: ${beforeStartClaimable}`);

  await advanceTime(provider, 61);
  const tgeClaimable = await rewards.claimableAmount(1n, user1Address, alloc1);
  const expectedTge = (alloc1 * tgeUnlockBps) / 10000n;
  if (tgeClaimable !== expectedTge) throw new Error(`TGE claimable mismatch: ${tgeClaimable} != ${expectedTge}`);

  await sendAndWait(rewards.connect(user1).claim(1n, alloc1, proof1, { gasLimit: 2_000_000 }), "claim:user1:tge");
  if ((await rewards.claimed(1n, user1Address)) !== expectedTge) throw new Error("claimed mapping mismatch after TGE claim");

  await advanceTime(provider, 300);
  const midClaimable = await rewards.claimableAmount(1n, user2Address, alloc2);
  if (midClaimable <= (alloc2 * tgeUnlockBps) / 10000n) {
    throw new Error(`mid vest claimable should exceed TGE amount: ${midClaimable}`);
  }
  await sendAndWait(rewards.connect(user2).claim(1n, alloc2, proof2, { gasLimit: 2_000_000 }), "claim:user2:mid");

  await advanceTime(provider, 1800);
  await sendAndWait(rewards.connect(user1).claim(1n, alloc1, proof1, { gasLimit: 2_000_000 }), "claim:user1:final");
  await sendAndWait(rewards.connect(user2).claim(1n, alloc2, proof2, { gasLimit: 2_000_000 }), "claim:user2:final");

  if ((await rewards.claimed(1n, user1Address)) !== alloc1) throw new Error("user1 should be fully claimed");
  if ((await rewards.claimed(1n, user2Address)) !== alloc2) throw new Error("user2 should be fully claimed");

  const finalCampaign = await rewards.getCampaign(1n);
  if (finalCampaign.totalClaimed !== cap) throw new Error(`campaign totalClaimed mismatch: ${finalCampaign.totalClaimed} != ${cap}`);
  if (await token.tokenBalanceOf(diamondAddress)) {
    const remaining = await token.tokenBalanceOf(diamondAddress);
    if (remaining !== 0n) throw new Error(`diamond should have no campaign tokens left: ${remaining}`);
  }

  const founderBalance = await token.tokenBalanceOf(founderAddress);
  const user1Balance = await token.tokenBalanceOf(user1Address);
  const user2Balance = await token.tokenBalanceOf(user2Address);
  if (user1Balance !== alloc1) throw new Error(`user1 token balance mismatch: ${user1Balance}`);
  if (user2Balance !== alloc2) throw new Error(`user2 token balance mismatch: ${user2Balance}`);
  if (founderBalance <= cap) throw new Error("founder balance should reflect initial supply less funded campaign");

  console.log("TRACE_DISTRIBUTION_LIFECYCLE: PASS");
}

main().catch((err) => {
  console.error("TRACE_DISTRIBUTION_LIFECYCLE: FAIL");
  console.error(err);
  process.exit(1);
});
