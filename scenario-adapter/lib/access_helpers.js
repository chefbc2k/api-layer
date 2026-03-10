"use strict";

const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const { scenarioFundingWei } = require("./runtime_config");
const { ensureEthBalance } = require("./validation_safety");

const ROLE = {
  FOUNDER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("FOUNDER_ROLE")),
  TIMELOCK_ROLE: ethers.keccak256(ethers.toUtf8Bytes("TIMELOCK_ROLE")),
  PLATFORM_ADMIN_ROLE: ethers.keccak256(ethers.toUtf8Bytes("PLATFORM_ADMIN_ROLE")),
  SECURITY_ADMIN_ROLE: ethers.keccak256(ethers.toUtf8Bytes("SECURITY_ADMIN_ROLE")),
  EMERGENCY_ADMIN_ROLE: ethers.keccak256(ethers.toUtf8Bytes("EMERGENCY_ADMIN_ROLE")),
  RECOVERY_APPROVER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("RECOVERY_APPROVER_ROLE")),
  FEE_MANAGER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("FEE_MANAGER_ROLE")),
  OWNER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("OWNER_ROLE")),
  VOTER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("VOTER_ROLE")),
  MARKETPLACE_ADMIN_ROLE: ethers.keccak256(ethers.toUtf8Bytes("MARKETPLACE_ADMIN_ROLE")),
  TREASURY_ROLE: ethers.keccak256(ethers.toUtf8Bytes("TREASURY_ROLE")),
  TREASURY_SIGNER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("TREASURY_SIGNER_ROLE")),
  BOARD_MEMBER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("BOARD_MEMBER_ROLE")),
  DAO_MEMBER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("DAO_MEMBER_ROLE")),
  GOVERNANCE_PARTICIPANT_ROLE: ethers.keccak256(ethers.toUtf8Bytes("GOVERNANCE_PARTICIPANT_ROLE")),
  MARKETPLACE_SELLER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("MARKETPLACE_SELLER_ROLE")),
  MARKETPLACE_PURCHASER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("MARKETPLACE_PURCHASER_ROLE")),
  RESEARCH_PARTICIPANT_ROLE: ethers.keccak256(ethers.toUtf8Bytes("RESEARCH_PARTICIPANT_ROLE")),
  VOICE_OPERATOR_ROLE: ethers.keccak256(ethers.toUtf8Bytes("VOICE_OPERATOR_ROLE")),
  LICENSE_MANAGER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("LICENSE_MANAGER_ROLE")),
  ROYALTY_MANAGER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("ROYALTY_MANAGER_ROLE")),
  ESCROW_OPERATOR_ROLE: ethers.keccak256(ethers.toUtf8Bytes("ESCROW_OPERATOR_ROLE"))
};

function loadArtifact(relPath) {
  const file = path.join(process.cwd(), relPath);
  if (!fs.existsSync(file)) throw new Error(`Missing artifact: ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function loadArtifactFirst(relPaths) {
  for (const relPath of relPaths) {
    const file = path.join(process.cwd(), relPath);
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    }
  }
  throw new Error(`Missing artifact from candidates: ${relPaths.join(", ")}`);
}

function createProvider(rpcUrl) {
  const provider = new ethers.JsonRpcProvider(rpcUrl, undefined, { batchMaxCount: 1, cacheTimeout: -1 });
  provider.pollingInterval = 250;
  return provider;
}

function selectorsForAbi(abi) {
  const iface = new ethers.Interface(abi);
  const selectors = [];
  iface.forEachFunction((fragment) => {
    selectors.push(fragment.selector);
  });
  return selectors;
}

async function sendAndWait(txPromise, label) {
  const tx = await txPromise;
  console.log(`[tx] ${label} from=${tx.from} nonce=${tx.nonce} sel=${(tx.data || "0x").slice(0, 10)} hash=${tx.hash}`);
  const provider = tx.provider;
  for (let i = 0; i < 120; i++) {
    const receipt = await provider.getTransactionReceipt(tx.hash);
    if (receipt) {
      if (receipt.status !== 1n && receipt.status !== 1) {
        throw new Error(`${label}: transaction reverted hash=${tx.hash}`);
      }
      return receipt;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  const fallbackReceipt = await provider.waitForTransaction(tx.hash, 1, 5_000);
  if (fallbackReceipt) {
    if (fallbackReceipt.status !== 1n && fallbackReceipt.status !== 1) {
      throw new Error(`${label}: transaction reverted hash=${tx.hash}`);
    }
    return fallbackReceipt;
  }
  throw new Error(`${label}: receipt timeout hash=${tx.hash}`);
}

async function deploy(factory, label, ...args) {
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log(`[deploy] ${label} ${address}`);
  return contract;
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

async function advanceTime(provider, seconds) {
  await provider.send("evm_increaseTime", [seconds]);
  await provider.send("evm_mine", []);
}

function randomWallet(provider) {
  return new ethers.NonceManager(ethers.Wallet.createRandom().connect(provider));
}

async function fundEth(founder, wallets) {
  for (const wallet of wallets) {
    const target = typeof wallet === "string" ? wallet : await wallet.getAddress();
    await ensureEthBalance(founder, target, scenarioFundingWei("1"), `fundETH:${target}`);
  }
}

function asSet(values) {
  return new Set(values.map((v) => v.toLowerCase()));
}

module.exports = {
  ROLE,
  loadArtifact,
  loadArtifactFirst,
  createProvider,
  selectorsForAbi,
  sendAndWait,
  deploy,
  expectRevert,
  advanceTime,
  randomWallet,
  fundEth,
  asSet
};
