#!/usr/bin/env node
"use strict";

require("dotenv").config();
const { ethers } = require("ethers");
const { bootstrapGovernance } = require("./bootstrap_local_governance");
const {
  createProposal,
  moveToActive,
  movePastDeadline,
  passStandardProposal,
  walletAt
} = require("./lib/governance_helpers");
const { expectRevert, sendAndWait } = require("./lib/access_helpers");

const RPC_URL = process.env.RPC_URL;

async function main() {
  const {
    provider,
    founder,
    founderAddress,
    diamondAddress,
    governor,
    proposal,
    timelock,
    votingPower,
    artifacts
  } = await bootstrapGovernance(RPC_URL);

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

  const proposalArtifact = artifacts.proposalArtifact;

  const iface = new ethers.Interface(governor.interface.fragments);

  const badCalls = [
    ["delay too low", iface.encodeFunctionData("updateVotingDelay", [100n])],
    ["delay too high", iface.encodeFunctionData("updateVotingDelay", [10_000_001n])],
    ["period too low", iface.encodeFunctionData("updateVotingPeriod", [100n])],
    ["period too high", iface.encodeFunctionData("updateVotingPeriod", [1000001n])],
    ["threshold zero", iface.encodeFunctionData("updateProposalThreshold", [0n])],
    ["quorum too low", iface.encodeFunctionData("updateQuorumNumerator", [1499n])],
    ["quorum too high", iface.encodeFunctionData("updateQuorumNumerator", [5001n])],
    ["default gas zero", iface.encodeFunctionData("setDefaultGasLimit", [0n])],
    ["trusted target zero", iface.encodeFunctionData("setTrustedTarget", [ethers.ZeroAddress, true, 1n])]
  ];

  for (const [label, calldata] of badCalls) {
    const proposalId = await createProposal(
      proposal,
      proposalArtifact,
      founder,
      [diamondAddress],
      [0n],
      [calldata],
      `governor boundary ${label}`,
      0
    );

    await moveToActive(provider, proposal, proposalId);
    await passStandardProposal(proposal, proposalId, founder, voter1, voter2);
    await movePastDeadline(provider, proposal, proposalId);
    await sendAndWait(proposal.connect(founder).prQueue(proposalId, { gasLimit: 5_000_000 }), `${label}:queue`);
    const delay = await timelock.getMinDelay();
    await provider.send("evm_increaseTime", [Number(delay) + 301]);
    await provider.send("evm_mine", []);
    await expectRevert(
      () => proposal.connect(founder).prExecute.staticCall(proposalId, { gasLimit: 8_000_000 }),
      `${label}:execute`
    );
  }

  console.log("TRACE_GOVERNOR_BOUNDARY_GUARDS: PASS");
}

main().catch((err) => {
  console.error("TRACE_GOVERNOR_BOUNDARY_GUARDS: FAIL");
  console.error(err);
  process.exit(1);
});
