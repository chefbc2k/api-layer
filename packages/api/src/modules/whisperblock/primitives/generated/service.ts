import type { ApiExecutionContext } from "../../../../shared/execution-context.js";
import { executeHttpEventDefinition, executeHttpMethodDefinition } from "../../../../shared/execution-context.js";
import type { EventInvocationRequest, PrimitiveInvocationRequest } from "../../../../shared/route-types.js";
import { whisperblockEventDefinitions, whisperblockMethodDefinitions } from "./mapping.js";

export function createWhisperblockPrimitiveService(context: ApiExecutionContext) {
  return {
    encryptorRole: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, whisperblockMethodDefinitions.find((definition) => definition.operationId === "encryptorRole")!, request),
    generateAndSetEncryptionKey: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, whisperblockMethodDefinitions.find((definition) => definition.operationId === "generateAndSetEncryptionKey")!, request),
    getAuditTrail: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, whisperblockMethodDefinitions.find((definition) => definition.operationId === "getAuditTrail")!, request),
    getSelectors: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, whisperblockMethodDefinitions.find((definition) => definition.operationId === "getSelectors")!, request),
    grantAccess: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, whisperblockMethodDefinitions.find((definition) => definition.operationId === "grantAccess")!, request),
    ownerRole: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, whisperblockMethodDefinitions.find((definition) => definition.operationId === "ownerRole")!, request),
    registerVoiceFingerprint: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, whisperblockMethodDefinitions.find((definition) => definition.operationId === "registerVoiceFingerprint")!, request),
    revokeAccess: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, whisperblockMethodDefinitions.find((definition) => definition.operationId === "revokeAccess")!, request),
    setAuditEnabled: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, whisperblockMethodDefinitions.find((definition) => definition.operationId === "setAuditEnabled")!, request),
    setOffchainEntropy: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, whisperblockMethodDefinitions.find((definition) => definition.operationId === "setOffchainEntropy")!, request),
    setTrustedOracle: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, whisperblockMethodDefinitions.find((definition) => definition.operationId === "setTrustedOracle")!, request),
    updateSystemParameters: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, whisperblockMethodDefinitions.find((definition) => definition.operationId === "updateSystemParameters")!, request),
    verifyVoiceAuthenticity: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, whisperblockMethodDefinitions.find((definition) => definition.operationId === "verifyVoiceAuthenticity")!, request),
    voiceOperatorRole: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, whisperblockMethodDefinitions.find((definition) => definition.operationId === "voiceOperatorRole")!, request),
    accessGrantedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, whisperblockEventDefinitions.find((definition) => definition.operationId === "accessGrantedEventQuery")!, request),
    accessRevokedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, whisperblockEventDefinitions.find((definition) => definition.operationId === "accessRevokedEventQuery")!, request),
    auditEventEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, whisperblockEventDefinitions.find((definition) => definition.operationId === "auditEventEventQuery")!, request),
    keyRotatedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, whisperblockEventDefinitions.find((definition) => definition.operationId === "keyRotatedEventQuery")!, request),
    offchainKeyGeneratedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, whisperblockEventDefinitions.find((definition) => definition.operationId === "offchainKeyGeneratedEventQuery")!, request),
    securityParametersUpdatedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, whisperblockEventDefinitions.find((definition) => definition.operationId === "securityParametersUpdatedEventQuery")!, request),
    voiceFingerprintUpdatedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, whisperblockEventDefinitions.find((definition) => definition.operationId === "voiceFingerprintUpdatedEventQuery")!, request),
  };
}
