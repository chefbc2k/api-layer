import type { HttpEventDefinition, HttpMethodDefinition } from "../../../../shared/route-types.js";

export const multisigMethodDefinitions: HttpMethodDefinition[] = [
  {
    "key": "MultiSigFacet.addOperationType",
    "facetName": "MultiSigFacet",
    "wrapperKey": "addOperationType",
    "domain": "multisig",
    "resource": "multisig",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/multisig/admin/add-operation-type",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "operationType",
          "source": "body",
          "field": "operationType"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "addOperationType",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "MultiSigFacet.addOperationType",
    "methodName": "addOperationType",
    "signature": "addOperationType(bytes32)",
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
        "name": "operationType",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": []
  },
  {
    "key": "MultiSigFacet.addOperator",
    "facetName": "MultiSigFacet",
    "wrapperKey": "addOperator",
    "domain": "multisig",
    "resource": "multisig",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/multisig/admin/add-operator",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "operator",
          "source": "body",
          "field": "operator"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "addOperator",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "MultiSigFacet.addOperator",
    "methodName": "addOperator",
    "signature": "addOperator(address)",
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
      }
    ],
    "outputs": []
  },
  {
    "key": "MultiSigFacet.approveOperation",
    "facetName": "MultiSigFacet",
    "wrapperKey": "approveOperation",
    "domain": "multisig",
    "resource": "multisig",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/multisig/admin/approve-operation",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "operationId",
          "source": "body",
          "field": "operationId"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "approveOperation",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "MultiSigFacet.approveOperation",
    "methodName": "approveOperation",
    "signature": "approveOperation(bytes32)",
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
        "name": "operationId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": []
  },
  {
    "key": "MultiSigFacet.cancelOperation",
    "facetName": "MultiSigFacet",
    "wrapperKey": "cancelOperation",
    "domain": "multisig",
    "resource": "multisig",
    "classification": "delete",
    "httpMethod": "DELETE",
    "path": "/v1/multisig/commands/cancel-operation",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "operationId",
          "source": "body",
          "field": "operationId"
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
    "operationId": "cancelOperation",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "MultiSigFacet.cancelOperation",
    "methodName": "cancelOperation",
    "signature": "cancelOperation(bytes32,string)",
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
        "name": "operationId",
        "type": "bytes32",
        "internalType": "bytes32"
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
    "key": "MultiSigFacet.canExecuteOperation",
    "facetName": "MultiSigFacet",
    "wrapperKey": "canExecuteOperation",
    "domain": "multisig",
    "resource": "multisig",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/multisig/queries/can-execute-operation",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "operationId",
          "source": "query",
          "field": "operationId"
        }
      ]
    },
    "outputShape": {
      "kind": "tuple"
    },
    "operationId": "canExecuteOperation",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "MultiSigFacet.canExecuteOperation",
    "methodName": "canExecuteOperation",
    "signature": "canExecuteOperation(bytes32)",
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
        "name": "operationId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "",
        "type": "string",
        "internalType": "string"
      }
    ]
  },
  {
    "key": "MultiSigFacet.execute",
    "facetName": "MultiSigFacet",
    "wrapperKey": "execute",
    "domain": "multisig",
    "resource": "multisig",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/multisig/admin/execute",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "recipient",
          "source": "body",
          "field": "recipient"
        },
        {
          "name": "value",
          "source": "body",
          "field": "value"
        },
        {
          "name": "data",
          "source": "body",
          "field": "data"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "execute",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "MultiSigFacet.execute",
    "methodName": "execute",
    "signature": "execute(address,uint256,bytes)",
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
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "data",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [
      {
        "name": "result",
        "type": "bytes",
        "internalType": "bytes"
      }
    ]
  },
  {
    "key": "MultiSigFacet.executeOperation",
    "facetName": "MultiSigFacet",
    "wrapperKey": "executeOperation",
    "domain": "multisig",
    "resource": "multisig",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/multisig/admin/execute-operation",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "operationId",
          "source": "body",
          "field": "operationId"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "executeOperation",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "MultiSigFacet.executeOperation",
    "methodName": "executeOperation",
    "signature": "executeOperation(bytes32)",
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
        "name": "operationId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": []
  },
  {
    "key": "MultiSigFacet.getOperationConfig",
    "facetName": "MultiSigFacet",
    "wrapperKey": "getOperationConfig",
    "domain": "multisig",
    "resource": "multisig",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/multisig/queries/get-operation-config",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "operationType",
          "source": "query",
          "field": "operationType"
        }
      ]
    },
    "outputShape": {
      "kind": "object"
    },
    "operationId": "getOperationConfig",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "MultiSigFacet.getOperationConfig",
    "methodName": "getOperationConfig",
    "signature": "getOperationConfig(bytes32)",
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
        "name": "operationType",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct IMultiSig.OperationConfig",
        "components": [
          {
            "name": "minApprovals",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "maxApprovals",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "allowsCancellation",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      }
    ]
  },
  {
    "key": "MultiSigFacet.getOperationStatus",
    "facetName": "MultiSigFacet",
    "wrapperKey": "getOperationStatus",
    "domain": "multisig",
    "resource": "multisig",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/multisig/queries/get-operation-status",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "operationId",
          "source": "query",
          "field": "operationId"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "getOperationStatus",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "MultiSigFacet.getOperationStatus",
    "methodName": "getOperationStatus",
    "signature": "getOperationStatus(bytes32)",
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
        "name": "operationId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "enum IMultiSig.OperationStatus"
      }
    ]
  },
  {
    "key": "MultiSigFacet.hasApprovedOperation",
    "facetName": "MultiSigFacet",
    "wrapperKey": "hasApprovedOperation",
    "domain": "multisig",
    "resource": "multisig",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/multisig/queries/has-approved-operation",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "operationId",
          "source": "query",
          "field": "operationId"
        },
        {
          "name": "approver",
          "source": "query",
          "field": "approver"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "hasApprovedOperation",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "MultiSigFacet.hasApprovedOperation",
    "methodName": "hasApprovedOperation",
    "signature": "hasApprovedOperation(bytes32,address)",
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
        "name": "operationId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "approver",
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
    "key": "MultiSigFacet.isOperator",
    "facetName": "MultiSigFacet",
    "wrapperKey": "isOperator",
    "domain": "multisig",
    "resource": "multisig",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/multisig/queries/is-operator",
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
    "operationId": "isOperator",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "MultiSigFacet.isOperator",
    "methodName": "isOperator",
    "signature": "isOperator(address)",
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
    "key": "MultiSigFacet.muSetPaused",
    "facetName": "MultiSigFacet",
    "wrapperKey": "muSetPaused",
    "domain": "multisig",
    "resource": "multisig",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/multisig/admin/mu-set-paused",
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
    "operationId": "muSetPaused",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "MultiSigFacet.muSetPaused",
    "methodName": "muSetPaused",
    "signature": "muSetPaused(bool)",
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
    "key": "MultiSigFacet.proposeOperation",
    "facetName": "MultiSigFacet",
    "wrapperKey": "proposeOperation",
    "domain": "multisig",
    "resource": "multisig",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/multisig/admin/propose-operation",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "actions",
          "source": "body",
          "field": "actions"
        },
        {
          "name": "requiredApprovals",
          "source": "body",
          "field": "requiredApprovals"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "proposeOperation",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "MultiSigFacet.proposeOperation",
    "methodName": "proposeOperation",
    "signature": "proposeOperation(bytes[],uint256)",
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
        "name": "actions",
        "type": "bytes[]",
        "internalType": "bytes[]"
      },
      {
        "name": "requiredApprovals",
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
    "key": "MultiSigFacet.removeOperator",
    "facetName": "MultiSigFacet",
    "wrapperKey": "removeOperator",
    "domain": "multisig",
    "resource": "multisig",
    "classification": "delete",
    "httpMethod": "DELETE",
    "path": "/v1/multisig/commands/remove-operator",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "operator",
          "source": "body",
          "field": "operator"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "removeOperator",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "MultiSigFacet.removeOperator",
    "methodName": "removeOperator",
    "signature": "removeOperator(address)",
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
      }
    ],
    "outputs": []
  },
  {
    "key": "MultiSigFacet.submitTransaction",
    "facetName": "MultiSigFacet",
    "wrapperKey": "submitTransaction",
    "domain": "multisig",
    "resource": "multisig",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/multisig/admin/submit-transaction",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "recipient",
          "source": "body",
          "field": "recipient"
        },
        {
          "name": "value",
          "source": "body",
          "field": "value"
        },
        {
          "name": "data",
          "source": "body",
          "field": "data"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "submitTransaction",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "MultiSigFacet.submitTransaction",
    "methodName": "submitTransaction",
    "signature": "submitTransaction(address,uint256,bytes)",
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
        "internalType": "address payable"
      },
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "data",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  }
] as HttpMethodDefinition[];
export const multisigEventDefinitions: HttpEventDefinition[] = [
  {
    "key": "MultiSigFacet.ActionExecuted",
    "facetName": "MultiSigFacet",
    "wrapperKey": "ActionExecuted",
    "domain": "multisig",
    "operationId": "actionExecutedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/multisig/events/action-executed/query",
    "notes": "MultiSigFacet.ActionExecuted",
    "eventName": "ActionExecuted",
    "signature": "ActionExecuted(bytes32,uint256,bytes)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "operationId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "actionIndex",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "result",
        "type": "bytes",
        "indexed": false,
        "internalType": "bytes"
      }
    ],
    "projection": {
      "domain": "multisig",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "multisig_operations",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "MultiSigFacet.BatchCompleted",
    "facetName": "MultiSigFacet",
    "wrapperKey": "BatchCompleted",
    "domain": "multisig",
    "operationId": "batchCompletedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/multisig/events/batch-completed/query",
    "notes": "MultiSigFacet.BatchCompleted",
    "eventName": "BatchCompleted",
    "signature": "BatchCompleted(bytes32,uint256,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "operationId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "startIndex",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "endIndex",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "multisig",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "multisig_operations",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "MultiSigFacet.MultiSigOperationCancelled",
    "facetName": "MultiSigFacet",
    "wrapperKey": "MultiSigOperationCancelled",
    "domain": "multisig",
    "operationId": "multiSigOperationCancelledEventQuery",
    "httpMethod": "POST",
    "path": "/v1/multisig/events/multi-sig-operation-cancelled/query",
    "notes": "MultiSigFacet.MultiSigOperationCancelled",
    "eventName": "MultiSigOperationCancelled",
    "signature": "MultiSigOperationCancelled(bytes32,address,string)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "id",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "canceller",
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
      "domain": "multisig",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "multisig_operations",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "MultiSigFacet.OperationApproved",
    "facetName": "MultiSigFacet",
    "wrapperKey": "OperationApproved",
    "domain": "multisig",
    "operationId": "operationApprovedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/multisig/events/operation-approved/query",
    "notes": "MultiSigFacet.OperationApproved",
    "eventName": "OperationApproved",
    "signature": "OperationApproved(bytes32,address,uint256,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "id",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "approver",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "currentApprovals",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "requiredApprovals",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "multisig",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "multisig_operations",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "MultiSigFacet.OperationExecuted",
    "facetName": "MultiSigFacet",
    "wrapperKey": "OperationExecuted",
    "domain": "multisig",
    "operationId": "operationExecutedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/multisig/events/operation-executed/query",
    "notes": "MultiSigFacet.OperationExecuted",
    "eventName": "OperationExecuted",
    "signature": "OperationExecuted(bytes32,address,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "id",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
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
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "multisig",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "multisig_operations",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "MultiSigFacet.OperationProposed",
    "facetName": "MultiSigFacet",
    "wrapperKey": "OperationProposed",
    "domain": "multisig",
    "operationId": "operationProposedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/multisig/events/operation-proposed/query",
    "notes": "MultiSigFacet.OperationProposed",
    "eventName": "OperationProposed",
    "signature": "OperationProposed(bytes32,address,bytes[],uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "id",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "proposer",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "actions",
        "type": "bytes[]",
        "indexed": false,
        "internalType": "bytes[]"
      },
      {
        "name": "requiredApprovals",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "multisig",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "multisig_operations",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "MultiSigFacet.OperationStatusChanged",
    "facetName": "MultiSigFacet",
    "wrapperKey": "OperationStatusChanged",
    "domain": "multisig",
    "operationId": "operationStatusChangedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/multisig/events/operation-status-changed/query",
    "notes": "MultiSigFacet.OperationStatusChanged",
    "eventName": "OperationStatusChanged",
    "signature": "OperationStatusChanged(bytes32,uint8,uint8)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "operationId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "previousStatus",
        "type": "uint8",
        "indexed": false,
        "internalType": "enum IMultiSig.OperationStatus"
      },
      {
        "name": "newStatus",
        "type": "uint8",
        "indexed": false,
        "internalType": "enum IMultiSig.OperationStatus"
      }
    ],
    "projection": {
      "domain": "multisig",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "multisig_operations",
          "mode": "current"
        }
      ]
    }
  }
] as HttpEventDefinition[];
