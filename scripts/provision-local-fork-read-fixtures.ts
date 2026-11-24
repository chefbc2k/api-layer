import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Contract, isError, JsonRpcProvider, ZeroAddress, Wallet } from "ethers";

import { loadRepoEnv } from "../packages/client/src/runtime/config.js";
import { isLoopbackRpcUrl, resolveRuntimeConfig } from "./alchemy-debug-lib.js";
import { ensureLocalForkRightsGroupFixture } from "./local-fork-read-fixture.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultOutput = path.join(".runtime", "local-fork-proofs", "read-fixtures.json");

function outputPath(args: string[]): string {
  const index = args.indexOf("--output");
  return path.resolve(rootDir, index >= 0 && args[index + 1] ? args[index + 1] : defaultOutput);
}

async function main(): Promise<void> {
  const repoEnv = loadRepoEnv();
  const runtime = await resolveRuntimeConfig(repoEnv);
  const { config } = runtime;
  if (!isLoopbackRpcUrl(config.cbdpRpcUrl)) {
    throw new Error("rights_group_fixture_requires_loopback_fork");
  }
  if (!repoEnv.PRIVATE_KEY) throw new Error("missing_local_fork_fixture_signer");

  const fixturePath = path.join(rootDir, ".runtime", "base-sepolia-operator-fixtures.json");
  const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as {
    network?: { chainId?: number; diamondAddress?: string };
    actors?: { buyer?: { address?: string } };
    marketplace?: { agedListingFixture?: { voiceHash?: string; status?: string } };
  };
  const voiceHash = fixture.marketplace?.agedListingFixture?.voiceHash;
  const diamondAddress = fixture.network?.diamondAddress ?? config.diamondAddress;
  const member = fixture.actors?.buyer?.address;
  if (!voiceHash || !member || fixture.marketplace?.agedListingFixture?.status !== "ready") {
    throw new Error("missing_ready_local_marketplace_asset_fixture");
  }

  const provider = new JsonRpcProvider(config.cbdpRpcUrl, config.chainId);
  try {
    const latestAsset = await new Contract(diamondAddress, JSON.parse(await readFile(path.join(rootDir, "abis", "facets", "VoiceAssetFacet.json"), "utf8")), provider).getVoiceAssetsByOwner(member);
    const verifiedVoiceHash = Array.isArray(latestAsset) && latestAsset.length > 0 ? String(latestAsset[latestAsset.length - 1]) : voiceHash;
    const founder = new Wallet(repoEnv.PRIVATE_KEY, provider);
    const upgradeAbi = JSON.parse(await readFile(path.join(rootDir, "abis", "facets", "UpgradeControllerFacet.json"), "utf8"));
    const upgradeReader = new Contract(diamondAddress, upgradeAbi, provider);
    const configuredUpgradeKeys = Object.entries(repoEnv)
      .filter(([key, value]) => (/^UPGRADE_SIGNER_PRIVATE_KEY_\d+$/u.test(key) || /^ORACLE_SIGNER_PRIVATE_KEY_\d+$/u.test(key) || key === "ORACLE_WALLET_PRIVATE_KEY") && typeof value === "string" && value.length > 0)
      .map(([, value]) => new Wallet(value as string, provider));
    const upgradeSigner = await [founder, ...configuredUpgradeKeys].reduce<Promise<Wallet | null>>(async (current, candidate) => {
      const selected = await current;
      return selected ?? (await upgradeReader.isUpgradeSigner(candidate.address) ? candidate : null);
    }, Promise.resolve(null));
    if (!upgradeSigner) throw new Error("missing_configured_local_upgrade_signer");
    await provider.send("anvil_setBalance", [upgradeSigner.address, "0xde0b6b3a7640000"]);
    const upgradeController = new Contract(diamondAddress, upgradeAbi, upgradeSigner);
    const upgradeTx = await upgradeController.proposeDiamondCut([], ZeroAddress, "0x");
    const upgradeReceipt = await upgradeTx.wait();
    if (upgradeReceipt?.status !== 1) throw new Error("upgrade_read_fixture_receipt_failed");
    const proposedEvent = upgradeReceipt.logs
      .map((log) => { try { return upgradeController.interface.parseLog(log); } catch { return null; } })
      .find((event) => event?.name === "UpgradeProposed");
    const upgradeId = proposedEvent?.args?.upgradeId as string | undefined;
    if (!upgradeId) throw new Error("upgrade_read_fixture_id_missing");
    await upgradeController.getUpgrade(upgradeId);
    await upgradeReader.isUpgradeApproved(upgradeId, upgradeSigner.address);
    const abi = JSON.parse(await readFile(path.join(rootDir, "abis", "facets", "RightsFacet.json"), "utf8"));
    const rights = new Contract(diamondAddress, abi, founder);
    const reader = new Contract(diamondAddress, abi, provider);
    const timestamp = BigInt((await provider.getBlock("latest"))?.timestamp ?? Math.floor(Date.now() / 1_000));
    const result = await ensureLocalForkRightsGroupFixture({
      rpcUrl: config.cbdpRpcUrl,
      voiceHash,
      verifiedVoiceHash,
      member,
      timestamp,
      fixtureName: `api-local-fork-rights-${Date.now()}`,
      readExisting: async () => {
        try {
          await reader.getRightsGroup(voiceHash, 0);
          return true;
        } catch (error) {
          if (isError(error, "CALL_EXCEPTION") && /ARRAY_RANGE_ERROR\(50\)|Panic\(uint256\)/u.test(error.message)) return false;
          throw error;
        }
      },
      fundSigner: async () => {
        await provider.send("anvil_setBalance", [founder.address, "0xde0b6b3a7640000"]);
      },
      createGroup: async ({ name, rights: groups, members }) => {
        const receipt = await (await rights.createRightsGroup(voiceHash, name, groups, members)).wait();
        return {
          status: receipt?.status ?? null,
          transactionHash: receipt?.hash ?? "",
          blockNumber: receipt?.blockNumber ?? 0,
        };
      },
      verifyGroup: async () => { await reader.getRightsGroup(voiceHash, 0); },
    });

    const target = outputPath(process.argv.slice(2));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, `${JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), chainId: config.chainId, rpcUrl: config.cbdpRpcUrl, diamondAddress, ...result, upgradeId, upgradeTransactionHash: upgradeReceipt.hash }, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ status: "created", methodKey: result.methodKey, groupIndex: result.groupIndex, fixtureStatus: result.status, voiceHash: result.voiceHash, upgradeId, output: path.relative(rootDir, target) }));
  } finally {
    await provider.destroy();
  }
}

main().catch((error: unknown) => {
  const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : "fixture_failed";
  const message = error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500);
  console.error(JSON.stringify({ status: "failed", code, message }));
  process.exitCode = 1;
});
