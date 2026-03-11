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

async function assertPendingMatches(staking, user) {
  const info = await staking.getStakeInfo(user);
  const pending = await staking.getPendingRewards(user);
  if (info.pendingRewards !== pending) throw new Error("stake info pending and direct pending diverged");
  return { info, pending };
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
  const firstStake = 25_000n * TOKEN_UNIT;
  const restake = 5_000n * TOKEN_UNIT;
  const partialUnstake = 10_000n * TOKEN_UNIT;

  await sendAndWait(staking.connect(founder).initStaking(DAY, DAY, 1000, thresholds, multipliers, { gasLimit: 4_000_000 }), "initStaking");
  await sendAndWait(token.connect(founder).approve(DIAMOND_ADDRESS, rewardFundAmount), "approve:rewardPool");
  await sendAndWait(staking.connect(founder).fundRewardPool(rewardFundAmount, { gasLimit: 2_500_000 }), "fundRewardPool");
  await sendAndWait(staking.connect(founder).setEchoScoreBoost(1000, 2000, { gasLimit: 1_000_000 }), "setEchoScoreBoost");
  await forceDegradedMode(echo, staking, founder, founder.provider, 50_000n * TOKEN_UNIT);
  await transferAndApprove(token, founder, staker.wallet, staker.address, DIAMOND_ADDRESS, firstStake + restake, "debtConsistency");

  await sendAndWait(staking.connect(staker.wallet).stake(firstStake, { gasLimit: 3_000_000 }), "stake:first");
  let snapshot = await assertPendingMatches(staking, staker.address);
  if (snapshot.pending !== 0n) throw new Error("pending should be zero immediately after initial stake");

  await advanceTime(founder.provider, DAY + 1);
  snapshot = await assertPendingMatches(staking, staker.address);
  if (snapshot.pending <= 0n) throw new Error("pending should accrue after min duration");

  await sendAndWait(staking.connect(staker.wallet).claimRewards({ gasLimit: 3_000_000 }), "claimRewards:first");
  snapshot = await assertPendingMatches(staking, staker.address);
  if (snapshot.pending !== 0n) throw new Error("pending should reset after claim");

  await sendAndWait(staking.connect(staker.wallet).requestUnstake(partialUnstake, { gasLimit: 2_000_000 }), "requestUnstake");
  await advanceTime(founder.provider, DAY + 1);
  await sendAndWait(staking.connect(staker.wallet).executeUnstake({ gasLimit: 4_000_000 }), "executeUnstake");
  snapshot = await assertPendingMatches(staking, staker.address);
  if (snapshot.info.amount !== firstStake - partialUnstake) throw new Error("partial unstake principal mismatch");

  await sendAndWait(staking.connect(staker.wallet).stake(restake, { gasLimit: 3_000_000 }), "stake:restake");
  snapshot = await assertPendingMatches(staking, staker.address);
  if (snapshot.info.amount !== firstStake - partialUnstake + restake) throw new Error("restake principal mismatch");

  await advanceTime(founder.provider, DAY + 1);
  snapshot = await assertPendingMatches(staking, staker.address);
  if (snapshot.pending <= 0n) throw new Error("pending should accrue again after restake");

  console.log("TRACE_STAKING_DEBT_CONSISTENCY: PASS");
}

main().catch((err) => {
  console.error("TRACE_STAKING_DEBT_CONSISTENCY: FAIL");
  console.error(err);
  process.exit(1);
});
