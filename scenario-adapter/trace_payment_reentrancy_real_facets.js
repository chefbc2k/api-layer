#!/usr/bin/env node
"use strict";

const { ethers } = require("ethers");
require("dotenv").config();
const {
  ROLE,
  GOVERNANCE_ROLE,
  loadArtifact,
  selectorsForAbi,
  sendAndWait,
  deploy,
  deployBaseDiamondWithAccess,
  ensureRole
} = require("./lib/reentrancy_real_helpers");

const RPC_URL = process.env.RPC_URL;
const UNAUTHORIZED_REENTRANT_SELECTOR = ethers.id("UnauthorizedReentrantCall()").slice(0, 10);

async function main() {
  const { founder, diamondAddress, diamondCut, access } = await deployBaseDiamondWithAccess(RPC_URL);
  await ensureRole(access, founder, ROLE.TIMELOCK_ROLE, "TIMELOCK_ROLE");
  await ensureRole(access, founder, ROLE.FEE_MANAGER_ROLE, "FEE_MANAGER_ROLE");
  await ensureRole(access, founder, GOVERNANCE_ROLE, "GOVERNANCE_ROLE");

  const paymentArtifact = loadArtifact("out/PaymentFacet.sol/PaymentFacet.json");
  const paymentInitArtifact = loadArtifact("out/PaymentInit.sol/PaymentInit.json");
  const reentryTokenArtifact = loadArtifact("out/RealFacetReentrancyMocks.sol/CallbackReentrantERC20.json");
  const routerArtifact = loadArtifact("out/RealFacetReentrancyMocks.sol/ReentrantBuybackRouter.json");
  const seedArtifact = loadArtifact("out/RealFacetReentrancyMocks.sol/PaymentSeedInit.json");

  const paymentFacet = await deploy(
    new ethers.ContractFactory(paymentArtifact.abi, paymentArtifact.bytecode.object, founder),
    "PaymentFacet"
  );
  const paymentInit = await deploy(
    new ethers.ContractFactory(paymentInitArtifact.abi, paymentInitArtifact.bytecode.object, founder),
    "PaymentInit"
  );
  const usdc = await deploy(
    new ethers.ContractFactory(reentryTokenArtifact.abi, reentryTokenArtifact.bytecode.object, founder),
    "CallbackReentrantERC20:USDC",
    "Mock USDC",
    "mUSDC",
    6
  );
  const uspk = await deploy(
    new ethers.ContractFactory(reentryTokenArtifact.abi, reentryTokenArtifact.bytecode.object, founder),
    "CallbackReentrantERC20:USPK",
    "Mock USPK",
    "mUSPK",
    18
  );
  const router = await deploy(
    new ethers.ContractFactory(routerArtifact.abi, routerArtifact.bytecode.object, founder),
    "ReentrantBuybackRouter"
  );
  const seedInit = await deploy(
    new ethers.ContractFactory(seedArtifact.abi, seedArtifact.bytecode.object, founder),
    "PaymentSeedInit"
  );

  const feeConfig = {
    platformFee: 500,
    unionShare: 100,
    devFund: 100,
    timewaveGift: 100,
    referralFee: 0,
    milestonePool: 0
  };

  const initData = new ethers.Interface(paymentInitArtifact.abi).encodeFunctionData("initializePayment", [{
    treasuryAddress: await founder.getAddress(),
    devFundAddress: await founder.getAddress(),
    usdcToken: await usdc.getAddress(),
    feeConfig
  }]);

  await sendAndWait(
    diamondCut.setTrustedInitContract(await paymentInit.getAddress(), true, { gasLimit: 500_000 }),
    "setTrustedInitContract:PaymentInit"
  );
  await sendAndWait(
    diamondCut.diamondCut(
      [{ facetAddress: await paymentFacet.getAddress(), action: 0, functionSelectors: selectorsForAbi(paymentArtifact.abi) }],
      await paymentInit.getAddress(),
      initData,
      { gasLimit: 12_000_000 }
    ),
    "diamondCut:addPaymentFacet"
  );

  const payment = new ethers.Contract(diamondAddress, paymentArtifact.abi, founder);
  await sendAndWait(
    payment.setBuybackConfig(2000, 1, 1, 1, await router.getAddress(), await uspk.getAddress(), ethers.ZeroAddress),
    "setBuybackConfig"
  );

  await sendAndWait(
    diamondCut.setTrustedInitContract(await seedInit.getAddress(), true, { gasLimit: 500_000 }),
    "setTrustedInitContract:PaymentSeedInit"
  );
  await sendAndWait(
    diamondCut.diamondCut(
      [],
      await seedInit.getAddress(),
      new ethers.Interface(seedArtifact.abi).encodeFunctionData("seedBuybackState", [1_000_000n, 1n, 1n]),
      { gasLimit: 4_000_000 }
    ),
    "diamondCut:seedBuybackState"
  );

  await sendAndWait(router.setReturnAmount(50n * 10n ** 18n), "router:setReturnAmount");
  await sendAndWait(
    router.armAttack(
      diamondAddress,
      payment.interface.encodeFunctionData("executeQuarterlyBuyback", [100_000n, 1n])
    ),
    "router:armAttack"
  );

  const before = await payment.getBuybackStatus();
  await sendAndWait(payment.executeQuarterlyBuyback(100_000n, 1n, { gasLimit: 4_000_000 }), "executeQuarterlyBuyback");
  const after = await payment.getBuybackStatus();

  if (after.accumulator !== before.accumulator - 100_000n) {
    throw new Error(`buyback accumulator should decrement once: before=${before.accumulator} after=${after.accumulator}`);
  }
  if (await router.lastCallSuccess()) {
    throw new Error("router reentrant call should fail under PaymentFacet nonReentrant guard");
  }

  const lastCallData = await router.lastCallData();
  if (!lastCallData.startsWith(UNAUTHORIZED_REENTRANT_SELECTOR)) {
    throw new Error(`unexpected payment reentry revert selector: ${lastCallData.slice(0, 10)}`);
  }

  console.log("TRACE_PAYMENT_REENTRANCY_REAL_FACETS: PASS");
}

main().catch((err) => {
  console.error("TRACE_PAYMENT_REENTRANCY_REAL_FACETS: FAIL");
  console.error(err);
  process.exit(1);
});
