import type { HttpEventDefinition, HttpMethodDefinition } from "../../../../shared/route-types.js";

export const whisperblockMethodDefinitions: HttpMethodDefinition[] = [
  {
    "key": "WhisperBlockFacet.ENCRYPTOR_ROLE",
    "facetName": "WhisperBlockFacet",
    "wrapperKey": "ENCRYPTOR_ROLE",
    "domain": "whisperblock",
    "resource": "whisperblocks",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/whisperblock/queries/encryptor-role",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "encryptorRole",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "WhisperBlockFacet.ENCRYPTOR_ROLE",
    "methodName": "ENCRYPTOR_ROLE",
    "signature": "ENCRYPTOR_ROLE()",
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
    "key": "WhisperBlockFacet.generateAndSetEncryptionKey",
    "facetName": "WhisperBlockFacet",
    "wrapperKey": "generateAndSetEncryptionKey",
    "domain": "whisperblock",
    "resource": "whisperblocks",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/whisperblock/commands/generate-and-set-encryption-key",
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
      "kind": "scalar"
    },
    "operationId": "generateAndSetEncryptionKey",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "WhisperBlockFacet.generateAndSetEncryptionKey",
    "methodName": "generateAndSetEncryptionKey",
    "signature": "generateAndSetEncryptionKey(bytes32)",
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
    "outputs": [
      {
        "name": "publicKey",
        "type": "bytes",
        "internalType": "bytes"
      }
    ]
  },
  {
    "key": "WhisperBlockFacet.getAuditTrail",
    "facetName": "WhisperBlockFacet",
    "wrapperKey": "getAuditTrail",
    "domain": "whisperblock",
    "resource": "whisperblocks",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/whisperblock/queries/get-audit-trail",
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
    "operationId": "getAuditTrail",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "WhisperBlockFacet.getAuditTrail",
    "methodName": "getAuditTrail",
    "signature": "getAuditTrail(bytes32)",
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
        "type": "bytes32[]",
        "internalType": "bytes32[]"
      }
    ]
  },
  {
    "key": "WhisperBlockFacet.getSelectors",
    "facetName": "WhisperBlockFacet",
    "wrapperKey": "getSelectors",
    "domain": "whisperblock",
    "resource": "whisperblocks",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/whisperblock/queries/get-selectors",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "array"
    },
    "operationId": "getSelectors",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "WhisperBlockFacet.getSelectors",
    "methodName": "getSelectors",
    "signature": "getSelectors()",
    "category": "read",
    "mutability": "pure",
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
        "name": "selectors",
        "type": "bytes4[]",
        "internalType": "bytes4[]"
      }
    ]
  },
  {
    "key": "WhisperBlockFacet.grantAccess",
    "facetName": "WhisperBlockFacet",
    "wrapperKey": "grantAccess",
    "domain": "whisperblock",
    "resource": "whisperblocks",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/whisperblock/commands/grant-access",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "body",
          "field": "voiceHash"
        },
        {
          "name": "user",
          "source": "body",
          "field": "user"
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
    "operationId": "grantAccess",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "WhisperBlockFacet.grantAccess",
    "methodName": "grantAccess",
    "signature": "grantAccess(bytes32,address,uint256)",
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
    "key": "WhisperBlockFacet.OWNER_ROLE",
    "facetName": "WhisperBlockFacet",
    "wrapperKey": "OWNER_ROLE",
    "domain": "whisperblock",
    "resource": "whisperblocks",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/whisperblock/queries/owner-role",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "ownerRole",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "WhisperBlockFacet.OWNER_ROLE",
    "methodName": "OWNER_ROLE",
    "signature": "OWNER_ROLE()",
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
    "key": "WhisperBlockFacet.registerVoiceFingerprint",
    "facetName": "WhisperBlockFacet",
    "wrapperKey": "registerVoiceFingerprint",
    "domain": "whisperblock",
    "resource": "whisperblocks",
    "classification": "create",
    "httpMethod": "POST",
    "path": "/v1/whisperblock/whisperblocks",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "body",
          "field": "voiceHash"
        },
        {
          "name": "structuredFingerprintData",
          "source": "body",
          "field": "structuredFingerprintData"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "registerVoiceFingerprint",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "WhisperBlockFacet.registerVoiceFingerprint",
    "methodName": "registerVoiceFingerprint",
    "signature": "registerVoiceFingerprint(bytes32,bytes)",
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
        "name": "structuredFingerprintData",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": []
  },
  {
    "key": "WhisperBlockFacet.revokeAccess",
    "facetName": "WhisperBlockFacet",
    "wrapperKey": "revokeAccess",
    "domain": "whisperblock",
    "resource": "whisperblocks",
    "classification": "delete",
    "httpMethod": "DELETE",
    "path": "/v1/whisperblock/commands/revoke-access",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "body",
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
    "operationId": "revokeAccess",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "WhisperBlockFacet.revokeAccess",
    "methodName": "revokeAccess",
    "signature": "revokeAccess(bytes32,address)",
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
    "key": "WhisperBlockFacet.setAuditEnabled",
    "facetName": "WhisperBlockFacet",
    "wrapperKey": "setAuditEnabled",
    "domain": "whisperblock",
    "resource": "whisperblocks",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/whisperblock/commands/set-audit-enabled",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "enabled",
          "source": "body",
          "field": "enabled"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setAuditEnabled",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "WhisperBlockFacet.setAuditEnabled",
    "methodName": "setAuditEnabled",
    "signature": "setAuditEnabled(bool)",
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
      }
    ],
    "outputs": []
  },
  {
    "key": "WhisperBlockFacet.setOffchainEntropy",
    "facetName": "WhisperBlockFacet",
    "wrapperKey": "setOffchainEntropy",
    "domain": "whisperblock",
    "resource": "whisperblocks",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/whisperblock/commands/set-offchain-entropy",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "body",
          "field": "voiceHash"
        },
        {
          "name": "offchainSeed",
          "source": "body",
          "field": "offchainSeed"
        },
        {
          "name": "walletAddress",
          "source": "body",
          "field": "walletAddress"
        },
        {
          "name": "blockHash",
          "source": "body",
          "field": "blockHash"
        },
        {
          "name": "signature",
          "source": "body",
          "field": "signature"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setOffchainEntropy",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "WhisperBlockFacet.setOffchainEntropy",
    "methodName": "setOffchainEntropy",
    "signature": "setOffchainEntropy(bytes32,bytes32,address,bytes32,bytes)",
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
        "name": "offchainSeed",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "walletAddress",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "blockHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "signature",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": []
  },
  {
    "key": "WhisperBlockFacet.setTrustedOracle",
    "facetName": "WhisperBlockFacet",
    "wrapperKey": "setTrustedOracle",
    "domain": "whisperblock",
    "resource": "whisperblocks",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/whisperblock/commands/set-trusted-oracle",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "oracle",
          "source": "body",
          "field": "oracle"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setTrustedOracle",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "WhisperBlockFacet.setTrustedOracle",
    "methodName": "setTrustedOracle",
    "signature": "setTrustedOracle(address)",
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
        "name": "oracle",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": []
  },
  {
    "key": "WhisperBlockFacet.updateSystemParameters",
    "facetName": "WhisperBlockFacet",
    "wrapperKey": "updateSystemParameters",
    "domain": "whisperblock",
    "resource": "whisperblocks",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/whisperblock/commands/update-system-parameters",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "newMinKeyStrength",
          "source": "body",
          "field": "newMinKeyStrength"
        },
        {
          "name": "newMinEntropy",
          "source": "body",
          "field": "newMinEntropy"
        },
        {
          "name": "newDefaultAccessDuration",
          "source": "body",
          "field": "newDefaultAccessDuration"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "updateSystemParameters",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "WhisperBlockFacet.updateSystemParameters",
    "methodName": "updateSystemParameters",
    "signature": "updateSystemParameters(uint256,uint256,uint256)",
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
        "name": "newMinKeyStrength",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "newMinEntropy",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "newDefaultAccessDuration",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "WhisperBlockFacet.verifyVoiceAuthenticity",
    "facetName": "WhisperBlockFacet",
    "wrapperKey": "verifyVoiceAuthenticity",
    "domain": "whisperblock",
    "resource": "whisperblocks",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/whisperblock/queries/verify-voice-authenticity",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "voiceHash",
          "source": "query",
          "field": "voiceHash"
        },
        {
          "name": "fingerprintData",
          "source": "query",
          "field": "fingerprintData"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "verifyVoiceAuthenticity",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "WhisperBlockFacet.verifyVoiceAuthenticity",
    "methodName": "verifyVoiceAuthenticity",
    "signature": "verifyVoiceAuthenticity(bytes32,bytes)",
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
        "name": "fingerprintData",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [
      {
        "name": "isValid",
        "type": "bool",
        "internalType": "bool"
      }
    ]
  },
  {
    "key": "WhisperBlockFacet.VOICE_OPERATOR_ROLE",
    "facetName": "WhisperBlockFacet",
    "wrapperKey": "VOICE_OPERATOR_ROLE",
    "domain": "whisperblock",
    "resource": "whisperblocks",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/whisperblock/queries/voice-operator-role",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "voiceOperatorRole",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "WhisperBlockFacet.VOICE_OPERATOR_ROLE",
    "methodName": "VOICE_OPERATOR_ROLE",
    "signature": "VOICE_OPERATOR_ROLE()",
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
  }
] as HttpMethodDefinition[];
export const whisperblockEventDefinitions: HttpEventDefinition[] = [
  {
    "key": "WhisperBlockFacet.AccessGranted",
    "facetName": "WhisperBlockFacet",
    "wrapperKey": "AccessGranted",
    "domain": "whisperblock",
    "operationId": "accessGrantedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/whisperblock/events/access-granted/query",
    "notes": "WhisperBlockFacet.AccessGranted",
    "eventName": "AccessGranted",
    "signature": "AccessGranted(bytes32,address,uint256)",
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
        "name": "expiryTime",
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
    "key": "WhisperBlockFacet.AccessRevoked",
    "facetName": "WhisperBlockFacet",
    "wrapperKey": "AccessRevoked",
    "domain": "whisperblock",
    "operationId": "accessRevokedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/whisperblock/events/access-revoked/query",
    "notes": "WhisperBlockFacet.AccessRevoked",
    "eventName": "AccessRevoked",
    "signature": "AccessRevoked(bytes32,address,uint256)",
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
    "key": "WhisperBlockFacet.AuditEvent",
    "facetName": "WhisperBlockFacet",
    "wrapperKey": "AuditEvent",
    "domain": "whisperblock",
    "operationId": "auditEventEventQuery",
    "httpMethod": "POST",
    "path": "/v1/whisperblock/events/audit-event/query",
    "notes": "WhisperBlockFacet.AuditEvent",
    "eventName": "AuditEvent",
    "signature": "AuditEvent(bytes32,string,bytes32)",
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
        "name": "eventType",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "eventHash",
        "type": "bytes32",
        "indexed": false,
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
    "key": "WhisperBlockFacet.KeyRotated",
    "facetName": "WhisperBlockFacet",
    "wrapperKey": "KeyRotated",
    "domain": "whisperblock",
    "operationId": "keyRotatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/whisperblock/events/key-rotated/query",
    "notes": "WhisperBlockFacet.KeyRotated",
    "eventName": "KeyRotated",
    "signature": "KeyRotated(bytes32,uint256,uint256)",
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
        "name": "version",
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
    "key": "WhisperBlockFacet.OffchainKeyGenerated",
    "facetName": "WhisperBlockFacet",
    "wrapperKey": "OffchainKeyGenerated",
    "domain": "whisperblock",
    "operationId": "offchainKeyGeneratedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/whisperblock/events/offchain-key-generated/query",
    "notes": "WhisperBlockFacet.OffchainKeyGenerated",
    "eventName": "OffchainKeyGenerated",
    "signature": "OffchainKeyGenerated(bytes32,bytes)",
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
        "name": "finalKey",
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
    "key": "WhisperBlockFacet.SecurityParametersUpdated",
    "facetName": "WhisperBlockFacet",
    "wrapperKey": "SecurityParametersUpdated",
    "domain": "whisperblock",
    "operationId": "securityParametersUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/whisperblock/events/security-parameters-updated/query",
    "notes": "WhisperBlockFacet.SecurityParametersUpdated",
    "eventName": "SecurityParametersUpdated",
    "signature": "SecurityParametersUpdated(bytes32,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "parameter",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
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
    "key": "WhisperBlockFacet.VoiceFingerprintUpdated",
    "facetName": "WhisperBlockFacet",
    "wrapperKey": "VoiceFingerprintUpdated",
    "domain": "whisperblock",
    "operationId": "voiceFingerprintUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/whisperblock/events/voice-fingerprint-updated/query",
    "notes": "WhisperBlockFacet.VoiceFingerprintUpdated",
    "eventName": "VoiceFingerprintUpdated",
    "signature": "VoiceFingerprintUpdated(bytes32,bytes32)",
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
        "name": "fingerprintHash",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      }
    ],
    "projection": {
      "domain": "rawOnly",
      "projectionMode": "rawOnly",
      "targets": []
    }
  }
] as HttpEventDefinition[];
