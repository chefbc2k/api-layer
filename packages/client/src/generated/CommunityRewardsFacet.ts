import { invokeRead, invokeWrite, queryEvent } from "../runtime/invoke.js";
import type { FacetWrapperContext } from "../types.js";

export function createCommunityRewardsFacetWrapper(context: FacetWrapperContext) {
  return {
    facetName: "CommunityRewardsFacet" as const,
    read: {
    campaignCount: (...args: unknown[]) => invokeRead(context, "CommunityRewardsFacet", "campaignCount", args, false, null),
    claimableAmount: (...args: unknown[]) => invokeRead(context, "CommunityRewardsFacet", "claimableAmount", args, false, null),
    claimed: (...args: unknown[]) => invokeRead(context, "CommunityRewardsFacet", "claimed", args, false, null),
    getCampaign: (...args: unknown[]) => invokeRead(context, "CommunityRewardsFacet", "getCampaign", args, false, null),
    vestedAmount: (...args: unknown[]) => invokeRead(context, "CommunityRewardsFacet", "vestedAmount", args, false, null),
    },
    write: {
    claim: (...args: unknown[]) => invokeWrite(context, "CommunityRewardsFacet", "claim", args),
    createCampaign: (...args: unknown[]) => invokeWrite(context, "CommunityRewardsFacet", "createCampaign", args),
    pauseCampaign: (...args: unknown[]) => invokeWrite(context, "CommunityRewardsFacet", "pauseCampaign", args),
    setMerkleRoot: (...args: unknown[]) => invokeWrite(context, "CommunityRewardsFacet", "setMerkleRoot", args),
    unpauseCampaign: (...args: unknown[]) => invokeWrite(context, "CommunityRewardsFacet", "unpauseCampaign", args),
    },
    events: {
    CampaignCapConfig: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "CommunityRewardsFacet", "CampaignCapConfig", fromBlock, toBlock) },
    CampaignCreated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "CommunityRewardsFacet", "CampaignCreated", fromBlock, toBlock) },
    CampaignMerkleRootUpdated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "CommunityRewardsFacet", "CampaignMerkleRootUpdated", fromBlock, toBlock) },
    CampaignPaused: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "CommunityRewardsFacet", "CampaignPaused", fromBlock, toBlock) },
    CampaignUnpaused: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "CommunityRewardsFacet", "CampaignUnpaused", fromBlock, toBlock) },
    CampaignVestingConfig: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "CommunityRewardsFacet", "CampaignVestingConfig", fromBlock, toBlock) },
    Claimed: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "CommunityRewardsFacet", "Claimed", fromBlock, toBlock) },
    },
  };
}
