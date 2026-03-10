#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
require("dotenv").config();

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const DAY = 24 * 60 * 60;
const TOKEN_UNIT = 10n ** 10n;
const PLATFORM_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PLATFORM_ADMIN_ROLE"));

function loadArtifact(relPath) {
  const file = path.join(process.cwd(), relPath);
  if (!fs.existsSync(file)) throw new Error(`Missing artifact: ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

async function sendAndWait(txPromise, label) {
  const tx = await txPromise;
  console.log(`[tx] ${label} from=${tx.from} nonce=${tx.nonce} sel=${(tx.data || "0x").slice(0, 10)} hash=${tx.hash}`);
  for (let i = 0; i < 120; i++) {
    const receipt = await tx.provider.getTransactionReceipt(tx.hash);
    if (receipt) {
      if (receipt.status !== 1n && receipt.status !== 1) {
        throw new Error(`${label}: transaction reverted hash=${tx.hash}`);
      }
      return receipt;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`${label}: receipt timeout hash=${tx.hash}`);
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

async function advanceTime(provider, seconds) {
  await provider.send("evm_increaseTime", [seconds]);
  await provider.send("evm_mine", []);
}

async function ensureRole(access, signer, roleId, account, label) {
  if (await access.hasRole(roleId, account)) return;
  await sendAndWait(access.connect(signer).grantRole(roleId, account, ethers.MaxUint256), `grantRole:${label}`);
}

async function forceDegradedMode(echo, founder, provider) {
  await sendAndWait(echo.connect(founder).setOracleStalenessConfig(1, { gasLimit: 1_000_000 }), "setOracleStalenessConfig:1s");
  await advanceTime(provider, 2);
  const healthy = await echo.isOracleHealthy();
  if (healthy) throw new Error("oracle should be stale so degraded mode is active");
}

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const founder = new ethers.NonceManager(new ethers.Wallet(PRIVATE_KEY, provider));
  const outsider = new ethers.NonceManager(ethers.Wallet.createRandom().connect(provider));
  const staker = new ethers.NonceManager(ethers.Wallet.createRandom().connect(provider));
  const founderAddress = await founder.getAddress();
  const outsiderAddress = await outsider.getAddress();
  const stakerAddress = await staker.getAddress();

  const access = new ethers.Contract(
    DIAMOND_ADDRESS,
    loadArtifact("out/AccessControlFacet.sol/AccessControlFacet.json").abi,
    provider
  );
  const token = new ethers.Contract(
    DIAMOND_ADDRESS,
    loadArtifact("out/TokenSupplyFacet.sol/TokenSupplyFacet.json").abi,
    provider
  );
  const staking = new ethers.Contract(
    DIAMOND_ADDRESS,
    loadArtifact("out/StakingFacet.sol/StakingFacet.json").abi,
    provider
  );
  const echo = new ethers.Contract(
    DIAMOND_ADDRESS,
    loadArtifact("out/EchoScoreFacetV3.sol/EchoScoreFacetV3.json").abi,
    provider
  );

  const thresholds = [10_000n, 50_000n, 200_000n, 500_000n].map((v) => v * TOKEN_UNIT);
  const multipliers = [15_000n, 12_500n, 10_000n, 7_500n, 5_000n];
  const stakeAmount = 2_000n * TOKEN_UNIT;
  const rewardFundAmount = 50_000n * TOKEN_UNIT;

  await sendAndWait(founder.sendTransaction({ to: outsiderAddress, value: ethers.parseEther("1") }), "fundETH:outsider");
  await sendAndWait(founder.sendTransaction({ to: stakerAddress, value: ethers.parseEther("1") }), "fundETH:staker");
  await ensureRole(access, founder, PLATFORM_ADMIN_ROLE, founderAddress, "PLATFORM_ADMIN_ROLE");

  await expectRevert(
    () => staking.connect(outsider).setStakingPaused(true, { gasLimit: 1_000_000 }),
    "unauthorized:setStakingPaused"
  );

  await expectRevert(
    () => staking.connect(founder).queueTierConfigUpdate([100n, 90n], [15_000n, 10_000n, 5_000n], { gasLimit: 2_000_000 }),
    "invalid:queueTierConfigUpdate:thresholdsNotIncreasing"
  );

  await expectRevert(
    () => staking.connect(founder).setDegradedModeConfig(true, 0, 1, { gasLimit: 1_000_000 }),
    "invalid:setDegradedModeConfig:zeroStaleAfter"
  );
  await expectRevert(
    () => staking.connect(founder).setEchoScoreBoost(20_000, 2_000, { gasLimit: 1_000_000 }),
    "invalid:setEchoScoreBoost:boostTooHigh"
  );

  await expectRevert(() => staking.connect(founder).fundRewardPool(0, { gasLimit: 1_000_000 }), "invalid:fundRewardPool:zero");
  await expectRevert(() => staking.connect(staker).stake(0, { gasLimit: 1_000_000 }), "invalid:stake:zero");
  await expectRevert(() => staking.connect(staker).requestUnstake(1, { gasLimit: 1_000_000 }), "invalid:requestUnstake:noStake");
  await expectRevert(() => staking.connect(staker).executeUnstake({ gasLimit: 1_000_000 }), "invalid:executeUnstake:none");
  await expectRevert(() => staking.connect(staker).stake(stakeAmount, { gasLimit: 3_000_000 }), "invalid:stake:lowEchoScore");
  await sendAndWait(
    staking.connect(founder).setDegradedModeConfig(true, 1, 50_000n * TOKEN_UNIT, { gasLimit: 1_500_000 }),
    "setDegradedModeConfig"
  );

  await sendAndWait(token.connect(founder).approve(DIAMOND_ADDRESS, rewardFundAmount), "approve:rewardPool");
  await sendAndWait(staking.connect(founder).fundRewardPool(rewardFundAmount, { gasLimit: 2_500_000 }), "fundRewardPool");
  await sendAndWait(token.connect(founder).transfer(stakerAddress, stakeAmount), "transfer:stakePrincipal");
  await sendAndWait(token.connect(staker).approve(DIAMOND_ADDRESS, stakeAmount), "approve:stakePrincipal");
  await forceDegradedMode(echo, founder, provider);

  await sendAndWait(staking.connect(staker).stake(stakeAmount, { gasLimit: 3_000_000 }), "stake");
  await expectRevert(
    () => staking.connect(staker).requestUnstake(stakeAmount + 1n, { gasLimit: 1_500_000 }),
    "invalid:requestUnstake:insufficientBalance"
  );

  await sendAndWait(staking.connect(staker).requestUnstake(stakeAmount / 2n, { gasLimit: 1_500_000 }), "requestUnstake");
  await expectRevert(
    () => staking.connect(staker).requestUnstake(1n, { gasLimit: 1_500_000 }),
    "invalid:requestUnstake:alreadyPending"
  );

  await sendAndWait(staking.connect(founder).setStakingPaused(true, { gasLimit: 1_000_000 }), "setStakingPaused:true");
  await expectRevert(() => staking.connect(staker).stake(1n, { gasLimit: 1_000_000 }), "paused:stake");
  await expectRevert(() => staking.connect(staker).claimRewards({ gasLimit: 1_500_000 }), "paused:claimRewards");
  await expectRevert(() => staking.connect(staker).requestUnstake(1n, { gasLimit: 1_500_000 }), "paused:requestUnstake");
  await expectRevert(() => staking.connect(staker).executeUnstake({ gasLimit: 1_500_000 }), "paused:executeUnstake");
  await sendAndWait(staking.connect(founder).setStakingPaused(false, { gasLimit: 1_000_000 }), "setStakingPaused:false");

  await expectRevert(() => staking.connect(outsider).claimRewards({ gasLimit: 1_500_000 }), "invalid:claimRewards:noStake");

  console.log("TRACE_STAKING_NEGATIVE_PATHS: PASS");
}

main().catch((err) => {
  console.error("TRACE_STAKING_NEGATIVE_PATHS: FAIL");
  console.error(err);
  process.exit(1);
});
