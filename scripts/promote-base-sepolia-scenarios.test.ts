import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { EventEmitter } from "node:events";
import { tmpdir } from "node:os";
import { Wallet } from "ethers";
import { describe, expect, it, vi } from "vitest";

import path from "node:path";

import {
  assessPromotionReadiness,
  baseOutput,
  collectPromotionEvidence,
  inspectPromotionLiveTarget,
  reportClassification,
  resolvePromotionEnvPath,
  runPromotion,
  runCommand,
  safeBigInt,
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
});

describe("Base Sepolia promotion report decisions",()=>{
  it("checks chain and diamond code, fails closed, and always closes the provider",async()=>{
    const makeProvider=(chainId:number|bigint,code:string)=>({
      getNetwork:vi.fn().mockResolvedValue({chainId}),
      getCode:vi.fn().mockResolvedValue(code),
      destroy:vi.fn().mockResolvedValue(undefined),
    });
    const ready=makeProvider(84532n,"0x6000");
    await expect(inspectPromotionLiveTarget(ready,"0xdiamond")).resolves.toEqual({checked:true,chainId:84532,diamondCodePresent:true,error:null,ready:true});
    expect(ready.getCode).toHaveBeenCalledWith("0xdiamond");expect(ready.destroy).toHaveBeenCalledOnce();

    const wrongChain=makeProvider(1,"0x6000");
    await expect(inspectPromotionLiveTarget(wrongChain,"0xdiamond")).resolves.toMatchObject({ready:false,chainId:1,diamondCodePresent:true});
    const noCode=makeProvider(84532,"0x");
    await expect(inspectPromotionLiveTarget(noCode,"0xdiamond")).resolves.toMatchObject({ready:false,chainId:84532,diamondCodePresent:false});

    const failed={getNetwork:vi.fn().mockRejectedValue(new Error("provider unavailable")),getCode:vi.fn(),destroy:vi.fn().mockResolvedValue(undefined)};
    await expect(inspectPromotionLiveTarget(failed,"0xdiamond")).resolves.toMatchObject({ready:false,chainId:null,error:"provider unavailable"});
    expect(failed.destroy).toHaveBeenCalledOnce();
    const nonError={getNetwork:vi.fn().mockRejectedValue("rpc offline"),getCode:vi.fn(),destroy:vi.fn().mockResolvedValue(undefined)};
    await expect(inspectPromotionLiveTarget(nonError,"0xdiamond")).resolves.toMatchObject({ready:false,error:"rpc offline"});
  });

  it("classifies only known scenario report summaries",()=>{
    expect(reportClassification(null)).toBe("deeper issue remains");
    expect(reportClassification({summary:"unexpected"})).toBe("deeper issue remains");
    for(const summary of ["proven working","blocked by setup/state","semantically clarified but not fully proven","deeper issue remains"] as const) {
      expect(reportClassification({summary})).toBe(summary);
    }
  });

  it("parses integer evidence and safely maps malformed input to zero",()=>{
    expect(safeBigInt("42")).toBe(42n);
    expect(safeBigInt(17)).toBe(17n);
    expect(safeBigInt(23n)).toBe(23n);
    expect(safeBigInt("not an integer")).toBe(0n);
    expect(safeBigInt({amount:"24"})).toBe(0n);
  });

  it("gates governance and marketplace scenarios on their fixture-specific prerequisites",()=>{
    expect(scenarioGate({governance:{status:"ready"}},"governance")).toEqual({ready:true,reason:"governance proposer role and voting power are ready"});
    expect(scenarioGate({governance:{status:"blocked",reason:"role missing"}},"governance")).toEqual({ready:false,reason:"role missing"});
    expect(scenarioGate({},"governance")).toEqual({ready:false,reason:"governance readiness is incomplete"});

    const fixture={marketplace:{agedListingFixture:{status:"ready",purchaseReadiness:"purchase-ready",listing:{readback:{payload:{price:"100"}}}},usdcFunding:{buyerBalance:"100",buyerAllowance:"120"}}};
    expect(scenarioGate(fixture,"marketplace-purchase")).toEqual({ready:true,reason:"aged listing, buyer funds, and allowance are ready"});
    expect(scenarioGate({marketplace:{agedListingFixture:{status:"blocked",reason:"listing expired"}}},"marketplace-purchase")).toEqual({ready:false,reason:"listing expired"});
    expect(scenarioGate({},"marketplace-purchase")).toEqual({ready:false,reason:"marketplace fixture, buyer funds, or allowance is incomplete"});
    expect(scenarioGate({marketplace:{agedListingFixture:{status:"ready",purchaseReadiness:"purchase-ready",listing:{readback:{payload:{price:"100"}}}},usdcFunding:{buyerBalance:"99",buyerAllowance:"100"}}},"marketplace-purchase").ready).toBe(false);
  });

  it("builds a sanitized target summary and a blocked classification for invalid configuration",()=>{
    const readiness=assessPromotionReadiness(readyEnv());
    expect(baseOutput(readyEnv(),readiness)).toMatchObject({
      target:{network:"base-sepolia",chainId:84532,rpcOrigin:"https://base-sepolia.example.invalid",diamondAddress:"0xa14088AcbF0639EF1C3655768a3001E6B8DC9669"},
      safety:{destructiveProtocolAdminWrites:"disabled"},
      finalClassification:"semantically clarified but not fully proven",
    });
    expect(baseOutput({NETWORK:"base-sepolia",CHAIN_ID:"invalid",RPC_URL:"not a URL",DIAMOND_ADDRESS:"0xdead"},assessPromotionReadiness({},false))).toMatchObject({
      target:{network:"base-sepolia",chainId:null,rpcOrigin:null,diamondAddress:null},
      finalClassification:"blocked by setup/state",
    });
  });
});

