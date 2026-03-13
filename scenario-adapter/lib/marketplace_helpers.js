"use strict";

const { ethers } = require("ethers");
const {
  ROLE,
  loadArtifact,
  createProvider,
  selectorsForAbi,
  sendAndWait,
  deploy,
  advanceTime,
  fundEth
} = require("./access_helpers");
const { walletAt, deployBaseDiamondWithAccess } = require("./reentrancy_real_helpers");

const ONE_DAY = 24 * 60 * 60;
const GOVERNANCE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GOVERNANCE_ROLE"));

function selectorsBySignature(abi, signatures) {
  const iface = new ethers.Interface(abi);
  return signatures.map((signature) => iface.getFunction(signature).selector);
}

async function ensureRole(access, founder, role, account, label) {
  if (await access.hasRole(role, account)) return;
  await sendAndWait(access.connect(founder).grantRole(role, account, ethers.MaxUint256), `grantRole:${label}`);
}

async function registerVoice(voiceAsset, signer, uri, royaltyBps) {
  const voiceHash = await voiceAsset.connect(signer).registerVoiceAsset.staticCall(uri, royaltyBps);
  await sendAndWait(voiceAsset.connect(signer).registerVoiceAsset(uri, royaltyBps), `registerVoiceAsset:${uri}`);
  const tokenId = await voiceAsset.getTokenId(voiceHash);
  return { voiceHash, tokenId };
}



async function createDataset(voiceDataset, signer, title, assetIds, templateId, metadataURI, royaltyBps) {
  const datasetId = await voiceDataset.connect(signer).createDataset.staticCall(
    title,
    assetIds,
    templateId,
    metadataURI,
    royaltyBps
  );
  await sendAndWait(
    voiceDataset.connect(signer).createDataset(title, assetIds, templateId, metadataURI, royaltyBps),
    `createDataset:${title}`
  );
  return datasetId;
}

async function listAsset(voiceAsset, marketplace, seller, tokenId, price) {
  await sendAndWait(voiceAsset.connect(seller).setApprovalForAll(await marketplace.getAddress(), true), `setApprovalForAll:${tokenId}`);
  await sendAndWait(marketplace.connect(seller).listAsset(tokenId, price, 0), `listAsset:${tokenId}`);
}

async function purchaseAsset(marketplace, buyer, tokenId) {
  await sendAndWait(marketplace.connect(buyer).purchaseAsset(tokenId), `purchaseAsset:${tokenId}`);
}

function expectedFeeBreakdown(amount, feeConfig, datasetRoyaltyBps = 0n, opts = {}) {
  const platformAmountRaw = (amount * BigInt(feeConfig.platformFee)) / 10_000n;
  const unionAmount = (amount * BigInt(feeConfig.unionShare)) / 10_000n;
  const devFundAmount = (amount * BigInt(feeConfig.devFund)) / 10_000n;
  const timewaveGiftAmount = (amount * BigInt(feeConfig.timewaveGift)) / 10_000n;
  const totalPlatformFees = platformAmountRaw + unionAmount + devFundAmount + timewaveGiftAmount;
  let platformAmount = platformAmountRaw;

  let buybackAmount = 0n;
  if (opts.buybackBps) {
    buybackAmount = (totalPlatformFees * BigInt(opts.buybackBps)) / 10_000n;
    platformAmount -= buybackAmount;
  }

  let stakingAmount = 0n;
  if (opts.stakingAllocationBps) {
    stakingAmount = (totalPlatformFees * BigInt(opts.stakingAllocationBps)) / 10_000n;
    if (stakingAmount > platformAmount) {
      stakingAmount = platformAmount;
    }
    platformAmount -= stakingAmount;
  }

  const creatorAmount = amount - totalPlatformFees;
  const datasetRoyaltyAmount = (amount * BigInt(datasetRoyaltyBps)) / 10_000n;
  const sellerProceeds = creatorAmount - datasetRoyaltyAmount;

  return {
    platformAmount,
    unionAmount,
    devFundAmount,
    timewaveGiftAmount,
    totalPlatformFees,
    creatorAmount,
    datasetRoyaltyAmount,
    sellerProceeds,
    buybackAmount,
    stakingAmount
  };
}

