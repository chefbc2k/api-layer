#!/usr/bin/env node
"use strict";

const { ethers } = require("ethers");
require("dotenv").config();
const {
  loadArtifact,
  createProvider,
  sendAndWait
} = require("./lib/access_helpers");

const RPC_URL = process.env.RPC_URL;
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;
const MNEMONIC = process.env.MNEMONIC || "test test test test test test test test test test test junk";

function walletAt(provider, index) {
  return new ethers.NonceManager(
    ethers.HDNodeWallet.fromPhrase(MNEMONIC, undefined, `m/44'/60'/0'/0/${index}`).connect(provider)
  );
}

async function mineBlocks(provider, count) {
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
    .map((log) => { try { return iface.parseLog(log); } catch { return null; } })
    .find((log) => log && log.name === name);
  if (!parsed) throw new Error(`missing ${name} event`);
  return parsed.args[key];
}

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");

  const provider = createProvider(RPC_URL);
  const network = await provider.getNetwork();
  if (network.chainId !== 31337n) {
    throw new Error("trace_proposal_lifecycle requires local block/time controls; Base Sepolia parity is blocked until the scenario is rewritten without anvil/evm helpers");
  }
  const founder = walletAt(provider, 0);
  const voter1 = walletAt(provider, 1);
  const voter2 = walletAt(provider, 2);
  const receiver = await walletAt(provider, 3).getAddress();

  const proposalArtifact = loadArtifact("out/ProposalFacet.sol/ProposalFacet.json");
  const votingPowerArtifact = loadArtifact("out/VotingPowerFacet.sol/VotingPowerFacet.json");
  const dummyArtifact = loadArtifact("out/DummyContract.sol/DummyContract.json");

  const proposal = new ethers.Contract(DIAMOND_ADDRESS, proposalArtifact.abi, founder);
  const votingPower = new ethers.Contract(DIAMOND_ADDRESS, votingPowerArtifact.abi, founder);
  const founderVotingPower = await votingPower.getVotingPower(await founder.getAddress());
  await sendAndWait(
    votingPower.setupInitialVotingPower(await voter1.getAddress(), founderVotingPower, { gasLimit: 1_500_000 }),
    "setupInitialVotingPower:voter1"
  );
  await sendAndWait(
    votingPower.setupInitialVotingPower(await voter2.getAddress(), founderVotingPower, { gasLimit: 1_500_000 }),
    "setupInitialVotingPower:voter2"
  );

  const dummy = await new ethers.ContractFactory(dummyArtifact.abi, dummyArtifact.bytecode.object, founder).deploy();
  await dummy.waitForDeployment();
  await sendAndWait(
    dummy.connect(founder).transferOwnership(DIAMOND_ADDRESS, { gasLimit: 500_000 }),
    "dummy:transferOwnershipToDiamond"
  );

  const targets = [await dummy.getAddress()];
  const values = [0n];
  const calldatas = [dummy.interface.encodeFunctionData("transferOwnership", [receiver])];
  const description = "transfer dummy ownership through governance";

  const proposeRc = await sendAndWait(
    proposal.connect(founder)["propose(address[],uint256[],bytes[],string,uint8)"](
      targets,
      values,
      calldatas,
      description,
      0,
      { gasLimit: 5_000_000 }
    ),
    "proposal:propose"
  );

  const proposalIface = new ethers.Interface(proposalArtifact.abi);
  const proposalId = eventArg(proposeRc, proposalIface, "ProposalCreated", "proposalId");

  if ((await proposal.prState(proposalId)) !== 0n) throw new Error("proposal should start pending");

  const snapshotTarget = await proposal.proposalSnapshot(proposalId);
  const blockBeforeVoting = await provider.getBlockNumber();
  await mineBlocks(provider, Number(snapshotTarget - BigInt(blockBeforeVoting) + 1n));
  if ((await proposal.prState(proposalId)) !== 1n) throw new Error("proposal should become active");

  const snapshotBlock = await proposal.proposalSnapshot(proposalId);
  if ((await votingPower.getVotes(await founder.getAddress(), snapshotBlock)) <= 0n) {
    throw new Error("founder should have snapshot voting power");
  }

  await sendAndWait(
    proposal.connect(founder).prCastVote(proposalId, 1, "approve", { gasLimit: 3_000_000 }),
    "proposal:castVote"
  );
  await sendAndWait(
    proposal.connect(voter1).prCastVote(proposalId, 1, "approve", { gasLimit: 3_000_000 }),
    "proposal:castVote:voter1"
  );
  await sendAndWait(
    proposal.connect(voter2).prCastVote(proposalId, 1, "approve", { gasLimit: 3_000_000 }),
    "proposal:castVote:voter2"
  );

  const deadline = await proposal.proposalDeadline(proposalId);
  const currentBlock = await provider.getBlockNumber();
  const blocksToMine = Number(deadline - BigInt(currentBlock) + 1n);
  await mineBlocks(provider, blocksToMine);

  if ((await proposal.prState(proposalId)) !== 4n) {
    throw new Error(`proposal should succeed after vote window, got ${(await proposal.prState(proposalId)).toString()}`);
  }

  await sendAndWait(proposal.connect(founder).prQueue(proposalId, { gasLimit: 5_000_000 }), "proposal:queue");
  if ((await proposal.prState(proposalId)) !== 5n) throw new Error("proposal should be queued");

  await provider.send("evm_increaseTime", [172800 + 301]);
  await provider.send("evm_mine", []);

  await sendAndWait(proposal.connect(founder).prExecute(proposalId, { gasLimit: 6_000_000 }), "proposal:execute");

  if ((await dummy.owner()).toLowerCase() !== receiver.toLowerCase()) {
    throw new Error("dummy owner should transfer after proposal execution");
  }
  if ((await proposal.prState(proposalId)) !== 7n) throw new Error("proposal should be executed");

  console.log("TRACE_PROPOSAL_LIFECYCLE: PASS");
}

main().catch((err) => {
  console.error("TRACE_PROPOSAL_LIFECYCLE: FAIL");
  console.error(err);
  process.exit(1);
});
