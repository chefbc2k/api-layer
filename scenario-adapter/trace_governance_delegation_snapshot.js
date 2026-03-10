#!/usr/bin/env node
"use strict";

require("dotenv").config();
const { ethers } = require("ethers");
const {
  bootstrapActors,
  createProposal,
  deployGovernanceTarget,
  moveToActive
} = require("./lib/governance_helpers");
const { loadArtifact, sendAndWait } = require("./lib/access_helpers");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");

  const {
    founder,
    voter1,
    voter2,
    provider,
    founderAddress,
    proposal,
    votingPower,
    delegation,
    dummyArtifact,
    proposalArtifact
  } = await bootstrapActors(RPC_URL, DIAMOND_ADDRESS);
  const tokenArtifact = loadArtifact("out/TokenSupplyFacet.sol/TokenSupplyFacet.json");
  const token = new ethers.Contract(DIAMOND_ADDRESS, tokenArtifact.abi, founder);

  const founderBaseVotes = await delegation.getCurrentVotes(founderAddress);
  const futureBlock = (await provider.getBlockNumber()) + 100;
  let futureBlockFailed = false;
  try {
    await delegation.connect(voter1).getPriorVotes(await voter1.getAddress(), futureBlock);
  } catch {
    futureBlockFailed = true;
  }
  if (!futureBlockFailed) throw new Error("getPriorVotes should reject future block queries");

  await sendAndWait(
    delegation.connect(voter1).delegate(founderAddress, { gasLimit: 2_000_000 }),
    "delegation:delegate:voter1->founder"
  );
  const founderVotesAfterDelegation = await delegation.getCurrentVotes(founderAddress);
  if (founderVotesAfterDelegation <= founderBaseVotes) {
    throw new Error("founder current votes should increase after inbound delegation");
  }

  const dummy = await deployGovernanceTarget(founder, dummyArtifact, DIAMOND_ADDRESS);
  const proposalId = await createProposal(
    proposal,
    proposalArtifact,
    founder,
    [await dummy.getAddress()],
    [0n],
    [dummy.interface.encodeFunctionData("transferOwnership", [await voter2.getAddress()])],
    "delegation snapshot proposal",
    0
  );

  await moveToActive(provider, proposal, proposalId);

  const snapshotBlock = await proposal.proposalSnapshot(proposalId);
  const founderSnapshotVotes = await votingPower.getVotes(founderAddress, snapshotBlock);
  const voteCap = ((await token.totalSupply()) * 500n) / 10000n;
  const founderEffectiveSnapshotVotes = founderSnapshotVotes > voteCap ? voteCap : founderSnapshotVotes;

  await sendAndWait(
    delegation.connect(voter1).delegate(await voter2.getAddress(), { gasLimit: 2_000_000 }),
    "delegation:delegate:voter1->voter2"
  );
  const founderVotesAfterRedelegation = await delegation.getCurrentVotes(founderAddress);
  if (founderVotesAfterRedelegation >= founderVotesAfterDelegation) {
    throw new Error("founder current votes should drop after redelegation away");
  }

  const founderSnapshotVotesAfterRedelegation = await votingPower.getVotes(founderAddress, snapshotBlock);
  if (founderSnapshotVotesAfterRedelegation !== founderSnapshotVotes) {
    throw new Error("snapshot voting power should remain stable after post-snapshot delegation changes");
  }

  await sendAndWait(
    proposal.connect(founder).prCastVote(proposalId, 1, "snapshot-for", { gasLimit: 3_000_000 }),
    "proposal:vote:founder"
  );
  const founderReceipt = await proposal.getReceipt(proposalId, founderAddress);
  if (!founderReceipt.hasVoted) throw new Error("founder receipt should exist after vote");
  if (founderReceipt.votes !== founderEffectiveSnapshotVotes) {
    throw new Error("vote receipt should use capped snapshot voting power, not current voting power");
  }

  console.log("TRACE_GOVERNANCE_DELEGATION_SNAPSHOT: PASS");
}

main().catch((err) => {
  console.error("TRACE_GOVERNANCE_DELEGATION_SNAPSHOT: FAIL");
  console.error(err);
  process.exit(1);
});
