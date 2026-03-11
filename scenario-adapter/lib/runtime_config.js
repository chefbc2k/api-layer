"use strict";

const { ethers } = require("ethers");

function networkName() {
  return (process.env.NETWORK || "").replace(/"/g, "").trim().toLowerCase();
}

function chainId() {
  const raw = process.env.CHAIN_ID;
  return raw ? Number(raw) : null;
}

function isLiveNetwork() {
  const name = networkName();
  const id = chainId();
  return name !== "local" && id !== 31337;
}

function scenarioFundingEth(localAmount = "1", liveAmount = "0.00005") {
  if (isLiveNetwork()) {
    return process.env.SCENARIO_FUNDING_ETH || liveAmount;
  }
  return localAmount;
}

function scenarioFundingWei(localAmount = "1", liveAmount = "0.00005") {
  return ethers.parseEther(scenarioFundingEth(localAmount, liveAmount));
}

function envValue(name) {
  const value = process.env[name];
  return value && value.length > 0 ? value : null;
}

module.exports = {
  isLiveNetwork,
  scenarioFundingEth,
  scenarioFundingWei,
  envValue
};
