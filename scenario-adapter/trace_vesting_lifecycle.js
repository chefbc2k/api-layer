#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
require("dotenv").config();

const RPC_URL = process.env.RPC_URL;
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const DAY = 24 * 60 * 60;
const MONTH = 30 * DAY;
const FOUNDER_CLIFF = 180 * DAY;
const EXECUTIVE_CLIFF = 608 * DAY;
const FOUNDER_DURATION = 7300 * DAY;
const EXECUTIVE_DURATION = 1080 * DAY;
const FOUNDER_TYPE = 0;
const EXECUTIVE_TYPE = 2;
const FOUNDER_SELLABLE_BPS = 6500;
const EXECUTIVE_SELLABLE_PERCENT = 35;
const TIMELOCK_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TIMELOCK_ROLE"));
const VESTING_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("VESTING_MANAGER_ROLE"));

function loadArtifact(relPath) {
  const file = path.join(process.cwd(), relPath);
  if (!fs.existsSync(file)) throw new Error(`Missing artifact: ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function sum(values) {
  return values.reduce((acc, value) => acc + value, 0n);
}

function remainingLocked(schedule) {
  return schedule.totalAmount - schedule.releasedAmount;
}

async function sendAndWait(txPromise, label) {
  const tx = await txPromise;
  console.log(`[tx] ${label} from=${tx.from} nonce=${tx.nonce} sel=${(tx.data || "0x").slice(0, 10)} hash=${tx.hash}`);
  return tx.wait();
}

async function expectRevert(sendFn, label) {
  let err;
  try {
    await sendAndWait(sendFn(), label);
  } catch (e) {
    err = e;
  }
  if (!err) throw new Error(`${label}: expected revert`);
  const data = err?.data || err?.info?.error?.data || "<none>";
  console.log(`[expect-revert-ok] ${label} data=${data}`);
  return err;
}

async function rpc(url, method, params = []) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params })
  });
  const body = await res.json();
  if (body.error) {
    throw new Error(`${method} failed: ${body.error.message}`);
  }
  return body.result;
}

async function advanceTime(seconds) {
  const latestHex = await rpc(RPC_URL, "eth_getBlockByNumber", ["latest", false]);
  const latestTimestamp = parseInt(latestHex.timestamp, 16);
  await rpc(RPC_URL, "evm_setNextBlockTimestamp", [latestTimestamp + seconds]);
  await rpc(RPC_URL, "evm_mine", []);
}

async function getBalances(token, addresses) {
  const values = [];
  for (const address of addresses) {
    values.push(await token.tokenBalanceOf(address));
  }
  return values;
}

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const founder = new ethers.Wallet(PRIVATE_KEY, provider);
  const beneficiary1 = ethers.Wallet.createRandom().connect(provider);
  const beneficiary2 = ethers.Wallet.createRandom().connect(provider);
  const beneficiary3 = ethers.Wallet.createRandom().connect(provider);
  const tracked = [founder.address, beneficiary1.address, beneficiary2.address, beneficiary3.address];

  const access = new ethers.Contract(
    DIAMOND_ADDRESS,
    loadArtifact("out/AccessControlFacet.sol/AccessControlFacet.json").abi,
    provider
  );
  const token = new ethers.Contract(
    DIAMOND_ADDRESS,
    loadArtifact("out/TokenSupplyFacet.sol/TokenSupplyFacet.json").abi,
    provider
  );
  const vesting = new ethers.Contract(
    DIAMOND_ADDRESS,
    loadArtifact("out/VestingFacet.sol/VestingFacet.json").abi,
    provider
  );

  const findings = [];

  await sendAndWait(founder.sendTransaction({ to: beneficiary1.address, value: ethers.parseEther("1") }), "fundETH:beneficiary1");
  await sendAndWait(founder.sendTransaction({ to: beneficiary2.address, value: ethers.parseEther("1") }), "fundETH:beneficiary2");
  await sendAndWait(founder.sendTransaction({ to: beneficiary3.address, value: ethers.parseEther("1") }), "fundETH:beneficiary3");

  if (!(await access.hasRole(TIMELOCK_ROLE, founder.address))) {
    await sendAndWait(
      access.connect(founder).grantRole(TIMELOCK_ROLE, founder.address, ethers.MaxUint256),
      "grantRole:TIMELOCK_ROLE"
    );
  }

  if (!(await access.hasRole(VESTING_MANAGER_ROLE, founder.address))) {
    await sendAndWait(
      access.connect(founder).grantRole(VESTING_MANAGER_ROLE, founder.address, ethers.MaxUint256),
      "grantRole:VESTING_MANAGER_ROLE"
    );
  }

  const founderAmount = 12_000n * 10n ** 10n;
  const execAmount = 8_000n * 10n ** 10n;

  const trackedBeforeFounder = sum(await getBalances(token, tracked));

  await sendAndWait(
    vesting.connect(founder).createFounderVesting(beneficiary1.address, founderAmount),
    "createFounderVesting:beneficiary1"
  );

  let founderSchedule = await vesting.getVestingDetails(beneficiary1.address);
  if (BigInt(founderSchedule.vestingType) !== BigInt(FOUNDER_TYPE)) throw new Error("founder schedule type mismatch");
  if (founderSchedule.totalAmount !== founderAmount) throw new Error("founder schedule totalAmount mismatch");
  if (founderSchedule.releasedAmount !== 0n) throw new Error("founder schedule releasedAmount should start at 0");
  if (founderSchedule.duration !== BigInt(FOUNDER_DURATION)) throw new Error("founder schedule duration mismatch");
  if (founderSchedule.cliff !== BigInt(FOUNDER_CLIFF)) throw new Error("founder schedule cliff mismatch");
  if (founderSchedule.revocable !== false) throw new Error("founder vesting should be non-revocable");
  if (founderSchedule.sellablePercentage !== BigInt(FOUNDER_SELLABLE_BPS)) throw new Error("founder sellable percentage mismatch");

  const trackedAfterFounderCreate = sum(await getBalances(token, tracked));
  if (trackedAfterFounderCreate + remainingLocked(founderSchedule) !== trackedBeforeFounder) {
    findings.push("founder schedule creation does not conserve liquid balances plus locked remainder");
  }

  const founderReleasableBeforeCliff = await vesting.getVestingReleasableAmount(beneficiary1.address);
  if (founderReleasableBeforeCliff !== 0n) throw new Error("founder vesting should have 0 releasable before cliff");
  await expectRevert(() => vesting.connect(beneficiary1).releaseVestedTokens(), "releaseFounder:beforeCliff");

  await advanceTime(FOUNDER_CLIFF + MONTH + 1);

  const founderReleasable = await vesting.getVestingReleasableAmount(beneficiary1.address);
  if (founderReleasable <= 0n) throw new Error("founder vesting should have releasable amount after cliff");

  const beneficiary1BalanceBefore = await token.tokenBalanceOf(beneficiary1.address);
  const founderReleaseReceipt = await sendAndWait(
    vesting.connect(beneficiary1).releaseVestedTokens({ gasLimit: 1_500_000 }),
    "releaseFounder:beneficiary1"
  );
  console.log(`[receipt] releaseFounder gasUsed=${founderReleaseReceipt.gasUsed}`);

  const beneficiary1BalanceAfter = await token.tokenBalanceOf(beneficiary1.address);
  founderSchedule = await vesting.getVestingDetails(beneficiary1.address);
  if (beneficiary1BalanceAfter - beneficiary1BalanceBefore !== founderReleasable) {
    throw new Error("beneficiary1 balance delta does not match founder releasable amount");
  }
  if (founderSchedule.releasedAmount !== founderReleasable) throw new Error("founder releasedAmount not updated");

  const trackedAfterFounderRelease = sum(await getBalances(token, tracked));
  if (trackedAfterFounderRelease + remainingLocked(founderSchedule) !== trackedBeforeFounder) {
    findings.push("founder release does not conserve liquid balances plus locked remainder");
  }

  await sendAndWait(
    vesting.connect(beneficiary1).transferVestingSchedule(beneficiary2.address, { gasLimit: 1_500_000 }),
    "transferVestingSchedule:beneficiary1->beneficiary2"
  );

  if (await vesting.hasVestingSchedule(beneficiary1.address)) {
    throw new Error("beneficiary1 schedule should be cleared after transfer");
  }
  const transferredSchedule = await vesting.getVestingDetails(beneficiary2.address);
  if (transferredSchedule.totalAmount !== founderAmount) throw new Error("transferred founder schedule totalAmount mismatch");
  if (transferredSchedule.releasedAmount !== founderReleasable) throw new Error("transferred founder releasedAmount mismatch");
  const trackedAfterFounderTransfer = sum(await getBalances(token, tracked));
  if (trackedAfterFounderTransfer + remainingLocked(transferredSchedule) !== trackedBeforeFounder) {
    findings.push("founder transfer does not conserve liquid balances plus locked remainder");
  }

  await advanceTime(MONTH);
  const founderReleasableAfterTransfer = await vesting.getVestingReleasableAmount(beneficiary2.address);
  if (founderReleasableAfterTransfer <= 0n) throw new Error("transferred founder schedule should continue vesting");
  await sendAndWait(
    vesting.connect(beneficiary2).releaseVestedTokens({ gasLimit: 1_500_000 }),
    "releaseFounderAfterTransfer:beneficiary2"
  );
  const transferredScheduleAfterRelease = await vesting.getVestingDetails(beneficiary2.address);
  const trackedAfterFounderTransferRelease = sum(await getBalances(token, tracked));
  if (trackedAfterFounderTransferRelease + remainingLocked(transferredScheduleAfterRelease) !== trackedBeforeFounder) {
    findings.push("founder release after transfer does not conserve liquid balances plus locked remainder");
  }

  const trackedBeforeExec = sum(await getBalances(token, tracked));

  await sendAndWait(
    vesting.connect(founder).createTeamVesting(beneficiary3.address, execAmount, EXECUTIVE_TYPE),
    "createTeamVesting:beneficiary3"
  );

  const execSchedule = await vesting.getVestingDetails(beneficiary3.address);
  if (BigInt(execSchedule.vestingType) !== BigInt(EXECUTIVE_TYPE)) throw new Error("executive schedule type mismatch");
  if (execSchedule.totalAmount !== execAmount) throw new Error("executive schedule totalAmount mismatch");
  if (execSchedule.duration !== BigInt(EXECUTIVE_DURATION)) throw new Error("executive schedule duration mismatch");
  if (execSchedule.cliff !== BigInt(EXECUTIVE_CLIFF)) throw new Error("executive schedule cliff mismatch");
  if (execSchedule.revocable !== true) throw new Error("executive vesting should be revocable");
  if (execSchedule.sellablePercentage !== BigInt(EXECUTIVE_SELLABLE_PERCENT)) {
    findings.push(
      `executive schedule sellablePercentage stored ${execSchedule.sellablePercentage} instead of expected ${EXECUTIVE_SELLABLE_PERCENT}`
    );
  }
  const trackedAfterExecCreate = sum(await getBalances(token, tracked));
  if (trackedAfterExecCreate + remainingLocked(execSchedule) !== trackedBeforeExec) {
    findings.push("executive schedule creation does not conserve liquid balances plus locked remainder");
  }

  await advanceTime(EXECUTIVE_CLIFF + MONTH + 1);
  const execReleasable = await vesting.getVestingReleasableAmount(beneficiary3.address);
  if (execReleasable <= 0n) throw new Error("executive vesting should have releasable amount after cliff");

  await sendAndWait(
    vesting.connect(founder).releaseTokensFor(beneficiary3.address, { gasLimit: 1_500_000 }),
    "releaseTokensFor:beneficiary3"
  );
  const execScheduleAfterRelease = await vesting.getVestingDetails(beneficiary3.address);
  const trackedAfterExecRelease = sum(await getBalances(token, tracked));
  if (trackedAfterExecRelease + remainingLocked(execScheduleAfterRelease) !== trackedBeforeExec) {
    findings.push("executive release does not conserve liquid balances plus locked remainder");
  }

  await sendAndWait(
    vesting.connect(founder).revokeVestingSchedule(beneficiary3.address, { gasLimit: 1_500_000 }),
    "revokeVestingSchedule:beneficiary3"
  );
  const revokedSchedule = await vesting.getVestingDetails(beneficiary3.address);
  if (!revokedSchedule.revoked) throw new Error("executive schedule should be revoked");
  await expectRevert(() => vesting.connect(beneficiary3).releaseVestedTokens(), "releaseRevoked:beneficiary3");

  if (findings.length > 0) {
    throw new Error(findings.join(" | "));
  }

  console.log("TRACE_VESTING_LIFECYCLE: PASS");
}

main().catch((err) => {
  console.error("TRACE_VESTING_LIFECYCLE: FAIL");
  console.error(err);
  process.exit(1);
});