describe("Base Sepolia promotion CLI safety",()=>{
  it("runs the read-only preflight with an injected provider and writes only to the requested path",async()=>{
    const isolatedCwd=mkdtempSync(path.join(tmpdir(),"base-sepolia-preflight-"));
    const envPath=path.join(isolatedCwd,"promotion.env");const outputPath=path.join(isolatedCwd,"report.json");
    const previousExitCode=process.exitCode;
    try {
      writeFileSync(envPath,Object.entries(readyEnv()).map(([key,value])=>`${key}=${value}`).join("\n"));
      const provider={getNetwork:vi.fn().mockResolvedValue({chainId:84532n}),getCode:vi.fn().mockResolvedValue("0x6000"),destroy:vi.fn().mockResolvedValue(undefined)};
      await runPromotion({envPath,outputPath,argv:["--preflight"],providerFactory:()=>provider});
      const report=JSON.parse(readFileSync(outputPath,"utf8"));
      expect(report).toMatchObject({liveTarget:{checked:true,chainId:84532,diamondCodePresent:true,error:null},finalClassification:"semantically clarified but not fully proven"});
      expect(provider.getCode).toHaveBeenCalledWith(readyEnv().DIAMOND_ADDRESS);expect(provider.destroy).toHaveBeenCalledOnce();
    } finally {process.exitCode=previousExitCode;rmSync(isolatedCwd,{recursive:true,force:true});}
  });

  it("writes a blocked report when the live target is wrong and restores the process exit code",async()=>{
    const isolatedCwd=mkdtempSync(path.join(tmpdir(),"base-sepolia-wrong-target-"));
    const envPath=path.join(isolatedCwd,"promotion.env");const outputPath=path.join(isolatedCwd,"report.json");
    const previousExitCode=process.exitCode;
    try {
      writeFileSync(envPath,Object.entries(readyEnv()).map(([key,value])=>`${key}=${value}`).join("\n"));
      const provider={getNetwork:vi.fn().mockResolvedValue({chainId:1}),getCode:vi.fn().mockResolvedValue("0x6000"),destroy:vi.fn().mockResolvedValue(undefined)};
      await runPromotion({envPath,outputPath,argv:["--preflight"],providerFactory:()=>provider});
      const report=JSON.parse(readFileSync(outputPath,"utf8"));
      expect(report).toMatchObject({readiness:{status:"blocked"},liveTarget:{checked:true,chainId:1,diamondCodePresent:true},finalClassification:"blocked by setup/state"});
      expect(process.exitCode).toBe(2);expect(provider.destroy).toHaveBeenCalledOnce();
    } finally {process.exitCode=previousExitCode;rmSync(isolatedCwd,{recursive:true,force:true});}
  });

  it("writes a blocked report and exits before creating a provider when approval configuration is absent",()=>{
    const project=process.cwd();
    const isolatedCwd=mkdtempSync(path.join(tmpdir(),"base-sepolia-promotion-blocked-"));
    try {
      const result=spawnSync(path.join(project,"node_modules/.bin/tsx"),[
        path.join(project,"scripts/promote-base-sepolia-scenarios.ts"),
      ],{
        cwd:isolatedCwd,
        env:{...process.env,API_LAYER_BASE_SEPOLIA_ENV_PATH:path.join(isolatedCwd,"missing.env")},
        encoding:"utf8",
        timeout:15_000,
      });
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(2);
      const report=JSON.parse(readFileSync(path.join(isolatedCwd,"verify-base-sepolia-promotion-output.json"),"utf8"));
      expect(report).toMatchObject({
        readiness:{status:"blocked"},
        liveTarget:{checked:false},
        scenarios:[],
        finalClassification:"blocked by setup/state",
      });
      expect(report.readiness.blockers).toEqual(expect.arrayContaining([
        expect.stringContaining("env-file"),
        expect.stringContaining("explicit-live-opt-in"),
      ]));
      expect(result.stderr).toContain("\"status\": \"blocked\"");
    } finally {rmSync(isolatedCwd,{recursive:true,force:true});}
  });

  it("maps child process exit and spawn errors into stable runner results",async()=>{
    const exitChild=new EventEmitter();
    const spawnProcess=vi.fn(()=>exitChild as never);
    const exitResult=runCommand("pnpm",["run","safe-check"],{NETWORK:"base-sepolia"},spawnProcess as unknown as typeof spawn);
    expect(spawnProcess).toHaveBeenCalledWith("pnpm",["run","safe-check"],expect.objectContaining({cwd:process.cwd(),env:{NETWORK:"base-sepolia"},stdio:"inherit"}));
    exitChild.emit("exit",null,null);
    await expect(exitResult).resolves.toBe(1);

    const errorChild=new EventEmitter();
    const errorSpawn=vi.fn(()=>errorChild as never);
    const failure=new Error("executable unavailable");
    const errorResult=runCommand("missing",[],{},errorSpawn as unknown as typeof spawn);
    errorChild.emit("error",failure);
    await expect(errorResult).rejects.toBe(failure);
  });
});
