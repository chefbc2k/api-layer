import { Router } from "express";

import type { ApiExecutionContext } from "../../../../shared/execution-context.js";
import { registerRoute } from "../../../../shared/route-factory.js";
import { createWhisperblockPrimitiveController } from "./controller.js";
import { whisperblockEventDefinitions, whisperblockMethodDefinitions } from "./mapping.js";

export function createWhisperblockPrimitiveRouter(context: ApiExecutionContext): Router {
  const router = Router();
  const controller = createWhisperblockPrimitiveController(context);
  registerRoute(router, whisperblockMethodDefinitions.find((definition) => definition.operationId === "encryptorRole")!, controller["encryptorRole"]);
  registerRoute(router, whisperblockMethodDefinitions.find((definition) => definition.operationId === "generateAndSetEncryptionKey")!, controller["generateAndSetEncryptionKey"]);
  registerRoute(router, whisperblockMethodDefinitions.find((definition) => definition.operationId === "getAuditTrail")!, controller["getAuditTrail"]);
  registerRoute(router, whisperblockMethodDefinitions.find((definition) => definition.operationId === "getSelectors")!, controller["getSelectors"]);
  registerRoute(router, whisperblockMethodDefinitions.find((definition) => definition.operationId === "grantAccess")!, controller["grantAccess"]);
  registerRoute(router, whisperblockMethodDefinitions.find((definition) => definition.operationId === "ownerRole")!, controller["ownerRole"]);
  registerRoute(router, whisperblockMethodDefinitions.find((definition) => definition.operationId === "registerVoiceFingerprint")!, controller["registerVoiceFingerprint"]);
  registerRoute(router, whisperblockMethodDefinitions.find((definition) => definition.operationId === "revokeAccess")!, controller["revokeAccess"]);
  registerRoute(router, whisperblockMethodDefinitions.find((definition) => definition.operationId === "setAuditEnabled")!, controller["setAuditEnabled"]);
  registerRoute(router, whisperblockMethodDefinitions.find((definition) => definition.operationId === "setOffchainEntropy")!, controller["setOffchainEntropy"]);
  registerRoute(router, whisperblockMethodDefinitions.find((definition) => definition.operationId === "setTrustedOracle")!, controller["setTrustedOracle"]);
  registerRoute(router, whisperblockMethodDefinitions.find((definition) => definition.operationId === "updateSystemParameters")!, controller["updateSystemParameters"]);
  registerRoute(router, whisperblockMethodDefinitions.find((definition) => definition.operationId === "verifyVoiceAuthenticity")!, controller["verifyVoiceAuthenticity"]);
  registerRoute(router, whisperblockMethodDefinitions.find((definition) => definition.operationId === "voiceOperatorRole")!, controller["voiceOperatorRole"]);
  registerRoute(router, whisperblockEventDefinitions.find((definition) => definition.operationId === "accessGrantedEventQuery")!, controller["accessGrantedEventQuery"]);
  registerRoute(router, whisperblockEventDefinitions.find((definition) => definition.operationId === "accessRevokedEventQuery")!, controller["accessRevokedEventQuery"]);
  registerRoute(router, whisperblockEventDefinitions.find((definition) => definition.operationId === "auditEventEventQuery")!, controller["auditEventEventQuery"]);
  registerRoute(router, whisperblockEventDefinitions.find((definition) => definition.operationId === "keyRotatedEventQuery")!, controller["keyRotatedEventQuery"]);
  registerRoute(router, whisperblockEventDefinitions.find((definition) => definition.operationId === "offchainKeyGeneratedEventQuery")!, controller["offchainKeyGeneratedEventQuery"]);
  registerRoute(router, whisperblockEventDefinitions.find((definition) => definition.operationId === "securityParametersUpdatedEventQuery")!, controller["securityParametersUpdatedEventQuery"]);
  registerRoute(router, whisperblockEventDefinitions.find((definition) => definition.operationId === "voiceFingerprintUpdatedEventQuery")!, controller["voiceFingerprintUpdatedEventQuery"]);
  return router;
}
