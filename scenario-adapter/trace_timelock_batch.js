#!/usr/bin/env node
"use strict";

const { ethers } = require("ethers");
require("dotenv").config();
const {
  loadArtifact,
  createProvider,
  sendAndWait,
  expectRevert,
  advanceTime
} = require("./lib/access_helpers");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const MNEMONIC = process.env.MNEMONIC || "test test test test test test test test test test test junk";

function walletAt(provider, index) {
  return new ethers.NonceManager(
    ethers.HDNodeWallet.fromPhrase(MNEMONIC, undefined, `m/44'/60'/0'/0/${index}`).connect(provider)
  );
}

async function main() {
  const provider = createProvider(RPC_URL);
  const founder = walletAt(provider, 0);
  const proposer = walletAt(provider, 1);
  const executor = walletAt(provider, 2);
  const receiverA = await walletAt(provider, 3).getAddress();
  const receiverB = await walletAt(provider, 4).getAddress();

  const timelockArtifact = loadArtifact("out/TimeLock.sol/TimeLock.json");
  const dummyArtifact = loadArtifact("out/DummyContract.sol/DummyContract.json");

  const timelock = await new ethers.ContractFactory(
    timelockArtifact.abi,
    timelockArtifact.bytecode.object,
    founder
  ).deploy(2 * 24 * 60 * 60, [await proposer.getAddress()], [await executor.getAddress()], await founder.getAddress());
  await timelock.waitForDeployment();

  const targetA = await new ethers.ContractFactory(
    dummyArtifact.abi,
    dummyArtifact.bytecode.object,
    founder
  ).deploy();
  await targetA.waitForDeployment();
  const targetB = await new ethers.ContractFactory(
    dummyArtifact.abi,
    dummyArtifact.bytecode.object,
    founder
  ).deploy();
  await targetB.waitForDeployment();

  await sendAndWait(
    targetA.connect(founder).transferOwnership(await timelock.getAddress(), { gasLimit: 500_000 }),
    "targetA:transferOwnershipToTimelock"
  );
  await sendAndWait(
    targetB.connect(founder).transferOwnership(await timelock.getAddress(), { gasLimit: 500_000 }),
    "targetB:transferOwnershipToTimelock"
  );

  const targets = [await targetA.getAddress(), await targetB.getAddress()];
  const values = [0, 0];
  const calldatas = [
    targetA.interface.encodeFunctionData("transferOwnership", [receiverA]),
    targetB.interface.encodeFunctionData("transferOwnership", [receiverB])
  ];
  const predecessor = ethers.ZeroHash;
  const salt = ethers.id("timelock-batch");
  const delay = 2 * 24 * 60 * 60;
  const batchId = await timelock.hashOperationBatch(targets, values, calldatas, predecessor, salt);

  await sendAndWait(
    timelock.connect(proposer).scheduleBatch(targets, values, calldatas, predecessor, salt, delay, { gasLimit: 2_500_000 }),
    "timelock:scheduleBatch"
  );

  if (!(await timelock.isOperationPending(batchId))) {
    throw new Error("batch should be pending after schedule");
  }

  await expectRevert(
    () => timelock.connect(executor).executeBatch.staticCall(targets, values, calldatas, predecessor, salt),
    "timelock:executeBatchTooEarly"
  );

  await advanceTime(provider, delay + 1);

  await sendAndWait(
    timelock.connect(executor).executeBatch(targets, values, calldatas, predecessor, salt, { gasLimit: 2_500_000 }),
    "timelock:executeBatch"
  );

  if ((await targetA.owner()).toLowerCase() !== receiverA.toLowerCase()) {
    throw new Error("targetA owner should change after batch execution");
  }
  if ((await targetB.owner()).toLowerCase() !== receiverB.toLowerCase()) {
    throw new Error("targetB owner should change after batch execution");
  }
  if (!(await timelock.isOperationDone(batchId))) {
    throw new Error("batch should be done after execute");
  }

  console.log("TRACE_TIMELOCK_BATCH: PASS");
}

main().catch((err) => {
  console.error("TRACE_TIMELOCK_BATCH: FAIL");
  console.error(err);
  process.exit(1);
});
