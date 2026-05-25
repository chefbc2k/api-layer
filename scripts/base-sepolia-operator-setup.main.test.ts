import path from "node:path";

import { ethers } from "ethers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const scriptPath = path.resolve("/Users/chef/Public/api-layer/scripts/base-sepolia-operator-setup.ts");

const appMocks = vi.hoisted(() => ({
  createApiServer: vi.fn(),
}));

const generatedMocks = vi.hoisted(() => ({
  facetRegistry: {
    VoiceAssetFacet: { abi: ["voice"] },
    PaymentFacet: { abi: ["payment"] },
    EscrowFacet: { abi: ["escrow"] },
    MarketplaceFacet: { abi: ["marketplace"] },
    AccessControlFacet: { abi: ["access"] },
    GovernorFacet: { abi: ["governor"] },
    ProposalFacet: { abi: ["proposal"] },
    DelegationFacet: { abi: ["delegation"] },
    TokenSupplyFacet: { abi: ["token-supply"] },
  },
}));

const configMocks = vi.hoisted(() => ({
  loadRepoEnv: vi.fn(),
}));

const alchemyMocks = vi.hoisted(() => ({
  resolveRuntimeConfig: vi.fn(),
  startLocalForkIfNeeded: vi.fn(),
  isLoopbackRpcUrl: vi.fn((url?: string) => typeof url === "string" && /^https?:\/\/(?:127\.0\.0\.1|localhost)/u.test(url)),
}));

const fsMocks = vi.hoisted(() => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
}));

const retryMocks = vi.hoisted(() => ({
  runWithTransientRpcRetries: vi.fn(async (work: () => Promise<unknown>, options?: { log?: (message: string) => void }) => {
    options?.log?.("transient retry probe");
    return work();
  }),
}));

const ethersMocks = vi.hoisted(() => ({
  providerDestroy: vi.fn(),
  providerGetBalance: vi.fn(),
  providerGetBlock: vi.fn(),
  providerSend: vi.fn(),
  contractFactory: vi.fn(),
}));

vi.mock("../packages/api/src/app.js", () => ({
  createApiServer: appMocks.createApiServer,
}));

vi.mock("../packages/client/src/generated/index.js", () => ({
  facetRegistry: generatedMocks.facetRegistry,
}));

vi.mock("../packages/client/src/runtime/config.js", () => ({
  loadRepoEnv: configMocks.loadRepoEnv,
}));

vi.mock("./alchemy-debug-lib.js", () => ({
  resolveRuntimeConfig: alchemyMocks.resolveRuntimeConfig,
  startLocalForkIfNeeded: alchemyMocks.startLocalForkIfNeeded,
  isLoopbackRpcUrl: alchemyMocks.isLoopbackRpcUrl,
}));

vi.mock("node:fs/promises", () => ({
  mkdir: fsMocks.mkdir,
  writeFile: fsMocks.writeFile,
}));

vi.mock("./transient-rpc-retry.js", () => ({
  runWithTransientRpcRetries: retryMocks.runWithTransientRpcRetries,
}));

vi.mock("ethers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ethers")>();

  class MockJsonRpcProvider {
    url: string;
    chainId: number;

    constructor(url: string, chainId: number) {
      this.url = url;
      this.chainId = chainId;
    }

    getBalance(address: string) {
      return ethersMocks.providerGetBalance(address);
    }

    getBlock(blockTag: string) {
      return ethersMocks.providerGetBlock(blockTag);
    }

    send(method: string, params: unknown[]) {
      return ethersMocks.providerSend(method, params);
    }

    destroy() {
      return ethersMocks.providerDestroy();
    }
  }

  class MockWallet {
    address: string;
    privateKey: string;
    provider: MockJsonRpcProvider;

    constructor(privateKey: string, provider: MockJsonRpcProvider) {
      this.privateKey = privateKey;
      this.provider = provider;
      this.address = `0x${privateKey.slice(2).padEnd(40, "0").slice(0, 40)}`;
    }

    connect(provider: MockJsonRpcProvider) {
      return new MockWallet(this.privateKey, provider);
    }
  }

  class MockContract {
    constructor(address: string, abi: unknown, provider: unknown) {
      return ethersMocks.contractFactory(address, abi, provider);
    }
  }

  return {
    ...actual,
    Contract: MockContract,
    JsonRpcProvider: MockJsonRpcProvider,
    Wallet: MockWallet,
  };
});

