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

function asBigInt(v) {
  return typeof v === "bigint" ? v : BigInt(v);
}

function role(name) {
  return ethers.keccak256(ethers.toUtf8Bytes(name));
}

function buildErrorInterfaces() {
  const candidates = [
    "out/MarketErrors.sol/MarketErrors.json",
    "out/EscrowErrors.sol/EscrowErrors.json",
    "out/CoreErrors.sol/CoreErrors.json",
    "out/SecurityErrors.sol/SecurityErrors.json",
    "out/VoiceErrors.sol/VoiceErrors.json",
    "out/PaymentErrors.sol/PaymentErrors.json",
    "out/TokenErrors.sol/TokenErrors.json"
  ];
  const interfaces = [];
  for (const rel of candidates) {
    try {
      const abi = loadArtifact(rel).abi || [];
      const errorAbi = abi.filter((x) => x.type === "error");
      if (errorAbi.length) interfaces.push(new ethers.Interface(errorAbi));
    } catch (_) {
      // optional
    }
  }
  return interfaces;
}

function decodeRevertData(data, ifaces) {
  if (!data || data === "0x") return "<no-revert-data>";
  for (const iface of ifaces) {
    try {
      const parsed = iface.parseError(data);
      if (parsed) {
        const args = (parsed.args || []).map((a) => (typeof a === "bigint" ? a.toString() : String(a))).join(", "
        );
        return `${parsed.name}(${args})`;
      }
    } catch (_) {
      // try next
    }
  }
  return `<unknown:${data.slice(0, 10)}>`;
}

async function sendAndWait(txPromise, label) {
  const tx = await txPromise;
  const sel = (tx.data || "0x").slice(0, 10);
  console.log(`[tx] ${label} from=${tx.from} nonce=${tx.nonce} sel=${sel} hash=${tx.hash}`);
  return tx.wait();
}

async function ensureRole(access, roleId, signer, account) {
  if (await access.hasRole(roleId, account)) return;
  await sendAndWait(access.connect(signer).grantRole(roleId, account, ethers.MaxUint256), "grantRole");
}

async function registerVoice(voiceAsset, signer, uri, royalty) {
  const voiceHash = await voiceAsset.connect(signer).registerVoiceAsset.staticCall(uri, royalty);
  await sendAndWait(voiceAsset.connect(signer).registerVoiceAsset(uri, royalty), "registerVoiceAsset");
  const tokenId = await voiceAsset.getTokenId(voiceHash);
  return asBigInt(tokenId);
}

