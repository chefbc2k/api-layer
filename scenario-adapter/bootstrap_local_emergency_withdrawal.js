#!/usr/bin/env node
"use strict";

const { ethers } = require("ethers");
require("dotenv").config();
const {
  loadArtifact,
  loadArtifactFirst,
  createProvider,
  selectorsForAbi,
  sendAndWait,
  deploy
} = require("./lib/access_helpers");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const PRIVATE_KEY = process.env.PRIVATE_KEY;

function loupeBootstrapSelectors() {
  return [
    "facets()",
    "facetFunctionSelectors(address)",
    "facetAddresses()",
    "facetAddress(bytes4)"
  ];
}

function ownershipBootstrapSelectors() {
  return [
    "transferOwnership(address)",
    "owner()",
    "proposeOwnershipTransfer(address)",
    "acceptOwnership()",
    "cancelOwnershipTransfer()",
    "setApprovedOwnerTarget(address,bool)",
    "setOwnershipPolicyEnforced(bool)",
    "isOwnerTargetApproved(address)",
    "pendingOwner()",
    "isOwnershipPolicyEnforced()"
  ];
}

function selectorsBySignature(abi, signatures) {
  const iface = new ethers.Interface(abi);
  return signatures.map((signature) => iface.getFunction(signature).selector);
}

