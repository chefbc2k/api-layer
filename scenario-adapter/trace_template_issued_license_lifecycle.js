#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
require("dotenv").config();

const RPC_URL = process.env.RPC_URL;
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
  return voiceHash;
}

function buildTemplate(creator, now) {
  return {
    creator,
    isActive: true,
    transferable: true,
    createdAt: now,
    updatedAt: now,
    defaultDuration: 30n * ONE_DAY,
    defaultPrice: 15_000n,
    maxUses: 5n,
    name: "Issue Template",
    description: "template issued license lifecycle",
    defaultRights: ["Narration"],
    defaultRestrictions: ["no-sublicense"],
    terms: {
      rights: ["Narration"],
      restrictions: ["no-sublicense"],
      duration: 30n * ONE_DAY,
      price: 15_000n,
      transferable: true,
      maxUses: 5n,
      licenseHash: ethers.ZeroHash
    }
  };
}

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const owner = new ethers.Wallet(PRIVATE_KEY, provider);
  const licensee = new ethers.Wallet(ethers.keccak256(ethers.toUtf8Bytes("TEMPLATE_LICENSEE_1")), provider);
  const transferee = new ethers.Wallet(ethers.keccak256(ethers.toUtf8Bytes("TEMPLATE_LICENSEE_2")), provider);

  const voiceAsset = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/VoiceAssetFacet.sol/VoiceAssetFacet.json").abi, provider);
  const templateFacet = new ethers.Contract(
    DIAMOND_ADDRESS,
    loadArtifact("out/VoiceLicenseTemplateFacet.sol/VoiceLicenseTemplateFacet.json").abi,
    provider
  );
  const licenseFacet = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/VoiceLicenseFacet.sol/VoiceLicenseFacet.json").abi, provider);
  const payment = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/PaymentFacet.sol/PaymentFacet.json").abi, provider);

  const mock = loadArtifact("out/MockERC20.sol/MockERC20.json");
  const usdc = await new ethers.ContractFactory(mock.abi, mock.bytecode.object || mock.bytecode, owner).deploy();
  await usdc.waitForDeployment();
  await sendAndWait(payment.connect(owner).setUsdcToken(await usdc.getAddress()), "setUsdcToken");
  await sendAndWait(usdc.connect(owner).mint(owner.address, 1_000_000n * 1_000_000n), "mintUSDC:owner");
  await sendAndWait(usdc.connect(owner).approve(DIAMOND_ADDRESS, ethers.MaxUint256), "approveUSDC:owner");
  for (const user of [licensee, transferee]) {
    await sendAndWait(owner.sendTransaction({ to: user.address, value: ethers.parseEther("2") }), `fundETH:${user.address}`);
  }

  const voiceHash = await registerVoice(voiceAsset, owner, "ipfs://template-issued-voice", 1000);
  const now = asBigInt((await provider.getBlock("latest")).timestamp);
  const template = buildTemplate(owner.address, now);

  const templateHash = await templateFacet.connect(owner).createTemplate.staticCall(template);
  await sendAndWait(templateFacet.connect(owner).createTemplate(template), "createTemplate");

  const derivedLicenseHash = await templateFacet
    .connect(owner)
    .createLicenseFromTemplate.staticCall(voiceHash, templateHash, {
      licenseHash: ethers.ZeroHash,
      duration: 40n * ONE_DAY,
      price: 25_000n,
      maxUses: 9n,
      transferable: true,
      rights: ["Narration", "Podcast"],
      restrictions: ["territory-us"]
    });
  await sendAndWait(
    templateFacet.connect(owner).createLicenseFromTemplate(voiceHash, templateHash, {
      licenseHash: ethers.ZeroHash,
      duration: 40n * ONE_DAY,
      price: 25_000n,
      maxUses: 9n,
      transferable: true,
      rights: ["Narration", "Podcast"],
      restrictions: ["territory-us"]
    }),
    "createLicenseFromTemplate"
  );

  // License issuance routes through payment validation, which enforces a 1-day asset age.
  await provider.send("evm_increaseTime", [24 * 60 * 60 + 1]);
  await provider.send("evm_mine", []);

  await sendAndWait(licenseFacet.connect(owner).issueLicense(voiceHash, licensee.address, templateHash, 40n * ONE_DAY), "issueLicense");

  const license = await licenseFacet.getLicense(voiceHash, licensee.address);
  const [isValid] = await licenseFacet.validateLicense(voiceHash, licensee.address, templateHash);
  if (!isValid) throw new Error("template-issued license should validate");

  if (license.termsHash !== derivedLicenseHash) {
    throw new Error(`template-issued license terms hash mismatch: issued=${license.termsHash} derived=${derivedLicenseHash}`);
  }

  const usageRef = ethers.keccak256(ethers.toUtf8Bytes("template-issued-usage-1"));
  await sendAndWait(licenseFacet.connect(licensee).recordLicensedUsage(voiceHash, usageRef), "recordLicensedUsage");
  if (!(await licenseFacet.isUsageRefUsed(voiceHash, usageRef))) throw new Error("usage ref should be recorded");

  await sendAndWait(licenseFacet.connect(licensee).transferLicense(voiceHash, templateHash, transferee.address), "transferLicense");

  let oldLicenseMissing = false;
  try {
    await licenseFacet.getLicense(voiceHash, licensee.address);
  } catch (_e) {
    oldLicenseMissing = true;
  }
  if (!oldLicenseMissing) throw new Error("original licensee should no longer hold transferred license");

  const transferred = await licenseFacet.getLicense(voiceHash, transferee.address);
  if (!transferred.isActive) throw new Error("transferred license should remain active");

  await sendAndWait(licenseFacet.connect(owner).revokeLicense(voiceHash, templateHash, transferee.address, "template lifecycle end"), "revokeLicense");

  let revokedOk = false;
  try {
    await licenseFacet.getLicense(voiceHash, transferee.address);
  } catch (_e) {
    revokedOk = true;
  }
  if (!revokedOk) throw new Error("revoked transferred license should not remain retrievable");

  console.log("TRACE_TEMPLATE_ISSUED_LICENSE_LIFECYCLE: PASS");
}

main().catch((err) => {
  console.error("TRACE_TEMPLATE_ISSUED_LICENSE_LIFECYCLE: FAIL");
  console.error(err);
  process.exit(1);
});
