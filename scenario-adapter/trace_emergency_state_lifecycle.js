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
  const emergencyAdmin = randomWallet(provider);
  const securityAdmin = randomWallet(provider);
  const outsider = randomWallet(provider);
  const emergencyAdminAddress = await emergencyAdmin.getAddress();
  const securityAdminAddress = await securityAdmin.getAddress();

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

  if ((await emergency.getEmergencyState()) !== 0n) throw new Error("initial emergency state should be NORMAL");

  await fundEth(founder, [emergencyAdmin, securityAdmin, outsider]);
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
  await expectStaticRevert(
    () => emergency.connect(outsider).emergencyStop.staticCall(),
    "unauthorized:emergencyStop"
  );
  await sendAndWait(
    emergency.connect(emergencyAdmin).emergencyStop(),
    "emergencyStop"
  );
  if ((await emergency.getEmergencyState()) !== 1n) throw new Error("state should be PAUSED after emergencyStop");
  if (!(await emergency.isEmergencyStopped())) throw new Error("isEmergencyStopped should be true after pause");

  await expectStaticRevert(
    () => emergency.connect(emergencyAdmin).emergencyStop.staticCall(),
    "double:emergencyStop"
  );

  const latest = await provider.getBlock("latest");
  await expectStaticRevert(
    () => emergency.connect(securityAdmin).extendPausedUntil.staticCall(BigInt(latest.timestamp + 60 * 60 * 24 * 8)),
    "extendPausedUntil:tooFar"
  );
  await sendAndWait(
    emergency.connect(securityAdmin).extendPausedUntil(BigInt(latest.timestamp + 60 * 60 * 24 * 3)),
    "extendPausedUntil"
  );

  const resumeAt = BigInt(latest.timestamp + 60 * 60);
  await expectStaticRevert(
    () => emergency.connect(outsider).scheduleEmergencyResume.staticCall(resumeAt),
    "unauthorized:scheduleEmergencyResume"
  );
  await sendAndWait(
    emergency.connect(founder).scheduleEmergencyResume(resumeAt),
    "scheduleEmergencyResume"
  );
  await expectStaticRevert(
    () => emergency.connect(founder).executeScheduledResume.staticCall(),
    "executeScheduledResume:tooEarly"
  );

  await advanceTime(provider, 60 * 60 + 1);
  await sendAndWait(
    emergency.connect(founder).executeScheduledResume(),
    "executeScheduledResume"
  );
  if ((await emergency.getEmergencyState()) !== 0n) throw new Error("state should be NORMAL after scheduled resume");

  await sendAndWait(
    emergency.connect(emergencyAdmin).triggerEmergency(2, "lockdown"),
    "triggerEmergency:LOCKED_DOWN"
  );
  if ((await emergency.getEmergencyState()) !== 2n) throw new Error("state should be LOCKED_DOWN");
  await sendAndWait(
    emergency.connect(emergencyAdmin).emergencyResume(),
    "emergencyResume"
  );
  if ((await emergency.getEmergencyState()) !== 0n) throw new Error("state should return to NORMAL after resume");

  console.log("TRACE_EMERGENCY_STATE_LIFECYCLE: PASS");
}

main().catch((err) => {
  console.error("TRACE_EMERGENCY_STATE_LIFECYCLE: FAIL");
  console.error(err);
  process.exit(1);
});
