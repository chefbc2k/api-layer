"use strict";

const { ethers } = require("ethers");
const { envValue } = require("./runtime_config");

function buildWallet(privateKey, provider) {
  return new ethers.NonceManager(new ethers.Wallet(privateKey, provider));
}

async function resolveOracleContext(provider, echo, fallbackPrivateKey) {
  const oracleWalletPrivateKey = envValue("ORACLE_WALLET_PRIVATE_KEY") || fallbackPrivateKey;
  if (!oracleWalletPrivateKey) {
    throw new Error("ORACLE_WALLET_PRIVATE_KEY or PRIVATE_KEY is required");
  }

  const submitter = buildWallet(oracleWalletPrivateKey, provider);
  const submitterAddress = (await submitter.getAddress()).toLowerCase();
  const configuredOracle = (await echo.getEchoScoreOracleV3()).toLowerCase();
  if (submitterAddress !== configuredOracle) {
    throw new Error(`oracle submitter mismatch: env=${submitterAddress} onchain=${configuredOracle}`);
  }

  const [configuredSigners, thresholdRaw] = await echo.getOracleQuorumSigners();
  const configuredSignerSet = new Set(configuredSigners.map((address) => address.toLowerCase()));
  const candidateSigners = [];

  for (let i = 0; i < 5; i++) {
    const pk = envValue(`ORACLE_SIGNER_PRIVATE_KEY_${i}`);
    if (!pk) continue;
    const wallet = buildWallet(pk, provider);
    const address = (await wallet.getAddress()).toLowerCase();
    if (configuredSignerSet.has(address)) {
      candidateSigners.push(wallet);
    }
  }

  const threshold = Number(thresholdRaw);
  if (candidateSigners.length < threshold) {
    throw new Error(
      `insufficient oracle signer keys for live quorum: have=${candidateSigners.length} need=${threshold}`
    );
  }

  return {
    submitter,
    candidateSigners,
    threshold,
    configuredOracle,
    configuredSigners
  };
}

module.exports = {
  resolveOracleContext
};
