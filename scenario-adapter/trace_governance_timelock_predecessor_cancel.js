#!/usr/bin/env node
"use strict";

const { ethers } = require("ethers");
const { bootstrapGovernance } = require("./bootstrap_local_governance");
const { loadArtifact, sendAndWait } = require("./lib/access_helpers");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const EXECUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("EXECUTOR_ROLE"));
const TIMESTAMP_BUFFER = 5 * 60;

function hashOperation(targets, values, calldatas, predecessor, salt, delay) {
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address[]", "uint256[]", "bytes[]", "bytes32", "bytes32", "uint256"],
      [targets, values, calldatas, predecessor, salt, delay]
    )
  );
}

async function main() {
  const { provider, founder, founderAddress, diamondAddress, access, timelock } = await bootstrapGovernance(RPC_URL);
  const mockArtifact = loadArtifact("out/MockContract.sol/MockContract.json");
  const mock = await new ethers.ContractFactory(mockArtifact.abi, mockArtifact.bytecode.object, founder).deploy();
  await mock.waitForDeployment();
  if (!(await access.hasRole(EXECUTOR_ROLE, founderAddress))) {
    await sendAndWait(access.grantRole(EXECUTOR_ROLE, founderAddress, ethers.MaxUint256), "grantRole:EXECUTOR_ROLE:founder");
  }

  const delay = await timelock.getMinDelay();
  const targets = [await mock.getAddress()];
  const values = [0n];
  const calldataA = mock.interface.encodeFunctionData("add", [5n, 6n]);
  const calldataB = mock.interface.encodeFunctionData("add", [10n, 12n]);
  const saltA = ethers.id("timelock-predecessor-a");
  const saltB = ethers.id("timelock-predecessor-b");
  const opA = hashOperation(targets, values, [calldataA], ethers.ZeroHash, saltA, delay);
  const opB = hashOperation(targets, values, [calldataB], opA, saltB, delay);

  await sendAndWait(
    timelock.schedule(10n, targets, values, [calldataA], ethers.ZeroHash, saltA, delay, { gasLimit: 4_000_000 }),
    "timelock:schedule:A"
  );
  await sendAndWait(
    timelock.schedule(11n, targets, values, [calldataB], opA, saltB, delay, { gasLimit: 4_000_000 }),
    "timelock:schedule:B"
  );

  await provider.send("evm_increaseTime", [Number(delay) + TIMESTAMP_BUFFER + 1]);
  await provider.send("evm_mine", []);

  let executedBeforePredecessor = false;
  try {
    await sendAndWait(
      timelock.execute(11n, targets, values, [calldataB], opA, saltB, delay, { gasLimit: 4_000_000 }),
      "timelock:execute:B-before-A"
    );
    executedBeforePredecessor = true;
  } catch {}

  if (executedBeforePredecessor) {
    throw new Error("logic issue: timelock executed predecessor-gated operation before predecessor completion");
  }

  await sendAndWait(
    timelock.cancel(12n, targets, values, [calldataA], ethers.ZeroHash, saltA, delay, { gasLimit: 4_000_000 }),
    "timelock:cancel:A"
  );

  if (await timelock.isOperationPending(opA)) throw new Error("canceled operation should not stay pending");

  await sendAndWait(
    timelock.schedule(12n, targets, values, [calldataA], ethers.ZeroHash, saltA, delay, { gasLimit: 4_000_000 }),
    "timelock:reschedule:A"
  );

  console.log("TRACE_GOVERNANCE_TIMELOCK_PREDECESSOR_CANCEL: PASS");
}

main().catch((err) => {
  console.error("TRACE_GOVERNANCE_TIMELOCK_PREDECESSOR_CANCEL: FAIL");
  console.error(err);
  process.exit(1);
});
