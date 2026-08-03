import path from "node:path";
import { pathToFileURL } from "node:url";

import type { AbiEvent, AbiMethod, AbiRegistry, ReviewedWriteInvariantFile, WriteInvariant } from "./write-invariants-lib.js";
import { generatedManifestDir, readJson, writeJson } from "./utils.js";

const reviewedPath = path.resolve("reviewed", "reviewed-write-invariants.json");

const roleByFacet: Record<string, string[]> = {
  AccessControlFacet: ["ADMIN_ROLE_FOR_TARGET_ROLE", "TIMELOCK_ROLE", "FOUNDER_ROLE"],
  BurnThresholdFacet: ["GOVERNANCE_ROLE", "BURNER_ROLE"],
  CommunityRewardsFacet: ["VESTING_MANAGER_ROLE", "GOVERNANCE_ROLE"],
  DiamondCutFacet: ["FOUNDER_ROLE", "GOVERNANCE_ROLE"],
  EchoScoreFacetV3: ["CONFIGURED_ECHO_SCORE_ORACLE", "GOVERNANCE_ROLE"],
  EmergencyFacet: ["EMERGENCY_ADMIN_ROLE", "SECURITY_ADMIN_ROLE", "RECOVERY_APPROVER_ROLE"],
  EmergencyWithdrawalFacet: ["EMERGENCY_ADMIN_ROLE", "TREASURY_SIGNER_ROLE"],
  GovernorFacet: ["GOVERNANCE_ROLE", "TIMELOCK_ROLE"],
  LegacyFacet: ["PLATFORM_ADMIN_ROLE"],
  MarketplaceFacet: ["MARKETPLACE_ADMIN_ROLE", "PAUSER_ROLE"],
  MultiSigFacet: ["CONFIGURED_MULTISIG_OPERATOR"],
  OwnershipFacet: ["DIAMOND_OWNER"],
  PaymentFacet: ["FEE_MANAGER_ROLE", "TREASURY_ROLE", "MARKETPLACE_OPERATOR_ROLE"],
  ProposalFacet: ["GOVERNANCE_PARTICIPANT_ROLE"],
  StakingFacet: ["GOVERNANCE_ROLE", "PAUSER_ROLE"],
  TimelockFacet: ["PROPOSER_ROLE", "EXECUTOR_ROLE", "TIMELOCK_ROLE"],
  TimewaveGiftFacet: ["VESTING_MANAGER_ROLE"],
  TokenSupplyFacet: ["MINTER_ROLE", "SUPPLY_MANAGER_ROLE", "BURNER_ROLE"],
  UpgradeControllerFacet: ["CONFIGURED_UPGRADE_SIGNER", "FOUNDER_ROLE", "GOVERNANCE_ROLE"],
  VestingFacet: ["VESTING_MANAGER_ROLE"],
  VotingPowerFacet: ["GOVERNANCE_ROLE", "STAKING_SYSTEM_CALLER"],
  VoiceAssetFacet: ["VOICE_ADMIN_ROLE", "VOICE_OPERATOR_ROLE"],
  VoiceMetadataFacet: ["VOICE_ADMIN_ROLE", "VOICE_OPERATOR_ROLE"],
  VoiceLicenseFacet: ["LICENSE_MANAGER_ROLE", "VOICE_OPERATOR_ROLE"],
  VoiceLicenseTemplateFacet: ["LICENSE_MANAGER_ROLE"],
  VoiceDatasetFacet: ["VOICE_OPERATOR_ROLE", "PLATFORM_ADMIN_ROLE"],
  RightsFacet: ["LICENSE_MANAGER_ROLE", "VOICE_OPERATOR_ROLE"],
  WhisperBlockFacet: ["OWNER_ROLE", "VOICE_OPERATOR_ROLE", "ENCRYPTOR_ROLE"],
};

