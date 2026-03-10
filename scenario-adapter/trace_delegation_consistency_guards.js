#!/usr/bin/env node
"use strict";

require("dotenv").config();
const { bootstrapGovernance } = require("./bootstrap_local_governance");
const { walletAt } = require("./lib/governance_helpers");
const { expectRevert, sendAndWait } = require("./lib/access_helpers");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";

async function main() {
  const { provider, emergency, token, delegation, votingPower } = await bootstrapGovernance(RPC_URL);
  const voter1 = walletAt(provider, 1);
  const voter2 = walletAt(provider, 2);
  const voter1Address = await voter1.getAddress();
  const voter2Address = await voter2.getAddress();

  const delegationAmount = 1_000n * 10n ** 10n;
  await sendAndWait(token.transfer(voter1Address, delegationAmount), "tokenTransfer:voter1");
  await sendAndWait(token.transfer(voter2Address, delegationAmount), "tokenTransfer:voter2");

  await sendAndWait(
    votingPower.setupInitialVotingPower(voter1Address, delegationAmount, { gasLimit: 1_500_000 }),
    "setupInitialVotingPower:voter1"
  );
  await sendAndWait(
    votingPower.setupInitialVotingPower(voter2Address, delegationAmount, { gasLimit: 1_500_000 }),
    "setupInitialVotingPower:voter2"
  );

  const selfVotesBefore = await delegation.getCurrentVotes(voter1Address);
  await expectRevert(
    () => delegation.connect(voter1).delegate.staticCall(voter1Address, { gasLimit: 2_000_000 }),
    "delegate:self"
  );
  if ((await delegation.getCurrentVotes(voter1Address)) !== selfVotesBefore) {
    throw new Error("self-delegation attempt should not change votes");
  }

  await sendAndWait(
    delegation.connect(voter1).delegate(voter2Address, { gasLimit: 2_000_000 }),
    "delegate:voter1->voter2"
  );

  const delegatedBefore = await delegation.getDelegatedVotingPower(voter2Address);
  await sendAndWait(
    votingPower.updateVotingPower(voter1Address, { gasLimit: 2_000_000 }),
    "updateVotingPower:voter1"
  );
  await sendAndWait(
    delegation.updateDelegatedVotingPower(voter2Address, { gasLimit: 2_000_000 }),
    "updateDelegatedVotingPower:voter2"
  );
  const delegatedAfter = await delegation.getDelegatedVotingPower(voter2Address);
  if (delegatedAfter !== delegatedBefore) {
    throw new Error(`delegated power drifted unexpectedly: ${delegatedBefore} -> ${delegatedAfter}`);
  }

  await expectRevert(
    () => delegation.updateDelegatedVotingPowerBatch.staticCall([], { gasLimit: 2_000_000 }),
    "updateDelegatedVotingPowerBatch:empty"
  );

  await sendAndWait(emergency.emergencyStop({ gasLimit: 2_000_000 }), "emergencyStop");
  await expectRevert(
    () => delegation.connect(voter1).delegate.staticCall(voter2Address, { gasLimit: 2_000_000 }),
    "delegate:paused"
  );

  console.log("TRACE_DELEGATION_CONSISTENCY_GUARDS: PASS");
}

main().catch((err) => {
  console.error("TRACE_DELEGATION_CONSISTENCY_GUARDS: FAIL");
  console.error(err);
  process.exit(1);
});
