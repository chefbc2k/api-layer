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
  createTemplate,
  createDataset,
  listAsset,
  purchaseAsset,
  expectedFeeBreakdown
} = require("./lib/marketplace_helpers");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";

function assertEq(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected.toString()} got ${actual.toString()}`);
  }
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

  const {
    provider,
    diamondAddress,
    usdc,
    voiceAsset,
    voiceTemplate,
    voiceDataset,
    payment,
    marketplace,
    wallets
  } = await deployMarketplaceStack(RPC_URL, { feeConfig, includeDataset: true });

  const creator = wallets.creator;
  const reseller = wallets.reseller;
  const buyer = wallets.buyer;
  const treasury = await wallets.treasury.getAddress();
  const devFund = await wallets.devFund.getAddress();
  const unionTreasury = await wallets.unionTreasury.getAddress();
  const creatorAddress = await creator.getAddress();
  const resellerAddress = await reseller.getAddress();
  const buyerAddress = await buyer.getAddress();

  await sendAndWait(usdc.mint(creatorAddress, 1_000_000_000n), "mintUSDC:creator");
  await sendAndWait(usdc.mint(resellerAddress, 1_000_000_000n), "mintUSDC:reseller");
  await sendAndWait(usdc.mint(buyerAddress, 1_000_000_000n), "mintUSDC:buyer");
  await sendAndWait(usdc.connect(creator).approve(diamondAddress, ethers.MaxUint256), "approveUSDC:creator");
  await sendAndWait(usdc.connect(reseller).approve(diamondAddress, ethers.MaxUint256), "approveUSDC:reseller");
  await sendAndWait(usdc.connect(buyer).approve(diamondAddress, ethers.MaxUint256), "approveUSDC:buyer");

  const voice1 = await registerVoice(voiceAsset, creator, "ipfs://marketplace-settle-voice-1", 1000);
  const voice2 = await registerVoice(voiceAsset, creator, "ipfs://marketplace-settle-voice-2", 1000);
  const template = await createTemplate(
    voiceTemplate,
    provider,
    creator,
    creatorAddress,
    "Marketplace Settlement Template",
    "dataset settlement template"
  );
  const datasetId = await createDataset(
    voiceDataset,
    creator,
    "Marketplace Settlement Dataset",
    [voice1.tokenId, voice2.tokenId],
    template.templateId,
    "ipfs://marketplace-settlement-dataset",
    500
  );

  await advanceTime(provider, ONE_DAY + 1);

  const firstSalePrice = 100n * 1_000_000n;
  await listAsset(voiceAsset, marketplace, creator, datasetId, firstSalePrice);
  await purchaseAsset(marketplace, reseller, datasetId);

  const secondSalePrice = 200n * 1_000_000n;
  const pendingBefore = {
    seller: await payment.getPendingPayments(resellerAddress),
    creator: await payment.getPendingPayments(creatorAddress),
    treasury: await payment.getPendingPayments(treasury),
    devFund: await payment.getPendingPayments(devFund),
    unionTreasury: await payment.getPendingPayments(unionTreasury),
    gift: await payment.getPendingTimewaveGift(resellerAddress)
  };
  const revenueBefore = await payment.getRevenueMetrics();
  const assetRevenueBefore = await payment.getAssetRevenue(datasetId);

  await listAsset(voiceAsset, marketplace, reseller, datasetId, secondSalePrice);
  await purchaseAsset(marketplace, buyer, datasetId);

  const expected = expectedFeeBreakdown(secondSalePrice, feeConfig, 500n);
  assertEq(
    (await payment.getPendingPayments(resellerAddress)) - pendingBefore.seller,
    expected.sellerProceeds,
    "seller pending delta"
  );
  assertEq(
    (await payment.getPendingPayments(creatorAddress)) - pendingBefore.creator,
    expected.datasetRoyaltyAmount,
    "dataset creator royalty delta"
  );
  assertEq(
    (await payment.getPendingPayments(treasury)) - pendingBefore.treasury,
    expected.platformAmount,
    "treasury pending delta"
  );
  assertEq(
    (await payment.getPendingPayments(devFund)) - pendingBefore.devFund,
    expected.devFundAmount,
    "dev fund pending delta"
  );
  assertEq(
    (await payment.getPendingPayments(unionTreasury)) - pendingBefore.unionTreasury,
    expected.unionAmount,
    "union treasury pending delta"
  );
  assertEq(
    (await payment.getPendingTimewaveGift(resellerAddress)) - pendingBefore.gift,
    expected.timewaveGiftAmount,
    "seller gift delta"
  );

  const revenueAfter = await payment.getRevenueMetrics();
  assertEq(revenueAfter[0] - revenueBefore[0], secondSalePrice, "global volume delta");
  assertEq(revenueAfter[1] - revenueBefore[1], expected.totalPlatformFees, "global fees delta");
  assertEq(revenueAfter[2] - revenueBefore[2], expected.creatorAmount, "global royalties delta");

  const assetRevenueAfter = await payment.getAssetRevenue(datasetId);
  assertEq(assetRevenueAfter[0] - assetRevenueBefore[0], secondSalePrice, "asset volume delta");
  assertEq(assetRevenueAfter[1] - assetRevenueBefore[1], expected.totalPlatformFees, "asset fees delta");
  assertEq(assetRevenueAfter[2] - assetRevenueBefore[2], expected.creatorAmount, "asset royalties delta");

  const sellerPending = await payment.getPendingPayments(resellerAddress);
  const sellerUsdcBefore = await usdc.balanceOf(resellerAddress);
  await sendAndWait(payment.connect(reseller).withdrawPayments(), "withdrawPayments:reseller");
  const sellerUsdcAfter = await usdc.balanceOf(resellerAddress);
  assertEq(sellerUsdcAfter - sellerUsdcBefore, sellerPending, "seller withdraw amount");
  assertEq(await payment.getPendingPayments(resellerAddress), 0n, "seller pending cleared");

  const creatorPending = await payment.getPendingPayments(creatorAddress);
  const creatorUsdcBefore = await usdc.balanceOf(creatorAddress);
  await sendAndWait(payment.connect(creator).withdrawPayments(), "withdrawPayments:creator");
  const creatorUsdcAfter = await usdc.balanceOf(creatorAddress);
  assertEq(creatorUsdcAfter - creatorUsdcBefore, creatorPending, "creator withdraw amount");
  assertEq(await payment.getPendingPayments(creatorAddress), 0n, "creator pending cleared");

  const ownerAfter = await voiceAsset.ownerOf(datasetId);
  if (ownerAfter.toLowerCase() !== buyerAddress.toLowerCase()) {
    throw new Error("dataset owner should be final buyer after second sale");
  }

  console.log("TRACE_MARKETPLACE_SETTLEMENT_DISTRIBUTION: PASS");
}

main().catch((err) => {
  console.error("TRACE_MARKETPLACE_SETTLEMENT_DISTRIBUTION: FAIL");
  console.error(err);
  process.exit(1);
});
