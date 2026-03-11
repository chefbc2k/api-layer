#!/usr/bin/env node
"use strict";

const { ethers } = require("ethers");
require("dotenv").config();
const {
  ROLE,
  loadArtifact,
  createProvider,
  asSet
} = require("./lib/access_helpers");

const RPC_URL = process.env.RPC_URL;
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const OWNER_OPERATIONAL_ROLES = [
  ROLE.VOICE_OPERATOR_ROLE,
  ROLE.LICENSE_MANAGER_ROLE,
  ROLE.ROYALTY_MANAGER_ROLE,
  ROLE.ESCROW_OPERATOR_ROLE,
  ROLE.DAO_MEMBER_ROLE,
  ROLE.GOVERNANCE_PARTICIPANT_ROLE,
  ROLE.MARKETPLACE_SELLER_ROLE,
  ROLE.MARKETPLACE_PURCHASER_ROLE,
  ROLE.RESEARCH_PARTICIPANT_ROLE
];

function hasAll(set, values) {
  return values.every((value) => set.has(value.toLowerCase()));
}

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const provider = createProvider(RPC_URL);
  const founder = new ethers.Wallet(PRIVATE_KEY, provider);
  const founderAddress = await founder.getAddress();
  const outsider = ethers.Wallet.createRandom().address;

  const access = new ethers.Contract(
    DIAMOND_ADDRESS,
    loadArtifact("out/AccessControlFacet.sol/AccessControlFacet.json").abi,
    provider
  );

  if (!(await access.hasRole(ROLE.FOUNDER_ROLE, founderAddress))) throw new Error("founder should have FOUNDER_ROLE");
  if (!(await access.hasRole(ROLE.OWNER_ROLE, founderAddress))) throw new Error("founder should have OWNER_ROLE");
  if (!(await access.hasRole(ROLE.VOTER_ROLE, founderAddress))) throw new Error("founder should have VOTER_ROLE");
  const founderHasTimelock = await access.hasRole(ROLE.TIMELOCK_ROLE, founderAddress);
  console.log(`[state] founderHasTimelock=${founderHasTimelock}`);

  const ownerOperationalRoles = await access.getOwnerOperationalRoles(founderAddress);
  const operationalSet = asSet(ownerOperationalRoles);
  if (!hasAll(operationalSet, OWNER_OPERATIONAL_ROLES)) throw new Error("founder operational role set mismatch");

  for (const role of OWNER_OPERATIONAL_ROLES) {
    if (!(await access.hasRole(role, founderAddress))) throw new Error(`founder should have operational role ${role}`);
  }

  if (!(await access.hasAllParticipantRoles(founderAddress))) throw new Error("founder should have all participant roles");
  if (await access.hasAllParticipantRoles(outsider)) throw new Error("outsider should not have participant roles");
  if ((await access.getOwnerOperationalRoles(outsider)).length !== 0) throw new Error("outsider should not have owner operational roles");

  if ((await access.getRoleAdmin(ROLE.TIMELOCK_ROLE)).toLowerCase() !== ROLE.FOUNDER_ROLE.toLowerCase()) {
    throw new Error("TIMELOCK_ROLE admin should be FOUNDER_ROLE");
  }
  if ((await access.getRoleAdmin(ROLE.PLATFORM_ADMIN_ROLE)).toLowerCase() !== ROLE.TIMELOCK_ROLE.toLowerCase()) {
    throw new Error("PLATFORM_ADMIN_ROLE admin should be TIMELOCK_ROLE");
  }
  if ((await access.getRoleAdmin(ROLE.OWNER_ROLE)).toLowerCase() !== ROLE.PLATFORM_ADMIN_ROLE.toLowerCase()) {
    throw new Error("OWNER_ROLE admin should be PLATFORM_ADMIN_ROLE");
  }
  if ((await access.getRoleAdmin(ROLE.TREASURY_SIGNER_ROLE)).toLowerCase() !== ROLE.TREASURY_ROLE.toLowerCase()) {
    throw new Error("TREASURY_SIGNER_ROLE admin should be TREASURY_ROLE");
  }

  const founderConfig = await access.getRoleConfig(ROLE.FOUNDER_ROLE);
  if (founderConfig.memberLimit !== 1n) throw new Error("founder memberLimit should be 1");
  if (founderConfig.revocable) throw new Error("founder role should not be revocable");
  if (founderConfig.adminRole !== ethers.ZeroHash) throw new Error("founder adminRole should be zero");

  const founderMembers = await access.getRoleMembers(ROLE.FOUNDER_ROLE);
  if (founderMembers.length !== 1 || founderMembers[0].toLowerCase() !== founderAddress.toLowerCase()) {
    throw new Error("founder member list should contain only founder");
  }

  const founderRoles = await access.getUserRoles(founderAddress);
  const founderRoleSet = asSet(founderRoles);
  const expectedFounderRoles = [
    ROLE.FOUNDER_ROLE,
    ROLE.OWNER_ROLE,
    ROLE.VOTER_ROLE,
    ...(founderHasTimelock ? [ROLE.TIMELOCK_ROLE] : []),
    ...OWNER_OPERATIONAL_ROLES
  ];
  if (!hasAll(founderRoleSet, expectedFounderRoles)) throw new Error("founder role list missing expected roles");

  if (await access.isFounderSunsetActive()) throw new Error("founder sunset should not be active at init");

  console.log("TRACE_ACCESS_BOOTSTRAP_INVARIANTS: PASS");
}

main().catch((err) => {
  console.error("TRACE_ACCESS_BOOTSTRAP_INVARIANTS: FAIL");
  console.error(err);
  process.exit(1);
});
