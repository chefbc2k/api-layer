#!/usr/bin/env node
"use strict";

require("dotenv").config();
const { ethers } = require("ethers");
const { loadArtifact, selectorsForAbi, sendAndWait, deploy } = require("./lib/reentrancy_real_helpers");
const { expectRevert } = require("./lib/access_helpers");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const FOUNDER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("FOUNDER_ROLE"));

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL, undefined, { batchMaxCount: 1, cacheTimeout: -1 });
  provider.pollingInterval = 250;
  const founder = new ethers.NonceManager(
    ethers.HDNodeWallet.fromPhrase(
      process.env.MNEMONIC || "test test test test test test test test test test test junk",
      undefined,
      "m/44'/60'/0'/0/0"
    ).connect(provider)
  );
  const founderAddress = await founder.getAddress();

  const diamondCutArtifact = loadArtifact("out/DiamondCutFacet.sol/DiamondCutFacet.json");
  const diamondArtifact = loadArtifact("out/Diamond.sol/Diamond.json");
  const accessArtifact = loadArtifact("out/AccessControlFacet.sol/AccessControlFacet.json");
  const accessInitArtifact = loadArtifact("out/AccessControlInit.sol/AccessControlInit.json");

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

  const accessFacet = await deploy(
    new ethers.ContractFactory(accessArtifact.abi, accessArtifact.bytecode.object, founder),
    "AccessControlFacet"
  );
  const accessInit = await deploy(
    new ethers.ContractFactory(accessInitArtifact.abi, accessInitArtifact.bytecode.object, founder),
    "AccessControlInit"
  );
  const accessInitAddress = await accessInit.getAddress();
  const accessInitSelector = new ethers.Interface(accessInitArtifact.abi).getFunction("init").selector;

  const initData = new ethers.Interface(accessInitArtifact.abi).encodeFunctionData("init", [founderAddress]);
  const cut = [{
    facetAddress: await accessFacet.getAddress(),
    action: 0,
    functionSelectors: selectorsForAbi(accessArtifact.abi)
  }];

  await expectRevert(
    () => diamondCut.diamondCut.staticCall(cut, accessInitAddress, initData, { gasLimit: 8_000_000 }),
    "diamondCut:untrustedInit"
  );

  await sendAndWait(
    diamondCut.setTrustedInitContract(accessInitAddress, true, { gasLimit: 1_000_000 }),
    "setTrustedInitContract:true"
  );
  await sendAndWait(
    diamondCut.setTrustedInitSelector(accessInitAddress, "0xdeadbeef", true, { gasLimit: 1_000_000 }),
    "setTrustedInitSelector:wrong"
  );

  await expectRevert(
    () => diamondCut.diamondCut.staticCall(cut, accessInitAddress, initData, { gasLimit: 8_000_000 }),
    "diamondCut:selectorPolicyBlocked"
  );

  await sendAndWait(
    diamondCut.setTrustedInitSelector(accessInitAddress, accessInitSelector, true, { gasLimit: 1_000_000 }),
    "setTrustedInitSelector:init"
  );
  await sendAndWait(
    diamondCut.setTrustedInitCodehash(accessInitAddress, ethers.keccak256("0x1234"), { gasLimit: 1_000_000 }),
    "setTrustedInitCodehash:wrong"
  );

  await expectRevert(
    () => diamondCut.diamondCut.staticCall(cut, accessInitAddress, initData, { gasLimit: 8_000_000 }),
    "diamondCut:codehashBlocked"
  );

  const actualCodehash = ethers.keccak256(await provider.getCode(accessInitAddress));
  await sendAndWait(
    diamondCut.setTrustedInitCodehash(accessInitAddress, actualCodehash, { gasLimit: 1_000_000 }),
    "setTrustedInitCodehash:actual"
  );
  await sendAndWait(
    diamondCut.diamondCut(cut, accessInitAddress, initData, { gasLimit: 10_000_000 }),
    "diamondCut:addAccessWithTrustedInit"
  );

  const access = new ethers.Contract(diamondAddress, accessArtifact.abi, founder);
  if (!(await access.hasRole(FOUNDER_ROLE, founderAddress))) throw new Error("trusted init should initialize founder role");

  console.log("TRACE_DIAMOND_TRUSTED_INIT_POLICY: PASS");
}

main().catch((err) => {
  console.error("TRACE_DIAMOND_TRUSTED_INIT_POLICY: FAIL");
  console.error(err);
  process.exit(1);
});
