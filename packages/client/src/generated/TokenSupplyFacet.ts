import { invokeRead, invokeWrite, queryEvent } from "../runtime/invoke.js";
import type { FacetWrapperContext } from "../types.js";

export function createTokenSupplyFacetWrapper(context: FacetWrapperContext) {
  return {
    facetName: "TokenSupplyFacet" as const,
    read: {
    allowance: (...args: unknown[]) => invokeRead(context, "TokenSupplyFacet", "allowance", args, true, null),
    balanceOf: (...args: unknown[]) => invokeRead(context, "TokenSupplyFacet", "balanceOf", args, true, null),
    decimals: (...args: unknown[]) => invokeRead(context, "TokenSupplyFacet", "decimals", args, false, 600),
    supplyGetMaximum: (...args: unknown[]) => invokeRead(context, "TokenSupplyFacet", "supplyGetMaximum", args, false, 5),
    supplyIsMintingFinished: (...args: unknown[]) => invokeRead(context, "TokenSupplyFacet", "supplyIsMintingFinished", args, false, 5),
    tokenAllowance: (...args: unknown[]) => invokeRead(context, "TokenSupplyFacet", "tokenAllowance", args, true, null),
    tokenBalanceOf: (...args: unknown[]) => invokeRead(context, "TokenSupplyFacet", "tokenBalanceOf", args, true, null),
    tokenName: (...args: unknown[]) => invokeRead(context, "TokenSupplyFacet", "tokenName", args, false, 600),
    tokenSymbol: (...args: unknown[]) => invokeRead(context, "TokenSupplyFacet", "tokenSymbol", args, false, 600),
    totalSupply: (...args: unknown[]) => invokeRead(context, "TokenSupplyFacet", "totalSupply", args, false, 5),
    },
    write: {
    approve: (...args: unknown[]) => invokeWrite(context, "TokenSupplyFacet", "approve", args),
    burn: (...args: unknown[]) => invokeWrite(context, "TokenSupplyFacet", "burn", args),
    burnFrom: (...args: unknown[]) => invokeWrite(context, "TokenSupplyFacet", "burnFrom", args),
    initializeToken: (...args: unknown[]) => invokeWrite(context, "TokenSupplyFacet", "initializeToken", args),
    supplyFinishMinting: (...args: unknown[]) => invokeWrite(context, "TokenSupplyFacet", "supplyFinishMinting", args),
    supplyMintTokens: (...args: unknown[]) => invokeWrite(context, "TokenSupplyFacet", "supplyMintTokens", args),
    supplySetMaximum: (...args: unknown[]) => invokeWrite(context, "TokenSupplyFacet", "supplySetMaximum", args),
    tokenApprove: (...args: unknown[]) => invokeWrite(context, "TokenSupplyFacet", "tokenApprove", args),
    tokenTransferFrom: (...args: unknown[]) => invokeWrite(context, "TokenSupplyFacet", "tokenTransferFrom", args),
    transfer: (...args: unknown[]) => invokeWrite(context, "TokenSupplyFacet", "transfer", args),
    transferFrom: (...args: unknown[]) => invokeWrite(context, "TokenSupplyFacet", "transferFrom", args),
    },
    events: {
    Approval: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "TokenSupplyFacet", "Approval", fromBlock, toBlock) },
    MintingFinished: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "TokenSupplyFacet", "MintingFinished", fromBlock, toBlock) },
    TokenInitialized: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "TokenSupplyFacet", "TokenInitialized", fromBlock, toBlock) },
    Transfer: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "TokenSupplyFacet", "Transfer", fromBlock, toBlock) },
    },
  };
}