const selfMethod = /^(acceptOwnership|approve|authorize|burn$|burnFrom|claim|delegate|delegateBySig|executeUnstake|purchaseAsset|recordLicensedUsage|registerVoiceAsset$|releaseStandardVesting|releaseTokensFor|releaseTwaveVesting|releaseVestedTokens|renounceRole|requestUnstake|stake$|tokenApprove|tokenTransferFrom|transfer$|transferFrom|transferLicense|transferTwaveVesting|transferVestingSchedule|withdrawLicenseRevenue|withdrawPayments)/u;
const permissionlessMethod = /^(advanceEpoch|releaseStandardVestingFor|releaseTwaveVestingFor|thresholdBurnExcess|updateDelegatedVotingPower|updateDelegatedVotingPowerBatch|updateVotingPower|updateVotingPowerBatch)$/u;
const contractMethod = /^(distributePayment|distributePaymentFrom|distributePaymentFromWithDeadline|distributePaymentWithDeadline|escrowAsset|onERC721Received|recordRoyaltyPaymentFrom|recordUsageFrom|releaseAsset|updateAssetState)$/u;
const ownerMethod = /^(addBeneficiary|addCollaborator|addDatasets|addInheritanceRequirement|addVoiceAssets|appendAssets|approveVoiceAsset|authorizeUser|burnDataset|cancelListing|createDataset|createLegacyPlan|createLicense|createLicenseFromTemplate|createLicenseWithMarketplace|createRightsGroup|createTemplate|customizeRoyaltyRate|generateAndSetEncryptionKey|grantAccess|grantRight|initiateInheritance|issueLicense|listAsset|lockVoiceAsset|recordRoyaltyPayment|recordUsage|registerVoiceFingerprint|removeAsset|removeCollaborator|revokeAccess|revokeLicense|revokeRight|revokeUser|safeTransferFrom|setBeneficiaryRelationship|setDatasetStatus|setInheritanceConditions|setLicense|setMetadata|setRoyalty|setTemplateStatus|transferFromVoiceAsset|unlockVoiceAsset|updateBasicAcousticFeatures|updateBeneficiary|updateClassificationCategory|updateCollaboratorShare|updateGeographicData|updateLicenseTerms|updateListingPrice|updateTemplate|updateVoiceClassifications)$/u;

const destructiveLiveFacets = new Set([
  "DiamondCutFacet", "EmergencyFacet", "EmergencyWithdrawalFacet", "OwnershipFacet", "UpgradeControllerFacet",
]);
const neverAutomateMethod = /^(diamondCut|emergencyForceAdd|executeMultisigWithdrawal|executeUpgrade|executeWithdrawal|freezeUpgradeControl|initializeToken|supplyFinishMinting|supplyMintTokens|transferOwnership|triggerEmergency)$/u;
const configMethod = /^(addOperationType|addOperator|configure|init|pause|removeOperator|set|unpause|update.*Config|update.*Address|updateFee|updateMinDelay|updateProposalThreshold|updateQuorum|updateVotingDelay|updateVotingPeriod)/u;

