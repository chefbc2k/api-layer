#!/usr/bin/env node
"use strict";

require("dotenv").config();
const { bootstrapDistribution } = require("./lib/distribution_helpers");

const RPC_URL = process.env.RPC_URL;

async function main() {
  const { diamondAddress } = await bootstrapDistribution(RPC_URL);
  console.log(`BOOTSTRAP_LOCAL_DISTRIBUTION: PASS diamond=${diamondAddress}`);
}

main().catch((err) => {
  console.error("BOOTSTRAP_LOCAL_DISTRIBUTION: FAIL");
  console.error(err);
  process.exit(1);
});
