import { Wallet } from "ethers";
import { describe, expect, it } from "vitest";

import path from "node:path";

import {
  assessPromotionReadiness,
  baseOutput,
  collectPromotionEvidence,
  reportClassification,
  resolvePromotionEnvPath,
  scenarioGate,
} from "./promote-base-sepolia-scenarios.js";

const founder = Wallet.createRandom();
const seller = Wallet.createRandom();
const buyer = Wallet.createRandom();

function readyEnv(): NodeJS.ProcessEnv {
  return {
    API_LAYER_BASE_SEPOLIA_PROMOTION_READY: "true",
    NETWORK: "base-sepolia",
    CHAIN_ID: "84532",
    RPC_URL: "https://base-sepolia.example.invalid/rpc",
    ALCHEMY_RPC_URL: "https://base-sepolia.g.alchemy.com/v2/example",
    DIAMOND_ADDRESS: "0xa14088AcbF0639EF1C3655768a3001E6B8DC9669",
    PRIVATE_KEY: founder.privateKey,
    SENDER: founder.address,
    ORACLE_SIGNER_PRIVATE_KEY_1: seller.privateKey,
    ORACLE_SIGNER_PRIVATE_KEY_2: buyer.privateKey,
  };
}

describe("Base Sepolia promotion readiness", () => {
  it("supports an explicit env path for isolated automation worktrees", () => {
    expect(resolvePromotionEnvPath({ API_LAYER_BASE_SEPOLIA_ENV_PATH: "../api-layer/.env" })).toBe(
      path.resolve("../api-layer/.env"),
    );
    expect(resolvePromotionEnvPath({})).toBe(path.resolve(".env"));
  });

  it("accepts only an explicitly opted-in direct Base Sepolia target with distinct actors", () => {
    expect(assessPromotionReadiness(readyEnv())).toEqual(expect.objectContaining({
      status: "ready",
      blockers: [],
    }));
  });

  it("refuses missing opt-in, loopback RPC, and aliased actors", () => {
    const env = readyEnv();
    delete env.API_LAYER_BASE_SEPOLIA_PROMOTION_READY;
    env.RPC_URL = "http://127.0.0.1:8548";
    env.ALCHEMY_RPC_URL = "http://127.0.0.1:8548";
    env.ORACLE_SIGNER_PRIVATE_KEY_2 = env.ORACLE_SIGNER_PRIVATE_KEY_1;
    env.SENDER = buyer.address;

    const result = assessPromotionReadiness(env);
    expect(result.status).toBe("blocked");
    expect(result.blockers).toEqual(expect.arrayContaining([
      expect.stringContaining("explicit-live-opt-in"),
      expect.stringContaining("direct-live-rpc"),
      expect.stringContaining("direct-diagnostics-rpc"),
      expect.stringContaining("distinct-actors"),
      expect.stringContaining("founder-sender"),
    ]));
  });

  it("refuses a missing .env and malformed configuration without throwing", () => {
    const result = assessPromotionReadiness({
      NETWORK: "mainnet",
      CHAIN_ID: "1",
      RPC_URL: "not a url",
      DIAMOND_ADDRESS: "0xdead",
    }, false);

    expect(result.status).toBe("blocked");
    expect(result.blockers.length).toBeGreaterThanOrEqual(6);
  });

  it("rejects malformed actor keys and sender addresses", () => {
    const env = readyEnv();
    env.PRIVATE_KEY = "not-a-private-key";
    env.SENDER = "not-an-address";

    const result = assessPromotionReadiness(env);
    expect(result.status).toBe("blocked");
    expect(result.blockers).toEqual(expect.arrayContaining([
      expect.stringContaining("required-actors"),
      expect.stringContaining("distinct-actors"),
      expect.stringContaining("founder-sender"),
    ]));
  });
});