const eventNamesByMethodKey: Record<string, string[]> = {
  "AccessControlFacet.emergencyForceAdd": ["RoleGranted", "SecurityAction"],
  "AccessControlFacet.grantRole": ["RoleGranted"],
  "AccessControlFacet.renounceRole": ["RoleRenounced"],
  "AccessControlFacet.revokeRole": ["RoleRevoked", "ParticipantRoleRevoked"],
  "AccessControlFacet.setDefaultValidityPeriod": ["SecurityAction"],
  "AccessControlFacet.setMinValidations": ["SecurityAction"],
  "AccessControlFacet.setPaused": ["SecurityAction"],
  "AccessControlFacet.setRecoveryActive": ["SecurityAction"],
  "CommunityRewardsFacet.claim": ["Claimed"],
  "CommunityRewardsFacet.createCampaign": ["CampaignCreated", "CampaignVestingConfig", "CampaignCapConfig"],
  "CommunityRewardsFacet.unpauseCampaign": ["CampaignUnpaused"],
  "DelegationFacet.delegate": ["DelegateChanged", "DelegateVotesChanged"],
  "DelegationFacet.delegateBySig": ["DelegateChanged", "DelegateVotesChanged"],
  "EchoScoreFacetV3.updateScore": ["ReputationUpdated"],
  "EchoScoreFacetV3.pauseEchoScoreV3": ["Paused"],
  "EchoScoreFacetV3.unpauseEchoScoreV3": ["Unpaused"],
  "EmergencyFacet.extendPausedUntil": ["PauseExtended"],
  "EmergencyFacet.startRecovery": ["RecoveryStarted"],
  "EmergencyFacet.emergencyStop": ["EmergencyStateChanged"],
  "EmergencyFacet.triggerEmergency": ["EmergencyStateChanged"],
  "EmergencyWithdrawalFacet.setRecipientWhitelist": ["RecipientWhitelisted"],
  "LegacyFacet.addBeneficiary": ["BeneficiaryUpdated"],
  "LegacyExecutionFacet.initiateInheritance": ["InheritanceActivated"],
  "MarketplaceFacet.purchaseAsset": ["AssetPurchased"],
  "MarketplaceFacet.unpause": ["MarketplaceUnpaused"],
  "MultiSigFacet.execute": ["ActionExecuted"],
  "MultiSigFacet.proposeOperation": ["OperationProposed"],
  "MultiSigFacet.submitTransaction": ["OperationProposed"],
  "OwnershipFacet.acceptOwnership": ["OwnershipTransferred"],
  "PaymentFacet.commitDistribution": ["ClaimCommitted"],
  "PaymentFacet.commitWithdraw": ["ClaimCommitted"],
  "PaymentFacet.distributePayment": ["PaymentDistributed"],
  "PaymentFacet.distributePaymentFrom": ["PaymentDistributed"],
  "PaymentFacet.distributePaymentFromWithDeadline": ["PaymentDistributed"],
  "PaymentFacet.distributePaymentWithDeadline": ["PaymentDistributed"],
  "PaymentFacet.pauseBuybacks": ["BuybackPaused"],
  "PaymentFacet.revealDistribution": ["ClaimRevealed", "PaymentDistributed"],
  "PaymentFacet.revealDistributionStruct": ["ClaimRevealed", "PaymentDistributed"],
  "PaymentFacet.revealWithdraw": ["ClaimRevealed", "USDCPaymentWithdrawn"],
  "PaymentFacet.setPaymentPaused": ["PauseStateChanged"],
  "PaymentFacet.withdrawPayments": ["USDCPaymentWithdrawn"],
  "PaymentFacet.withdrawPaymentsWithDeadline": ["USDCPaymentWithdrawn"],
  "ProposalFacet.prExecute": ["ProposalExecuted"],
  "ProposalFacet.prQueue": ["ProposalQueued"],
  "ProposalFacet.propose(address[],uint256[],bytes[],string,uint8)": ["ProposalCreated"],
  "ProposalFacet.propose(string,string,address[],uint256[],bytes[],uint8)": ["ProposalCreated"],
  "RightsFacet.addCollaborator": ["CollaboratorUpdated"],
  "RightsFacet.removeCollaborator": ["CollaboratorUpdated"],
  "StakingFacet.advanceEpoch": ["EpochAdvanced"],
  "StakingFacet.claimRewards": ["RewardsClaimed", "RewardsClaimedDetailed"],
  "StakingFacet.executeUnstake": ["Unstaked"],
  "StakingFacet.requestUnstake": ["UnstakeRequested"],
  "StakingFacet.stake": ["Staked"],
  "TimelockFacet.cancel": ["TimelockOperationCanceled", "OperationRemoved"],
  "TimelockFacet.execute": ["OperationExecuted", "CallExecuted"],
  "TimelockFacet.schedule": ["OperationScheduled", "OperationStored"],
  "TimewaveGiftFacet.batchReleaseTwaveVesting": ["TokensVested"],
  "TimewaveGiftFacet.releaseTwaveVesting": ["TokensVested"],
  "TimewaveGiftFacet.releaseTwaveVestingFor": ["TokensVested"],
  "TokenSupplyFacet.approve": ["Approval"],
  "TokenSupplyFacet.burn": ["Transfer"],
  "TokenSupplyFacet.burnFrom": ["Transfer"],
  "TokenSupplyFacet.initializeToken": ["TokenInitialized"],
  "TokenSupplyFacet.supplyFinishMinting": ["MintingFinished"],
  "TokenSupplyFacet.supplyMintTokens": ["Transfer"],
  "TokenSupplyFacet.tokenApprove": ["Approval"],
  "TokenSupplyFacet.tokenTransferFrom": ["Transfer"],
  "TokenSupplyFacet.transfer": ["Transfer"],
  "TokenSupplyFacet.transferFrom": ["Transfer"],
  "UpgradeControllerFacet.proposeDiamondCut": ["UpgradeProposed"],
  "VestingFacet.releaseStandardVesting": ["TokensReleased"],
  "VestingFacet.releaseStandardVestingFor": ["TokensReleased"],
  "VestingFacet.releaseTokensFor": ["TokensReleased"],
  "VestingFacet.releaseVestedTokens": ["TokensReleased"],
  "VoiceAssetFacet.approveVoiceAsset": ["Approval"],
  "VoiceAssetFacet.authorizeUser": ["UserAuthorizationChanged"],
  "VoiceAssetFacet.recordRoyaltyPayment": ["RoyaltyPaid"],
  "VoiceAssetFacet.recordRoyaltyPaymentFrom": ["RoyaltyPaid"],
  "VoiceAssetFacet.recordUsage": ["VoiceAssetUsed"],
  "VoiceAssetFacet.recordUsageFrom": ["VoiceAssetUsed"],
  "VoiceAssetFacet.revokeUser": ["UserAuthorizationChanged"],
  "VoiceAssetFacet.safeTransferFrom(address,address,uint256)": ["Transfer"],
  "VoiceAssetFacet.safeTransferFrom(address,address,uint256,bytes)": ["Transfer"],
  "VoiceAssetFacet.registerVoiceAsset": ["VoiceAssetRegistered", "Transfer"],
  "VoiceAssetFacet.registerVoiceAssetForCaller": ["VoiceAssetRegistered", "Transfer"],
  "VoiceAssetFacet.transferFromVoiceAsset": ["Transfer"],
  "VoiceLicenseFacet.issueLicense": ["LicenseCreated"],
  "VoiceLicenseFacet.recordLicensedUsage": ["LicenseUsed", "VoiceAssetUsed"],
  "VoiceLicenseTemplateFacet.createTemplate": ["TemplateUpdated"],
  "VoiceDatasetFacet.createDataset": ["DatasetCreated", "Transfer"],
  "WhisperBlockFacet.generateAndSetEncryptionKey": ["KeyRotated"],
  "WhisperBlockFacet.setAuditEnabled": ["SecurityParametersUpdated"],
  "WhisperBlockFacet.setOffchainEntropy": ["OffchainKeyGenerated"],
};

