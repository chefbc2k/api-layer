#!/usr/bin/env node
"use strict";

const { ethers } = require("ethers");
require("dotenv").config();
const {
  loadArtifact,
  createProvider,
  sendAndWait,
  expectRevert,
  advanceTime
} = require("./lib/access_helpers");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;
const MNEMONIC = process.env.MNEMONIC || "test test test test test test test test test test test junk";

function walletAt(provider, index) {
  return new ethers.NonceManager(
    ethers.HDNodeWallet.fromPhrase(MNEMONIC, undefined, `m/44'/60'/0'/0/${index}`).connect(provider)
  );
}

function eventArg(receipt, iface, name, key) {
  const parsed = receipt.logs
    .map((log) => { try { return iface.parseLog(log); } catch { return null; } })
    .find((log) => log && log.name === name);
  if (!parsed) throw new Error(`missing ${name} event`);
  return parsed.args[key];
}

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");
  const provider = createProvider(RPC_URL);
  const founder = walletAt(provider, 0);
  const signer1 = walletAt(provider, 1);
  const signer2 = walletAt(provider, 2);
  const signer3 = walletAt(provider, 3);
  const signer4 = walletAt(provider, 4);
  const outsider = walletAt(provider, 8);

  const upgradeArtifact = loadArtifact("out/UpgradeControllerFacet.sol/UpgradeControllerFacet.json");
  const diamondCutArtifact = loadArtifact("out/DiamondCutFacet.sol/DiamondCutFacet.json");
  const mockFacetArtifact = loadArtifact("out/MockFacet.sol/MockFacet.json");
  const mockFacetV2Artifact = loadArtifact("out/MockFacetV2.sol/MockFacetV2.json");
  const mockInitContractArtifact = loadArtifact("out/MockInitContract.sol/MockInitContract.json");
  const upgrade = new ethers.Contract(DIAMOND_ADDRESS, upgradeArtifact.abi, provider);
  const diamondCut = new ethers.Contract(DIAMOND_ADDRESS, diamondCutArtifact.abi, provider);
  const iface = new ethers.Interface(upgradeArtifact.abi);

  const mockFacet = await new ethers.ContractFactory(
    mockFacetArtifact.abi,
    mockFacetArtifact.bytecode.object,
    founder
  ).deploy();
  await mockFacet.waitForDeployment();
  const mockFacetV2 = await new ethers.ContractFactory(
    mockFacetV2Artifact.abi,
    mockFacetV2Artifact.bytecode.object,
    founder
  ).deploy();
  await mockFacetV2.waitForDeployment();
  const mockInitContract = await new ethers.ContractFactory(
    mockInitContractArtifact.abi,
    mockInitContractArtifact.bytecode.object,
    founder
  ).deploy();
  await mockInitContract.waitForDeployment();
  const mockInitContractAddress = await mockInitContract.getAddress();

  await sendAndWait(
    diamondCut.connect(founder).setTrustedInitContract(mockInitContractAddress, true, { gasLimit: 500_000 }),
    "setTrustedInitContract:payloadIntegrity"
  );

  const facetCuts = [{
    facetAddress: await mockFacet.getAddress(),
    action: 0,
    functionSelectors: [
      mockFacet.interface.getFunction("setValue").selector,
      mockFacet.interface.getFunction("getValue").selector,
      mockFacet.interface.getFunction("value").selector
    ]
  }];
  const altFacetCuts = [{
    facetAddress: await mockFacetV2.getAddress(),
    action: 0,
    functionSelectors: [
      mockFacetV2.interface.getFunction("setValueV2").selector,
      mockFacetV2.interface.getFunction("getValueV2").selector,
      mockFacetV2.interface.getFunction("value").selector
    ]
  }];

  const proposeRc = await sendAndWait(
    upgrade.connect(founder).proposeDiamondCut(
      facetCuts,
      mockInitContractAddress,
      mockInitContract.interface.encodeFunctionData("initializeWithSimpleData", [1n]),
      { gasLimit: 4_000_000 }
    ),
    "proposeDiamondCut:integrity"
  );
  const upgradeId = eventArg(proposeRc, iface, "UpgradeProposed", "upgradeId");

  await sendAndWait(upgrade.connect(founder).approveUpgrade(upgradeId), "approveUpgrade:founder");
  await sendAndWait(upgrade.connect(signer1).approveUpgrade(upgradeId), "approveUpgrade:signer1");
  await sendAndWait(upgrade.connect(signer2).approveUpgrade(upgradeId), "approveUpgrade:signer2");

  await expectRevert(() => upgrade.connect(founder).approveUpgrade.staticCall(upgradeId), "approveUpgrade:duplicate");

  await advanceTime(provider, 7 * 24 * 60 * 60 + 1);

  await expectRevert(
    () => upgrade.connect(signer3).executeUpgrade(altFacetCuts, mockInitContractAddress, "0x", upgradeId),
    "executeUpgrade:mismatchedPayload"
  );
  await expectRevert(
    () => upgrade.connect(signer3).executeUpgrade(
      facetCuts,
      ethers.ZeroAddress,
      "0x",
      upgradeId
    ),
    "executeUpgrade:mismatchedInit"
  );

  await sendAndWait(
    upgrade.connect(signer4).executeUpgrade(
      facetCuts,
      mockInitContractAddress,
      mockInitContract.interface.encodeFunctionData("initializeWithSimpleData", [1n]),
      upgradeId,
      { gasLimit: 8_000_000 }
    ),
    "executeUpgrade:integritySuccess"
  );

  console.log("[stage] read:getUpgrade");
  const [,,, executed] = await upgrade.getUpgrade(upgradeId);
  if (!executed) throw new Error("upgrade should be marked executed");

  const mockOnDiamond = new ethers.Contract(DIAMOND_ADDRESS, mockFacetArtifact.abi, outsider);
  console.log("[stage] write:mockFacet:setValue");
  await sendAndWait(mockOnDiamond.setValue(99n), "mockFacet:setValue");
  console.log("[stage] read:mockFacet:getValue");
  if ((await mockOnDiamond.getValue()) !== 99n) throw new Error("mock facet should be live on diamond");

  console.log("[stage] expect:approveAfterExecute");
  await expectRevert(
    () => upgrade.connect(founder).approveUpgrade.staticCall(upgradeId),
    "approveUpgrade:afterExecute"
  );
  console.log("[stage] expect:executeAfterExecute");
  await expectRevert(
    () => upgrade.connect(signer1).executeUpgrade.staticCall(
      facetCuts,
      mockInitContractAddress,
      mockInitContract.interface.encodeFunctionData("initializeWithSimpleData", [1n]),
      upgradeId
    ),
    "executeUpgrade:alreadyExecuted"
  );

  console.log("TRACE_UPGRADE_PAYLOAD_INTEGRITY: PASS");
}

main().catch((err) => {
  console.error("TRACE_UPGRADE_PAYLOAD_INTEGRITY: FAIL");
  console.error(err);
  process.exit(1);
});
