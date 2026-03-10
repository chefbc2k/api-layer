#!/usr/bin/env node
"use strict";

const { ethers } = require("ethers");
require("dotenv").config();
const {
  ROLE,
  loadArtifact,
  createProvider,
  sendAndWait,
  advanceTime,
  randomWallet,
  fundEth
} = require("./lib/access_helpers");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
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
  const founder = new ethers.NonceManager(new ethers.Wallet(PRIVATE_KEY, provider));
  const founderAddress = await founder.getAddress();
  const timelock = randomWallet(provider);
  const emergencyAdmin = randomWallet(provider);
  const securityAdmin = randomWallet(provider);
  const recoveryApprover = randomWallet(provider);
  const recoveryApprover2 = randomWallet(provider);
  const recoveryApprover3 = randomWallet(provider);
  const outsider = randomWallet(provider);

  const timelockAddress = await timelock.getAddress();
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

  await fundEth(founder, [timelock, emergencyAdmin, securityAdmin, recoveryApprover, recoveryApprover2, recoveryApprover3, outsider]);
  let timelockGranter = founder;
  if (!(await access.hasRole(ROLE.TIMELOCK_ROLE, founderAddress))) {
    await sendAndWait(
      access.connect(founder).grantRole(ROLE.TIMELOCK_ROLE, timelockAddress, ethers.MaxUint256),
      "grantRole:TIMELOCK_ROLE:timelock"
    );
    timelockGranter = timelock;
  }
  await sendAndWait(
    access.connect(timelockGranter).grantRole(ROLE.EMERGENCY_ADMIN_ROLE, emergencyAdminAddress, ethers.MaxUint256),
    "grantRole:EMERGENCY_ADMIN_ROLE:emergencyAdmin"
  );
  await sendAndWait(
    access.connect(timelockGranter).grantRole(ROLE.SECURITY_ADMIN_ROLE, securityAdminAddress, ethers.MaxUint256),
    "grantRole:SECURITY_ADMIN_ROLE:securityAdmin"
  );
  await sendAndWait(
    access.connect(timelockGranter).grantRole(ROLE.RECOVERY_APPROVER_ROLE, recoveryApproverAddress, ethers.MaxUint256),
    "grantRole:RECOVERY_APPROVER_ROLE:recoveryApprover"
  );
  await sendAndWait(
    access.connect(timelockGranter).grantRole(ROLE.RECOVERY_APPROVER_ROLE, recoveryApprover2Address, ethers.MaxUint256),
    "grantRole:RECOVERY_APPROVER_ROLE:recoveryApprover2"
  );
  await sendAndWait(
    access.connect(timelockGranter).grantRole(ROLE.RECOVERY_APPROVER_ROLE, recoveryApprover3Address, ethers.MaxUint256),
    "grantRole:RECOVERY_APPROVER_ROLE:recoveryApprover3"
  );

  await expectStaticRevert(
    () => emergency.connect(founder).reportIncident.staticCall(5, "gov attack by owner only"),
    "reportIncident:governanceAttack:ownerWithoutEmergencyAdmin"
  );
  await sendAndWait(
    access.connect(timelockGranter).grantRole(ROLE.EMERGENCY_ADMIN_ROLE, founderAddress, ethers.MaxUint256),
    "grantRole:EMERGENCY_ADMIN_ROLE:founder"
  );
  const govAttackTx = await emergency.connect(founder).reportIncident(5, "governance attack");
  const govAttackRc = await sendAndWait(Promise.resolve(govAttackTx), "reportIncident:GOVERNANCE_ATTACK");
  const govAttackLog = govAttackRc.logs
    .map((log) => { try { return emergency.interface.parseLog(log); } catch { return null; } })
    .find((log) => log && log.name === "IncidentReported");
  if (!govAttackLog) throw new Error("governance attack incident event missing");

  const comboTx = await emergency.connect(founder).reportIncident(0, "combo response");
  const comboRc = await sendAndWait(Promise.resolve(comboTx), "reportIncident:combo");
  const comboLog = comboRc.logs
    .map((log) => { try { return emergency.interface.parseLog(log); } catch { return null; } })
    .find((log) => log && log.name === "IncidentReported");
  const comboIncidentId = comboLog.args.incidentId;
  await sendAndWait(
    emergency.connect(emergencyAdmin).executeResponse(comboIncidentId, [0, 2, 3]),
    "executeResponse:combo"
  );
  if ((await emergency.getEmergencyState()) !== 3n) throw new Error("final state should be RECOVERY after combo response");

  const failingTx = await emergency.connect(founder).reportIncident(1, "failing recovery");
  const failingRc = await sendAndWait(Promise.resolve(failingTx), "reportIncident:failingRecovery");
  const failingLog = failingRc.logs
    .map((log) => { try { return emergency.interface.parseLog(log); } catch { return null; } })
    .find((log) => log && log.name === "IncidentReported");
  const failingIncidentId = failingLog.args.incidentId;
  await sendAndWait(
    emergency.connect(recoveryApprover).approveRecovery(failingIncidentId),
    "approveRecovery:failingIncident:1"
  );
  await sendAndWait(
    emergency.connect(recoveryApprover2).approveRecovery(failingIncidentId),
    "approveRecovery:failingIncident:2"
  );
  await sendAndWait(
    emergency.connect(recoveryApprover3).approveRecovery(failingIncidentId),
    "approveRecovery:failingIncident:3"
  );
  await sendAndWait(
    emergency.connect(emergencyAdmin).startRecovery(failingIncidentId, ["0x12345678"]),
    "startRecovery:failingIncident"
  );
  await advanceTime(provider, 24 * 60 * 60 + 1);
  await expectStaticRevert(
    () => emergency.connect(emergencyAdmin).executeRecoveryStep.staticCall(failingIncidentId, 0),
    "executeRecoveryStep:failurePath"
  );

  await sendAndWait(
    emergency.connect(emergencyAdmin).emergencyStop(),
    "emergencyStop:permissionlessCheck"
  );
  await advanceTime(provider, 48 * 60 * 60 + 1);
  await expectStaticRevert(
    () => emergency.connect(outsider).emergencyResume.staticCall(),
    "emergencyResume:outsiderBlockedAfterTimeout"
  );
  await sendAndWait(
    emergency.connect(timelock).emergencyResume(),
    "emergencyResume:timelockAfterTimeout"
  );
  if ((await emergency.getEmergencyState()) !== 0n) throw new Error("state should return to NORMAL after timelock resume");

  await sendAndWait(
    emergency.connect(emergencyAdmin).emergencyStop(),
    "emergencyStop:extendedWindowCheck"
  );
  await sendAndWait(
    emergency.connect(securityAdmin).extendPausedUntil(BigInt((await provider.getBlock("latest")).timestamp + 3 * 24 * 60 * 60)),
    "extendPausedUntil:edgePack"
  );
  await advanceTime(provider, 2 * 24 * 60 * 60);
  await expectStaticRevert(
    () => emergency.connect(outsider).emergencyResume.staticCall(),
    "emergencyResume:outsiderBlockedBeforeExtendedWindow"
  );
  await advanceTime(provider, 4 * 24 * 60 * 60);
  await expectStaticRevert(
    () => emergency.connect(outsider).emergencyResume.staticCall(),
    "emergencyResume:outsiderBlockedAfterExtendedWindow"
  );
  await sendAndWait(
    emergency.connect(timelock).emergencyResume(),
    "emergencyResume:timelockAfterExtendedWindow"
  );

  console.log("TRACE_EMERGENCY_EDGE_PACK: PASS");
}

main().catch((err) => {
  console.error("TRACE_EMERGENCY_EDGE_PACK: FAIL");
  console.error(err);
  process.exit(1);
});
