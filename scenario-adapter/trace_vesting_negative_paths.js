#!/usr/bin/env node
"use strict";

const {
  sendAndWait,
  expectRevert,
  advanceTime,
  setupCore,
  ensureVestingRoles,
  randomWallet,
  fundEth
} = require("./lib/vesting_helpers");
const { ethers } = require("ethers");
require("dotenv").config();

const RPC_URL = process.env.RPC_URL;
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const EXECUTIVE_TYPE = 2;
const FOUNDER_CLIFF = 180 * 24 * 60 * 60;

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const { provider, founder, access, vesting } = await setupCore(RPC_URL, DIAMOND_ADDRESS, PRIVATE_KEY);
  await ensureVestingRoles(access, founder);

  const outsider = randomWallet(provider);
  const beneficiary = randomWallet(provider);
  const nextBeneficiary = randomWallet(provider);
  await fundEth(founder, [outsider, beneficiary, nextBeneficiary]);

  const founderAmount = 9_000n * 10n ** 10n;
  const execAmount = 7_000n * 10n ** 10n;

  await expectRevert(() => vesting.connect(outsider).createFounderVesting(beneficiary.address, 1n), "unauthorized:createFounderVesting");
  await expectRevert(() => vesting.connect(founder).createFounderVesting(ethers.ZeroAddress, founderAmount), "invalid:createFounderVesting:zeroBeneficiary");
  await expectRevert(() => vesting.connect(founder).createFounderVesting(beneficiary.address, 0n), "invalid:createFounderVesting:zeroAmount");

  await sendAndWait(vesting.connect(founder).createFounderVesting(beneficiary.address, founderAmount), "createFounderVesting:negativePack");
  await expectRevert(() => vesting.connect(founder).createFounderVesting(beneficiary.address, 1n), "duplicate:createFounderVesting");
  await expectRevert(() => vesting.connect(beneficiary).releaseVestedTokens(), "releaseFounder:beforeCliff");
  await advanceTime(RPC_URL, FOUNDER_CLIFF + 1);
  await expectRevert(() => vesting.connect(founder).revokeVestingSchedule(beneficiary.address), "revokeFounder:nonrevocable");
  await expectRevert(() => vesting.connect(beneficiary).transferVestingSchedule(ethers.ZeroAddress), "transferFounder:zeroBeneficiary");

  await sendAndWait(vesting.connect(founder).createTeamVesting(nextBeneficiary.address, execAmount, EXECUTIVE_TYPE), "createTeamVesting:negativePack");
  await expectRevert(() => vesting.connect(founder).createTeamVesting(nextBeneficiary.address, 1n, EXECUTIVE_TYPE), "duplicate:createTeamVesting");
  await expectRevert(() => vesting.connect(founder).createTeamVesting(outsider.address, 1n, 0), "invalid:createTeamVesting:type");
  await expectRevert(() => vesting.connect(outsider).releaseTokensFor(nextBeneficiary.address), "unauthorized:releaseTokensFor");

  await sendAndWait(vesting.connect(founder).revokeVestingSchedule(nextBeneficiary.address, { gasLimit: 1_500_000 }), "revokeVestingSchedule:negativePack");
  await expectRevert(() => vesting.connect(founder).revokeVestingSchedule(nextBeneficiary.address), "revokeVestingSchedule:alreadyRevoked");
  await expectRevert(() => vesting.connect(nextBeneficiary).transferVestingSchedule(beneficiary.address), "transferRevokedSchedule");
  await expectRevert(() => vesting.connect(nextBeneficiary).releaseVestedTokens({ gasLimit: 1_500_000 }), "releaseRevokedSchedule");

  console.log("TRACE_VESTING_NEGATIVE_PATHS: PASS");
}

main().catch((err) => {
  console.error("TRACE_VESTING_NEGATIVE_PATHS: FAIL");
  console.error(err);
  process.exit(1);
});
