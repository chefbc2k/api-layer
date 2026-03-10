#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
require("dotenv").config();
const { uniqueScenarioSuffix, assertLiveMutationAllowed } = require("./lib/validation_safety");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const WHISPERBLOCK_STORAGE_POSITION = ethers.keccak256(ethers.toUtf8Bytes("speak.voice.whisperblock.storage"));

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

function storageSlot(baseSlot, offset) {
  return ethers.toBeHex(BigInt(baseSlot) + BigInt(offset), 32);
}

async function readUint256Storage(provider, target, baseSlot, offset) {
  return BigInt(await provider.getStorage(target, storageSlot(baseSlot, offset)));
}

async function readPackedWhisperConfig(provider, target) {
  const packed = BigInt(await provider.getStorage(target, storageSlot(WHISPERBLOCK_STORAGE_POSITION, 22)));
  const addressMask = (1n << 160n) - 1n;
  const trustedOracleValue = (packed >> 24n) & addressMask;

  return {
    requireAudit: (packed & 0xffn) !== 0n,
    enableDeepfakeDetection: ((packed >> 8n) & 0xffn) !== 0n,
    initialized: ((packed >> 16n) & 0xffn) !== 0n,
    trustedOracle: ethers.getAddress(ethers.toBeHex(trustedOracleValue, 20))
  };
}

async function readWhisperConfig(provider, target) {
  const packed = await readPackedWhisperConfig(provider, target);
  return {
    // WhisperBlockStorage places 13 mapping slots before the scalar config values.
    minKeyStrength: await readUint256Storage(provider, target, WHISPERBLOCK_STORAGE_POSITION, 13),
    minEntropy: await readUint256Storage(provider, target, WHISPERBLOCK_STORAGE_POSITION, 14),
    defaultAccessDuration: await readUint256Storage(provider, target, WHISPERBLOCK_STORAGE_POSITION, 15),
    requireAudit: packed.requireAudit,
    trustedOracle: packed.trustedOracle
  };
}

async function ensureRole(access, roleId, signer, account, allowGrant) {
  if (await access.hasRole(roleId, account)) return;
  if (!allowGrant) {
    throw new Error(`missing required role ${roleId} for ${account}; refusing live role mutation in validation`);
  }
  await sendAndWait(access.connect(signer).grantRole(roleId, account, ethers.MaxUint256), "grantRole");
}

