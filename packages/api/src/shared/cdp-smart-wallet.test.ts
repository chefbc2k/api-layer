import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  CdpClient: vi.fn(),
  getAccount: vi.fn(),
  getSmartAccount: vi.fn(),
  getOrCreateSmartAccount: vi.fn(),
  sendUserOperation: vi.fn(),
}));

vi.mock("@coinbase/cdp-sdk", () => ({
  CdpClient: mocks.CdpClient,
}));

import { submitSmartWalletCall } from "./cdp-smart-wallet.js";

describe("cdp-smart-wallet", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      CDP_API_KEY_ID: "key-id",
      CDP_API_KEY_SECRET: "key-secret",
      CDP_WALLET_SECRET: "wallet-secret",
    };
    mocks.getAccount.mockReset();
    mocks.getSmartAccount.mockReset();
    mocks.getOrCreateSmartAccount.mockReset();
    mocks.sendUserOperation.mockReset();
    mocks.CdpClient.mockReset();
    mocks.CdpClient.mockImplementation(() => ({
      evm: {
        getAccount: mocks.getAccount,
        getSmartAccount: mocks.getSmartAccount,
        getOrCreateSmartAccount: mocks.getOrCreateSmartAccount,
        sendUserOperation: mocks.sendUserOperation,
      },
    }));
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("requires the CDP credentials and wallet secret", async () => {
    delete process.env.CDP_API_KEY_ID;
    process.env.CDP_API_KEY_NAME = "fallback-key-name";

    await expect(submitSmartWalletCall({ to: "0x1", data: "0x" })).rejects.toThrow(
      "Provide COINBASE_SMART_WALLET_ADDRESS or COINBASE_SMART_WALLET_OWNER_NAME/COINBASE_SMART_WALLET_OWNER_ADDRESS",
    );
  });

  it("fails fast when the installed SDK shape is incomplete", async () => {
    mocks.CdpClient.mockImplementationOnce(() => ({
      evm: {
        getAccount: mocks.getAccount,
      },
    }));

    await expect(submitSmartWalletCall({ to: "0x1", data: "0x" })).rejects.toThrow(
      "installed @coinbase/cdp-sdk does not expose expected evm methods",
    );
  });

  it("uses an explicit smart wallet address and validates the returned account", async () => {
    process.env.COINBASE_SMART_WALLET_ADDRESS = "0x00000000000000000000000000000000000000AA";
    mocks.getSmartAccount.mockResolvedValue({
      smartAccount: { address: "0x00000000000000000000000000000000000000AA" },
    });
    mocks.sendUserOperation.mockResolvedValue({
      userOperationHash: "0xuserop",
      wait: vi.fn().mockResolvedValue({ status: "confirmed" }),
    });

    await expect(
      submitSmartWalletCall({ to: "0x0000000000000000000000000000000000000001", data: "0x1234" }),
    ).resolves.toEqual({
      relay: "cdp-smart-wallet",
      network: "base-sepolia",
      smartWalletAddress: "0x00000000000000000000000000000000000000AA",
      userOperationHash: "0xuserop",
      receipt: { status: "confirmed" },
    });

    expect(mocks.getSmartAccount).toHaveBeenCalledWith({
      address: "0x00000000000000000000000000000000000000aa",
    });
    expect(mocks.sendUserOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        network: "base-sepolia",
        calls: [{ to: "0x0000000000000000000000000000000000000001", data: "0x1234", value: "0x0" }],
      }),
    );
  });

  it("rejects a mismatched explicit smart wallet address", async () => {
    process.env.COINBASE_SMART_WALLET_ADDRESS = "0x00000000000000000000000000000000000000AA";
    mocks.getSmartAccount.mockResolvedValue({
      address: "0x00000000000000000000000000000000000000bb",
    });

    await expect(submitSmartWalletCall({ to: "0x1", data: "0x" })).rejects.toThrow(
      "configured COINBASE_SMART_WALLET_ADDRESS 0x00000000000000000000000000000000000000aa does not match 0x00000000000000000000000000000000000000bb",
    );
  });

  it("rejects an explicit smart wallet lookup that returns no address", async () => {
    process.env.COINBASE_SMART_WALLET_ADDRESS = "0x00000000000000000000000000000000000000AA";
    mocks.getSmartAccount.mockResolvedValue({
      smartAccount: {},
    });

    await expect(submitSmartWalletCall({ to: "0x1", data: "0x" })).rejects.toThrow(
      "CDP returned a smart account without an address",
    );
  });

  it("resolves the owner by address and creates a smart account with paymaster and network overrides", async () => {
    process.env.COINBASE_SMART_WALLET_OWNER_ADDRESS = "0x00000000000000000000000000000000000000cc";
    process.env.COINBASE_SMART_WALLET_ACCOUNT_NAME = "ops-wallet";
    process.env.COINBASE_SMART_WALLET_NETWORK = "base-mainnet";
    process.env.COINBASE_PAYMASTER_URL = "https://paymaster.example";
    mocks.getAccount.mockResolvedValue({ account: { address: "0x00000000000000000000000000000000000000cc" } });
    mocks.getOrCreateSmartAccount.mockResolvedValue({ address: "0x00000000000000000000000000000000000000dd" });
    mocks.sendUserOperation.mockResolvedValue({
      userOpHash: "0xalt-userop",
      receipt: { status: "submitted" },
    });

    await expect(
      submitSmartWalletCall({ to: "0x0000000000000000000000000000000000000002", data: "0xabcd", value: "0x05" }),
    ).resolves.toEqual({
      relay: "cdp-smart-wallet",
      network: "base-mainnet",
      smartWalletAddress: "0x00000000000000000000000000000000000000dd",
      userOperationHash: "0xalt-userop",
      receipt: {
        userOpHash: "0xalt-userop",
        receipt: { status: "submitted" },
      },
    });

    expect(mocks.getAccount).toHaveBeenCalledWith({ address: "0x00000000000000000000000000000000000000cc" });
    expect(mocks.getOrCreateSmartAccount).toHaveBeenCalledWith({
      name: "ops-wallet",
      owner: { account: { address: "0x00000000000000000000000000000000000000cc" } },
    });
    expect(mocks.sendUserOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        paymasterUrl: "https://paymaster.example",
        network: "base-mainnet",
        calls: [{ to: "0x0000000000000000000000000000000000000002", data: "0xabcd", value: "0x05" }],
      }),
    );
  });

  it("resolves the owner by name and rejects missing owner inputs or missing user operation hashes", async () => {
    delete process.env.COINBASE_SMART_WALLET_OWNER_ADDRESS;
    delete process.env.COINBASE_SMART_WALLET_OWNER_NAME;

    await expect(submitSmartWalletCall({ to: "0x1", data: "0x" })).rejects.toThrow(
      "Provide COINBASE_SMART_WALLET_ADDRESS or COINBASE_SMART_WALLET_OWNER_NAME/COINBASE_SMART_WALLET_OWNER_ADDRESS",
    );

    process.env.COINBASE_SMART_WALLET_OWNER_NAME = "founder";
    mocks.getAccount.mockResolvedValue({ address: "0x00000000000000000000000000000000000000ee" });
    mocks.getOrCreateSmartAccount.mockResolvedValue({ address: "0x00000000000000000000000000000000000000ff" });
    mocks.sendUserOperation.mockResolvedValue({ receipt: { status: "missing-hash" } });

    await expect(submitSmartWalletCall({ to: "0x1", data: "0x" })).rejects.toThrow(
      "CDP did not return a user operation hash",
    );
    expect(mocks.getAccount).toHaveBeenCalledWith({ name: "founder" });
  });

  it("accepts operationId as the user operation hash fallback", async () => {
    process.env.COINBASE_SMART_WALLET_OWNER_NAME = "founder";
    mocks.getAccount.mockResolvedValue({ address: "0x00000000000000000000000000000000000000ee" });
    mocks.getOrCreateSmartAccount.mockResolvedValue({ address: "0x00000000000000000000000000000000000000ff" });
    mocks.sendUserOperation.mockResolvedValue({
      operationId: "op-123",
      receipt: { status: "queued" },
    });

    await expect(submitSmartWalletCall({ to: "0x1", data: "0x" })).resolves.toEqual({
      relay: "cdp-smart-wallet",
      network: "base-sepolia",
      smartWalletAddress: "0x00000000000000000000000000000000000000ff",
      userOperationHash: "op-123",
      receipt: {
        operationId: "op-123",
        receipt: { status: "queued" },
      },
    });
  });

  it("rejects owner-based account resolution when the resulting smart account has no address", async () => {
    process.env.COINBASE_SMART_WALLET_OWNER_NAME = "founder";
    mocks.getAccount.mockResolvedValue({ address: "0x00000000000000000000000000000000000000ee" });
    mocks.getOrCreateSmartAccount.mockResolvedValue({});

    await expect(submitSmartWalletCall({ to: "0x1", data: "0x" })).rejects.toThrow(
      "unable to resolve smart wallet address",
    );
  });

  it("normalizes null call values to 0x0 before relaying the user operation", async () => {
    process.env.COINBASE_SMART_WALLET_OWNER_NAME = "founder";
    mocks.getAccount.mockResolvedValue({ address: "0x00000000000000000000000000000000000000ee" });
    mocks.getOrCreateSmartAccount.mockResolvedValue({ address: "0x00000000000000000000000000000000000000ff" });
    mocks.sendUserOperation.mockResolvedValue({
      id: "op-null-value",
      receipt: { status: "queued" },
    });

    await submitSmartWalletCall({ to: "0x1", data: "0x", value: null as never });

    expect(mocks.sendUserOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        calls: [{ to: "0x1", data: "0x", value: "0x0" }],
      }),
    );
  });
});
