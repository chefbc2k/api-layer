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

async function main() {
  const feeConfig = {
    platformFee: 400n,
    referralFee: 0n,
    unionShare: 100n,
    devFund: 200n,
    timewaveGift: 150n,
    milestonePool: 0n
  };

  const { provider, diamondAddress, usdc, voiceAsset, payment, wallets } = await deployMarketplaceStack(RPC_URL, {
    feeConfig,
    includeDataset: false
  });

  const creator = wallets.creator;
  const buyer = wallets.buyer;
  const creatorAddress = await creator.getAddress();
  const buyerAddress = await buyer.getAddress();

  await sendAndWait(usdc.mint(buyerAddress, 1_000_000_000n), "mintUSDC:buyer");
  await sendAndWait(usdc.connect(buyer).approve(diamondAddress, ethers.MaxUint256), "approveUSDC:buyer");

  const voice = await registerVoice(voiceAsset, creator, "ipfs://marketplace-deadline-voice", 1000);
  await advanceTime(provider, ONE_DAY + 1);

  const amount = 50n * 1_000_000n;
  const now = BigInt((await provider.getBlock("latest")).timestamp);

  await expectRevert(
    () =>
      payment
        .connect(buyer)
        .distributePaymentFromWithDeadline
        .staticCall(voice.tokenId, amount, creatorAddress, ethers.ZeroAddress, false, buyerAddress, now - 1n),
    "distributePaymentFromWithDeadline:expired"
  );

  const pendingBefore = await payment.getPendingPayments(creatorAddress);
  await sendAndWait(
    payment
      .connect(buyer)
      .distributePaymentFromWithDeadline(voice.tokenId, amount, creatorAddress, ethers.ZeroAddress, false, buyerAddress, now + 3600n),
    "distributePaymentFromWithDeadline:valid"
  );
  const expected = expectedFeeBreakdown(amount, feeConfig, 0n);
  assertEq((await payment.getPendingPayments(creatorAddress)) - pendingBefore, expected.sellerProceeds, "seller pending delta");

  const withdrawDeadline = BigInt((await provider.getBlock("latest")).timestamp);
  await expectRevert(
    () => payment.connect(creator).withdrawPaymentsWithDeadline.staticCall(withdrawDeadline - 1n),
    "withdrawPaymentsWithDeadline:expired"
  );

  const creatorBalanceBefore = await usdc.balanceOf(creatorAddress);
  const creatorPending = await payment.getPendingPayments(creatorAddress);
  await sendAndWait(
    payment.connect(creator).withdrawPaymentsWithDeadline(withdrawDeadline + 3600n),
    "withdrawPaymentsWithDeadline:valid"
  );
  const creatorBalanceAfter = await usdc.balanceOf(creatorAddress);
  assertEq(creatorBalanceAfter - creatorBalanceBefore, creatorPending, "withdraw amount");
  assertEq(await payment.getPendingPayments(creatorAddress), 0n, "creator pending cleared");

  console.log("TRACE_MARKETPLACE_DEADLINE_PATHS: PASS");
}

main().catch((err) => {
  console.error("TRACE_MARKETPLACE_DEADLINE_PATHS: FAIL");
  console.error(err);
  process.exit(1);
});
