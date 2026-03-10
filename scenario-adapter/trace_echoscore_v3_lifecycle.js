#!/usr/bin/env node
"use strict";

const { ethers } = require("ethers");
require("dotenv").config();
const {
  loadArtifact,
  sendAndWait,
  createProvider,
  makeQuorumUpdate
} = require("./lib/echo_score_helpers");
const { resolveOracleContext } = require("./lib/echo_live_config");
const { uniqueScenarioBytes32, readContractAtReceiptBlock } = require("./lib/validation_safety");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const provider = createProvider(RPC_URL);
  const echo = new ethers.Contract(
    DIAMOND_ADDRESS,
    loadArtifact("out/EchoScoreFacetV3.sol/EchoScoreFacetV3.json").abi,
    provider
  );
  const oracleContext = await resolveOracleContext(provider, echo, PRIVATE_KEY);

  const oracle = await echo.getEchoScoreOracleV3();
  if (oracle.toLowerCase() !== oracleContext.configuredOracle.toLowerCase()) {
    throw new Error("oracle context should match onchain oracle");
  }

  const t0 = (await provider.getBlock("latest")).timestamp;
  const voiceA = uniqueScenarioBytes32("echo-v3-life-a");
  const voiceB = uniqueScenarioBytes32("echo-v3-life-b");
  const voiceC = uniqueScenarioBytes32("echo-v3-life-c");

  const updateA1 = await makeQuorumUpdate(voiceA, t0 + 1, oracleContext.candidateSigners.slice(0, oracleContext.threshold));
  const receiptA1 = await sendAndWait(
    echo.connect(oracleContext.submitter).updateScore(updateA1, { gasLimit: 4_000_000 }),
    "updateScore:voiceA:first"
  );
  const parsedA1 = receiptA1.logs
    .map((log) => {
      try { return echo.interface.parseLog(log); } catch { return null; }
    })
    .find((log) => log && log.name === "ReputationUpdated");
  if (!parsedA1) throw new Error("single update should emit ReputationUpdated");

  const repA1 = await readContractAtReceiptBlock(echo, "getReputation", [voiceA], receiptA1);
  if (repA1.totalReputation <= 0n) throw new Error("voiceA total reputation should be positive");
  if (repA1.updateCount !== 1n) throw new Error("voiceA updateCount should be 1 after first update");
  if (repA1.lastUpdated !== BigInt(t0 + 1)) throw new Error("voiceA lastUpdated should match oracle payload timestamp");
  if (repA1.totalReputation !== parsedA1.args.totalReputation) throw new Error("event total should match stored total");

  const updateA2 = await makeQuorumUpdate(voiceA, t0 + 2, oracleContext.candidateSigners.slice(0, oracleContext.threshold), {
    engagementData: { viewCount: 250000, likeCount: 22000, playCount: 120000, ratingAverage: 492, ratingCount: 480, assetAge: 10 },
    governanceData: { proposalsCreated: 4, proposalsActiveOrSuccess: 3, votesCast: 75 }
  });
  const receiptA2 = await sendAndWait(
    echo.connect(oracleContext.submitter).updateScore(updateA2, { gasLimit: 4_000_000 }),
    "updateScore:voiceA:second"
  );
  const repA2 = await readContractAtReceiptBlock(echo, "getReputation", [voiceA], receiptA2);
  if (repA2.updateCount !== 2n) throw new Error("voiceA updateCount should be 2 after second update");
  if (repA2.totalReputation <= repA1.totalReputation) throw new Error("voiceA total reputation should increase on richer second update");

  const historyA = await readContractAtReceiptBlock(echo, "getReputationHistory", [voiceA], receiptA2);
  if (historyA.length !== 2) throw new Error("voiceA history should contain two snapshots");
  if (historyA[1].totalReputation !== repA2.totalReputation) throw new Error("latest history snapshot should match stored total");
  if (historyA[1].timestamp !== repA2.lastUpdated) throw new Error("latest history timestamp should match stored lastUpdated");

  const updateB = await makeQuorumUpdate(voiceB, t0 + 3, oracleContext.candidateSigners.slice(0, oracleContext.threshold), {
    marketplaceData: { datasetSalesCount: 20, datasetSalesVolume: ethers.parseUnits("42000", 6), assetSalesCount: 30, assetSalesVolume: ethers.parseUnits("31000", 6), royaltiesRealized: ethers.parseUnits("5000", 6), royaltyPaymentsCount: 18 }
  });
  const updateC = await makeQuorumUpdate(voiceC, t0 + 4, oracleContext.candidateSigners.slice(0, oracleContext.threshold), {
    contributionData: { datasetCount: 10, totalAssetCount: 400, totalDuration: 240000, hasCommercialDataset: true, hasHighQualityDataset: false }
  });
  const batchReceipt = await sendAndWait(
    echo.connect(oracleContext.submitter).batchUpdateScores([updateB, updateC], { gasLimit: 8_000_000 }),
    "batchUpdateScores"
  );
  const parsedBatch = batchReceipt.logs
    .map((log) => {
      try { return echo.interface.parseLog(log); } catch { return null; }
    })
    .find((log) => log && log.name === "ScoresUpdated");
  if (!parsedBatch) throw new Error("batch update should emit ScoresUpdated");
  if (parsedBatch.args.count !== 2n) throw new Error("batch count should be 2");

  const repB = await readContractAtReceiptBlock(echo, "getReputation", [voiceB], batchReceipt);
  const repC = await readContractAtReceiptBlock(echo, "getReputation", [voiceC], batchReceipt);
  if (repB.totalReputation <= 0n || repC.totalReputation <= 0n) throw new Error("batched voices should receive positive reputation");
  if (repB.updateCount !== 1n || repC.updateCount !== 1n) throw new Error("batched voices should each have single update count");

  console.log("TRACE_ECHOSCORE_V3_LIFECYCLE: PASS");
}

main().catch((err) => {
  console.error("TRACE_ECHOSCORE_V3_LIFECYCLE: FAIL");
  console.error(err);
  process.exit(1);
});
