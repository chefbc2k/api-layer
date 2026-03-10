#!/usr/bin/env node
"use strict";

require("dotenv").config();
const { bootstrapGovernance } = require("./bootstrap_local_governance");
const { walletAt } = require("./lib/governance_helpers");
const { sendAndWait } = require("./lib/access_helpers");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";

async function main() {
  const { provider, founder, founderAddress, delegation, votingPower } = await bootstrapGovernance(RPC_URL);
  const voter1 = walletAt(provider, 1);
  const voter2 = walletAt(provider, 2);

  const founderVotes = await votingPower.getVotingPower(founderAddress);
  await sendAndWait(
    votingPower.setupInitialVotingPower(await voter1.getAddress(), founderVotes, { gasLimit: 1_500_000 }),
    "setupInitialVotingPower:voter1"
  );
  await sendAndWait(
    votingPower.setupInitialVotingPower(await voter2.getAddress(), founderVotes, { gasLimit: 1_500_000 }),
    "setupInitialVotingPower:voter2"
  );

  const founderVotesBefore = await delegation.getCurrentVotes(founderAddress);
  const priorBlock = BigInt(await provider.getBlockNumber());

  await sendAndWait(
    delegation.connect(voter1).delegate(founderAddress, { gasLimit: 2_000_000 }),
    "delegate:voter1->founder"
  );

  if ((await delegation.delegates(await voter1.getAddress())) !== founderAddress) {
    throw new Error("delegates(voter1) should point to founder");
  }

  const voter1Votes = await votingPower.getVotingPower(await voter1.getAddress());
  const founderDelegated = await delegation.getDelegatedVotingPower(founderAddress);
  if (founderDelegated !== voter1Votes) {
    throw new Error(`delegated voting power mismatch: ${founderDelegated} != ${voter1Votes}`);
  }

  const founderVotesAfter = await delegation.getCurrentVotes(founderAddress);
  if (founderVotesAfter !== founderVotesBefore + voter1Votes) {
    throw new Error(`founder current votes mismatch: ${founderVotesAfter}`);
  }

  const founderPriorVotes = await delegation.getPriorVotes(founderAddress, priorBlock);
  if (founderPriorVotes !== founderVotesBefore) {
    throw new Error(`prior votes should remain pre-delegation: ${founderPriorVotes} != ${founderVotesBefore}`);
  }

  await sendAndWait(
    delegation.connect(voter1).delegate(await voter2.getAddress(), { gasLimit: 2_000_000 }),
    "delegate:voter1->voter2"
  );

  const founderDelegatedAfter = await delegation.getDelegatedVotingPower(founderAddress);
  const voter2DelegatedAfter = await delegation.getDelegatedVotingPower(await voter2.getAddress());
  if (founderDelegatedAfter !== 0n) throw new Error(`founder delegated power should clear: ${founderDelegatedAfter}`);
  if (voter2DelegatedAfter !== voter1Votes) {
    throw new Error(`voter2 delegated power mismatch: ${voter2DelegatedAfter} != ${voter1Votes}`);
  }

  const founderTotal = await delegation.getTotalVotingPower(founderAddress);
  const founderCurrent = await delegation.getCurrentVotes(founderAddress);
  if (founderTotal !== founderCurrent) {
    throw new Error(`founder total voting power should match current votes after redelegation: ${founderTotal} != ${founderCurrent}`);
  }

  console.log("TRACE_DELEGATION_LIFECYCLE: PASS");
}

main().catch((err) => {
  console.error("TRACE_DELEGATION_LIFECYCLE: FAIL");
  console.error(err);
  process.exit(1);
});
