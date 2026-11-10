import express from "express";
import {Interface,type Provider} from "ethers";
import {describe,it,expect,vi} from "vitest";
import {approvalInput,prepareUsdcApproval,createApprovalRouter} from "./approval.js";
import {BASE_SEPOLIA_USDC} from "./config.js";
import {loadApiKeys} from "../shared/auth.js";
import {RateLimiter} from "../shared/rate-limit.js";
import type {ApiExecutionContext} from "../shared/execution-context.js";
const wallet="0x00000000000000000000000000000000000000aa",diamond="0x00000000000000000000000000000000000000dd";
const abi=new Interface(["function getUsdcToken() view returns(address)","function getListing(uint256) view returns(tuple(uint256 tokenId,address seller,uint256 price,uint256 createdAt,uint256 createdBlock,uint256 lastUpdateBlock,uint256 expiresAt,bool isActive))","function decimals() view returns(uint8)","function balanceOf(address) view returns(uint256)","function allowance(address,address) view returns(uint256)","function approve(address,uint256) returns(bool)"]);
const body={tokenId:"1",maximumUsdcUnits:"10000001",authorizeApprovalPreparation:true as const};
function fixture(allowance=0n,code="0x",native=10n**18n) {
  const block={number:100,timestamp:Math.floor(Date.now()/1000),hash:"0x"+"ab".repeat(32)};
  const rpc={getNetwork:vi.fn(async()=>({chainId:84532n})),getBlockNumber:vi.fn(async()=>100),getBlock:vi.fn(async()=>block),getBalance:vi.fn(async()=>native),getCode:vi.fn(async()=>code),
    estimateGas:vi.fn(async()=>100_000n),getFeeData:vi.fn(async()=>({maxFeePerGas:2n,gasPrice:1n})),broadcastTransaction:vi.fn(),
    call:vi.fn(async(tx:{data:string})=>{const parsed=abi.parseTransaction(tx)!;const results:Record<string,unknown[]>={getUsdcToken:[BASE_SEPOLIA_USDC],getListing:[[1,"0x00000000000000000000000000000000000000bb",10_000_001n,0,0,0,0,true]],decimals:[6],balanceOf:[20_000_000n],allowance:[allowance]};return abi.encodeFunctionResult(parsed.name,results[parsed.name]);})};
  return {rpc,run:(input=body)=>prepareUsdcApproval(rpc as unknown as Provider,84532,diamond,wallet,input)};
}
describe("bounded customer approval handoff",()=>{
  it("prepares exactly the fresh price to native USDC and the actual spender without broadcasting",async()=>{
    const {rpc,run}=fixture();const result=await run();
    expect(result).toMatchObject({approvalUsdcUnits:"10000001",requiresUserSignature:true,purchaseAuthorized:false,nextStep:"sign_approval_and_confirm_receipt",transaction:{value:"0x0",chainId:"0x14a34"}});
    const tx=result.transaction!;expect(tx.to.toLowerCase()).toBe(BASE_SEPOLIA_USDC);expect(tx.from.toLowerCase()).toBe(wallet);
    const params=abi.decodeFunctionData("approve",tx.data);expect(String(params[0]).toLowerCase()).toBe(diamond);expect(params[1]).toBe(10_000_001n);expect(rpc.broadcastTransaction).not.toHaveBeenCalled();
  });
  it("returns only a zero reset until it is confirmed, including a pre-existing excessive allowance",async()=>{
    for(const value of [1n,2n**256n-1n]) {const result=await fixture(value).run();expect(result).toMatchObject({approvalUsdcUnits:"0",nextStep:"confirm_zero_allowance_then_prepare_again"});expect(abi.decodeFunctionData("approve",result.transaction!.data)[1]).toBe(0n);}
  });
  it("does not request another approval when allowance is already exact",async()=>expect(await fixture(10_000_001n).run()).toMatchObject({transaction:null,nextStep:"approval_already_exact"}));
  it("enforces user price limit, gas and verified signer capability",async()=>{
    await expect(fixture().run({...body,maximumUsdcUnits:"10000000"})).rejects.toThrow("authorized USDC limit");
    await expect(fixture(0n,"0x6000").run()).rejects.toThrow("verified wallet adapter");
    await expect(fixture(0n,"0x",0n).run()).rejects.toThrow("native gas");
  });
  it.each([{...body,authorizeApprovalPreparation:false},{...body,spender:wallet},{...body,maximumUsdcUnits:"0"},{...body,maximumUsdcUnits:"1e18"},{...body,maximumUsdcUnits:(2n**256n).toString()}])("rejects unconsented or substituted input %s",input=>expect(()=>approvalInput.parse(input)).toThrow());
  it("authenticates ownership/write permission before any chain read",async()=>{
    const {rpc}=fixture();const context={config:{chainId:84532,diamondAddress:diamond},apiKeys:loadApiKeys({API_LAYER_KEYS_JSON:JSON.stringify({buyer:{label:"buyer",roles:["buyer"],fundingUserId:"buyer-a",walletAddress:wallet},reader:{label:"reader",roles:["read-only"],fundingUserId:"buyer-a",walletAddress:wallet}})}),rateLimiter:new RateLimiter(),providerRouter:{withProvider:vi.fn(async(_kind:string,_method:string,action:(provider:unknown)=>unknown)=>action(rpc))}} as unknown as ApiExecutionContext;
    const app=express();app.use(express.json());app.use(createApprovalRouter(context));const server=app.listen(0,"127.0.0.1");await new Promise<void>(resolve=>server.once("listening",resolve));const port=(server.address() as {port:number}).port;
    try {
      const call=(key:string,extra={})=>fetch(`http://127.0.0.1:${port}/v1/funding/approval-requests`,{method:"POST",headers:{"content-type":"application/json","x-api-key":key,...extra},body:JSON.stringify(body)});
      expect((await call("reader")).status).toBe(403);expect((await call("buyer",{"x-wallet-address":"0x00000000000000000000000000000000000000cc"})).status).toBe(403);expect(rpc.call).not.toHaveBeenCalled();expect((await call("buyer")).status).toBe(200);expect(rpc.broadcastTransaction).not.toHaveBeenCalled();
    }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
  });
});
