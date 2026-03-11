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
  expectRevert,
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

  const staker = await createUser(founder.provider, founder);
  const thresholds = [10_000n, 50_000n, 200_000n, 500_000n].map((v) => v * TOKEN_UNIT);
  const multipliers = [15_000n, 12_500n, 10_000n, 7_500n, 5_000n];
  const rewardFundAmount = 1_000_000n * TOKEN_UNIT;
  const stakeAmount = 20_000n * TOKEN_UNIT;
  const unstakeAmount = 5_000n * TOKEN_UNIT;

  try {
    await sendAndWait(
      staking.connect(founder).initStaking(DAY, DAY, 1000, thresholds, multipliers, { gasLimit: 4_000_000 }),
      "initStaking"
    );
  } catch (_) {}

  await sendAndWait(token.connect(founder).approve(DIAMOND_ADDRESS, rewardFundAmount), "approve:rewardPool");
  await sendAndWait(staking.connect(founder).fundRewardPool(rewardFundAmount, { gasLimit: 2_500_000 }), "fundRewardPool");

  await sendAndWait(staking.connect(founder).setEchoScoreBoost(1000, 2000, { gasLimit: 1_000_000 }), "setEchoScoreBoost");
  await sendAndWait(
    staking.connect(founder).setDegradedModeConfig(true, 1, 50_000n * TOKEN_UNIT, { gasLimit: 1_500_000 }),
    "setDegradedModeConfig"
  );
  await forceDegradedMode(echo, staking, founder, founder.provider, 50_000n * TOKEN_UNIT);
  await transferAndApprove(token, founder, staker.wallet, staker.address, DIAMOND_ADDRESS, stakeAmount, "pauseLifecycleStake");

  await sendAndWait(staking.connect(founder).setStakingPaused(true, { gasLimit: 1_000_000 }), "setStakingPaused:true");
  await expectRevert(() => staking.connect(staker.wallet).stake(stakeAmount, { gasLimit: 3_000_000 }), "stake:whilePaused");
  await expectRevert(() => staking.connect(staker.wallet).claimRewards({ gasLimit: 2_000_000 }), "claimRewards:whilePaused");
  await expectRevert(() => staking.connect(staker.wallet).requestUnstake(unstakeAmount, { gasLimit: 2_000_000 }), "requestUnstake:whilePaused");
  await expectRevert(() => staking.connect(staker.wallet).executeUnstake({ gasLimit: 2_000_000 }), "executeUnstake:whilePaused");

  await sendAndWait(staking.connect(founder).setStakingPaused(false, { gasLimit: 1_000_000 }), "setStakingPaused:false");
  await sendAndWait(staking.connect(staker.wallet).stake(stakeAmount, { gasLimit: 3_000_000 }), "stake:afterUnpause");

  await advanceTime(founder.provider, DAY + 1);
  await sendAndWait(staking.connect(staker.wallet).claimRewards({ gasLimit: 3_000_000 }), "claimRewards:afterUnpause");
  await sendAndWait(staking.connect(staker.wallet).requestUnstake(unstakeAmount, { gasLimit: 2_000_000 }), "requestUnstake:afterUnpause");
  await advanceTime(founder.provider, DAY + 1);
  await sendAndWait(staking.connect(staker.wallet).executeUnstake({ gasLimit: 4_000_000 }), "executeUnstake:afterUnpause");

  console.log("TRACE_STAKING_PAUSE_LIFECYCLE: PASS");
}

main().catch((err) => {
  console.error("TRACE_STAKING_PAUSE_LIFECYCLE: FAIL");
  console.error(err);
  process.exit(1);
});
