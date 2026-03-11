#!/usr/bin/env node
"use strict";

require("dotenv").config();
const { deployBaseDiamondWithAccess } = require("./lib/reentrancy_real_helpers");

const RPC_URL = process.env.RPC_URL;

async function main() {
  const { diamondAddress } = await deployBaseDiamondWithAccess(RPC_URL);
  console.log(`BOOTSTRAP_LOCAL_DIAMOND_CORE: PASS diamond=${diamondAddress}`);
}

main().catch((err) => {
  console.error("BOOTSTRAP_LOCAL_DIAMOND_CORE: FAIL");
  console.error(err);
  process.exit(1);
});
