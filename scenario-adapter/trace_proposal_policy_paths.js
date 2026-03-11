#!/usr/bin/env node
"use strict";

const { ethers } = require("ethers");
const { bootstrapGovernance } = require("./bootstrap_local_governance");
const { loadArtifact, expectRevert, sendAndWait } = require("./lib/access_helpers");

const RPC_URL = process.env.RPC_URL;
const PROPOSAL_TYPE = {
  STANDARD: 0,
  EMERGENCY: 1,
  CRITICAL: 2,
  ROLE_CHANGE: 3,
  REVENUE_CHANGE: 9
};

async function main() {
  const { founder, diamondAddress, proposal, emergency } = await bootstrapGovernance(RPC_URL);

  const founderAddress = await founder.getAddress();
  const paymentArtifact = loadArtifact("out/PaymentFacet.sol/PaymentFacet.json");
  const payment = new ethers.Contract(diamondAddress, paymentArtifact.abi, founder);

  await expectRevert(
    () =>
      proposal.connect(founder)["propose(address[],uint256[],bytes[],string,uint8)"].staticCall(
        [diamondAddress],
        [0n],
        [payment.interface.encodeFunctionData("updateTreasuryAddress", [founderAddress])],
        "critical with insufficient timelock delay",
        PROPOSAL_TYPE.CRITICAL
      ),
    "proposal:criticalDelayGuard"
  );

  await expectRevert(
    () =>
      proposal.connect(founder)["propose(address[],uint256[],bytes[],string,uint8)"].staticCall(
        [diamondAddress],
        [0n],
        [payment.interface.encodeFunctionData("tokenName", [])],
        "invalid revenue proposal",
        PROPOSAL_TYPE.REVENUE_CHANGE
      ),
    "proposal:invalidRevenueProposal"
  );

  await sendAndWait(emergency.connect(founder).emergencyStop({ gasLimit: 2_000_000 }), "emergency:stop");

  await expectRevert(
    () =>
      proposal.connect(founder)["propose(address[],uint256[],bytes[],string,uint8)"].staticCall(
        [diamondAddress],
        [0n],
        [payment.interface.encodeFunctionData("updateTreasuryAddress", [founderAddress])],
        "standard blocked during pause",
        PROPOSAL_TYPE.STANDARD
      ),
    "proposal:standardWhilePaused"
  );

  const emergencyRc = await sendAndWait(
    proposal.connect(founder)["propose(address[],uint256[],bytes[],string,uint8)"](
      [diamondAddress],
      [0n],
      [payment.interface.encodeFunctionData("updateTreasuryAddress", [founderAddress])],
      "emergency proposal allowed during pause",
      PROPOSAL_TYPE.EMERGENCY,
      { gasLimit: 6_000_000 }
    ),
    "proposal:emergencyWhilePaused"
  );
  const proposalIface = new ethers.Interface(loadArtifact("out/ProposalFacet.sol/ProposalFacet.json").abi);
  const event = emergencyRc.logs
    .map((log) => {
      try {
        return proposalIface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((log) => log && log.name === "ProposalCreated");
  if (!event) throw new Error("emergency proposal event missing");

  console.log("TRACE_PROPOSAL_POLICY_PATHS: PASS");
}

main().catch((err) => {
  console.error("TRACE_PROPOSAL_POLICY_PATHS: FAIL");
  console.error(err);
  process.exit(1);
});
