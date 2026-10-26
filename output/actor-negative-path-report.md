# Actor and Signer Negative-Path Report

Generated: 2026-10-25T13:17:38.580Z

- ABI write methods: 260
- Mounted contract write endpoints: 259
- Additional stateful HTTP write endpoints: 1
- Total mounted HTTP write endpoints: 260
- Contract write domains: 13
- Additional stateful HTTP domains: 1
- Total mounted HTTP write domains: 14
- Actor/method cases: 1813
- API boundary cases: 777
- Admin API-role denial cases: 200
- Stale/revoked/expired role cases: 3150
- Additional HTTP boundary cases: 10

Every mounted contract write endpoint is covered for founder, admin, operator, buyer, seller, licensee, and collaborator fixtures. Unknown keys and read-only keys are denied at the API boundary. Direct signer/wallet mismatches are denied before contract submission. All admin-classified writes reject buyer, seller, licensee, and collaborator API roles before decoding or provider access while founder, admin, and operator identities continue to contract authorization preflight. Missing, stale, revoked, expired, ownership-mismatched, self-mismatched, and protocol-contract-mismatched actors are rejected by the common contract static-call preflight before transaction persistence or submission. The additional funding quote write requires a separately provisioned funding customer identity and exact wallet binding; contract roles, read-only keys, unknown keys, and confused-deputy wallet headers cannot reach provider or storage access. The intentionally excluded legacy proposal overload remains ABI-only and is listed separately in the JSON artifact.

## Domains

| Domain | Write methods |
| --- | ---: |
| access-control | 12 |
| datasets | 9 |
| diamond-admin | 10 |
| emergency | 22 |
| governance | 16 |
| licensing | 20 |
| marketplace | 36 |
| multisig | 11 |
| ownership | 6 |
| staking | 31 |
| tokenomics | 40 |
| voice-assets | 38 |
| whisperblock | 8 |

## Additional stateful HTTP writes

| Method | Path | Required identity | Denied identities |
| --- | --- | --- | --- |
| POST | /v1/funding/quotes | funding-customer | founder, admin, operator, buyer, seller, licensee, collaborator, read-only, unknown-key |

## Protected capabilities

| Capability | ABI methods | Workflow routes |
| --- | --- | --- |
| commercialize | VoiceDatasetFacet.createDataset<br>MarketplaceFacet.listAsset | /v1/workflows/commercialize-voice-asset<br>/v1/workflows/rights-aware-commercialize-voice-asset |
| list | MarketplaceFacet.listAsset | /v1/workflows/create-marketplace-listing |
| transfer | VoiceAssetFacet.transferFromVoiceAsset<br>OwnershipFacet.transferOwnership | /v1/workflows/transfer-rights |
| mint | TokenSupplyFacet.supplyMintTokens<br>VoiceAssetFacet.registerVoiceAsset | /v1/workflows/register-voice-asset |
| vote | ProposalFacet.prCastVote | /v1/workflows/vote-on-proposal |
| upgrade | DiamondCutFacet.diamondCut<br>UpgradeControllerFacet.executeUpgrade | /v1/workflows/governance-execution-flow |
| pause | AccessControlFacet.setPaused<br>MarketplaceFacet.pause<br>StakingFacet.setStakingPaused | /v1/workflows/trigger-emergency |
| recover | EmergencyFacet.startRecovery<br>EmergencyFacet.completeRecovery | /v1/workflows/recover-from-emergency |
| withdraw | EmergencyWithdrawalFacet.executeWithdrawal<br>PaymentFacet.withdrawPayments<br>VoiceLicenseFacet.withdrawLicenseRevenue | /v1/workflows/emergency-withdrawal-sequence<br>/v1/workflows/withdraw-marketplace-payments |
| ownership-controlled-state | AccessControlFacet.configureRole<br>AccessControlFacet.setDefaultValidityPeriod<br>AccessControlFacet.setMinValidations<br>AccessControlFacet.setRoleAdmin<br>AccessControlFacet.revokeRole<br>AccessControlFacet.renounceRole<br>RightsFacet.grantRight<br>VoiceDatasetFacet.appendAssets<br>VoiceDatasetFacet.burnDataset<br>VoiceDatasetFacet.removeAsset<br>VoiceDatasetFacet.setDatasetStatus<br>VoiceDatasetFacet.setLicense<br>VoiceDatasetFacet.setMetadata<br>VoiceDatasetFacet.setRoyalty<br>OwnershipFacet.proposeOwnershipTransfer | /v1/workflows/onboard-rights-holder<br>/v1/workflows/manage-access-control |
