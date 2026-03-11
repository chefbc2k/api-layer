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
const { uniqueScenarioBytes32 } = require("./lib/validation_safety");

const RPC_URL = process.env.RPC_URL;
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const HISTORY_CAP = 100;
const TOTAL_UPDATES = 105;

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

  const voiceHash = uniqueScenarioBytes32("echo-v3-history-rollover");
  const startTimestamp = Number((await provider.getBlock("latest")).timestamp);

  for (let i = 0; i < TOTAL_UPDATES; i++) {
    const update = await makeQuorumUpdate(
      voiceHash,
      startTimestamp + i,
      oracleContext.candidateSigners.slice(0, oracleContext.threshold),
      { engagementData: { viewCount: 120000 + i } }
    );
    await sendAndWait(
      echo.connect(oracleContext.submitter).updateScore(update, { gasLimit: 4_000_000 }),
      `updateScore:${i + 1}`
    );
  }

  const rep = await echo.getReputation(voiceHash);
  const history = await echo.getReputationHistory(voiceHash);

  if (rep.updateCount !== BigInt(TOTAL_UPDATES)) {
    throw new Error(`expected updateCount=${TOTAL_UPDATES}, got ${rep.updateCount}`);
  }
  if (history.length !== HISTORY_CAP) {
    throw new Error(`expected history length=${HISTORY_CAP}, got ${history.length}`);
  }

  const dropped = TOTAL_UPDATES - HISTORY_CAP;
  const expectedFirstTimestamp = BigInt(startTimestamp + dropped);
  const expectedLastTimestamp = BigInt(startTimestamp + TOTAL_UPDATES - 1);

  if (history[0].timestamp !== expectedFirstTimestamp) {
    throw new Error(`expected oldest retained timestamp=${expectedFirstTimestamp}, got ${history[0].timestamp}`);
  }
  if (history[history.length - 1].timestamp !== expectedLastTimestamp) {
    throw new Error(`expected newest timestamp=${expectedLastTimestamp}, got ${history[history.length - 1].timestamp}`);
  }

  console.log("TRACE_ECHOSCORE_V3_HISTORY_ROLLOVER: PASS");
}

main().catch((err) => {
  console.error("TRACE_ECHOSCORE_V3_HISTORY_ROLLOVER: FAIL");
  console.error(err);
  process.exit(1);
});
