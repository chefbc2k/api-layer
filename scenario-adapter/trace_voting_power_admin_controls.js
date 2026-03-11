#!/usr/bin/env node
"use strict";

const { ethers } = require("ethers");
const { bootstrapGovernance } = require("./bootstrap_local_governance");
const { walletAt } = require("./lib/governance_helpers");
const { ROLE, sendAndWait, expectRevert } = require("./lib/access_helpers");

const RPC_URL = process.env.RPC_URL;
const TOKEN_UNIT = 10n ** 10n;
const BOARD_MULTIPLIER = 20_000n;
const TRANSFER_AMOUNT = 1_000n * TOKEN_UNIT;

async function main() {
  const { provider, founder, access, token, votingPower } = await bootstrapGovernance(RPC_URL);
  const voter1 = walletAt(provider, 1);
  const outsider = walletAt(provider, 2);
  const voter1Address = await voter1.getAddress();
  const outsiderAddress = await outsider.getAddress();

  await expectRevert(
    votingPower.connect(outsider).setMaxLockDuration(1n, { gasLimit: 1_000_000 }),
    "votingPower:setMaxLockDuration:unauthorized"
  );
  await sendAndWait(votingPower.connect(founder).setMaxLockDuration(90n * 24n * 60n * 60n, { gasLimit: 1_000_000 }), "votingPower:setMaxLockDuration");

  const boardRole = ROLE.BOARD_MEMBER_ROLE;
  await sendAndWait(access.connect(founder).grantRole(boardRole, voter1Address, ethers.MaxUint256), "access:grantRole:board:voter1");
  await sendAndWait(token.connect(founder).transfer(voter1Address, TRANSFER_AMOUNT, { gasLimit: 1_500_000 }), "token:transfer:voter1");
  await sendAndWait(votingPower.connect(founder).setupInitialVotingPower(voter1Address, TRANSFER_AMOUNT, { gasLimit: 1_500_000 }), "votingPower:setupInitial:voter1");

  await expectRevert(
    votingPower.connect(outsider).setRoleMultiplier(boardRole, BOARD_MULTIPLIER, { gasLimit: 1_000_000 }),
    "votingPower:setRoleMultiplier:unauthorized"
  );
  await sendAndWait(votingPower.connect(founder).setRoleMultiplier(boardRole, BOARD_MULTIPLIER, { gasLimit: 1_000_000 }), "votingPower:setRoleMultiplier");
  await sendAndWait(votingPower.connect(founder).updateVotingPower(voter1Address, { gasLimit: 1_500_000 }), "votingPower:update:voter1");

  const expectedVotes = (TRANSFER_AMOUNT * BOARD_MULTIPLIER) / 10_000n;
  if ((await votingPower.getVotingPower(voter1Address)) !== expectedVotes) {
    throw new Error("board role multiplier should apply after voting power refresh");
  }

  await expectRevert(
    votingPower.connect(outsider).updateVotingPower(voter1Address, { gasLimit: 1_500_000 }),
    "votingPower:update:unauthorized"
  );

  await sendAndWait(token.connect(founder).transfer(outsiderAddress, TRANSFER_AMOUNT, { gasLimit: 1_500_000 }), "token:transfer:outsider");
  await sendAndWait(votingPower.connect(founder).setupInitialVotingPower(outsiderAddress, TRANSFER_AMOUNT, { gasLimit: 1_500_000 }), "votingPower:setupInitial:outsider");
  await sendAndWait(votingPower.connect(founder).updateVotingPowerBatch([voter1Address, outsiderAddress], { gasLimit: 2_000_000 }), "votingPower:updateBatch");

  const tooMany = Array.from({ length: 101 }, (_, i) => ethers.getAddress(`0x${(i + 1).toString(16).padStart(40, "0")}`));
  await expectRevert(
    votingPower.connect(founder).updateVotingPowerBatch(tooMany, { gasLimit: 8_000_000 }),
    "votingPower:updateBatch:tooMany"
  );
  await expectRevert(
    votingPower.connect(founder).updateVotingPowerBatch([voter1Address, ethers.ZeroAddress], { gasLimit: 2_000_000 }),
    "votingPower:updateBatch:zeroAddress"
  );

  console.log("TRACE_VOTING_POWER_ADMIN_CONTROLS: PASS");
}

main().catch((err) => {
  console.error("TRACE_VOTING_POWER_ADMIN_CONTROLS: FAIL");
  console.error(err);
  process.exit(1);
});
