import express from "express";
import { Interface,type Provider } from "ethers";
import { describe,it,expect,vi } from "vitest";
import { assertFreshReadinessBlock, createReadinessRouter, inspectReadiness } from "./readiness.js";
import { BASE_SEPOLIA_USDC } from "./config.js";
import { loadApiKeys } from "../shared/auth.js";
import type { ApiExecutionContext } from "../shared/execution-context.js";
const wallet="0x00000000000000000000000000000000000000aa",diamond="0x00000000000000000000000000000000000000dd";
const nowMs=Date.parse("2026-10-27T00:00:00Z"),nowSeconds=Math.floor(nowMs/1000);
const abi=new Interface(["function getUsdcToken() view returns(address)","function getListing(uint256) view returns(tuple(uint256 tokenId,address seller,uint256 price,uint256 createdAt,uint256 createdBlock,uint256 lastUpdateBlock,uint256 expiresAt,bool isActive))","function decimals() view returns(uint8)","function balanceOf(address) view returns(uint256)","function allowance(address,address) view returns(uint256)"]);
function fixture(patch:Record<string,unknown>={}) {
  const settings={chain:84532,token:BASE_SEPOLIA_USDC,decimals:6,balance:10_000_001n,allowance:10_000_001n,price:10_000_001n,native:10n**18n,code:"0x",active:true,expiry:0n,blockNumber:100,blockTimestamp:nowSeconds,blockHashes:["0xblock","0xblock"],maxFee:2n,gasPrice:1n,...patch};
  const call=vi.fn(async (tx:{data:string})=>{
    const parsed=abi.parseTransaction(tx)!;
    const values:Record<string,unknown[]>={getUsdcToken:[settings.token],getListing:[[1,"0x00000000000000000000000000000000000000bb",settings.price,0,0,0,settings.expiry,settings.active]],decimals:[settings.decimals],balanceOf:[settings.balance],allowance:[settings.allowance]};
    return abi.encodeFunctionResult(parsed.name,values[parsed.name]);
  });
  let blockRead=0;
  const rpc={getNetwork:vi.fn(async()=>({chainId:BigInt(settings.chain)})),getBlockNumber:vi.fn(async()=>100),getBlock:vi.fn(async()=>({number:settings.blockNumber,timestamp:settings.blockTimestamp,hash:settings.blockHashes[Math.min(blockRead++,settings.blockHashes.length-1)]})),call,getBalance:vi.fn(async()=>settings.native),getCode:vi.fn(async()=>settings.code),estimateGas:vi.fn(async()=>100_000n),getFeeData:vi.fn(async()=>({maxFeePerGas:settings.maxFee,gasPrice:settings.gasPrice}))};
  return {rpc,run:()=>inspectReadiness(rpc as unknown as Provider,84532,diamond,wallet,"1",nowMs)};
}

