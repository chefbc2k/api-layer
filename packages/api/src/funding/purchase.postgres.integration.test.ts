import {randomUUID} from "node:crypto";
import express from "express";
import {Pool} from "pg";
import {afterAll,describe,it,expect,vi} from "vitest";
import {createPurchaseRouter} from "./purchase.js";
import {FundingStore} from "./store.js";
import {loadApiKeys} from "../shared/auth.js";
import {RateLimiter} from "../shared/rate-limit.js";
import type {ApiExecutionContext} from "../shared/execution-context.js";
const database=process.env.API_LAYER_FUNDING_TEST_DB_URL,wallet="0x00000000000000000000000000000000000000aa";
describe.skipIf(!database)("private durable funding purchase",()=>{
 const pool=new Pool({connectionString:database});afterAll(async()=>{await pool.end();});
 async function setup(){
  const userId="purchase_"+randomUUID().replaceAll("-",""),store=new FundingStore(pool);
  const {attempt}=await store.beginAttempt({userId,kind:"hosted",key:"purchase_test_0001",fingerprint:"b".repeat(64),wallet,chainId:84532,sandbox:true});
  const apiKeys=loadApiKeys({API_LAYER_KEYS_JSON:JSON.stringify(Object.fromEntries(["buyer","role-only-buyer","read-only","founder","admin","operator","seller","licensee","collaborator"].map(role=>[role,{label:role,roles:[role==="role-only-buyer"?"buyer":role],fundingUserId:role==="buyer" || role==="read-only"?userId:undefined,walletAddress:wallet}])))});
  const withProvider=vi.fn(async()=>{throw new Error("Unexpected RPC");});
  const context={config:{chainId:84532,diamondAddress:wallet},apiKeys,rateLimiter:new RateLimiter(),providerRouter:{withProvider}} as unknown as ApiExecutionContext;
  const app=express();app.use(express.json());app.use(createPurchaseRouter(context,pool,true));const server=app.listen(0,"127.0.0.1");await new Promise<void>(resolve=>server.once("listening",resolve));
  const base=`http://127.0.0.1:${(server.address() as {port:number}).port}/v1/funding/purchase-requests`;
  const call=(url=base,key="buyer",body:unknown={fundingAttemptId:attempt.id,tokenId:"1",expectedPriceUsdcUnits:"1",expectedSeller:"0x00000000000000000000000000000000000000bb",authorizePurchase:true},extra={})=>fetch(url,{method:"POST",headers:{"content-type":"application/json","x-api-key":key,...extra},body:JSON.stringify(body)});
  return{userId,attempt,call,base,withProvider,close:async()=>{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}};
 }
 it("requires real verified settlement, exact mode/chain/customer and never calls RPC on invalid funding",async()=>{
  const f=await setup();try{expect((await f.call()).status).toBe(409);await pool.query("UPDATE funding_attempts SET settlement_status='test_verified',user_id='different' WHERE id=$1",[f.attempt.id]);expect((await f.call()).status).toBe(409);await pool.query("UPDATE funding_attempts SET user_id=$2,settlement_status='verified' WHERE id=$1",[f.attempt.id,f.userId]);expect((await f.call()).status).toBe(409);expect(f.withProvider).not.toHaveBeenCalled();}finally{await f.close();}
 });
 it("denies unknown, reader, role-only and substituted wallets on both routes before chain access",async()=>{
  const f=await setup();try{for(const path of [f.base,f.base+"/"+randomUUID()+"/receipt"]){for(const key of ["unknown","role-only-buyer","read-only","founder","admin","operator","seller","licensee","collaborator"]){expect([401,403]).toContain((await f.call(path,key,{})).status);}expect((await f.call(path,"buyer",{},{"x-wallet-address":"0x00000000000000000000000000000000000000cc"})).status).toBe(403);}expect(f.withProvider).not.toHaveBeenCalled();}finally{await f.close();}
 });
 it("keeps receipt lookup owner scoped and prevents duplicate chain transaction attribution in durable SQL",async()=>{
  const f=await setup();try{
   const saved=await pool.query("INSERT INTO funding_purchase_requests(user_id,wallet_address,funding_attempt_id,chain_id,sandbox,intent,expires_at,tx_hash) VALUES($1,$2,$3,84532,true,'{}',now(),$4) RETURNING id",[f.userId,wallet,f.attempt.id,"0x"+"67".repeat(32)]);
   await pool.query("UPDATE funding_purchase_requests SET user_id='other' WHERE id=$1",[saved.rows[0].id]);expect((await f.call(f.base+"/"+saved.rows[0].id+"/receipt","buyer",{txHash:"0x"+"67".repeat(32)})).status).toBe(404);expect(f.withProvider).not.toHaveBeenCalled();
   await expect(pool.query("INSERT INTO funding_purchase_requests(user_id,wallet_address,funding_attempt_id,chain_id,sandbox,intent,expires_at,tx_hash) VALUES($1,$2,$3,84532,true,'{}',now(),$4)",[f.userId,wallet,f.attempt.id,"0x"+"67".repeat(32)])).rejects.toMatchObject({code:"23505"});
   const client=await pool.connect();try{for(const role of ["anon","authenticated"]){await client.query(`SET ROLE ${role}`);await expect(client.query("SELECT * FROM funding_purchase_requests")).rejects.toThrow("permission denied");await client.query("RESET ROLE");}}finally{client.release();}
  }finally{await f.close();}
 });
});
