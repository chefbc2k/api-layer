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
  ensureRole
} = require("./lib/marketplace_helpers");

const RPC_URL = process.env.RPC_URL;

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
    throw new Error("trace_marketplace_multisig_negative is local-stack only; Base Sepolia parity is blocked until this scenario is rewritten to use the deployed baseline instead of deployMarketplaceStack/advanceTime");
  }
  const feeConfig = {
    platformFee: 700n,
    referralFee: 0n,
    unionShare: 50n,
    devFund: 50n,
    timewaveGift: 50n,
    milestonePool: 0n
  };

  const { provider, access, founder, usdc, voiceAsset, payment, marketplace, wallets } =
    await deployMarketplaceStack(RPC_URL, { feeConfig, includeDataset: false, seedMultisigThreshold: 10n * 1_000_000n });

  const founderAddress = await founder.getAddress();
  const creator = wallets.creator;
  const buyer = wallets.buyer;
  const treasury = wallets.treasury;
  const signerA = wallets.signerA;
  const signerB = wallets.signerB;
  const signerAAddress = await signerA.getAddress();
  const signerBAddress = await signerB.getAddress();
  const treasuryAddress = await treasury.getAddress();
  const usdcAddress = await usdc.getAddress();

  if (!(await access.hasRole(ROLE.BOARD_MEMBER_ROLE, founderAddress))) {
    await sendAndWait(access.connect(founder).grantRole(ROLE.BOARD_MEMBER_ROLE, founderAddress, ethers.MaxUint256), "grantRole:BOARD_MEMBER_ROLE");
  }
  if (!(await access.hasRole(ROLE.TREASURY_ROLE, founderAddress))) {
    await sendAndWait(access.connect(founder).grantRole(ROLE.TREASURY_ROLE, founderAddress, ethers.MaxUint256), "grantRole:TREASURY_ROLE");
  }
  await ensureRole(access, founder, ROLE.TREASURY_SIGNER_ROLE, signerAAddress, "TREASURY_SIGNER_ROLE:A");
  await ensureRole(access, founder, ROLE.TREASURY_SIGNER_ROLE, signerBAddress, "TREASURY_SIGNER_ROLE:B");

  const creatorAddress = await creator.getAddress();
  const buyerAddress = await buyer.getAddress();
  await sendAndWait(usdc.mint(buyerAddress, 1_000_000_000n), "mintUSDC:buyer");
  await sendAndWait(usdc.connect(buyer).approve(await payment.getAddress(), ethers.MaxUint256), "approveUSDC:buyer");

  const voice = await registerVoice(voiceAsset, creator, "ipfs://marketplace-multisig-negative", 1000);
  await advanceTime(provider, ONE_DAY + 1);
  await listAsset(voiceAsset, marketplace, creator, voice.tokenId, 500n * 1_000_000n);
  await purchaseAsset(marketplace, buyer, voice.tokenId);

  const withdrawalAmount = 12n * 1_000_000n;
  await sendAndWait(
    payment.connect(signerA).approveMultisigWithdrawal(usdcAddress, withdrawalAmount, treasuryAddress),
    "approveMultisigWithdrawal:A"
  );
  await expectRevert(
    () => payment.connect(signerA).approveMultisigWithdrawal.staticCall(usdcAddress, withdrawalAmount, treasuryAddress),
    "approveMultisigWithdrawal:duplicate"
  );
  await expectRevert(
    () => payment.connect(treasury).executeMultisigWithdrawal.staticCall(usdcAddress, withdrawalAmount, treasuryAddress, 2),
    "executeMultisigWithdrawal:insufficient-approvals"
  );

  await sendAndWait(
    payment.connect(signerB).approveMultisigWithdrawal(usdcAddress, withdrawalAmount, treasuryAddress),
    "approveMultisigWithdrawal:B"
  );
  await expectRevert(
    () => payment.connect(treasury).executeMultisigWithdrawal.staticCall(usdcAddress, withdrawalAmount, treasuryAddress, 3),
    "executeMultisigWithdrawal:too-many-required"
  );

  await sendAndWait(
    payment.connect(treasury).executeMultisigWithdrawal(usdcAddress, withdrawalAmount, treasuryAddress, 2),
    "executeMultisigWithdrawal"
  );
  await expectRevert(
    () => payment.connect(treasury).executeMultisigWithdrawal.staticCall(usdcAddress, withdrawalAmount, treasuryAddress, 2),
    "executeMultisigWithdrawal:replay"
  );

  console.log("TRACE_MARKETPLACE_MULTISIG_NEGATIVE: PASS");
}

main().catch((err) => {
  console.error("TRACE_MARKETPLACE_MULTISIG_NEGATIVE: FAIL");
  console.error(err);
  process.exit(1);
});
