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

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
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
  const initialStake = 30_000n * TOKEN_UNIT;
  const partialUnstake = 10_000n * TOKEN_UNIT;
  const restake = 7_500n * TOKEN_UNIT;

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

  await transferAndApprove(token, founder, staker.wallet, staker.address, DIAMOND_ADDRESS, initialStake + restake, "partialRestake");
  await sendAndWait(staking.connect(staker.wallet).stake(initialStake, { gasLimit: 3_000_000 }), "stake:initial");

  const firstInfo = await staking.getStakeInfo(staker.address);
  const originalStakeTimestamp = firstInfo.stakeTimestamp;

  await advanceTime(founder.provider, DAY + 1);
  const liquidBeforeClaim = await token.tokenBalanceOf(staker.address);
  await sendAndWait(staking.connect(staker.wallet).claimRewards({ gasLimit: 3_000_000 }), "claimRewards:first");
  const liquidAfterClaim = await token.tokenBalanceOf(staker.address);
  if (liquidAfterClaim <= liquidBeforeClaim) throw new Error("first claim should increase liquid balance");

  await sendAndWait(staking.connect(staker.wallet).requestUnstake(partialUnstake, { gasLimit: 2_000_000 }), "requestUnstake:partial");
  await advanceTime(founder.provider, DAY + 1);
  await sendAndWait(staking.connect(staker.wallet).executeUnstake({ gasLimit: 4_000_000 }), "executeUnstake:partial");

  const afterPartial = await staking.getStakeInfo(staker.address);
  if (afterPartial.amount !== initialStake - partialUnstake) throw new Error("partial unstake left wrong principal");
  if (afterPartial.stakeTimestamp !== originalStakeTimestamp) throw new Error("partial unstake should preserve original stake timestamp");

  await sendAndWait(staking.connect(staker.wallet).stake(restake, { gasLimit: 3_000_000 }), "stake:restake");
  const afterRestake = await staking.getStakeInfo(staker.address);
  if (afterRestake.amount !== initialStake - partialUnstake + restake) throw new Error("restake total principal mismatch");
  if (afterRestake.stakeTimestamp !== originalStakeTimestamp) throw new Error("restake should preserve original stake timestamp for existing stake");

  await advanceTime(founder.provider, DAY + 1);
  const liquidBeforeSecondClaim = await token.tokenBalanceOf(staker.address);
  await sendAndWait(staking.connect(staker.wallet).claimRewards({ gasLimit: 3_000_000 }), "claimRewards:second");
  const liquidAfterSecondClaim = await token.tokenBalanceOf(staker.address);
  if (liquidAfterSecondClaim <= liquidBeforeSecondClaim) throw new Error("second claim should increase liquid balance");

  console.log("TRACE_STAKING_PARTIAL_UNSTAKE_RESTAKE: PASS");
}

main().catch((err) => {
  console.error("TRACE_STAKING_PARTIAL_UNSTAKE_RESTAKE: FAIL");
  console.error(err);
  process.exit(1);
});
