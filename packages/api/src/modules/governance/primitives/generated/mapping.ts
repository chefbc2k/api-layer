import type { HttpEventDefinition, HttpMethodDefinition } from "../../../../shared/route-types.js";

export const governanceMethodDefinitions: HttpMethodDefinition[] = [
  {
    "key": "GovernorFacet.getRoleMultiplier",
    "facetName": "GovernorFacet",
    "wrapperKey": "getRoleMultiplier",
    "domain": "governance",
    "resource": "governance",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/governance/queries/get-role-multiplier",
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
    "operationId": "getRoleMultiplier",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "GovernorFacet.getRoleMultiplier",
    "methodName": "getRoleMultiplier",
    "signature": "getRoleMultiplier(bytes32)",
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
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
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
    "key": "GovernorFacet.getVotingConfig",
    "facetName": "GovernorFacet",
    "wrapperKey": "getVotingConfig",
    "domain": "governance",
    "resource": "governance",
    "classification": "read",
    "httpMethod": "POST",
    "path": "/v1/governance/queries/get-voting-config",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "object"
    },
    "operationId": "getVotingConfig",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "GovernorFacet.getVotingConfig",
    "methodName": "getVotingConfig",
    "signature": "getVotingConfig()",
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
        "type": "tuple",
        "internalType": "struct IGovernor.VotingConfig",
        "components": [
          {
            "name": "votingDelay",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "votingPeriod",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "proposalThreshold",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "quorumNumerator",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ]
  },
  {
    "key": "GovernorFacet.GOVERNANCE_PROPOSER_ROLE",
    "facetName": "GovernorFacet",
    "wrapperKey": "GOVERNANCE_PROPOSER_ROLE",
    "domain": "governance",
    "resource": "governance",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/governance/queries/governance-proposer-role/governor-governance-proposer-role",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "governorGovernanceProposerRole",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "GovernorFacet.GOVERNANCE_PROPOSER_ROLE",
    "methodName": "GOVERNANCE_PROPOSER_ROLE",
    "signature": "GOVERNANCE_PROPOSER_ROLE()",
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
    "key": "GovernorFacet.setDefaultGasLimit",
    "facetName": "GovernorFacet",
    "wrapperKey": "setDefaultGasLimit",
    "domain": "governance",
    "resource": "governance",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/governance/commands/set-default-gas-limit",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "limit",
          "source": "body",
          "field": "limit"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setDefaultGasLimit",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "GovernorFacet.setDefaultGasLimit",
    "methodName": "setDefaultGasLimit",
    "signature": "setDefaultGasLimit(uint256)",
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
        "name": "limit",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "GovernorFacet.setTrustedTarget",
    "facetName": "GovernorFacet",
    "wrapperKey": "setTrustedTarget",
    "domain": "governance",
    "resource": "governance",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/governance/commands/set-trusted-target",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "target",
          "source": "body",
          "field": "target"
        },
        {
          "name": "trusted",
          "source": "body",
          "field": "trusted"
        },
        {
          "name": "gasLimit",
          "source": "body",
          "field": "gasLimit"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "setTrustedTarget",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "GovernorFacet.setTrustedTarget",
    "methodName": "setTrustedTarget",
    "signature": "setTrustedTarget(address,bool,uint256)",
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
        "name": "target",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "trusted",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "gasLimit",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "GovernorFacet.updateProposalThreshold",
    "facetName": "GovernorFacet",
    "wrapperKey": "updateProposalThreshold",
    "domain": "governance",
    "resource": "governance",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/governance/commands/update-proposal-threshold",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "newProposalThreshold",
          "source": "body",
          "field": "newProposalThreshold"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "updateProposalThreshold",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "GovernorFacet.updateProposalThreshold",
    "methodName": "updateProposalThreshold",
    "signature": "updateProposalThreshold(uint256)",
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
        "name": "newProposalThreshold",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "GovernorFacet.updateQuorumNumerator",
    "facetName": "GovernorFacet",
    "wrapperKey": "updateQuorumNumerator",
    "domain": "governance",
    "resource": "governance",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/governance/commands/update-quorum-numerator",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "newQuorumNumerator",
          "source": "body",
          "field": "newQuorumNumerator"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "updateQuorumNumerator",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "GovernorFacet.updateQuorumNumerator",
    "methodName": "updateQuorumNumerator",
    "signature": "updateQuorumNumerator(uint256)",
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
        "name": "newQuorumNumerator",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "GovernorFacet.updateVotingDelay",
    "facetName": "GovernorFacet",
    "wrapperKey": "updateVotingDelay",
    "domain": "governance",
    "resource": "governance",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/governance/commands/update-voting-delay",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "newVotingDelay",
          "source": "body",
          "field": "newVotingDelay"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "updateVotingDelay",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "GovernorFacet.updateVotingDelay",
    "methodName": "updateVotingDelay",
    "signature": "updateVotingDelay(uint256)",
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
        "name": "newVotingDelay",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "GovernorFacet.updateVotingPeriod",
    "facetName": "GovernorFacet",
    "wrapperKey": "updateVotingPeriod",
    "domain": "governance",
    "resource": "governance",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/governance/commands/update-voting-period",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "newVotingPeriod",
          "source": "body",
          "field": "newVotingPeriod"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "updateVotingPeriod",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "GovernorFacet.updateVotingPeriod",
    "methodName": "updateVotingPeriod",
    "signature": "updateVotingPeriod(uint256)",
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
        "name": "newVotingPeriod",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "ProposalFacet.cancel",
    "facetName": "ProposalFacet",
    "wrapperKey": "cancel",
    "domain": "governance",
    "resource": "proposals",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/governance/queries/cancel",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "proposalId",
          "source": "query",
          "field": "proposalId"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "proposalCancel",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "ProposalFacet.cancel",
    "methodName": "cancel",
    "signature": "cancel(uint256)",
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
        "name": "proposalId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "ProposalFacet.cancelProposal",
    "facetName": "ProposalFacet",
    "wrapperKey": "cancelProposal",
    "domain": "governance",
    "resource": "proposals",
    "classification": "delete",
    "httpMethod": "DELETE",
    "path": "/v1/governance/commands/cancel-proposal",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "proposalId",
          "source": "body",
          "field": "proposalId"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "cancelProposal",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "ProposalFacet.cancelProposal",
    "methodName": "cancelProposal",
    "signature": "cancelProposal(uint256)",
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
        "name": "proposalId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "ProposalFacet.execute",
    "facetName": "ProposalFacet",
    "wrapperKey": "execute",
    "domain": "governance",
    "resource": "proposals",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/governance/queries/execute",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "proposalId",
          "source": "query",
          "field": "proposalId"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "proposalExecute",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "ProposalFacet.execute",
    "methodName": "execute",
    "signature": "execute(uint256)",
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
        "name": "proposalId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "ProposalFacet.EXECUTOR_ROLE",
    "facetName": "ProposalFacet",
    "wrapperKey": "EXECUTOR_ROLE",
    "domain": "governance",
    "resource": "proposals",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/governance/queries/executor-role/proposal-executor-role",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "proposalExecutorRole",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "ProposalFacet.EXECUTOR_ROLE",
    "methodName": "EXECUTOR_ROLE",
    "signature": "EXECUTOR_ROLE()",
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
    "key": "ProposalFacet.getActiveProposals",
    "facetName": "ProposalFacet",
    "wrapperKey": "getActiveProposals",
    "domain": "governance",
    "resource": "proposals",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/governance/queries/get-active-proposals",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "array"
    },
    "operationId": "getActiveProposals",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "ProposalFacet.getActiveProposals",
    "methodName": "getActiveProposals",
    "signature": "getActiveProposals()",
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
        "name": "",
        "type": "tuple[]",
        "internalType": "struct SharedStructs.Proposal[]",
        "components": [
          {
            "name": "id",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "proposer",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "targets",
            "type": "address[]",
            "internalType": "address[]"
          },
          {
            "name": "values",
            "type": "uint256[]",
            "internalType": "uint256[]"
          },
          {
            "name": "calldatas",
            "type": "bytes[]",
            "internalType": "bytes[]"
          },
          {
            "name": "description",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "startBlock",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "endBlock",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "forVotes",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "againstVotes",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "abstainVotes",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "executed",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "canceled",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "proposalType",
            "type": "uint8",
            "internalType": "enum SharedEnums.ProposalType"
          },
          {
            "name": "queueTime",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "queueBlock",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "executionDelay",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "executedActions",
            "type": "uint256[]",
            "internalType": "uint256[]"
          },
          {
            "name": "bond",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ]
  },
  {
    "key": "ProposalFacet.getProposalTypeConfig",
    "facetName": "ProposalFacet",
    "wrapperKey": "getProposalTypeConfig",
    "domain": "governance",
    "resource": "proposals",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/governance/queries/get-proposal-type-config",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "proposalType",
          "source": "query",
          "field": "proposalType"
        }
      ]
    },
    "outputShape": {
      "kind": "object"
    },
    "operationId": "getProposalTypeConfig",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "ProposalFacet.getProposalTypeConfig",
    "methodName": "getProposalTypeConfig",
    "signature": "getProposalTypeConfig(uint8)",
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
        "name": "proposalType",
        "type": "uint8",
        "internalType": "enum SharedEnums.ProposalType"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct SharedStructs.ProposalTypeConfig",
        "components": [
          {
            "name": "threshold",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "quorum",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "votingDelay",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "votingPeriod",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "executionDelay",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ]
  },
  {
    "key": "ProposalFacet.getProposerProposals",
    "facetName": "ProposalFacet",
    "wrapperKey": "getProposerProposals",
    "domain": "governance",
    "resource": "proposals",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/governance/queries/get-proposer-proposals",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "proposer",
          "source": "query",
          "field": "proposer"
        }
      ]
    },
    "outputShape": {
      "kind": "array"
    },
    "operationId": "getProposerProposals",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "ProposalFacet.getProposerProposals",
    "methodName": "getProposerProposals",
    "signature": "getProposerProposals(address)",
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
        "name": "proposer",
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
    "key": "ProposalFacet.getReceipt",
    "facetName": "ProposalFacet",
    "wrapperKey": "getReceipt",
    "domain": "governance",
    "resource": "proposals",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/governance/queries/get-receipt",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "proposalId",
          "source": "query",
          "field": "proposalId"
        },
        {
          "name": "voter",
          "source": "query",
          "field": "voter"
        }
      ]
    },
    "outputShape": {
      "kind": "object"
    },
    "operationId": "getReceipt",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "ProposalFacet.getReceipt",
    "methodName": "getReceipt",
    "signature": "getReceipt(uint256,address)",
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
        "name": "proposalId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "voter",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct IProposal.Receipt",
        "components": [
          {
            "name": "hasVoted",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "support",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "reason",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "votes",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ]
  },
  {
    "key": "ProposalFacet.GOVERNANCE_PROPOSER_ROLE",
    "facetName": "ProposalFacet",
    "wrapperKey": "GOVERNANCE_PROPOSER_ROLE",
    "domain": "governance",
    "resource": "proposals",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/governance/queries/governance-proposer-role/proposal-governance-proposer-role",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "proposalGovernanceProposerRole",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "ProposalFacet.GOVERNANCE_PROPOSER_ROLE",
    "methodName": "GOVERNANCE_PROPOSER_ROLE",
    "signature": "GOVERNANCE_PROPOSER_ROLE()",
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
    "key": "ProposalFacet.prCastVote",
    "facetName": "ProposalFacet",
    "wrapperKey": "prCastVote",
    "domain": "governance",
    "resource": "proposals",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/governance/commands/pr-cast-vote",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "proposalId",
          "source": "body",
          "field": "proposalId"
        },
        {
          "name": "support",
          "source": "body",
          "field": "support"
        },
        {
          "name": "reason",
          "source": "body",
          "field": "reason"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "prCastVote",
    "rateLimitKind": "write",
    "supportsGasless": true,
    "notes": "ProposalFacet.prCastVote",
    "methodName": "prCastVote",
    "signature": "prCastVote(uint256,uint8,string)",
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
        "name": "proposalId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "support",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "reason",
        "type": "string",
        "internalType": "string"
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
    "key": "ProposalFacet.prExecute",
    "facetName": "ProposalFacet",
    "wrapperKey": "prExecute",
    "domain": "governance",
    "resource": "proposals",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/governance/commands/pr-execute",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "proposalId",
          "source": "body",
          "field": "proposalId"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "prExecute",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "ProposalFacet.prExecute",
    "methodName": "prExecute",
    "signature": "prExecute(uint256)",
    "category": "write",
    "mutability": "payable",
    "liveRequired": false,
    "cacheClass": "none",
    "cacheTtlSeconds": null,
    "executionSources": [
      "live"
    ],
    "gaslessModes": [],
    "inputs": [
      {
        "name": "proposalId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "ProposalFacet.proposalDeadline",
    "facetName": "ProposalFacet",
    "wrapperKey": "proposalDeadline",
    "domain": "governance",
    "resource": "proposals",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/governance/queries/proposal-deadline",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "proposalId",
          "source": "query",
          "field": "proposalId"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "proposalDeadline",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "ProposalFacet.proposalDeadline",
    "methodName": "proposalDeadline",
    "signature": "proposalDeadline(uint256)",
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
        "name": "proposalId",
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
    "key": "ProposalFacet.proposalExists",
    "facetName": "ProposalFacet",
    "wrapperKey": "proposalExists",
    "domain": "governance",
    "resource": "proposals",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/governance/queries/proposal-exists",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "proposalId",
          "source": "query",
          "field": "proposalId"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "proposalExists",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "ProposalFacet.proposalExists",
    "methodName": "proposalExists",
    "signature": "proposalExists(uint256)",
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
        "name": "proposalId",
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
    "key": "ProposalFacet.proposalSnapshot",
    "facetName": "ProposalFacet",
    "wrapperKey": "proposalSnapshot",
    "domain": "governance",
    "resource": "proposals",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/governance/queries/proposal-snapshot",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "proposalId",
          "source": "query",
          "field": "proposalId"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "proposalSnapshot",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "ProposalFacet.proposalSnapshot",
    "methodName": "proposalSnapshot",
    "signature": "proposalSnapshot(uint256)",
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
        "name": "proposalId",
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
    "key": "ProposalFacet.proposalVotes",
    "facetName": "ProposalFacet",
    "wrapperKey": "proposalVotes",
    "domain": "governance",
    "resource": "proposals",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/governance/queries/proposal-votes",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "proposalId",
          "source": "query",
          "field": "proposalId"
        }
      ]
    },
    "outputShape": {
      "kind": "object"
    },
    "operationId": "proposalVotes",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "ProposalFacet.proposalVotes",
    "methodName": "proposalVotes",
    "signature": "proposalVotes(uint256)",
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
        "name": "proposalId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct IProposal.ProposalVote",
        "components": [
          {
            "name": "againstVotes",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "forVotes",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "abstainVotes",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ]
  },
  {
    "key": "ProposalFacet.propose(address[],uint256[],bytes[],string,uint8)",
    "facetName": "ProposalFacet",
    "wrapperKey": "propose(address[],uint256[],bytes[],string,uint8)",
    "domain": "governance",
    "resource": "proposals",
    "classification": "create",
    "httpMethod": "POST",
    "path": "/v1/governance/proposals/propose-address-array-uint256-array-bytes-array-string-uint8",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "targets",
          "source": "body",
          "field": "targets"
        },
        {
          "name": "values",
          "source": "body",
          "field": "values"
        },
        {
          "name": "calldatas",
          "source": "body",
          "field": "calldatas"
        },
        {
          "name": "description",
          "source": "body",
          "field": "description"
        },
        {
          "name": "proposalType",
          "source": "body",
          "field": "proposalType"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "proposeAddressArrayUint256ArrayBytesArrayStringUint8",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "ProposalFacet.propose(address[],uint256[],bytes[],string,uint8)",
    "methodName": "propose",
    "signature": "propose(address[],uint256[],bytes[],string,uint8)",
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
        "name": "targets",
        "type": "address[]",
        "internalType": "address[]"
      },
      {
        "name": "values",
        "type": "uint256[]",
        "internalType": "uint256[]"
      },
      {
        "name": "calldatas",
        "type": "bytes[]",
        "internalType": "bytes[]"
      },
      {
        "name": "description",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "proposalType",
        "type": "uint8",
        "internalType": "enum SharedEnums.ProposalType"
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
    "key": "ProposalFacet.propose(string,string,address[],uint256[],bytes[],uint8)",
    "facetName": "ProposalFacet",
    "wrapperKey": "propose(string,string,address[],uint256[],bytes[],uint8)",
    "domain": "governance",
    "resource": "proposals",
    "classification": "create",
    "httpMethod": "POST",
    "path": "/v1/governance/proposals/propose-string-string-address-array-uint256-array-bytes-array-uint8",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "title",
          "source": "body",
          "field": "title"
        },
        {
          "name": "description",
          "source": "body",
          "field": "description"
        },
        {
          "name": "targets",
          "source": "body",
          "field": "targets"
        },
        {
          "name": "values",
          "source": "body",
          "field": "values"
        },
        {
          "name": "calldatas",
          "source": "body",
          "field": "calldatas"
        },
        {
          "name": "proposalType",
          "source": "body",
          "field": "proposalType"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "proposeStringStringAddressArrayUint256ArrayBytesArrayUint8",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "ProposalFacet.propose(string,string,address[],uint256[],bytes[],uint8)",
    "methodName": "propose",
    "signature": "propose(string,string,address[],uint256[],bytes[],uint8)",
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
        "name": "description",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "targets",
        "type": "address[]",
        "internalType": "address[]"
      },
      {
        "name": "values",
        "type": "uint256[]",
        "internalType": "uint256[]"
      },
      {
        "name": "calldatas",
        "type": "bytes[]",
        "internalType": "bytes[]"
      },
      {
        "name": "proposalType",
        "type": "uint8",
        "internalType": "enum SharedEnums.ProposalType"
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
    "key": "ProposalFacet.prQueue",
    "facetName": "ProposalFacet",
    "wrapperKey": "prQueue",
    "domain": "governance",
    "resource": "proposals",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/governance/commands/pr-queue",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "proposalId",
          "source": "body",
          "field": "proposalId"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "prQueue",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "ProposalFacet.prQueue",
    "methodName": "prQueue",
    "signature": "prQueue(uint256)",
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
        "name": "proposalId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "ProposalFacet.prState",
    "facetName": "ProposalFacet",
    "wrapperKey": "prState",
    "domain": "governance",
    "resource": "proposals",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/governance/queries/pr-state",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "proposalId",
          "source": "query",
          "field": "proposalId"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "prState",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "ProposalFacet.prState",
    "methodName": "prState",
    "signature": "prState(uint256)",
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
        "name": "proposalId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "enum IProposal.ProposalState"
      }
    ]
  },
  {
    "key": "ProposalFacet.queue",
    "facetName": "ProposalFacet",
    "wrapperKey": "queue",
    "domain": "governance",
    "resource": "proposals",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/governance/queries/queue",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "proposalId",
          "source": "query",
          "field": "proposalId"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "queue",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "ProposalFacet.queue",
    "methodName": "queue",
    "signature": "queue(uint256)",
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
        "name": "proposalId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "key": "ProposalFacet.setProposalTypeConfig",
    "facetName": "ProposalFacet",
    "wrapperKey": "setProposalTypeConfig",
    "domain": "governance",
    "resource": "proposals",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/governance/commands/set-proposal-type-config",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "proposalType",
          "source": "body",
          "field": "proposalType"
        },
        {
          "name": "threshold",
          "source": "body",
          "field": "threshold"
        },
        {
          "name": "quorum",
          "source": "body",
          "field": "quorum"
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
    "operationId": "setProposalTypeConfig",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "ProposalFacet.setProposalTypeConfig",
    "methodName": "setProposalTypeConfig",
    "signature": "setProposalTypeConfig(uint8,uint256,uint256,uint256)",
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
        "name": "proposalType",
        "type": "uint8",
        "internalType": "enum SharedEnums.ProposalType"
      },
      {
        "name": "threshold",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "quorum",
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
    "key": "ProposalFacet.state",
    "facetName": "ProposalFacet",
    "wrapperKey": "state",
    "domain": "governance",
    "resource": "proposals",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/governance/queries/state",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "proposalId",
          "source": "query",
          "field": "proposalId"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "state",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "ProposalFacet.state",
    "methodName": "state",
    "signature": "state(uint256)",
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
        "name": "proposalId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "enum IProposal.ProposalState"
      }
    ]
  },
  {
    "key": "ProposalFacet.TIMELOCK_ROLE",
    "facetName": "ProposalFacet",
    "wrapperKey": "TIMELOCK_ROLE",
    "domain": "governance",
    "resource": "proposals",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/governance/queries/timelock-role",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "timelockRole",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "ProposalFacet.TIMELOCK_ROLE",
    "methodName": "TIMELOCK_ROLE",
    "signature": "TIMELOCK_ROLE()",
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
    "key": "TimelockFacet.cancel",
    "facetName": "TimelockFacet",
    "wrapperKey": "cancel",
    "domain": "governance",
    "resource": "timelock-operations",
    "classification": "delete",
    "httpMethod": "DELETE",
    "path": "/v1/governance/commands/cancel",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "proposalId",
          "source": "body",
          "field": "proposalId"
        },
        {
          "name": "targets",
          "source": "body",
          "field": "targets"
        },
        {
          "name": "values",
          "source": "body",
          "field": "values"
        },
        {
          "name": "calldatas",
          "source": "body",
          "field": "calldatas"
        },
        {
          "name": "predecessor",
          "source": "body",
          "field": "predecessor"
        },
        {
          "name": "salt",
          "source": "body",
          "field": "salt"
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
    "operationId": "timelockCancel",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "TimelockFacet.cancel",
    "methodName": "cancel",
    "signature": "cancel(uint256,address[],uint256[],bytes[],bytes32,bytes32,uint256)",
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
        "name": "proposalId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "targets",
        "type": "address[]",
        "internalType": "address[]"
      },
      {
        "name": "values",
        "type": "uint256[]",
        "internalType": "uint256[]"
      },
      {
        "name": "calldatas",
        "type": "bytes[]",
        "internalType": "bytes[]"
      },
      {
        "name": "predecessor",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "salt",
        "type": "bytes32",
        "internalType": "bytes32"
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
    "key": "TimelockFacet.execute",
    "facetName": "TimelockFacet",
    "wrapperKey": "execute",
    "domain": "governance",
    "resource": "timelock-operations",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/governance/commands/execute",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "proposalId",
          "source": "body",
          "field": "proposalId"
        },
        {
          "name": "targets",
          "source": "body",
          "field": "targets"
        },
        {
          "name": "values",
          "source": "body",
          "field": "values"
        },
        {
          "name": "calldatas",
          "source": "body",
          "field": "calldatas"
        },
        {
          "name": "predecessor",
          "source": "body",
          "field": "predecessor"
        },
        {
          "name": "salt",
          "source": "body",
          "field": "salt"
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
    "operationId": "timelockExecute",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "TimelockFacet.execute",
    "methodName": "execute",
    "signature": "execute(uint256,address[],uint256[],bytes[],bytes32,bytes32,uint256)",
    "category": "write",
    "mutability": "payable",
    "liveRequired": false,
    "cacheClass": "none",
    "cacheTtlSeconds": null,
    "executionSources": [
      "live"
    ],
    "gaslessModes": [],
    "inputs": [
      {
        "name": "proposalId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "targets",
        "type": "address[]",
        "internalType": "address[]"
      },
      {
        "name": "values",
        "type": "uint256[]",
        "internalType": "uint256[]"
      },
      {
        "name": "calldatas",
        "type": "bytes[]",
        "internalType": "bytes[]"
      },
      {
        "name": "predecessor",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "salt",
        "type": "bytes32",
        "internalType": "bytes32"
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
    "key": "TimelockFacet.EXECUTOR_ROLE",
    "facetName": "TimelockFacet",
    "wrapperKey": "EXECUTOR_ROLE",
    "domain": "governance",
    "resource": "timelock-operations",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/governance/queries/executor-role/timelock-executor-role",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "timelockExecutorRole",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "TimelockFacet.EXECUTOR_ROLE",
    "methodName": "EXECUTOR_ROLE",
    "signature": "EXECUTOR_ROLE()",
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
    "key": "TimelockFacet.getMinDelay",
    "facetName": "TimelockFacet",
    "wrapperKey": "getMinDelay",
    "domain": "governance",
    "resource": "timelock-operations",
    "classification": "read",
    "httpMethod": "POST",
    "path": "/v1/governance/queries/get-min-delay",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "getMinDelay",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "TimelockFacet.getMinDelay",
    "methodName": "getMinDelay",
    "signature": "getMinDelay()",
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
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "key": "TimelockFacet.getOperation",
    "facetName": "TimelockFacet",
    "wrapperKey": "getOperation",
    "domain": "governance",
    "resource": "timelock-operations",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/governance/queries/get-operation",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "id",
          "source": "query",
          "field": "id"
        }
      ]
    },
    "outputShape": {
      "kind": "object"
    },
    "operationId": "getOperation",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "TimelockFacet.getOperation",
    "methodName": "getOperation",
    "signature": "getOperation(bytes32)",
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
        "name": "id",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct ITimelock.Operation",
        "components": [
          {
            "name": "targets",
            "type": "address[]",
            "internalType": "address[]"
          },
          {
            "name": "values",
            "type": "uint256[]",
            "internalType": "uint256[]"
          },
          {
            "name": "calldatas",
            "type": "bytes[]",
            "internalType": "bytes[]"
          },
          {
            "name": "predecessor",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "salt",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "delay",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "timestamp",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "lastCheckBlock",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "executed",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "canceled",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      }
    ]
  },
  {
    "key": "TimelockFacet.getTimestamp",
    "facetName": "TimelockFacet",
    "wrapperKey": "getTimestamp",
    "domain": "governance",
    "resource": "timelock-operations",
    "classification": "read",
    "httpMethod": "GET",
    "path": "/v1/governance/queries/get-timestamp",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "id",
          "source": "query",
          "field": "id"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "getTimestamp",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "TimelockFacet.getTimestamp",
    "methodName": "getTimestamp",
    "signature": "getTimestamp(bytes32)",
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
        "name": "id",
        "type": "bytes32",
        "internalType": "bytes32"
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
    "key": "TimelockFacet.isOperationExecuted",
    "facetName": "TimelockFacet",
    "wrapperKey": "isOperationExecuted",
    "domain": "governance",
    "resource": "timelock-operations",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/governance/queries/is-operation-executed",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "id",
          "source": "query",
          "field": "id"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "isOperationExecuted",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "TimelockFacet.isOperationExecuted",
    "methodName": "isOperationExecuted",
    "signature": "isOperationExecuted(bytes32)",
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
        "name": "id",
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
    "key": "TimelockFacet.isOperationPending",
    "facetName": "TimelockFacet",
    "wrapperKey": "isOperationPending",
    "domain": "governance",
    "resource": "timelock-operations",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/governance/queries/is-operation-pending",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "id",
          "source": "query",
          "field": "id"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "isOperationPending",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "TimelockFacet.isOperationPending",
    "methodName": "isOperationPending",
    "signature": "isOperationPending(bytes32)",
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
        "name": "id",
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
    "key": "TimelockFacet.isOperationReady",
    "facetName": "TimelockFacet",
    "wrapperKey": "isOperationReady",
    "domain": "governance",
    "resource": "timelock-operations",
    "classification": "query",
    "httpMethod": "GET",
    "path": "/v1/governance/queries/is-operation-ready",
    "inputShape": {
      "kind": "query",
      "bindings": [
        {
          "name": "id",
          "source": "query",
          "field": "id"
        }
      ]
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "isOperationReady",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "TimelockFacet.isOperationReady",
    "methodName": "isOperationReady",
    "signature": "isOperationReady(bytes32)",
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
        "name": "id",
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
    "key": "TimelockFacet.PROPOSER_ROLE",
    "facetName": "TimelockFacet",
    "wrapperKey": "PROPOSER_ROLE",
    "domain": "governance",
    "resource": "timelock-operations",
    "classification": "query",
    "httpMethod": "POST",
    "path": "/v1/governance/queries/proposer-role",
    "inputShape": {
      "kind": "none",
      "bindings": []
    },
    "outputShape": {
      "kind": "scalar"
    },
    "operationId": "proposerRole",
    "rateLimitKind": "read",
    "supportsGasless": false,
    "notes": "TimelockFacet.PROPOSER_ROLE",
    "methodName": "PROPOSER_ROLE",
    "signature": "PROPOSER_ROLE()",
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
    "key": "TimelockFacet.schedule",
    "facetName": "TimelockFacet",
    "wrapperKey": "schedule",
    "domain": "governance",
    "resource": "timelock-operations",
    "classification": "action",
    "httpMethod": "POST",
    "path": "/v1/governance/commands/schedule",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "proposalId",
          "source": "body",
          "field": "proposalId"
        },
        {
          "name": "targets",
          "source": "body",
          "field": "targets"
        },
        {
          "name": "values",
          "source": "body",
          "field": "values"
        },
        {
          "name": "calldatas",
          "source": "body",
          "field": "calldatas"
        },
        {
          "name": "predecessor",
          "source": "body",
          "field": "predecessor"
        },
        {
          "name": "salt",
          "source": "body",
          "field": "salt"
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
    "operationId": "schedule",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "TimelockFacet.schedule",
    "methodName": "schedule",
    "signature": "schedule(uint256,address[],uint256[],bytes[],bytes32,bytes32,uint256)",
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
        "name": "proposalId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "targets",
        "type": "address[]",
        "internalType": "address[]"
      },
      {
        "name": "values",
        "type": "uint256[]",
        "internalType": "uint256[]"
      },
      {
        "name": "calldatas",
        "type": "bytes[]",
        "internalType": "bytes[]"
      },
      {
        "name": "predecessor",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "salt",
        "type": "bytes32",
        "internalType": "bytes32"
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
    "key": "TimelockFacet.updateMinDelay",
    "facetName": "TimelockFacet",
    "wrapperKey": "updateMinDelay",
    "domain": "governance",
    "resource": "timelock-operations",
    "classification": "update",
    "httpMethod": "PATCH",
    "path": "/v1/governance/commands/update-min-delay",
    "inputShape": {
      "kind": "body",
      "bindings": [
        {
          "name": "newDelay",
          "source": "body",
          "field": "newDelay"
        }
      ]
    },
    "outputShape": {
      "kind": "void"
    },
    "operationId": "updateMinDelay",
    "rateLimitKind": "write",
    "supportsGasless": false,
    "notes": "TimelockFacet.updateMinDelay",
    "methodName": "updateMinDelay",
    "signature": "updateMinDelay(uint256)",
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
        "name": "newDelay",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": []
  }
] as HttpMethodDefinition[];
export const governanceEventDefinitions: HttpEventDefinition[] = [
  {
    "key": "GovernorFacet.TargetGasLimitUpdated",
    "facetName": "GovernorFacet",
    "wrapperKey": "TargetGasLimitUpdated",
    "domain": "governance",
    "operationId": "targetGasLimitUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/governance/events/target-gas-limit-updated/query",
    "notes": "GovernorFacet.TargetGasLimitUpdated",
    "eventName": "TargetGasLimitUpdated",
    "signature": "TargetGasLimitUpdated(address,uint256)",
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
        "name": "gasLimit",
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
    "key": "GovernorFacet.TrustedTargetUpdated",
    "facetName": "GovernorFacet",
    "wrapperKey": "TrustedTargetUpdated",
    "domain": "governance",
    "operationId": "trustedTargetUpdatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/governance/events/trusted-target-updated/query",
    "notes": "GovernorFacet.TrustedTargetUpdated",
    "eventName": "TrustedTargetUpdated",
    "signature": "TrustedTargetUpdated(address,bool,uint256,address)",
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
        "name": "trusted",
        "type": "bool",
        "indexed": true,
        "internalType": "bool"
      },
      {
        "name": "maxGas",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "manager",
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
    "key": "ProposalFacet.ProposalCanceled",
    "facetName": "ProposalFacet",
    "wrapperKey": "ProposalCanceled",
    "domain": "governance",
    "operationId": "proposalCanceledEventQuery",
    "httpMethod": "POST",
    "path": "/v1/governance/events/proposal-canceled/query",
    "notes": "ProposalFacet.ProposalCanceled",
    "eventName": "ProposalCanceled",
    "signature": "ProposalCanceled(uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "proposalId",
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
          "table": "governance_proposals",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "ProposalFacet.ProposalCreated",
    "facetName": "ProposalFacet",
    "wrapperKey": "ProposalCreated",
    "domain": "governance",
    "operationId": "proposalCreatedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/governance/events/proposal-created/query",
    "notes": "ProposalFacet.ProposalCreated",
    "eventName": "ProposalCreated",
    "signature": "ProposalCreated(uint256,address,address[],uint256[],bytes[],string,uint256,uint256,uint8)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "proposalId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "proposer",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "targets",
        "type": "address[]",
        "indexed": false,
        "internalType": "address[]"
      },
      {
        "name": "values",
        "type": "uint256[]",
        "indexed": false,
        "internalType": "uint256[]"
      },
      {
        "name": "calldatas",
        "type": "bytes[]",
        "indexed": false,
        "internalType": "bytes[]"
      },
      {
        "name": "description",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "startBlock",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "endBlock",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "proposalType",
        "type": "uint8",
        "indexed": false,
        "internalType": "enum SharedEnums.ProposalType"
      }
    ],
    "projection": {
      "domain": "governance",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "governance_proposals",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "ProposalFacet.ProposalExecuted",
    "facetName": "ProposalFacet",
    "wrapperKey": "ProposalExecuted",
    "domain": "governance",
    "operationId": "proposalExecutedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/governance/events/proposal-executed/query",
    "notes": "ProposalFacet.ProposalExecuted",
    "eventName": "ProposalExecuted",
    "signature": "ProposalExecuted(uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "proposalId",
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
          "table": "governance_proposals",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "ProposalFacet.ProposalQueued",
    "facetName": "ProposalFacet",
    "wrapperKey": "ProposalQueued",
    "domain": "governance",
    "operationId": "proposalQueuedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/governance/events/proposal-queued/query",
    "notes": "ProposalFacet.ProposalQueued",
    "eventName": "ProposalQueued",
    "signature": "ProposalQueued(uint256,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "proposalId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "eta",
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
          "table": "governance_proposals",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "ProposalFacet.ProposalTypeConfigSet",
    "facetName": "ProposalFacet",
    "wrapperKey": "ProposalTypeConfigSet",
    "domain": "governance",
    "operationId": "proposalTypeConfigSetEventQuery",
    "httpMethod": "POST",
    "path": "/v1/governance/events/proposal-type-config-set/query",
    "notes": "ProposalFacet.ProposalTypeConfigSet",
    "eventName": "ProposalTypeConfigSet",
    "signature": "ProposalTypeConfigSet(uint8,uint256,uint256,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "proposalType",
        "type": "uint8",
        "indexed": true,
        "internalType": "enum SharedEnums.ProposalType"
      },
      {
        "name": "threshold",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "quorum",
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
      "domain": "governance",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "governance_proposals",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "ProposalFacet.VoteCast",
    "facetName": "ProposalFacet",
    "wrapperKey": "VoteCast",
    "domain": "governance",
    "operationId": "voteCastEventQuery",
    "httpMethod": "POST",
    "path": "/v1/governance/events/vote-cast/query",
    "notes": "ProposalFacet.VoteCast",
    "eventName": "VoteCast",
    "signature": "VoteCast(address,uint256,uint8,string)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "voter",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "proposalId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "support",
        "type": "uint8",
        "indexed": true,
        "internalType": "uint8"
      },
      {
        "name": "reason",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      }
    ],
    "projection": {
      "domain": "governance",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "governance_votes",
          "mode": "ledger"
        },
        {
          "table": "governance_proposals",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "TimelockFacet.CallExecuted",
    "facetName": "TimelockFacet",
    "wrapperKey": "CallExecuted",
    "domain": "governance",
    "operationId": "callExecutedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/governance/events/call-executed/query",
    "notes": "TimelockFacet.CallExecuted",
    "eventName": "CallExecuted",
    "signature": "CallExecuted(address,uint256,bytes,bool)",
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
        "name": "value",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "data",
        "type": "bytes",
        "indexed": false,
        "internalType": "bytes"
      },
      {
        "name": "success",
        "type": "bool",
        "indexed": true,
        "internalType": "bool"
      }
    ],
    "projection": {
      "domain": "timelock",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "timelock_operations",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "TimelockFacet.MinDelayUpdated(uint256,uint256)",
    "facetName": "TimelockFacet",
    "wrapperKey": "MinDelayUpdated(uint256,uint256)",
    "domain": "governance",
    "operationId": "minDelayUpdatedUint256Uint256EventQuery",
    "httpMethod": "POST",
    "path": "/v1/governance/events/min-delay-updated/query",
    "notes": "TimelockFacet.MinDelayUpdated(uint256,uint256)",
    "eventName": "MinDelayUpdated",
    "signature": "MinDelayUpdated(uint256,uint256)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "oldDelay",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "newDelay",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "timelock",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "timelock_operations",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "TimelockFacet.OperationExecuted(bytes32,uint256,uint256)",
    "facetName": "TimelockFacet",
    "wrapperKey": "OperationExecuted(bytes32,uint256,uint256)",
    "domain": "governance",
    "operationId": "operationExecutedBytes32Uint256Uint256EventQuery",
    "httpMethod": "POST",
    "path": "/v1/governance/events/operation-executed/query/timelock",
    "notes": "TimelockFacet.OperationExecuted(bytes32,uint256,uint256)",
    "eventName": "OperationExecuted",
    "signature": "OperationExecuted(bytes32,uint256,uint256)",
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
        "name": "proposalId",
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
      "domain": "timelock",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "timelock_operations",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "TimelockFacet.OperationExecuted(bytes32)",
    "facetName": "TimelockFacet",
    "wrapperKey": "OperationExecuted(bytes32)",
    "domain": "governance",
    "operationId": "operationExecutedBytes32EventQuery",
    "httpMethod": "POST",
    "path": "/v1/governance/events/operation-executed/query/timelock",
    "notes": "TimelockFacet.OperationExecuted(bytes32)",
    "eventName": "OperationExecuted",
    "signature": "OperationExecuted(bytes32)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "id",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      }
    ],
    "projection": {
      "domain": "timelock",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "timelock_operations",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "TimelockFacet.OperationRemoved",
    "facetName": "TimelockFacet",
    "wrapperKey": "OperationRemoved",
    "domain": "governance",
    "operationId": "operationRemovedEventQuery",
    "httpMethod": "POST",
    "path": "/v1/governance/events/operation-removed/query",
    "notes": "TimelockFacet.OperationRemoved",
    "eventName": "OperationRemoved",
    "signature": "OperationRemoved(bytes32)",
    "topicHash": null,
    "anonymous": false,
    "inputs": [
      {
        "name": "id",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      }
    ],
    "projection": {
      "domain": "timelock",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "timelock_operations",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "TimelockFacet.OperationScheduled",
    "facetName": "TimelockFacet",
    "wrapperKey": "OperationScheduled",
    "domain": "governance",
    "operationId": "operationScheduledEventQuery",
    "httpMethod": "POST",
    "path": "/v1/governance/events/operation-scheduled/query",
    "notes": "TimelockFacet.OperationScheduled",
    "eventName": "OperationScheduled",
    "signature": "OperationScheduled(bytes32,uint256,uint256,uint256)",
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
        "name": "proposalId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": true,
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
      "domain": "timelock",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "timelock_operations",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "TimelockFacet.OperationStored",
    "facetName": "TimelockFacet",
    "wrapperKey": "OperationStored",
    "domain": "governance",
    "operationId": "operationStoredEventQuery",
    "httpMethod": "POST",
    "path": "/v1/governance/events/operation-stored/query",
    "notes": "TimelockFacet.OperationStored",
    "eventName": "OperationStored",
    "signature": "OperationStored(bytes32,uint256,uint256)",
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
        "name": "proposalId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "executionTime",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "projection": {
      "domain": "timelock",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "timelock_operations",
          "mode": "current"
        }
      ]
    }
  },
  {
    "key": "TimelockFacet.TimelockOperationCanceled",
    "facetName": "TimelockFacet",
    "wrapperKey": "TimelockOperationCanceled",
    "domain": "governance",
    "operationId": "timelockOperationCanceledEventQuery",
    "httpMethod": "POST",
    "path": "/v1/governance/events/timelock-operation-canceled/query",
    "notes": "TimelockFacet.TimelockOperationCanceled",
    "eventName": "TimelockOperationCanceled",
    "signature": "TimelockOperationCanceled(bytes32,uint256,uint256)",
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
        "name": "proposalId",
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
      "domain": "timelock",
      "projectionMode": "mixed",
      "targets": [
        {
          "table": "timelock_operations",
          "mode": "current"
        }
      ]
    }
  }
] as HttpEventDefinition[];
