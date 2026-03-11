import type { HttpEventDefinition, HttpMethodDefinition } from "../../../../shared/route-types.js";

export const ownershipMethodDefinitions: HttpMethodDefinition[] = [
  {
    "key": "OwnershipFacet.acceptOwnership",
    "facetName": "OwnershipFacet",
    "wrapperKey": "acceptOwnership",
    "domain": "ownership",
    "resource": "ownership",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/ownership/commands/accept-ownership",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "acceptOwnership",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "OwnershipFacet.acceptOwnership",
    "methodName": "acceptOwnership",
    "signature": "acceptOwnership()",
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
    "key": "OwnershipFacet.cancelOwnershipTransfer",
    "facetName": "OwnershipFacet",
    "wrapperKey": "cancelOwnershipTransfer",
    "domain": "ownership",
    "resource": "ownership",
    "classification": "delete",
    "httpMethod": "DELETE",
    "path": "/v1/ownership/commands/cancel-ownership-transfer",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "cancelOwnershipTransfer",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "OwnershipFacet.cancelOwnershipTransfer",
    "methodName": "cancelOwnershipTransfer",
    "signature": "cancelOwnershipTransfer()",
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
    "key": "OwnershipFacet.isOwnershipPolicyEnforced",
    "facetName": "OwnershipFacet",
    "wrapperKey": "isOwnershipPolicyEnforced",
    "domain": "ownership",
    "resource": "ownership",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/ownership/queries/is-ownership-policy-enforced",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "isOwnershipPolicyEnforced",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "OwnershipFacet.isOwnershipPolicyEnforced",
    "methodName": "isOwnershipPolicyEnforced",
    "signature": "isOwnershipPolicyEnforced()",
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
    "key": "OwnershipFacet.isOwnerTargetApproved",
    "facetName": "OwnershipFacet",
    "wrapperKey": "isOwnerTargetApproved",
    "domain": "ownership",
    "resource": "ownership",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/ownership/queries/is-owner-target-approved",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "target",
          "source": "query",
          "field": "target"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "isOwnerTargetApproved",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "OwnershipFacet.isOwnerTargetApproved",
    "methodName": "isOwnerTargetApproved",
    "signature": "isOwnerTargetApproved(address)",
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
        "name": "target",
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
    "key": "OwnershipFacet.owner",
    "facetName": "OwnershipFacet",
    "wrapperKey": "owner",
    "domain": "ownership",
    "resource": "ownership",
    "classification": "read",
    "httpMethod": "POST",
    "path": "/v1/ownership/queries/owner",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "owner",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "OwnershipFacet.owner",
    "methodName": "owner",
    "signature": "owner()",
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
        "name": "owner_",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "key": "OwnershipFacet.pendingOwner",
    "facetName": "OwnershipFacet",
    "wrapperKey": "pendingOwner",
    "domain": "ownership",
    "resource": "ownership",
    "classification": "read",
    "httpMethod": "POST",
    "path": "/v1/ownership/queries/pending-owner",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "pendingOwner",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "OwnershipFacet.pendingOwner",
    "methodName": "pendingOwner",
    "signature": "pendingOwner()",
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
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "key": "OwnershipFacet.proposeOwnershipTransfer",
    "facetName": "OwnershipFacet",
    "wrapperKey": "proposeOwnershipTransfer",
    "domain": "ownership",
    "resource": "ownership",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/ownership/commands/propose-ownership-transfer",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "_newOwner",
          "source": "body",
          "field": "_newOwner"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "proposeOwnershipTransfer",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "OwnershipFacet.proposeOwnershipTransfer",
    "methodName": "proposeOwnershipTransfer",
    "signature": "proposeOwnershipTransfer(address)",
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
        "name": "_newOwner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": []
  },
  {
    "key": "OwnershipFacet.setApprovedOwnerTarget",
    "facetName": "OwnershipFacet",
    "wrapperKey": "setApprovedOwnerTarget",
    "domain": "ownership",
    "resource": "ownership",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/ownership/commands/set-approved-owner-target",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "target",
          "source": "body",
          "field": "target"
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
    "operationId": "setApprovedOwnerTarget",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "OwnershipFacet.setApprovedOwnerTarget",
    "methodName": "setApprovedOwnerTarget",
    "signature": "setApprovedOwnerTarget(address,bool)",
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
        "name": "target",
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
    "key": "OwnershipFacet.setOwnershipPolicyEnforced",
    "facetName": "OwnershipFacet",
    "wrapperKey": "setOwnershipPolicyEnforced",
    "domain": "ownership",
    "resource": "ownership",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/ownership/commands/set-ownership-policy-enforced",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "enforced",
          "source": "body",
          "field": "enforced"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setOwnershipPolicyEnforced",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "OwnershipFacet.setOwnershipPolicyEnforced",
    "methodName": "setOwnershipPolicyEnforced",
    "signature": "setOwnershipPolicyEnforced(bool)",
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
        "name": "enforced",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": []
  },
  {
    "key": "OwnershipFacet.transferOwnership",
    "facetName": "OwnershipFacet",
    "wrapperKey": "transferOwnership",
    "domain": "ownership",
    "resource": "ownership",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/ownership/commands/transfer-ownership",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "_newOwner",
          "source": "body",
          "field": "_newOwner"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "transferOwnership",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "OwnershipFacet.transferOwnership",
    "methodName": "transferOwnership",
    "signature": "transferOwnership(address)",
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
        "name": "_newOwner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": []
  }
] as HttpMethodDefinition[];
export const ownershipEventDefinitions: HttpEventDefinition[] = [
  {
    "key": "OwnershipFacet.OwnershipPolicyEnforcementSet",
    "facetName": "OwnershipFacet",
    "wrapperKey": "OwnershipPolicyEnforcementSet",
    "domain": "ownership",
    "operationId": "ownershipPolicyEnforcementSetEventQuery",
    "httpMethod": "POST",
    "path": "/v1/ownership/events/ownership-policy-enforcement-set/query",
    "notes": "OwnershipFacet.OwnershipPolicyEnforcementSet",
    "eventName": "OwnershipPolicyEnforcementSet",
    "signature": "OwnershipPolicyEnforcementSet(bool)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "enforced",
        "type": "bool",
        "indexed": true,
        "internalType": "bool"
      }
    ],
    "projection": {
      "domain": "ownership",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "ownership_transfers",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "OwnershipFacet.OwnershipTargetApprovalSet",
    "facetName": "OwnershipFacet",
    "wrapperKey": "OwnershipTargetApprovalSet",
    "domain": "ownership",
    "operationId": "ownershipTargetApprovalSetEventQuery",
    "httpMethod": "POST",
    "path": "/v1/ownership/events/ownership-target-approval-set/query",
    "notes": "OwnershipFacet.OwnershipTargetApprovalSet",
    "eventName": "OwnershipTargetApprovalSet",
    "signature": "OwnershipTargetApprovalSet(address,bool)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "target",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "approved",
        "type": "bool",
        "indexed": true,
        "internalType": "bool"
      }
    ],
    "projection": {
      "domain": "ownership",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "ownership_transfers",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "OwnershipFacet.OwnershipTransferCancelled",
    "facetName": "OwnershipFacet",
    "wrapperKey": "OwnershipTransferCancelled",
    "domain": "ownership",
    "operationId": "ownershipTransferCancelledEventQuery",
    "httpMethod": "POST",
    "path": "/v1/ownership/events/ownership-transfer-cancelled/query",
    "notes": "OwnershipFacet.OwnershipTransferCancelled",
    "eventName": "OwnershipTransferCancelled",
    "signature": "OwnershipTransferCancelled(address,address)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "currentOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "pendingOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "projection": {
      "domain": "ownership",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "ownership_transfers",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "OwnershipFacet.OwnershipTransferProposed",
    "facetName": "OwnershipFacet",
    "wrapperKey": "OwnershipTransferProposed",
    "domain": "ownership",
    "operationId": "ownershipTransferProposedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/ownership/events/ownership-transfer-proposed/query",
    "notes": "OwnershipFacet.OwnershipTransferProposed",
    "eventName": "OwnershipTransferProposed",
    "signature": "OwnershipTransferProposed(address,address)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "currentOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "pendingOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "projection": {
      "domain": "ownership",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "ownership_transfers",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "OwnershipFacet.OwnershipTransferred",
    "facetName": "OwnershipFacet",
    "wrapperKey": "OwnershipTransferred",
    "domain": "ownership",
    "operationId": "ownershipTransferredEventQuery",
    "httpMethod": "POST",
    "path": "/v1/ownership/events/ownership-transferred/query",
    "notes": "OwnershipFacet.OwnershipTransferred",
    "eventName": "OwnershipTransferred",
    "signature": "OwnershipTransferred(address,address)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "previousOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "projection": {
      "domain": "ownership",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "ownership_transfers",
          "mode": "current"
        }
      ]
    }
  }
] as HttpEventDefinition[];
