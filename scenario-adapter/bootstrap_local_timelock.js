#!/usr/bin/env node
"use strict";

const { ethers } = require("ethers");
require("dotenv").config();
const {
  loadArtifact,
  createProvider,
  deploy,
  sendAndWait
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
  const proposer = await walletAt(provider, 1).getAddress();
  const executor = await walletAt(provider, 2).getAddress();
  const admin = await founder.getAddress();

  const timelockArtifact = loadArtifact("out/TimeLock.sol/TimeLock.json");
  const dummyArtifact = loadArtifact("out/DummyContract.sol/DummyContract.json");

  const timelock = await deploy(
    new ethers.ContractFactory(timelockArtifact.abi, timelockArtifact.bytecode.object, founder),
    "TimeLock",
    24 * 60 * 60,
    [proposer],
    [executor],
    admin
  );

  const dummy = await deploy(
    new ethers.ContractFactory(dummyArtifact.abi, dummyArtifact.bytecode.object, founder),
    "DummyContract"
  );

  await sendAndWait(
    dummy.connect(founder).transferOwnership(await timelock.getAddress(), { gasLimit: 500_000 }),
    "dummy:transferOwnershipToTimelock"
  );

  console.log(`BOOTSTRAP_LOCAL_TIMELOCK: PASS timelock=${await timelock.getAddress()} target=${await dummy.getAddress()}`);
}

main().catch((err) => {
  console.error("BOOTSTRAP_LOCAL_TIMELOCK: FAIL");
  console.error(err);
  process.exit(1);
});
