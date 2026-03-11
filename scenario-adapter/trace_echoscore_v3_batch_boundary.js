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

const RPC_URL = process.env.RPC_URL;
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

async function buildBatch(size, baseTimestamp, signers, prefix) {
  const updates = [];
  for (let i = 0; i < size; i++) {
    updates.push(
      await makeQuorumUpdate(
        ethers.keccak256(ethers.toUtf8Bytes(`${prefix}:${i}`)),
        baseTimestamp + i,
        signers
      )
    );
  }
  return updates;
}

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
  const signingQuorum = oracleContext.candidateSigners.slice(0, oracleContext.threshold);

  const baseTimestamp = Number((await provider.getBlock("latest")).timestamp);
  const batch50 = await buildBatch(50, baseTimestamp, signingQuorum, "echo-v3-batch50");
  await sendAndWait(
    echo.connect(oracleContext.submitter).batchUpdateScores(batch50, { gasLimit: 25_000_000 }),
    "batchUpdateScores:50"
  );

  const batch51 = await buildBatch(51, baseTimestamp + 60, signingQuorum, "echo-v3-batch51");
  let overLimitAccepted = false;
  try {
    await sendAndWait(
      echo.connect(oracleContext.submitter).batchUpdateScores(batch51, { gasLimit: 30_000_000 }),
      "batchUpdateScores:51"
    );
    overLimitAccepted = true;
  } catch (err) {
    console.log(`[over-limit-rejected] ${err?.shortMessage || err?.message}`);
  }

  if (overLimitAccepted) {
    throw new Error("batchUpdateScores accepted 51 updates; documented 50-update limit is not enforced");
  }

  console.log("TRACE_ECHOSCORE_V3_BATCH_BOUNDARY: PASS");
}

main().catch((err) => {
  console.error("TRACE_ECHOSCORE_V3_BATCH_BOUNDARY: FAIL");
  console.error(err);
  process.exit(1);
});
