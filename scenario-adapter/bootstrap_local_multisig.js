#!/usr/bin/env node
"use strict";

const { ethers } = require("ethers");
require("dotenv").config();
const {
  loadArtifact,
  createProvider,
  selectorsForAbi,
  sendAndWait,
  deploy
} = require("./lib/access_helpers");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const PRIVATE_KEY = process.env.PRIVATE_KEY;

function selectorsBySignature(abi, signatures) {
  const iface = new ethers.Interface(abi);
  return signatures.map((signature) => iface.getFunction(signature).selector);
}

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

async function main() {
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const provider = createProvider(RPC_URL);
  const signer = new ethers.NonceManager(new ethers.Wallet(PRIVATE_KEY, provider));
  const signerAddress = await signer.getAddress();

  const diamondCutArtifact = loadArtifact("out/DiamondCutFacet.sol/DiamondCutFacet.json");
  const diamondArtifact = loadArtifact("out/Diamond.sol/Diamond.json");
  const loupeArtifact = loadArtifact("out/DiamondLoupeFacet.sol/DiamondLoupeFacet.json");
  const ownershipArtifact = loadArtifact("out/OwnershipFacet.sol/OwnershipFacet.json");
  const diamondInitArtifact = loadArtifact("out/DiamondInit.sol/DiamondInit.json");
  const accessArtifact = loadArtifact("out/AccessControlFacet.sol/AccessControlFacet.json");
  const accessInitArtifact = loadArtifact("out/AccessControlInit.sol/AccessControlInit.json");
  const multisigArtifact = loadArtifact("out/MultiSigFacet.sol/MultiSigFacet.json");
  const multisigInitArtifact = loadArtifact("out/MultiSigInit.sol/MultiSigInit.json");

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
        {
          facetAddress: await loupeFacet.getAddress(),
          action: 0,
          functionSelectors: selectorsBySignature(loupeArtifact.abi, loupeBootstrapSelectors())
        },
        {
          facetAddress: await ownershipFacet.getAddress(),
          action: 0,
          functionSelectors: selectorsBySignature(ownershipArtifact.abi, ownershipBootstrapSelectors())
        }
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

  const multisigFacet = await deploy(
    new ethers.ContractFactory(multisigArtifact.abi, multisigArtifact.bytecode.object, signer),
    "MultiSigFacet"
  );
  const multisigInit = await deploy(
    new ethers.ContractFactory(multisigInitArtifact.abi, multisigInitArtifact.bytecode.object, signer),
    "MultiSigInit"
  );
  await sendAndWait(
    diamondCut.setTrustedInitContract(await multisigInit.getAddress(), true, { gasLimit: 500_000 }),
    "setTrustedInitContract:MultiSigInit"
  );
  await sendAndWait(
    diamondCut.diamondCut(
      [{ facetAddress: await multisigFacet.getAddress(), action: 0, functionSelectors: selectorsForAbi(multisigArtifact.abi) }],
      await multisigInit.getAddress(),
      new ethers.Interface(multisigInitArtifact.abi).encodeFunctionData("initialize", [signerAddress]),
      { gasLimit: 12_000_000 }
    ),
    "diamondCut:addMultiSigFacet"
  );

  console.log(`BOOTSTRAP_LOCAL_MULTISIG: PASS diamond=${diamondAddress}`);
}

main().catch((err) => {
  console.error("BOOTSTRAP_LOCAL_MULTISIG: FAIL");
  console.error(err);
  process.exit(1);
});
