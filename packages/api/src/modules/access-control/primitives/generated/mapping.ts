import type { HttpEventDefinition, HttpMethodDefinition } from "../../../../shared/route-types.js";

export const accessControlMethodDefinitions: HttpMethodDefinition[] = [
  {
    "key": "AccessControlFacet.debugRoleIndexState",
    "facetName": "AccessControlFacet",
    "wrapperKey": "debugRoleIndexState",
    "domain": "access-control",
    "resource": "access-control",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/access-control/queries/debug-role-index-state",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "role",
          "source": "query",
          "field": "role"
        }
      ]
    },
    "outputShape": {
      "kind": "tuple"
    },
    "operationId": "debugRoleIndexState",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "AccessControlFacet.debugRoleIndexState",
    "methodName": "debugRoleIndexState",
    "signature": "debugRoleIndexState(bytes32)",
    "category": "read",
    "mutability": "view",
    "liveRequired": false,
    "cacheClass": "short",
    "cacheTtlSeconds": 5,
    "executionSources": [
      "live",
      "cache"
    ],
    "gaslessModes": [],
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "founderAccount",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "founderIncluded",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "founderHasCanonicalRole",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "rawLength",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "filteredLength",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "key": "AccessControlFacet.emergencyForceAdd",
    "facetName": "AccessControlFacet",
    "wrapperKey": "emergencyForceAdd",
    "domain": "access-control",
    "resource": "access-control",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/access-control/admin/emergency-force-add",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "role",
          "source": "body",
          "field": "role"
        },
        {
          "name": "account",
          "source": "body",
          "field": "account"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "emergencyForceAdd",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "AccessControlFacet.emergencyForceAdd",
    "methodName": "emergencyForceAdd",
    "signature": "emergencyForceAdd(bytes32,address)",
    "category": "write",
    "mutability": "nonpayable",
    "liveRequired": false,
    "cacheClass": "none",
    "cacheTtlSeconds": null,
    "executionSources": [
      "live"
    ],
    "gaslessModes": [],
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": []
  },
  {
    "key": "AccessControlFacet.executeFounderSunset",
    "facetName": "AccessControlFacet",
    "wrapperKey": "executeFounderSunset",
    "domain": "access-control",
    "resource": "access-control",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/access-control/admin/execute-founder-sunset",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "executeFounderSunset",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "AccessControlFacet.executeFounderSunset",
    "methodName": "executeFounderSunset",
    "signature": "executeFounderSunset()",
    "category": "write",
    "mutability": "nonpayable",
    "liveRequired": false,
    "cacheClass": "none",
    "cacheTtlSeconds": null,
    "executionSources": [
      "live"
    ],
    "gaslessModes": [],
    "inputs": [],
    "outputs": []
  },
  {
    "key": "AccessControlFacet.getOwnerOperationalRoles",
    "facetName": "AccessControlFacet",
    "wrapperKey": "getOwnerOperationalRoles",
    "domain": "access-control",
    "resource": "access-control",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/access-control/queries/get-owner-operational-roles",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "account",
          "source": "query",
          "field": "account"
        }
      ]
    },
    "outputShape": {
      "kind": "array"
    },
    "operationId": "getOwnerOperationalRoles",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "AccessControlFacet.getOwnerOperationalRoles",
    "methodName": "getOwnerOperationalRoles",
    "signature": "getOwnerOperationalRoles(address)",
    "category": "read",
    "mutability": "view",
    "liveRequired": false,
    "cacheClass": "short",
    "cacheTtlSeconds": 5,
    "executionSources": [
      "live",
      "cache"
    ],
    "gaslessModes": [],
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "roles",
        "type": "bytes32[]",
        "internalType": "bytes32[]"
      }
    ]
  },
  {
    "key": "AccessControlFacet.getQuorum",
    "facetName": "AccessControlFacet",
    "wrapperKey": "getQuorum",
    "domain": "access-control",
    "resource": "access-control",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/access-control/queries/get-quorum",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "role",
          "source": "query",
          "field": "role"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "getQuorum",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "AccessControlFacet.getQuorum",
    "methodName": "getQuorum",
    "signature": "getQuorum(bytes32)",
    "category": "read",
    "mutability": "view",
    "liveRequired": false,
    "cacheClass": "short",
    "cacheTtlSeconds": 5,
    "executionSources": [
      "live",
      "cache"
    ],
    "gaslessModes": [],
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "key": "AccessControlFacet.getRequiredSigners",
    "facetName": "AccessControlFacet",
    "wrapperKey": "getRequiredSigners",
    "domain": "access-control",
    "resource": "access-control",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/access-control/queries/get-required-signers",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "role",
          "source": "query",
          "field": "role"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "getRequiredSigners",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "AccessControlFacet.getRequiredSigners",
    "methodName": "getRequiredSigners",
    "signature": "getRequiredSigners(bytes32)",
    "category": "read",
    "mutability": "view",
    "liveRequired": false,
    "cacheClass": "short",
    "cacheTtlSeconds": 5,
    "executionSources": [
      "live",
      "cache"
    ],
    "gaslessModes": [],
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "key": "AccessControlFacet.getRoleAdmin",
    "facetName": "AccessControlFacet",
    "wrapperKey": "getRoleAdmin",
    "domain": "access-control",
    "resource": "access-control",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/access-control/queries/get-role-admin",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "role",
          "source": "query",
          "field": "role"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "getRoleAdmin",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "AccessControlFacet.getRoleAdmin",
    "methodName": "getRoleAdmin",
    "signature": "getRoleAdmin(bytes32)",
    "category": "read",
    "mutability": "view",
    "liveRequired": false,
    "cacheClass": "static",
    "cacheTtlSeconds": 600,
    "executionSources": [
      "live",
      "cache"
    ],
    "gaslessModes": [],
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "key": "AccessControlFacet.getRoleConfig",
    "facetName": "AccessControlFacet",
    "wrapperKey": "getRoleConfig",
    "domain": "access-control",
    "resource": "access-control",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/access-control/queries/get-role-config",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "role",
          "source": "query",
          "field": "role"
        }
      ]
    },
    "outputShape": {
      "kind": "object"
    },
    "operationId": "getRoleConfig",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "AccessControlFacet.getRoleConfig",
    "methodName": "getRoleConfig",
    "signature": "getRoleConfig(bytes32)",
    "category": "read",
    "mutability": "view",
    "liveRequired": false,
    "cacheClass": "static",
    "cacheTtlSeconds": 600,
    "executionSources": [
      "live",
      "cache"
    ],
    "gaslessModes": [],
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct IAccessControl.RoleConfig",
        "components": [
          {
            "name": "memberLimit",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "validityPeriod",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "minMemberLimit",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "quorumBps",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "absoluteMinQuorum",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "adminRole",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "restricted",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "revocable",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "requiresApproval",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "recoveryActive",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      }
    ]
  },
  {
    "key": "AccessControlFacet.getRoleMember",
    "facetName": "AccessControlFacet",
    "wrapperKey": "getRoleMember",
    "domain": "access-control",
    "resource": "access-control",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/access-control/queries/get-role-member",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "role",
          "source": "query",
          "field": "role"
        },
        {
          "name": "account",
          "source": "query",
          "field": "account"
        }
      ]
    },
    "outputShape": {
      "kind": "object"
    },
    "operationId": "getRoleMember",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "AccessControlFacet.getRoleMember",
    "methodName": "getRoleMember",
    "signature": "getRoleMember(bytes32,address)",
    "category": "read",
    "mutability": "view",
    "liveRequired": false,
    "cacheClass": "static",
    "cacheTtlSeconds": 600,
    "executionSources": [
      "live",
      "cache"
    ],
    "gaslessModes": [],
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct IAccessControl.RoleMember",
        "components": [
          {
            "name": "expiryTime",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "assignedTime",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "assignedBlock",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "assignedBy",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "active",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "childRoles",
            "type": "bytes32[]",
            "internalType": "bytes32[]"
          }
        ]
      }
    ]
  },
  {
    "key": "AccessControlFacet.getRoleMembers",
    "facetName": "AccessControlFacet",
    "wrapperKey": "getRoleMembers",
    "domain": "access-control",
    "resource": "access-control",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/access-control/queries/get-role-members",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "role",
          "source": "query",
          "field": "role"
        }
      ]
    },
    "outputShape": {
      "kind": "array"
    },
    "operationId": "getRoleMembers",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "AccessControlFacet.getRoleMembers",
    "methodName": "getRoleMembers",
    "signature": "getRoleMembers(bytes32)",
    "category": "read",
    "mutability": "view",
    "liveRequired": false,
    "cacheClass": "static",
    "cacheTtlSeconds": 600,
    "executionSources": [
      "live",
      "cache"
    ],
    "gaslessModes": [],
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address[]",
        "internalType": "address[]"
      }
    ]
  },
  {
    "key": "AccessControlFacet.getUserRoles",
    "facetName": "AccessControlFacet",
    "wrapperKey": "getUserRoles",
    "domain": "access-control",
    "resource": "access-control",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/access-control/queries/get-user-roles",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "account",
          "source": "query",
          "field": "account"
        }
      ]
    },
    "outputShape": {
      "kind": "array"
    },
    "operationId": "getUserRoles",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "AccessControlFacet.getUserRoles",
    "methodName": "getUserRoles",
    "signature": "getUserRoles(address)",
    "category": "read",
    "mutability": "view",
    "liveRequired": false,
    "cacheClass": "short",
    "cacheTtlSeconds": 5,
    "executionSources": [
      "live",
      "cache"
    ],
    "gaslessModes": [],
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "roles",
        "type": "bytes32[]",
        "internalType": "bytes32[]"
      }
    ]
  },
  {
    "key": "AccessControlFacet.grantRole",
    "facetName": "AccessControlFacet",
    "wrapperKey": "grantRole",
    "domain": "access-control",
    "resource": "access-control",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/access-control/admin/grant-role",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "role",
          "source": "body",
          "field": "role"
        },
        {
          "name": "account",
          "source": "body",
          "field": "account"
        },
        {
          "name": "expiryTime",
          "source": "body",
          "field": "expiryTime"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "grantRole",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "AccessControlFacet.grantRole",
    "methodName": "grantRole",
    "signature": "grantRole(bytes32,address,uint256)",
    "category": "write",
    "mutability": "nonpayable",
    "liveRequired": false,
    "cacheClass": "none",
    "cacheTtlSeconds": null,
    "executionSources": [
      "live"
    ],
    "gaslessModes": [],
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "expiryTime",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "AccessControlFacet.hasAllParticipantRoles",
    "facetName": "AccessControlFacet",
    "wrapperKey": "hasAllParticipantRoles",
    "domain": "access-control",
    "resource": "access-control",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/access-control/queries/has-all-participant-roles",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "account",
          "source": "query",
          "field": "account"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "hasAllParticipantRoles",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "AccessControlFacet.hasAllParticipantRoles",
    "methodName": "hasAllParticipantRoles",
    "signature": "hasAllParticipantRoles(address)",
    "category": "read",
    "mutability": "view",
    "liveRequired": false,
    "cacheClass": "short",
    "cacheTtlSeconds": 5,
    "executionSources": [
      "live",
      "cache"
    ],
    "gaslessModes": [],
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ]
  },
  {
    "key": "AccessControlFacet.hasRole",
    "facetName": "AccessControlFacet",
    "wrapperKey": "hasRole",
    "domain": "access-control",
    "resource": "access-control",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/access-control/queries/has-role",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "role",
          "source": "query",
          "field": "role"
        },
        {
          "name": "account",
          "source": "query",
          "field": "account"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "hasRole",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "AccessControlFacet.hasRole",
    "methodName": "hasRole",
    "signature": "hasRole(bytes32,address)",
    "category": "read",
    "mutability": "view",
    "liveRequired": false,
    "cacheClass": "short",
    "cacheTtlSeconds": 5,
    "executionSources": [
      "live",
      "cache"
    ],
    "gaslessModes": [],
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ]
  },
  {
    "key": "AccessControlFacet.isFounderSunsetActive",
    "facetName": "AccessControlFacet",
    "wrapperKey": "isFounderSunsetActive",
    "domain": "access-control",
    "resource": "access-control",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/access-control/queries/is-founder-sunset-active",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "isFounderSunsetActive",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "AccessControlFacet.isFounderSunsetActive",
    "methodName": "isFounderSunsetActive",
    "signature": "isFounderSunsetActive()",
    "category": "read",
    "mutability": "view",
    "liveRequired": false,
    "cacheClass": "short",
    "cacheTtlSeconds": 5,
    "executionSources": [
      "live",
      "cache"
    ],
    "gaslessModes": [],
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ]
  },
  {
    "key": "AccessControlFacet.isRoleActive",
    "facetName": "AccessControlFacet",
    "wrapperKey": "isRoleActive",
    "domain": "access-control",
    "resource": "access-control",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/access-control/queries/is-role-active",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "role",
          "source": "query",
          "field": "role"
        },
        {
          "name": "account",
          "source": "query",
          "field": "account"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "isRoleActive",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "AccessControlFacet.isRoleActive",
    "methodName": "isRoleActive",
    "signature": "isRoleActive(bytes32,address)",
    "category": "read",
    "mutability": "view",
    "liveRequired": false,
    "cacheClass": "short",
    "cacheTtlSeconds": 5,
    "executionSources": [
      "live",
      "cache"
    ],
    "gaslessModes": [],
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ]
  },
  {
    "key": "AccessControlFacet.renounceRole",
    "facetName": "AccessControlFacet",
    "wrapperKey": "renounceRole",
    "domain": "access-control",
    "resource": "access-control",
    "classification": "delete",
    "httpMethod": "DELETE",
    "path": "/v1/access-control/commands/renounce-role",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "role",
          "source": "body",
          "field": "role"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "renounceRole",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "AccessControlFacet.renounceRole",
    "methodName": "renounceRole",
    "signature": "renounceRole(bytes32)",
    "category": "write",
    "mutability": "nonpayable",
    "liveRequired": false,
    "cacheClass": "none",
    "cacheTtlSeconds": null,
    "executionSources": [
      "live"
    ],
    "gaslessModes": [],
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": []
  },
  {
    "key": "AccessControlFacet.revokeRole",
    "facetName": "AccessControlFacet",
    "wrapperKey": "revokeRole",
    "domain": "access-control",
    "resource": "access-control",
    "classification": "delete",
    "httpMethod": "DELETE",
    "path": "/v1/access-control/commands/revoke-role",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "role",
          "source": "body",
          "field": "role"
        },
        {
          "name": "account",
          "source": "body",
          "field": "account"
        },
        {
          "name": "reason",
          "source": "body",
          "field": "reason"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "revokeRole",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "AccessControlFacet.revokeRole",
    "methodName": "revokeRole",
    "signature": "revokeRole(bytes32,address,string)",
    "category": "write",
    "mutability": "nonpayable",
    "liveRequired": false,
    "cacheClass": "none",
    "cacheTtlSeconds": null,
    "executionSources": [
      "live"
    ],
    "gaslessModes": [],
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "reason",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": []
  },
  {
    "key": "AccessControlFacet.scheduleFounderSunset",
    "facetName": "AccessControlFacet",
    "wrapperKey": "scheduleFounderSunset",
    "domain": "access-control",
    "resource": "access-control",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/access-control/admin/schedule-founder-sunset",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "executeAt",
          "source": "body",
          "field": "executeAt"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "scheduleFounderSunset",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "AccessControlFacet.scheduleFounderSunset",
    "methodName": "scheduleFounderSunset",
    "signature": "scheduleFounderSunset(uint256)",
    "category": "write",
    "mutability": "nonpayable",
    "liveRequired": false,
    "cacheClass": "none",
    "cacheTtlSeconds": null,
    "executionSources": [
      "live"
    ],
    "gaslessModes": [],
    "inputs": [
      {
        "name": "executeAt",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "AccessControlFacet.setDefaultValidityPeriod",
    "facetName": "AccessControlFacet",
    "wrapperKey": "setDefaultValidityPeriod",
    "domain": "access-control",
    "resource": "access-control",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/access-control/admin/set-default-validity-period",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "period",
          "source": "body",
          "field": "period"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setDefaultValidityPeriod",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "AccessControlFacet.setDefaultValidityPeriod",
    "methodName": "setDefaultValidityPeriod",
    "signature": "setDefaultValidityPeriod(uint256)",
    "category": "write",
    "mutability": "nonpayable",
    "liveRequired": false,
    "cacheClass": "none",
    "cacheTtlSeconds": null,
    "executionSources": [
      "live"
    ],
    "gaslessModes": [],
    "inputs": [
      {
        "name": "period",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "AccessControlFacet.setMinValidations",
    "facetName": "AccessControlFacet",
    "wrapperKey": "setMinValidations",
    "domain": "access-control",
    "resource": "access-control",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/access-control/admin/set-min-validations",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "validations",
          "source": "body",
          "field": "validations"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setMinValidations",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "AccessControlFacet.setMinValidations",
    "methodName": "setMinValidations",
    "signature": "setMinValidations(uint256)",
    "category": "write",
    "mutability": "nonpayable",
    "liveRequired": false,
    "cacheClass": "none",
    "cacheTtlSeconds": null,
    "executionSources": [
      "live"
    ],
    "gaslessModes": [],
    "inputs": [
      {
        "name": "validations",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "AccessControlFacet.setPaused",
    "facetName": "AccessControlFacet",
    "wrapperKey": "setPaused",
    "domain": "access-control",
    "resource": "access-control",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/access-control/admin/set-paused",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "paused",
          "source": "body",
          "field": "paused"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setPaused",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "AccessControlFacet.setPaused",
    "methodName": "setPaused",
    "signature": "setPaused(bool)",
    "category": "write",
    "mutability": "nonpayable",
    "liveRequired": false,
    "cacheClass": "none",
    "cacheTtlSeconds": null,
    "executionSources": [
      "live"
    ],
    "gaslessModes": [],
    "inputs": [
      {
        "name": "paused",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": []
  },
  {
    "key": "AccessControlFacet.setRecoveryActive",
    "facetName": "AccessControlFacet",
    "wrapperKey": "setRecoveryActive",
    "domain": "access-control",
    "resource": "access-control",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/access-control/admin/set-recovery-active",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "role",
          "source": "body",
          "field": "role"
        },
        {
          "name": "active",
          "source": "body",
          "field": "active"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setRecoveryActive",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "AccessControlFacet.setRecoveryActive",
    "methodName": "setRecoveryActive",
    "signature": "setRecoveryActive(bytes32,bool)",
    "category": "write",
    "mutability": "nonpayable",
    "liveRequired": false,
    "cacheClass": "none",
    "cacheTtlSeconds": null,
    "executionSources": [
      "live"
    ],
    "gaslessModes": [],
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "active",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": []
  },
  {
    "key": "AccessControlFacet.setRoleAdmin",
    "facetName": "AccessControlFacet",
    "wrapperKey": "setRoleAdmin",
    "domain": "access-control",
    "resource": "access-control",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/access-control/admin/set-role-admin",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "role",
          "source": "body",
          "field": "role"
        },
        {
          "name": "adminRole",
          "source": "body",
          "field": "adminRole"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setRoleAdmin",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "AccessControlFacet.setRoleAdmin",
    "methodName": "setRoleAdmin",
    "signature": "setRoleAdmin(bytes32,bytes32)",
    "category": "write",
    "mutability": "nonpayable",
    "liveRequired": false,
    "cacheClass": "none",
    "cacheTtlSeconds": null,
    "executionSources": [
      "live"
    ],
    "gaslessModes": [],
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "adminRole",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": []
  }
] as HttpMethodDefinition[];
export const accessControlEventDefinitions: HttpEventDefinition[] = [
  {
    "key": "AccessControlFacet.AccessAttempt",
    "facetName": "AccessControlFacet",
    "wrapperKey": "AccessAttempt",
    "domain": "access-control",
    "operationId": "accessAttemptEventQuery",
    "httpMethod": "POST",
    "path": "/v1/access-control/events/access-attempt/query",
    "notes": "AccessControlFacet.AccessAttempt",
    "eventName": "AccessAttempt",
    "signature": "AccessAttempt(address,bytes4,bool,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "actor",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "selector",
        "type": "bytes4",
        "indexed": true,
        "internalType": "bytes4"
      },
      {
        "name": "success",
        "type": "bool",
        "indexed": true,
        "internalType": "bool"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "rawOnly",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "AccessControlFacet.DAOMemberRoleGranted",
    "facetName": "AccessControlFacet",
    "wrapperKey": "DAOMemberRoleGranted",
    "domain": "access-control",
    "operationId": "daomemberRoleGrantedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/access-control/events/daomember-role-granted/query",
    "notes": "AccessControlFacet.DAOMemberRoleGranted",
    "eventName": "DAOMemberRoleGranted",
    "signature": "DAOMemberRoleGranted(address,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "rawOnly",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "AccessControlFacet.FounderSunsetExecuted",
    "facetName": "AccessControlFacet",
    "wrapperKey": "FounderSunsetExecuted",
    "domain": "access-control",
    "operationId": "founderSunsetExecutedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/access-control/events/founder-sunset-executed/query",
    "notes": "AccessControlFacet.FounderSunsetExecuted",
    "eventName": "FounderSunsetExecuted",
    "signature": "FounderSunsetExecuted(uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "executedAt",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "rawOnly",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "AccessControlFacet.FounderSunsetScheduled",
    "facetName": "AccessControlFacet",
    "wrapperKey": "FounderSunsetScheduled",
    "domain": "access-control",
    "operationId": "founderSunsetScheduledEventQuery",
    "httpMethod": "POST",
    "path": "/v1/access-control/events/founder-sunset-scheduled/query",
    "notes": "AccessControlFacet.FounderSunsetScheduled",
    "eventName": "FounderSunsetScheduled",
    "signature": "FounderSunsetScheduled(uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "executeAt",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "rawOnly",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "AccessControlFacet.GovernanceParticipantRoleGranted",
    "facetName": "AccessControlFacet",
    "wrapperKey": "GovernanceParticipantRoleGranted",
    "domain": "access-control",
    "operationId": "governanceParticipantRoleGrantedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/access-control/events/governance-participant-role-granted/query",
    "notes": "AccessControlFacet.GovernanceParticipantRoleGranted",
    "eventName": "GovernanceParticipantRoleGranted",
    "signature": "GovernanceParticipantRoleGranted(address,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "rawOnly",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "AccessControlFacet.MarketplacePurchaserRoleGranted",
    "facetName": "AccessControlFacet",
    "wrapperKey": "MarketplacePurchaserRoleGranted",
    "domain": "access-control",
    "operationId": "marketplacePurchaserRoleGrantedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/access-control/events/marketplace-purchaser-role-granted/query",
    "notes": "AccessControlFacet.MarketplacePurchaserRoleGranted",
    "eventName": "MarketplacePurchaserRoleGranted",
    "signature": "MarketplacePurchaserRoleGranted(address,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "rawOnly",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "AccessControlFacet.MarketplaceSellerRoleGranted",
    "facetName": "AccessControlFacet",
    "wrapperKey": "MarketplaceSellerRoleGranted",
    "domain": "access-control",
    "operationId": "marketplaceSellerRoleGrantedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/access-control/events/marketplace-seller-role-granted/query",
    "notes": "AccessControlFacet.MarketplaceSellerRoleGranted",
    "eventName": "MarketplaceSellerRoleGranted",
    "signature": "MarketplaceSellerRoleGranted(address,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "rawOnly",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "AccessControlFacet.ParticipantRoleRevoked",
    "facetName": "AccessControlFacet",
    "wrapperKey": "ParticipantRoleRevoked",
    "domain": "access-control",
    "operationId": "participantRoleRevokedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/access-control/events/participant-role-revoked/query",
    "notes": "AccessControlFacet.ParticipantRoleRevoked",
    "eventName": "ParticipantRoleRevoked",
    "signature": "ParticipantRoleRevoked(bytes32,address,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "rawOnly",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "AccessControlFacet.ResearchParticipantRoleGranted",
    "facetName": "AccessControlFacet",
    "wrapperKey": "ResearchParticipantRoleGranted",
    "domain": "access-control",
    "operationId": "researchParticipantRoleGrantedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/access-control/events/research-participant-role-granted/query",
    "notes": "AccessControlFacet.ResearchParticipantRoleGranted",
    "eventName": "ResearchParticipantRoleGranted",
    "signature": "ResearchParticipantRoleGranted(address,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "rawOnly",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "AccessControlFacet.RoleAdminChanged",
    "facetName": "AccessControlFacet",
    "wrapperKey": "RoleAdminChanged",
    "domain": "access-control",
    "operationId": "roleAdminChangedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/access-control/events/role-admin-changed/query",
    "notes": "AccessControlFacet.RoleAdminChanged",
    "eventName": "RoleAdminChanged",
    "signature": "RoleAdminChanged(bytes32,bytes32,bytes32)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "previousAdminRole",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "newAdminRole",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      }
    ],
    "projection": {
      "domain": "rawOnly",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "AccessControlFacet.RoleConfigUpdated",
    "facetName": "AccessControlFacet",
    "wrapperKey": "RoleConfigUpdated",
    "domain": "access-control",
    "operationId": "roleConfigUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/access-control/events/role-config-updated/query",
    "notes": "AccessControlFacet.RoleConfigUpdated",
    "eventName": "RoleConfigUpdated",
    "signature": "RoleConfigUpdated(bytes32,address,tuple)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "updatedBy",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "config",
        "type": "tuple",
        "indexed": false,
        "internalType": "struct IAccessControl.RoleConfig",
        "components": [
          {
            "name": "memberLimit",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "validityPeriod",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "minMemberLimit",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "quorumBps",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "absoluteMinQuorum",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "adminRole",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "restricted",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "revocable",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "requiresApproval",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "recoveryActive",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      }
    ],
    "projection": {
      "domain": "rawOnly",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "AccessControlFacet.RoleGranted",
    "facetName": "AccessControlFacet",
    "wrapperKey": "RoleGranted",
    "domain": "access-control",
    "operationId": "roleGrantedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/access-control/events/role-granted/query",
    "notes": "AccessControlFacet.RoleGranted",
    "eventName": "RoleGranted",
    "signature": "RoleGranted(bytes32,address,address,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "sender",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "expiryTime",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "rawOnly",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "AccessControlFacet.RoleRenounced",
    "facetName": "AccessControlFacet",
    "wrapperKey": "RoleRenounced",
    "domain": "access-control",
    "operationId": "roleRenouncedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/access-control/events/role-renounced/query",
    "notes": "AccessControlFacet.RoleRenounced",
    "eventName": "RoleRenounced",
    "signature": "RoleRenounced(bytes32,address,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "rawOnly",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "AccessControlFacet.RoleRevoked",
    "facetName": "AccessControlFacet",
    "wrapperKey": "RoleRevoked",
    "domain": "access-control",
    "operationId": "roleRevokedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/access-control/events/role-revoked/query",
    "notes": "AccessControlFacet.RoleRevoked",
    "eventName": "RoleRevoked",
    "signature": "RoleRevoked(bytes32,address,address,string)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "sender",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "reason",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      }
    ],
    "projection": {
      "domain": "rawOnly",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "AccessControlFacet.SecurityAction",
    "facetName": "AccessControlFacet",
    "wrapperKey": "SecurityAction",
    "domain": "access-control",
    "operationId": "securityActionEventQuery",
    "httpMethod": "POST",
    "path": "/v1/access-control/events/security-action/query",
    "notes": "AccessControlFacet.SecurityAction",
    "eventName": "SecurityAction",
    "signature": "SecurityAction(bytes32,address,uint8,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "actionId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "actor",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "actionType",
        "type": "uint8",
        "indexed": true,
        "internalType": "enum IAccessControl.ActionType"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "rawOnly",
      "projectionMode": "rawOnly",
      "targets": []
    }
  }
] as HttpEventDefinition[];
