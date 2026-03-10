#!/usr/bin/env node
"use strict";

const { ethers } = require("ethers");
const { bootstrapGovernance } = require("./bootstrap_local_governance");
const { loadArtifact, sendAndWait, expectRevert } = require("./lib/access_helpers");

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

  const calldata = mock.interface.encodeFunctionData("add", [20n, 22n]);
  const targets = [await mock.getAddress()];
  const values = [0n];
  const calldatas = [calldata];
  const predecessor = ethers.ZeroHash;
  const salt = ethers.id("timelock-state-consistency");
  const delay = await timelock.getMinDelay();
  const operationId = hashOperation(targets, values, calldatas, predecessor, salt, delay);

  await sendAndWait(
    timelock.schedule(1n, targets, values, calldatas, predecessor, salt, delay, { gasLimit: 4_000_000 }),
    "timelock:schedule"
  );

  if (!(await timelock.isOperationPending(operationId))) throw new Error("operation should start pending");
  if (await timelock.isOperationReady(operationId)) throw new Error("operation should not start ready");

  await expectRevert(
    timelock.execute(1n, targets, values, calldatas, predecessor, salt, delay, { gasLimit: 4_000_000 }),
    "timelock:execute:early"
  );

  await provider.send("evm_increaseTime", [Number(delay) + TIMESTAMP_BUFFER + 1]);
  await provider.send("evm_mine", []);

  const readyAfterDelay = await timelock.isOperationReady(operationId);
  const pendingAfterDelay = await timelock.isOperationPending(operationId);
  if (!readyAfterDelay) throw new Error("operation should be ready after delay");
  if (pendingAfterDelay) {
    throw new Error("logic issue: operation is simultaneously ready and pending after timestamp delay");
  }

  console.log("TRACE_GOVERNANCE_TIMELOCK_STATE_CONSISTENCY: PASS");
}

main().catch((err) => {
  console.error("TRACE_GOVERNANCE_TIMELOCK_STATE_CONSISTENCY: FAIL");
  console.error(err);
  process.exit(1);
});
