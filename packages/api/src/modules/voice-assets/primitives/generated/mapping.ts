import type { HttpEventDefinition, HttpMethodDefinition } from "../../../../shared/route-types.js";

export const voiceAssetsMethodDefinitions: HttpMethodDefinition[] = [
  {
    "key": "LegacyExecutionFacet.approveInheritance",
    "facetName": "LegacyExecutionFacet",
    "wrapperKey": "approveInheritance",
    "domain": "voice-assets",
    "resource": "legacy",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/commands/approve-inheritance",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "body",
          "field": "voiceHash"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "approveInheritance",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "LegacyExecutionFacet.approveInheritance",
    "methodName": "approveInheritance",
    "signature": "approveInheritance(bytes32)",
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
        "internalType": "bytes32",
        "name": "voiceHash",
        "type": "bytes32"
      }
    ],
    "outputs": []
  },
  {
    "key": "LegacyExecutionFacet.delegateRights",
    "facetName": "LegacyExecutionFacet",
    "wrapperKey": "delegateRights",
    "domain": "voice-assets",
    "resource": "legacy",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/commands/delegate-rights",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "delegatee",
          "source": "body",
          "field": "delegatee"
        },
        {
          "name": "duration",
          "source": "body",
          "field": "duration"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "delegateRights",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "LegacyExecutionFacet.delegateRights",
    "methodName": "delegateRights",
    "signature": "delegateRights(address,uint256)",
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
        "internalType": "address",
        "name": "delegatee",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "duration",
        "type": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "LegacyExecutionFacet.executeInheritance",
    "facetName": "LegacyExecutionFacet",
    "wrapperKey": "executeInheritance",
    "domain": "voice-assets",
    "resource": "legacy",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/commands/execute-inheritance",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "owner",
          "source": "body",
          "field": "owner"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "executeInheritance",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "LegacyExecutionFacet.executeInheritance",
    "methodName": "executeInheritance",
    "signature": "executeInheritance(address)",
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
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "outputs": []
  },
  {
    "key": "LegacyExecutionFacet.initiateInheritance",
    "facetName": "LegacyExecutionFacet",
    "wrapperKey": "initiateInheritance",
    "domain": "voice-assets",
    "resource": "legacy",
    "classification": "create",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/legacy/initiate-inheritance",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "body",
          "field": "voiceHash"
        },
        {
          "name": "proofDocuments",
          "source": "body",
          "field": "proofDocuments"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "initiateInheritance",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "LegacyExecutionFacet.initiateInheritance",
    "methodName": "initiateInheritance",
    "signature": "initiateInheritance(bytes32,string[])",
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
        "internalType": "bytes32",
        "name": "voiceHash",
        "type": "bytes32"
      },
      {
        "internalType": "string[]",
        "name": "proofDocuments",
        "type": "string[]"
      }
    ],
    "outputs": []
  },
  {
    "key": "LegacyFacet.addBeneficiary",
    "facetName": "LegacyFacet",
    "wrapperKey": "addBeneficiary",
    "domain": "voice-assets",
    "resource": "legacy",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/commands/add-beneficiary",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "account",
          "source": "body",
          "field": "account"
        },
        {
          "name": "share",
          "source": "body",
          "field": "share"
        },
        {
          "name": "canDelegate",
          "source": "body",
          "field": "canDelegate"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "addBeneficiary",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "LegacyFacet.addBeneficiary",
    "methodName": "addBeneficiary",
    "signature": "addBeneficiary(address,uint256,bool)",
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
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "share",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "canDelegate",
        "type": "bool"
      }
    ],
    "outputs": []
  },
  {
    "key": "LegacyFacet.addDatasets",
    "facetName": "LegacyFacet",
    "wrapperKey": "addDatasets",
    "domain": "voice-assets",
    "resource": "legacy",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/commands/add-datasets",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "datasetIds",
          "source": "body",
          "field": "datasetIds"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "addDatasets",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "LegacyFacet.addDatasets",
    "methodName": "addDatasets",
    "signature": "addDatasets(uint256[])",
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
        "internalType": "uint256[]",
        "name": "datasetIds",
        "type": "uint256[]"
      }
    ],
    "outputs": []
  },
  {
    "key": "LegacyFacet.addInheritanceRequirement",
    "facetName": "LegacyFacet",
    "wrapperKey": "addInheritanceRequirement",
    "domain": "voice-assets",
    "resource": "legacy",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/commands/add-inheritance-requirement",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "doc",
          "source": "body",
          "field": "doc"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "addInheritanceRequirement",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "LegacyFacet.addInheritanceRequirement",
    "methodName": "addInheritanceRequirement",
    "signature": "addInheritanceRequirement(string)",
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
        "internalType": "string",
        "name": "doc",
        "type": "string"
      }
    ],
    "outputs": []
  },
  {
    "key": "LegacyFacet.addVoiceAssets",
    "facetName": "LegacyFacet",
    "wrapperKey": "addVoiceAssets",
    "domain": "voice-assets",
    "resource": "legacy",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/commands/add-voice-assets",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "voiceAssets",
          "source": "body",
          "field": "voiceAssets"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "addVoiceAssets",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "LegacyFacet.addVoiceAssets",
    "methodName": "addVoiceAssets",
    "signature": "addVoiceAssets(bytes32[])",
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
        "internalType": "bytes32[]",
        "name": "voiceAssets",
        "type": "bytes32[]"
      }
    ],
    "outputs": []
  },
  {
    "key": "LegacyFacet.createLegacyPlan",
    "facetName": "LegacyFacet",
    "wrapperKey": "createLegacyPlan",
    "domain": "voice-assets",
    "resource": "legacy",
    "classification": "create",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/legacy/create-legacy-plan",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "memo",
          "source": "body",
          "field": "memo"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "createLegacyPlan",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "LegacyFacet.createLegacyPlan",
    "methodName": "createLegacyPlan",
    "signature": "createLegacyPlan(string)",
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
        "internalType": "string",
        "name": "memo",
        "type": "string"
      }
    ],
    "outputs": []
  },
  {
    "key": "LegacyFacet.setBeneficiaryRelationship",
    "facetName": "LegacyFacet",
    "wrapperKey": "setBeneficiaryRelationship",
    "domain": "voice-assets",
    "resource": "legacy",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/voice-assets/commands/set-beneficiary-relationship",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "account",
          "source": "body",
          "field": "account"
        },
        {
          "name": "relationship",
          "source": "body",
          "field": "relationship"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setBeneficiaryRelationship",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "LegacyFacet.setBeneficiaryRelationship",
    "methodName": "setBeneficiaryRelationship",
    "signature": "setBeneficiaryRelationship(address,string)",
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
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "relationship",
        "type": "string"
      }
    ],
    "outputs": []
  },
  {
    "key": "LegacyFacet.setInheritanceConditions",
    "facetName": "LegacyFacet",
    "wrapperKey": "setInheritanceConditions",
    "domain": "voice-assets",
    "resource": "legacy",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/voice-assets/commands/set-inheritance-conditions",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "timelock",
          "source": "body",
          "field": "timelock"
        },
        {
          "name": "requiresProof",
          "source": "body",
          "field": "requiresProof"
        },
        {
          "name": "approvers",
          "source": "body",
          "field": "approvers"
        },
        {
          "name": "minApprovals",
          "source": "body",
          "field": "minApprovals"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setInheritanceConditions",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "LegacyFacet.setInheritanceConditions",
    "methodName": "setInheritanceConditions",
    "signature": "setInheritanceConditions(uint256,bool,address[],uint256)",
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
        "internalType": "uint256",
        "name": "timelock",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "requiresProof",
        "type": "bool"
      },
      {
        "internalType": "address[]",
        "name": "approvers",
        "type": "address[]"
      },
      {
        "internalType": "uint256",
        "name": "minApprovals",
        "type": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "LegacyFacet.setMaxBeneficiaries",
    "facetName": "LegacyFacet",
    "wrapperKey": "setMaxBeneficiaries",
    "domain": "voice-assets",
    "resource": "legacy",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/voice-assets/commands/set-max-beneficiaries",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "max",
          "source": "body",
          "field": "max"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setMaxBeneficiaries",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "LegacyFacet.setMaxBeneficiaries",
    "methodName": "setMaxBeneficiaries",
    "signature": "setMaxBeneficiaries(uint256)",
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
        "internalType": "uint256",
        "name": "max",
        "type": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "LegacyFacet.setMinTimelockPeriod",
    "facetName": "LegacyFacet",
    "wrapperKey": "setMinTimelockPeriod",
    "domain": "voice-assets",
    "resource": "legacy",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/voice-assets/commands/set-min-timelock-period",
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
    "operationId": "setMinTimelockPeriod",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "LegacyFacet.setMinTimelockPeriod",
    "methodName": "setMinTimelockPeriod",
    "signature": "setMinTimelockPeriod(uint256)",
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
        "internalType": "uint256",
        "name": "period",
        "type": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "LegacyFacet.updateBeneficiary",
    "facetName": "LegacyFacet",
    "wrapperKey": "updateBeneficiary",
    "domain": "voice-assets",
    "resource": "legacy",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/voice-assets/commands/update-beneficiary",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "beneficiary",
          "source": "body",
          "field": "beneficiary"
        },
        {
          "name": "index",
          "source": "body",
          "field": "index"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "updateBeneficiary",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "LegacyFacet.updateBeneficiary",
    "methodName": "updateBeneficiary",
    "signature": "updateBeneficiary((uint256,uint256,address,bool,bool,string),uint256)",
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
        "components": [
          {
            "internalType": "uint256",
            "name": "sharePercentage",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "activationTime",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "account",
            "type": "address"
          },
          {
            "internalType": "bool",
            "name": "isActive",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "canDelegate",
            "type": "bool"
          },
          {
            "internalType": "string",
            "name": "relationship",
            "type": "string"
          }
        ],
        "internalType": "struct LegacyStorage.Beneficiary",
        "name": "beneficiary",
        "type": "tuple"
      },
      {
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "LegacyViewFacet.getLegacyPlan",
    "facetName": "LegacyViewFacet",
    "wrapperKey": "getLegacyPlan",
    "domain": "voice-assets",
    "resource": "legacy",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/voice-assets/queries/get-legacy-plan",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "owner",
          "source": "query",
          "field": "owner"
        }
      ]
    },
    "outputShape": {
      "kind": "object"
    },
    "operationId": "getLegacyPlan",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "LegacyViewFacet.getLegacyPlan",
    "methodName": "getLegacyPlan",
    "signature": "getLegacyPlan(address)",
    "category": "read",
    "mutability": "view",
    "liveRequired": false,
    "cacheClass": "none",
    "cacheTtlSeconds": null,
    "executionSources": [
      "live"
    ],
    "gaslessModes": [],
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "outputs": [
      {
        "components": [
          {
            "internalType": "bytes32[]",
            "name": "voiceAssets",
            "type": "bytes32[]"
          },
          {
            "internalType": "uint256[]",
            "name": "datasetIds",
            "type": "uint256[]"
          },
          {
            "components": [
              {
                "internalType": "uint256",
                "name": "sharePercentage",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "activationTime",
                "type": "uint256"
              },
              {
                "internalType": "address",
                "name": "account",
                "type": "address"
              },
              {
                "internalType": "bool",
                "name": "isActive",
                "type": "bool"
              },
              {
                "internalType": "bool",
                "name": "canDelegate",
                "type": "bool"
              },
              {
                "internalType": "string",
                "name": "relationship",
                "type": "string"
              }
            ],
            "internalType": "struct LegacyStorage.Beneficiary[]",
            "name": "beneficiaries",
            "type": "tuple[]"
          },
          {
            "components": [
              {
                "internalType": "uint256",
                "name": "timelock",
                "type": "uint256"
              },
              {
                "internalType": "bool",
                "name": "requiresProof",
                "type": "bool"
              },
              {
                "internalType": "string[]",
                "name": "requiredDocs",
                "type": "string[]"
              },
              {
                "internalType": "address[]",
                "name": "approvers",
                "type": "address[]"
              },
              {
                "internalType": "uint256",
                "name": "minApprovals",
                "type": "uint256"
              }
            ],
            "internalType": "struct LegacyStorage.InheritanceCondition",
            "name": "conditions",
            "type": "tuple"
          },
          {
            "internalType": "uint256",
            "name": "createdAt",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "updatedAt",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "isActive",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "isExecuted",
            "type": "bool"
          },
          {
            "internalType": "string",
            "name": "memo",
            "type": "string"
          }
        ],
        "internalType": "struct LegacyStorage.LegacyPlan",
        "name": "plan",
        "type": "tuple"
      }
    ]
  },
  {
    "key": "LegacyViewFacet.isInheritanceReady",
    "facetName": "LegacyViewFacet",
    "wrapperKey": "isInheritanceReady",
    "domain": "voice-assets",
    "resource": "legacy",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/voice-assets/queries/is-inheritance-ready",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "query",
          "field": "voiceHash"
        }
      ]
    },
    "outputShape": {
      "kind": "tuple"
    },
    "operationId": "isInheritanceReady",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "LegacyViewFacet.isInheritanceReady",
    "methodName": "isInheritanceReady",
    "signature": "isInheritanceReady(bytes32)",
    "category": "read",
    "mutability": "view",
    "liveRequired": false,
    "cacheClass": "none",
    "cacheTtlSeconds": null,
    "executionSources": [
      "live"
    ],
    "gaslessModes": [],
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "voiceHash",
        "type": "bytes32"
      }
    ],
    "outputs": [
      {
        "internalType": "bool",
        "name": "ready",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "approvalCount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "requiredApprovals",
        "type": "uint256"
      }
    ]
  },
  {
    "key": "LegacyViewFacet.validateBeneficiaries",
    "facetName": "LegacyViewFacet",
    "wrapperKey": "validateBeneficiaries",
    "domain": "voice-assets",
    "resource": "legacy",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/queries/validate-beneficiaries",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "beneficiaries",
          "source": "body",
          "field": "beneficiaries"
        },
        {
          "name": "maxBeneficiaries",
          "source": "body",
          "field": "maxBeneficiaries"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "validateBeneficiaries",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "LegacyViewFacet.validateBeneficiaries",
    "methodName": "validateBeneficiaries",
    "signature": "validateBeneficiaries((uint256,uint256,address,bool,bool,string)[],uint256)",
    "category": "read",
    "mutability": "pure",
    "liveRequired": false,
    "cacheClass": "none",
    "cacheTtlSeconds": null,
    "executionSources": [
      "live"
    ],
    "gaslessModes": [],
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "sharePercentage",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "activationTime",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "account",
            "type": "address"
          },
          {
            "internalType": "bool",
            "name": "isActive",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "canDelegate",
            "type": "bool"
          },
          {
            "internalType": "string",
            "name": "relationship",
            "type": "string"
          }
        ],
        "internalType": "struct LegacyStorage.Beneficiary[]",
        "name": "beneficiaries",
        "type": "tuple[]"
      },
      {
        "internalType": "uint256",
        "name": "maxBeneficiaries",
        "type": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "LegacyViewFacet.validateBeneficiary",
    "facetName": "LegacyViewFacet",
    "wrapperKey": "validateBeneficiary",
    "domain": "voice-assets",
    "resource": "legacy",
    "classification": "read",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/queries/validate-beneficiary",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "beneficiary",
          "source": "body",
          "field": "beneficiary"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "validateBeneficiary",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "LegacyViewFacet.validateBeneficiary",
    "methodName": "validateBeneficiary",
    "signature": "validateBeneficiary((uint256,uint256,address,bool,bool,string))",
    "category": "read",
    "mutability": "pure",
    "liveRequired": false,
    "cacheClass": "none",
    "cacheTtlSeconds": null,
    "executionSources": [
      "live"
    ],
    "gaslessModes": [],
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "sharePercentage",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "activationTime",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "account",
            "type": "address"
          },
          {
            "internalType": "bool",
            "name": "isActive",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "canDelegate",
            "type": "bool"
          },
          {
            "internalType": "string",
            "name": "relationship",
            "type": "string"
          }
        ],
        "internalType": "struct LegacyStorage.Beneficiary",
        "name": "beneficiary",
        "type": "tuple"
      }
    ],
    "outputs": []
  },
  {
    "key": "VoiceAssetFacet.approveVoiceAsset",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "approveVoiceAsset",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/commands/approve-voice-asset",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "to",
          "source": "body",
          "field": "to"
        },
        {
          "name": "tokenId",
          "source": "body",
          "field": "tokenId"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "approveVoiceAsset",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.approveVoiceAsset",
    "methodName": "approveVoiceAsset",
    "signature": "approveVoiceAsset(address,uint256)",
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
        "name": "to",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "VoiceAssetFacet.authorizeUser",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "authorizeUser",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/:voiceHash/authorization-grants",
    "inputShape": {
      "kind": "path+body",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "path",
          "field": "voiceHash"
        },
        {
          "name": "user",
          "source": "body",
          "field": "user"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "authorizeUser",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.authorizeUser",
    "methodName": "authorizeUser",
    "signature": "authorizeUser(bytes32,address)",
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
        "name": "voiceHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "user",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": []
  },
  {
    "key": "VoiceAssetFacet.customizeRoyaltyRate",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "customizeRoyaltyRate",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/voice-assets/:voiceHash/royalty-rate",
    "inputShape": {
      "kind": "path+body",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "path",
          "field": "voiceHash"
        },
        {
          "name": "royaltyRate",
          "source": "body",
          "field": "royaltyRate"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "customizeRoyaltyRate",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.customizeRoyaltyRate",
    "methodName": "customizeRoyaltyRate",
    "signature": "customizeRoyaltyRate(bytes32,uint256)",
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
        "name": "voiceHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "royaltyPercent",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "VoiceAssetFacet.getApproved",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "getApproved",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/voice-assets/queries/get-approved",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "tokenId",
          "source": "query",
          "field": "tokenId"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "getApproved",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.getApproved",
    "methodName": "getApproved",
    "signature": "getApproved(uint256)",
    "category": "read",
    "mutability": "view",
    "liveRequired": true,
    "cacheClass": "none",
    "cacheTtlSeconds": null,
    "executionSources": [
      "live"
    ],
    "gaslessModes": [],
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "key": "VoiceAssetFacet.getDefaultPlatformFee",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "getDefaultPlatformFee",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "read",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/queries/get-default-platform-fee",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "getDefaultPlatformFee",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.getDefaultPlatformFee",
    "methodName": "getDefaultPlatformFee",
    "signature": "getDefaultPlatformFee()",
    "category": "read",
    "mutability": "view",
    "liveRequired": true,
    "cacheClass": "none",
    "cacheTtlSeconds": null,
    "executionSources": [
      "live"
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
    "key": "VoiceAssetFacet.getDefaultRoyaltyRate",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "getDefaultRoyaltyRate",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "read",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/queries/get-default-royalty-rate",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "getDefaultRoyaltyRate",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.getDefaultRoyaltyRate",
    "methodName": "getDefaultRoyaltyRate",
    "signature": "getDefaultRoyaltyRate()",
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
    "key": "VoiceAssetFacet.getMaxRoyaltyRate",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "getMaxRoyaltyRate",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "read",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/queries/get-max-royalty-rate",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "getMaxRoyaltyRate",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.getMaxRoyaltyRate",
    "methodName": "getMaxRoyaltyRate",
    "signature": "getMaxRoyaltyRate()",
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
    "key": "VoiceAssetFacet.getRoyaltyHistory",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "getRoyaltyHistory",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/voice-assets/queries/get-royalty-history",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "query",
          "field": "voiceHash"
        }
      ]
    },
    "outputShape": {
      "kind": "array"
    },
    "operationId": "getRoyaltyHistory",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.getRoyaltyHistory",
    "methodName": "getRoyaltyHistory",
    "signature": "getRoyaltyHistory(bytes32)",
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
        "name": "voiceHash",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "internalType": "struct VoiceAssetStorage.RoyaltyPayment[]",
        "components": [
          {
            "name": "amount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "timestamp",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "user",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "usageReference",
            "type": "bytes32",
            "internalType": "bytes32"
          }
        ]
      }
    ]
  },
  {
    "key": "VoiceAssetFacet.getTokenId",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "getTokenId",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/voice-assets/queries/get-token-id",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "query",
          "field": "voiceHash"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "getTokenId",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.getTokenId",
    "methodName": "getTokenId",
    "signature": "getTokenId(bytes32)",
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
        "name": "voiceHash",
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
    "key": "VoiceAssetFacet.getUserVoices",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "getUserVoices",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/voice-assets/queries/get-user-voices",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "user",
          "source": "query",
          "field": "user"
        }
      ]
    },
    "outputShape": {
      "kind": "array"
    },
    "operationId": "getUserVoices",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.getUserVoices",
    "methodName": "getUserVoices",
    "signature": "getUserVoices(address)",
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
        "name": "user",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32[]",
        "internalType": "bytes32[]"
      }
    ]
  },
  {
    "key": "VoiceAssetFacet.getVoiceAsset",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "getVoiceAsset",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/voice-assets/:voiceHash",
    "inputShape": {
      "kind": "path+body",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "path",
          "field": "voiceHash"
        }
      ]
    },
    "outputShape": {
      "kind": "tuple"
    },
    "operationId": "getVoiceAsset",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.getVoiceAsset",
    "methodName": "getVoiceAsset",
    "signature": "getVoiceAsset(bytes32)",
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
        "name": "voiceHash",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "ipfsHash",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "royaltyRate",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "isLocked",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "usageCount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "createdAt",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "key": "VoiceAssetFacet.getVoiceAssetDetails",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "getVoiceAssetDetails",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/voice-assets/:voiceHash/details",
    "inputShape": {
      "kind": "path+body",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "path",
          "field": "voiceHash"
        }
      ]
    },
    "outputShape": {
      "kind": "tuple"
    },
    "operationId": "getVoiceAssetDetails",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.getVoiceAssetDetails",
    "methodName": "getVoiceAssetDetails",
    "signature": "getVoiceAssetDetails(bytes32)",
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
        "name": "voiceHash",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "isRegistered",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "createdAt",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "key": "VoiceAssetFacet.getVoiceAssetsByOwner",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "getVoiceAssetsByOwner",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/voice-assets/by-owner/:owner",
    "inputShape": {
      "kind": "path+body",
      "bindings": [
        {
          "name": "owner",
          "source": "path",
          "field": "owner"
        }
      ]
    },
    "outputShape": {
      "kind": "array"
    },
    "operationId": "getVoiceAssetsByOwner",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.getVoiceAssetsByOwner",
    "methodName": "getVoiceAssetsByOwner",
    "signature": "getVoiceAssetsByOwner(address)",
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
        "name": "owner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32[]",
        "internalType": "bytes32[]"
      }
    ]
  },
  {
    "key": "VoiceAssetFacet.getVoiceHash",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "getVoiceHash",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/voice-assets/queries/get-voice-hash",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "tokenId",
          "source": "query",
          "field": "tokenId"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "getVoiceHash",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.getVoiceHash",
    "methodName": "getVoiceHash",
    "signature": "getVoiceHash(uint256)",
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
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
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
    "key": "VoiceAssetFacet.getVoiceHashFromTokenId",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "getVoiceHashFromTokenId",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/voice-assets/queries/get-voice-hash-from-token-id",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "tokenId",
          "source": "query",
          "field": "tokenId"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "getVoiceHashFromTokenId",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.getVoiceHashFromTokenId",
    "methodName": "getVoiceHashFromTokenId",
    "signature": "getVoiceHashFromTokenId(uint256)",
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
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
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
    "key": "VoiceAssetFacet.isApprovedForAll",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "isApprovedForAll",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/voice-assets/queries/is-approved-for-all",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "owner",
          "source": "query",
          "field": "owner"
        },
        {
          "name": "operator",
          "source": "query",
          "field": "operator"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "isApprovedForAll",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.isApprovedForAll",
    "methodName": "isApprovedForAll",
    "signature": "isApprovedForAll(address,address)",
    "category": "read",
    "mutability": "view",
    "liveRequired": true,
    "cacheClass": "none",
    "cacheTtlSeconds": null,
    "executionSources": [
      "live"
    ],
    "gaslessModes": [],
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "operator",
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
    "key": "VoiceAssetFacet.isAuthorized",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "isAuthorized",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/voice-assets/queries/is-authorized",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "query",
          "field": "voiceHash"
        },
        {
          "name": "user",
          "source": "query",
          "field": "user"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "isAuthorized",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.isAuthorized",
    "methodName": "isAuthorized",
    "signature": "isAuthorized(bytes32,address)",
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
        "name": "voiceHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "user",
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
    "key": "VoiceAssetFacet.isRegistrationPaused",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "isRegistrationPaused",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/queries/is-registration-paused",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "isRegistrationPaused",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.isRegistrationPaused",
    "methodName": "isRegistrationPaused",
    "signature": "isRegistrationPaused()",
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
    "key": "VoiceAssetFacet.lockVoiceAsset",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "lockVoiceAsset",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/:voiceHash/lock",
    "inputShape": {
      "kind": "path+body",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "path",
          "field": "voiceHash"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "lockVoiceAsset",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.lockVoiceAsset",
    "methodName": "lockVoiceAsset",
    "signature": "lockVoiceAsset(bytes32)",
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
        "name": "voiceHash",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": []
  },
  {
    "key": "VoiceAssetFacet.name",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "name",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "read",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/queries/name",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "name",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.name",
    "methodName": "name",
    "signature": "name()",
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
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "string",
        "internalType": "string"
      }
    ]
  },
  {
    "key": "VoiceAssetFacet.ownerOf",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "ownerOf",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/voice-assets/tokens/:tokenId/owner",
    "inputShape": {
      "kind": "path+body",
      "bindings": [
        {
          "name": "tokenId",
          "source": "path",
          "field": "tokenId"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "ownerOf",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.ownerOf",
    "methodName": "ownerOf",
    "signature": "ownerOf(uint256)",
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
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "key": "VoiceAssetFacet.recordRoyaltyPayment",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "recordRoyaltyPayment",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/:voiceHash/royalty-payments",
    "inputShape": {
      "kind": "path+body",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "path",
          "field": "voiceHash"
        },
        {
          "name": "amount",
          "source": "body",
          "field": "amount"
        },
        {
          "name": "usageReference",
          "source": "body",
          "field": "usageReference"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "recordRoyaltyPayment",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.recordRoyaltyPayment",
    "methodName": "recordRoyaltyPayment",
    "signature": "recordRoyaltyPayment(bytes32,uint256,bytes32)",
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
        "name": "voiceHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "usageReference",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": []
  },
  {
    "key": "VoiceAssetFacet.recordRoyaltyPaymentFrom",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "recordRoyaltyPaymentFrom",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/commands/record-royalty-payment-from",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "body",
          "field": "voiceHash"
        },
        {
          "name": "amount",
          "source": "body",
          "field": "amount"
        },
        {
          "name": "usageReference",
          "source": "body",
          "field": "usageReference"
        },
        {
          "name": "user",
          "source": "body",
          "field": "user"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "recordRoyaltyPaymentFrom",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.recordRoyaltyPaymentFrom",
    "methodName": "recordRoyaltyPaymentFrom",
    "signature": "recordRoyaltyPaymentFrom(bytes32,uint256,bytes32,address)",
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
        "name": "voiceHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "usageReference",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "user",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": []
  },
  {
    "key": "VoiceAssetFacet.recordUsage",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "recordUsage",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/:voiceHash/usage-records",
    "inputShape": {
      "kind": "path+body",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "path",
          "field": "voiceHash"
        },
        {
          "name": "usageRef",
          "source": "body",
          "field": "usageRef"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "recordUsage",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.recordUsage",
    "methodName": "recordUsage",
    "signature": "recordUsage(bytes32,bytes32)",
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
        "name": "voiceHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "usageRef",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": []
  },
  {
    "key": "VoiceAssetFacet.recordUsageFrom",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "recordUsageFrom",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/commands/record-usage-from",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "body",
          "field": "voiceHash"
        },
        {
          "name": "usageRef",
          "source": "body",
          "field": "usageRef"
        },
        {
          "name": "caller",
          "source": "body",
          "field": "caller"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "recordUsageFrom",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.recordUsageFrom",
    "methodName": "recordUsageFrom",
    "signature": "recordUsageFrom(bytes32,bytes32,address)",
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
        "name": "voiceHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "usageRef",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "caller",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": []
  },
  {
    "key": "VoiceAssetFacet.registerVoiceAsset",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "registerVoiceAsset",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "create",
    "httpMethod": "POST",
    "path": "/v1/voice-assets",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "ipfsHash",
          "source": "body",
          "field": "ipfsHash"
        },
        {
          "name": "royaltyRate",
          "source": "body",
          "field": "royaltyRate"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "registerVoiceAsset",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.registerVoiceAsset",
    "methodName": "registerVoiceAsset",
    "signature": "registerVoiceAsset(string,uint256)",
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
        "name": "ipfsHash",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "royaltyRate",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "voiceHash",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "key": "VoiceAssetFacet.registerVoiceAssetForCaller",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "registerVoiceAssetForCaller",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "create",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/registrations/for-caller",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "ipfsHash",
          "source": "body",
          "field": "ipfsHash"
        },
        {
          "name": "royaltyRate",
          "source": "body",
          "field": "royaltyRate"
        },
        {
          "name": "owner",
          "source": "body",
          "field": "owner"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "registerVoiceAssetForCaller",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.registerVoiceAssetForCaller",
    "methodName": "registerVoiceAssetForCaller",
    "signature": "registerVoiceAssetForCaller(string,uint256,address)",
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
        "name": "ipfsHash",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "royaltyRate",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
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
    "key": "VoiceAssetFacet.revokeUser",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "revokeUser",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "delete",
    "httpMethod": "DELETE",
    "path": "/v1/voice-assets/:voiceHash/authorization-grants/:user",
    "inputShape": {
      "kind": "path+body",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "path",
          "field": "voiceHash"
        },
        {
          "name": "user",
          "source": "path",
          "field": "user"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "revokeUser",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.revokeUser",
    "methodName": "revokeUser",
    "signature": "revokeUser(bytes32,address)",
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
        "name": "voiceHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "user",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": []
  },
  {
    "key": "VoiceAssetFacet.safeTransferFrom(address,address,uint256,bytes)",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "safeTransferFrom(address,address,uint256,bytes)",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/tokens/:tokenId/transfers/safe-with-data",
    "inputShape": {
      "kind": "path+body",
      "bindings": [
        {
          "name": "from",
          "source": "body",
          "field": "from"
        },
        {
          "name": "to",
          "source": "body",
          "field": "to"
        },
        {
          "name": "tokenId",
          "source": "path",
          "field": "tokenId"
        },
        {
          "name": "data",
          "source": "body",
          "field": "data"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "safeTransferFromAddressAddressUint256Bytes",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.safeTransferFrom(address,address,uint256,bytes)",
    "methodName": "safeTransferFrom",
    "signature": "safeTransferFrom(address,address,uint256,bytes)",
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
        "name": "from",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "data",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": []
  },
  {
    "key": "VoiceAssetFacet.safeTransferFrom(address,address,uint256)",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "safeTransferFrom(address,address,uint256)",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/tokens/:tokenId/transfers/safe",
    "inputShape": {
      "kind": "path+body",
      "bindings": [
        {
          "name": "from",
          "source": "body",
          "field": "from"
        },
        {
          "name": "to",
          "source": "body",
          "field": "to"
        },
        {
          "name": "tokenId",
          "source": "path",
          "field": "tokenId"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "safeTransferFromAddressAddressUint256",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.safeTransferFrom(address,address,uint256)",
    "methodName": "safeTransferFrom",
    "signature": "safeTransferFrom(address,address,uint256)",
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
        "name": "from",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "VoiceAssetFacet.setApprovalForAll",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "setApprovalForAll",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/voice-assets/commands/set-approval-for-all",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "operator",
          "source": "body",
          "field": "operator"
        },
        {
          "name": "approved",
          "source": "body",
          "field": "approved"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setApprovalForAll",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.setApprovalForAll",
    "methodName": "setApprovalForAll",
    "signature": "setApprovalForAll(address,bool)",
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
        "name": "operator",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "approved",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": []
  },
  {
    "key": "VoiceAssetFacet.setDefaultPlatformFee",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "setDefaultPlatformFee",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/voice-assets/commands/set-default-platform-fee",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "fee",
          "source": "body",
          "field": "fee"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setDefaultPlatformFee",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.setDefaultPlatformFee",
    "methodName": "setDefaultPlatformFee",
    "signature": "setDefaultPlatformFee(uint256)",
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
        "name": "fee",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "VoiceAssetFacet.setDefaultRoyaltyRate",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "setDefaultRoyaltyRate",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/voice-assets/commands/set-default-royalty-rate",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "rate",
          "source": "body",
          "field": "rate"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setDefaultRoyaltyRate",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.setDefaultRoyaltyRate",
    "methodName": "setDefaultRoyaltyRate",
    "signature": "setDefaultRoyaltyRate(uint256)",
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
        "name": "rate",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "VoiceAssetFacet.setRegistrationPaused",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "setRegistrationPaused",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/voice-assets/commands/set-registration-paused",
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
    "operationId": "setRegistrationPaused",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.setRegistrationPaused",
    "methodName": "setRegistrationPaused",
    "signature": "setRegistrationPaused(bool)",
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
    "key": "VoiceAssetFacet.supportsInterface",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "supportsInterface",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/voice-assets/queries/supports-interface",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "interfaceId",
          "source": "query",
          "field": "interfaceId"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "supportsInterface",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.supportsInterface",
    "methodName": "supportsInterface",
    "signature": "supportsInterface(bytes4)",
    "category": "read",
    "mutability": "view",
    "liveRequired": false,
    "cacheClass": "none",
    "cacheTtlSeconds": null,
    "executionSources": [
      "live"
    ],
    "gaslessModes": [],
    "inputs": [
      {
        "name": "interfaceId",
        "type": "bytes4",
        "internalType": "bytes4"
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
    "key": "VoiceAssetFacet.symbol",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "symbol",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "read",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/queries/symbol",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "symbol",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.symbol",
    "methodName": "symbol",
    "signature": "symbol()",
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
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "string",
        "internalType": "string"
      }
    ]
  },
  {
    "key": "VoiceAssetFacet.tokenURI",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "tokenURI",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/voice-assets/tokens/:tokenId/uri",
    "inputShape": {
      "kind": "path+body",
      "bindings": [
        {
          "name": "tokenId",
          "source": "path",
          "field": "tokenId"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "tokenUri",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.tokenURI",
    "methodName": "tokenURI",
    "signature": "tokenURI(uint256)",
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
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "string",
        "internalType": "string"
      }
    ]
  },
  {
    "key": "VoiceAssetFacet.transferFromVoiceAsset",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "transferFromVoiceAsset",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/tokens/:tokenId/transfers",
    "inputShape": {
      "kind": "path+body",
      "bindings": [
        {
          "name": "from",
          "source": "body",
          "field": "from"
        },
        {
          "name": "to",
          "source": "body",
          "field": "to"
        },
        {
          "name": "tokenId",
          "source": "path",
          "field": "tokenId"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "transferFromVoiceAsset",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.transferFromVoiceAsset",
    "methodName": "transferFromVoiceAsset",
    "signature": "transferFromVoiceAsset(address,address,uint256)",
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
        "name": "from",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "VoiceAssetFacet.unlockVoiceAsset",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "unlockVoiceAsset",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/:voiceHash/unlock",
    "inputShape": {
      "kind": "path+body",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "path",
          "field": "voiceHash"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "unlockVoiceAsset",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.unlockVoiceAsset",
    "methodName": "unlockVoiceAsset",
    "signature": "unlockVoiceAsset(bytes32)",
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
        "name": "voiceHash",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": []
  },
  {
    "key": "VoiceAssetFacet.voiceAssetBalanceOf",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "voiceAssetBalanceOf",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/voice-assets/queries/voice-asset-balance-of",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "owner",
          "source": "query",
          "field": "owner"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "voiceAssetBalanceOf",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.voiceAssetBalanceOf",
    "methodName": "voiceAssetBalanceOf",
    "signature": "voiceAssetBalanceOf(address)",
    "category": "read",
    "mutability": "view",
    "liveRequired": true,
    "cacheClass": "none",
    "cacheTtlSeconds": null,
    "executionSources": [
      "live"
    ],
    "gaslessModes": [],
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
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
    "key": "VoiceAssetFacet.voiceAssetName",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "voiceAssetName",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "read",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/queries/voice-asset-name",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "voiceAssetName",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.voiceAssetName",
    "methodName": "voiceAssetName",
    "signature": "voiceAssetName()",
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
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "string",
        "internalType": "string"
      }
    ]
  },
  {
    "key": "VoiceAssetFacet.voiceAssetSymbol",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "voiceAssetSymbol",
    "domain": "voice-assets",
    "resource": "voice-assets",
    "classification": "read",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/queries/voice-asset-symbol",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "voiceAssetSymbol",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceAssetFacet.voiceAssetSymbol",
    "methodName": "voiceAssetSymbol",
    "signature": "voiceAssetSymbol()",
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
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "string",
        "internalType": "string"
      }
    ]
  },
  {
    "key": "VoiceMetadataFacet.getBasicAcousticFeatures",
    "facetName": "VoiceMetadataFacet",
    "wrapperKey": "getBasicAcousticFeatures",
    "domain": "voice-assets",
    "resource": "metadata",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/voice-assets/queries/get-basic-acoustic-features",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "query",
          "field": "voiceHash"
        }
      ]
    },
    "outputShape": {
      "kind": "object"
    },
    "operationId": "getBasicAcousticFeatures",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceMetadataFacet.getBasicAcousticFeatures",
    "methodName": "getBasicAcousticFeatures",
    "signature": "getBasicAcousticFeatures(bytes32)",
    "category": "read",
    "mutability": "view",
    "liveRequired": false,
    "cacheClass": "assetMetadata",
    "cacheTtlSeconds": 3600,
    "executionSources": [
      "live",
      "cache"
    ],
    "gaslessModes": [],
    "inputs": [
      {
        "name": "voiceHash",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "features",
        "type": "tuple",
        "internalType": "struct IVoiceMetadata.BasicAcousticFeatures",
        "components": [
          {
            "name": "pitch",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "volume",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "speechRate",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "timbre",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "formants",
            "type": "uint256[]",
            "internalType": "uint256[]"
          },
          {
            "name": "harmonicsToNoise",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "dynamicRange",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ]
  },
  {
    "key": "VoiceMetadataFacet.getGeographicData",
    "facetName": "VoiceMetadataFacet",
    "wrapperKey": "getGeographicData",
    "domain": "voice-assets",
    "resource": "metadata",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/voice-assets/queries/get-geographic-data",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "query",
          "field": "voiceHash"
        }
      ]
    },
    "outputShape": {
      "kind": "object"
    },
    "operationId": "getGeographicData",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceMetadataFacet.getGeographicData",
    "methodName": "getGeographicData",
    "signature": "getGeographicData(bytes32)",
    "category": "read",
    "mutability": "view",
    "liveRequired": false,
    "cacheClass": "assetMetadata",
    "cacheTtlSeconds": 3600,
    "executionSources": [
      "live",
      "cache"
    ],
    "gaslessModes": [],
    "inputs": [
      {
        "name": "voiceHash",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "geographic",
        "type": "tuple",
        "internalType": "struct IVoiceMetadata.GeographicData",
        "components": [
          {
            "name": "latitude",
            "type": "int256",
            "internalType": "int256"
          },
          {
            "name": "longitude",
            "type": "int256",
            "internalType": "int256"
          },
          {
            "name": "region",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "country",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "locality",
            "type": "string",
            "internalType": "string"
          }
        ]
      }
    ]
  },
  {
    "key": "VoiceMetadataFacet.getVoiceCategories",
    "facetName": "VoiceMetadataFacet",
    "wrapperKey": "getVoiceCategories",
    "domain": "voice-assets",
    "resource": "metadata",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/voice-assets/queries/get-voice-categories",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "query",
          "field": "voiceHash"
        }
      ]
    },
    "outputShape": {
      "kind": "array"
    },
    "operationId": "getVoiceCategories",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceMetadataFacet.getVoiceCategories",
    "methodName": "getVoiceCategories",
    "signature": "getVoiceCategories(bytes32)",
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
        "name": "voiceHash",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "categories",
        "type": "string[]",
        "internalType": "string[]"
      }
    ]
  },
  {
    "key": "VoiceMetadataFacet.getVoiceClassifications",
    "facetName": "VoiceMetadataFacet",
    "wrapperKey": "getVoiceClassifications",
    "domain": "voice-assets",
    "resource": "metadata",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/voice-assets/queries/get-voice-classifications",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "query",
          "field": "voiceHash"
        }
      ]
    },
    "outputShape": {
      "kind": "object"
    },
    "operationId": "getVoiceClassifications",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceMetadataFacet.getVoiceClassifications",
    "methodName": "getVoiceClassifications",
    "signature": "getVoiceClassifications(bytes32)",
    "category": "read",
    "mutability": "view",
    "liveRequired": false,
    "cacheClass": "assetMetadata",
    "cacheTtlSeconds": 3600,
    "executionSources": [
      "live",
      "cache"
    ],
    "gaslessModes": [],
    "inputs": [
      {
        "name": "voiceHash",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "classifications",
        "type": "tuple",
        "internalType": "struct IVoiceMetadata.VoiceClassifications",
        "components": [
          {
            "name": "analysisVersion",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "timestamp",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "processingTimeMs",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "componentsRun",
            "type": "string[]",
            "internalType": "string[]"
          },
          {
            "name": "categories",
            "type": "string[]",
            "internalType": "string[]"
          }
        ]
      }
    ]
  },
  {
    "key": "VoiceMetadataFacet.searchVoicesByClassification",
    "facetName": "VoiceMetadataFacet",
    "wrapperKey": "searchVoicesByClassification",
    "domain": "voice-assets",
    "resource": "metadata",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/queries/by-classification",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "classificationName",
          "source": "body",
          "field": "classificationName"
        },
        {
          "name": "category",
          "source": "body",
          "field": "category"
        },
        {
          "name": "level",
          "source": "body",
          "field": "level"
        },
        {
          "name": "minScore",
          "source": "body",
          "field": "minScore"
        }
      ]
    },
    "outputShape": {
      "kind": "array"
    },
    "operationId": "searchVoicesByClassification",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceMetadataFacet.searchVoicesByClassification",
    "methodName": "searchVoicesByClassification",
    "signature": "searchVoicesByClassification(string,string,string,uint256)",
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
        "name": "classificationName",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "category",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "level",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "minScore",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "voiceHashes",
        "type": "bytes32[]",
        "internalType": "bytes32[]"
      }
    ]
  },
  {
    "key": "VoiceMetadataFacet.searchVoicesByClassificationPaginated",
    "facetName": "VoiceMetadataFacet",
    "wrapperKey": "searchVoicesByClassificationPaginated",
    "domain": "voice-assets",
    "resource": "metadata",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/queries/search-voices-by-classification-paginated",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "classificationName",
          "source": "body",
          "field": "classificationName"
        },
        {
          "name": "category",
          "source": "body",
          "field": "category"
        },
        {
          "name": "level",
          "source": "body",
          "field": "level"
        },
        {
          "name": "minScore",
          "source": "body",
          "field": "minScore"
        },
        {
          "name": "offset",
          "source": "body",
          "field": "offset"
        },
        {
          "name": "limit",
          "source": "body",
          "field": "limit"
        }
      ]
    },
    "outputShape": {
      "kind": "tuple"
    },
    "operationId": "searchVoicesByClassificationPaginated",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceMetadataFacet.searchVoicesByClassificationPaginated",
    "methodName": "searchVoicesByClassificationPaginated",
    "signature": "searchVoicesByClassificationPaginated(string,string,string,uint256,uint256,uint256)",
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
        "name": "classificationName",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "category",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "level",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "minScore",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "offset",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "limit",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "voiceHashes",
        "type": "bytes32[]",
        "internalType": "bytes32[]"
      },
      {
        "name": "totalMatches",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "key": "VoiceMetadataFacet.setAnalysisVersion",
    "facetName": "VoiceMetadataFacet",
    "wrapperKey": "setAnalysisVersion",
    "domain": "voice-assets",
    "resource": "metadata",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/voice-assets/commands/set-analysis-version",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "version",
          "source": "body",
          "field": "version"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setAnalysisVersion",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VoiceMetadataFacet.setAnalysisVersion",
    "methodName": "setAnalysisVersion",
    "signature": "setAnalysisVersion(string)",
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
        "name": "version",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": []
  },
  {
    "key": "VoiceMetadataFacet.updateBasicAcousticFeatures",
    "facetName": "VoiceMetadataFacet",
    "wrapperKey": "updateBasicAcousticFeatures",
    "domain": "voice-assets",
    "resource": "metadata",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/voice-assets/:voiceHash/metadata/acoustic-features",
    "inputShape": {
      "kind": "path+body",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "path",
          "field": "voiceHash"
        },
        {
          "name": "features",
          "source": "body",
          "field": "features"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "updateBasicAcousticFeatures",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VoiceMetadataFacet.updateBasicAcousticFeatures",
    "methodName": "updateBasicAcousticFeatures",
    "signature": "updateBasicAcousticFeatures(bytes32,(uint256,uint256,uint256,string,uint256[],uint256,uint256))",
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
        "name": "voiceHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "features",
        "type": "tuple",
        "internalType": "struct IVoiceMetadata.BasicAcousticFeatures",
        "components": [
          {
            "name": "pitch",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "volume",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "speechRate",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "timbre",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "formants",
            "type": "uint256[]",
            "internalType": "uint256[]"
          },
          {
            "name": "harmonicsToNoise",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "dynamicRange",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "outputs": []
  },
  {
    "key": "VoiceMetadataFacet.updateClassificationCategory",
    "facetName": "VoiceMetadataFacet",
    "wrapperKey": "updateClassificationCategory",
    "domain": "voice-assets",
    "resource": "metadata",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/voice-assets/commands/update-classification-category",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "body",
          "field": "voiceHash"
        },
        {
          "name": "category",
          "source": "body",
          "field": "category"
        },
        {
          "name": "classifications",
          "source": "body",
          "field": "classifications"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "updateClassificationCategory",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VoiceMetadataFacet.updateClassificationCategory",
    "methodName": "updateClassificationCategory",
    "signature": "updateClassificationCategory(bytes32,string,(string,uint256,string,string,string)[])",
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
        "name": "voiceHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "category",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "classifications",
        "type": "tuple[]",
        "internalType": "struct IVoiceMetadata.ClassificationResult[]",
        "components": [
          {
            "name": "name",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "score",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "category",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "level",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "metadata",
            "type": "string",
            "internalType": "string"
          }
        ]
      }
    ],
    "outputs": []
  },
  {
    "key": "VoiceMetadataFacet.updateGeographicData",
    "facetName": "VoiceMetadataFacet",
    "wrapperKey": "updateGeographicData",
    "domain": "voice-assets",
    "resource": "metadata",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/voice-assets/commands/update-geographic-data",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "body",
          "field": "voiceHash"
        },
        {
          "name": "geographic",
          "source": "body",
          "field": "geographic"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "updateGeographicData",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VoiceMetadataFacet.updateGeographicData",
    "methodName": "updateGeographicData",
    "signature": "updateGeographicData(bytes32,(int256,int256,string,string,string))",
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
        "name": "voiceHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "geographic",
        "type": "tuple",
        "internalType": "struct IVoiceMetadata.GeographicData",
        "components": [
          {
            "name": "latitude",
            "type": "int256",
            "internalType": "int256"
          },
          {
            "name": "longitude",
            "type": "int256",
            "internalType": "int256"
          },
          {
            "name": "region",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "country",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "locality",
            "type": "string",
            "internalType": "string"
          }
        ]
      }
    ],
    "outputs": []
  },
  {
    "key": "VoiceMetadataFacet.updateVoiceClassifications",
    "facetName": "VoiceMetadataFacet",
    "wrapperKey": "updateVoiceClassifications",
    "domain": "voice-assets",
    "resource": "metadata",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/voice-assets/commands/update-voice-classifications",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "body",
          "field": "voiceHash"
        },
        {
          "name": "classifications",
          "source": "body",
          "field": "classifications"
        },
        {
          "name": "categoryData",
          "source": "body",
          "field": "categoryData"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "updateVoiceClassifications",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VoiceMetadataFacet.updateVoiceClassifications",
    "methodName": "updateVoiceClassifications",
    "signature": "updateVoiceClassifications(bytes32,(string,uint256,uint256,string[],string[]),(string,(string,uint256,string,string,string)[])[])",
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
        "name": "voiceHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "classifications",
        "type": "tuple",
        "internalType": "struct IVoiceMetadata.VoiceClassifications",
        "components": [
          {
            "name": "analysisVersion",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "timestamp",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "processingTimeMs",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "componentsRun",
            "type": "string[]",
            "internalType": "string[]"
          },
          {
            "name": "categories",
            "type": "string[]",
            "internalType": "string[]"
          }
        ]
      },
      {
        "name": "categoryData",
        "type": "tuple[]",
        "internalType": "struct IVoiceMetadata.CategoryClassifications[]",
        "components": [
          {
            "name": "category",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "classifications",
            "type": "tuple[]",
            "internalType": "struct IVoiceMetadata.ClassificationResult[]",
            "components": [
              {
                "name": "name",
                "type": "string",
                "internalType": "string"
              },
              {
                "name": "score",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "category",
                "type": "string",
                "internalType": "string"
              },
              {
                "name": "level",
                "type": "string",
                "internalType": "string"
              },
              {
                "name": "metadata",
                "type": "string",
                "internalType": "string"
              }
            ]
          }
        ]
      }
    ],
    "outputs": []
  }
] as HttpMethodDefinition[];
export const voiceAssetsEventDefinitions: HttpEventDefinition[] = [
  {
    "key": "LegacyExecutionFacet.InheritanceActivated",
    "facetName": "LegacyExecutionFacet",
    "wrapperKey": "InheritanceActivated",
    "domain": "voice-assets",
    "operationId": "inheritanceActivatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/events/inheritance-activated/query",
    "notes": "LegacyExecutionFacet.InheritanceActivated",
    "eventName": "InheritanceActivated",
    "signature": "InheritanceActivated(bytes32,address,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "voiceHash",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "beneficiary",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "projection": {
      "domain": "voice-assets",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "LegacyExecutionFacet.InheritanceApproved",
    "facetName": "LegacyExecutionFacet",
    "wrapperKey": "InheritanceApproved",
    "domain": "voice-assets",
    "operationId": "inheritanceApprovedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/events/inheritance-approved/query",
    "notes": "LegacyExecutionFacet.InheritanceApproved",
    "eventName": "InheritanceApproved",
    "signature": "InheritanceApproved(bytes32,address,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "voiceHash",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "approver",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "projection": {
      "domain": "voice-assets",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "LegacyExecutionFacet.RightsDelegated",
    "facetName": "LegacyExecutionFacet",
    "wrapperKey": "RightsDelegated",
    "domain": "voice-assets",
    "operationId": "rightsDelegatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/events/rights-delegated/query",
    "notes": "LegacyExecutionFacet.RightsDelegated",
    "eventName": "RightsDelegated",
    "signature": "RightsDelegated(address,address,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "original",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "delegated",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "expiryTime",
        "type": "uint256"
      }
    ],
    "projection": {
      "domain": "voice-assets",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "LegacyFacet.BeneficiaryUpdated",
    "facetName": "LegacyFacet",
    "wrapperKey": "BeneficiaryUpdated",
    "domain": "voice-assets",
    "operationId": "beneficiaryUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/events/beneficiary-updated/query",
    "notes": "LegacyFacet.BeneficiaryUpdated",
    "eventName": "BeneficiaryUpdated",
    "signature": "BeneficiaryUpdated(address,address,uint256,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "beneficiary",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "sharePercentage",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "projection": {
      "domain": "voice-assets",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "LegacyFacet.InheritanceConditionsUpdated",
    "facetName": "LegacyFacet",
    "wrapperKey": "InheritanceConditionsUpdated",
    "domain": "voice-assets",
    "operationId": "inheritanceConditionsUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/events/inheritance-conditions-updated/query",
    "notes": "LegacyFacet.InheritanceConditionsUpdated",
    "eventName": "InheritanceConditionsUpdated",
    "signature": "InheritanceConditionsUpdated(address,uint256,uint256,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "timelock",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "minApprovals",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "projection": {
      "domain": "voice-assets",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "LegacyFacet.LegacyPlanCreated",
    "facetName": "LegacyFacet",
    "wrapperKey": "LegacyPlanCreated",
    "domain": "voice-assets",
    "operationId": "legacyPlanCreatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/events/legacy-plan-created/query",
    "notes": "LegacyFacet.LegacyPlanCreated",
    "eventName": "LegacyPlanCreated",
    "signature": "LegacyPlanCreated(address,uint256,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "beneficiaryCount",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "projection": {
      "domain": "voice-assets",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "VoiceAssetFacet.Approval",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "Approval",
    "domain": "voice-assets",
    "operationId": "approvalEventQuery",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/events/approval/query",
    "notes": "VoiceAssetFacet.Approval",
    "eventName": "Approval",
    "signature": "Approval(address,address,uint256)",
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
        "name": "approved",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "voice",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "voice_assets",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "VoiceAssetFacet.ApprovalForAll",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "ApprovalForAll",
    "domain": "voice-assets",
    "operationId": "approvalForAllEventQuery",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/events/approval-for-all/query",
    "notes": "VoiceAssetFacet.ApprovalForAll",
    "eventName": "ApprovalForAll",
    "signature": "ApprovalForAll(address,address,bool)",
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
        "name": "operator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "approved",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "projection": {
      "domain": "voice",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "voice_assets",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "VoiceAssetFacet.DefaultPlatformFeeUpdated",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "DefaultPlatformFeeUpdated",
    "domain": "voice-assets",
    "operationId": "defaultPlatformFeeUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/events/default-platform-fee-updated/query",
    "notes": "VoiceAssetFacet.DefaultPlatformFeeUpdated",
    "eventName": "DefaultPlatformFeeUpdated",
    "signature": "DefaultPlatformFeeUpdated(uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "newFee",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "voice",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "voice_assets",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "VoiceAssetFacet.DefaultRoyaltyRateUpdated",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "DefaultRoyaltyRateUpdated",
    "domain": "voice-assets",
    "operationId": "defaultRoyaltyRateUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/events/default-royalty-rate-updated/query",
    "notes": "VoiceAssetFacet.DefaultRoyaltyRateUpdated",
    "eventName": "DefaultRoyaltyRateUpdated",
    "signature": "DefaultRoyaltyRateUpdated(uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "newRate",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "voice",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "voice_assets",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "VoiceAssetFacet.RegistrationPauseChanged",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "RegistrationPauseChanged",
    "domain": "voice-assets",
    "operationId": "registrationPauseChangedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/events/registration-pause-changed/query",
    "notes": "VoiceAssetFacet.RegistrationPauseChanged",
    "eventName": "RegistrationPauseChanged",
    "signature": "RegistrationPauseChanged(bool)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "paused",
        "type": "bool",
        "indexed": true,
        "internalType": "bool"
      }
    ],
    "projection": {
      "domain": "voice",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "voice_assets",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "VoiceAssetFacet.RoyaltyPaid",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "RoyaltyPaid",
    "domain": "voice-assets",
    "operationId": "royaltyPaidEventQuery",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/events/royalty-paid/query",
    "notes": "VoiceAssetFacet.RoyaltyPaid",
    "eventName": "RoyaltyPaid",
    "signature": "RoyaltyPaid(bytes32,address,uint256,bytes32)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "voiceHash",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "user",
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
        "name": "usageReference",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      }
    ],
    "projection": {
      "domain": "voice",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "voice_assets",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "VoiceAssetFacet.RoyaltyRateChanged",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "RoyaltyRateChanged",
    "domain": "voice-assets",
    "operationId": "royaltyRateChangedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/events/royalty-rate-changed/query",
    "notes": "VoiceAssetFacet.RoyaltyRateChanged",
    "eventName": "RoyaltyRateChanged",
    "signature": "RoyaltyRateChanged(bytes32,uint256,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "voiceHash",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "oldRate",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "newRate",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "voice",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "voice_assets",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "VoiceAssetFacet.RoyaltyRateUpdated",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "RoyaltyRateUpdated",
    "domain": "voice-assets",
    "operationId": "royaltyRateUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/events/royalty-rate-updated/query",
    "notes": "VoiceAssetFacet.RoyaltyRateUpdated",
    "eventName": "RoyaltyRateUpdated",
    "signature": "RoyaltyRateUpdated(bytes32,address,uint256,uint256,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "voiceHash",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "updater",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "oldRate",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "newRate",
        "type": "uint256",
        "indexed": false,
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
      "domain": "voice",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "voice_assets",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "VoiceAssetFacet.Transfer",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "Transfer",
    "domain": "voice-assets",
    "operationId": "transferEventQuery",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/events/transfer/query",
    "notes": "VoiceAssetFacet.Transfer",
    "eventName": "Transfer",
    "signature": "Transfer(address,address,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "from",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "to",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "voice",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "voice_assets",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "VoiceAssetFacet.UserAuthorizationChanged",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "UserAuthorizationChanged",
    "domain": "voice-assets",
    "operationId": "userAuthorizationChangedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/events/user-authorization-changed/query",
    "notes": "VoiceAssetFacet.UserAuthorizationChanged",
    "eventName": "UserAuthorizationChanged",
    "signature": "UserAuthorizationChanged(bytes32,address,bool)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "voiceHash",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "user",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "authorized",
        "type": "bool",
        "indexed": true,
        "internalType": "bool"
      }
    ],
    "projection": {
      "domain": "voice",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "voice_assets",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "VoiceAssetFacet.VoiceAssetLockChanged",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "VoiceAssetLockChanged",
    "domain": "voice-assets",
    "operationId": "voiceAssetLockChangedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/events/voice-asset-lock-changed/query",
    "notes": "VoiceAssetFacet.VoiceAssetLockChanged",
    "eventName": "VoiceAssetLockChanged",
    "signature": "VoiceAssetLockChanged(bytes32,bool)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "voiceHash",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "locked",
        "type": "bool",
        "indexed": true,
        "internalType": "bool"
      }
    ],
    "projection": {
      "domain": "voice",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "voice_assets",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "VoiceAssetFacet.VoiceAssetRegistered",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "VoiceAssetRegistered",
    "domain": "voice-assets",
    "operationId": "voiceAssetRegisteredEventQuery",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/events/voice-asset-registered/query",
    "notes": "VoiceAssetFacet.VoiceAssetRegistered",
    "eventName": "VoiceAssetRegistered",
    "signature": "VoiceAssetRegistered(bytes32,address,string,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "voiceHash",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "owner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "ipfsHash",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "royaltyRate",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "voice",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "voice_assets",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "VoiceAssetFacet.VoiceAssetUsed",
    "facetName": "VoiceAssetFacet",
    "wrapperKey": "VoiceAssetUsed",
    "domain": "voice-assets",
    "operationId": "voiceAssetUsedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/events/voice-asset-used/query",
    "notes": "VoiceAssetFacet.VoiceAssetUsed",
    "eventName": "VoiceAssetUsed",
    "signature": "VoiceAssetUsed(bytes32,bytes32,address)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "voiceHash",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "usageRef",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "user",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "projection": {
      "domain": "voice",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "voice_assets",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "VoiceMetadataFacet.AnalysisVersionUpdated",
    "facetName": "VoiceMetadataFacet",
    "wrapperKey": "AnalysisVersionUpdated",
    "domain": "voice-assets",
    "operationId": "analysisVersionUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/events/analysis-version-updated/query",
    "notes": "VoiceMetadataFacet.AnalysisVersionUpdated",
    "eventName": "AnalysisVersionUpdated",
    "signature": "AnalysisVersionUpdated(string,string)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "oldVersion",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "newVersion",
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
    "key": "VoiceMetadataFacet.BasicAcousticFeaturesUpdated",
    "facetName": "VoiceMetadataFacet",
    "wrapperKey": "BasicAcousticFeaturesUpdated",
    "domain": "voice-assets",
    "operationId": "basicAcousticFeaturesUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/events/basic-acoustic-features-updated/query",
    "notes": "VoiceMetadataFacet.BasicAcousticFeaturesUpdated",
    "eventName": "BasicAcousticFeaturesUpdated",
    "signature": "BasicAcousticFeaturesUpdated(bytes32,uint256,uint256,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "voiceHash",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "pitch",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "volume",
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
      "domain": "rawOnly",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "VoiceMetadataFacet.ClassificationCategoryUpdated",
    "facetName": "VoiceMetadataFacet",
    "wrapperKey": "ClassificationCategoryUpdated",
    "domain": "voice-assets",
    "operationId": "classificationCategoryUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/events/classification-category-updated/query",
    "notes": "VoiceMetadataFacet.ClassificationCategoryUpdated",
    "eventName": "ClassificationCategoryUpdated",
    "signature": "ClassificationCategoryUpdated(bytes32,string,uint256,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "voiceHash",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "category",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "classificationsCount",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
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
    "key": "VoiceMetadataFacet.GeographicDataUpdated",
    "facetName": "VoiceMetadataFacet",
    "wrapperKey": "GeographicDataUpdated",
    "domain": "voice-assets",
    "operationId": "geographicDataUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/events/geographic-data-updated/query",
    "notes": "VoiceMetadataFacet.GeographicDataUpdated",
    "eventName": "GeographicDataUpdated",
    "signature": "GeographicDataUpdated(bytes32,string,string,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "voiceHash",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "region",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "country",
        "type": "string",
        "indexed": false,
        "internalType": "string"
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
    "key": "VoiceMetadataFacet.VoiceClassificationsUpdated",
    "facetName": "VoiceMetadataFacet",
    "wrapperKey": "VoiceClassificationsUpdated",
    "domain": "voice-assets",
    "operationId": "voiceClassificationsUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/voice-assets/events/voice-classifications-updated/query",
    "notes": "VoiceMetadataFacet.VoiceClassificationsUpdated",
    "eventName": "VoiceClassificationsUpdated",
    "signature": "VoiceClassificationsUpdated(bytes32,string,string[],uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "voiceHash",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "analysisVersion",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "categories",
        "type": "string[]",
        "indexed": false,
        "internalType": "string[]"
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
