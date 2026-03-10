#!/usr/bin/env node
"use strict";

const { ethers } = require("ethers");
require("dotenv").config();
const {
  ROLE,
  loadArtifact,
  createProvider,
  sendAndWait,
  expectRevert,
  randomWallet,
  fundEth
} = require("./lib/access_helpers");
const { assertLiveMutationAllowed, readContractAtReceiptBlock, waitForProviderBlock } = require("./lib/validation_safety");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ACCESS_MUTATION_GAS_LIMIT = 1_200_000;

async function expectStaticRevert(callFn, label) {
  let err;
  try {
    await callFn();
  } catch (e) {
    err = e;
  }
  if (!err) throw new Error(`${label}: expected revert`);
  const data = err?.data || err?.info?.error?.data || "<none>";
  console.log(`[expect-revert-ok] ${label} data=${data}`);
}

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const provider = createProvider(RPC_URL);
  await assertLiveMutationAllowed(provider, "trace_access_liveness_recovery.js");
  const founder = new ethers.NonceManager(new ethers.Wallet(PRIVATE_KEY, provider));
  const founderAddress = await founder.getAddress();
  const board1 = randomWallet(provider);
  const board2 = randomWallet(provider);
  const board3 = randomWallet(provider);
  const board4 = randomWallet(provider);
  const emergencyAdmin = randomWallet(provider);

  const board1Address = await board1.getAddress();
  const board2Address = await board2.getAddress();
  const board3Address = await board3.getAddress();
  const board4Address = await board4.getAddress();
  const emergencyAdminAddress = await emergencyAdmin.getAddress();

  const access = new ethers.Contract(
    DIAMOND_ADDRESS,
    loadArtifact("out/AccessControlFacet.sol/AccessControlFacet.json").abi,
    provider
  );
  const initialBoardMembers = await access.getRoleMembers(ROLE.BOARD_MEMBER_ROLE);
  const boardConfig = await access.getRoleConfig(ROLE.BOARD_MEMBER_ROLE);
  const founderHadTimelock = await access.hasRole(ROLE.TIMELOCK_ROLE, founderAddress);
  const founderHadEmergencyAdmin = await access.hasRole(ROLE.EMERGENCY_ADMIN_ROLE, founderAddress);
  const originalRecoveryActive = boardConfig.recoveryActive;
  let latestRoleMutationReceipt = null;

  await fundEth(founder, [board1, emergencyAdmin]);
  try {
    if (!founderHadTimelock) {
      latestRoleMutationReceipt = await sendAndWait(
        access.connect(founder).grantRole(ROLE.TIMELOCK_ROLE, founderAddress, ethers.MaxUint256, {
          gasLimit: ACCESS_MUTATION_GAS_LIMIT
        }),
        "grantRole:TIMELOCK_ROLE:founder"
      );
    }
    latestRoleMutationReceipt = await sendAndWait(
      access.connect(founder).grantRole(ROLE.BOARD_MEMBER_ROLE, board1Address, ethers.MaxUint256, {
        gasLimit: ACCESS_MUTATION_GAS_LIMIT
      }),
      "grantRole:BOARD_MEMBER_ROLE:board1"
    );
    latestRoleMutationReceipt = await sendAndWait(
      access.connect(founder).grantRole(ROLE.BOARD_MEMBER_ROLE, board2Address, ethers.MaxUint256, {
        gasLimit: ACCESS_MUTATION_GAS_LIMIT
      }),
      "grantRole:BOARD_MEMBER_ROLE:board2"
    );
    latestRoleMutationReceipt = await sendAndWait(
      access.connect(founder).grantRole(ROLE.BOARD_MEMBER_ROLE, board3Address, ethers.MaxUint256, {
        gasLimit: ACCESS_MUTATION_GAS_LIMIT
      }),
      "grantRole:BOARD_MEMBER_ROLE:board3"
    );

    const boardMembersAfterBootstrap = await readContractAtReceiptBlock(
      access,
      "getRoleMembers",
      [ROLE.BOARD_MEMBER_ROLE],
      latestRoleMutationReceipt
    );
    const expectedBootstrapMembers = initialBoardMembers.length + 3;
    if (boardMembersAfterBootstrap.length !== expectedBootstrapMembers) {
      throw new Error(
        `board membership should increase by 3, expected ${expectedBootstrapMembers}, got ${boardMembersAfterBootstrap.length}`
      );
    }
    const expectedBootstrapQuorum = BigInt(
      Math.max(
        Number(boardConfig.absoluteMinQuorum),
        Math.ceil((boardMembersAfterBootstrap.length * Number(boardConfig.quorumBps)) / 10_000)
      )
    );
    const bootstrapQuorum = await readContractAtReceiptBlock(
      access,
      "getQuorum",
      [ROLE.BOARD_MEMBER_ROLE],
      latestRoleMutationReceipt
    );
    if (bootstrapQuorum !== expectedBootstrapQuorum) {
      throw new Error(`board quorum should track live config at bootstrap membership (${expectedBootstrapQuorum})`);
    }

    await expectStaticRevert(
      () => access.connect(founder).getQuorum.staticCall(ROLE.TREASURY_ROLE),
      "getQuorum:treasuryRole"
    );

    // Walk the role back to the configured minimum, then verify one more revoke is blocked.
    if (boardMembersAfterBootstrap.length > Number(boardConfig.minMemberLimit)) {
      latestRoleMutationReceipt = await sendAndWait(
        access.connect(founder).revokeRole(ROLE.BOARD_MEMBER_ROLE, board3Address, "return-to-min", {
          gasLimit: ACCESS_MUTATION_GAS_LIMIT
        }),
        "revokeRole:BOARD_MEMBER_ROLE:board3"
      );
    }
    let boardMembersAfterRevoke = await readContractAtReceiptBlock(
      access,
      "getRoleMembers",
      [ROLE.BOARD_MEMBER_ROLE],
      latestRoleMutationReceipt
    );
    if (boardMembersAfterRevoke.length > Number(boardConfig.minMemberLimit)) {
      latestRoleMutationReceipt = await sendAndWait(
        access.connect(founder).revokeRole(ROLE.BOARD_MEMBER_ROLE, board2Address, "return-to-min", {
          gasLimit: ACCESS_MUTATION_GAS_LIMIT
        }),
        "revokeRole:BOARD_MEMBER_ROLE:board2"
      );
    }
    boardMembersAfterRevoke = await readContractAtReceiptBlock(
      access,
      "getRoleMembers",
      [ROLE.BOARD_MEMBER_ROLE],
      latestRoleMutationReceipt
    );
    if (boardMembersAfterRevoke.length > Number(boardConfig.minMemberLimit)) {
      latestRoleMutationReceipt = await sendAndWait(
        access.connect(founder).revokeRole(ROLE.BOARD_MEMBER_ROLE, board1Address, "return-to-min", {
          gasLimit: ACCESS_MUTATION_GAS_LIMIT
        }),
        "revokeRole:BOARD_MEMBER_ROLE:board1"
      );
    }
    boardMembersAfterRevoke = await readContractAtReceiptBlock(
      access,
      "getRoleMembers",
      [ROLE.BOARD_MEMBER_ROLE],
      latestRoleMutationReceipt
    );
    const minGuardTarget = boardMembersAfterRevoke[0];
    await expectStaticRevert(
      () => access.connect(founder).revokeRole.staticCall(ROLE.BOARD_MEMBER_ROLE, minGuardTarget, "below min"),
      "revokeRole:BOARD_MEMBER_ROLE:minMemberGuard"
    );

    if (founderHadEmergencyAdmin) {
      latestRoleMutationReceipt = await sendAndWait(
        access.connect(founder).setRecoveryActive(ROLE.BOARD_MEMBER_ROLE, true, {
          gasLimit: ACCESS_MUTATION_GAS_LIMIT
        }),
        "setRecoveryActive:BOARD_MEMBER_ROLE:true"
      );
      latestRoleMutationReceipt = await sendAndWait(
        access.connect(founder).emergencyForceAdd(ROLE.BOARD_MEMBER_ROLE, board4Address, {
          gasLimit: ACCESS_MUTATION_GAS_LIMIT
        }),
        "emergencyForceAdd:BOARD_MEMBER_ROLE:board4"
      );
      if (!(await access.hasRole(ROLE.BOARD_MEMBER_ROLE, board4Address))) {
        throw new Error("emergency force add should add board4");
      }
      const boardMembersAfterRecovery = await readContractAtReceiptBlock(
        access,
        "getRoleMembers",
        [ROLE.BOARD_MEMBER_ROLE],
        latestRoleMutationReceipt
      );
      const expectedRecoveryQuorum = BigInt(
        Math.max(
          Number(boardConfig.absoluteMinQuorum),
          Math.ceil((boardMembersAfterRecovery.length * Number(boardConfig.quorumBps)) / 10_000)
        )
      );
      const recoveryQuorum = await readContractAtReceiptBlock(
        access,
        "getQuorum",
        [ROLE.BOARD_MEMBER_ROLE],
        latestRoleMutationReceipt
      );
      if (recoveryQuorum !== expectedRecoveryQuorum) {
        throw new Error(`board quorum should follow live config after recovery (${expectedRecoveryQuorum})`);
      }
      const boardConfigAfterRecovery = await readContractAtReceiptBlock(
        access,
        "getRoleConfig",
        [ROLE.BOARD_MEMBER_ROLE],
        latestRoleMutationReceipt
      );
      if (boardConfigAfterRecovery.recoveryActive) throw new Error("recovery flag should auto-clear after emergency add");

      await expectStaticRevert(
        () => access.connect(founder).emergencyForceAdd.staticCall(ROLE.MARKETPLACE_ADMIN_ROLE, emergencyAdminAddress),
        "emergencyForceAdd:nonRecoverableRole"
      );
    } else {
      console.log("[skip] emergencyForceAdd path requires a baseline emergency admin signer; skipping to keep restore safe");
    }

    console.log("TRACE_ACCESS_LIVENESS_RECOVERY: PASS");
  } finally {
    if (latestRoleMutationReceipt) {
      await waitForProviderBlock(provider, latestRoleMutationReceipt.blockNumber);
    }
    let currentBoardMembers = await access.getRoleMembers(ROLE.BOARD_MEMBER_ROLE);
    const initialBoardMemberSet = new Set(initialBoardMembers.map((address) => address.toLowerCase()));
    const restoreFloor = Math.max(initialBoardMembers.length, Number(boardConfig.minMemberLimit));
    if (currentBoardMembers.length > initialBoardMembers.length && await access.hasRole(ROLE.BOARD_MEMBER_ROLE, board4Address)) {
      latestRoleMutationReceipt = await sendAndWait(
        access.connect(founder).revokeRole(ROLE.BOARD_MEMBER_ROLE, board4Address, "restore", {
          gasLimit: ACCESS_MUTATION_GAS_LIMIT
        }),
        "restoreRole:BOARD_MEMBER_ROLE:board4"
      );
      currentBoardMembers = await readContractAtReceiptBlock(
        access,
        "getRoleMembers",
        [ROLE.BOARD_MEMBER_ROLE],
        latestRoleMutationReceipt
      );
    }
    for (const boardAddress of [board1Address, board2Address, board3Address]) {
      if (
        currentBoardMembers.length > restoreFloor
        && !initialBoardMemberSet.has(boardAddress.toLowerCase())
        && await access.hasRole(ROLE.BOARD_MEMBER_ROLE, boardAddress)
      ) {
        latestRoleMutationReceipt = await sendAndWait(
          access.connect(founder).revokeRole(ROLE.BOARD_MEMBER_ROLE, boardAddress, "restore", {
            gasLimit: ACCESS_MUTATION_GAS_LIMIT
          }),
          `restoreRole:BOARD_MEMBER_ROLE:${boardAddress}`
        );
        currentBoardMembers = await readContractAtReceiptBlock(
          access,
          "getRoleMembers",
          [ROLE.BOARD_MEMBER_ROLE],
          latestRoleMutationReceipt
        );
      }
    }
    if ((await access.getRoleConfig(ROLE.BOARD_MEMBER_ROLE)).recoveryActive !== originalRecoveryActive) {
      latestRoleMutationReceipt = await sendAndWait(
        access.connect(founder).setRecoveryActive(ROLE.BOARD_MEMBER_ROLE, originalRecoveryActive, {
          gasLimit: ACCESS_MUTATION_GAS_LIMIT
        }),
        "restoreRecoveryActive:BOARD_MEMBER_ROLE"
      );
    }
    if (!founderHadTimelock && await access.hasRole(ROLE.TIMELOCK_ROLE, founderAddress)) {
      latestRoleMutationReceipt = await sendAndWait(
        access.connect(founder).revokeRole(ROLE.TIMELOCK_ROLE, founderAddress, "restore", {
          gasLimit: ACCESS_MUTATION_GAS_LIMIT
        }),
        "restoreRole:TIMELOCK_ROLE:founder"
      );
    }
  }
}

main().catch((err) => {
  console.error("TRACE_ACCESS_LIVENESS_RECOVERY: FAIL");
  console.error(err);
  process.exit(1);
});
