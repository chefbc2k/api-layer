#!/usr/bin/env node
"use strict";

const { bootstrapGovernance } = require("./bootstrap_local_governance");
const { walletAt } = require("./lib/governance_helpers");
const { sendAndWait } = require("./lib/access_helpers");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const TOKEN_UNIT = 10n ** 10n;
const TRANSFER_AMOUNT = 1_000n * TOKEN_UNIT;
const YEAR = 365n * 24n * 60n * 60n;

async function main() {
  const { provider, founder, token, votingPower } = await bootstrapGovernance(RPC_URL, {
    votingPowerInit: {
      useTimeWeight: true,
      maxTimeBonus: 5_000n
    }
  });
  const voter1 = walletAt(provider, 1);
  const voter1Address = await voter1.getAddress();

  await sendAndWait(token.connect(founder).transfer(voter1Address, TRANSFER_AMOUNT, { gasLimit: 1_500_000 }), "token:transfer:voter1");
  await sendAndWait(votingPower.connect(founder).setupInitialVotingPower(voter1Address, TRANSFER_AMOUNT, { gasLimit: 1_500_000 }), "votingPower:setupInitial:voter1");

  const baseVotes = await votingPower.getVotingPower(voter1Address);
  if (baseVotes !== TRANSFER_AMOUNT) throw new Error("base voting power should start at transferred amount");

  await sendAndWait(votingPower.connect(voter1).updateLockDuration(voter1Address, YEAR, { gasLimit: 1_500_000 }), "votingPower:updateLock:year");
  const afterLockVotes = await votingPower.getVotingPower(voter1Address);
  if (afterLockVotes <= baseVotes) {
    throw new Error("logic issue: time-weighted lock did not increase voting power after lock update");
  }

  await sendAndWait(votingPower.connect(voter1).setZeroLockDuration(voter1Address, { gasLimit: 1_500_000 }), "votingPower:setZeroLock");
  const afterZeroLockVotes = await votingPower.getVotingPower(voter1Address);
  if (afterZeroLockVotes !== baseVotes) {
    throw new Error("zero lock duration should restore voting power to base amount");
  }

  console.log("TRACE_VOTING_POWER_BONUS_MODES: PASS");
}

main().catch((err) => {
  console.error("TRACE_VOTING_POWER_BONUS_MODES: FAIL");
  console.error(err);
  process.exit(1);
});