async function deployMarketplaceStack(rpcUrl, options = {}) {
  const feeConfig = options.feeConfig || {
    platformFee: 400n,
    referralFee: 0n,
    unionShare: 100n,
    devFund: 200n,
    timewaveGift: 150n,
    milestonePool: 0n
  };

  const {
    provider,
    founder,
    founderAddress,
    diamondAddress,
    diamondCut,
    access
  } = await deployBaseDiamondWithAccess(rpcUrl);

  const treasury = walletAt(provider, 1);
  const devFund = walletAt(provider, 2);
  const unionTreasury = walletAt(provider, 3);
  const creator = walletAt(provider, 4);
  const reseller = walletAt(provider, 5);
  const buyer = walletAt(provider, 6);
  const extra = walletAt(provider, 7);
  const signerA = walletAt(provider, 8);
  const signerB = walletAt(provider, 9);

  await fundEth(founder, [treasury, devFund, unionTreasury, creator, reseller, buyer, extra, signerA, signerB]);

  const mockUsdcArtifact = loadArtifact("out/MockUSDC.sol/MockUSDC.json");
  const usdc = await deploy(
    new ethers.ContractFactory(mockUsdcArtifact.abi, mockUsdcArtifact.bytecode.object, founder),
    "MockUSDC"
  );

  const voiceAssetArtifact = loadArtifact("out/VoiceAssetFacet.sol/VoiceAssetFacet.json");
  const voiceAssetInitArtifact = loadArtifact("out/VoiceAssetInit.sol/VoiceAssetInit.json");
  const voiceAssetFacet = await deploy(
    new ethers.ContractFactory(voiceAssetArtifact.abi, voiceAssetArtifact.bytecode.object, founder),
    "VoiceAssetFacet"
  );
  const voiceAssetInit = await deploy(
    new ethers.ContractFactory(voiceAssetInitArtifact.abi, voiceAssetInitArtifact.bytecode.object, founder),
    "VoiceAssetInit"
  );

  const voiceAssetInitParams = {
    defaultRoyaltyRate: 1000n,
    defaultPlatformFee: 500n,
    registrationFee: 0n,
    minQualityScore: 1n,
    requiredConfirmations: 1n,
    registrationPaused: false,
    baseURI: "ipfs://",
    defaultDuration: 30n * 24n * 60n * 60n,
    minLicenseFee: 1n,
    platformFeeBps: 500n,
    maxRoyaltyRate: 5000n,
    supportedChains: [31337n],
    verifiers: [],
    operators: [],
    withdrawalWhitelist: [],
    name: "Voice NFT",
    symbol: "VOICE"
  };
  const voiceSelectors = selectorsBySignature(voiceAssetArtifact.abi, [
    "registerVoiceAsset(string,uint256)",
    "getTokenId(bytes32)",
    "approveVoiceAsset(address,uint256)",
    "getApproved(uint256)",
    "isApprovedForAll(address,address)",
    "recordUsageFrom(bytes32,bytes32,address)",
    "recordRoyaltyPaymentFrom(bytes32,uint256,bytes32,address)",
    "ownerOf(uint256)",
    "safeTransferFrom(address,address,uint256)",
    "transferFrom(address,address,uint256)",
    "setApprovalForAll(address,bool)",
    "balanceOf(address)"
  ]);

  await sendAndWait(
    diamondCut.setTrustedInitContract(await voiceAssetInit.getAddress(), true, { gasLimit: 500_000 }),
    "setTrustedInitContract:VoiceAssetInit"
  );
  await sendAndWait(
    diamondCut.diamondCut(
      [{ facetAddress: await voiceAssetFacet.getAddress(), action: 0, functionSelectors: voiceSelectors }],
      await voiceAssetInit.getAddress(),
      new ethers.Interface(voiceAssetInitArtifact.abi).encodeFunctionData("init", [voiceAssetInitParams]),
      { gasLimit: 12_000_000 }
    ),
    "diamondCut:addVoiceAssetFacet"
  );

  let voiceTemplate;
  let voiceDataset;
  if (options.includeDataset !== false) {

    const datasetArtifact = loadArtifact("out/VoiceDatasetFacet.sol/VoiceDatasetFacet.json");
    const datasetInitArtifact = loadArtifact("out/VoiceDatasetInit.sol/VoiceDatasetInit.json");
    const datasetFacet = await deploy(
      new ethers.ContractFactory(datasetArtifact.abi, datasetArtifact.bytecode.object, founder),
      "VoiceDatasetFacet"
    );
    const datasetInit = await deploy(
      new ethers.ContractFactory(datasetInitArtifact.abi, datasetInitArtifact.bytecode.object, founder),
      "VoiceDatasetInit"
    );
    await sendAndWait(
      diamondCut.setTrustedInitContract(await datasetInit.getAddress(), true, { gasLimit: 500_000 }),
      "setTrustedInitContract:VoiceDatasetInit"
    );
    const datasetSelectors = selectorsBySignature(datasetArtifact.abi, [
      "createDataset(string,uint256[],uint256,string,uint96)",
      "royaltyInfo(uint256,uint256)",
      "getDataset(uint256)"
    ]);
    await sendAndWait(
      diamondCut.diamondCut(
        [{ facetAddress: await datasetFacet.getAddress(), action: 0, functionSelectors: datasetSelectors }],
        await datasetInit.getAddress(),
        new ethers.Interface(datasetInitArtifact.abi).encodeFunctionData("init", [{ maxAssetsPerDataset: 1000n }]),
        { gasLimit: 12_000_000 }
      ),
      "diamondCut:addVoiceDatasetFacet"
    );

    voiceDataset = new ethers.Contract(diamondAddress, datasetArtifact.abi, founder);
  }

  const paymentArtifact = loadArtifact("out/PaymentFacet.sol/PaymentFacet.json");
  const paymentInitArtifact = loadArtifact("out/PaymentInit.sol/PaymentInit.json");
  const escrowArtifact = loadArtifact("out/EscrowFacet.sol/EscrowFacet.json");
  const escrowInitArtifact = loadArtifact("out/EscrowInitializer.sol/EscrowInitializer.json");
  const marketplaceArtifact = loadArtifact("out/MarketplaceFacet.sol/MarketplaceFacet.json");
  const marketplaceInitArtifact = loadArtifact("out/MarketplaceInit.sol/MarketplaceInit.json");

  const paymentFacet = await deploy(
    new ethers.ContractFactory(paymentArtifact.abi, paymentArtifact.bytecode.object, founder),
    "PaymentFacet"
  );
  const paymentInit = await deploy(
    new ethers.ContractFactory(paymentInitArtifact.abi, paymentInitArtifact.bytecode.object, founder),
    "PaymentInit"
  );
  await sendAndWait(
    diamondCut.setTrustedInitContract(await paymentInit.getAddress(), true, { gasLimit: 500_000 }),
    "setTrustedInitContract:PaymentInit"
  );
  await sendAndWait(
    diamondCut.diamondCut(
      [{ facetAddress: await paymentFacet.getAddress(), action: 0, functionSelectors: selectorsForAbi(paymentArtifact.abi) }],
      await paymentInit.getAddress(),
      new ethers.Interface(paymentInitArtifact.abi).encodeFunctionData("initializePayment", [{
        treasuryAddress: await treasury.getAddress(),
        devFundAddress: await devFund.getAddress(),
        usdcToken: await usdc.getAddress(),
        feeConfig
      }]),
      { gasLimit: 12_000_000 }
    ),
    "diamondCut:addPaymentFacet"
  );

  const escrowFacet = await deploy(
    new ethers.ContractFactory(escrowArtifact.abi, escrowArtifact.bytecode.object, founder),
    "EscrowFacet"
  );
  const escrowInit = await deploy(
    new ethers.ContractFactory(escrowInitArtifact.abi, escrowInitArtifact.bytecode.object, founder),
    "EscrowInitializer"
  );
  await sendAndWait(
    diamondCut.setTrustedInitContract(await escrowInit.getAddress(), true, { gasLimit: 500_000 }),
    "setTrustedInitContract:EscrowInitializer"
  );
  await sendAndWait(
    diamondCut.diamondCut(
      [{ facetAddress: await escrowFacet.getAddress(), action: 0, functionSelectors: selectorsForAbi(escrowArtifact.abi) }],
      await escrowInit.getAddress(),
      new ethers.Interface(escrowInitArtifact.abi).encodeFunctionData("initialize", []),
      { gasLimit: 12_000_000 }
    ),
    "diamondCut:addEscrowFacet"
  );

  const marketplaceFacet = await deploy(
    new ethers.ContractFactory(marketplaceArtifact.abi, marketplaceArtifact.bytecode.object, founder),
    "MarketplaceFacet"
  );
  const marketplaceInit = await deploy(
    new ethers.ContractFactory(marketplaceInitArtifact.abi, marketplaceInitArtifact.bytecode.object, founder),
    "MarketplaceInit"
  );
  await sendAndWait(
    diamondCut.setTrustedInitContract(await marketplaceInit.getAddress(), true, { gasLimit: 500_000 }),
    "setTrustedInitContract:MarketplaceInit"
  );
  await sendAndWait(
    diamondCut.diamondCut(
      [{ facetAddress: await marketplaceFacet.getAddress(), action: 0, functionSelectors: selectorsForAbi(marketplaceArtifact.abi) }],
      await marketplaceInit.getAddress(),
      new ethers.Interface(marketplaceInitArtifact.abi).encodeFunctionData("initializeMarketplace", [{
        platformAdmin: founderAddress,
        treasuryAddress: await treasury.getAddress(),
        devFundAddress: await devFund.getAddress(),
        unionTreasuryAddress: await unionTreasury.getAddress(),
        platformFee: feeConfig.platformFee,
        referralFee: feeConfig.referralFee,
        unionShare: feeConfig.unionShare,
        devFund: feeConfig.devFund,
        timewaveGift: feeConfig.timewaveGift,
        milestonePool: feeConfig.milestonePool
      }]),
      { gasLimit: 12_000_000 }
    ),
    "diamondCut:addMarketplaceFacet"
  );

  const voiceAsset = new ethers.Contract(diamondAddress, voiceAssetArtifact.abi, founder);
  const payment = new ethers.Contract(diamondAddress, paymentArtifact.abi, founder);
  const escrow = new ethers.Contract(diamondAddress, escrowArtifact.abi, founder);
  const marketplace = new ethers.Contract(diamondAddress, marketplaceArtifact.abi, founder);

  if (!(await access.hasRole(ROLE.TIMELOCK_ROLE, founderAddress))) {
    await sendAndWait(access.connect(founder).grantRole(ROLE.TIMELOCK_ROLE, founderAddress, ethers.MaxUint256), "grantRole:TIMELOCK_ROLE");
  }
  if (!(await access.hasRole(ROLE.PLATFORM_ADMIN_ROLE, founderAddress))) {
    await sendAndWait(
      access.connect(founder).grantRole(ROLE.PLATFORM_ADMIN_ROLE, founderAddress, ethers.MaxUint256),
      "grantRole:PLATFORM_ADMIN_ROLE"
    );
  }
  if (!(await access.hasRole(ROLE.FEE_MANAGER_ROLE, founderAddress))) {
    await sendAndWait(
      access.connect(founder).grantRole(ROLE.FEE_MANAGER_ROLE, founderAddress, ethers.MaxUint256),
      "grantRole:FEE_MANAGER_ROLE"
    );
  }
  if (!(await access.hasRole(GOVERNANCE_ROLE, founderAddress))) {
    await sendAndWait(
      access.connect(founder).grantRole(GOVERNANCE_ROLE, founderAddress, ethers.MaxUint256),
      "grantRole:GOVERNANCE_ROLE"
    );
  }
  if (!(await access.hasRole(ROLE.EMERGENCY_ADMIN_ROLE, founderAddress))) {
    await sendAndWait(
      access.connect(founder).grantRole(ROLE.EMERGENCY_ADMIN_ROLE, founderAddress, ethers.MaxUint256),
      "grantRole:EMERGENCY_ADMIN_ROLE"
    );
  }

  if (options.seedMultisigThreshold) {
    const seedArtifact = loadArtifact("out/MarketplaceScenarioMocks.sol/PaymentOperationalSeedInit.json");
    const seedInit = await deploy(
      new ethers.ContractFactory(seedArtifact.abi, seedArtifact.bytecode.object, founder),
      "PaymentOperationalSeedInit"
    );
    await sendAndWait(
      diamondCut.setTrustedInitContract(await seedInit.getAddress(), true, { gasLimit: 500_000 }),
      "setTrustedInitContract:PaymentOperationalSeedInit"
    );
    await sendAndWait(
      diamondCut.diamondCut(
        [],
        await seedInit.getAddress(),
        new ethers.Interface(seedArtifact.abi).encodeFunctionData("seedTreasuryMultisigThreshold", [options.seedMultisigThreshold]),
        { gasLimit: 4_000_000 }
      ),
      "diamondCut:seedTreasuryMultisigThreshold"
    );
  }

  return {
    provider,
    founder,
    founderAddress,
    diamondAddress,
    diamondCut,
    access,
    usdc,
    voiceAsset,
    voiceDataset,
    voiceDataset,
    payment,
    escrow,
    marketplace,
    feeConfig,
    wallets: { treasury, devFund, unionTreasury, creator, reseller, buyer, extra, signerA, signerB }
  };
}

module.exports = {
  ONE_DAY,
  ROLE,
  walletAt,
  loadArtifact,
  sendAndWait,
  deploy,
  advanceTime,
  deployMarketplaceStack,
  registerVoice,

  createDataset,
  listAsset,
  purchaseAsset,
  expectedFeeBreakdown,
  ensureRole
};
