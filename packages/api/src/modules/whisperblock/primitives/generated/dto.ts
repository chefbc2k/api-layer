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

export type EncryptorRolePath = import("zod").infer<typeof encryptorRoleRequestSchemas.path>;
export type EncryptorRoleQuery = import("zod").infer<typeof encryptorRoleRequestSchemas.query>;
export type EncryptorRoleBody = import("zod").infer<typeof encryptorRoleRequestSchemas.body>;
export type GenerateAndSetEncryptionKeyPath = import("zod").infer<typeof generateAndSetEncryptionKeyRequestSchemas.path>;
export type GenerateAndSetEncryptionKeyQuery = import("zod").infer<typeof generateAndSetEncryptionKeyRequestSchemas.query>;
export type GenerateAndSetEncryptionKeyBody = import("zod").infer<typeof generateAndSetEncryptionKeyRequestSchemas.body>;
export type GetAuditTrailPath = import("zod").infer<typeof getAuditTrailRequestSchemas.path>;
export type GetAuditTrailQuery = import("zod").infer<typeof getAuditTrailRequestSchemas.query>;
export type GetAuditTrailBody = import("zod").infer<typeof getAuditTrailRequestSchemas.body>;
export type GetSelectorsPath = import("zod").infer<typeof getSelectorsRequestSchemas.path>;
export type GetSelectorsQuery = import("zod").infer<typeof getSelectorsRequestSchemas.query>;
export type GetSelectorsBody = import("zod").infer<typeof getSelectorsRequestSchemas.body>;
export type GrantAccessPath = import("zod").infer<typeof grantAccessRequestSchemas.path>;
export type GrantAccessQuery = import("zod").infer<typeof grantAccessRequestSchemas.query>;
export type GrantAccessBody = import("zod").infer<typeof grantAccessRequestSchemas.body>;
export type OwnerRolePath = import("zod").infer<typeof ownerRoleRequestSchemas.path>;
export type OwnerRoleQuery = import("zod").infer<typeof ownerRoleRequestSchemas.query>;
export type OwnerRoleBody = import("zod").infer<typeof ownerRoleRequestSchemas.body>;
export type RegisterVoiceFingerprintPath = import("zod").infer<typeof registerVoiceFingerprintRequestSchemas.path>;
export type RegisterVoiceFingerprintQuery = import("zod").infer<typeof registerVoiceFingerprintRequestSchemas.query>;
export type RegisterVoiceFingerprintBody = import("zod").infer<typeof registerVoiceFingerprintRequestSchemas.body>;
export type RevokeAccessPath = import("zod").infer<typeof revokeAccessRequestSchemas.path>;
export type RevokeAccessQuery = import("zod").infer<typeof revokeAccessRequestSchemas.query>;
export type RevokeAccessBody = import("zod").infer<typeof revokeAccessRequestSchemas.body>;
export type SetAuditEnabledPath = import("zod").infer<typeof setAuditEnabledRequestSchemas.path>;
export type SetAuditEnabledQuery = import("zod").infer<typeof setAuditEnabledRequestSchemas.query>;
export type SetAuditEnabledBody = import("zod").infer<typeof setAuditEnabledRequestSchemas.body>;
export type SetOffchainEntropyPath = import("zod").infer<typeof setOffchainEntropyRequestSchemas.path>;
export type SetOffchainEntropyQuery = import("zod").infer<typeof setOffchainEntropyRequestSchemas.query>;
export type SetOffchainEntropyBody = import("zod").infer<typeof setOffchainEntropyRequestSchemas.body>;
export type SetTrustedOraclePath = import("zod").infer<typeof setTrustedOracleRequestSchemas.path>;
export type SetTrustedOracleQuery = import("zod").infer<typeof setTrustedOracleRequestSchemas.query>;
export type SetTrustedOracleBody = import("zod").infer<typeof setTrustedOracleRequestSchemas.body>;
export type UpdateSystemParametersPath = import("zod").infer<typeof updateSystemParametersRequestSchemas.path>;
export type UpdateSystemParametersQuery = import("zod").infer<typeof updateSystemParametersRequestSchemas.query>;
export type UpdateSystemParametersBody = import("zod").infer<typeof updateSystemParametersRequestSchemas.body>;
export type VerifyVoiceAuthenticityPath = import("zod").infer<typeof verifyVoiceAuthenticityRequestSchemas.path>;
export type VerifyVoiceAuthenticityQuery = import("zod").infer<typeof verifyVoiceAuthenticityRequestSchemas.query>;
export type VerifyVoiceAuthenticityBody = import("zod").infer<typeof verifyVoiceAuthenticityRequestSchemas.body>;
export type VoiceOperatorRolePath = import("zod").infer<typeof voiceOperatorRoleRequestSchemas.path>;
export type VoiceOperatorRoleQuery = import("zod").infer<typeof voiceOperatorRoleRequestSchemas.query>;
export type VoiceOperatorRoleBody = import("zod").infer<typeof voiceOperatorRoleRequestSchemas.body>;
export type AccessGrantedEventQueryBody = import("zod").infer<typeof accessGrantedEventQueryRequestSchema.body>;
export type AccessRevokedEventQueryBody = import("zod").infer<typeof accessRevokedEventQueryRequestSchema.body>;
export type AuditEventEventQueryBody = import("zod").infer<typeof auditEventEventQueryRequestSchema.body>;
export type KeyRotatedEventQueryBody = import("zod").infer<typeof keyRotatedEventQueryRequestSchema.body>;
export type OffchainKeyGeneratedEventQueryBody = import("zod").infer<typeof offchainKeyGeneratedEventQueryRequestSchema.body>;
export type SecurityParametersUpdatedEventQueryBody = import("zod").infer<typeof securityParametersUpdatedEventQueryRequestSchema.body>;
export type VoiceFingerprintUpdatedEventQueryBody = import("zod").infer<typeof voiceFingerprintUpdatedEventQueryRequestSchema.body>;
