#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
require("dotenv").config();

const RPC_URL = process.env.RPC_URL;
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const UPGRADE_CONTROLLER_ABI = [
  "function getUpgradeControlStatus() view returns (bool initialized,bool enforced,bool frozen,address owner_)",
  "function getUpgradeThreshold() view returns (uint256)",
  "function getUpgradeDelay() view returns (uint256)",
  "function isUpgradeSigner(address) view returns (bool)",
  "function proposeDiamondCut((address facetAddress,uint8 action,bytes4[] functionSelectors)[] facetCuts,address initContract,bytes initCalldata) returns (bytes32 upgradeId)",
  "function approveUpgrade(bytes32 upgradeId)",
  "function executeUpgrade((address facetAddress,uint8 action,bytes4[] functionSelectors)[] facetCuts,address initContract,bytes initCalldata,bytes32 upgradeId)"
];

function loadArtifact(relPath) {
  const file = path.join(process.cwd(), relPath);
  if (!fs.existsSync(file)) throw new Error(`Missing artifact: ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

async function rpc(method, params = []) {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params })
  });
  const body = await res.json();
  if (body.error) throw new Error(`${method} failed: ${body.error.message}`);
  return body.result;
}

async function sendAndWait(txPromise, label) {
  const tx = await txPromise;
  console.log(`[tx] ${label} from=${tx.from} nonce=${tx.nonce} hash=${tx.hash}`);
  return tx.wait();
}

function getSelectors(abi) {
  const iface = new ethers.Interface(abi);
  return abi
    .filter((item) => item.type === "function")
    .map((item) => iface.getFunction(`${item.name}(${item.inputs.map((i) => i.type).join(",")})`).selector);
}

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const network = await provider.getNetwork();
  if (network.chainId !== 31337n) {
    throw new Error("upgrade_vesting_live.js requires local block-time control and is blocked on Base Sepolia");
  }
  const owner = new ethers.NonceManager(new ethers.Wallet(PRIVATE_KEY, provider));
  const artifact = loadArtifact("out/VestingFacet.sol/VestingFacet.json");
  const selectors = getSelectors(artifact.abi);

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode.object, owner);
  const facet = await factory.deploy();
  await facet.waitForDeployment();
  const facetAddress = await facet.getAddress();
  console.log(`deployed VestingFacet ${facetAddress}`);

  const cut = [{ facetAddress, action: 1, functionSelectors: selectors }];
  const upgrade = new ethers.Contract(DIAMOND_ADDRESS, UPGRADE_CONTROLLER_ABI, provider);

  const status = await upgrade.getUpgradeControlStatus();
  const threshold = Number(await upgrade.getUpgradeThreshold());
  const delay = Number(await upgrade.getUpgradeDelay());
  console.log(
    `upgradeControl initialized=${status.initialized} enforced=${status.enforced} frozen=${status.frozen} threshold=${threshold} delay=${delay}s`
  );

  const keyHex = (n) => "0x" + n.toString(16).padStart(64, "0");
  const signerKeys = (process.env.UPGRADE_SIGNER_KEYS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const candidateKeys = signerKeys.length > 0 ? signerKeys : [keyHex(101), keyHex(102), keyHex(103), keyHex(104), keyHex(105)];
  const signers = candidateKeys.map((k) => new ethers.NonceManager(new ethers.Wallet(k, provider)));

  const validSigners = [];
  for (const signer of signers) {
    const signerAddress = await signer.getAddress();
    if (await upgrade.isUpgradeSigner(signerAddress)) {
      validSigners.push(signer);
    }
  }
  if (validSigners.length < threshold) {
    throw new Error(`Need at least ${threshold} valid upgrade signers; found ${validSigners.length}`);
  }

  const topupWei = ethers.parseEther("0.01");
  for (let i = 0; i < threshold; i += 1) {
    const signer = validSigners[i];
    const signerAddress = await signer.getAddress();
    const balance = await provider.getBalance(signerAddress);
    if (balance < topupWei) {
      await sendAndWait(owner.sendTransaction({ to: signerAddress, value: topupWei - balance }), `fundSigner:${signerAddress}`);
    }
  }

  const proposer = new ethers.Contract(DIAMOND_ADDRESS, UPGRADE_CONTROLLER_ABI, validSigners[0]);
  const upgradeId = await proposer.proposeDiamondCut.staticCall(cut, ethers.ZeroAddress, "0x");
  await sendAndWait(proposer.proposeDiamondCut(cut, ethers.ZeroAddress, "0x"), "proposeDiamondCut");

  for (let i = 0; i < threshold; i += 1) {
    const approver = new ethers.Contract(DIAMOND_ADDRESS, UPGRADE_CONTROLLER_ABI, validSigners[i]);
    await sendAndWait(approver.approveUpgrade(upgradeId), `approveUpgrade:${await validSigners[i].getAddress()}`);
  }

  const latest = await provider.getBlock("latest");
  await rpc("evm_setNextBlockTimestamp", [Number(latest.timestamp) + delay + 1]);
  await rpc("evm_mine", []);

  await sendAndWait(proposer.executeUpgrade(cut, ethers.ZeroAddress, "0x", upgradeId), "executeUpgrade");
  console.log(`UPGRADE_VESTING_LIVE: PASS facet=${facetAddress} upgradeId=${upgradeId}`);
}

main().catch((err) => {
  console.error("UPGRADE_VESTING_LIVE: FAIL");
  console.error(err);
  process.exit(1);
});
