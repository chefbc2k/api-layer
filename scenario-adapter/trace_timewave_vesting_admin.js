#!/usr/bin/env node
"use strict";

const { ethers } = require("ethers");
require("dotenv").config();
const { loadArtifact, sendAndWait, expectRevert, setupCore, randomWallet, fundEth } = require("./lib/vesting_helpers");
const { assertLiveMutationAllowed, waitForProviderBlock, readContractAtReceiptBlock } = require("./lib/validation_safety");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const DAY = 24n * 60n * 60n;
const TIME_MAX_DURATION = 7300n * DAY;
const MIN_TIMEWAVE_DURATION = 30n * DAY;
const TIMELOCK_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TIMELOCK_ROLE"));
const VESTING_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("VESTING_MANAGER_ROLE"));

function chooseAlternateRate(currentRate) {
  if (currentRate !== 2000n) return 2000n;
  if (currentRate !== 2500n) return 2500n;
  return 3000n;
}

function chooseAlternateDuration(currentDuration) {
  if (currentDuration !== 60n * DAY) return 60n * DAY;
  if (currentDuration !== 90n * DAY) return 90n * DAY;
  return 120n * DAY;
}

function hasRestorableBaseline(rate, duration) {
  return rate <= 10_000n && duration >= MIN_TIMEWAVE_DURATION && duration <= TIME_MAX_DURATION;
}

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const { provider, access } = await setupCore(RPC_URL, DIAMOND_ADDRESS, PRIVATE_KEY);
  const founder = new ethers.Wallet(PRIVATE_KEY, provider);
  const restoreFounder = new ethers.Wallet(PRIVATE_KEY, provider);
  const founderAddress = await founder.getAddress();

  const timewave = new ethers.Contract(
    DIAMOND_ADDRESS,
    loadArtifact("out/TimewaveGiftFacet.sol/TimewaveGiftFacet.json").abi,
    provider
  );

  const outsider = randomWallet(provider);
  const originalRate = await timewave.getQuarterlyUnlockRate();
  const originalMinDuration = await timewave.getMinTwaveVestingDuration();
  const network = await provider.getNetwork();

  if (network.chainId !== 31337n && !hasRestorableBaseline(originalRate, originalMinDuration)) {
    console.log(
      `TRACE_TIMEWAVE_VESTING_ADMIN: SKIP (unrestorable live baseline rate=${originalRate} minDuration=${originalMinDuration})`
    );
    return;
  }

  await assertLiveMutationAllowed(provider, "trace_timewave_vesting_admin.js");
  await fundEth(founder, [outsider]);
  const targetRate = chooseAlternateRate(originalRate);
  const targetMinDuration = chooseAlternateDuration(originalMinDuration);
  const founderHadTimelock = await access.hasRole(TIMELOCK_ROLE, founderAddress);
  const founderHadVestingManager = await access.hasRole(VESTING_MANAGER_ROLE, founderAddress);

  try {
    let roleReceipt = null;
    if (!founderHadTimelock) {
      roleReceipt = await sendAndWait(
        access.connect(founder).grantRole(TIMELOCK_ROLE, founderAddress, ethers.MaxUint256),
        "grantRole:TIMELOCK_ROLE"
      );
    }
    if (!founderHadVestingManager) {
      roleReceipt = await sendAndWait(
        access.connect(founder).grantRole(VESTING_MANAGER_ROLE, founderAddress, ethers.MaxUint256),
        "grantRole:VESTING_MANAGER_ROLE"
      );
    }
    if (roleReceipt) {
      await waitForProviderBlock(provider, Number(roleReceipt.blockNumber));
    }

    await expectRevert(() => timewave.connect(outsider).setQuarterlyUnlockRate(2000n), "setQuarterlyUnlockRate:unauthorized");
    await expectRevert(() => timewave.connect(outsider).setMinimumTwaveVestingDuration(60n * DAY), "setMinimumTwaveVestingDuration:unauthorized");

    const setRateReceipt = await sendAndWait(
      timewave.connect(founder).setQuarterlyUnlockRate(targetRate, { gasLimit: 1_000_000 }),
      "setQuarterlyUnlockRate"
    );
    if ((await readContractAtReceiptBlock(timewave, "getQuarterlyUnlockRate", [], setRateReceipt)) !== targetRate) {
      throw new Error("quarterly unlock rate should update");
    }

    const setMinDurationReceipt = await sendAndWait(
      timewave.connect(founder).setMinimumTwaveVestingDuration(targetMinDuration, { gasLimit: 1_000_000 }),
      "setMinimumTwaveVestingDuration"
    );
    if ((await readContractAtReceiptBlock(timewave, "getMinTwaveVestingDuration", [], setMinDurationReceipt)) !== targetMinDuration) {
      throw new Error("minimum timewave vesting duration should update");
    }

    await expectRevert(() => timewave.connect(founder).setQuarterlyUnlockRate(10001n), "setQuarterlyUnlockRate:invalidTooHigh");
    await expectRevert(() => timewave.connect(founder).setMinimumTwaveVestingDuration(29n * DAY), "setMinimumTwaveVestingDuration:belowMin");
    await expectRevert(() => timewave.connect(founder).setMinimumTwaveVestingDuration(TIME_MAX_DURATION + DAY), "setMinimumTwaveVestingDuration:aboveMax");

    console.log("TRACE_TIMEWAVE_VESTING_ADMIN: PASS");
  } finally {
    let restoreRateReceipt = null;
    let restoreMinDurationReceipt = null;
    if ((await timewave.getQuarterlyUnlockRate()) !== originalRate) {
      restoreRateReceipt = await sendAndWait(
        timewave.connect(restoreFounder).setQuarterlyUnlockRate(originalRate, { gasLimit: 1_000_000 }),
        "restoreQuarterlyUnlockRate"
      );
    }
    if ((await timewave.getMinTwaveVestingDuration()) !== originalMinDuration) {
      restoreMinDurationReceipt = await sendAndWait(
        timewave.connect(restoreFounder).setMinimumTwaveVestingDuration(originalMinDuration, { gasLimit: 1_000_000 }),
        "restoreMinTwaveVestingDuration"
      );
    }
    if (!founderHadVestingManager && await access.hasRole(VESTING_MANAGER_ROLE, founderAddress)) {
      await sendAndWait(
        access.connect(restoreFounder).revokeRole(VESTING_MANAGER_ROLE, founderAddress, "restore"),
        "restoreRole:VESTING_MANAGER_ROLE:founder"
      );
    }
    if (!founderHadTimelock && await access.hasRole(TIMELOCK_ROLE, founderAddress)) {
      await sendAndWait(
        access.connect(restoreFounder).revokeRole(TIMELOCK_ROLE, founderAddress, "restore"),
        "restoreRole:TIMELOCK_ROLE:founder"
      );
    }

    const restoredRate = restoreRateReceipt
      ? await readContractAtReceiptBlock(timewave, "getQuarterlyUnlockRate", [], restoreRateReceipt)
      : await timewave.getQuarterlyUnlockRate();
    if (restoredRate !== originalRate) {
      throw new Error("quarterly unlock rate restore verification failed");
    }
    const restoredMinDuration = restoreMinDurationReceipt
      ? await readContractAtReceiptBlock(timewave, "getMinTwaveVestingDuration", [], restoreMinDurationReceipt)
      : await timewave.getMinTwaveVestingDuration();
    if (restoredMinDuration !== originalMinDuration) {
      throw new Error("minimum timewave vesting duration restore verification failed");
    }
  }
}

main().catch((err) => {
  console.error("TRACE_TIMEWAVE_VESTING_ADMIN: FAIL");
  console.error(err);
  process.exit(1);
});
