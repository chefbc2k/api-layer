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
  fundEth,
  asSet
} = require("./lib/access_helpers");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

function containsAddress(list, target) {
  return list.map((item) => item.toLowerCase()).includes(target.toLowerCase());
}

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const provider = createProvider(RPC_URL);
  const founder = new ethers.NonceManager(new ethers.Wallet(PRIVATE_KEY, provider));
  const founderAddress = await founder.getAddress();
  const userA = randomWallet(provider);
  const userB = randomWallet(provider);
  const outsider = randomWallet(provider);
  const userAAddress = await userA.getAddress();
  const userBAddress = await userB.getAddress();

  const access = new ethers.Contract(
    DIAMOND_ADDRESS,
    loadArtifact("out/AccessControlFacet.sol/AccessControlFacet.json").abi,
    provider
  );

  await fundEth(founder, [userA, userB, outsider]);

  await expectRevert(
    () => access.connect(outsider).grantRole(ROLE.TIMELOCK_ROLE, userAAddress, ethers.MaxUint256),
    "unauthorized:grantRole:TIMELOCK_ROLE"
  );

  await sendAndWait(
    access.connect(founder).grantRole(ROLE.TIMELOCK_ROLE, founderAddress, ethers.MaxUint256),
    "grantRole:TIMELOCK_ROLE:founder"
  );
  if (!(await access.hasRole(ROLE.TIMELOCK_ROLE, founderAddress))) throw new Error("founder should receive TIMELOCK_ROLE");

  await sendAndWait(
    access.connect(founder).grantRole(ROLE.PLATFORM_ADMIN_ROLE, founderAddress, ethers.MaxUint256),
    "grantRole:PLATFORM_ADMIN_ROLE:founder"
  );
  if (!(await access.hasRole(ROLE.PLATFORM_ADMIN_ROLE, founderAddress))) {
    throw new Error("founder should receive PLATFORM_ADMIN_ROLE");
  }

  await sendAndWait(
    access.connect(founder).grantRole(ROLE.MARKETPLACE_ADMIN_ROLE, userAAddress, ethers.MaxUint256),
    "grantRole:MARKETPLACE_ADMIN_ROLE:userA"
  );
  if (!(await access.hasRole(ROLE.MARKETPLACE_ADMIN_ROLE, userAAddress))) {
    throw new Error("userA should receive MARKETPLACE_ADMIN_ROLE");
  }
  let userARoles = asSet(await access.getUserRoles(userAAddress));
  if (!userARoles.has(ROLE.MARKETPLACE_ADMIN_ROLE.toLowerCase())) throw new Error("userA role list should include MARKETPLACE_ADMIN_ROLE");
  let marketplaceAdmins = await access.getRoleMembers(ROLE.MARKETPLACE_ADMIN_ROLE);
  if (!containsAddress(marketplaceAdmins, userAAddress)) throw new Error("marketplace admin member list should include userA");

  await sendAndWait(
    access.connect(founder).revokeRole(ROLE.MARKETPLACE_ADMIN_ROLE, userAAddress, "cleanup"),
    "revokeRole:MARKETPLACE_ADMIN_ROLE:userA"
  );
  if (await access.hasRole(ROLE.MARKETPLACE_ADMIN_ROLE, userAAddress)) {
    throw new Error("userA marketplace admin role should be revoked");
  }
  userARoles = asSet(await access.getUserRoles(userAAddress));
  if (userARoles.has(ROLE.MARKETPLACE_ADMIN_ROLE.toLowerCase())) {
    throw new Error("userA role list should not include revoked MARKETPLACE_ADMIN_ROLE");
  }
  marketplaceAdmins = await access.getRoleMembers(ROLE.MARKETPLACE_ADMIN_ROLE);
  if (containsAddress(marketplaceAdmins, userAAddress)) throw new Error("marketplace admin member list should remove revoked userA");

  await sendAndWait(
    access.connect(founder).grantRole(ROLE.MARKETPLACE_ADMIN_ROLE, userAAddress, ethers.MaxUint256),
    "grantRole:MARKETPLACE_ADMIN_ROLE:userA:renounce"
  );
  await sendAndWait(access.connect(userA).renounceRole(ROLE.MARKETPLACE_ADMIN_ROLE), "renounceRole:MARKETPLACE_ADMIN_ROLE:userA");
  if (await access.hasRole(ROLE.MARKETPLACE_ADMIN_ROLE, userAAddress)) {
    throw new Error("userA marketplace admin role should be renounced");
  }
  const marketplaceAdminsAfterRenounce = await access.getRoleMembers(ROLE.MARKETPLACE_ADMIN_ROLE);
  if (containsAddress(marketplaceAdminsAfterRenounce, userAAddress)) {
    throw new Error("marketplace admin member list should remove renounced userA");
  }

  const now = (await provider.getBlock("latest")).timestamp;
  const expiry = BigInt(now + 300);
  await sendAndWait(
    access.connect(founder).grantRole(ROLE.MARKETPLACE_ADMIN_ROLE, userBAddress, expiry),
    "grantRole:MARKETPLACE_ADMIN_ROLE:userB:expiring"
  );
  if (!(await access.hasRole(ROLE.MARKETPLACE_ADMIN_ROLE, userBAddress))) throw new Error("userB should receive expiring marketplace admin role");

  await advanceTime(provider, 301);
  if (await access.hasRole(ROLE.MARKETPLACE_ADMIN_ROLE, userBAddress)) {
    throw new Error("expired role should not remain active");
  }
  const userBRoles = asSet(await access.getUserRoles(userBAddress));
  if (userBRoles.has(ROLE.MARKETPLACE_ADMIN_ROLE.toLowerCase())) {
    throw new Error("expired role should not appear in getUserRoles");
  }

  const marketplaceAdminsAfterExpiry = await access.getRoleMembers(ROLE.MARKETPLACE_ADMIN_ROLE);
  if (containsAddress(marketplaceAdminsAfterExpiry, userBAddress)) {
    throw new Error("expired role should not remain in getRoleMembers");
  }

  console.log("TRACE_ACCESS_ROLE_LIFECYCLE: PASS");
}

main().catch((err) => {
  console.error("TRACE_ACCESS_ROLE_LIFECYCLE: FAIL");
  console.error(err);
  process.exit(1);
});