const allEventsRequiredMethods = new Set([
  "AccessControlFacet.emergencyForceAdd",
  "CommunityRewardsFacet.createCampaign",
  "DelegationFacet.delegate",
  "DelegationFacet.delegateBySig",
  "PaymentFacet.revealDistribution",
  "PaymentFacet.revealDistributionStruct",
  "PaymentFacet.revealWithdraw",
  "StakingFacet.claimRewards",
  "TimelockFacet.execute",
  "TimelockFacet.schedule",
  "VoiceAssetFacet.registerVoiceAsset",
  "VoiceAssetFacet.registerVoiceAssetForCaller",
  "VoiceDatasetFacet.createDataset",
  "VoiceLicenseFacet.recordLicensedUsage",
]);

const readbackOverrides: Record<string, string[]> = {
  "AccessControlFacet.grantRole": ["AccessControlFacet.hasRole", "AccessControlFacet.getRoleMember"],
  "AccessControlFacet.revokeRole": ["AccessControlFacet.hasRole", "AccessControlFacet.getRoleMember"],
  "DiamondCutFacet.diamondCut": ["DiamondLoupeFacet.facets", "DiamondLoupeFacet.facetFunctionSelectors"],
  "MarketplaceFacet.purchaseAsset": ["MarketplaceFacet.getListing", "VoiceAssetFacet.ownerOf"],
  "StakingFacet.claimRewards": ["StakingFacet.getPendingRewards", "StakingFacet.getStakeInfo"],
  "StakingFacet.executeUnstake": ["StakingFacet.getUnstakeRequest", "StakingFacet.getStakeInfo"],
  "StakingFacet.requestUnstake": ["StakingFacet.getUnstakeRequest"],
  "StakingFacet.stake": ["StakingFacet.getStakeInfo"],
  "TokenSupplyFacet.approve": ["TokenSupplyFacet.allowance"],
  "TokenSupplyFacet.burn": ["TokenSupplyFacet.balanceOf", "TokenSupplyFacet.totalSupply"],
  "TokenSupplyFacet.burnFrom": ["TokenSupplyFacet.balanceOf", "TokenSupplyFacet.totalSupply"],
  "TokenSupplyFacet.supplyMintTokens": ["TokenSupplyFacet.balanceOf", "TokenSupplyFacet.totalSupply"],
  "TokenSupplyFacet.tokenApprove": ["TokenSupplyFacet.tokenAllowance"],
  "TokenSupplyFacet.tokenTransferFrom": ["TokenSupplyFacet.tokenBalanceOf"],
  "TokenSupplyFacet.transfer": ["TokenSupplyFacet.balanceOf"],
  "TokenSupplyFacet.transferFrom": ["TokenSupplyFacet.balanceOf", "TokenSupplyFacet.allowance"],
};

