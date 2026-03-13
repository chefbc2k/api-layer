import { describe, expect, it, vi } from "vitest";

import { resolveBufferedGasLimit } from "./execution-context.js";

describe("resolveBufferedGasLimit", () => {
  it("buffers a populated gasLimit without re-estimating", async () => {
    const provider = {
      estimateGas: vi.fn(),
    };

    const gasLimit = await resolveBufferedGasLimit(
      provider,
      {
        to: "0x0000000000000000000000000000000000000001",
        gasLimit: 100_000n,
      },
      "0x0000000000000000000000000000000000000002",
    );

    expect(gasLimit).toBe(170_000n);
    expect(provider.estimateGas).not.toHaveBeenCalled();
  });

  it("estimates gas when missing and includes the signer as from", async () => {
    const provider = {
      estimateGas: vi.fn().mockResolvedValue(200_000n),
    };

    const gasLimit = await resolveBufferedGasLimit(
      provider,
      {
        to: "0x0000000000000000000000000000000000000001",
        data: "0x1234",
      },
      "0x0000000000000000000000000000000000000002",
    );

    expect(provider.estimateGas).toHaveBeenCalledWith({
      to: "0x0000000000000000000000000000000000000001",
      data: "0x1234",
      from: "0x0000000000000000000000000000000000000002",
    });
    expect(gasLimit).toBe(290_000n);
  });
});
