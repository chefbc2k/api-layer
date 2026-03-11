#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
require("dotenv").config();
const { scenarioFundingWei } = require("./lib/runtime_config");
const { uniqueScenarioText, ensureEthBalance } = require("./lib/validation_safety");

const RPC_URL = process.env.RPC_URL;
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ONE_DAY = 24n * 60n * 60n;

function loadArtifact(relPath) {
  const file = path.join(process.cwd(), relPath);
  if (!fs.existsSync(file)) throw new Error(`Missing artifact: ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function asBigInt(v) {
  return typeof v === "bigint" ? v : BigInt(v);
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

async function registerVoice(voiceAsset, signer, uri, royalty) {
  const voiceHash = await voiceAsset.connect(signer).registerVoiceAsset.staticCall(uri, royalty);
  await sendAndWait(voiceAsset.connect(signer).registerVoiceAsset(uri, royalty), "registerVoiceAsset");
  const tokenId = await voiceAsset.getTokenId(voiceHash);
  return { voiceHash, tokenId: asBigInt(tokenId) };
}

function buildTemplate(creator, now, name) {
  return {
    creator,
    isActive: true,
    transferable: true,
    createdAt: now,
    updatedAt: now,
    defaultDuration: 30n * ONE_DAY,
    defaultPrice: 15_000n,
    maxUses: 10n,
    name,
    description: `${name} dataset mutation template`,
    defaultRights: ["Narration"],
    defaultRestrictions: ["no-sublicense"],
    terms: {
      rights: ["Narration"],
      restrictions: ["no-sublicense"],
      duration: 30n * ONE_DAY,
      price: 15_000n,
      transferable: true,
      maxUses: 10n,
      licenseHash: ethers.ZeroHash
    }
  };
}

async function main() {
  if (!RPC_URL) throw new Error("RPC_URL is required");
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const creator = new ethers.Wallet(PRIVATE_KEY, provider);
  const outsider = new ethers.Wallet(ethers.keccak256(ethers.toUtf8Bytes("DATASET_OUTSIDER")), provider);

  const voiceAsset = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/VoiceAssetFacet.sol/VoiceAssetFacet.json").abi, provider);
  const voiceDataset = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/VoiceDatasetFacet.sol/VoiceDatasetFacet.json").abi, provider);
  const templateFacet = new ethers.Contract(
    DIAMOND_ADDRESS,
    loadArtifact("out/VoiceLicenseTemplateFacet.sol/VoiceLicenseTemplateFacet.json").abi,
    provider
  );
  const voiceUris = [1, 2, 3, 4].map((index) => `ipfs://${uniqueScenarioText(`dataset-mutation-a${index}-`)}`);
  const datasetMetadataUri = `ipfs://${uniqueScenarioText("dataset-mutation-meta-")}`;
  const updatedMetadataUri = `ipfs://${uniqueScenarioText("dataset-mutation-meta-updated-")}`;

  await ensureEthBalance(creator, outsider.address, scenarioFundingWei("2"), "fundETH:outsider");

  const a1 = await registerVoice(voiceAsset, creator, voiceUris[0], 1000);
  const a2 = await registerVoice(voiceAsset, creator, voiceUris[1], 1000);
  const a3 = await registerVoice(voiceAsset, creator, voiceUris[2], 1000);
  const a4 = await registerVoice(voiceAsset, creator, voiceUris[3], 1000);

  const now = asBigInt((await provider.getBlock("latest")).timestamp);
  const template1 = buildTemplate(creator.address, now, "DatasetTemplateOne");
  const template2 = buildTemplate(creator.address, now, "DatasetTemplateTwo");
  template2.defaultPrice = 20_000n;
  template2.terms.price = 20_000n;

  const templateHash1 = await templateFacet.connect(creator).createTemplate.staticCall(template1);
  await sendAndWait(templateFacet.connect(creator).createTemplate(template1), "createTemplate:1");
  const templateHash2 = await templateFacet.connect(creator).createTemplate.staticCall(template2);
  await sendAndWait(templateFacet.connect(creator).createTemplate(template2), "createTemplate:2");

  const totalBefore = await voiceDataset.getTotalDatasets();
  const datasetId = asBigInt(
    await voiceDataset
      .connect(creator)
      .createDataset.staticCall("Dataset Mutation", [a1.tokenId, a2.tokenId], asBigInt(templateHash1), datasetMetadataUri, 500)
  );
  await sendAndWait(
    voiceDataset.connect(creator).createDataset("Dataset Mutation", [a1.tokenId, a2.tokenId], asBigInt(templateHash1), datasetMetadataUri, 500),
    "createDataset"
  );

  let dataset = await voiceDataset.getDataset(datasetId);
  if (dataset.assetIds.length !== 2) throw new Error("dataset should start with two assets");
  if (dataset.licenseTemplateId !== asBigInt(templateHash1)) throw new Error("dataset template mismatch after create");

  await sendAndWait(voiceDataset.connect(creator).appendAssets(datasetId, [a3.tokenId, a4.tokenId]), "appendAssets");
  dataset = await voiceDataset.getDataset(datasetId);
  if (dataset.assetIds.length !== 4) throw new Error("dataset append did not add assets");
  if (!(await voiceDataset.containsAsset(datasetId, a4.tokenId))) throw new Error("dataset should contain appended asset");

  await expectRevert(() => voiceDataset.connect(creator).appendAssets(datasetId, [a3.tokenId]), "appendAssets:duplicate");
  await expectRevert(() => voiceDataset.connect(outsider).setMetadata(datasetId, "ipfs://unauthorized"), "setMetadata:outsider");

  await sendAndWait(voiceDataset.connect(creator).removeAsset(datasetId, a2.tokenId), "removeAsset");
  dataset = await voiceDataset.getDataset(datasetId);
  if (dataset.assetIds.length !== 3) throw new Error("dataset remove did not shrink asset list");
  if (await voiceDataset.containsAsset(datasetId, a2.tokenId)) throw new Error("removed asset should not remain in dataset");

  await sendAndWait(voiceDataset.connect(creator).setLicense(datasetId, asBigInt(templateHash2)), "setLicense");
  await sendAndWait(voiceDataset.connect(creator).setMetadata(datasetId, updatedMetadataUri), "setMetadata");
  await sendAndWait(voiceDataset.connect(creator).setRoyalty(datasetId, 250), "setRoyalty");
  await expectRevert(() => voiceDataset.connect(creator).setRoyalty(datasetId, 400), "setRoyalty:increase");

  await sendAndWait(voiceDataset.connect(creator).setDatasetStatus(datasetId, false), "setDatasetStatus:false");
  dataset = await voiceDataset.getDataset(datasetId);
  if (dataset.active !== false) throw new Error("dataset should be inactive after status update");
  await sendAndWait(voiceDataset.connect(creator).setDatasetStatus(datasetId, true), "setDatasetStatus:true");

  const [receiver, royaltyAmount] = await voiceDataset.royaltyInfo(datasetId, 1_000_000n);
  if (receiver.toLowerCase() !== creator.address.toLowerCase()) throw new Error("dataset royalty receiver mismatch");
  if (royaltyAmount !== 25_000n) throw new Error(`dataset royalty amount mismatch: ${royaltyAmount}`);

  const creatorDatasets = await voiceDataset.getDatasetsByCreator(creator.address);
  if (!creatorDatasets.map((v) => BigInt(v)).includes(datasetId)) throw new Error("creator dataset lookup missing dataset");

  await sendAndWait(voiceDataset.connect(creator).burnDataset(datasetId), "burnDataset");
  const totalAfter = await voiceDataset.getTotalDatasets();
  if (totalAfter !== totalBefore) throw new Error("dataset total count should return to prior value after burn");

  await expectRevert(() => voiceDataset.getDataset(datasetId), "getDataset:burned");

  console.log("TRACE_DATASET_MUTATION_LIFECYCLE: PASS");
}

main().catch((err) => {
  console.error("TRACE_DATASET_MUTATION_LIFECYCLE: FAIL");
  console.error(err);
  process.exit(1);
});