function words(value: string): string[] {
  const normalized = value
    .replace(/\(.*/u, "")
    .replace(/([a-z0-9])([A-Z])/gu, "$1 $2")
    .replace(/[^A-Za-z0-9]+/gu, " ")
    .toLowerCase()
    .split(/\s+/u)
    .filter(Boolean);
  return normalized.map((word) => ({
    configured: "config", configure: "config", configuration: "config",
    created: "create", creation: "create", registered: "register",
    granted: "grant", revoked: "revoke", removed: "remove",
    updated: "update", updating: "update", set: "update",
    approved: "approve", approval: "approve", executed: "execute",
    scheduled: "schedule", cancelled: "cancel", canceled: "cancel",
    transferred: "transfer", burned: "burn", claimed: "claim", changed: "update",
    released: "release", paused: "pause", listed: "list",
    purchased: "purchase", initialized: "init", withdrawn: "withdraw",
    appended: "append", advanced: "advance", completed: "complete",
    frozen: "freeze", reported: "report", delegated: "delegate",
    escrowed: "escrow", unstaked: "unstake", staked: "stake",
    authorization: "authorize", used: "usage", issued: "create",
  }[word] ?? word));
}

const ignoredWords = new Set(["get", "is", "has", "for", "from", "with", "by", "of", "the", "facet", "tokens", "token"]);

function similarity(left: string, right: string): number {
  const leftWords = new Set(words(left).filter((word) => !ignoredWords.has(word)));
  const rightWords = new Set(words(right).filter((word) => !ignoredWords.has(word)));
  return [...leftWords].filter((word) => rightWords.has(word)).length;
}

function actorFor(method: AbiMethod): WriteInvariant["requiredActor"] {
  if (method.methodName === "onERC721Received") {
    return { kind: "contract", roles: [], description: "The ERC-721 contract invokes this receiver callback during a safe transfer." };
  }
  if (permissionlessMethod.test(method.methodName)) {
    return { kind: "permissionless", roles: [], description: "Any caller may advance or reconcile this deterministic state transition." };
  }
  if (contractMethod.test(method.methodName)) {
    return { kind: "contract", roles: ["AUTHORIZED_PROTOCOL_CONTRACT"], description: "An authorized protocol facet or integration contract performs this internal state transition." };
  }
  if (ownerMethod.test(method.methodName)) {
    return { kind: "owner-or-approved", roles: ["RESOURCE_OWNER", "APPROVED_OPERATOR"], description: "The affected resource owner or an explicitly approved operator must authorize the write." };
  }
  if (selfMethod.test(method.methodName)) {
    return { kind: "self", roles: [], description: "The signer acts on its own allowance, entitlement, position, or beneficiary state." };
  }
  const roles = roleByFacet[method.facetName] ?? ["PROTOCOL_OPERATOR_ROLE"];
  return { kind: "role", roles, description: `The signer must hold the applicable ${roles.join(" or ")} privilege for ${method.facetName}.` };
}

function preconditionsFor(method: AbiMethod, actor: WriteInvariant["requiredActor"]): WriteInvariant["preconditions"] {
  const result: WriteInvariant["preconditions"] = [{
    kind: "authorization",
    description: actor.kind === "permissionless" ? "The caller may be arbitrary, but the transition must satisfy all on-chain guards." : actor.description,
  }];
  const inputNames = method.inputs.map((input) => input.name ?? "");
  if (method.inputs.some((input) => input.type === "address" || input.type === "address[]")) {
    result.push({ kind: "argument", description: "All required address inputs are non-zero, distinct where required, and authorized for their declared relationship." });
  }
  if (method.inputs.some((input) => /(^|_)(amount|price|value|share|threshold|limit|duration|rate|bps|max)/iu.test(input.name ?? ""))) {
    result.push({ kind: "argument", description: "Numeric amounts, rates, shares, thresholds, and durations remain within the contract-defined non-zero and upper bounds." });
  }
  if (method.inputs.some((input) => input.type.endsWith("[]"))) {
    result.push({ kind: "argument", description: "Array inputs are non-empty where required, length-compatible, bounded, and contain no prohibited duplicates." });
  }
  if (inputNames.some((name) => /deadline|expiry|executeAt|executeAfter|startTime/iu.test(name))) {
    result.push({ kind: "timing", description: "The supplied time boundary is valid at the mined block and has not expired or bypassed a required delay." });
  }
  if (inputNames.some((name) => /nonce/iu.test(name))) {
    result.push({ kind: "lifecycle", description: "The nonce or commitment has not been consumed and resolves to the submitted payload." });
  }
  if (/purchase|stake|fund|withdraw|distribution|payment|vesting|mint|burn|reward/iu.test(method.methodName)) {
    result.push({ kind: "funding", description: "Required balances, allowances, escrow, caps, and protocol liquidity are sufficient before submission." });
  }
  if (!/^(pause|unpause|set.*Paused|emergencyResume|emergencyStop|triggerEmergency)/u.test(method.methodName)) {
    result.push({ kind: "protocol-state", description: "The protocol and affected resource are in the lifecycle state required by this transition and are not blocked by pause or freeze controls." });
  }
  return result;
}

function scoreReadback(write: AbiMethod, read: AbiMethod): number {
  let score = similarity(write.methodName, read.methodName) * 4;
  if (write.facetName === read.facetName) score += 3;
  const writeInputs = new Set(write.inputs.map((input) => input.name).filter(Boolean));
  score += read.inputs.filter((input) => input.name && writeInputs.has(input.name)).length * 2;
  if (/^(get|is|has|can|calculate|claimable|vested|balance|allowance|owner)/u.test(read.methodName)) score += 1;
  return score;
}

function readbacksFor(key: string, method: AbiMethod, registry: AbiRegistry): WriteInvariant["postStateReadbacks"] {
  if (method.methodName === "onERC721Received") {
    return { mode: "none", checks: [], rationale: "This receiver callback returns an acceptance selector and has no standalone persisted post-state contract." };
  }
  const overrideKeys = readbackOverrides[key]?.filter((readKey) => registry.methods[readKey]?.category === "read") ?? [];
  const reads = Object.entries(registry.methods)
    .filter(([, candidate]) => candidate.category === "read")
    .map(([readKey, candidate]) => ({ key: readKey, method: candidate, score: scoreReadback(method, candidate) }))
    .sort((left, right) => right.score - left.score || words(left.method.methodName).length - words(right.method.methodName).length || left.key.localeCompare(right.key));
  const sameFacet = reads.filter((candidate) => candidate.method.facetName === method.facetName);
  const selected = overrideKeys.length > 0
    ? overrideKeys.map((readKey) => ({ key: readKey, method: registry.methods[readKey]!, score: Number.MAX_SAFE_INTEGER }))
    : (sameFacet.length > 0 ? sameFacet : reads).slice(0, 1);
  return {
    mode: "required",
    checks: selected.map((candidate) => ({
      method: candidate.key,
      assertion: `${candidate.key} reflects the receipt-confirmed ${key} transition for the affected identifiers and actor.` ,
    })),
    rationale: "Receipt success alone is insufficient; read the canonical affected state after finality.",
  };
}

function eventsFor(key: string, method: AbiMethod, registry: AbiRegistry): Array<[string, AbiEvent]> {
  const overrides = eventNamesByMethodKey[key];
  if (overrides) {
    return overrides.flatMap((eventName) => Object.entries(registry.events)
      .filter(([, event]) => event.facetName === method.facetName && event.eventName === eventName)
      .map(([eventKey, event]) => [eventKey, event] as [string, AbiEvent]));
  }
  const candidates = Object.entries(registry.events)
    .filter(([, event]) => event.facetName === method.facetName)
    .map(([key, event]) => ({ key, event, score: similarity(method.methodName, event.eventName) }))
    .sort((left, right) => right.score - left.score || left.key.localeCompare(right.key));
  const best = candidates[0]?.score ?? 0;
  const methodWords = words(method.methodName).filter((word) => !ignoredWords.has(word));
  const singleWordActionMatch = best === 1 && methodWords.length === 1;
  if (best < 2 && !singleWordActionMatch) return [];
  return candidates.filter((candidate) => candidate.score === best).map((candidate) => [candidate.key, candidate.event]);
}

function emittedEventsFor(key: string, method: AbiMethod, events: Array<[string, AbiEvent]>): WriteInvariant["emittedEvents"] {
  if (events.length === 0) {
    return { mode: "none", events: [], rationale: `The reviewed ABI exposes no method-specific event for ${method.methodName}; receipt and state readbacks are authoritative.` };
  }
  const mode = events.length === 1 || allEventsRequiredMethods.has(key) ? "all" : "one-of";
  return {
    mode,
    events: events.map(([key]) => key),
    rationale: mode === "all"
      ? "Every listed canonical transition event must be present in the successful receipt."
      : "The successful path must emit the applicable canonical event variant.",
  };
}

function balanceEffectsFor(method: AbiMethod): WriteInvariant["balanceEffects"] {
  const name = method.methodName;
  const createsNft = (method.facetName === "VoiceAssetFacet" && /^registerVoiceAsset/u.test(name))
    || (method.facetName === "VoiceDatasetFacet" && name === "createDataset");
  if (!createsNft && !/approve|burn|buyback|claim|distribut|escrow|fund|mint|payment|purchase|release|reward|stake|transfer|unstake|vesting|withdraw/iu.test(name)) {
    return { mode: "none", effects: [], rationale: "This write changes protocol configuration or lifecycle state without moving an asset balance." };
  }
  const asset = /VoiceAsset|Dataset|escrowAsset|releaseAsset|purchaseAsset|safeTransfer|transferFromVoice/iu.test(`${method.facetName}.${name}`)
    ? "erc721" as const
    : /value|eth/iu.test(name) ? "native" as const : "erc20" as const;
  const direction = /burn|buyback/iu.test(name) ? "burn" as const
    : /mint/iu.test(name) ? "mint" as const
      : createsNft ? "mint" as const
      : /escrow|stake/iu.test(name) && !/unstake/iu.test(name) ? "lock" as const
        : /release|unstake|withdraw|claim/iu.test(name) ? "unlock" as const
          : "transfer" as const;
  return {
    mode: "tracked",
    effects: [{
      asset,
      direction,
      accounts: ["caller", "affected owner or beneficiary", "protocol custody/treasury when applicable"],
      assertion: "Pre/post balances and allowances reconcile exactly with receipt amounts, fees, burns, mints, custody, and protocol-accounting deltas; failed or replayed calls move no value.",
    }, ...(/purchaseAsset/iu.test(name) ? [{
      asset: "erc20" as const,
      direction: "transfer" as const,
      accounts: ["buyer", "seller", "treasury", "developer fund", "union treasury"],
      assertion: "Buyer debit equals seller proceeds plus every configured protocol fee, with allowance reduced by the charged amount and no residual imbalance.",
    }] : [])],
    rationale: "This method can change ownership, custody, allowance, entitlement, supply, or a withdrawable balance.",
  };
}

function replayConstraintsFor(method: AbiMethod): WriteInvariant["replayConstraints"] {
  const fields = method.inputs.map((input) => input.name ?? "").filter(Boolean);
  if (fields.some((field) => /nonce|deadline/iu.test(field)) || /BySig|commit|reveal/iu.test(method.methodName)) {
    return { mode: "nonce-and-deadline", keyFields: fields.filter((field) => /nonce|deadline|commit/iu.test(field)), assertion: "A signature, nonce, commitment, or deadline can authorize only its intended payload and cannot be reused after consumption or expiry." };
  }
  if (fields.some((field) => /usageRef|operationId|requestId|upgradeId|proposalId/iu.test(field))) {
    return { mode: "unique-reference", keyFields: fields.filter((field) => /usageRef|operationId|requestId|upgradeId|proposalId/iu.test(field)), assertion: "The operation/reference identifier is consumed or advanced exactly once; duplicate submission cannot repeat side effects." };
  }
  if (/^(set|update|configure|pause|unpause|approveVoiceAsset|authorizeUser|grantAccess|revokeAccess)/u.test(method.methodName)) {
    return { mode: "idempotent", keyFields: fields, assertion: "Repeating the same target state either leaves state unchanged or reverts without additional balance, event-projection, or lifecycle effects." };
  }
  if (/create|diamondCut|execute|claim|withdraw|release|purchase|burn|transfer|register|propose|request|schedule|revoke|cancel|lock|unlock|stake|unstake/iu.test(method.methodName)) {
    return { mode: "state-transition", keyFields: fields, assertion: "A second submission must observe the advanced lifecycle state and cannot repeat one-time ownership, value, or entitlement effects." };
  }
  return { mode: "repeatable", keyFields: fields, assertion: "Repeated calls are allowed only when each call independently satisfies authorization and state guards; each receipt must reconcile its own effects." };
}

function liveSafetyFor(method: AbiMethod): WriteInvariant["liveNetworkSafety"] {
  if (neverAutomateMethod.test(method.methodName)) {
    return { classification: "never-automate-live", requiresExplicitOptIn: true, rationale: "This write can irreversibly upgrade, mint, transfer control, withdraw emergency funds, or change global emergency posture; automated proofs must stay on an isolated fork." };
  }
  if (destructiveLiveFacets.has(method.facetName) || configMethod.test(method.methodName) || actorFor(method).kind === "role") {
    return { classification: "fork-only", requiresExplicitOptIn: true, rationale: "This privileged or protocol-wide mutation is destructive to shared state and is permitted only on an isolated fork by default." };
  }
  return { classification: "safe-with-fixture", requiresExplicitOptIn: true, rationale: "Live execution requires an explicitly funded, disposable fixture actor and resource; local-fork proof remains the default." };
}

function indexerFor(events: Array<[string, AbiEvent]>): WriteInvariant["indexerExpectations"] {
  if (events.length === 0) {
    return { mode: "none", events: [], projections: [], assertion: "No method-specific ABI event is available; consumers must reconcile from receipt status and post-state reads." };
  }
  const eventKeys = events.map(([key]) => key);
  const projections = [...new Set(events.flatMap(([, event]) => event.projection?.targets.map((target) => `${target.table}:${target.mode}`) ?? []))].sort();
  const rawOnly = events.every(([, event]) => event.projection?.projectionMode === "rawOnly" || (event.projection?.targets.length ?? 0) === 0);
  return {
    mode: rawOnly ? "raw-event-only" : "required",
    events: eventKeys,
    projections,
    assertion: rawOnly
      ? "The raw log is decoded, deduplicated by chain/log identity, and remains replay-safe."
      : "Every expected log is decoded and projected once; duplicate ingestion is idempotent and the current/ledger projection matches post-state readbacks.",
  };
}

export function deriveWriteInvariant(key: string, method: AbiMethod, registry: AbiRegistry): WriteInvariant {
  const actor = actorFor(method);
  const events = eventsFor(key, method, registry);
  return {
    abiSignature: method.signature,
    requiredActor: actor,
    preconditions: preconditionsFor(method, actor),
    postStateReadbacks: readbacksFor(key, method, registry),
    emittedEvents: emittedEventsFor(key, method, events),
    balanceEffects: balanceEffectsFor(method),
    replayConstraints: replayConstraintsFor(method),
    liveNetworkSafety: liveSafetyFor(method),
    indexerExpectations: indexerFor(events),
  };
}

async function main(): Promise<void> {
  const registry = await readJson<AbiRegistry>(path.join(generatedManifestDir, "abi-method-registry.json"));
  const methods = Object.fromEntries(
    Object.entries(registry.methods)
      .filter(([, method]) => method.category === "write")
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, method]) => [key, deriveWriteInvariant(key, method, registry)]),
  );
  const output: ReviewedWriteInvariantFile = { version: 1, reviewedAt: new Date().toISOString().slice(0, 10), methods };
  await writeJson(reviewedPath, output);
  console.log(`synced reviewed write invariant metadata for ${Object.keys(methods).length} ABI write methods`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
