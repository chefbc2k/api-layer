import { createHash } from "node:crypto";

import type { AbiParameter } from "../packages/client/src/runtime/abi-registry.js";

export type RedTeamSeverity = "critical" | "high" | "medium" | "low";

export type RedTeamFinding = {
  id: string;
  severity: RedTeamSeverity;
  message: string;
  evidence: Record<string, unknown>;
};

export type WireMutation = {
  name: string;
  value: unknown;
};

type ArrayShape = {
  baseType: string;
  lengths: Array<number | null>;
};

function parseArrayType(type: string): ArrayShape {
  const lengths: Array<number | null> = [];
  let current = type;
  while (current.endsWith("]")) {
    const match = current.match(/^(.*)\[(\d*)\]$/u);
    if (!match) {
      break;
    }
    current = match[1];
    lengths.unshift(match[2] === "" ? null : Number(match[2]));
  }
  return { baseType: current, lengths };
}

function integerBounds(type: string): { minimum: bigint; maximum: bigint } {
  const match = type.match(/^(u?int)(\d*)$/u);
  if (!match) {
    throw new Error(`not an integer ABI type: ${type}`);
  }
  const bits = Number(match[2] || "256");
  if (type.startsWith("uint")) {
    return { minimum: 0n, maximum: (1n << BigInt(bits)) - 1n };
  }
  return {
    minimum: -(1n << BigInt(bits - 1)),
    maximum: (1n << BigInt(bits - 1)) - 1n,
  };
}

function repeatHexByte(byte: string, count: number): string {
  return `0x${byte.repeat(count)}`;
}

function sampleScalar(param: AbiParameter, seed: number): unknown {
  if (/^u?int\d*$/u.test(param.type)) {
    const { minimum, maximum } = integerBounds(param.type);
    if (minimum < 0n && seed % 2 === 1) {
      return (minimum + BigInt(seed % 7)).toString();
    }
    return (maximum < 17n ? maximum : BigInt((seed % 16) + 1)).toString();
  }
  if (param.type === "address") {
    return `0x${(seed + 1).toString(16).padStart(40, "0")}`;
  }
  if (param.type === "bool") {
    return seed % 2 === 0;
  }
  if (param.type === "string") {
    return `red-team-${seed}`;
  }
  if (param.type === "tuple") {
    return Object.fromEntries((param.components ?? []).map((component, index) => [
      component.name && component.name.length > 0 ? component.name : String(index),
      sampleWireValue(component, seed + index + 1),
    ]));
  }
  if (param.type === "bytes") {
    return repeatHexByte("ab", (seed % 4) + 1);
  }
  const fixedBytes = param.type.match(/^bytes(\d+)$/u);
  if (fixedBytes) {
    return repeatHexByte("ab", Number(fixedBytes[1]));
  }
  if (param.type === "function") {
    return repeatHexByte("ab", 24);
  }
  return `red-team-opaque-${seed}`;
}

export function sampleWireValue(param: AbiParameter, seed = 1): unknown {
  const { baseType, lengths } = parseArrayType(param.type);
  if (lengths.length === 0) {
    return sampleScalar(param, seed);
  }
  const [length, ...tail] = lengths;
  const childType = `${baseType}${tail.map((entry) => `[${entry ?? ""}]`).join("")}`;
  return Array.from({ length: length ?? 2 }, (_, index) => sampleWireValue({
    ...param,
    type: childType,
  }, seed + index + 1));
}

