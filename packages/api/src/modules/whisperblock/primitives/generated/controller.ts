import type { ApiExecutionContext } from "../../../../shared/execution-context.js";
import { createEventRequestHandler, createMethodRequestHandler } from "../../../../shared/route-factory.js";
import { createWhisperblockPrimitiveService } from "./service.js";
import {
  encryptorRoleRequestSchemas,
  generateAndSetEncryptionKeyRequestSchemas,
  getAuditTrailRequestSchemas,
  getSelectorsRequestSchemas,
  grantAccessRequestSchemas,
  ownerRoleRequestSchemas,
  registerVoiceFingerprintRequestSchemas,
  revokeAccessRequestSchemas,
  setAuditEnabledRequestSchemas,
  setOffchainEntropyRequestSchemas,
  setTrustedOracleRequestSchemas,
  updateSystemParametersRequestSchemas,
  verifyVoiceAuthenticityRequestSchemas,
  voiceOperatorRoleRequestSchemas,
  accessGrantedEventQueryRequestSchema,
  accessRevokedEventQueryRequestSchema,
  auditEventEventQueryRequestSchema,
  keyRotatedEventQueryRequestSchema,
  offchainKeyGeneratedEventQueryRequestSchema,
  securityParametersUpdatedEventQueryRequestSchema,
  voiceFingerprintUpdatedEventQueryRequestSchema,
} from "./schemas.js";
import { whisperblockEventDefinitions, whisperblockMethodDefinitions } from "./mapping.js";

export function createWhisperblockPrimitiveController(context: ApiExecutionContext): Record<string, import("express").RequestHandler> {
  const service = createWhisperblockPrimitiveService(context);
  return {
    encryptorRole: createMethodRequestHandler(whisperblockMethodDefinitions.find((definition) => definition.operationId === "encryptorRole")!, encryptorRoleRequestSchemas, service.encryptorRole),
    generateAndSetEncryptionKey: createMethodRequestHandler(whisperblockMethodDefinitions.find((definition) => definition.operationId === "generateAndSetEncryptionKey")!, generateAndSetEncryptionKeyRequestSchemas, service.generateAndSetEncryptionKey),
    getAuditTrail: createMethodRequestHandler(whisperblockMethodDefinitions.find((definition) => definition.operationId === "getAuditTrail")!, getAuditTrailRequestSchemas, service.getAuditTrail),
    getSelectors: createMethodRequestHandler(whisperblockMethodDefinitions.find((definition) => definition.operationId === "getSelectors")!, getSelectorsRequestSchemas, service.getSelectors),
    grantAccess: createMethodRequestHandler(whisperblockMethodDefinitions.find((definition) => definition.operationId === "grantAccess")!, grantAccessRequestSchemas, service.grantAccess),
    ownerRole: createMethodRequestHandler(whisperblockMethodDefinitions.find((definition) => definition.operationId === "ownerRole")!, ownerRoleRequestSchemas, service.ownerRole),
    registerVoiceFingerprint: createMethodRequestHandler(whisperblockMethodDefinitions.find((definition) => definition.operationId === "registerVoiceFingerprint")!, registerVoiceFingerprintRequestSchemas, service.registerVoiceFingerprint),
    revokeAccess: createMethodRequestHandler(whisperblockMethodDefinitions.find((definition) => definition.operationId === "revokeAccess")!, revokeAccessRequestSchemas, service.revokeAccess),
    setAuditEnabled: createMethodRequestHandler(whisperblockMethodDefinitions.find((definition) => definition.operationId === "setAuditEnabled")!, setAuditEnabledRequestSchemas, service.setAuditEnabled),
    setOffchainEntropy: createMethodRequestHandler(whisperblockMethodDefinitions.find((definition) => definition.operationId === "setOffchainEntropy")!, setOffchainEntropyRequestSchemas, service.setOffchainEntropy),
    setTrustedOracle: createMethodRequestHandler(whisperblockMethodDefinitions.find((definition) => definition.operationId === "setTrustedOracle")!, setTrustedOracleRequestSchemas, service.setTrustedOracle),
    updateSystemParameters: createMethodRequestHandler(whisperblockMethodDefinitions.find((definition) => definition.operationId === "updateSystemParameters")!, updateSystemParametersRequestSchemas, service.updateSystemParameters),
    verifyVoiceAuthenticity: createMethodRequestHandler(whisperblockMethodDefinitions.find((definition) => definition.operationId === "verifyVoiceAuthenticity")!, verifyVoiceAuthenticityRequestSchemas, service.verifyVoiceAuthenticity),
    voiceOperatorRole: createMethodRequestHandler(whisperblockMethodDefinitions.find((definition) => definition.operationId === "voiceOperatorRole")!, voiceOperatorRoleRequestSchemas, service.voiceOperatorRole),
    accessGrantedEventQuery: createEventRequestHandler(whisperblockEventDefinitions.find((definition) => definition.operationId === "accessGrantedEventQuery")!, accessGrantedEventQueryRequestSchema, service.accessGrantedEventQuery),
    accessRevokedEventQuery: createEventRequestHandler(whisperblockEventDefinitions.find((definition) => definition.operationId === "accessRevokedEventQuery")!, accessRevokedEventQueryRequestSchema, service.accessRevokedEventQuery),
    auditEventEventQuery: createEventRequestHandler(whisperblockEventDefinitions.find((definition) => definition.operationId === "auditEventEventQuery")!, auditEventEventQueryRequestSchema, service.auditEventEventQuery),
    keyRotatedEventQuery: createEventRequestHandler(whisperblockEventDefinitions.find((definition) => definition.operationId === "keyRotatedEventQuery")!, keyRotatedEventQueryRequestSchema, service.keyRotatedEventQuery),
    offchainKeyGeneratedEventQuery: createEventRequestHandler(whisperblockEventDefinitions.find((definition) => definition.operationId === "offchainKeyGeneratedEventQuery")!, offchainKeyGeneratedEventQueryRequestSchema, service.offchainKeyGeneratedEventQuery),
    securityParametersUpdatedEventQuery: createEventRequestHandler(whisperblockEventDefinitions.find((definition) => definition.operationId === "securityParametersUpdatedEventQuery")!, securityParametersUpdatedEventQueryRequestSchema, service.securityParametersUpdatedEventQuery),
    voiceFingerprintUpdatedEventQuery: createEventRequestHandler(whisperblockEventDefinitions.find((definition) => definition.operationId === "voiceFingerprintUpdatedEventQuery")!, voiceFingerprintUpdatedEventQueryRequestSchema, service.voiceFingerprintUpdatedEventQuery),
  };
}
