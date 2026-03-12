import type { HttpEventDefinition, HttpMethodDefinition } from "../../../../shared/route-types.js";

export const licensingMethodDefinitions: HttpMethodDefinition[] = [
  {
    "key": "RightsFacet.addCollaborator",
    "facetName": "RightsFacet",
    "wrapperKey": "addCollaborator",
    "domain": "licensing",
    "resource": "rights",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/licensing/commands/add-collaborator",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "body",
          "field": "voiceHash"
        },
        {
          "name": "collaborator",
          "source": "body",
          "field": "collaborator"
        },
        {
          "name": "share",
          "source": "body",
          "field": "share"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "addCollaborator",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "RightsFacet.addCollaborator",
    "methodName": "addCollaborator",
    "signature": "addCollaborator(bytes32,address,uint256)",
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
        "internalType": "address",
        "name": "collaborator",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "share",
        "type": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "RightsFacet.getCategoryContracts",
    "facetName": "RightsFacet",
    "wrapperKey": "getCategoryContracts",
    "domain": "licensing",
    "resource": "rights",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/licensing/queries/get-category-contracts",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "category",
          "source": "query",
          "field": "category"
        }
      ]
    },
    "outputShape": {
      "kind": "array"
    },
    "operationId": "getCategoryContracts",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "RightsFacet.getCategoryContracts",
    "methodName": "getCategoryContracts",
    "signature": "getCategoryContracts(string)",
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
        "internalType": "string",
        "name": "category",
        "type": "string"
      }
    ],
    "outputs": [
      {
        "internalType": "string[]",
        "name": "rightIds",
        "type": "string[]"
      }
    ]
  },
  {
    "key": "RightsFacet.getCollaborator",
    "facetName": "RightsFacet",
    "wrapperKey": "getCollaborator",
    "domain": "licensing",
    "resource": "rights",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/licensing/queries/get-collaborator",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "query",
          "field": "voiceHash"
        },
        {
          "name": "collaborator",
          "source": "query",
          "field": "collaborator"
        }
      ]
    },
    "outputShape": {
      "kind": "tuple"
    },
    "operationId": "getCollaborator",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "RightsFacet.getCollaborator",
    "methodName": "getCollaborator",
    "signature": "getCollaborator(bytes32,address)",
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
      },
      {
        "internalType": "address",
        "name": "collaborator",
        "type": "address"
      }
    ],
    "outputs": [
      {
        "internalType": "bool",
        "name": "isActive",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "share",
        "type": "uint256"
      }
    ]
  },
  {
    "key": "RightsFacet.getRightCategory",
    "facetName": "RightsFacet",
    "wrapperKey": "getRightCategory",
    "domain": "licensing",
    "resource": "rights",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/licensing/queries/get-right-category",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "rightId",
          "source": "query",
          "field": "rightId"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "getRightCategory",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "RightsFacet.getRightCategory",
    "methodName": "getRightCategory",
    "signature": "getRightCategory(string)",
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
        "internalType": "string",
        "name": "rightId",
        "type": "string"
      }
    ],
    "outputs": [
      {
        "internalType": "string",
        "name": "category",
        "type": "string"
      }
    ]
  },
  {
    "key": "RightsFacet.getRightContract",
    "facetName": "RightsFacet",
    "wrapperKey": "getRightContract",
    "domain": "licensing",
    "resource": "rights",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/licensing/queries/get-right-contract",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "rightId",
          "source": "query",
          "field": "rightId"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "getRightContract",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "RightsFacet.getRightContract",
    "methodName": "getRightContract",
    "signature": "getRightContract(string)",
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
        "internalType": "string",
        "name": "rightId",
        "type": "string"
      }
    ],
    "outputs": [
      {
        "internalType": "address",
        "name": "contractAddress",
        "type": "address"
      }
    ]
  },
  {
    "key": "RightsFacet.getRightsGroup",
    "facetName": "RightsFacet",
    "wrapperKey": "getRightsGroup",
    "domain": "licensing",
    "resource": "rights",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/licensing/queries/get-rights-group",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "query",
          "field": "voiceHash"
        },
        {
          "name": "groupIndex",
          "source": "query",
          "field": "groupIndex"
        }
      ]
    },
    "outputShape": {
      "kind": "object"
    },
    "operationId": "getRightsGroup",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "RightsFacet.getRightsGroup",
    "methodName": "getRightsGroup",
    "signature": "getRightsGroup(bytes32,uint256)",
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
      },
      {
        "internalType": "uint256",
        "name": "groupIndex",
        "type": "uint256"
      }
    ],
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "name",
            "type": "string"
          },
          {
            "components": [
              {
                "internalType": "string",
                "name": "rightType",
                "type": "string"
              },
              {
                "internalType": "uint256",
                "name": "startTime",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "endTime",
                "type": "uint256"
              },
              {
                "internalType": "bool",
                "name": "transferable",
                "type": "bool"
              },
              {
                "internalType": "string[]",
                "name": "restrictions",
                "type": "string[]"
              },
              {
                "internalType": "bool",
                "name": "revocable",
                "type": "bool"
              }
            ],
            "internalType": "struct RightsStorage.UsageRight[]",
            "name": "rights",
            "type": "tuple[]"
          },
          {
            "internalType": "address[]",
            "name": "members",
            "type": "address[]"
          },
          {
            "internalType": "bool",
            "name": "active",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "createdAt",
            "type": "uint256"
          }
        ],
        "internalType": "struct RightsStorage.RightsGroup",
        "name": "group",
        "type": "tuple"
      }
    ]
  },
  {
    "key": "RightsFacet.getUserRights",
    "facetName": "RightsFacet",
    "wrapperKey": "getUserRights",
    "domain": "licensing",
    "resource": "rights",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/licensing/queries/get-user-rights",
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
      "kind": "array"
    },
    "operationId": "getUserRights",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "RightsFacet.getUserRights",
    "methodName": "getUserRights",
    "signature": "getUserRights(bytes32,address)",
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
      },
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "rightType",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "startTime",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "endTime",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "transferable",
            "type": "bool"
          },
          {
            "internalType": "string[]",
            "name": "restrictions",
            "type": "string[]"
          },
          {
            "internalType": "bool",
            "name": "revocable",
            "type": "bool"
          }
        ],
        "internalType": "struct RightsStorage.UsageRight[]",
        "name": "rights",
        "type": "tuple[]"
      }
    ]
  },
  {
    "key": "RightsFacet.registerRightContract",
    "facetName": "RightsFacet",
    "wrapperKey": "registerRightContract",
    "domain": "licensing",
    "resource": "rights",
    "classification": "create",
    "httpMethod": "POST",
    "path": "/v1/licensing/rights",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "category",
          "source": "body",
          "field": "category"
        },
        {
          "name": "contractAddress",
          "source": "body",
          "field": "contractAddress"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "registerRightContract",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "RightsFacet.registerRightContract",
    "methodName": "registerRightContract",
    "signature": "registerRightContract(string,address)",
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
        "name": "category",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "contractAddress",
        "type": "address"
      }
    ],
    "outputs": [
      {
        "internalType": "string",
        "name": "rightId",
        "type": "string"
      }
    ]
  },
  {
    "key": "RightsFacet.removeCollaborator",
    "facetName": "RightsFacet",
    "wrapperKey": "removeCollaborator",
    "domain": "licensing",
    "resource": "rights",
    "classification": "delete",
    "httpMethod": "DELETE",
    "path": "/v1/licensing/commands/remove-collaborator",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "body",
          "field": "voiceHash"
        },
        {
          "name": "collaborator",
          "source": "body",
          "field": "collaborator"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "removeCollaborator",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "RightsFacet.removeCollaborator",
    "methodName": "removeCollaborator",
    "signature": "removeCollaborator(bytes32,address)",
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
        "internalType": "address",
        "name": "collaborator",
        "type": "address"
      }
    ],
    "outputs": []
  },
  {
    "key": "RightsFacet.revokeRight",
    "facetName": "RightsFacet",
    "wrapperKey": "revokeRight",
    "domain": "licensing",
    "resource": "rights",
    "classification": "delete",
    "httpMethod": "DELETE",
    "path": "/v1/licensing/commands/revoke-right",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "body",
          "field": "voiceHash"
        },
        {
          "name": "holder",
          "source": "body",
          "field": "holder"
        },
        {
          "name": "rightType",
          "source": "body",
          "field": "rightType"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "revokeRight",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "RightsFacet.revokeRight",
    "methodName": "revokeRight",
    "signature": "revokeRight(bytes32,address,string)",
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
        "internalType": "address",
        "name": "holder",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "rightType",
        "type": "string"
      }
    ],
    "outputs": []
  },
  {
    "key": "RightsFacet.rightIdExists",
    "facetName": "RightsFacet",
    "wrapperKey": "rightIdExists",
    "domain": "licensing",
    "resource": "rights",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/licensing/queries/right-id-exists",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "rightId",
          "source": "query",
          "field": "rightId"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "rightIdExists",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "RightsFacet.rightIdExists",
    "methodName": "rightIdExists",
    "signature": "rightIdExists(string)",
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
        "internalType": "string",
        "name": "rightId",
        "type": "string"
      }
    ],
    "outputs": [
      {
        "internalType": "bool",
        "name": "exists",
        "type": "bool"
      }
    ]
  },
  {
    "key": "RightsFacet.updateCollaboratorShare",
    "facetName": "RightsFacet",
    "wrapperKey": "updateCollaboratorShare",
    "domain": "licensing",
    "resource": "rights",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/licensing/commands/update-collaborator-share",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "body",
          "field": "voiceHash"
        },
        {
          "name": "collaborator",
          "source": "body",
          "field": "collaborator"
        },
        {
          "name": "newShare",
          "source": "body",
          "field": "newShare"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "updateCollaboratorShare",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "RightsFacet.updateCollaboratorShare",
    "methodName": "updateCollaboratorShare",
    "signature": "updateCollaboratorShare(bytes32,address,uint256)",
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
        "internalType": "address",
        "name": "collaborator",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "newShare",
        "type": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "RightsFacet.updateRightContract",
    "facetName": "RightsFacet",
    "wrapperKey": "updateRightContract",
    "domain": "licensing",
    "resource": "rights",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/licensing/commands/update-right-contract",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "rightId",
          "source": "body",
          "field": "rightId"
        },
        {
          "name": "newContractAddress",
          "source": "body",
          "field": "newContractAddress"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "updateRightContract",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "RightsFacet.updateRightContract",
    "methodName": "updateRightContract",
    "signature": "updateRightContract(string,address)",
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
        "name": "rightId",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "newContractAddress",
        "type": "address"
      }
    ],
    "outputs": []
  },
  {
    "key": "VoiceLicenseFacet.createLicenseWithMarketplace",
    "facetName": "VoiceLicenseFacet",
    "wrapperKey": "createLicenseWithMarketplace",
    "domain": "licensing",
    "resource": "licenses",
    "classification": "create",
    "httpMethod": "POST",
    "path": "/v1/licensing/licenses/create-license-with-marketplace",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "body",
          "field": "voiceHash"
        },
        {
          "name": "templateHash",
          "source": "body",
          "field": "templateHash"
        },
        {
          "name": "price",
          "source": "body",
          "field": "price"
        },
        {
          "name": "duration",
          "source": "body",
          "field": "duration"
        },
        {
          "name": "transferable",
          "source": "body",
          "field": "transferable"
        },
        {
          "name": "terms",
          "source": "body",
          "field": "terms"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "createLicenseWithMarketplace",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VoiceLicenseFacet.createLicenseWithMarketplace",
    "methodName": "createLicenseWithMarketplace",
    "signature": "createLicenseWithMarketplace(bytes32,bytes32,uint256,uint256,bool,string)",
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
        "name": "templateHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "price",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "duration",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "transferable",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "terms",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": []
  },
  {
    "key": "VoiceLicenseFacet.getLicense",
    "facetName": "VoiceLicenseFacet",
    "wrapperKey": "getLicense",
    "domain": "licensing",
    "resource": "licenses",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/licensing/queries/get-license",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "query",
          "field": "voiceHash"
        },
        {
          "name": "licensee",
          "source": "query",
          "field": "licensee"
        }
      ]
    },
    "outputShape": {
      "kind": "object"
    },
    "operationId": "getLicense",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceLicenseFacet.getLicense",
    "methodName": "getLicense",
    "signature": "getLicense(bytes32,address)",
    "category": "read",
    "mutability": "view",
    "liveRequired": false,
    "cacheClass": "queryJoin",
    "cacheTtlSeconds": 30,
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
        "name": "licensee",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "license",
        "type": "tuple",
        "internalType": "struct VoiceLicenseStorage.License",
        "components": [
          {
            "name": "licensee",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "isActive",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "transferable",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "startTime",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "endTime",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "maxUses",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "usageCount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "licenseFee",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "usageFee",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "templateHash",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "termsHash",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "rights",
            "type": "string[]",
            "internalType": "string[]"
          },
          {
            "name": "restrictions",
            "type": "string[]",
            "internalType": "string[]"
          },
          {
            "name": "usageRefs",
            "type": "bytes32[]",
            "internalType": "bytes32[]"
          }
        ]
      }
    ]
  },
  {
    "key": "VoiceLicenseFacet.getLicensees",
    "facetName": "VoiceLicenseFacet",
    "wrapperKey": "getLicensees",
    "domain": "licensing",
    "resource": "licenses",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/licensing/queries/get-licensees",
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
    "operationId": "getLicensees",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceLicenseFacet.getLicensees",
    "methodName": "getLicensees",
    "signature": "getLicensees(bytes32)",
    "category": "read",
    "mutability": "view",
    "liveRequired": false,
    "cacheClass": "queryJoin",
    "cacheTtlSeconds": 30,
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
        "name": "licensees",
        "type": "address[]",
        "internalType": "address[]"
      }
    ]
  },
  {
    "key": "VoiceLicenseFacet.getLicenseHistory",
    "facetName": "VoiceLicenseFacet",
    "wrapperKey": "getLicenseHistory",
    "domain": "licensing",
    "resource": "licenses",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/licensing/queries/get-license-history",
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
    "operationId": "getLicenseHistory",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceLicenseFacet.getLicenseHistory",
    "methodName": "getLicenseHistory",
    "signature": "getLicenseHistory(bytes32)",
    "category": "read",
    "mutability": "view",
    "liveRequired": false,
    "cacheClass": "queryJoin",
    "cacheTtlSeconds": 30,
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
        "name": "licenseeCount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "totalRevenue",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "activeGrants",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "key": "VoiceLicenseFacet.getLicenseTerms",
    "facetName": "VoiceLicenseFacet",
    "wrapperKey": "getLicenseTerms",
    "domain": "licensing",
    "resource": "licenses",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/licensing/queries/get-license-terms",
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
    "operationId": "getLicenseTerms",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceLicenseFacet.getLicenseTerms",
    "methodName": "getLicenseTerms",
    "signature": "getLicenseTerms(bytes32)",
    "category": "read",
    "mutability": "view",
    "liveRequired": false,
    "cacheClass": "queryJoin",
    "cacheTtlSeconds": 30,
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
        "name": "terms",
        "type": "tuple",
        "internalType": "struct VoiceLicenseStorage.LicenseTerms",
        "components": [
          {
            "name": "licenseHash",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "duration",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "price",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "maxUses",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "transferable",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "rights",
            "type": "string[]",
            "internalType": "string[]"
          },
          {
            "name": "restrictions",
            "type": "string[]",
            "internalType": "string[]"
          }
        ]
      }
    ]
  },
  {
    "key": "VoiceLicenseFacet.getPendingRevenue",
    "facetName": "VoiceLicenseFacet",
    "wrapperKey": "getPendingRevenue",
    "domain": "licensing",
    "resource": "licenses",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/licensing/queries/get-pending-revenue",
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
    "operationId": "getPendingRevenue",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceLicenseFacet.getPendingRevenue",
    "methodName": "getPendingRevenue",
    "signature": "getPendingRevenue(address)",
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
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "key": "VoiceLicenseFacet.getUsageCount",
    "facetName": "VoiceLicenseFacet",
    "wrapperKey": "getUsageCount",
    "domain": "licensing",
    "resource": "licenses",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/licensing/queries/get-usage-count",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "query",
          "field": "voiceHash"
        },
        {
          "name": "licensee",
          "source": "query",
          "field": "licensee"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "getUsageCount",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceLicenseFacet.getUsageCount",
    "methodName": "getUsageCount",
    "signature": "getUsageCount(bytes32,address)",
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
        "name": "licensee",
        "type": "address",
        "internalType": "address"
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
    "key": "VoiceLicenseFacet.issueLicense",
    "facetName": "VoiceLicenseFacet",
    "wrapperKey": "issueLicense",
    "domain": "licensing",
    "resource": "licenses",
    "classification": "create",
    "httpMethod": "POST",
    "path": "/v1/licensing/licenses/issue-license",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "body",
          "field": "voiceHash"
        },
        {
          "name": "licensee",
          "source": "body",
          "field": "licensee"
        },
        {
          "name": "templateHash",
          "source": "body",
          "field": "templateHash"
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
    "operationId": "issueLicense",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VoiceLicenseFacet.issueLicense",
    "methodName": "issueLicense",
    "signature": "issueLicense(bytes32,address,bytes32,uint256)",
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
        "name": "licensee",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "templateHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "duration",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "VoiceLicenseFacet.isUsageRefUsed",
    "facetName": "VoiceLicenseFacet",
    "wrapperKey": "isUsageRefUsed",
    "domain": "licensing",
    "resource": "licenses",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/licensing/queries/is-usage-ref-used",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "query",
          "field": "voiceHash"
        },
        {
          "name": "usageRef",
          "source": "query",
          "field": "usageRef"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "isUsageRefUsed",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceLicenseFacet.isUsageRefUsed",
    "methodName": "isUsageRefUsed",
    "signature": "isUsageRefUsed(bytes32,bytes32)",
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
        "name": "usageRef",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "used",
        "type": "bool",
        "internalType": "bool"
      }
    ]
  },
  {
    "key": "VoiceLicenseFacet.recordLicensedUsage",
    "facetName": "VoiceLicenseFacet",
    "wrapperKey": "recordLicensedUsage",
    "domain": "licensing",
    "resource": "licenses",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/licensing/commands/record-licensed-usage",
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
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "recordLicensedUsage",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VoiceLicenseFacet.recordLicensedUsage",
    "methodName": "recordLicensedUsage",
    "signature": "recordLicensedUsage(bytes32,bytes32)",
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
    "key": "VoiceLicenseFacet.revokeLicense",
    "facetName": "VoiceLicenseFacet",
    "wrapperKey": "revokeLicense",
    "domain": "licensing",
    "resource": "licenses",
    "classification": "delete",
    "httpMethod": "DELETE",
    "path": "/v1/licensing/commands/revoke-license",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "body",
          "field": "voiceHash"
        },
        {
          "name": "templateHash",
          "source": "body",
          "field": "templateHash"
        },
        {
          "name": "licensee",
          "source": "body",
          "field": "licensee"
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
    "operationId": "revokeLicense",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VoiceLicenseFacet.revokeLicense",
    "methodName": "revokeLicense",
    "signature": "revokeLicense(bytes32,bytes32,address,string)",
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
        "name": "templateHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "licensee",
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
    "key": "VoiceLicenseFacet.transferLicense",
    "facetName": "VoiceLicenseFacet",
    "wrapperKey": "transferLicense",
    "domain": "licensing",
    "resource": "licenses",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/licensing/commands/transfer-license",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "body",
          "field": "voiceHash"
        },
        {
          "name": "templateHash",
          "source": "body",
          "field": "templateHash"
        },
        {
          "name": "to",
          "source": "body",
          "field": "to"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "transferLicense",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VoiceLicenseFacet.transferLicense",
    "methodName": "transferLicense",
    "signature": "transferLicense(bytes32,bytes32,address)",
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
        "name": "templateHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": []
  },
  {
    "key": "VoiceLicenseFacet.updateLicenseTerms",
    "facetName": "VoiceLicenseFacet",
    "wrapperKey": "updateLicenseTerms",
    "domain": "licensing",
    "resource": "licenses",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/licensing/commands/update-license-terms",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "body",
          "field": "voiceHash"
        },
        {
          "name": "templateHash",
          "source": "body",
          "field": "templateHash"
        },
        {
          "name": "newPrice",
          "source": "body",
          "field": "newPrice"
        },
        {
          "name": "newDuration",
          "source": "body",
          "field": "newDuration"
        },
        {
          "name": "newTerms",
          "source": "body",
          "field": "newTerms"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "updateLicenseTerms",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VoiceLicenseFacet.updateLicenseTerms",
    "methodName": "updateLicenseTerms",
    "signature": "updateLicenseTerms(bytes32,bytes32,uint256,uint256,string)",
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
        "name": "templateHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "newPrice",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "newDuration",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "newTerms",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": []
  },
  {
    "key": "VoiceLicenseFacet.validateLicense",
    "facetName": "VoiceLicenseFacet",
    "wrapperKey": "validateLicense",
    "domain": "licensing",
    "resource": "licenses",
    "classification": "read",
    "httpMethod": "POST",
    "path": "/v1/licensing/queries/validate-license",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "body",
          "field": "voiceHash"
        },
        {
          "name": "licensee",
          "source": "body",
          "field": "licensee"
        },
        {
          "name": "templateHash",
          "source": "body",
          "field": "templateHash"
        }
      ]
    },
    "outputShape": {
      "kind": "tuple"
    },
    "operationId": "validateLicense",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceLicenseFacet.validateLicense",
    "methodName": "validateLicense",
    "signature": "validateLicense(bytes32,address,bytes32)",
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
        "name": "licensee",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "templateHash",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "isValid",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "expiryTime",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "key": "VoiceLicenseFacet.withdrawLicenseRevenue",
    "facetName": "VoiceLicenseFacet",
    "wrapperKey": "withdrawLicenseRevenue",
    "domain": "licensing",
    "resource": "licenses",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/licensing/commands/withdraw-license-revenue",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "withdrawLicenseRevenue",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VoiceLicenseFacet.withdrawLicenseRevenue",
    "methodName": "withdrawLicenseRevenue",
    "signature": "withdrawLicenseRevenue()",
    "category": "write",
    "mutability": "nonpayable",
    "liveRequired": true,
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
    "key": "VoiceLicenseTemplateFacet.getCreatorTemplates",
    "facetName": "VoiceLicenseTemplateFacet",
    "wrapperKey": "getCreatorTemplates",
    "domain": "licensing",
    "resource": "license-templates",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/licensing/queries/get-creator-templates",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "creator",
          "source": "query",
          "field": "creator"
        }
      ]
    },
    "outputShape": {
      "kind": "array"
    },
    "operationId": "getCreatorTemplates",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceLicenseTemplateFacet.getCreatorTemplates",
    "methodName": "getCreatorTemplates",
    "signature": "getCreatorTemplates(address)",
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
        "name": "creator",
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
    "key": "VoiceLicenseTemplateFacet.getTemplate",
    "facetName": "VoiceLicenseTemplateFacet",
    "wrapperKey": "getTemplate",
    "domain": "licensing",
    "resource": "license-templates",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/licensing/queries/get-template",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "templateHash",
          "source": "query",
          "field": "templateHash"
        }
      ]
    },
    "outputShape": {
      "kind": "object"
    },
    "operationId": "getTemplate",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceLicenseTemplateFacet.getTemplate",
    "methodName": "getTemplate",
    "signature": "getTemplate(bytes32)",
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
        "name": "templateHash",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct VoiceLicenseStorage.LicenseTemplate",
        "components": [
          {
            "name": "creator",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "isActive",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "transferable",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "createdAt",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "updatedAt",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "defaultDuration",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "defaultPrice",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "maxUses",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "name",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "description",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "defaultRights",
            "type": "string[]",
            "internalType": "string[]"
          },
          {
            "name": "defaultRestrictions",
            "type": "string[]",
            "internalType": "string[]"
          },
          {
            "name": "terms",
            "type": "tuple",
            "internalType": "struct VoiceLicenseStorage.LicenseTerms",
            "components": [
              {
                "name": "licenseHash",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "duration",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "price",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "maxUses",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "transferable",
                "type": "bool",
                "internalType": "bool"
              },
              {
                "name": "rights",
                "type": "string[]",
                "internalType": "string[]"
              },
              {
                "name": "restrictions",
                "type": "string[]",
                "internalType": "string[]"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "key": "VoiceLicenseTemplateFacet.isTemplateActive",
    "facetName": "VoiceLicenseTemplateFacet",
    "wrapperKey": "isTemplateActive",
    "domain": "licensing",
    "resource": "license-templates",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/licensing/queries/is-template-active",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "templateHash",
          "source": "query",
          "field": "templateHash"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "isTemplateActive",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceLicenseTemplateFacet.isTemplateActive",
    "methodName": "isTemplateActive",
    "signature": "isTemplateActive(bytes32)",
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
        "name": "templateHash",
        "type": "bytes32",
        "internalType": "bytes32"
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
    "key": "VoiceLicenseTemplateFacet.setTemplateStatus",
    "facetName": "VoiceLicenseTemplateFacet",
    "wrapperKey": "setTemplateStatus",
    "domain": "licensing",
    "resource": "license-templates",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/licensing/commands/set-template-status",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "templateHash",
          "source": "body",
          "field": "templateHash"
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
    "operationId": "setTemplateStatus",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VoiceLicenseTemplateFacet.setTemplateStatus",
    "methodName": "setTemplateStatus",
    "signature": "setTemplateStatus(bytes32,bool)",
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
        "name": "templateHash",
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
  }
] as HttpMethodDefinition[];
export const licensingEventDefinitions: HttpEventDefinition[] = [
  {
    "key": "RightsFacet.CollaboratorUpdated",
    "facetName": "RightsFacet",
    "wrapperKey": "CollaboratorUpdated",
    "domain": "licensing",
    "operationId": "collaboratorUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/licensing/events/collaborator-updated/query",
    "notes": "RightsFacet.CollaboratorUpdated",
    "eventName": "CollaboratorUpdated",
    "signature": "CollaboratorUpdated(bytes32,address,uint256,bool)",
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
        "name": "collaborator",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "share",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "isActive",
        "type": "bool"
      }
    ],
    "projection": {
      "domain": "licensing",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "RightsFacet.RightContractRegistered",
    "facetName": "RightsFacet",
    "wrapperKey": "RightContractRegistered",
    "domain": "licensing",
    "operationId": "rightContractRegisteredEventQuery",
    "httpMethod": "POST",
    "path": "/v1/licensing/events/right-contract-registered/query",
    "notes": "RightsFacet.RightContractRegistered",
    "eventName": "RightContractRegistered",
    "signature": "RightContractRegistered(string,string,address,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "string",
        "name": "category",
        "type": "string"
      },
      {
        "indexed": true,
        "internalType": "string",
        "name": "rightId",
        "type": "string"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "contractAddress",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "projection": {
      "domain": "licensing",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "RightsFacet.RightContractUpdated",
    "facetName": "RightsFacet",
    "wrapperKey": "RightContractUpdated",
    "domain": "licensing",
    "operationId": "rightContractUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/licensing/events/right-contract-updated/query",
    "notes": "RightsFacet.RightContractUpdated",
    "eventName": "RightContractUpdated",
    "signature": "RightContractUpdated(string,address,address,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "string",
        "name": "rightId",
        "type": "string"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "oldContract",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newContract",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "projection": {
      "domain": "licensing",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "RightsFacet.RightGranted",
    "facetName": "RightsFacet",
    "wrapperKey": "RightGranted",
    "domain": "licensing",
    "operationId": "rightGrantedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/licensing/events/right-granted/query",
    "notes": "RightsFacet.RightGranted",
    "eventName": "RightGranted",
    "signature": "RightGranted(bytes32,address,string,uint256,uint256)",
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
        "name": "grantee",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "rightType",
        "type": "string"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "startTime",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "endTime",
        "type": "uint256"
      }
    ],
    "projection": {
      "domain": "licensing",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "RightsFacet.RightRevoked",
    "facetName": "RightsFacet",
    "wrapperKey": "RightRevoked",
    "domain": "licensing",
    "operationId": "rightRevokedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/licensing/events/right-revoked/query",
    "notes": "RightsFacet.RightRevoked",
    "eventName": "RightRevoked",
    "signature": "RightRevoked(bytes32,address,string,uint256)",
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
        "name": "holder",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "rightType",
        "type": "string"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "projection": {
      "domain": "licensing",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "RightsFacet.RightsGroupCreated",
    "facetName": "RightsFacet",
    "wrapperKey": "RightsGroupCreated",
    "domain": "licensing",
    "operationId": "rightsGroupCreatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/licensing/events/rights-group-created/query",
    "notes": "RightsFacet.RightsGroupCreated",
    "eventName": "RightsGroupCreated",
    "signature": "RightsGroupCreated(bytes32,string,uint256,uint256)",
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
        "indexed": false,
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "memberCount",
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
      "domain": "licensing",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "VoiceLicenseFacet.Debug",
    "facetName": "VoiceLicenseFacet",
    "wrapperKey": "Debug",
    "domain": "licensing",
    "operationId": "debugEventQuery",
    "httpMethod": "POST",
    "path": "/v1/licensing/events/debug/query",
    "notes": "VoiceLicenseFacet.Debug",
    "eventName": "Debug",
    "signature": "Debug(string,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "message",
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
      "domain": "voice",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "voice_licenses",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "VoiceLicenseFacet.LicenseBatchGranted",
    "facetName": "VoiceLicenseFacet",
    "wrapperKey": "LicenseBatchGranted",
    "domain": "licensing",
    "operationId": "licenseBatchGrantedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/licensing/events/license-batch-granted/query",
    "notes": "VoiceLicenseFacet.LicenseBatchGranted",
    "eventName": "LicenseBatchGranted",
    "signature": "LicenseBatchGranted(bytes32,bytes32[],uint256)",
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
        "name": "templateHashes",
        "type": "bytes32[]",
        "indexed": false,
        "internalType": "bytes32[]"
      },
      {
        "name": "recipientCount",
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
          "table": "voice_licenses",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "VoiceLicenseFacet.LicenseCreated(bytes32,address,bytes32,uint256,uint256)",
    "facetName": "VoiceLicenseFacet",
    "wrapperKey": "LicenseCreated(bytes32,address,bytes32,uint256,uint256)",
    "domain": "licensing",
    "operationId": "licenseCreatedBytes32AddressBytes32Uint256Uint256EventQuery",
    "httpMethod": "POST",
    "path": "/v1/licensing/events/license-created/query/voice-license",
    "notes": "VoiceLicenseFacet.LicenseCreated(bytes32,address,bytes32,uint256,uint256)",
    "eventName": "LicenseCreated",
    "signature": "LicenseCreated(bytes32,address,bytes32,uint256,uint256)",
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
        "name": "licensee",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "termsHash",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "startTime",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "expiryTime",
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
          "table": "voice_licenses",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "VoiceLicenseFacet.LicenseCreated(bytes32,bytes32,address,uint256,uint256)",
    "facetName": "VoiceLicenseFacet",
    "wrapperKey": "LicenseCreated(bytes32,bytes32,address,uint256,uint256)",
    "domain": "licensing",
    "operationId": "licenseCreatedBytes32Bytes32AddressUint256Uint256EventQuery",
    "httpMethod": "POST",
    "path": "/v1/licensing/events/license-created/query/voice-license",
    "notes": "VoiceLicenseFacet.LicenseCreated(bytes32,bytes32,address,uint256,uint256)",
    "eventName": "LicenseCreated",
    "signature": "LicenseCreated(bytes32,bytes32,address,uint256,uint256)",
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
        "name": "templateHash",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "licensee",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "startTime",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "expiryTime",
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
          "table": "voice_licenses",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "VoiceLicenseFacet.LicenseEnded",
    "facetName": "VoiceLicenseFacet",
    "wrapperKey": "LicenseEnded",
    "domain": "licensing",
    "operationId": "licenseEndedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/licensing/events/license-ended/query",
    "notes": "VoiceLicenseFacet.LicenseEnded",
    "eventName": "LicenseEnded",
    "signature": "LicenseEnded(bytes32,bytes32,address,uint256)",
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
        "name": "templateHash",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "licensee",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "endTime",
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
          "table": "voice_licenses",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "VoiceLicenseFacet.LicenseRenewed",
    "facetName": "VoiceLicenseFacet",
    "wrapperKey": "LicenseRenewed",
    "domain": "licensing",
    "operationId": "licenseRenewedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/licensing/events/license-renewed/query",
    "notes": "VoiceLicenseFacet.LicenseRenewed",
    "eventName": "LicenseRenewed",
    "signature": "LicenseRenewed(bytes32,bytes32,address,uint256)",
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
        "name": "templateHash",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "licensee",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newExpiryTime",
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
          "table": "voice_licenses",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "VoiceLicenseFacet.LicenseRevoked",
    "facetName": "VoiceLicenseFacet",
    "wrapperKey": "LicenseRevoked",
    "domain": "licensing",
    "operationId": "licenseRevokedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/licensing/events/license-revoked/query",
    "notes": "VoiceLicenseFacet.LicenseRevoked",
    "eventName": "LicenseRevoked",
    "signature": "LicenseRevoked(bytes32,bytes32,address,string)",
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
        "name": "templateHash",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "licensee",
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
      "domain": "voice",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "voice_licenses",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "VoiceLicenseFacet.LicenseTermsUpdated",
    "facetName": "VoiceLicenseFacet",
    "wrapperKey": "LicenseTermsUpdated",
    "domain": "licensing",
    "operationId": "licenseTermsUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/licensing/events/license-terms-updated/query",
    "notes": "VoiceLicenseFacet.LicenseTermsUpdated",
    "eventName": "LicenseTermsUpdated",
    "signature": "LicenseTermsUpdated(bytes32,bytes32,uint256,uint256)",
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
        "name": "templateHash",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "price",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "duration",
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
          "table": "voice_licenses",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "VoiceLicenseFacet.LicenseTransferred",
    "facetName": "VoiceLicenseFacet",
    "wrapperKey": "LicenseTransferred",
    "domain": "licensing",
    "operationId": "licenseTransferredEventQuery",
    "httpMethod": "POST",
    "path": "/v1/licensing/events/license-transferred/query",
    "notes": "VoiceLicenseFacet.LicenseTransferred",
    "eventName": "LicenseTransferred",
    "signature": "LicenseTransferred(bytes32,bytes32,address,address)",
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
        "name": "templateHash",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "from",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "to",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "projection": {
      "domain": "voice",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "voice_licenses",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "VoiceLicenseFacet.LicenseUsed",
    "facetName": "VoiceLicenseFacet",
    "wrapperKey": "LicenseUsed",
    "domain": "licensing",
    "operationId": "licenseUsedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/licensing/events/license-used/query",
    "notes": "VoiceLicenseFacet.LicenseUsed",
    "eventName": "LicenseUsed",
    "signature": "LicenseUsed(bytes32,address,bytes32,uint256)",
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
        "name": "licensee",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "usageRef",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "usageCount",
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
          "table": "voice_licenses",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "VoiceLicenseFacet.TemplateUpdated",
    "facetName": "VoiceLicenseFacet",
    "wrapperKey": "TemplateUpdated",
    "domain": "licensing",
    "operationId": "voiceLicenseTemplateUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/licensing/events/template-updated/query/voice-license",
    "notes": "VoiceLicenseFacet.TemplateUpdated",
    "eventName": "TemplateUpdated",
    "signature": "TemplateUpdated(bytes32,bytes32,uint256,uint256)",
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
        "name": "templateHash",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "newPrice",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "newDuration",
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
          "table": "voice_licenses",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "VoiceLicenseFacet.VoiceAssetUsed",
    "facetName": "VoiceLicenseFacet",
    "wrapperKey": "VoiceAssetUsed",
    "domain": "licensing",
    "operationId": "voiceAssetUsedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/licensing/events/voice-asset-used/query",
    "notes": "VoiceLicenseFacet.VoiceAssetUsed",
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
          "table": "voice_licenses",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "VoiceLicenseTemplateFacet.LicenseCreated",
    "facetName": "VoiceLicenseTemplateFacet",
    "wrapperKey": "LicenseCreated",
    "domain": "licensing",
    "operationId": "licenseCreatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/licensing/events/license-created/query/voice-license-template",
    "notes": "VoiceLicenseTemplateFacet.LicenseCreated",
    "eventName": "LicenseCreated",
    "signature": "LicenseCreated(bytes32,address,bytes32,uint256,uint256)",
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
        "name": "licensee",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "termsHash",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "startTime",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "expiryTime",
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
          "table": "voice_license_templates",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "VoiceLicenseTemplateFacet.TemplateUpdated",
    "facetName": "VoiceLicenseTemplateFacet",
    "wrapperKey": "TemplateUpdated",
    "domain": "licensing",
    "operationId": "voiceLicenseTemplateTemplateUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/licensing/events/template-updated/query/voice-license-template",
    "notes": "VoiceLicenseTemplateFacet.TemplateUpdated",
    "eventName": "TemplateUpdated",
    "signature": "TemplateUpdated(bytes32,address,string,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "templateHash",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "creator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "name",
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
      "domain": "voice",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "voice_license_templates",
          "mode": "current"
        }
      ]
    }
  }
] as HttpEventDefinition[];
