#!/usr/bin/env node
"use strict";

const { ethers } = require("ethers");
require("dotenv").config();
const {
  ROLE,
  loadArtifact,
  createProvider,
  sendAndWait,
  expectRevert,
  advanceTime,
  randomWallet,
  fundEth
} = require("./lib/access_helpers");

const RPC_URL = process.env.RPC_URL;
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

async function expectStaticRevert(callFn, label) {
  let err;
  try {
    await callFn();
  } catch (e) {
    err = e;
  }
  if (!err) throw new Error(`${label}: expected revert`);
  const data = err?.data || err?.info?.error?.data || "<none>";
  console.log(`[expect-revert-ok] ${label} data=${data}`);
}

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const provider = createProvider(RPC_URL);
  const founder = new ethers.NonceManager(new ethers.Wallet(PRIVATE_KEY, provider));
  const founderAddress = await founder.getAddress();
  const timelock = randomWallet(provider);
  const emergencyAdmin1 = randomWallet(provider);
  const feeManager1 = randomWallet(provider);
  const feeManager2 = randomWallet(provider);
  const recipient = randomWallet(provider);
  const outsider = randomWallet(provider);

  const timelockAddress = await timelock.getAddress();
  const emergencyAdmin1Address = await emergencyAdmin1.getAddress();
  const feeManager1Address = await feeManager1.getAddress();
  const feeManager2Address = await feeManager2.getAddress();
  const recipientAddress = await recipient.getAddress();

  const access = new ethers.Contract(
    DIAMOND_ADDRESS,
    loadArtifact("out/AccessControlFacet.sol/AccessControlFacet.json").abi,
    provider
  );
  const withdraw = new ethers.Contract(
    DIAMOND_ADDRESS,
    loadArtifact("out/EmergencyWithdrawalFacet.sol/EmergencyWithdrawalFacet.json").abi,
    provider
  );
  const withdrawIface = new ethers.Interface(loadArtifact("out/EmergencyWithdrawalFacet.sol/EmergencyWithdrawalFacet.json").abi);

  await fundEth(founder, [timelock, emergencyAdmin1, feeManager1, feeManager2, recipient, outsider]);
  await sendAndWait(
    founder.sendTransaction({ to: DIAMOND_ADDRESS, value: ethers.parseEther("6") }),
    "fundDiamond:eth"
  );

  await sendAndWait(
    access.connect(founder).grantRole(ROLE.TIMELOCK_ROLE, timelockAddress, ethers.MaxUint256),
    "grantRole:TIMELOCK_ROLE:timelock"
  );
  await sendAndWait(
    access.connect(timelock).grantRole(ROLE.EMERGENCY_ADMIN_ROLE, emergencyAdmin1Address, ethers.MaxUint256),
    "grantRole:EMERGENCY_ADMIN_ROLE:emergencyAdmin1"
  );
  await sendAndWait(
    access.connect(timelock).grantRole(ROLE.FEE_MANAGER_ROLE, feeManager1Address, ethers.MaxUint256),
    "grantRole:FEE_MANAGER_ROLE:feeManager1"
  );
  await sendAndWait(
    access.connect(timelock).grantRole(ROLE.FEE_MANAGER_ROLE, feeManager2Address, ethers.MaxUint256),
    "grantRole:FEE_MANAGER_ROLE:feeManager2"
  );

  await expectStaticRevert(
    () => withdraw.connect(outsider).updateWithdrawalConfig.staticCall(3600, ethers.parseEther("1"), 2, false, ethers.parseEther("10")),
    "unauthorized:updateWithdrawalConfig"
  );

  await sendAndWait(
    withdraw.connect(emergencyAdmin1).updateWithdrawalConfig(
      3600,
      ethers.parseEther("1"),
      2,
      false,
      ethers.parseEther("10")
    ),
    "updateWithdrawalConfig"
  );
  await sendAndWait(
    withdraw.connect(emergencyAdmin1).setRecipientWhitelist(recipientAddress, true),
    "setRecipientWhitelist"
  );

  const instantAmount = ethers.parseEther("0.5");
  const beforeInstant = await provider.getBalance(recipientAddress);
  const beforeDiamondInstant = await provider.getBalance(DIAMOND_ADDRESS);
  const instantRc = await sendAndWait(
    withdraw.connect(feeManager1).requestEmergencyWithdrawal(ethers.ZeroAddress, instantAmount, recipientAddress),
    "requestEmergencyWithdrawal:instant"
  );
  const instantBlock = Number(instantRc.blockNumber);
  const instantBeforeAtBlock = await provider.getBalance(recipientAddress, instantBlock - 1);
  const instantAfterAtBlock = await provider.getBalance(recipientAddress, instantBlock);
  const diamondBeforeAtBlock = await provider.getBalance(DIAMOND_ADDRESS, instantBlock - 1);
  const diamondAfterAtBlock = await provider.getBalance(DIAMOND_ADDRESS, instantBlock);
  const instantEvent = instantRc.logs
    .map((log) => {
      try {
        return withdrawIface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((parsed) => parsed && parsed.name === "EmergencyWithdrawal");
  console.log(
    `[instant-withdrawal] latestRecipientBefore=${beforeInstant} latestDiamondBefore=${beforeDiamondInstant} recipientBeforeBlock=${instantBeforeAtBlock} recipientAfterBlock=${instantAfterAtBlock} recipientDelta=${instantAfterAtBlock - instantBeforeAtBlock} diamondBeforeBlock=${diamondBeforeAtBlock} diamondAfterBlock=${diamondAfterAtBlock} diamondDelta=${diamondBeforeAtBlock - diamondAfterAtBlock} eventAmount=${instantEvent ? instantEvent.args.amount : "<none>"}`
  );
  if (instantAfterAtBlock - instantBeforeAtBlock !== instantAmount) {
    throw new Error("instant withdrawal recipient delta mismatch");
  }

  await advanceTime(provider, 2 * 60 * 60);

  const delayedAmount = ethers.parseEther("2");
  const delayedReqTx = await withdraw.connect(feeManager1).requestEmergencyWithdrawal(ethers.ZeroAddress, delayedAmount, recipientAddress);
  const delayedReqRc = await sendAndWait(Promise.resolve(delayedReqTx), "requestEmergencyWithdrawal:timelocked");
  const delayedRequestedEvent = delayedReqRc.logs
    .map((log) => {
      try {
        return withdrawIface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((parsed) => parsed && parsed.name === "EmergencyWithdrawalRequested");
  if (!delayedRequestedEvent) throw new Error("missing EmergencyWithdrawalRequested event for timelocked request");
  const delayedReqId = delayedRequestedEvent.args.requestId;
  if ((await withdraw.getApprovalCount(delayedReqId)) !== 1n) throw new Error("timelocked request should start with 1 approval");

  await expectStaticRevert(
    () => withdraw.connect(outsider).approveEmergencyWithdrawal.staticCall(delayedReqId),
    "unauthorized:approveEmergencyWithdrawal"
  );
  await expectStaticRevert(
    () => withdraw.connect(feeManager1).executeWithdrawal.staticCall(delayedReqId),
    "executeWithdrawal:beforeApprovalAndDelay"
  );

  await sendAndWait(
    withdraw.connect(emergencyAdmin1).approveEmergencyWithdrawal(delayedReqId),
    "approveEmergencyWithdrawal:emergencyAdmin1"
  );
  if ((await withdraw.getApprovalCount(delayedReqId)) !== 2n) throw new Error("approval count should be 2 after second approval");

  await expectStaticRevert(
    () => withdraw.connect(feeManager1).executeWithdrawal.staticCall(delayedReqId),
    "executeWithdrawal:beforeDelay"
  );

  await advanceTime(provider, 3601);
  const beforeDelayed = await provider.getBalance(recipientAddress);
  const beforeDiamondDelayed = await provider.getBalance(DIAMOND_ADDRESS);
  const delayedExecRc = await sendAndWait(
    withdraw.connect(feeManager1).executeWithdrawal(delayedReqId),
    "executeWithdrawal"
  );
  const delayedBlock = Number(delayedExecRc.blockNumber);
  const delayedBeforeAtBlock = await provider.getBalance(recipientAddress, delayedBlock - 1);
  const delayedAfterAtBlock = await provider.getBalance(recipientAddress, delayedBlock);
  const diamondBeforeDelayedBlock = await provider.getBalance(DIAMOND_ADDRESS, delayedBlock - 1);
  const diamondAfterDelayedBlock = await provider.getBalance(DIAMOND_ADDRESS, delayedBlock);
  const delayedEvent = delayedExecRc.logs
    .map((log) => {
      try {
        return withdrawIface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((parsed) => parsed && parsed.name === "EmergencyWithdrawal");
  console.log(
    `[timelocked-withdrawal] latestRecipientBefore=${beforeDelayed} latestDiamondBefore=${beforeDiamondDelayed} recipientBeforeBlock=${delayedBeforeAtBlock} recipientAfterBlock=${delayedAfterAtBlock} recipientDelta=${delayedAfterAtBlock - delayedBeforeAtBlock} diamondBeforeBlock=${diamondBeforeDelayedBlock} diamondAfterBlock=${diamondAfterDelayedBlock} diamondDelta=${diamondBeforeDelayedBlock - diamondAfterDelayedBlock} eventAmount=${delayedEvent ? delayedEvent.args.amount : "<none>"}`
  );
  if (delayedAfterAtBlock - delayedBeforeAtBlock !== delayedAmount) {
    throw new Error("timelocked withdrawal recipient delta mismatch");
  }

  await advanceTime(provider, 2 * 60 * 60);
  await sendAndWait(
    withdraw.connect(emergencyAdmin1).updateWithdrawalConfig(
      3600,
      ethers.parseEther("1"),
      2,
      true,
      ethers.parseEther("20")
    ),
    "updateWithdrawalConfig:requiresEmergencyAdmin"
  );

  await advanceTime(provider, 2 * 60 * 60);
  const gatedAmount = ethers.parseEther("2");
  const gatedReqTx = await withdraw.connect(feeManager1).requestEmergencyWithdrawal(ethers.ZeroAddress, gatedAmount, recipientAddress);
  const gatedReqRc = await sendAndWait(Promise.resolve(gatedReqTx), "requestEmergencyWithdrawal:requiresEmergencyAdmin");
  const gatedRequestedEvent = gatedReqRc.logs
    .map((log) => {
      try {
        return withdrawIface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((parsed) => parsed && parsed.name === "EmergencyWithdrawalRequested");
  if (!gatedRequestedEvent) throw new Error("missing EmergencyWithdrawalRequested event for gated request");
  const gatedReqId = gatedRequestedEvent.args.requestId;

  await sendAndWait(
    withdraw.connect(feeManager2).approveEmergencyWithdrawal(gatedReqId),
    "approveEmergencyWithdrawal:feeManager2"
  );
  await advanceTime(provider, 3601);
  await expectStaticRevert(
    () => withdraw.connect(feeManager1).executeWithdrawal.staticCall(gatedReqId),
    "executeWithdrawal:missingEmergencyAdminApproval"
  );

  console.log("TRACE_EMERGENCY_WITHDRAWAL_LIFECYCLE: PASS");
}

main().catch((err) => {
  console.error("TRACE_EMERGENCY_WITHDRAWAL_LIFECYCLE: FAIL");
  console.error(err);
  process.exit(1);
});
