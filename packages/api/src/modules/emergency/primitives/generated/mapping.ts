import type { HttpEventDefinition, HttpMethodDefinition } from "../../../../shared/route-types.js";

export const emergencyMethodDefinitions: HttpMethodDefinition[] = [
  {
    "key": "EmergencyFacet.approveRecovery",
    "facetName": "EmergencyFacet",
    "wrapperKey": "approveRecovery",
    "domain": "emergency",
    "resource": "emergency",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/emergency/admin/approve-recovery",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "incidentId",
          "source": "body",
          "field": "incidentId"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "approveRecovery",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "EmergencyFacet.approveRecovery",
    "methodName": "approveRecovery",
    "signature": "approveRecovery(uint256)",
    "category": "write",
    "mutability": "nonpayable",
    "liveRequired": true,
    "cacheClass": "none",
    "cacheTtlSeconds": null,
    "executionSources": [
      "live"
    ],
    "gaslessModes": [],
    "inputs": [
      {
        "name": "incidentId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "EmergencyFacet.completeRecovery",
    "facetName": "EmergencyFacet",
    "wrapperKey": "completeRecovery",
    "domain": "emergency",
    "resource": "emergency",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/emergency/admin/complete-recovery",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "incidentId",
          "source": "body",
          "field": "incidentId"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "completeRecovery",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "EmergencyFacet.completeRecovery",
    "methodName": "completeRecovery",
    "signature": "completeRecovery(uint256)",
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
        "name": "incidentId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "EmergencyFacet.emergencyResume",
    "facetName": "EmergencyFacet",
    "wrapperKey": "emergencyResume",
    "domain": "emergency",
    "resource": "emergency",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/emergency/admin/emergency-resume",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "emergencyResume",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "EmergencyFacet.emergencyResume",
    "methodName": "emergencyResume",
    "signature": "emergencyResume()",
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
    "key": "EmergencyFacet.emergencyStop",
    "facetName": "EmergencyFacet",
    "wrapperKey": "emergencyStop",
    "domain": "emergency",
    "resource": "emergency",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/emergency/admin/emergency-stop",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "emergencyStop",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "EmergencyFacet.emergencyStop",
    "methodName": "emergencyStop",
    "signature": "emergencyStop()",
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
    "key": "EmergencyFacet.executeRecoveryAction",
    "facetName": "EmergencyFacet",
    "wrapperKey": "executeRecoveryAction",
    "domain": "emergency",
    "resource": "emergency",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/emergency/admin/execute-recovery-action",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "action",
          "source": "body",
          "field": "action"
        },
        {
          "name": "stepIndex",
          "source": "body",
          "field": "stepIndex"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "executeRecoveryAction",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "EmergencyFacet.executeRecoveryAction",
    "methodName": "executeRecoveryAction",
    "signature": "executeRecoveryAction(bytes,uint256)",
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
        "name": "action",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "stepIndex",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes",
        "internalType": "bytes"
      }
    ]
  },
  {
    "key": "EmergencyFacet.executeRecoveryStep",
    "facetName": "EmergencyFacet",
    "wrapperKey": "executeRecoveryStep",
    "domain": "emergency",
    "resource": "emergency",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/emergency/admin/execute-recovery-step",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "incidentId",
          "source": "body",
          "field": "incidentId"
        },
        {
          "name": "stepIndex",
          "source": "body",
          "field": "stepIndex"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "executeRecoveryStep",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "EmergencyFacet.executeRecoveryStep",
    "methodName": "executeRecoveryStep",
    "signature": "executeRecoveryStep(uint256,uint256)",
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
        "name": "incidentId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "stepIndex",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "EmergencyFacet.executeResponse",
    "facetName": "EmergencyFacet",
    "wrapperKey": "executeResponse",
    "domain": "emergency",
    "resource": "emergency",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/emergency/admin/execute-response",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "incidentId",
          "source": "body",
          "field": "incidentId"
        },
        {
          "name": "actions",
          "source": "body",
          "field": "actions"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "executeResponse",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "EmergencyFacet.executeResponse",
    "methodName": "executeResponse",
    "signature": "executeResponse(uint256,uint8[])",
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
        "name": "incidentId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "actions",
        "type": "uint8[]",
        "internalType": "enum IEmergency.ResponseAction[]"
      }
    ],
    "outputs": []
  },
  {
    "key": "EmergencyFacet.executeScheduledResume",
    "facetName": "EmergencyFacet",
    "wrapperKey": "executeScheduledResume",
    "domain": "emergency",
    "resource": "emergency",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/emergency/admin/execute-scheduled-resume",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "executeScheduledResume",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "EmergencyFacet.executeScheduledResume",
    "methodName": "executeScheduledResume",
    "signature": "executeScheduledResume()",
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
    "key": "EmergencyFacet.extendPausedUntil",
    "facetName": "EmergencyFacet",
    "wrapperKey": "extendPausedUntil",
    "domain": "emergency",
    "resource": "emergency",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/emergency/admin/extend-paused-until",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "newPausedUntil",
          "source": "body",
          "field": "newPausedUntil"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "extendPausedUntil",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "EmergencyFacet.extendPausedUntil",
    "methodName": "extendPausedUntil",
    "signature": "extendPausedUntil(uint256)",
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
        "name": "newPausedUntil",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "EmergencyFacet.freezeAssets",
    "facetName": "EmergencyFacet",
    "wrapperKey": "freezeAssets",
    "domain": "emergency",
    "resource": "emergency",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/emergency/admin/freeze-assets",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "assetIds",
          "source": "body",
          "field": "assetIds"
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
    "operationId": "freezeAssets",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "EmergencyFacet.freezeAssets",
    "methodName": "freezeAssets",
    "signature": "freezeAssets(uint256[],string)",
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
        "name": "assetIds",
        "type": "uint256[]",
        "internalType": "uint256[]"
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
    "key": "EmergencyFacet.getEmergencyState",
    "facetName": "EmergencyFacet",
    "wrapperKey": "getEmergencyState",
    "domain": "emergency",
    "resource": "emergency",
    "classification": "read",
    "httpMethod": "POST",
    "path": "/v1/emergency/queries/get-emergency-state",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "getEmergencyState",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "EmergencyFacet.getEmergencyState",
    "methodName": "getEmergencyState",
    "signature": "getEmergencyState()",
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
        "type": "uint8",
        "internalType": "enum IEmergency.EmergencyState"
      }
    ]
  },
  {
    "key": "EmergencyFacet.getEmergencyTimeout",
    "facetName": "EmergencyFacet",
    "wrapperKey": "getEmergencyTimeout",
    "domain": "emergency",
    "resource": "emergency",
    "classification": "read",
    "httpMethod": "POST",
    "path": "/v1/emergency/queries/get-emergency-timeout",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "getEmergencyTimeout",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "EmergencyFacet.getEmergencyTimeout",
    "methodName": "getEmergencyTimeout",
    "signature": "getEmergencyTimeout()",
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
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "key": "EmergencyFacet.getIncident",
    "facetName": "EmergencyFacet",
    "wrapperKey": "getIncident",
    "domain": "emergency",
    "resource": "emergency",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/emergency/queries/get-incident",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "incidentId",
          "source": "query",
          "field": "incidentId"
        }
      ]
    },
    "outputShape": {
      "kind": "object"
    },
    "operationId": "getIncident",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "EmergencyFacet.getIncident",
    "methodName": "getIncident",
    "signature": "getIncident(uint256)",
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
        "name": "incidentId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct IEmergency.Incident",
        "components": [
          {
            "name": "id",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "incidentType",
            "type": "uint8",
            "internalType": "enum IEmergency.IncidentType"
          },
          {
            "name": "description",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "reporter",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "timestamp",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "resolved",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "actions",
            "type": "uint8[]",
            "internalType": "enum IEmergency.ResponseAction[]"
          },
          {
            "name": "approvers",
            "type": "address[]",
            "internalType": "address[]"
          },
          {
            "name": "resolutionTime",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ]
  },
  {
    "key": "EmergencyFacet.getRecoveryPlan",
    "facetName": "EmergencyFacet",
    "wrapperKey": "getRecoveryPlan",
    "domain": "emergency",
    "resource": "emergency",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/emergency/queries/get-recovery-plan",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "incidentId",
          "source": "query",
          "field": "incidentId"
        }
      ]
    },
    "outputShape": {
      "kind": "tuple"
    },
    "operationId": "getRecoveryPlan",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "EmergencyFacet.getRecoveryPlan",
    "methodName": "getRecoveryPlan",
    "signature": "getRecoveryPlan(uint256)",
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
        "name": "incidentId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "steps",
        "type": "bytes[]",
        "internalType": "bytes[]"
      },
      {
        "name": "approvedByGovernance",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "startTime",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "completionTime",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "approvalCount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "results",
        "type": "bytes[]",
        "internalType": "bytes[]"
      }
    ]
  },
  {
    "key": "EmergencyFacet.isAssetFrozen",
    "facetName": "EmergencyFacet",
    "wrapperKey": "isAssetFrozen",
    "domain": "emergency",
    "resource": "emergency",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/emergency/queries/is-asset-frozen",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "assetId",
          "source": "query",
          "field": "assetId"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "isAssetFrozen",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "EmergencyFacet.isAssetFrozen",
    "methodName": "isAssetFrozen",
    "signature": "isAssetFrozen(uint256)",
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
        "name": "assetId",
        "type": "uint256",
        "internalType": "uint256"
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
    "key": "EmergencyFacet.isEmergencyStopped",
    "facetName": "EmergencyFacet",
    "wrapperKey": "isEmergencyStopped",
    "domain": "emergency",
    "resource": "emergency",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/emergency/queries/is-emergency-stopped",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "isEmergencyStopped",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "EmergencyFacet.isEmergencyStopped",
    "methodName": "isEmergencyStopped",
    "signature": "isEmergencyStopped()",
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
    "key": "EmergencyFacet.reportIncident",
    "facetName": "EmergencyFacet",
    "wrapperKey": "reportIncident",
    "domain": "emergency",
    "resource": "emergency",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/emergency/admin/report-incident",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "incidentType",
          "source": "body",
          "field": "incidentType"
        },
        {
          "name": "description",
          "source": "body",
          "field": "description"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "reportIncident",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "EmergencyFacet.reportIncident",
    "methodName": "reportIncident",
    "signature": "reportIncident(uint8,string)",
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
        "name": "incidentType",
        "type": "uint8",
        "internalType": "enum IEmergency.IncidentType"
      },
      {
        "name": "description",
        "type": "string",
        "internalType": "string"
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
    "key": "EmergencyFacet.scheduleEmergencyResume",
    "facetName": "EmergencyFacet",
    "wrapperKey": "scheduleEmergencyResume",
    "domain": "emergency",
    "resource": "emergency",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/emergency/admin/schedule-emergency-resume",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "executeAfter",
          "source": "body",
          "field": "executeAfter"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "scheduleEmergencyResume",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "EmergencyFacet.scheduleEmergencyResume",
    "methodName": "scheduleEmergencyResume",
    "signature": "scheduleEmergencyResume(uint256)",
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
        "name": "executeAfter",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "EmergencyFacet.setEmergencyTimeout",
    "facetName": "EmergencyFacet",
    "wrapperKey": "setEmergencyTimeout",
    "domain": "emergency",
    "resource": "emergency",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/emergency/admin/set-emergency-timeout",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "newTimeout",
          "source": "body",
          "field": "newTimeout"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setEmergencyTimeout",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "EmergencyFacet.setEmergencyTimeout",
    "methodName": "setEmergencyTimeout",
    "signature": "setEmergencyTimeout(uint256)",
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
        "name": "newTimeout",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "EmergencyFacet.setResumeDelay",
    "facetName": "EmergencyFacet",
    "wrapperKey": "setResumeDelay",
    "domain": "emergency",
    "resource": "emergency",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/emergency/admin/set-resume-delay",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "newDelay",
          "source": "body",
          "field": "newDelay"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setResumeDelay",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "EmergencyFacet.setResumeDelay",
    "methodName": "setResumeDelay",
    "signature": "setResumeDelay(uint256)",
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
        "name": "newDelay",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "EmergencyFacet.startRecovery",
    "facetName": "EmergencyFacet",
    "wrapperKey": "startRecovery",
    "domain": "emergency",
    "resource": "emergency",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/emergency/admin/start-recovery",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "incidentId",
          "source": "body",
          "field": "incidentId"
        },
        {
          "name": "steps",
          "source": "body",
          "field": "steps"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "startRecovery",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "EmergencyFacet.startRecovery",
    "methodName": "startRecovery",
    "signature": "startRecovery(uint256,bytes[])",
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
        "name": "incidentId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "steps",
        "type": "bytes[]",
        "internalType": "bytes[]"
      }
    ],
    "outputs": []
  },
  {
    "key": "EmergencyFacet.triggerEmergency",
    "facetName": "EmergencyFacet",
    "wrapperKey": "triggerEmergency",
    "domain": "emergency",
    "resource": "emergency",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/emergency/admin/trigger-emergency",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "state",
          "source": "body",
          "field": "state"
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
    "operationId": "triggerEmergency",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "EmergencyFacet.triggerEmergency",
    "methodName": "triggerEmergency",
    "signature": "triggerEmergency(uint8,string)",
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
        "name": "state",
        "type": "uint8",
        "internalType": "enum IEmergency.EmergencyState"
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
    "key": "EmergencyFacet.unfreezeAssets",
    "facetName": "EmergencyFacet",
    "wrapperKey": "unfreezeAssets",
    "domain": "emergency",
    "resource": "emergency",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/emergency/admin/unfreeze-assets",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "assetIds",
          "source": "body",
          "field": "assetIds"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "unfreezeAssets",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "EmergencyFacet.unfreezeAssets",
    "methodName": "unfreezeAssets",
    "signature": "unfreezeAssets(uint256[])",
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
        "name": "assetIds",
        "type": "uint256[]",
        "internalType": "uint256[]"
      }
    ],
    "outputs": []
  },
  {
    "key": "EmergencyWithdrawalFacet.approveEmergencyWithdrawal",
    "facetName": "EmergencyWithdrawalFacet",
    "wrapperKey": "approveEmergencyWithdrawal",
    "domain": "emergency",
    "resource": "emergency",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/emergency/admin/approve-emergency-withdrawal",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "requestId",
          "source": "body",
          "field": "requestId"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "approveEmergencyWithdrawal",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "EmergencyWithdrawalFacet.approveEmergencyWithdrawal",
    "methodName": "approveEmergencyWithdrawal",
    "signature": "approveEmergencyWithdrawal(bytes32)",
    "category": "write",
    "mutability": "nonpayable",
    "liveRequired": true,
    "cacheClass": "none",
    "cacheTtlSeconds": null,
    "executionSources": [
      "live"
    ],
    "gaslessModes": [],
    "inputs": [
      {
        "name": "requestId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": []
  },
  {
    "key": "EmergencyWithdrawalFacet.executeWithdrawal",
    "facetName": "EmergencyWithdrawalFacet",
    "wrapperKey": "executeWithdrawal",
    "domain": "emergency",
    "resource": "emergency",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/emergency/admin/execute-withdrawal",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "requestId",
          "source": "body",
          "field": "requestId"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "executeWithdrawal",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "EmergencyWithdrawalFacet.executeWithdrawal",
    "methodName": "executeWithdrawal",
    "signature": "executeWithdrawal(bytes32)",
    "category": "write",
    "mutability": "nonpayable",
    "liveRequired": true,
    "cacheClass": "none",
    "cacheTtlSeconds": null,
    "executionSources": [
      "live"
    ],
    "gaslessModes": [],
    "inputs": [
      {
        "name": "requestId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": []
  },
  {
    "key": "EmergencyWithdrawalFacet.getApprovalCount",
    "facetName": "EmergencyWithdrawalFacet",
    "wrapperKey": "getApprovalCount",
    "domain": "emergency",
    "resource": "emergency",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/emergency/queries/get-approval-count",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "requestId",
          "source": "query",
          "field": "requestId"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "getApprovalCount",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "EmergencyWithdrawalFacet.getApprovalCount",
    "methodName": "getApprovalCount",
    "signature": "getApprovalCount(bytes32)",
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
        "name": "requestId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "count",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "key": "EmergencyWithdrawalFacet.isRecipientWhitelisted",
    "facetName": "EmergencyWithdrawalFacet",
    "wrapperKey": "isRecipientWhitelisted",
    "domain": "emergency",
    "resource": "emergency",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/emergency/queries/is-recipient-whitelisted",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "recipient",
          "source": "query",
          "field": "recipient"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "isRecipientWhitelisted",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "EmergencyWithdrawalFacet.isRecipientWhitelisted",
    "methodName": "isRecipientWhitelisted",
    "signature": "isRecipientWhitelisted(address)",
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
        "name": "recipient",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "whitelisted",
        "type": "bool",
        "internalType": "bool"
      }
    ]
  },
  {
    "key": "EmergencyWithdrawalFacet.requestEmergencyWithdrawal",
    "facetName": "EmergencyWithdrawalFacet",
    "wrapperKey": "requestEmergencyWithdrawal",
    "domain": "emergency",
    "resource": "emergency",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/emergency/admin/request-emergency-withdrawal",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "token",
          "source": "body",
          "field": "token"
        },
        {
          "name": "amount",
          "source": "body",
          "field": "amount"
        },
        {
          "name": "recipient",
          "source": "body",
          "field": "recipient"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "requestEmergencyWithdrawal",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "EmergencyWithdrawalFacet.requestEmergencyWithdrawal",
    "methodName": "requestEmergencyWithdrawal",
    "signature": "requestEmergencyWithdrawal(address,uint256,address)",
    "category": "write",
    "mutability": "nonpayable",
    "liveRequired": true,
    "cacheClass": "none",
    "cacheTtlSeconds": null,
    "executionSources": [
      "live"
    ],
    "gaslessModes": [],
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "recipient",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "requestId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "key": "EmergencyWithdrawalFacet.setRecipientWhitelist",
    "facetName": "EmergencyWithdrawalFacet",
    "wrapperKey": "setRecipientWhitelist",
    "domain": "emergency",
    "resource": "emergency",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/emergency/admin/set-recipient-whitelist",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "recipient",
          "source": "body",
          "field": "recipient"
        },
        {
          "name": "whitelisted",
          "source": "body",
          "field": "whitelisted"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setRecipientWhitelist",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "EmergencyWithdrawalFacet.setRecipientWhitelist",
    "methodName": "setRecipientWhitelist",
    "signature": "setRecipientWhitelist(address,bool)",
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
        "name": "recipient",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "whitelisted",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": []
  },
  {
    "key": "EmergencyWithdrawalFacet.updateWithdrawalConfig",
    "facetName": "EmergencyWithdrawalFacet",
    "wrapperKey": "updateWithdrawalConfig",
    "domain": "emergency",
    "resource": "emergency",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/emergency/admin/update-withdrawal-config",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "delay",
          "source": "body",
          "field": "delay"
        },
        {
          "name": "maxInstant",
          "source": "body",
          "field": "maxInstant"
        },
        {
          "name": "requiredApprovals",
          "source": "body",
          "field": "requiredApprovals"
        },
        {
          "name": "requiresEmergencyAdmin",
          "source": "body",
          "field": "requiresEmergencyAdmin"
        },
        {
          "name": "daily24hLimit",
          "source": "body",
          "field": "daily24hLimit"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "updateWithdrawalConfig",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "EmergencyWithdrawalFacet.updateWithdrawalConfig",
    "methodName": "updateWithdrawalConfig",
    "signature": "updateWithdrawalConfig(uint256,uint256,uint256,bool,uint256)",
    "category": "write",
    "mutability": "nonpayable",
    "liveRequired": true,
    "cacheClass": "none",
    "cacheTtlSeconds": null,
    "executionSources": [
      "live"
    ],
    "gaslessModes": [],
    "inputs": [
      {
        "name": "delay",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "maxInstant",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "requiredApprovals",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "requiresEmergencyAdmin",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "daily24hLimit",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  }
] as HttpMethodDefinition[];
export const emergencyEventDefinitions: HttpEventDefinition[] = [
  {
    "key": "EmergencyFacet.AssetsFrozen",
    "facetName": "EmergencyFacet",
    "wrapperKey": "AssetsFrozen",
    "domain": "emergency",
    "operationId": "assetsFrozenEventQuery",
    "httpMethod": "POST",
    "path": "/v1/emergency/events/assets-frozen/query",
    "notes": "EmergencyFacet.AssetsFrozen",
    "eventName": "AssetsFrozen",
    "signature": "AssetsFrozen(uint256[],address,string)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "assetIds",
        "type": "uint256[]",
        "indexed": false,
        "internalType": "uint256[]"
      },
      {
        "name": "frozenBy",
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
      "domain": "emergency",
      "projectionMode": "ledger",
      "targets": [
        {
          "table": "emergency_incidents",
          "mode": "ledger"
        }
      ]
    }
  },
  {
    "key": "EmergencyFacet.EmergencyResumeExecuted",
    "facetName": "EmergencyFacet",
    "wrapperKey": "EmergencyResumeExecuted",
    "domain": "emergency",
    "operationId": "emergencyResumeExecutedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/emergency/events/emergency-resume-executed/query",
    "notes": "EmergencyFacet.EmergencyResumeExecuted",
    "eventName": "EmergencyResumeExecuted",
    "signature": "EmergencyResumeExecuted(address)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "executor",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "projection": {
      "domain": "emergency",
      "projectionMode": "ledger",
      "targets": [
        {
          "table": "emergency_incidents",
          "mode": "ledger"
        }
      ]
    }
  },
  {
    "key": "EmergencyFacet.EmergencyResumeScheduled",
    "facetName": "EmergencyFacet",
    "wrapperKey": "EmergencyResumeScheduled",
    "domain": "emergency",
    "operationId": "emergencyResumeScheduledEventQuery",
    "httpMethod": "POST",
    "path": "/v1/emergency/events/emergency-resume-scheduled/query",
    "notes": "EmergencyFacet.EmergencyResumeScheduled",
    "eventName": "EmergencyResumeScheduled",
    "signature": "EmergencyResumeScheduled(uint256,address)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "executeAfter",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "scheduler",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "projection": {
      "domain": "emergency",
      "projectionMode": "ledger",
      "targets": [
        {
          "table": "emergency_incidents",
          "mode": "ledger"
        }
      ]
    }
  },
  {
    "key": "EmergencyFacet.EmergencyStateChanged",
    "facetName": "EmergencyFacet",
    "wrapperKey": "EmergencyStateChanged",
    "domain": "emergency",
    "operationId": "emergencyStateChangedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/emergency/events/emergency-state-changed/query",
    "notes": "EmergencyFacet.EmergencyStateChanged",
    "eventName": "EmergencyStateChanged",
    "signature": "EmergencyStateChanged(uint8,uint8,address,string)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "previousState",
        "type": "uint8",
        "indexed": true,
        "internalType": "enum IEmergency.EmergencyState"
      },
      {
        "name": "newState",
        "type": "uint8",
        "indexed": true,
        "internalType": "enum IEmergency.EmergencyState"
      },
      {
        "name": "triggeredBy",
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
      "domain": "emergency",
      "projectionMode": "ledger",
      "targets": [
        {
          "table": "emergency_incidents",
          "mode": "ledger"
        }
      ]
    }
  },
  {
    "key": "EmergencyFacet.IncidentReported",
    "facetName": "EmergencyFacet",
    "wrapperKey": "IncidentReported",
    "domain": "emergency",
    "operationId": "incidentReportedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/emergency/events/incident-reported/query",
    "notes": "EmergencyFacet.IncidentReported",
    "eventName": "IncidentReported",
    "signature": "IncidentReported(uint256,uint8,address,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "incidentId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "incidentType",
        "type": "uint8",
        "indexed": true,
        "internalType": "enum IEmergency.IncidentType"
      },
      {
        "name": "reporter",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "emergency",
      "projectionMode": "ledger",
      "targets": [
        {
          "table": "emergency_incidents",
          "mode": "ledger"
        }
      ]
    }
  },
  {
    "key": "EmergencyFacet.PauseExtended",
    "facetName": "EmergencyFacet",
    "wrapperKey": "PauseExtended",
    "domain": "emergency",
    "operationId": "pauseExtendedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/emergency/events/pause-extended/query",
    "notes": "EmergencyFacet.PauseExtended",
    "eventName": "PauseExtended",
    "signature": "PauseExtended(uint256,uint256,address)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "oldUntil",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "newUntil",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "extender",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "projection": {
      "domain": "emergency",
      "projectionMode": "ledger",
      "targets": [
        {
          "table": "emergency_incidents",
          "mode": "ledger"
        }
      ]
    }
  },
  {
    "key": "EmergencyFacet.RecoveryCompleted",
    "facetName": "EmergencyFacet",
    "wrapperKey": "RecoveryCompleted",
    "domain": "emergency",
    "operationId": "recoveryCompletedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/emergency/events/recovery-completed/query",
    "notes": "EmergencyFacet.RecoveryCompleted",
    "eventName": "RecoveryCompleted",
    "signature": "RecoveryCompleted(uint256,uint256,bool)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "incidentId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "success",
        "type": "bool",
        "indexed": true,
        "internalType": "bool"
      }
    ],
    "projection": {
      "domain": "emergency",
      "projectionMode": "ledger",
      "targets": [
        {
          "table": "emergency_incidents",
          "mode": "ledger"
        }
      ]
    }
  },
  {
    "key": "EmergencyFacet.RecoveryStarted",
    "facetName": "EmergencyFacet",
    "wrapperKey": "RecoveryStarted",
    "domain": "emergency",
    "operationId": "recoveryStartedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/emergency/events/recovery-started/query",
    "notes": "EmergencyFacet.RecoveryStarted",
    "eventName": "RecoveryStarted",
    "signature": "RecoveryStarted(uint256,uint256,bytes[])",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "incidentId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "steps",
        "type": "bytes[]",
        "indexed": false,
        "internalType": "bytes[]"
      }
    ],
    "projection": {
      "domain": "emergency",
      "projectionMode": "ledger",
      "targets": [
        {
          "table": "emergency_incidents",
          "mode": "ledger"
        }
      ]
    }
  },
  {
    "key": "EmergencyFacet.RecoveryStepExecuted",
    "facetName": "EmergencyFacet",
    "wrapperKey": "RecoveryStepExecuted",
    "domain": "emergency",
    "operationId": "recoveryStepExecutedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/emergency/events/recovery-step-executed/query",
    "notes": "EmergencyFacet.RecoveryStepExecuted",
    "eventName": "RecoveryStepExecuted",
    "signature": "RecoveryStepExecuted(uint256,uint256,bool)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "incidentId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "stepIndex",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "success",
        "type": "bool",
        "indexed": true,
        "internalType": "bool"
      }
    ],
    "projection": {
      "domain": "emergency",
      "projectionMode": "ledger",
      "targets": [
        {
          "table": "emergency_incidents",
          "mode": "ledger"
        }
      ]
    }
  },
  {
    "key": "EmergencyFacet.ResponseExecuted",
    "facetName": "EmergencyFacet",
    "wrapperKey": "ResponseExecuted",
    "domain": "emergency",
    "operationId": "responseExecutedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/emergency/events/response-executed/query",
    "notes": "EmergencyFacet.ResponseExecuted",
    "eventName": "ResponseExecuted",
    "signature": "ResponseExecuted(uint256,uint8[],address,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "incidentId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "actions",
        "type": "uint8[]",
        "indexed": false,
        "internalType": "enum IEmergency.ResponseAction[]"
      },
      {
        "name": "executor",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "emergency",
      "projectionMode": "ledger",
      "targets": [
        {
          "table": "emergency_incidents",
          "mode": "ledger"
        }
      ]
    }
  },
  {
    "key": "EmergencyWithdrawalFacet.EmergencyEthWithdrawalApproved",
    "facetName": "EmergencyWithdrawalFacet",
    "wrapperKey": "EmergencyEthWithdrawalApproved",
    "domain": "emergency",
    "operationId": "emergencyEthWithdrawalApprovedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/emergency/events/emergency-eth-withdrawal-approved/query",
    "notes": "EmergencyWithdrawalFacet.EmergencyEthWithdrawalApproved",
    "eventName": "EmergencyEthWithdrawalApproved",
    "signature": "EmergencyEthWithdrawalApproved(bytes32,address)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "requestId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "approver",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "projection": {
      "domain": "emergency",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "emergency_withdrawals",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "EmergencyWithdrawalFacet.EmergencyEthWithdrawalExecuted",
    "facetName": "EmergencyWithdrawalFacet",
    "wrapperKey": "EmergencyEthWithdrawalExecuted",
    "domain": "emergency",
    "operationId": "emergencyEthWithdrawalExecutedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/emergency/events/emergency-eth-withdrawal-executed/query",
    "notes": "EmergencyWithdrawalFacet.EmergencyEthWithdrawalExecuted",
    "eventName": "EmergencyEthWithdrawalExecuted",
    "signature": "EmergencyEthWithdrawalExecuted(bytes32,uint256,address)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "requestId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "recipient",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "projection": {
      "domain": "emergency",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "emergency_withdrawals",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "EmergencyWithdrawalFacet.EmergencyEthWithdrawalRequested",
    "facetName": "EmergencyWithdrawalFacet",
    "wrapperKey": "EmergencyEthWithdrawalRequested",
    "domain": "emergency",
    "operationId": "emergencyEthWithdrawalRequestedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/emergency/events/emergency-eth-withdrawal-requested/query",
    "notes": "EmergencyWithdrawalFacet.EmergencyEthWithdrawalRequested",
    "eventName": "EmergencyEthWithdrawalRequested",
    "signature": "EmergencyEthWithdrawalRequested(bytes32,uint256,address)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "requestId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "recipient",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "projection": {
      "domain": "emergency",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "emergency_withdrawals",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "EmergencyWithdrawalFacet.EmergencyWithdrawal",
    "facetName": "EmergencyWithdrawalFacet",
    "wrapperKey": "EmergencyWithdrawal",
    "domain": "emergency",
    "operationId": "emergencyWithdrawalEventQuery",
    "httpMethod": "POST",
    "path": "/v1/emergency/events/emergency-withdrawal/query",
    "notes": "EmergencyWithdrawalFacet.EmergencyWithdrawal",
    "eventName": "EmergencyWithdrawal",
    "signature": "EmergencyWithdrawal(address,address,uint256,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "recipient",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "emergency",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "emergency_withdrawals",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "EmergencyWithdrawalFacet.EmergencyWithdrawalApproved",
    "facetName": "EmergencyWithdrawalFacet",
    "wrapperKey": "EmergencyWithdrawalApproved",
    "domain": "emergency",
    "operationId": "emergencyWithdrawalApprovedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/emergency/events/emergency-withdrawal-approved/query",
    "notes": "EmergencyWithdrawalFacet.EmergencyWithdrawalApproved",
    "eventName": "EmergencyWithdrawalApproved",
    "signature": "EmergencyWithdrawalApproved(bytes32,address)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "requestId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "approver",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "projection": {
      "domain": "emergency",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "emergency_withdrawals",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "EmergencyWithdrawalFacet.EmergencyWithdrawalExecuted",
    "facetName": "EmergencyWithdrawalFacet",
    "wrapperKey": "EmergencyWithdrawalExecuted",
    "domain": "emergency",
    "operationId": "emergencyWithdrawalExecutedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/emergency/events/emergency-withdrawal-executed/query",
    "notes": "EmergencyWithdrawalFacet.EmergencyWithdrawalExecuted",
    "eventName": "EmergencyWithdrawalExecuted",
    "signature": "EmergencyWithdrawalExecuted(bytes32)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "requestId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      }
    ],
    "projection": {
      "domain": "emergency",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "emergency_withdrawals",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "EmergencyWithdrawalFacet.EmergencyWithdrawalRequested",
    "facetName": "EmergencyWithdrawalFacet",
    "wrapperKey": "EmergencyWithdrawalRequested",
    "domain": "emergency",
    "operationId": "emergencyWithdrawalRequestedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/emergency/events/emergency-withdrawal-requested/query",
    "notes": "EmergencyWithdrawalFacet.EmergencyWithdrawalRequested",
    "eventName": "EmergencyWithdrawalRequested",
    "signature": "EmergencyWithdrawalRequested(bytes32,address,uint256,address,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "requestId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "token",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "recipient",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "requestTime",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "emergency",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "emergency_withdrawals",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "EmergencyWithdrawalFacet.RecipientWhitelisted",
    "facetName": "EmergencyWithdrawalFacet",
    "wrapperKey": "RecipientWhitelisted",
    "domain": "emergency",
    "operationId": "recipientWhitelistedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/emergency/events/recipient-whitelisted/query",
    "notes": "EmergencyWithdrawalFacet.RecipientWhitelisted",
    "eventName": "RecipientWhitelisted",
    "signature": "RecipientWhitelisted(address,bool)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "recipient",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "whitelisted",
        "type": "bool",
        "indexed": true,
        "internalType": "bool"
      }
    ],
    "projection": {
      "domain": "emergency",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "emergency_withdrawals",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "EmergencyWithdrawalFacet.WithdrawalConfigUpdated",
    "facetName": "EmergencyWithdrawalFacet",
    "wrapperKey": "WithdrawalConfigUpdated",
    "domain": "emergency",
    "operationId": "withdrawalConfigUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/emergency/events/withdrawal-config-updated/query",
    "notes": "EmergencyWithdrawalFacet.WithdrawalConfigUpdated",
    "eventName": "WithdrawalConfigUpdated",
    "signature": "WithdrawalConfigUpdated(uint256,uint256,uint256,bool,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "delay",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "maxInstant",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "requiredApprovals",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "requiresEmergencyAdmin",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      },
      {
        "name": "daily24hLimit",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "emergency",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "emergency_withdrawals",
          "mode": "current"
        }
      ]
    }
  }
] as HttpEventDefinition[];
