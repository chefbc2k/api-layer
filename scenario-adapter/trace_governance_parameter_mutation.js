#!/usr/bin/env node
"use strict";

require("dotenv").config();
const { ethers } = require("ethers");
const {
  TOKEN_UNIT,
  bootstrapActors,
  createProposal,
  moveToActive,
  movePastDeadline,
  passStandardProposal,
  queueAndExecute,
  expectRevert
} = require("./lib/governance_helpers");

const RPC_URL = process.env.RPC_URL;
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");

  const {
    founder,
    voter1,
    voter2,
    governor,
    proposal,
    timelock,
    proposalArtifact
  } = await bootstrapActors(RPC_URL, DIAMOND_ADDRESS);

  await expectRevert(
    () => governor.connect(founder).updateVotingDelay(6000n, { gasLimit: 1_000_000 }),
    "governor:updateVotingDelay:direct"
  );
  await expectRevert(
    () => governor.connect(founder).updateVotingPeriod(600n, { gasLimit: 1_000_000 }),
    "governor:updateVotingPeriod:direct"
  );
  await expectRevert(
    () => governor.connect(founder).updateProposalThreshold(200n * TOKEN_UNIT, { gasLimit: 1_000_000 }),
    "governor:updateProposalThreshold:direct"
  );
  await expectRevert(
    () => governor.connect(founder).updateQuorumNumerator(2000n, { gasLimit: 1_000_000 }),
    "governor:updateQuorumNumerator:direct"
  );
  await expectRevert(
    () => governor.connect(founder).setDefaultGasLimit(4_000_000n, { gasLimit: 1_000_000 }),
    "governor:setDefaultGasLimit:direct"
  );

  const iface = new ethers.Interface(governor.interface.fragments);
  const proposalId = await createProposal(
    proposal,
    proposalArtifact,
    founder,
    [DIAMOND_ADDRESS, DIAMOND_ADDRESS, DIAMOND_ADDRESS, DIAMOND_ADDRESS],
    [0n, 0n, 0n, 0n],
    [
      iface.encodeFunctionData("updateVotingDelay", [6000n]),
      iface.encodeFunctionData("updateVotingPeriod", [600n]),
      iface.encodeFunctionData("updateProposalThreshold", [200n * TOKEN_UNIT]),
      iface.encodeFunctionData("updateQuorumNumerator", [2000n])
    ],
    "governance only parameter mutation",
    0
  );

  await moveToActive(governor.runner.provider, proposal, proposalId);
  await passStandardProposal(proposal, proposalId, founder, voter1, voter2);
  await movePastDeadline(governor.runner.provider, proposal, proposalId);
  await queueAndExecute(governor.runner.provider, proposal, timelock, proposalId, founder);

  const config = await governor.getVotingConfig();
  if (config.votingDelay !== 6000n) throw new Error(`votingDelay mismatch: ${config.votingDelay}`);
  if (config.votingPeriod !== 600n) throw new Error(`votingPeriod mismatch: ${config.votingPeriod}`);
  if (config.proposalThreshold !== 200n * TOKEN_UNIT) {
    throw new Error(`proposalThreshold mismatch: ${config.proposalThreshold}`);
  }
  if (config.quorumNumerator !== 2000n) throw new Error(`quorumNumerator mismatch: ${config.quorumNumerator}`);

  console.log("TRACE_GOVERNANCE_PARAMETER_MUTATION: PASS");
}

main().catch((err) => {
  console.error("TRACE_GOVERNANCE_PARAMETER_MUTATION: FAIL");
  console.error(err);
  process.exit(1);
});
