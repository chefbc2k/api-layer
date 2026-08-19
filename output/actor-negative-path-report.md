# Actor and Signer Negative-Path Report

Generated: 2026-08-19T13:02:46.594Z

- ABI write methods: 260
- Mounted HTTP write endpoints: 259
- HTTP write domains: 13
- Actor/method cases: 1813
- API boundary cases: 777
- Stale/revoked/expired role cases: 3171

Every mounted write endpoint is covered for founder, admin, operator, buyer, seller, licensee, and collaborator fixtures. Unknown keys and read-only keys are denied at the API boundary. Direct signer/wallet mismatches are denied before contract submission. Missing, stale, revoked, expired, ownership-mismatched, self-mismatched, and protocol-contract-mismatched actors are rejected by the common contract static-call preflight before transaction persistence or submission. The intentionally excluded legacy proposal overload remains ABI-only and is listed separately in the JSON artifact.

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
| ownership-controlled-state | RightsFacet.grantRight<br>VoiceDatasetFacet.setMetadata<br>OwnershipFacet.proposeOwnershipTransfer | /v1/workflows/onboard-rights-holder |
