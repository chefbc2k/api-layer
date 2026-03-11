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
  await transferAndApprove(token, founder, staker.wallet, staker.address, DIAMOND_ADDRESS, stakeAmount, "forfeiture");
  await sendAndWait(staking.connect(staker.wallet).stake(stakeAmount, { gasLimit: 3_000_000 }), "stake");

  await advanceTime(founder.provider, DAY + 1);
  const breakdownBefore = await staking.getRewardBreakdown(staker.address);
  const statsBefore = await staking.getStakingStats();
  const liquidBefore = await token.tokenBalanceOf(staker.address);

  const claimReceipt = await sendAndWait(staking.connect(staker.wallet).claimRewards({ gasLimit: 3_000_000 }), "claimRewards");

  const liquidAfter = await token.tokenBalanceOf(staker.address);
  const claimed = liquidAfter - liquidBefore;
  const statsAfter = await staking.getStakingStats();
  const detailedTopic = staking.interface.getEvent("RewardsClaimedDetailed").topicHash;
  const detailedLog = claimReceipt.logs.find((log) => log.topics[0] === detailedTopic);
  if (!detailedLog) throw new Error("missing RewardsClaimedDetailed event");
  const parsed = staking.interface.parseLog(detailedLog);
  const rawPending = parsed.args.rawPending;
  const claimable = parsed.args.claimable;
  const forfeited = parsed.args.forfeited;

  if (breakdownBefore.rawPending <= 0n) throw new Error("raw pending should be positive");
  if (breakdownBefore.claimable <= 0n) throw new Error("claimable should be positive");
  if (breakdownBefore.forfeited <= 0n) throw new Error("forfeited should be positive");
  if (breakdownBefore.rawPending !== rawPending) throw new Error("event rawPending mismatch");
  if (breakdownBefore.claimable !== claimable) throw new Error("event claimable mismatch");
  if (breakdownBefore.forfeited !== forfeited) throw new Error("event forfeited mismatch");
  if (rawPending !== claimable + forfeited) {
    throw new Error("rawPending should equal claimable plus forfeited");
  }
  if (claimed !== claimable) {
    throw new Error(`claimed liquid delta mismatch claimed=${claimed} claimable=${claimable}`);
  }
  if (statsAfter.totalRewardsDistributed - statsBefore.totalRewardsDistributed !== claimed) {
    throw new Error("totalRewardsDistributed should increase by exactly the claimed amount");
  }

  console.log("TRACE_STAKING_FORFEITURE_ACCOUNTING: PASS");
}

main().catch((err) => {
  console.error("TRACE_STAKING_FORFEITURE_ACCOUNTING: FAIL");
  console.error(err);
  process.exit(1);
});
