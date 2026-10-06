import { describe, expect, it, vi } from "vitest";
import { Interface, type Log } from "ethers";

import {
  facetRegistry,
  getAllAbiEventDefinitions,
  getAllWriteInvariantDefinitions,
  getWriteInvariantDefinition,
} from "../../client/src/index.js";
import type { AbiEventDefinition, AbiParameter } from "../../client/src/runtime/abi-registry.js";
import { buildEventRegistry, decodeEvent, isAmbiguousEvent, resolveExpectedEvent, type DecodedEvent } from "./events.js";
import { projectEvent } from "./projections/index.js";

const AMBIGUOUS_EVENT_KEYS = [
  "BurnThresholdFacet.Transfer",
  "DelegationFacet.VotingPowerUpdated",
  "EscrowFacet.AssetEscrowed",
  "MarketplaceFacet.AssetEscrowed",
  "TokenSupplyFacet.Approval",
  "TokenSupplyFacet.Transfer",
  "VoiceAssetFacet.Approval",
  "VoiceAssetFacet.Transfer",
  "VoiceAssetFacet.VoiceAssetUsed",
  "VoiceDatasetFacet.Transfer",
  "VoiceLicenseFacet.LicenseCreated(bytes32,address,bytes32,uint256,uint256)",
  "VoiceLicenseFacet.VoiceAssetUsed",
  "VoiceLicenseTemplateFacet.LicenseCreated",
  "VotingPowerFacet.VotingPowerUpdated",
].sort();

function sampleValue(parameter: AbiParameter): unknown {
  const array = parameter.type.match(/^(.*)\[(\d*)\]$/);
  if (array) {
    const length = array[2] ? Number(array[2]) : 1;
    return Array.from({ length }, () => sampleValue({ ...parameter, type: array[1] }));
  }
  if (parameter.type === "tuple") {
    return (parameter.components ?? []).map((component) => sampleValue(component));
  }
  if (parameter.type === "address") {
    return "0x00000000000000000000000000000000000000aa";
  }
  if (parameter.type === "bool") {
    return true;
  }
  if (parameter.type === "string") {
    return "event-assurance";
  }
  if (parameter.type === "bytes") {
    return "0x1234";
  }
  const fixedBytes = parameter.type.match(/^bytes(\d+)$/);
  if (fixedBytes) {
    return `0x${"11".repeat(Number(fixedBytes[1]))}`;
  }
  if (/^u?int\d*$/.test(parameter.type)) {
    return 1n;
  }
  throw new Error(`missing event assurance sample for ABI type ${parameter.type}`);
}

function encodeLog(definition: AbiEventDefinition, index: number): Log {
  const facet = facetRegistry[definition.facetName as keyof typeof facetRegistry];
  const iface = new Interface(facet.abi);
  const fragment = iface.getEvent(definition.wrapperKey);
  if (!fragment) {
    throw new Error(`missing generated event fragment ${definition.facetName}.${definition.wrapperKey}`);
  }
  const encoded = iface.encodeEventLog(fragment, definition.inputs.map((input) => sampleValue(input)));
  return {
    address: "0x0000000000000000000000000000000000000001",
    data: encoded.data,
    topics: encoded.topics,
    transactionHash: `0x${index.toString(16).padStart(64, "0")}`,
    blockHash: `0x${(index + 1).toString(16).padStart(64, "0")}`,
    blockNumber: index + 1,
    index,
    removed: false,
  } as unknown as Log;
}

