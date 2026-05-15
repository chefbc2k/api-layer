export type VerifyApiResponse = {
  status?: number;
  payload?: unknown;
};

function payloadErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const error = (payload as { error?: unknown }).error;
  return typeof error === "string" ? error : null;
}

export function isSetupBlockedResponse(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }

  const response = value as VerifyApiResponse;
  const error = payloadErrorMessage(response.payload)?.toLowerCase();
  if (!error) {
    return false;
  }

  return error.includes("insufficient funds")
    || error.includes("blocked by setup/state")
    || (response.status === 409 && error.includes("still in"))
    || (response.status === 409 && error.includes("not found"))
    || (response.status === 409 && error.includes("paused"))
    || (response.status === 409 && error.includes("expired"));
}

export function isDatasetTotalValidAfterBurn(totalBefore: bigint, totalAfter: bigint): boolean {
  return totalAfter >= totalBefore;
}
