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
const PUBLIC_TYPE = 5;
const PUBLIC_DURATION = 1920 * 24 * 60 * 60;
const PUBLIC_TGE_UNLOCK = 1500;
const PUBLIC_SELLABLE = 6500;

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const { provider, founder, access, token, vesting } = await setupCore(RPC_URL, DIAMOND_ADDRESS, PRIVATE_KEY);
  await ensureVestingRoles(access, founder);

  const beneficiary = randomWallet(provider);
  await fundEth(founder, [beneficiary]);

  const amount = 20_000n * 10n ** 10n;
  const tracked = [founder.address, beneficiary.address];
  const liquidBefore = await tokenBalanceSum(token, tracked);

  await sendAndWait(vesting.connect(founder).createPublicVesting(beneficiary.address, amount), "createPublicVesting");
  const created = await vesting.getVestingDetails(beneficiary.address);
  if (BigInt(created.vestingType) !== BigInt(PUBLIC_TYPE)) throw new Error("public vesting type mismatch");
  if (created.duration !== BigInt(PUBLIC_DURATION)) throw new Error("public duration mismatch");
  if (created.cliff !== 0n) throw new Error("public cliff should be zero");
  if (created.revocable) throw new Error("public vesting should be non-revocable");
  if (created.sellablePercentage !== BigInt(PUBLIC_SELLABLE)) throw new Error("public sellable percentage mismatch");
  const liquidAfterCreate = await tokenBalanceSum(token, tracked);
  if (liquidAfterCreate + remainingLocked(created) !== liquidBefore) {
    throw new Error("public creation does not conserve liquid balances plus locked remainder");
  }

  const immediateReleasable = await vesting.getVestingReleasableAmount(beneficiary.address);
  if (immediateReleasable !== 0n) throw new Error("public vesting should start with zero immediate releasable on same block");

  await advanceTime(RPC_URL, MONTH + 1);
  const releasable = await vesting.getVestingReleasableAmount(beneficiary.address);
  if (releasable <= 0n) throw new Error("public vesting should have releasable amount after time advance");

  await sendAndWait(vesting.connect(beneficiary).releaseVestedTokens({ gasLimit: 1_500_000 }), "releaseVestedTokens:public");
  const released = await vesting.getVestingDetails(beneficiary.address);
  const liquidAfterRelease = await tokenBalanceSum(token, tracked);
  if (liquidAfterRelease + remainingLocked(released) !== liquidBefore) {
    throw new Error("public release does not conserve liquid balances plus locked remainder");
  }

  await expectRevert(() => vesting.connect(founder).revokeVestingSchedule(beneficiary.address), "revokePublic:nonrevocable");

  console.log("TRACE_PUBLIC_VESTING_LIFECYCLE: PASS");
}

main().catch((err) => {
  console.error("TRACE_PUBLIC_VESTING_LIFECYCLE: FAIL");
  console.error(err);
  process.exit(1);
});
