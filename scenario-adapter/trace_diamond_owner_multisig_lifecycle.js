#!/usr/bin/env node
"use strict";

const { ethers } = require("ethers");
require("dotenv").config();
const { createProvider, loadArtifact, sendAndWait, randomWallet, fundEth } = require("./lib/access_helpers");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const PRIVATE_KEY = process.env.PRIVATE_KEY;

async function main() {
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const provider = createProvider(RPC_URL);
  const founder = new ethers.NonceManager(new ethers.Wallet(PRIVATE_KEY, provider));
  const owners = [
    founder,
    randomWallet(provider),
    randomWallet(provider),
    randomWallet(provider),
    randomWallet(provider)
  ];
  const nonOwner = randomWallet(provider);
  const recipient = randomWallet(provider);

  await fundEth(founder, [...owners.slice(1), nonOwner, recipient]);

  const multisigArtifact = loadArtifact("out/DiamondOwnerMultiSig.sol/DiamondOwnerMultiSig.json");
  const factory = new ethers.ContractFactory(multisigArtifact.abi, multisigArtifact.bytecode.object, founder);
  const ownerAddresses = await Promise.all(owners.map((w) => w.getAddress()));
  const multisig = await factory.deploy(ownerAddresses);
  await multisig.waitForDeployment();
  const multisigAddress = await multisig.getAddress();
  await sendAndWait(
    founder.sendTransaction({ to: multisigAddress, value: ethers.parseEther("3") }),
    "fundDiamondOwnerMultiSig"
  );

  let err;
  try {
    await sendAndWait(multisig.connect(nonOwner).submitTransaction(await recipient.getAddress(), ethers.parseEther("1"), "0x"), "submitTransaction:nonOwner");
  } catch (e) {
    err = e;
  }
  if (!err) throw new Error("non-owner submit should revert");

  const submitRc = await sendAndWait(
    multisig.connect(owners[0]).submitTransaction(await recipient.getAddress(), ethers.parseEther("1"), "0x"),
    "submitTransaction:owner"
  );
  const submitLog = submitRc.logs
    .map((log) => { try { return multisig.interface.parseLog(log); } catch { return null; } })
    .find((log) => log && log.name === "Submission");
  if (!submitLog) throw new Error("submission event missing");
  const txId = submitLog.args.transactionId;

  await sendAndWait(multisig.connect(owners[0]).approveTransaction(txId), "approveTransaction:owner1");
  await sendAndWait(multisig.connect(owners[1]).approveTransaction(txId), "approveTransaction:owner2");

  let executeErr;
  try {
    await multisig.connect(owners[0]).executeTransaction.staticCall(txId);
  } catch (e) {
    executeErr = e;
  }
  if (!executeErr) throw new Error("execute before threshold should revert");

  await sendAndWait(multisig.connect(owners[2]).approveTransaction(txId), "approveTransaction:owner3");
  const beforeRecipient = await provider.getBalance(await recipient.getAddress());
  const execTx = await multisig.connect(owners[0]).executeTransaction(txId);
  console.log(
    `[tx] executeTransaction:thresholdMet from=${execTx.from} nonce=${execTx.nonce} sel=${(execTx.data || "0x").slice(0, 10)} hash=${execTx.hash}`
  );
  const execRc = await execTx.wait();
  if (!execRc || (execRc.status !== 1n && execRc.status !== 1)) {
    throw new Error("executeTransaction:thresholdMet reverted");
  }
  const afterRecipient = await provider.getBalance(await recipient.getAddress());
  if (afterRecipient - beforeRecipient !== ethers.parseEther("1")) {
    throw new Error("recipient should receive threshold-approved payment");
  }

  console.log("TRACE_DIAMOND_OWNER_MULTISIG_LIFECYCLE: PASS");
}

main().catch((err) => {
  console.error("TRACE_DIAMOND_OWNER_MULTISIG_LIFECYCLE: FAIL");
  console.error(err);
  process.exit(1);
});
