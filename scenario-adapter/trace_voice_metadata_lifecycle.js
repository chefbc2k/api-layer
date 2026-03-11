#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const { uniqueScenarioSuffix } = require("./lib/validation_safety");
require("dotenv").config();

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

async function registerVoice(voiceAsset, signer, uri, royalty) {
  const voiceHash = await voiceAsset.connect(signer).registerVoiceAsset.staticCall(uri, royalty);
  await sendAndWait(voiceAsset.connect(signer).registerVoiceAsset(uri, royalty), "registerVoiceAsset");
  return voiceHash;
}

async function ensureRole(access, roleId, signer, account) {
  if (await access.hasRole(roleId, account)) return;
  await sendAndWait(access.connect(signer).grantRole(roleId, account, ethers.MaxUint256), "grantRole");
}

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const owner = new ethers.Wallet(PRIVATE_KEY, provider);

  const access = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/AccessControlFacet.sol/AccessControlFacet.json").abi, provider);
  const voiceAsset = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/VoiceAssetFacet.sol/VoiceAssetFacet.json").abi, provider);
  const metadata = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/VoiceMetadataFacet.sol/VoiceMetadataFacet.json").abi, provider);
  const runId = uniqueScenarioSuffix("voice-metadata");

  await ensureRole(access, role("VOICE_ADMIN_ROLE"), owner, owner.address);

  const voiceHash1 = await registerVoice(voiceAsset, owner, `ipfs://voice-metadata-1-${runId}`, 1000);
  const voiceHash2 = await registerVoice(voiceAsset, owner, `ipfs://voice-metadata-2-${runId}`, 1000);

  const fullClassifications1 = {
    analysisVersion: "ai-v1",
    timestamp: BigInt((await provider.getBlock("latest")).timestamp),
    processingTimeMs: 1200n,
    componentsRun: ["classifier", "geo"],
    categories: ["acoustic", "emotional"]
  };
  const categoryData1 = [
    {
      category: "acoustic",
      classifications: [
        { name: "Warm", score: 950n, category: "acoustic", level: "high", metadata: '{"band":"mid"}' }
      ]
    },
    {
      category: "emotional",
      classifications: [
        { name: "Calm", score: 870n, category: "emotional", level: "medium", metadata: '{"energy":"low"}' }
      ]
    }
  ];
  await sendAndWait(
    metadata.connect(owner).updateVoiceClassifications(voiceHash1, fullClassifications1, categoryData1),
    "updateVoiceClassifications:voice1"
  );

  const fullClassifications2 = {
    analysisVersion: "ai-v1",
    timestamp: BigInt((await provider.getBlock("latest")).timestamp),
    processingTimeMs: 900n,
    componentsRun: ["classifier"],
    categories: ["acoustic"]
  };
  const categoryData2 = [
    {
      category: "acoustic",
      classifications: [
        { name: "Warm", score: 910n, category: "acoustic", level: "medium", metadata: '{"band":"high"}' }
      ]
    }
  ];
  await sendAndWait(
    metadata.connect(owner).updateVoiceClassifications(voiceHash2, fullClassifications2, categoryData2),
    "updateVoiceClassifications:voice2"
  );

  const stored1 = await metadata.getVoiceClassifications(voiceHash1);
  if (stored1.analysisVersion !== "ai-v1") throw new Error("voice1 analysis version mismatch");
  const categories1 = await metadata.getVoiceCategories(voiceHash1);
  if (categories1.length !== 2) throw new Error(`voice1 category count mismatch: ${categories1.length}`);

  const searchWarm = await metadata.searchVoicesByClassification("Warm", "acoustic", "", 900);
  const warmSet = new Set(searchWarm.map((v) => v.toLowerCase()));
  if (!warmSet.has(voiceHash1.toLowerCase()) || !warmSet.has(voiceHash2.toLowerCase())) {
    throw new Error("warm search should include both registered voices");
  }

  await sendAndWait(
    metadata.connect(owner).updateClassificationCategory(voiceHash1, "acoustic", [
      { name: "Bright", score: 930n, category: "acoustic", level: "high", metadata: '{"band":"upper"}' }
    ]),
    "updateClassificationCategory"
  );

  const searchWarmAfter = await metadata.searchVoicesByClassification("Warm", "acoustic", "", 900);
  if (searchWarmAfter.map((v) => v.toLowerCase()).includes(voiceHash1.toLowerCase())) {
    throw new Error("voice1 should be removed from warm search after category replacement");
  }

  const searchBright = await metadata.searchVoicesByClassificationPaginated("Bright", "acoustic", "high", 900, 0, 10);
  if (!searchBright[0].map((v) => v.toLowerCase()).includes(voiceHash1.toLowerCase())) {
    throw new Error("voice1 should appear in bright search after update");
  }

  await sendAndWait(
    metadata.connect(owner).updateBasicAcousticFeatures(voiceHash1, {
      pitch: 220n,
      volume: 75n,
      speechRate: 140n,
      timbre: "silky",
      formants: [500n, 1500n, 2500n],
      harmonicsToNoise: 22n,
      dynamicRange: 48n
    }),
    "updateBasicAcousticFeatures"
  );
  const acoustic = await metadata.getBasicAcousticFeatures(voiceHash1);
  if (acoustic.pitch !== 220n || acoustic.timbre !== "silky") throw new Error("basic acoustic features mismatch");

  await sendAndWait(
    metadata.connect(owner).updateGeographicData(voiceHash1, {
      latitude: 41878113n,
      longitude: -87629800n,
      region: "Illinois",
      country: "USA",
      locality: "Chicago"
    }),
    "updateGeographicData"
  );
  const geo = await metadata.getGeographicData(voiceHash1);
  if (geo.region !== "Illinois" || geo.country !== "USA") throw new Error("geographic data mismatch");

  await sendAndWait(metadata.connect(owner).setAnalysisVersion("ai-v2"), "setAnalysisVersion");

  console.log("TRACE_VOICE_METADATA_LIFECYCLE: PASS");
}

main().catch((err) => {
  console.error("TRACE_VOICE_METADATA_LIFECYCLE: FAIL");
  console.error(err);
  process.exit(1);
});