function scalarMutations(param: AbiParameter): WireMutation[] {
  if (/^u?int\d*$/u.test(param.type)) {
    const { minimum, maximum } = integerBounds(param.type);
    return [
      { name: "fractional-integer", value: "1.5" },
      { name: "hex-integer", value: "0x01" },
      { name: "integer-overflow", value: (maximum + 1n).toString() },
      { name: "integer-underflow", value: (minimum - 1n).toString() },
      { name: "numeric-json-value", value: 1 },
    ];
  }
  if (param.type === "address") {
    return [
      { name: "short-address", value: "0x1234" },
      { name: "non-hex-address", value: `0x${"gg".repeat(20)}` },
      { name: "address-object", value: { address: repeatHexByte("11", 20) } },
    ];
  }
  if (param.type === "bool") {
    return [
      { name: "string-boolean", value: "true" },
      { name: "numeric-boolean", value: 1 },
    ];
  }
  if (param.type === "string") {
    return [
      { name: "object-string", value: { toString: "attacker" } },
      { name: "null-string", value: null },
    ];
  }
  if (param.type === "tuple") {
    const components = param.components ?? [];
    const missing = Object.fromEntries(components.slice(0, -1).map((component, index) => [
      component.name && component.name.length > 0 ? component.name : String(index),
      sampleWireValue(component, index + 1),
    ]));
    return [
      { name: "null-tuple", value: null },
      { name: "truncated-tuple", value: missing },
      { name: "scalar-tuple", value: "not-a-tuple" },
    ];
  }
  if (param.type === "bytes") {
    return [
      { name: "odd-length-calldata", value: "0xabc" },
      { name: "non-hex-calldata", value: "0xzz" },
      { name: "unprefixed-calldata", value: "deadbeef" },
    ];
  }
  const fixedBytes = param.type.match(/^bytes(\d+)$/u);
  if (fixedBytes) {
    const size = Number(fixedBytes[1]);
    return [
      { name: "short-fixed-bytes", value: repeatHexByte("ab", Math.max(0, size - 1)) },
      { name: "long-fixed-bytes", value: repeatHexByte("ab", size + 1) },
      { name: "non-hex-fixed-bytes", value: `0x${"zz".repeat(size)}` },
    ];
  }
  if (param.type === "function") {
    return [
      { name: "short-function-pointer", value: repeatHexByte("ab", 23) },
      { name: "long-function-pointer", value: repeatHexByte("ab", 25) },
    ];
  }
  return [];
}

export function buildWireMutations(param: AbiParameter, seed = 1): WireMutation[] {
  const { baseType, lengths } = parseArrayType(param.type);
  if (lengths.length === 0) {
    return scalarMutations(param);
  }
  const valid = sampleWireValue(param, seed) as unknown[];
  const mutations: WireMutation[] = [
    { name: "non-array", value: { 0: valid[0] } },
    { name: "null-array", value: null },
  ];
  if (lengths[0] !== null) {
    mutations.push(
      { name: "short-fixed-array", value: valid.slice(0, Math.max(0, valid.length - 1)) },
      { name: "long-fixed-array", value: [...valid, valid[0]] },
    );
  }
  if (valid.length > 0) {
    const childType = `${baseType}${lengths.slice(1).map((entry) => `[${entry ?? ""}]`).join("")}`;
    const childMutation = buildWireMutations({ ...param, type: childType }, seed + 1)[0];
    if (childMutation) {
      const nested = [...valid];
      nested[0] = childMutation.value;
      mutations.push({ name: `nested-${childMutation.name}`, value: nested });
    }
  }
  return mutations;
}

function canonicalize(value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalize(entry));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalize(entry)]));
  }
  return value;
}

export function replayFingerprint(input: {
  chainId: number;
  contract: string;
  actor: string;
  selector: string;
  nonce: string;
  deadline: string;
  payload: unknown;
}): string {
  return createHash("sha256").update(JSON.stringify(canonicalize({
    ...input,
    contract: input.contract.toLowerCase(),
    actor: input.actor.toLowerCase(),
    selector: input.selector.toLowerCase(),
  }))).digest("hex");
}

export class ReplayLedger {
  private readonly consumed = new Set<string>();

  consume(fingerprint: string): boolean {
    if (this.consumed.has(fingerprint)) {
      return false;
    }
    this.consumed.add(fingerprint);
    return true;
  }
}

export function inspectActorBinding(input: {
  apiKey: string;
  signerId?: string;
  signerAddress?: string;
  claimedWallet?: string;
}): RedTeamFinding[] {
  const findings: RedTeamFinding[] = [];
  if (!input.signerId) {
    findings.push({
      id: "signer-missing",
      severity: "high",
      message: "write-capable actor has no signer binding",
      evidence: { apiKey: input.apiKey },
    });
  }
  if (input.signerAddress && input.claimedWallet && input.signerAddress.toLowerCase() !== input.claimedWallet.toLowerCase()) {
    findings.push({
      id: "confused-deputy-wallet-mismatch",
      severity: "critical",
      message: "claimed wallet does not match the API-key signer",
      evidence: {
        apiKey: input.apiKey,
        signerId: input.signerId ?? null,
        signerAddress: input.signerAddress,
        claimedWallet: input.claimedWallet,
      },
    });
  }
  return findings;
}

