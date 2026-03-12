import type { HttpEventDefinition, HttpMethodDefinition } from "../../../../shared/route-types.js";

export const datasetsMethodDefinitions: HttpMethodDefinition[] = [
  {
    "key": "VoiceDatasetFacet.appendAssets",
    "facetName": "VoiceDatasetFacet",
    "wrapperKey": "appendAssets",
    "domain": "datasets",
    "resource": "datasets",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/datasets/commands/append-assets",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "datasetId",
          "source": "body",
          "field": "datasetId"
        },
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
    "operationId": "appendAssets",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VoiceDatasetFacet.appendAssets",
    "methodName": "appendAssets",
    "signature": "appendAssets(uint256,uint256[])",
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
        "name": "datasetId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "assetIds",
        "type": "uint256[]",
        "internalType": "uint256[]"
      }
    ],
    "outputs": []
  },
  {
    "key": "VoiceDatasetFacet.burnDataset",
    "facetName": "VoiceDatasetFacet",
    "wrapperKey": "burnDataset",
    "domain": "datasets",
    "resource": "datasets",
    "classification": "delete",
    "httpMethod": "DELETE",
    "path": "/v1/datasets/commands/burn-dataset",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "datasetId",
          "source": "body",
          "field": "datasetId"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "burnDataset",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VoiceDatasetFacet.burnDataset",
    "methodName": "burnDataset",
    "signature": "burnDataset(uint256)",
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
        "name": "datasetId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "VoiceDatasetFacet.containsAsset",
    "facetName": "VoiceDatasetFacet",
    "wrapperKey": "containsAsset",
    "domain": "datasets",
    "resource": "datasets",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/datasets/queries/contains-asset",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "datasetId",
          "source": "query",
          "field": "datasetId"
        },
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
    "operationId": "containsAsset",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceDatasetFacet.containsAsset",
    "methodName": "containsAsset",
    "signature": "containsAsset(uint256,uint256)",
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
        "name": "datasetId",
        "type": "uint256",
        "internalType": "uint256"
      },
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
    "key": "VoiceDatasetFacet.createDataset",
    "facetName": "VoiceDatasetFacet",
    "wrapperKey": "createDataset",
    "domain": "datasets",
    "resource": "datasets",
    "classification": "create",
    "httpMethod": "POST",
    "path": "/v1/datasets/datasets",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "title",
          "source": "body",
          "field": "title"
        },
        {
          "name": "assetIds",
          "source": "body",
          "field": "assetIds"
        },
        {
          "name": "licenseTemplateId",
          "source": "body",
          "field": "licenseTemplateId"
        },
        {
          "name": "metadataURI",
          "source": "body",
          "field": "metadataURI"
        },
        {
          "name": "royaltyBps",
          "source": "body",
          "field": "royaltyBps"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "createDataset",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VoiceDatasetFacet.createDataset",
    "methodName": "createDataset",
    "signature": "createDataset(string,uint256[],uint256,string,uint96)",
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
        "name": "title",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "assetIds",
        "type": "uint256[]",
        "internalType": "uint256[]"
      },
      {
        "name": "licenseTemplateId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "metadataURI",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "royaltyBps",
        "type": "uint96",
        "internalType": "uint96"
      }
    ],
    "outputs": [
      {
        "name": "datasetId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "key": "VoiceDatasetFacet.getDataset",
    "facetName": "VoiceDatasetFacet",
    "wrapperKey": "getDataset",
    "domain": "datasets",
    "resource": "datasets",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/datasets/queries/get-dataset",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "datasetId",
          "source": "query",
          "field": "datasetId"
        }
      ]
    },
    "outputShape": {
      "kind": "object"
    },
    "operationId": "getDataset",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceDatasetFacet.getDataset",
    "methodName": "getDataset",
    "signature": "getDataset(uint256)",
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
        "name": "datasetId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct IVoiceDataset.VoiceDataset",
        "components": [
          {
            "name": "id",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "title",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "assetIds",
            "type": "uint256[]",
            "internalType": "uint256[]"
          },
          {
            "name": "licenseTemplateId",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "metadataURI",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "creator",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "royaltyBps",
            "type": "uint96",
            "internalType": "uint96"
          },
          {
            "name": "createdAt",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "active",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      }
    ]
  },
  {
    "key": "VoiceDatasetFacet.getDatasetsByCreator",
    "facetName": "VoiceDatasetFacet",
    "wrapperKey": "getDatasetsByCreator",
    "domain": "datasets",
    "resource": "datasets",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/datasets/queries/get-datasets-by-creator",
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
    "operationId": "getDatasetsByCreator",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceDatasetFacet.getDatasetsByCreator",
    "methodName": "getDatasetsByCreator",
    "signature": "getDatasetsByCreator(address)",
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
        "type": "uint256[]",
        "internalType": "uint256[]"
      }
    ]
  },
  {
    "key": "VoiceDatasetFacet.getMaxAssetsPerDataset",
    "facetName": "VoiceDatasetFacet",
    "wrapperKey": "getMaxAssetsPerDataset",
    "domain": "datasets",
    "resource": "datasets",
    "classification": "read",
    "httpMethod": "POST",
    "path": "/v1/datasets/queries/get-max-assets-per-dataset",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "getMaxAssetsPerDataset",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceDatasetFacet.getMaxAssetsPerDataset",
    "methodName": "getMaxAssetsPerDataset",
    "signature": "getMaxAssetsPerDataset()",
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
    "key": "VoiceDatasetFacet.getTotalDatasets",
    "facetName": "VoiceDatasetFacet",
    "wrapperKey": "getTotalDatasets",
    "domain": "datasets",
    "resource": "datasets",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/datasets/queries/get-total-datasets",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "getTotalDatasets",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceDatasetFacet.getTotalDatasets",
    "methodName": "getTotalDatasets",
    "signature": "getTotalDatasets()",
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
    "key": "VoiceDatasetFacet.removeAsset",
    "facetName": "VoiceDatasetFacet",
    "wrapperKey": "removeAsset",
    "domain": "datasets",
    "resource": "datasets",
    "classification": "delete",
    "httpMethod": "DELETE",
    "path": "/v1/datasets/commands/remove-asset",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "datasetId",
          "source": "body",
          "field": "datasetId"
        },
        {
          "name": "assetId",
          "source": "body",
          "field": "assetId"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "removeAsset",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VoiceDatasetFacet.removeAsset",
    "methodName": "removeAsset",
    "signature": "removeAsset(uint256,uint256)",
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
        "name": "datasetId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "assetId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "VoiceDatasetFacet.royaltyInfo",
    "facetName": "VoiceDatasetFacet",
    "wrapperKey": "royaltyInfo",
    "domain": "datasets",
    "resource": "datasets",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/datasets/queries/royalty-info",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "datasetId",
          "source": "query",
          "field": "datasetId"
        },
        {
          "name": "salePrice",
          "source": "query",
          "field": "salePrice"
        }
      ]
    },
    "outputShape": {
      "kind": "tuple"
    },
    "operationId": "royaltyInfo",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "VoiceDatasetFacet.royaltyInfo",
    "methodName": "royaltyInfo",
    "signature": "royaltyInfo(uint256,uint256)",
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
        "name": "datasetId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "salePrice",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "receiver",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "royaltyAmount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "key": "VoiceDatasetFacet.setDatasetStatus",
    "facetName": "VoiceDatasetFacet",
    "wrapperKey": "setDatasetStatus",
    "domain": "datasets",
    "resource": "datasets",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/datasets/commands/set-dataset-status",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "datasetId",
          "source": "body",
          "field": "datasetId"
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
    "operationId": "setDatasetStatus",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VoiceDatasetFacet.setDatasetStatus",
    "methodName": "setDatasetStatus",
    "signature": "setDatasetStatus(uint256,bool)",
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
        "name": "datasetId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "active",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": []
  },
  {
    "key": "VoiceDatasetFacet.setLicense",
    "facetName": "VoiceDatasetFacet",
    "wrapperKey": "setLicense",
    "domain": "datasets",
    "resource": "datasets",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/datasets/commands/set-license",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "datasetId",
          "source": "body",
          "field": "datasetId"
        },
        {
          "name": "licenseTemplateId",
          "source": "body",
          "field": "licenseTemplateId"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setLicense",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VoiceDatasetFacet.setLicense",
    "methodName": "setLicense",
    "signature": "setLicense(uint256,uint256)",
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
        "name": "datasetId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "licenseTemplateId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "VoiceDatasetFacet.setMaxAssetsPerDataset",
    "facetName": "VoiceDatasetFacet",
    "wrapperKey": "setMaxAssetsPerDataset",
    "domain": "datasets",
    "resource": "datasets",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/datasets/commands/set-max-assets-per-dataset",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "maxAssets",
          "source": "body",
          "field": "maxAssets"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setMaxAssetsPerDataset",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VoiceDatasetFacet.setMaxAssetsPerDataset",
    "methodName": "setMaxAssetsPerDataset",
    "signature": "setMaxAssetsPerDataset(uint256)",
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
        "name": "maxAssets",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "VoiceDatasetFacet.setMetadata",
    "facetName": "VoiceDatasetFacet",
    "wrapperKey": "setMetadata",
    "domain": "datasets",
    "resource": "datasets",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/datasets/commands/set-metadata",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "datasetId",
          "source": "body",
          "field": "datasetId"
        },
        {
          "name": "metadataURI",
          "source": "body",
          "field": "metadataURI"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setMetadata",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VoiceDatasetFacet.setMetadata",
    "methodName": "setMetadata",
    "signature": "setMetadata(uint256,string)",
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
        "name": "datasetId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "metadataURI",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": []
  },
  {
    "key": "VoiceDatasetFacet.setRoyalty",
    "facetName": "VoiceDatasetFacet",
    "wrapperKey": "setRoyalty",
    "domain": "datasets",
    "resource": "datasets",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/datasets/commands/set-royalty",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "datasetId",
          "source": "body",
          "field": "datasetId"
        },
        {
          "name": "royaltyBps",
          "source": "body",
          "field": "royaltyBps"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setRoyalty",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "VoiceDatasetFacet.setRoyalty",
    "methodName": "setRoyalty",
    "signature": "setRoyalty(uint256,uint96)",
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
        "name": "datasetId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "royaltyBps",
        "type": "uint96",
        "internalType": "uint96"
      }
    ],
    "outputs": []
  }
] as HttpMethodDefinition[];
export const datasetsEventDefinitions: HttpEventDefinition[] = [
  {
    "key": "VoiceDatasetFacet.AssetRemoved",
    "facetName": "VoiceDatasetFacet",
    "wrapperKey": "AssetRemoved",
    "domain": "datasets",
    "operationId": "assetRemovedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/datasets/events/asset-removed/query",
    "notes": "VoiceDatasetFacet.AssetRemoved",
    "eventName": "AssetRemoved",
    "signature": "AssetRemoved(uint256,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "datasetId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "assetId",
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
          "table": "voice_datasets",
          "mode": "current"
        },
        {
          "table": "voice_dataset_members",
          "mode": "ledger"
        }
      ]
    }
  },
  {
    "key": "VoiceDatasetFacet.AssetsAppended",
    "facetName": "VoiceDatasetFacet",
    "wrapperKey": "AssetsAppended",
    "domain": "datasets",
    "operationId": "assetsAppendedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/datasets/events/assets-appended/query",
    "notes": "VoiceDatasetFacet.AssetsAppended",
    "eventName": "AssetsAppended",
    "signature": "AssetsAppended(uint256,uint256[])",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "datasetId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "assetIds",
        "type": "uint256[]",
        "indexed": false,
        "internalType": "uint256[]"
      }
    ],
    "projection": {
      "domain": "voice",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "voice_datasets",
          "mode": "current"
        },
        {
          "table": "voice_dataset_members",
          "mode": "ledger"
        }
      ]
    }
  },
  {
    "key": "VoiceDatasetFacet.DatasetBurned",
    "facetName": "VoiceDatasetFacet",
    "wrapperKey": "DatasetBurned",
    "domain": "datasets",
    "operationId": "datasetBurnedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/datasets/events/dataset-burned/query",
    "notes": "VoiceDatasetFacet.DatasetBurned",
    "eventName": "DatasetBurned",
    "signature": "DatasetBurned(uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "datasetId",
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
          "table": "voice_datasets",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "VoiceDatasetFacet.DatasetCreated",
    "facetName": "VoiceDatasetFacet",
    "wrapperKey": "DatasetCreated",
    "domain": "datasets",
    "operationId": "datasetCreatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/datasets/events/dataset-created/query",
    "notes": "VoiceDatasetFacet.DatasetCreated",
    "eventName": "DatasetCreated",
    "signature": "DatasetCreated(uint256,address,string,uint256[],uint256,string,uint96)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "datasetId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "creator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "title",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "assetIds",
        "type": "uint256[]",
        "indexed": false,
        "internalType": "uint256[]"
      },
      {
        "name": "licenseTemplateId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "metadataURI",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "royaltyBps",
        "type": "uint96",
        "indexed": false,
        "internalType": "uint96"
      }
    ],
    "projection": {
      "domain": "voice",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "voice_datasets",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "VoiceDatasetFacet.DatasetRoyaltyPayeeSet",
    "facetName": "VoiceDatasetFacet",
    "wrapperKey": "DatasetRoyaltyPayeeSet",
    "domain": "datasets",
    "operationId": "datasetRoyaltyPayeeSetEventQuery",
    "httpMethod": "POST",
    "path": "/v1/datasets/events/dataset-royalty-payee-set/query",
    "notes": "VoiceDatasetFacet.DatasetRoyaltyPayeeSet",
    "eventName": "DatasetRoyaltyPayeeSet",
    "signature": "DatasetRoyaltyPayeeSet(uint256,address,address)",
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
        "name": "oldPayee",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newPayee",
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
          "table": "voice_datasets",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "VoiceDatasetFacet.DatasetStatusChanged",
    "facetName": "VoiceDatasetFacet",
    "wrapperKey": "DatasetStatusChanged",
    "domain": "datasets",
    "operationId": "datasetStatusChangedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/datasets/events/dataset-status-changed/query",
    "notes": "VoiceDatasetFacet.DatasetStatusChanged",
    "eventName": "DatasetStatusChanged",
    "signature": "DatasetStatusChanged(uint256,bool)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "datasetId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "active",
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
          "table": "voice_datasets",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "VoiceDatasetFacet.LicenseChanged",
    "facetName": "VoiceDatasetFacet",
    "wrapperKey": "LicenseChanged",
    "domain": "datasets",
    "operationId": "licenseChangedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/datasets/events/license-changed/query",
    "notes": "VoiceDatasetFacet.LicenseChanged",
    "eventName": "LicenseChanged",
    "signature": "LicenseChanged(uint256,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "datasetId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "licenseTemplateId",
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
          "table": "voice_datasets",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "VoiceDatasetFacet.MetadataChanged",
    "facetName": "VoiceDatasetFacet",
    "wrapperKey": "MetadataChanged",
    "domain": "datasets",
    "operationId": "metadataChangedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/datasets/events/metadata-changed/query",
    "notes": "VoiceDatasetFacet.MetadataChanged",
    "eventName": "MetadataChanged",
    "signature": "MetadataChanged(uint256,string)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "datasetId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "metadataURI",
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
          "table": "voice_datasets",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "VoiceDatasetFacet.RoyaltySet",
    "facetName": "VoiceDatasetFacet",
    "wrapperKey": "RoyaltySet",
    "domain": "datasets",
    "operationId": "royaltySetEventQuery",
    "httpMethod": "POST",
    "path": "/v1/datasets/events/royalty-set/query",
    "notes": "VoiceDatasetFacet.RoyaltySet",
    "eventName": "RoyaltySet",
    "signature": "RoyaltySet(uint256,uint96)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "datasetId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "royaltyBps",
        "type": "uint96",
        "indexed": true,
        "internalType": "uint96"
      }
    ],
    "projection": {
      "domain": "voice",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "voice_datasets",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "VoiceDatasetFacet.Transfer",
    "facetName": "VoiceDatasetFacet",
    "wrapperKey": "Transfer",
    "domain": "datasets",
    "operationId": "transferEventQuery",
    "httpMethod": "POST",
    "path": "/v1/datasets/events/transfer/query",
    "notes": "VoiceDatasetFacet.Transfer",
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
          "table": "voice_datasets",
          "mode": "current"
        }
      ]
    }
  }
] as HttpEventDefinition[];
