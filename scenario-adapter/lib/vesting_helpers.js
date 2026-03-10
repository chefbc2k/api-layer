"use strict";

const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const { scenarioFundingWei } = require("./runtime_config");
const { ensureEthBalance } = require("./validation_safety");

const DAY = 24 * 60 * 60;
const MONTH = 30 * DAY;
const ONE_DAY = 24n * 60n * 60n;
const TIMELOCK_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TIMELOCK_ROLE"));
const VESTING_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("VESTING_MANAGER_ROLE"));

function loadArtifact(relPath) {
  const file = path.join(process.cwd(), relPath);
  if (!fs.existsSync(file)) throw new Error(`Missing artifact: ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

async function sendAndWait(txPromise, label) {
  const tx = await txPromise;
  console.log(`[tx] ${label} from=${tx.from} nonce=${tx.nonce} sel=${(tx.data || "0x").slice(0, 10)} hash=${tx.hash}`);
  for (let i = 0; i < 120; i++) {
    const receipt = await tx.provider.getTransactionReceipt(tx.hash);
    if (receipt) {
      if (receipt.status !== 1n && receipt.status !== 1) {
        throw new Error(`${label}: transaction reverted hash=${tx.hash}`);
      }
      return receipt;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  const fallbackReceipt = await tx.provider.waitForTransaction(tx.hash, 1, 15_000);
  if (fallbackReceipt) {
    if (fallbackReceipt.status !== 1n && fallbackReceipt.status !== 1) {
      throw new Error(`${label}: transaction reverted hash=${tx.hash}`);
    }
    return fallbackReceipt;
  }
  throw new Error(`${label}: receipt timeout hash=${tx.hash}`);
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

async function rpc(rpcUrl, method, params = []) {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params })
  });
  const body = await res.json();
  if (body.error) throw new Error(`${method} failed: ${body.error.message}`);
  return body.result;
}

async function advanceTime(rpcUrl, seconds) {
  const latest = await rpc(rpcUrl, "eth_getBlockByNumber", ["latest", false]);
  const latestTimestamp = parseInt(latest.timestamp, 16);
  await rpc(rpcUrl, "evm_setNextBlockTimestamp", [latestTimestamp + seconds]);
  await rpc(rpcUrl, "evm_mine", []);
}

async function setupCore(rpcUrl, diamondAddress, privateKey) {
  const provider = new ethers.JsonRpcProvider(rpcUrl, undefined, { batchMaxCount: 1 });
  provider.pollingInterval = 250;
  const founder = new ethers.NonceManager(new ethers.Wallet(privateKey, provider));
  const access = new ethers.Contract(
    diamondAddress,
    loadArtifact("out/AccessControlFacet.sol/AccessControlFacet.json").abi,
    provider
  );
  const token = new ethers.Contract(
    diamondAddress,
    loadArtifact("out/TokenSupplyFacet.sol/TokenSupplyFacet.json").abi,
    provider
  );
  const vesting = new ethers.Contract(
    diamondAddress,
    loadArtifact("out/VestingFacet.sol/VestingFacet.json").abi,
    provider
  );
  return { provider, founder, access, token, vesting };
}

async function ensureVestingRoles(access, founder) {
  const founderAddress = await founder.getAddress();
  if (!(await access.hasRole(TIMELOCK_ROLE, founderAddress))) {
    await sendAndWait(
      access.connect(founder).grantRole(TIMELOCK_ROLE, founderAddress, ethers.MaxUint256),
      "grantRole:TIMELOCK_ROLE"
    );
  }

  if (!(await access.hasRole(VESTING_MANAGER_ROLE, founderAddress))) {
    await sendAndWait(
      access.connect(founder).grantRole(VESTING_MANAGER_ROLE, founderAddress, ethers.MaxUint256),
      "grantRole:VESTING_MANAGER_ROLE"
    );
  }
}

function randomWallet(provider) {
  return new ethers.NonceManager(ethers.Wallet.createRandom().connect(provider));
}

async function fundEth(founder, wallets) {
  for (const wallet of wallets) {
    const target = typeof wallet === "string"
      ? wallet
      : typeof wallet.getAddress === "function"
        ? await wallet.getAddress()
        : wallet.address;
    if (!target) throw new Error("fundEth target address resolution failed");
    await ensureEthBalance(
      founder,
      target,
      scenarioFundingWei("1"),
      `fundETH:${target}`
    );
  }
}

function remainingLocked(schedule) {
  return schedule.totalAmount - schedule.releasedAmount;
}

async function tokenBalanceSum(token, addresses) {
  let total = 0n;
  for (const addr of addresses) total += await token.tokenBalanceOf(addr);
  return total;
}

module.exports = {
  DAY,
  MONTH,
  ONE_DAY,
  loadArtifact,
  sendAndWait,
  expectRevert,
  advanceTime,
  setupCore,
  ensureVestingRoles,
  randomWallet,
  fundEth,
  remainingLocked,
  tokenBalanceSum
};
