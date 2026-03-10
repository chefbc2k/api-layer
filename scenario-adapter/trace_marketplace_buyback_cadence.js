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
  purchaseAsset
} = require("./lib/marketplace_helpers");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const MONTH = 30 * ONE_DAY;

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
    platformFee: 700n,
    referralFee: 0n,
    unionShare: 50n,
    devFund: 50n,
    timewaveGift: 50n,
    milestonePool: 0n
  };

  const { provider, founder, diamondAddress, usdc, voiceAsset, payment, marketplace, wallets } =
    await deployMarketplaceStack(RPC_URL, { feeConfig, includeDataset: false });

  const routerArtifact = loadArtifact("out/MarketplaceScenarioMocks.sol/MockBuybackRouter.json");
  const uspkArtifact = loadArtifact("out/RealFacetReentrancyMocks.sol/CallbackReentrantERC20.json");
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

  await sendAndWait(
    payment.connect(founder).setBuybackConfig(2000, 50n * 1_000_000n, 2n, ONE_DAY, await buybackRouter.getAddress(), await uspkToken.getAddress(), ethers.ZeroAddress),
    "setBuybackConfig"
  );
  await sendAndWait(buybackRouter.setReturnAmount(123_456_789n), "setReturnAmount");

  const creator = wallets.creator;
  const buyer = wallets.buyer;
  const creatorAddress = await creator.getAddress();
  const buyerAddress = await buyer.getAddress();
  await sendAndWait(usdc.mint(buyerAddress, 3_000_000_000n), "mintUSDC:buyer");
  await sendAndWait(usdc.connect(buyer).approve(diamondAddress, ethers.MaxUint256), "approveUSDC:buyer");

  const voiceA = await registerVoice(voiceAsset, creator, "ipfs://marketplace-buyback-month-a", 1000);
  await advanceTime(provider, ONE_DAY + 1);
  await listAsset(voiceAsset, marketplace, creator, voiceA.tokenId, 100n * 1_000_000n);
  await purchaseAsset(marketplace, buyer, voiceA.tokenId);

  await expectRevert(
    () => payment.connect(founder).executeQuarterlyBuyback.staticCall(1n, 1n),
    "executeQuarterlyBuyback:not-active-after-first-month"
  );

  await advanceTime(provider, MONTH + ONE_DAY);
  const voiceB = await registerVoice(voiceAsset, creator, "ipfs://marketplace-buyback-month-b", 1000);
  await advanceTime(provider, ONE_DAY + 1);
  await listAsset(voiceAsset, marketplace, creator, voiceB.tokenId, 100n * 1_000_000n);
  await purchaseAsset(marketplace, buyer, voiceB.tokenId);

  const status = await payment.getBuybackStatus();
  if (status.consecutiveMonths < 1n) {
    throw new Error(`expected at least one prior qualifying month, got ${status.consecutiveMonths.toString()}`);
  }

  await sendAndWait(payment.connect(founder).executeQuarterlyBuyback(status.accumulator, 123_456_789n), "executeQuarterlyBuyback");
  await expectRevert(
    () => payment.connect(founder).executeQuarterlyBuyback.staticCall(1n, 1n),
    "executeQuarterlyBuyback:cadence-not-met"
  );

  console.log("TRACE_MARKETPLACE_BUYBACK_CADENCE: PASS");
}

main().catch((err) => {
  console.error("TRACE_MARKETPLACE_BUYBACK_CADENCE: FAIL");
  console.error(err);
  process.exit(1);
});
