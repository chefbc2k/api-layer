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

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

async function makeUpdate(voiceHash, timestamp, signer, multiplier, nonce) {
  const update = {
    voiceHash,
    qualityData: {
      completenessPercentage: 100,
      sampleRate: 48000,
      speechDuration: 3600 * multiplier,
      hnr: 9000,
      jitterLocal: 10,
      shimmerLocal: 10
    },
    engagementData: {
      viewCount: 100000 * multiplier,
      likeCount: 20000 * multiplier,
      playCount: 80000 * multiplier,
      ratingAverage: 500,
      ratingCount: 1000 * multiplier,
      assetAge: 1
    },
    governanceData: {
      proposalsCreated: 10 * multiplier,
      proposalsActiveOrSuccess: 10 * multiplier,
      votesCast: 500 * multiplier
    },
    contributionData: {
      datasetCount: 10 * multiplier,
      totalAssetCount: 1000 * multiplier,
      totalDuration: 360000 * multiplier,
      hasCommercialDataset: true,
      hasHighQualityDataset: true
    },
    marketplaceData: {
      datasetSalesCount: 50 * multiplier,
      datasetSalesVolume: BigInt(1_000_000_000_000 * multiplier),
      assetSalesCount: 100 * multiplier,
      assetSalesVolume: BigInt(1_000_000_000_000 * multiplier),
      royaltiesRealized: BigInt(1_000_000_000_000 * multiplier),
      royaltyPaymentsCount: 50 * multiplier
    },
    nonce: BigInt(nonce),
    timestamp: BigInt(timestamp),
    signature: "0x"
  };
  update.signature = await signEchoScoreUpdate(update, signer);
  return update;
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
  const thirdStake = 5_000n * TOKEN_UNIT;

  await sendAndWait(staking.connect(founder).initStaking(DAY, DAY, 1000, thresholds, multipliers, { gasLimit: 4_000_000 }), "initStaking");
  await forceDegradedMode(echo, staking, founder, founder.provider, 50_000n * TOKEN_UNIT);
  await sendAndWait(token.connect(founder).approve(DIAMOND_ADDRESS, rewardFundAmount), "approve:rewardPool");
  await sendAndWait(staking.connect(founder).fundRewardPool(rewardFundAmount, { gasLimit: 2_500_000 }), "fundRewardPool");
  await transferAndApprove(token, founder, staker.wallet, staker.address, DIAMOND_ADDRESS, firstStake + secondStake + thirdStake, "snapshotInvariant");

  await sendAndWait(staking.connect(staker.wallet).stake(firstStake, { gasLimit: 3_000_000 }), "stake:first");
  const beforeScore = await staking.getStakeInfo(staker.address);
  if (beforeScore.echoScoreBoostBps !== 0n) throw new Error("first low-score stake should not get boost");

  const voiceHash = ethers.zeroPadValue(staker.address, 32);
  await sendAndWait(echo.connect(founder).setEchoScoreOracleV3(founderAddress, { gasLimit: 1_000_000 }), "setEchoScoreOracleV3");

  const t1 = (await founder.provider.getBlock("latest")).timestamp;
  await sendAndWait(echo.connect(founder).updateScore(await makeUpdate(voiceHash, t1, founder, 1, 0), { gasLimit: 4_000_000 }), "updateScore:first");
  const afterFirstScore = await staking.getStakeInfo(staker.address);
  if (afterFirstScore.echoScoreBoostBps !== 0n) throw new Error("passive score update should not retroactively change active stake");

  await sendAndWait(staking.connect(staker.wallet).stake(secondStake, { gasLimit: 3_000_000 }), "stake:second");
  const afterSecondStake = await staking.getStakeInfo(staker.address);
  if (afterSecondStake.echoScoreBoostBps === 0n) throw new Error("second stake should refresh snapshot and apply boost");
  const boostAfterSecondStake = afterSecondStake.echoScoreBoostBps;

  const t2 = (await founder.provider.getBlock("latest")).timestamp;
  await sendAndWait(echo.connect(founder).updateScore(await makeUpdate(voiceHash, t2, founder, 2, 1), { gasLimit: 4_000_000 }), "updateScore:second");
  const afterSecondScore = await staking.getStakeInfo(staker.address);
  if (afterSecondScore.echoScoreBoostBps !== boostAfterSecondStake) {
    throw new Error("passive second score update should not alter current active snapshot");
  }

  await sendAndWait(staking.connect(staker.wallet).stake(thirdStake, { gasLimit: 3_000_000 }), "stake:third");
  const afterThirdStake = await staking.getStakeInfo(staker.address);
  if (afterThirdStake.echoScoreBoostBps === 0n) throw new Error("third stake should retain refreshed boost");

  console.log("TRACE_STAKING_SNAPSHOT_INVARIANTS: PASS");
}

main().catch((err) => {
  console.error("TRACE_STAKING_SNAPSHOT_INVARIANTS: FAIL");
  console.error(err);
  process.exit(1);
});
