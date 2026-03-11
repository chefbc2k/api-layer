#!/usr/bin/env node
"use strict";

const { ethers } = require("ethers");
require("dotenv").config();
const {
  ONE_DAY,
  sendAndWait,
  advanceTime,
  deployMarketplaceStack,
  registerVoice,
  expectedFeeBreakdown
} = require("./lib/marketplace_helpers");

const RPC_URL = process.env.RPC_URL;

function assertEq(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected.toString()} got ${actual.toString()}`);
}

async function expectRevert(promiseFactory, label) {
  let err;
  try {
    await promiseFactory();
  } catch (e) {
    err = e;
  }
  if (!err) throw new Error(`${label}: expected revert`);
}

async function mine(provider, count) {
  for (let i = 0; i < count; i += 1) {
    await provider.send("evm_mine", []);
  }
}

async function main() {
  if (!RPC_URL) throw new Error("RPC_URL is required");
  const network = await new ethers.JsonRpcProvider(RPC_URL).getNetwork();
  if (network.chainId !== 31337n) {
    throw new Error("trace_marketplace_commit_reveal is local-stack only; Base Sepolia parity is blocked until this scenario is rewritten without evm_mine/advanceTime and deployMarketplaceStack");
  }
  const feeConfig = {
    platformFee: 400n,
    referralFee: 0n,
    unionShare: 100n,
    devFund: 200n,
    timewaveGift: 150n,
    milestonePool: 0n
  };

  const { provider, diamondAddress, usdc, voiceAsset, payment, founder, wallets } = await deployMarketplaceStack(RPC_URL, {
    feeConfig,
    includeDataset: false
  });

  const creator = wallets.creator;
  const payer = wallets.buyer;
  const creatorAddress = await creator.getAddress();
  const payerAddress = await payer.getAddress();

  await sendAndWait(usdc.mint(payerAddress, 1_000_000_000n), "mintUSDC:payer");
  await sendAndWait(usdc.connect(payer).approve(diamondAddress, ethers.MaxUint256), "approveUSDC:payer");

  const voice = await registerVoice(voiceAsset, creator, "ipfs://marketplace-commit-reveal-voice", 1000);
  await advanceTime(provider, ONE_DAY + 1);
  await sendAndWait(payment.connect(founder).setMevProtectionConfig(false, ethers.ZeroAddress, 0, 1_000_000n, 2n), "setMevProtectionConfig");

  const amount = 13n * 1_000_000n;
  await expectRevert(
    () => payment.connect(payer).distributePayment.staticCall(voice.tokenId, amount, creatorAddress, ethers.ZeroAddress, false),
    "distributePayment:commit-required"
  );

  const deadline = BigInt((await provider.getBlock("latest")).timestamp) + 3600n;
  const nonce = 7n;
  const commitHash = ethers.solidityPackedKeccak256(
    ["uint256", "uint256", "address", "address", "bool", "address", "address", "uint256", "uint256"],
    [voice.tokenId, amount, creatorAddress, ethers.ZeroAddress, false, payerAddress, payerAddress, nonce, deadline]
  );

  await sendAndWait(payment.connect(payer).commitDistribution(commitHash), "commitDistribution");
  await expectRevert(
    () =>
      payment
        .connect(payer)
        .revealDistribution
        .staticCall(voice.tokenId, amount, creatorAddress, ethers.ZeroAddress, false, payerAddress, nonce, deadline),
    "revealDistribution:too-early"
  );
  await mine(provider, 3);

  const pendingBefore = await payment.getPendingPayments(creatorAddress);
  await sendAndWait(
    payment
      .connect(payer)
      .revealDistribution(voice.tokenId, amount, creatorAddress, ethers.ZeroAddress, false, payerAddress, nonce, deadline),
    "revealDistribution"
  );

  const expected = expectedFeeBreakdown(amount, feeConfig, 0n);
  const sellerPending = (await payment.getPendingPayments(creatorAddress)) - pendingBefore;
  assertEq(sellerPending, expected.sellerProceeds, "seller pending delta");

  const withdrawPending = await payment.getPendingPayments(creatorAddress);
  const withdrawDeadline = BigInt((await provider.getBlock("latest")).timestamp) + 3600n;
  const withdrawNonce = 11n;
  const withdrawHash = ethers.solidityPackedKeccak256(
    ["address", "uint256", "uint256", "uint256"],
    [creatorAddress, withdrawPending, withdrawNonce, withdrawDeadline]
  );

  await sendAndWait(payment.connect(creator).commitWithdraw(withdrawHash), "commitWithdraw");
  await expectRevert(
    () => payment.connect(creator).revealWithdraw.staticCall(withdrawPending, withdrawNonce, withdrawDeadline),
    "revealWithdraw:too-early"
  );
  await mine(provider, 3);

  const creatorBalanceBefore = await usdc.balanceOf(creatorAddress);
  await sendAndWait(
    payment.connect(creator).revealWithdraw(withdrawPending, withdrawNonce, withdrawDeadline),
    "revealWithdraw"
  );
  const creatorBalanceAfter = await usdc.balanceOf(creatorAddress);
  assertEq(creatorBalanceAfter - creatorBalanceBefore, withdrawPending, "reveal withdraw amount");
  assertEq(await payment.getPendingPayments(creatorAddress), 0n, "creator pending cleared");

  console.log("TRACE_MARKETPLACE_COMMIT_REVEAL: PASS");
}

main().catch((err) => {
  console.error("TRACE_MARKETPLACE_COMMIT_REVEAL: FAIL");
  console.error(err);
  process.exit(1);
});
