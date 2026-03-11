#!/usr/bin/env node
"use strict";

const { ethers } = require("ethers");
const { bootstrapGovernance } = require("./bootstrap_local_governance");
const {
  walletAt,
  createProposal,
  moveToActive
} = require("./lib/governance_helpers");
const { loadArtifact, sendAndWait, expectRevert } = require("./lib/access_helpers");

const RPC_URL = process.env.RPC_URL;

async function main() {
  const { provider, founder, founderAddress, diamondAddress, proposal, votingPower, token } =
    await bootstrapGovernance(RPC_URL);

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

  const dummyArtifact = loadArtifact("out/DummyContract.sol/DummyContract.json");
  const target = await new ethers.ContractFactory(dummyArtifact.abi, dummyArtifact.bytecode.object, founder).deploy();
  await target.waitForDeployment();
  await sendAndWait(
    target.transferOwnership(diamondAddress, { gasLimit: 500_000 }),
    "dummy:transferOwnershipToDiamond"
  );

  const proposalId = await createProposal(
    proposal,
    loadArtifact("out/ProposalFacet.sol/ProposalFacet.json"),
    founder,
    [await target.getAddress()],
    [0n],
    [target.interface.encodeFunctionData("transferOwnership", [await voter1.getAddress()])],
    "proposal vote receipt integrity"
  );

  await moveToActive(provider, proposal, proposalId);

  const totalSupply = await token.totalSupply();
  const expectedCap = (totalSupply * 500n) / 10000n;

  const founderCast = await proposal.connect(founder).prCastVote.staticCall(proposalId, 1, "founder for");
  if (founderCast !== expectedCap) {
    throw new Error(`capped founder vote mismatch: got ${founderCast} expected ${expectedCap}`);
  }
  await sendAndWait(
    proposal.connect(founder).prCastVote(proposalId, 1, "founder for", { gasLimit: 3_000_000 }),
    "proposal:castVote:founder"
  );

  const founderReceipt = await proposal.getReceipt(proposalId, founderAddress);
  if (!founderReceipt.hasVoted || founderReceipt.support !== 1n || founderReceipt.votes !== expectedCap) {
    throw new Error("founder receipt mismatch after vote");
  }

  await expectRevert(
    () => proposal.connect(founder).prCastVote.staticCall(proposalId, 1, "duplicate"),
    "proposal:duplicateVote"
  );

  await sendAndWait(
    proposal.connect(voter1).prCastVote(proposalId, 0, "against", { gasLimit: 3_000_000 }),
    "proposal:castVote:voter1"
  );
  await sendAndWait(
    proposal.connect(voter2).prCastVote(proposalId, 2, "abstain", { gasLimit: 3_000_000 }),
    "proposal:castVote:voter2"
  );

  const votes = await proposal.proposalVotes(proposalId);
  if (votes.forVotes !== expectedCap) {
    throw new Error(`forVotes mismatch: ${votes.forVotes}`);
  }
  if (votes.againstVotes !== expectedCap) {
    throw new Error(`againstVotes mismatch: ${votes.againstVotes}`);
  }
  if (votes.abstainVotes !== expectedCap) {
    throw new Error(`abstainVotes mismatch: ${votes.abstainVotes}`);
  }

  const proposerProposals = await proposal.getProposerProposals(founderAddress);
  if (!proposerProposals.some((id) => id === proposalId)) {
    throw new Error("proposer proposal index should contain new proposal");
  }

  const active = await proposal.getActiveProposals();
  if (!active.some((item) => item.id === proposalId)) {
    throw new Error("active proposal list should include current active proposal");
  }

  console.log("TRACE_PROPOSAL_VOTE_RECEIPTS: PASS");
}

main().catch((err) => {
  console.error("TRACE_PROPOSAL_VOTE_RECEIPTS: FAIL");
  console.error(err);
  process.exit(1);
});
