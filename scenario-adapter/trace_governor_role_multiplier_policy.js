#!/usr/bin/env node
"use strict";

require("dotenv").config();
const { ethers } = require("ethers");
const { bootstrapGovernance } = require("./bootstrap_local_governance");

const RPC_URL = process.env.RPC_URL;

const ROLE = {
  FOUNDER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("FOUNDER_ROLE")),
  BOARD_MEMBER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("BOARD_MEMBER_ROLE")),
  EXECUTOR_ROLE: ethers.keccak256(ethers.toUtf8Bytes("EXECUTOR_ROLE")),
  UNKNOWN_ROLE: ethers.keccak256(ethers.toUtf8Bytes("UNKNOWN_ROLE"))
};

async function main() {
  const { governor } = await bootstrapGovernance(RPC_URL);

  const founderMultiplier = await governor.getRoleMultiplier(ROLE.FOUNDER_ROLE);
  const boardMultiplier = await governor.getRoleMultiplier(ROLE.BOARD_MEMBER_ROLE);
  const executorMultiplier = await governor.getRoleMultiplier(ROLE.EXECUTOR_ROLE);
  const unknownMultiplier = await governor.getRoleMultiplier(ROLE.UNKNOWN_ROLE);

  if (founderMultiplier !== 10000n) throw new Error(`founder multiplier mismatch: ${founderMultiplier}`);
  if (boardMultiplier !== 15000n) throw new Error(`board multiplier mismatch: ${boardMultiplier}`);
  if (executorMultiplier !== 12500n) throw new Error(`executor multiplier mismatch: ${executorMultiplier}`);
  if (unknownMultiplier !== 10000n) throw new Error(`unknown role multiplier should default to standard: ${unknownMultiplier}`);

  console.log("TRACE_GOVERNOR_ROLE_MULTIPLIER_POLICY: PASS");
}

main().catch((err) => {
  console.error("TRACE_GOVERNOR_ROLE_MULTIPLIER_POLICY: FAIL");
  console.error(err);
  process.exit(1);
});
