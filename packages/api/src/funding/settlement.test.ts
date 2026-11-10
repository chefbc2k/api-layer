import {Interface,type Provider} from "ethers";
import {describe,it,expect,vi} from "vitest";
import {verifyUsdcReceipt,SettlementPending} from "./settlement.js";
import {BASE_SEPOLIA_USDC} from "./config.js";
const event=new Interface(["event Transfer(address indexed from,address indexed to,uint256 value)"]);
const wallet="0x00000000000000000000000000000000000000aa",hash="0x"+"11".repeat(32),blockHash="0x"+"22".repeat(32),finalHash="0x"+"33".repeat(32);
export function receiptFixture(amount=10_000_001n) {
  const encoded=event.encodeEventLog(event.getEvent("Transfer")!,["0x00000000000000000000000000000000000000bb",wallet,amount]);
  const receipt={status:1,hash,blockNumber:10,blockHash,logs:[{address:BASE_SEPOLIA_USDC,index:3,removed:false,...encoded}]};
  const rpc={getNetwork:vi.fn(async()=>({chainId:84532n})),getTransactionReceipt:vi.fn(async()=>receipt),getBlock:vi.fn(async(tag:unknown)=>tag===10?{number:10,hash:blockHash}:{number:64,hash:finalHash})};
  const expected={chainId:84532,txHash:hash,recipient:wallet,amountUnits:amount};
  return {receipt,rpc,expected,run:()=>verifyUsdcReceipt(rpc as unknown as Provider,expected)};
}
describe("exact finalized USDC receipt verification",()=>{
  it("returns a precise unique transfer identity without rounding",async()=>{
    const {run}=receiptFixture(1_000_000_000_000_000_001n);
    expect(await run()).toMatchObject({txHash:hash,logIndex:3,tokenAddress:BASE_SEPOLIA_USDC,recipient:wallet,amountUnits:"1000000000000000001",blockHash,finalizedBlockNumber:64});
  });
  it.each(["chain","hash","token","recipient","amount","failed","duplicate"])("rejects mismatched %s evidence",async mode=>{
    const {receipt,rpc,expected,run}=receiptFixture();
    if(mode==="chain") expected.chainId=8453;
    if(mode==="hash") receipt.hash="0x"+"44".repeat(32);
    if(mode==="token") receipt.logs[0].address=wallet;
    if(mode==="recipient") expected.recipient="0x00000000000000000000000000000000000000cc";
    if(mode==="amount") expected.amountUnits--;
    if(mode==="failed") receipt.status=0;
    if(mode==="duplicate") receipt.logs.push({...receipt.logs[0],index:4});
    await expect(run()).rejects.toThrow();expect(rpc.getTransactionReceipt.mock.calls.length).toBeLessThanOrEqual(1);
  });
  it("waits for a receipt and never substitutes latest for finalized",async()=>{
    const {rpc,run}=receiptFixture();rpc.getTransactionReceipt.mockResolvedValueOnce(null as never);
    await expect(run()).rejects.toBeInstanceOf(SettlementPending);
    rpc.getBlock.mockImplementationOnce(async()=>({number:9,hash:finalHash}));
    await expect(run()).rejects.toBeInstanceOf(SettlementPending);
    expect(rpc.getBlock.mock.calls[0][0]).toBe("finalized");
  });
  it("rejects removed or reorged logs before recording settlement",async()=>{
    const {receipt,rpc,run}=receiptFixture();receipt.logs[0].removed=true;await expect(run()).rejects.toBeInstanceOf(SettlementPending);
    receipt.logs[0].removed=false;rpc.getBlock.mockResolvedValueOnce({number:64,hash:finalHash}).mockResolvedValueOnce({number:10,hash:"0xwrong"});
    await expect(run()).rejects.toBeInstanceOf(SettlementPending);
  });
  it("detects block identity changing during verification",async()=>{
    const {rpc,run}=receiptFixture();rpc.getBlock.mockResolvedValueOnce({number:64,hash:finalHash}).mockResolvedValueOnce({number:10,hash:blockHash}).mockResolvedValueOnce({number:10,hash:"0xchanged"});
    await expect(run()).rejects.toBeInstanceOf(SettlementPending);
  });
  it("does not accept unavailable finality or invalid amounts",async()=>{
    const {rpc,expected,run}=receiptFixture();rpc.getBlock.mockRejectedValueOnce(new Error("finalized unsupported"));await expect(run()).rejects.toThrow();
    expected.amountUnits=0n;await expect(run()).rejects.toThrow("invalid_settlement_expectation");
  });
});
