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
  queueAndExecute,
  walletAt
} = require("./lib/governance_helpers");

const RPC_URL = process.env.RPC_URL;
const GOVERNANCE_STORAGE_SLOT = ethers.keccak256(ethers.toUtf8Bytes("speak.governance.storage"));
const SLOT_TRUSTED_TARGETS = 13n;
const SLOT_TARGET_GAS_LIMITS = 14n;
const SLOT_DEFAULT_GAS_LIMIT = 15n;

function storageSlot(baseSlot, offset) {
  return ethers.toBeHex(BigInt(baseSlot) + offset, 32);
}

function mappingSlot(key, slot) {
  return ethers.keccak256(
    ethers.solidityPacked(["bytes32", "bytes32"], [ethers.zeroPadValue(key, 32), ethers.toBeHex(slot, 32)])
  );
}

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
  await votingPower.setupInitialVotingPower(await voter1.getAddress(), founderVotes, { gasLimit: 1_500_000 });
  await votingPower.setupInitialVotingPower(await voter2.getAddress(), founderVotes, { gasLimit: 1_500_000 });

  const proposalArtifact = artifacts.proposalArtifact;

  const iface = new ethers.Interface(governor.interface.fragments);
  const target = "0x000000000000000000000000000000000000dEaD";
  const gasLimit = 4_200_000n;
  const defaultGas = 5_000_000n;

  const proposalId = await createProposal(
    proposal,
    proposalArtifact,
    founder,
    [diamondAddress, diamondAddress],
    [0n, 0n],
    [
      iface.encodeFunctionData("setTrustedTarget", [target, true, gasLimit]),
      iface.encodeFunctionData("setDefaultGasLimit", [defaultGas])
    ],
    "governor target controls",
    0
  );

  await moveToActive(provider, proposal, proposalId);
  await passStandardProposal(proposal, proposalId, founder, voter1, voter2);
  await movePastDeadline(provider, proposal, proposalId);
  await queueAndExecute(provider, proposal, timelock, proposalId, founder);

  const trustedSlot = mappingSlot(target, BigInt(storageSlot(GOVERNANCE_STORAGE_SLOT, SLOT_TRUSTED_TARGETS)));
  const gasSlot = mappingSlot(target, BigInt(storageSlot(GOVERNANCE_STORAGE_SLOT, SLOT_TARGET_GAS_LIMITS)));
  const defaultGasSlot = storageSlot(GOVERNANCE_STORAGE_SLOT, SLOT_DEFAULT_GAS_LIMIT);

  const trusted = await provider.getStorage(diamondAddress, trustedSlot);
  const storedGas = await provider.getStorage(diamondAddress, gasSlot);
  const storedDefaultGas = await provider.getStorage(diamondAddress, defaultGasSlot);

  if (BigInt(trusted) !== 1n) throw new Error(`trusted target flag mismatch: ${trusted}`);
  if (BigInt(storedGas) !== gasLimit) throw new Error(`target gas limit mismatch: ${storedGas}`);
  if (BigInt(storedDefaultGas) !== defaultGas) throw new Error(`default gas limit mismatch: ${storedDefaultGas}`);

  const clearId = await createProposal(
    proposal,
    proposalArtifact,
    founder,
    [diamondAddress],
    [0n],
    [iface.encodeFunctionData("setTrustedTarget", [target, false, 0n])],
    "governor clear trust flag",
    0
  );

  await moveToActive(provider, proposal, clearId);
  await passStandardProposal(proposal, clearId, founder, voter1, voter2);
  await movePastDeadline(provider, proposal, clearId);
  await queueAndExecute(provider, proposal, timelock, clearId, founder);

  const trustedAfter = await provider.getStorage(diamondAddress, trustedSlot);
  const gasAfter = await provider.getStorage(diamondAddress, gasSlot);
  if (BigInt(trustedAfter) !== 0n) throw new Error(`trusted target should clear: ${trustedAfter}`);
  if (BigInt(gasAfter) !== gasLimit) {
    throw new Error(`gas limit should remain unchanged when setTrustedTarget called with gasLimit=0, got ${gasAfter}`);
  }

  console.log("TRACE_GOVERNOR_TARGET_CONTROLS: PASS");
}

main().catch((err) => {
  console.error("TRACE_GOVERNOR_TARGET_CONTROLS: FAIL");
  console.error(err);
  process.exit(1);
});
