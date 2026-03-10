#!/usr/bin/env node
"use strict";

const { ethers } = require("ethers");
require("dotenv").config();
const {
  ROLE,
  loadArtifact,
  selectorsForAbi,
  sendAndWait,
  deploy,
  advanceTime,
  deployBaseDiamondWithAccess,
  ensureRole
} = require("./lib/reentrancy_real_helpers");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const UNAUTHORIZED_REENTRANT_SELECTOR = ethers.id("UnauthorizedReentrantCall()").slice(0, 10);
const DAY = 24 * 60 * 60;

async function main() {
  const { founder, diamondAddress, diamondCut, access } = await deployBaseDiamondWithAccess(RPC_URL);
  await ensureRole(access, founder, ROLE.TIMELOCK_ROLE, "TIMELOCK_ROLE");
  await ensureRole(access, founder, ROLE.PLATFORM_ADMIN_ROLE, "PLATFORM_ADMIN_ROLE");

  const stakingArtifact = loadArtifact("out/StakingFacet.sol/StakingFacet.json");
  const tokenArtifact = loadArtifact("out/RealFacetReentrancyMocks.sol/CallbackReentrantERC20.json");
  const attackerArtifact = loadArtifact("out/RealFacetReentrancyMocks.sol/FacetCallbackAttacker.json");

  const stakingFacet = await deploy(
    new ethers.ContractFactory(stakingArtifact.abi, stakingArtifact.bytecode.object, founder),
    "StakingFacet"
  );
  const token = await deploy(
    new ethers.ContractFactory(tokenArtifact.abi, tokenArtifact.bytecode.object, founder),
    "CallbackReentrantERC20:staking",
    "Stake Token",
    "sUSPK",
    10
  );

  await sendAndWait(
    diamondCut.diamondCut(
      [{ facetAddress: await stakingFacet.getAddress(), action: 0, functionSelectors: selectorsForAbi(stakingArtifact.abi) }],
      ethers.ZeroAddress,
      "0x",
      { gasLimit: 12_000_000 }
    ),
    "diamondCut:addStakingFacet"
  );

  const staking = new ethers.Contract(diamondAddress, stakingArtifact.abi, founder);
  await sendAndWait(
    staking.initStakingWithToken(
      await token.getAddress(),
      1,
      1,
      1200,
      [1_000n * 10n ** 10n, 10_000n * 10n ** 10n],
      [15_000, 10_000, 5_000]
    ),
    "initStakingWithToken"
  );

  const attacker = await deploy(
    new ethers.ContractFactory(attackerArtifact.abi, attackerArtifact.bytecode.object, founder),
    "FacetCallbackAttacker:staking",
    diamondAddress,
    await token.getAddress()
  );
  const attackerAddress = await attacker.getAddress();
  const founderAddress = await founder.getAddress();

  await sendAndWait(token.mint(founderAddress, 500_000n * 10n ** 10n), "mint:founder");
  await sendAndWait(token.mint(attackerAddress, 20_000n * 10n ** 10n), "mint:attacker");
  await sendAndWait(token.approve(diamondAddress, ethers.MaxUint256), "approve:founder");
  await sendAndWait(staking.fundRewardPool(100_000n * 10n ** 10n), "fundRewardPool");
  await sendAndWait(attacker.approveDiamond(ethers.MaxUint256), "attacker:approveDiamond");

  await sendAndWait(
    token.armAttack(
      attackerAddress,
      attacker.interface.encodeFunctionData("onTokenCallback"),
      false,
      true
    ),
    "token:armAttack:stake"
  );
  await sendAndWait(attacker.startStakeAttack(5_000n * 10n ** 10n, { gasLimit: 4_000_000 }), "attacker:startStakeAttack");
  if (await attacker.lastReenterSuccess()) {
    throw new Error("staking reentrant stake should fail under nonReentrant guard");
  }
  if (!(await attacker.lastReenterData()).startsWith(UNAUTHORIZED_REENTRANT_SELECTOR)) {
    throw new Error(`unexpected stake reentry revert selector: ${(await attacker.lastReenterData()).slice(0, 10)}`);
  }

  await advanceTime(founder.provider, 31 * DAY);
  await sendAndWait(
    token.armAttack(
      attackerAddress,
      attacker.interface.encodeFunctionData("onTokenCallback"),
      true,
      false
    ),
    "token:armAttack:claim"
  );
  const claimBefore = await token.balanceOf(attackerAddress);
  await sendAndWait(attacker.startClaimRewardsAttack({ gasLimit: 4_000_000 }), "attacker:startClaimRewardsAttack");
  const claimAfter = await token.balanceOf(attackerAddress);
  if (claimAfter <= claimBefore) {
    throw new Error("claimRewards should still pay attacker after blocked reentry");
  }
  if (await attacker.lastReenterSuccess()) {
    throw new Error("staking reentrant claim should fail under nonReentrant guard");
  }
  if (!(await attacker.lastReenterData()).startsWith(UNAUTHORIZED_REENTRANT_SELECTOR)) {
    throw new Error(`unexpected claim reentry revert selector: ${(await attacker.lastReenterData()).slice(0, 10)}`);
  }

  await sendAndWait(attacker.requestUnstake(2_000n * 10n ** 10n), "attacker:requestUnstake");
  await advanceTime(founder.provider, 2);
  await sendAndWait(
    token.armAttack(
      attackerAddress,
      attacker.interface.encodeFunctionData("onTokenCallback"),
      true,
      false
    ),
    "token:armAttack:unstake"
  );
  const unstakeBefore = await token.balanceOf(attackerAddress);
  await sendAndWait(attacker.startExecuteUnstakeAttack({ gasLimit: 5_000_000 }), "attacker:startExecuteUnstakeAttack");
  const unstakeAfter = await token.balanceOf(attackerAddress);
  if (unstakeAfter <= unstakeBefore) {
    throw new Error("executeUnstake should still transfer tokens after blocked reentry");
  }
  if (await attacker.lastReenterSuccess()) {
    throw new Error("staking reentrant executeUnstake should fail under nonReentrant guard");
  }
  if (!(await attacker.lastReenterData()).startsWith(UNAUTHORIZED_REENTRANT_SELECTOR)) {
    throw new Error(`unexpected executeUnstake reentry revert selector: ${(await attacker.lastReenterData()).slice(0, 10)}`);
  }

  console.log("TRACE_STAKING_REENTRANCY_REAL_FACETS: PASS");
}

main().catch((err) => {
  console.error("TRACE_STAKING_REENTRANCY_REAL_FACETS: FAIL");
  console.error(err);
  process.exit(1);
});