export function inspectValueConservation(input: {
  before: Record<string, bigint>;
  after: Record<string, bigint>;
  allowedMint?: bigint;
  allowedBurn?: bigint;
}): RedTeamFinding[] {
  const beforeTotal = Object.values(input.before).reduce((sum, value) => sum + value, 0n);
  const afterTotal = Object.values(input.after).reduce((sum, value) => sum + value, 0n);
  const expectedAfter = beforeTotal + (input.allowedMint ?? 0n) - (input.allowedBurn ?? 0n);
  return afterTotal === expectedAfter ? [] : [{
    id: "value-conservation",
    severity: "critical",
    message: "value-moving workflow did not conserve the measured balance set",
    evidence: {
      beforeTotal: beforeTotal.toString(),
      afterTotal: afterTotal.toString(),
      expectedAfter: expectedAfter.toString(),
    },
  }];
}

export function inspectStateTransition<T extends string>(input: {
  from: T;
  to: T;
  allowed: Readonly<Record<T, readonly T[]>>;
}): RedTeamFinding[] {
  return input.allowed[input.from]?.includes(input.to) ? [] : [{
    id: "state-machine-ordering",
    severity: "high",
    message: `illegal state transition ${input.from} -> ${input.to}`,
    evidence: { from: input.from, to: input.to, allowed: input.allowed[input.from] ?? [] },
  }];
}

export function inspectRpcSnapshots(input: {
  primary: { blockNumber: number; blockHash: string; valueHash: string };
  secondary: { blockNumber: number; blockHash: string; valueHash: string };
  maxBlockLag: number;
}): RedTeamFinding[] {
  const findings: RedTeamFinding[] = [];
  if (Math.abs(input.primary.blockNumber - input.secondary.blockNumber) > input.maxBlockLag) {
    findings.push({
      id: "stale-rpc-head",
      severity: "high",
      message: "RPC providers exceed the permitted head lag",
      evidence: input,
    });
  }
  if (input.primary.blockNumber === input.secondary.blockNumber && input.primary.blockHash !== input.secondary.blockHash) {
    findings.push({
      id: "rpc-fork-disagreement",
      severity: "critical",
      message: "RPC providers disagree on the canonical hash at the same height",
      evidence: input,
    });
  }
  if (input.primary.blockHash === input.secondary.blockHash && input.primary.valueHash !== input.secondary.valueHash) {
    findings.push({
      id: "rpc-state-disagreement",
      severity: "critical",
      message: "RPC providers returned inconsistent state for the same block hash",
      evidence: input,
    });
  }
  return findings;
}

export type FacetCutProbe = {
  facetAddress: string;
  action: number;
  functionSelectors: string[];
};

export function inspectDiamondCut(input: {
  facetCuts: FacetCutProbe[];
  mountedSelectors: ReadonlySet<string>;
  trustedInitContracts: ReadonlySet<string>;
  initContract: string;
  initCalldata: string;
}): RedTeamFinding[] {
  const findings: RedTeamFinding[] = [];
  const seen = new Set<string>();
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  for (const cut of input.facetCuts) {
    for (const rawSelector of cut.functionSelectors) {
      const selector = rawSelector.toLowerCase();
      if (seen.has(selector)) {
        findings.push({
          id: "diamond-selector-duplicate",
          severity: "critical",
          message: "diamond cut contains the same selector more than once",
          evidence: { selector },
        });
      }
      seen.add(selector);
      if (cut.action === 0 && input.mountedSelectors.has(selector)) {
        findings.push({
          id: "diamond-selector-collision",
          severity: "critical",
          message: "diamond Add cut collides with a mounted selector",
          evidence: { selector, facetAddress: cut.facetAddress },
        });
      }
      if (cut.action === 1 && !input.mountedSelectors.has(selector)) {
        findings.push({
          id: "diamond-replace-missing-selector",
          severity: "high",
          message: "diamond Replace cut targets an unmounted selector",
          evidence: { selector, facetAddress: cut.facetAddress },
        });
      }
    }
  }
  const normalizedInit = input.initContract.toLowerCase();
  if (normalizedInit === zeroAddress && input.initCalldata !== "0x") {
    findings.push({
      id: "diamond-init-calldata-without-contract",
      severity: "high",
      message: "diamond cut supplies init calldata with a zero init contract",
      evidence: { initContract: input.initContract, initCalldata: input.initCalldata },
    });
  }
  if (normalizedInit !== zeroAddress && !input.trustedInitContracts.has(normalizedInit)) {
    findings.push({
      id: "diamond-untrusted-init",
      severity: "critical",
      message: "diamond cut targets an untrusted init contract",
      evidence: { initContract: input.initContract },
    });
  }
  if (normalizedInit !== zeroAddress && input.initCalldata.length < 10) {
    findings.push({
      id: "diamond-malformed-init-calldata",
      severity: "high",
      message: "diamond init calldata does not contain a complete selector",
      evidence: { initCalldata: input.initCalldata },
    });
  }
  return findings;
}

