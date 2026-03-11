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

const RPC_URL = process.env.RPC_URL;
const TIMELOCK_ADDRESS = process.env.TIMELOCK_ADDRESS;
const TARGET_ADDRESS = process.env.TARGET_ADDRESS;
const MNEMONIC = process.env.MNEMONIC || "test test test test test test test test test test test junk";

function walletAt(provider, index) {
  return new ethers.NonceManager(
    ethers.HDNodeWallet.fromPhrase(MNEMONIC, undefined, `m/44'/60'/0'/0/${index}`).connect(provider)
  );
}

async function main() {
  if (!TIMELOCK_ADDRESS) throw new Error("TIMELOCK_ADDRESS is required");
  if (!TARGET_ADDRESS) throw new Error("TARGET_ADDRESS is required");

  const provider = createProvider(RPC_URL);
  const founder = walletAt(provider, 0);
  const proposer = walletAt(provider, 1);
  const executor = walletAt(provider, 2);
  const outsider = walletAt(provider, 3);

  const timelockArtifact = loadArtifact("out/TimeLock.sol/TimeLock.json");
  const dummyArtifact = loadArtifact("out/DummyContract.sol/DummyContract.json");

  const timelock = new ethers.Contract(TIMELOCK_ADDRESS, timelockArtifact.abi, provider);
  const target = new ethers.Contract(TARGET_ADDRESS, dummyArtifact.abi, provider);

  if ((await timelock.getMinDelay()) !== 24n * 60n * 60n) {
    throw new Error("timelock min delay should be 1 day");
  }

  const newOwner = await outsider.getAddress();
  const calldata = target.interface.encodeFunctionData("transferOwnership", [newOwner]);
  const predecessor = ethers.ZeroHash;
  const salt = ethers.id("timelock-lifecycle");
  const delay = 24 * 60 * 60;
  const operationId = await timelock.hashOperation(TARGET_ADDRESS, 0, calldata, predecessor, salt);

  await expectRevert(
    () => timelock.connect(outsider).schedule.staticCall(TARGET_ADDRESS, 0, calldata, predecessor, salt, delay),
    "timelock:outsiderSchedule"
  );

  await sendAndWait(
    timelock.connect(proposer).schedule(TARGET_ADDRESS, 0, calldata, predecessor, salt, delay, { gasLimit: 1_500_000 }),
    "timelock:schedule"
  );

  if (!(await timelock.isOperationPending(operationId))) {
    throw new Error("operation should be pending after schedule");
  }

  await expectRevert(
    () => timelock.connect(executor).execute.staticCall(TARGET_ADDRESS, 0, calldata, predecessor, salt),
    "timelock:executeTooEarly"
  );

  await advanceTime(provider, delay + 1);

  await sendAndWait(
    timelock.connect(executor).execute(TARGET_ADDRESS, 0, calldata, predecessor, salt, { gasLimit: 1_500_000 }),
    "timelock:execute"
  );

  if ((await target.owner()).toLowerCase() !== newOwner.toLowerCase()) {
    throw new Error("target owner should change after timelock execution");
  }
  if (!(await timelock.isOperationDone(operationId))) {
    throw new Error("operation should be done after execute");
  }

  const secondOwner = await founder.getAddress();
  const cancelCalldata = target.interface.encodeFunctionData("transferOwnership", [secondOwner]);
  const cancelSalt = ethers.id("timelock-cancel");
  const cancelId = await timelock.hashOperation(TARGET_ADDRESS, 0, cancelCalldata, predecessor, cancelSalt);
  await sendAndWait(
    timelock.connect(proposer).schedule(TARGET_ADDRESS, 0, cancelCalldata, predecessor, cancelSalt, delay, { gasLimit: 1_500_000 }),
    "timelock:scheduleCancel"
  );
  await sendAndWait(
    timelock.connect(proposer).cancel(cancelId, { gasLimit: 500_000 }),
    "timelock:cancel"
  );
  if (await timelock.isOperationPending(cancelId)) {
    throw new Error("cancelled operation should not remain pending");
  }
  await advanceTime(provider, delay + 1);
  await expectRevert(
    () => timelock.connect(executor).execute.staticCall(TARGET_ADDRESS, 0, cancelCalldata, predecessor, cancelSalt),
    "timelock:executeCancelled"
  );

  console.log("TRACE_TIMELOCK_LIFECYCLE: PASS");
}

main().catch((err) => {
  console.error("TRACE_TIMELOCK_LIFECYCLE: FAIL");
  console.error(err);
  process.exit(1);
});
