#!/usr/bin/env node
"use strict";

require("dotenv").config();
const { ethers } = require("ethers");
const { walletAt, deployBaseDiamondWithAccess, deploy, loadArtifact, sendAndWait } = require("./lib/reentrancy_real_helpers");
const { expectRevert } = require("./lib/access_helpers");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const OWNER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("OWNER_ROLE"));

async function main() {
  const { provider, founder, founderAddress, diamondAddress, access } = await deployBaseDiamondWithAccess(RPC_URL);
  const ownerArtifact = loadArtifact("out/OwnershipFacet.sol/OwnershipFacet.json");
  const ownership = new ethers.Contract(diamondAddress, ownerArtifact.abi, founder);
  const newOwner = walletAt(provider, 1);
  const newOwnerAddress = await newOwner.getAddress();

  await sendAndWait(ownership.proposeOwnershipTransfer(newOwnerAddress, { gasLimit: 1_000_000 }), "proposeOwnershipTransfer");
  if ((await ownership.pendingOwner()).toLowerCase() !== newOwnerAddress.toLowerCase()) throw new Error("pending owner mismatch");
  await sendAndWait(ownership.connect(newOwner).acceptOwnership({ gasLimit: 1_500_000 }), "acceptOwnership");

  if ((await ownership.owner()).toLowerCase() !== newOwnerAddress.toLowerCase()) throw new Error("owner should transfer to new owner");
  if (await access.hasRole(OWNER_ROLE, founderAddress)) throw new Error("founder should lose OWNER_ROLE after transfer");
  if (!(await access.hasRole(OWNER_ROLE, newOwnerAddress))) throw new Error("new owner should gain OWNER_ROLE after transfer");

  await sendAndWait(ownership.connect(newOwner).setOwnershipPolicyEnforced(true, { gasLimit: 1_000_000 }), "setOwnershipPolicyEnforced:true");

  await expectRevert(
    () => ownership.connect(newOwner).transferOwnership.staticCall(founderAddress, { gasLimit: 1_500_000 }),
    "transferOwnership:eoaBlockedByPolicy"
  );

  const emergencyArtifact = loadArtifact("out/EmergencyFacet.sol/EmergencyFacet.json");
  const approvedTarget = await deploy(
    new ethers.ContractFactory(emergencyArtifact.abi, emergencyArtifact.bytecode.object, newOwner),
    "ApprovedOwnerTarget"
  );
  const approvedTargetAddress = await approvedTarget.getAddress();
  await sendAndWait(
    ownership.connect(newOwner).setApprovedOwnerTarget(approvedTargetAddress, true, { gasLimit: 1_000_000 }),
    "setApprovedOwnerTarget"
  );
  await sendAndWait(
    ownership.connect(newOwner).transferOwnership(approvedTargetAddress, { gasLimit: 1_500_000 }),
    "transferOwnership:approvedContract"
  );

  if ((await ownership.owner()).toLowerCase() !== approvedTargetAddress.toLowerCase()) {
    throw new Error("owner should transfer to approved contract target");
  }
  if (await access.hasRole(OWNER_ROLE, newOwnerAddress)) throw new Error("EOA owner should lose OWNER_ROLE after contract transfer");
  if (!(await access.hasRole(OWNER_ROLE, approvedTargetAddress))) throw new Error("approved contract target should gain OWNER_ROLE");

  console.log("TRACE_DIAMOND_OWNERSHIP_POLICY: PASS");
}

main().catch((err) => {
  console.error("TRACE_DIAMOND_OWNERSHIP_POLICY: FAIL");
  console.error(err);
  process.exit(1);
});
