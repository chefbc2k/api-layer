import type { ApiExecutionContext } from "../shared/execution-context.js";

function extractTxHash(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const txHash = (payload as Record<string, unknown>).txHash;
  return typeof txHash === "string" && txHash.startsWith("0x") ? txHash : null;
}

export async function waitForWorkflowWriteReceipt(
  context: ApiExecutionContext,
  payload: unknown,
  label: string,
): Promise<string | null> {
  const txHash = extractTxHash(payload);
  if (!txHash) {
    return null;
  }

  for (let attempt = 0; attempt < 120; attempt += 1) {
    const receipt = await context.providerRouter.withProvider(
      "read",
      `workflow.${label}.receipt`,
      (provider) => provider.getTransactionReceipt(txHash),
    );
    if (receipt) {
      if (receipt.status !== 1n && receipt.status !== 1) {
        throw new Error(`${label} transaction reverted: ${txHash}`);
      }
      return txHash;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`${label} transaction receipt timeout: ${txHash}`);
}
