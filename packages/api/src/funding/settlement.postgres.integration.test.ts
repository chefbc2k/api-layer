import {randomBytes,randomUUID} from "node:crypto";
import {Interface,type Provider} from "ethers";
import {Pool} from "pg";
import {describe,it,expect,beforeEach,afterAll} from "vitest";
import {FundingStore} from "./store.js";
import {FundingSettlementProcessor} from "./settlement.js";
import {BASE_USDC} from "./config.js";
const database=process.env.API_LAYER_FUNDING_TEST_DB_URL;
const event=new Interface(["event Transfer(address indexed from,address indexed to,uint256 value)"]);
const wallet="0x00000000000000000000000000000000000000aa";
describe.skipIf(!database)("unique durable USDC settlement",()=>{
  const pool=new Pool({connectionString:database}),store=new FundingStore(pool);afterAll(async()=>{await pool.end();});
  beforeEach(async()=>{await pool.query("UPDATE funding_attempts SET settlement_next_at=now()+interval '100 years'");});
  async function fixture(sandbox=false,txHash="0x"+randomBytes(32).toString("hex")) {
    const userId="settlement_"+randomUUID().replaceAll("-","");
    const {attempt}=await store.beginAttempt({userId,kind:"hosted",key:"settlement_key_001",fingerprint:"a".repeat(64),wallet,chainId:8453,sandbox});
    await pool.query("UPDATE funding_attempts SET state='ready',provider_status='ONRAMP_ORDER_STATUS_COMPLETED',provider_tx_hash=$2,expected_usdc_units=10000001 WHERE id=$1",[attempt.id,txHash]);
    const encoded=event.encodeEventLog(event.getEvent("Transfer")!,["0x00000000000000000000000000000000000000bb",wallet,10_000_001n]);
    const blockHash="0x"+"33".repeat(32),finalHash="0x"+"44".repeat(32);
    const receipt={status:1,hash:txHash,blockHash,blockNumber:10,logs:[{address:BASE_USDC,index:0,removed:false,...encoded}]};
    const rpc={getNetwork:async()=>({chainId:8453n}),getTransactionReceipt:async()=>receipt,getBlock:async(tag:unknown)=>tag===10?{number:10,hash:blockHash}:{number:64,hash:finalHash}};
    return {attempt,userId,txHash,receipt,rpc,worker:new FundingSettlementProcessor(pool,rpc as unknown as Provider,8453)};
  }
  it("records exactly once with concurrent workers and preserves the result across restart",async()=>{
    const {attempt,userId,worker}=await fixture();expect((await Promise.all([worker.runOne(),worker.runOne()])).sort()).toEqual(["idle","verified"]);
    const restarted=new Pool({connectionString:database});try {
      expect((await new FundingStore(restarted).getAttempt(attempt.id,userId))?.settlement_status).toBe("verified");
      expect((await restarted.query("SELECT amount_units::text,recipient,log_index FROM funding_settlements WHERE attempt_id=$1",[attempt.id])).rows[0]).toEqual({amount_units:"10000001",recipient:wallet,log_index:0});
    }finally{await restarted.end();}
    expect(await worker.runOne()).toBe("idle");
  });
  it("never labels sandbox evidence as production verification",async()=>{
    const {attempt,userId,worker}=await fixture(true);expect(await worker.runOne()).toBe("test_verified");expect((await store.getAttempt(attempt.id,userId))?.settlement_status).toBe("test_verified");
  });
  it("prevents reusing a chain/hash/log identity for another attempt",async()=>{
    const first=await fixture();expect(await first.worker.runOne()).toBe("verified");const second=await fixture(false,first.txHash);
    expect(await second.worker.runOne()).toBe("attention");expect((await store.getAttempt(second.attempt.id,second.userId))?.settlement_status).toBe("unverified");
    expect((await pool.query("SELECT count(*)::int AS count FROM funding_settlements WHERE tx_hash=$1",[first.txHash])).rows[0].count).toBe(1);
    expect((await pool.query("SELECT settlement_error FROM funding_attempts WHERE id=$1",[second.attempt.id])).rows[0].settlement_error).toBe("settlement_identity_conflict");
  });
  it("does not verify incomplete provider metadata or a failed chain receipt",async()=>{
    const {attempt,userId,receipt,worker}=await fixture();await pool.query("UPDATE funding_attempts SET expected_usdc_units=NULL WHERE id=$1",[attempt.id]);expect(await worker.runOne()).toBe("pending");
    await pool.query("UPDATE funding_attempts SET expected_usdc_units=10000001,settlement_next_at=now() WHERE id=$1",[attempt.id]);receipt.status=0;
    expect(await worker.runOne()).toBe("attention");expect((await store.getAttempt(attempt.id,userId))?.settlement_status).toBe("unverified");
    expect((await pool.query("SELECT count(*)::int AS count FROM funding_settlements WHERE attempt_id=$1",[attempt.id])).rows[0].count).toBe(0);
  });
  it("denies browser access and service-role modification of immutable receipt identities",async()=>{
    const {worker}=await fixture();expect(await worker.runOne()).toBe("verified");const connection=await pool.connect();try {
      for(const role of ["anon","authenticated"]){await connection.query(`SET ROLE ${role}`);await expect(connection.query("SELECT * FROM funding_settlements")).rejects.toThrow("permission denied");await connection.query("RESET ROLE");}
      await connection.query("SET ROLE service_role");expect((await connection.query("SELECT * FROM funding_settlements")).rowCount).toBeGreaterThan(0);
      await expect(connection.query("UPDATE funding_settlements SET amount_units=1")).rejects.toThrow("permission denied");
    }finally{await connection.query("RESET ROLE");connection.release();}
  });
});
