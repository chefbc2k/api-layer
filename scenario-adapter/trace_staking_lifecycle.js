#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
require("dotenv").config();

const RPC_URL = process.env.RPC_URL;
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const DAY = 24 * 60 * 60;
const TOKEN_UNIT = 10n ** 10n;
const PLATFORM_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PLATFORM_ADMIN_ROLE"));
const TIMELOCK_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TIMELOCK_ROLE"));

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
  return err;
}

async function advanceTime(provider, seconds) {
  await provider.send("evm_increaseTime", [seconds]);
  await provider.send("evm_mine", []);
}

async function ensureRole(access, signer, roleId, account, label) {
  if (await access.hasRole(roleId, account)) return;
  await sendAndWait(access.connect(signer).grantRole(roleId, account, ethers.MaxUint256), `grantRole:${label}`);
}

async function ensurePlatformAdmin(access, founder, founderAddress) {
  if (await access.hasRole(PLATFORM_ADMIN_ROLE, founderAddress)) return;
  await ensureRole(access, founder, TIMELOCK_ROLE, founderAddress, "TIMELOCK_ROLE");
  await ensureRole(access, founder, PLATFORM_ADMIN_ROLE, founderAddress, "PLATFORM_ADMIN_ROLE");
}

async function forceDegradedMode(echo, founder, provider) {
  await sendAndWait(echo.connect(founder).setOracleStalenessConfig(1, { gasLimit: 1_000_000 }), "setOracleStalenessConfig:1s");
  await advanceTime(provider, 2);
  const healthy = await echo.isOracleHealthy();
  if (healthy) throw new Error("oracle should be stale so degraded mode is active");
}

