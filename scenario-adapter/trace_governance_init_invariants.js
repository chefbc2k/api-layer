#!/usr/bin/env node
"use strict";

const { ethers } = require("ethers");
require("dotenv").config();
const {
  loadArtifact,
  createProvider,
  expectRevert
} = require("./lib/access_helpers");

const RPC_URL = process.env.RPC_URL;
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const MNEMONIC = process.env.MNEMONIC || "test test test test test test test test test test test junk";
const EXECUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("EXECUTOR_ROLE"));

function walletAt(provider, index) {
  return new ethers.NonceManager(
    ethers.HDNodeWallet.fromPhrase(MNEMONIC, undefined, `m/44'/60'/0'/0/${index}`).connect(provider)
  );
}

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");

  const provider = createProvider(RPC_URL);
  const founder = PRIVATE_KEY
    ? new ethers.NonceManager(new ethers.Wallet(PRIVATE_KEY, provider))
    : walletAt(provider, 0);
  const outsider = PRIVATE_KEY
    ? new ethers.NonceManager(ethers.Wallet.createRandom().connect(provider))
    : walletAt(provider, 8);
  const founderAddress = await founder.getAddress();

  const accessArtifact = loadArtifact("out/AccessControlFacet.sol/AccessControlFacet.json");
  const tokenArtifact = loadArtifact("out/TokenSupplyFacet.sol/TokenSupplyFacet.json");
  const timelockArtifact = loadArtifact("out/TimelockFacet.sol/TimelockFacet.json");
  const proposalArtifact = loadArtifact("out/ProposalFacet.sol/ProposalFacet.json");
  const governorArtifact = loadArtifact("out/GovernorFacet.sol/GovernorFacet.json");
  const votingPowerArtifact = loadArtifact("out/VotingPowerFacet.sol/VotingPowerFacet.json");
  const delegationArtifact = loadArtifact("out/DelegationFacet.sol/DelegationFacet.json");

  const access = new ethers.Contract(DIAMOND_ADDRESS, accessArtifact.abi, founder);
  const token = new ethers.Contract(DIAMOND_ADDRESS, tokenArtifact.abi, founder);
  const timelock = new ethers.Contract(DIAMOND_ADDRESS, timelockArtifact.abi, founder);
  const proposal = new ethers.Contract(DIAMOND_ADDRESS, proposalArtifact.abi, founder);
  const governor = new ethers.Contract(DIAMOND_ADDRESS, governorArtifact.abi, founder);
  const votingPower = new ethers.Contract(DIAMOND_ADDRESS, votingPowerArtifact.abi, founder);
  const delegation = new ethers.Contract(DIAMOND_ADDRESS, delegationArtifact.abi, founder);

  if ((await token.totalSupply()) <= 0n) throw new Error("token supply should be initialized");
  if ((await timelock.getMinDelay()) !== 172800n) throw new Error("timelock min delay should be 2 days");

  const votingConfig = await governor.getVotingConfig();
  if (votingConfig.votingDelay !== 6720n) throw new Error("voting delay should match production proposal initializer");
  if (votingConfig.votingPeriod !== 40320n) throw new Error("voting period should match production proposal initializer");
  if (votingConfig.quorumNumerator !== 1000n) throw new Error("quorum numerator should match production proposal initializer");
  if (votingConfig.proposalThreshold !== 100n * 10n ** 18n) {
    throw new Error("proposal threshold should match production proposal initializer");
  }

  const totalSupply = await token.totalSupply();
  const standardConfig = await proposal.getProposalTypeConfig(0);
  if (standardConfig.threshold !== 100n * 10n ** 18n) {
    throw new Error("standard threshold should match production proposal initializer");
  }
  if (standardConfig.quorum !== 1500n) throw new Error("standard quorum should match production proposal initializer");
  if (standardConfig.votingDelay !== 6720n) throw new Error("standard voting delay should match production proposal initializer");
  if (standardConfig.votingPeriod !== 40320n) throw new Error("standard voting period should follow production proposal initializer");
  if (standardConfig.executionDelay !== 172800n) throw new Error("standard execution delay should follow timelock min delay");

  const founderVotes = await votingPower.getVotingPower(founderAddress);
  console.log(`[state] founderVotingPower=${founderVotes}`);
  if (await delegation.delegates(founderAddress) !== ethers.ZeroAddress) {
    throw new Error("founder should not have delegate set by default");
  }

  if (!(await access.hasRole(EXECUTOR_ROLE, DIAMOND_ADDRESS))) {
    throw new Error("diamond should have EXECUTOR_ROLE for proposal execution");
  }

  await expectRevert(
    () => governor.connect(outsider).updateVotingDelay.staticCall(2n),
    "governor:outsiderUpdateVotingDelay"
  );
  await expectRevert(
    () => proposal.connect(outsider).propose.staticCall([], [], [], "", 0),
    "proposal:outsiderPropose"
  );

  console.log("TRACE_GOVERNANCE_INIT_INVARIANTS: PASS");
}

main().catch((err) => {
  console.error("TRACE_GOVERNANCE_INIT_INVARIANTS: FAIL");
  console.error(err);
  process.exit(1);
});
