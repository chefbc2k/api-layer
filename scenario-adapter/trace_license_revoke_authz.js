#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
require("dotenv").config();
const { scenarioFundingWei } = require("./lib/runtime_config");
const { uniqueScenarioText } = require("./lib/validation_safety");

const RPC_URL = process.env.RPC_URL;
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ONE_DAY = 24n * 60n * 60n;
const NOT_AUTHORIZED_SELECTOR = "0x50df61b3";

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

async function expectNotAuthorized(sendFn, label) {
  let err;
  try {
    await sendAndWait(sendFn(), label);
  } catch (e) {
    err = e;
  }
  if (!err) throw new Error(`${label}: expected NotAuthorized revert`);
  const data = err?.data || err?.info?.error?.data || "";
  if (!String(data).startsWith(NOT_AUTHORIZED_SELECTOR)) {
    throw new Error(`${label}: expected selector ${NOT_AUTHORIZED_SELECTOR}, got ${data || "<none>"}`);
  }
  console.log(`[expect-revert-ok] ${label} data=${data}`);
}

async function expectRevert(sendFn, label) {
  let err;
  try {
    await sendAndWait(sendFn(), label);
  } catch (e) {
    err = e;
  }
  if (!err) throw new Error(`${label}: expected revert`);
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
  const newOwner = new ethers.Wallet(ethers.keccak256(ethers.toUtf8Bytes("REVOKE_NEW_OWNER")), provider);
  const outsider = new ethers.Wallet(ethers.keccak256(ethers.toUtf8Bytes("REVOKE_OUTSIDER")), provider);
  const manager = new ethers.Wallet(ethers.keccak256(ethers.toUtf8Bytes("REVOKE_MANAGER")), provider);
  const licensee1 = new ethers.Wallet(ethers.keccak256(ethers.toUtf8Bytes("REVOKE_LICENSEE_1")), provider);
  const licensee2 = new ethers.Wallet(ethers.keccak256(ethers.toUtf8Bytes("REVOKE_LICENSEE_2")), provider);

  const access = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/AccessControlFacet.sol/AccessControlFacet.json").abi, provider);
  const voiceAsset = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/VoiceAssetFacet.sol/VoiceAssetFacet.json").abi, provider);
  const licenseFacet = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/VoiceLicenseFacet.sol/VoiceLicenseFacet.json").abi, provider);
  const voiceUri = `ipfs://${uniqueScenarioText("revoke-authz-voice-")}`;

  for (const user of [newOwner, outsider, manager, licensee1, licensee2]) {
    await sendAndWait(owner.sendTransaction({ to: user.address, value: scenarioFundingWei("2") }), `fundETH:${user.address}`);
  }

  const { voiceHash, tokenId } = await registerVoice(voiceAsset, owner, voiceUri, 1000);
  console.log(`[state] voiceHash=${voiceHash} tokenId=${tokenId}`);

  const licenseTerms = {
    licenseHash: ethers.ZeroHash,
    duration: 60n * ONE_DAY,
    price: 15n * 1_000_000n,
    maxUses: 10n,
    transferable: true,
    rights: ["PodcastNarration"],
    restrictions: ["no-sublicense"]
  };

  await sendAndWait(licenseFacet.connect(owner).createLicense(licensee1.address, voiceHash, licenseTerms), "createLicense:licensee1");
  const license1 = await licenseFacet.getLicense(voiceHash, licensee1.address);

  await expectNotAuthorized(
    () => licenseFacet.connect(outsider).revokeLicense(voiceHash, license1.templateHash, licensee1.address, "unauthorized attempt"),
    "revokeLicense:outsider"
  );

  await sendAndWait(
    voiceAsset.connect(owner)["safeTransferFrom(address,address,uint256)"](owner.address, newOwner.address, tokenId),
    "transferOwnership"
  );
  await sendAndWait(
    licenseFacet.connect(newOwner).revokeLicense(voiceHash, license1.templateHash, licensee1.address, "owner revoke"),
    "revokeLicense:newOwner"
  );
  await expectRevert(() => licenseFacet.getLicense(voiceHash, licensee1.address), "getLicense:revoked1");

  await sendAndWait(licenseFacet.connect(newOwner).createLicense(licensee2.address, voiceHash, licenseTerms), "createLicense:licensee2");
  const license2 = await licenseFacet.getLicense(voiceHash, licensee2.address);

  const LICENSE_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("LICENSE_MANAGER_ROLE"));
  await sendAndWait(access.connect(owner).grantRole(LICENSE_MANAGER_ROLE, manager.address, ethers.MaxUint256), "grantRole:LICENSE_MANAGER_ROLE");
  await sendAndWait(
    licenseFacet.connect(manager).revokeLicense(voiceHash, license2.templateHash, licensee2.address, "manager revoke"),
    "revokeLicense:managerRole"
  );
  await expectRevert(() => licenseFacet.getLicense(voiceHash, licensee2.address), "getLicense:revoked2");

  console.log("TRACE_LICENSE_REVOKE_AUTHZ: PASS");
}

main().catch((err) => {
  console.error("TRACE_LICENSE_REVOKE_AUTHZ: FAIL");
  console.error(err);
  process.exit(1);
});
