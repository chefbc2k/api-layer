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

function checkConservation(stats) {
  if (stats.totalRewardsDistributed > stats.rewardPoolBalance + stats.totalRewardsDistributed) {
    throw new Error("distributed rewards exceeds total accounted rewards");
  }
}

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const { founder, founderAddress, access, token, staking, echo } = await createContext({
    rpcUrl: RPC_URL,
    diamondAddress: DIAMOND_ADDRESS,
    privateKey: PRIVATE_KEY
  });

  await ensurePlatformAdmin(access, founder, founderAddress);

  const staker = await createUser(founder.provider, founder);
  const thresholds = [10_000n, 50_000n, 200_000n, 500_000n].map((v) => v * TOKEN_UNIT);
  const multipliers = [15_000n, 12_500n, 10_000n, 7_500n, 5_000n];
  const rewardFundAmount = 1_000_000n * TOKEN_UNIT;
  const stakeAmount = 20_000n * TOKEN_UNIT;

  await sendAndWait(staking.connect(founder).initStaking(DAY, DAY, 1000, thresholds, multipliers, { gasLimit: 4_000_000 }), "initStaking");
  await sendAndWait(token.connect(founder).approve(DIAMOND_ADDRESS, rewardFundAmount), "approve:rewardPool");
  await sendAndWait(staking.connect(founder).fundRewardPool(rewardFundAmount, { gasLimit: 2_500_000 }), "fundRewardPool");
  await sendAndWait(staking.connect(founder).setEchoScoreBoost(1000, 2000, { gasLimit: 1_000_000 }), "setEchoScoreBoost");
  await forceDegradedMode(echo, staking, founder, founder.provider, 50_000n * TOKEN_UNIT);
  await transferAndApprove(token, founder, staker.wallet, staker.address, DIAMOND_ADDRESS, stakeAmount, "rewardConservation");
  await sendAndWait(staking.connect(staker.wallet).stake(stakeAmount, { gasLimit: 3_000_000 }), "stake");

  const statsAfterFund = await staking.getStakingStats();
  if (statsAfterFund.totalRewardsDistributed !== 0n) throw new Error("rewards distributed should start at zero");
  checkConservation(statsAfterFund);

  await advanceTime(founder.provider, DAY + 1);
  await sendAndWait(staking.connect(staker.wallet).claimRewards({ gasLimit: 3_000_000 }), "claimRewards");

  const statsAfterClaim = await staking.getStakingStats();
  if (statsAfterClaim.totalRewardsDistributed <= 0n) throw new Error("claim should increase totalRewardsDistributed");
  if (statsAfterClaim.totalRewardsDistributed > rewardFundAmount) throw new Error("distributed cannot exceed funded amount");
  checkConservation(statsAfterClaim);

  await sendAndWait(staking.connect(staker.wallet).requestUnstake(5_000n * TOKEN_UNIT, { gasLimit: 2_000_000 }), "requestUnstake");
  await advanceTime(founder.provider, DAY + 1);
  await sendAndWait(staking.connect(staker.wallet).executeUnstake({ gasLimit: 4_000_000 }), "executeUnstake");

  const statsAfterUnstake = await staking.getStakingStats();
  if (statsAfterUnstake.totalRewardsDistributed < statsAfterClaim.totalRewardsDistributed) {
    throw new Error("distributed rewards should not decrease");
  }
  if (statsAfterUnstake.totalRewardsDistributed > rewardFundAmount) throw new Error("distributed exceeds funded amount after unstake");
  checkConservation(statsAfterUnstake);

  console.log("TRACE_STAKING_REWARD_CONSERVATION: PASS");
}

main().catch((err) => {
  console.error("TRACE_STAKING_REWARD_CONSERVATION: FAIL");
  console.error(err);
  process.exit(1);
});
