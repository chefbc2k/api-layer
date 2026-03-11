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
  const network = await provider.getNetwork();
  if (network.chainId !== 31337n) {
    throw new Error("trace_emergency_withdrawal_circuit_breaker is local-only on 31337; it uses advanceTime and cannot prove Base Sepolia parity yet");
  }
  const founder = new ethers.NonceManager(new ethers.Wallet(PRIVATE_KEY, provider));
  const timelock = randomWallet(provider);
  const emergencyAdmin1 = randomWallet(provider);
  const feeManager1 = randomWallet(provider);
  const recipient = randomWallet(provider);

  const timelockAddress = await timelock.getAddress();
  const emergencyAdmin1Address = await emergencyAdmin1.getAddress();
  const feeManager1Address = await feeManager1.getAddress();
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

  await fundEth(founder, [timelock, emergencyAdmin1, feeManager1, recipient]);
  await sendAndWait(
    founder.sendTransaction({ to: DIAMOND_ADDRESS, value: ethers.parseEther("20") }),
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

  const small = ethers.parseEther("0.1");
  await sendAndWait(
    withdraw.connect(feeManager1).requestEmergencyWithdrawal(ethers.ZeroAddress, small, recipientAddress),
    "requestEmergencyWithdrawal:cb:first"
  );
  await expectStaticRevert(
    () => withdraw.connect(feeManager1).requestEmergencyWithdrawal.staticCall(ethers.ZeroAddress, small, recipientAddress),
    "requestEmergencyWithdrawal:cooldown"
  );

  await advanceTime(provider, 16 * 60);
  await sendAndWait(
    withdraw.connect(feeManager1).requestEmergencyWithdrawal(ethers.ZeroAddress, small, recipientAddress),
    "requestEmergencyWithdrawal:cb:second"
  );
  await advanceTime(provider, 16 * 60);
  await sendAndWait(
    withdraw.connect(feeManager1).requestEmergencyWithdrawal(ethers.ZeroAddress, small, recipientAddress),
    "requestEmergencyWithdrawal:cb:third"
  );
  await advanceTime(provider, 16 * 60);
  await expectStaticRevert(
    () => withdraw.connect(feeManager1).requestEmergencyWithdrawal.staticCall(ethers.ZeroAddress, small, recipientAddress),
    "requestEmergencyWithdrawal:tooManyConsecutive"
  );

  // Reset the 24h circuit-breaker window so the daily-limit phase measures only the near-limit withdrawals.
  await advanceTime(provider, 25 * 60 * 60);
  const nearLimit = ethers.parseEther("0.9");
  for (let i = 0; i < 11; i++) {
    await sendAndWait(
      withdraw.connect(feeManager1).requestEmergencyWithdrawal(ethers.ZeroAddress, nearLimit, recipientAddress),
      `requestEmergencyWithdrawal:daily:${i + 1}`
    );
    await advanceTime(provider, 2 * 60 * 60);
  }
  await expectStaticRevert(
    () => withdraw.connect(feeManager1).requestEmergencyWithdrawal.staticCall(ethers.ZeroAddress, nearLimit, recipientAddress),
    "requestEmergencyWithdrawal:dailyLimit"
  );
  await advanceTime(provider, 25 * 60 * 60);
  await sendAndWait(
    withdraw.connect(feeManager1).requestEmergencyWithdrawal(ethers.ZeroAddress, nearLimit, recipientAddress),
    "requestEmergencyWithdrawal:dailyReset"
  );

  console.log("TRACE_EMERGENCY_WITHDRAWAL_CIRCUIT_BREAKER: PASS");
}

main().catch((err) => {
  console.error("TRACE_EMERGENCY_WITHDRAWAL_CIRCUIT_BREAKER: FAIL");
  console.error(err);
  process.exit(1);
});
