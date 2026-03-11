#!/usr/bin/env node
"use strict";

const { ethers } = require("ethers");
require("dotenv").config();
const {
  ONE_DAY,
  loadArtifact,
  sendAndWait,
  deploy,
  advanceTime,
  deployMarketplaceStack,
  registerVoice,
  listAsset,
  purchaseAsset,
  expectedFeeBreakdown
} = require("./lib/marketplace_helpers");

const RPC_URL = process.env.RPC_URL;

function assertEq(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected.toString()} got ${actual.toString()}`);
  }
}

async function main() {
  const feeConfig = {
    platformFee: 700n,
    referralFee: 0n,
    unionShare: 50n,
    devFund: 50n,
    timewaveGift: 50n,
    milestonePool: 0n
  };

  const {
    provider,
    founder,
    diamondAddress,
    usdc,
    voiceAsset,
    payment,
    marketplace,
    wallets
  } = await deployMarketplaceStack(RPC_URL, { feeConfig, includeDataset: false });

  const creator = wallets.creator;
  const buyer = wallets.buyer;
  const treasuryAddress = await wallets.treasury.getAddress();
  const creatorAddress = await creator.getAddress();
  const buyerAddress = await buyer.getAddress();

  const mockSinkArtifact = loadArtifact("out/MarketplaceScenarioMocks.sol/MockStakingRewardsSink.json");
  const routerArtifact = loadArtifact("out/MarketplaceScenarioMocks.sol/MockBuybackRouter.json");
  const uspkArtifact = loadArtifact("out/RealFacetReentrancyMocks.sol/CallbackReentrantERC20.json");

  const stakingSink = await deploy(
    new ethers.ContractFactory(mockSinkArtifact.abi, mockSinkArtifact.bytecode.object, founder),
    "MockStakingRewardsSink",
    await usdc.getAddress()
  );
  const buybackRouter = await deploy(
    new ethers.ContractFactory(routerArtifact.abi, routerArtifact.bytecode.object, founder),
    "MockBuybackRouter"
  );
  const uspkToken = await deploy(
    new ethers.ContractFactory(uspkArtifact.abi, uspkArtifact.bytecode.object, founder),
    "CallbackReentrantERC20:USPK",
    "USpeaks",
    "USPK",
    10
  );

  await sendAndWait(payment.connect(founder).setStakingConfig(await stakingSink.getAddress(), 3000), "setStakingConfig");
  await sendAndWait(
    payment
      .connect(founder)
      .setBuybackConfig(2000, 1n, 1n, ONE_DAY, await buybackRouter.getAddress(), await uspkToken.getAddress(), ethers.ZeroAddress),
    "setBuybackConfig"
  );
  await sendAndWait(buybackRouter.setReturnAmount(123_456_789n), "setReturnAmount");

  await sendAndWait(usdc.mint(creatorAddress, 1_000_000_000n), "mintUSDC:creator");
  await sendAndWait(usdc.mint(buyerAddress, 1_000_000_000n), "mintUSDC:buyer");
  await sendAndWait(usdc.connect(creator).approve(diamondAddress, ethers.MaxUint256), "approveUSDC:creator");
  await sendAndWait(usdc.connect(buyer).approve(diamondAddress, ethers.MaxUint256), "approveUSDC:buyer");

  const voice = await registerVoice(voiceAsset, creator, "ipfs://marketplace-staking-buyback-voice", 1000);
  await advanceTime(provider, ONE_DAY + 1);

  const salePrice = 100n * 1_000_000n;
  const treasuryBefore = await payment.getPendingPayments(treasuryAddress);
  await listAsset(voiceAsset, marketplace, creator, voice.tokenId, salePrice);
  await purchaseAsset(marketplace, buyer, voice.tokenId);

  const expected = expectedFeeBreakdown(salePrice, feeConfig, 0n, { buybackBps: 2000n, stakingAllocationBps: 3000n });
  assertEq(await stakingSink.totalFunded(), expected.stakingAmount, "staking funded amount");
  assertEq(await usdc.balanceOf(await stakingSink.getAddress()), expected.stakingAmount, "staking sink usdc balance");
  assertEq((await payment.getPendingPayments(treasuryAddress)) - treasuryBefore, expected.platformAmount, "treasury delta");

  const buybackStatus = await payment.getBuybackStatus();
  assertEq(buybackStatus.accumulator, expected.buybackAmount, "buyback accumulator");

  const diamondUsdcBefore = await usdc.balanceOf(diamondAddress);
  await sendAndWait(payment.connect(founder).executeQuarterlyBuyback(expected.buybackAmount, 123_456_789n), "executeQuarterlyBuyback");
  const diamondUsdcAfter = await usdc.balanceOf(diamondAddress);

  const buybackStatusAfter = await payment.getBuybackStatus();
  assertEq(buybackStatusAfter.accumulator, 0n, "buyback accumulator cleared");
  assertEq(diamondUsdcBefore - diamondUsdcAfter, expected.buybackAmount, "diamond usdc spent on buyback");
  assertEq(await uspkToken.totalSupply(), 0n, "uspk token burned after buyback");

  console.log("TRACE_MARKETPLACE_STAKING_BUYBACK: PASS");
}

main().catch((err) => {
  console.error("TRACE_MARKETPLACE_STAKING_BUYBACK: FAIL");
  console.error(err);
  process.exit(1);
});
