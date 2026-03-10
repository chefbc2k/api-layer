#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
require("dotenv").config();
const { scenarioFundingWei } = require("./lib/runtime_config");
const { uniqueScenarioText, ensureEthBalance } = require("./lib/validation_safety");

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
  return voiceHash;
}

function buildTemplate(creator, now, name, description, active, transferable, price, duration, maxUses, rights, restrictions) {
  return {
    creator,
    isActive: active,
    transferable,
    createdAt: now,
    updatedAt: now,
    defaultDuration: duration,
    defaultPrice: price,
    maxUses,
    name,
    description,
    defaultRights: rights,
    defaultRestrictions: restrictions,
    terms: {
      rights,
      restrictions,
      duration,
      price,
      transferable,
      maxUses,
      licenseHash: ethers.ZeroHash
    }
  };
}

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const creator = new ethers.Wallet(PRIVATE_KEY, provider);
  const outsider = new ethers.Wallet(ethers.keccak256(ethers.toUtf8Bytes("TEMPLATE_OUTSIDER")), provider);

  const voiceAsset = new ethers.Contract(DIAMOND_ADDRESS, loadArtifact("out/VoiceAssetFacet.sol/VoiceAssetFacet.json").abi, provider);
  const templateFacet = new ethers.Contract(
    DIAMOND_ADDRESS,
    loadArtifact("out/VoiceLicenseTemplateFacet.sol/VoiceLicenseTemplateFacet.json").abi,
    provider
  );
  const voiceUri = `ipfs://${uniqueScenarioText("template-lifecycle-voice-")}`;

  await ensureEthBalance(creator, outsider.address, scenarioFundingWei("2"), "fundETH:outsider");

  const voiceHash = await registerVoice(voiceAsset, creator, voiceUri, 1000);
  const now = asBigInt((await provider.getBlock("latest")).timestamp);
  const baseTemplate = buildTemplate(
    creator.address,
    now,
    "Lifecycle Base",
    "template lifecycle coverage",
    true,
    true,
    15_000n,
    45n * ONE_DAY,
    12n,
    ["Narration", "Ads"],
    ["no-sublicense"]
  );

  const templateHash = await templateFacet.connect(creator).createTemplate.staticCall(baseTemplate);
  await sendAndWait(templateFacet.connect(creator).createTemplate(baseTemplate), "createTemplate");

  const stored = await templateFacet.getTemplate(templateHash);
  if (stored.creator.toLowerCase() !== creator.address.toLowerCase()) throw new Error("template creator mismatch");
  if (stored.name !== "Lifecycle Base") throw new Error("template name mismatch after create");
  if (!stored.isActive) throw new Error("template should be active after create");

  const creatorTemplates = await templateFacet.getCreatorTemplates(creator.address);
  if (!creatorTemplates.map((v) => v.toLowerCase()).includes(templateHash.toLowerCase())) {
    throw new Error("creatorTemplates missing created template");
  }

  const updatedTemplate = buildTemplate(
    creator.address,
    now,
    "Lifecycle Updated",
    "updated template lifecycle coverage",
    true,
    false,
    25_000n,
    90n * ONE_DAY,
    24n,
    ["Narration", "Audiobook"],
    ["territory-us"]
  );
  await sendAndWait(templateFacet.connect(creator).updateTemplate(templateHash, updatedTemplate), "updateTemplate");

  const storedUpdated = await templateFacet.getTemplate(templateHash);
  if (storedUpdated.name !== "Lifecycle Updated") throw new Error("template name mismatch after update");
  if (storedUpdated.transferable !== false) throw new Error("template transferability mismatch after update");
  if (storedUpdated.defaultPrice !== 25_000n) throw new Error("template default price mismatch after update");

  await expectRevert(
    () => templateFacet.connect(outsider).updateTemplate(templateHash, updatedTemplate),
    "updateTemplate:outsider"
  );

  await sendAndWait(templateFacet.connect(creator).setTemplateStatus(templateHash, false), "setTemplateStatus:false");
  if (await templateFacet.isTemplateActive(templateHash)) throw new Error("template should be inactive after deactivation");

  await expectRevert(
    () =>
      templateFacet.connect(creator).createLicenseFromTemplate(voiceHash, templateHash, {
        licenseHash: ethers.ZeroHash,
        duration: 0,
        price: 0,
        maxUses: 0,
        transferable: false,
        rights: [],
        restrictions: []
      }),
    "createLicenseFromTemplate:inactiveTemplate"
  );

  await sendAndWait(templateFacet.connect(creator).setTemplateStatus(templateHash, true), "setTemplateStatus:true");
  if (!(await templateFacet.isTemplateActive(templateHash))) throw new Error("template should be active after reactivation");

  const licenseHash = await templateFacet.connect(creator).createLicenseFromTemplate.staticCall(voiceHash, templateHash, {
    licenseHash: ethers.ZeroHash,
    duration: 60n * ONE_DAY,
    price: 30_000n,
    maxUses: 7n,
    transferable: true,
    rights: ["Podcast"],
    restrictions: ["no-derivatives"]
  });
  await sendAndWait(
    templateFacet.connect(creator).createLicenseFromTemplate(voiceHash, templateHash, {
      licenseHash: ethers.ZeroHash,
      duration: 60n * ONE_DAY,
      price: 30_000n,
      maxUses: 7n,
      transferable: true,
      rights: ["Podcast"],
      restrictions: ["no-derivatives"]
    }),
    "createLicenseFromTemplate:reactivated"
  );

  if (licenseHash === ethers.ZeroHash) throw new Error("template-derived license hash should not be zero");

  console.log("TRACE_TEMPLATE_LIFECYCLE: PASS");
}

main().catch((err) => {
  console.error("TRACE_TEMPLATE_LIFECYCLE: FAIL");
  console.error(err);
  process.exit(1);
});
