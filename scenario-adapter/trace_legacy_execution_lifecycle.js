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
    description: `${name} legacy execution template`,
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
  const beneficiary1 = new ethers.Wallet(ethers.keccak256(ethers.toUtf8Bytes("LEGACY_EXEC_B1")), provider);
  const beneficiary2 = new ethers.Wallet(ethers.keccak256(ethers.toUtf8Bytes("LEGACY_EXEC_B2")), provider);

  const access = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/AccessControlFacet.sol/AccessControlFacet.json").abi, provider);
  const voiceAsset = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/VoiceAssetFacet.sol/VoiceAssetFacet.json").abi, provider);
  const voiceDataset = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/VoiceDatasetFacet.sol/VoiceDatasetFacet.json").abi, provider);
  const voiceTemplate = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/VoiceLicenseTemplateFacet.sol/VoiceLicenseTemplateFacet.json").abi, provider);
  const legacy = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/LegacyFacet.sol/LegacyFacet.json").abi, provider);
  const legacyExec = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/LegacyExecutionFacet.sol/LegacyExecutionFacet.json").abi, provider);
  const legacyView = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/LegacyViewFacet.sol/LegacyViewFacet.json").abi, provider);

  for (const user of [beneficiary1, beneficiary2]) {
    await sendAndWait(owner.sendTransaction({ to: user.address, value: ethers.parseEther("2") }), `fundETH:${user.address}`);
  }

  await ensureRole(access, role("VOICE_ADMIN_ROLE"), owner, owner.address);
  await sendAndWait(legacy.connect(owner).setMinTimelockPeriod(ONE_DAY), "setMinTimelockPeriod");
  await sendAndWait(legacy.connect(owner).setMaxBeneficiaries(5), "setMaxBeneficiaries");

  const a1 = await registerVoice(voiceAsset, owner, "ipfs://legacy-execution-a1", 1000);
  const a2 = await registerVoice(voiceAsset, owner, "ipfs://legacy-execution-a2", 1000);
  const a3 = await registerVoice(voiceAsset, owner, "ipfs://legacy-execution-a3", 1000);
  const templateId = await createTemplate(voiceTemplate, provider, owner, owner.address, "LegacyExecution");
  const datasetId = BigInt(
    await voiceDataset
      .connect(owner)
      .createDataset.staticCall("Legacy Execution Dataset", [a2.tokenId, a3.tokenId], templateId, "ipfs://legacy-execution-dataset", 500)
  );
  await sendAndWait(
    voiceDataset.connect(owner).createDataset("Legacy Execution Dataset", [a2.tokenId, a3.tokenId], templateId, "ipfs://legacy-execution-dataset", 500),
    "createDataset"
  );

  await sendAndWait(legacy.connect(owner).createLegacyPlan("legacy execution memo"), "createLegacyPlan");
  await sendAndWait(legacy.connect(owner).addVoiceAssets([a1.voiceHash]), "addVoiceAssets");
  await sendAndWait(legacy.connect(owner).addDatasets([datasetId]), "addDatasets");
  await sendAndWait(legacy.connect(owner).addBeneficiary(beneficiary1.address, 6000n, true), "addBeneficiary:1");
  await sendAndWait(legacy.connect(owner).addBeneficiary(beneficiary2.address, 4000n, true), "addBeneficiary:2");
  await sendAndWait(
    legacy.connect(owner).setInheritanceConditions(ONE_DAY, false, [], 0),
    "setInheritanceConditions"
  );

  await provider.send("evm_increaseTime", [Number(ONE_DAY + 1n)]);
  await provider.send("evm_mine", []);

  await expectRevert(() => legacyExec.connect(owner).executeInheritance(owner.address), "executeInheritance:withoutActivation");

  await sendAndWait(voiceAsset.connect(owner).setApprovalForAll(DIAMOND_ADDRESS, true), "setApprovalForAll");
  await sendAndWait(legacyExec.connect(beneficiary1).initiateInheritance(a1.voiceHash, []), "initiateInheritance");
  await sendAndWait(legacyExec.connect(owner).executeInheritance(owner.address), "executeInheritance");

  const owner1 = (await voiceAsset.ownerOf(a1.tokenId)).toLowerCase();
  const owner2 = (await voiceAsset.ownerOf(a2.tokenId)).toLowerCase();
  const owner3 = (await voiceAsset.ownerOf(a3.tokenId)).toLowerCase();

  const beneficiaryOwners = new Set([beneficiary1.address.toLowerCase(), beneficiary2.address.toLowerCase()]);
  if (!beneficiaryOwners.has(owner1) || !beneficiaryOwners.has(owner2) || !beneficiaryOwners.has(owner3)) {
    throw new Error("all inherited voice asset tokens should transfer to beneficiaries");
  }

  const plan = await legacyView.getLegacyPlan(owner.address);
  if (!plan.isExecuted) throw new Error("legacy plan should be marked executed");

  const dataset = await voiceDataset.getDataset(datasetId);
  if (dataset.creator.toLowerCase() !== beneficiary1.address.toLowerCase()) {
    throw new Error("dataset creator should transfer to primary beneficiary");
  }

  const datasetNftOwner = (await voiceAsset.ownerOf(datasetId)).toLowerCase();
  if (datasetNftOwner !== beneficiary1.address.toLowerCase()) {
    throw new Error("dataset NFT owner should transfer to primary beneficiary during inheritance execution");
  }

  await expectRevert(() => legacyExec.connect(owner).executeInheritance(owner.address), "executeInheritance:twice");

  console.log("TRACE_LEGACY_EXECUTION_LIFECYCLE: PASS");
}

main().catch((err) => {
  console.error("TRACE_LEGACY_EXECUTION_LIFECYCLE: FAIL");
  console.error(err);
  process.exit(1);
});
