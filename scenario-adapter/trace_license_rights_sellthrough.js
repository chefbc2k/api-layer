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

async function registerVoice(voiceAsset, signer, uri, royalty) {
  const voiceHash = await voiceAsset.connect(signer).registerVoiceAsset.staticCall(uri, royalty);
  await sendAndWait(voiceAsset.connect(signer).registerVoiceAsset(uri, royalty), "registerVoiceAsset");
  const tokenId = await voiceAsset.getTokenId(voiceHash);
  return { voiceHash, tokenId: asBigInt(tokenId) };
}

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const owner = new ethers.Wallet(PRIVATE_KEY, provider);
  const licensee = new ethers.Wallet(ethers.keccak256(ethers.toUtf8Bytes("LICENSEE_1")), provider);
  const buyer = new ethers.Wallet(ethers.keccak256(ethers.toUtf8Bytes("BUYER_RIGHTS_1")), provider);

  const voiceAsset = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/VoiceAssetFacet.sol/VoiceAssetFacet.json").abi, provider);
  const marketplace = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/MarketplaceFacet.sol/MarketplaceFacet.json").abi, provider);
  const payment = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/PaymentFacet.sol/PaymentFacet.json").abi, provider);
  const rights = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/RightsFacet.sol/RightsFacet.json").abi, provider);
  const licenseFacet = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/VoiceLicenseFacet.sol/VoiceLicenseFacet.json").abi, provider);

  const mock = loadArtifact("out/MockERC20.sol/MockERC20.json");
  const usdc = await new ethers.ContractFactory(mock.abi, mock.bytecode.object || mock.bytecode, owner).deploy();
  await usdc.waitForDeployment();
  await sendAndWait(payment.connect(owner).setUsdcToken(await usdc.getAddress()), "setUsdcToken");

  for (const user of [licensee, buyer]) {
    await sendAndWait(owner.sendTransaction({ to: user.address, value: ethers.parseEther("2") }), `fundETH:${user.address}`);
    await sendAndWait(usdc.connect(owner).mint(user.address, 2_000_000n * 1_000_000n), `mintUSDC:${user.address}`);
    await sendAndWait(usdc.connect(user).approve(DIAMOND_ADDRESS, ethers.MaxUint256), `approveUSDC:${user.address}`);
  }

  const { voiceHash, tokenId } = await registerVoice(voiceAsset, owner, "ipfs://license-rights-voice", 1000);
  console.log(`[state] voiceHash=${voiceHash} tokenId=${tokenId}`);

  const now = asBigInt((await provider.getBlock("latest")).timestamp);
  const usageRight = {
    rightType: "PodcastNarration",
    startTime: now,
    endTime: now + 90n * ONE_DAY,
    transferable: true,
    restrictions: ["no-sublicense"],
    revocable: true
  };
  await sendAndWait(rights.connect(owner).grantRight(voiceHash, licensee.address, usageRight), "grantRight");

  const rightsAfterGrant = await rights.getUserRights(voiceHash, licensee.address);
  if (!rightsAfterGrant.length) throw new Error("licensee should have at least one granted right");

  const licenseTerms = {
    licenseHash: ethers.ZeroHash,
    duration: 60n * ONE_DAY,
    price: 15n * 1_000_000n,
    maxUses: 10n,
    transferable: true,
    rights: ["PodcastNarration"],
    restrictions: ["no-sublicense"]
  };
  await sendAndWait(licenseFacet.connect(owner).createLicense(licensee.address, voiceHash, licenseTerms), "createLicense");

  const license = await licenseFacet.getLicense(voiceHash, licensee.address);
  if (!license.isActive) throw new Error("license should be active after creation");

  const usageRef = ethers.keccak256(ethers.toUtf8Bytes("usage-1"));
  await sendAndWait(licenseFacet.connect(licensee).recordLicensedUsage(voiceHash, usageRef), "recordLicensedUsage");
  if (!(await licenseFacet.isUsageRefUsed(voiceHash, usageRef))) throw new Error("usage ref should be recorded");

  // PaymentFacet enforces a 1-day minimum asset age for voice asset trades.
  await provider.send("evm_increaseTime", [24 * 60 * 60 + 1]);
  await provider.send("evm_mine", []);

  // Sell the underlying voice NFT using marketplace/payment+escrow path.
  const sellPrice = 101n * 1_000_000n;
  await sendAndWait(voiceAsset.connect(owner).approveVoiceAsset(DIAMOND_ADDRESS, tokenId), "approveNFT");
  await sendAndWait(marketplace.connect(owner).listAsset(tokenId, sellPrice, 0), "listAsset");
  await sendAndWait(marketplace.connect(buyer).purchaseAsset(tokenId), "purchaseAsset");

  if ((await voiceAsset.ownerOf(tokenId)).toLowerCase() !== buyer.address.toLowerCase()) {
    throw new Error("buyer should own voice NFT after sale");
  }

  // Validate sell-through behavior for pre-existing rights/license.
  const rightsAfterSale = await rights.getUserRights(voiceHash, licensee.address);
  if (!rightsAfterSale.length) throw new Error("rights should persist across asset ownership transfer");

  const [isValid] = await licenseFacet.validateLicense(voiceHash, licensee.address, license.templateHash);
  if (!isValid) throw new Error("existing license should remain valid after sell-through");

  // New owner can now revoke license and rights (control transfer validation).
  await sendAndWait(
    licenseFacet.connect(buyer).revokeLicense(voiceHash, license.templateHash, licensee.address, "post-sale policy"),
    "revokeLicense:newOwner"
  );
  await sendAndWait(
    rights.connect(buyer).revokeRight(voiceHash, licensee.address, "PodcastNarration"),
    "revokeRight:newOwner"
  );

  let revokedOk = false;
  try {
    await licenseFacet.getLicense(voiceHash, licensee.address);
  } catch (_e) {
    revokedOk = true;
  }
  if (!revokedOk) throw new Error("license should be revoked by new owner");

  const rightsAfterRevoke = await rights.getUserRights(voiceHash, licensee.address);
  if (rightsAfterRevoke.length !== 0) throw new Error("rights should be removed after revokeRight");

  console.log("TRACE_LICENSE_RIGHTS_SELLTHROUGH: PASS");
}

main().catch((err) => {
  console.error("TRACE_LICENSE_RIGHTS_SELLTHROUGH: FAIL");
  console.error(err);
  process.exit(1);
});
