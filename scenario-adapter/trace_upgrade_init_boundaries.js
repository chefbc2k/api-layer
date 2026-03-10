#!/usr/bin/env node
"use strict";

const { ethers } = require("ethers");
require("dotenv").config();
const {
  loadArtifact,
  createProvider,
  selectorsForAbi,
  sendAndWait,
  deploy,
  expectRevert
} = require("./lib/access_helpers");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const MNEMONIC = process.env.MNEMONIC || "test test test test test test test test test test test junk";

function walletAt(provider, index) {
  return new ethers.NonceManager(
    ethers.HDNodeWallet.fromPhrase(MNEMONIC, undefined, `m/44'/60'/0'/0/${index}`).connect(provider)
  );
}

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

async function bootstrapUpgradeDiamond(provider) {
  const founder = walletAt(provider, 0);
  const outsider = walletAt(provider, 9);
  const founderAddress = await founder.getAddress();
  const signerAddresses = [];
  for (let i = 0; i < 5; i++) {
    signerAddresses.push(await walletAt(provider, i).getAddress());
  }

  const diamondCutArtifact = loadArtifact("out/DiamondCutFacet.sol/DiamondCutFacet.json");
  const diamondArtifact = loadArtifact("out/Diamond.sol/Diamond.json");
  const loupeArtifact = loadArtifact("out/DiamondLoupeFacet.sol/DiamondLoupeFacet.json");
  const ownershipArtifact = loadArtifact("out/OwnershipFacet.sol/OwnershipFacet.json");
  const diamondInitArtifact = loadArtifact("out/DiamondInit.sol/DiamondInit.json");
  const upgradeArtifact = loadArtifact("out/UpgradeControllerFacet.sol/UpgradeControllerFacet.json");

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

  const upgradeFacet = await deploy(
    new ethers.ContractFactory(upgradeArtifact.abi, upgradeArtifact.bytecode.object, founder),
    "UpgradeControllerFacet"
  );
  await sendAndWait(
    diamondCut.diamondCut(
      [{ facetAddress: await upgradeFacet.getAddress(), action: 0, functionSelectors: selectorsForAbi(upgradeArtifact.abi) }],
      ethers.ZeroAddress,
      "0x",
      { gasLimit: 12_000_000 }
    ),
    "diamondCut:addUpgradeControllerFacet"
  );

  return {
    founder,
    outsider,
    signerAddresses,
    upgrade: new ethers.Contract(diamondAddress, upgradeArtifact.abi, provider)
  };
}

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
  const provider = createProvider(RPC_URL);
  const { founder, outsider, signerAddresses, upgrade } = await bootstrapUpgradeDiamond(provider);

  await expectStaticRevert(
    () => upgrade.connect(outsider).initUpgradeController.staticCall(signerAddresses, 3, 7 * 24 * 60 * 60),
    "initUpgradeController:outsider"
  );
  await expectStaticRevert(
    () => upgrade.connect(founder).initUpgradeController.staticCall(signerAddresses.slice(0, 4), 3, 7 * 24 * 60 * 60),
    "initUpgradeController:badLength"
  );
  await expectStaticRevert(
    () => upgrade.connect(founder).initUpgradeController.staticCall(signerAddresses, 2, 7 * 24 * 60 * 60),
    "initUpgradeController:badThreshold"
  );
  await expectStaticRevert(
    () => upgrade.connect(founder).initUpgradeController.staticCall(signerAddresses, 3, 6 * 24 * 60 * 60),
    "initUpgradeController:badDelay"
  );
  await expectStaticRevert(
    () => upgrade.connect(founder).initUpgradeController.staticCall(
      [signerAddresses[0], signerAddresses[0], signerAddresses[2], signerAddresses[3], signerAddresses[4]],
      3,
      7 * 24 * 60 * 60
    ),
    "initUpgradeController:duplicateSigner"
  );
  await expectStaticRevert(
    () => upgrade.connect(founder).initUpgradeController.staticCall(
      [signerAddresses[0], signerAddresses[1], ethers.ZeroAddress, signerAddresses[3], signerAddresses[4]],
      3,
      7 * 24 * 60 * 60
    ),
    "initUpgradeController:zeroSigner"
  );

  await sendAndWait(
    upgrade.connect(founder).initUpgradeController(signerAddresses, 3, 7 * 24 * 60 * 60, { gasLimit: 3_000_000 }),
    "initUpgradeController:valid"
  );

  console.log("[stage] read:getUpgradeControlStatus");
  const [initialized, enforced, frozen, owner] = await upgrade.getUpgradeControlStatus();
  if (!initialized || !enforced || !frozen) throw new Error("upgrade control should initialize enforced and frozen");
  if (owner.toLowerCase() !== (await founder.getAddress()).toLowerCase()) throw new Error("owner mismatch after init");

  console.log("[stage] expect:reinit");
  await expectStaticRevert(
    () => upgrade.connect(founder).initUpgradeController.staticCall(signerAddresses, 3, 7 * 24 * 60 * 60),
    "initUpgradeController:reinit"
  );
  console.log("[stage] expect:freeze");
  await expectStaticRevert(
    () => upgrade.connect(founder).freezeUpgradeControl.staticCall(),
    "freezeUpgradeControl:alreadyFrozen"
  );
  console.log("[stage] expect:disable");
  await expectStaticRevert(
    () => upgrade.connect(founder).setUpgradeControlEnforced.staticCall(false),
    "setUpgradeControlEnforced:false"
  );

  console.log("TRACE_UPGRADE_INIT_BOUNDARIES: PASS");
}

main().catch((err) => {
  console.error("TRACE_UPGRADE_INIT_BOUNDARIES: FAIL");
  console.error(err);
  process.exit(1);
});
