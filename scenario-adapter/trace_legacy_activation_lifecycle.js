#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
require("dotenv").config();

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ONE_DAY = 24n * 60n * 60n;

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

async function ensureRole(access, roleId, signer, account) {
  if (await access.hasRole(roleId, account)) return;
  await sendAndWait(access.connect(signer).grantRole(roleId, account, ethers.MaxUint256), "grantRole");
}

async function registerVoice(voiceAsset, signer, uri, royalty) {
  const voiceHash = await voiceAsset.connect(signer).registerVoiceAsset.staticCall(uri, royalty);
  await sendAndWait(voiceAsset.connect(signer).registerVoiceAsset(uri, royalty), "registerVoiceAsset");
  const tokenId = await voiceAsset.getTokenId(voiceHash);
  return { voiceHash, tokenId: BigInt(tokenId) };
}

async function createTemplate(templateFacet, provider, signer, creatorAddr, name) {
  const now = BigInt((await provider.getBlock("latest")).timestamp);
  const template = {
    creator: creatorAddr,
    isActive: true,
    transferable: true,
    createdAt: now,
    updatedAt: now,
    defaultDuration: 30n * ONE_DAY,
    defaultPrice: 10_000n,
    maxUses: 100n,
    name,
    description: `${name} legacy template`,
    defaultRights: [],
    defaultRestrictions: [],
    terms: {
      rights: [],
      restrictions: [],
      duration: 30n * ONE_DAY,
      price: 10_000n,
      transferable: true,
      maxUses: 100n,
      licenseHash: ethers.ZeroHash
    }
  };
  const templateHash = await templateFacet.connect(signer).createTemplate.staticCall(template);
  await sendAndWait(templateFacet.connect(signer).createTemplate(template), "createTemplate");
  return BigInt(templateHash);
}

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const owner = new ethers.Wallet(PRIVATE_KEY, provider);
  const beneficiary = new ethers.Wallet(ethers.keccak256(ethers.toUtf8Bytes("LEGACY_BENEFICIARY")), provider);
  const approver1 = new ethers.Wallet(ethers.keccak256(ethers.toUtf8Bytes("LEGACY_APPROVER_1")), provider);
  const approver2 = new ethers.Wallet(ethers.keccak256(ethers.toUtf8Bytes("LEGACY_APPROVER_2")), provider);

  const access = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/AccessControlFacet.sol/AccessControlFacet.json").abi, provider);
  const voiceAsset = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/VoiceAssetFacet.sol/VoiceAssetFacet.json").abi, provider);
  const voiceDataset = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/VoiceDatasetFacet.sol/VoiceDatasetFacet.json").abi, provider);
  const voiceTemplate = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/VoiceLicenseTemplateFacet.sol/VoiceLicenseTemplateFacet.json").abi, provider);
  const legacy = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/LegacyFacet.sol/LegacyFacet.json").abi, provider);
  const legacyExec = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/LegacyExecutionFacet.sol/LegacyExecutionFacet.json").abi, provider);
  const legacyView = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/LegacyViewFacet.sol/LegacyViewFacet.json").abi, provider);

  for (const user of [beneficiary, approver1, approver2]) {
    await sendAndWait(owner.sendTransaction({ to: user.address, value: ethers.parseEther("2") }), `fundETH:${user.address}`);
  }

  await ensureRole(access, role("VOICE_ADMIN_ROLE"), owner, owner.address);
  await sendAndWait(legacy.connect(owner).setMinTimelockPeriod(ONE_DAY), "setMinTimelockPeriod");
  await sendAndWait(legacy.connect(owner).setMaxBeneficiaries(5), "setMaxBeneficiaries");

  const a1 = await registerVoice(voiceAsset, owner, "ipfs://legacy-activation-a1", 1000);
  const a2 = await registerVoice(voiceAsset, owner, "ipfs://legacy-activation-a2", 1000);
  const templateId = await createTemplate(voiceTemplate, provider, owner, owner.address, "LegacyActivation");
  const datasetId = BigInt(
    await voiceDataset
      .connect(owner)
      .createDataset.staticCall("Legacy Activation Dataset", [a2.tokenId], templateId, "ipfs://legacy-activation-dataset", 500)
  );
  await sendAndWait(
    voiceDataset.connect(owner).createDataset("Legacy Activation Dataset", [a2.tokenId], templateId, "ipfs://legacy-activation-dataset", 500),
    "createDataset"
  );

  await sendAndWait(legacy.connect(owner).createLegacyPlan("legacy activation memo"), "createLegacyPlan");
  await sendAndWait(legacy.connect(owner).addVoiceAssets([a1.voiceHash]), "addVoiceAssets");
  await sendAndWait(legacy.connect(owner).addDatasets([datasetId]), "addDatasets");
  await sendAndWait(legacy.connect(owner).addBeneficiary(beneficiary.address, 10_000n, true), "addBeneficiary");
  await sendAndWait(
    legacy.connect(owner).setBeneficiaryRelationship(beneficiary.address, "heir"),
    "setBeneficiaryRelationship"
  );
  await sendAndWait(
    legacy.connect(owner).setInheritanceConditions(ONE_DAY, true, [approver1.address, approver2.address], 2),
    "setInheritanceConditions"
  );
  await sendAndWait(legacy.connect(owner).addInheritanceRequirement("death-cert"), "addInheritanceRequirement");

  await provider.send("evm_increaseTime", [Number(ONE_DAY + 1n)]);
  await provider.send("evm_mine", []);

  await sendAndWait(
    legacyExec.connect(beneficiary).initiateInheritance(a1.voiceHash, ["death-cert"]),
    "initiateInheritance"
  );

  let ready = await legacyView.isInheritanceReady(a1.voiceHash);
  if (ready[0] !== false || ready[1] !== 0n || ready[2] !== 2n) {
    throw new Error("inheritance readiness should be false before approvals");
  }

  await sendAndWait(legacyExec.connect(approver1).approveInheritance(a1.voiceHash), "approveInheritance:1");
  await sendAndWait(legacyExec.connect(approver2).approveInheritance(a1.voiceHash), "approveInheritance:2");

  ready = await legacyView.isInheritanceReady(a1.voiceHash);
  if (ready[1] !== 2n || ready[2] !== 2n) {
    throw new Error("approval counts should reflect both approvers");
  }
  if (ready[0] !== true) {
    throw new Error("inheritance should be ready after proof submission and required approvals");
  }

  await sendAndWait(legacyExec.connect(beneficiary).delegateRights(approver1.address, ONE_DAY), "delegateRights");

  console.log("TRACE_LEGACY_ACTIVATION_LIFECYCLE: PASS");
}

main().catch((err) => {
  console.error("TRACE_LEGACY_ACTIVATION_LIFECYCLE: FAIL");
  console.error(err);
  process.exit(1);
});
