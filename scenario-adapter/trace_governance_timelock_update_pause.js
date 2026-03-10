#!/usr/bin/env node
"use strict";

const { ethers } = require("ethers");
const { bootstrapGovernance } = require("./bootstrap_local_governance");
const { ROLE, sendAndWait, expectRevert } = require("./lib/access_helpers");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const EXECUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("EXECUTOR_ROLE"));
const TIMESTAMP_BUFFER = 5 * 60;

async function main() {
  const { provider, founder, founderAddress, diamondAddress, access, emergency, timelock } = await bootstrapGovernance(RPC_URL);

  if (!(await access.hasRole(EXECUTOR_ROLE, founderAddress))) {
    await sendAndWait(access.grantRole(EXECUTOR_ROLE, founderAddress, ethers.MaxUint256), "grantRole:EXECUTOR_ROLE:founder");
  }
  if (!(await access.hasRole(ROLE.EMERGENCY_ADMIN_ROLE, founderAddress))) {
    await sendAndWait(access.grantRole(ROLE.EMERGENCY_ADMIN_ROLE, founderAddress, ethers.MaxUint256), "grantRole:EMERGENCY_ADMIN_ROLE:founder");
  }

  const currentDelay = await timelock.getMinDelay();
  const newDelay = currentDelay + 86400n;
  const timelockIface = timelock.interface;
  const targets = [diamondAddress];
  const values = [0n];
  const calldatas = [timelockIface.encodeFunctionData("updateMinDelay", [newDelay])];
  const predecessor = ethers.ZeroHash;
  const salt = ethers.id("timelock-update-min-delay");

  await expectRevert(
    timelock.updateMinDelay(newDelay, { gasLimit: 1_000_000 }),
    "timelock:updateMinDelay:direct"
  );

  await sendAndWait(
    timelock.schedule(20n, targets, values, calldatas, predecessor, salt, currentDelay, { gasLimit: 4_000_000 }),
    "timelock:schedule:updateMinDelay"
  );

  await sendAndWait(emergency.emergencyStop({ gasLimit: 1_000_000 }), "emergency:stop");

  await expectRevert(
    timelock.execute(20n, targets, values, calldatas, predecessor, salt, currentDelay, { gasLimit: 4_000_000 }),
    "timelock:execute:paused"
  );
  await expectRevert(
    timelock.schedule(21n, targets, values, calldatas, predecessor, ethers.id("timelock-schedule-paused"), currentDelay, { gasLimit: 4_000_000 }),
    "timelock:schedule:paused"
  );

  await sendAndWait(emergency.emergencyResume({ gasLimit: 1_000_000 }), "emergency:resume");

  await provider.send("evm_increaseTime", [Number(currentDelay) + TIMESTAMP_BUFFER + 1]);
  await provider.send("evm_mine", []);

  await sendAndWait(
    timelock.execute(20n, targets, values, calldatas, predecessor, salt, currentDelay, { gasLimit: 4_000_000 }),
    "timelock:execute:updateMinDelay"
  );

  if ((await timelock.getMinDelay()) !== newDelay) throw new Error("timelock min delay should update through timelocked self-call");

  console.log("TRACE_GOVERNANCE_TIMELOCK_UPDATE_PAUSE: PASS");
}

main().catch((err) => {
  console.error("TRACE_GOVERNANCE_TIMELOCK_UPDATE_PAUSE: FAIL");
  console.error(err);
  process.exit(1);
});
