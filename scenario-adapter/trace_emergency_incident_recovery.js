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

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const provider = createProvider(RPC_URL);
  const network = await provider.getNetwork();
  if (network.chainId !== 31337n) {
    throw new Error("trace_emergency_incident_recovery is local-only on 31337; it uses evm_increaseTime/evm_mine and cannot prove Base Sepolia parity yet");
  }
  const founder = new ethers.NonceManager(new ethers.Wallet(PRIVATE_KEY, provider));
  const founderAddress = await founder.getAddress();
  const emergencyAdmin = randomWallet(provider);
  const securityAdmin = randomWallet(provider);
  const recoveryApprover = randomWallet(provider);
  const recoveryApprover2 = randomWallet(provider);
  const recoveryApprover3 = randomWallet(provider);
  const outsider = randomWallet(provider);
  const emergencyAdminAddress = await emergencyAdmin.getAddress();
  const securityAdminAddress = await securityAdmin.getAddress();
  const recoveryApproverAddress = await recoveryApprover.getAddress();
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

  await fundEth(founder, [emergencyAdmin, securityAdmin, recoveryApprover, recoveryApprover2, recoveryApprover3, outsider]);
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
  await sendAndWait(
    access.connect(founder).grantRole(ROLE.RECOVERY_APPROVER_ROLE, recoveryApproverAddress, ethers.MaxUint256),
    "grantRole:RECOVERY_APPROVER_ROLE:recoveryApprover"
  );
  await sendAndWait(
    access.connect(founder).grantRole(ROLE.RECOVERY_APPROVER_ROLE, recoveryApprover2Address, ethers.MaxUint256),
    "grantRole:RECOVERY_APPROVER_ROLE:recoveryApprover2"
  );
  await sendAndWait(
    access.connect(founder).grantRole(ROLE.RECOVERY_APPROVER_ROLE, recoveryApprover3Address, ethers.MaxUint256),
    "grantRole:RECOVERY_APPROVER_ROLE:recoveryApprover3"
  );

  await expectStaticRevert(
    () => emergency.connect(outsider).freezeAssets.staticCall([1n], "nope"),
    "unauthorized:freezeAssets"
  );
  await sendAndWait(
    emergency.connect(securityAdmin).freezeAssets([1n, 2n], "security precaution"),
    "freezeAssets"
  );
  if (!(await emergency.isAssetFrozen(1n))) throw new Error("asset 1 should be frozen");
  if (!(await emergency.isAssetFrozen(2n))) throw new Error("asset 2 should be frozen");
  await sendAndWait(
    emergency.connect(securityAdmin).unfreezeAssets([1n, 2n]),
    "unfreezeAssets"
  );
  if (await emergency.isAssetFrozen(1n)) throw new Error("asset 1 should be unfrozen");

  const reportTx = await emergency.connect(founder).reportIncident(1, "smart contract bug");
  const reportRc = await sendAndWait(Promise.resolve(reportTx), "reportIncident:SMART_CONTRACT_BUG");
  const reportLog = reportRc.logs
    .map((log) => {
      try { return emergency.interface.parseLog(log); } catch { return null; }
    })
    .find((log) => log && log.name === "IncidentReported");
  if (!reportLog) throw new Error("IncidentReported event missing");
  const incidentId = reportLog.args.incidentId;

  const incident = await emergency.getIncident(incidentId);
  if (incident.incidentType !== 1n) throw new Error("incident type mismatch");

  await expectStaticRevert(
    () => emergency.connect(emergencyAdmin).startRecovery.staticCall(incidentId, [emergency.interface.encodeFunctionData("getEmergencyState")]),
    "startRecovery:needsApproval"
  );

  await sendAndWait(
    emergency.connect(recoveryApprover).approveRecovery(incidentId),
    "approveRecovery:1"
  );
  await sendAndWait(
    emergency.connect(recoveryApprover2).approveRecovery(incidentId),
    "approveRecovery:2"
  );
  await sendAndWait(
    emergency.connect(recoveryApprover3).approveRecovery(incidentId),
    "approveRecovery:3"
  );

  await sendAndWait(
    emergency.connect(emergencyAdmin).startRecovery(incidentId, [emergency.interface.encodeFunctionData("getEmergencyState")]),
    "startRecovery"
  );
  await provider.send("evm_increaseTime", [24 * 60 * 60 + 1]);
  await provider.send("evm_mine", []);
  await sendAndWait(
    emergency.connect(emergencyAdmin).executeRecoveryStep(incidentId, 0),
    "executeRecoveryStep:0"
  );
  const plan = await emergency.getRecoveryPlan(incidentId);
  if (plan[4] !== 3n) throw new Error("approval count should be 3");
  if (plan[5].length !== 1) throw new Error("recovery result count should be 1");

  await sendAndWait(
    emergency.connect(emergencyAdmin).completeRecovery(incidentId),
    "completeRecovery"
  );
  const resolvedIncident = await emergency.getIncident(incidentId);
  if (!resolvedIncident.resolved) throw new Error("incident should be resolved");

  console.log("TRACE_EMERGENCY_INCIDENT_RECOVERY: PASS");
}

main().catch((err) => {
  console.error("TRACE_EMERGENCY_INCIDENT_RECOVERY: FAIL");
  console.error(err);
  process.exit(1);
});
