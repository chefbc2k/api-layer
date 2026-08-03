import path from "node:path";

import { describe, expect, it } from "vitest";

import { buildWireSchema } from "../packages/api/src/shared/validation.js";
import type { HttpMethodDefinition } from "../packages/api/src/shared/route-types.js";
import { validateWireParams } from "../packages/client/src/runtime/abi-codec.js";
import {
  ReplayLedger,
  buildWireMutations,
  inspectActorBinding,
  inspectDiamondCut,
  inspectEmergencyAction,
  inspectMultisig,
  inspectRpcSnapshots,
  inspectStateTransition,
  inspectTimelock,
  inspectValueConservation,
  replayFingerprint,
  redTeamHarnessInternals,
  sampleWireValue,
} from "./red-team-harness-lib.js";
import { generatedManifestDir, readJson } from "./utils.js";

type HttpRegistry = {
  methods: Record<string, HttpMethodDefinition>;
};

describe("red-team malformed payload mutation corpus", () => {
  it("accepts a deterministic valid corpus for every generated write endpoint", async () => {
    const registry = await readJson<HttpRegistry>(path.join(generatedManifestDir, "http-endpoint-registry.json"));
    const writes = Object.values(registry.methods).filter((definition) =>
      definition.mutability !== "view" && definition.mutability !== "pure",
    );

    expect(writes.length).toBeGreaterThan(250);
    for (const [methodIndex, definition] of writes.entries()) {
      const params = definition.inputs.map((input, inputIndex) => sampleWireValue(input, methodIndex + inputIndex + 1));
      expect(() => validateWireParams(definition, params), definition.key).not.toThrow();
      definition.inputs.forEach((input, inputIndex) => {
        expect(
          buildWireSchema(definition, input, [input.name || `arg${inputIndex}`]).safeParse(params[inputIndex]).success,
          `${definition.key} input ${inputIndex}`,
        ).toBe(true);
      });
    }
  });

  it("rejects type, range, length, tuple, address, and calldata mutations across the write inventory", async () => {
    const registry = await readJson<HttpRegistry>(path.join(generatedManifestDir, "http-endpoint-registry.json"));
    const writes = Object.values(registry.methods).filter((definition) =>
      definition.mutability !== "view" && definition.mutability !== "pure",
    );
    let mutationCount = 0;
    const mutationNames = new Set<string>();

    for (const [methodIndex, definition] of writes.entries()) {
      const validParams = definition.inputs.map((input, inputIndex) => sampleWireValue(input, methodIndex + inputIndex + 1));
      for (const [inputIndex, input] of definition.inputs.entries()) {
        for (const mutation of buildWireMutations(input, methodIndex + inputIndex + 1)) {
          mutationCount += 1;
          mutationNames.add(mutation.name);
          const mutatedParams = [...validParams];
          mutatedParams[inputIndex] = mutation.value;
          expect(
            () => validateWireParams(definition, mutatedParams),
            `${definition.key} input ${inputIndex} mutation ${mutation.name}`,
          ).toThrow();
          expect(
            buildWireSchema(definition, input, [input.name || `arg${inputIndex}`]).safeParse(mutation.value).success,
            `${definition.key} API schema input ${inputIndex} mutation ${mutation.name}`,
          ).toBe(false);
        }
      }
    }

    expect(mutationCount).toBeGreaterThan(1_900);
    expect([...mutationNames]).toEqual(expect.arrayContaining([
      "fractional-integer",
      "integer-overflow",
      "short-address",
      "string-boolean",
      "odd-length-calldata",
      "short-fixed-bytes",
      "null-tuple",
      "non-array",
    ]));
  });
});

