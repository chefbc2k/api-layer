import { invokeRead, invokeWrite, queryEvent } from "../runtime/invoke.js";
import type { FacetWrapperContext } from "../types.js";

export function createEchoScoreFacetV3Wrapper(context: FacetWrapperContext) {
  return {
    facetName: "EchoScoreFacetV3" as const,
    read: {
    getEchoScoreOracleV3: (...args: unknown[]) => invokeRead(context, "EchoScoreFacetV3", "getEchoScoreOracleV3", args, false, 5),
    getOracleFutureDriftConfig: (...args: unknown[]) => invokeRead(context, "EchoScoreFacetV3", "getOracleFutureDriftConfig", args, false, 5),
    getOracleQuorumSigners: (...args: unknown[]) => invokeRead(context, "EchoScoreFacetV3", "getOracleQuorumSigners", args, false, 5),
    getOracleStalenessConfig: (...args: unknown[]) => invokeRead(context, "EchoScoreFacetV3", "getOracleStalenessConfig", args, false, 5),
    getReputation: (...args: unknown[]) => invokeRead(context, "EchoScoreFacetV3", "getReputation", args, false, 5),
    getReputationHistory: (...args: unknown[]) => invokeRead(context, "EchoScoreFacetV3", "getReputationHistory", args, false, 5),
    isEchoScorePausedV3: (...args: unknown[]) => invokeRead(context, "EchoScoreFacetV3", "isEchoScorePausedV3", args, false, 5),
    isOracleHealthy: (...args: unknown[]) => invokeRead(context, "EchoScoreFacetV3", "isOracleHealthy", args, false, 5),
    },
    write: {
    batchUpdateScores: (...args: unknown[]) => invokeWrite(context, "EchoScoreFacetV3", "batchUpdateScores", args),
    pauseEchoScoreV3: (...args: unknown[]) => invokeWrite(context, "EchoScoreFacetV3", "pauseEchoScoreV3", args),
    setEchoScoreOracleV3: (...args: unknown[]) => invokeWrite(context, "EchoScoreFacetV3", "setEchoScoreOracleV3", args),
    setOracleFutureDriftConfig: (...args: unknown[]) => invokeWrite(context, "EchoScoreFacetV3", "setOracleFutureDriftConfig", args),
    setOracleQuorumSigners: (...args: unknown[]) => invokeWrite(context, "EchoScoreFacetV3", "setOracleQuorumSigners", args),
    setOracleStalenessConfig: (...args: unknown[]) => invokeWrite(context, "EchoScoreFacetV3", "setOracleStalenessConfig", args),
    unpauseEchoScoreV3: (...args: unknown[]) => invokeWrite(context, "EchoScoreFacetV3", "unpauseEchoScoreV3", args),
    updateScore: (...args: unknown[]) => invokeWrite(context, "EchoScoreFacetV3", "updateScore", args),
    },
    events: {
    OracleFutureDriftConfigUpdated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "EchoScoreFacetV3", "OracleFutureDriftConfigUpdated", fromBlock, toBlock) },
    OracleQuorumConfigUpdated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "EchoScoreFacetV3", "OracleQuorumConfigUpdated", fromBlock, toBlock) },
    OracleStalenessConfigUpdated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "EchoScoreFacetV3", "OracleStalenessConfigUpdated", fromBlock, toBlock) },
    OracleUpdated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "EchoScoreFacetV3", "OracleUpdated", fromBlock, toBlock) },
    Paused: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "EchoScoreFacetV3", "Paused", fromBlock, toBlock) },
    ReputationUpdated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "EchoScoreFacetV3", "ReputationUpdated", fromBlock, toBlock) },
    ScoresUpdated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "EchoScoreFacetV3", "ScoresUpdated", fromBlock, toBlock) },
    Unpaused: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "EchoScoreFacetV3", "Unpaused", fromBlock, toBlock) },
    },
  };
}
