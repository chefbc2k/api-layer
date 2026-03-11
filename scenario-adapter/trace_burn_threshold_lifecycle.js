#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
require("dotenv").config();
const { scenarioFundingWei } = require("./lib/runtime_config");
const { ensureEthBalance } = require("./lib/validation_safety");

const RPC_URL = process.env.RPC_URL;
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

function loadArtifact(relPath) {
  const file = path.join(process.cwd(), relPath);
  if (!fs.existsSync(file)) throw new Error(`Missing artifact: ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function role(name) {
  return ethers.keccak256(ethers.toUtf8Bytes(name));
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

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const founder = new ethers.Wallet(PRIVATE_KEY, provider);
  const holder = new ethers.Wallet(ethers.keccak256(ethers.toUtf8Bytes("THRESHOLD_TRACE_HOLDER")), provider);
  const burner = new ethers.Wallet(ethers.keccak256(ethers.toUtf8Bytes("THRESHOLD_TRACE_BURNER")), provider);
  const outsider = new ethers.Wallet(ethers.keccak256(ethers.toUtf8Bytes("THRESHOLD_TRACE_OUTSIDER")), provider);
  const mismatches = [];

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
  const threshold = new ethers.Contract(
    DIAMOND_ADDRESS,
    loadArtifact("out/BurnThresholdFacet.sol/BurnThresholdFacet.json").abi,
    provider
  );

  const PLATFORM_ADMIN_ROLE = role("PLATFORM_ADMIN_ROLE");
  const FOUNDER_ROLE = role("FOUNDER_ROLE");
  const authorized =
    (await access.hasRole(PLATFORM_ADMIN_ROLE, founder.address)) || (await access.hasRole(FOUNDER_ROLE, founder.address));
  if (!authorized) {
    throw new Error("deployer lacks both PLATFORM_ADMIN_ROLE and FOUNDER_ROLE; cannot validate threshold admin path");
  }

  await ensureEthBalance(founder, holder.address, scenarioFundingWei("1"), "fundETH:holder");
  await ensureEthBalance(founder, burner.address, scenarioFundingWei("1"), "fundETH:burner");
  await ensureEthBalance(founder, outsider.address, scenarioFundingWei("1"), "fundETH:outsider");

  await expectRevert(() => threshold.connect(outsider).thresholdSetBurnLimit(10001n), "thresholdSetBurnLimit:unauthorized-invalid");
  await expectRevert(() => threshold.connect(outsider).thresholdSetBurnLimit(2500n), "thresholdSetBurnLimit:unauthorized");

  await sendAndWait(threshold.connect(founder).thresholdSetBurnLimit(2500n), "thresholdSetBurnLimit:25pct");
  const configured = await threshold.thresholdGetBurnLimit();
  if (configured !== 2500n) throw new Error(`configured threshold mismatch: ${configured}`);

  const seedAmount = 10_000n;
  const holderBalanceBeforeSeed = await token.tokenBalanceOf(holder.address);
  await sendAndWait(token.connect(founder).transfer(holder.address, seedAmount), "transfer:seed-holder");
  const holderBalanceAfterSeed = await token.tokenBalanceOf(holder.address);
  const expectedMaxBurnable = (holderBalanceAfterSeed * 2500n) / 10000n;
  const expectedRetained = (holderBalanceAfterSeed * (10000n - 2500n)) / 10000n;
  const expectedExcess = holderBalanceAfterSeed - expectedRetained;

  if (holderBalanceAfterSeed !== holderBalanceBeforeSeed + seedAmount) {
    throw new Error(`holder seed balance mismatch: expected ${holderBalanceBeforeSeed + seedAmount} got ${holderBalanceAfterSeed}`);
  }

  const calculatedExcess = await threshold.thresholdCalculateExcess(holder.address);
  if (calculatedExcess !== expectedExcess) {
    throw new Error(`thresholdCalculateExcess mismatch: expected ${expectedExcess} got ${calculatedExcess}`);
  }

  await sendAndWait(threshold.connect(holder).thresholdBurnTokens(expectedMaxBurnable), "thresholdBurnTokens:exact-limit");
  const holderAfterDirectBurn = await token.tokenBalanceOf(holder.address);
  if (holderAfterDirectBurn !== holderBalanceAfterSeed - expectedMaxBurnable) {
    throw new Error(`holder balance mismatch after direct threshold burn: ${holderAfterDirectBurn}`);
  }

  await sendAndWait(token.connect(founder).transfer(holder.address, expectedMaxBurnable), "transfer:restore-holder");
  await expectRevert(
    () => threshold.connect(holder).thresholdBurnTokens(expectedMaxBurnable + 1n),
    "thresholdBurnTokens:above-limit"
  );

  await sendAndWait(token.connect(holder).approve(burner.address, expectedMaxBurnable), "approve:burner");
  await sendAndWait(
    threshold.connect(burner).thresholdBurnTokensFrom(holder.address, expectedMaxBurnable),
    "thresholdBurnTokensFrom:exact-limit"
  );
  const allowanceAfter = await token.allowance(holder.address, burner.address);
  if (allowanceAfter !== 0n) throw new Error(`allowance after thresholdBurnTokensFrom should be 0, got ${allowanceAfter}`);

  await sendAndWait(token.connect(founder).transfer(holder.address, seedAmount), "transfer:seed-holder-for-excess");
  const holderBeforeExcess = await token.tokenBalanceOf(holder.address);
  const expectedExcessFromCurrent = (holderBeforeExcess * 2500n) / 10000n;
  const reportedExcessFromCurrent = await threshold.thresholdCalculateExcess(holder.address);
  if (reportedExcessFromCurrent !== expectedExcessFromCurrent) {
    throw new Error(
      `reported excess mismatch before thresholdBurnExcess: expected ${expectedExcessFromCurrent} got ${reportedExcessFromCurrent}`
    );
  }

  const burnExcessReceipt = await sendAndWait(
    threshold.connect(founder).thresholdBurnExcess(holder.address),
    "thresholdBurnExcess"
  );
  void burnExcessReceipt;

  const holderAfterExcess = await token.tokenBalanceOf(holder.address);
  if (holderAfterExcess !== holderBeforeExcess - expectedExcessFromCurrent) {
    throw new Error(`holder balance mismatch after thresholdBurnExcess: ${holderAfterExcess}`);
  }

  await sendAndWait(threshold.connect(founder).thresholdSetBurnLimit(0n), "thresholdSetBurnLimit:zero");
  const zeroExcess = await threshold.thresholdCalculateExcess(holder.address);
  if (zeroExcess !== 0n) throw new Error(`zero threshold should yield zero excess, got ${zeroExcess}`);
  await expectRevert(() => threshold.connect(holder).thresholdBurnTokens(1n), "thresholdBurnTokens:zero-threshold");

  if (mismatches.length > 0) {
    throw new Error(mismatches.join(" | "));
  }

  console.log("TRACE_BURN_THRESHOLD_LIFECYCLE: PASS");
}

main().catch((err) => {
  console.error("TRACE_BURN_THRESHOLD_LIFECYCLE: FAIL");
  console.error(err);
  process.exit(1);
});
