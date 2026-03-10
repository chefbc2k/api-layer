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
  return ethers.HDNodeWallet.fromPhrase(MNEMONIC, undefined, `m/44'/60'/0'/0/${index}`).connect(provider);
}

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");

  const provider = createProvider(RPC_URL);
  const founder = walletAt(provider, 0);
  const signer1 = walletAt(provider, 1);
  const signer2 = walletAt(provider, 2);
  const signer3 = walletAt(provider, 3);
  const outsider = walletAt(provider, 8);

  const upgradeArtifact = loadArtifact("out/UpgradeControllerFacet.sol/UpgradeControllerFacet.json");
  const mockFacetArtifact = loadArtifact("out/MockFacet.sol/MockFacet.json");
  const upgrade = new ethers.Contract(DIAMOND_ADDRESS, upgradeArtifact.abi, provider);
  const upgradeIface = new ethers.Interface(upgradeArtifact.abi);

  const status = await upgrade.getUpgradeControlStatus();
  if (!status[0] || !status[1] || !status[2]) {
    throw new Error("upgrade controller should initialize enforced and frozen");
  }
  if ((await upgrade.getUpgradeThreshold()) !== 3n) throw new Error("upgrade threshold should be 3");
  if ((await upgrade.getUpgradeDelay()) !== 7n * 24n * 60n * 60n) throw new Error("upgrade delay should be 7 days");
  if (!(await upgrade.isUpgradeSigner(await founder.getAddress()))) throw new Error("founder should be upgrade signer");
  if (!(await upgrade.isUpgradeSigner(await signer1.getAddress()))) throw new Error("signer1 should be upgrade signer");

  await expectRevert(
    () => upgrade.connect(founder).freezeUpgradeControl(),
    "freezeUpgradeControl:alreadyFrozen"
  );
  await expectRevert(
    () => upgrade.connect(founder).setUpgradeControlEnforced(false),
    "setUpgradeControlEnforced:false"
  );
  await expectRevert(
    () => upgrade.connect(outsider).proposeDiamondCut([], ethers.ZeroAddress, "0x"),
    "proposeDiamondCut:outsider"
  );

  const mockFacet = await new ethers.ContractFactory(
    mockFacetArtifact.abi,
    mockFacetArtifact.bytecode.object,
    founder
  ).deploy();
  await mockFacet.waitForDeployment();

  const mockSelectors = [
    mockFacet.interface.getFunction("setValue").selector,
    mockFacet.interface.getFunction("getValue").selector,
    mockFacet.interface.getFunction("value").selector
  ];
  const facetCuts = [{ facetAddress: await mockFacet.getAddress(), action: 0, functionSelectors: mockSelectors }];

  const proposeTx = await upgrade.connect(founder).proposeDiamondCut(facetCuts, ethers.ZeroAddress, "0x", { gasLimit: 4_000_000 });
  const proposeRc = await sendAndWait(Promise.resolve(proposeTx), "proposeDiamondCut:addMockFacet");
  const proposedLog = proposeRc.logs
    .map((log) => { try { return upgradeIface.parseLog(log); } catch { return null; } })
    .find((log) => log && log.name === "UpgradeProposed");
  if (!proposedLog) throw new Error("upgrade proposal event missing");
  const upgradeId = proposedLog.args.upgradeId;

  const [proposer, proposedAt, approvalCount, executed] = await upgrade.getUpgrade(upgradeId);
  if (proposer.toLowerCase() !== (await founder.getAddress()).toLowerCase()) throw new Error("upgrade proposer mismatch");
  if (proposedAt === 0n || approvalCount !== 0n || executed) throw new Error("fresh upgrade metadata incorrect");

  await sendAndWait(upgrade.connect(founder).approveUpgrade(upgradeId), "approveUpgrade:founder");
  await sendAndWait(upgrade.connect(signer1).approveUpgrade(upgradeId), "approveUpgrade:signer1");
  await sendAndWait(upgrade.connect(signer2).approveUpgrade(upgradeId), "approveUpgrade:signer2");
  if (!(await upgrade.isUpgradeApproved(upgradeId, await signer1.getAddress()))) {
    throw new Error("signer1 approval should be recorded");
  }

  await expectRevert(
    () => upgrade.connect(founder).executeUpgrade(facetCuts, ethers.ZeroAddress, "0x", upgradeId),
    "executeUpgrade:timelock"
  );
  await expectRevert(
    () => upgrade.connect(signer3).executeUpgrade([], ethers.ZeroAddress, "0x", upgradeId),
    "executeUpgrade:mismatchedPayload"
  );

  await advanceTime(provider, 7 * 24 * 60 * 60 + 1);

  await sendAndWait(
    upgrade.connect(signer3).executeUpgrade(facetCuts, ethers.ZeroAddress, "0x", upgradeId, { gasLimit: 8_000_000 }),
    "executeUpgrade:addMockFacet"
  );

  const [,, finalApprovalCount, wasExecuted] = await upgrade.getUpgrade(upgradeId);
  if (finalApprovalCount !== 3n || !wasExecuted) throw new Error("upgrade should be marked executed");

  const mockOnDiamond = new ethers.Contract(DIAMOND_ADDRESS, mockFacetArtifact.abi, founder);
  await sendAndWait(mockOnDiamond.setValue(42n), "mockFacet:setValue");
  if ((await mockOnDiamond.getValue()) !== 42n) throw new Error("mock facet should be callable after upgrade");
  if ((await mockOnDiamond.value()) !== 42n) throw new Error("mock facet storage should persist on diamond");

  console.log("TRACE_UPGRADE_CONTROLLER_LIFECYCLE: PASS");
}

main().catch((err) => {
  console.error("TRACE_UPGRADE_CONTROLLER_LIFECYCLE: FAIL");
  console.error(err);
  process.exit(1);
});
