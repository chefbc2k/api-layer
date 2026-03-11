#!/usr/bin/env node
"use strict";

require("dotenv").config();
const { ethers } = require("ethers");
const {
  DAY,
  TOKEN_UNIT,
  createContext,
  createUser,
  ensurePlatformAdmin,
  sendAndWait,
  transferAndApprove,
  forceDegradedMode
} = require("./lib/staking_helpers");
const { signEchoScoreUpdate } = require("./lib/echo_score_update_helper");

const RPC_URL = process.env.RPC_URL;
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

function buildUpdate(voiceHash, timestamp, signer, nonce) {
  return {
    voiceHash,
    qualityData: {
      completenessPercentage: 100,
      sampleRate: 48000,
      speechDuration: 3600,
      hnr: 9000,
      jitterLocal: 10,
      shimmerLocal: 10
    },
    engagementData: {
      viewCount: 100000,
      likeCount: 20000,
      playCount: 80000,
      ratingAverage: 500,
      ratingCount: 1000,
      assetAge: 1
    },
    governanceData: {
      proposalsCreated: 10,
      proposalsActiveOrSuccess: 10,
      votesCast: 500
    },
    contributionData: {
      datasetCount: 10,
      totalAssetCount: 1000,
      totalDuration: 360000,
      hasCommercialDataset: true,
      hasHighQualityDataset: true
    },
    marketplaceData: {
      datasetSalesCount: 50,
      datasetSalesVolume: 1_000_000_000_000n,
      assetSalesCount: 100,
      assetSalesVolume: 1_000_000_000_000n,
      royaltiesRealized: 1_000_000_000_000n,
      royaltyPaymentsCount: 50
    },
    nonce: BigInt(nonce),
    timestamp: BigInt(timestamp),
    signature: "0x",
    signer
  };
}

async function signUpdate(update) {
  const signed = { ...update };
  signed.signature = await signEchoScoreUpdate(update, update.signer);
  delete signed.signer;
  return signed;
}

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const { founder, founderAddress, access, token, staking, echo } = await createContext({
    rpcUrl: RPC_URL,
    diamondAddress: DIAMOND_ADDRESS,
    privateKey: PRIVATE_KEY
  });

  await ensurePlatformAdmin(access, founder, founderAddress);

  const staker = await createUser(founder.provider, founder);
  const thresholds = [10_000n, 50_000n, 200_000n, 500_000n].map((v) => v * TOKEN_UNIT);
  const multipliers = [15_000n, 12_500n, 10_000n, 7_500n, 5_000n];
  const rewardFundAmount = 1_000_000n * TOKEN_UNIT;
  const firstStake = 20_000n * TOKEN_UNIT;
  const secondStake = 5_000n * TOKEN_UNIT;

  try {
    await sendAndWait(
      staking.connect(founder).initStaking(DAY, DAY, 1000, thresholds, multipliers, { gasLimit: 4_000_000 }),
      "initStaking"
    );
  } catch (_) {}

  await sendAndWait(
    staking.connect(founder).setDegradedModeConfig(true, 1, 50_000n * TOKEN_UNIT, { gasLimit: 1_500_000 }),
    "setDegradedModeConfig"
  );
  await forceDegradedMode(echo, staking, founder, founder.provider, 50_000n * TOKEN_UNIT);
  await sendAndWait(token.connect(founder).approve(DIAMOND_ADDRESS, rewardFundAmount), "approve:rewardPool");
  await sendAndWait(staking.connect(founder).fundRewardPool(rewardFundAmount, { gasLimit: 2_500_000 }), "fundRewardPool");

  await transferAndApprove(token, founder, staker.wallet, staker.address, DIAMOND_ADDRESS, firstStake + secondStake, "snapshotBehavior");

  const preScoreInfo = await staking.getStakeInfo(staker.address);
  if (preScoreInfo.echoScoreBoostBps !== 0n) throw new Error("pre-stake boost should start at zero");

  await sendAndWait(staking.connect(staker.wallet).stake(firstStake, { gasLimit: 3_000_000 }), "stake:first:noScore");
  const afterFirstStake = await staking.getStakeInfo(staker.address);
  if (afterFirstStake.echoScoreBoostBps !== 0n) throw new Error("first stake without score should not get boost");

  const voiceHash = ethers.zeroPadValue(staker.address, 32);
  const now = (await founder.provider.getBlock("latest")).timestamp;
  await sendAndWait(echo.connect(founder).setEchoScoreOracleV3(founderAddress, { gasLimit: 1_000_000 }), "setEchoScoreOracleV3");
  const update = await signUpdate(buildUpdate(voiceHash, now, founder, 0));
  await sendAndWait(echo.connect(founder).updateScore(update, { gasLimit: 4_000_000 }), "updateScore");

  const afterScoreNoRestake = await staking.getStakeInfo(staker.address);
  if (afterScoreNoRestake.echoScoreBoostBps !== 0n) {
    throw new Error("score update alone should not retroactively change existing stake snapshot");
  }

  await sendAndWait(staking.connect(staker.wallet).stake(secondStake, { gasLimit: 3_000_000 }), "stake:second:afterScore");
  const afterSecondStake = await staking.getStakeInfo(staker.address);
  if (afterSecondStake.echoScoreBoostBps === 0n) throw new Error("second stake after score update should refresh snapshot and apply boost");

  console.log("TRACE_STAKING_SNAPSHOT_SCORE_BEHAVIOR: PASS");
}

main().catch((err) => {
  console.error("TRACE_STAKING_SNAPSHOT_SCORE_BEHAVIOR: FAIL");
  console.error(err);
  process.exit(1);
});
