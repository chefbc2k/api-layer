#!/usr/bin/env node
"use strict";

require("dotenv").config();
const {
  DAY,
  TOKEN_UNIT,
  createContext,
  createUser,
  ensurePlatformAdmin,
  forceDegradedMode,
  sendAndWait,
  transferAndApprove,
  advanceTime
} = require("./lib/staking_helpers");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const { provider, founder, founderAddress, access, token, staking, echo } = await createContext({
    rpcUrl: RPC_URL,
    diamondAddress: DIAMOND_ADDRESS,
    privateKey: PRIVATE_KEY
  });

  await ensurePlatformAdmin(access, founder, founderAddress);

  const small = await createUser(provider, founder);
  const large = await createUser(provider, founder);

  const thresholds = [10_000n, 50_000n, 200_000n, 500_000n].map((v) => v * TOKEN_UNIT);
  const multipliers = [15_000n, 12_500n, 10_000n, 7_500n, 5_000n];

  try {
    await sendAndWait(
      staking.connect(founder).initStaking(DAY, DAY, 1000, thresholds, multipliers, { gasLimit: 4_000_000 }),
      "initStaking"
    );
  } catch (_) {}

  await forceDegradedMode(echo, staking, founder, provider, 1_000_000n * TOKEN_UNIT);

  const rewardFundAmount = 5_000_000n * TOKEN_UNIT;
  await sendAndWait(token.connect(founder).approve(DIAMOND_ADDRESS, rewardFundAmount), "approve:rewardPool");
  await sendAndWait(staking.connect(founder).fundRewardPool(rewardFundAmount, { gasLimit: 2_500_000 }), "fundRewardPool");

  const smallStake = 20_000n * TOKEN_UNIT;
  const largeStake = 300_000n * TOKEN_UNIT;

  await transferAndApprove(token, founder, small.wallet, small.address, DIAMOND_ADDRESS, smallStake, "smallStake");
  await transferAndApprove(token, founder, large.wallet, large.address, DIAMOND_ADDRESS, largeStake, "largeStake");

  await sendAndWait(staking.connect(small.wallet).stake(smallStake, { gasLimit: 3_000_000 }), "stake:small");
  await sendAndWait(staking.connect(large.wallet).stake(largeStake, { gasLimit: 3_000_000 }), "stake:large");

  await advanceTime(provider, DAY + 1);
  const smallEpoch1 = await staking.getPendingRewards(small.address);
  const largeEpoch1 = await staking.getPendingRewards(large.address);
  if (smallEpoch1 <= 0n || largeEpoch1 <= 0n) throw new Error("pending rewards should accrue for both stakers");
  if (largeEpoch1 <= smallEpoch1) throw new Error("larger stake should accrue more rewards than smaller stake");

  const smallBefore1 = await token.tokenBalanceOf(small.address);
  const largeBefore1 = await token.tokenBalanceOf(large.address);
  await sendAndWait(staking.connect(small.wallet).claimRewards({ gasLimit: 3_000_000 }), "claimRewards:small:epoch1");
  await sendAndWait(staking.connect(large.wallet).claimRewards({ gasLimit: 3_000_000 }), "claimRewards:large:epoch1");
  const smallClaim1 = (await token.tokenBalanceOf(small.address)) - smallBefore1;
  const largeClaim1 = (await token.tokenBalanceOf(large.address)) - largeBefore1;
  if (largeClaim1 <= smallClaim1) throw new Error("larger stake should claim more than smaller stake in epoch1");

  await advanceTime(provider, 7 * DAY + 1);
  await sendAndWait(staking.connect(founder).advanceEpoch({ gasLimit: 2_000_000 }), "advanceEpoch");

  await advanceTime(provider, DAY + 1);
  const smallEpoch2 = await staking.getPendingRewards(small.address);
  const largeEpoch2 = await staking.getPendingRewards(large.address);
  if (smallEpoch2 <= 0n || largeEpoch2 <= 0n) throw new Error("second epoch rewards should accrue for both stakers");
  if (largeEpoch2 <= smallEpoch2) throw new Error("larger stake should accrue more rewards in epoch2");

  console.log("TRACE_STAKING_TIER_EPOCH_SPLIT: PASS");
}

main().catch((err) => {
  console.error("TRACE_STAKING_TIER_EPOCH_SPLIT: FAIL");
  console.error(err);
  process.exit(1);
});
