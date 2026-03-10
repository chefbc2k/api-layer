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

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
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
  const timelock = randomWallet(provider);
  const emergencyAdmin = randomWallet(provider);
  const feeManager1 = randomWallet(provider);
  const feeManager2 = randomWallet(provider);
  const recipient = randomWallet(provider);

  const timelockAddress = await timelock.getAddress();
  const emergencyAdminAddress = await emergencyAdmin.getAddress();
  const feeManager1Address = await feeManager1.getAddress();
  const feeManager2Address = await feeManager2.getAddress();
  const recipientAddress = await recipient.getAddress();
  const founderAddress = await founder.getAddress();

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

  await fundEth(founder, [timelock, emergencyAdmin, feeManager1, feeManager2, recipient]);
  await sendAndWait(
    founder.sendTransaction({ to: DIAMOND_ADDRESS, value: ethers.parseEther("20") }),
    "fundDiamond:eth"
  );
  let timelockGranter = founder;
  if (!(await access.hasRole(ROLE.TIMELOCK_ROLE, founderAddress))) {
    await sendAndWait(
      access.connect(founder).grantRole(ROLE.TIMELOCK_ROLE, timelockAddress, ethers.MaxUint256),
      "grantRole:TIMELOCK_ROLE:timelock"
    );
    timelockGranter = timelock;
  }
  await sendAndWait(
    access.connect(timelockGranter).grantRole(ROLE.EMERGENCY_ADMIN_ROLE, emergencyAdminAddress, ethers.MaxUint256),
    "grantRole:EMERGENCY_ADMIN_ROLE:emergencyAdmin"
  );
  await sendAndWait(
    access.connect(timelockGranter).grantRole(ROLE.FEE_MANAGER_ROLE, feeManager1Address, ethers.MaxUint256),
    "grantRole:FEE_MANAGER_ROLE:feeManager1"
  );
  await sendAndWait(
    access.connect(timelockGranter).grantRole(ROLE.FEE_MANAGER_ROLE, feeManager2Address, ethers.MaxUint256),
    "grantRole:FEE_MANAGER_ROLE:feeManager2"
  );
  await sendAndWait(
    withdraw.connect(emergencyAdmin).updateWithdrawalConfig(
      3600,
      ethers.parseEther("1"),
      3,
      true,
      ethers.parseEther("10")
    ),
    "updateWithdrawalConfig:requiresEmergencyAdmin"
  );
  await sendAndWait(
    withdraw.connect(emergencyAdmin).setRecipientWhitelist(recipientAddress, true),
    "setRecipientWhitelist"
  );
  if (!(await access.hasRole(ROLE.TIMELOCK_ROLE, founderAddress)) && !(await access.hasRole(ROLE.TIMELOCK_ROLE, timelockAddress))) {
    throw new Error("emergency-withdrawal setup should end with an active timelock holder");
  }

  const instantAmount = ethers.parseEther("0.25");
  const instantBefore = await provider.getBalance(recipientAddress, "latest");
  const instantReqId = await withdraw.connect(feeManager1).requestEmergencyWithdrawal.staticCall(
    ethers.ZeroAddress,
    instantAmount,
    recipientAddress
  );
  if (instantReqId !== ethers.ZeroHash) throw new Error("instant withdrawal should return zero request id");
  await sendAndWait(
    withdraw.connect(feeManager1).requestEmergencyWithdrawal(ethers.ZeroAddress, instantAmount, recipientAddress),
    "requestEmergencyWithdrawal:instant"
  );
  const instantAfter = await provider.getBalance(recipientAddress, "latest");
  if (instantAfter - instantBefore !== instantAmount) {
    throw new Error("instant withdrawal should credit recipient exactly once");
  }

  await advanceTime(provider, 16 * 60);
  const delayedAmount = ethers.parseEther("2");
  const requestTx = await withdraw.connect(feeManager1).requestEmergencyWithdrawal(
    ethers.ZeroAddress,
    delayedAmount,
    recipientAddress
  );
  const requestRc = await sendAndWait(Promise.resolve(requestTx), "requestEmergencyWithdrawal:timelocked");
  const requestedLog = requestRc.logs
    .map((log) => { try { return withdraw.interface.parseLog(log); } catch { return null; } })
    .find((log) => log && log.name === "EmergencyWithdrawalRequested");
  if (!requestedLog) throw new Error("timelocked withdrawal should emit EmergencyWithdrawalRequested");
  const requestId = requestedLog.args.requestId;
  if ((await withdraw.getApprovalCount(requestId)) !== 1n) {
    throw new Error("timelocked request should start with exactly one approval");
  }

  await expectStaticRevert(
    () => withdraw.connect(feeManager1).approveEmergencyWithdrawal.staticCall(requestId),
    "approveEmergencyWithdrawal:duplicateInitialApprover"
  );
  await expectStaticRevert(
    () => withdraw.connect(feeManager2).executeWithdrawal.staticCall(requestId),
    "executeWithdrawal:beforeDelayOrApprovals"
  );

  await sendAndWait(
    withdraw.connect(feeManager2).approveEmergencyWithdrawal(requestId),
    "approveEmergencyWithdrawal:feeManager2"
  );
  if ((await withdraw.getApprovalCount(requestId)) !== 2n) {
    throw new Error("approval count should increment after second approval");
  }

  await advanceTime(provider, 3601);
  await expectStaticRevert(
    () => withdraw.connect(feeManager2).executeWithdrawal.staticCall(requestId),
    "executeWithdrawal:missingEmergencyAdminApproval"
  );

  const beforeRecipient = await provider.getBalance(recipientAddress, "latest");
  await sendAndWait(
    withdraw.connect(emergencyAdmin).approveEmergencyWithdrawal(requestId),
    "approveEmergencyWithdrawal:emergencyAdmin"
  );
  const afterRecipient = await provider.getBalance(recipientAddress, "latest");
  if (afterRecipient - beforeRecipient !== delayedAmount) {
    throw new Error("executed timelocked withdrawal should credit recipient exactly once");
  }
  if ((await withdraw.getApprovalCount(requestId)) !== 3n) {
    throw new Error("approval count should equal required approvals after final approval");
  }

  await expectStaticRevert(
    () => withdraw.connect(feeManager2).executeWithdrawal.staticCall(requestId),
    "executeWithdrawal:alreadyExecuted"
  );
  await expectStaticRevert(
    () => withdraw.connect(feeManager2).approveEmergencyWithdrawal.staticCall(requestId),
    "approveEmergencyWithdrawal:alreadyExecuted"
  );

  console.log("TRACE_EMERGENCY_WITHDRAWAL_ACCOUNTING_INVARIANTS: PASS");
}

main().catch((err) => {
  console.error("TRACE_EMERGENCY_WITHDRAWAL_ACCOUNTING_INVARIANTS: FAIL");
  console.error(err);
  process.exit(1);
});
