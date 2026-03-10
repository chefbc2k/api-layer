#!/usr/bin/env node
"use strict";

const { ethers } = require("ethers");
require("dotenv").config();
const { loadArtifact, sendAndWait, expectRevert } = require("./lib/vesting_helpers");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const provider = new ethers.JsonRpcProvider(RPC_URL, undefined, { batchMaxCount: 1 });
  provider.pollingInterval = 250;
  const founder = new ethers.NonceManager(new ethers.Wallet(PRIVATE_KEY, provider));
  const founderAddress = await founder.getAddress();
  const diamondCut = new ethers.Contract(
    DIAMOND_ADDRESS,
    loadArtifact("out/DiamondCutFacet.sol/DiamondCutFacet.json").abi,
    founder
  );

  const vestingInitArtifact = loadArtifact("out/VestingInitializer.sol/VestingInitializer.json");
  const timewaveInitArtifact = loadArtifact("out/TimewaveVestingInitializer.sol/TimewaveVestingInitializer.json");
  const vestingInitFactory = new ethers.ContractFactory(vestingInitArtifact.abi, vestingInitArtifact.bytecode.object, founder);
  const timewaveInitFactory = new ethers.ContractFactory(timewaveInitArtifact.abi, timewaveInitArtifact.bytecode.object, founder);

  const vestingInitContract = await vestingInitFactory.deploy();
  await vestingInitContract.waitForDeployment();
  const timewaveInitContract = await timewaveInitFactory.deploy();
  await timewaveInitContract.waitForDeployment();
  if (typeof founder.reset === "function") founder.reset();

  const vestingInitAddress = await vestingInitContract.getAddress();
  const timewaveInitAddress = await timewaveInitContract.getAddress();

  await sendAndWait(diamondCut.setTrustedInitContract(vestingInitAddress, true), "setTrustedInitContract:vestingReinit");
  await sendAndWait(diamondCut.setTrustedInitContract(timewaveInitAddress, true), "setTrustedInitContract:timewaveReinit");

  const vestingInitData = new ethers.Interface(vestingInitArtifact.abi).encodeFunctionData("initialize", [founderAddress]);
  const timewaveInitData = new ethers.Interface(timewaveInitArtifact.abi).encodeFunctionData("initialize", [founderAddress]);

  await expectRevert(
    () => diamondCut.diamondCut([], vestingInitAddress, vestingInitData, { gasLimit: 2_000_000 }),
    "reinitializeVesting"
  );
  await expectRevert(
    () => diamondCut.diamondCut([], timewaveInitAddress, timewaveInitData, { gasLimit: 2_000_000 }),
    "reinitializeTimewave"
  );

  console.log("TRACE_TIMEWAVE_VESTING_INITIALIZERS: PASS");
}

main().catch((err) => {
  console.error("TRACE_TIMEWAVE_VESTING_INITIALIZERS: FAIL");
  console.error(err);
  process.exit(1);
});
