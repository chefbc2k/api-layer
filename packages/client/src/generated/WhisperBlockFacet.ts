import { invokeRead, invokeWrite, queryEvent } from "../runtime/invoke.js";
import type { FacetWrapperContext } from "../types.js";

export function createWhisperBlockFacetWrapper(context: FacetWrapperContext) {
  return {
    facetName: "WhisperBlockFacet" as const,
    read: {
    ENCRYPTOR_ROLE: (...args: unknown[]) => invokeRead(context, "WhisperBlockFacet", "ENCRYPTOR_ROLE", args, false, 5),
    OWNER_ROLE: (...args: unknown[]) => invokeRead(context, "WhisperBlockFacet", "OWNER_ROLE", args, false, 5),
    VOICE_OPERATOR_ROLE: (...args: unknown[]) => invokeRead(context, "WhisperBlockFacet", "VOICE_OPERATOR_ROLE", args, false, 5),
    getAuditTrail: (...args: unknown[]) => invokeRead(context, "WhisperBlockFacet", "getAuditTrail", args, false, 5),
    getSelectors: (...args: unknown[]) => invokeRead(context, "WhisperBlockFacet", "getSelectors", args, false, 600),
    verifyVoiceAuthenticity: (...args: unknown[]) => invokeRead(context, "WhisperBlockFacet", "verifyVoiceAuthenticity", args, false, 5),
    },
    write: {
    generateAndSetEncryptionKey: (...args: unknown[]) => invokeWrite(context, "WhisperBlockFacet", "generateAndSetEncryptionKey", args),
    grantAccess: (...args: unknown[]) => invokeWrite(context, "WhisperBlockFacet", "grantAccess", args),
    registerVoiceFingerprint: (...args: unknown[]) => invokeWrite(context, "WhisperBlockFacet", "registerVoiceFingerprint", args),
    revokeAccess: (...args: unknown[]) => invokeWrite(context, "WhisperBlockFacet", "revokeAccess", args),
    setAuditEnabled: (...args: unknown[]) => invokeWrite(context, "WhisperBlockFacet", "setAuditEnabled", args),
    setOffchainEntropy: (...args: unknown[]) => invokeWrite(context, "WhisperBlockFacet", "setOffchainEntropy", args),
    setTrustedOracle: (...args: unknown[]) => invokeWrite(context, "WhisperBlockFacet", "setTrustedOracle", args),
    updateSystemParameters: (...args: unknown[]) => invokeWrite(context, "WhisperBlockFacet", "updateSystemParameters", args),
    },
    events: {
    AccessGranted: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "WhisperBlockFacet", "AccessGranted", fromBlock, toBlock) },
    AccessRevoked: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "WhisperBlockFacet", "AccessRevoked", fromBlock, toBlock) },
    AuditEvent: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "WhisperBlockFacet", "AuditEvent", fromBlock, toBlock) },
    KeyRotated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "WhisperBlockFacet", "KeyRotated", fromBlock, toBlock) },
    OffchainKeyGenerated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "WhisperBlockFacet", "OffchainKeyGenerated", fromBlock, toBlock) },
    SecurityParametersUpdated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "WhisperBlockFacet", "SecurityParametersUpdated", fromBlock, toBlock) },
    VoiceFingerprintUpdated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "WhisperBlockFacet", "VoiceFingerprintUpdated", fromBlock, toBlock) },
    },
  };
}