async function getReadiness(options:{apiKey?:string;walletHeader?:string;tokenId?:string;rateLimitError?:Error;providerError?:Error}={}) {
  const {rpc}=fixture({blockTimestamp:Math.floor(Date.now()/1000)});
  const withProvider=vi.fn(async(_kind:string,_method:string,action:(provider:unknown)=>unknown)=>{
    if(options.providerError) throw options.providerError;
    return action(rpc);
  });
  const rateLimiter={enforce:vi.fn(async()=>{if(options.rateLimitError) throw options.rateLimitError;})};
  const context={
    apiKeys:loadApiKeys({API_LAYER_KEYS_JSON:JSON.stringify({buyer:{label:"buyer",roles:["read-only"],fundingUserId:"buyer-a",walletAddress:wallet}})}),
    config:{chainId:84532,diamondAddress:diamond},rateLimiter,providerRouter:{withProvider},
  } as unknown as ApiExecutionContext;
  const app=express();app.use(createReadinessRouter(context));
  const server=app.listen(0,"127.0.0.1");await new Promise<void>(resolve=>server.once("listening",resolve));
  const url=new URL(`http://127.0.0.1:${(server.address() as {port:number}).port}/v1/funding/readiness`);
  if(options.tokenId!==undefined) url.searchParams.set("tokenId",options.tokenId);
  try {
    const response=await fetch(url,{headers:{...(options.apiKey?{"x-api-key":options.apiKey}:{}),...(options.walletHeader?{"x-wallet-address":options.walletHeader}:{})}});
    return {response,body:await response.json(),withProvider,rateLimiter};
  } finally {server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
}
describe("live customer wallet readiness",()=>{
  it("reads exact USDC units and actual diamond allowance, estimates bounded gas without authorizing a purchase",async()=>{
    const {rpc,run}=fixture(); const result=await run();
    expect(result).toMatchObject({requiredUsdcUnits:"10000001",balanceUsdcUnits:"10000001",allowanceUsdcUnits:"10000001",gasUnits:"120000",gasBudgetWei:"240000",readiness:"ready_for_user_signature",purchaseAuthorized:false,settlementStatus:"unverified"});
    const allowance=rpc.call.mock.calls.map(([tx])=>abi.parseTransaction(tx)).find(tx=>tx?.name==="allowance")!;
    expect(String(allowance.args[1]).toLowerCase()).toBe(diamond);
    expect(rpc.estimateGas).toHaveBeenCalledWith(expect.objectContaining({to:expect.stringMatching(/dd$/i),from:expect.stringMatching(/aa$/i)}));
  });
  it.each([{balance:10_000_000n},{allowance:10_000_000n}])("reports insufficient units before gas estimation %s",async patch=>{
    const {rpc,run}=fixture(patch);expect((await run()).readiness).toBe("action_required"); expect(rpc.estimateGas).not.toHaveBeenCalled();
  });
  it("does not treat global relay configuration as customer sponsorship",async()=>{
    const {rpc,run}=fixture({code:"0x6000"});expect((await run()).blockers).toContain("customer_sponsorship_unverified");expect(rpc.estimateGas).not.toHaveBeenCalled();
  });
  it("reports gas shortage and failed simulations explicitly",async()=>{
    expect((await fixture({native:1n}).run()).blockers).toContain("insufficient_gas");
    const {rpc,run}=fixture();rpc.estimateGas.mockRejectedValueOnce(new Error("private provider error"));
    expect((await run()).blockers).toEqual(["purchase_simulation_unavailable"]);
  });
  it("falls back to legacy gas price and fails closed when fee data is unavailable",async()=>{
    expect(await fixture({maxFee:null,gasPrice:3n}).run()).toMatchObject({gasBudgetWei:"360000",readiness:"ready_for_user_signature"});
    expect((await fixture({maxFee:null,gasPrice:null}).run()).blockers).toEqual(["purchase_simulation_unavailable"]);
  });
  it("fails when the initial snapshot block cannot be read",async()=>{
    const {rpc,run}=fixture();rpc.getBlock.mockResolvedValueOnce(null as never);
    await expect(run()).rejects.toThrow("Readiness block unavailable");
  });
  it("fails closed when the confirmation block is unavailable",async()=>{
    const {rpc,run}=fixture();
    rpc.getBlock.mockResolvedValueOnce({number:100,timestamp:nowSeconds,hash:"0xblock"} as never).mockResolvedValueOnce(null as never);
    await expect(run()).rejects.toThrow("stale or inconsistent");
  });
  it.each([{chain:1},{token:wallet},{decimals:18},{active:false},{expiry:999n},{price:0n}])("rejects wrong deployment or unavailable listing %s",async patch=>{
    await expect(fixture(patch).run()).rejects.toThrow();
  });
  it.each([
    [{blockNumber:99},0],
    [{blockTimestamp:nowSeconds-301},0],
    [{blockTimestamp:nowSeconds+31},0],
    [{blockHashes:["0xfirst","0xsecond"]},0],
  ] as const)("fails closed for stale, future, mismatched, or reorged RPC snapshots %#",async (patch,gasCalls)=>{
    const {rpc,run}=fixture(patch);
    await expect(run()).rejects.toThrow("stale or inconsistent");
    expect(rpc.estimateGas).toHaveBeenCalledTimes(gasCalls);
  });
  it("enforces the exact freshness boundaries",()=>{
    expect(()=>assertFreshReadinessBlock({number:100,timestamp:nowSeconds-300,hash:"0xhash"},100,nowMs)).not.toThrow();
    expect(()=>assertFreshReadinessBlock({number:100,timestamp:nowSeconds+30,hash:"0xhash"},100,nowMs)).not.toThrow();
  });
});

describe("funding readiness HTTP route",()=>{
  it("returns the snapshot for an authenticated bound customer",async()=>{
    const {response,body,withProvider,rateLimiter}=await getReadiness({apiKey:"buyer",tokenId:"1"});
    expect(response.status).toBe(200);
    expect(body).toMatchObject({walletAddress:"0x00000000000000000000000000000000000000AA",tokenId:"1",readiness:"ready_for_user_signature",purchaseAuthorized:false});
    expect(rateLimiter.enforce).toHaveBeenCalledWith("read","funding:buyer-a");
    expect(withProvider).toHaveBeenCalledWith("read","funding.readiness",expect.any(Function));
  });

  it.each([
    {name:"missing API key",options:{tokenId:"1"},status:401},
    {name:"malformed token ID",options:{apiKey:"buyer",tokenId:"01"},status:400},
    {name:"token ID over uint256",options:{apiKey:"buyer",tokenId:(2n**256n).toString()},status:400},
    {name:"mismatched wallet",options:{apiKey:"buyer",tokenId:"1",walletHeader:"0x00000000000000000000000000000000000000cc"},status:403},
  ])("rejects $name before returning a readiness snapshot",async({options,status})=>{
    const {response,withProvider}=await getReadiness(options);
    expect(response.status).toBe(status);
    expect(withProvider).not.toHaveBeenCalled();
  });

  it("returns the rate limiter status and sanitizes provider failures",async()=>{
    const limited=await getReadiness({apiKey:"buyer",tokenId:"1",rateLimitError:new Error("rate limit exceeded")});
    expect(limited.response.status).toBe(429);
    expect(limited.withProvider).not.toHaveBeenCalled();

    const unavailable=await getReadiness({apiKey:"buyer",tokenId:"1",providerError:new Error("private RPC endpoint secret")});
    expect(unavailable.response.status).toBe(500);
    expect(unavailable.body).toEqual({error:"Funding readiness unavailable"});
  });
});
