#!/usr/bin/env node
"use strict";

const { ethers } = require("ethers");
const { bootstrapGovernance } = require("./bootstrap_local_governance");
const { walletAt } = require("./lib/governance_helpers");
const { sendAndWait, expectRevert } = require("./lib/access_helpers");

const RPC_URL = process.env.RPC_URL;
const TOKEN_UNIT = 10n ** 10n;
const TRANSFER_AMOUNT = 1_000n * TOKEN_UNIT;
const EXTRA_AMOUNT = 500n * TOKEN_UNIT;
const LOCK_DURATION = 30n * 24n * 60n * 60n;

async function main() {
  const { provider, founder, founderAddress, token, votingPower } = await bootstrapGovernance(RPC_URL);
  const voter1 = walletAt(provider, 1);
  const voter2 = walletAt(provider, 2);
  const voter1Address = await voter1.getAddress();

  await sendAndWait(token.connect(founder).transfer(voter1Address, TRANSFER_AMOUNT, { gasLimit: 1_500_000 }), "token:transfer:voter1:initial");
  await sendAndWait(votingPower.connect(founder).setupInitialVotingPower(voter1Address, TRANSFER_AMOUNT, { gasLimit: 1_500_000 }), "votingPower:setupInitial:voter1");

  const latestInitial = await votingPower.getLatestCheckpoint(voter1Address);
  if (latestInitial[1] !== TRANSFER_AMOUNT) throw new Error("initial checkpoint votes should match seeded voting power");
  const initialBlock = latestInitial[0];

  await sendAndWait(token.connect(founder).transfer(voter1Address, EXTRA_AMOUNT, { gasLimit: 1_500_000 }), "token:transfer:voter1:extra");
  await sendAndWait(votingPower.connect(founder).updateVotingPower(voter1Address, { gasLimit: 1_500_000 }), "votingPower:update:voter1");

  const expectedCurrentVotes = TRANSFER_AMOUNT + EXTRA_AMOUNT;
  if ((await votingPower.getVotingPower(voter1Address)) !== expectedCurrentVotes) {
    throw new Error("updated voting power should match current token balance at 1x multiplier");
  }
  if ((await votingPower.getVotes(voter1Address, initialBlock)) !== TRANSFER_AMOUNT) {
    throw new Error("past votes at initial checkpoint block should remain stable");
  }

  await sendAndWait(votingPower.connect(voter1).updateLockDuration(voter1Address, LOCK_DURATION, { gasLimit: 1_500_000 }), "votingPower:updateLock:self");
  if ((await votingPower.getLockDuration(voter1Address)) !== LOCK_DURATION) throw new Error("lock duration should update");
  if ((await votingPower.getLockTimestamp(voter1Address)) === 0n) throw new Error("lock timestamp should be recorded");

  await expectRevert(
    votingPower.connect(voter2).updateLockDuration(voter1Address, LOCK_DURATION, { gasLimit: 1_500_000 }),
    "votingPower:updateLock:unauthorized"
  );

  await sendAndWait(votingPower.connect(voter1).setZeroLockDuration(voter1Address, { gasLimit: 1_500_000 }), "votingPower:setZeroLock:self");
  if ((await votingPower.getLockDuration(voter1Address)) !== 0n) throw new Error("zero lock duration should clear lock");

  console.log(`TRACE_VOTING_POWER_LIFECYCLE: PASS founder=${founderAddress}`);
}

main().catch((err) => {
  console.error("TRACE_VOTING_POWER_LIFECYCLE: FAIL");
  console.error(err);
  process.exit(1);
});
