#!/usr/bin/env node
"use strict";

const { ethers } = require("ethers");
require("dotenv").config();
const {
  loadArtifact,
  sendAndWait,
  selectorsForAbi,
  deploy,
  createProvider
} = require("./lib/echo_score_helpers");

const RPC_URL = process.env.RPC_URL;
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const provider = createProvider(RPC_URL);
  const signer = new ethers.NonceManager(new ethers.Wallet(PRIVATE_KEY, provider));
  const signerAddress = await signer.getAddress();

  const diamondCut = new ethers.Contract(
    DIAMOND_ADDRESS,
    loadArtifact("out/DiamondCutFacet.sol/DiamondCutFacet.json").abi,
    signer
  );

  const echoArtifact = loadArtifact("out/EchoScoreFacetV3.sol/EchoScoreFacetV3.json");
  const initArtifact = loadArtifact("out/EchoScoreInitV3.sol/EchoScoreInitV3.json");

  const echoFacet = await deploy(new ethers.ContractFactory(echoArtifact.abi, echoArtifact.bytecode.object, signer), "EchoScoreFacetV3");
  const echoInit = await deploy(new ethers.ContractFactory(initArtifact.abi, initArtifact.bytecode.object, signer), "EchoScoreInitV3");

  await sendAndWait(
    diamondCut.setTrustedInitContract(await echoInit.getAddress(), true, { gasLimit: 500_000 }),
    "setTrustedInitContract:EchoScoreInitV3"
  );

  const initData = new ethers.Interface(initArtifact.abi).encodeFunctionData("init", [signerAddress, 100]);

  await sendAndWait(
    diamondCut.diamondCut(
      [{ facetAddress: await echoFacet.getAddress(), action: 0, functionSelectors: selectorsForAbi(echoArtifact.abi) }],
      await echoInit.getAddress(),
      initData,
      { gasLimit: 12_000_000 }
    ),
    "diamondCut:addEchoScoreFacetV3"
  );

  console.log(`BOOTSTRAP_LOCAL_ECHOSCORE_V3: PASS diamond=${DIAMOND_ADDRESS}`);
}

main().catch((err) => {
  console.error("BOOTSTRAP_LOCAL_ECHOSCORE_V3: FAIL");
  console.error(err);
  process.exit(1);
});
