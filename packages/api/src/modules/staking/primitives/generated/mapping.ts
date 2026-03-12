import type { HttpEventDefinition, HttpMethodDefinition } from "../../../../shared/route-types.js";

export const stakingMethodDefinitions: HttpMethodDefinition[] = [
  {
    "key": "DelegationFacet.delegate",
    "facetName": "DelegationFacet",
    "wrapperKey": "delegate",
    "domain": "staking",
    "resource": "delegations",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/staking/commands/delegate",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "delegatee",
          "source": "body",
          "field": "delegatee"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "delegate",
    "rateLimitKind": "write",
    "supportsGasless": true,
    "notes": "DelegationFacet.delegate",
    "methodName": "delegate",
    "signature": "delegate(address)",
    "category": "write",
    "mutability": "nonpayable",
    "liveRequired": false,
    "cacheClass": "none",
    "cacheTtlSeconds": null,
    "executionSources": [
      "live"
    ],
    "gaslessModes": [
      "cdpSmartWallet"
    ],
    "inputs": [
      {
        "name": "delegatee",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": []
  },
  {
    "key": "DelegationFacet.delegateBySig",
    "facetName": "DelegationFacet",
    "wrapperKey": "delegateBySig",
    "domain": "staking",
    "resource": "delegations",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/staking/commands/delegate-by-sig",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "delegatee",
          "source": "body",
          "field": "delegatee"
        },
        {
          "name": "nonce",
          "source": "body",
          "field": "nonce"
        },
        {
          "name": "expiry",
          "source": "body",
          "field": "expiry"
        },
        {
          "name": "v",
          "source": "body",
          "field": "v"
        },
        {
          "name": "r",
          "source": "body",
          "field": "r"
        },
        {
          "name": "s",
          "source": "body",
          "field": "s"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "delegateBySig",
    "rateLimitKind": "write",
    "supportsGasless": true,
    "notes": "DelegationFacet.delegateBySig",
    "methodName": "delegateBySig",
    "signature": "delegateBySig(address,uint256,uint256,uint8,bytes32,bytes32)",
    "category": "write",
    "mutability": "nonpayable",
    "liveRequired": false,
    "cacheClass": "none",
    "cacheTtlSeconds": null,
    "executionSources": [
      "live"
    ],
    "gaslessModes": [
      "signature",
      "cdpSmartWallet"
    ],
    "inputs": [
      {
        "name": "delegatee",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "nonce",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "expiry",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "v",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "r",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "s",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": []
  },
  {
    "key": "DelegationFacet.delegates",
    "facetName": "DelegationFacet",
    "wrapperKey": "delegates",
    "domain": "staking",
    "resource": "delegations",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/staking/queries/delegates",
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
    "operationId": "delegates",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "DelegationFacet.delegates",
    "methodName": "delegates",
    "signature": "delegates(address)",
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
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "key": "DelegationFacet.DELEGATION_TYPEHASH",
    "facetName": "DelegationFacet",
    "wrapperKey": "DELEGATION_TYPEHASH",
    "domain": "staking",
    "resource": "delegations",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/staking/queries/delegation-typehash",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "delegationTypehash",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "DelegationFacet.DELEGATION_TYPEHASH",
    "methodName": "DELEGATION_TYPEHASH",
    "signature": "DELEGATION_TYPEHASH()",
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
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "key": "DelegationFacet.DOMAIN_TYPEHASH",
    "facetName": "DelegationFacet",
    "wrapperKey": "DOMAIN_TYPEHASH",
    "domain": "staking",
    "resource": "delegations",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/staking/queries/domain-typehash",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "domainTypehash",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "DelegationFacet.DOMAIN_TYPEHASH",
    "methodName": "DOMAIN_TYPEHASH",
    "signature": "DOMAIN_TYPEHASH()",
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
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "key": "DelegationFacet.getCurrentVotes",
    "facetName": "DelegationFacet",
    "wrapperKey": "getCurrentVotes",
    "domain": "staking",
    "resource": "delegations",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/staking/queries/get-current-votes",
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
    "operationId": "getCurrentVotes",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "DelegationFacet.getCurrentVotes",
    "methodName": "getCurrentVotes",
    "signature": "getCurrentVotes(address)",
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
    "key": "DelegationFacet.getPriorVotes",
    "facetName": "DelegationFacet",
    "wrapperKey": "getPriorVotes",
    "domain": "staking",
    "resource": "delegations",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/staking/queries/get-prior-votes",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "account",
          "source": "query",
          "field": "account"
        },
        {
          "name": "blockNumber",
          "source": "query",
          "field": "blockNumber"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "getPriorVotes",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "DelegationFacet.getPriorVotes",
    "methodName": "getPriorVotes",
    "signature": "getPriorVotes(address,uint256)",
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
      },
      {
        "name": "blockNumber",
        "type": "uint256",
        "internalType": "uint256"
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
    "key": "DelegationFacet.getTotalVotingPower",
    "facetName": "DelegationFacet",
    "wrapperKey": "getTotalVotingPower",
    "domain": "staking",
    "resource": "delegations",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/staking/queries/get-total-voting-power",
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
    "operationId": "getTotalVotingPower",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "DelegationFacet.getTotalVotingPower",
    "methodName": "getTotalVotingPower",
    "signature": "getTotalVotingPower(address)",
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
    "key": "DelegationFacet.updateDelegatedVotingPower",
    "facetName": "DelegationFacet",
    "wrapperKey": "updateDelegatedVotingPower",
    "domain": "staking",
    "resource": "delegations",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/staking/commands/update-delegated-voting-power",
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
      "kind": "void"
    },
    "operationId": "updateDelegatedVotingPower",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "DelegationFacet.updateDelegatedVotingPower",
    "methodName": "updateDelegatedVotingPower",
    "signature": "updateDelegatedVotingPower(address)",
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
    "outputs": []
  },
  {
    "key": "DelegationFacet.updateDelegatedVotingPowerBatch",
    "facetName": "DelegationFacet",
    "wrapperKey": "updateDelegatedVotingPowerBatch",
    "domain": "staking",
    "resource": "delegations",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/staking/commands/update-delegated-voting-power-batch",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "accounts",
          "source": "body",
          "field": "accounts"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "updateDelegatedVotingPowerBatch",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "DelegationFacet.updateDelegatedVotingPowerBatch",
    "methodName": "updateDelegatedVotingPowerBatch",
    "signature": "updateDelegatedVotingPowerBatch(address[])",
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
        "name": "accounts",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "outputs": []
  },
  {
    "key": "EchoScoreFacetV3.getEchoScoreOracleV3",
    "facetName": "EchoScoreFacetV3",
    "wrapperKey": "getEchoScoreOracleV3",
    "domain": "staking",
    "resource": "echo-scores",
    "classification": "read",
    "httpMethod": "POST",
    "path": "/v1/staking/queries/get-echo-score-oracle-v3",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "getEchoScoreOracleV3",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "EchoScoreFacetV3.getEchoScoreOracleV3",
    "methodName": "getEchoScoreOracleV3",
    "signature": "getEchoScoreOracleV3()",
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
    "key": "EchoScoreFacetV3.getOracleFutureDriftConfig",
    "facetName": "EchoScoreFacetV3",
    "wrapperKey": "getOracleFutureDriftConfig",
    "domain": "staking",
    "resource": "echo-scores",
    "classification": "read",
    "httpMethod": "POST",
    "path": "/v1/staking/queries/get-oracle-future-drift-config",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "getOracleFutureDriftConfig",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "EchoScoreFacetV3.getOracleFutureDriftConfig",
    "methodName": "getOracleFutureDriftConfig",
    "signature": "getOracleFutureDriftConfig()",
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
        "name": "maxFutureSeconds",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "key": "EchoScoreFacetV3.getOracleQuorumSigners",
    "facetName": "EchoScoreFacetV3",
    "wrapperKey": "getOracleQuorumSigners",
    "domain": "staking",
    "resource": "echo-scores",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/staking/queries/get-oracle-quorum-signers",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "tuple"
    },
    "operationId": "getOracleQuorumSigners",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "EchoScoreFacetV3.getOracleQuorumSigners",
    "methodName": "getOracleQuorumSigners",
    "signature": "getOracleQuorumSigners()",
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
        "name": "signers",
        "type": "address[]",
        "internalType": "address[]"
      },
      {
        "name": "threshold",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "key": "EchoScoreFacetV3.getOracleStalenessConfig",
    "facetName": "EchoScoreFacetV3",
    "wrapperKey": "getOracleStalenessConfig",
    "domain": "staking",
    "resource": "echo-scores",
    "classification": "read",
    "httpMethod": "POST",
    "path": "/v1/staking/queries/get-oracle-staleness-config",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "tuple"
    },
    "operationId": "getOracleStalenessConfig",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "EchoScoreFacetV3.getOracleStalenessConfig",
    "methodName": "getOracleStalenessConfig",
    "signature": "getOracleStalenessConfig()",
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
        "name": "maxAgeSeconds",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "lastUpdatedAt",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "key": "EchoScoreFacetV3.getReputation",
    "facetName": "EchoScoreFacetV3",
    "wrapperKey": "getReputation",
    "domain": "staking",
    "resource": "echo-scores",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/staking/queries/get-reputation",
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
    "operationId": "getReputation",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "EchoScoreFacetV3.getReputation",
    "methodName": "getReputation",
    "signature": "getReputation(bytes32)",
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
        "name": "breakdown",
        "type": "tuple",
        "internalType": "struct IEchoScoreV3.ReputationBreakdown",
        "components": [
          {
            "name": "totalReputation",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "voiceQualityScore",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "engagementScore",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "governanceScore",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "datasetScore",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "marketplaceScore",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "lastUpdated",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "updateCount",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ]
  },
  {
    "key": "EchoScoreFacetV3.getReputationHistory",
    "facetName": "EchoScoreFacetV3",
    "wrapperKey": "getReputationHistory",
    "domain": "staking",
    "resource": "echo-scores",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/staking/queries/get-reputation-history",
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
    "operationId": "getReputationHistory",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "EchoScoreFacetV3.getReputationHistory",
    "methodName": "getReputationHistory",
    "signature": "getReputationHistory(bytes32)",
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
        "name": "history",
        "type": "tuple[]",
        "internalType": "struct IEchoScoreV3.ReputationHistory[]",
        "components": [
          {
            "name": "totalReputation",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "timestamp",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ]
  },
  {
    "key": "EchoScoreFacetV3.isEchoScorePausedV3",
    "facetName": "EchoScoreFacetV3",
    "wrapperKey": "isEchoScorePausedV3",
    "domain": "staking",
    "resource": "echo-scores",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/staking/queries/is-echo-score-paused-v3",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "isEchoScorePausedV3",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "EchoScoreFacetV3.isEchoScorePausedV3",
    "methodName": "isEchoScorePausedV3",
    "signature": "isEchoScorePausedV3()",
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
    "key": "EchoScoreFacetV3.isOracleHealthy",
    "facetName": "EchoScoreFacetV3",
    "wrapperKey": "isOracleHealthy",
    "domain": "staking",
    "resource": "echo-scores",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/staking/queries/is-oracle-healthy",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "isOracleHealthy",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "EchoScoreFacetV3.isOracleHealthy",
    "methodName": "isOracleHealthy",
    "signature": "isOracleHealthy()",
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
        "name": "healthy",
        "type": "bool",
        "internalType": "bool"
      }
    ]
  },
  {
    "key": "EchoScoreFacetV3.pauseEchoScoreV3",
    "facetName": "EchoScoreFacetV3",
    "wrapperKey": "pauseEchoScoreV3",
    "domain": "staking",
    "resource": "echo-scores",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/staking/commands/pause-echo-score-v3",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "pauseEchoScoreV3",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "EchoScoreFacetV3.pauseEchoScoreV3",
    "methodName": "pauseEchoScoreV3",
    "signature": "pauseEchoScoreV3()",
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
    "key": "EchoScoreFacetV3.setEchoScoreOracleV3",
    "facetName": "EchoScoreFacetV3",
    "wrapperKey": "setEchoScoreOracleV3",
    "domain": "staking",
    "resource": "echo-scores",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/staking/commands/set-echo-score-oracle-v3",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "newOracle",
          "source": "body",
          "field": "newOracle"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setEchoScoreOracleV3",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "EchoScoreFacetV3.setEchoScoreOracleV3",
    "methodName": "setEchoScoreOracleV3",
    "signature": "setEchoScoreOracleV3(address)",
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
        "name": "newOracle",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": []
  },
  {
    "key": "EchoScoreFacetV3.setOracleFutureDriftConfig",
    "facetName": "EchoScoreFacetV3",
    "wrapperKey": "setOracleFutureDriftConfig",
    "domain": "staking",
    "resource": "echo-scores",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/staking/commands/set-oracle-future-drift-config",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "maxFutureSeconds",
          "source": "body",
          "field": "maxFutureSeconds"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setOracleFutureDriftConfig",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "EchoScoreFacetV3.setOracleFutureDriftConfig",
    "methodName": "setOracleFutureDriftConfig",
    "signature": "setOracleFutureDriftConfig(uint256)",
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
        "name": "maxFutureSeconds",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "EchoScoreFacetV3.setOracleQuorumSigners",
    "facetName": "EchoScoreFacetV3",
    "wrapperKey": "setOracleQuorumSigners",
    "domain": "staking",
    "resource": "echo-scores",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/staking/commands/set-oracle-quorum-signers",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "signers",
          "source": "body",
          "field": "signers"
        },
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
    "operationId": "setOracleQuorumSigners",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "EchoScoreFacetV3.setOracleQuorumSigners",
    "methodName": "setOracleQuorumSigners",
    "signature": "setOracleQuorumSigners(address[],uint256)",
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
        "name": "signers",
        "type": "address[]",
        "internalType": "address[]"
      },
      {
        "name": "threshold",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "EchoScoreFacetV3.setOracleStalenessConfig",
    "facetName": "EchoScoreFacetV3",
    "wrapperKey": "setOracleStalenessConfig",
    "domain": "staking",
    "resource": "echo-scores",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/staking/commands/set-oracle-staleness-config",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "maxAgeSeconds",
          "source": "body",
          "field": "maxAgeSeconds"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setOracleStalenessConfig",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "EchoScoreFacetV3.setOracleStalenessConfig",
    "methodName": "setOracleStalenessConfig",
    "signature": "setOracleStalenessConfig(uint256)",
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
        "name": "maxAgeSeconds",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "EchoScoreFacetV3.unpauseEchoScoreV3",
    "facetName": "EchoScoreFacetV3",
    "wrapperKey": "unpauseEchoScoreV3",
    "domain": "staking",
    "resource": "echo-scores",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/staking/commands/unpause-echo-score-v3",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "unpauseEchoScoreV3",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "EchoScoreFacetV3.unpauseEchoScoreV3",
    "methodName": "unpauseEchoScoreV3",
    "signature": "unpauseEchoScoreV3()",
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
    "key": "StakingFacet.advanceEpoch",
    "facetName": "StakingFacet",
    "wrapperKey": "advanceEpoch",
    "domain": "staking",
    "resource": "stakes",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/staking/commands/advance-epoch",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "advanceEpoch",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "StakingFacet.advanceEpoch",
    "methodName": "advanceEpoch",
    "signature": "advanceEpoch()",
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
    "key": "StakingFacet.claimRewards",
    "facetName": "StakingFacet",
    "wrapperKey": "claimRewards",
    "domain": "staking",
    "resource": "stakes",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/staking/commands/claim-rewards",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "claimRewards",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "StakingFacet.claimRewards",
    "methodName": "claimRewards",
    "signature": "claimRewards()",
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
    "outputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "key": "StakingFacet.executeUnstake",
    "facetName": "StakingFacet",
    "wrapperKey": "executeUnstake",
    "domain": "staking",
    "resource": "stakes",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/staking/commands/execute-unstake",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "executeUnstake",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "StakingFacet.executeUnstake",
    "methodName": "executeUnstake",
    "signature": "executeUnstake()",
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
    "key": "StakingFacet.fundRewardPool",
    "facetName": "StakingFacet",
    "wrapperKey": "fundRewardPool",
    "domain": "staking",
    "resource": "stakes",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/staking/commands/fund-reward-pool",
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
    "operationId": "fundRewardPool",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "StakingFacet.fundRewardPool",
    "methodName": "fundRewardPool",
    "signature": "fundRewardPool(uint256)",
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
      }
    ],
    "outputs": []
  },
  {
    "key": "StakingFacet.getDegradedModeConfig",
    "facetName": "StakingFacet",
    "wrapperKey": "getDegradedModeConfig",
    "domain": "staking",
    "resource": "stakes",
    "classification": "read",
    "httpMethod": "POST",
    "path": "/v1/staking/queries/get-degraded-mode-config",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "object"
    },
    "operationId": "getDegradedModeConfig",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "StakingFacet.getDegradedModeConfig",
    "methodName": "getDegradedModeConfig",
    "signature": "getDegradedModeConfig()",
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
        "name": "config",
        "type": "tuple",
        "internalType": "struct IStakingRewards.DegradedModeConfig",
        "components": [
          {
            "name": "enabled",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "staleAfterSeconds",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "maxStakePerWallet",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ]
  },
  {
    "key": "StakingFacet.getEffectiveApy",
    "facetName": "StakingFacet",
    "wrapperKey": "getEffectiveApy",
    "domain": "staking",
    "resource": "stakes",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/staking/queries/get-effective-apy",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "amount",
          "source": "query",
          "field": "amount"
        },
        {
          "name": "echoScore",
          "source": "query",
          "field": "echoScore"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "getEffectiveApy",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "StakingFacet.getEffectiveApy",
    "methodName": "getEffectiveApy",
    "signature": "getEffectiveApy(uint256,uint256)",
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
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "echoScore",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "apyBps",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "key": "StakingFacet.getPendingRewards",
    "facetName": "StakingFacet",
    "wrapperKey": "getPendingRewards",
    "domain": "staking",
    "resource": "stakes",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/staking/queries/get-pending-rewards",
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
      "kind": "scalar"
    },
    "operationId": "getPendingRewards",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "StakingFacet.getPendingRewards",
    "methodName": "getPendingRewards",
    "signature": "getPendingRewards(address)",
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
        "name": "user",
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
    "key": "StakingFacet.getRewardBreakdown",
    "facetName": "StakingFacet",
    "wrapperKey": "getRewardBreakdown",
    "domain": "staking",
    "resource": "stakes",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/staking/queries/get-reward-breakdown",
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
      "kind": "object"
    },
    "operationId": "getRewardBreakdown",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "StakingFacet.getRewardBreakdown",
    "methodName": "getRewardBreakdown",
    "signature": "getRewardBreakdown(address)",
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
        "name": "user",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "breakdown",
        "type": "tuple",
        "internalType": "struct IStakingRewards.RewardBreakdown",
        "components": [
          {
            "name": "rawPending",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "claimable",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "forfeited",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "multiplierBps",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ]
  },
  {
    "key": "StakingFacet.getStakeAgeMultiplier",
    "facetName": "StakingFacet",
    "wrapperKey": "getStakeAgeMultiplier",
    "domain": "staking",
    "resource": "stakes",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/staking/queries/get-stake-age-multiplier",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "stakeTimestamp",
          "source": "query",
          "field": "stakeTimestamp"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "getStakeAgeMultiplier",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "StakingFacet.getStakeAgeMultiplier",
    "methodName": "getStakeAgeMultiplier",
    "signature": "getStakeAgeMultiplier(uint256)",
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
        "name": "stakeTimestamp",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "multiplierBps",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "key": "StakingFacet.getStakeInfo",
    "facetName": "StakingFacet",
    "wrapperKey": "getStakeInfo",
    "domain": "staking",
    "resource": "stakes",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/staking/queries/get-stake-info",
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
      "kind": "object"
    },
    "operationId": "getStakeInfo",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "StakingFacet.getStakeInfo",
    "methodName": "getStakeInfo",
    "signature": "getStakeInfo(address)",
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
        "name": "user",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "info",
        "type": "tuple",
        "internalType": "struct IStakingRewards.StakeInfo",
        "components": [
          {
            "name": "amount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "stakeTimestamp",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "lastClaimTimestamp",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "pendingRewards",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "effectiveApyBps",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "tier",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "stakeAgeMultiplierBps",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "echoScoreBoostBps",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ]
  },
  {
    "key": "StakingFacet.getStakingStats",
    "facetName": "StakingFacet",
    "wrapperKey": "getStakingStats",
    "domain": "staking",
    "resource": "stakes",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/staking/queries/get-staking-stats",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "object"
    },
    "operationId": "getStakingStats",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "StakingFacet.getStakingStats",
    "methodName": "getStakingStats",
    "signature": "getStakingStats()",
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
        "name": "stats",
        "type": "tuple",
        "internalType": "struct IStakingRewards.StakingStats",
        "components": [
          {
            "name": "totalStaked",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "rewardPoolBalance",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "totalUniqueStakers",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "totalRewardsDistributed",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "currentEpoch",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "epochMaxReward",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ]
  },
  {
    "key": "StakingFacet.getTier",
    "facetName": "StakingFacet",
    "wrapperKey": "getTier",
    "domain": "staking",
    "resource": "stakes",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/staking/queries/get-tier",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "amount",
          "source": "query",
          "field": "amount"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "getTier",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "StakingFacet.getTier",
    "methodName": "getTier",
    "signature": "getTier(uint256)",
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
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "tier",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "key": "StakingFacet.getTierConfig",
    "facetName": "StakingFacet",
    "wrapperKey": "getTierConfig",
    "domain": "staking",
    "resource": "stakes",
    "classification": "read",
    "httpMethod": "POST",
    "path": "/v1/staking/queries/get-tier-config",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "tuple"
    },
    "operationId": "getTierConfig",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "StakingFacet.getTierConfig",
    "methodName": "getTierConfig",
    "signature": "getTierConfig()",
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
        "name": "thresholds",
        "type": "uint256[]",
        "internalType": "uint256[]"
      },
      {
        "name": "multipliers",
        "type": "uint256[]",
        "internalType": "uint256[]"
      },
      {
        "name": "baseApy",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "key": "StakingFacet.getUnstakeRequest",
    "facetName": "StakingFacet",
    "wrapperKey": "getUnstakeRequest",
    "domain": "staking",
    "resource": "stakes",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/staking/queries/get-unstake-request",
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
      "kind": "object"
    },
    "operationId": "getUnstakeRequest",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "StakingFacet.getUnstakeRequest",
    "methodName": "getUnstakeRequest",
    "signature": "getUnstakeRequest(address)",
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
        "name": "user",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "info",
        "type": "tuple",
        "internalType": "struct IStakingRewards.UnstakeInfo",
        "components": [
          {
            "name": "amount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "unlockTimestamp",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "pending",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      }
    ]
  },
  {
    "key": "StakingFacet.initStaking",
    "facetName": "StakingFacet",
    "wrapperKey": "initStaking",
    "domain": "staking",
    "resource": "stakes",
    "classification": "create",
    "httpMethod": "POST",
    "path": "/v1/staking/stakes/init-staking",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "minStakeDuration",
          "source": "body",
          "field": "minStakeDuration"
        },
        {
          "name": "withdrawalCooldown",
          "source": "body",
          "field": "withdrawalCooldown"
        },
        {
          "name": "baseApyBps",
          "source": "body",
          "field": "baseApyBps"
        },
        {
          "name": "thresholds",
          "source": "body",
          "field": "thresholds"
        },
        {
          "name": "multipliers",
          "source": "body",
          "field": "multipliers"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "initStaking",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "StakingFacet.initStaking",
    "methodName": "initStaking",
    "signature": "initStaking(uint256,uint256,uint256,uint256[],uint256[])",
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
        "name": "minStakeDuration",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "withdrawalCooldown",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "baseApyBps",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "thresholds",
        "type": "uint256[]",
        "internalType": "uint256[]"
      },
      {
        "name": "multipliers",
        "type": "uint256[]",
        "internalType": "uint256[]"
      }
    ],
    "outputs": []
  },
  {
    "key": "StakingFacet.initStakingWithToken",
    "facetName": "StakingFacet",
    "wrapperKey": "initStakingWithToken",
    "domain": "staking",
    "resource": "stakes",
    "classification": "create",
    "httpMethod": "POST",
    "path": "/v1/staking/stakes/init-staking-with-token",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "uspkToken",
          "source": "body",
          "field": "uspkToken"
        },
        {
          "name": "minStakeDuration",
          "source": "body",
          "field": "minStakeDuration"
        },
        {
          "name": "withdrawalCooldown",
          "source": "body",
          "field": "withdrawalCooldown"
        },
        {
          "name": "baseApyBps",
          "source": "body",
          "field": "baseApyBps"
        },
        {
          "name": "thresholds",
          "source": "body",
          "field": "thresholds"
        },
        {
          "name": "multipliers",
          "source": "body",
          "field": "multipliers"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "initStakingWithToken",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "StakingFacet.initStakingWithToken",
    "methodName": "initStakingWithToken",
    "signature": "initStakingWithToken(address,uint256,uint256,uint256,uint256[],uint256[])",
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
        "name": "uspkToken",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "minStakeDuration",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "withdrawalCooldown",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "baseApyBps",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "thresholds",
        "type": "uint256[]",
        "internalType": "uint256[]"
      },
      {
        "name": "multipliers",
        "type": "uint256[]",
        "internalType": "uint256[]"
      }
    ],
    "outputs": []
  },
  {
    "key": "StakingFacet.isDegradedModeActive",
    "facetName": "StakingFacet",
    "wrapperKey": "isDegradedModeActive",
    "domain": "staking",
    "resource": "stakes",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/staking/queries/is-degraded-mode-active",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "isDegradedModeActive",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "StakingFacet.isDegradedModeActive",
    "methodName": "isDegradedModeActive",
    "signature": "isDegradedModeActive()",
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
        "name": "active",
        "type": "bool",
        "internalType": "bool"
      }
    ]
  },
  {
    "key": "StakingFacet.queueTierConfigUpdate",
    "facetName": "StakingFacet",
    "wrapperKey": "queueTierConfigUpdate",
    "domain": "staking",
    "resource": "stakes",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/staking/commands/queue-tier-config-update",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "thresholds",
          "source": "body",
          "field": "thresholds"
        },
        {
          "name": "multipliers",
          "source": "body",
          "field": "multipliers"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "queueTierConfigUpdate",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "StakingFacet.queueTierConfigUpdate",
    "methodName": "queueTierConfigUpdate",
    "signature": "queueTierConfigUpdate(uint256[],uint256[])",
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
        "name": "thresholds",
        "type": "uint256[]",
        "internalType": "uint256[]"
      },
      {
        "name": "multipliers",
        "type": "uint256[]",
        "internalType": "uint256[]"
      }
    ],
    "outputs": []
  },
  {
    "key": "StakingFacet.requestUnstake",
    "facetName": "StakingFacet",
    "wrapperKey": "requestUnstake",
    "domain": "staking",
    "resource": "stakes",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/staking/commands/request-unstake",
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
    "operationId": "requestUnstake",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "StakingFacet.requestUnstake",
    "methodName": "requestUnstake",
    "signature": "requestUnstake(uint256)",
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
      }
    ],
    "outputs": []
  },
  {
    "key": "StakingFacet.setDegradedModeConfig",
    "facetName": "StakingFacet",
    "wrapperKey": "setDegradedModeConfig",
    "domain": "staking",
    "resource": "stakes",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/staking/commands/set-degraded-mode-config",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "enabled",
          "source": "body",
          "field": "enabled"
        },
        {
          "name": "staleAfterSeconds",
          "source": "body",
          "field": "staleAfterSeconds"
        },
        {
          "name": "maxStakePerWallet",
          "source": "body",
          "field": "maxStakePerWallet"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setDegradedModeConfig",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "StakingFacet.setDegradedModeConfig",
    "methodName": "setDegradedModeConfig",
    "signature": "setDegradedModeConfig(bool,uint256,uint256)",
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
        "name": "enabled",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "staleAfterSeconds",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "maxStakePerWallet",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "StakingFacet.setEchoScoreBoost",
    "facetName": "StakingFacet",
    "wrapperKey": "setEchoScoreBoost",
    "domain": "staking",
    "resource": "stakes",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/staking/commands/set-echo-score-boost",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "boostBps",
          "source": "body",
          "field": "boostBps"
        },
        {
          "name": "minScore",
          "source": "body",
          "field": "minScore"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setEchoScoreBoost",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "StakingFacet.setEchoScoreBoost",
    "methodName": "setEchoScoreBoost",
    "signature": "setEchoScoreBoost(uint256,uint256)",
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
        "name": "boostBps",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "minScore",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "StakingFacet.setStakingPaused",
    "facetName": "StakingFacet",
    "wrapperKey": "setStakingPaused",
    "domain": "staking",
    "resource": "stakes",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/staking/commands/set-staking-paused",
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
    "operationId": "setStakingPaused",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "StakingFacet.setStakingPaused",
    "methodName": "setStakingPaused",
    "signature": "setStakingPaused(bool)",
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
    "key": "StakingFacet.stake",
    "facetName": "StakingFacet",
    "wrapperKey": "stake",
    "domain": "staking",
    "resource": "stakes",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/staking/commands/stake",
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
    "operationId": "stake",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "StakingFacet.stake",
    "methodName": "stake",
    "signature": "stake(uint256)",
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
      }
    ],
    "outputs": []
  },
  {
    "key": "VotingPowerFacet.calculateBaseRoleMultiplier",
    "facetName": "VotingPowerFacet",
    "wrapperKey": "calculateBaseRoleMultiplier",
    "domain": "staking",
    "resource": "voting-power",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/staking/queries/calculate-base-role-multiplier",
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
    "operationId": "calculateBaseRoleMultiplier",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VotingPowerFacet.calculateBaseRoleMultiplier",
    "methodName": "calculateBaseRoleMultiplier",
    "signature": "calculateBaseRoleMultiplier(address)",
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
    "key": "VotingPowerFacet.getDelegatedVotingPower",
    "facetName": "VotingPowerFacet",
    "wrapperKey": "getDelegatedVotingPower",
    "domain": "staking",
    "resource": "voting-power",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/staking/queries/get-delegated-voting-power",
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
    "operationId": "getDelegatedVotingPower",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VotingPowerFacet.getDelegatedVotingPower",
    "methodName": "getDelegatedVotingPower",
    "signature": "getDelegatedVotingPower(address)",
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
    "key": "VotingPowerFacet.getLatestCheckpoint",
    "facetName": "VotingPowerFacet",
    "wrapperKey": "getLatestCheckpoint",
    "domain": "staking",
    "resource": "voting-power",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/staking/queries/get-latest-checkpoint",
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
      "kind": "tuple"
    },
    "operationId": "getLatestCheckpoint",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VotingPowerFacet.getLatestCheckpoint",
    "methodName": "getLatestCheckpoint",
    "signature": "getLatestCheckpoint(address)",
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
        "name": "fromBlock",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "votes",
        "type": "uint224",
        "internalType": "uint224"
      }
    ]
  },
  {
    "key": "VotingPowerFacet.getLockDuration",
    "facetName": "VotingPowerFacet",
    "wrapperKey": "getLockDuration",
    "domain": "staking",
    "resource": "voting-power",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/staking/queries/get-lock-duration",
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
    "operationId": "getLockDuration",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VotingPowerFacet.getLockDuration",
    "methodName": "getLockDuration",
    "signature": "getLockDuration(address)",
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
    "key": "VotingPowerFacet.getLockTimestamp",
    "facetName": "VotingPowerFacet",
    "wrapperKey": "getLockTimestamp",
    "domain": "staking",
    "resource": "voting-power",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/staking/queries/get-lock-timestamp",
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
    "operationId": "getLockTimestamp",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VotingPowerFacet.getLockTimestamp",
    "methodName": "getLockTimestamp",
    "signature": "getLockTimestamp(address)",
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
    "key": "VotingPowerFacet.getPastVotes",
    "facetName": "VotingPowerFacet",
    "wrapperKey": "getPastVotes",
    "domain": "staking",
    "resource": "voting-power",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/staking/queries/get-past-votes",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "account",
          "source": "query",
          "field": "account"
        },
        {
          "name": "blockNumber",
          "source": "query",
          "field": "blockNumber"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "getPastVotes",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VotingPowerFacet.getPastVotes",
    "methodName": "getPastVotes",
    "signature": "getPastVotes(address,uint256)",
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
      },
      {
        "name": "blockNumber",
        "type": "uint256",
        "internalType": "uint256"
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
    "key": "VotingPowerFacet.getVotes",
    "facetName": "VotingPowerFacet",
    "wrapperKey": "getVotes",
    "domain": "staking",
    "resource": "voting-power",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/staking/queries/get-votes",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "account",
          "source": "query",
          "field": "account"
        },
        {
          "name": "blockNumber",
          "source": "query",
          "field": "blockNumber"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "getVotes",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VotingPowerFacet.getVotes",
    "methodName": "getVotes",
    "signature": "getVotes(address,uint256)",
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
      },
      {
        "name": "blockNumber",
        "type": "uint256",
        "internalType": "uint256"
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
    "key": "VotingPowerFacet.getVotingPower",
    "facetName": "VotingPowerFacet",
    "wrapperKey": "getVotingPower",
    "domain": "staking",
    "resource": "voting-power",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/staking/queries/get-voting-power",
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
    "operationId": "getVotingPower",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VotingPowerFacet.getVotingPower",
    "methodName": "getVotingPower",
    "signature": "getVotingPower(address)",
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
    "key": "VotingPowerFacet.getVotingPowerWithDelegations",
    "facetName": "VotingPowerFacet",
    "wrapperKey": "getVotingPowerWithDelegations",
    "domain": "staking",
    "resource": "voting-power",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/staking/queries/get-voting-power-with-delegations",
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
    "operationId": "getVotingPowerWithDelegations",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VotingPowerFacet.getVotingPowerWithDelegations",
    "methodName": "getVotingPowerWithDelegations",
    "signature": "getVotingPowerWithDelegations(address)",
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
    "key": "VotingPowerFacet.MAX_BATCH_SIZE",
    "facetName": "VotingPowerFacet",
    "wrapperKey": "MAX_BATCH_SIZE",
    "domain": "staking",
    "resource": "voting-power",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/staking/queries/max-batch-size",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "maxBatchSize",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VotingPowerFacet.MAX_BATCH_SIZE",
    "methodName": "MAX_BATCH_SIZE",
    "signature": "MAX_BATCH_SIZE()",
    "category": "read",
    "mutability": "pure",
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
    "key": "VotingPowerFacet.setMaxLockDuration",
    "facetName": "VotingPowerFacet",
    "wrapperKey": "setMaxLockDuration",
    "domain": "staking",
    "resource": "voting-power",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/staking/commands/set-max-lock-duration",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "maxDuration",
          "source": "body",
          "field": "maxDuration"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setMaxLockDuration",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VotingPowerFacet.setMaxLockDuration",
    "methodName": "setMaxLockDuration",
    "signature": "setMaxLockDuration(uint256)",
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
        "name": "maxDuration",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "VotingPowerFacet.setRoleMultiplier",
    "facetName": "VotingPowerFacet",
    "wrapperKey": "setRoleMultiplier",
    "domain": "staking",
    "resource": "voting-power",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/staking/commands/set-role-multiplier",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "role",
          "source": "body",
          "field": "role"
        },
        {
          "name": "multiplier",
          "source": "body",
          "field": "multiplier"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setRoleMultiplier",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VotingPowerFacet.setRoleMultiplier",
    "methodName": "setRoleMultiplier",
    "signature": "setRoleMultiplier(bytes32,uint256)",
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
        "name": "multiplier",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "VotingPowerFacet.setupInitialVotingPower",
    "facetName": "VotingPowerFacet",
    "wrapperKey": "setupInitialVotingPower",
    "domain": "staking",
    "resource": "voting-power",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/staking/commands/setup-initial-voting-power",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "account",
          "source": "body",
          "field": "account"
        },
        {
          "name": "votingPower",
          "source": "body",
          "field": "votingPower"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setupInitialVotingPower",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VotingPowerFacet.setupInitialVotingPower",
    "methodName": "setupInitialVotingPower",
    "signature": "setupInitialVotingPower(address,uint256)",
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
        "name": "votingPower",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "VotingPowerFacet.setZeroLockDuration",
    "facetName": "VotingPowerFacet",
    "wrapperKey": "setZeroLockDuration",
    "domain": "staking",
    "resource": "voting-power",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/staking/commands/set-zero-lock-duration",
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
      "kind": "void"
    },
    "operationId": "setZeroLockDuration",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VotingPowerFacet.setZeroLockDuration",
    "methodName": "setZeroLockDuration",
    "signature": "setZeroLockDuration(address)",
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
    "outputs": []
  },
  {
    "key": "VotingPowerFacet.updateLockDuration",
    "facetName": "VotingPowerFacet",
    "wrapperKey": "updateLockDuration",
    "domain": "staking",
    "resource": "voting-power",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/staking/commands/update-lock-duration",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "account",
          "source": "body",
          "field": "account"
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
    "operationId": "updateLockDuration",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VotingPowerFacet.updateLockDuration",
    "methodName": "updateLockDuration",
    "signature": "updateLockDuration(address,uint256)",
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
        "name": "duration",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "VotingPowerFacet.updateVotingPower",
    "facetName": "VotingPowerFacet",
    "wrapperKey": "updateVotingPower",
    "domain": "staking",
    "resource": "voting-power",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/staking/commands/update-voting-power",
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
      "kind": "void"
    },
    "operationId": "updateVotingPower",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VotingPowerFacet.updateVotingPower",
    "methodName": "updateVotingPower",
    "signature": "updateVotingPower(address)",
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
    "outputs": []
  },
  {
    "key": "VotingPowerFacet.updateVotingPowerBatch",
    "facetName": "VotingPowerFacet",
    "wrapperKey": "updateVotingPowerBatch",
    "domain": "staking",
    "resource": "voting-power",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/staking/commands/update-voting-power-batch",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "accounts",
          "source": "body",
          "field": "accounts"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "updateVotingPowerBatch",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VotingPowerFacet.updateVotingPowerBatch",
    "methodName": "updateVotingPowerBatch",
    "signature": "updateVotingPowerBatch(address[])",
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
        "name": "accounts",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "outputs": []
  }
] as HttpMethodDefinition[];
export const stakingEventDefinitions: HttpEventDefinition[] = [
  {
    "key": "DelegationFacet.DelegateChanged(address,address,address)",
    "facetName": "DelegationFacet",
    "wrapperKey": "DelegateChanged(address,address,address)",
    "domain": "staking",
    "operationId": "delegateChangedAddressAddressAddressEventQuery",
    "httpMethod": "POST",
    "path": "/v1/staking/events/delegate-changed/query",
    "notes": "DelegationFacet.DelegateChanged(address,address,address)",
    "eventName": "DelegateChanged",
    "signature": "DelegateChanged(address,address,address)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "delegator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "fromDelegate",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "toDelegate",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "projection": {
      "domain": "governance",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "governance_delegations",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "DelegationFacet.DelegateVotesChanged(address,uint256,uint256)",
    "facetName": "DelegationFacet",
    "wrapperKey": "DelegateVotesChanged(address,uint256,uint256)",
    "domain": "staking",
    "operationId": "delegateVotesChangedAddressUint256Uint256EventQuery",
    "httpMethod": "POST",
    "path": "/v1/staking/events/delegate-votes-changed/query",
    "notes": "DelegationFacet.DelegateVotesChanged(address,uint256,uint256)",
    "eventName": "DelegateVotesChanged",
    "signature": "DelegateVotesChanged(address,uint256,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "delegate",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "previousBalance",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "newBalance",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "governance",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "governance_delegations",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "DelegationFacet.VotingPowerUpdated",
    "facetName": "DelegationFacet",
    "wrapperKey": "VotingPowerUpdated",
    "domain": "staking",
    "operationId": "delegationVotingPowerUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/staking/events/voting-power-updated/query/delegation",
    "notes": "DelegationFacet.VotingPowerUpdated",
    "eventName": "VotingPowerUpdated",
    "signature": "VotingPowerUpdated(address,uint256,uint256)",
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
        "name": "oldVotingPower",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "newVotingPower",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "governance",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "governance_delegations",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "EchoScoreFacetV3.OracleFutureDriftConfigUpdated",
    "facetName": "EchoScoreFacetV3",
    "wrapperKey": "OracleFutureDriftConfigUpdated",
    "domain": "staking",
    "operationId": "oracleFutureDriftConfigUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/staking/events/oracle-future-drift-config-updated/query",
    "notes": "EchoScoreFacetV3.OracleFutureDriftConfigUpdated",
    "eventName": "OracleFutureDriftConfigUpdated",
    "signature": "OracleFutureDriftConfigUpdated(uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "maxFutureSeconds",
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
    "key": "EchoScoreFacetV3.OracleQuorumConfigUpdated",
    "facetName": "EchoScoreFacetV3",
    "wrapperKey": "OracleQuorumConfigUpdated",
    "domain": "staking",
    "operationId": "oracleQuorumConfigUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/staking/events/oracle-quorum-config-updated/query",
    "notes": "EchoScoreFacetV3.OracleQuorumConfigUpdated",
    "eventName": "OracleQuorumConfigUpdated",
    "signature": "OracleQuorumConfigUpdated(address[],uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "signers",
        "type": "address[]",
        "indexed": false,
        "internalType": "address[]"
      },
      {
        "name": "threshold",
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
    "key": "EchoScoreFacetV3.OracleStalenessConfigUpdated",
    "facetName": "EchoScoreFacetV3",
    "wrapperKey": "OracleStalenessConfigUpdated",
    "domain": "staking",
    "operationId": "oracleStalenessConfigUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/staking/events/oracle-staleness-config-updated/query",
    "notes": "EchoScoreFacetV3.OracleStalenessConfigUpdated",
    "eventName": "OracleStalenessConfigUpdated",
    "signature": "OracleStalenessConfigUpdated(uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "maxAgeSeconds",
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
    "key": "EchoScoreFacetV3.OracleUpdated",
    "facetName": "EchoScoreFacetV3",
    "wrapperKey": "OracleUpdated",
    "domain": "staking",
    "operationId": "oracleUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/staking/events/oracle-updated/query",
    "notes": "EchoScoreFacetV3.OracleUpdated",
    "eventName": "OracleUpdated",
    "signature": "OracleUpdated(address,address)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "oldOracle",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newOracle",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "projection": {
      "domain": "rawOnly",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "EchoScoreFacetV3.Paused",
    "facetName": "EchoScoreFacetV3",
    "wrapperKey": "Paused",
    "domain": "staking",
    "operationId": "pausedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/staking/events/paused/query",
    "notes": "EchoScoreFacetV3.Paused",
    "eventName": "Paused",
    "signature": "Paused(address)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "admin",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "projection": {
      "domain": "rawOnly",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "EchoScoreFacetV3.ReputationUpdated",
    "facetName": "EchoScoreFacetV3",
    "wrapperKey": "ReputationUpdated",
    "domain": "staking",
    "operationId": "reputationUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/staking/events/reputation-updated/query",
    "notes": "EchoScoreFacetV3.ReputationUpdated",
    "eventName": "ReputationUpdated",
    "signature": "ReputationUpdated(bytes32,uint256,uint256,uint256,uint256,uint256,uint256)",
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
        "name": "totalReputation",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "qualityScore",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "engagementScore",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "governanceScore",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "datasetScore",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "marketplaceScore",
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
    "key": "EchoScoreFacetV3.ScoresUpdated",
    "facetName": "EchoScoreFacetV3",
    "wrapperKey": "ScoresUpdated",
    "domain": "staking",
    "operationId": "scoresUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/staking/events/scores-updated/query",
    "notes": "EchoScoreFacetV3.ScoresUpdated",
    "eventName": "ScoresUpdated",
    "signature": "ScoresUpdated(uint256,uint256,address)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "batchId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "count",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "oracle",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "projection": {
      "domain": "rawOnly",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "EchoScoreFacetV3.Unpaused",
    "facetName": "EchoScoreFacetV3",
    "wrapperKey": "Unpaused",
    "domain": "staking",
    "operationId": "unpausedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/staking/events/unpaused/query",
    "notes": "EchoScoreFacetV3.Unpaused",
    "eventName": "Unpaused",
    "signature": "Unpaused(address)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "admin",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "projection": {
      "domain": "rawOnly",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "StakingFacet.EpochAdvanced",
    "facetName": "StakingFacet",
    "wrapperKey": "EpochAdvanced",
    "domain": "staking",
    "operationId": "epochAdvancedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/staking/events/epoch-advanced/query",
    "notes": "StakingFacet.EpochAdvanced",
    "eventName": "EpochAdvanced",
    "signature": "EpochAdvanced(uint256,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "epochNumber",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "maxReward",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "staking",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "staking_positions",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "StakingFacet.RewardPoolFunded",
    "facetName": "StakingFacet",
    "wrapperKey": "RewardPoolFunded",
    "domain": "staking",
    "operationId": "rewardPoolFundedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/staking/events/reward-pool-funded/query",
    "notes": "StakingFacet.RewardPoolFunded",
    "eventName": "RewardPoolFunded",
    "signature": "RewardPoolFunded(uint256,uint256,address)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "amount",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "newBalance",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "funder",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "projection": {
      "domain": "staking",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "staking_positions",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "StakingFacet.RewardsClaimed",
    "facetName": "StakingFacet",
    "wrapperKey": "RewardsClaimed",
    "domain": "staking",
    "operationId": "rewardsClaimedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/staking/events/rewards-claimed/query",
    "notes": "StakingFacet.RewardsClaimed",
    "eventName": "RewardsClaimed",
    "signature": "RewardsClaimed(address,uint256,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
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
        "name": "timestamp",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "staking",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "staking_rewards",
          "mode": "ledger"
        },
        {
          "table": "staking_positions",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "StakingFacet.RewardsClaimedDetailed",
    "facetName": "StakingFacet",
    "wrapperKey": "RewardsClaimedDetailed",
    "domain": "staking",
    "operationId": "rewardsClaimedDetailedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/staking/events/rewards-claimed-detailed/query",
    "notes": "StakingFacet.RewardsClaimedDetailed",
    "eventName": "RewardsClaimedDetailed",
    "signature": "RewardsClaimedDetailed(address,uint256,uint256,uint256,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "user",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "rawPending",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "claimable",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "forfeited",
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
      "domain": "staking",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "staking_rewards",
          "mode": "ledger"
        },
        {
          "table": "staking_positions",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "StakingFacet.Staked",
    "facetName": "StakingFacet",
    "wrapperKey": "Staked",
    "domain": "staking",
    "operationId": "stakedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/staking/events/staked/query",
    "notes": "StakingFacet.Staked",
    "eventName": "Staked",
    "signature": "Staked(address,uint256,uint256,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
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
        "name": "tier",
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
      "domain": "staking",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "staking_positions",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "StakingFacet.StakingInitialized",
    "facetName": "StakingFacet",
    "wrapperKey": "StakingInitialized",
    "domain": "staking",
    "operationId": "stakingInitializedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/staking/events/staking-initialized/query",
    "notes": "StakingFacet.StakingInitialized",
    "eventName": "StakingInitialized",
    "signature": "StakingInitialized(uint256,uint256,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "minStakeDuration",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "withdrawalCooldown",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "baseApy",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "staking",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "staking_positions",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "StakingFacet.StakingPaused",
    "facetName": "StakingFacet",
    "wrapperKey": "StakingPaused",
    "domain": "staking",
    "operationId": "stakingPausedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/staking/events/staking-paused/query",
    "notes": "StakingFacet.StakingPaused",
    "eventName": "StakingPaused",
    "signature": "StakingPaused(bool,address)",
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
      "domain": "staking",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "staking_positions",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "StakingFacet.TierConfigUpdated",
    "facetName": "StakingFacet",
    "wrapperKey": "TierConfigUpdated",
    "domain": "staking",
    "operationId": "tierConfigUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/staking/events/tier-config-updated/query",
    "notes": "StakingFacet.TierConfigUpdated",
    "eventName": "TierConfigUpdated",
    "signature": "TierConfigUpdated(uint256[],uint256[],uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "thresholds",
        "type": "uint256[]",
        "indexed": false,
        "internalType": "uint256[]"
      },
      {
        "name": "multipliers",
        "type": "uint256[]",
        "indexed": false,
        "internalType": "uint256[]"
      },
      {
        "name": "baseApy",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "staking",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "staking_positions",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "StakingFacet.Unstaked",
    "facetName": "StakingFacet",
    "wrapperKey": "Unstaked",
    "domain": "staking",
    "operationId": "unstakedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/staking/events/unstaked/query",
    "notes": "StakingFacet.Unstaked",
    "eventName": "Unstaked",
    "signature": "Unstaked(address,uint256,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
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
        "name": "rewardsClaimed",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "staking",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "staking_positions",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "StakingFacet.UnstakeRequested",
    "facetName": "StakingFacet",
    "wrapperKey": "UnstakeRequested",
    "domain": "staking",
    "operationId": "unstakeRequestedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/staking/events/unstake-requested/query",
    "notes": "StakingFacet.UnstakeRequested",
    "eventName": "UnstakeRequested",
    "signature": "UnstakeRequested(address,uint256,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
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
        "name": "unlockTimestamp",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "staking",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "staking_positions",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "VotingPowerFacet.LockDurationUpdated",
    "facetName": "VotingPowerFacet",
    "wrapperKey": "LockDurationUpdated",
    "domain": "staking",
    "operationId": "lockDurationUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/staking/events/lock-duration-updated/query",
    "notes": "VotingPowerFacet.LockDurationUpdated",
    "eventName": "LockDurationUpdated",
    "signature": "LockDurationUpdated(address,uint256,uint256)",
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
        "name": "duration",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "unlockTime",
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
    "key": "VotingPowerFacet.MaxLockDurationUpdated",
    "facetName": "VotingPowerFacet",
    "wrapperKey": "MaxLockDurationUpdated",
    "domain": "staking",
    "operationId": "maxLockDurationUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/staking/events/max-lock-duration-updated/query",
    "notes": "VotingPowerFacet.MaxLockDurationUpdated",
    "eventName": "MaxLockDurationUpdated",
    "signature": "MaxLockDurationUpdated(uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "maxDuration",
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
    "key": "VotingPowerFacet.RoleMultiplierUpdated",
    "facetName": "VotingPowerFacet",
    "wrapperKey": "RoleMultiplierUpdated",
    "domain": "staking",
    "operationId": "roleMultiplierUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/staking/events/role-multiplier-updated/query",
    "notes": "VotingPowerFacet.RoleMultiplierUpdated",
    "eventName": "RoleMultiplierUpdated",
    "signature": "RoleMultiplierUpdated(bytes32,uint256)",
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
        "name": "multiplier",
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
    "key": "VotingPowerFacet.VotingPowerUpdated",
    "facetName": "VotingPowerFacet",
    "wrapperKey": "VotingPowerUpdated",
    "domain": "staking",
    "operationId": "votingPowerVotingPowerUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/staking/events/voting-power-updated/query/voting-power",
    "notes": "VotingPowerFacet.VotingPowerUpdated",
    "eventName": "VotingPowerUpdated",
    "signature": "VotingPowerUpdated(address,uint256,uint256)",
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
        "name": "oldVotingPower",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "newVotingPower",
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
  }
] as HttpEventDefinition[];
