#!/usr/bin/env node
"use strict";

const {
  MONTH,
  sendAndWait,
  expectRevert,
  advanceTime,
  setupCore,
  ensureVestingRoles,
  randomWallet,
  fundEth,
  remainingLocked,
  tokenBalanceSum
} = require("./lib/vesting_helpers");
require("dotenv").config();

const RPC_URL = process.env.RPC_URL;
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CEX_TYPE = 6;
const CEX_DURATION = 1920 * 24 * 60 * 60;
const CEX_SELLABLE = 6500;

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const { provider, founder, access, token, vesting } = await setupCore(RPC_URL, DIAMOND_ADDRESS, PRIVATE_KEY);
  await ensureVestingRoles(access, founder);

  const beneficiary = randomWallet(provider);
  const successor = randomWallet(provider);
  await fundEth(founder, [beneficiary, successor]);

  const amount = 25_000n * 10n ** 10n;
  const tracked = [founder.address, beneficiary.address, successor.address];
  const liquidBefore = await tokenBalanceSum(token, tracked);

  await sendAndWait(vesting.connect(founder).createCexVesting(beneficiary.address, amount), "createCexVesting");
  const created = await vesting.getVestingDetails(beneficiary.address);
  if (BigInt(created.vestingType) !== BigInt(CEX_TYPE)) throw new Error("cex vesting type mismatch");
  if (created.duration !== BigInt(CEX_DURATION)) throw new Error("cex duration mismatch");
  if (created.cliff !== 0n) throw new Error("cex cliff should be zero");
  if (created.revocable) throw new Error("cex vesting should be non-revocable");
  if (created.sellablePercentage !== BigInt(CEX_SELLABLE)) throw new Error("cex sellable percentage mismatch");
  const liquidAfterCreate = await tokenBalanceSum(token, tracked);
  if (liquidAfterCreate + remainingLocked(created) !== liquidBefore) {
    throw new Error("cex creation does not conserve liquid balances plus locked remainder");
  }

  await advanceTime(RPC_URL, MONTH * 2 + 1);
  const releasable = await vesting.getVestingReleasableAmount(beneficiary.address);
  if (releasable <= 0n) throw new Error("cex vesting should have releasable amount after time advance");

  await sendAndWait(vesting.connect(beneficiary).transferVestingSchedule(successor.address, { gasLimit: 1_500_000 }), "transferVestingSchedule:cex");
  const moved = await vesting.getVestingDetails(successor.address);
  if (moved.releasedAmount !== 0n) throw new Error("cex released amount should remain zero before first release");

  await sendAndWait(vesting.connect(successor).releaseVestedTokens({ gasLimit: 1_500_000 }), "releaseVestedTokens:cex");
  const released = await vesting.getVestingDetails(successor.address);
  const liquidAfterRelease = await tokenBalanceSum(token, tracked);
  if (liquidAfterRelease + remainingLocked(released) !== liquidBefore) {
    throw new Error("cex transfer/release does not conserve liquid balances plus locked remainder");
  }

  await expectRevert(() => vesting.connect(founder).revokeVestingSchedule(successor.address), "revokeCex:nonrevocable");

  console.log("TRACE_CEX_VESTING_LIFECYCLE: PASS");
}

main().catch((err) => {
  console.error("TRACE_CEX_VESTING_LIFECYCLE: FAIL");
  console.error(err);
  process.exit(1);
});
