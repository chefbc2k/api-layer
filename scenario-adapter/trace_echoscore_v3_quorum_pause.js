#!/usr/bin/env node
"use strict";

const { ethers } = require("ethers");
require("dotenv").config();
const {
  loadArtifact,
  sendAndWait,
  expectRevert,
  createProvider,
  makeQuorumUpdate
} = require("./lib/echo_score_helpers");
const { resolveOracleContext } = require("./lib/echo_live_config");
const { assertLiveMutationAllowed, uniqueScenarioBytes32, readContractAtReceiptBlock } = require("./lib/validation_safety");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const TIMELOCK_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TIMELOCK_ROLE"));
const PLATFORM_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PLATFORM_ADMIN_ROLE"));

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const provider = createProvider(RPC_URL);
  await assertLiveMutationAllowed(provider, "trace_echoscore_v3_quorum_pause.js");
  const founder = new ethers.NonceManager(new ethers.Wallet(PRIVATE_KEY, provider));
  const founderAddress = await founder.getAddress();
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
  const originalOracleContext = await resolveOracleContext(provider, echo, PRIVATE_KEY);
  const originalSnapshot = {
    signers: Array.from(originalOracleContext.configuredSigners),
    threshold: originalOracleContext.threshold,
    oracle: originalOracleContext.configuredOracle
  };
  const founderHadTimelock = await access.hasRole(TIMELOCK_ROLE, founderAddress);
  const founderHadPlatformAdmin = await access.hasRole(PLATFORM_ADMIN_ROLE, founderAddress);
  const singleVoiceHash = uniqueScenarioBytes32("echo-v3-quorum-single");
  const duplicateVoiceHash = uniqueScenarioBytes32("echo-v3-quorum-duplicate");
  const validVoiceHash = uniqueScenarioBytes32("echo-v3-quorum-valid");
  const pausedVoiceHash = uniqueScenarioBytes32("echo-v3-paused");
  const postPauseVoiceHash = uniqueScenarioBytes32("echo-v3-post-pause");

  if (!founderHadTimelock) {
    await sendAndWait(
      access.connect(founder).grantRole(TIMELOCK_ROLE, founderAddress, ethers.MaxUint256),
      "grantRole:TIMELOCK_ROLE"
    );
  }
  if (!founderHadPlatformAdmin) {
    await sendAndWait(
      access.connect(founder).grantRole(PLATFORM_ADMIN_ROLE, founderAddress, ethers.MaxUint256),
      "grantRole:PLATFORM_ADMIN_ROLE"
    );
  }

  const signerA = ethers.Wallet.createRandom();
  const signerB = ethers.Wallet.createRandom();
  const signerC = ethers.Wallet.createRandom();

  try {
    const quorumReceipt = await sendAndWait(
      echo.connect(founder).setOracleQuorumSigners([signerA.address, signerB.address], 2, { gasLimit: 1_500_000 }),
      "setOracleQuorumSigners:2of2"
    );
    const [signers, threshold] = await readContractAtReceiptBlock(echo, "getOracleQuorumSigners", [], quorumReceipt);
    if (threshold !== 2n || signers.length !== 2) throw new Error("quorum config should persist");

    const t0 = (await provider.getBlock("latest")).timestamp;
    const singleSigUpdate = await makeQuorumUpdate(
      singleVoiceHash,
      t0 + 1,
      [signerA]
    );
    await expectRevert(
      () => echo.connect(originalOracleContext.submitter).updateScore(singleSigUpdate, { gasLimit: 4_000_000 }),
      "updateScore:singleSignatureInsufficient"
    );

    const duplicateSigUpdate = await makeQuorumUpdate(
      duplicateVoiceHash,
      t0 + 2,
      [signerA, signerA]
    );
    await expectRevert(
      () => echo.connect(originalOracleContext.submitter).updateScore(duplicateSigUpdate, { gasLimit: 4_000_000 }),
      "updateScore:duplicateSignerBundle"
    );

    const quorumUpdate = await makeQuorumUpdate(
      validVoiceHash,
      t0 + 3,
      [signerA, signerB]
    );
    await sendAndWait(
      echo.connect(originalOracleContext.submitter).updateScore(quorumUpdate, { gasLimit: 4_000_000 }),
      "updateScore:quorumValid"
    );

    await sendAndWait(echo.connect(founder).pauseEchoScoreV3({ gasLimit: 1_000_000 }), "pauseEchoScoreV3");
    const pausedUpdate = await makeQuorumUpdate(
      pausedVoiceHash,
      t0 + 4,
      [signerA, signerB]
    );
    await expectRevert(
      () => echo.connect(originalOracleContext.submitter).updateScore(pausedUpdate, { gasLimit: 4_000_000 }),
      "updateScore:paused"
    );

    await sendAndWait(echo.connect(founder).unpauseEchoScoreV3({ gasLimit: 1_000_000 }), "unpauseEchoScoreV3");
    const postPauseUpdate = await makeQuorumUpdate(
      postPauseVoiceHash,
      t0 + 5,
      [signerA, signerB]
    );
    await sendAndWait(
      echo.connect(originalOracleContext.submitter).updateScore(postPauseUpdate, { gasLimit: 4_000_000 }),
      "updateScore:afterUnpause"
    );

    const oneOfOneReceipt = await sendAndWait(
      echo.connect(founder).setOracleQuorumSigners([signerC.address], 1, { gasLimit: 1_500_000 }),
      "setOracleQuorumSigners:1of1"
    );
    const oneOfOne = await readContractAtReceiptBlock(echo, "getOracleQuorumSigners", [], oneOfOneReceipt);
    if (oneOfOne[1] !== 1n || oneOfOne[0].length !== 1) {
      throw new Error("intermediate 1-of-1 quorum config should persist");
    }

    console.log("TRACE_ECHOSCORE_V3_QUORUM_PAUSE: PASS");
  } finally {
    let restoreQuorumReceipt = null;
    let restoreOracleReceipt = null;
    let restoreUnpauseReceipt = null;
    const [currentSigners, currentThreshold] = await echo.getOracleQuorumSigners();
    const currentSignerSet = new Set(currentSigners.map((address) => address.toLowerCase()));
    const expectedSignerSet = new Set(originalSnapshot.signers.map((address) => address.toLowerCase()));
    const signerMismatch =
      currentThreshold !== BigInt(originalSnapshot.threshold)
      || currentSigners.length !== originalSnapshot.signers.length
      || currentSigners.some((address) => !expectedSignerSet.has(address.toLowerCase()))
      || originalSnapshot.signers.some((address) => !currentSignerSet.has(address.toLowerCase()));

    if (signerMismatch) {
      restoreQuorumReceipt = await sendAndWait(
        echo.connect(founder).setOracleQuorumSigners(originalSnapshot.signers, originalSnapshot.threshold, { gasLimit: 1_500_000 }),
        "restoreOracleQuorumSigners"
      );
    }
    if ((await echo.getEchoScoreOracleV3()).toLowerCase() !== originalSnapshot.oracle.toLowerCase()) {
      restoreOracleReceipt = await sendAndWait(
        echo.connect(founder).setEchoScoreOracleV3(originalSnapshot.oracle, { gasLimit: 1_000_000 }),
        "restoreOracleWallet"
      );
    }
    if (await echo.isEchoScorePausedV3()) {
      restoreUnpauseReceipt = await sendAndWait(
        echo.connect(founder).unpauseEchoScoreV3({ gasLimit: 1_000_000 }),
        "restoreUnpause"
      );
    }

    let verificationError = null;
    const [restoredSigners, restoredThreshold] = restoreQuorumReceipt
      ? await readContractAtReceiptBlock(echo, "getOracleQuorumSigners", [], restoreQuorumReceipt)
      : await echo.getOracleQuorumSigners();
    const restoredSignerSet = new Set(restoredSigners.map((address) => address.toLowerCase()));
    if (
      restoredThreshold !== BigInt(originalSnapshot.threshold)
      || restoredSigners.length !== originalSnapshot.signers.length
      || originalSnapshot.signers.some((address) => !restoredSignerSet.has(address.toLowerCase()))
    ) {
      verificationError = new Error("oracle quorum restore verification failed");
    } else {
      const restoredOracle = restoreOracleReceipt
        ? await readContractAtReceiptBlock(echo, "getEchoScoreOracleV3", [], restoreOracleReceipt)
        : await echo.getEchoScoreOracleV3();
      if (restoredOracle.toLowerCase() !== originalSnapshot.oracle.toLowerCase()) {
        verificationError = new Error("oracle wallet restore verification failed");
      }
    }
    const restoredPaused = restoreUnpauseReceipt
      ? await readContractAtReceiptBlock(echo, "isEchoScorePausedV3", [], restoreUnpauseReceipt)
      : await echo.isEchoScorePausedV3();
    if (!verificationError && restoredPaused) {
      verificationError = new Error("pause restore verification failed");
    }
    if (!founderHadPlatformAdmin && await access.hasRole(PLATFORM_ADMIN_ROLE, founderAddress)) {
      await sendAndWait(
        access.connect(founder).revokeRole(PLATFORM_ADMIN_ROLE, founderAddress, "restore"),
        "restoreRole:PLATFORM_ADMIN_ROLE:founder"
      );
    }
    if (!founderHadTimelock && await access.hasRole(TIMELOCK_ROLE, founderAddress)) {
      await sendAndWait(
        access.connect(founder).revokeRole(TIMELOCK_ROLE, founderAddress, "restore"),
        "restoreRole:TIMELOCK_ROLE:founder"
      );
    }
    if (verificationError) {
      throw verificationError;
    }
  }
}

main().catch((err) => {
  console.error("TRACE_ECHOSCORE_V3_QUORUM_PAUSE: FAIL");
  console.error(err);
  process.exit(1);
});
