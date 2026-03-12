import type { HttpEventDefinition, HttpMethodDefinition } from "../../../../shared/route-types.js";

export const marketplaceMethodDefinitions: HttpMethodDefinition[] = [
  {
    "key": "EscrowFacet.escrowAsset",
    "facetName": "EscrowFacet",
    "wrapperKey": "escrowAsset",
    "domain": "marketplace",
    "resource": "escrow",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/marketplace/commands/escrow-asset",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "tokenId",
          "source": "body",
          "field": "tokenId"
        },
        {
          "name": "owner",
          "source": "body",
          "field": "owner"
        },
        {
          "name": "state",
          "source": "body",
          "field": "state"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "escrowAsset",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "EscrowFacet.escrowAsset",
    "methodName": "escrowAsset",
    "signature": "escrowAsset(uint256,address,uint8)",
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
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "uint8",
        "name": "state",
        "type": "uint8"
      }
    ],
    "outputs": []
  },
  {
    "key": "EscrowFacet.getAssetState",
    "facetName": "EscrowFacet",
    "wrapperKey": "getAssetState",
    "domain": "marketplace",
    "resource": "escrow",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/marketplace/queries/get-asset-state",
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
    "operationId": "getAssetState",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "EscrowFacet.getAssetState",
    "methodName": "getAssetState",
    "signature": "getAssetState(uint256)",
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
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ]
  },
  {
    "key": "EscrowFacet.getOriginalOwner",
    "facetName": "EscrowFacet",
    "wrapperKey": "getOriginalOwner",
    "domain": "marketplace",
    "resource": "escrow",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/marketplace/queries/get-original-owner",
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
    "operationId": "getOriginalOwner",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "EscrowFacet.getOriginalOwner",
    "methodName": "getOriginalOwner",
    "signature": "getOriginalOwner(uint256)",
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
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ]
  },
  {
    "key": "EscrowFacet.isInEscrow",
    "facetName": "EscrowFacet",
    "wrapperKey": "isInEscrow",
    "domain": "marketplace",
    "resource": "escrow",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/marketplace/queries/is-in-escrow",
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
    "operationId": "isInEscrow",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "EscrowFacet.isInEscrow",
    "methodName": "isInEscrow",
    "signature": "isInEscrow(uint256)",
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
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ]
  },
  {
    "key": "EscrowFacet.onERC721Received",
    "facetName": "EscrowFacet",
    "wrapperKey": "onERC721Received",
    "domain": "marketplace",
    "resource": "escrow",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/marketplace/commands/on-erc721-received",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "arg0",
          "source": "body",
          "field": "arg0"
        },
        {
          "name": "arg1",
          "source": "body",
          "field": "arg1"
        },
        {
          "name": "arg2",
          "source": "body",
          "field": "arg2"
        },
        {
          "name": "arg3",
          "source": "body",
          "field": "arg3"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "onErc721Received",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "EscrowFacet.onERC721Received",
    "methodName": "onERC721Received",
    "signature": "onERC721Received(address,address,uint256,bytes)",
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
        "name": "",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      }
    ],
    "outputs": [
      {
        "internalType": "bytes4",
        "name": "",
        "type": "bytes4"
      }
    ]
  },
  {
    "key": "EscrowFacet.releaseAsset",
    "facetName": "EscrowFacet",
    "wrapperKey": "releaseAsset",
    "domain": "marketplace",
    "resource": "escrow",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/marketplace/commands/release-asset",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "tokenId",
          "source": "body",
          "field": "tokenId"
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
    "operationId": "releaseAsset",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "EscrowFacet.releaseAsset",
    "methodName": "releaseAsset",
    "signature": "releaseAsset(uint256,address)",
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
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      }
    ],
    "outputs": []
  },
  {
    "key": "EscrowFacet.updateAssetState",
    "facetName": "EscrowFacet",
    "wrapperKey": "updateAssetState",
    "domain": "marketplace",
    "resource": "escrow",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/marketplace/commands/update-asset-state",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "tokenId",
          "source": "body",
          "field": "tokenId"
        },
        {
          "name": "newState",
          "source": "body",
          "field": "newState"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "updateAssetState",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "EscrowFacet.updateAssetState",
    "methodName": "updateAssetState",
    "signature": "updateAssetState(uint256,uint8)",
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
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "newState",
        "type": "uint8"
      }
    ],
    "outputs": []
  },
  {
    "key": "MarketplaceFacet.cancelListing",
    "facetName": "MarketplaceFacet",
    "wrapperKey": "cancelListing",
    "domain": "marketplace",
    "resource": "listings",
    "classification": "delete",
    "httpMethod": "DELETE",
    "path": "/v1/marketplace/commands/cancel-listing",
    "inputShape": {
      "kind": "body",
      "bindings": [
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
    "operationId": "cancelListing",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "MarketplaceFacet.cancelListing",
    "methodName": "cancelListing",
    "signature": "cancelListing(uint256)",
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
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "MarketplaceFacet.getListing",
    "facetName": "MarketplaceFacet",
    "wrapperKey": "getListing",
    "domain": "marketplace",
    "resource": "listings",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/marketplace/queries/get-listing",
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
      "kind": "object"
    },
    "operationId": "getListing",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "MarketplaceFacet.getListing",
    "methodName": "getListing",
    "signature": "getListing(uint256)",
    "category": "read",
    "mutability": "view",
    "liveRequired": false,
    "cacheClass": "none",
    "cacheTtlSeconds": null,
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
        "type": "tuple",
        "internalType": "struct MarketplaceStorage.Listing",
        "components": [
          {
            "name": "tokenId",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "seller",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "price",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "createdAt",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "createdBlock",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "lastUpdateBlock",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "expiresAt",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "isActive",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      }
    ]
  },
  {
    "key": "MarketplaceFacet.isPaused",
    "facetName": "MarketplaceFacet",
    "wrapperKey": "isPaused",
    "domain": "marketplace",
    "resource": "listings",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/marketplace/queries/is-paused",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "isPaused",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "MarketplaceFacet.isPaused",
    "methodName": "isPaused",
    "signature": "isPaused()",
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
    "key": "MarketplaceFacet.listAsset",
    "facetName": "MarketplaceFacet",
    "wrapperKey": "listAsset",
    "domain": "marketplace",
    "resource": "listings",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/marketplace/commands/list-asset",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "tokenId",
          "source": "body",
          "field": "tokenId"
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
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "listAsset",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "MarketplaceFacet.listAsset",
    "methodName": "listAsset",
    "signature": "listAsset(uint256,uint256,uint256)",
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
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
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
      }
    ],
    "outputs": []
  },
  {
    "key": "MarketplaceFacet.pause",
    "facetName": "MarketplaceFacet",
    "wrapperKey": "pause",
    "domain": "marketplace",
    "resource": "listings",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/marketplace/commands/pause",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "pause",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "MarketplaceFacet.pause",
    "methodName": "pause",
    "signature": "pause()",
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
    "key": "MarketplaceFacet.purchaseAsset",
    "facetName": "MarketplaceFacet",
    "wrapperKey": "purchaseAsset",
    "domain": "marketplace",
    "resource": "listings",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/marketplace/commands/purchase-asset",
    "inputShape": {
      "kind": "body",
      "bindings": [
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
    "operationId": "purchaseAsset",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "MarketplaceFacet.purchaseAsset",
    "methodName": "purchaseAsset",
    "signature": "purchaseAsset(uint256)",
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
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "MarketplaceFacet.unpause",
    "facetName": "MarketplaceFacet",
    "wrapperKey": "unpause",
    "domain": "marketplace",
    "resource": "listings",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/marketplace/commands/unpause",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "unpause",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "MarketplaceFacet.unpause",
    "methodName": "unpause",
    "signature": "unpause()",
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
    "key": "MarketplaceFacet.updateListingPrice",
    "facetName": "MarketplaceFacet",
    "wrapperKey": "updateListingPrice",
    "domain": "marketplace",
    "resource": "listings",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/marketplace/commands/update-listing-price",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "tokenId",
          "source": "body",
          "field": "tokenId"
        },
        {
          "name": "newPrice",
          "source": "body",
          "field": "newPrice"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "updateListingPrice",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "MarketplaceFacet.updateListingPrice",
    "methodName": "updateListingPrice",
    "signature": "updateListingPrice(uint256,uint256)",
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
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "newPrice",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "PaymentFacet.approveMultisigWithdrawal",
    "facetName": "PaymentFacet",
    "wrapperKey": "approveMultisigWithdrawal",
    "domain": "marketplace",
    "resource": "payments",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/marketplace/commands/approve-multisig-withdrawal",
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
          "name": "to",
          "source": "body",
          "field": "to"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "approveMultisigWithdrawal",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "PaymentFacet.approveMultisigWithdrawal",
    "methodName": "approveMultisigWithdrawal",
    "signature": "approveMultisigWithdrawal(address,uint256,address)",
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
        "name": "to",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": []
  },
  {
    "key": "PaymentFacet.commitDistribution",
    "facetName": "PaymentFacet",
    "wrapperKey": "commitDistribution",
    "domain": "marketplace",
    "resource": "payments",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/marketplace/commands/commit-distribution",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "commitHash",
          "source": "body",
          "field": "commitHash"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "commitDistribution",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "PaymentFacet.commitDistribution",
    "methodName": "commitDistribution",
    "signature": "commitDistribution(bytes32)",
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
        "name": "commitHash",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "blockNumber",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "key": "PaymentFacet.commitWithdraw",
    "facetName": "PaymentFacet",
    "wrapperKey": "commitWithdraw",
    "domain": "marketplace",
    "resource": "payments",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/marketplace/commands/commit-withdraw",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "commitHash",
          "source": "body",
          "field": "commitHash"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "commitWithdraw",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "PaymentFacet.commitWithdraw",
    "methodName": "commitWithdraw",
    "signature": "commitWithdraw(bytes32)",
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
        "name": "commitHash",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "blockNumber",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "key": "PaymentFacet.distributePayment",
    "facetName": "PaymentFacet",
    "wrapperKey": "distributePayment",
    "domain": "marketplace",
    "resource": "payments",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/marketplace/commands/distribute-payment",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "tokenId",
          "source": "body",
          "field": "tokenId"
        },
        {
          "name": "amount",
          "source": "body",
          "field": "amount"
        },
        {
          "name": "seller",
          "source": "body",
          "field": "seller"
        },
        {
          "name": "referrer",
          "source": "body",
          "field": "referrer"
        },
        {
          "name": "isLicensePayment",
          "source": "body",
          "field": "isLicensePayment"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "distributePayment",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "PaymentFacet.distributePayment",
    "methodName": "distributePayment",
    "signature": "distributePayment(uint256,uint256,address,address,bool)",
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
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "seller",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "referrer",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "isLicensePayment",
        "type": "bool",
        "internalType": "bool"
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
    "key": "PaymentFacet.distributePaymentFrom",
    "facetName": "PaymentFacet",
    "wrapperKey": "distributePaymentFrom",
    "domain": "marketplace",
    "resource": "payments",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/marketplace/commands/distribute-payment-from",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "tokenId",
          "source": "body",
          "field": "tokenId"
        },
        {
          "name": "amount",
          "source": "body",
          "field": "amount"
        },
        {
          "name": "seller",
          "source": "body",
          "field": "seller"
        },
        {
          "name": "referrer",
          "source": "body",
          "field": "referrer"
        },
        {
          "name": "isLicensePayment",
          "source": "body",
          "field": "isLicensePayment"
        },
        {
          "name": "payer",
          "source": "body",
          "field": "payer"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "distributePaymentFrom",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "PaymentFacet.distributePaymentFrom",
    "methodName": "distributePaymentFrom",
    "signature": "distributePaymentFrom(uint256,uint256,address,address,bool,address)",
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
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "seller",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "referrer",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "isLicensePayment",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "payer",
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
    "key": "PaymentFacet.distributePaymentFromWithDeadline",
    "facetName": "PaymentFacet",
    "wrapperKey": "distributePaymentFromWithDeadline",
    "domain": "marketplace",
    "resource": "payments",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/marketplace/commands/distribute-payment-from-with-deadline",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "tokenId",
          "source": "body",
          "field": "tokenId"
        },
        {
          "name": "amount",
          "source": "body",
          "field": "amount"
        },
        {
          "name": "seller",
          "source": "body",
          "field": "seller"
        },
        {
          "name": "referrer",
          "source": "body",
          "field": "referrer"
        },
        {
          "name": "isLicensePayment",
          "source": "body",
          "field": "isLicensePayment"
        },
        {
          "name": "payer",
          "source": "body",
          "field": "payer"
        },
        {
          "name": "deadline",
          "source": "body",
          "field": "deadline"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "distributePaymentFromWithDeadline",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "PaymentFacet.distributePaymentFromWithDeadline",
    "methodName": "distributePaymentFromWithDeadline",
    "signature": "distributePaymentFromWithDeadline(uint256,uint256,address,address,bool,address,uint256)",
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
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "seller",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "referrer",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "isLicensePayment",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "payer",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "deadline",
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
    "key": "PaymentFacet.distributePaymentWithDeadline",
    "facetName": "PaymentFacet",
    "wrapperKey": "distributePaymentWithDeadline",
    "domain": "marketplace",
    "resource": "payments",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/marketplace/commands/distribute-payment-with-deadline",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "tokenId",
          "source": "body",
          "field": "tokenId"
        },
        {
          "name": "amount",
          "source": "body",
          "field": "amount"
        },
        {
          "name": "seller",
          "source": "body",
          "field": "seller"
        },
        {
          "name": "referrer",
          "source": "body",
          "field": "referrer"
        },
        {
          "name": "isLicensePayment",
          "source": "body",
          "field": "isLicensePayment"
        },
        {
          "name": "deadline",
          "source": "body",
          "field": "deadline"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "distributePaymentWithDeadline",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "PaymentFacet.distributePaymentWithDeadline",
    "methodName": "distributePaymentWithDeadline",
    "signature": "distributePaymentWithDeadline(uint256,uint256,address,address,bool,uint256)",
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
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "seller",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "referrer",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "isLicensePayment",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "deadline",
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
    "key": "PaymentFacet.executeMultisigWithdrawal",
    "facetName": "PaymentFacet",
    "wrapperKey": "executeMultisigWithdrawal",
    "domain": "marketplace",
    "resource": "payments",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/marketplace/commands/execute-multisig-withdrawal",
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
          "name": "to",
          "source": "body",
          "field": "to"
        },
        {
          "name": "requiredApprovals",
          "source": "body",
          "field": "requiredApprovals"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "executeMultisigWithdrawal",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "PaymentFacet.executeMultisigWithdrawal",
    "methodName": "executeMultisigWithdrawal",
    "signature": "executeMultisigWithdrawal(address,uint256,address,uint256)",
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
        "name": "to",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "requiredApprovals",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "PaymentFacet.executeQuarterlyBuyback",
    "facetName": "PaymentFacet",
    "wrapperKey": "executeQuarterlyBuyback",
    "domain": "marketplace",
    "resource": "payments",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/marketplace/commands/execute-quarterly-buyback",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "usdcAmount",
          "source": "body",
          "field": "usdcAmount"
        },
        {
          "name": "minUspkOut",
          "source": "body",
          "field": "minUspkOut"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "executeQuarterlyBuyback",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "PaymentFacet.executeQuarterlyBuyback",
    "methodName": "executeQuarterlyBuyback",
    "signature": "executeQuarterlyBuyback(uint256,uint256)",
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
        "name": "usdcAmount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "minUspkOut",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "uspkBurned",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "key": "PaymentFacet.getAssetRevenue",
    "facetName": "PaymentFacet",
    "wrapperKey": "getAssetRevenue",
    "domain": "marketplace",
    "resource": "payments",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/marketplace/queries/get-asset-revenue",
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
      "kind": "tuple"
    },
    "operationId": "getAssetRevenue",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "PaymentFacet.getAssetRevenue",
    "methodName": "getAssetRevenue",
    "signature": "getAssetRevenue(uint256)",
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
        "name": "totalVolume",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "totalFees",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "totalRoyalties",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "totalReferrals",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "key": "PaymentFacet.getBuybackStatus",
    "facetName": "PaymentFacet",
    "wrapperKey": "getBuybackStatus",
    "domain": "marketplace",
    "resource": "payments",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/marketplace/queries/get-buyback-status",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "object"
    },
    "operationId": "getBuybackStatus",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "PaymentFacet.getBuybackStatus",
    "methodName": "getBuybackStatus",
    "signature": "getBuybackStatus()",
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
        "name": "status",
        "type": "tuple",
        "internalType": "struct PaymentStorage.BuybackStatus",
        "components": [
          {
            "name": "buybackBps",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "minMonthlyRevenue",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "requiredMonths",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "cadence",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "accumulator",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "consecutiveMonths",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "lastMonth",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "currentMonthRevenue",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "lastExecution",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "paused",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "buybackRouter",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "uspkToken",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "burnAddress",
            "type": "address",
            "internalType": "address"
          }
        ]
      }
    ]
  },
  {
    "key": "PaymentFacet.getDevFundAddress",
    "facetName": "PaymentFacet",
    "wrapperKey": "getDevFundAddress",
    "domain": "marketplace",
    "resource": "payments",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/marketplace/queries/get-dev-fund-address",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "getDevFundAddress",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "PaymentFacet.getDevFundAddress",
    "methodName": "getDevFundAddress",
    "signature": "getDevFundAddress()",
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
    "key": "PaymentFacet.getFeeConfiguration",
    "facetName": "PaymentFacet",
    "wrapperKey": "getFeeConfiguration",
    "domain": "marketplace",
    "resource": "payments",
    "classification": "read",
    "httpMethod": "POST",
    "path": "/v1/marketplace/queries/get-fee-configuration",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "object"
    },
    "operationId": "getFeeConfiguration",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "PaymentFacet.getFeeConfiguration",
    "methodName": "getFeeConfiguration",
    "signature": "getFeeConfiguration()",
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
        "type": "tuple",
        "internalType": "struct PaymentStorage.FeeConfig",
        "components": [
          {
            "name": "platformFee",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "unionShare",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "devFund",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "timewaveGift",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "referralFee",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "milestonePool",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ]
  },
  {
    "key": "PaymentFacet.getMevProtectionConfig",
    "facetName": "PaymentFacet",
    "wrapperKey": "getMevProtectionConfig",
    "domain": "marketplace",
    "resource": "payments",
    "classification": "read",
    "httpMethod": "POST",
    "path": "/v1/marketplace/queries/get-mev-protection-config",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "tuple"
    },
    "operationId": "getMevProtectionConfig",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "PaymentFacet.getMevProtectionConfig",
    "methodName": "getMevProtectionConfig",
    "signature": "getMevProtectionConfig()",
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
        "name": "flashbotsEnabled",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "flashbotsRelayAddress",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "minFlashbotsValue",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "highValueThreshold",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "revealTimelockBlocks",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "key": "PaymentFacet.getPendingPayments",
    "facetName": "PaymentFacet",
    "wrapperKey": "getPendingPayments",
    "domain": "marketplace",
    "resource": "payments",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/marketplace/queries/get-pending-payments",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "payee",
          "source": "query",
          "field": "payee"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "getPendingPayments",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "PaymentFacet.getPendingPayments",
    "methodName": "getPendingPayments",
    "signature": "getPendingPayments(address)",
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
        "name": "payee",
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
    "key": "PaymentFacet.getPendingTimewaveGift",
    "facetName": "PaymentFacet",
    "wrapperKey": "getPendingTimewaveGift",
    "domain": "marketplace",
    "resource": "payments",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/marketplace/queries/get-pending-timewave-gift",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "beneficiary",
          "source": "query",
          "field": "beneficiary"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "getPendingTimewaveGift",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "PaymentFacet.getPendingTimewaveGift",
    "methodName": "getPendingTimewaveGift",
    "signature": "getPendingTimewaveGift(address)",
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
        "name": "beneficiary",
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
    "key": "PaymentFacet.getRevenueMetrics",
    "facetName": "PaymentFacet",
    "wrapperKey": "getRevenueMetrics",
    "domain": "marketplace",
    "resource": "payments",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/marketplace/queries/get-revenue-metrics",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "tuple"
    },
    "operationId": "getRevenueMetrics",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "PaymentFacet.getRevenueMetrics",
    "methodName": "getRevenueMetrics",
    "signature": "getRevenueMetrics()",
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
        "name": "totalVolume",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "totalFees",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "totalRoyalties",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "totalReferrals",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "key": "PaymentFacet.getTreasuryAddress",
    "facetName": "PaymentFacet",
    "wrapperKey": "getTreasuryAddress",
    "domain": "marketplace",
    "resource": "payments",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/marketplace/queries/get-treasury-address",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "getTreasuryAddress",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "PaymentFacet.getTreasuryAddress",
    "methodName": "getTreasuryAddress",
    "signature": "getTreasuryAddress()",
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
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "key": "PaymentFacet.getTreasuryWithdrawalLimit",
    "facetName": "PaymentFacet",
    "wrapperKey": "getTreasuryWithdrawalLimit",
    "domain": "marketplace",
    "resource": "payments",
    "classification": "read",
    "httpMethod": "POST",
    "path": "/v1/marketplace/queries/get-treasury-withdrawal-limit",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "tuple"
    },
    "operationId": "getTreasuryWithdrawalLimit",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "PaymentFacet.getTreasuryWithdrawalLimit",
    "methodName": "getTreasuryWithdrawalLimit",
    "signature": "getTreasuryWithdrawalLimit()",
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
        "name": "limit",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "window",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "cooldown",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "withdrawn",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "windowStart",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "key": "PaymentFacet.getUnionTreasuryAddress",
    "facetName": "PaymentFacet",
    "wrapperKey": "getUnionTreasuryAddress",
    "domain": "marketplace",
    "resource": "payments",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/marketplace/queries/get-union-treasury-address",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "getUnionTreasuryAddress",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "PaymentFacet.getUnionTreasuryAddress",
    "methodName": "getUnionTreasuryAddress",
    "signature": "getUnionTreasuryAddress()",
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
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "key": "PaymentFacet.getUsdcToken",
    "facetName": "PaymentFacet",
    "wrapperKey": "getUsdcToken",
    "domain": "marketplace",
    "resource": "payments",
    "classification": "read",
    "httpMethod": "POST",
    "path": "/v1/marketplace/queries/get-usdc-token",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "getUsdcToken",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "PaymentFacet.getUsdcToken",
    "methodName": "getUsdcToken",
    "signature": "getUsdcToken()",
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
    "key": "PaymentFacet.pauseBuybacks",
    "facetName": "PaymentFacet",
    "wrapperKey": "pauseBuybacks",
    "domain": "marketplace",
    "resource": "payments",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/marketplace/commands/pause-buybacks",
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
    "operationId": "pauseBuybacks",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "PaymentFacet.pauseBuybacks",
    "methodName": "pauseBuybacks",
    "signature": "pauseBuybacks(bool)",
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
        "name": "paused",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": []
  },
  {
    "key": "PaymentFacet.paymentPaused",
    "facetName": "PaymentFacet",
    "wrapperKey": "paymentPaused",
    "domain": "marketplace",
    "resource": "payments",
    "classification": "read",
    "httpMethod": "POST",
    "path": "/v1/marketplace/queries/payment-paused",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "paymentPaused",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "PaymentFacet.paymentPaused",
    "methodName": "paymentPaused",
    "signature": "paymentPaused()",
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
    "key": "PaymentFacet.revealDistribution",
    "facetName": "PaymentFacet",
    "wrapperKey": "revealDistribution",
    "domain": "marketplace",
    "resource": "payments",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/marketplace/commands/reveal-distribution",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "tokenId",
          "source": "body",
          "field": "tokenId"
        },
        {
          "name": "amount",
          "source": "body",
          "field": "amount"
        },
        {
          "name": "seller",
          "source": "body",
          "field": "seller"
        },
        {
          "name": "referrer",
          "source": "body",
          "field": "referrer"
        },
        {
          "name": "isLicensePayment",
          "source": "body",
          "field": "isLicensePayment"
        },
        {
          "name": "payer",
          "source": "body",
          "field": "payer"
        },
        {
          "name": "nonce",
          "source": "body",
          "field": "nonce"
        },
        {
          "name": "deadline",
          "source": "body",
          "field": "deadline"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "revealDistribution",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "PaymentFacet.revealDistribution",
    "methodName": "revealDistribution",
    "signature": "revealDistribution(uint256,uint256,address,address,bool,address,uint256,uint256)",
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
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "seller",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "referrer",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "isLicensePayment",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "payer",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "nonce",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "deadline",
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
    "key": "PaymentFacet.revealWithdraw",
    "facetName": "PaymentFacet",
    "wrapperKey": "revealWithdraw",
    "domain": "marketplace",
    "resource": "payments",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/marketplace/commands/reveal-withdraw",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "amount",
          "source": "body",
          "field": "amount"
        },
        {
          "name": "nonce",
          "source": "body",
          "field": "nonce"
        },
        {
          "name": "deadline",
          "source": "body",
          "field": "deadline"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "revealWithdraw",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "PaymentFacet.revealWithdraw",
    "methodName": "revealWithdraw",
    "signature": "revealWithdraw(uint256,uint256,uint256)",
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
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "nonce",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "deadline",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "PaymentFacet.setBuybackConfig",
    "facetName": "PaymentFacet",
    "wrapperKey": "setBuybackConfig",
    "domain": "marketplace",
    "resource": "payments",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/marketplace/commands/set-buyback-config",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "buybackBps",
          "source": "body",
          "field": "buybackBps"
        },
        {
          "name": "minMonthlyRevenue",
          "source": "body",
          "field": "minMonthlyRevenue"
        },
        {
          "name": "requiredMonths",
          "source": "body",
          "field": "requiredMonths"
        },
        {
          "name": "cadence",
          "source": "body",
          "field": "cadence"
        },
        {
          "name": "buybackRouter",
          "source": "body",
          "field": "buybackRouter"
        },
        {
          "name": "uspkToken",
          "source": "body",
          "field": "uspkToken"
        },
        {
          "name": "burnAddress",
          "source": "body",
          "field": "burnAddress"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setBuybackConfig",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "PaymentFacet.setBuybackConfig",
    "methodName": "setBuybackConfig",
    "signature": "setBuybackConfig(uint256,uint256,uint256,uint256,address,address,address)",
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
        "name": "buybackBps",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "minMonthlyRevenue",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "requiredMonths",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "cadence",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "buybackRouter",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "uspkToken",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "burnAddress",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": []
  },
  {
    "key": "PaymentFacet.setMevProtectionConfig",
    "facetName": "PaymentFacet",
    "wrapperKey": "setMevProtectionConfig",
    "domain": "marketplace",
    "resource": "payments",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/marketplace/commands/set-mev-protection-config",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "flashbotsEnabled",
          "source": "body",
          "field": "flashbotsEnabled"
        },
        {
          "name": "flashbotsRelayAddress",
          "source": "body",
          "field": "flashbotsRelayAddress"
        },
        {
          "name": "minFlashbotsValue",
          "source": "body",
          "field": "minFlashbotsValue"
        },
        {
          "name": "highValueThreshold",
          "source": "body",
          "field": "highValueThreshold"
        },
        {
          "name": "revealTimelockBlocks",
          "source": "body",
          "field": "revealTimelockBlocks"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setMevProtectionConfig",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "PaymentFacet.setMevProtectionConfig",
    "methodName": "setMevProtectionConfig",
    "signature": "setMevProtectionConfig(bool,address,uint256,uint256,uint256)",
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
        "name": "flashbotsEnabled",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "flashbotsRelayAddress",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "minFlashbotsValue",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "highValueThreshold",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "revealTimelockBlocks",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "PaymentFacet.setPaymentPaused",
    "facetName": "PaymentFacet",
    "wrapperKey": "setPaymentPaused",
    "domain": "marketplace",
    "resource": "payments",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/marketplace/commands/set-payment-paused",
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
    "operationId": "setPaymentPaused",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "PaymentFacet.setPaymentPaused",
    "methodName": "setPaymentPaused",
    "signature": "setPaymentPaused(bool)",
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
    "key": "PaymentFacet.setStakingConfig",
    "facetName": "PaymentFacet",
    "wrapperKey": "setStakingConfig",
    "domain": "marketplace",
    "resource": "payments",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/marketplace/commands/set-staking-config",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "stakingFacet",
          "source": "body",
          "field": "stakingFacet"
        },
        {
          "name": "stakingAllocationBps",
          "source": "body",
          "field": "stakingAllocationBps"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setStakingConfig",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "PaymentFacet.setStakingConfig",
    "methodName": "setStakingConfig",
    "signature": "setStakingConfig(address,uint256)",
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
        "name": "stakingFacet",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "stakingAllocationBps",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "PaymentFacet.setTreasuryWithdrawalLimit",
    "facetName": "PaymentFacet",
    "wrapperKey": "setTreasuryWithdrawalLimit",
    "domain": "marketplace",
    "resource": "payments",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/marketplace/commands/set-treasury-withdrawal-limit",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "limit",
          "source": "body",
          "field": "limit"
        },
        {
          "name": "window",
          "source": "body",
          "field": "window"
        },
        {
          "name": "cooldown",
          "source": "body",
          "field": "cooldown"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setTreasuryWithdrawalLimit",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "PaymentFacet.setTreasuryWithdrawalLimit",
    "methodName": "setTreasuryWithdrawalLimit",
    "signature": "setTreasuryWithdrawalLimit(uint256,uint256,uint256)",
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
        "name": "limit",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "window",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "cooldown",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "PaymentFacet.setUsdcToken",
    "facetName": "PaymentFacet",
    "wrapperKey": "setUsdcToken",
    "domain": "marketplace",
    "resource": "payments",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/marketplace/commands/set-usdc-token",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "newUsdcToken",
          "source": "body",
          "field": "newUsdcToken"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setUsdcToken",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "PaymentFacet.setUsdcToken",
    "methodName": "setUsdcToken",
    "signature": "setUsdcToken(address)",
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
        "name": "newUsdcToken",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": []
  },
  {
    "key": "PaymentFacet.updateDevFundAddress",
    "facetName": "PaymentFacet",
    "wrapperKey": "updateDevFundAddress",
    "domain": "marketplace",
    "resource": "payments",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/marketplace/commands/update-dev-fund-address",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "newDevFund",
          "source": "body",
          "field": "newDevFund"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "updateDevFundAddress",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "PaymentFacet.updateDevFundAddress",
    "methodName": "updateDevFundAddress",
    "signature": "updateDevFundAddress(address)",
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
        "name": "newDevFund",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": []
  },
  {
    "key": "PaymentFacet.updateFeeConfiguration",
    "facetName": "PaymentFacet",
    "wrapperKey": "updateFeeConfiguration",
    "domain": "marketplace",
    "resource": "payments",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/marketplace/commands/update-fee-configuration",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "platformFee",
          "source": "body",
          "field": "platformFee"
        },
        {
          "name": "referralFee",
          "source": "body",
          "field": "referralFee"
        },
        {
          "name": "unionShare",
          "source": "body",
          "field": "unionShare"
        },
        {
          "name": "devFund",
          "source": "body",
          "field": "devFund"
        },
        {
          "name": "timewaveGift",
          "source": "body",
          "field": "timewaveGift"
        },
        {
          "name": "milestonePool",
          "source": "body",
          "field": "milestonePool"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "updateFeeConfiguration",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "PaymentFacet.updateFeeConfiguration",
    "methodName": "updateFeeConfiguration",
    "signature": "updateFeeConfiguration(uint256,uint256,uint256,uint256,uint256,uint256)",
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
        "name": "platformFee",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "referralFee",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "unionShare",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "devFund",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "timewaveGift",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "milestonePool",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "PaymentFacet.updateTreasuryAddress",
    "facetName": "PaymentFacet",
    "wrapperKey": "updateTreasuryAddress",
    "domain": "marketplace",
    "resource": "payments",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/marketplace/commands/update-treasury-address",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "newTreasury",
          "source": "body",
          "field": "newTreasury"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "updateTreasuryAddress",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "PaymentFacet.updateTreasuryAddress",
    "methodName": "updateTreasuryAddress",
    "signature": "updateTreasuryAddress(address)",
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
        "name": "newTreasury",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": []
  },
  {
    "key": "PaymentFacet.updateUnionTreasuryAddress",
    "facetName": "PaymentFacet",
    "wrapperKey": "updateUnionTreasuryAddress",
    "domain": "marketplace",
    "resource": "payments",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/marketplace/commands/update-union-treasury-address",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "newUnionTreasury",
          "source": "body",
          "field": "newUnionTreasury"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "updateUnionTreasuryAddress",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "PaymentFacet.updateUnionTreasuryAddress",
    "methodName": "updateUnionTreasuryAddress",
    "signature": "updateUnionTreasuryAddress(address)",
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
        "name": "newUnionTreasury",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": []
  },
  {
    "key": "PaymentFacet.withdrawPayments",
    "facetName": "PaymentFacet",
    "wrapperKey": "withdrawPayments",
    "domain": "marketplace",
    "resource": "payments",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/marketplace/commands/withdraw-payments",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "withdrawPayments",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "PaymentFacet.withdrawPayments",
    "methodName": "withdrawPayments",
    "signature": "withdrawPayments()",
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
    "key": "PaymentFacet.withdrawPaymentsWithDeadline",
    "facetName": "PaymentFacet",
    "wrapperKey": "withdrawPaymentsWithDeadline",
    "domain": "marketplace",
    "resource": "payments",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/marketplace/commands/withdraw-payments-with-deadline",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "deadline",
          "source": "body",
          "field": "deadline"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "withdrawPaymentsWithDeadline",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "PaymentFacet.withdrawPaymentsWithDeadline",
    "methodName": "withdrawPaymentsWithDeadline",
    "signature": "withdrawPaymentsWithDeadline(uint256)",
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
        "name": "deadline",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  }
] as HttpMethodDefinition[];
export const marketplaceEventDefinitions: HttpEventDefinition[] = [
  {
    "key": "EscrowFacet.AssetEscrowed",
    "facetName": "EscrowFacet",
    "wrapperKey": "AssetEscrowed",
    "domain": "marketplace",
    "operationId": "escrowAssetEscrowedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/marketplace/events/asset-escrowed/query/escrow",
    "notes": "EscrowFacet.AssetEscrowed",
    "eventName": "AssetEscrowed",
    "signature": "AssetEscrowed(uint256,address,uint8)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "enum IEscrowFacet.EscrowState",
        "name": "state",
        "type": "uint8"
      }
    ],
    "projection": {
      "domain": "marketplace",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "EscrowFacet.AssetReleased",
    "facetName": "EscrowFacet",
    "wrapperKey": "AssetReleased",
    "domain": "marketplace",
    "operationId": "assetReleasedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/marketplace/events/asset-released/query",
    "notes": "EscrowFacet.AssetReleased",
    "eventName": "AssetReleased",
    "signature": "AssetReleased(uint256,address)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      }
    ],
    "projection": {
      "domain": "marketplace",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "EscrowFacet.AssetStateUpdated",
    "facetName": "EscrowFacet",
    "wrapperKey": "AssetStateUpdated",
    "domain": "marketplace",
    "operationId": "assetStateUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/marketplace/events/asset-state-updated/query",
    "notes": "EscrowFacet.AssetStateUpdated",
    "eventName": "AssetStateUpdated",
    "signature": "AssetStateUpdated(uint256,uint8)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "enum IEscrowFacet.EscrowState",
        "name": "newState",
        "type": "uint8"
      }
    ],
    "projection": {
      "domain": "marketplace",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "MarketplaceFacet.AssetEscrowed",
    "facetName": "MarketplaceFacet",
    "wrapperKey": "AssetEscrowed",
    "domain": "marketplace",
    "operationId": "marketplaceAssetEscrowedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/marketplace/events/asset-escrowed/query/marketplace",
    "notes": "MarketplaceFacet.AssetEscrowed",
    "eventName": "AssetEscrowed",
    "signature": "AssetEscrowed(uint256,address,uint8)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "owner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "state",
        "type": "uint8",
        "indexed": false,
        "internalType": "enum IEscrowFacet.EscrowState"
      }
    ],
    "projection": {
      "domain": "market",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "market_listings",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "MarketplaceFacet.AssetListed",
    "facetName": "MarketplaceFacet",
    "wrapperKey": "AssetListed",
    "domain": "marketplace",
    "operationId": "assetListedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/marketplace/events/asset-listed/query",
    "notes": "MarketplaceFacet.AssetListed",
    "eventName": "AssetListed",
    "signature": "AssetListed(uint256,address,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "seller",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "price",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "market",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "market_listings",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "MarketplaceFacet.AssetPurchased",
    "facetName": "MarketplaceFacet",
    "wrapperKey": "AssetPurchased",
    "domain": "marketplace",
    "operationId": "assetPurchasedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/marketplace/events/asset-purchased/query",
    "notes": "MarketplaceFacet.AssetPurchased",
    "eventName": "AssetPurchased",
    "signature": "AssetPurchased(uint256,address,address,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "seller",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "buyer",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "price",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "market",
      "projectionMode": "ledger",
      "targets": [
        {
          "table": "market_sales",
          "mode": "ledger"
        }
      ]
    }
  },
  {
    "key": "MarketplaceFacet.ListingCancelled",
    "facetName": "MarketplaceFacet",
    "wrapperKey": "ListingCancelled",
    "domain": "marketplace",
    "operationId": "listingCancelledEventQuery",
    "httpMethod": "POST",
    "path": "/v1/marketplace/events/listing-cancelled/query",
    "notes": "MarketplaceFacet.ListingCancelled",
    "eventName": "ListingCancelled",
    "signature": "ListingCancelled(uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "market",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "market_listings",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "MarketplaceFacet.ListingPriceUpdated",
    "facetName": "MarketplaceFacet",
    "wrapperKey": "ListingPriceUpdated",
    "domain": "marketplace",
    "operationId": "listingPriceUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/marketplace/events/listing-price-updated/query",
    "notes": "MarketplaceFacet.ListingPriceUpdated",
    "eventName": "ListingPriceUpdated",
    "signature": "ListingPriceUpdated(uint256,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "newPrice",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "market",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "market_listings",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "MarketplaceFacet.MarketplacePaused",
    "facetName": "MarketplaceFacet",
    "wrapperKey": "MarketplacePaused",
    "domain": "marketplace",
    "operationId": "marketplacePausedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/marketplace/events/marketplace-paused/query",
    "notes": "MarketplaceFacet.MarketplacePaused",
    "eventName": "MarketplacePaused",
    "signature": "MarketplacePaused(address)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "operator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "projection": {
      "domain": "market",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "market_listings",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "MarketplaceFacet.MarketplaceUnpaused",
    "facetName": "MarketplaceFacet",
    "wrapperKey": "MarketplaceUnpaused",
    "domain": "marketplace",
    "operationId": "marketplaceUnpausedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/marketplace/events/marketplace-unpaused/query",
    "notes": "MarketplaceFacet.MarketplaceUnpaused",
    "eventName": "MarketplaceUnpaused",
    "signature": "MarketplaceUnpaused(address)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "operator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "projection": {
      "domain": "market",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "market_listings",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "PaymentFacet.BuybackAccumulatorUpdated",
    "facetName": "PaymentFacet",
    "wrapperKey": "BuybackAccumulatorUpdated",
    "domain": "marketplace",
    "operationId": "buybackAccumulatorUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/marketplace/events/buyback-accumulator-updated/query",
    "notes": "PaymentFacet.BuybackAccumulatorUpdated",
    "eventName": "BuybackAccumulatorUpdated",
    "signature": "BuybackAccumulatorUpdated(uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "newBalance",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "payment",
      "projectionMode": "ledger",
      "targets": [
        {
          "table": "payment_flows",
          "mode": "ledger"
        }
      ]
    }
  },
  {
    "key": "PaymentFacet.BuybackConfigUpdated",
    "facetName": "PaymentFacet",
    "wrapperKey": "BuybackConfigUpdated",
    "domain": "marketplace",
    "operationId": "buybackConfigUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/marketplace/events/buyback-config-updated/query",
    "notes": "PaymentFacet.BuybackConfigUpdated",
    "eventName": "BuybackConfigUpdated",
    "signature": "BuybackConfigUpdated(uint256,uint256,uint256,uint256,address,address,address)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "buybackBps",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "minMonthlyRevenue",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "requiredMonths",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "cadence",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "router",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "uspkToken",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "burnAddress",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "projection": {
      "domain": "payment",
      "projectionMode": "ledger",
      "targets": [
        {
          "table": "payment_flows",
          "mode": "ledger"
        }
      ]
    }
  },
  {
    "key": "PaymentFacet.BuybackExecuted",
    "facetName": "PaymentFacet",
    "wrapperKey": "BuybackExecuted",
    "domain": "marketplace",
    "operationId": "buybackExecutedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/marketplace/events/buyback-executed/query",
    "notes": "PaymentFacet.BuybackExecuted",
    "eventName": "BuybackExecuted",
    "signature": "BuybackExecuted(uint256,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "usdcSpent",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "uspkBurned",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "payment",
      "projectionMode": "ledger",
      "targets": [
        {
          "table": "payment_flows",
          "mode": "ledger"
        }
      ]
    }
  },
  {
    "key": "PaymentFacet.BuybackPaused",
    "facetName": "PaymentFacet",
    "wrapperKey": "BuybackPaused",
    "domain": "marketplace",
    "operationId": "buybackPausedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/marketplace/events/buyback-paused/query",
    "notes": "PaymentFacet.BuybackPaused",
    "eventName": "BuybackPaused",
    "signature": "BuybackPaused(bool)",
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
      "domain": "payment",
      "projectionMode": "ledger",
      "targets": [
        {
          "table": "payment_flows",
          "mode": "ledger"
        }
      ]
    }
  },
  {
    "key": "PaymentFacet.ClaimCommitted",
    "facetName": "PaymentFacet",
    "wrapperKey": "ClaimCommitted",
    "domain": "marketplace",
    "operationId": "claimCommittedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/marketplace/events/claim-committed/query",
    "notes": "PaymentFacet.ClaimCommitted",
    "eventName": "ClaimCommitted",
    "signature": "ClaimCommitted(address,bytes32,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "claimant",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "commitHash",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "commitBlock",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "payment",
      "projectionMode": "ledger",
      "targets": [
        {
          "table": "payment_flows",
          "mode": "ledger"
        }
      ]
    }
  },
  {
    "key": "PaymentFacet.ClaimRevealed",
    "facetName": "PaymentFacet",
    "wrapperKey": "ClaimRevealed",
    "domain": "marketplace",
    "operationId": "claimRevealedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/marketplace/events/claim-revealed/query",
    "notes": "PaymentFacet.ClaimRevealed",
    "eventName": "ClaimRevealed",
    "signature": "ClaimRevealed(address,bytes32)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "claimant",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "commitHash",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      }
    ],
    "projection": {
      "domain": "payment",
      "projectionMode": "ledger",
      "targets": [
        {
          "table": "payment_flows",
          "mode": "ledger"
        }
      ]
    }
  },
  {
    "key": "PaymentFacet.DatasetRoyaltyAccrued",
    "facetName": "PaymentFacet",
    "wrapperKey": "DatasetRoyaltyAccrued",
    "domain": "marketplace",
    "operationId": "datasetRoyaltyAccruedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/marketplace/events/dataset-royalty-accrued/query",
    "notes": "PaymentFacet.DatasetRoyaltyAccrued",
    "eventName": "DatasetRoyaltyAccrued",
    "signature": "DatasetRoyaltyAccrued(uint256,address,address,address,uint256,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "datasetTokenId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "payee",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "seller",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "buyer",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "salePrice",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "royaltyAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "payment",
      "projectionMode": "ledger",
      "targets": [
        {
          "table": "payment_flows",
          "mode": "ledger"
        }
      ]
    }
  },
  {
    "key": "PaymentFacet.DevFundAddressUpdated",
    "facetName": "PaymentFacet",
    "wrapperKey": "DevFundAddressUpdated",
    "domain": "marketplace",
    "operationId": "devFundAddressUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/marketplace/events/dev-fund-address-updated/query",
    "notes": "PaymentFacet.DevFundAddressUpdated",
    "eventName": "DevFundAddressUpdated",
    "signature": "DevFundAddressUpdated(address)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "newDevFund",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "projection": {
      "domain": "payment",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "payment_flows",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "PaymentFacet.FeeConfigurationUpdated",
    "facetName": "PaymentFacet",
    "wrapperKey": "FeeConfigurationUpdated",
    "domain": "marketplace",
    "operationId": "feeConfigurationUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/marketplace/events/fee-configuration-updated/query",
    "notes": "PaymentFacet.FeeConfigurationUpdated",
    "eventName": "FeeConfigurationUpdated",
    "signature": "FeeConfigurationUpdated(tuple)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "config",
        "type": "tuple",
        "indexed": false,
        "internalType": "struct PaymentStorage.FeeConfig",
        "components": [
          {
            "name": "platformFee",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "unionShare",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "devFund",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "timewaveGift",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "referralFee",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "milestonePool",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "projection": {
      "domain": "payment",
      "projectionMode": "ledger",
      "targets": [
        {
          "table": "payment_flows",
          "mode": "ledger"
        }
      ]
    }
  },
  {
    "key": "PaymentFacet.FlashbotsSuggested",
    "facetName": "PaymentFacet",
    "wrapperKey": "FlashbotsSuggested",
    "domain": "marketplace",
    "operationId": "flashbotsSuggestedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/marketplace/events/flashbots-suggested/query",
    "notes": "PaymentFacet.FlashbotsSuggested",
    "eventName": "FlashbotsSuggested",
    "signature": "FlashbotsSuggested(uint256,uint256,address)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "payer",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "projection": {
      "domain": "payment",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "payment_flows",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "PaymentFacet.MetadataAccessed",
    "facetName": "PaymentFacet",
    "wrapperKey": "MetadataAccessed",
    "domain": "marketplace",
    "operationId": "metadataAccessedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/marketplace/events/metadata-accessed/query",
    "notes": "PaymentFacet.MetadataAccessed",
    "eventName": "MetadataAccessed",
    "signature": "MetadataAccessed(uint256,address,string)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "accessor",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "ipfsHash",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      }
    ],
    "projection": {
      "domain": "payment",
      "projectionMode": "ledger",
      "targets": [
        {
          "table": "payment_flows",
          "mode": "ledger"
        }
      ]
    }
  },
  {
    "key": "PaymentFacet.PauseStateChanged",
    "facetName": "PaymentFacet",
    "wrapperKey": "PauseStateChanged",
    "domain": "marketplace",
    "operationId": "pauseStateChangedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/marketplace/events/pause-state-changed/query",
    "notes": "PaymentFacet.PauseStateChanged",
    "eventName": "PauseStateChanged",
    "signature": "PauseStateChanged(bool,address)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "paused",
        "type": "bool",
        "indexed": true,
        "internalType": "bool"
      },
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "projection": {
      "domain": "payment",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "payment_flows",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "PaymentFacet.PaymentDistributed",
    "facetName": "PaymentFacet",
    "wrapperKey": "PaymentDistributed",
    "domain": "marketplace",
    "operationId": "paymentDistributedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/marketplace/events/payment-distributed/query",
    "notes": "PaymentFacet.PaymentDistributed",
    "eventName": "PaymentDistributed",
    "signature": "PaymentDistributed(uint256,address,address,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "seller",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "buyer",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "payment",
      "projectionMode": "ledger",
      "targets": [
        {
          "table": "payment_flows",
          "mode": "ledger"
        }
      ]
    }
  },
  {
    "key": "PaymentFacet.TimewaveGiftCreated",
    "facetName": "PaymentFacet",
    "wrapperKey": "TimewaveGiftCreated",
    "domain": "marketplace",
    "operationId": "timewaveGiftCreatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/marketplace/events/timewave-gift-created/query",
    "notes": "PaymentFacet.TimewaveGiftCreated",
    "eventName": "TimewaveGiftCreated",
    "signature": "TimewaveGiftCreated(address,uint256,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "beneficiary",
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
        "name": "duration",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "payment",
      "projectionMode": "ledger",
      "targets": [
        {
          "table": "payment_flows",
          "mode": "ledger"
        }
      ]
    }
  },
  {
    "key": "PaymentFacet.TreasuryAddressUpdated",
    "facetName": "PaymentFacet",
    "wrapperKey": "TreasuryAddressUpdated",
    "domain": "marketplace",
    "operationId": "treasuryAddressUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/marketplace/events/treasury-address-updated/query",
    "notes": "PaymentFacet.TreasuryAddressUpdated",
    "eventName": "TreasuryAddressUpdated",
    "signature": "TreasuryAddressUpdated(address)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "newTreasury",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "projection": {
      "domain": "payment",
      "projectionMode": "ledger",
      "targets": [
        {
          "table": "payment_flows",
          "mode": "ledger"
        }
      ]
    }
  },
  {
    "key": "PaymentFacet.UnionTreasuryAddressUpdated",
    "facetName": "PaymentFacet",
    "wrapperKey": "UnionTreasuryAddressUpdated",
    "domain": "marketplace",
    "operationId": "unionTreasuryAddressUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/marketplace/events/union-treasury-address-updated/query",
    "notes": "PaymentFacet.UnionTreasuryAddressUpdated",
    "eventName": "UnionTreasuryAddressUpdated",
    "signature": "UnionTreasuryAddressUpdated(address)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "newUnionTreasury",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "projection": {
      "domain": "payment",
      "projectionMode": "ledger",
      "targets": [
        {
          "table": "payment_flows",
          "mode": "ledger"
        }
      ]
    }
  },
  {
    "key": "PaymentFacet.USDCPaymentWithdrawn",
    "facetName": "PaymentFacet",
    "wrapperKey": "USDCPaymentWithdrawn",
    "domain": "marketplace",
    "operationId": "usdcpaymentWithdrawnEventQuery",
    "httpMethod": "POST",
    "path": "/v1/marketplace/events/usdcpayment-withdrawn/query",
    "notes": "PaymentFacet.USDCPaymentWithdrawn",
    "eventName": "USDCPaymentWithdrawn",
    "signature": "USDCPaymentWithdrawn(address,uint256)",
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
        "name": "amount",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "payment",
      "projectionMode": "ledger",
      "targets": [
        {
          "table": "payment_withdrawals",
          "mode": "ledger"
        },
        {
          "table": "payment_flows",
          "mode": "ledger"
        }
      ]
    }
  },
  {
    "key": "PaymentFacet.UsdcTokenUpdated",
    "facetName": "PaymentFacet",
    "wrapperKey": "UsdcTokenUpdated",
    "domain": "marketplace",
    "operationId": "usdcTokenUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/marketplace/events/usdc-token-updated/query",
    "notes": "PaymentFacet.UsdcTokenUpdated",
    "eventName": "UsdcTokenUpdated",
    "signature": "UsdcTokenUpdated(address)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "newUsdcToken",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "projection": {
      "domain": "payment",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "payment_flows",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "PaymentFacet.WithdrawalLimitUpdated",
    "facetName": "PaymentFacet",
    "wrapperKey": "WithdrawalLimitUpdated",
    "domain": "marketplace",
    "operationId": "withdrawalLimitUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/marketplace/events/withdrawal-limit-updated/query",
    "notes": "PaymentFacet.WithdrawalLimitUpdated",
    "eventName": "WithdrawalLimitUpdated",
    "signature": "WithdrawalLimitUpdated(uint256,uint256,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "limit",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "window",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "cooldown",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "payment",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "payment_withdrawals",
          "mode": "ledger"
        },
        {
          "table": "payment_flows",
          "mode": "current"
        }
      ]
    }
  }
] as HttpEventDefinition[];
