"use strict";

const { ethers } = require("ethers");
const {
  ROLE,
  loadArtifact,
  loadArtifactFirst,
  createProvider,
  selectorsForAbi,
  sendAndWait,
  deploy,
  advanceTime
} = require("./access_helpers");

const MNEMONIC = process.env.MNEMONIC || "test test test test test test test test test test test junk";
const GOVERNANCE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GOVERNANCE_ROLE"));
const VESTING_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("VESTING_MANAGER_ROLE"));

function walletAt(provider, index) {
  return new ethers.NonceManager(
    ethers.HDNodeWallet.fromPhrase(MNEMONIC, undefined, `m/44'/60'/0'/0/${index}`).connect(provider)
  );
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

function selectorsBySignature(abi, signatures) {
  const iface = new ethers.Interface(abi);
  return signatures.map((signature) => iface.getFunction(signature).selector);
}

async function deployBaseDiamondWithAccess(rpcUrl) {
  const provider = createProvider(rpcUrl);
  const founder = walletAt(provider, 0);
  const founderAddress = await founder.getAddress();

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

  const diamondCutFacet = await deploy(
    new ethers.ContractFactory(diamondCutArtifact.abi, diamondCutArtifact.bytecode.object, founder),
    "DiamondCutFacet"
  );
  const diamond = await deploy(
    new ethers.ContractFactory(diamondArtifact.abi, diamondArtifact.bytecode.object, founder),
    "Diamond",
    founderAddress,
    await diamondCutFacet.getAddress()
  );
  const diamondAddress = await diamond.getAddress();
  const diamondCut = new ethers.Contract(diamondAddress, diamondCutArtifact.abi, founder);

  const loupeFacet = await deploy(
    new ethers.ContractFactory(loupeArtifact.abi, loupeArtifact.bytecode.object, founder),
    "DiamondLoupeFacet"
  );
  const ownershipFacet = await deploy(
    new ethers.ContractFactory(ownershipArtifact.abi, ownershipArtifact.bytecode.object, founder),
    "OwnershipFacet"
  );
  const diamondInit = await deploy(
    new ethers.ContractFactory(diamondInitArtifact.abi, diamondInitArtifact.bytecode.object, founder),
    "DiamondInit"
  );

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

  const emergencyFacet = await deploy(
    new ethers.ContractFactory(emergencyArtifact.abi, emergencyArtifact.bytecode.object, founder),
    "EmergencyFacet"
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
    new ethers.ContractFactory(accessArtifact.abi, accessArtifact.bytecode.object, founder),
    "AccessControlFacet"
  );
  const accessInit = await deploy(
    new ethers.ContractFactory(accessInitArtifact.abi, accessInitArtifact.bytecode.object, founder),
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
      new ethers.Interface(accessInitArtifact.abi).encodeFunctionData("init", [founderAddress]),
      { gasLimit: 12_000_000 }
    ),
    "diamondCut:addAccessControlFacet"
  );

  const access = new ethers.Contract(diamondAddress, accessArtifact.abi, founder);
  return { provider, founder, founderAddress, diamondAddress, diamondCut, access };
}

async function ensureRole(access, founder, role, label) {
  const founderAddress = await founder.getAddress();
  if (!(await access.hasRole(role, founderAddress))) {
    await sendAndWait(access.grantRole(role, founderAddress, ethers.MaxUint256), `grantRole:${label}`);
  }
}

module.exports = {
  ROLE,
  GOVERNANCE_ROLE,
  VESTING_MANAGER_ROLE,
  walletAt,
  loadArtifact,
  createProvider,
  selectorsForAbi,
  sendAndWait,
  deploy,
  advanceTime,
  deployBaseDiamondWithAccess,
  ensureRole
};
