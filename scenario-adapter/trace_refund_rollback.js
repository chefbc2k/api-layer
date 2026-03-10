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
    description: "rollback template",
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
  const creator = new ethers.Wallet(PRIVATE_KEY, provider);
  const buyer = new ethers.Wallet(ethers.keccak256(ethers.toUtf8Bytes("ROLLBACK_BUYER_1")), provider);

  const voiceAsset = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/VoiceAssetFacet.sol/VoiceAssetFacet.json").abi, provider);
  const voiceDataset = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/VoiceDatasetFacet.sol/VoiceDatasetFacet.json").abi, provider);
  const voiceTemplate = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/VoiceLicenseTemplateFacet.sol/VoiceLicenseTemplateFacet.json").abi, provider);
  const marketplace = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/MarketplaceFacet.sol/MarketplaceFacet.json").abi, provider);
  const payment = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/PaymentFacet.sol/PaymentFacet.json").abi, provider);
  const escrow = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/EscrowFacet.sol/EscrowFacet.json").abi, provider);

  const mock = loadArtifact("out/MockERC20.sol/MockERC20.json");
  const usdc = await new ethers.ContractFactory(mock.abi, mock.bytecode.object || mock.bytecode, creator).deploy();
  await usdc.waitForDeployment();
  await sendAndWait(payment.connect(creator).setUsdcToken(await usdc.getAddress()), "setUsdcToken");

  await sendAndWait(creator.sendTransaction({ to: buyer.address, value: ethers.parseEther("2") }), "fundETH:buyer");
  await sendAndWait(usdc.connect(creator).mint(buyer.address, 2_000_000n * 1_000_000n), "mintUSDC:buyer");
  await sendAndWait(usdc.connect(buyer).approve(DIAMOND_ADDRESS, ethers.MaxUint256), "approveUSDC:max");

  const a1 = await registerVoice(voiceAsset, creator, "ipfs://rollback-a1", 1000);
  const a2 = await registerVoice(voiceAsset, creator, "ipfs://rollback-a2", 1000);
  const templateId = await createTemplate(voiceTemplate, provider, creator, creator.address, "RollbackTemplate");
  const datasetId = asBigInt(
    await voiceDataset
      .connect(creator)
      .createDataset.staticCall("Rollback Dataset", [a1.tokenId, a2.tokenId], templateId, "ipfs://rollback-dataset", 500)
  );
  await sendAndWait(
    voiceDataset.connect(creator).createDataset("Rollback Dataset", [a1.tokenId, a2.tokenId], templateId, "ipfs://rollback-dataset", 500),
    "createDataset"
  );

  const price = 77n * 1_000_000n;
  await sendAndWait(voiceAsset.connect(creator).approveVoiceAsset(DIAMOND_ADDRESS, datasetId), "approveNFT");
  await sendAndWait(marketplace.connect(creator).listAsset(datasetId, price, 0), "listAsset");

  const treasury = await payment.getTreasuryAddress();
  const sellerBefore = await payment.getPendingPayments(creator.address);
  const treasuryBefore = await payment.getPendingPayments(treasury);

  // Rollback trigger: buyer has zero allowance at purchase time.
  await sendAndWait(usdc.connect(buyer).approve(DIAMOND_ADDRESS, 0), "approveUSDC:zero");
  await expectRevert(() => marketplace.connect(buyer).purchaseAsset(datasetId), "purchaseWithZeroAllowance");

  const sellerAfterFail = await payment.getPendingPayments(creator.address);
  const treasuryAfterFail = await payment.getPendingPayments(treasury);
  if (sellerAfterFail !== sellerBefore) throw new Error("seller pending changed on rollback path");
  if (treasuryAfterFail !== treasuryBefore) throw new Error("treasury pending changed on rollback path");

  if (!(await escrow.isInEscrow(datasetId))) throw new Error("asset must stay escrowed after failed purchase");
  if ((await marketplace.getListing(datasetId)).isActive !== true) throw new Error("listing must remain active after failed purchase");

  // No explicit refund function exists; rollback is represented by invariant preservation + cancel path.
  await sendAndWait(marketplace.connect(creator).cancelListing(datasetId), "cancelListing");
  if (await escrow.isInEscrow(datasetId)) throw new Error("escrow should clear after cancel rollback");
  if ((await voiceAsset.ownerOf(datasetId)).toLowerCase() !== creator.address.toLowerCase()) {
    throw new Error("seller should recover NFT after rollback cancel");
  }

  // Re-list and complete purchase successfully after restoring allowance.
  await sendAndWait(voiceAsset.connect(creator).approveVoiceAsset(DIAMOND_ADDRESS, datasetId), "approveNFT:relist");
  await sendAndWait(marketplace.connect(creator).listAsset(datasetId, price, 0), "listAsset:relist");
  await sendAndWait(usdc.connect(buyer).approve(DIAMOND_ADDRESS, ethers.MaxUint256), "approveUSDC:restore");
  await sendAndWait(marketplace.connect(buyer).purchaseAsset(datasetId), "purchaseAfterRollback");

  if ((await voiceAsset.ownerOf(datasetId)).toLowerCase() !== buyer.address.toLowerCase()) {
    throw new Error("buyer should own dataset after final purchase");
  }

  console.log("TRACE_REFUND_ROLLBACK: PASS");
}

main().catch((err) => {
  console.error("TRACE_REFUND_ROLLBACK: FAIL");
  console.error(err);
  process.exit(1);
});
