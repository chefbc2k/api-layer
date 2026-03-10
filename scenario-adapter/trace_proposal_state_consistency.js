#!/usr/bin/env node
"use strict";

const { ethers } = require("ethers");
const { bootstrapGovernance } = require("./bootstrap_local_governance");
const {
  walletAt,
  createProposal,
  moveToActive,
  movePastDeadline,
  passStandardProposal
} = require("./lib/governance_helpers");
const { loadArtifact, sendAndWait } = require("./lib/access_helpers");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";

async function main() {
  const { provider, founder, founderAddress, diamondAddress, proposal, timelock, votingPower } =
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
    "proposal state consistency"
  );

  const pendingA = await proposal.prState(proposalId);
  const pendingB = await proposal.state(proposalId);
  if (pendingA !== 0n || pendingB !== 0n) {
    throw new Error(`proposal should be pending initially: prState=${pendingA} state=${pendingB}`);
  }

  await moveToActive(provider, proposal, proposalId);
  const activeA = await proposal.prState(proposalId);
  const activeB = await proposal.state(proposalId);
  if (activeA !== 1n || activeB !== 1n) {
    throw new Error(`proposal should be active: prState=${activeA} state=${activeB}`);
  }

  await passStandardProposal(proposal, proposalId, founder, voter1, voter2);
  await movePastDeadline(provider, proposal, proposalId);

  const succeededA = await proposal.prState(proposalId);
  const succeededB = await proposal.state(proposalId);
  if (succeededA !== 4n || succeededB !== 4n) {
    throw new Error(`proposal should be succeeded: prState=${succeededA} state=${succeededB}`);
  }

  await sendAndWait(proposal.connect(founder).prQueue(proposalId, { gasLimit: 5_000_000 }), "proposal:queue");

  const queuedA = await proposal.prState(proposalId);
  const queuedB = await proposal.state(proposalId);
  if (queuedA !== 5n || queuedB !== 5n) {
    throw new Error(`logic issue: queued proposal state mismatch prState=${queuedA} state=${queuedB}`);
  }

  const delay = await timelock.getMinDelay();
  await provider.send("evm_increaseTime", [Number(delay) + 301]);
  await provider.send("evm_mine", []);

  await sendAndWait(proposal.connect(founder).prExecute(proposalId, { gasLimit: 8_000_000 }), "proposal:execute");

  const executedA = await proposal.prState(proposalId);
  const executedB = await proposal.state(proposalId);
  if (executedA !== 7n || executedB !== 7n) {
    throw new Error(`proposal should be executed: prState=${executedA} state=${executedB}`);
  }

  console.log("TRACE_PROPOSAL_STATE_CONSISTENCY: PASS");
}

main().catch((err) => {
  console.error("TRACE_PROPOSAL_STATE_CONSISTENCY: FAIL");
  console.error(err);
  process.exit(1);
});
