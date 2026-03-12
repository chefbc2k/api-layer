import type { HttpEventDefinition, HttpMethodDefinition } from "../../../../shared/route-types.js";

export const tokenomicsMethodDefinitions: HttpMethodDefinition[] = [
  {
    "key": "BurnThresholdFacet.thresholdBurnExcess",
    "facetName": "BurnThresholdFacet",
    "wrapperKey": "thresholdBurnExcess",
    "domain": "tokenomics",
    "resource": "burn-thresholds",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/commands/threshold-burn-excess",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "account",
          "source": "body",
          "field": "account"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "thresholdBurnExcess",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "BurnThresholdFacet.thresholdBurnExcess",
    "methodName": "thresholdBurnExcess",
    "signature": "thresholdBurnExcess(address)",
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
        "name": "account",
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
    "key": "BurnThresholdFacet.thresholdBurnTokens",
    "facetName": "BurnThresholdFacet",
    "wrapperKey": "thresholdBurnTokens",
    "domain": "tokenomics",
    "resource": "burn-thresholds",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/commands/threshold-burn-tokens",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "amount",
          "source": "body",
          "field": "amount"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "thresholdBurnTokens",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "BurnThresholdFacet.thresholdBurnTokens",
    "methodName": "thresholdBurnTokens",
    "signature": "thresholdBurnTokens(uint256)",
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
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "BurnThresholdFacet.thresholdBurnTokensFrom",
    "facetName": "BurnThresholdFacet",
    "wrapperKey": "thresholdBurnTokensFrom",
    "domain": "tokenomics",
    "resource": "burn-thresholds",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/commands/threshold-burn-tokens-from",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "account",
          "source": "body",
          "field": "account"
        },
        {
          "name": "amount",
          "source": "body",
          "field": "amount"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "thresholdBurnTokensFrom",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "BurnThresholdFacet.thresholdBurnTokensFrom",
    "methodName": "thresholdBurnTokensFrom",
    "signature": "thresholdBurnTokensFrom(address,uint256)",
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
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "BurnThresholdFacet.thresholdCalculateExcess",
    "facetName": "BurnThresholdFacet",
    "wrapperKey": "thresholdCalculateExcess",
    "domain": "tokenomics",
    "resource": "burn-thresholds",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/tokenomics/queries/threshold-calculate-excess",
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
    "operationId": "thresholdCalculateExcess",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "BurnThresholdFacet.thresholdCalculateExcess",
    "methodName": "thresholdCalculateExcess",
    "signature": "thresholdCalculateExcess(address)",
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
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "key": "BurnThresholdFacet.thresholdGetBurnLimit",
    "facetName": "BurnThresholdFacet",
    "wrapperKey": "thresholdGetBurnLimit",
    "domain": "tokenomics",
    "resource": "burn-thresholds",
    "classification": "read",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/queries/threshold-get-burn-limit",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "thresholdGetBurnLimit",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "BurnThresholdFacet.thresholdGetBurnLimit",
    "methodName": "thresholdGetBurnLimit",
    "signature": "thresholdGetBurnLimit()",
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
    "key": "BurnThresholdFacet.thresholdSetBurnLimit",
    "facetName": "BurnThresholdFacet",
    "wrapperKey": "thresholdSetBurnLimit",
    "domain": "tokenomics",
    "resource": "burn-thresholds",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/commands/threshold-set-burn-limit",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "threshold",
          "source": "body",
          "field": "threshold"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "thresholdSetBurnLimit",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "BurnThresholdFacet.thresholdSetBurnLimit",
    "methodName": "thresholdSetBurnLimit",
    "signature": "thresholdSetBurnLimit(uint256)",
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
        "name": "threshold",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "CommunityRewardsFacet.campaignCount",
    "facetName": "CommunityRewardsFacet",
    "wrapperKey": "campaignCount",
    "domain": "tokenomics",
    "resource": "community-rewards",
    "classification": "read",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/queries/campaign-count",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "campaignCount",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "CommunityRewardsFacet.campaignCount",
    "methodName": "campaignCount",
    "signature": "campaignCount()",
    "category": "read",
    "mutability": "view",
    "liveRequired": false,
    "cacheClass": "none",
    "cacheTtlSeconds": null,
    "executionSources": [
      "live"
    ],
    "gaslessModes": [],
    "inputs": [],
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ]
  },
  {
    "key": "CommunityRewardsFacet.claim",
    "facetName": "CommunityRewardsFacet",
    "wrapperKey": "claim",
    "domain": "tokenomics",
    "resource": "community-rewards",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/commands/claim",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "campaignId",
          "source": "body",
          "field": "campaignId"
        },
        {
          "name": "totalAllocation",
          "source": "body",
          "field": "totalAllocation"
        },
        {
          "name": "proof",
          "source": "body",
          "field": "proof"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "claim",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "CommunityRewardsFacet.claim",
    "methodName": "claim",
    "signature": "claim(uint256,uint256,bytes32[])",
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
        "name": "campaignId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalAllocation",
        "type": "uint256"
      },
      {
        "internalType": "bytes32[]",
        "name": "proof",
        "type": "bytes32[]"
      }
    ],
    "outputs": [
      {
        "internalType": "uint256",
        "name": "claimedNow",
        "type": "uint256"
      }
    ]
  },
  {
    "key": "CommunityRewardsFacet.claimableAmount",
    "facetName": "CommunityRewardsFacet",
    "wrapperKey": "claimableAmount",
    "domain": "tokenomics",
    "resource": "community-rewards",
    "classification": "read",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/queries/claimable-amount",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "campaignId",
          "source": "body",
          "field": "campaignId"
        },
        {
          "name": "account",
          "source": "body",
          "field": "account"
        },
        {
          "name": "totalAllocation",
          "source": "body",
          "field": "totalAllocation"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "claimableAmount",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "CommunityRewardsFacet.claimableAmount",
    "methodName": "claimableAmount",
    "signature": "claimableAmount(uint256,address,uint256)",
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
        "name": "campaignId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "totalAllocation",
        "type": "uint256"
      }
    ],
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ]
  },
  {
    "key": "CommunityRewardsFacet.claimed",
    "facetName": "CommunityRewardsFacet",
    "wrapperKey": "claimed",
    "domain": "tokenomics",
    "resource": "community-rewards",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/tokenomics/queries/claimed",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "campaignId",
          "source": "query",
          "field": "campaignId"
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
    "operationId": "claimed",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "CommunityRewardsFacet.claimed",
    "methodName": "claimed",
    "signature": "claimed(uint256,address)",
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
        "name": "campaignId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ]
  },
  {
    "key": "CommunityRewardsFacet.createCampaign",
    "facetName": "CommunityRewardsFacet",
    "wrapperKey": "createCampaign",
    "domain": "tokenomics",
    "resource": "community-rewards",
    "classification": "create",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/community-rewards",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "merkleRoot",
          "source": "body",
          "field": "merkleRoot"
        },
        {
          "name": "startTime",
          "source": "body",
          "field": "startTime"
        },
        {
          "name": "cliffSeconds",
          "source": "body",
          "field": "cliffSeconds"
        },
        {
          "name": "durationSeconds",
          "source": "body",
          "field": "durationSeconds"
        },
        {
          "name": "tgeUnlockBps",
          "source": "body",
          "field": "tgeUnlockBps"
        },
        {
          "name": "maxTotalClaimable",
          "source": "body",
          "field": "maxTotalClaimable"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "createCampaign",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "CommunityRewardsFacet.createCampaign",
    "methodName": "createCampaign",
    "signature": "createCampaign(bytes32,uint64,uint64,uint64,uint16,uint256)",
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
        "name": "merkleRoot",
        "type": "bytes32"
      },
      {
        "internalType": "uint64",
        "name": "startTime",
        "type": "uint64"
      },
      {
        "internalType": "uint64",
        "name": "cliffSeconds",
        "type": "uint64"
      },
      {
        "internalType": "uint64",
        "name": "durationSeconds",
        "type": "uint64"
      },
      {
        "internalType": "uint16",
        "name": "tgeUnlockBps",
        "type": "uint16"
      },
      {
        "internalType": "uint256",
        "name": "maxTotalClaimable",
        "type": "uint256"
      }
    ],
    "outputs": [
      {
        "internalType": "uint256",
        "name": "campaignId",
        "type": "uint256"
      }
    ]
  },
  {
    "key": "CommunityRewardsFacet.getCampaign",
    "facetName": "CommunityRewardsFacet",
    "wrapperKey": "getCampaign",
    "domain": "tokenomics",
    "resource": "community-rewards",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/tokenomics/queries/get-campaign",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "campaignId",
          "source": "query",
          "field": "campaignId"
        }
      ]
    },
    "outputShape": {
      "kind": "object"
    },
    "operationId": "getCampaign",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "CommunityRewardsFacet.getCampaign",
    "methodName": "getCampaign",
    "signature": "getCampaign(uint256)",
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
        "name": "campaignId",
        "type": "uint256"
      }
    ],
    "outputs": [
      {
        "components": [
          {
            "internalType": "bytes32",
            "name": "merkleRoot",
            "type": "bytes32"
          },
          {
            "internalType": "uint64",
            "name": "startTime",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "cliffSeconds",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "durationSeconds",
            "type": "uint64"
          },
          {
            "internalType": "uint16",
            "name": "tgeUnlockBps",
            "type": "uint16"
          },
          {
            "internalType": "uint256",
            "name": "maxTotalClaimable",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalClaimed",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "paused",
            "type": "bool"
          }
        ],
        "internalType": "struct CommunityRewardsStorage.Campaign",
        "name": "",
        "type": "tuple"
      }
    ]
  },
  {
    "key": "CommunityRewardsFacet.pauseCampaign",
    "facetName": "CommunityRewardsFacet",
    "wrapperKey": "pauseCampaign",
    "domain": "tokenomics",
    "resource": "community-rewards",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/commands/pause-campaign",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "campaignId",
          "source": "body",
          "field": "campaignId"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "pauseCampaign",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "CommunityRewardsFacet.pauseCampaign",
    "methodName": "pauseCampaign",
    "signature": "pauseCampaign(uint256)",
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
        "name": "campaignId",
        "type": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "CommunityRewardsFacet.setMerkleRoot",
    "facetName": "CommunityRewardsFacet",
    "wrapperKey": "setMerkleRoot",
    "domain": "tokenomics",
    "resource": "community-rewards",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/tokenomics/commands/set-merkle-root",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "campaignId",
          "source": "body",
          "field": "campaignId"
        },
        {
          "name": "newRoot",
          "source": "body",
          "field": "newRoot"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setMerkleRoot",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "CommunityRewardsFacet.setMerkleRoot",
    "methodName": "setMerkleRoot",
    "signature": "setMerkleRoot(uint256,bytes32)",
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
        "name": "campaignId",
        "type": "uint256"
      },
      {
        "internalType": "bytes32",
        "name": "newRoot",
        "type": "bytes32"
      }
    ],
    "outputs": []
  },
  {
    "key": "CommunityRewardsFacet.unpauseCampaign",
    "facetName": "CommunityRewardsFacet",
    "wrapperKey": "unpauseCampaign",
    "domain": "tokenomics",
    "resource": "community-rewards",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/commands/unpause-campaign",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "campaignId",
          "source": "body",
          "field": "campaignId"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "unpauseCampaign",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "CommunityRewardsFacet.unpauseCampaign",
    "methodName": "unpauseCampaign",
    "signature": "unpauseCampaign(uint256)",
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
        "name": "campaignId",
        "type": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "CommunityRewardsFacet.vestedAmount",
    "facetName": "CommunityRewardsFacet",
    "wrapperKey": "vestedAmount",
    "domain": "tokenomics",
    "resource": "community-rewards",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/tokenomics/queries/vested-amount",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "campaignId",
          "source": "query",
          "field": "campaignId"
        },
        {
          "name": "totalAllocation",
          "source": "query",
          "field": "totalAllocation"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "vestedAmount",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "CommunityRewardsFacet.vestedAmount",
    "methodName": "vestedAmount",
    "signature": "vestedAmount(uint256,uint256)",
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
        "name": "campaignId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalAllocation",
        "type": "uint256"
      }
    ],
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ]
  },
  {
    "key": "TimewaveGiftFacet.batchReleaseTwaveVesting",
    "facetName": "TimewaveGiftFacet",
    "wrapperKey": "batchReleaseTwaveVesting",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/commands/batch-release-twave-vesting",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "beneficiaries",
          "source": "body",
          "field": "beneficiaries"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "batchReleaseTwaveVesting",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "TimewaveGiftFacet.batchReleaseTwaveVesting",
    "methodName": "batchReleaseTwaveVesting",
    "signature": "batchReleaseTwaveVesting(address[])",
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
        "name": "beneficiaries",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "outputs": []
  },
  {
    "key": "TimewaveGiftFacet.canTransferVesting",
    "facetName": "TimewaveGiftFacet",
    "wrapperKey": "canTransferVesting",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/tokenomics/queries/can-transfer-vesting",
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
    "operationId": "canTransferVesting",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "TimewaveGiftFacet.canTransferVesting",
    "methodName": "canTransferVesting",
    "signature": "canTransferVesting(address)",
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
        "type": "bool",
        "internalType": "bool"
      }
    ]
  },
  {
    "key": "TimewaveGiftFacet.createUsdcVestingSchedule",
    "facetName": "TimewaveGiftFacet",
    "wrapperKey": "createUsdcVestingSchedule",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "create",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/vesting/create-usdc-vesting-schedule",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "beneficiary",
          "source": "body",
          "field": "beneficiary"
        },
        {
          "name": "amount",
          "source": "body",
          "field": "amount"
        },
        {
          "name": "startTime",
          "source": "body",
          "field": "startTime"
        },
        {
          "name": "duration",
          "source": "body",
          "field": "duration"
        },
        {
          "name": "cliff",
          "source": "body",
          "field": "cliff"
        },
        {
          "name": "isQuarterly",
          "source": "body",
          "field": "isQuarterly"
        },
        {
          "name": "isRevocable",
          "source": "body",
          "field": "isRevocable"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "createUsdcVestingSchedule",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "TimewaveGiftFacet.createUsdcVestingSchedule",
    "methodName": "createUsdcVestingSchedule",
    "signature": "createUsdcVestingSchedule(address,uint256,uint256,uint256,uint256,bool,bool)",
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
        "name": "beneficiary",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "startTime",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "duration",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "cliff",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "isQuarterly",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "isRevocable",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": []
  },
  {
    "key": "TimewaveGiftFacet.getMinTwaveVestingDuration",
    "facetName": "TimewaveGiftFacet",
    "wrapperKey": "getMinTwaveVestingDuration",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "read",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/queries/get-min-twave-vesting-duration",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "getMinTwaveVestingDuration",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "TimewaveGiftFacet.getMinTwaveVestingDuration",
    "methodName": "getMinTwaveVestingDuration",
    "signature": "getMinTwaveVestingDuration()",
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
    "key": "TimewaveGiftFacet.getNextUnlockTime",
    "facetName": "TimewaveGiftFacet",
    "wrapperKey": "getNextUnlockTime",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/tokenomics/queries/get-next-unlock-time",
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
    "operationId": "getNextUnlockTime",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "TimewaveGiftFacet.getNextUnlockTime",
    "methodName": "getNextUnlockTime",
    "signature": "getNextUnlockTime(address)",
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
    "key": "TimewaveGiftFacet.getQuarterlyUnlockRate",
    "facetName": "TimewaveGiftFacet",
    "wrapperKey": "getQuarterlyUnlockRate",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "read",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/queries/get-quarterly-unlock-rate",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "getQuarterlyUnlockRate",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "TimewaveGiftFacet.getQuarterlyUnlockRate",
    "methodName": "getQuarterlyUnlockRate",
    "signature": "getQuarterlyUnlockRate()",
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
    "key": "TimewaveGiftFacet.getReleasableTwaveAmount",
    "facetName": "TimewaveGiftFacet",
    "wrapperKey": "getReleasableTwaveAmount",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/tokenomics/queries/get-releasable-twave-amount",
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
    "operationId": "getReleasableTwaveAmount",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "TimewaveGiftFacet.getReleasableTwaveAmount",
    "methodName": "getReleasableTwaveAmount",
    "signature": "getReleasableTwaveAmount(address)",
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
    "key": "TimewaveGiftFacet.getVestedTwaveAmount",
    "facetName": "TimewaveGiftFacet",
    "wrapperKey": "getVestedTwaveAmount",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/tokenomics/queries/get-vested-twave-amount",
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
    "operationId": "getVestedTwaveAmount",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "TimewaveGiftFacet.getVestedTwaveAmount",
    "methodName": "getVestedTwaveAmount",
    "signature": "getVestedTwaveAmount(address)",
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
    "key": "TimewaveGiftFacet.getVestingTwaveSchedule",
    "facetName": "TimewaveGiftFacet",
    "wrapperKey": "getVestingTwaveSchedule",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/tokenomics/queries/get-vesting-twave-schedule",
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
      "kind": "tuple"
    },
    "operationId": "getVestingTwaveSchedule",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "TimewaveGiftFacet.getVestingTwaveSchedule",
    "methodName": "getVestingTwaveSchedule",
    "signature": "getVestingTwaveSchedule(address)",
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
        "name": "totalAmount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "releasedAmount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "startTime",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "duration",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "cliff",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "isQuarterly",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "isRevocable",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "isRevoked",
        "type": "bool",
        "internalType": "bool"
      }
    ]
  },
  {
    "key": "TimewaveGiftFacet.isFullyVested",
    "facetName": "TimewaveGiftFacet",
    "wrapperKey": "isFullyVested",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/tokenomics/queries/is-fully-vested",
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
    "operationId": "isFullyVested",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "TimewaveGiftFacet.isFullyVested",
    "methodName": "isFullyVested",
    "signature": "isFullyVested(address)",
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
        "type": "bool",
        "internalType": "bool"
      }
    ]
  },
  {
    "key": "TimewaveGiftFacet.isVestingActive",
    "facetName": "TimewaveGiftFacet",
    "wrapperKey": "isVestingActive",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/tokenomics/queries/is-vesting-active",
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
    "operationId": "isVestingActive",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "TimewaveGiftFacet.isVestingActive",
    "methodName": "isVestingActive",
    "signature": "isVestingActive(address)",
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
        "type": "bool",
        "internalType": "bool"
      }
    ]
  },
  {
    "key": "TimewaveGiftFacet.releaseTwaveVesting",
    "facetName": "TimewaveGiftFacet",
    "wrapperKey": "releaseTwaveVesting",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/commands/release-twave-vesting",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "releaseTwaveVesting",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "TimewaveGiftFacet.releaseTwaveVesting",
    "methodName": "releaseTwaveVesting",
    "signature": "releaseTwaveVesting()",
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
    "key": "TimewaveGiftFacet.releaseTwaveVestingFor",
    "facetName": "TimewaveGiftFacet",
    "wrapperKey": "releaseTwaveVestingFor",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/commands/release-twave-vesting-for",
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
    "operationId": "releaseTwaveVestingFor",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "TimewaveGiftFacet.releaseTwaveVestingFor",
    "methodName": "releaseTwaveVestingFor",
    "signature": "releaseTwaveVestingFor(address)",
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
        "name": "beneficiary",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": []
  },
  {
    "key": "TimewaveGiftFacet.revokeTwaveVesting",
    "facetName": "TimewaveGiftFacet",
    "wrapperKey": "revokeTwaveVesting",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "delete",
    "httpMethod": "DELETE",
    "path": "/v1/tokenomics/commands/revoke-twave-vesting",
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
    "operationId": "revokeTwaveVesting",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "TimewaveGiftFacet.revokeTwaveVesting",
    "methodName": "revokeTwaveVesting",
    "signature": "revokeTwaveVesting(address)",
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
        "name": "beneficiary",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": []
  },
  {
    "key": "TimewaveGiftFacet.setMinimumTwaveVestingDuration",
    "facetName": "TimewaveGiftFacet",
    "wrapperKey": "setMinimumTwaveVestingDuration",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/tokenomics/commands/set-minimum-twave-vesting-duration",
    "inputShape": {
      "kind": "body",
      "bindings": [
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
    "operationId": "setMinimumTwaveVestingDuration",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "TimewaveGiftFacet.setMinimumTwaveVestingDuration",
    "methodName": "setMinimumTwaveVestingDuration",
    "signature": "setMinimumTwaveVestingDuration(uint256)",
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
        "name": "duration",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "TimewaveGiftFacet.setQuarterlyUnlockRate",
    "facetName": "TimewaveGiftFacet",
    "wrapperKey": "setQuarterlyUnlockRate",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/tokenomics/commands/set-quarterly-unlock-rate",
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
    "operationId": "setQuarterlyUnlockRate",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "TimewaveGiftFacet.setQuarterlyUnlockRate",
    "methodName": "setQuarterlyUnlockRate",
    "signature": "setQuarterlyUnlockRate(uint256)",
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
    "key": "TimewaveGiftFacet.transferTwaveVesting",
    "facetName": "TimewaveGiftFacet",
    "wrapperKey": "transferTwaveVesting",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/commands/transfer-twave-vesting",
    "inputShape": {
      "kind": "body",
      "bindings": [
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
    "operationId": "transferTwaveVesting",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "TimewaveGiftFacet.transferTwaveVesting",
    "methodName": "transferTwaveVesting",
    "signature": "transferTwaveVesting(address)",
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
        "name": "to",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": []
  },
  {
    "key": "TokenSupplyFacet.allowance",
    "facetName": "TokenSupplyFacet",
    "wrapperKey": "allowance",
    "domain": "tokenomics",
    "resource": "token-supply",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/tokenomics/queries/allowance",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "owner",
          "source": "query",
          "field": "owner"
        },
        {
          "name": "spender",
          "source": "query",
          "field": "spender"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "allowance",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "TokenSupplyFacet.allowance",
    "methodName": "allowance",
    "signature": "allowance(address,address)",
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
        "name": "spender",
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
    "key": "TokenSupplyFacet.approve",
    "facetName": "TokenSupplyFacet",
    "wrapperKey": "approve",
    "domain": "tokenomics",
    "resource": "token-supply",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/commands/approve",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "spender",
          "source": "body",
          "field": "spender"
        },
        {
          "name": "amount",
          "source": "body",
          "field": "amount"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "approve",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "TokenSupplyFacet.approve",
    "methodName": "approve",
    "signature": "approve(address,uint256)",
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
        "name": "spender",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "amount",
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
    "key": "TokenSupplyFacet.balanceOf",
    "facetName": "TokenSupplyFacet",
    "wrapperKey": "balanceOf",
    "domain": "tokenomics",
    "resource": "token-supply",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/tokenomics/queries/balance-of",
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
    "operationId": "balanceOf",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "TokenSupplyFacet.balanceOf",
    "methodName": "balanceOf",
    "signature": "balanceOf(address)",
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
        "name": "account",
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
    "key": "TokenSupplyFacet.burn",
    "facetName": "TokenSupplyFacet",
    "wrapperKey": "burn",
    "domain": "tokenomics",
    "resource": "token-supply",
    "classification": "delete",
    "httpMethod": "DELETE",
    "path": "/v1/tokenomics/commands/burn",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "amount",
          "source": "body",
          "field": "amount"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "burn",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "TokenSupplyFacet.burn",
    "methodName": "burn",
    "signature": "burn(uint256)",
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
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "TokenSupplyFacet.burnFrom",
    "facetName": "TokenSupplyFacet",
    "wrapperKey": "burnFrom",
    "domain": "tokenomics",
    "resource": "token-supply",
    "classification": "delete",
    "httpMethod": "DELETE",
    "path": "/v1/tokenomics/commands/burn-from",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "account",
          "source": "body",
          "field": "account"
        },
        {
          "name": "amount",
          "source": "body",
          "field": "amount"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "burnFrom",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "TokenSupplyFacet.burnFrom",
    "methodName": "burnFrom",
    "signature": "burnFrom(address,uint256)",
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
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "TokenSupplyFacet.decimals",
    "facetName": "TokenSupplyFacet",
    "wrapperKey": "decimals",
    "domain": "tokenomics",
    "resource": "token-supply",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/queries/decimals",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "decimals",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "TokenSupplyFacet.decimals",
    "methodName": "decimals",
    "signature": "decimals()",
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
        "type": "uint8",
        "internalType": "uint8"
      }
    ]
  },
  {
    "key": "TokenSupplyFacet.initializeToken",
    "facetName": "TokenSupplyFacet",
    "wrapperKey": "initializeToken",
    "domain": "tokenomics",
    "resource": "token-supply",
    "classification": "create",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/token-supply",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "initializeToken",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "TokenSupplyFacet.initializeToken",
    "methodName": "initializeToken",
    "signature": "initializeToken()",
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
    "key": "TokenSupplyFacet.supplyFinishMinting",
    "facetName": "TokenSupplyFacet",
    "wrapperKey": "supplyFinishMinting",
    "domain": "tokenomics",
    "resource": "token-supply",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/commands/supply-finish-minting",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "supplyFinishMinting",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "TokenSupplyFacet.supplyFinishMinting",
    "methodName": "supplyFinishMinting",
    "signature": "supplyFinishMinting()",
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
    "key": "TokenSupplyFacet.supplyGetMaximum",
    "facetName": "TokenSupplyFacet",
    "wrapperKey": "supplyGetMaximum",
    "domain": "tokenomics",
    "resource": "token-supply",
    "classification": "read",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/queries/supply-get-maximum",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "supplyGetMaximum",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "TokenSupplyFacet.supplyGetMaximum",
    "methodName": "supplyGetMaximum",
    "signature": "supplyGetMaximum()",
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
    "key": "TokenSupplyFacet.supplyIsMintingFinished",
    "facetName": "TokenSupplyFacet",
    "wrapperKey": "supplyIsMintingFinished",
    "domain": "tokenomics",
    "resource": "token-supply",
    "classification": "read",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/queries/supply-is-minting-finished",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "supplyIsMintingFinished",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "TokenSupplyFacet.supplyIsMintingFinished",
    "methodName": "supplyIsMintingFinished",
    "signature": "supplyIsMintingFinished()",
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
    "key": "TokenSupplyFacet.supplyMintTokens",
    "facetName": "TokenSupplyFacet",
    "wrapperKey": "supplyMintTokens",
    "domain": "tokenomics",
    "resource": "token-supply",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/commands/supply-mint-tokens",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "to",
          "source": "body",
          "field": "to"
        },
        {
          "name": "amount",
          "source": "body",
          "field": "amount"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "supplyMintTokens",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "TokenSupplyFacet.supplyMintTokens",
    "methodName": "supplyMintTokens",
    "signature": "supplyMintTokens(address,uint256)",
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
        "name": "to",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "TokenSupplyFacet.supplySetMaximum",
    "facetName": "TokenSupplyFacet",
    "wrapperKey": "supplySetMaximum",
    "domain": "tokenomics",
    "resource": "token-supply",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/commands/supply-set-maximum",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "maxSupply_",
          "source": "body",
          "field": "maxSupply_"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "supplySetMaximum",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "TokenSupplyFacet.supplySetMaximum",
    "methodName": "supplySetMaximum",
    "signature": "supplySetMaximum(uint256)",
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
        "name": "maxSupply_",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "TokenSupplyFacet.tokenAllowance",
    "facetName": "TokenSupplyFacet",
    "wrapperKey": "tokenAllowance",
    "domain": "tokenomics",
    "resource": "token-supply",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/tokenomics/queries/token-allowance",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "owner",
          "source": "query",
          "field": "owner"
        },
        {
          "name": "spender",
          "source": "query",
          "field": "spender"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "tokenAllowance",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "TokenSupplyFacet.tokenAllowance",
    "methodName": "tokenAllowance",
    "signature": "tokenAllowance(address,address)",
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
        "name": "spender",
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
    "key": "TokenSupplyFacet.tokenApprove",
    "facetName": "TokenSupplyFacet",
    "wrapperKey": "tokenApprove",
    "domain": "tokenomics",
    "resource": "token-supply",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/commands/token-approve",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "spender",
          "source": "body",
          "field": "spender"
        },
        {
          "name": "amount",
          "source": "body",
          "field": "amount"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "tokenApprove",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "TokenSupplyFacet.tokenApprove",
    "methodName": "tokenApprove",
    "signature": "tokenApprove(address,uint256)",
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
        "name": "spender",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "amount",
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
    "key": "TokenSupplyFacet.tokenBalanceOf",
    "facetName": "TokenSupplyFacet",
    "wrapperKey": "tokenBalanceOf",
    "domain": "tokenomics",
    "resource": "token-supply",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/tokenomics/queries/token-balance-of",
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
    "operationId": "tokenBalanceOf",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "TokenSupplyFacet.tokenBalanceOf",
    "methodName": "tokenBalanceOf",
    "signature": "tokenBalanceOf(address)",
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
        "name": "account",
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
    "key": "TokenSupplyFacet.tokenName",
    "facetName": "TokenSupplyFacet",
    "wrapperKey": "tokenName",
    "domain": "tokenomics",
    "resource": "token-supply",
    "classification": "read",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/queries/token-name",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "tokenName",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "TokenSupplyFacet.tokenName",
    "methodName": "tokenName",
    "signature": "tokenName()",
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
    "key": "TokenSupplyFacet.tokenSymbol",
    "facetName": "TokenSupplyFacet",
    "wrapperKey": "tokenSymbol",
    "domain": "tokenomics",
    "resource": "token-supply",
    "classification": "read",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/queries/token-symbol",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "tokenSymbol",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "TokenSupplyFacet.tokenSymbol",
    "methodName": "tokenSymbol",
    "signature": "tokenSymbol()",
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
    "key": "TokenSupplyFacet.tokenTransferFrom",
    "facetName": "TokenSupplyFacet",
    "wrapperKey": "tokenTransferFrom",
    "domain": "tokenomics",
    "resource": "token-supply",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/commands/token-transfer-from",
    "inputShape": {
      "kind": "body",
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
          "name": "amount",
          "source": "body",
          "field": "amount"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "tokenTransferFrom",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "TokenSupplyFacet.tokenTransferFrom",
    "methodName": "tokenTransferFrom",
    "signature": "tokenTransferFrom(address,address,uint256)",
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
        "name": "amount",
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
    "key": "TokenSupplyFacet.totalSupply",
    "facetName": "TokenSupplyFacet",
    "wrapperKey": "totalSupply",
    "domain": "tokenomics",
    "resource": "token-supply",
    "classification": "read",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/queries/total-supply",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "totalSupply",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "TokenSupplyFacet.totalSupply",
    "methodName": "totalSupply",
    "signature": "totalSupply()",
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
    "key": "TokenSupplyFacet.transfer",
    "facetName": "TokenSupplyFacet",
    "wrapperKey": "transfer",
    "domain": "tokenomics",
    "resource": "token-supply",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/commands/transfer",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "to",
          "source": "body",
          "field": "to"
        },
        {
          "name": "amount",
          "source": "body",
          "field": "amount"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "transfer",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "TokenSupplyFacet.transfer",
    "methodName": "transfer",
    "signature": "transfer(address,uint256)",
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
        "name": "to",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "amount",
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
    "key": "TokenSupplyFacet.transferFrom",
    "facetName": "TokenSupplyFacet",
    "wrapperKey": "transferFrom",
    "domain": "tokenomics",
    "resource": "token-supply",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/commands/transfer-from",
    "inputShape": {
      "kind": "body",
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
          "name": "amount",
          "source": "body",
          "field": "amount"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "transferFrom",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "TokenSupplyFacet.transferFrom",
    "methodName": "transferFrom",
    "signature": "transferFrom(address,address,uint256)",
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
        "name": "amount",
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
    "key": "VestingFacet.calculateCexVesting",
    "facetName": "VestingFacet",
    "wrapperKey": "calculateCexVesting",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/queries/calculate-cex-vesting",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "amount",
          "source": "body",
          "field": "amount"
        },
        {
          "name": "startTime",
          "source": "body",
          "field": "startTime"
        },
        {
          "name": "timestamp",
          "source": "body",
          "field": "timestamp"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "calculateCexVesting",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VestingFacet.calculateCexVesting",
    "methodName": "calculateCexVesting",
    "signature": "calculateCexVesting(uint256,uint256,uint256)",
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
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "startTime",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ]
  },
  {
    "key": "VestingFacet.calculateDevFundVesting",
    "facetName": "VestingFacet",
    "wrapperKey": "calculateDevFundVesting",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/queries/calculate-dev-fund-vesting",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "amount",
          "source": "body",
          "field": "amount"
        },
        {
          "name": "startTime",
          "source": "body",
          "field": "startTime"
        },
        {
          "name": "timestamp",
          "source": "body",
          "field": "timestamp"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "calculateDevFundVesting",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VestingFacet.calculateDevFundVesting",
    "methodName": "calculateDevFundVesting",
    "signature": "calculateDevFundVesting(uint256,uint256,uint256)",
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
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "startTime",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ]
  },
  {
    "key": "VestingFacet.calculateFounderVesting",
    "facetName": "VestingFacet",
    "wrapperKey": "calculateFounderVesting",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/tokenomics/queries/calculate-founder-vesting",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "amount",
          "source": "query",
          "field": "amount"
        },
        {
          "name": "timestamp",
          "source": "query",
          "field": "timestamp"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "calculateFounderVesting",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VestingFacet.calculateFounderVesting",
    "methodName": "calculateFounderVesting",
    "signature": "calculateFounderVesting(uint256,uint256)",
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
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ]
  },
  {
    "key": "VestingFacet.calculatePublicVesting",
    "facetName": "VestingFacet",
    "wrapperKey": "calculatePublicVesting",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/queries/calculate-public-vesting",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "amount",
          "source": "body",
          "field": "amount"
        },
        {
          "name": "startTime",
          "source": "body",
          "field": "startTime"
        },
        {
          "name": "timestamp",
          "source": "body",
          "field": "timestamp"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "calculatePublicVesting",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VestingFacet.calculatePublicVesting",
    "methodName": "calculatePublicVesting",
    "signature": "calculatePublicVesting(uint256,uint256,uint256)",
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
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "startTime",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ]
  },
  {
    "key": "VestingFacet.calculateTeamVesting",
    "facetName": "VestingFacet",
    "wrapperKey": "calculateTeamVesting",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/queries/calculate-team-vesting",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "amount",
          "source": "body",
          "field": "amount"
        },
        {
          "name": "startTime",
          "source": "body",
          "field": "startTime"
        },
        {
          "name": "timestamp",
          "source": "body",
          "field": "timestamp"
        },
        {
          "name": "vestingType",
          "source": "body",
          "field": "vestingType"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "calculateTeamVesting",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VestingFacet.calculateTeamVesting",
    "methodName": "calculateTeamVesting",
    "signature": "calculateTeamVesting(uint256,uint256,uint256,uint8)",
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
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "startTime",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      },
      {
        "internalType": "enum IVesting.VestingType",
        "name": "vestingType",
        "type": "uint8"
      }
    ],
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ]
  },
  {
    "key": "VestingFacet.createCexVesting",
    "facetName": "VestingFacet",
    "wrapperKey": "createCexVesting",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "create",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/vesting/create-cex-vesting",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "beneficiary",
          "source": "body",
          "field": "beneficiary"
        },
        {
          "name": "amount",
          "source": "body",
          "field": "amount"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "createCexVesting",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VestingFacet.createCexVesting",
    "methodName": "createCexVesting",
    "signature": "createCexVesting(address,uint256)",
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
        "name": "beneficiary",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "VestingFacet.createDevFundVesting",
    "facetName": "VestingFacet",
    "wrapperKey": "createDevFundVesting",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "create",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/vesting/create-dev-fund-vesting",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "beneficiary",
          "source": "body",
          "field": "beneficiary"
        },
        {
          "name": "amount",
          "source": "body",
          "field": "amount"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "createDevFundVesting",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VestingFacet.createDevFundVesting",
    "methodName": "createDevFundVesting",
    "signature": "createDevFundVesting(address,uint256)",
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
        "name": "beneficiary",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "VestingFacet.createFounderVesting",
    "facetName": "VestingFacet",
    "wrapperKey": "createFounderVesting",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "create",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/vesting/create-founder-vesting",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "beneficiary",
          "source": "body",
          "field": "beneficiary"
        },
        {
          "name": "amount",
          "source": "body",
          "field": "amount"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "createFounderVesting",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VestingFacet.createFounderVesting",
    "methodName": "createFounderVesting",
    "signature": "createFounderVesting(address,uint256)",
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
        "name": "beneficiary",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "VestingFacet.createPublicVesting",
    "facetName": "VestingFacet",
    "wrapperKey": "createPublicVesting",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "create",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/vesting/create-public-vesting",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "beneficiary",
          "source": "body",
          "field": "beneficiary"
        },
        {
          "name": "amount",
          "source": "body",
          "field": "amount"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "createPublicVesting",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VestingFacet.createPublicVesting",
    "methodName": "createPublicVesting",
    "signature": "createPublicVesting(address,uint256)",
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
        "name": "beneficiary",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "VestingFacet.createTeamVesting",
    "facetName": "VestingFacet",
    "wrapperKey": "createTeamVesting",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "create",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/vesting/create-team-vesting",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "beneficiary",
          "source": "body",
          "field": "beneficiary"
        },
        {
          "name": "amount",
          "source": "body",
          "field": "amount"
        },
        {
          "name": "vestingType",
          "source": "body",
          "field": "vestingType"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "createTeamVesting",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VestingFacet.createTeamVesting",
    "methodName": "createTeamVesting",
    "signature": "createTeamVesting(address,uint256,uint8)",
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
        "name": "beneficiary",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "enum IVesting.VestingType",
        "name": "vestingType",
        "type": "uint8"
      }
    ],
    "outputs": []
  },
  {
    "key": "VestingFacet.getSellableAmount",
    "facetName": "VestingFacet",
    "wrapperKey": "getSellableAmount",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/tokenomics/queries/get-sellable-amount",
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
    "operationId": "getSellableAmount",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VestingFacet.getSellableAmount",
    "methodName": "getSellableAmount",
    "signature": "getSellableAmount(address)",
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
        "name": "beneficiary",
        "type": "address"
      }
    ],
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ]
  },
  {
    "key": "VestingFacet.getStandardVestedAmount",
    "facetName": "VestingFacet",
    "wrapperKey": "getStandardVestedAmount",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/tokenomics/queries/get-standard-vested-amount",
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
      "kind": "tuple"
    },
    "operationId": "getStandardVestedAmount",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VestingFacet.getStandardVestedAmount",
    "methodName": "getStandardVestedAmount",
    "signature": "getStandardVestedAmount(address)",
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
        "name": "beneficiary",
        "type": "address"
      }
    ],
    "outputs": [
      {
        "internalType": "uint256",
        "name": "totalVested",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalReleased",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "releasable",
        "type": "uint256"
      }
    ]
  },
  {
    "key": "VestingFacet.getStandardVestingReleasable",
    "facetName": "VestingFacet",
    "wrapperKey": "getStandardVestingReleasable",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/tokenomics/queries/get-standard-vesting-releasable",
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
    "operationId": "getStandardVestingReleasable",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VestingFacet.getStandardVestingReleasable",
    "methodName": "getStandardVestingReleasable",
    "signature": "getStandardVestingReleasable(address)",
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
        "name": "beneficiary",
        "type": "address"
      }
    ],
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ]
  },
  {
    "key": "VestingFacet.getStandardVestingSchedule",
    "facetName": "VestingFacet",
    "wrapperKey": "getStandardVestingSchedule",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/tokenomics/queries/get-standard-vesting-schedule",
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
      "kind": "object"
    },
    "operationId": "getStandardVestingSchedule",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VestingFacet.getStandardVestingSchedule",
    "methodName": "getStandardVestingSchedule",
    "signature": "getStandardVestingSchedule(address)",
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
        "name": "beneficiary",
        "type": "address"
      }
    ],
    "outputs": [
      {
        "components": [
          {
            "internalType": "enum IVesting.VestingType",
            "name": "vestingType",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "totalAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "releasedAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "startTime",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "duration",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "cliff",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lastReleaseTime",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "revocable",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "revoked",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "sellablePercentage",
            "type": "uint256"
          }
        ],
        "internalType": "struct IVesting.VestingScheduleView",
        "name": "",
        "type": "tuple"
      }
    ]
  },
  {
    "key": "VestingFacet.getVestingDetails",
    "facetName": "VestingFacet",
    "wrapperKey": "getVestingDetails",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/tokenomics/queries/get-vesting-details",
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
      "kind": "object"
    },
    "operationId": "getVestingDetails",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VestingFacet.getVestingDetails",
    "methodName": "getVestingDetails",
    "signature": "getVestingDetails(address)",
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
        "name": "beneficiary",
        "type": "address"
      }
    ],
    "outputs": [
      {
        "components": [
          {
            "internalType": "enum IVesting.VestingType",
            "name": "vestingType",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "totalAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "releasedAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "startTime",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "duration",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "cliff",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lastReleaseTime",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "revocable",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "revoked",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "sellablePercentage",
            "type": "uint256"
          }
        ],
        "internalType": "struct IVesting.VestingScheduleView",
        "name": "",
        "type": "tuple"
      }
    ]
  },
  {
    "key": "VestingFacet.getVestingReleasableAmount",
    "facetName": "VestingFacet",
    "wrapperKey": "getVestingReleasableAmount",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/tokenomics/queries/get-vesting-releasable-amount",
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
    "operationId": "getVestingReleasableAmount",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VestingFacet.getVestingReleasableAmount",
    "methodName": "getVestingReleasableAmount",
    "signature": "getVestingReleasableAmount(address)",
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
        "name": "beneficiary",
        "type": "address"
      }
    ],
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ]
  },
  {
    "key": "VestingFacet.getVestingTotalAmount",
    "facetName": "VestingFacet",
    "wrapperKey": "getVestingTotalAmount",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/tokenomics/queries/get-vesting-total-amount",
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
      "kind": "tuple"
    },
    "operationId": "getVestingTotalAmount",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VestingFacet.getVestingTotalAmount",
    "methodName": "getVestingTotalAmount",
    "signature": "getVestingTotalAmount(address)",
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
        "name": "beneficiary",
        "type": "address"
      }
    ],
    "outputs": [
      {
        "internalType": "uint256",
        "name": "totalVested",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalReleased",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "releasable",
        "type": "uint256"
      }
    ]
  },
  {
    "key": "VestingFacet.getVestingType",
    "facetName": "VestingFacet",
    "wrapperKey": "getVestingType",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/tokenomics/queries/get-vesting-type",
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
    "operationId": "getVestingType",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VestingFacet.getVestingType",
    "methodName": "getVestingType",
    "signature": "getVestingType(address)",
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
        "name": "beneficiary",
        "type": "address"
      }
    ],
    "outputs": [
      {
        "internalType": "enum IVesting.VestingType",
        "name": "",
        "type": "uint8"
      }
    ]
  },
  {
    "key": "VestingFacet.hasVestingSchedule",
    "facetName": "VestingFacet",
    "wrapperKey": "hasVestingSchedule",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/tokenomics/queries/has-vesting-schedule",
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
    "operationId": "hasVestingSchedule",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VestingFacet.hasVestingSchedule",
    "methodName": "hasVestingSchedule",
    "signature": "hasVestingSchedule(address)",
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
        "name": "beneficiary",
        "type": "address"
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
    "key": "VestingFacet.releaseStandardVesting",
    "facetName": "VestingFacet",
    "wrapperKey": "releaseStandardVesting",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/commands/release-standard-vesting",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "releaseStandardVesting",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VestingFacet.releaseStandardVesting",
    "methodName": "releaseStandardVesting",
    "signature": "releaseStandardVesting()",
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
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ]
  },
  {
    "key": "VestingFacet.releaseStandardVestingFor",
    "facetName": "VestingFacet",
    "wrapperKey": "releaseStandardVestingFor",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/commands/release-standard-vesting-for",
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
      "kind": "scalar"
    },
    "operationId": "releaseStandardVestingFor",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VestingFacet.releaseStandardVestingFor",
    "methodName": "releaseStandardVestingFor",
    "signature": "releaseStandardVestingFor(address)",
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
        "name": "beneficiary",
        "type": "address"
      }
    ],
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ]
  },
  {
    "key": "VestingFacet.releaseTokensFor",
    "facetName": "VestingFacet",
    "wrapperKey": "releaseTokensFor",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/commands/release-tokens-for",
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
      "kind": "scalar"
    },
    "operationId": "releaseTokensFor",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VestingFacet.releaseTokensFor",
    "methodName": "releaseTokensFor",
    "signature": "releaseTokensFor(address)",
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
        "name": "beneficiary",
        "type": "address"
      }
    ],
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ]
  },
  {
    "key": "VestingFacet.releaseVestedTokens",
    "facetName": "VestingFacet",
    "wrapperKey": "releaseVestedTokens",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/commands/release-vested-tokens",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "releaseVestedTokens",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VestingFacet.releaseVestedTokens",
    "methodName": "releaseVestedTokens",
    "signature": "releaseVestedTokens()",
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
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ]
  },
  {
    "key": "VestingFacet.revokeVestingSchedule",
    "facetName": "VestingFacet",
    "wrapperKey": "revokeVestingSchedule",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "delete",
    "httpMethod": "DELETE",
    "path": "/v1/tokenomics/commands/revoke-vesting-schedule",
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
    "operationId": "revokeVestingSchedule",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VestingFacet.revokeVestingSchedule",
    "methodName": "revokeVestingSchedule",
    "signature": "revokeVestingSchedule(address)",
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
        "name": "beneficiary",
        "type": "address"
      }
    ],
    "outputs": []
  },
  {
    "key": "VestingFacet.setMinimumVestingDuration",
    "facetName": "VestingFacet",
    "wrapperKey": "setMinimumVestingDuration",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/tokenomics/commands/set-minimum-vesting-duration",
    "inputShape": {
      "kind": "body",
      "bindings": [
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
    "operationId": "setMinimumVestingDuration",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VestingFacet.setMinimumVestingDuration",
    "methodName": "setMinimumVestingDuration",
    "signature": "setMinimumVestingDuration(uint256)",
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
        "name": "duration",
        "type": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "VestingFacet.transferVestingSchedule",
    "facetName": "VestingFacet",
    "wrapperKey": "transferVestingSchedule",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/commands/transfer-vesting-schedule",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "newBeneficiary",
          "source": "body",
          "field": "newBeneficiary"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "transferVestingSchedule",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VestingFacet.transferVestingSchedule",
    "methodName": "transferVestingSchedule",
    "signature": "transferVestingSchedule(address)",
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
        "name": "newBeneficiary",
        "type": "address"
      }
    ],
    "outputs": []
  },
  {
    "key": "VestingFacet.veGetRoleAdmin",
    "facetName": "VestingFacet",
    "wrapperKey": "veGetRoleAdmin",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/tokenomics/queries/ve-get-role-admin",
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
    "operationId": "veGetRoleAdmin",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VestingFacet.veGetRoleAdmin",
    "methodName": "veGetRoleAdmin",
    "signature": "veGetRoleAdmin(bytes32)",
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
        "name": "role",
        "type": "bytes32"
      }
    ],
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ]
  },
  {
    "key": "VestingFacet.veGetVestingSchedule",
    "facetName": "VestingFacet",
    "wrapperKey": "veGetVestingSchedule",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/tokenomics/queries/ve-get-vesting-schedule",
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
      "kind": "object"
    },
    "operationId": "veGetVestingSchedule",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VestingFacet.veGetVestingSchedule",
    "methodName": "veGetVestingSchedule",
    "signature": "veGetVestingSchedule(address)",
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
        "name": "beneficiary",
        "type": "address"
      }
    ],
    "outputs": [
      {
        "components": [
          {
            "internalType": "enum IVesting.VestingType",
            "name": "vestingType",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "totalAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "releasedAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "startTime",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "duration",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "cliff",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lastReleaseTime",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "revocable",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "revoked",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "sellablePercentage",
            "type": "uint256"
          }
        ],
        "internalType": "struct IVesting.VestingScheduleView",
        "name": "",
        "type": "tuple"
      }
    ]
  },
  {
    "key": "VestingFacet.veHasRole",
    "facetName": "VestingFacet",
    "wrapperKey": "veHasRole",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/tokenomics/queries/ve-has-role",
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
    "operationId": "veHasRole",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VestingFacet.veHasRole",
    "methodName": "veHasRole",
    "signature": "veHasRole(bytes32,address)",
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
        "name": "role",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
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
    "key": "VestingFacet.veSupportsInterface",
    "facetName": "VestingFacet",
    "wrapperKey": "veSupportsInterface",
    "domain": "tokenomics",
    "resource": "vesting",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/tokenomics/queries/ve-supports-interface",
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
    "operationId": "veSupportsInterface",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VestingFacet.veSupportsInterface",
    "methodName": "veSupportsInterface",
    "signature": "veSupportsInterface(bytes4)",
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
        "internalType": "bytes4",
        "name": "interfaceId",
        "type": "bytes4"
      }
    ],
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ]
  }
] as HttpMethodDefinition[];
export const tokenomicsEventDefinitions: HttpEventDefinition[] = [
  {
    "key": "BurnThresholdFacet.BurnThresholdUpdated",
    "facetName": "BurnThresholdFacet",
    "wrapperKey": "BurnThresholdUpdated",
    "domain": "tokenomics",
    "operationId": "burnThresholdUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/events/burn-threshold-updated/query",
    "notes": "BurnThresholdFacet.BurnThresholdUpdated",
    "eventName": "BurnThresholdUpdated",
    "signature": "BurnThresholdUpdated(uint256,uint256,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "oldThreshold",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "newThreshold",
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
    "key": "BurnThresholdFacet.ThresholdBurn",
    "facetName": "BurnThresholdFacet",
    "wrapperKey": "ThresholdBurn",
    "domain": "tokenomics",
    "operationId": "thresholdBurnEventQuery",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/events/threshold-burn/query",
    "notes": "BurnThresholdFacet.ThresholdBurn",
    "eventName": "ThresholdBurn",
    "signature": "ThresholdBurn(address,uint256,uint256,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "burner",
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
        "name": "thresholdAtBurn",
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
    "key": "BurnThresholdFacet.Transfer",
    "facetName": "BurnThresholdFacet",
    "wrapperKey": "Transfer",
    "domain": "tokenomics",
    "operationId": "burnThresholdTransferEventQuery",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/events/transfer/query/burn-threshold",
    "notes": "BurnThresholdFacet.Transfer",
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
        "name": "value",
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
    "key": "CommunityRewardsFacet.CampaignCapConfig",
    "facetName": "CommunityRewardsFacet",
    "wrapperKey": "CampaignCapConfig",
    "domain": "tokenomics",
    "operationId": "campaignCapConfigEventQuery",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/events/campaign-cap-config/query",
    "notes": "CommunityRewardsFacet.CampaignCapConfig",
    "eventName": "CampaignCapConfig",
    "signature": "CampaignCapConfig(uint256,uint256,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "campaignId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "maxTotalClaimable",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tgeUnlockBps",
        "type": "uint256"
      }
    ],
    "projection": {
      "domain": "tokenomics",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "CommunityRewardsFacet.CampaignCreated",
    "facetName": "CommunityRewardsFacet",
    "wrapperKey": "CampaignCreated",
    "domain": "tokenomics",
    "operationId": "campaignCreatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/events/campaign-created/query",
    "notes": "CommunityRewardsFacet.CampaignCreated",
    "eventName": "CampaignCreated",
    "signature": "CampaignCreated(uint256,bytes32,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "campaignId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "merkleRoot",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "startTime",
        "type": "uint256"
      }
    ],
    "projection": {
      "domain": "tokenomics",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "CommunityRewardsFacet.CampaignMerkleRootUpdated",
    "facetName": "CommunityRewardsFacet",
    "wrapperKey": "CampaignMerkleRootUpdated",
    "domain": "tokenomics",
    "operationId": "campaignMerkleRootUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/events/campaign-merkle-root-updated/query",
    "notes": "CommunityRewardsFacet.CampaignMerkleRootUpdated",
    "eventName": "CampaignMerkleRootUpdated",
    "signature": "CampaignMerkleRootUpdated(uint256,bytes32,bytes32)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "campaignId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "oldRoot",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "newRoot",
        "type": "bytes32"
      }
    ],
    "projection": {
      "domain": "tokenomics",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "CommunityRewardsFacet.CampaignPaused",
    "facetName": "CommunityRewardsFacet",
    "wrapperKey": "CampaignPaused",
    "domain": "tokenomics",
    "operationId": "campaignPausedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/events/campaign-paused/query",
    "notes": "CommunityRewardsFacet.CampaignPaused",
    "eventName": "CampaignPaused",
    "signature": "CampaignPaused(uint256,address)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "campaignId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "by",
        "type": "address"
      }
    ],
    "projection": {
      "domain": "tokenomics",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "CommunityRewardsFacet.CampaignUnpaused",
    "facetName": "CommunityRewardsFacet",
    "wrapperKey": "CampaignUnpaused",
    "domain": "tokenomics",
    "operationId": "campaignUnpausedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/events/campaign-unpaused/query",
    "notes": "CommunityRewardsFacet.CampaignUnpaused",
    "eventName": "CampaignUnpaused",
    "signature": "CampaignUnpaused(uint256,address)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "campaignId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "by",
        "type": "address"
      }
    ],
    "projection": {
      "domain": "tokenomics",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "CommunityRewardsFacet.CampaignVestingConfig",
    "facetName": "CommunityRewardsFacet",
    "wrapperKey": "CampaignVestingConfig",
    "domain": "tokenomics",
    "operationId": "campaignVestingConfigEventQuery",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/events/campaign-vesting-config/query",
    "notes": "CommunityRewardsFacet.CampaignVestingConfig",
    "eventName": "CampaignVestingConfig",
    "signature": "CampaignVestingConfig(uint256,uint256,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "campaignId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "cliffSeconds",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "durationSeconds",
        "type": "uint256"
      }
    ],
    "projection": {
      "domain": "tokenomics",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "CommunityRewardsFacet.Claimed",
    "facetName": "CommunityRewardsFacet",
    "wrapperKey": "Claimed",
    "domain": "tokenomics",
    "operationId": "claimedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/events/claimed/query",
    "notes": "CommunityRewardsFacet.Claimed",
    "eventName": "Claimed",
    "signature": "Claimed(uint256,address,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "campaignId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "projection": {
      "domain": "tokenomics",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "TimewaveGiftFacet.TokensVested",
    "facetName": "TimewaveGiftFacet",
    "wrapperKey": "TokensVested",
    "domain": "tokenomics",
    "operationId": "tokensVestedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/events/tokens-vested/query",
    "notes": "TimewaveGiftFacet.TokensVested",
    "eventName": "TokensVested",
    "signature": "TokensVested(address,uint256,uint256)",
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
        "name": "timestamp",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "vesting",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "vesting_schedules",
          "mode": "current"
        },
        {
          "table": "vesting_releases",
          "mode": "ledger"
        }
      ]
    }
  },
  {
    "key": "TimewaveGiftFacet.VestingRevoked",
    "facetName": "TimewaveGiftFacet",
    "wrapperKey": "VestingRevoked",
    "domain": "tokenomics",
    "operationId": "vestingRevokedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/events/vesting-revoked/query",
    "notes": "TimewaveGiftFacet.VestingRevoked",
    "eventName": "VestingRevoked",
    "signature": "VestingRevoked(address,uint256,uint256)",
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
        "name": "revokedAmount",
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
      "domain": "vesting",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "vesting_schedules",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "TimewaveGiftFacet.VestingScheduleCreated(address,uint256,uint256,uint256,uint256,bool)",
    "facetName": "TimewaveGiftFacet",
    "wrapperKey": "VestingScheduleCreated(address,uint256,uint256,uint256,uint256,bool)",
    "domain": "tokenomics",
    "operationId": "vestingScheduleCreatedAddressUint256Uint256Uint256Uint256BoolEventQuery",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/events/vesting-schedule-created/query/timewave-gift",
    "notes": "TimewaveGiftFacet.VestingScheduleCreated(address,uint256,uint256,uint256,uint256,bool)",
    "eventName": "VestingScheduleCreated",
    "signature": "VestingScheduleCreated(address,uint256,uint256,uint256,uint256,bool)",
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
        "name": "startTime",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "duration",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "cliff",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "isQuarterly",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "projection": {
      "domain": "vesting",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "vesting_schedules",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "TimewaveGiftFacet.VestingTransferred",
    "facetName": "TimewaveGiftFacet",
    "wrapperKey": "VestingTransferred",
    "domain": "tokenomics",
    "operationId": "vestingTransferredEventQuery",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/events/vesting-transferred/query",
    "notes": "TimewaveGiftFacet.VestingTransferred",
    "eventName": "VestingTransferred",
    "signature": "VestingTransferred(address,address,uint256)",
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
        "name": "remainingAmount",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "vesting",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "vesting_schedules",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "TokenSupplyFacet.Approval",
    "facetName": "TokenSupplyFacet",
    "wrapperKey": "Approval",
    "domain": "tokenomics",
    "operationId": "approvalEventQuery",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/events/approval/query",
    "notes": "TokenSupplyFacet.Approval",
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
        "name": "spender",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "value",
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
    "key": "TokenSupplyFacet.MintingFinished",
    "facetName": "TokenSupplyFacet",
    "wrapperKey": "MintingFinished",
    "domain": "tokenomics",
    "operationId": "mintingFinishedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/events/minting-finished/query",
    "notes": "TokenSupplyFacet.MintingFinished",
    "eventName": "MintingFinished",
    "signature": "MintingFinished()",
    "topicHash": null,
    "anonymous": false,
    "inputs": [],
    "projection": {
      "domain": "rawOnly",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "TokenSupplyFacet.TokenInitialized",
    "facetName": "TokenSupplyFacet",
    "wrapperKey": "TokenInitialized",
    "domain": "tokenomics",
    "operationId": "tokenInitializedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/events/token-initialized/query",
    "notes": "TokenSupplyFacet.TokenInitialized",
    "eventName": "TokenInitialized",
    "signature": "TokenInitialized(string,string,uint8,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "name",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "symbol",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "decimals",
        "type": "uint8",
        "indexed": true,
        "internalType": "uint8"
      },
      {
        "name": "initialSupply",
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
    "key": "TokenSupplyFacet.Transfer",
    "facetName": "TokenSupplyFacet",
    "wrapperKey": "Transfer",
    "domain": "tokenomics",
    "operationId": "tokenSupplyTransferEventQuery",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/events/transfer/query/token-supply",
    "notes": "TokenSupplyFacet.Transfer",
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
        "name": "value",
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
    "key": "VestingFacet.BeneficiaryTransferred",
    "facetName": "VestingFacet",
    "wrapperKey": "BeneficiaryTransferred",
    "domain": "tokenomics",
    "operationId": "beneficiaryTransferredEventQuery",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/events/beneficiary-transferred/query",
    "notes": "VestingFacet.BeneficiaryTransferred",
    "eventName": "BeneficiaryTransferred",
    "signature": "BeneficiaryTransferred(address,address)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousBeneficiary",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newBeneficiary",
        "type": "address"
      }
    ],
    "projection": {
      "domain": "tokenomics",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "VestingFacet.SaleRestrictionUpdated",
    "facetName": "VestingFacet",
    "wrapperKey": "SaleRestrictionUpdated",
    "domain": "tokenomics",
    "operationId": "saleRestrictionUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/events/sale-restriction-updated/query",
    "notes": "VestingFacet.SaleRestrictionUpdated",
    "eventName": "SaleRestrictionUpdated",
    "signature": "SaleRestrictionUpdated(address,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "beneficiary",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "newSellablePercentage",
        "type": "uint256"
      }
    ],
    "projection": {
      "domain": "tokenomics",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "VestingFacet.TokensReleased",
    "facetName": "VestingFacet",
    "wrapperKey": "TokensReleased",
    "domain": "tokenomics",
    "operationId": "tokensReleasedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/events/tokens-released/query",
    "notes": "VestingFacet.TokensReleased",
    "eventName": "TokensReleased",
    "signature": "TokensReleased(address,uint256,uint8)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "beneficiary",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "enum IVesting.VestingType",
        "name": "vestingType",
        "type": "uint8"
      }
    ],
    "projection": {
      "domain": "tokenomics",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "VestingFacet.VestingInitialized",
    "facetName": "VestingFacet",
    "wrapperKey": "VestingInitialized",
    "domain": "tokenomics",
    "operationId": "vestingInitializedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/events/vesting-initialized/query",
    "notes": "VestingFacet.VestingInitialized",
    "eventName": "VestingInitialized",
    "signature": "VestingInitialized(uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "startTime",
        "type": "uint256"
      }
    ],
    "projection": {
      "domain": "tokenomics",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "VestingFacet.VestingPaused",
    "facetName": "VestingFacet",
    "wrapperKey": "VestingPaused",
    "domain": "tokenomics",
    "operationId": "vestingPausedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/events/vesting-paused/query",
    "notes": "VestingFacet.VestingPaused",
    "eventName": "VestingPaused",
    "signature": "VestingPaused(uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "projection": {
      "domain": "tokenomics",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "VestingFacet.VestingScheduleCreated",
    "facetName": "VestingFacet",
    "wrapperKey": "VestingScheduleCreated",
    "domain": "tokenomics",
    "operationId": "vestingScheduleCreatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/events/vesting-schedule-created/query/vesting",
    "notes": "VestingFacet.VestingScheduleCreated",
    "eventName": "VestingScheduleCreated",
    "signature": "VestingScheduleCreated(address,uint8,uint256,uint256,uint256,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "beneficiary",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "enum IVesting.VestingType",
        "name": "vestingType",
        "type": "uint8"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "startTime",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "duration",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "cliff",
        "type": "uint256"
      }
    ],
    "projection": {
      "domain": "tokenomics",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "VestingFacet.VestingScheduleRevoked",
    "facetName": "VestingFacet",
    "wrapperKey": "VestingScheduleRevoked",
    "domain": "tokenomics",
    "operationId": "vestingScheduleRevokedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/events/vesting-schedule-revoked/query",
    "notes": "VestingFacet.VestingScheduleRevoked",
    "eventName": "VestingScheduleRevoked",
    "signature": "VestingScheduleRevoked(address,uint256,uint8)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "beneficiary",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "revokedAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "enum IVesting.VestingType",
        "name": "vestingType",
        "type": "uint8"
      }
    ],
    "projection": {
      "domain": "tokenomics",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "VestingFacet.VestingUnpaused",
    "facetName": "VestingFacet",
    "wrapperKey": "VestingUnpaused",
    "domain": "tokenomics",
    "operationId": "vestingUnpausedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/events/vesting-unpaused/query",
    "notes": "VestingFacet.VestingUnpaused",
    "eventName": "VestingUnpaused",
    "signature": "VestingUnpaused(uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "projection": {
      "domain": "tokenomics",
      "projectionMode": "rawOnly",
      "targets": []
    }
  }
] as HttpEventDefinition[];
