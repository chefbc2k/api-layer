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
  expectRevert,
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

  const alice = await createUser(provider, founder);
  const bob = await createUser(provider, founder);

  const thresholds = [10_000n, 50_000n, 200_000n, 500_000n].map((v) => v * TOKEN_UNIT);
  const multipliers = [15_000n, 12_500n, 10_000n, 7_500n, 5_000n];

  try {
    await sendAndWait(
      staking.connect(founder).initStaking(DAY, DAY, 1000, thresholds, multipliers, { gasLimit: 4_000_000 }),
      "initStaking"
    );
  } catch (_) {}

  const degradedCap = 25_000n * TOKEN_UNIT;
  await forceDegradedMode(echo, staking, founder, provider, degradedCap);

  await sendAndWait(staking.connect(founder).queueTierConfigUpdate([5_000n * TOKEN_UNIT, 100_000n * TOKEN_UNIT], [20_000n, 10_000n, 5_000n], { gasLimit: 3_000_000 }), "queueTierConfigUpdate");
  const [queuedThresholds, queuedMultipliers] = await staking.getTierConfig();
  if (queuedThresholds.length !== 2 || queuedThresholds[0] !== 5_000n * TOKEN_UNIT) {
    throw new Error("tier config mutation did not apply after initialization");
  }
  if (queuedMultipliers[0] !== 20_000n) throw new Error("tier multiplier mutation did not apply");

  const tinyPool = 5n * TOKEN_UNIT;
  await sendAndWait(token.connect(founder).approve(DIAMOND_ADDRESS, tinyPool), "approve:tinyRewardPool");
  await sendAndWait(staking.connect(founder).fundRewardPool(tinyPool, { gasLimit: 2_500_000 }), "fundRewardPool:tiny");

  const capStake = degradedCap;
  const overflowStake = degradedCap + 1n;

  await transferAndApprove(token, founder, alice.wallet, alice.address, DIAMOND_ADDRESS, capStake, "aliceCapStake");
  await transferAndApprove(token, founder, bob.wallet, bob.address, DIAMOND_ADDRESS, overflowStake, "bobOverflowStake");

  await sendAndWait(staking.connect(alice.wallet).stake(capStake, { gasLimit: 3_000_000 }), "stake:alice:atCap");
  await expectRevert(
    () => staking.connect(bob.wallet).stake(overflowStake, { gasLimit: 3_000_000 }),
    "stake:bob:overCap"
  );

  await advanceTime(provider, DAY + 1);
  const pending = await staking.getPendingRewards(alice.address);
  if (pending <= 0n) throw new Error("capped staker should still accrue pending rewards");

  const balanceBefore = await token.tokenBalanceOf(alice.address);
  await sendAndWait(staking.connect(alice.wallet).claimRewards({ gasLimit: 3_000_000 }), "claimRewards:alice");
  const balanceAfter = await token.tokenBalanceOf(alice.address);
  const claimed = balanceAfter - balanceBefore;
  if (claimed <= 0n) throw new Error("claim should transfer some reward");
  if (claimed >= tinyPool) throw new Error("claim should not exceed available tiny reward pool");

  console.log("TRACE_STAKING_CAPS_EXHAUSTION_CONFIG: PASS");
}

main().catch((err) => {
  console.error("TRACE_STAKING_CAPS_EXHAUSTION_CONFIG: FAIL");
  console.error(err);
  process.exit(1);
});