async function main() {
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const provider = createProvider(RPC_URL);
  const signer = new ethers.NonceManager(new ethers.Wallet(PRIVATE_KEY, provider));
  const signerAddress = await signer.getAddress();

  const diamondCutArtifact = loadArtifact("out/DiamondCutFacet.sol/DiamondCutFacet.json");
  const diamondArtifact = loadArtifact("out/Diamond.sol/Diamond.json");
  const loupeArtifact = loadArtifact("out/DiamondLoupeFacet.sol/DiamondLoupeFacet.json");
  const ownershipArtifact = loadArtifact("out/OwnershipFacet.sol/OwnershipFacet.json");
  const diamondInitArtifact = loadArtifactFirst([
    "out/DiamondInit.sol/DiamondInit.json",
    "out/diamond/initializers/DiamondInit.sol/DiamondInit.json"
  ]);
  const accessArtifact = loadArtifact("out/AccessControlFacet.sol/AccessControlFacet.json");
  const accessInitArtifact = loadArtifact("out/AccessControlInit.sol/AccessControlInit.json");
  const emergencyArtifact = loadArtifactFirst([
    "out/EmergencyFacet.sol/EmergencyFacet.json",
    "out/security/emergency/EmergencyFacet.sol/EmergencyFacet.json"
  ]);
  const emergencyInitArtifact = loadArtifactFirst([
    "out/EmergencyInit.sol/EmergencyInit.json",
    "out/security/emergency/initializers/EmergencyInit.sol/EmergencyInit.json"
  ]);
  const emergencyWithdrawalArtifact = loadArtifactFirst([
    "out/EmergencyWithdrawalFacet.sol/EmergencyWithdrawalFacet.json",
    "out/security/emergency/EmergencyWithdrawalFacet.sol/EmergencyWithdrawalFacet.json"
  ]);

  const diamondCutFacet = await deploy(
    new ethers.ContractFactory(diamondCutArtifact.abi, diamondCutArtifact.bytecode.object, signer),
    "DiamondCutFacet"
  );
  const diamond = await deploy(
    new ethers.ContractFactory(diamondArtifact.abi, diamondArtifact.bytecode.object, signer),
    "Diamond",
    signerAddress,
    await diamondCutFacet.getAddress()
  );
  const diamondAddress = await diamond.getAddress();

  const loupeFacet = await deploy(
    new ethers.ContractFactory(loupeArtifact.abi, loupeArtifact.bytecode.object, signer),
    "DiamondLoupeFacet"
  );
  const ownershipFacet = await deploy(
    new ethers.ContractFactory(ownershipArtifact.abi, ownershipArtifact.bytecode.object, signer),
    "OwnershipFacet"
  );
  const diamondInit = await deploy(
    new ethers.ContractFactory(diamondInitArtifact.abi, diamondInitArtifact.bytecode.object, signer),
    "DiamondInit"
  );

  const diamondCut = new ethers.Contract(diamondAddress, diamondCutArtifact.abi, signer);

  await sendAndWait(
    diamondCut.diamondCut(
      [
        { facetAddress: await loupeFacet.getAddress(), action: 0, functionSelectors: selectorsBySignature(loupeArtifact.abi, loupeBootstrapSelectors()) },
        { facetAddress: await ownershipFacet.getAddress(), action: 0, functionSelectors: selectorsBySignature(ownershipArtifact.abi, ownershipBootstrapSelectors()) }
      ],
      ethers.ZeroAddress,
      "0x",
      { gasLimit: 12_000_000 }
    ),
    "diamondCut:addBootstrapFacets"
  );

  await sendAndWait(
    diamondCut.setTrustedInitContract(await diamondInit.getAddress(), true, { gasLimit: 500_000 }),
    "setTrustedInitContract:DiamondInit"
  );
  await sendAndWait(
    diamondCut.diamondCut(
      [],
      await diamondInit.getAddress(),
      new ethers.Interface(diamondInitArtifact.abi).encodeFunctionData("init", []),
      { gasLimit: 4_000_000 }
    ),
    "diamondCut:initDiamond"
  );

  const emergencyFacet = await deploy(
    new ethers.ContractFactory(emergencyArtifact.abi, emergencyArtifact.bytecode.object, signer),
    "EmergencyFacet"
  );
  const emergencyInit = await deploy(
    new ethers.ContractFactory(emergencyInitArtifact.abi, emergencyInitArtifact.bytecode.object, signer),
    "EmergencyInit"
  );
  await sendAndWait(
    diamondCut.diamondCut(
      [{ facetAddress: await emergencyFacet.getAddress(), action: 0, functionSelectors: selectorsForAbi(emergencyArtifact.abi) }],
      ethers.ZeroAddress,
      "0x",
      { gasLimit: 12_000_000 }
    ),
    "diamondCut:addEmergencyFacet"
  );

  const accessFacet = await deploy(
    new ethers.ContractFactory(accessArtifact.abi, accessArtifact.bytecode.object, signer),
    "AccessControlFacet"
  );
  const accessInit = await deploy(
    new ethers.ContractFactory(accessInitArtifact.abi, accessInitArtifact.bytecode.object, signer),
    "AccessControlInit"
  );
  await sendAndWait(
    diamondCut.setTrustedInitContract(await accessInit.getAddress(), true, { gasLimit: 500_000 }),
    "setTrustedInitContract:AccessControlInit"
  );
  await sendAndWait(
    diamondCut.diamondCut(
      [{ facetAddress: await accessFacet.getAddress(), action: 0, functionSelectors: selectorsForAbi(accessArtifact.abi) }],
      await accessInit.getAddress(),
      new ethers.Interface(accessInitArtifact.abi).encodeFunctionData("init", [signerAddress]),
      { gasLimit: 12_000_000 }
    ),
    "diamondCut:addAccessControlFacet"
  );

  await sendAndWait(
    diamondCut.setTrustedInitContract(await emergencyInit.getAddress(), true, { gasLimit: 500_000 }),
    "setTrustedInitContract:EmergencyInit"
  );
  await sendAndWait(
    diamondCut.diamondCut(
      [],
      await emergencyInit.getAddress(),
      new ethers.Interface(emergencyInitArtifact.abi).encodeFunctionData("init", []),
      { gasLimit: 4_000_000 }
    ),
    "diamondCut:initEmergency"
  );

  const emergencyWithdrawalFacet = await deploy(
    new ethers.ContractFactory(emergencyWithdrawalArtifact.abi, emergencyWithdrawalArtifact.bytecode.object, signer),
    "EmergencyWithdrawalFacet"
  );
  await sendAndWait(
    diamondCut.diamondCut(
      [{ facetAddress: await emergencyWithdrawalFacet.getAddress(), action: 0, functionSelectors: selectorsForAbi(emergencyWithdrawalArtifact.abi) }],
      ethers.ZeroAddress,
      "0x",
      { gasLimit: 12_000_000 }
    ),
    "diamondCut:addEmergencyWithdrawalFacet"
  );

  console.log(`BOOTSTRAP_LOCAL_EMERGENCY_WITHDRAWAL: PASS diamond=${diamondAddress}`);
}

main().catch((err) => {
  console.error("BOOTSTRAP_LOCAL_EMERGENCY_WITHDRAWAL: FAIL");
  console.error(err);
  process.exit(1);
});
