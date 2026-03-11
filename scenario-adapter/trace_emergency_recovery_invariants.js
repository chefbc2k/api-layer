#!/usr/bin/env node
"use strict";

const { ethers } = require("ethers");
require("dotenv").config();
const {
  ROLE,
  loadArtifact,
  createProvider,
  sendAndWait,
  expectRevert,
  randomWallet,
  fundEth
} = require("./lib/access_helpers");

const RPC_URL = process.env.RPC_URL;
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

async function expectStaticRevert(callFn, label) {
  let err;
  try {
    await callFn();
  } catch (e) {
    err = e;
  }
  if (!err) throw new Error(`${label}: expected revert`);
  const data = err?.data || err?.info?.error?.data || "<none>";
  console.log(`[expect-revert-ok] ${label} data=${data}`);
}

function plainRandomWallet(provider) {
  return ethers.Wallet.createRandom().connect(provider);
}

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const provider = createProvider(RPC_URL);
  const founder = new ethers.NonceManager(new ethers.Wallet(PRIVATE_KEY, provider));
  const founderAddress = await founder.getAddress();
  const emergencyAdmin = plainRandomWallet(provider);
  const securityAdmin = plainRandomWallet(provider);
  const recoveryApprover1 = plainRandomWallet(provider);
  const recoveryApprover2 = plainRandomWallet(provider);
  const recoveryApprover3 = plainRandomWallet(provider);

  const emergencyAdminAddress = await emergencyAdmin.getAddress();
  const securityAdminAddress = await securityAdmin.getAddress();
  const recoveryApprover1Address = await recoveryApprover1.getAddress();
  const recoveryApprover2Address = await recoveryApprover2.getAddress();
  const recoveryApprover3Address = await recoveryApprover3.getAddress();

  const access = new ethers.Contract(
    DIAMOND_ADDRESS,
    loadArtifact("out/AccessControlFacet.sol/AccessControlFacet.json").abi,
    provider
  );
  const emergency = new ethers.Contract(
    DIAMOND_ADDRESS,
    loadArtifact("out/EmergencyFacet.sol/EmergencyFacet.json").abi,
    provider
  );

  await fundEth(founder, [emergencyAdmin, securityAdmin, recoveryApprover1, recoveryApprover2, recoveryApprover3]);
  await sendAndWait(
    access.connect(founder).grantRole(ROLE.TIMELOCK_ROLE, founderAddress, ethers.MaxUint256),
    "grantRole:TIMELOCK_ROLE:founder"
  );
  await sendAndWait(
    access.connect(founder).grantRole(ROLE.EMERGENCY_ADMIN_ROLE, emergencyAdminAddress, ethers.MaxUint256),
    "grantRole:EMERGENCY_ADMIN_ROLE:emergencyAdmin"
  );
  await sendAndWait(
    access.connect(founder).grantRole(ROLE.SECURITY_ADMIN_ROLE, securityAdminAddress, ethers.MaxUint256),
    "grantRole:SECURITY_ADMIN_ROLE:securityAdmin"
  );
  for (const [label, addr] of [
    ["recoveryApprover1", recoveryApprover1Address],
    ["recoveryApprover2", recoveryApprover2Address],
    ["recoveryApprover3", recoveryApprover3Address]
  ]) {
    await sendAndWait(
      access.connect(founder).grantRole(ROLE.RECOVERY_APPROVER_ROLE, addr, ethers.MaxUint256),
      `grantRole:RECOVERY_APPROVER_ROLE:${label}`
    );
  }

  const incidentTx = await emergency.connect(founder).reportIncident(1, "recovery invariant incident");
  const incidentRc = await sendAndWait(Promise.resolve(incidentTx), "reportIncident:SMART_CONTRACT_BUG:invariant");
  const incidentLog = incidentRc.logs
    .map((log) => { try { return emergency.interface.parseLog(log); } catch { return null; } })
    .find((log) => log && log.name === "IncidentReported");
  const incidentId = incidentLog.args.incidentId;

  const stepA = emergency.interface.encodeFunctionData("getEmergencyState");
  const stepB = emergency.interface.encodeFunctionData("isEmergencyStopped");

  await sendAndWait(
    emergency.connect(recoveryApprover1).approveRecovery(incidentId),
    "approveRecovery:1"
  );
  await sendAndWait(
    emergency.connect(recoveryApprover2).approveRecovery(incidentId),
    "approveRecovery:2"
  );
  let plan = await emergency.getRecoveryPlan(incidentId);
  if (plan[1] !== false || plan[4] !== 2n) {
    throw new Error("recovery plan should not be governance-approved before the third approval");
  }
  await sendAndWait(
    emergency.connect(recoveryApprover3).approveRecovery(incidentId),
    "approveRecovery:3"
  );

  plan = await emergency.getRecoveryPlan(incidentId);
  if (plan[1] !== true || plan[4] !== 3n) {
    throw new Error("recovery plan should flip to governance-approved at min approvals");
  }

  await expectStaticRevert(
    () => emergency.connect(recoveryApprover1).approveRecovery.staticCall(incidentId),
    "approveRecovery:duplicate"
  );

  await sendAndWait(
    emergency.connect(emergencyAdmin).startRecovery(incidentId, [stepA, stepB]),
    "startRecovery:twoSteps"
  );
  plan = await emergency.getRecoveryPlan(incidentId);
  if (plan[0].length !== 2 || plan[5].length !== 0) {
    throw new Error("recovery plan should store two steps and zero results before execution");
  }

  await expectStaticRevert(
    () => emergency.connect(emergencyAdmin).executeRecoveryStep.staticCall(incidentId, 2),
    "executeRecoveryStep:outOfRange"
  );

  await expectRevert(
    () => emergency.connect(emergencyAdmin).executeRecoveryStep(incidentId, 0),
    "executeRecoveryStep:timelock"
  );

  await provider.send("evm_increaseTime", [24 * 60 * 60 + 1]);
  await provider.send("evm_mine", []);

  await sendAndWait(
    emergency.connect(emergencyAdmin).executeRecoveryStep(incidentId, 0),
    "executeRecoveryStep:0"
  );
  plan = await emergency.getRecoveryPlan(incidentId);
  if (plan[5].length !== 1) {
    throw new Error("exactly one recovery result should exist after the first executed step");
  }

  await expectStaticRevert(
    () => emergency.connect(emergencyAdmin).completeRecovery.staticCall(incidentId),
    "completeRecovery:beforeAllSteps"
  );

  await sendAndWait(
    emergency.connect(emergencyAdmin).executeRecoveryStep(incidentId, 1),
    "executeRecoveryStep:1"
  );
  plan = await emergency.getRecoveryPlan(incidentId);
  if (plan[5].length !== 2) {
    throw new Error("recovery results length should equal executed step count");
  }

  await sendAndWait(
    emergency.connect(emergencyAdmin).completeRecovery(incidentId),
    "completeRecovery:final"
  );
  const resolvedIncident = await emergency.getIncident(incidentId);
  if (!resolvedIncident.resolved) throw new Error("incident should resolve after completion");

  console.log("TRACE_EMERGENCY_RECOVERY_INVARIANTS: PASS");
}

main().catch((err) => {
  console.error("TRACE_EMERGENCY_RECOVERY_INVARIANTS: FAIL");
  console.error(err);
  process.exit(1);
});
