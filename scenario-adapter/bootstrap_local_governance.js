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
const EXECUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("EXECUTOR_ROLE"));
const PROPOSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PROPOSER_ROLE"));
const TOKEN_UNIT = 10n ** 10n;
const ONE_DAY = 24 * 60 * 60;
const ONE_DAY_BLOCKS = 5760n;

function linkBytecode(artifact, libraries) {
  let bytecode = artifact.bytecode.object;
  for (const [sourceName, sourceRefs] of Object.entries(artifact.bytecode.linkReferences || {})) {
    for (const [libraryName, refs] of Object.entries(sourceRefs)) {
      const address = libraries[`${sourceName}:${libraryName}`] || libraries[libraryName];
      if (!address) throw new Error(`missing library address for ${sourceName}:${libraryName}`);
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

const DEFAULT_VOTING_POWER_INIT = Object.freeze({
  useQuadraticVoting: false,
  useTimeWeight: false,
  useCompoundBonus: false,
  votingCurveType: 0,
  maxTimeBonus: 0,
  compoundRate: 0,
  quadraticMultiplier: 0,
  curveBase: 0,
  curveMidpoint: 0,
  curveSteepness: 0
});

async function bootstrapGovernance(rpcUrl = RPC_URL, options = {}) {
  const { provider, founder, founderAddress, diamondAddress, diamondCut, access } = await deployBaseDiamondWithAccess(rpcUrl);

  await ensureRole(access, founder, ROLE.TIMELOCK_ROLE, "TIMELOCK_ROLE");
  await ensureRole(access, founder, PROPOSER_ROLE, "PROPOSER_ROLE");
  await ensureRole(access, founder, ROLE.PLATFORM_ADMIN_ROLE, "PLATFORM_ADMIN_ROLE");

  const tokenArtifact = loadArtifact("out/TokenSupplyFacet.sol/TokenSupplyFacet.json");
  const timelockArtifact = loadArtifact("out/TimelockFacet.sol/TimelockFacet.json");
  const timelockLibArtifact = loadArtifact("out/TimelockLib.sol/TimelockLib.json");
  const timelockInitArtifact = loadArtifact("out/TimelockInitializer.sol/TimelockInitializer.json");
  const proposalArtifact = loadArtifact("out/ProposalFacet.sol/ProposalFacet.json");
  const proposalInitArtifact = loadArtifact("out/ProposalInitializer.sol/ProposalInitializer.json");
  const governanceArtifact = loadArtifact("out/GovernorFacet.sol/GovernorFacet.json");
  const governanceInitArtifact = loadArtifact("out/GovernanceInitializer.sol/GovernanceInitializer.json");
  const votingPowerArtifact = loadArtifact("out/VotingPowerFacet.sol/VotingPowerFacet.json");
  const votingPowerInitArtifact = loadArtifact("out/VotingPowerInitializer.sol/VotingPowerInitializer.json");
  const votingCurvesArtifact = loadArtifact("out/VotingCurves.sol/VotingCurves.json");
  const delegationArtifact = loadArtifact("out/DelegationFacet.sol/DelegationFacet.json");
  const delegationInitArtifact = loadArtifact("out/DelegationInitializer.sol/DelegationInitializer.json");

  const tokenFacet = await deploy(
    new ethers.ContractFactory(tokenArtifact.abi, tokenArtifact.bytecode.object, founder),
    "TokenSupplyFacet"
  );
  await sendAndWait(
    diamondCut.diamondCut(
      [{ facetAddress: await tokenFacet.getAddress(), action: 0, functionSelectors: selectorsForAbi(tokenArtifact.abi) }],
      ethers.ZeroAddress,
      "0x",
      { gasLimit: 12_000_000 }
    ),
    "diamondCut:addTokenSupplyFacet"
  );

  const token = new ethers.Contract(diamondAddress, tokenArtifact.abi, founder);
  await sendAndWait(token.initializeToken({ gasLimit: 3_000_000 }), "initializeToken");

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
  await sendAndWait(
    diamondCut.setTrustedInitContract(await timelockInit.getAddress(), true, { gasLimit: 500_000 }),
    "setTrustedInitContract:TimelockInitializer"
  );
  await sendAndWait(
    diamondCut.diamondCut(
      [{ facetAddress: await timelockFacet.getAddress(), action: 0, functionSelectors: selectorsForAbi(timelockArtifact.abi) }],
      await timelockInit.getAddress(),
      new ethers.Interface(timelockInitArtifact.abi).encodeFunctionData("init", [{
        minDelay: 2 * ONE_DAY,
        proposers: [founderAddress],
        executors: [diamondAddress]
      }]),
      { gasLimit: 12_000_000 }
    ),
    "diamondCut:addTimelockFacet"
  );

  const votingCurves = await deploy(
    new ethers.ContractFactory(votingCurvesArtifact.abi, votingCurvesArtifact.bytecode.object, founder),
    "VotingCurves"
  );
  const votingPowerFacet = await deploy(
    new ethers.ContractFactory(
      votingPowerArtifact.abi,
      linkBytecode(votingPowerArtifact, { VotingCurves: await votingCurves.getAddress() }),
      founder
    ),
    "VotingPowerFacet"
  );
  const votingPowerInit = await deploy(
    new ethers.ContractFactory(votingPowerInitArtifact.abi, votingPowerInitArtifact.bytecode.object, founder),
    "VotingPowerInitializer"
  );
  await sendAndWait(
    diamondCut.setTrustedInitContract(await votingPowerInit.getAddress(), true, { gasLimit: 500_000 }),
    "setTrustedInitContract:VotingPowerInitializer"
  );
  await sendAndWait(
    diamondCut.diamondCut(
      [{ facetAddress: await votingPowerFacet.getAddress(), action: 0, functionSelectors: selectorsForAbi(votingPowerArtifact.abi) }],
      await votingPowerInit.getAddress(),
      new ethers.Interface(votingPowerInitArtifact.abi).encodeFunctionData("init", [{
        ...DEFAULT_VOTING_POWER_INIT,
        ...(options.votingPowerInit || {})
      }]),
      { gasLimit: 12_000_000 }
    ),
    "diamondCut:addVotingPowerFacet"
  );

  const delegationFacet = await deploy(
    new ethers.ContractFactory(delegationArtifact.abi, delegationArtifact.bytecode.object, founder),
    "DelegationFacet"
  );
  const delegationInit = await deploy(
    new ethers.ContractFactory(delegationInitArtifact.abi, delegationInitArtifact.bytecode.object, founder),
    "DelegationInitializer"
  );
  await sendAndWait(
    diamondCut.setTrustedInitContract(await delegationInit.getAddress(), true, { gasLimit: 500_000 }),
    "setTrustedInitContract:DelegationInitializer"
  );
  const delegationIface = new ethers.Interface(delegationArtifact.abi);
  const delegationSelectors = selectorsForAbi(delegationArtifact.abi).filter(
    (selector) => selector !== delegationIface.getFunction("getDelegatedVotingPower(address)").selector
  );
  await sendAndWait(
    diamondCut.diamondCut(
      [{ facetAddress: await delegationFacet.getAddress(), action: 0, functionSelectors: delegationSelectors }],
      await delegationInit.getAddress(),
      new ethers.Interface(delegationInitArtifact.abi).encodeFunctionData("setupDelegation", []),
      { gasLimit: 12_000_000 }
    ),
    "diamondCut:addDelegationFacet"
  );

  const proposalFacet = await deploy(
    new ethers.ContractFactory(proposalArtifact.abi, proposalArtifact.bytecode.object, founder),
    "ProposalFacet"
  );
  const proposalInit = await deploy(
    new ethers.ContractFactory(proposalInitArtifact.abi, proposalInitArtifact.bytecode.object, founder),
    "ProposalInitializer"
  );
  await sendAndWait(
    diamondCut.setTrustedInitContract(await proposalInit.getAddress(), true, { gasLimit: 500_000 }),
    "setTrustedInitContract:ProposalInitializer"
  );
  const proposalIface = new ethers.Interface(proposalArtifact.abi);
  const proposalSelectors = selectorsForAbi(proposalArtifact.abi).filter(
    (selector) => selector !== proposalIface.getFunction("EXECUTOR_ROLE()").selector
  );
  await sendAndWait(
    diamondCut.diamondCut(
      [{ facetAddress: await proposalFacet.getAddress(), action: 0, functionSelectors: proposalSelectors }],
      await proposalInit.getAddress(),
      new ethers.Interface(proposalInitArtifact.abi).encodeFunctionData("init", [{
        minVotingDelay: ONE_DAY_BLOCKS,
        maxVotingDelay: 10000n,
        minVotingPeriod: 300n,
        maxVotingPeriod: 5000n,
        initialVotingDelay: ONE_DAY_BLOCKS,
        initialVotingPeriod: 300n,
        initialProposalThreshold: 100n * TOKEN_UNIT,
        minQuorumNumerator: 400n,
        maxQuorumNumerator: 5000n,
        initialQuorumNumerator: 1000n,
        standardProposalThreshold: 100n * TOKEN_UNIT,
        emergencyProposalThreshold: 200n * TOKEN_UNIT,
        standardProposalQuorum: 1000n,
        emergencyProposalQuorum: 1500n,
        standardProposalDelay: ONE_DAY_BLOCKS,
        emergencyProposalDelay: ONE_DAY_BLOCKS,
        revenueChangeProposalThreshold: 150n * TOKEN_UNIT,
        revenueChangeProposalQuorum: 1200n,
        revenueChangeProposalDelay: ONE_DAY_BLOCKS,
        standardProposalPeriod: 300n,
        emergencyProposalPeriod: 300n
      }]),
      { gasLimit: 12_000_000 }
    ),
    "diamondCut:addProposalFacet"
  );

  const governorFacet = await deploy(
    new ethers.ContractFactory(governanceArtifact.abi, governanceArtifact.bytecode.object, founder),
    "GovernorFacet"
  );
  const governanceInit = await deploy(
    new ethers.ContractFactory(governanceInitArtifact.abi, governanceInitArtifact.bytecode.object, founder),
    "GovernanceInitializer"
  );
  await sendAndWait(
    diamondCut.setTrustedInitContract(await governanceInit.getAddress(), true, { gasLimit: 500_000 }),
    "setTrustedInitContract:GovernanceInitializer"
  );
  const governorIface = new ethers.Interface(governanceArtifact.abi);
  const governorSelectors = selectorsForAbi(governanceArtifact.abi).filter(
    (selector) => selector !== governorIface.getFunction("GOVERNANCE_PROPOSER_ROLE()").selector
  );
  await sendAndWait(
    diamondCut.diamondCut(
      [{ facetAddress: await governorFacet.getAddress(), action: 0, functionSelectors: governorSelectors }],
      await governanceInit.getAddress(),
      new ethers.Interface(governanceInitArtifact.abi).encodeFunctionData("setupGovernance", []),
      { gasLimit: 12_000_000 }
    ),
    "diamondCut:addGovernorFacet"
  );

  await sendAndWait(
    access.grantRole(PROPOSER_ROLE, diamondAddress, ethers.MaxUint256),
    "grantRole:PROPOSER_ROLE:diamond"
  );
  await sendAndWait(
    access.grantRole(EXECUTOR_ROLE, diamondAddress, ethers.MaxUint256),
    "grantRole:EXECUTOR_ROLE:diamond"
  );

  const votingPower = new ethers.Contract(diamondAddress, votingPowerArtifact.abi, founder);
  await sendAndWait(
    votingPower.setupInitialVotingPower(founderAddress, await token.tokenBalanceOf(founderAddress), { gasLimit: 1_500_000 }),
    "setupInitialVotingPower:founder"
  );

  const emergencyArtifact = loadArtifact("out/EmergencyFacet.sol/EmergencyFacet.json");
  const emergency = new ethers.Contract(diamondAddress, emergencyArtifact.abi, founder);

  return {
    provider,
    founder,
    founderAddress,
    diamondAddress,
    diamondCut,
    access,
    emergency,
    token,
    timelock: new ethers.Contract(diamondAddress, timelockArtifact.abi, founder),
    votingPower: new ethers.Contract(diamondAddress, votingPowerArtifact.abi, founder),
    delegation: new ethers.Contract(diamondAddress, delegationArtifact.abi, founder),
    proposal: new ethers.Contract(diamondAddress, proposalArtifact.abi, founder),
    governor: new ethers.Contract(diamondAddress, governanceArtifact.abi, founder),
    artifacts: {
      tokenArtifact,
      timelockArtifact,
      proposalArtifact,
      governanceArtifact,
      votingPowerArtifact,
      delegationArtifact
    }
  };
}

async function main() {
  const { diamondAddress } = await bootstrapGovernance(RPC_URL);
  console.log(`BOOTSTRAP_LOCAL_GOVERNANCE: PASS diamond=${diamondAddress}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error("BOOTSTRAP_LOCAL_GOVERNANCE: FAIL");
    console.error(err);
    process.exit(1);
  });
}

module.exports = { bootstrapGovernance };
