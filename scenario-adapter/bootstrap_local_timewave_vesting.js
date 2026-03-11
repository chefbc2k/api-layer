#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
require("dotenv").config();

const RPC_URL = process.env.RPC_URL;
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const TIMELOCK_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TIMELOCK_ROLE"));
const VESTING_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("VESTING_MANAGER_ROLE"));
const FEE_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("FEE_MANAGER_ROLE"));

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
  for (let i = 0; i < 120; i++) {
    const receipt = await tx.provider.getTransactionReceipt(tx.hash);
    if (receipt) {
      if (receipt.status !== 1n && receipt.status !== 1) {
        throw new Error(`${label}: transaction reverted hash=${tx.hash}`);
      }
      return receipt;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`${label}: receipt timeout hash=${tx.hash}`);
}

async function deploy(factory, label) {
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log(`[deploy] ${label} ${address}`);
  return contract;
}

async function maybeGrantRole(access, signer, role, label) {
  const signerAddress = await signer.getAddress();
  if (!(await access.hasRole(role, signerAddress))) {
    await sendAndWait(
      access.connect(signer).grantRole(role, signerAddress, ethers.MaxUint256),
      `grantRole:${label}`
    );
  }
}

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const provider = new ethers.JsonRpcProvider(RPC_URL, undefined, { batchMaxCount: 1 });
  provider.pollingInterval = 250;
  const signer = new ethers.NonceManager(new ethers.Wallet(PRIVATE_KEY, provider));

  const diamondCut = new ethers.Contract(
    DIAMOND_ADDRESS,
    loadArtifact("out/DiamondCutFacet.sol/DiamondCutFacet.json").abi,
    signer
  );
  const access = new ethers.Contract(
    DIAMOND_ADDRESS,
    loadArtifact("out/AccessControlFacet.sol/AccessControlFacet.json").abi,
    signer
  );

  const tokenArtifact = loadArtifact("out/TokenSupplyFacet.sol/TokenSupplyFacet.json");
  const burnArtifact = loadArtifact("out/BurnThresholdFacet.sol/BurnThresholdFacet.json");
  const paymentArtifact = loadArtifact("out/PaymentFacet.sol/PaymentFacet.json");
  const vestingArtifact = loadArtifact("out/VestingFacet.sol/VestingFacet.json");
  const vestingInitArtifact = loadArtifact("out/VestingInitializer.sol/VestingInitializer.json");
  const timewaveArtifact = loadArtifact("out/TimewaveGiftFacet.sol/TimewaveGiftFacet.json");
  const timewaveInitArtifact = loadArtifact("out/TimewaveVestingInitializer.sol/TimewaveVestingInitializer.json");
  const mockArtifact = loadArtifact("out/MockERC20.sol/MockERC20.json");

  const tokenFacet = await deploy(new ethers.ContractFactory(tokenArtifact.abi, tokenArtifact.bytecode.object, signer), "TokenSupplyFacet");
  const burnFacet = await deploy(new ethers.ContractFactory(burnArtifact.abi, burnArtifact.bytecode.object, signer), "BurnThresholdFacet");
  const paymentFacet = await deploy(new ethers.ContractFactory(paymentArtifact.abi, paymentArtifact.bytecode.object, signer), "PaymentFacet");
  const vestingInit = await deploy(new ethers.ContractFactory(vestingInitArtifact.abi, vestingInitArtifact.bytecode.object, signer), "VestingInitializer");
  const vestingFacet = await deploy(new ethers.ContractFactory(vestingArtifact.abi, vestingArtifact.bytecode.object, signer), "VestingFacet");
  const timewaveInit = await deploy(new ethers.ContractFactory(timewaveInitArtifact.abi, timewaveInitArtifact.bytecode.object, signer), "TimewaveVestingInitializer");
  const timewaveFacet = await deploy(new ethers.ContractFactory(timewaveArtifact.abi, timewaveArtifact.bytecode.object, signer), "TimewaveGiftFacet");
  const mockUsdc = await deploy(new ethers.ContractFactory(mockArtifact.abi, mockArtifact.bytecode.object || mockArtifact.bytecode, signer), "MockERC20");

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

  const paymentSelectors = selectorsForAbi(paymentArtifact.abi, [
    "setUsdcToken(address)",
    "getUsdcToken()"
  ]);

  const vestingSelectors = vestingArtifact.abi
    .filter((item) => item.type === "function")
    .map((item) => new ethers.Interface(vestingArtifact.abi).getFunction(`${item.name}(${item.inputs.map((i) => i.type).join(",")})`).selector);

  const timewaveSelectors = timewaveArtifact.abi
    .filter((item) => item.type === "function")
    .map((item) => new ethers.Interface(timewaveArtifact.abi).getFunction(`${item.name}(${item.inputs.map((i) => i.type).join(",")})`).selector);

  await sendAndWait(
    diamondCut.diamondCut(
      [
        { facetAddress: await tokenFacet.getAddress(), action: 0, functionSelectors: tokenSelectors },
        { facetAddress: await burnFacet.getAddress(), action: 0, functionSelectors: burnSelectors },
        { facetAddress: await paymentFacet.getAddress(), action: 0, functionSelectors: paymentSelectors }
      ],
      ethers.ZeroAddress,
      "0x",
      { gasLimit: 12_000_000 }
    ),
    "diamondCut:addTokenPaymentFacets"
  );

  const token = new ethers.Contract(DIAMOND_ADDRESS, tokenArtifact.abi, signer);
  const payment = new ethers.Contract(DIAMOND_ADDRESS, paymentArtifact.abi, signer);

  await sendAndWait(token.initializeToken({ gasLimit: 2_000_000 }), "initializeToken");
  await maybeGrantRole(access, signer, TIMELOCK_ROLE, "TIMELOCK_ROLE");
  await maybeGrantRole(access, signer, VESTING_MANAGER_ROLE, "VESTING_MANAGER_ROLE");
  await maybeGrantRole(access, signer, FEE_MANAGER_ROLE, "FEE_MANAGER_ROLE");

  await sendAndWait(
    diamondCut.setTrustedInitContract(await vestingInit.getAddress(), true, { gasLimit: 500_000 }),
    "setTrustedInitContract:VestingInitializer"
  );
  const signerAddress = await signer.getAddress();
  const vestingInitData = new ethers.Interface(vestingInitArtifact.abi).encodeFunctionData("initialize", [signerAddress]);
  await sendAndWait(
    diamondCut.diamondCut(
      [{ facetAddress: await vestingFacet.getAddress(), action: 0, functionSelectors: vestingSelectors }],
      await vestingInit.getAddress(),
      vestingInitData,
      { gasLimit: 12_000_000 }
    ),
    "diamondCut:addVestingFacet"
  );

  await sendAndWait(
    diamondCut.setTrustedInitContract(await timewaveInit.getAddress(), true, { gasLimit: 500_000 }),
    "setTrustedInitContract:TimewaveVestingInitializer"
  );
  const timewaveInitData = new ethers.Interface(timewaveInitArtifact.abi).encodeFunctionData("initialize", [signerAddress]);
  await sendAndWait(
    diamondCut.diamondCut(
      [{ facetAddress: await timewaveFacet.getAddress(), action: 0, functionSelectors: timewaveSelectors }],
      await timewaveInit.getAddress(),
      timewaveInitData,
      { gasLimit: 12_000_000 }
    ),
    "diamondCut:addTimewaveGiftFacet"
  );

  await sendAndWait(payment.setUsdcToken(await mockUsdc.getAddress(), { gasLimit: 500_000 }), "setUsdcToken");
  await sendAndWait(mockUsdc.mint(DIAMOND_ADDRESS, 50_000_000n * 1_000_000n), "mintUSDC:diamond");

  console.log(`BOOTSTRAP_LOCAL_TIMEWAVE_VESTING: PASS diamond=${DIAMOND_ADDRESS} usdc=${await mockUsdc.getAddress()}`);
}

main().catch((err) => {
  console.error("BOOTSTRAP_LOCAL_TIMEWAVE_VESTING: FAIL");
  console.error(err);
  process.exit(1);
});
