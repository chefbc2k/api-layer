import type { HttpEventDefinition, HttpMethodDefinition } from "../../../../shared/route-types.js";

export const diamondAdminMethodDefinitions: HttpMethodDefinition[] = [
  {
    "key": "DiamondCutFacet.diamondCut",
    "facetName": "DiamondCutFacet",
    "wrapperKey": "diamondCut",
    "domain": "diamond-admin",
    "resource": "diamond-admin",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/diamond-admin/admin/diamond-cut",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "facetCuts",
          "source": "body",
          "field": "facetCuts"
        },
        {
          "name": "initContract",
          "source": "body",
          "field": "initContract"
        },
        {
          "name": "initCalldata",
          "source": "body",
          "field": "initCalldata"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "diamondCut",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "DiamondCutFacet.diamondCut",
    "methodName": "diamondCut",
    "signature": "diamondCut((address,uint8,bytes4[])[],address,bytes)",
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
        "name": "facetCuts",
        "type": "tuple[]",
        "internalType": "struct IDiamondCut.FacetCut[]",
        "components": [
          {
            "name": "facetAddress",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "action",
            "type": "uint8",
            "internalType": "enum IDiamondCut.FacetCutAction"
          },
          {
            "name": "functionSelectors",
            "type": "bytes4[]",
            "internalType": "bytes4[]"
          }
        ]
      },
      {
        "name": "initContract",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "initCalldata",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": []
  },
  {
    "key": "DiamondCutFacet.FOUNDER_ROLE",
    "facetName": "DiamondCutFacet",
    "wrapperKey": "FOUNDER_ROLE",
    "domain": "diamond-admin",
    "resource": "diamond-admin",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/diamond-admin/queries/founder-role",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "founderRole",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "DiamondCutFacet.FOUNDER_ROLE",
    "methodName": "FOUNDER_ROLE",
    "signature": "FOUNDER_ROLE()",
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
    "key": "DiamondCutFacet.getTrustedInitCodehash",
    "facetName": "DiamondCutFacet",
    "wrapperKey": "getTrustedInitCodehash",
    "domain": "diamond-admin",
    "resource": "diamond-admin",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/diamond-admin/queries/get-trusted-init-codehash",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "initContract",
          "source": "query",
          "field": "initContract"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "getTrustedInitCodehash",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "DiamondCutFacet.getTrustedInitCodehash",
    "methodName": "getTrustedInitCodehash",
    "signature": "getTrustedInitCodehash(address)",
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
        "name": "initContract",
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
    "key": "DiamondCutFacet.isImmutableSelectorReserved",
    "facetName": "DiamondCutFacet",
    "wrapperKey": "isImmutableSelectorReserved",
    "domain": "diamond-admin",
    "resource": "diamond-admin",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/diamond-admin/queries/is-immutable-selector-reserved",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "selector",
          "source": "query",
          "field": "selector"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "isImmutableSelectorReserved",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "DiamondCutFacet.isImmutableSelectorReserved",
    "methodName": "isImmutableSelectorReserved",
    "signature": "isImmutableSelectorReserved(bytes4)",
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
        "name": "selector",
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
    "key": "DiamondCutFacet.isTrustedInitSelector",
    "facetName": "DiamondCutFacet",
    "wrapperKey": "isTrustedInitSelector",
    "domain": "diamond-admin",
    "resource": "diamond-admin",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/diamond-admin/queries/is-trusted-init-selector",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "initContract",
          "source": "query",
          "field": "initContract"
        },
        {
          "name": "selector",
          "source": "query",
          "field": "selector"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "isTrustedInitSelector",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "DiamondCutFacet.isTrustedInitSelector",
    "methodName": "isTrustedInitSelector",
    "signature": "isTrustedInitSelector(address,bytes4)",
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
        "name": "initContract",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "selector",
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
    "key": "DiamondCutFacet.isTrustedInitSelectorPolicyEnabled",
    "facetName": "DiamondCutFacet",
    "wrapperKey": "isTrustedInitSelectorPolicyEnabled",
    "domain": "diamond-admin",
    "resource": "diamond-admin",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/diamond-admin/queries/is-trusted-init-selector-policy-enabled",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "initContract",
          "source": "query",
          "field": "initContract"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "isTrustedInitSelectorPolicyEnabled",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "DiamondCutFacet.isTrustedInitSelectorPolicyEnabled",
    "methodName": "isTrustedInitSelectorPolicyEnabled",
    "signature": "isTrustedInitSelectorPolicyEnabled(address)",
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
        "name": "initContract",
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
    "key": "DiamondCutFacet.setTrustedInitCodehash",
    "facetName": "DiamondCutFacet",
    "wrapperKey": "setTrustedInitCodehash",
    "domain": "diamond-admin",
    "resource": "diamond-admin",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/diamond-admin/admin/set-trusted-init-codehash",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "initContract",
          "source": "body",
          "field": "initContract"
        },
        {
          "name": "expectedCodehash",
          "source": "body",
          "field": "expectedCodehash"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setTrustedInitCodehash",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "DiamondCutFacet.setTrustedInitCodehash",
    "methodName": "setTrustedInitCodehash",
    "signature": "setTrustedInitCodehash(address,bytes32)",
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
        "name": "initContract",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "expectedCodehash",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": []
  },
  {
    "key": "DiamondCutFacet.setTrustedInitContract",
    "facetName": "DiamondCutFacet",
    "wrapperKey": "setTrustedInitContract",
    "domain": "diamond-admin",
    "resource": "diamond-admin",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/diamond-admin/admin/set-trusted-init-contract",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "initContract",
          "source": "body",
          "field": "initContract"
        },
        {
          "name": "trusted",
          "source": "body",
          "field": "trusted"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setTrustedInitContract",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "DiamondCutFacet.setTrustedInitContract",
    "methodName": "setTrustedInitContract",
    "signature": "setTrustedInitContract(address,bool)",
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
        "name": "initContract",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "trusted",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": []
  },
  {
    "key": "DiamondCutFacet.setTrustedInitSelector",
    "facetName": "DiamondCutFacet",
    "wrapperKey": "setTrustedInitSelector",
    "domain": "diamond-admin",
    "resource": "diamond-admin",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/diamond-admin/admin/set-trusted-init-selector",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "initContract",
          "source": "body",
          "field": "initContract"
        },
        {
          "name": "selector",
          "source": "body",
          "field": "selector"
        },
        {
          "name": "trusted",
          "source": "body",
          "field": "trusted"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setTrustedInitSelector",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "DiamondCutFacet.setTrustedInitSelector",
    "methodName": "setTrustedInitSelector",
    "signature": "setTrustedInitSelector(address,bytes4,bool)",
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
        "name": "initContract",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "selector",
        "type": "bytes4",
        "internalType": "bytes4"
      },
      {
        "name": "trusted",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": []
  },
  {
    "key": "DiamondLoupeFacet.facetAddress",
    "facetName": "DiamondLoupeFacet",
    "wrapperKey": "facetAddress",
    "domain": "diamond-admin",
    "resource": "diamond-admin",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/diamond-admin/queries/facet-address",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "functionSelector",
          "source": "query",
          "field": "functionSelector"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "facetAddress",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "DiamondLoupeFacet.facetAddress",
    "methodName": "facetAddress",
    "signature": "facetAddress(bytes4)",
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
        "name": "functionSelector",
        "type": "bytes4",
        "internalType": "bytes4"
      }
    ],
    "outputs": [
      {
        "name": "facetAddr",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "key": "DiamondLoupeFacet.facetAddresses",
    "facetName": "DiamondLoupeFacet",
    "wrapperKey": "facetAddresses",
    "domain": "diamond-admin",
    "resource": "diamond-admin",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/diamond-admin/queries/facet-addresses",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "array"
    },
    "operationId": "facetAddresses",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "DiamondLoupeFacet.facetAddresses",
    "methodName": "facetAddresses",
    "signature": "facetAddresses()",
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
        "name": "addresses",
        "type": "address[]",
        "internalType": "address[]"
      }
    ]
  },
  {
    "key": "DiamondLoupeFacet.facetFunctionSelectors",
    "facetName": "DiamondLoupeFacet",
    "wrapperKey": "facetFunctionSelectors",
    "domain": "diamond-admin",
    "resource": "diamond-admin",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/diamond-admin/queries/facet-function-selectors",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "facetAddr",
          "source": "query",
          "field": "facetAddr"
        }
      ]
    },
    "outputShape": {
      "kind": "array"
    },
    "operationId": "facetFunctionSelectors",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "DiamondLoupeFacet.facetFunctionSelectors",
    "methodName": "facetFunctionSelectors",
    "signature": "facetFunctionSelectors(address)",
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
        "name": "facetAddr",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "selectors",
        "type": "bytes4[]",
        "internalType": "bytes4[]"
      }
    ]
  },
  {
    "key": "DiamondLoupeFacet.facets",
    "facetName": "DiamondLoupeFacet",
    "wrapperKey": "facets",
    "domain": "diamond-admin",
    "resource": "diamond-admin",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/diamond-admin/queries/facets",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "array"
    },
    "operationId": "facets",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "DiamondLoupeFacet.facets",
    "methodName": "facets",
    "signature": "facets()",
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
        "name": "facetList",
        "type": "tuple[]",
        "internalType": "struct IDiamondLoupe.Facet[]",
        "components": [
          {
            "name": "facetAddress",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "functionSelectors",
            "type": "bytes4[]",
            "internalType": "bytes4[]"
          }
        ]
      }
    ]
  },
  {
    "key": "UpgradeControllerFacet.approveUpgrade",
    "facetName": "UpgradeControllerFacet",
    "wrapperKey": "approveUpgrade",
    "domain": "diamond-admin",
    "resource": "diamond-admin",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/diamond-admin/admin/approve-upgrade",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "upgradeId",
          "source": "body",
          "field": "upgradeId"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "approveUpgrade",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "UpgradeControllerFacet.approveUpgrade",
    "methodName": "approveUpgrade",
    "signature": "approveUpgrade(bytes32)",
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
        "name": "upgradeId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": []
  },
  {
    "key": "UpgradeControllerFacet.executeUpgrade",
    "facetName": "UpgradeControllerFacet",
    "wrapperKey": "executeUpgrade",
    "domain": "diamond-admin",
    "resource": "diamond-admin",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/diamond-admin/admin/execute-upgrade",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "facetCuts",
          "source": "body",
          "field": "facetCuts"
        },
        {
          "name": "initContract",
          "source": "body",
          "field": "initContract"
        },
        {
          "name": "initCalldata",
          "source": "body",
          "field": "initCalldata"
        },
        {
          "name": "upgradeId",
          "source": "body",
          "field": "upgradeId"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "executeUpgrade",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "UpgradeControllerFacet.executeUpgrade",
    "methodName": "executeUpgrade",
    "signature": "executeUpgrade((address,uint8,bytes4[])[],address,bytes,bytes32)",
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
        "name": "facetCuts",
        "type": "tuple[]",
        "internalType": "struct IDiamondCut.FacetCut[]",
        "components": [
          {
            "name": "facetAddress",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "action",
            "type": "uint8",
            "internalType": "enum IDiamondCut.FacetCutAction"
          },
          {
            "name": "functionSelectors",
            "type": "bytes4[]",
            "internalType": "bytes4[]"
          }
        ]
      },
      {
        "name": "initContract",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "initCalldata",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "upgradeId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": []
  },
  {
    "key": "UpgradeControllerFacet.freezeUpgradeControl",
    "facetName": "UpgradeControllerFacet",
    "wrapperKey": "freezeUpgradeControl",
    "domain": "diamond-admin",
    "resource": "diamond-admin",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/diamond-admin/admin/freeze-upgrade-control",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "freezeUpgradeControl",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "UpgradeControllerFacet.freezeUpgradeControl",
    "methodName": "freezeUpgradeControl",
    "signature": "freezeUpgradeControl()",
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
    "key": "UpgradeControllerFacet.getOperationalInvariants",
    "facetName": "UpgradeControllerFacet",
    "wrapperKey": "getOperationalInvariants",
    "domain": "diamond-admin",
    "resource": "diamond-admin",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/diamond-admin/queries/get-operational-invariants",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "tuple"
    },
    "operationId": "getOperationalInvariants",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "UpgradeControllerFacet.getOperationalInvariants",
    "methodName": "getOperationalInvariants",
    "signature": "getOperationalInvariants()",
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
    "inputs": [],
    "outputs": [
      {
        "name": "upgradeInitialized",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "upgradeEnforced",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "upgradeFrozen",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "ownerPolicyEnforced",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "ownerIsApprovedTarget",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "emergencyTimeout",
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
    "key": "UpgradeControllerFacet.getUpgrade",
    "facetName": "UpgradeControllerFacet",
    "wrapperKey": "getUpgrade",
    "domain": "diamond-admin",
    "resource": "diamond-admin",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/diamond-admin/queries/get-upgrade",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "upgradeId",
          "source": "query",
          "field": "upgradeId"
        }
      ]
    },
    "outputShape": {
      "kind": "tuple"
    },
    "operationId": "getUpgrade",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "UpgradeControllerFacet.getUpgrade",
    "methodName": "getUpgrade",
    "signature": "getUpgrade(bytes32)",
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
        "name": "upgradeId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "proposer",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "proposedAt",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "approvalCount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "executed",
        "type": "bool",
        "internalType": "bool"
      }
    ]
  },
  {
    "key": "UpgradeControllerFacet.getUpgradeControlStatus",
    "facetName": "UpgradeControllerFacet",
    "wrapperKey": "getUpgradeControlStatus",
    "domain": "diamond-admin",
    "resource": "diamond-admin",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/diamond-admin/queries/get-upgrade-control-status",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "tuple"
    },
    "operationId": "getUpgradeControlStatus",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "UpgradeControllerFacet.getUpgradeControlStatus",
    "methodName": "getUpgradeControlStatus",
    "signature": "getUpgradeControlStatus()",
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
        "name": "initialized",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "enforced",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "frozen",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "owner_",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "key": "UpgradeControllerFacet.getUpgradeDelay",
    "facetName": "UpgradeControllerFacet",
    "wrapperKey": "getUpgradeDelay",
    "domain": "diamond-admin",
    "resource": "diamond-admin",
    "classification": "read",
    "httpMethod": "POST",
    "path": "/v1/diamond-admin/queries/get-upgrade-delay",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "getUpgradeDelay",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "UpgradeControllerFacet.getUpgradeDelay",
    "methodName": "getUpgradeDelay",
    "signature": "getUpgradeDelay()",
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
    "key": "UpgradeControllerFacet.getUpgradeThreshold",
    "facetName": "UpgradeControllerFacet",
    "wrapperKey": "getUpgradeThreshold",
    "domain": "diamond-admin",
    "resource": "diamond-admin",
    "classification": "read",
    "httpMethod": "POST",
    "path": "/v1/diamond-admin/queries/get-upgrade-threshold",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "getUpgradeThreshold",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "UpgradeControllerFacet.getUpgradeThreshold",
    "methodName": "getUpgradeThreshold",
    "signature": "getUpgradeThreshold()",
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
    "key": "UpgradeControllerFacet.initUpgradeController",
    "facetName": "UpgradeControllerFacet",
    "wrapperKey": "initUpgradeController",
    "domain": "diamond-admin",
    "resource": "diamond-admin",
    "classification": "create",
    "httpMethod": "POST",
    "path": "/v1/diamond-admin/diamond-admin",
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
        },
        {
          "name": "delay",
          "source": "body",
          "field": "delay"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "initUpgradeController",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "UpgradeControllerFacet.initUpgradeController",
    "methodName": "initUpgradeController",
    "signature": "initUpgradeController(address[],uint256,uint256)",
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
      },
      {
        "name": "delay",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "UpgradeControllerFacet.isUpgradeApproved",
    "facetName": "UpgradeControllerFacet",
    "wrapperKey": "isUpgradeApproved",
    "domain": "diamond-admin",
    "resource": "diamond-admin",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/diamond-admin/queries/is-upgrade-approved",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "upgradeId",
          "source": "query",
          "field": "upgradeId"
        },
        {
          "name": "signer",
          "source": "query",
          "field": "signer"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "isUpgradeApproved",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "UpgradeControllerFacet.isUpgradeApproved",
    "methodName": "isUpgradeApproved",
    "signature": "isUpgradeApproved(bytes32,address)",
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
        "name": "upgradeId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "signer",
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
    "key": "UpgradeControllerFacet.isUpgradeControlFrozen",
    "facetName": "UpgradeControllerFacet",
    "wrapperKey": "isUpgradeControlFrozen",
    "domain": "diamond-admin",
    "resource": "diamond-admin",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/diamond-admin/queries/is-upgrade-control-frozen",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "isUpgradeControlFrozen",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "UpgradeControllerFacet.isUpgradeControlFrozen",
    "methodName": "isUpgradeControlFrozen",
    "signature": "isUpgradeControlFrozen()",
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
    "key": "UpgradeControllerFacet.isUpgradeSigner",
    "facetName": "UpgradeControllerFacet",
    "wrapperKey": "isUpgradeSigner",
    "domain": "diamond-admin",
    "resource": "diamond-admin",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/diamond-admin/queries/is-upgrade-signer",
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
    "operationId": "isUpgradeSigner",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "UpgradeControllerFacet.isUpgradeSigner",
    "methodName": "isUpgradeSigner",
    "signature": "isUpgradeSigner(address)",
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
    "key": "UpgradeControllerFacet.proposeDiamondCut",
    "facetName": "UpgradeControllerFacet",
    "wrapperKey": "proposeDiamondCut",
    "domain": "diamond-admin",
    "resource": "diamond-admin",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/diamond-admin/admin/propose-diamond-cut",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "facetCuts",
          "source": "body",
          "field": "facetCuts"
        },
        {
          "name": "initContract",
          "source": "body",
          "field": "initContract"
        },
        {
          "name": "initCalldata",
          "source": "body",
          "field": "initCalldata"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "proposeDiamondCut",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "UpgradeControllerFacet.proposeDiamondCut",
    "methodName": "proposeDiamondCut",
    "signature": "proposeDiamondCut((address,uint8,bytes4[])[],address,bytes)",
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
        "name": "facetCuts",
        "type": "tuple[]",
        "internalType": "struct IDiamondCut.FacetCut[]",
        "components": [
          {
            "name": "facetAddress",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "action",
            "type": "uint8",
            "internalType": "enum IDiamondCut.FacetCutAction"
          },
          {
            "name": "functionSelectors",
            "type": "bytes4[]",
            "internalType": "bytes4[]"
          }
        ]
      },
      {
        "name": "initContract",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "initCalldata",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [
      {
        "name": "upgradeId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "key": "UpgradeControllerFacet.setUpgradeControlEnforced",
    "facetName": "UpgradeControllerFacet",
    "wrapperKey": "setUpgradeControlEnforced",
    "domain": "diamond-admin",
    "resource": "diamond-admin",
    "classification": "admin",
    "httpMethod": "POST",
    "path": "/v1/diamond-admin/admin/set-upgrade-control-enforced",
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
    "operationId": "setUpgradeControlEnforced",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "UpgradeControllerFacet.setUpgradeControlEnforced",
    "methodName": "setUpgradeControlEnforced",
    "signature": "setUpgradeControlEnforced(bool)",
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
  }
] as HttpMethodDefinition[];
export const diamondAdminEventDefinitions: HttpEventDefinition[] = [
  {
    "key": "DiamondCutFacet.DiamondCut",
    "facetName": "DiamondCutFacet",
    "wrapperKey": "DiamondCut",
    "domain": "diamond-admin",
    "operationId": "diamondCutEventQuery",
    "httpMethod": "POST",
    "path": "/v1/diamond-admin/events/diamond-cut/query",
    "notes": "DiamondCutFacet.DiamondCut",
    "eventName": "DiamondCut",
    "signature": "DiamondCut((address,uint8,bytes4[])[],address,bytes)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "_diamondCut",
        "type": "tuple[]",
        "indexed": false,
        "internalType": "struct IDiamondCut.FacetCut[]",
        "components": [
          {
            "name": "facetAddress",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "action",
            "type": "uint8",
            "internalType": "enum IDiamondCut.FacetCutAction"
          },
          {
            "name": "functionSelectors",
            "type": "bytes4[]",
            "internalType": "bytes4[]"
          }
        ]
      },
      {
        "name": "_init",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "_calldata",
        "type": "bytes",
        "indexed": false,
        "internalType": "bytes"
      }
    ],
    "projection": {
      "domain": "rawOnly",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "DiamondCutFacet.DiamondCutEvent",
    "facetName": "DiamondCutFacet",
    "wrapperKey": "DiamondCutEvent",
    "domain": "diamond-admin",
    "operationId": "diamondCutEventEventQuery",
    "httpMethod": "POST",
    "path": "/v1/diamond-admin/events/diamond-cut-event/query",
    "notes": "DiamondCutFacet.DiamondCutEvent",
    "eventName": "DiamondCutEvent",
    "signature": "DiamondCutEvent((address,uint8,bytes4[])[],address,bytes)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "diamondCut",
        "type": "tuple[]",
        "indexed": false,
        "internalType": "struct IDiamondCut.FacetCut[]",
        "components": [
          {
            "name": "facetAddress",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "action",
            "type": "uint8",
            "internalType": "enum IDiamondCut.FacetCutAction"
          },
          {
            "name": "functionSelectors",
            "type": "bytes4[]",
            "internalType": "bytes4[]"
          }
        ]
      },
      {
        "name": "init",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "callData",
        "type": "bytes",
        "indexed": false,
        "internalType": "bytes"
      }
    ],
    "projection": {
      "domain": "rawOnly",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "DiamondCutFacet.TrustedInitCodehashSet",
    "facetName": "DiamondCutFacet",
    "wrapperKey": "TrustedInitCodehashSet",
    "domain": "diamond-admin",
    "operationId": "trustedInitCodehashSetEventQuery",
    "httpMethod": "POST",
    "path": "/v1/diamond-admin/events/trusted-init-codehash-set/query",
    "notes": "DiamondCutFacet.TrustedInitCodehashSet",
    "eventName": "TrustedInitCodehashSet",
    "signature": "TrustedInitCodehashSet(address,bytes32)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "initContract",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "expectedCodehash",
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
    "key": "DiamondCutFacet.TrustedInitContractSet",
    "facetName": "DiamondCutFacet",
    "wrapperKey": "TrustedInitContractSet",
    "domain": "diamond-admin",
    "operationId": "trustedInitContractSetEventQuery",
    "httpMethod": "POST",
    "path": "/v1/diamond-admin/events/trusted-init-contract-set/query",
    "notes": "DiamondCutFacet.TrustedInitContractSet",
    "eventName": "TrustedInitContractSet",
    "signature": "TrustedInitContractSet(address,bool)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "initContract",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "trusted",
        "type": "bool",
        "indexed": true,
        "internalType": "bool"
      }
    ],
    "projection": {
      "domain": "rawOnly",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "DiamondCutFacet.TrustedInitSelectorSet",
    "facetName": "DiamondCutFacet",
    "wrapperKey": "TrustedInitSelectorSet",
    "domain": "diamond-admin",
    "operationId": "trustedInitSelectorSetEventQuery",
    "httpMethod": "POST",
    "path": "/v1/diamond-admin/events/trusted-init-selector-set/query",
    "notes": "DiamondCutFacet.TrustedInitSelectorSet",
    "eventName": "TrustedInitSelectorSet",
    "signature": "TrustedInitSelectorSet(address,bytes4,bool)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "initContract",
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
        "name": "trusted",
        "type": "bool",
        "indexed": true,
        "internalType": "bool"
      }
    ],
    "projection": {
      "domain": "rawOnly",
      "projectionMode": "rawOnly",
      "targets": []
    }
  },
  {
    "key": "UpgradeControllerFacet.UpgradeApproved",
    "facetName": "UpgradeControllerFacet",
    "wrapperKey": "UpgradeApproved",
    "domain": "diamond-admin",
    "operationId": "upgradeApprovedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/diamond-admin/events/upgrade-approved/query",
    "notes": "UpgradeControllerFacet.UpgradeApproved",
    "eventName": "UpgradeApproved",
    "signature": "UpgradeApproved(bytes32,address,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "upgradeId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "signer",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "approvalCount",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "upgrade",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "upgrade_requests",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "UpgradeControllerFacet.UpgradeControlEnforcementSet",
    "facetName": "UpgradeControllerFacet",
    "wrapperKey": "UpgradeControlEnforcementSet",
    "domain": "diamond-admin",
    "operationId": "upgradeControlEnforcementSetEventQuery",
    "httpMethod": "POST",
    "path": "/v1/diamond-admin/events/upgrade-control-enforcement-set/query",
    "notes": "UpgradeControllerFacet.UpgradeControlEnforcementSet",
    "eventName": "UpgradeControlEnforcementSet",
    "signature": "UpgradeControlEnforcementSet(bool)",
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
      "domain": "upgrade",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "upgrade_requests",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "UpgradeControllerFacet.UpgradeControlFrozen",
    "facetName": "UpgradeControllerFacet",
    "wrapperKey": "UpgradeControlFrozen",
    "domain": "diamond-admin",
    "operationId": "upgradeControlFrozenEventQuery",
    "httpMethod": "POST",
    "path": "/v1/diamond-admin/events/upgrade-control-frozen/query",
    "notes": "UpgradeControllerFacet.UpgradeControlFrozen",
    "eventName": "UpgradeControlFrozen",
    "signature": "UpgradeControlFrozen(address)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "frozenBy",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "projection": {
      "domain": "upgrade",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "upgrade_requests",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "UpgradeControllerFacet.UpgradeControllerInitialized",
    "facetName": "UpgradeControllerFacet",
    "wrapperKey": "UpgradeControllerInitialized",
    "domain": "diamond-admin",
    "operationId": "upgradeControllerInitializedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/diamond-admin/events/upgrade-controller-initialized/query",
    "notes": "UpgradeControllerFacet.UpgradeControllerInitialized",
    "eventName": "UpgradeControllerInitialized",
    "signature": "UpgradeControllerInitialized(address[],uint256,uint256)",
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
      },
      {
        "name": "delay",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "upgrade",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "upgrade_requests",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "UpgradeControllerFacet.UpgradeExecuted",
    "facetName": "UpgradeControllerFacet",
    "wrapperKey": "UpgradeExecuted",
    "domain": "diamond-admin",
    "operationId": "upgradeExecutedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/diamond-admin/events/upgrade-executed/query",
    "notes": "UpgradeControllerFacet.UpgradeExecuted",
    "eventName": "UpgradeExecuted",
    "signature": "UpgradeExecuted(bytes32)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "upgradeId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      }
    ],
    "projection": {
      "domain": "upgrade",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "upgrade_requests",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "UpgradeControllerFacet.UpgradeProposed",
    "facetName": "UpgradeControllerFacet",
    "wrapperKey": "UpgradeProposed",
    "domain": "diamond-admin",
    "operationId": "upgradeProposedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/diamond-admin/events/upgrade-proposed/query",
    "notes": "UpgradeControllerFacet.UpgradeProposed",
    "eventName": "UpgradeProposed",
    "signature": "UpgradeProposed(bytes32,address,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "upgradeId",
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
        "name": "proposedAt",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "upgrade",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "upgrade_requests",
          "mode": "current"
        }
      ]
    }
  }
] as HttpEventDefinition[];
