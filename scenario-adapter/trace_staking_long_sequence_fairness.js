#!/usr/bin/env node
"use strict";

require("dotenv").config();
const {
  DAY,
  TOKEN_UNIT,
  createContext,
  createUser,
  ensurePlatformAdmin,
  sendAndWait,
  transferAndApprove,
  advanceTime,
  forceDegradedMode
} = require("./lib/staking_helpers");

const RPC_URL = process.env.RPC_URL;
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const { founder, founderAddress, access, token, staking, echo } = await createContext({
    rpcUrl: RPC_URL,
    diamondAddress: DIAMOND_ADDRESS,
    privateKey: PRIVATE_KEY
  });

  await ensurePlatformAdmin(access, founder, founderAddress);

  const alice = await createUser(founder.provider, founder);
  const bob = await createUser(founder.provider, founder);
  const carol = await createUser(founder.provider, founder);
  const thresholds = [10_000n, 50_000n, 200_000n, 500_000n].map((v) => v * TOKEN_UNIT);
  const multipliers = [15_000n, 12_500n, 10_000n, 7_500n, 5_000n];
  const rewardFundAmount = 2_000_000n * TOKEN_UNIT;
  const stakeAmount = 20_000n * TOKEN_UNIT;

  await sendAndWait(staking.connect(founder).initStaking(DAY, DAY, 1000, thresholds, multipliers, { gasLimit: 4_000_000 }), "initStaking");
  await sendAndWait(token.connect(founder).approve(DIAMOND_ADDRESS, rewardFundAmount), "approve:rewardPool");
  await sendAndWait(staking.connect(founder).fundRewardPool(rewardFundAmount, { gasLimit: 2_500_000 }), "fundRewardPool");
  await sendAndWait(staking.connect(founder).setEchoScoreBoost(1000, 2000, { gasLimit: 1_000_000 }), "setEchoScoreBoost");
  await forceDegradedMode(echo, staking, founder, founder.provider, 50_000n * TOKEN_UNIT);

  for (const user of [alice, bob, carol]) {
    await transferAndApprove(token, founder, user.wallet, user.address, DIAMOND_ADDRESS, stakeAmount, `fairness:${user.address}`);
  }

  await sendAndWait(staking.connect(alice.wallet).stake(stakeAmount, { gasLimit: 3_000_000 }), "stake:alice");
  await advanceTime(founder.provider, DAY + 1);
  await sendAndWait(staking.connect(bob.wallet).stake(stakeAmount, { gasLimit: 3_000_000 }), "stake:bob");
  await advanceTime(founder.provider, DAY + 1);
  await sendAndWait(staking.connect(carol.wallet).stake(stakeAmount, { gasLimit: 3_000_000 }), "stake:carol");
  await advanceTime(founder.provider, DAY + 1);

  const [a0, b0, c0] = await Promise.all([
    token.tokenBalanceOf(alice.address),
    token.tokenBalanceOf(bob.address),
    token.tokenBalanceOf(carol.address)
  ]);

  await sendAndWait(staking.connect(alice.wallet).claimRewards({ gasLimit: 3_000_000 }), "claim:alice");
  await sendAndWait(staking.connect(bob.wallet).claimRewards({ gasLimit: 3_000_000 }), "claim:bob");
  await sendAndWait(staking.connect(carol.wallet).claimRewards({ gasLimit: 3_000_000 }), "claim:carol");

  const [a1, b1, c1] = await Promise.all([
    token.tokenBalanceOf(alice.address),
    token.tokenBalanceOf(bob.address),
    token.tokenBalanceOf(carol.address)
  ]);

  const aliceReward = a1 - a0;
  const bobReward = b1 - b0;
  const carolReward = c1 - c0;

  if (!(aliceReward > bobReward && bobReward > carolReward)) {
    throw new Error(`expected early staker ordering alice > bob > carol, got ${aliceReward} ${bobReward} ${carolReward}`);
  }

  console.log("TRACE_STAKING_LONG_SEQUENCE_FAIRNESS: PASS");
}

main().catch((err) => {
  console.error("TRACE_STAKING_LONG_SEQUENCE_FAIRNESS: FAIL");
  console.error(err);
  process.exit(1);
});
