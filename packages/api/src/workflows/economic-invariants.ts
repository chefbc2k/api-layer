export type EconomicAmount = bigint | number | string;

export type AmountDelta = {
  before: string;
  after: string;
  delta: string;
};

export function readEconomicAmount(value: EconomicAmount, label: string): bigint {
  if (typeof value === "bigint") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new Error(`${label} must be a safe integer amount`);
    }
    return BigInt(value);
  }
  if (!/^-?\d+$/u.test(value)) {
    throw new Error(`${label} must be an integer amount`);
  }
  return BigInt(value);
}

export function assertExactAmountDelta(
  label: string,
  beforeInput: EconomicAmount,
  afterInput: EconomicAmount,
  expectedDeltaInput: EconomicAmount,
): AmountDelta {
  const before = readEconomicAmount(beforeInput, `${label}.before`);
  const after = readEconomicAmount(afterInput, `${label}.after`);
  const expectedDelta = readEconomicAmount(expectedDeltaInput, `${label}.expectedDelta`);
  const delta = after - before;
  if (delta !== expectedDelta) {
    throw new Error(`${label} economic invariant failed: expected delta ${expectedDelta}, observed ${delta}`);
  }
  return {
    before: before.toString(),
    after: after.toString(),
    delta: delta.toString(),
  };
}

export function assertConservedDeltas(
  label: string,
  deltas: readonly EconomicAmount[],
  expectedNetInput: EconomicAmount = 0n,
): string {
  const net = deltas.reduce<bigint>(
    (total, value, index) => total + readEconomicAmount(value, `${label}.deltas.${index}`),
    0n,
  );
  const expectedNet = readEconomicAmount(expectedNetInput, `${label}.expectedNet`);
  if (net !== expectedNet) {
    throw new Error(`${label} conservation invariant failed: expected net ${expectedNet}, observed ${net}`);
  }
  return net.toString();
}

export function assertNoEconomicSideEffects(
  label: string,
  before: Readonly<Record<string, EconomicAmount>>,
  after: Readonly<Record<string, EconomicAmount>>,
): void {
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  for (const key of keys) {
    if (!(key in before) || !(key in after)) {
      throw new Error(`${label} no-side-effects invariant failed: snapshot key ${key} is missing`);
    }
    assertExactAmountDelta(`${label}.${key}`, before[key]!, after[key]!, 0n);
  }
}

export function allocateBasisPointSplit(
  totalInput: EconomicAmount,
  shares: Readonly<Record<string, number>>,
  remainderRecipient: string,
): Record<string, string> {
  const total = readEconomicAmount(totalInput, "paymentSplit.total");
  if (total < 0n) {
    throw new Error("paymentSplit.total must be non-negative");
  }
  const entries = Object.entries(shares);
  if (entries.length === 0 || !(remainderRecipient in shares)) {
    throw new Error("paymentSplit requires shares and a remainder recipient");
  }
  const totalBasisPoints = entries.reduce((sum, [label, basisPoints]) => {
    if (!Number.isInteger(basisPoints) || basisPoints < 0) {
      throw new Error(`paymentSplit.${label} basis points must be a non-negative integer`);
    }
    return sum + basisPoints;
  }, 0);
  if (totalBasisPoints !== 10_000) {
    throw new Error(`paymentSplit basis points must total 10000, observed ${totalBasisPoints}`);
  }
  const allocations = Object.fromEntries(entries.map(([label, basisPoints]) => [
    label,
    (total * BigInt(basisPoints)) / 10_000n,
  ])) as Record<string, bigint>;
  const allocated = Object.values(allocations).reduce((sum, value) => sum + value, 0n);
  allocations[remainderRecipient] = allocations[remainderRecipient]! + (total - allocated);
  assertConservedDeltas("paymentSplit", Object.values(allocations), total);
  return Object.fromEntries(Object.entries(allocations).map(([label, amount]) => [label, amount.toString()]));
}
