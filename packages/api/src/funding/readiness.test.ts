import { Interface,type Provider } from "ethers";
import { describe,it,expect,vi } from "vitest";
import { inspectReadiness } from "./readiness.js";
import { BASE_SEPOLIA_USDC } from "./config.js";
const wallet="0x00000000000000000000000000000000000000aa",diamond="0x00000000000000000000000000000000000000dd";
const abi=new Interface(["function getUsdcToken() view returns(address)","function getListing(uint256) view returns(tuple(uint256 tokenId,address seller,uint256 price,uint256 createdAt,uint256 createdBlock,uint256 lastUpdateBlock,uint256 expiresAt,bool isActive))","function decimals() view returns(uint8)","function balanceOf(address) view returns(uint256)","function allowance(address,address) view returns(uint256)"]);
function fixture(patch:Record<string,unknown>={}) {
  const settings={chain:84532,token:BASE_SEPOLIA_USDC,decimals:6,balance:10_000_001n,allowance:10_000_001n,price:10_000_001n,native:10n**18n,code:"0x",active:true,expiry:0n,...patch};
  const call=vi.fn(async (tx:{data:string})=>{
    const parsed=abi.parseTransaction(tx)!;
    const values:Record<string,unknown[]>={getUsdcToken:[settings.token],getListing:[[1,"0x00000000000000000000000000000000000000bb",settings.price,0,0,0,settings.expiry,settings.active]],decimals:[settings.decimals],balanceOf:[settings.balance],allowance:[settings.allowance]};
    return abi.encodeFunctionResult(parsed.name,values[parsed.name]);
  });
  const rpc={getNetwork:vi.fn(async()=>({chainId:BigInt(settings.chain)})),getBlockNumber:vi.fn(async()=>100),getBlock:vi.fn(async()=>({timestamp:1000,hash:"0xblock"})),call,getBalance:vi.fn(async()=>settings.native),getCode:vi.fn(async()=>settings.code),estimateGas:vi.fn(async()=>100_000n),getFeeData:vi.fn(async()=>({maxFeePerGas:2n,gasPrice:1n}))};
  return {rpc,run:()=>inspectReadiness(rpc as unknown as Provider,84532,diamond,wallet,"1")};
}
describe("live customer wallet readiness",()=>{
  it("reads exact USDC units and actual diamond allowance, estimates bounded gas without authorizing a purchase",async()=>{
    const {rpc,run}=fixture(); const result=await run();
    expect(result).toMatchObject({requiredUsdcUnits:"10000001",balanceUsdcUnits:"10000001",allowanceUsdcUnits:"10000001",gasUnits:"120000",gasBudgetWei:"240000",readiness:"ready_for_user_signature",purchaseAuthorized:false,settlementStatus:"unverified"});
    const allowance=rpc.call.mock.calls.map(([tx])=>abi.parseTransaction(tx)).find(tx=>tx?.name==="allowance")!;
    expect(String(allowance.args[1]).toLowerCase()).toBe(diamond);
    expect(rpc.estimateGas).toHaveBeenCalledWith(expect.objectContaining({to:expect.stringMatching(/dd$/i),from:expect.stringMatching(/aa$/i)}));
  });
  it.each([{balance:10_000_000n},{allowance:10_000_000n}])("reports insufficient units before gas estimation %j",async patch=>{
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
  it.each([{chain:1},{token:wallet},{decimals:18},{active:false},{expiry:999n},{price:0n}])("rejects wrong deployment or unavailable listing %j",async patch=>{
    await expect(fixture(patch).run()).rejects.toThrow();
  });
});
