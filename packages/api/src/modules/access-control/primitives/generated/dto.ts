import {
  debugRoleIndexStateRequestSchemas,
  emergencyForceAddRequestSchemas,
  executeFounderSunsetRequestSchemas,
  getOwnerOperationalRolesRequestSchemas,
  getQuorumRequestSchemas,
  getRequiredSignersRequestSchemas,
  getRoleAdminRequestSchemas,
  getRoleConfigRequestSchemas,
  getRoleMemberRequestSchemas,
  getRoleMembersRequestSchemas,
  getUserRolesRequestSchemas,
  grantRoleRequestSchemas,
  hasAllParticipantRolesRequestSchemas,
  hasRoleRequestSchemas,
  isFounderSunsetActiveRequestSchemas,
  isRoleActiveRequestSchemas,
  renounceRoleRequestSchemas,
  revokeRoleRequestSchemas,
  scheduleFounderSunsetRequestSchemas,
  setDefaultValidityPeriodRequestSchemas,
  setMinValidationsRequestSchemas,
  setPausedRequestSchemas,
  setRecoveryActiveRequestSchemas,
  setRoleAdminRequestSchemas,
  accessAttemptEventQueryRequestSchema,
  daomemberRoleGrantedEventQueryRequestSchema,
  founderSunsetExecutedEventQueryRequestSchema,
  founderSunsetScheduledEventQueryRequestSchema,
  governanceParticipantRoleGrantedEventQueryRequestSchema,
  marketplacePurchaserRoleGrantedEventQueryRequestSchema,
  marketplaceSellerRoleGrantedEventQueryRequestSchema,
  participantRoleRevokedEventQueryRequestSchema,
  researchParticipantRoleGrantedEventQueryRequestSchema,
  roleAdminChangedEventQueryRequestSchema,
  roleConfigUpdatedEventQueryRequestSchema,
  roleGrantedEventQueryRequestSchema,
  roleRenouncedEventQueryRequestSchema,
  roleRevokedEventQueryRequestSchema,
  securityActionEventQueryRequestSchema,
} from "./schemas.js";

