#!/usr/bin/env node
"use strict";

const { ethers } = require("ethers");
require("dotenv").config();
const {
  loadArtifact,
  sendAndWait,
  expectRevert,
  randomWallet,
  fundEth,
  setupCore,
  ensureVestingRoles,
  advanceTime
} = require("./lib/vesting_helpers");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const DAY = 24n * 60n * 60n;
const QUARTER = 90n * DAY;

async function latest(provider) {
  return provider.getBlock("latest");
}

async function addr(value) {
  if (typeof value === "string") return value;
  if (value && typeof value.getAddress === "function") return value.getAddress();
  if (value && typeof value.address === "string") return value.address;
  throw new Error("address resolution failed");
}

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const { provider, founder, access } = await setupCore(RPC_URL, DIAMOND_ADDRESS, PRIVATE_KEY);
  await ensureVestingRoles(access, founder);

  const timewave = new ethers.Contract(
    DIAMOND_ADDRESS,
    loadArtifact("out/TimewaveGiftFacet.sol/TimewaveGiftFacet.json").abi,
    provider
  );
  const payment = new ethers.Contract(
    DIAMOND_ADDRESS,
    loadArtifact("out/PaymentFacet.sol/PaymentFacet.json").abi,
    provider
  );
  const usdcAddress = await payment.getUsdcToken();
  if (!usdcAddress || usdcAddress === ethers.ZeroAddress) throw new Error("USDC token address is not configured");
  const usdc = new ethers.Contract(usdcAddress, loadArtifact("out/MockERC20.sol/MockERC20.json").abi, provider);

  const [beneficiaryA, beneficiaryB, beneficiaryC, beneficiaryD] = [
    randomWallet(provider),
    randomWallet(provider),
    randomWallet(provider),
    randomWallet(provider)
  ];
  const beneficiaryAAddress = await addr(beneficiaryA);
  const beneficiaryBAddress = await addr(beneficiaryB);
  const beneficiaryCAddress = await addr(beneficiaryC);
  const beneficiaryDAddress = await addr(beneficiaryD);
  await fundEth(founder, [beneficiaryA, beneficiaryB, beneficiaryC, beneficiaryD]);

  const now = await latest(provider);
  const linearAmount = 1_000_000n * 1_000_000n;
  const linearStart = BigInt(now.timestamp) + 5n * 15n;
  const linearDuration = 30n * DAY;
  const linearCliff = 75n;

  await sendAndWait(
    timewave.connect(founder).createUsdcVestingSchedule(beneficiaryAAddress, linearAmount, linearStart, linearDuration, linearCliff, false, true),
    "createUsdcVestingSchedule:linear"
  );

  if (!(await timewave.isVestingActive(beneficiaryAAddress))) throw new Error("beneficiaryA schedule should be active");
  if (!(await timewave.canTransferVesting(beneficiaryAAddress))) throw new Error("unreleased schedule should be transferable");
  if ((await timewave.getReleasableTwaveAmount(beneficiaryAAddress)) !== 0n) throw new Error("releasable should be zero before cliff");

  try {
    await timewave.connect(beneficiaryA).releaseTwaveVesting.staticCall({ gasLimit: 1_500_000 });
    throw new Error("releaseBeforeCliff: expected revert");
  } catch (err) {
    const data = err?.data || err?.info?.error?.data || "<none>";
    console.log(`[expect-revert-ok] releaseBeforeCliff data=${data}`);
  }

  await sendAndWait(timewave.connect(beneficiaryA).transferTwaveVesting(beneficiaryBAddress), "transferTwaveVesting");
  if (await timewave.isVestingActive(beneficiaryAAddress)) throw new Error("beneficiaryA should no longer be active after transfer");
  if (!(await timewave.isVestingActive(beneficiaryBAddress))) throw new Error("beneficiaryB should become active after transfer");

  await advanceTime(RPC_URL, 16 * 15);

  const releasableAfterCliff = await timewave.getReleasableTwaveAmount(beneficiaryBAddress);
  if (releasableAfterCliff <= 0n) throw new Error("releasable should be positive after cliff");

  const balBefore = await usdc.balanceOf(beneficiaryBAddress);
  const releaseReceipt = await sendAndWait(
    timewave.connect(beneficiaryB).releaseTwaveVesting({ gasLimit: 1_500_000 }),
    "releaseTwaveVesting"
  );
  const balAfter = await usdc.balanceOf(beneficiaryBAddress);
  const vestedLog = releaseReceipt.logs
    .map((log) => {
      try {
        return timewave.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((log) => log && log.name === "TokensVested");
  if (!vestedLog) throw new Error("releaseTwaveVesting should emit TokensVested");
  const releasedAmount = vestedLog.args[1];
  if (vestedLog.args[0].toLowerCase() !== beneficiaryBAddress.toLowerCase()) {
    throw new Error("TokensVested beneficiary should match transferred beneficiary");
  }
  if (releasedAmount < releasableAfterCliff) {
    throw new Error("released amount should not be less than preflight releasable amount");
  }
  if (balAfter - balBefore !== releasedAmount) throw new Error("beneficiaryB USDC delta should match emitted vested amount");
  if (await timewave.canTransferVesting(beneficiaryBAddress)) throw new Error("schedule should not be transferable after partial release");
  await expectRevert(() => timewave.connect(beneficiaryB).transferTwaveVesting(beneficiaryCAddress), "transferAfterRelease");

  const quarterlyAmount = 2_000_000n * 1_000_000n;
  const quarterlyStart = BigInt((await latest(provider)).timestamp) + 5n * 15n;
  await sendAndWait(
    timewave.connect(founder).createUsdcVestingSchedule(beneficiaryCAddress, quarterlyAmount, quarterlyStart, 4n * QUARTER, 0n, true, true),
    "createUsdcVestingSchedule:quarterly"
  );
  const nextUnlockBefore = await timewave.getNextUnlockTime(beneficiaryCAddress);
  await advanceTime(RPC_URL, Number(QUARTER + 8n * 15n));
  const releasableQuarter = await timewave.getReleasableTwaveAmount(beneficiaryCAddress);
  if (releasableQuarter <= 0n) throw new Error("quarterly schedule should have releasable amount after first quarter");
  await sendAndWait(timewave.connect(founder).releaseTwaveVestingFor(beneficiaryCAddress, { gasLimit: 1_500_000 }), "releaseTwaveVestingFor");
  const nextUnlockAfter = await timewave.getNextUnlockTime(beneficiaryCAddress);
  if (nextUnlockAfter <= nextUnlockBefore) throw new Error("quarterly next unlock time should advance after release");

  const batchAmount = 500_000n * 1_000_000n;
  const batchStart = BigInt((await latest(provider)).timestamp) + 5n * 15n;
  const batchReceiver = randomWallet(provider);
  const batchReceiverAddress = await addr(batchReceiver);
  await fundEth(founder, [batchReceiver]);
  await sendAndWait(
    timewave.connect(founder).createUsdcVestingSchedule(beneficiaryDAddress, batchAmount, batchStart, 30n * DAY, 0n, false, true),
    "createUsdcVestingSchedule:batch1"
  );
  await sendAndWait(
    timewave.connect(founder).createUsdcVestingSchedule(batchReceiverAddress, batchAmount, batchStart, 30n * DAY, 0n, false, true),
    "createUsdcVestingSchedule:batch2"
  );
  await advanceTime(RPC_URL, 12 * 15);
  const batchBefore1 = await usdc.balanceOf(beneficiaryDAddress);
  const batchBefore2 = await usdc.balanceOf(batchReceiverAddress);
  await sendAndWait(
    timewave.connect(founder).batchReleaseTwaveVesting([beneficiaryDAddress, batchReceiverAddress], { gasLimit: 3_000_000 }),
    "batchReleaseTwaveVesting"
  );
  if ((await usdc.balanceOf(beneficiaryDAddress)) <= batchBefore1) throw new Error("batch beneficiary 1 should receive USDC");
  if ((await usdc.balanceOf(batchReceiverAddress)) <= batchBefore2) throw new Error("batch beneficiary 2 should receive USDC");

  const revokeBeneficiary = randomWallet(provider);
  const revokeBeneficiaryAddress = await addr(revokeBeneficiary);
  await fundEth(founder, [revokeBeneficiary]);
  await sendAndWait(
    timewave.connect(founder).createUsdcVestingSchedule(revokeBeneficiaryAddress, batchAmount, BigInt((await latest(provider)).timestamp) + 5n * 15n, 30n * DAY, 0n, false, true),
    "createUsdcVestingSchedule:revoke"
  );
  await sendAndWait(timewave.connect(founder).revokeTwaveVesting(revokeBeneficiaryAddress), "revokeTwaveVesting");
  if (await timewave.isVestingActive(revokeBeneficiaryAddress)) throw new Error("revoked vesting should not be active");
  if ((await timewave.getReleasableTwaveAmount(revokeBeneficiaryAddress)) !== 0n) throw new Error("revoked vesting should have no releasable amount");

  console.log("TRACE_TIMEWAVE_VESTING_LIFECYCLE: PASS");
}

main().catch((err) => {
  console.error("TRACE_TIMEWAVE_VESTING_LIFECYCLE: FAIL");
  console.error(err);
  process.exit(1);
});
