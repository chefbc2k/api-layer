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
  listAsset,
  purchaseAsset,
  expectedFeeBreakdown
} = require("./lib/marketplace_helpers");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";

function assertEq(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected.toString()} got ${actual.toString()}`);
}

async function main() {
  const feeConfig = {
    platformFee: 400n,
    referralFee: 0n,
    unionShare: 100n,
    devFund: 200n,
    timewaveGift: 150n,
    milestonePool: 0n
  };

  const { provider, founder, usdc, voiceAsset, payment, marketplace, wallets } = await deployMarketplaceStack(RPC_URL, {
    feeConfig,
    includeDataset: false
  });

  const creator = wallets.creator;
  const buyer = wallets.buyer;
  const oldTreasury = await wallets.treasury.getAddress();
  const oldDevFund = await wallets.devFund.getAddress();
  const oldUnion = await wallets.unionTreasury.getAddress();
  const newTreasury = await wallets.extra.getAddress();
  const newDevFund = await wallets.signerA.getAddress();
  const newUnion = await wallets.signerB.getAddress();
  const creatorAddress = await creator.getAddress();
  const buyerAddress = await buyer.getAddress();

  await sendAndWait(usdc.mint(buyerAddress, 2_000_000_000n), "mintUSDC:buyer");
  await sendAndWait(usdc.connect(buyer).approve(await payment.getAddress(), ethers.MaxUint256), "approveUSDC:buyer");

  const voiceA = await registerVoice(voiceAsset, creator, "ipfs://marketplace-rotation-voice-a", 1000);
  const voiceB = await registerVoice(voiceAsset, creator, "ipfs://marketplace-rotation-voice-b", 1000);
  await advanceTime(provider, ONE_DAY + 1);

  const priceA = 80n * 1_000_000n;
  await listAsset(voiceAsset, marketplace, creator, voiceA.tokenId, priceA);
  await purchaseAsset(marketplace, buyer, voiceA.tokenId);
  const expectedA = expectedFeeBreakdown(priceA, feeConfig, 0n);

  assertEq(await payment.getPendingPayments(oldTreasury), expectedA.platformAmount, "old treasury initial pending");
  assertEq(await payment.getPendingPayments(oldDevFund), expectedA.devFundAmount, "old dev initial pending");
  assertEq(await payment.getPendingPayments(oldUnion), expectedA.unionAmount, "old union initial pending");

  await sendAndWait(payment.connect(founder).updateTreasuryAddress(newTreasury), "updateTreasuryAddress");
  await sendAndWait(payment.connect(founder).updateDevFundAddress(newDevFund), "updateDevFundAddress");
  await sendAndWait(payment.connect(founder).updateUnionTreasuryAddress(newUnion), "updateUnionTreasuryAddress");

  const priceB = 120n * 1_000_000n;
  await listAsset(voiceAsset, marketplace, creator, voiceB.tokenId, priceB);
  await purchaseAsset(marketplace, buyer, voiceB.tokenId);
  const expectedB = expectedFeeBreakdown(priceB, feeConfig, 0n);

  assertEq(await payment.getPendingPayments(oldTreasury), expectedA.platformAmount, "old treasury preserved");
  assertEq(await payment.getPendingPayments(oldDevFund), expectedA.devFundAmount, "old dev preserved");
  assertEq(await payment.getPendingPayments(oldUnion), expectedA.unionAmount, "old union preserved");

  assertEq(await payment.getPendingPayments(newTreasury), expectedB.platformAmount, "new treasury accrual");
  assertEq(await payment.getPendingPayments(newDevFund), expectedB.devFundAmount, "new dev accrual");
  assertEq(await payment.getPendingPayments(newUnion), expectedB.unionAmount, "new union accrual");

  const oldTreasuryBalBefore = await usdc.balanceOf(oldTreasury);
  await sendAndWait(payment.connect(wallets.treasury).withdrawPayments(), "withdrawPayments:oldTreasury");
  const oldTreasuryBalAfter = await usdc.balanceOf(oldTreasury);
  assertEq(oldTreasuryBalAfter - oldTreasuryBalBefore, expectedA.platformAmount, "old treasury withdraw");

  console.log("TRACE_MARKETPLACE_FEE_ADDRESS_ROTATION: PASS");
}

main().catch((err) => {
  console.error("TRACE_MARKETPLACE_FEE_ADDRESS_ROTATION: FAIL");
  console.error(err);
  process.exit(1);
});
