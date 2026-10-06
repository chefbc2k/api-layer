import { describe, expect, it, vi } from "vitest";
import { Interface } from "ethers";

import { facetRegistry } from "../generated/registry.js";
import { getAllAbiMethodDefinitions, type AbiParameter } from "./abi-registry.js";
import { invokeRead } from "./invoke.js";

const diamondAddress = "0x0000000000000000000000000000000000000001";
const fixtureAddress = "0x00000000000000000000000000000000000000aa";

const readGapKeys = [
  "CommunityRewardsFacet.vestedAmount",
  "DelegationFacet.DELEGATION_TYPEHASH",
  "DelegationFacet.DOMAIN_TYPEHASH",
  "DelegationFacet.getPriorVotes",
  "DelegationFacet.getTotalVotingPower",
  "EchoScoreFacetV3.getEchoScoreOracleV3",
  "EchoScoreFacetV3.getOracleFutureDriftConfig",
  "EchoScoreFacetV3.getOracleQuorumSigners",
  "EchoScoreFacetV3.getOracleStalenessConfig",
  "EchoScoreFacetV3.getReputation",
  "EchoScoreFacetV3.getReputationHistory",
  "EchoScoreFacetV3.isEchoScorePausedV3",
  "EchoScoreFacetV3.isOracleHealthy",
  "LegacyViewFacet.validateBeneficiaries",
  "PaymentFacet.getMevProtectionConfig",
  "PaymentFacet.getPendingTimewaveGift",
  "RightsFacet.getCategoryContracts",
  "RightsFacet.getRightCategory",
  "RightsFacet.getRightContract",
  "RightsFacet.getRightsGroup",
  "RightsFacet.getUserRights",
  "RightsFacet.rightIdExists",
  "StakingFacet.getDegradedModeConfig",
  "StakingFacet.getEffectiveApy",
  "StakingFacet.getRewardBreakdown",
  "StakingFacet.getStakeAgeMultiplier",
  "StakingFacet.getTier",
  "StakingFacet.getTierConfig",
  "StakingFacet.isDegradedModeActive",
  "TimewaveGiftFacet.canTransferVesting",
  "TimewaveGiftFacet.getNextUnlockTime",
  "TimewaveGiftFacet.getReleasableTwaveAmount",
  "TimewaveGiftFacet.getVestedTwaveAmount",
  "TimewaveGiftFacet.getVestingTwaveSchedule",
  "TimewaveGiftFacet.isFullyVested",
  "TimewaveGiftFacet.isVestingActive",
  "VestingFacet.calculateCexVesting",
  "VestingFacet.calculateDevFundVesting",
  "VestingFacet.calculateFounderVesting",
  "VestingFacet.calculatePublicVesting",
  "VestingFacet.calculateTeamVesting",
  "VestingFacet.getSellableAmount",
  "VestingFacet.getStandardVestedAmount",
  "VestingFacet.getStandardVestingReleasable",
  "VestingFacet.getVestingType",
  "VestingFacet.veGetRoleAdmin",
  "VestingFacet.veGetVestingSchedule",
  "VestingFacet.veHasRole",
  "VestingFacet.veSupportsInterface",
  "VoiceAssetFacet.getRoyaltyHistory",
  "VoiceAssetFacet.getUserVoices",
  "VoiceAssetFacet.getVoiceHash",
  "VoiceAssetFacet.voiceAssetBalanceOf",
  "VoiceAssetFacet.voiceAssetName",
  "VoiceAssetFacet.voiceAssetSymbol",
  "VoiceMetadataFacet.getVoiceCategories",
  "VoiceMetadataFacet.searchVoicesByClassificationPaginated",
  "VotingPowerFacet.MAX_BATCH_SIZE",
  "VotingPowerFacet.getDelegatedVotingPower",
  "VotingPowerFacet.getLatestCheckpoint",
  "VotingPowerFacet.getLockTimestamp",
  "VotingPowerFacet.getPastVotes",
  "VotingPowerFacet.getVotes",
  "VotingPowerFacet.getVotingPowerWithDelegations",
] as const;

function fixtureValue(parameter: AbiParameter): unknown {
  const array = parameter.type.match(/^(.*)\[(\d*)\]$/u);
  if (array) {
    const length = array[2] ? Number(array[2]) : 1;
    return Array.from({ length }, () => fixtureValue({ ...parameter, type: array[1] }));
  }
  if (parameter.type === "tuple") {
    return (parameter.components ?? []).map((component) => fixtureValue(component));
  }
  if (parameter.type === "address") return fixtureAddress;
  if (parameter.type === "bool") return true;
  if (parameter.type === "string") return "fixture-state";
  const fixedBytes = parameter.type.match(/^bytes(\d+)$/u);
  if (fixedBytes) return `0x${"11".repeat(Number(fixedBytes[1]))}`;
  if (/^u?int\d*$/u.test(parameter.type)) return 1n;
  throw new Error(`missing read fixture value for ABI type ${parameter.type}`);
}

describe("report-driven ABI read fixtures", () => {
  it.each(readGapKeys)("executes %s against ABI-native state and decodes its result", async (methodKey) => {
    const definition = getAllAbiMethodDefinitions()[methodKey];
    expect(definition, methodKey).toBeDefined();
    expect(definition.category, methodKey).toBe("read");
    const facetName = definition.facetName as keyof typeof facetRegistry;
    const iface = new Interface(facetRegistry[facetName].abi);
    const args = definition.inputs.map((input) => fixtureValue(input));
    const outputs = definition.outputs.map((output) => fixtureValue(output));
    const runner = {
      call: vi.fn(async (transaction: { to?: string; data?: string }) => {
        expect(transaction.to).toBe(diamondAddress);
        expect(transaction.data).toBe(iface.encodeFunctionData(definition.wrapperKey, args));
        return iface.encodeFunctionResult(definition.wrapperKey, outputs);
      }),
    };
    const providerRouter = {
      withProvider: vi.fn(async (
        kind: string,
        key: string,
        work: (provider: unknown) => Promise<unknown>,
      ) => {
        expect(kind).toBe("read");
        expect(key).toBe(methodKey);
        return work(runner);
      }),
    };
    const cache = { get: vi.fn().mockReturnValue(null), set: vi.fn() };
    const addressBook = { resolveFacetAddress: vi.fn().mockReturnValue(diamondAddress) };

    const result = await invokeRead({
      addressBook,
      providerRouter,
      cache,
      executionSource: "auto",
    } as never, facetName, definition.wrapperKey, args, definition.liveRequired, definition.cacheTtlSeconds);

    expect(result, methodKey).toBeDefined();
    expect(runner.call).toHaveBeenCalledOnce();
    expect(addressBook.resolveFacetAddress).toHaveBeenCalledWith(facetName);
  });
});
