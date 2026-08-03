import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  DiamondCutFacet__factory,
  EmergencyFacet__factory,
  TimelockFacet__factory,
} from "../generated/typechain/index.js";
import { JsonRpcProvider, Wallet, ethers } from "ethers";

import { loadRepoEnv } from "../packages/client/src/runtime/config.js";
import {
  isLoopbackRpcUrl,
  resolveRuntimeConfig,
  startLocalForkIfNeeded,
  type ForkRuntime,
} from "./alchemy-debug-lib.js";
import { inspectRpcSnapshots, inspectValueConservation } from "./red-team-harness-lib.js";

const runLocalFork = process.env.API_LAYER_RUN_RED_TEAM_LOCAL_FORK === "1";
const describeLocalFork = runLocalFork ? describe : describe.skip;
const ZERO_BYTES32 = ethers.ZeroHash;

async function expectRpcRejection(operation: Promise<unknown>): Promise<unknown> {
  try {
    await operation;
  } catch (error) {
    expect(error).toBeDefined();
    return error;
  }
  throw new Error("expected local-fork RPC operation to reject");
}

describeLocalFork("red-team local-fork probes", () => {
  let forkRuntime: ForkRuntime;
  let provider: JsonRpcProvider;
  let attacker: Wallet;
  let snapshotId: string;
  let diamondAddress: string;

  beforeAll(async () => {
    const runtimeConfig = await resolveRuntimeConfig(loadRepoEnv());
    forkRuntime = await startLocalForkIfNeeded(runtimeConfig);
    if (!isLoopbackRpcUrl(forkRuntime.rpcUrl)) {
      forkRuntime.forkProcess?.kill("SIGTERM");
      throw new Error(`red-team probes refuse non-loopback RPC ${forkRuntime.rpcUrl}`);
    }

    provider = new JsonRpcProvider(forkRuntime.rpcUrl, runtimeConfig.config.chainId);
    diamondAddress = runtimeConfig.config.diamondAddress;
    snapshotId = await provider.send("evm_snapshot", []);
    attacker = Wallet.createRandom().connect(provider);
    await provider.send("anvil_setBalance", [attacker.address, ethers.toQuantity(ethers.parseEther("1"))]);
  }, 60_000);

  afterAll(async () => {
    if (provider) {
      if (snapshotId) {
        await provider.send("evm_revert", [snapshotId]);
      }
      await provider.destroy();
    }
    forkRuntime?.forkProcess?.kill("SIGTERM");
  });

  it("rejects malformed and unknown calldata at the deployed diamond", async () => {
    await expectRpcRejection(provider.call({
      from: attacker.address,
      to: diamondAddress,
      data: "0x1234",
    }));
    await expectRpcRejection(provider.call({
      from: attacker.address,
      to: diamondAddress,
      data: "0xffffffff",
    }));
  });

  it("rejects replay of the same signed transaction without a second value transfer", async () => {
    const recipient = Wallet.createRandom().address;
    const recipientBefore = await provider.getBalance(recipient);
    const attackerBefore = await provider.getBalance(attacker.address);
    const network = await provider.getNetwork();
    const feeData = await provider.getFeeData();
    const rawTransaction = await attacker.signTransaction({
      chainId: network.chainId,
      nonce: await provider.getTransactionCount(attacker.address),
      type: 2,
      to: recipient,
      value: 17n,
      gasLimit: 21_000n,
      maxFeePerGas: feeData.maxFeePerGas ?? ethers.parseUnits("1", "gwei"),
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? 0n,
    });

    const first = await provider.broadcastTransaction(rawTransaction);
    const receipt = await first.wait();
    expect(receipt?.status).toBe(1);
    expect(await provider.getBalance(recipient, receipt!.blockNumber)).toBe(recipientBefore + 17n);

    await expectRpcRejection(provider.broadcastTransaction(rawTransaction));
    expect(await provider.getBalance(recipient, receipt!.blockNumber)).toBe(recipientBefore + 17n);

    const attackerAfter = await provider.getBalance(attacker.address, receipt!.blockNumber);
    const recipientAfter = await provider.getBalance(recipient, receipt!.blockNumber);
    expect(inspectValueConservation({
      before: { attacker: attackerBefore, recipient: recipientBefore },
      after: { attacker: attackerAfter, recipient: recipientAfter },
      allowedBurn: receipt?.fee ?? 0n,
    })).toEqual([]);
  });

  it("rejects an untrusted malicious initializer and selector collision from an unprivileged signer", async () => {
    const diamondCut = DiamondCutFacet__factory.connect(diamondAddress, attacker);
    const mountedSelector = diamondCut.interface.getFunction("diamondCut").selector;
    await expectRpcRejection(diamondCut.diamondCut.staticCall(
      [{ facetAddress: attacker.address, action: 0, functionSelectors: [mountedSelector] }],
      attacker.address,
      "0x12345678",
    ));
  });

  it("rejects emergency pause/resume and early timelock execution from an unprivileged signer", async () => {
    const emergency = EmergencyFacet__factory.connect(diamondAddress, attacker);
    const stateBefore = await emergency.getEmergencyState();
    await expectRpcRejection(emergency.emergencyStop.staticCall());
    await expectRpcRejection(emergency.emergencyResume.staticCall());
    expect(await emergency.getEmergencyState()).toBe(stateBefore);

    const timelock = TimelockFacet__factory.connect(diamondAddress, attacker);
    await expectRpcRejection(timelock.execute.staticCall(
      0,
      [diamondAddress],
      [0],
      ["0x"],
      ZERO_BYTES32,
      ethers.keccak256(ethers.toUtf8Bytes("red-team-early-execution")),
      1,
    ));
  });

  it("detects a stale RPC snapshot using real local-fork block responses", async () => {
    const oldBlock = await provider.send("eth_getBlockByNumber", ["latest", false]) as {
      number: string;
      hash: string;
    };
    await provider.send("anvil_mine", [ethers.toQuantity(3)]);
    const currentBlock = await provider.send("eth_getBlockByNumber", ["latest", false]) as {
      number: string;
      hash: string;
    };
    const oldCode = await provider.send("eth_getCode", [diamondAddress, oldBlock.number]) as string;
    const currentCode = await provider.send("eth_getCode", [diamondAddress, currentBlock.number]) as string;

    const findings = inspectRpcSnapshots({
      primary: {
        blockNumber: Number(BigInt(currentBlock.number)),
        blockHash: currentBlock.hash,
        valueHash: ethers.keccak256(currentCode),
      },
      secondary: {
        blockNumber: Number(BigInt(oldBlock.number)),
        blockHash: oldBlock.hash,
        valueHash: ethers.keccak256(oldCode),
      },
      maxBlockLag: 1,
    });

    expect(findings.map((finding) => finding.id)).toContain("stale-rpc-head");
  });
});