describe("red-team replay, value, ordering, and signer oracles", () => {
  const baseReplay = {
    chainId: 84532,
    contract: "0x00000000000000000000000000000000000000aa",
    actor: "0x00000000000000000000000000000000000000bb",
    selector: "0x12345678",
    nonce: "7",
    deadline: "1900000000",
    payload: { tokenId: "12", price: "500" },
  };

  it("rejects an exact replay while domain-separating nonce, actor, deadline, and chain", () => {
    const ledger = new ReplayLedger();
    const fingerprint = replayFingerprint(baseReplay);

    expect(ledger.consume(fingerprint)).toBe(true);
    expect(ledger.consume(fingerprint)).toBe(false);
    expect(replayFingerprint({ ...baseReplay, nonce: "8" })).not.toBe(fingerprint);
    expect(replayFingerprint({ ...baseReplay, deadline: "1900000001" })).not.toBe(fingerprint);
    expect(replayFingerprint({ ...baseReplay, chainId: 1 })).not.toBe(fingerprint);
    expect(replayFingerprint({ ...baseReplay, actor: "0x00000000000000000000000000000000000000cc" })).not.toBe(fingerprint);
    expect(replayFingerprint({ ...baseReplay, payload: { price: "500", tokenId: "12" } })).toBe(fingerprint);
  });

  it("detects double-spend balance creation and accepts explicit mint/burn accounting", () => {
    expect(inspectValueConservation({
      before: { buyer: 100n, seller: 0n, treasury: 0n },
      after: { buyer: 20n, seller: 70n, treasury: 10n },
    })).toEqual([]);

    expect(inspectValueConservation({
      before: { buyer: 100n, seller: 0n },
      after: { buyer: 20n, seller: 100n },
    })[0]?.id).toBe("value-conservation");

    expect(inspectValueConservation({
      before: { supply: 100n },
      after: { supply: 120n },
      allowedMint: 20n,
    })).toEqual([]);
  });

  it("flags illegal state-machine ordering and signer/wallet confused-deputy mismatches", () => {
    const allowed = {
      listed: ["purchased", "cancelled"],
      purchased: ["settled"],
      cancelled: [],
      settled: [],
    } as const;

    expect(inspectStateTransition({ from: "listed", to: "purchased", allowed })).toEqual([]);
    expect(inspectStateTransition({ from: "settled", to: "listed", allowed })[0]?.id).toBe("state-machine-ordering");
    expect(inspectActorBinding({
      apiKey: "buyer-key",
      signerId: "buyer",
      signerAddress: "0x00000000000000000000000000000000000000bb",
      claimedWallet: "0x00000000000000000000000000000000000000cc",
    })[0]?.id).toBe("confused-deputy-wallet-mismatch");
    expect(inspectActorBinding({ apiKey: "anonymous-write" })[0]?.id).toBe("signer-missing");
    expect(inspectActorBinding({
      apiKey: "buyer-key",
      signerId: "buyer",
      signerAddress: "0x00000000000000000000000000000000000000bb",
      claimedWallet: "0x00000000000000000000000000000000000000BB",
    })).toEqual([]);
    expect(inspectStateTransition({ from: "unknown", to: "listed", allowed: allowed as never })[0]?.id)
      .toBe("state-machine-ordering");
  });

  it("covers scalar, tuple, array, and canonicalization mutation edge cases", () => {
    expect(sampleWireValue({ type: "int8" }, 1)).toBe("-127");
    expect(sampleWireValue({ type: "int8" }, 2)).toBe("3");
    expect(sampleWireValue({ type: "function" })).toBe(`0x${"ab".repeat(24)}`);
    expect(sampleWireValue({ type: "opaque" })).toBe("red-team-opaque-1");
    expect(sampleWireValue({ type: "tuple" })).toEqual({});
    expect(sampleWireValue({ type: "tuple", components: [{ type: "bool" }] })).toEqual({ 0: true });
    expect(sampleWireValue({ type: "tuple", components: [{ name: "flag", type: "bool" }] })).toEqual({ flag: true });
    expect(sampleWireValue({ type: "uint8[1][2]" })).toEqual([["4", "5"]]);
    expect(sampleWireValue({ type: "uint8[1][]" })).toEqual([["4", "5"]]);

    expect(buildWireMutations({ type: "function" }).map((mutation) => mutation.name)).toEqual([
      "short-function-pointer",
      "long-function-pointer",
    ]);
    expect(buildWireMutations({ type: "opaque" })).toEqual([]);
    expect(buildWireMutations({ type: "tuple" })).toHaveLength(3);
    expect(buildWireMutations({ type: "tuple", components: [{ type: "bool" }, { type: "bool" }] })[1]?.value)
      .toEqual({ 0: false });
    expect(buildWireMutations({ type: "opaque[]" }).map((mutation) => mutation.name)).toEqual([
      "non-array",
      "null-array",
    ]);
    expect(buildWireMutations({ type: "address[0]" }).map((mutation) => mutation.name)).toEqual([
      "non-array",
      "null-array",
      "short-fixed-array",
      "long-fixed-array",
    ]);
    expect(buildWireMutations({ type: "address[1][1]" }).map((mutation) => mutation.name)).toContain("nested-non-array");
    expect(buildWireMutations({ type: "address[1][]" }).map((mutation) => mutation.name)).toContain("nested-non-array");

    expect(redTeamHarnessInternals.canonicalize({ z: 1n, a: [2n, null] })).toEqual({ a: ["2", null], z: "1" });
    expect(redTeamHarnessInternals.integerBounds("uint8")).toEqual({ minimum: 0n, maximum: 255n });
    expect(redTeamHarnessInternals.integerBounds("int")).toEqual({
      minimum: -(1n << 255n),
      maximum: (1n << 255n) - 1n,
    });
    expect(() => redTeamHarnessInternals.integerBounds("address")).toThrow("not an integer ABI type");
    expect(redTeamHarnessInternals.parseArrayType("bytes32[][2]")).toEqual({
      baseType: "bytes32",
      lengths: [null, 2],
    });
    expect(() => redTeamHarnessInternals.parseArrayType("uint]")).toThrow("invalid ABI array type uint]");
    expect(inspectActorBinding({
      apiKey: "unbound-key",
      signerAddress: "0x00000000000000000000000000000000000000aa",
      claimedWallet: "0x00000000000000000000000000000000000000bb",
    })).toHaveLength(2);
  });
});

