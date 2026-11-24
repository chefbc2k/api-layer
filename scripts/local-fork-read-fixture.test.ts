import { describe, expect, it, vi } from "vitest";

import { ensureLocalForkRightsGroupFixture } from "./local-fork-read-fixture.js";

const baseInput = () => ({
  rpcUrl: "http://127.0.0.1:8545",
  voiceHash: `0x${"11".repeat(32)}`,
  member: "0x0000000000000000000000000000000000000002",
  timestamp: 1_800_000_000n,
  fixtureName: "safe-read-fixture",
  readExisting: vi.fn(async () => false),
  fundSigner: vi.fn(async () => undefined),
  createGroup: vi.fn(async () => ({ status: 1, transactionHash: `0x${"22".repeat(32)}`, blockNumber: 42 })),
  verifyGroup: vi.fn(async () => undefined),
});

describe("local-fork rights read fixture", () => {
  it("refuses to write outside loopback before invoking fixture callbacks", async () => {
    const input = { ...baseInput(), rpcUrl: "https://sepolia.base.org" };
    await expect(ensureLocalForkRightsGroupFixture(input)).rejects.toThrow("rights_group_fixture_requires_loopback_fork");
    expect(input.readExisting).not.toHaveBeenCalled();
    expect(input.fundSigner).not.toHaveBeenCalled();
    expect(input.createGroup).not.toHaveBeenCalled();
  });

  it("reuses an existing group without funding or writing", async () => {
    const input = { ...baseInput(), readExisting: vi.fn(async () => true) };
    await expect(ensureLocalForkRightsGroupFixture(input)).resolves.toMatchObject({
      status: "already_present",
      methodKey: "RightsFacet.getRightsGroup",
      groupIndex: "0",
      transactionHash: null,
    });
    expect(input.fundSigner).not.toHaveBeenCalled();
    expect(input.createGroup).not.toHaveBeenCalled();
  });

  it("creates and verifies a deterministic first rights-group read fixture", async () => {
    const input = baseInput();
    await expect(ensureLocalForkRightsGroupFixture(input)).resolves.toMatchObject({
      status: "created",
      methodKey: "RightsFacet.createRightsGroup",
      groupIndex: "0",
      transactionHash: `0x${"22".repeat(32)}`,
      blockNumber: 42,
    });
    expect(input.fundSigner).toHaveBeenCalledOnce();
    expect(input.createGroup).toHaveBeenCalledWith({
      name: input.fixtureName,
      rights: [{
        rightType: "commercial",
        startTime: input.timestamp,
        endTime: input.timestamp + 86_400n,
        transferable: true,
        restrictions: ["isolated-fork"],
        revocable: true,
      }],
      members: [input.member],
    });
    expect(input.verifyGroup).toHaveBeenCalledOnce();
  });

  it("does not claim a fixture when its creation receipt failed", async () => {
    const input = { ...baseInput(), createGroup: vi.fn(async () => ({ status: 0, transactionHash: `0x${"22".repeat(32)}`, blockNumber: 42 })) };
    await expect(ensureLocalForkRightsGroupFixture(input)).rejects.toThrow("rights_group_fixture_receipt_failed");
    expect(input.verifyGroup).not.toHaveBeenCalled();
  });
});
