"use strict";

const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const { signEchoScoreUpdate } = require("./echo_score_update_helper");
const nextNonceByVoice = new Map();

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

function selectorsForAbi(abi) {
  const iface = new ethers.Interface(abi);
  return abi
    .filter((item) => item.type === "function")
    .map((item) => iface.getFunction(ethers.FunctionFragment.from(item).format("sighash")).selector);
}

async function deploy(factory, label) {
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log(`[deploy] ${label} ${address}`);
  return contract;
}

function createProvider(rpcUrl) {
  const provider = new ethers.JsonRpcProvider(rpcUrl, undefined, { batchMaxCount: 1 });
  provider.pollingInterval = 250;
  return provider;
}

function createSigner(rpcUrl, privateKey) {
  return new ethers.NonceManager(new ethers.Wallet(privateKey, createProvider(rpcUrl)));
}

async function advanceTime(provider, seconds) {
  await provider.send("evm_increaseTime", [seconds]);
  await provider.send("evm_mine", []);
}

function baseUpdate(voiceHash, timestamp) {
  const voiceKey = String(voiceHash).toLowerCase();
  const nextNonce = nextNonceByVoice.get(voiceKey) || 0n;
  nextNonceByVoice.set(voiceKey, nextNonce + 1n);
  return {
    voiceHash,
    qualityData: {
      completenessPercentage: 95,
      sampleRate: 48000,
      speechDuration: 3600,
      hnr: 9200,
      jitterLocal: 120,
      shimmerLocal: 180
    },
    engagementData: {
      viewCount: 120000,
      likeCount: 9000,
      playCount: 64000,
      ratingAverage: 485,
      ratingCount: 220,
      assetAge: 14
    },
    governanceData: {
      proposalsCreated: 3,
      proposalsActiveOrSuccess: 2,
      votesCast: 40
    },
    contributionData: {
      datasetCount: 4,
      totalAssetCount: 120,
      totalDuration: 86000,
      hasCommercialDataset: true,
      hasHighQualityDataset: true
    },
    marketplaceData: {
      datasetSalesCount: 8,
      datasetSalesVolume: ethers.parseUnits("25000", 6),
      assetSalesCount: 12,
      assetSalesVolume: ethers.parseUnits("18000", 6),
      royaltiesRealized: ethers.parseUnits("3200", 6),
      royaltyPaymentsCount: 9
    },
    nonce: nextNonce,
    timestamp,
    signature: "0x"
  };
}

async function makeSignedUpdate(voiceHash, timestamp, signer, overrides = {}) {
  const base = baseUpdate(voiceHash, timestamp);
  const merged = {
    ...base,
    ...overrides
  };
  merged.qualityData = { ...base.qualityData, ...(overrides.qualityData || {}) };
  merged.engagementData = { ...base.engagementData, ...(overrides.engagementData || {}) };
  merged.governanceData = { ...base.governanceData, ...(overrides.governanceData || {}) };
  merged.contributionData = { ...base.contributionData, ...(overrides.contributionData || {}) };
  merged.marketplaceData = { ...base.marketplaceData, ...(overrides.marketplaceData || {}) };
  merged.signature = await signEchoScoreUpdate(merged, signer);
  return merged;
}

async function makeQuorumUpdate(voiceHash, timestamp, signers, overrides = {}) {
  const base = baseUpdate(voiceHash, timestamp);
  const update = {
    ...base,
    ...overrides
  };
  update.qualityData = { ...base.qualityData, ...(overrides.qualityData || {}) };
  update.engagementData = { ...base.engagementData, ...(overrides.engagementData || {}) };
  update.governanceData = { ...base.governanceData, ...(overrides.governanceData || {}) };
  update.contributionData = { ...base.contributionData, ...(overrides.contributionData || {}) };
  update.marketplaceData = { ...base.marketplaceData, ...(overrides.marketplaceData || {}) };
  const signatures = [];
  for (const signer of signers) {
    signatures.push(await signEchoScoreUpdate(update, signer));
  }
  update.signature = ethers.concat(signatures);
  return update;
}

module.exports = {
  loadArtifact,
  sendAndWait,
  expectRevert,
  selectorsForAbi,
  deploy,
  createProvider,
  createSigner,
  advanceTime,
  makeSignedUpdate,
  makeQuorumUpdate
};
