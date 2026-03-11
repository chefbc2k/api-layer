#!/usr/bin/env node
"use strict";

const { ethers } = require("ethers");
require("dotenv").config();
const {
  loadArtifact,
  createProvider,
  sendAndWait,
  expectRevert
} = require("./lib/access_helpers");

const RPC_URL = process.env.RPC_URL;
const MNEMONIC = process.env.MNEMONIC || "test test test test test test test test test test test junk";

function walletAt(provider, index) {
  return new ethers.NonceManager(
    ethers.HDNodeWallet.fromPhrase(MNEMONIC, undefined, `m/44'/60'/0'/0/${index}`).connect(provider)
  );
}

async function main() {
  const provider = createProvider(RPC_URL);
  const founder = walletAt(provider, 0);

  const harnessArtifact = loadArtifact("out/ReentrancyHarnesses.sol/ReentrancyGuardHarness.json");
  const targetArtifact = loadArtifact("out/ReentrancyHarnesses.sol/DirectGuardedTarget.json");
  const directAttackerArtifact = loadArtifact("out/ReentrancyHarnesses.sol/DirectReentrancyAttacker.json");
  const crossAttackerArtifact = loadArtifact("out/ReentrancyHarnesses.sol/CrossFunctionReentrancyAttacker.json");
  const diamondMockArtifact = loadArtifact("out/ReentrancyHarnesses.sol/DiamondReentrancyMock.json");
  const facetAArtifact = loadArtifact("out/ReentrancyHarnesses.sol/FacetA.json");
  const facetBArtifact = loadArtifact("out/ReentrancyHarnesses.sol/FacetB.json");

  const harness = await new ethers.ContractFactory(
    harnessArtifact.abi,
    harnessArtifact.bytecode.object,
    founder
  ).deploy();
  await harness.waitForDeployment();

  const target = await new ethers.ContractFactory(
    targetArtifact.abi,
    targetArtifact.bytecode.object,
    founder
  ).deploy();
  await target.waitForDeployment();

  const directAttacker = await new ethers.ContractFactory(
    directAttackerArtifact.abi,
    directAttackerArtifact.bytecode.object,
    founder
  ).deploy();
  await directAttacker.waitForDeployment();

  const crossAttacker = await new ethers.ContractFactory(
    crossAttackerArtifact.abi,
    crossAttackerArtifact.bytecode.object,
    founder
  ).deploy();
  await crossAttacker.waitForDeployment();

  const facetA = await new ethers.ContractFactory(
    facetAArtifact.abi,
    facetAArtifact.bytecode.object,
    founder
  ).deploy();
  await facetA.waitForDeployment();

  const facetB = await new ethers.ContractFactory(
    facetBArtifact.abi,
    facetBArtifact.bytecode.object,
    founder
  ).deploy();
  await facetB.waitForDeployment();

  const diamondMock = await new ethers.ContractFactory(
    diamondMockArtifact.abi,
    diamondMockArtifact.bytecode.object,
    founder
  ).deploy(await facetA.getAddress(), await facetB.getAddress());
  await diamondMock.waitForDeployment();
  const targetAddress = await target.getAddress();

  await sendAndWait(harness.enter(false), "reentrancyHarness:enter");
  if (await harness.guardFlag()) throw new Error("guard flag should clear after normal execution");

  await expectRevert(() => harness.enter(true), "reentrancyHarness:recursive");

  await expectRevert(
    () => directAttacker.attack(targetAddress, { value: ethers.parseEther("1") }),
    "directReentrancy:blocked"
  );
  if ((await provider.getBalance(targetAddress)) !== 0n) {
    throw new Error("target balance should remain unchanged after failed direct attack");
  }
  if (await target.firstFunctionCalled()) throw new Error("firstFunctionCalled should still be false before cross-function test");
  if (await target.secondFunctionCalled()) throw new Error("secondFunctionCalled should still be false before cross-function test");

  await expectRevert(
    () => crossAttacker.attack(targetAddress, { value: ethers.parseEther("1") }),
    "crossFunctionReentrancy:blocked"
  );
  if (await target.firstFunctionCalled()) throw new Error("cross-function state should revert");
  if (await target.secondFunctionCalled()) throw new Error("second function should be blocked and reverted");

  await expectRevert(
    () => diamondMock.callFacetA(),
    "crossFacetReentrancy:blocked"
  );

  console.log("TRACE_REENTRANCY_HARNESS: PASS");
}

main().catch((err) => {
  console.error("TRACE_REENTRANCY_HARNESS: FAIL");
  console.error(err);
  process.exit(1);
});