export function inspectTimelock(input: {
  scheduledAt: bigint;
  executeAfter: bigint;
  attemptedAt: bigint;
  minimumDelay: bigint;
  operationId: string;
  expectedOperationId: string;
}): RedTeamFinding[] {
  const findings: RedTeamFinding[] = [];
  if (input.executeAfter < input.scheduledAt + input.minimumDelay) {
    findings.push({
      id: "timelock-delay-bypass",
      severity: "critical",
      message: "operation readiness is earlier than the configured minimum delay",
      evidence: Object.fromEntries(Object.entries(input).map(([key, value]) => [key, typeof value === "bigint" ? value.toString() : value])),
    });
  }
  if (input.attemptedAt < input.executeAfter) {
    findings.push({
      id: "timelock-early-execution",
      severity: "critical",
      message: "operation execution was attempted before its readiness timestamp",
      evidence: { attemptedAt: input.attemptedAt.toString(), executeAfter: input.executeAfter.toString() },
    });
  }
  if (input.operationId.toLowerCase() !== input.expectedOperationId.toLowerCase()) {
    findings.push({
      id: "timelock-operation-substitution",
      severity: "critical",
      message: "executed operation id does not bind to the scheduled payload",
      evidence: { operationId: input.operationId, expectedOperationId: input.expectedOperationId },
    });
  }
  return findings;
}

export function inspectMultisig(input: {
  operators: string[];
  approvals: string[];
  threshold: number;
}): RedTeamFinding[] {
  const normalizedOperators = new Set(input.operators.map((operator) => operator.toLowerCase()));
  const normalizedApprovals = input.approvals.map((approval) => approval.toLowerCase());
  const uniqueApprovals = new Set(normalizedApprovals.filter((approval) => normalizedOperators.has(approval)));
  const findings: RedTeamFinding[] = [];
  if (input.threshold <= 0 || input.threshold > normalizedOperators.size) {
    findings.push({
      id: "multisig-invalid-threshold",
      severity: "critical",
      message: "multisig threshold is outside the operator set",
      evidence: { threshold: input.threshold, operatorCount: normalizedOperators.size },
    });
  }
  if (normalizedApprovals.length !== new Set(normalizedApprovals).size) {
    findings.push({
      id: "multisig-duplicate-approval",
      severity: "critical",
      message: "duplicate approvals were counted toward the multisig threshold",
      evidence: { approvals: input.approvals },
    });
  }
  if (uniqueApprovals.size < input.threshold) {
    findings.push({
      id: "multisig-insufficient-unique-approvals",
      severity: "critical",
      message: "operation lacks enough unique operator approvals",
      evidence: { uniqueApprovalCount: uniqueApprovals.size, threshold: input.threshold },
    });
  }
  return findings;
}

export function inspectEmergencyAction(input: {
  state: "NORMAL" | "PAUSED" | "LOCKED_DOWN" | "RECOVERY";
  action: "resume" | "withdraw" | "recover";
  approvals: number;
  requiredApprovals: number;
  timelockReady: boolean;
}): RedTeamFinding[] {
  const findings: RedTeamFinding[] = [];
  if (input.action === "resume" && !["PAUSED", "RECOVERY"].includes(input.state)) {
    findings.push({
      id: "emergency-resume-state-bypass",
      severity: "critical",
      message: "emergency resume was attempted from an invalid state",
      evidence: input,
    });
  }
  if ((input.action === "withdraw" || input.action === "recover") && input.state === "NORMAL") {
    findings.push({
      id: "emergency-normal-state-bypass",
      severity: "critical",
      message: `emergency ${input.action} was attempted while the system was normal`,
      evidence: input,
    });
  }
  if (input.approvals < input.requiredApprovals) {
    findings.push({
      id: "emergency-approval-bypass",
      severity: "critical",
      message: "emergency action lacks the required approvals",
      evidence: input,
    });
  }
  if (!input.timelockReady) {
    findings.push({
      id: "emergency-timelock-bypass",
      severity: "critical",
      message: "emergency action was attempted before its timelock was ready",
      evidence: input,
    });
  }
  return findings;
}

export const redTeamHarnessInternals = {
  canonicalize,
  integerBounds,
  parseArrayType,
};
