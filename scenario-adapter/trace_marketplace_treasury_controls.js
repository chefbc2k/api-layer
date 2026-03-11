#!/usr/bin/env node
"use strict";

const { ethers } = require("ethers");
require("dotenv").config();
const {
  ONE_DAY,
  ROLE,
  sendAndWait,
  advanceTime,
  deployMarketplaceStack,
  registerVoice,
  listAsset,
  purchaseAsset,
  expectedFeeBreakdown,
  ensureRole
} = require("./lib/marketplace_helpers");

const RPC_URL = process.env.RPC_URL;

function assertEq(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected.toString()} got ${actual.toString()}`);
  }
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
  if (!RPC_URL) throw new Error("RPC_URL is required");
  const network = await new ethers.JsonRpcProvider(RPC_URL).getNetwork();
  if (network.chainId !== 31337n) {
    throw new Error("trace_marketplace_treasury_controls is local-stack only; Base Sepolia parity is blocked until this scenario is rewritten to use the deployed baseline instead of deployMarketplaceStack/advanceTime");
  }
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
    access,
    founder,
    diamondAddress,
    usdc,
    voiceAsset,
    payment,
    marketplace,
    wallets
  } = await deployMarketplaceStack(RPC_URL, { feeConfig, includeDataset: false, seedMultisigThreshold: 10n * 1_000_000n });

  const creator = wallets.creator;
  const buyer = wallets.buyer;
  const treasury = wallets.treasury;
  const signerA = wallets.signerA;
  const signerB = wallets.signerB;
  const creatorAddress = await creator.getAddress();
  const buyerAddress = await buyer.getAddress();
  const treasuryAddress = await treasury.getAddress();
  const signerAAddress = await signerA.getAddress();
  const signerBAddress = await signerB.getAddress();
  const usdcAddress = await usdc.getAddress();

  if (!(await access.hasRole(ROLE.BOARD_MEMBER_ROLE, await founder.getAddress()))) {
    await sendAndWait(
      access.connect(founder).grantRole(ROLE.BOARD_MEMBER_ROLE, await founder.getAddress(), ethers.MaxUint256),
      "grantRole:BOARD_MEMBER_ROLE"
    );
  }
  if (!(await access.hasRole(ROLE.TREASURY_ROLE, await founder.getAddress()))) {
    await sendAndWait(
      access.connect(founder).grantRole(ROLE.TREASURY_ROLE, await founder.getAddress(), ethers.MaxUint256),
      "grantRole:TREASURY_ROLE"
    );
  }
  await ensureRole(access, founder, ROLE.TREASURY_SIGNER_ROLE, signerAAddress, "TREASURY_SIGNER_ROLE:A");
  await ensureRole(access, founder, ROLE.TREASURY_SIGNER_ROLE, signerBAddress, "TREASURY_SIGNER_ROLE:B");

  await sendAndWait(usdc.mint(creatorAddress, 1_000_000_000n), "mintUSDC:creator");
  await sendAndWait(usdc.mint(buyerAddress, 1_000_000_000n), "mintUSDC:buyer");
  await sendAndWait(usdc.connect(creator).approve(diamondAddress, ethers.MaxUint256), "approveUSDC:creator");
  await sendAndWait(usdc.connect(buyer).approve(diamondAddress, ethers.MaxUint256), "approveUSDC:buyer");

  const voice = await registerVoice(voiceAsset, creator, "ipfs://marketplace-treasury-voice", 1000);
  await advanceTime(provider, ONE_DAY + 1);

  const salePrice = 500n * 1_000_000n;
  await listAsset(voiceAsset, marketplace, creator, voice.tokenId, salePrice);
  await purchaseAsset(marketplace, buyer, voice.tokenId);

  const expected = expectedFeeBreakdown(salePrice, feeConfig, 0n);
  assertEq(await payment.getPendingPayments(treasuryAddress), expected.platformAmount, "treasury pending from sale");

  await sendAndWait(
    payment.connect(founder).setTreasuryWithdrawalLimit(20n * 1_000_000n, ONE_DAY, 3600),
    "setTreasuryWithdrawalLimit"
  );

  await expectRevert(() => payment.connect(treasury).withdrawPayments.staticCall(), "withdrawPayments:treasury-multisig-required");

  const multisigAmount = 12n * 1_000_000n;
  await sendAndWait(
    payment.connect(signerA).approveMultisigWithdrawal(usdcAddress, multisigAmount, treasuryAddress),
    "approveMultisigWithdrawal:A"
  );
  await sendAndWait(
    payment.connect(signerB).approveMultisigWithdrawal(usdcAddress, multisigAmount, treasuryAddress),
    "approveMultisigWithdrawal:B"
  );

  const treasuryBalanceBefore = await usdc.balanceOf(treasuryAddress);
  await sendAndWait(
    payment.connect(treasury).executeMultisigWithdrawal(usdcAddress, multisigAmount, treasuryAddress, 2),
    "executeMultisigWithdrawal"
  );
  const treasuryBalanceAfter = await usdc.balanceOf(treasuryAddress);
  assertEq(treasuryBalanceAfter - treasuryBalanceBefore, multisigAmount, "multisig withdrawal balance delta");
  assertEq(await payment.getPendingPayments(treasuryAddress), expected.platformAmount - multisigAmount, "pending after multisig");

  const directAmount = 4n * 1_000_000n;
  await expectRevert(
    () => payment.connect(treasury).withdrawPayments.staticCall(usdcAddress, directAmount),
    "withdrawPayments:treasury-cooldown-after-multisig"
  );

  await advanceTime(provider, 3601);
  await sendAndWait(
    payment.connect(treasury).withdrawPayments(usdcAddress, directAmount, { gasLimit: 2_000_000 }),
    "withdrawPayments:treasury-direct-1"
  );
  assertEq(
    await payment.getPendingPayments(treasuryAddress),
    expected.platformAmount - multisigAmount - directAmount,
    "pending after direct withdrawal"
  );

  await expectRevert(
    () => payment.connect(treasury).withdrawPayments.staticCall(usdcAddress, directAmount),
    "withdrawPayments:treasury-cooldown"
  );

  await advanceTime(provider, 3601);
  await sendAndWait(
    payment.connect(treasury).withdrawPayments(usdcAddress, directAmount, { gasLimit: 2_000_000 }),
    "withdrawPayments:treasury-direct-2"
  );

  await expectRevert(
    () => payment.connect(treasury).withdrawPayments.staticCall(usdcAddress, 1n * 1_000_000n),
    "withdrawPayments:treasury-window-limit"
  );

  await advanceTime(provider, ONE_DAY + 1);
  await sendAndWait(
    payment.connect(treasury).withdrawPayments(usdcAddress, 1n * 1_000_000n, { gasLimit: 2_000_000 }),
    "withdrawPayments:treasury-window-reset"
  );

  console.log("TRACE_MARKETPLACE_TREASURY_CONTROLS: PASS");
}

main().catch((err) => {
  console.error("TRACE_MARKETPLACE_TREASURY_CONTROLS: FAIL");
  console.error(err);
  process.exit(1);
});
