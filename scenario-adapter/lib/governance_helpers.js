"use strict";

const { ethers } = require("ethers");
const {
  createProvider,
  loadArtifact,
  sendAndWait,
  expectRevert
} = require("./access_helpers");

const MNEMONIC = process.env.MNEMONIC || "test test test test test test test test test test test junk";
const TOKEN_UNIT = 10n ** 10n;
const ONE_DAY = 24 * 60 * 60;
const ONE_DAY_BLOCKS = 5760n;
const TIMESTAMP_BUFFER = 5 * 60;

function walletAt(provider, index) {
  return new ethers.NonceManager(
    ethers.HDNodeWallet.fromPhrase(MNEMONIC, undefined, `m/44'/60'/0'/0/${index}`).connect(provider)
  );
}

async function mineBlocks(provider, count) {
  if (count <= 0) return;
  try {
    await provider.send("anvil_mine", [`0x${count.toString(16)}`]);
  } catch {
    for (let i = 0; i < count; i++) {
      await provider.send("evm_mine", []);
    }
  }
}

function eventArg(receipt, iface, name, key) {
  const parsed = receipt.logs
    .map((log) => {
      try {
        return iface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((log) => log && log.name === name);
  if (!parsed) throw new Error(`missing ${name} event`);
  return parsed.args[key];
}

async function ensureVotingPower(votingPower, account, amount, label) {
  if ((await votingPower.getVotingPower(account)) === 0n) {
    await sendAndWait(
      votingPower.setupInitialVotingPower(account, amount, { gasLimit: 1_500_000 }),
      `setupInitialVotingPower:${label}`
    );
  }
}

async function bootstrapActors(rpcUrl, diamondAddress) {
  const provider = createProvider(rpcUrl);
  const founder = walletAt(provider, 0);
  const voter1 = walletAt(provider, 1);
  const voter2 = walletAt(provider, 2);
  const voter3 = walletAt(provider, 3);

  const proposalArtifact = loadArtifact("out/ProposalFacet.sol/ProposalFacet.json");
  const votingPowerArtifact = loadArtifact("out/VotingPowerFacet.sol/VotingPowerFacet.json");
  const delegationArtifact = loadArtifact("out/DelegationFacet.sol/DelegationFacet.json");
  const governorArtifact = loadArtifact("out/GovernorFacet.sol/GovernorFacet.json");
  const timelockArtifact = loadArtifact("out/TimelockFacet.sol/TimelockFacet.json");
  const dummyArtifact = loadArtifact("out/DummyContract.sol/DummyContract.json");

  const proposal = new ethers.Contract(diamondAddress, proposalArtifact.abi, founder);
  const votingPower = new ethers.Contract(diamondAddress, votingPowerArtifact.abi, founder);
  const delegation = new ethers.Contract(diamondAddress, delegationArtifact.abi, founder);
  const governor = new ethers.Contract(diamondAddress, governorArtifact.abi, founder);
  const timelock = new ethers.Contract(diamondAddress, timelockArtifact.abi, founder);

  const founderAddress = await founder.getAddress();
  const founderVotes = await votingPower.getVotingPower(founderAddress);
  await ensureVotingPower(votingPower, await voter1.getAddress(), founderVotes, "voter1");
  await ensureVotingPower(votingPower, await voter2.getAddress(), founderVotes, "voter2");

  return {
    provider,
    founder,
    voter1,
    voter2,
    voter3,
    founderAddress,
    proposal,
    votingPower,
    delegation,
    governor,
    timelock,
    dummyArtifact,
    proposalArtifact,
    founderVotes
  };
}

async function deployGovernanceTarget(founder, dummyArtifact, owner) {
  const dummy = await new ethers.ContractFactory(dummyArtifact.abi, dummyArtifact.bytecode.object, founder).deploy();
  await dummy.waitForDeployment();
  await sendAndWait(
    dummy.transferOwnership(owner, { gasLimit: 500_000 }),
    "dummy:transferOwnership"
  );
  return dummy;
}

async function createProposal(proposal, proposalArtifact, founder, targets, values, calldatas, description, proposalType = 0) {
  const receipt = await sendAndWait(
    proposal.connect(founder)["propose(address[],uint256[],bytes[],string,uint8)"](
      targets,
      values,
      calldatas,
      description,
      proposalType,
      { gasLimit: 6_000_000 }
    ),
    `proposal:propose:${description}`
  );
  return eventArg(receipt, new ethers.Interface(proposalArtifact.abi), "ProposalCreated", "proposalId");
}

async function moveToActive(provider, proposal, proposalId) {
  const snapshot = await proposal.proposalSnapshot(proposalId);
  const currentBlock = await provider.getBlockNumber();
  await mineBlocks(provider, Number(snapshot - BigInt(currentBlock) + 1n));
}

async function movePastDeadline(provider, proposal, proposalId) {
  const deadline = await proposal.proposalDeadline(proposalId);
  const currentBlock = await provider.getBlockNumber();
  await mineBlocks(provider, Number(deadline - BigInt(currentBlock) + 1n));
}

async function passStandardProposal(proposal, proposalId, founder, voter1, voter2) {
  await sendAndWait(proposal.connect(founder).prCastVote(proposalId, 1, "for", { gasLimit: 3_000_000 }), "vote:founder");
  await sendAndWait(proposal.connect(voter1).prCastVote(proposalId, 1, "for", { gasLimit: 3_000_000 }), "vote:voter1");
  await sendAndWait(proposal.connect(voter2).prCastVote(proposalId, 1, "for", { gasLimit: 3_000_000 }), "vote:voter2");
}

async function queueAndExecute(provider, proposal, timelock, proposalId, founder) {
  await sendAndWait(proposal.connect(founder).prQueue(proposalId, { gasLimit: 5_000_000 }), "proposal:queue");
  const delay = await timelock.getMinDelay();
  await provider.send("evm_increaseTime", [Number(delay) + TIMESTAMP_BUFFER + 1]);
  await provider.send("evm_mine", []);
  await sendAndWait(proposal.connect(founder).prExecute(proposalId, { gasLimit: 8_000_000 }), "proposal:execute");
}

module.exports = {
  TOKEN_UNIT,
  ONE_DAY,
  ONE_DAY_BLOCKS,
  TIMESTAMP_BUFFER,
  walletAt,
  mineBlocks,
  eventArg,
  ensureVotingPower,
  bootstrapActors,
  deployGovernanceTarget,
  createProposal,
  moveToActive,
  movePastDeadline,
  passStandardProposal,
  queueAndExecute,
  expectRevert
};