describe("red-team RPC and protocol-admin oracles", () => {
  it("detects stale heads, same-height forks, and inconsistent state reads", () => {
    expect(inspectRpcSnapshots({
      primary: { blockNumber: 100, blockHash: "0xaaa", valueHash: "0x111" },
      secondary: { blockNumber: 96, blockHash: "0xbbb", valueHash: "0x222" },
      maxBlockLag: 2,
    }).map((finding) => finding.id)).toContain("stale-rpc-head");

    expect(inspectRpcSnapshots({
      primary: { blockNumber: 100, blockHash: "0xaaa", valueHash: "0x111" },
      secondary: { blockNumber: 100, blockHash: "0xbbb", valueHash: "0x111" },
      maxBlockLag: 2,
    }).map((finding) => finding.id)).toContain("rpc-fork-disagreement");

    expect(inspectRpcSnapshots({
      primary: { blockNumber: 100, blockHash: "0xaaa", valueHash: "0x111" },
      secondary: { blockNumber: 100, blockHash: "0xaaa", valueHash: "0x222" },
      maxBlockLag: 2,
    }).map((finding) => finding.id)).toContain("rpc-state-disagreement");

    expect(inspectRpcSnapshots({
      primary: { blockNumber: 100, blockHash: "0xaaa", valueHash: "0x111" },
      secondary: { blockNumber: 99, blockHash: "0xbbb", valueHash: "0x222" },
      maxBlockLag: 2,
    })).toEqual([]);
  });

  it("detects selector collisions, duplicate selectors, and malicious init contracts", () => {
    const findings = inspectDiamondCut({
      facetCuts: [
        {
          facetAddress: "0x00000000000000000000000000000000000000aa",
          action: 0,
          functionSelectors: ["0x12345678", "0x12345678"],
        },
        {
          facetAddress: "0x00000000000000000000000000000000000000bb",
          action: 1,
          functionSelectors: ["0x87654321"],
        },
      ],
      mountedSelectors: new Set(["0x12345678"]),
      trustedInitContracts: new Set(),
      initContract: "0x00000000000000000000000000000000000000cc",
      initCalldata: "0x1234",
    });

    expect(findings.map((finding) => finding.id)).toEqual(expect.arrayContaining([
      "diamond-selector-collision",
      "diamond-selector-duplicate",
      "diamond-replace-missing-selector",
      "diamond-untrusted-init",
      "diamond-malformed-init-calldata",
    ]));

    expect(inspectDiamondCut({
      facetCuts: [],
      mountedSelectors: new Set(),
      trustedInitContracts: new Set(),
      initContract: "0x0000000000000000000000000000000000000000",
      initCalldata: "0x12345678",
    }).map((finding) => finding.id)).toEqual(["diamond-init-calldata-without-contract"]);

    expect(inspectDiamondCut({
      facetCuts: [],
      mountedSelectors: new Set(),
      trustedInitContracts: new Set(["0x00000000000000000000000000000000000000cc"]),
      initContract: "0x00000000000000000000000000000000000000CC",
      initCalldata: "0x12345678",
    })).toEqual([]);
  });

  it("detects timelock substitution/early execution and multisig threshold mistakes", () => {
    expect(inspectTimelock({
      scheduledAt: 100n,
      executeAfter: 105n,
      attemptedAt: 104n,
      minimumDelay: 10n,
      operationId: "0xaaa",
      expectedOperationId: "0xbbb",
    }).map((finding) => finding.id)).toEqual(expect.arrayContaining([
      "timelock-delay-bypass",
      "timelock-early-execution",
      "timelock-operation-substitution",
    ]));

    expect(inspectMultisig({
      operators: ["0xaaa", "0xbbb", "0xccc"],
      approvals: ["0xaaa", "0xaaa"],
      threshold: 2,
    }).map((finding) => finding.id)).toEqual(expect.arrayContaining([
      "multisig-duplicate-approval",
      "multisig-insufficient-unique-approvals",
    ]));

    expect(inspectMultisig({
      operators: ["0xaaa", "0xbbb"],
      approvals: ["0xaaa", "0xbbb"],
      threshold: 3,
    }).map((finding) => finding.id)).toContain("multisig-invalid-threshold");

    expect(inspectTimelock({
      scheduledAt: 100n,
      executeAfter: 110n,
      attemptedAt: 110n,
      minimumDelay: 10n,
      operationId: "0xaaa",
      expectedOperationId: "0xAAA",
    })).toEqual([]);
    expect(inspectMultisig({
      operators: ["0xaaa", "0xbbb"],
      approvals: ["0xAAA", "0xbbb"],
      threshold: 2,
    })).toEqual([]);
  });

  it("detects emergency state, approval, and timelock bypass attempts", () => {
    expect(inspectEmergencyAction({
      state: "NORMAL",
      action: "withdraw",
      approvals: 1,
      requiredApprovals: 2,
      timelockReady: false,
    }).map((finding) => finding.id)).toEqual(expect.arrayContaining([
      "emergency-normal-state-bypass",
      "emergency-approval-bypass",
      "emergency-timelock-bypass",
    ]));

    expect(inspectEmergencyAction({
      state: "PAUSED",
      action: "resume",
      approvals: 2,
      requiredApprovals: 2,
      timelockReady: true,
    })).toEqual([]);
    expect(inspectEmergencyAction({
      state: "NORMAL",
      action: "resume",
      approvals: 2,
      requiredApprovals: 2,
      timelockReady: true,
    }).map((finding) => finding.id)).toEqual(["emergency-resume-state-bypass"]);
    expect(inspectEmergencyAction({
      state: "NORMAL",
      action: "recover",
      approvals: 2,
      requiredApprovals: 2,
      timelockReady: true,
    }).map((finding) => finding.id)).toEqual(["emergency-normal-state-bypass"]);
  });
});
