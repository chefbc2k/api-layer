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

const EXPECTED_SYMBOL = "USPK";
const EXPECTED_DECIMALS = 10;
const EXPECTED_SUPPLY = 42_000_000n * 10n ** 10n;
const DISTRIBUTION_BPS = {
  FOUNDER: 1200n,
  BOARD: 200n,
  EXECUTIVE: 300n,
  SENIOR: 275n,
  DEV_FUND: 25n,
  PUBLIC: 1400n,
  DEX: 700n,
  CEX: 700n,
  GROWTH: 700n,
  TREASURY: 1600n,
  UNION: 200n,
  PRIVATE_SALE: 1200n,
  STAKING: 1500n
};

function loadArtifact(relPath) {
  const file = path.join(process.cwd(), relPath);
  if (!fs.existsSync(file)) throw new Error(`Missing artifact: ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function role(name) {
  return ethers.keccak256(ethers.toUtf8Bytes(name));
}

function sumDistributionBps() {
  return Object.values(DISTRIBUTION_BPS).reduce((acc, value) => acc + value, 0n);
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

async function tryCall(label, fn) {
  try {
    return await fn();
  } catch (err) {
    console.log(`[optional-call] ${label} unavailable data=${err?.data || err?.info?.error?.data || "<none>"}`);
    return null;
  }
}

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const founder = new ethers.Wallet(PRIVATE_KEY, provider);
  const userA = new ethers.Wallet(ethers.keccak256(ethers.toUtf8Bytes("TOKEN_TRACE_USER_A")), provider);
  const userB = new ethers.Wallet(ethers.keccak256(ethers.toUtf8Bytes("TOKEN_TRACE_USER_B")), provider);
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

  await ensureEthBalance(founder, userA.address, scenarioFundingWei("1"), "fundETH:userA");
  await ensureEthBalance(founder, userB.address, scenarioFundingWei("1"), "fundETH:userB");

  if (sumDistributionBps() !== 10000n) {
    throw new Error(`distribution percentages must sum to 10000 bps, got ${sumDistributionBps()}`);
  }

  const name = await tryCall("name()", () => token.name());
  const symbol = await tryCall("symbol()", () => token.symbol());
  const tokenName = await token.tokenName();
  const tokenSymbol = await token.tokenSymbol();
  const decimals = BigInt(await token.decimals());
  const totalSupply = await token.totalSupply();
  const maxSupply = await token.supplyGetMaximum();
  const mintingFinished = await token.supplyIsMintingFinished();
  const founderBalanceBefore = await token.tokenBalanceOf(founder.address);
  const userABalanceBefore = await token.tokenBalanceOf(userA.address);
  const userBBalanceBefore = await token.tokenBalanceOf(userB.address);
  const looksFreshDeployment =
    totalSupply === EXPECTED_SUPPLY
    && founderBalanceBefore === EXPECTED_SUPPLY
    && userABalanceBefore === 0n
    && userBBalanceBefore === 0n;

  if (tokenSymbol !== EXPECTED_SYMBOL) throw new Error(`tokenSymbol mismatch: ${tokenSymbol}`);
  if (decimals !== BigInt(EXPECTED_DECIMALS)) throw new Error(`decimals mismatch: ${decimals}`);
  if (maxSupply !== EXPECTED_SUPPLY) throw new Error(`maxSupply mismatch: ${maxSupply}`);
  if (totalSupply > maxSupply) throw new Error(`totalSupply exceeds maxSupply: ${totalSupply}`);
  if (!mintingFinished) throw new Error("minting should be permanently finished after initialization");

  if (looksFreshDeployment) {
    if (totalSupply !== EXPECTED_SUPPLY) throw new Error(`totalSupply mismatch: ${totalSupply}`);
    if (founderBalanceBefore !== EXPECTED_SUPPLY) {
      throw new Error(`initializer should hold full initial supply on fresh deploy, got ${founderBalanceBefore}`);
    }
    if (userABalanceBefore !== 0n || userBBalanceBefore !== 0n) {
      throw new Error("fresh deploy should not pre-fund test users");
    }
  } else {
    console.log(
      `[token-surface] persistent-state mode totalSupply=${totalSupply} founderBalance=${founderBalanceBefore} userA=${userABalanceBefore} userB=${userBBalanceBefore}`
    );
  }
  console.log(
    `[token-surface] name()=${name ?? "<unmounted>"} tokenName()=${tokenName} symbol()=${symbol ?? "<unmounted>"} tokenSymbol()=${tokenSymbol}`
  );

  const MINTER_ROLE = role("MINTER_ROLE");
  const SUPPLY_MANAGER_ROLE = role("SUPPLY_MANAGER_ROLE");
  const founderHasMinter = await access.hasRole(MINTER_ROLE, founder.address);
  const founderHasSupplyManager = await access.hasRole(SUPPLY_MANAGER_ROLE, founder.address);

  console.log(
    `[roles] founderHasMinter=${founderHasMinter} founderHasSupplyManager=${founderHasSupplyManager}`
  );

  await expectRevert(() => token.connect(founder).initializeToken(), "reinitialize:founder");
  await expectRevert(() => token.connect(userA).initializeToken(), "reinitialize:non-founder");
  await expectRevert(() => token.connect(founder).supplyMintTokens(userA.address, 1n), "supplyMintTokens:founder");
  await expectRevert(() => token.connect(userA).supplyMintTokens(userA.address, 1n), "supplyMintTokens:unauthorized");
  await expectRevert(() => token.connect(founder).supplySetMaximum(EXPECTED_SUPPLY + 1n), "supplySetMaximum:founder");
  await expectRevert(() => token.connect(userA).supplySetMaximum(EXPECTED_SUPPLY + 1n), "supplySetMaximum:unauthorized");
  await expectRevert(() => token.connect(founder).supplyFinishMinting(), "supplyFinishMinting:founder");
  await expectRevert(() => token.connect(userA).supplyFinishMinting(), "supplyFinishMinting:unauthorized");

  const transferAmount = 1_000n;
  const delegatedAmount = 250n;
  const burnAmount = 100n;
  const burnFromAmount = 50n;

  await sendAndWait(token.connect(founder).transfer(userA.address, transferAmount), "transfer:founder->userA");
  await sendAndWait(token.connect(userA).approve(userB.address, delegatedAmount), "approve:userA->userB");
  await sendAndWait(
    token.connect(userB).tokenTransferFrom(userA.address, userB.address, delegatedAmount),
    "tokenTransferFrom:userA->userB"
  );
  await sendAndWait(token.connect(userB).burn(burnAmount), "burn:userB");
  await sendAndWait(token.connect(userA).approve(userB.address, burnFromAmount), "approveForBurn:userA->userB");
  await sendAndWait(token.connect(userB).burnFrom(userA.address, burnFromAmount), "burnFrom:userA by userB");

  const founderBalanceAfter = await token.tokenBalanceOf(founder.address);
  const userABalanceAfter = await token.tokenBalanceOf(userA.address);
  const userBBalanceAfter = await token.tokenBalanceOf(userB.address);
  const totalSupplyAfter = await token.totalSupply();
  const allowanceAfterTransfer = await token.allowance(userA.address, userB.address);

  const expectedFounder = founderBalanceBefore - transferAmount;
  const expectedUserA = userABalanceBefore + transferAmount - delegatedAmount - burnFromAmount;
  const expectedUserB = userBBalanceBefore + delegatedAmount - burnAmount;
  const expectedTotalSupply = totalSupply - burnAmount - burnFromAmount;

  if (founderBalanceAfter !== expectedFounder) throw new Error(`founder balance mismatch: ${founderBalanceAfter}`);
  if (userABalanceAfter !== expectedUserA) throw new Error(`userA balance mismatch: ${userABalanceAfter}`);
  if (userBBalanceAfter !== expectedUserB) throw new Error(`userB balance mismatch: ${userBBalanceAfter}`);
  if (totalSupplyAfter !== expectedTotalSupply) throw new Error(`post-burn totalSupply mismatch: ${totalSupplyAfter}`);
  if (allowanceAfterTransfer !== 0n) throw new Error(`allowance should be fully consumed, got ${allowanceAfterTransfer}`);

  if (mismatches.length > 0) {
    throw new Error(mismatches.join(" | "));
  }

  console.log("TRACE_TOKEN_SUPPLY_LIFECYCLE: PASS");
}

main().catch((err) => {
  console.error("TRACE_TOKEN_SUPPLY_LIFECYCLE: FAIL");
  console.error(err);
  process.exit(1);
});