async function registerVoice(voiceAsset, signer, uri, royalty) {
  const receipt = await sendAndWait(voiceAsset.connect(signer).registerVoiceAsset(uri, royalty), "registerVoiceAsset");
  const registered = receipt.logs
    .map((log) => {
      try { return voiceAsset.interface.parseLog(log); } catch { return null; }
    })
    .find((log) => log && log.name === "VoiceAssetRegistered");
  if (!registered) throw new Error("registerVoiceAsset should emit VoiceAssetRegistered");
  return registered.args.voiceHash;
}

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  await assertLiveMutationAllowed(provider, "trace_whisperblock_lifecycle.js");
  const network = await provider.getNetwork();
  const allowRoleGrant = network.chainId === 31337n;
  const owner = new ethers.Wallet(PRIVATE_KEY, provider);
  const grantee = new ethers.Wallet(ethers.keccak256(ethers.toUtf8Bytes("WHISPER_GRANTEE")), provider);
  const oracle = ethers.Wallet.createRandom();
  const runId = uniqueScenarioSuffix("whisperblock");

  const access = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/AccessControlFacet.sol/AccessControlFacet.json").abi, provider);
  const voiceAsset = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/VoiceAssetFacet.sol/VoiceAssetFacet.json").abi, provider);
  const whisper = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/WhisperBlockFacet.sol/WhisperBlockFacet.json").abi, provider);
  const originalConfig = await readWhisperConfig(provider, DIAMOND_ADDRESS);

  if (
    originalConfig.minKeyStrength === 0n || originalConfig.minEntropy === 0n || originalConfig.defaultAccessDuration === 0n
  ) {
    throw new Error("whisper config restore is not safe when original minKeyStrength/minEntropy/defaultAccessDuration contains zero");
  }

  await ensureRole(access, role("OWNER_ROLE"), owner, owner.address, allowRoleGrant);
  await ensureRole(access, role("ENCRYPTOR_ROLE"), owner, owner.address, allowRoleGrant);

  let restoreError = null;
  try {
    const voiceHash = await registerVoice(voiceAsset, owner, `ipfs://whisper-voice-${runId}`, 1000);

    const auditBefore = await whisper.getAuditTrail(voiceHash);
    await sendAndWait(whisper.connect(owner).setAuditEnabled(true), "setAuditEnabled");
    await sendAndWait(
      whisper.connect(owner).generateAndSetEncryptionKey(voiceHash, { gasLimit: 4_000_000 }),
      "generateAndSetEncryptionKey"
    );

    const fingerprintData = ethers.concat([
      ethers.zeroPadValue("0x1111", 32),
      ethers.zeroPadValue("0x2222", 32),
      ethers.zeroPadValue("0x3333", 32)
    ]);
    await sendAndWait(whisper.connect(owner).registerVoiceFingerprint(voiceHash, fingerprintData), "registerVoiceFingerprint");
    const authentic = await whisper.verifyVoiceAuthenticity(voiceHash, fingerprintData);
    if (!authentic) throw new Error("registered fingerprint should verify as authentic");

    const invalidFingerprintData = ethers.concat([
      ethers.zeroPadValue("0x1111", 32),
      ethers.zeroPadValue("0x2222", 32),
      ethers.zeroPadValue("0x4444", 32)
    ]);
    const invalidAuthentic = await whisper.verifyVoiceAuthenticity(voiceHash, invalidFingerprintData);
    if (invalidAuthentic) throw new Error("modified fingerprint should not verify");

    await sendAndWait(whisper.connect(owner).updateSystemParameters(512, 256, 3600), "updateSystemParameters");
    await sendAndWait(whisper.connect(owner).grantAccess(voiceHash, grantee.address, 1200), "grantAccess");
    await sendAndWait(whisper.connect(owner).revokeAccess(voiceHash, grantee.address), "revokeAccess");

    await sendAndWait(whisper.connect(owner).setTrustedOracle(oracle.address), "setTrustedOracle");
    const offchainSeed = ethers.keccak256(ethers.toUtf8Bytes(`offchain-seed-${runId}`));
    const blockHash = ethers.keccak256(ethers.toUtf8Bytes(`oracle-block-hash-${runId}`));
    const message = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes32", "bytes32", "address", "bytes32"],
        [voiceHash, offchainSeed, owner.address, blockHash]
      )
    );
    const signature = await oracle.signMessage(ethers.getBytes(message));
    await sendAndWait(
      whisper.connect(owner).setOffchainEntropy(voiceHash, offchainSeed, owner.address, blockHash, signature),
      "setOffchainEntropy"
    );

    const auditAfter = await whisper.getAuditTrail(voiceHash);
    if (auditAfter.length <= auditBefore.length) throw new Error("whisper audit trail should grow after security operations");

    console.log("TRACE_WHISPERBLOCK_LIFECYCLE: PASS");
  } finally {
    try {
      const currentConfig = await readWhisperConfig(provider, DIAMOND_ADDRESS);

      if (currentConfig.minKeyStrength !== originalConfig.minKeyStrength ||
          currentConfig.minEntropy !== originalConfig.minEntropy ||
          currentConfig.defaultAccessDuration !== originalConfig.defaultAccessDuration) {
        await sendAndWait(
          whisper.connect(owner).updateSystemParameters(
            originalConfig.minKeyStrength,
            originalConfig.minEntropy,
            originalConfig.defaultAccessDuration
          ),
          "restoreSystemParameters"
        );
      }

      if (currentConfig.requireAudit !== originalConfig.requireAudit) {
        await sendAndWait(whisper.connect(owner).setAuditEnabled(originalConfig.requireAudit), "restoreAuditEnabled");
      }

      if (currentConfig.trustedOracle.toLowerCase() !== originalConfig.trustedOracle.toLowerCase()) {
        await sendAndWait(whisper.connect(owner).setTrustedOracle(originalConfig.trustedOracle), "restoreTrustedOracle");
      }

      const restoredConfig = await readWhisperConfig(provider, DIAMOND_ADDRESS);
      if (
        restoredConfig.minKeyStrength !== originalConfig.minKeyStrength ||
        restoredConfig.minEntropy !== originalConfig.minEntropy ||
        restoredConfig.defaultAccessDuration !== originalConfig.defaultAccessDuration ||
        restoredConfig.requireAudit !== originalConfig.requireAudit ||
        restoredConfig.trustedOracle.toLowerCase() !== originalConfig.trustedOracle.toLowerCase()
      ) {
        throw new Error("trace_whisperblock_lifecycle.js restore verification failed");
      }
    } catch (error) {
      restoreError = error;
    }
  }

  if (restoreError) {
    throw restoreError;
  }
}

main().catch((err) => {
  console.error("TRACE_WHISPERBLOCK_LIFECYCLE: FAIL");
  console.error(err);
  process.exit(1);
});
