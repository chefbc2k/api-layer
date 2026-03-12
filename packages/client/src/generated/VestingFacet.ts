import { invokeRead, invokeWrite, queryEvent } from "../runtime/invoke.js";
import type { FacetWrapperContext } from "../types.js";

export function createVestingFacetWrapper(context: FacetWrapperContext) {
  return {
    facetName: "VestingFacet" as const,
    read: {
    calculateCexVesting: (...args: unknown[]) => invokeRead(context, "VestingFacet", "calculateCexVesting", args, false, null),
    calculateDevFundVesting: (...args: unknown[]) => invokeRead(context, "VestingFacet", "calculateDevFundVesting", args, false, null),
    calculateFounderVesting: (...args: unknown[]) => invokeRead(context, "VestingFacet", "calculateFounderVesting", args, false, null),
    calculatePublicVesting: (...args: unknown[]) => invokeRead(context, "VestingFacet", "calculatePublicVesting", args, false, null),
    calculateTeamVesting: (...args: unknown[]) => invokeRead(context, "VestingFacet", "calculateTeamVesting", args, false, null),
    getSellableAmount: (...args: unknown[]) => invokeRead(context, "VestingFacet", "getSellableAmount", args, false, null),
    getStandardVestedAmount: (...args: unknown[]) => invokeRead(context, "VestingFacet", "getStandardVestedAmount", args, false, null),
    getStandardVestingReleasable: (...args: unknown[]) => invokeRead(context, "VestingFacet", "getStandardVestingReleasable", args, false, null),
    getStandardVestingSchedule: (...args: unknown[]) => invokeRead(context, "VestingFacet", "getStandardVestingSchedule", args, false, null),
    getVestingDetails: (...args: unknown[]) => invokeRead(context, "VestingFacet", "getVestingDetails", args, false, null),
    getVestingReleasableAmount: (...args: unknown[]) => invokeRead(context, "VestingFacet", "getVestingReleasableAmount", args, false, null),
    getVestingTotalAmount: (...args: unknown[]) => invokeRead(context, "VestingFacet", "getVestingTotalAmount", args, false, null),
    getVestingType: (...args: unknown[]) => invokeRead(context, "VestingFacet", "getVestingType", args, false, null),
    hasVestingSchedule: (...args: unknown[]) => invokeRead(context, "VestingFacet", "hasVestingSchedule", args, false, null),
    veGetRoleAdmin: (...args: unknown[]) => invokeRead(context, "VestingFacet", "veGetRoleAdmin", args, false, null),
    veGetVestingSchedule: (...args: unknown[]) => invokeRead(context, "VestingFacet", "veGetVestingSchedule", args, false, null),
    veHasRole: (...args: unknown[]) => invokeRead(context, "VestingFacet", "veHasRole", args, false, null),
    veSupportsInterface: (...args: unknown[]) => invokeRead(context, "VestingFacet", "veSupportsInterface", args, false, null),
    },
    write: {
    createCexVesting: (...args: unknown[]) => invokeWrite(context, "VestingFacet", "createCexVesting", args),
    createDevFundVesting: (...args: unknown[]) => invokeWrite(context, "VestingFacet", "createDevFundVesting", args),
    createFounderVesting: (...args: unknown[]) => invokeWrite(context, "VestingFacet", "createFounderVesting", args),
    createPublicVesting: (...args: unknown[]) => invokeWrite(context, "VestingFacet", "createPublicVesting", args),
    createTeamVesting: (...args: unknown[]) => invokeWrite(context, "VestingFacet", "createTeamVesting", args),
    releaseStandardVesting: (...args: unknown[]) => invokeWrite(context, "VestingFacet", "releaseStandardVesting", args),
    releaseStandardVestingFor: (...args: unknown[]) => invokeWrite(context, "VestingFacet", "releaseStandardVestingFor", args),
    releaseTokensFor: (...args: unknown[]) => invokeWrite(context, "VestingFacet", "releaseTokensFor", args),
    releaseVestedTokens: (...args: unknown[]) => invokeWrite(context, "VestingFacet", "releaseVestedTokens", args),
    revokeVestingSchedule: (...args: unknown[]) => invokeWrite(context, "VestingFacet", "revokeVestingSchedule", args),
    setMinimumVestingDuration: (...args: unknown[]) => invokeWrite(context, "VestingFacet", "setMinimumVestingDuration", args),
    transferVestingSchedule: (...args: unknown[]) => invokeWrite(context, "VestingFacet", "transferVestingSchedule", args),
    },
    events: {
    BeneficiaryTransferred: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VestingFacet", "BeneficiaryTransferred", fromBlock, toBlock) },
    SaleRestrictionUpdated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VestingFacet", "SaleRestrictionUpdated", fromBlock, toBlock) },
    TokensReleased: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VestingFacet", "TokensReleased", fromBlock, toBlock) },
    VestingInitialized: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VestingFacet", "VestingInitialized", fromBlock, toBlock) },
    VestingPaused: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VestingFacet", "VestingPaused", fromBlock, toBlock) },
    VestingScheduleCreated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VestingFacet", "VestingScheduleCreated", fromBlock, toBlock) },
    VestingScheduleRevoked: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VestingFacet", "VestingScheduleRevoked", fromBlock, toBlock) },
    VestingUnpaused: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VestingFacet", "VestingUnpaused", fromBlock, toBlock) },
    },
  };
}
