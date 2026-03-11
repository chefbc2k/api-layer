#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
require("dotenv").config();

const RPC_URL = process.env.RPC_URL;
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

function loadArtifact(relPath) {
  const file = path.join(process.cwd(), relPath);
  if (!fs.existsSync(file)) throw new Error(`Missing artifact: ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function selectorsForAbi(abi, names) {
  const iface = new ethers.Interface(abi);
  return names.map((sig) => iface.getFunction(sig).selector);
}

async function sendAndWait(txPromise, label) {
  const tx = await txPromise;
  console.log(`[tx] ${label} from=${tx.from} nonce=${tx.nonce} hash=${tx.hash}`);
  return tx.wait();
}

async function deploy(factory, label) {
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log(`[deploy] ${label} ${address}`);
  return contract;
}

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);

  const diamondCut = new ethers.Contract(
    DIAMOND_ADDRESS,
    loadArtifact("out/DiamondCutFacet.sol/DiamondCutFacet.json").abi,
    signer
  );

  const tokenArtifact = loadArtifact("out/TokenSupplyFacet.sol/TokenSupplyFacet.json");
  const burnArtifact = loadArtifact("out/BurnThresholdFacet.sol/BurnThresholdFacet.json");
  const vestingArtifact = loadArtifact("out/VestingFacet.sol/VestingFacet.json");
  const vestingInitArtifact = loadArtifact("out/VestingInitializer.sol/VestingInitializer.json");

  const tokenFacet = await deploy(new ethers.ContractFactory(tokenArtifact.abi, tokenArtifact.bytecode.object, signer), "TokenSupplyFacet");
  const burnFacet = await deploy(new ethers.ContractFactory(burnArtifact.abi, burnArtifact.bytecode.object, signer), "BurnThresholdFacet");
  const vestingInit = await deploy(new ethers.ContractFactory(vestingInitArtifact.abi, vestingInitArtifact.bytecode.object, signer), "VestingInitializer");
  const vestingFacet = await deploy(new ethers.ContractFactory(vestingArtifact.abi, vestingArtifact.bytecode.object, signer), "VestingFacet");

  const tokenSelectors = selectorsForAbi(tokenArtifact.abi, [
    "supplyMintTokens(address,uint256)",
    "supplyFinishMinting()",
    "supplyIsMintingFinished()",
    "supplySetMaximum(uint256)",
    "supplyGetMaximum()",
    "name()",
    "symbol()",
    "decimals()",
    "totalSupply()",
    "balanceOf(address)",
    "transfer(address,uint256)",
    "allowance(address,address)",
    "approve(address,uint256)",
    "transferFrom(address,address,uint256)",
    "initializeToken()",
    "tokenName()",
    "tokenSymbol()",
    "tokenBalanceOf(address)",
    "tokenAllowance(address,address)",
    "tokenApprove(address,uint256)",
    "tokenTransferFrom(address,address,uint256)",
    "burn(uint256)",
    "burnFrom(address,uint256)"
  ]);

  const burnSelectors = selectorsForAbi(burnArtifact.abi, [
    "thresholdSetBurnLimit(uint256)",
    "thresholdGetBurnLimit()",
    "thresholdCalculateExcess(address)",
    "thresholdBurnTokens(uint256)",
    "thresholdBurnTokensFrom(address,uint256)",
    "thresholdBurnExcess(address)"
  ]);

  const vestingSelectors = vestingArtifact.abi
    .filter((item) => item.type === "function")
    .map((item) => new ethers.Interface(vestingArtifact.abi).getFunction(`${item.name}(${item.inputs.map((i) => i.type).join(",")})`).selector);

  await sendAndWait(
    diamondCut.diamondCut(
      [
        { facetAddress: await tokenFacet.getAddress(), action: 0, functionSelectors: tokenSelectors },
        { facetAddress: await burnFacet.getAddress(), action: 0, functionSelectors: burnSelectors }
      ],
      ethers.ZeroAddress,
      "0x",
      { gasLimit: 12_000_000 }
    ),
    "diamondCut:addTokenFacets"
  );

  const token = new ethers.Contract(DIAMOND_ADDRESS, tokenArtifact.abi, signer);
  await sendAndWait(token.initializeToken({ gasLimit: 2_000_000 }), "initializeToken");

  await sendAndWait(
    diamondCut.setTrustedInitContract(await vestingInit.getAddress(), true, { gasLimit: 500_000 }),
    "setTrustedInitContract:VestingInitializer"
  );

  const vestingInitIface = new ethers.Interface(vestingInitArtifact.abi);
  const initData = vestingInitIface.encodeFunctionData("initialize", [await signer.getAddress()]);

  await sendAndWait(
    diamondCut.diamondCut(
      [{ facetAddress: await vestingFacet.getAddress(), action: 0, functionSelectors: vestingSelectors }],
      await vestingInit.getAddress(),
      initData,
      { gasLimit: 12_000_000 }
    ),
    "diamondCut:addVestingFacet"
  );

  console.log(`BOOTSTRAP_LOCAL_TOKEN_VESTING: PASS diamond=${DIAMOND_ADDRESS}`);
}

main().catch((err) => {
  console.error("BOOTSTRAP_LOCAL_TOKEN_VESTING: FAIL");
  console.error(err);
  process.exit(1);
});
