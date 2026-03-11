#!/usr/bin/env node
"use strict";

require("dotenv").config();
const { ethers } = require("ethers");
const { bootstrapGovernance } = require("./bootstrap_local_governance");
const { walletAt } = require("./lib/governance_helpers");
const { expectRevert, sendAndWait } = require("./lib/access_helpers");

const RPC_URL = process.env.RPC_URL;

async function signDelegation(wallet, chainId, verifyingContract, delegatee, nonce, expiry) {
  const domain = {
    name: "USpeaks",
    chainId,
    verifyingContract
  };
  const types = {
    Delegation: [
      { name: "delegatee", type: "address" },
      { name: "nonce", type: "uint256" },
      { name: "expiry", type: "uint256" }
    ]
  };
  const value = { delegatee, nonce, expiry };
  const sig = await wallet.signTypedData(domain, types, value);
  return ethers.Signature.from(sig);
}

async function main() {
  const { provider, diamondAddress, founderAddress, delegation, votingPower } = await bootstrapGovernance(RPC_URL);
  const signer = walletAt(provider, 1);

  const founderVotes = await votingPower.getVotingPower(founderAddress);
  await sendAndWait(
    votingPower.setupInitialVotingPower(await signer.getAddress(), founderVotes, { gasLimit: 1_500_000 }),
    "setupInitialVotingPower:signer"
  );

  const network = await provider.getNetwork();
  const expiry = BigInt((await provider.getBlock("latest")).timestamp) + 3600n;

  const firstSig = await signDelegation(signer, network.chainId, diamondAddress, founderAddress, 0n, expiry);
  let zeroNonceAccepted = true;
  try {
    await sendAndWait(
      delegation.delegateBySig(founderAddress, 0n, expiry, firstSig.v, firstSig.r, firstSig.s, { gasLimit: 2_000_000 }),
      "delegateBySig:first"
    );
  } catch (err) {
    zeroNonceAccepted = false;
  }

  if (!zeroNonceAccepted) {
    const oneSig = await signDelegation(signer, network.chainId, diamondAddress, founderAddress, 1n, expiry);
    await sendAndWait(
      delegation.delegateBySig(founderAddress, 1n, expiry, oneSig.v, oneSig.r, oneSig.s, { gasLimit: 2_000_000 }),
      "delegateBySig:first:nonce1"
    );
    throw new Error("delegateBySig rejected first-use nonce 0 but accepted nonce 1");
  }

  if ((await delegation.delegates(await signer.getAddress())) !== founderAddress) {
    throw new Error("delegateBySig should set signer delegate to founder");
  }

  await expectRevert(
    () => delegation.delegateBySig.staticCall(founderAddress, 0n, expiry, firstSig.v, firstSig.r, firstSig.s, { gasLimit: 2_000_000 }),
    "delegateBySig:replay"
  );

  const expiredSig = await signDelegation(signer, network.chainId, diamondAddress, founderAddress, 1n, 1n);
  await expectRevert(
    () => delegation.delegateBySig.staticCall(founderAddress, 1n, 1n, expiredSig.v, expiredSig.r, expiredSig.s, { gasLimit: 2_000_000 }),
    "delegateBySig:expired"
  );

  console.log("TRACE_DELEGATION_SIGNATURE_PATHS: PASS");
}

main().catch((err) => {
  console.error("TRACE_DELEGATION_SIGNATURE_PATHS: FAIL");
  console.error(err);
  process.exit(1);
});
