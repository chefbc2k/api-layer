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

  const voiceHash = uniqueScenarioBytes32("echo-v3-replay-protection");
  const timestamp = Number((await provider.getBlock("latest")).timestamp);
  const update = await makeQuorumUpdate(
    voiceHash,
    timestamp,
    oracleContext.candidateSigners.slice(0, oracleContext.threshold)
  );

  await sendAndWait(
    echo.connect(oracleContext.submitter).updateScore(update, { gasLimit: 4_000_000 }),
    "updateScore:first"
  );

  let replayAccepted = false;
  try {
    await sendAndWait(
      echo.connect(oracleContext.submitter).updateScore(update, { gasLimit: 4_000_000 }),
      "updateScore:replay"
    );
    replayAccepted = true;
  } catch (err) {
    console.log(`[replay-rejected] ${err?.shortMessage || err?.message}`);
  }

  if (replayAccepted) {
    const rep = await echo.getReputation(voiceHash);
    const history = await echo.getReputationHistory(voiceHash);
    throw new Error(
      `replay accepted for identical signed payload; updateCount=${rep.updateCount} historyLength=${history.length}`
    );
  }

  console.log("TRACE_ECHOSCORE_V3_REPLAY_PROTECTION: PASS");
}

main().catch((err) => {
  console.error("TRACE_ECHOSCORE_V3_REPLAY_PROTECTION: FAIL");
  console.error(err);
  process.exit(1);
});
