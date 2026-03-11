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
  transferAndApprove
} = require("./lib/staking_helpers");

const RPC_URL = process.env.RPC_URL;
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
  const network = await provider.getNetwork();
  if (network.chainId !== 31337n) {
    throw new Error("trace_staking_multi_staker_fairness is local-only on 31337; it uses evm_increaseTime/evm_mine and cannot prove Base Sepolia workflow parity yet");
  }

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

  await forceDegradedMode(echo, staking, founder, provider, 500_000n * TOKEN_UNIT);

  const rewardFundAmount = 2_000_000n * TOKEN_UNIT;
  await sendAndWait(token.connect(founder).approve(DIAMOND_ADDRESS, rewardFundAmount), "approve:rewardPool");
  await sendAndWait(staking.connect(founder).fundRewardPool(rewardFundAmount, { gasLimit: 2_500_000 }), "fundRewardPool");

  const aliceStake = 20_000n * TOKEN_UNIT;
  const bobStake = 20_000n * TOKEN_UNIT;

  await transferAndApprove(token, founder, alice.wallet, alice.address, DIAMOND_ADDRESS, aliceStake, "aliceStake");
  await transferAndApprove(token, founder, bob.wallet, bob.address, DIAMOND_ADDRESS, bobStake, "bobStake");

  await sendAndWait(staking.connect(alice.wallet).stake(aliceStake, { gasLimit: 3_000_000 }), "stake:alice");
  await sendAndWait(staking.connect(bob.wallet).stake(bobStake, { gasLimit: 3_000_000 }), "stake:bob");

  await provider.send("evm_increaseTime", [DAY + 1]);
  await provider.send("evm_mine", []);

  const alicePending = await staking.getPendingRewards(alice.address);
  const bobPending = await staking.getPendingRewards(bob.address);

  if (alicePending <= 0n || bobPending <= 0n) {
    throw new Error("both stakers should have pending rewards");
  }

  const diff = alicePending > bobPending ? alicePending - bobPending : bobPending - alicePending;
  if (diff > 1n) {
    throw new Error(`equal stake fairness mismatch: alice=${alicePending} bob=${bobPending}`);
  }

  const aliceBefore = await token.tokenBalanceOf(alice.address);
  const bobBefore = await token.tokenBalanceOf(bob.address);
  await sendAndWait(staking.connect(alice.wallet).claimRewards({ gasLimit: 3_000_000 }), "claimRewards:alice");
  await sendAndWait(staking.connect(bob.wallet).claimRewards({ gasLimit: 3_000_000 }), "claimRewards:bob");
  const aliceAfter = await token.tokenBalanceOf(alice.address);
  const bobAfter = await token.tokenBalanceOf(bob.address);

  const aliceClaimed = aliceAfter - aliceBefore;
  const bobClaimed = bobAfter - bobBefore;
  const claimDiff = aliceClaimed > bobClaimed ? aliceClaimed - bobClaimed : bobClaimed - aliceClaimed;
  if (claimDiff > 1n) {
    throw new Error(`equal stake claim mismatch: alice=${aliceClaimed} bob=${bobClaimed}`);
  }

  console.log("TRACE_STAKING_MULTI_STAKER_FAIRNESS: PASS");
}

main().catch((err) => {
  console.error("TRACE_STAKING_MULTI_STAKER_FAIRNESS: FAIL");
  console.error(err);
  process.exit(1);
});