describe("Base Sepolia promotion evidence", () => {
  it("extracts and deduplicates transaction, block, actor, state-delta, and decoded-event evidence", () => {
    const txHash = `0x${"ab".repeat(32)}`;
    const events = [{ eventName: "AssetPurchased", transactionHash: txHash }];
    const evidence = collectPromotionEvidence([
      {
        actors: ["buyer-key", "read-key"],
        purchase: { txHash, receipt: { blockNumber: 123 } },
        settlement: { pendingDelta: { seller: "915", treasury: "60" } },
        events,
      },
      { transactionHash: txHash, blockNumber: "123", decodedLogs: events },
    ]);

    expect(evidence.txHashes).toEqual([txHash]);
    expect(evidence.blockNumbers).toEqual([123, "123"]);
    expect(evidence.actors).toEqual(["buyer-key", "read-key"]);
    expect(evidence.stateDeltas).toEqual([
      expect.objectContaining({ path: expect.stringContaining("pendingDelta") }),
    ]);
    expect(evidence.decodedEvents).toHaveLength(2);
  });

  it("captures labeled actor addresses from setup and workflow evidence", () => {
    expect(collectPromotionEvidence([{
      actors: { founder: { address: founder.address } },
      actorWallets: { buyer: buyer.address },
    }]).actors).toEqual([
      "founder",
      founder.address,
      "buyer",
      buyer.address,
    ]);
  });

  it("classifies only recognized proof summaries", () => {
    expect(reportClassification({ summary: "proven working" })).toBe("proven working");
    expect(reportClassification({ summary: "blocked by setup/state" })).toBe("blocked by setup/state");
    expect(reportClassification({ summary: "semantically clarified but not fully proven" })).toBe(
      "semantically clarified but not fully proven",
    );
    expect(reportClassification({ summary: "deeper issue remains" })).toBe("deeper issue remains");
    expect(reportClassification({ summary: "unknown" })).toBe("deeper issue remains");
    expect(reportClassification(null)).toBe("deeper issue remains");
  });

  it("gates governance and marketplace execution on fixture readiness", () => {
    expect(scenarioGate({ governance: { status: "ready" } }, "governance")).toEqual({
      ready: true,
      reason: "governance proposer role and voting power are ready",
    });
    expect(scenarioGate({ governance: { reason: "voting delay" } }, "governance")).toEqual({
      ready: false,
      reason: "voting delay",
    });
    expect(scenarioGate({}, "governance").reason).toContain("incomplete");

    const fixture = {
      marketplace: {
        agedListingFixture: {
          status: "ready",
          purchaseReadiness: "purchase-ready",
          listing: { readback: { payload: { price: "1000" } } },
        },
        usdcFunding: { buyerBalance: "1000", buyerAllowance: "1000" },
      },
    };
    expect(scenarioGate(fixture, "marketplace-purchase").ready).toBe(true);
    fixture.marketplace.usdcFunding.buyerAllowance = "not-a-number";
    expect(scenarioGate(fixture, "marketplace-purchase")).toEqual({
      ready: false,
      reason: "marketplace fixture, buyer funds, or allowance is incomplete",
    });
  });

  it("builds safe initial output for ready and blocked promotion targets", () => {
    const ready = assessPromotionReadiness(readyEnv());
    expect(baseOutput(readyEnv(), ready)).toEqual(expect.objectContaining({
      target: expect.objectContaining({ network: "base-sepolia", chainId: 84532 }),
      finalClassification: "semantically clarified but not fully proven",
      safety: expect.objectContaining({ destructiveProtocolAdminWrites: "disabled" }),
    }));

    const blockedEnv = { NETWORK: "base-sepolia", CHAIN_ID: "invalid", DIAMOND_ADDRESS: "invalid" };
    expect(baseOutput(blockedEnv, assessPromotionReadiness(blockedEnv, false))).toEqual(expect.objectContaining({
      target: expect.objectContaining({ chainId: null, rpcOrigin: null, diamondAddress: null }),
      finalClassification: "blocked by setup/state",
    }));
  });
});
