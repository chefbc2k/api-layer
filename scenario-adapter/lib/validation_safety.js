"use strict";

const path = require("path");
const { ethers } = require("ethers");

const AUTHORITATIVE_BASELINE_REPORT = "artifacts/release-readiness/testnet-validation-report-2026-03-09.md";

function authoritativeBaselineReportPath() {
  return path.join(process.cwd(), AUTHORITATIVE_BASELINE_REPORT);
}

function uniqueScenarioSuffix(label) {
  const safeLabel = String(label || "scenario").replace(/[^a-zA-Z0-9_-]+/g, "-");
  return `${safeLabel}-${Date.now()}-${process.pid}`;
}

function uniqueScenarioText(label, prefix = "") {
  const suffix = uniqueScenarioSuffix(label);
  return prefix ? `${prefix}${suffix}` : suffix;
}

function uniqueScenarioBytes32(label, prefix = "") {
  return ethers.keccak256(ethers.toUtf8Bytes(uniqueScenarioText(label, prefix)));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForProviderBlock(provider, blockNumber, { attempts = 120, intervalMs = 250 } = {}) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await provider.getBlockNumber() >= blockNumber) return;
    await sleep(intervalMs);
  }
  throw new Error(`provider did not advance to block ${blockNumber}`);
}

async function readContractAtBlock(contract, methodName, args = [], blockNumber, { attempts = 40, intervalMs = 250 } = {}) {
  const provider = contract.runner?.provider || contract.provider;
  if (!provider) throw new Error(`contract ${methodName} call is missing a provider`);

  await waitForProviderBlock(provider, blockNumber, { attempts, intervalMs });

  let lastError = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await contract[methodName](...args, { blockTag: blockNumber });
    } catch (error) {
      lastError = error;
      await sleep(intervalMs);
    }
  }

  throw lastError || new Error(`${methodName} read at block ${blockNumber} failed`);
}

async function readContractAtReceiptBlock(contract, methodName, args = [], receipt, options = {}) {
  const blockNumber = Number(receipt?.blockNumber);
  if (!Number.isFinite(blockNumber) || blockNumber <= 0) {
    throw new Error(`${methodName} requires a mined receipt block number`);
  }
  return readContractAtBlock(contract, methodName, args, blockNumber, options);
}

async function ensureEthBalance(funder, recipient, targetWei, label, { attempts = 120, intervalMs = 250 } = {}) {
  const provider = funder.provider;
  if (!provider) throw new Error(`ensureEthBalance(${label}) requires a signer with provider`);

  const targetAddress = typeof recipient === "string"
    ? recipient
    : typeof recipient.getAddress === "function"
      ? await recipient.getAddress()
      : recipient.address;
  if (!targetAddress) throw new Error(`ensureEthBalance(${label}) could not resolve target address`);

  const currentBalance = await provider.getBalance(targetAddress);
  if (currentBalance >= targetWei) {
    console.log(`[fund-skip] ${label} target=${targetAddress} balance=${currentBalance} targetWei=${targetWei}`);
    return null;
  }

  const tx = await funder.sendTransaction({ to: targetAddress, value: targetWei - currentBalance });
  console.log(`[tx] ${label} from=${tx.from} nonce=${tx.nonce} sel=${(tx.data || "0x").slice(0, 10)} hash=${tx.hash}`);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const receipt = await provider.getTransactionReceipt(tx.hash);
    if (receipt) {
      if (receipt.status !== 1n && receipt.status !== 1) {
        throw new Error(`${label}: transaction reverted hash=${tx.hash}`);
      }
      return receipt;
    }
    await sleep(intervalMs);
  }

  throw new Error(`${label}: receipt timeout hash=${tx.hash}`);
}

async function assertLiveMutationAllowed(provider, scriptName) {
  const network = await provider.getNetwork();
  if (network.chainId === 31337n) return;
  if (process.env.ALLOW_LIVE_CONFIG_MUTATION === "1") return;

  throw new Error(
    `${scriptName} mutates live config/state. Run it on a Base Sepolia fork or set ALLOW_LIVE_CONFIG_MUTATION=1 after confirming restore logic. Baseline: ${authoritativeBaselineReportPath()}`
  );
}

module.exports = {
  AUTHORITATIVE_BASELINE_REPORT,
  authoritativeBaselineReportPath,
  uniqueScenarioSuffix,
  uniqueScenarioText,
  uniqueScenarioBytes32,
  waitForProviderBlock,
  readContractAtBlock,
  readContractAtReceiptBlock,
  ensureEthBalance,
  assertLiveMutationAllowed
};
