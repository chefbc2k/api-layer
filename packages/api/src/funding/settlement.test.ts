import {Interface,type Provider} from "ethers";
import type {Pool,QueryResult} from "pg";
import {describe,it,expect,vi} from "vitest";
import {FundingSettlementProcessor,verifyUsdcReceipt,SettlementPending} from "./settlement.js";
import {BASE_USDC,BASE_SEPOLIA_USDC} from "./config.js";
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
  it("rejects a matching-topic transfer that the ABI parser cannot decode",async()=>{
    const fixture=receiptFixture();
    const parseLog=vi.spyOn(Interface.prototype,"parseLog").mockReturnValue(null);
    try {await expect(fixture.run()).rejects.toThrow("invalid_transfer_log");}
    finally {parseLog.mockRestore();}
  });
});

type Attempt={id:string;provider_tx_hash:string|null;expected_usdc_units:string|null;wallet_address:string;sandbox:boolean};

function processorFixture(options:{attempt?:Attempt|null;chainId?:number;insertError?:Error;selectError?:Error;providerError?:Error}={}) {
  const {receipt,rpc,expected}=receiptFixture();
  const chainId=options.chainId??84532;
  const token=chainId===8453?BASE_USDC:BASE_SEPOLIA_USDC;
  receipt.logs[0].address=token;
  rpc.getNetwork.mockResolvedValue({chainId:BigInt(chainId)} as never);
  const attempt=options.attempt===undefined?{
    id:"attempt-1",provider_tx_hash:expected.txHash,expected_usdc_units:expected.amountUnits.toString(),wallet_address:wallet,sandbox:false,
  }:options.attempt;
  const query=vi.fn(async(sql:string,values?:unknown[]):Promise<QueryResult>=>{
    if(sql.startsWith("SELECT * FROM funding_attempts")) {
      if(options.selectError) throw options.selectError;
      return {rows:attempt?[attempt]:[],rowCount:attempt?1:0,command:"SELECT",oid:0,fields:[]} as QueryResult;
    }
    if(sql.startsWith("INSERT INTO funding_settlements")&&options.insertError) throw options.insertError;
    return {rows:[],rowCount:0,command:"",oid:0,fields:[]} as QueryResult;
  });
  const client={query,release:vi.fn()};
  const pool={connect:vi.fn(async()=>client)};
  const provider=options.providerError?{
    getNetwork:vi.fn(async()=>({chainId:BigInt(chainId)})),
    getTransactionReceipt:vi.fn(async()=>{throw options.providerError;}),
    getBlock:rpc.getBlock,
  }:rpc;
  const worker=new FundingSettlementProcessor(pool as unknown as Pool,provider as unknown as Provider,chainId);
  return {worker,query,client,pool,provider,attempt};
}

describe("durable funding settlement processor decisions",()=>{
  it("commits no-op when no completed attempt is due",async()=>{
    const {worker,query,client}=processorFixture({attempt:null});
    await expect(worker.runOne()).resolves.toBe("idle");
    expect(query).toHaveBeenCalledTimes(3);
    expect(query.mock.calls.map(([sql])=>sql)).toEqual(["BEGIN",expect.stringContaining("FOR UPDATE SKIP LOCKED"),"COMMIT"]);
    expect(client.release).toHaveBeenCalledOnce();
  });

  it.each([
    {sandbox:false,chainId:8453,result:"verified" as const},
    {sandbox:true,chainId:84532,result:"test_verified" as const},
  ])("persists a verified $sandbox settlement",async({sandbox,chainId,result})=>{
    const {worker,query}=processorFixture({chainId,attempt:{id:"attempt-1",provider_tx_hash:hash,expected_usdc_units:"10000001",wallet_address:wallet,sandbox}});
    await expect(worker.runOne()).resolves.toBe(result);
    const insert=query.mock.calls.find(([sql])=>sql.startsWith("INSERT INTO funding_settlements"));
    expect(insert?.[1]).toEqual(["attempt-1",chainId,hash,3,10,blockHash,chainId===8453?BASE_USDC:BASE_SEPOLIA_USDC,wallet,"10000001",sandbox]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("settlement_status=$2"),["attempt-1",result]);
    expect(query).toHaveBeenLastCalledWith("COMMIT");
  });

  it("records pending metadata with a short retry",async()=>{
    const {worker,query}=processorFixture({attempt:{id:"attempt-1",provider_tx_hash:null,expected_usdc_units:"10000001",wallet_address:wallet,sandbox:false}});
    await expect(worker.runOne()).resolves.toBe("pending");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("settlement_error=$2"),["attempt-1","provider_receipt_metadata_pending",30]);
    expect(query.mock.calls.some(([sql])=>sql.startsWith("INSERT INTO funding_settlements"))).toBe(false);
    expect(query).toHaveBeenLastCalledWith("COMMIT");
  });

  it.each([
    {name:"identity collision",chainId:8453,insertError:Object.assign(new Error("duplicate"),{code:"23505"}),category:"settlement_identity_conflict"},
    {name:"invalid settlement evidence",attempt:{id:"attempt-1",provider_tx_hash:"bad",expected_usdc_units:"10000001",wallet_address:wallet,sandbox:false},category:"invalid_settlement_expectation"},
    {name:"unexpected provider failure",providerError:new Error("rpc timeout"),category:"settlement_rpc_unavailable"},
  ])("rolls back the savepoint and records $name",async({chainId,insertError,attempt,providerError,category})=>{
    const {worker,query}=processorFixture({chainId,insertError,attempt,providerError});
    await expect(worker.runOne()).resolves.toBe("attention");
    expect(query).toHaveBeenCalledWith("ROLLBACK TO SAVEPOINT settle_attempt");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("settlement_error=$2"),["attempt-1",category,3600]);
    expect(query).toHaveBeenLastCalledWith("COMMIT");
  });

  it("rejects production verification on the Base Sepolia chain",async()=>{
    const {worker,query}=processorFixture({chainId:84532,attempt:{id:"attempt-1",provider_tx_hash:hash,expected_usdc_units:"10000001",wallet_address:wallet,sandbox:false}});
    await expect(worker.runOne()).resolves.toBe("attention");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("settlement_error=$2"),["attempt-1","settlement_chain_mismatch",3600]);
  });

  it("rolls back the outer transaction on database failure and always releases",async()=>{
    const failure=new Error("database unavailable");
    const {worker,query,client}=processorFixture({selectError:failure});
    await expect(worker.runOne()).rejects.toBe(failure);
    expect(query).toHaveBeenCalledWith("ROLLBACK");
    expect(client.release).toHaveBeenCalledOnce();
  });
});