describe("generated event-to-indexer assurance", () => {
  it("registers and decodes the complete generated event inventory without silent facet selection", () => {
    const definitions = Object.entries(getAllAbiEventDefinitions()).sort(([left], [right]) => left.localeCompare(right));
    const registry = buildEventRegistry();
    const registeredKeys = [...registry.values()]
      .flatMap((candidates) => candidates.map((candidate) => candidate.fullEventKey))
      .sort((left, right) => left.localeCompare(right));
    const ambiguousKeys: string[] = [];

    expect(definitions).toHaveLength(214);
    expect(registeredKeys).toEqual(definitions.map(([eventKey]) => eventKey));

    definitions.forEach(([eventKey, definition], index) => {
      const decoded = decodeEvent(registry, encodeLog(definition, index));
      expect(decoded, eventKey).not.toBeNull();
      if (isAmbiguousEvent(decoded!)) {
        expect(decoded!.candidateEventKeys, eventKey).toContain(eventKey);
        ambiguousKeys.push(eventKey);
        return;
      }
      expect(decoded, eventKey).toMatchObject({
        facetName: definition.facetName,
        eventName: definition.eventName,
        wrapperKey: definition.wrapperKey,
        fullEventKey: eventKey,
        signature: definition.signature,
      });
    });

    expect(ambiguousKeys.sort()).toEqual(AMBIGUOUS_EVENT_KEYS);
  });

  it("projects every unambiguous generated event target into the reviewed Postgres table", async () => {
    const definitions = Object.entries(getAllAbiEventDefinitions()).sort(([left], [right]) => left.localeCompare(right));
    const registry = buildEventRegistry();
    const client = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    let expectedQueryCount = 0;
    let provenTargetCount = 0;

    for (const [eventKey, definition] of definitions) {
      const decoded = decodeEvent(registry, encodeLog(definition, provenTargetCount));
      if (!decoded || isAmbiguousEvent(decoded)) {
        continue;
      }
      const callsBefore = client.query.mock.calls.length;
      await projectEvent({
        chainId: 84532,
        client: client as never,
        rawEventId: provenTargetCount + 1,
        txHash: `0x${(provenTargetCount + 1).toString(16).padStart(64, "0")}`,
        blockNumber: BigInt(provenTargetCount + 1),
        blockHash: `0x${(provenTargetCount + 2).toString(16).padStart(64, "0")}`,
        isOrphaned: false,
        decoded: decoded as DecodedEvent,
      });

      const queryCount = definition.projection.targets.reduce(
        (count, target) => count + (target.mode === "current" ? 2 : 1),
        0,
      );
      expectedQueryCount += queryCount;
      provenTargetCount += definition.projection.targets.length;
      expect(client.query.mock.calls.length - callsBefore, eventKey).toBe(queryCount);
      for (const target of definition.projection.targets) {
        expect(
          client.query.mock.calls.some(([sql]) => String(sql).includes(`INSERT INTO ${target.table}`)),
          `${eventKey} -> ${target.table}`,
        ).toBe(true);
      }
    }

    const expectedProvenTargets = definitions
      .filter(([eventKey]) => !AMBIGUOUS_EVENT_KEYS.includes(eventKey))
      .reduce((count, [, definition]) => count + definition.projection.targets.length, 0);
    expect(provenTargetCount).toBe(expectedProvenTargets);
    expect(client.query).toHaveBeenCalledTimes(expectedQueryCount);
  });

  it.each([
    ["DelegationFacet.DelegateChanged(address,address,address)", "governance_delegations"],
    ["DelegationFacet.DelegateVotesChanged(address,uint256,uint256)", "governance_delegations"],
    ["EmergencyFacet.AssetsFrozen", "emergency_incidents"],
    ["EmergencyFacet.EmergencyResumeExecuted", "emergency_incidents"],
    ["EmergencyFacet.EmergencyResumeScheduled", "emergency_incidents"],
    ["EmergencyFacet.EmergencyStateChanged", "emergency_incidents"],
    ["EmergencyFacet.IncidentReported", "emergency_incidents"],
    ["EmergencyFacet.PauseExtended", "emergency_incidents"],
    ["EmergencyFacet.RecoveryCompleted", "emergency_incidents"],
    ["EmergencyFacet.RecoveryStarted", "emergency_incidents"],
    ["EmergencyFacet.RecoveryStepExecuted", "emergency_incidents"],
    ["EmergencyFacet.ResponseExecuted", "emergency_incidents"],
    ["EmergencyWithdrawalFacet.EmergencyEthWithdrawalApproved", "emergency_withdrawals"],
    ["EmergencyWithdrawalFacet.EmergencyEthWithdrawalExecuted", "emergency_withdrawals"],
    ["EmergencyWithdrawalFacet.EmergencyEthWithdrawalRequested", "emergency_withdrawals"],
    ["EmergencyWithdrawalFacet.EmergencyWithdrawal", "emergency_withdrawals"],
    ["EmergencyWithdrawalFacet.EmergencyWithdrawalApproved", "emergency_withdrawals"],
    ["EmergencyWithdrawalFacet.EmergencyWithdrawalExecuted", "emergency_withdrawals"],
    ["EmergencyWithdrawalFacet.EmergencyWithdrawalRequested", "emergency_withdrawals"],
    ["EmergencyWithdrawalFacet.RecipientWhitelisted", "emergency_withdrawals"],
    ["EmergencyWithdrawalFacet.WithdrawalConfigUpdated", "emergency_withdrawals"],
    ["MarketplaceFacet.AssetPurchased", "market_sales"],
    ["MarketplaceFacet.ListingCancelled", "market_listings"],
    ["MarketplaceFacet.ListingPriceUpdated", "market_listings"],
    ["MarketplaceFacet.MarketplacePaused", "market_listings"],
    ["MarketplaceFacet.MarketplaceUnpaused", "market_listings"],
    ["MultiSigFacet.ActionExecuted", "multisig_operations"],
    ["MultiSigFacet.BatchCompleted", "multisig_operations"],
    ["MultiSigFacet.MultiSigOperationCancelled", "multisig_operations"],
    ["MultiSigFacet.OperationApproved", "multisig_operations"],
    ["MultiSigFacet.OperationProposed", "multisig_operations"],
    ["MultiSigFacet.OperationStatusChanged", "multisig_operations"],
    ["OwnershipFacet.OwnershipPolicyEnforcementSet", "ownership_transfers"],
    ["OwnershipFacet.OwnershipTargetApprovalSet", "ownership_transfers"],
    ["OwnershipFacet.OwnershipTransferCancelled", "ownership_transfers"],
    ["OwnershipFacet.OwnershipTransferProposed", "ownership_transfers"],
    ["OwnershipFacet.OwnershipTransferred", "ownership_transfers"],
    ["PaymentFacet.BuybackAccumulatorUpdated", "payment_flows"],
    ["PaymentFacet.BuybackConfigUpdated", "payment_flows"],
    ["PaymentFacet.BuybackExecuted", "payment_flows"],
    ["PaymentFacet.BuybackPaused", "payment_flows"],
    ["PaymentFacet.ClaimCommitted", "payment_flows"],
    ["PaymentFacet.ClaimRevealed", "payment_flows"],
    ["PaymentFacet.DatasetRoyaltyAccrued", "payment_flows"],
    ["PaymentFacet.DevFundAddressUpdated", "payment_flows"],
    ["PaymentFacet.FeeConfigurationUpdated", "payment_flows"],
    ["PaymentFacet.FlashbotsSuggested", "payment_flows"],
    ["PaymentFacet.MetadataAccessed", "payment_flows"],
    ["PaymentFacet.PauseStateChanged", "payment_flows"],
    ["PaymentFacet.PaymentDistributed", "payment_flows"],
    ["PaymentFacet.TimewaveGiftCreated", "payment_flows"],
    ["PaymentFacet.TreasuryAddressUpdated", "payment_flows"],
    ["PaymentFacet.UnionTreasuryAddressUpdated", "payment_flows"],
    ["PaymentFacet.USDCPaymentWithdrawn", "payment_withdrawals"],
    ["PaymentFacet.USDCPaymentWithdrawn", "payment_flows"],
    ["PaymentFacet.UsdcTokenUpdated", "payment_flows"],
    ["PaymentFacet.WithdrawalLimitUpdated", "payment_withdrawals"],
    ["PaymentFacet.WithdrawalLimitUpdated", "payment_flows"],
    ["ProposalFacet.ProposalCanceled", "governance_proposals"],
    ["ProposalFacet.ProposalCreated", "governance_proposals"],
    ["ProposalFacet.ProposalExecuted", "governance_proposals"],
    ["ProposalFacet.ProposalQueued", "governance_proposals"],
    ["ProposalFacet.ProposalTypeConfigSet", "governance_proposals"],
    ["CommunityRewardsFacet.CampaignCapConfig", "reward_campaigns"],
    ["CommunityRewardsFacet.CampaignCreated", "reward_campaigns"],
    ["CommunityRewardsFacet.CampaignMerkleRootUpdated", "reward_campaigns"],
    ["CommunityRewardsFacet.CampaignPaused", "reward_campaigns"],
    ["CommunityRewardsFacet.CampaignUnpaused", "reward_campaigns"],
    ["CommunityRewardsFacet.CampaignVestingConfig", "reward_campaigns"],
    ["CommunityRewardsFacet.Claimed", "reward_claims"],
    ["StakingFacet.EpochAdvanced", "staking_positions"],
    ["StakingFacet.RewardPoolFunded", "staking_positions"],
    ["StakingFacet.RewardsClaimed", "staking_positions"],
    ["StakingFacet.RewardsClaimed", "staking_rewards"],
    ["StakingFacet.RewardsClaimedDetailed", "staking_positions"],
    ["StakingFacet.RewardsClaimedDetailed", "staking_rewards"],
    ["StakingFacet.Staked", "staking_positions"],
    ["StakingFacet.StakingInitialized", "staking_positions"],
    ["StakingFacet.StakingPaused", "staking_positions"],
    ["StakingFacet.TierConfigUpdated", "staking_positions"],
    ["StakingFacet.Unstaked", "staking_positions"],
    ["StakingFacet.UnstakeRequested", "staking_positions"],
    ["TimelockFacet.CallExecuted", "timelock_operations"],
    ["TimelockFacet.MinDelayUpdated(uint256,uint256)", "timelock_operations"],
    ["TimelockFacet.OperationExecuted(bytes32,uint256,uint256)", "timelock_operations"],
    ["TimelockFacet.OperationExecuted(bytes32)", "timelock_operations"],
    ["TimelockFacet.OperationRemoved", "timelock_operations"],
    ["TimelockFacet.OperationScheduled", "timelock_operations"],
    ["TimelockFacet.OperationStored", "timelock_operations"],
    ["TimelockFacet.TimelockOperationCanceled", "timelock_operations"],
    ["TimewaveGiftFacet.TokensVested", "vesting_schedules"],
    ["TimewaveGiftFacet.TokensVested", "vesting_releases"],
    ["TimewaveGiftFacet.VestingRevoked", "vesting_schedules"],
    ["TimewaveGiftFacet.VestingScheduleCreated(address,uint256,uint256,uint256,uint256,bool)", "vesting_schedules"],
    ["TimewaveGiftFacet.VestingTransferred", "vesting_schedules"],
    ["UpgradeControllerFacet.UpgradeApproved", "upgrade_requests"],
    ["UpgradeControllerFacet.UpgradeControlEnforcementSet", "upgrade_requests"],
    ["UpgradeControllerFacet.UpgradeControlFrozen", "upgrade_requests"],
    ["UpgradeControllerFacet.UpgradeControllerInitialized", "upgrade_requests"],
    ["UpgradeControllerFacet.UpgradeExecuted", "upgrade_requests"],
    ["UpgradeControllerFacet.UpgradeProposed", "upgrade_requests"],
    ["VoiceAssetFacet.ApprovalForAll", "voice_assets"],
    ["VoiceAssetFacet.DefaultPlatformFeeUpdated", "voice_assets"],
    ["VoiceAssetFacet.DefaultRoyaltyRateUpdated", "voice_assets"],
    ["VoiceAssetFacet.RegistrationPauseChanged", "voice_assets"],
    ["VoiceAssetFacet.RoyaltyPaid", "voice_assets"],
    ["VoiceAssetFacet.RoyaltyRateChanged", "voice_assets"],
    ["VoiceAssetFacet.RoyaltyRateUpdated", "voice_assets"],
    ["VoiceAssetFacet.UserAuthorizationChanged", "voice_assets"],
    ["VoiceAssetFacet.VoiceAssetLockChanged", "voice_assets"],
    ["VoiceAssetFacet.VoiceAssetRegistered", "voice_assets"],
    ["VoiceDatasetFacet.AssetRemoved", "voice_dataset_members"],
    ["VoiceDatasetFacet.AssetRemoved", "voice_datasets"],
    ["VoiceDatasetFacet.AssetsAppended", "voice_dataset_members"],
    ["VoiceDatasetFacet.AssetsAppended", "voice_datasets"],
    ["VoiceDatasetFacet.DatasetBurned", "voice_datasets"],
    ["VoiceDatasetFacet.DatasetCreated", "voice_datasets"],
    ["VoiceDatasetFacet.DatasetRoyaltyPayeeSet", "voice_datasets"],
    ["VoiceDatasetFacet.DatasetStatusChanged", "voice_datasets"],
    ["VoiceDatasetFacet.LicenseChanged", "voice_datasets"],
    ["VoiceDatasetFacet.MetadataChanged", "voice_datasets"],
    ["VoiceDatasetFacet.RoyaltySet", "voice_datasets"],
    ["VoiceLicenseFacet.Debug", "voice_licenses"],
    ["VoiceLicenseFacet.LicenseBatchGranted", "voice_licenses"],
    ["VoiceLicenseFacet.LicenseEnded", "voice_licenses"],
    ["VoiceLicenseFacet.LicenseRenewed", "voice_licenses"],
    ["VoiceLicenseFacet.LicenseRevoked", "voice_licenses"],
    ["VoiceLicenseFacet.LicenseTermsUpdated", "voice_licenses"],
    ["VoiceLicenseFacet.LicenseTransferred", "voice_licenses"],
    ["VoiceLicenseFacet.LicenseUsed", "voice_licenses"],
    ["VoiceLicenseFacet.TemplateUpdated", "voice_licenses"],
    ["VoiceLicenseTemplateFacet.TemplateUpdated", "voice_license_templates"],
  ])("decodes and idempotently reprojects %s into the %s Postgres projection", async (eventKey, table) => {
    const definition = getAllAbiEventDefinitions()[eventKey];
    expect(definition, eventKey).toBeDefined();
    expect(definition.projection.targets).toContainEqual(expect.objectContaining({ table }));
    const target = definition.projection.targets.find((candidate) => candidate.table === table);

    const registry = buildEventRegistry();
    const encoded = encodeLog(definition, 10_000);
    const decoded = decodeEvent(registry, encoded);
    const replayed = decodeEvent(registry, encoded);
    expect(decoded, eventKey).not.toBeNull();
    expect(isAmbiguousEvent(decoded!), eventKey).toBe(false);
    expect((decoded as DecodedEvent).fullEventKey).toBe(eventKey);
    expect(replayed, eventKey).toEqual(decoded);

    const client = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    const projection = {
      chainId: 84532,
      client: client as never,
      rawEventId: 10_001,
      txHash: `0x${"ab".repeat(32)}`,
      blockNumber: 10_001n,
      blockHash: `0x${"cd".repeat(32)}`,
      isOrphaned: false,
      decoded: decoded as DecodedEvent,
    };
    await projectEvent(projection);
    await projectEvent({ ...projection, decoded: replayed as DecodedEvent });

    const insertCalls = client.query.mock.calls.filter(([sql]) => String(sql).includes(`INSERT INTO ${table}`));
    expect(insertCalls, `${eventKey} -> ${table}`).toHaveLength(2);
    expect(String(insertCalls[0][0])).toContain("ON CONFLICT (source_raw_event_id, entity_id)");
    expect(insertCalls[1][1]).toEqual(insertCalls[0][1]);

    const currentUpdateCalls = client.query.mock.calls.filter(
      ([sql]) => String(sql).includes(`UPDATE ${table}`) && String(sql).includes("SET is_current = FALSE"),
    );
    expect(currentUpdateCalls, `${eventKey} -> ${table}`).toHaveLength(target?.mode === "current" ? 2 : 0);
    if (target?.mode === "current") {
      expect(currentUpdateCalls[0][1]).toEqual([insertCalls[0][1][0]]);
      expect(currentUpdateCalls[1][1]).toEqual(currentUpdateCalls[0][1]);
    }
  });

  it.each([
    "AccessControlFacet.AccessAttempt",
    "AccessControlFacet.DAOMemberRoleGranted",
    "AccessControlFacet.FounderSunsetExecuted",
    "AccessControlFacet.FounderSunsetScheduled",
    "AccessControlFacet.GovernanceParticipantRoleGranted",
    "AccessControlFacet.MarketplacePurchaserRoleGranted",
    "AccessControlFacet.MarketplaceSellerRoleGranted",
    "AccessControlFacet.ParticipantRoleRevoked",
    "AccessControlFacet.ResearchParticipantRoleGranted",
    "AccessControlFacet.RoleAdminChanged",
    "AccessControlFacet.RoleConfigUpdated",
    "AccessControlFacet.RoleGranted",
    "AccessControlFacet.RoleRenounced",
    "AccessControlFacet.RoleRevoked",
    "AccessControlFacet.SecurityAction",
    "BurnThresholdFacet.BurnThresholdUpdated",
    "BurnThresholdFacet.ThresholdBurn",
    "DiamondCutFacet.DiamondCut",
    "DiamondCutFacet.DiamondCutEvent",
    "DiamondCutFacet.TrustedInitCodehashSet",
    "DiamondCutFacet.TrustedInitContractSet",
    "DiamondCutFacet.TrustedInitSelectorSet",
    "EchoScoreFacetV3.OracleFutureDriftConfigUpdated",
    "EchoScoreFacetV3.OracleQuorumConfigUpdated",
    "EchoScoreFacetV3.OracleStalenessConfigUpdated",
    "EchoScoreFacetV3.OracleUpdated",
    "EchoScoreFacetV3.Paused",
    "EchoScoreFacetV3.ReputationUpdated",
    "EchoScoreFacetV3.ScoresUpdated",
    "EchoScoreFacetV3.Unpaused",
    "EscrowFacet.AssetReleased",
    "EscrowFacet.AssetStateUpdated",
    "GovernorFacet.TargetGasLimitUpdated",
    "GovernorFacet.TrustedTargetUpdated",
    "LegacyFacet.BeneficiaryUpdated",
    "LegacyFacet.InheritanceConditionsUpdated",
    "LegacyFacet.LegacyPlanCreated",
    "LegacyExecutionFacet.InheritanceActivated",
    "LegacyExecutionFacet.InheritanceApproved",
    "LegacyExecutionFacet.RightsDelegated",
    "RightsFacet.CollaboratorUpdated",
    "RightsFacet.RightContractRegistered",
    "RightsFacet.RightContractUpdated",
    "RightsFacet.RightGranted",
    "RightsFacet.RightRevoked",
    "RightsFacet.RightsGroupCreated",
    "TokenSupplyFacet.MintingFinished",
    "TokenSupplyFacet.TokenInitialized",
    "VestingFacet.BeneficiaryTransferred",
    "VestingFacet.SaleRestrictionUpdated",
    "VestingFacet.TokensReleased",
    "VestingFacet.VestingInitialized",
    "VestingFacet.VestingPaused",
    "VestingFacet.VestingScheduleCreated",
    "VestingFacet.VestingScheduleRevoked",
    "VestingFacet.VestingUnpaused",
    "VoiceMetadataFacet.AnalysisVersionUpdated",
    "VoiceMetadataFacet.BasicAcousticFeaturesUpdated",
    "VoiceMetadataFacet.ClassificationCategoryUpdated",
    "VoiceMetadataFacet.GeographicDataUpdated",
    "VoiceMetadataFacet.VoiceClassificationsUpdated",
    "VotingPowerFacet.LockDurationUpdated",
    "VotingPowerFacet.MaxLockDurationUpdated",
    "VotingPowerFacet.RoleMultiplierUpdated",
    "WhisperBlockFacet.AccessGranted",
    "WhisperBlockFacet.AccessRevoked",
    "WhisperBlockFacet.AuditEvent",
    "WhisperBlockFacet.KeyRotated",
    "WhisperBlockFacet.OffchainKeyGenerated",
    "WhisperBlockFacet.SecurityParametersUpdated",
    "WhisperBlockFacet.VoiceFingerprintUpdated",
  ])("deterministically replays %s under its reviewed raw-event-only indexer policy", async (eventKey) => {
    const definition = getAllAbiEventDefinitions()[eventKey];
    expect(definition, eventKey).toBeDefined();
    expect(definition.projection).toMatchObject({ projectionMode: "rawOnly", targets: [] });

    const registry = buildEventRegistry();
    const encoded = encodeLog(definition, 20_000);
    const decoded = decodeEvent(registry, encoded);
    const replayed = decodeEvent(registry, encoded);
    expect(decoded, eventKey).not.toBeNull();
    expect(isAmbiguousEvent(decoded!), eventKey).toBe(false);
    expect((decoded as DecodedEvent).fullEventKey).toBe(eventKey);
    expect(replayed).toEqual(decoded);

    const client = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    const projection = {
      chainId: 84532,
      client: client as never,
      rawEventId: 20_001,
      txHash: `0x${"ef".repeat(32)}`,
      blockNumber: 20_001n,
      blockHash: `0x${"12".repeat(32)}`,
      isOrphaned: false,
      decoded: decoded as DecodedEvent,
    };
    await projectEvent(projection);
    await projectEvent({ ...projection, decoded: replayed as DecodedEvent });

    expect(client.query).not.toHaveBeenCalled();
  });

  it("binds every write invariant to decoded, replay-safe indexer evidence", async () => {
    const writes = Object.entries(getAllWriteInvariantDefinitions()).sort(([left], [right]) => left.localeCompare(right));
    const eventDefinitions = getAllAbiEventDefinitions();
    const registry = buildEventRegistry();
    const client = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    let expectationCount = 0;
    let declaredProjectionCount = 0;
    let projectedEventTargetCount = 0;
    let noEventWriteCount = 0;

    expect(writes).toHaveLength(260);
    expect(getWriteInvariantDefinition(writes[0][0])).toBe(writes[0][1]);
    expect(getWriteInvariantDefinition("MissingFacet.missingWrite")).toBeNull();

    for (const [methodKey, write] of writes) {
      const expectation = write.invariants.indexerExpectations;
      expect(expectation.events, methodKey).toEqual(write.invariants.emittedEvents.events);
      if (expectation.mode === "none") {
        expect(expectation.events, methodKey).toEqual([]);
        expect(expectation.projections, methodKey).toEqual([]);
        noEventWriteCount += 1;
        continue;
      }
      declaredProjectionCount += expectation.projections.length;

      for (const eventKey of expectation.events) {
        const definition = eventDefinitions[eventKey];
        expect(definition, `${methodKey} -> ${eventKey}`).toBeDefined();
        const decoded = decodeEvent(registry, encodeLog(definition, expectationCount));
        expect(decoded, `${methodKey} -> ${eventKey}`).not.toBeNull();
        const resolved = resolveExpectedEvent(decoded!, expectation.events);
        expect(isAmbiguousEvent(resolved), `${methodKey} -> ${eventKey}`).toBe(false);
        expect((resolved as DecodedEvent).fullEventKey, `${methodKey} -> ${eventKey}`).toBe(eventKey);

        if (expectation.mode === "required") {
          await projectEvent({
            chainId: 84532,
            client: client as never,
            rawEventId: expectationCount + 1,
            txHash: `0x${(expectationCount + 1).toString(16).padStart(64, "0")}`,
            blockNumber: BigInt(expectationCount + 1),
            blockHash: `0x${(expectationCount + 2).toString(16).padStart(64, "0")}`,
            isOrphaned: false,
            decoded: resolved as DecodedEvent,
          });
          projectedEventTargetCount += definition.projection.targets.length;
        } else {
          expect(definition.projection.targets, `${methodKey} -> ${eventKey}`).toEqual([]);
        }
        expectationCount += 1;
      }
    }

    expect(expectationCount).toBe(281);
    expect(declaredProjectionCount).toBe(154);
    expect(projectedEventTargetCount).toBe(194);
    expect(noEventWriteCount).toBe(30);
  });
});
