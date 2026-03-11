#!/usr/bin/env node
"use strict";

const { ethers } = require("ethers");
require("dotenv").config();
const {
  loadArtifact,
  selectorsForAbi,
  sendAndWait,
  deploy,
  advanceTime,
  deployBaseDiamondWithAccess
} = require("./lib/reentrancy_real_helpers");

const RPC_URL = process.env.RPC_URL;
const DAY = 24 * 60 * 60;

async function main() {
  if (!RPC_URL) throw new Error("RPC_URL is required");
  const network = await new ethers.JsonRpcProvider(RPC_URL).getNetwork();
  if (network.chainId !== 31337n) {
    throw new Error("trace_marketplace_purchase_receiver_proof is local-stack only; Base Sepolia parity is blocked until this scenario is rewritten to use the deployed baseline instead of deployBaseDiamondWithAccess/advanceTime");
  }
  const { provider, founder, founderAddress, diamondAddress, diamondCut } = await deployBaseDiamondWithAccess(RPC_URL);

  const voiceAssetArtifact = loadArtifact("out/VoiceAssetFacet.sol/VoiceAssetFacet.json");
  const voiceAssetInitArtifact = loadArtifact("out/VoiceAssetInit.sol/VoiceAssetInit.json");
  const paymentArtifact = loadArtifact("out/PaymentFacet.sol/PaymentFacet.json");
  const paymentInitArtifact = loadArtifact("out/PaymentInit.sol/PaymentInit.json");
  const escrowArtifact = loadArtifact("out/EscrowFacet.sol/EscrowFacet.json");
  const escrowInitArtifact = loadArtifact("out/EscrowInitializer.sol/EscrowInitializer.json");
  const marketplaceArtifact = loadArtifact("out/MarketplaceFacet.sol/MarketplaceFacet.json");
  const marketplaceInitArtifact = loadArtifact("out/MarketplaceInit.sol/MarketplaceInit.json");
  const mockUsdcArtifact = loadArtifact("out/MockERC20.sol/MockERC20.json");
  const receiverArtifact = loadArtifact("out/RealFacetReentrancyMocks.sol/MarketplaceReceiverProbe.json");

  const usdc = await deploy(
    new ethers.ContractFactory(mockUsdcArtifact.abi, mockUsdcArtifact.bytecode.object || mockUsdcArtifact.bytecode, founder),
    "MockERC20:USDC"
  );
  const receiver = await deploy(
    new ethers.ContractFactory(receiverArtifact.abi, receiverArtifact.bytecode.object, founder),
    "MarketplaceReceiverProbe"
  );

  const voiceAssetFacet = await deploy(
    new ethers.ContractFactory(voiceAssetArtifact.abi, voiceAssetArtifact.bytecode.object, founder),
    "VoiceAssetFacet"
  );
  const voiceAssetInit = await deploy(
    new ethers.ContractFactory(voiceAssetInitArtifact.abi, voiceAssetInitArtifact.bytecode.object, founder),
    "VoiceAssetInit"
  );

  const supportedChains = [31337n];
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
    supportedChains,
    verifiers: [],
    operators: [],
    withdrawalWhitelist: [],
    name: "Voice NFT",
    symbol: "VOICE"
  };
  const voiceIface = new ethers.Interface(voiceAssetArtifact.abi);
  const voiceSelectors = [
    "registerVoiceAsset(string,uint256)",
    "getTokenId(bytes32)",
    "approveVoiceAsset(address,uint256)",
    "getApproved(uint256)",
    "isApprovedForAll(address,address)",
    "recordUsageFrom(bytes32,bytes32,address)",
    "recordRoyaltyPaymentFrom(bytes32,uint256,bytes32,address)",
    "ownerOf(uint256)",
    "safeTransferFrom(address,address,uint256)",
    "transferFrom(address,address,uint256)"
  ].map((signature) => voiceIface.getFunction(signature).selector);

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

  const paymentFacet = await deploy(
    new ethers.ContractFactory(paymentArtifact.abi, paymentArtifact.bytecode.object, founder),
    "PaymentFacet"
  );
  const paymentInit = await deploy(
    new ethers.ContractFactory(paymentInitArtifact.abi, paymentInitArtifact.bytecode.object, founder),
    "PaymentInit"
  );

  const feeConfig = {
    platformFee: 500n,
    referralFee: 0n,
    unionShare: 100n,
    devFund: 250n,
    timewaveGift: 0n,
    milestonePool: 0n
  };

  await sendAndWait(
    diamondCut.setTrustedInitContract(await paymentInit.getAddress(), true, { gasLimit: 500_000 }),
    "setTrustedInitContract:PaymentInit"
  );
  await sendAndWait(
    diamondCut.diamondCut(
      [{ facetAddress: await paymentFacet.getAddress(), action: 0, functionSelectors: selectorsForAbi(paymentArtifact.abi) }],
      await paymentInit.getAddress(),
      new ethers.Interface(paymentInitArtifact.abi).encodeFunctionData("initializePayment", [{
        treasuryAddress: founderAddress,
        devFundAddress: founderAddress,
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
        treasuryAddress: founderAddress,
        devFundAddress: founderAddress,
        unionTreasuryAddress: founderAddress,
        platformFee: 500n,
        referralFee: 0n,
        unionShare: 100n,
        devFund: 250n,
        timewaveGift: 0n,
        milestonePool: 0n
      }]),
      { gasLimit: 12_000_000 }
    ),
    "diamondCut:addMarketplaceFacet"
  );

  const voiceAsset = new ethers.Contract(diamondAddress, voiceAssetArtifact.abi, founder);
  const marketplace = new ethers.Contract(diamondAddress, marketplaceArtifact.abi, founder);

  const controlHash = await voiceAsset.registerVoiceAsset.staticCall("ipfs://receiver-proof-control", 1000);
  await sendAndWait(voiceAsset.registerVoiceAsset("ipfs://receiver-proof-control", 1000), "registerVoiceAsset:control");
  const controlTokenId = await voiceAsset.getTokenId(controlHash);

  const saleHash = await voiceAsset.registerVoiceAsset.staticCall("ipfs://receiver-proof-sale", 1000);
  await sendAndWait(voiceAsset.registerVoiceAsset("ipfs://receiver-proof-sale", 1000), "registerVoiceAsset:sale");
  const saleTokenId = await voiceAsset.getTokenId(saleHash);

  await sendAndWait(
    voiceAsset["safeTransferFrom(address,address,uint256)"](founderAddress, await receiver.getAddress(), controlTokenId),
    "safeTransferFrom:controlToReceiver"
  );

  const countAfterSafe = await receiver.receivedCount();
  if (countAfterSafe !== 1n) {
    throw new Error(`receiver control hook should increment under safeTransferFrom, got count=${countAfterSafe}`);
  }

  await advanceTime(provider, DAY + 1);

  const price = 50n * 1_000_000n;
  await sendAndWait(voiceAsset.approveVoiceAsset(diamondAddress, saleTokenId), "approveVoiceAsset:sale");
  await sendAndWait(marketplace.listAsset(saleTokenId, price, 0), "listAsset:sale");

  await sendAndWait(usdc.mint(await receiver.getAddress(), 1_000_000_000n), "mintUSDC:receiver");
  await sendAndWait(receiver.approveToken(await usdc.getAddress(), diamondAddress, ethers.MaxUint256), "receiver:approveUSDC");
  await sendAndWait(receiver.purchase(diamondAddress, saleTokenId, { gasLimit: 4_000_000 }), "receiver:purchaseAsset");
  if (!(await receiver.lastPurchaseSuccess())) {
    const raw = await receiver.lastPurchaseData();
    throw new Error(`receiver purchase should succeed, raw revert=${raw.slice(0, 10)}`);
  }

  const ownerAfter = await voiceAsset.ownerOf(saleTokenId);
  if (ownerAfter.toLowerCase() !== (await receiver.getAddress()).toLowerCase()) {
    throw new Error("receiver contract should own purchased asset after purchaseAsset");
  }

  const countAfterPurchase = await receiver.receivedCount();
  if (countAfterPurchase !== 1n) {
    throw new Error(
      `purchaseAsset should not trigger onERC721Received; expected receiver count to stay 1, got ${countAfterPurchase}`
    );
  }

  console.log("TRACE_MARKETPLACE_PURCHASE_RECEIVER_PROOF: PASS");
}

main().catch((err) => {
  console.error("TRACE_MARKETPLACE_PURCHASE_RECEIVER_PROOF: FAIL");
  console.error(err);
  process.exit(1);
});
