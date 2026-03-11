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
  expectRevert
} = require("./lib/staking_helpers");
const { signEchoScoreUpdate } = require("./lib/echo_score_update_helper");
const { resolveOracleContext } = require("./lib/echo_live_config");
const { readContractAtReceiptBlock, ensureEthBalance } = require("./lib/validation_safety");

const RPC_URL = process.env.RPC_URL;
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const { provider, founder, founderAddress, access, token, staking, echo } = await createContext({
    rpcUrl: RPC_URL,
    diamondAddress: DIAMOND_ADDRESS,
    privateKey: PRIVATE_KEY
  });
  const oracleContext = await resolveOracleContext(provider, echo, PRIVATE_KEY);

  await ensurePlatformAdmin(access, founder, founderAddress);

  const staker = await createUser(provider, founder, "1", "0.0002");
  await ensureEthBalance(founder, staker.address, ethers.parseEther("0.00005"), "fundETH:healthyOracleStake:topup");

  const thresholds = [10_000n, 50_000n, 200_000n, 500_000n].map((v) => v * TOKEN_UNIT);
  const multipliers = [15_000n, 12_500n, 10_000n, 7_500n, 5_000n];

  try {
    await sendAndWait(
      staking.connect(founder).initStaking(DAY, DAY, 1000, thresholds, multipliers, { gasLimit: 4_000_000 }),
      "initStaking"
    );
  } catch (_) {}

  await sendAndWait(staking.connect(founder).setDegradedModeConfig(true, 7 * DAY, 500_000n * TOKEN_UNIT, { gasLimit: 1_500_000 }), "setDegradedModeConfig");
  const healthy = await echo.isOracleHealthy();
  if (!healthy) throw new Error("oracle should be healthy after bootstrap");
  const degraded = await staking.isDegradedModeActive();
  if (degraded) throw new Error("degraded mode should be inactive while oracle is healthy");

  const stakeAmount = 20_000n * TOKEN_UNIT;
  await transferAndApprove(token, founder, staker.wallet, staker.address, DIAMOND_ADDRESS, stakeAmount, "healthyOracleStake");

  await expectRevert(() => staking.connect(staker.wallet).stake(stakeAmount, { gasLimit: 3_000_000 }), "stake:lowEchoScore:healthyOracle");

  const voiceHash = ethers.zeroPadValue(staker.address, 32);
  const now = (await provider.getBlock("latest")).timestamp;
  const update = {
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
    nonce: 0n,
    timestamp: BigInt(now),
    signature: "0x"
  };

  update.signature = ethers.concat(
    await Promise.all(
      oracleContext.candidateSigners
        .slice(0, oracleContext.threshold)
        .map((signer) => signEchoScoreUpdate(update, signer))
    )
  );

  const updateReceipt = await sendAndWait(
    echo.connect(oracleContext.submitter).updateScore(update, { gasLimit: 4_000_000 }),
    "updateScore"
  );
  const rep = await readContractAtReceiptBlock(echo, "getReputation", [voiceHash], updateReceipt);
  if (rep.totalReputation < 1000n) throw new Error(`expected EchoScore >= 1000, got ${rep.totalReputation}`);

  const stakeReceipt = await sendAndWait(
    staking.connect(staker.wallet).stake(stakeAmount, { gasLimit: 3_000_000 }),
    "stake:healthyOracle"
  );
  const info = await readContractAtReceiptBlock(staking, "getStakeInfo", [staker.address], stakeReceipt);
  if (info.echoScoreBoostBps === 0n) throw new Error("healthy oracle stake should get EchoScore boost");

  console.log("TRACE_STAKING_ECHO_ORACLE_HEALTHY: PASS");
}

main().catch((err) => {
  console.error("TRACE_STAKING_ECHO_ORACLE_HEALTHY: FAIL");
  console.error(err);
  process.exit(1);
});
