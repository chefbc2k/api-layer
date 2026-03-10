#!/usr/bin/env node
"use strict";

const { ethers } = require("ethers");
require("dotenv").config();
const {
  ROLE,
  loadArtifact,
  selectorsForAbi,
  sendAndWait,
  deploy,
  deployBaseDiamondWithAccess,
  ensureRole
} = require("./lib/reentrancy_real_helpers");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const UNAUTHORIZED_REENTRANT_SELECTOR = ethers.id("UnauthorizedReentrantCall()").slice(0, 10);
const MIN_DELAY = 172800;
const EXECUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("EXECUTOR_ROLE"));

function linkBytecode(artifact, libraries) {
  let bytecode = artifact.bytecode.object;
  for (const [sourceName, sourceRefs] of Object.entries(artifact.bytecode.linkReferences || {})) {
    for (const [libraryName, refs] of Object.entries(sourceRefs)) {
      const address = libraries[`${sourceName}:${libraryName}`] || libraries[libraryName];
      if (!address) {
        throw new Error(`missing library address for ${sourceName}:${libraryName}`);
      }
      const normalized = address.toLowerCase().replace(/^0x/, "");
      for (const ref of refs) {
        const start = 2 + ref.start * 2;
        const length = ref.length * 2;
        bytecode = `${bytecode.slice(0, start)}${normalized}${bytecode.slice(start + length)}`;
      }
    }
  }
  return bytecode;
}

