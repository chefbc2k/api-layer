#!/usr/bin/env node
"use strict";

const { ethers } = require("ethers");
require("dotenv").config();
const {
  ROLE,
  VESTING_MANAGER_ROLE,
  loadArtifact,
  selectorsForAbi,
  sendAndWait,
  deploy,
  advanceTime,
  deployBaseDiamondWithAccess,
  ensureRole
} = require("./lib/reentrancy_real_helpers");

const RPC_URL = process.env.RPC_URL;
const UNAUTHORIZED_REENTRANT_SELECTOR = ethers.id("UnauthorizedReentrantCall()").slice(0, 10);

async function main() {
  const { founder, founderAddress, diamondAddress, diamondCut, access } = await deployBaseDiamondWithAccess(RPC_URL);
  await ensureRole(access, founder, ROLE.TIMELOCK_ROLE, "TIMELOCK_ROLE");
  await ensureRole(access, founder, VESTING_MANAGER_ROLE, "VESTING_MANAGER_ROLE");

  const paymentArtifact = loadArtifact("out/PaymentFacet.sol/PaymentFacet.json");
  const paymentInitArtifact = loadArtifact("out/PaymentInit.sol/PaymentInit.json");
  const timewaveArtifact = loadArtifact("out/TimewaveGiftFacet.sol/TimewaveGiftFacet.json");
  const timewaveInitArtifact = loadArtifact("out/TimewaveVestingInitializer.sol/TimewaveVestingInitializer.json");
  const tokenArtifact = loadArtifact("out/RealFacetReentrancyMocks.sol/CallbackReentrantERC20.json");
  const attackerArtifact = loadArtifact("out/RealFacetReentrancyMocks.sol/FacetCallbackAttacker.json");

  const paymentFacet = await deploy(
    new ethers.ContractFactory(paymentArtifact.abi, paymentArtifact.bytecode.object, founder),
    "PaymentFacet"
  );
  const paymentInit = await deploy(
    new ethers.ContractFactory(paymentInitArtifact.abi, paymentInitArtifact.bytecode.object, founder),
    "PaymentInit"
  );
  const usdc = await deploy(
    new ethers.ContractFactory(tokenArtifact.abi, tokenArtifact.bytecode.object, founder),
    "CallbackReentrantERC20:timewaveUSDC",
    "TWAVE USDC",
    "twUSDC",
    6
  );
  const timewaveInit = await deploy(
    new ethers.ContractFactory(timewaveInitArtifact.abi, timewaveInitArtifact.bytecode.object, founder),
    "TimewaveVestingInitializer"
  );
  const timewaveFacet = await deploy(
    new ethers.ContractFactory(timewaveArtifact.abi, timewaveArtifact.bytecode.object, founder),
    "TimewaveGiftFacet"
  );

  const paymentInitData = new ethers.Interface(paymentInitArtifact.abi).encodeFunctionData("initializePayment", [{
    treasuryAddress: founderAddress,
    devFundAddress: founderAddress,
    usdcToken: await usdc.getAddress(),
    feeConfig: {
      platformFee: 500,
      unionShare: 100,
      devFund: 100,
      timewaveGift: 100,
      referralFee: 0,
      milestonePool: 0
    }
  }]);

  await sendAndWait(
    diamondCut.setTrustedInitContract(await paymentInit.getAddress(), true, { gasLimit: 500_000 }),
    "setTrustedInitContract:PaymentInit"
  );
  await sendAndWait(
    diamondCut.diamondCut(
      [{ facetAddress: await paymentFacet.getAddress(), action: 0, functionSelectors: selectorsForAbi(paymentArtifact.abi) }],
      await paymentInit.getAddress(),
      paymentInitData,
      { gasLimit: 12_000_000 }
    ),
    "diamondCut:addPaymentFacet"
  );

  await sendAndWait(
    diamondCut.setTrustedInitContract(await timewaveInit.getAddress(), true, { gasLimit: 500_000 }),
    "setTrustedInitContract:TimewaveVestingInitializer"
  );
  await sendAndWait(
    diamondCut.diamondCut(
      [{ facetAddress: await timewaveFacet.getAddress(), action: 0, functionSelectors: selectorsForAbi(timewaveArtifact.abi) }],
      await timewaveInit.getAddress(),
      new ethers.Interface(timewaveInitArtifact.abi).encodeFunctionData("initialize", [founderAddress]),
      { gasLimit: 12_000_000 }
    ),
    "diamondCut:addTimewaveFacet"
  );

  const timewave = new ethers.Contract(diamondAddress, timewaveArtifact.abi, founder);
  const attacker = await deploy(
    new ethers.ContractFactory(attackerArtifact.abi, attackerArtifact.bytecode.object, founder),
    "FacetCallbackAttacker:timewave",
    diamondAddress,
    await usdc.getAddress()
  );
  const attackerAddress = await attacker.getAddress();

  await sendAndWait(usdc.mint(diamondAddress, 10_000_000n * 1_000_000n), "mintUSDC:diamond");

  const latest = await founder.provider.getBlock("latest");
  const startTime = BigInt(latest.timestamp) + 15n;
  await sendAndWait(
    timewave.createUsdcVestingSchedule(attackerAddress, 1_000_000n * 1_000_000n, startTime, 30n * 24n * 60n * 60n, 0n, false, true),
    "createUsdcVestingSchedule"
  );

  await advanceTime(founder.provider, 30);

  await sendAndWait(
    usdc.armAttack(
      attackerAddress,
      attacker.interface.encodeFunctionData("onTokenCallback"),
      true,
      false
    ),
    "usdc:armAttack:release"
  );

  const before = await usdc.balanceOf(attackerAddress);
  await sendAndWait(attacker.startReleaseTwaveAttack({ gasLimit: 3_000_000 }), "attacker:startReleaseTwaveAttack");
  const after = await usdc.balanceOf(attackerAddress);
  if (after <= before) {
    throw new Error("releaseTwaveVesting should still pay beneficiary after blocked reentry");
  }
  if (await attacker.lastReenterSuccess()) {
    throw new Error("timewave reentrant release should fail under nonReentrant guard");
  }
  if (!(await attacker.lastReenterData()).startsWith(UNAUTHORIZED_REENTRANT_SELECTOR)) {
    throw new Error(`unexpected timewave reentry revert selector: ${(await attacker.lastReenterData()).slice(0, 10)}`);
  }

  console.log("TRACE_TIMEWAVE_REENTRANCY_REAL_FACETS: PASS");
}

main().catch((err) => {
  console.error("TRACE_TIMEWAVE_REENTRANCY_REAL_FACETS: FAIL");
  console.error(err);
  process.exit(1);
});
