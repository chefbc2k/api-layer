import type { ApiExecutionContext } from "../../../../shared/execution-context.js";
import { executeHttpEventDefinition, executeHttpMethodDefinition } from "../../../../shared/execution-context.js";
import type { EventInvocationRequest, PrimitiveInvocationRequest } from "../../../../shared/route-types.js";
import { accessControlEventDefinitions, accessControlMethodDefinitions } from "./mapping.js";

export function createAccessControlPrimitiveService(context: ApiExecutionContext) {
  return {
    configureRole: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, accessControlMethodDefinitions.find((definition) => definition.operationId === "configureRole")!, request),
    debugRoleIndexState: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, accessControlMethodDefinitions.find((definition) => definition.operationId === "debugRoleIndexState")!, request),
    emergencyForceAdd: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, accessControlMethodDefinitions.find((definition) => definition.operationId === "emergencyForceAdd")!, request),
    executeFounderSunset: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, accessControlMethodDefinitions.find((definition) => definition.operationId === "executeFounderSunset")!, request),
    getOwnerOperationalRoles: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, accessControlMethodDefinitions.find((definition) => definition.operationId === "getOwnerOperationalRoles")!, request),
    getQuorum: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, accessControlMethodDefinitions.find((definition) => definition.operationId === "getQuorum")!, request),
    getRequiredSigners: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, accessControlMethodDefinitions.find((definition) => definition.operationId === "getRequiredSigners")!, request),
    getRoleAdmin: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, accessControlMethodDefinitions.find((definition) => definition.operationId === "getRoleAdmin")!, request),
    getRoleConfig: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, accessControlMethodDefinitions.find((definition) => definition.operationId === "getRoleConfig")!, request),
    getRoleMember: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, accessControlMethodDefinitions.find((definition) => definition.operationId === "getRoleMember")!, request),
    getRoleMembers: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, accessControlMethodDefinitions.find((definition) => definition.operationId === "getRoleMembers")!, request),
    getUserRoles: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, accessControlMethodDefinitions.find((definition) => definition.operationId === "getUserRoles")!, request),
    grantRole: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, accessControlMethodDefinitions.find((definition) => definition.operationId === "grantRole")!, request),
    hasAllParticipantRoles: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, accessControlMethodDefinitions.find((definition) => definition.operationId === "hasAllParticipantRoles")!, request),
    hasRole: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, accessControlMethodDefinitions.find((definition) => definition.operationId === "hasRole")!, request),
    isFounderSunsetActive: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, accessControlMethodDefinitions.find((definition) => definition.operationId === "isFounderSunsetActive")!, request),
    isRoleActive: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, accessControlMethodDefinitions.find((definition) => definition.operationId === "isRoleActive")!, request),
    renounceRole: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, accessControlMethodDefinitions.find((definition) => definition.operationId === "renounceRole")!, request),
    revokeRole: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, accessControlMethodDefinitions.find((definition) => definition.operationId === "revokeRole")!, request),
    scheduleFounderSunset: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, accessControlMethodDefinitions.find((definition) => definition.operationId === "scheduleFounderSunset")!, request),
    setDefaultValidityPeriod: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, accessControlMethodDefinitions.find((definition) => definition.operationId === "setDefaultValidityPeriod")!, request),
    setMinValidations: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, accessControlMethodDefinitions.find((definition) => definition.operationId === "setMinValidations")!, request),
    setPaused: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, accessControlMethodDefinitions.find((definition) => definition.operationId === "setPaused")!, request),
    setRecoveryActive: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, accessControlMethodDefinitions.find((definition) => definition.operationId === "setRecoveryActive")!, request),
    setRoleAdmin: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, accessControlMethodDefinitions.find((definition) => definition.operationId === "setRoleAdmin")!, request),
    accessAttemptEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, accessControlEventDefinitions.find((definition) => definition.operationId === "accessAttemptEventQuery")!, request),
    daomemberRoleGrantedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, accessControlEventDefinitions.find((definition) => definition.operationId === "daomemberRoleGrantedEventQuery")!, request),
    founderSunsetExecutedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, accessControlEventDefinitions.find((definition) => definition.operationId === "founderSunsetExecutedEventQuery")!, request),
    founderSunsetScheduledEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, accessControlEventDefinitions.find((definition) => definition.operationId === "founderSunsetScheduledEventQuery")!, request),
    governanceParticipantRoleGrantedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, accessControlEventDefinitions.find((definition) => definition.operationId === "governanceParticipantRoleGrantedEventQuery")!, request),
    marketplacePurchaserRoleGrantedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, accessControlEventDefinitions.find((definition) => definition.operationId === "marketplacePurchaserRoleGrantedEventQuery")!, request),
    marketplaceSellerRoleGrantedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, accessControlEventDefinitions.find((definition) => definition.operationId === "marketplaceSellerRoleGrantedEventQuery")!, request),
    participantRoleRevokedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, accessControlEventDefinitions.find((definition) => definition.operationId === "participantRoleRevokedEventQuery")!, request),
    researchParticipantRoleGrantedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, accessControlEventDefinitions.find((definition) => definition.operationId === "researchParticipantRoleGrantedEventQuery")!, request),
    roleAdminChangedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, accessControlEventDefinitions.find((definition) => definition.operationId === "roleAdminChangedEventQuery")!, request),
    roleConfigUpdatedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, accessControlEventDefinitions.find((definition) => definition.operationId === "roleConfigUpdatedEventQuery")!, request),
    roleGrantedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, accessControlEventDefinitions.find((definition) => definition.operationId === "roleGrantedEventQuery")!, request),
    roleRenouncedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, accessControlEventDefinitions.find((definition) => definition.operationId === "roleRenouncedEventQuery")!, request),
    roleRevokedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, accessControlEventDefinitions.find((definition) => definition.operationId === "roleRevokedEventQuery")!, request),
    securityActionEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, accessControlEventDefinitions.find((definition) => definition.operationId === "securityActionEventQuery")!, request),
  };
}