async function createTemplate(voiceTemplate, provider, signer, creatorAddr, name, desc) {
  const now = asBigInt((await provider.getBlock("latest")).timestamp);
  const template = {
    creator: creatorAddr,
    isActive: true,
    transferable: true,
    createdAt: now,
    updatedAt: now,
    defaultDuration: 30n * 24n * 60n * 60n,
    defaultPrice: 10_000n,
    maxUses: 100n,
    name,
    description: desc,
    defaultRights: [],
    defaultRestrictions: [],
    terms: {
      rights: [],
      restrictions: [],
      duration: 30n * 24n * 60n * 60n,
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

  const errorIfaces = buildErrorInterfaces();
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const creator = new ethers.Wallet(PRIVATE_KEY, provider);

  const voiceAssetAbi = loadArtifact("out/VoiceAssetFacet.sol/VoiceAssetFacet.json").abi;
  const voiceDatasetAbi = loadArtifact("out/VoiceDatasetFacet.sol/VoiceDatasetFacet.json").abi;
  const voiceTemplateAbi = loadArtifact("out/VoiceLicenseTemplateFacet.sol/VoiceLicenseTemplateFacet.json").abi;
  const marketplaceAbi = loadArtifact("out/MarketplaceFacet.sol/MarketplaceFacet.json").abi;
  const paymentAbi = loadArtifact("out/PaymentFacet.sol/PaymentFacet.json").abi;
  const escrowAbi = loadArtifact("out/EscrowFacet.sol/EscrowFacet.json").abi;
  const accessAbi = loadArtifact("out/AccessControlFacet.sol/AccessControlFacet.json").abi;
  const mock = loadArtifact("out/MockERC20.sol/MockERC20.json");

  const voiceAsset = new ethers.Contract(DIAMOND_ADDRESS, voiceAssetAbi, provider);
  const voiceDataset = new ethers.Contract(DIAMOND_ADDRESS, voiceDatasetAbi, provider);
  const voiceTemplate = new ethers.Contract(DIAMOND_ADDRESS, voiceTemplateAbi, provider);
  const marketplace = new ethers.Contract(DIAMOND_ADDRESS, marketplaceAbi, provider);
  const payment = new ethers.Contract(DIAMOND_ADDRESS, paymentAbi, provider);
  const escrow = new ethers.Contract(DIAMOND_ADDRESS, escrowAbi, provider);
  const access = new ethers.Contract(DIAMOND_ADDRESS, accessAbi, provider);

  const users = [creator];
  for (let i = 1; i <= 6; i += 1) {
    const pk = ethers.keccak256(ethers.toUtf8Bytes(`TRACE_RESALE_USER_${i}`));
    users.push(new ethers.Wallet(pk, provider));
  }

  const mockFactory = new ethers.ContractFactory(mock.abi, mock.bytecode.object || mock.bytecode, creator);
  const usdc = await mockFactory.deploy();
  await usdc.waitForDeployment();

  const EMERGENCY_ADMIN_ROLE = role("EMERGENCY_ADMIN_ROLE");
  await ensureRole(access, EMERGENCY_ADMIN_ROLE, creator, creator.address);

  await sendAndWait(payment.connect(creator).setUsdcToken(await usdc.getAddress()), "setUsdcToken");

  for (let i = 1; i < users.length; i += 1) {
    await sendAndWait(creator.sendTransaction({ to: users[i].address, value: ethers.parseEther("2") }), `fundETH[${i}]`);
    await sendAndWait(usdc.connect(creator).mint(users[i].address, 10_000_000n * 1_000_000n), `mintUSDC[${i}]`);
    await sendAndWait(usdc.connect(users[i]).approve(DIAMOND_ADDRESS, ethers.MaxUint256), `approveUSDC[${i}]`);
  }

  const assetIds = [];
  for (let i = 1; i <= 3; i += 1) {
    assetIds.push(await registerVoice(voiceAsset, creator, `ipfs://trace-resale-${i}`, 1000));
  }

  const templateId = await createTemplate(voiceTemplate, provider, creator, creator.address, "TraceTpl", "Trace resale");
  const datasetId = asBigInt(
    await voiceDataset
      .connect(creator)
      .createDataset.staticCall("Trace Dataset", assetIds, templateId, "ipfs://trace-ds", 500)
  );
  await sendAndWait(
    voiceDataset.connect(creator).createDataset("Trace Dataset", assetIds, templateId, "ipfs://trace-ds", 500),
    "createDataset"
  );

  const prices = [100n, 120n, 150n, 180n, 210n].map((v) => v * 1_000_000n);

  for (let i = 0; i < prices.length; i += 1) {
    const seller = users[i];
    const buyer = users[i + 1];
    const price = prices[i];

    const ownerBefore = await voiceAsset.ownerOf(datasetId);
    const inEscrowBefore = await escrow.isInEscrow(datasetId);
    const listingBefore = await marketplace.getListing(datasetId);

    console.log(
      `\n[loop ${i}] seller=${seller.address} buyer=${buyer.address} token=${datasetId.toString()} price=${price.toString()} ownerBefore=${ownerBefore} escrowBefore=${inEscrowBefore} listingActiveBefore=${listingBefore.isActive}`
    );

    await sendAndWait(voiceAsset.connect(seller).approveVoiceAsset(DIAMOND_ADDRESS, datasetId), `approveNFT[${i}]`);

    try {
      await marketplace.connect(seller).listAsset.staticCall(datasetId, price, 0);
      console.log(`[loop ${i}] listAsset.staticCall OK`);
    } catch (err) {
      const data = err?.data || err?.info?.error?.data;
      console.log(`[loop ${i}] listAsset.staticCall REVERT ${decodeRevertData(data, errorIfaces)} raw=${data || "<none>"}`);
      throw err;
    }

    try {
      await sendAndWait(marketplace.connect(seller).listAsset(datasetId, price, 0), `listAsset[${i}]`);
      console.log(`[loop ${i}] listAsset tx OK`);
    } catch (err) {
      const data = err?.data || err?.info?.error?.data;
      console.log(`[loop ${i}] listAsset tx REVERT ${decodeRevertData(data, errorIfaces)} raw=${data || "<none>"}`);
      const ownerAfterFail = await voiceAsset.ownerOf(datasetId).catch(() => "<ownerOf revert>");
      const inEscrowAfterFail = await escrow.isInEscrow(datasetId).catch(() => "<escrow revert>");
      const listingAfterFail = await marketplace.getListing(datasetId).catch(() => ({ isActive: "<listing revert>" }));
      console.log(
        `[loop ${i}] post-fail owner=${ownerAfterFail} escrow=${inEscrowAfterFail} listingActive=${listingAfterFail.isActive}`
      );
      throw err;
    }

    await sendAndWait(marketplace.connect(buyer).purchaseAsset(datasetId), `purchaseAsset[${i}]`);

    const ownerAfter = await voiceAsset.ownerOf(datasetId);
    const inEscrowAfter = await escrow.isInEscrow(datasetId);
    const listingAfter = await marketplace.getListing(datasetId);

    console.log(
      `[loop ${i}] purchase OK ownerAfter=${ownerAfter} escrowAfter=${inEscrowAfter} listingActiveAfter=${listingAfter.isActive}`
    );
  }

  console.log("TRACE_RESALE_LOOP: PASS");
}

main().catch((err) => {
  console.error("TRACE_RESALE_LOOP: FAIL");
  console.error(err);
  process.exit(1);
});