export type DebugRoleIndexStatePath = import("zod").infer<typeof debugRoleIndexStateRequestSchemas.path>;
export type DebugRoleIndexStateQuery = import("zod").infer<typeof debugRoleIndexStateRequestSchemas.query>;
export type DebugRoleIndexStateBody = import("zod").infer<typeof debugRoleIndexStateRequestSchemas.body>;
export type EmergencyForceAddPath = import("zod").infer<typeof emergencyForceAddRequestSchemas.path>;
export type EmergencyForceAddQuery = import("zod").infer<typeof emergencyForceAddRequestSchemas.query>;
export type EmergencyForceAddBody = import("zod").infer<typeof emergencyForceAddRequestSchemas.body>;
export type ExecuteFounderSunsetPath = import("zod").infer<typeof executeFounderSunsetRequestSchemas.path>;
export type ExecuteFounderSunsetQuery = import("zod").infer<typeof executeFounderSunsetRequestSchemas.query>;
export type ExecuteFounderSunsetBody = import("zod").infer<typeof executeFounderSunsetRequestSchemas.body>;
export type GetOwnerOperationalRolesPath = import("zod").infer<typeof getOwnerOperationalRolesRequestSchemas.path>;
export type GetOwnerOperationalRolesQuery = import("zod").infer<typeof getOwnerOperationalRolesRequestSchemas.query>;
export type GetOwnerOperationalRolesBody = import("zod").infer<typeof getOwnerOperationalRolesRequestSchemas.body>;
export type GetQuorumPath = import("zod").infer<typeof getQuorumRequestSchemas.path>;
export type GetQuorumQuery = import("zod").infer<typeof getQuorumRequestSchemas.query>;
export type GetQuorumBody = import("zod").infer<typeof getQuorumRequestSchemas.body>;
export type GetRequiredSignersPath = import("zod").infer<typeof getRequiredSignersRequestSchemas.path>;
export type GetRequiredSignersQuery = import("zod").infer<typeof getRequiredSignersRequestSchemas.query>;
export type GetRequiredSignersBody = import("zod").infer<typeof getRequiredSignersRequestSchemas.body>;
export type GetRoleAdminPath = import("zod").infer<typeof getRoleAdminRequestSchemas.path>;
export type GetRoleAdminQuery = import("zod").infer<typeof getRoleAdminRequestSchemas.query>;
export type GetRoleAdminBody = import("zod").infer<typeof getRoleAdminRequestSchemas.body>;
export type GetRoleConfigPath = import("zod").infer<typeof getRoleConfigRequestSchemas.path>;
export type GetRoleConfigQuery = import("zod").infer<typeof getRoleConfigRequestSchemas.query>;
export type GetRoleConfigBody = import("zod").infer<typeof getRoleConfigRequestSchemas.body>;
export type GetRoleMemberPath = import("zod").infer<typeof getRoleMemberRequestSchemas.path>;
export type GetRoleMemberQuery = import("zod").infer<typeof getRoleMemberRequestSchemas.query>;
export type GetRoleMemberBody = import("zod").infer<typeof getRoleMemberRequestSchemas.body>;
export type GetRoleMembersPath = import("zod").infer<typeof getRoleMembersRequestSchemas.path>;
export type GetRoleMembersQuery = import("zod").infer<typeof getRoleMembersRequestSchemas.query>;
export type GetRoleMembersBody = import("zod").infer<typeof getRoleMembersRequestSchemas.body>;
export type GetUserRolesPath = import("zod").infer<typeof getUserRolesRequestSchemas.path>;
export type GetUserRolesQuery = import("zod").infer<typeof getUserRolesRequestSchemas.query>;
export type GetUserRolesBody = import("zod").infer<typeof getUserRolesRequestSchemas.body>;
export type GrantRolePath = import("zod").infer<typeof grantRoleRequestSchemas.path>;
export type GrantRoleQuery = import("zod").infer<typeof grantRoleRequestSchemas.query>;
export type GrantRoleBody = import("zod").infer<typeof grantRoleRequestSchemas.body>;
export type HasAllParticipantRolesPath = import("zod").infer<typeof hasAllParticipantRolesRequestSchemas.path>;
export type HasAllParticipantRolesQuery = import("zod").infer<typeof hasAllParticipantRolesRequestSchemas.query>;
export type HasAllParticipantRolesBody = import("zod").infer<typeof hasAllParticipantRolesRequestSchemas.body>;
export type HasRolePath = import("zod").infer<typeof hasRoleRequestSchemas.path>;
export type HasRoleQuery = import("zod").infer<typeof hasRoleRequestSchemas.query>;
export type HasRoleBody = import("zod").infer<typeof hasRoleRequestSchemas.body>;
export type IsFounderSunsetActivePath = import("zod").infer<typeof isFounderSunsetActiveRequestSchemas.path>;
export type IsFounderSunsetActiveQuery = import("zod").infer<typeof isFounderSunsetActiveRequestSchemas.query>;
export type IsFounderSunsetActiveBody = import("zod").infer<typeof isFounderSunsetActiveRequestSchemas.body>;
export type IsRoleActivePath = import("zod").infer<typeof isRoleActiveRequestSchemas.path>;
export type IsRoleActiveQuery = import("zod").infer<typeof isRoleActiveRequestSchemas.query>;
export type IsRoleActiveBody = import("zod").infer<typeof isRoleActiveRequestSchemas.body>;
export type RenounceRolePath = import("zod").infer<typeof renounceRoleRequestSchemas.path>;
export type RenounceRoleQuery = import("zod").infer<typeof renounceRoleRequestSchemas.query>;
export type RenounceRoleBody = import("zod").infer<typeof renounceRoleRequestSchemas.body>;
export type RevokeRolePath = import("zod").infer<typeof revokeRoleRequestSchemas.path>;
export type RevokeRoleQuery = import("zod").infer<typeof revokeRoleRequestSchemas.query>;
export type RevokeRoleBody = import("zod").infer<typeof revokeRoleRequestSchemas.body>;
export type ScheduleFounderSunsetPath = import("zod").infer<typeof scheduleFounderSunsetRequestSchemas.path>;
export type ScheduleFounderSunsetQuery = import("zod").infer<typeof scheduleFounderSunsetRequestSchemas.query>;
export type ScheduleFounderSunsetBody = import("zod").infer<typeof scheduleFounderSunsetRequestSchemas.body>;
export type SetDefaultValidityPeriodPath = import("zod").infer<typeof setDefaultValidityPeriodRequestSchemas.path>;
export type SetDefaultValidityPeriodQuery = import("zod").infer<typeof setDefaultValidityPeriodRequestSchemas.query>;
export type SetDefaultValidityPeriodBody = import("zod").infer<typeof setDefaultValidityPeriodRequestSchemas.body>;
export type SetMinValidationsPath = import("zod").infer<typeof setMinValidationsRequestSchemas.path>;
export type SetMinValidationsQuery = import("zod").infer<typeof setMinValidationsRequestSchemas.query>;
export type SetMinValidationsBody = import("zod").infer<typeof setMinValidationsRequestSchemas.body>;
export type SetPausedPath = import("zod").infer<typeof setPausedRequestSchemas.path>;
export type SetPausedQuery = import("zod").infer<typeof setPausedRequestSchemas.query>;
export type SetPausedBody = import("zod").infer<typeof setPausedRequestSchemas.body>;
export type SetRecoveryActivePath = import("zod").infer<typeof setRecoveryActiveRequestSchemas.path>;
export type SetRecoveryActiveQuery = import("zod").infer<typeof setRecoveryActiveRequestSchemas.query>;
export type SetRecoveryActiveBody = import("zod").infer<typeof setRecoveryActiveRequestSchemas.body>;
export type SetRoleAdminPath = import("zod").infer<typeof setRoleAdminRequestSchemas.path>;
export type SetRoleAdminQuery = import("zod").infer<typeof setRoleAdminRequestSchemas.query>;
export type SetRoleAdminBody = import("zod").infer<typeof setRoleAdminRequestSchemas.body>;
export type AccessAttemptEventQueryBody = import("zod").infer<typeof accessAttemptEventQueryRequestSchema.body>;
export type DaomemberRoleGrantedEventQueryBody = import("zod").infer<typeof daomemberRoleGrantedEventQueryRequestSchema.body>;
export type FounderSunsetExecutedEventQueryBody = import("zod").infer<typeof founderSunsetExecutedEventQueryRequestSchema.body>;
export type FounderSunsetScheduledEventQueryBody = import("zod").infer<typeof founderSunsetScheduledEventQueryRequestSchema.body>;
export type GovernanceParticipantRoleGrantedEventQueryBody = import("zod").infer<typeof governanceParticipantRoleGrantedEventQueryRequestSchema.body>;
export type MarketplacePurchaserRoleGrantedEventQueryBody = import("zod").infer<typeof marketplacePurchaserRoleGrantedEventQueryRequestSchema.body>;
export type MarketplaceSellerRoleGrantedEventQueryBody = import("zod").infer<typeof marketplaceSellerRoleGrantedEventQueryRequestSchema.body>;
export type ParticipantRoleRevokedEventQueryBody = import("zod").infer<typeof participantRoleRevokedEventQueryRequestSchema.body>;
export type ResearchParticipantRoleGrantedEventQueryBody = import("zod").infer<typeof researchParticipantRoleGrantedEventQueryRequestSchema.body>;
export type RoleAdminChangedEventQueryBody = import("zod").infer<typeof roleAdminChangedEventQueryRequestSchema.body>;
export type RoleConfigUpdatedEventQueryBody = import("zod").infer<typeof roleConfigUpdatedEventQueryRequestSchema.body>;
export type RoleGrantedEventQueryBody = import("zod").infer<typeof roleGrantedEventQueryRequestSchema.body>;
export type RoleRenouncedEventQueryBody = import("zod").infer<typeof roleRenouncedEventQueryRequestSchema.body>;
export type RoleRevokedEventQueryBody = import("zod").infer<typeof roleRevokedEventQueryRequestSchema.body>;
export type SecurityActionEventQueryBody = import("zod").infer<typeof securityActionEventQueryRequestSchema.body>;
