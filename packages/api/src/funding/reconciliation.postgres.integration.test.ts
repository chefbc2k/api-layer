import {createHash,randomUUID} from "node:crypto";
import {Pool} from "pg";
import {afterAll,beforeEach,describe,it,expect,vi} from "vitest";
import {FundingStore} from "./store.js";
import {FundingReconciler} from "./reconciliation.js";
import {BASE_USDC} from "./config.js";
const database=process.env.API_LAYER_FUNDING_TEST_DB_URL;
const wallet="0x00000000000000000000000000000000000000aa";
const subscriptionId="11111111-1111-4111-8111-111111111111",webhookUrl="https://api.example/v1/webhooks/coinbase/onramp";
const events=["onramp.transaction.created","onramp.transaction.updated","onramp.transaction.success","onramp.transaction.failed"];
describe.skipIf(!database)("durable funding reconciliation",()=>{
  const pool=new Pool({connectionString:database});const store=new FundingStore(pool);
  afterAll(async()=>{await pool.end();});
  beforeEach(async()=>{await pool.query("UPDATE funding_attempts SET reconcile_next_at=now()+interval '100 years'");});
  async function fixture(kind:"headless"|"hosted"="headless") {
    const userId=`reconcile_${randomUUID().replaceAll("-","")}`;
    const quote=await store.insertQuote({userId,wallet,chainId:8453,token:BASE_USDC,paymentMethod:"GUEST_CHECKOUT_APPLE_PAY",requestAmount:"10.000001",amountKind:"purchase",sandbox:true,
      quote:{paymentTotal:"10.50",paymentSubtotal:"10",paymentCurrency:"USD",purchaseAmount:"10.000001",purchaseCurrency:"USDC",destinationAddress:wallet,destinationNetwork:"base",fees:[{type:"NETWORK",amount:"0.50",currency:"USD"}]}});
    const input={userId,kind,key:"reconciliation_key_0001",fingerprint:"a".repeat(64),quoteId:kind==="headless"?quote.id:undefined,wallet,chainId:8453,sandbox:true};
    const {attempt}=await store.beginAttempt(input);await store.markUncertain(attempt.id,userId);
    const transaction={transaction_id:randomUUID(),partner_user_ref:attempt.provider_user_ref!,wallet_address:wallet,purchase_currency:"USDC",purchase_network:"base",purchase_amount:{currency:"USDC",value:"10.000001"},payment_total:{currency:"USD",value:"10.50"},created_at:new Date().toISOString(),status:"ONRAMP_TRANSACTION_STATUS_IN_PROGRESS" as const};
    const order={orderId:randomUUID(),partnerUserRef:attempt.provider_user_ref!,destinationAddress:wallet,destinationNetwork:"base" as const,purchaseCurrency:"USDC" as const,purchaseAmount:"10.000001",paymentCurrency:"USD" as const,paymentTotal:"10.50",paymentSubtotal:"10",fees:[{type:"NETWORK",amount:"0.50",currency:"USD" as const}],updatedAt:new Date().toISOString(),status:"ONRAMP_ORDER_STATUS_PROCESSING" as const};
    const provider={transactions:vi.fn().mockResolvedValue({transactions:[transaction]}),getOrder:vi.fn().mockResolvedValue(order),subscription:vi.fn().mockResolvedValue({subscriptionId,isEnabled:true,eventTypes:events,target:{url:webhookUrl,method:"POST"}})};
    return {attempt,input,transaction,order,provider,worker:new FundingReconciler(pool,provider)};
  }
  async function due(id:string){await pool.query("UPDATE funding_attempts SET reconcile_next_at=now() WHERE id=$1",[id]);}
  it("recovers an unknown timeout exactly once across concurrent workers and restarts without another creation",async()=>{
    const {attempt,input,transaction,worker}=await fixture();
    expect((await Promise.all([worker.runOne(),worker.runOne()])).sort()).toEqual(["idle","updated"]);
    const restartedPool=new Pool({connectionString:database});
    try {
      const restarted=new FundingStore(restartedPool);const saved=await restarted.findAttempt(input.userId,"headless",input.key);
      expect(saved).toMatchObject({id:attempt.id,state:"ready",provider_status:"ONRAMP_ORDER_STATUS_PROCESSING",provider_transaction_id:transaction.transaction_id,checkout_ciphertext:null});
      expect((await restarted.beginAttempt(input)).created).toBe(false);
      await expect(restarted.beginAttempt({...input,key:"another_key_0001"})).rejects.toThrow("checkout");
      expect((await restartedPool.query("SELECT count(*)::int AS count FROM funding_attempts WHERE user_id=$1",[input.userId])).rows[0].count).toBe(1);
    } finally {await restartedPool.end();}
  });
  it("keeps empty provider results unresolved rather than permitting a duplicate",async()=>{
    const {attempt,input,provider,worker}=await fixture();provider.transactions.mockResolvedValue({transactions:[]});
    expect(await worker.runOne()).toBe("waiting");expect((await store.getAttempt(attempt.id,input.userId))?.state).toBe("uncertain");
    await expect(store.beginAttempt({...input,key:"another_key_0001"})).rejects.toThrow("unresolved");
  });
  it("escalates an invisible result after 24 hours without unlocking another creation",async()=>{
    const {attempt,input,provider,worker}=await fixture();provider.transactions.mockResolvedValue({transactions:[]});
    await pool.query("UPDATE funding_attempts SET created_at=now()-interval '25 hours' WHERE id=$1",[attempt.id]);
    expect(await worker.runOne()).toBe("attention");
    await expect(store.beginAttempt({...input,key:"another_key_0001"})).rejects.toThrow("unresolved");
    expect((await pool.query("SELECT reconcile_error FROM funding_attempts WHERE id=$1",[attempt.id])).rows[0].reconcile_error).toBe("provider_visibility_overdue");
  });
  it("refuses a provider transaction ID already assigned to another attempt",async()=>{
    const first=await fixture();expect(await first.worker.runOne()).toBe("updated");
    const second=await fixture();second.provider.transactions.mockResolvedValue({transactions:[{...second.transaction,transaction_id:first.transaction.transaction_id}]});
    expect(await second.worker.runOne()).toBe("attention");
    expect((await store.getAttempt(second.attempt.id,second.input.userId))?.state).toBe("uncertain");
  });
  it("persists a partial scan and waits for all pages after restart before resolving",async()=>{
    const {attempt,input,transaction,provider,worker}=await fixture("hosted");provider.transactions.mockResolvedValueOnce({transactions:[transaction],next_page_key:"page-2"});
    expect(await worker.runOne()).toBe("page");expect((await store.getAttempt(attempt.id,input.userId))?.state).toBe("uncertain");
    await due(attempt.id);provider.transactions.mockResolvedValueOnce({transactions:[]});
    const restarted=new Pool({connectionString:database});
    try {expect(await new FundingReconciler(restarted,provider).runOne()).toBe("updated");} finally {await restarted.end();}
    expect(provider.transactions).toHaveBeenLastCalledWith(attempt.provider_user_ref,"page-2");
    expect((await store.getAttempt(attempt.id,input.userId))?.provider_transaction_id).toBe(transaction.transaction_id);
  });
  it("does not pick the first of multiple provider transactions",async()=>{
    const {attempt,input,transaction,provider,worker}=await fixture();provider.transactions.mockResolvedValue({transactions:[transaction,{...transaction,transaction_id:randomUUID()}]});
    expect(await worker.runOne()).toBe("attention");expect((await store.getAttempt(attempt.id,input.userId))?.state).toBe("uncertain");
    expect((await pool.query("SELECT reconcile_error FROM funding_attempts WHERE id=$1",[attempt.id])).rows[0].reconcile_error).toBe("multiple_transactions");
  });
  it("detects a multi-page cursor cycle without losing the reservation",async()=>{
    const {attempt,provider,worker}=await fixture();
    for(const key of ["page-a","page-b","page-a"]) {provider.transactions.mockResolvedValueOnce({transactions:[],next_page_key:key});await due(attempt.id);const result=await worker.runOne();expect(result).toBe(key==="page-a" && provider.transactions.mock.calls.length===3?"attention":"page");}
    expect((await pool.query("SELECT reconcile_error FROM funding_attempts WHERE id=$1",[attempt.id])).rows[0].reconcile_error).toBe("pagination_cycle");
  });
  it("persists sanitized backoff and recovers from a transient failure",async()=>{
    const {attempt,input,provider,worker}=await fixture();provider.transactions.mockRejectedValueOnce(new Error("never-log-private-token"));
    expect(await worker.runOne()).toBe("retry");
    const error=(await pool.query("SELECT reconcile_error,reconcile_attempts,reconcile_next_at>now() AS delayed FROM funding_attempts WHERE id=$1",[attempt.id])).rows[0];
    expect(error).toEqual({reconcile_error:"provider_unavailable",reconcile_attempts:1,delayed:true});
    await due(attempt.id);expect(await worker.runOne()).toBe("updated");expect((await store.getAttempt(attempt.id,input.userId))?.state).toBe("ready");
  });
  it("alerts after sustained provider failure but keeps recovery scheduled",async()=>{
    const {attempt,provider,worker}=await fixture();provider.transactions.mockRejectedValue(new Error("private"));
    for(let i=1;i<=8;i++) {await due(attempt.id);expect(await worker.runOne()).toBe(i<8?"retry":"attention");}
    expect((await pool.query("SELECT reconcile_attempts,reconcile_next_at>now() AS delayed FROM funding_attempts WHERE id=$1",[attempt.id])).rows[0]).toEqual({reconcile_attempts:8,delayed:true});
  });
  it.each([
    {wallet_address:"0x00000000000000000000000000000000000000bb"},{partner_user_ref:"other"},{purchase_network:"ethereum"},{purchase_currency:"ETH"},{purchase_amount:{currency:"USDC",value:"10.000002"}},{created_at:"2020-01-01T00:00:00Z"},
  ])("rejects another identity, deployment or amount %s",async patch=>{
    const {attempt,input,transaction,provider,worker}=await fixture();provider.transactions.mockResolvedValue({transactions:[{...transaction,...patch}]});
    expect(await worker.runOne()).toBe("attention");expect((await store.getAttempt(attempt.id,input.userId))?.state).toBe("uncertain");
  });
  it.each([{destinationAddress:"0x00000000000000000000000000000000000000bb"},{purchaseAmount:"10.000002"},{partnerUserRef:"other"},{updatedAt:new Date(Date.now()+24*60*60_000).toISOString()}])("rejects a mismatched canonical order %s",async patch=>{
    const {attempt,input,order,provider,worker}=await fixture();await pool.query("UPDATE funding_attempts SET provider_order_id=$2 WHERE id=$1",[attempt.id,order.orderId]);
    provider.getOrder.mockResolvedValue({...order,...patch});expect(await worker.runOne()).toBe("attention");
    expect((await store.getAttempt(attempt.id,input.userId))?.state).toBe("uncertain");
  });
  it("refreshes a known legacy order through canonical owner and exact-value validation",async()=>{
    const {attempt,input,order,provider,worker}=await fixture();
    const ref=`sandbox-${createHash("sha256").update(`uspeaks:${input.userId}`).digest("hex").slice(0,32)}`;
    await pool.query("UPDATE funding_attempts SET provider_user_ref=NULL,provider_order_id=$2 WHERE id=$1",[attempt.id,order.orderId]);
    provider.getOrder.mockResolvedValue({...order,partnerUserRef:ref});expect(await worker.runOne()).toBe("updated");expect(provider.transactions).not.toHaveBeenCalled();
    expect((await store.getAttempt(attempt.id,input.userId))?.provider_status).toBe("ONRAMP_ORDER_STATUS_PROCESSING");
  });
  it("escalates unidentifiable legacy ambiguity instead of guessing another order",async()=>{
    const {attempt,provider,worker}=await fixture();await pool.query("UPDATE funding_attempts SET provider_user_ref=NULL WHERE id=$1",[attempt.id]);
    expect(await worker.runOne()).toBe("attention");expect(provider.transactions).not.toHaveBeenCalled();
    expect((await pool.query("SELECT reconcile_error FROM funding_attempts WHERE id=$1",[attempt.id])).rows[0].reconcile_error).toBe("legacy_identity_required");
  });
  it("permits late completion after failure, then never polls it back to pending",async()=>{
    const {attempt,input,transaction,provider,worker}=await fixture();provider.transactions.mockResolvedValueOnce({transactions:[{...transaction,status:"ONRAMP_TRANSACTION_STATUS_FAILED"}]});
    expect(await worker.runOne()).toBe("updated");await due(attempt.id);
    provider.transactions.mockResolvedValueOnce({transactions:[{...transaction,status:"ONRAMP_TRANSACTION_STATUS_SUCCESS",completed_at:new Date().toISOString()}]});
    expect(await worker.runOne()).toBe("updated");await due(attempt.id);expect(await worker.runOne()).toBe("idle");
    expect((await store.getAttempt(attempt.id,input.userId))?.provider_status).toBe("ONRAMP_ORDER_STATUS_COMPLETED");
  });
  it("releases claims after a lost worker connection and permits a new worker to recover",async()=>{
    const {attempt,worker}=await fixture();const connection=await pool.connect();await connection.query("BEGIN");await connection.query("SELECT id FROM funding_attempts WHERE id=$1 FOR UPDATE",[attempt.id]);
    expect(await worker.runOne()).toBe("idle");connection.release(true);
    expect(await worker.runOne()).toBe("updated");
  });
  it.each(["healthy","disabled","mismatch","unavailable","unconfigured"])("records %s subscription health without enabling or editing subscriptions",async state=>{
    const {provider,worker}=await fixture();
    if(state==="disabled") provider.subscription.mockResolvedValue({subscriptionId,isEnabled:false,eventTypes:events,target:{url:webhookUrl}});
    if(state==="mismatch") provider.subscription.mockResolvedValue({subscriptionId,isEnabled:true,eventTypes:[],target:{url:webhookUrl}});
    if(state==="unavailable") provider.subscription.mockRejectedValue(new Error("private"));
    expect(await worker.checkHealth(state==="unconfigured"?{}:{subscriptionId,webhookUrl})).toBe(state);
    expect((await pool.query("SELECT status FROM funding_subscription_health WHERE subscription_id=$1",[state==="unconfigured"?"unconfigured":subscriptionId])).rows[0].status).toBe(state);
  });
  it("denies browser roles access to private health records",async()=>{
    const connection=await pool.connect();try {await connection.query("SET ROLE authenticated");await expect(connection.query("SELECT * FROM funding_subscription_health")).rejects.toThrow("permission denied");} finally {await connection.query("RESET ROLE");connection.release();}
  });
});