async function main() {
  const { founder, founderAddress, diamondAddress, diamondCut, access } = await deployBaseDiamondWithAccess(RPC_URL);
  await ensureRole(access, founder, ROLE.TIMELOCK_ROLE, "TIMELOCK_ROLE");

  const timelockArtifact = loadArtifact("out/TimelockFacet.sol/TimelockFacet.json");
  const timelockLibArtifact = loadArtifact("out/TimelockLib.sol/TimelockLib.json");
  const timelockInitArtifact = loadArtifact("out/TimelockInitializer.sol/TimelockInitializer.json");
  const proposalArtifact = loadArtifact("out/ProposalFacet.sol/ProposalFacet.json");
  const proposalInitArtifact = loadArtifact("out/ProposalInitializer.sol/ProposalInitializer.json");
  const governanceInitArtifact = loadArtifact("out/GovernanceInitializer.sol/GovernanceInitializer.json");
  const seedArtifact = loadArtifact("out/RealFacetReentrancyMocks.sol/ProposalExecutionSeedInit.json");
  const targetArtifact = loadArtifact("out/RealFacetReentrancyMocks.sol/ProposalExecutionReentrancyTarget.json");

  const timelockLib = await deploy(
    new ethers.ContractFactory(timelockLibArtifact.abi, timelockLibArtifact.bytecode.object, founder),
    "TimelockLib"
  );
  const timelockFacet = await deploy(
    new ethers.ContractFactory(
      timelockArtifact.abi,
      linkBytecode(timelockArtifact, { TimelockLib: await timelockLib.getAddress() }),
      founder
    ),
    "TimelockFacet"
  );
  const timelockInit = await deploy(
    new ethers.ContractFactory(timelockInitArtifact.abi, timelockInitArtifact.bytecode.object, founder),
    "TimelockInitializer"
  );
  const proposalFacet = await deploy(
    new ethers.ContractFactory(proposalArtifact.abi, proposalArtifact.bytecode.object, founder),
    "ProposalFacet"
  );
  const proposalInit = await deploy(
    new ethers.ContractFactory(proposalInitArtifact.abi, proposalInitArtifact.bytecode.object, founder),
    "ProposalInitializer"
  );
  const governanceInit = await deploy(
    new ethers.ContractFactory(governanceInitArtifact.abi, governanceInitArtifact.bytecode.object, founder),
    "GovernanceInitializer"
  );
  const seedInit = await deploy(
    new ethers.ContractFactory(seedArtifact.abi, seedArtifact.bytecode.object, founder),
    "ProposalExecutionSeedInit"
  );
  const target = await deploy(
    new ethers.ContractFactory(targetArtifact.abi, targetArtifact.bytecode.object, founder),
    "ProposalExecutionReentrancyTarget"
  );

  await sendAndWait(
    diamondCut.setTrustedInitContract(await timelockInit.getAddress(), true, { gasLimit: 500_000 }),
    "setTrustedInitContract:TimelockInitializer"
  );
  await sendAndWait(
    diamondCut.diamondCut(
      [{ facetAddress: await timelockFacet.getAddress(), action: 0, functionSelectors: selectorsForAbi(timelockArtifact.abi) }],
      await timelockInit.getAddress(),
      new ethers.Interface(timelockInitArtifact.abi).encodeFunctionData("init", [{
        minDelay: MIN_DELAY,
        proposers: [founderAddress],
        executors: [diamondAddress]
      }]),
      { gasLimit: 12_000_000 }
    ),
    "diamondCut:addTimelockFacet"
  );

  await sendAndWait(
    diamondCut.setTrustedInitContract(await proposalInit.getAddress(), true, { gasLimit: 500_000 }),
    "setTrustedInitContract:ProposalInitializer"
  );

  const proposalIface = new ethers.Interface(proposalArtifact.abi);
  const proposalSelectors = selectorsForAbi(proposalArtifact.abi).filter(
    (selector) => selector !== proposalIface.getFunction("EXECUTOR_ROLE()").selector
  );
  const proposalInitParams = {
    minVotingDelay: 1n,
    maxVotingDelay: 40320n,
    minVotingPeriod: 40n,
    maxVotingPeriod: 80640n,
    initialVotingDelay: 6720n,
    initialVotingPeriod: 40320n,
    initialProposalThreshold: 100n * 10n ** 18n,
    minQuorumNumerator: 400n,
    maxQuorumNumerator: 2000n,
    initialQuorumNumerator: 1000n,
    standardProposalThreshold: 100n * 10n ** 18n,
    emergencyProposalThreshold: 500n * 10n ** 18n,
    standardProposalQuorum: 1000n,
    emergencyProposalQuorum: 1500n,
    standardProposalDelay: 6720n,
    emergencyProposalDelay: 40n,
    revenueChangeProposalThreshold: 200n * 10n ** 18n,
    revenueChangeProposalQuorum: 1200n,
    revenueChangeProposalDelay: 13440n,
    standardProposalPeriod: 40320n,
    emergencyProposalPeriod: 6720n
  };
  await sendAndWait(
    diamondCut.diamondCut(
      [{ facetAddress: await proposalFacet.getAddress(), action: 0, functionSelectors: proposalSelectors }],
      await proposalInit.getAddress(),
      new ethers.Interface(proposalInitArtifact.abi).encodeFunctionData("init", [proposalInitParams]),
      { gasLimit: 12_000_000 }
    ),
    "diamondCut:addProposalFacet"
  );

  await sendAndWait(
    diamondCut.setTrustedInitContract(await governanceInit.getAddress(), true, { gasLimit: 500_000 }),
    "setTrustedInitContract:GovernanceInitializer"
  );
  await sendAndWait(
    diamondCut.diamondCut(
      [],
      await governanceInit.getAddress(),
      new ethers.Interface(governanceInitArtifact.abi).encodeFunctionData("setupGovernance", []),
      { gasLimit: 4_000_000 }
    ),
    "diamondCut:setupGovernance"
  );

  await sendAndWait(
    access.grantRole(EXECUTOR_ROLE, diamondAddress, ethers.MaxUint256),
    "grantRole:EXECUTOR_ROLE:diamond"
  );

  const proposal = new ethers.Contract(diamondAddress, proposalArtifact.abi, founder);
  const proposalId = 1n;
  await sendAndWait(target.configure(diamondAddress, proposalId), "target:configure");

  const targets = [await target.getAddress()];
  const values = [0n];
  const calldatas = [target.interface.encodeFunctionData("executeAction", [])];

  await sendAndWait(
    diamondCut.setTrustedInitContract(await seedInit.getAddress(), true, { gasLimit: 500_000 }),
    "setTrustedInitContract:ProposalExecutionSeedInit"
  );
  await sendAndWait(
    diamondCut.diamondCut(
      [],
      await seedInit.getAddress(),
      new ethers.Interface(seedArtifact.abi).encodeFunctionData("seedQueuedProposal", [proposalId, founderAddress, targets, values, calldatas, MIN_DELAY]),
      { gasLimit: 6_000_000 }
    ),
    "diamondCut:seedQueuedProposal"
  );

  const stateBefore = await proposal.prState(proposalId);
  if (stateBefore !== 5n && stateBefore !== 5) {
    throw new Error(`proposal should be queued before execution, got state=${stateBefore}`);
  }

  await sendAndWait(proposal.prExecute(proposalId, { gasLimit: 5_000_000 }), "prExecute");

  if (!(await target.called())) {
    throw new Error("proposal target should execute during timelock execution");
  }
  if (await target.lastReenterSuccess()) {
    throw new Error("proposal execution reentry should fail under ProposalFacet nonReentrant guard");
  }
  if (!(await target.lastReenterData()).startsWith(UNAUTHORIZED_REENTRANT_SELECTOR)) {
    throw new Error(`unexpected proposal reentry revert selector: ${(await target.lastReenterData()).slice(0, 10)}`);
  }

  const stateAfter = await proposal.prState(proposalId);
  if (stateAfter !== 7n && stateAfter !== 7) {
    throw new Error(`proposal should be executed after prExecute, got state=${stateAfter}`);
  }

  console.log("TRACE_PROPOSAL_EXECUTION_REENTRANCY_REAL_FACETS: PASS");
}

main().catch((err) => {
  console.error("TRACE_PROPOSAL_EXECUTION_REENTRANCY_REAL_FACETS: FAIL");
  console.error(err);
  process.exit(1);
});
