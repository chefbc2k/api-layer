#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
require("dotenv").config();

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ONE_DAY = 24n * 60n * 60n;

function loadArtifact(relPath) {
  const file = path.join(process.cwd(), relPath);
  if (!fs.existsSync(file)) throw new Error(`Missing artifact: ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function asBigInt(v) {
  return typeof v === "bigint" ? v : BigInt(v);
}

function role(name) {
  return ethers.keccak256(ethers.toUtf8Bytes(name));
}

async function sendAndWait(txPromise, label) {
  const tx = await txPromise;
  console.log(`[tx] ${label} from=${tx.from} nonce=${tx.nonce} sel=${(tx.data || "0x").slice(0, 10)} hash=${tx.hash}`);
  return tx.wait();
}

async function expectRevert(sendFn, label) {
  let err;
  try {
    await sendAndWait(sendFn(), label);
  } catch (e) {
    err = e;
  }
  if (!err) throw new Error(`${label}: expected revert`);
  const data = err?.data || err?.info?.error?.data || "<none>";
  console.log(`[expect-revert-ok] ${label} data=${data}`);
}

async function ensureRole(access, roleId, signer, account) {
  if (await access.hasRole(roleId, account)) return;
  await sendAndWait(access.connect(signer).grantRole(roleId, account, ethers.MaxUint256), "grantRole");
}

async function registerVoice(voiceAsset, signer, uri, royalty) {
  const voiceHash = await voiceAsset.connect(signer).registerVoiceAsset.staticCall(uri, royalty);
  await sendAndWait(voiceAsset.connect(signer).registerVoiceAsset(uri, royalty), "registerVoiceAsset");
  const tokenId = await voiceAsset.getTokenId(voiceHash);
  return { voiceHash, tokenId: asBigInt(tokenId) };
}

async function createTemplate(voiceTemplate, provider, signer, creatorAddr, name) {
  const now = asBigInt((await provider.getBlock("latest")).timestamp);
  const template = {
    creator: creatorAddr,
    isActive: true,
    transferable: true,
    createdAt: now,
    updatedAt: now,
    defaultDuration: 30n * ONE_DAY,
    defaultPrice: 10_000n,
    maxUses: 100n,
    name,
    description: "dispute lifecycle template",
    defaultRights: [],
    defaultRestrictions: [],
    terms: {
      rights: [],
      restrictions: [],
      duration: 30n * ONE_DAY,
      price: 10_000n,
      transferable: true,
      maxUses: 100n,
      licenseHash: ethers.ZeroHash
    }
  };
  const templateHash = await voiceTemplate.connect(signer).createTemplate.staticCall(template);
  await sendAndWait(voiceTemplate.connect(signer).createTemplate(template), "createTemplate");
  return asBigInt(templateHash);
}

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const admin = new ethers.Wallet(PRIVATE_KEY, provider);
  const buyer = new ethers.Wallet(ethers.keccak256(ethers.toUtf8Bytes("DISPUTE_BUYER_1")), provider);
  const buyer2 = new ethers.Wallet(ethers.keccak256(ethers.toUtf8Bytes("DISPUTE_BUYER_2")), provider);

  const access = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/AccessControlFacet.sol/AccessControlFacet.json").abi, provider);
  const voiceAsset = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/VoiceAssetFacet.sol/VoiceAssetFacet.json").abi, provider);
  const voiceDataset = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/VoiceDatasetFacet.sol/VoiceDatasetFacet.json").abi, provider);
  const voiceTemplate = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/VoiceLicenseTemplateFacet.sol/VoiceLicenseTemplateFacet.json").abi, provider);
  const marketplace = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/MarketplaceFacet.sol/MarketplaceFacet.json").abi, provider);
  const payment = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/PaymentFacet.sol/PaymentFacet.json").abi, provider);
  const escrow = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/EscrowFacet.sol/EscrowFacet.json").abi, provider);

  const mock = loadArtifact("out/MockERC20.sol/MockERC20.json");
  const usdc = await new ethers.ContractFactory(mock.abi, mock.bytecode.object || mock.bytecode, admin).deploy();
  await usdc.waitForDeployment();

  await ensureRole(access, role("EMERGENCY_ADMIN_ROLE"), admin, admin.address);
  await sendAndWait(payment.connect(admin).setUsdcToken(await usdc.getAddress()), "setUsdcToken");

  for (const user of [buyer, buyer2]) {
    await sendAndWait(admin.sendTransaction({ to: user.address, value: ethers.parseEther("2") }), `fundETH:${user.address}`);
    await sendAndWait(usdc.connect(admin).mint(user.address, 2_000_000n * 1_000_000n), `mintUSDC:${user.address}`);
    await sendAndWait(usdc.connect(user).approve(DIAMOND_ADDRESS, ethers.MaxUint256), `approveUSDC:${user.address}`);
  }

  const a1 = await registerVoice(voiceAsset, admin, "ipfs://dispute-a1", 1000);
  const a2 = await registerVoice(voiceAsset, admin, "ipfs://dispute-a2", 1000);
  const templateId = await createTemplate(voiceTemplate, provider, admin, admin.address, "DisputeLifecycle");

  const datasetId = asBigInt(
    await voiceDataset
      .connect(admin)
      .createDataset.staticCall("Dispute Dataset", [a1.tokenId, a2.tokenId], templateId, "ipfs://dispute-dataset", 500)
  );
  await sendAndWait(
    voiceDataset.connect(admin).createDataset("Dispute Dataset", [a1.tokenId, a2.tokenId], templateId, "ipfs://dispute-dataset", 500),
    "createDataset"
  );

  const price = 88n * 1_000_000n;
  await sendAndWait(voiceAsset.connect(admin).approveVoiceAsset(DIAMOND_ADDRESS, datasetId), "approveNFT");
  await sendAndWait(marketplace.connect(admin).listAsset(datasetId, price, 0), "listAsset");

  await sendAndWait(payment.connect(admin).setPaymentPaused(true), "setPaymentPaused:true");
  await expectRevert(() => marketplace.connect(buyer).purchaseAsset(datasetId), "purchaseWhilePaused");

  const listingPaused = await marketplace.getListing(datasetId);
  if (!listingPaused.isActive) throw new Error("listing should remain active during disputed hold");
  if (!(await escrow.isInEscrow(datasetId))) throw new Error("dataset should remain in escrow during disputed hold");

  await sendAndWait(payment.connect(admin).setPaymentPaused(false), "setPaymentPaused:false");
  await sendAndWait(marketplace.connect(buyer).purchaseAsset(datasetId), "purchaseAfterResolution");

  if ((await voiceAsset.ownerOf(datasetId)).toLowerCase() !== buyer.address.toLowerCase()) {
    throw new Error("buyer should own dataset after dispute resolution");
  }
  if (await escrow.isInEscrow(datasetId)) throw new Error("escrow should clear after resolved purchase");

  // Open second hold and cancel by seller as alternate resolution path.
  await sendAndWait(voiceAsset.connect(buyer).approveVoiceAsset(DIAMOND_ADDRESS, datasetId), "approveNFT:buyer");
  await sendAndWait(marketplace.connect(buyer).listAsset(datasetId, 99n * 1_000_000n, 0), "listAsset:buyer");
  await sendAndWait(payment.connect(admin).setPaymentPaused(true), "setPaymentPaused:true:2");
  await expectRevert(() => marketplace.connect(buyer2).purchaseAsset(datasetId), "purchaseWhilePaused:2");
  await sendAndWait(payment.connect(admin).setPaymentPaused(false), "setPaymentPaused:false:2");
  await sendAndWait(marketplace.connect(buyer).cancelListing(datasetId), "cancelListing");

  if ((await voiceAsset.ownerOf(datasetId)).toLowerCase() !== buyer.address.toLowerCase()) {
    throw new Error("seller should retain ownership after cancellation resolution");
  }
  if (await escrow.isInEscrow(datasetId)) throw new Error("escrow should clear after cancellation resolution");

  console.log("TRACE_DISPUTE_LIFECYCLE: PASS");
}

main().catch((err) => {
  console.error("TRACE_DISPUTE_LIFECYCLE: FAIL");
  console.error(err);
  process.exit(1);
});
