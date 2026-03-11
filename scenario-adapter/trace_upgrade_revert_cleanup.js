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

const RPC_URL = process.env.RPC_URL;
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
  const loupeArtifact = loadArtifact("out/DiamondLoupeFacet.sol/DiamondLoupeFacet.json");
  const mockFacetArtifact = loadArtifact("out/MockFacet.sol/MockFacet.json");
  const mockInitContractArtifact = loadArtifact("out/MockInitContract.sol/MockInitContract.json");
  const upgrade = new ethers.Contract(DIAMOND_ADDRESS, upgradeArtifact.abi, provider);
  const diamondCut = new ethers.Contract(DIAMOND_ADDRESS, diamondCutArtifact.abi, provider);
  const loupe = new ethers.Contract(DIAMOND_ADDRESS, loupeArtifact.abi, provider);
  const iface = new ethers.Interface(upgradeArtifact.abi);

  const mockFacet = await new ethers.ContractFactory(
    mockFacetArtifact.abi,
    mockFacetArtifact.bytecode.object,
    founder
  ).deploy();
  await mockFacet.waitForDeployment();
  const mockInitContract = await new ethers.ContractFactory(
    mockInitContractArtifact.abi,
    mockInitContractArtifact.bytecode.object,
    founder
  ).deploy();
  await mockInitContract.waitForDeployment();
  const mockInitContractAddress = await mockInitContract.getAddress();

  await sendAndWait(
    diamondCut.connect(founder).setTrustedInitContract(mockInitContractAddress, true, { gasLimit: 500_000 }),
    "setTrustedInitContract:revertCleanup"
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

  const failingRc = await sendAndWait(
    upgrade.connect(founder).proposeDiamondCut(
      facetCuts,
      mockInitContractAddress,
      mockInitContract.interface.encodeFunctionData("failingInit"),
      { gasLimit: 4_000_000 }
    ),
    "proposeDiamondCut:failingInit"
  );
  const failingUpgradeId = eventArg(failingRc, iface, "UpgradeProposed", "upgradeId");
  await sendAndWait(upgrade.connect(founder).approveUpgrade(failingUpgradeId), "approveUpgrade:failing:founder");
  await sendAndWait(upgrade.connect(signer1).approveUpgrade(failingUpgradeId), "approveUpgrade:failing:signer1");
  await sendAndWait(upgrade.connect(signer2).approveUpgrade(failingUpgradeId), "approveUpgrade:failing:signer2");
  await advanceTime(provider, 7 * 24 * 60 * 60 + 1);

  await expectRevert(
    () => upgrade.connect(signer3).executeUpgrade(
      facetCuts,
      mockInitContractAddress,
      mockInitContract.interface.encodeFunctionData("failingInit"),
      failingUpgradeId
    ),
    "executeUpgrade:failingInit"
  );

  console.log("[stage] read:getUpgrade:failed");
  const [,,, failingExecuted] = await upgrade.getUpgrade(failingUpgradeId);
  if (failingExecuted) throw new Error("failed upgrade should not be marked executed");
  const lingeringFacet = await loupe.facetAddress(mockFacet.interface.getFunction("setValue").selector);
  if (lingeringFacet !== ethers.ZeroAddress) {
    throw new Error(`failed upgrade should not leave selectors mounted, found ${lingeringFacet}`);
  }

  const successRc = await sendAndWait(
    upgrade.connect(founder).proposeDiamondCut(facetCuts, ethers.ZeroAddress, "0x", { gasLimit: 4_000_000 }),
    "proposeDiamondCut:afterFailure"
  );
  const successUpgradeId = eventArg(successRc, iface, "UpgradeProposed", "upgradeId");
  await sendAndWait(upgrade.connect(founder).approveUpgrade(successUpgradeId), "approveUpgrade:success:founder");
  await sendAndWait(upgrade.connect(signer1).approveUpgrade(successUpgradeId), "approveUpgrade:success:signer1");
  await sendAndWait(upgrade.connect(signer2).approveUpgrade(successUpgradeId), "approveUpgrade:success:signer2");
  await advanceTime(provider, 7 * 24 * 60 * 60 + 1);

  try {
    await upgrade.connect(signer4).executeUpgrade.staticCall(facetCuts, ethers.ZeroAddress, "0x", successUpgradeId);
  } catch (err) {
    const data = err?.data || err?.info?.error?.data || "<none>";
    throw new Error(`executeUpgrade:afterFailure:staticCall reverted data=${data}`);
  }
  await sendAndWait(
    upgrade.connect(signer4).executeUpgrade(facetCuts, ethers.ZeroAddress, "0x", successUpgradeId, { gasLimit: 8_000_000 }),
    "executeUpgrade:afterFailure"
  );

  const mockOnDiamond = new ethers.Contract(DIAMOND_ADDRESS, mockFacetArtifact.abi, outsider);
  console.log("[stage] write:mockFacet:setValue:afterFailure");
  await sendAndWait(mockOnDiamond.setValue(7n), "mockFacet:setValue:afterFailure");
  console.log("[stage] read:mockFacet:getValue:afterFailure");
  if ((await mockOnDiamond.getValue()) !== 7n) throw new Error("upgrade path should recover after failed execution");

  console.log("TRACE_UPGRADE_REVERT_CLEANUP: PASS");
}

main().catch((err) => {
  console.error("TRACE_UPGRADE_REVERT_CLEANUP: FAIL");
  console.error(err);
  process.exit(1);
});
