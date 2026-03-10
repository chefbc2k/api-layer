#!/usr/bin/env node
"use strict";

const { ethers } = require("ethers");
require("dotenv").config();
const {
  loadArtifact,
  sendAndWait,
  expectRevert,
  createProvider,
  makeSignedUpdate,
  advanceTime
} = require("./lib/echo_score_helpers");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const TIMELOCK_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TIMELOCK_ROLE"));
const PLATFORM_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PLATFORM_ADMIN_ROLE"));

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const provider = createProvider(RPC_URL);
  const founder = new ethers.NonceManager(new ethers.Wallet(PRIVATE_KEY, provider));
  const founderAddress = await founder.getAddress();
  const outsider = new ethers.NonceManager(ethers.Wallet.createRandom().connect(provider));
  const outsiderAddress = await outsider.getAddress();
  const echo = new ethers.Contract(
    DIAMOND_ADDRESS,
    loadArtifact("out/EchoScoreFacetV3.sol/EchoScoreFacetV3.json").abi,
    provider
  );
  const access = new ethers.Contract(
    DIAMOND_ADDRESS,
    loadArtifact("out/AccessControlFacet.sol/AccessControlFacet.json").abi,
    provider
  );

  if (!(await access.hasRole(TIMELOCK_ROLE, founderAddress))) {
    await sendAndWait(
      access.connect(founder).grantRole(TIMELOCK_ROLE, founderAddress, ethers.MaxUint256),
      "grantRole:TIMELOCK_ROLE"
    );
  }
  if (!(await access.hasRole(PLATFORM_ADMIN_ROLE, founderAddress))) {
    await sendAndWait(
      access.connect(founder).grantRole(PLATFORM_ADMIN_ROLE, founderAddress, ethers.MaxUint256),
      "grantRole:PLATFORM_ADMIN_ROLE"
    );
  }
  await sendAndWait(founder.sendTransaction({ to: outsiderAddress, value: ethers.parseEther("1") }), `fundETH:${outsiderAddress}`);

  await expectRevert(() => echo.connect(outsider).setEchoScoreOracleV3(outsiderAddress), "unauthorized:setEchoScoreOracleV3");
  await expectRevert(() => echo.connect(outsider).setOracleStalenessConfig(60), "unauthorized:setOracleStalenessConfig");
  await expectRevert(() => echo.connect(outsider).setOracleFutureDriftConfig(300), "unauthorized:setOracleFutureDriftConfig");
  await expectRevert(() => echo.connect(outsider).pauseEchoScoreV3(), "unauthorized:pauseEchoScoreV3");
  await expectRevert(() => echo.connect(outsider).unpauseEchoScoreV3(), "unauthorized:unpauseEchoScoreV3");

  const newOracle = ethers.Wallet.createRandom();
  await sendAndWait(echo.connect(founder).setEchoScoreOracleV3(newOracle.address, { gasLimit: 1_000_000 }), "setEchoScoreOracleV3:new");
  if ((await echo.getEchoScoreOracleV3()).toLowerCase() !== newOracle.address.toLowerCase()) {
    throw new Error("oracle should update to new oracle");
  }

  await sendAndWait(echo.connect(founder).setOracleStalenessConfig(60, { gasLimit: 1_000_000 }), "setOracleStalenessConfig:60");
  let [maxAge, lastUpdated] = await echo.getOracleStalenessConfig();
  if (maxAge !== 60n || lastUpdated <= 0n) throw new Error("staleness config should persist");
  await sendAndWait(echo.connect(founder).setOracleFutureDriftConfig(300, { gasLimit: 1_000_000 }), "setOracleFutureDriftConfig:300");
  const maxFuture = await echo.getOracleFutureDriftConfig();
  if (maxFuture !== 300n) throw new Error("future drift config should persist");
  if (!(await echo.isOracleHealthy())) throw new Error("oracle should initially be healthy");

  await advanceTime(provider, 61);
  if (await echo.isOracleHealthy()) throw new Error("oracle should become unhealthy after staleness window");

  await sendAndWait(echo.connect(founder).pauseEchoScoreV3({ gasLimit: 1_000_000 }), "pauseEchoScoreV3");
  if (!(await echo.isEchoScorePausedV3())) throw new Error("pause flag should be set");

  await sendAndWait(echo.connect(founder).unpauseEchoScoreV3({ gasLimit: 1_000_000 }), "unpauseEchoScoreV3");
  if (await echo.isEchoScorePausedV3()) throw new Error("pause flag should be cleared");

  await sendAndWait(echo.connect(founder).setEchoScoreOracleV3(founderAddress, { gasLimit: 1_000_000 }), "setEchoScoreOracleV3:restore");
  await sendAndWait(echo.connect(founder).setOracleStalenessConfig(5, { gasLimit: 1_000_000 }), "setOracleStalenessConfig:5");
  const latestTimestamp = Number((await provider.getBlock("latest")).timestamp);
  const staleUpdate = await makeSignedUpdate(
    ethers.keccak256(ethers.toUtf8Bytes("echo-v3-admin-stale")),
    1,
    founder
  );
  await expectRevert(
    () => echo.connect(founder).updateScore(staleUpdate, { gasLimit: 4_000_000 }),
    "updateScore:staleTimestamp"
  );

  const futureUpdate = await makeSignedUpdate(
    ethers.keccak256(ethers.toUtf8Bytes("echo-v3-admin-future")),
    latestTimestamp + 86_400,
    founder
  );
  await expectRevert(
    () => echo.connect(founder).updateScore(futureUpdate, { gasLimit: 4_000_000 }),
    "updateScore:futureTimestamp"
  );

  await sendAndWait(echo.connect(founder).setOracleStalenessConfig(60, { gasLimit: 1_000_000 }), "setOracleStalenessConfig:restore60");
  const [, restoredLastUpdated] = await echo.getOracleStalenessConfig();
  const t1 = Number(restoredLastUpdated);
  const update = await makeSignedUpdate(ethers.keccak256(ethers.toUtf8Bytes("echo-v3-admin-health")), t1, founder);
  await sendAndWait(echo.connect(founder).updateScore(update, { gasLimit: 4_000_000 }), "updateScore:restoreHealth");
  if (!(await echo.isOracleHealthy())) throw new Error("oracle should be healthy again after valid update");

  console.log("TRACE_ECHOSCORE_V3_ADMIN: PASS");
}

main().catch((err) => {
  console.error("TRACE_ECHOSCORE_V3_ADMIN: FAIL");
  console.error(err);
  process.exit(1);
});
