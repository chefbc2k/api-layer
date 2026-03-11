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
    "path": "/v1/tokenomics/vesting",
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
    "key": "TokenSupplyFacet.name",
    "facetName": "TokenSupplyFacet",
    "wrapperKey": "name",
    "domain": "tokenomics",
    "resource": "token-supply",
    "classification": "read",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/queries/name",
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
    "notes": "TokenSupplyFacet.name",
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
    "key": "TokenSupplyFacet.symbol",
    "facetName": "TokenSupplyFacet",
    "wrapperKey": "symbol",
    "domain": "tokenomics",
    "resource": "token-supply",
    "classification": "read",
    "httpMethod": "POST",
    "path": "/v1/tokenomics/queries/symbol",
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
    "notes": "TokenSupplyFacet.symbol",
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
    "path": "/v1/tokenomics/events/vesting-schedule-created/query",
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
  }
] as HttpEventDefinition[];
