#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { ethers } = require("ethers");
require("dotenv").config();

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const DEBUG_STOP_BEFORE_DIRECT_PURCHASE = process.env.DEBUG_STOP_BEFORE_DIRECT_PURCHASE === "1";
const RUN_TAG = process.env.HAPPY_PATH_RUN_TAG || `${Date.now()}`;

const DATASET_ROYALTY_BPS = 500n;
const ONE_DAY = 24n * 60n * 60n;
const DATASET_TOKEN_ID_OFFSET = 10n ** 18n;

function loadArtifact(relPath) {
  const file = path.join(process.cwd(), relPath);
  if (!fs.existsSync(file)) {
    throw new Error(`Missing artifact: ${file}. Run 'forge build --offline' first.`);
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function asBigInt(v) {
  return typeof v === "bigint" ? v : BigInt(v);
}

function mapAdd(map, addr, val) {
  const key = addr.toLowerCase();
  const next = (map.get(key) || 0n) + val;
  map.set(key, next);
}

function mapGet(map, addr) {
  return map.get(addr.toLowerCase()) || 0n;
}

function assertEq(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected.toString()} got ${actual.toString()}`);
  }
}

let txCount = 0;
let activeProvider = null;
async function sendAndWait(txPromise) {
  const tx = await txPromise;
  txCount += 1;
  const selector = (tx.data || "0x").slice(0, 10);
  const extra = selector === "0x0d68475e" ? ` calldata=${tx.data}` : "";
  console.log(
    `[tx ${txCount}] from=${tx.from} to=${tx.to} nonce=${tx.nonce} data=${selector} hash=${tx.hash}${extra}`
  );
  try {
    return await tx.wait();
  } catch (err) {
    if (activeProvider && tx.to && tx.from) {
      try {
        await activeProvider.call({ to: tx.to, from: tx.from, data: tx.data || "0x" }, tx.blockNumber ?? "latest");
      } catch (callErr) {
        if (!err.data && callErr?.data) err.data = callErr.data;
        if (!err.reason && callErr?.reason) err.reason = callErr.reason;
      }
    }
    throw err;
  }
}

async function expectRevert(sendFn, label) {
  let revertErr;
  try {
    await sendAndWait(sendFn());
  } catch (err) {
    revertErr = err;
  }
  if (!revertErr) {
    throw new Error(label);
  }
  console.log(`[expect-revert-ok] ${label}: ${formatError(revertErr)}`);
}

function step(label) {
  console.log(`[step] ${label}`);
}

function role(name) {
  return ethers.keccak256(ethers.toUtf8Bytes(name));
}

function selectorOf(signature) {
  return ethers.id(signature).slice(0, 10);
}

async function isSelectorMounted(provider, selector) {
  const loupe = new ethers.Contract(
    DIAMOND_ADDRESS,
    ["function facetAddress(bytes4) view returns (address)"],
    provider
  );
  const facet = await loupe.facetAddress(selector);
  return facet !== ethers.ZeroAddress;
}

function runNodeScenario(scriptName) {
  execFileSync(process.execPath, [path.join(process.cwd(), "scripts/deployment/scenarios", scriptName)], {
    stdio: "inherit",
    env: {
      ...process.env,
      RPC_URL,
      DIAMOND_ADDRESS,
      PRIVATE_KEY
    }
  });
}

async function increaseTime(provider, seconds) {
  await provider.send("evm_increaseTime", [Number(seconds)]);
  await provider.send("evm_mine", []);
}

async function mine(provider, count) {
  for (let i = 0; i < count; i += 1) {
    await provider.send("evm_mine", []);
  }
}

async function mineByTransactions(signer, count) {
  for (let i = 0; i < count; i += 1) {
    await sendAndWait(signer.sendTransaction({ to: signer.address, value: 0n }));
  }
}

function formatError(err) {
  if (!err) return "unknown error";
  const base = err.shortMessage || err.reason || err.message || String(err);
  const data = err.data || err?.info?.error?.data;
  return data ? `${base} [data=${data}]` : base;
}

function withNonceManager(wallet, provider) {
  let nextNonce;
  const originalSend = wallet.sendTransaction.bind(wallet);

  wallet.sendTransaction = async (tx) => {
    if (nextNonce === undefined) {
      nextNonce = await provider.getTransactionCount(wallet.address, "pending");
    }

    try {
      const sent = await originalSend({ ...tx, nonce: nextNonce });
      nextNonce += 1;
      return sent;
    } catch (err) {
      const msg = String(err?.shortMessage || err?.message || "").toLowerCase();
      if (err?.code === "NONCE_EXPIRED" || msg.includes("nonce too low")) {
        nextNonce = await provider.getTransactionCount(wallet.address, "pending");
        const retried = await originalSend({ ...tx, nonce: nextNonce });
        nextNonce += 1;
        return retried;
      }
      throw err;
    }
  };

  return wallet;
}

async function ensureRole(access, roleId, signer, account, label) {
  if (await access.hasRole(roleId, account)) return true;
  try {
    await sendAndWait(access.connect(signer).grantRole(roleId, account, ethers.MaxUint256));
  } catch (_) {
    // ignore
  }
  const ok = await access.hasRole(roleId, account);
  if (!ok) {
    console.log(`[skip] ${label} (role unavailable)`);
  }
  return ok;
}

async function registerVoice(voiceAsset, signer, uri, royalty) {
  const voiceHash = await voiceAsset.connect(signer).registerVoiceAsset.staticCall(uri, royalty);
  await sendAndWait(voiceAsset.connect(signer).registerVoiceAsset(uri, royalty));
  const tokenId = await voiceAsset.getTokenId(voiceHash);
  return { voiceHash, tokenId: asBigInt(tokenId) };
}

async function createTemplate(voiceTemplate, provider, signer, creatorAddr, name, desc, active = true) {
  const now = asBigInt((await provider.getBlock("latest")).timestamp);
  const template = {
    creator: creatorAddr,
    isActive: active,
    transferable: true,
    createdAt: now,
    updatedAt: now,
    defaultDuration: 30n * ONE_DAY,
    defaultPrice: 10_000n,
    maxUses: 100n,
    name,
    description: desc,
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
  await sendAndWait(voiceTemplate.connect(signer).createTemplate(template));
  return { templateHash, templateId: asBigInt(templateHash) };
}

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  provider.pollingInterval = 100;
  activeProvider = provider;
  const creator = withNonceManager(new ethers.Wallet(PRIVATE_KEY, provider), provider);
  const failures = [];
  const recordFailure = (label, err) => {
    const message = formatError(err);
    failures.push({ label, message });
    console.error(`[logic-fail] ${label}: ${message}`);
  };

  const accessAbi = loadArtifact("out/AccessControlFacet.sol/AccessControlFacet.json").abi;
  const voiceAssetAbi = loadArtifact("out/VoiceAssetFacet.sol/VoiceAssetFacet.json").abi;
  const voiceDatasetAbi = loadArtifact("out/VoiceDatasetFacet.sol/VoiceDatasetFacet.json").abi;
  const voiceTemplateAbi = loadArtifact("out/VoiceLicenseTemplateFacet.sol/VoiceLicenseTemplateFacet.json").abi;
  const marketplaceAbi = loadArtifact("out/MarketplaceFacet.sol/MarketplaceFacet.json").abi;
  const paymentAbi = loadArtifact("out/PaymentFacet.sol/PaymentFacet.json").abi;
  const escrowAbi = loadArtifact("out/EscrowFacet.sol/EscrowFacet.json").abi;
  const mockArtifact = loadArtifact("out/MockERC20.sol/MockERC20.json");

  const access = new ethers.Contract(DIAMOND_ADDRESS, accessAbi, provider);
  const voiceAsset = new ethers.Contract(DIAMOND_ADDRESS, voiceAssetAbi, provider);
  const voiceDataset = new ethers.Contract(DIAMOND_ADDRESS, voiceDatasetAbi, provider);
  const voiceTemplate = new ethers.Contract(DIAMOND_ADDRESS, voiceTemplateAbi, provider);
  const marketplace = new ethers.Contract(DIAMOND_ADDRESS, marketplaceAbi, provider);
  const payment = new ethers.Contract(DIAMOND_ADDRESS, paymentAbi, provider);
  const escrow = new ethers.Contract(DIAMOND_ADDRESS, escrowAbi, provider);

  const users = [creator];
  for (let i = 1; i <= 6; i += 1) {
    const buyerPk = ethers.keccak256(ethers.toUtf8Bytes(`HP_BUYER_KEY_${i}`));
    users.push(withNonceManager(new ethers.Wallet(buyerPk, provider), provider));
  }

  const mockBytecode = mockArtifact.bytecode.object || mockArtifact.bytecode;
  const mockFactory = new ethers.ContractFactory(mockArtifact.abi, mockBytecode, creator);
  const usdc = await mockFactory.deploy();
  await usdc.waitForDeployment();

  step("configure scenario USDC");
  await sendAndWait(payment.connect(creator).setUsdcToken(await usdc.getAddress()));

  const EMERGENCY_ADMIN_ROLE = role("EMERGENCY_ADMIN_ROLE");
  const PLATFORM_ADMIN_ROLE = role("PLATFORM_ADMIN_ROLE");
  const FEE_MANAGER_ROLE = role("FEE_MANAGER_ROLE");
  const GOVERNANCE_ROLE = role("GOVERNANCE_ROLE");

  if (!(await ensureRole(access, EMERGENCY_ADMIN_ROLE, creator, creator.address, "EMERGENCY_ADMIN_ROLE"))) {
    throw new Error("EMERGENCY_ADMIN_ROLE is required for payment pause scenarios");
  }

  step("fund users and approvals");
  for (let i = 1; i < users.length; i += 1) {
    await sendAndWait(creator.sendTransaction({ to: users[i].address, value: ethers.parseEther("2") }));
    await sendAndWait(usdc.connect(creator).mint(users[i].address, 5_000_000n * 1_000_000n));
    await sendAndWait(usdc.connect(users[i]).approve(DIAMOND_ADDRESS, ethers.MaxUint256));
  }

  step("register core assets");
  const assetIds = [];
  for (let i = 1; i <= 3; i += 1) {
    const uri = `ipfs://hp-${RUN_TAG}-voice-${i}`;
    const voiceHash = await voiceAsset.connect(creator).registerVoiceAsset.staticCall(uri, 1000);
    await sendAndWait(voiceAsset.connect(creator).registerVoiceAsset(uri, 1000));
    const tokenId = await voiceAsset.getTokenId(voiceHash);
    assetIds.push(asBigInt(tokenId));
    if ((await voiceAsset.ownerOf(tokenId)).toLowerCase() !== creator.address.toLowerCase()) {
      throw new Error(`asset ${i} owner mismatch`);
    }
  }

  const { templateHash, templateId } = await createTemplate(
    voiceTemplate,
    provider,
    creator,
    creator.address,
    `Anvil HP Template ${RUN_TAG}`,
    `Template for on-chain happy-path pack ${RUN_TAG}`
  );
  if (!(await voiceTemplate.isTemplateActive(templateHash))) throw new Error("Template is not active");

  step("create dataset");
  const datasetId = asBigInt(
    await voiceDataset
      .connect(creator)
      .createDataset.staticCall(
        `Anvil Happy Path Dataset ${RUN_TAG}`,
        assetIds,
        templateId,
        `ipfs://hp-${RUN_TAG}-dataset`,
        500
      )
  );
  await sendAndWait(
    voiceDataset
      .connect(creator)
      .createDataset(`Anvil Happy Path Dataset ${RUN_TAG}`, assetIds, templateId, `ipfs://hp-${RUN_TAG}-dataset`, 500)
  );
  if ((await voiceAsset.ownerOf(datasetId)).toLowerCase() !== creator.address.toLowerCase()) {
    throw new Error("dataset owner after creation mismatch");
  }

  const feeCfg = await payment.getFeeConfiguration();
  const treasury = await payment.getTreasuryAddress();
  const devFund = await payment.getDevFundAddress();
  const unionTreasury = await payment.getUnionTreasuryAddress();

  const expectedPending = new Map();
  const expectedGift = new Map();
  let expectedVolume = 0n;
  let expectedFees = 0n;
  let expectedRoyalties = 0n;

  const applyExpectedSale = (sellerAddr, price) => {
    const platformAmount = (price * asBigInt(feeCfg.platformFee)) / 10_000n;
    const unionAmount = (price * asBigInt(feeCfg.unionShare)) / 10_000n;
    const devAmount = (price * asBigInt(feeCfg.devFund)) / 10_000n;
    const giftAmount = (price * asBigInt(feeCfg.timewaveGift)) / 10_000n;
    const totalPlatformFees = platformAmount + unionAmount + devAmount + giftAmount;

    const datasetRoyalty = (price * DATASET_ROYALTY_BPS) / 10_000n;
    const creatorAmount = price - totalPlatformFees;
    const sellerProceeds = creatorAmount - datasetRoyalty;

    mapAdd(expectedPending, treasury, platformAmount);
    mapAdd(expectedPending, unionTreasury, unionAmount);
    mapAdd(expectedPending, devFund, devAmount);
    mapAdd(expectedPending, sellerAddr, sellerProceeds);
    mapAdd(expectedPending, creator.address, datasetRoyalty);
    mapAdd(expectedGift, sellerAddr, giftAmount);

    expectedVolume += price;
    expectedFees += totalPlatformFees;
    expectedRoyalties += creatorAmount;
  };

  const listDataset = async (seller, price, tokenId = datasetId) => {
    if (tokenId >= DATASET_TOKEN_ID_OFFSET) {
      await sendAndWait(voiceAsset.connect(seller).setApprovalForAll(DIAMOND_ADDRESS, true));
    } else {
      await sendAndWait(voiceAsset.connect(seller).approveVoiceAsset(DIAMOND_ADDRESS, tokenId));
    }
    try {
      await marketplace.connect(seller).listAsset.staticCall(tokenId, price, 0);
    } catch (err) {
      throw new Error(
        `listAsset precheck failed seller=${seller.address} tokenId=${tokenId.toString()} price=${price.toString()}: ${formatError(
          err
        )}`
      );
    }
    await sendAndWait(marketplace.connect(seller).listAsset(tokenId, price, 0));
    const listing = await marketplace.getListing(tokenId);
    if (!listing.isActive) throw new Error("listing should be active");
    if ((await voiceAsset.ownerOf(tokenId)).toLowerCase() !== DIAMOND_ADDRESS.toLowerCase()) {
      throw new Error("diamond should hold escrowed dataset");
    }
    if (!(await escrow.isInEscrow(tokenId))) throw new Error("dataset should be escrowed");
  };

  const buyToken = async (buyer, tokenId = datasetId) => {
    await sendAndWait(marketplace.connect(buyer).purchaseAsset(tokenId));
    if ((await marketplace.getListing(tokenId)).isActive) throw new Error("listing should be inactive");
    if ((await escrow.isInEscrow(tokenId)) !== false) throw new Error("escrow should be cleared");
    if ((await voiceAsset.ownerOf(tokenId)).toLowerCase() !== buyer.address.toLowerCase()) {
      throw new Error("dataset ownership mismatch");
    }
  };

  const expectPurchaseRevert = async (buyer, reason, tokenId = datasetId) =>
    expectRevert(() => marketplace.connect(buyer).purchaseAsset(tokenId), reason, buyer);

  step("dataset 5-sale chain + accounting");
  const prices = [100n, 120n, 150n, 180n, 210n].map((v) => v * 1_000_000n);
  for (let i = 0; i < prices.length; i += 1) {
    await listDataset(users[i], prices[i]);
    await buyToken(users[i + 1]);
    applyExpectedSale(users[i].address, prices[i]);
  }

  const pausedSalePrice = 240n * 1_000_000n;
  await listDataset(users[5], pausedSalePrice);
  await sendAndWait(payment.connect(creator).setPaymentPaused(true));
  if (!(await payment.paymentPaused())) throw new Error("payment should be paused");
  await expectPurchaseRevert(users[6], "purchase should revert while payment is paused");
  if (!(await marketplace.getListing(datasetId)).isActive) throw new Error("listing should remain active");
  if (!(await escrow.isInEscrow(datasetId))) throw new Error("dataset should remain escrowed");
  await sendAndWait(payment.connect(creator).setPaymentPaused(false));
  const pausedAfterUnpause = await payment.paymentPaused();
  console.log(`[debug] paymentPausedAfterUnpause=${pausedAfterUnpause}`);
  if (pausedAfterUnpause) throw new Error("payment remained paused after unpause");
  await buyToken(users[6]);
  applyExpectedSale(users[5].address, pausedSalePrice);

  const rollbackPrice = 260n * 1_000_000n;
  await listDataset(users[6], rollbackPrice);
  const sellerPendingBefore = await payment.getPendingPayments(users[6].address);
  const treasuryPendingBefore = await payment.getPendingPayments(treasury);
  await sendAndWait(usdc.connect(users[1]).approve(DIAMOND_ADDRESS, 0));
  await expectPurchaseRevert(users[1], "purchase should revert when allowance is zero");
  assertEq(await payment.getPendingPayments(users[6].address), sellerPendingBefore, "seller pending on rollback");
  assertEq(await payment.getPendingPayments(treasury), treasuryPendingBefore, "treasury pending on rollback");
  await sendAndWait(usdc.connect(users[1]).approve(DIAMOND_ADDRESS, ethers.MaxUint256));
  await sendAndWait(marketplace.connect(users[6]).cancelListing(datasetId));
  if (await escrow.isInEscrow(datasetId)) throw new Error("escrow should be released after cancel");
  if ((await voiceAsset.ownerOf(datasetId)).toLowerCase() !== users[6].address.toLowerCase()) {
    throw new Error("dataset should return to seller after cancel");
  }

  for (let i = 0; i < users.length; i += 1) {
    assertEq(await payment.getPendingPayments(users[i].address), mapGet(expectedPending, users[i].address), `pending user ${i}`);
    assertEq(await payment.getPendingTimewaveGift(users[i].address), mapGet(expectedGift, users[i].address), `gift user ${i}`);
  }
  assertEq(await payment.getPendingPayments(treasury), mapGet(expectedPending, treasury), "pending treasury");
  assertEq(await payment.getPendingPayments(devFund), mapGet(expectedPending, devFund), "pending devFund");
  assertEq(await payment.getPendingPayments(unionTreasury), mapGet(expectedPending, unionTreasury), "pending union");

  {
    const [v, f, r, refs] = await payment.getRevenueMetrics();
    assertEq(v, expectedVolume, "global volume");
    assertEq(f, expectedFees, "global fees");
    assertEq(r, expectedRoyalties, "global royalties");
    assertEq(refs, 0n, "global referrals");
  }

  {
    const [v, f, r, refs] = await payment.getAssetRevenue(datasetId);
    assertEq(v, expectedVolume, "asset volume");
    assertEq(f, expectedFees, "asset fees");
    assertEq(r, expectedRoyalties, "asset royalties");
    assertEq(refs, 0n, "asset referrals");
  }

  const sellerToWithdraw = mapGet(expectedPending, users[1].address);
  if (sellerToWithdraw > 0n) {
    const before = await usdc.balanceOf(users[1].address);
    await sendAndWait(payment.connect(users[1]).withdrawPayments());
    const after = await usdc.balanceOf(users[1].address);
    assertEq(after - before, sellerToWithdraw, "withdraw amount");
  }

  step("registration negative paths");
  await expectRevert(
    () => voiceAsset.connect(creator).registerVoiceAsset(`ipfs://hp-${RUN_TAG}-voice-1`, 1000),
    "duplicate registration should revert",
    creator
  );
  await expectRevert(() => voiceAsset.connect(creator).registerVoiceAsset("", 1000), "empty CID should revert", creator);
  await expectRevert(
    () => voiceAsset.connect(creator).registerVoiceAsset("https://bad-cid", 1000),
    "unsupported URI scheme should revert",
    creator
  );
  await expectRevert(
    () => voiceAsset.connect(creator).registerVoiceAsset("ipfs://hp-too-high-royalty", 6000),
    "royalty out of range should revert",
    creator
  );

  if (await ensureRole(access, PLATFORM_ADMIN_ROLE, creator, creator.address, "registration pause checks")) {
    await sendAndWait(voiceAsset.connect(creator).setRegistrationPaused(true));
    await expectRevert(
      () => voiceAsset.connect(creator).registerVoiceAsset(`ipfs://hp-${RUN_TAG}-paused-reg`, 1000),
      "registration should revert while paused",
      creator
    );
    await sendAndWait(voiceAsset.connect(creator).setRegistrationPaused(false));
  }

  try {
    step("dataset guardrail paths");
    const creatorAsset = await registerVoice(voiceAsset, creator, `ipfs://hp-${RUN_TAG}-dataset-guard-creator`, 1000);
    const otherAsset = await registerVoice(voiceAsset, users[2], `ipfs://hp-${RUN_TAG}-dataset-guard-other`, 1000);
    const activeTpl = await createTemplate(
      voiceTemplate,
      provider,
      creator,
      creator.address,
      `HP Guard Active ${RUN_TAG}`,
      `guard active template ${RUN_TAG}`
    );
    const inactiveTpl = await createTemplate(
      voiceTemplate,
      provider,
      creator,
      creator.address,
      `HP Guard Inactive ${RUN_TAG}`,
      `guard inactive template ${RUN_TAG}`
    );
    await sendAndWait(voiceTemplate.connect(creator).setTemplateStatus(inactiveTpl.templateHash, false));
    await expectRevert(
      () => voiceDataset.connect(creator).createDataset("", [creatorAsset.tokenId], activeTpl.templateId, "ipfs://d", 500),
      "empty dataset title should revert",
      creator
    );
    await expectRevert(
      () => voiceDataset.connect(creator).createDataset("x", [creatorAsset.tokenId], activeTpl.templateId, "", 500),
      "empty dataset metadata should revert",
      creator
    );
    await expectRevert(
      () => voiceDataset.connect(creator).createDataset("x", [otherAsset.tokenId], activeTpl.templateId, "ipfs://d", 500),
      "dataset with non-owned asset should revert",
      creator
    );
    await expectRevert(
      () =>
        voiceDataset
          .connect(creator)
          .createDataset("x", [creatorAsset.tokenId, creatorAsset.tokenId], activeTpl.templateId, "ipfs://d", 500),
      "dataset duplicate asset should revert",
      creator
    );
    await expectRevert(
      () => voiceDataset.connect(creator).createDataset("x", [creatorAsset.tokenId], inactiveTpl.templateId, "ipfs://d", 500),
      "dataset with inactive template should revert",
      creator
    );
  } catch (err) {
    recordFailure("dataset guardrail paths", err);
  }

  try {
    step("direct voice sale via marketplace + escrow + payment");
    const voiceSale = await registerVoice(voiceAsset, creator, `ipfs://hp-${RUN_TAG}-voice-sale`, 1000);
    await increaseTime(provider, 2n * ONE_DAY);
    const voiceSalePrice = 95n * 1_000_000n;
    const beforeByAddr = new Map();
    for (const addr of [treasury, unionTreasury, devFund, creator.address]) {
      const key = addr.toLowerCase();
      if (!beforeByAddr.has(key)) {
        beforeByAddr.set(key, await payment.getPendingPayments(addr));
      }
    }
    const giftBefore = await payment.getPendingTimewaveGift(creator.address);
    await listDataset(creator, voiceSalePrice, voiceSale.tokenId);
    if (DEBUG_STOP_BEFORE_DIRECT_PURCHASE) {
      console.log(`[debug] voiceSaleTokenId=${voiceSale.tokenId.toString()}`);
      console.log(`[debug] directBuyer=${users[1].address}`);
      console.log("ANVIL HAPPY PATH PACK: DEBUG STOP BEFORE DIRECT PURCHASE");
      return;
    }
    await buyToken(users[1], voiceSale.tokenId);
    const pAmt = (voiceSalePrice * asBigInt(feeCfg.platformFee)) / 10_000n;
    const uAmt = (voiceSalePrice * asBigInt(feeCfg.unionShare)) / 10_000n;
    const dAmt = (voiceSalePrice * asBigInt(feeCfg.devFund)) / 10_000n;
    const gAmt = (voiceSalePrice * asBigInt(feeCfg.timewaveGift)) / 10_000n;
    const sellerInc = voiceSalePrice - (pAmt + uAmt + dAmt + gAmt);

    const expectedByAddr = new Map();
    mapAdd(expectedByAddr, treasury, pAmt);
    mapAdd(expectedByAddr, unionTreasury, uAmt);
    mapAdd(expectedByAddr, devFund, dAmt);
    mapAdd(expectedByAddr, creator.address, sellerInc);

    for (const [addr, expected] of expectedByAddr.entries()) {
      const actual = (await payment.getPendingPayments(addr)) - (beforeByAddr.get(addr) || 0n);
      assertEq(actual, expected, `voice-sale pending delta ${addr}`);
    }
    assertEq((await payment.getPendingTimewaveGift(creator.address)) - giftBefore, gAmt, "voice-sale gift delta");
  } catch (err) {
    recordFailure("direct voice sale via marketplace + escrow + payment", err);
  }

  step("payment pause gates direct payment and withdrawal");
  const directPay = await registerVoice(voiceAsset, creator, `ipfs://hp-${RUN_TAG}-direct-pay`, 1000);
  await increaseTime(provider, 2n * ONE_DAY);
  await sendAndWait(payment.connect(creator).setPaymentPaused(true));
  await expectRevert(
    () => payment.connect(users[3]).distributePayment(directPay.tokenId, 11n * 1_000_000n, creator.address, ethers.ZeroAddress, false),
    "distributePayment should revert while paused",
    users[3]
  );
  await expectRevert(() => payment.connect(creator).withdrawPayments(), "withdrawPayments should revert while paused", creator);
  await sendAndWait(payment.connect(creator).setPaymentPaused(false));
  const directSellerBefore = await payment.getPendingPayments(creator.address);
  await sendAndWait(
    payment.connect(users[3]).distributePayment(directPay.tokenId, 11n * 1_000_000n, creator.address, ethers.ZeroAddress, false)
  );
  if ((await payment.getPendingPayments(creator.address)) <= directSellerBefore) {
    throw new Error("distributePayment should increase seller pending when unpaused");
  }

  const hasFeeManager = await ensureRole(access, FEE_MANAGER_ROLE, creator, creator.address, "advanced payment controls");
  if (hasFeeManager) {
    try {
      step("commit/reveal distribution and withdrawal");
      await sendAndWait(payment.connect(creator).setMevProtectionConfig(false, ethers.ZeroAddress, 0, 1, 2));
      const commitVoice = await registerVoice(voiceAsset, creator, `ipfs://hp-${RUN_TAG}-commit-reveal`, 1000);
      await increaseTime(provider, 2n * ONE_DAY);

      const commitAmount = 13n * 1_000_000n;
      const payer = users[4];
      await expectRevert(
        () => payment.connect(payer).distributePayment(commitVoice.tokenId, commitAmount, creator.address, ethers.ZeroAddress, false),
        "high-value distributePayment should require commit",
        payer
      );

      const nonce = 42n;
      const deadline = asBigInt((await provider.getBlock("latest")).timestamp) + 3600n;
      const commitHash = ethers.solidityPackedKeccak256(
        ["uint256", "uint256", "address", "address", "bool", "address", "address", "uint256", "uint256"],
        [commitVoice.tokenId, commitAmount, creator.address, ethers.ZeroAddress, false, payer.address, payer.address, nonce, deadline]
      );

      await sendAndWait(payment.connect(payer).commitDistribution(commitHash));
      await expectRevert(
        () =>
          payment
            .connect(payer)
            .revealDistribution(
              commitVoice.tokenId,
              commitAmount,
              creator.address,
              ethers.ZeroAddress,
              false,
              payer.address,
              nonce,
              deadline
            ),
        "revealDistribution should revert before timelock",
        payer
      );
      await mineByTransactions(creator, 5);

      const sellerBeforeCommit = await payment.getPendingPayments(creator.address);
      await sendAndWait(
        payment
          .connect(payer)
          .revealDistribution(commitVoice.tokenId, commitAmount, creator.address, ethers.ZeroAddress, false, payer.address, nonce, deadline)
      );
      if ((await payment.getPendingPayments(creator.address)) <= sellerBeforeCommit) {
        throw new Error("revealDistribution should increase seller pending");
      }

      const commitWithdrawTreasury = await payment.getTreasuryAddress();
      const treasurySwappedForCommitWithdraw = commitWithdrawTreasury.toLowerCase() === creator.address.toLowerCase();
      if (treasurySwappedForCommitWithdraw) {
        await sendAndWait(payment.connect(creator).updateTreasuryAddress(users[6].address));
      }
      try {
        const pendingForCommitWithdraw = await payment.getPendingPayments(creator.address);
        const withdrawNonce = 99n;
        const withdrawDeadline = asBigInt((await provider.getBlock("latest")).timestamp) + 3600n;
        const withdrawHash = ethers.solidityPackedKeccak256(
          ["address", "uint256", "uint256", "uint256"],
          [creator.address, pendingForCommitWithdraw, withdrawNonce, withdrawDeadline]
        );
        await sendAndWait(payment.connect(creator).commitWithdraw(withdrawHash));
        await expectRevert(
          () => payment.connect(creator).revealWithdraw(pendingForCommitWithdraw, withdrawNonce, withdrawDeadline),
          "revealWithdraw should revert before timelock",
          creator
        );
        await mineByTransactions(creator, 5);
        const withdrawBalBefore = await usdc.balanceOf(creator.address);
        await sendAndWait(payment.connect(creator).revealWithdraw(pendingForCommitWithdraw, withdrawNonce, withdrawDeadline));
        const withdrawBalAfter = await usdc.balanceOf(creator.address);
        assertEq(withdrawBalAfter - withdrawBalBefore, pendingForCommitWithdraw, "commit withdraw amount mismatch");
      } finally {
        if (treasurySwappedForCommitWithdraw) {
          await sendAndWait(payment.connect(creator).updateTreasuryAddress(commitWithdrawTreasury));
        }
      }

      step("treasury withdrawal limit");
      await sendAndWait(payment.connect(creator).setMevProtectionConfig(false, ethers.ZeroAddress, 0, 10n ** 30n, 1));
      const treasuryVoice = await registerVoice(voiceAsset, creator, `ipfs://hp-${RUN_TAG}-treasury-limit`, 1000);
      await increaseTime(provider, 2n * ONE_DAY);
      await sendAndWait(
        payment.connect(users[5]).distributePayment(treasuryVoice.tokenId, 21n * 1_000_000n, creator.address, ethers.ZeroAddress, false)
      );
      const treasuryPending = await payment.getPendingPayments(treasury);
      await sendAndWait(payment.connect(creator).setTreasuryWithdrawalLimit(1, 365n * ONE_DAY, 0));
      if (treasury.toLowerCase() === creator.address.toLowerCase()) {
        await expectRevert(
          () => payment.connect(creator).withdrawPayments(),
          "treasury withdrawal limit should enforce cap",
          creator
        );
        await sendAndWait(payment.connect(creator).setTreasuryWithdrawalLimit(treasuryPending + 1n, 365n * ONE_DAY, 0));
        try {
          await sendAndWait(payment.connect(creator).withdrawPayments());
        } catch (err) {
          const msg = formatError(err);
          if (msg.includes("[data=0x7d7f8c19")) {
            console.log("[skip] treasury direct withdrawal blocked by multisig gate (threshold=0)");
          } else {
            throw err;
          }
        }
      } else {
        console.log("[skip] treasury withdrawal limit execution (treasury signer key unavailable in scenario)");
      }

      step("fee-route mutation checks");
      const originalTreasury = await payment.getTreasuryAddress();
      const originalDevFund = await payment.getDevFundAddress();
      const originalUnion = await payment.getUnionTreasuryAddress();
      const newTreasury = users[5].address;
      const newDevFund = users[6].address;

      await sendAndWait(payment.connect(creator).updateTreasuryAddress(newTreasury));
      await sendAndWait(payment.connect(creator).updateDevFundAddress(newDevFund));

      const hasGovernance = await access.hasRole(GOVERNANCE_ROLE, creator.address);
      let unionUpdated = false;
      if (hasGovernance) {
        await sendAndWait(payment.connect(creator).updateUnionTreasuryAddress(users[4].address));
        unionUpdated = true;
      } else {
        console.log("[skip] updateUnionTreasuryAddress (GOVERNANCE_ROLE unavailable)");
      }

      const feeVoice = await registerVoice(voiceAsset, creator, `ipfs://hp-${RUN_TAG}-fee-route`, 1000);
      await increaseTime(provider, 2n * ONE_DAY);
      const tBefore = await payment.getPendingPayments(newTreasury);
      const dBefore = await payment.getPendingPayments(newDevFund);
      await sendAndWait(
        payment.connect(users[1]).distributePayment(feeVoice.tokenId, 9n * 1_000_000n, creator.address, ethers.ZeroAddress, false)
      );
      if ((await payment.getPendingPayments(newTreasury)) <= tBefore) throw new Error("new treasury should accrue fees");
      if ((await payment.getPendingPayments(newDevFund)) <= dBefore) throw new Error("new dev fund should accrue fees");

      await sendAndWait(payment.connect(creator).updateTreasuryAddress(originalTreasury));
      await sendAndWait(payment.connect(creator).updateDevFundAddress(originalDevFund));
      if (unionUpdated) {
        await sendAndWait(payment.connect(creator).updateUnionTreasuryAddress(originalUnion));
      }
    } catch (err) {
      recordFailure("advanced payment controls", err);
    }
  }

  try {
    const vestingSelectors = [
      "createFounderVesting(address,uint256)",
      "createDevFundVesting(address,uint256)",
      "createPublicVesting(address,uint256)",
      "createCexVesting(address,uint256)"
    ];
    let vestingMounted = true;
    for (const signature of vestingSelectors) {
      if (!(await isSelectorMounted(provider, selectorOf(signature)))) {
        vestingMounted = false;
        break;
      }
    }

    if (vestingMounted) {
      step("vesting lifecycle pack");
      runNodeScenario("trace_vesting_lifecycle.js");
      runNodeScenario("trace_dev_fund_vesting_lifecycle.js");
      runNodeScenario("trace_public_vesting_lifecycle.js");
      runNodeScenario("trace_cex_vesting_lifecycle.js");
      runNodeScenario("trace_vesting_negative_paths.js");
    } else {
      console.log("[skip] vesting lifecycle pack (vesting selectors not mounted)");
    }
  } catch (err) {
    recordFailure("vesting lifecycle pack", err);
  }

  if (failures.length > 0) {
    throw new Error(
      `Scenario failures (${failures.length}):\n${failures
        .map((f, i) => `${i + 1}. ${f.label}: ${f.message}`)
        .join("\n")}`
    );
  }

  console.log("ANVIL HAPPY PATH PACK: PASS");
  console.log("diamond:", DIAMOND_ADDRESS);
  console.log("datasetId:", datasetId.toString());
}

main().catch((err) => {
  console.error("ANVIL HAPPY PATH PACK: FAIL");
  console.error(err);
  process.exit(1);
});