function extractErrorData(err) {
  return err?.data || err?.info?.error?.data || null;
}

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const founder = new ethers.NonceManager(new ethers.Wallet(PRIVATE_KEY, provider));
  const staker = new ethers.NonceManager(ethers.Wallet.createRandom().connect(provider));
  const founderAddress = await founder.getAddress();
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
  const stakingIface = new ethers.Interface(loadArtifact("out/StakingFacet.sol/StakingFacet.json").abi);

  const thresholds = [10_000n, 50_000n, 200_000n, 500_000n].map((v) => v * TOKEN_UNIT);
  const multipliers = [15_000n, 12_500n, 10_000n, 7_500n, 5_000n];
  const rewardFundAmount = 1_000_000n * TOKEN_UNIT;
  const userStakeAmount = 20_000n * TOKEN_UNIT;

  await sendAndWait(founder.sendTransaction({ to: stakerAddress, value: ethers.parseEther("1") }), "fundETH:staker");
  await ensurePlatformAdmin(access, founder, founderAddress);

  let initialized = true;
  try {
    await staking.getStakingStats();
  } catch (_) {
    initialized = false;
  }

  try {
    const cfg = await staking.getDegradedModeConfig();
    initialized = Boolean(cfg.maxStakePerWallet > 0n || cfg.staleAfterSeconds > 0n);
  } catch (_) {
    initialized = false;
  }

  if (!initialized) {
    await sendAndWait(
      staking.connect(founder).initStaking(DAY, DAY, 1000, thresholds, multipliers, { gasLimit: 4_000_000 }),
      "initStaking"
    );
  } else {
    await expectRevert(
      () => staking.connect(founder).initStaking(DAY, DAY, 1000, thresholds, multipliers, { gasLimit: 4_000_000 }),
      "initStaking:alreadyInitialized"
    );
  }

  await sendAndWait(
    staking.connect(founder).setDegradedModeConfig(true, 1, 50_000n * TOKEN_UNIT, { gasLimit: 1_500_000 }),
    "setDegradedModeConfig"
  );
  await forceDegradedMode(echo, founder, provider);

  await sendAndWait(token.connect(founder).approve(DIAMOND_ADDRESS, rewardFundAmount), "approve:rewardPool");
  await sendAndWait(staking.connect(founder).fundRewardPool(rewardFundAmount, { gasLimit: 2_500_000 }), "fundRewardPool");

  await sendAndWait(token.connect(founder).transfer(stakerAddress, userStakeAmount), "transfer:stakePrincipal");
  await sendAndWait(token.connect(staker).approve(DIAMOND_ADDRESS, userStakeAmount), "approve:stakePrincipal");

  await sendAndWait(staking.connect(staker).stake(userStakeAmount, { gasLimit: 3_000_000 }), "stake");

  console.log("[step] read:getStakeInfo");
  const infoAfterStake = await staking.getStakeInfo(stakerAddress);
  const expectedTier = await staking.getTier(userStakeAmount);
  if (infoAfterStake.amount !== userStakeAmount) throw new Error("stake amount mismatch");
  if (infoAfterStake.tier !== expectedTier) {
    throw new Error(`expected tier ${expectedTier} got ${infoAfterStake.tier}`);
  }

  console.log("[step] read:getStakingStats");
  const statsAfterStake = await staking.getStakingStats();
  if (statsAfterStake.totalStaked < userStakeAmount) throw new Error("totalStaked did not increase");

  console.log("[step] expectRevert:claimRewardsBeforeMinDuration");
  const earlyClaimErr = await expectRevert(
    () => staking.connect(staker).claimRewards({ gasLimit: 2_000_000 }),
    "claimRewards:beforeMinDuration"
  );
  let minStakeDuration = DAY;
  const earlyClaimData = extractErrorData(earlyClaimErr);
  if (earlyClaimData) {
    try {
      const parsed = stakingIface.parseError(earlyClaimData);
      if (parsed?.name === "StakeDurationTooShort") {
        minStakeDuration = parsed.args[1];
      }
    } catch (_) {}
  }

  console.log("[step] warp:afterMinDuration");
  await advanceTime(provider, Number(minStakeDuration) + 1);
  console.log("[step] read:getPendingRewards");
  const pending = await staking.getPendingRewards(stakerAddress);
  if (pending <= 0n) throw new Error("pending rewards should accrue after min duration");

  console.log("[step] tx:claimRewards");
  const stakerBalanceBeforeClaim = await token.tokenBalanceOf(stakerAddress);
  await sendAndWait(staking.connect(staker).claimRewards({ gasLimit: 3_000_000 }), "claimRewards");
  const stakerBalanceAfterClaim = await token.tokenBalanceOf(stakerAddress);
  if (stakerBalanceAfterClaim <= stakerBalanceBeforeClaim) throw new Error("claim should increase liquid balance");

  console.log("[step] tx:requestUnstake");
  const unstakeAmount = 5_000n * TOKEN_UNIT;
  await sendAndWait(staking.connect(staker).requestUnstake(unstakeAmount, { gasLimit: 2_000_000 }), "requestUnstake");
  console.log("[step] read:getUnstakeRequest");
  const unstakeInfo = await staking.getUnstakeRequest(stakerAddress);
  if (!unstakeInfo.pending) throw new Error("unstake request should be pending");
  if (unstakeInfo.amount !== unstakeAmount) throw new Error("unstake request amount mismatch");

  console.log("[step] expectRevert:executeUnstakeBeforeCooldown");
  await expectRevert(() => staking.connect(staker).executeUnstake({ gasLimit: 3_000_000 }), "executeUnstake:beforeCooldown");

  console.log("[step] warp:afterCooldown");
  await advanceTime(provider, DAY + 1);
  console.log("[step] tx:executeUnstake");
  const stakerBalanceBeforeUnstake = await token.tokenBalanceOf(stakerAddress);
  await sendAndWait(staking.connect(staker).executeUnstake({ gasLimit: 4_000_000 }), "executeUnstake");
  const stakerBalanceAfterUnstake = await token.tokenBalanceOf(stakerAddress);
  if (stakerBalanceAfterUnstake <= stakerBalanceBeforeUnstake) throw new Error("unstake should return principal");

  console.log("[step] read:getStakeInfoAfterUnstake");
  const infoAfterUnstake = await staking.getStakeInfo(stakerAddress);
  if (infoAfterUnstake.amount !== userStakeAmount - unstakeAmount) {
    throw new Error("remaining staked amount mismatch after unstake");
  }

  console.log("[step] expectRevert:advanceEpochTooEarly");
  await expectRevert(() => staking.connect(founder).advanceEpoch(), "advanceEpoch:tooEarly");
  console.log("[step] warp:advanceEpoch");
  await advanceTime(provider, 7 * DAY + 1);
  await sendAndWait(staking.connect(founder).advanceEpoch({ gasLimit: 2_000_000 }), "advanceEpoch");

  console.log("TRACE_STAKING_LIFECYCLE: PASS");
}

main().catch((err) => {
  console.error("TRACE_STAKING_LIFECYCLE: FAIL");
  console.error(err);
  process.exit(1);
});