describe("base-sepolia-operator-setup main", () => {
  const originalArgv = [...process.argv];

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.argv = [...originalArgv];

    const server = {
      address: vi.fn().mockReturnValue({ port: 8787 }),
      close: vi.fn((callback?: () => void) => callback?.()),
      closeAllConnections: vi.fn(),
      closeIdleConnections: vi.fn(),
    };
    appMocks.createApiServer.mockReturnValue({
      listen: vi.fn().mockReturnValue(server),
    });

    configMocks.loadRepoEnv.mockReturnValue({
      PRIVATE_KEY: "0x1111111111111111111111111111111111111111111111111111111111111111",
    });
    alchemyMocks.resolveRuntimeConfig.mockResolvedValue({
      config: {
        chainId: 84532,
        diamondAddress: "0xdiamond",
        cbdpRpcUrl: "http://127.0.0.1:8548",
        alchemyRpcUrl: "https://alchemy.example",
      },
      rpcResolution: {
        effectiveRpcUrl: "https://effective.example",
      },
    });
    alchemyMocks.startLocalForkIfNeeded.mockResolvedValue({
      rpcUrl: "http://127.0.0.1:9999",
      forkedFrom: "https://fork.example",
      forkProcess: {
        kill: vi.fn(),
      },
    });

    ethersMocks.providerGetBalance.mockResolvedValue(ethers.parseEther("1"));
    ethersMocks.providerGetBlock.mockResolvedValue({ timestamp: 100_000 });
    ethersMocks.providerSend.mockResolvedValue(undefined);
    ethersMocks.providerDestroy.mockResolvedValue(undefined);
    fsMocks.mkdir.mockResolvedValue(undefined);
    fsMocks.writeFile.mockResolvedValue(undefined);

    ethersMocks.contractFactory.mockImplementation((_address: string, abi: unknown) => {
      if (abi === generatedMocks.facetRegistry.VoiceAssetFacet.abi) {
        return {
          getVoiceAssetsByOwner: vi.fn().mockResolvedValue([]),
        };
      }
      if (abi === generatedMocks.facetRegistry.PaymentFacet.abi) {
        return {
          getUsdcToken: vi.fn().mockResolvedValue(actualZeroAddress),
        };
      }
      if (abi === generatedMocks.facetRegistry.EscrowFacet.abi) {
        return {
          getOriginalOwner: vi.fn(),
        };
      }
      if (abi === generatedMocks.facetRegistry.MarketplaceFacet.abi) {
        return {
          getListing: vi.fn().mockRejectedValue(new Error("missing listing")),
        };
      }
      if (abi === generatedMocks.facetRegistry.AccessControlFacet.abi) {
        return {
          hasRole: vi.fn().mockResolvedValue(true),
        };
      }
      if (abi === generatedMocks.facetRegistry.GovernorFacet.abi) {
        return {
          getVotingConfig: vi.fn().mockResolvedValue([0n, 0n, 100n]),
        };
      }
      if (abi === generatedMocks.facetRegistry.DelegationFacet.abi) {
        return {
          getCurrentVotes: vi.fn().mockResolvedValue(150n),
        };
      }
      if (abi === generatedMocks.facetRegistry.TokenSupplyFacet.abi) {
        return {
          tokenBalanceOf: vi.fn().mockResolvedValue(500n),
          supplyIsMintingFinished: vi.fn().mockResolvedValue(true),
        };
      }
      return {};
    });
  });

  afterEach(() => {
    process.argv = [...originalArgv];
    vi.restoreAllMocks();
  });

  it("runs main end-to-end and destroys the provider during cleanup", async () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const module = await import("./base-sepolia-operator-setup.ts");

    await module.main();

    const writePayload = JSON.parse(String(fsMocks.writeFile.mock.calls[0]?.[1] ?? "{}"));
    const server = appMocks.createApiServer.mock.results[0]?.value.listen.mock.results[0]?.value;
    const forkRuntime = await alchemyMocks.startLocalForkIfNeeded.mock.results[0]?.value;
    expect(writePayload.network).toMatchObject({
      rpcUrl: "https://fork.example",
      runtimeRpcUrl: "http://127.0.0.1:9999",
      forkedFrom: "https://fork.example",
      diamondAddress: "0xdiamond",
    });
    expect(writePayload.marketplace).toMatchObject({
      agedListingFixture: {
        status: "blocked",
        reason: "missing aged seller asset",
      },
    });
    expect(writePayload.setup).toMatchObject({
      status: "blocked",
      blockers: ["marketplace: missing aged seller asset"],
    });
    expect(ethersMocks.providerDestroy).toHaveBeenCalledTimes(1);
    expect(server.close).toHaveBeenCalledTimes(1);
    expect(server.closeAllConnections).toHaveBeenCalledTimes(1);
    expect(server.closeIdleConnections).toHaveBeenCalledTimes(1);
    expect(forkRuntime.forkProcess.kill).toHaveBeenCalledWith("SIGTERM");
    expect(retryMocks.runWithTransientRpcRetries).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        label: "setup:base-sepolia",
        maxAttempts: 3,
        baseDelayMs: 1500,
        log: expect.any(Function),
      }),
    );
    expect(consoleLog).toHaveBeenCalledTimes(1);
    expect(consoleWarn).toHaveBeenCalledWith("transient retry probe");
  });

  it("falls back to the default port and prefers the configured remote fixture RPC when cbdp is already non-loopback", async () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    appMocks.createApiServer.mockReturnValue({
      listen: vi.fn().mockReturnValue({
        address: vi.fn().mockReturnValue("pipe"),
        close: vi.fn((callback?: () => void) => callback?.()),
        closeAllConnections: vi.fn(),
        closeIdleConnections: vi.fn(),
      }),
    });
    alchemyMocks.resolveRuntimeConfig.mockResolvedValue({
      config: {
        chainId: 84532,
        diamondAddress: "0xdiamond",
        cbdpRpcUrl: "https://fixtures.example",
        alchemyRpcUrl: "https://alchemy.example",
      },
      rpcResolution: {
        effectiveRpcUrl: "https://effective.example",
      },
    });
    alchemyMocks.startLocalForkIfNeeded.mockResolvedValue({
      rpcUrl: "http://127.0.0.1:9999",
      forkedFrom: null,
      forkProcess: {
        kill: vi.fn(),
      },
    });
    ethersMocks.contractFactory.mockImplementation((address: string, abi: unknown) => {
      if (abi === generatedMocks.facetRegistry.VoiceAssetFacet.abi) {
        return {
          getVoiceAssetsByOwner: vi.fn().mockResolvedValue([]),
        };
      }
      if (abi === generatedMocks.facetRegistry.PaymentFacet.abi) {
        return {
          getUsdcToken: vi.fn().mockResolvedValue("0x00000000000000000000000000000000000000cc"),
        };
      }
      if (address === "0x00000000000000000000000000000000000000cc") {
        return {
          balanceOf: vi.fn().mockResolvedValue(0n),
          allowance: vi.fn().mockResolvedValue(0n),
          connect: vi.fn(),
        };
      }
      if (abi === generatedMocks.facetRegistry.EscrowFacet.abi) {
        return {
          getOriginalOwner: vi.fn(),
        };
      }
      if (abi === generatedMocks.facetRegistry.MarketplaceFacet.abi) {
        return {
          getListing: vi.fn().mockRejectedValue(new Error("missing listing")),
        };
      }
      if (abi === generatedMocks.facetRegistry.AccessControlFacet.abi) {
        return {
          hasRole: vi.fn().mockResolvedValue(true),
        };
      }
      if (abi === generatedMocks.facetRegistry.GovernorFacet.abi) {
        return {
          getVotingConfig: vi.fn().mockResolvedValue([0n, 0n, 100n]),
        };
      }
      if (abi === generatedMocks.facetRegistry.DelegationFacet.abi) {
        return {
          getCurrentVotes: vi.fn().mockResolvedValue(150n),
        };
      }
      if (abi === generatedMocks.facetRegistry.TokenSupplyFacet.abi) {
        return {
          tokenBalanceOf: vi.fn().mockResolvedValue(500n),
          supplyIsMintingFinished: vi.fn().mockResolvedValue(true),
        };
      }
      return {};
    });

    const module = await import("./base-sepolia-operator-setup.ts");
    await module.main();

    const writePayload = JSON.parse(String(fsMocks.writeFile.mock.calls[0]?.[1] ?? "{}"));
    expect(writePayload.network).toMatchObject({
      rpcUrl: "https://fixtures.example",
      upstreamRpcUrl: "https://fixtures.example",
      runtimeRpcUrl: "http://127.0.0.1:9999",
      forkedFrom: null,
    });
    expect(ethersMocks.contractFactory).toHaveBeenCalledWith(
      "0x00000000000000000000000000000000000000cc",
      expect.arrayContaining([
        "function balanceOf(address) view returns (uint256)",
        "function allowance(address,address) view returns (uint256)",
        "function transfer(address,uint256) returns (bool)",
      ]),
      expect.anything(),
    );
    expect(consoleWarn).toHaveBeenCalledWith("transient retry probe");
    expect(consoleLog).toHaveBeenCalledTimes(1);
  });

  it("falls back to the resolved Alchemy RPC when every earlier fixture source is loopback", async () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    alchemyMocks.resolveRuntimeConfig.mockResolvedValue({
      config: {
        chainId: 84532,
        diamondAddress: "0xdiamond",
        cbdpRpcUrl: "http://127.0.0.1:8548",
        alchemyRpcUrl: "https://alchemy-backfill.example",
      },
      rpcResolution: {
        effectiveRpcUrl: "http://localhost:8545",
      },
    });
    alchemyMocks.startLocalForkIfNeeded.mockResolvedValue({
      rpcUrl: "http://127.0.0.1:9999",
      forkedFrom: null,
      forkProcess: {
        kill: vi.fn(),
      },
    });

    const module = await import("./base-sepolia-operator-setup.ts");
    await module.main();

    const writePayload = JSON.parse(String(fsMocks.writeFile.mock.calls[0]?.[1] ?? "{}"));
    expect(writePayload.network).toMatchObject({
      rpcUrl: "https://alchemy-backfill.example",
      upstreamRpcUrl: "https://alchemy-backfill.example",
      runtimeRpcUrl: "http://127.0.0.1:9999",
      forkedFrom: null,
    });
    expect(consoleWarn).toHaveBeenCalledWith("transient retry probe");
    expect(consoleLog).toHaveBeenCalledTimes(1);
  });

  it("prefers the remote fork origin before later loopback-resolved RPC fallbacks", async () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    alchemyMocks.resolveRuntimeConfig.mockResolvedValue({
      config: {
        chainId: 84532,
        diamondAddress: "0xdiamond",
        cbdpRpcUrl: "http://127.0.0.1:8548",
        alchemyRpcUrl: "http://127.0.0.1:7545",
      },
      rpcResolution: {
        effectiveRpcUrl: "https://effective.example",
      },
    });
    alchemyMocks.startLocalForkIfNeeded.mockResolvedValue({
      rpcUrl: "http://127.0.0.1:9999",
      forkedFrom: "https://fork-origin.example",
      forkProcess: {
        kill: vi.fn(),
      },
    });

    const module = await import("./base-sepolia-operator-setup.ts");
    await module.main();

    const writePayload = JSON.parse(String(fsMocks.writeFile.mock.calls[0]?.[1] ?? "{}"));
    expect(writePayload.network).toMatchObject({
      rpcUrl: "https://fork-origin.example",
      upstreamRpcUrl: "https://fork-origin.example",
      runtimeRpcUrl: "http://127.0.0.1:9999",
      forkedFrom: "https://fork-origin.example",
    });
    expect(consoleLog).toHaveBeenCalledTimes(1);
  });

  it("prefers the resolved effective RPC before falling back to the alchemy or cbdp loopback URLs", async () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    alchemyMocks.resolveRuntimeConfig.mockResolvedValue({
      config: {
        chainId: 84532,
        diamondAddress: "0xdiamond",
        cbdpRpcUrl: "http://127.0.0.1:8548",
        alchemyRpcUrl: "http://127.0.0.1:7545",
      },
      rpcResolution: {
        effectiveRpcUrl: "https://effective.example",
      },
    });
    alchemyMocks.startLocalForkIfNeeded.mockResolvedValue({
      rpcUrl: "http://127.0.0.1:9999",
      forkedFrom: null,
      forkProcess: {
        kill: vi.fn(),
      },
    });

    const module = await import("./base-sepolia-operator-setup.ts");
    await module.main();

    const writePayload = JSON.parse(String(fsMocks.writeFile.mock.calls[0]?.[1] ?? "{}"));
    expect(writePayload.network).toMatchObject({
      rpcUrl: "https://effective.example",
      upstreamRpcUrl: "https://effective.example",
      runtimeRpcUrl: "http://127.0.0.1:9999",
      forkedFrom: null,
    });
    expect(consoleLog).toHaveBeenCalledTimes(1);
  });

  it("logs and exits when invoked as the main module and startup fails", async () => {
    process.argv[1] = scriptPath;
    const startupError = new Error("startup failed");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => undefined as never));
    alchemyMocks.resolveRuntimeConfig.mockRejectedValue(startupError);

    await import("./base-sepolia-operator-setup.ts");
    await vi.waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(startupError);
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});

const actualZeroAddress = "0x0000000000000000000000000000000000000000";
