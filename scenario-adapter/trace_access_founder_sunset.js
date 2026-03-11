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
  const founder = new ethers.NonceManager(new ethers.Wallet(PRIVATE_KEY, provider));
  const founderAddress = await founder.getAddress();
  const timelockUser = randomWallet(provider);
  const adminUser = randomWallet(provider);
  const outsider = randomWallet(provider);
  const timelockUserAddress = await timelockUser.getAddress();
  const adminUserAddress = await adminUser.getAddress();

  const access = new ethers.Contract(
    DIAMOND_ADDRESS,
    loadArtifact("out/AccessControlFacet.sol/AccessControlFacet.json").abi,
    provider
  );

  await fundEth(founder, [timelockUser, adminUser, outsider]);

  await sendAndWait(
    access.connect(founder).grantRole(ROLE.TIMELOCK_ROLE, timelockUserAddress, ethers.MaxUint256),
    "grantRole:TIMELOCK_ROLE:timelockUser"
  );
  const executeAt = BigInt((await provider.getBlock("latest")).timestamp + 10);
  await expectStaticRevert(
    () => access.connect(outsider).scheduleFounderSunset.staticCall(executeAt),
    "unauthorized:scheduleFounderSunset"
  );
  await sendAndWait(
    access.connect(timelockUser).scheduleFounderSunset(executeAt),
    "scheduleFounderSunset"
  );

  await expectStaticRevert(
    () => access.connect(timelockUser).executeFounderSunset.staticCall(),
    "executeFounderSunset:tooEarly"
  );

  while ((await provider.getBlock("latest")).timestamp <= Number(executeAt)) {
    await advanceTime(provider, 1);
  }
  await sendAndWait(
    access.connect(timelockUser).executeFounderSunset({ gasLimit: 3_000_000 }),
    "executeFounderSunset"
  );

  if (!(await access.isFounderSunsetActive())) throw new Error("founder sunset should be active after execution");
  if (await access.hasRole(ROLE.FOUNDER_ROLE, founderAddress)) throw new Error("founder role should be removed after sunset");
  if ((await access.getRoleMembers(ROLE.FOUNDER_ROLE)).length !== 0) {
    throw new Error("founder member list should be empty after sunset");
  }

  if ((await access.getRoleAdmin(ROLE.PLATFORM_ADMIN_ROLE)).toLowerCase() !== ROLE.TIMELOCK_ROLE.toLowerCase()) {
    throw new Error("platform admin role admin should shift to timelock after sunset");
  }
  if ((await access.getRoleAdmin(ROLE.TIMELOCK_ROLE)).toLowerCase() !== ROLE.TIMELOCK_ROLE.toLowerCase()) {
    throw new Error("timelock role should become self-admin after sunset");
  }

  await expectStaticRevert(
    () => access.connect(founder).setDefaultValidityPeriod.staticCall(3600),
    "founderBlocked:setDefaultValidityPeriod:afterSunset"
  );
  await sendAndWait(
    access.connect(timelockUser).grantRole(
      ROLE.PLATFORM_ADMIN_ROLE,
      adminUserAddress,
      ethers.MaxUint256
    ),
    "grantRole:PLATFORM_ADMIN_ROLE:postSunsetByTimelock"
  );
  if (!(await access.hasRole(ROLE.PLATFORM_ADMIN_ROLE, adminUserAddress))) {
    throw new Error("timelock should be able to grant platform admin after sunset");
  }
  await expectStaticRevert(
    () => access.connect(founder).grantRole.staticCall(ROLE.PLATFORM_ADMIN_ROLE, outsider.address, ethers.MaxUint256),
    "founderBlocked:grantRole:postSunset"
  );

  console.log("TRACE_ACCESS_FOUNDER_SUNSET: PASS");
}

main().catch((err) => {
  console.error("TRACE_ACCESS_FOUNDER_SUNSET: FAIL");
  console.error(err);
  process.exit(1);
});
