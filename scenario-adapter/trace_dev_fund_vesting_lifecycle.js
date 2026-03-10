#!/usr/bin/env node
"use strict";

const {
  MONTH,
  loadArtifact,
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

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const DEV_FUND_TYPE = 4;
const DEV_FUND_DURATION = 1825 * 24 * 60 * 60;
const DEV_FUND_SELLABLE_PERCENT = 100;

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const { provider, founder, access, token, vesting } = await setupCore(RPC_URL, DIAMOND_ADDRESS, PRIVATE_KEY);
  await ensureVestingRoles(access, founder);

  const beneficiary = randomWallet(provider);
  await fundEth(founder, [beneficiary]);

  const amount = 15_000n * 10n ** 10n;
  const tracked = [founder.address, beneficiary.address];
  const liquidBefore = await tokenBalanceSum(token, tracked);

  await sendAndWait(vesting.connect(founder).createDevFundVesting(beneficiary.address, amount), "createDevFundVesting");
  const created = await vesting.getVestingDetails(beneficiary.address);
  if (BigInt(created.vestingType) !== BigInt(DEV_FUND_TYPE)) throw new Error("dev fund vesting type mismatch");
  if (created.duration !== BigInt(DEV_FUND_DURATION)) throw new Error("dev fund duration mismatch");
  if (created.sellablePercentage !== BigInt(DEV_FUND_SELLABLE_PERCENT)) throw new Error("dev fund sellable percentage mismatch");
  if (!created.revocable) throw new Error("dev fund vesting should be revocable");
  const liquidAfterCreate = await tokenBalanceSum(token, tracked);
  if (liquidAfterCreate + remainingLocked(created) !== liquidBefore) {
    throw new Error("dev fund creation does not conserve liquid balances plus locked remainder");
  }

  await expectRevert(() => vesting.connect(beneficiary).releaseVestedTokens(), "releaseDevFund:immediate");

  await advanceTime(RPC_URL, MONTH * 4 + 1);
  const releasable = await vesting.getVestingReleasableAmount(beneficiary.address);
  if (releasable <= 0n) throw new Error("dev fund should have releasable amount after one quarter");

  await sendAndWait(vesting.connect(founder).releaseTokensFor(beneficiary.address, { gasLimit: 1_500_000 }), "releaseTokensFor:devFund");
  const released = await vesting.getVestingDetails(beneficiary.address);
  if (released.releasedAmount !== releasable) throw new Error("dev fund released amount mismatch");
  const liquidAfterRelease = await tokenBalanceSum(token, tracked);
  if (liquidAfterRelease + remainingLocked(released) !== liquidBefore) {
    throw new Error("dev fund release does not conserve liquid balances plus locked remainder");
  }

  await sendAndWait(vesting.connect(founder).revokeVestingSchedule(beneficiary.address, { gasLimit: 1_500_000 }), "revokeVestingSchedule:devFund");
  const revoked = await vesting.getVestingDetails(beneficiary.address);
  if (!revoked.revoked) throw new Error("dev fund vesting should be revoked");
  await expectRevert(() => vesting.connect(beneficiary).releaseVestedTokens({ gasLimit: 1_500_000 }), "releaseRevoked:devFund");

  console.log("TRACE_DEV_FUND_VESTING_LIFECYCLE: PASS");
}

main().catch((err) => {
  console.error("TRACE_DEV_FUND_VESTING_LIFECYCLE: FAIL");
  console.error(err);
  process.exit(1);
});
