import {createHash} from "node:crypto";
import type {Pool} from "pg";
import {z} from "zod";
import {decimalUnits} from "./config.js";
import {assertHeadlessOrderValue,assertObservationTimestamp,chooseStatus} from "./processor.js";
import {fundingTransactionPageSchema,fundingTransactionSchema,providerOrderSchema,type CoinbaseFundingProvider,type FundingTransaction} from "./provider.js";

const requiredEvents=["onramp.transaction.created","onramp.transaction.updated","onramp.transaction.success","onramp.transaction.failed"];
type Provider=Pick<CoinbaseFundingProvider,"transactions"|"getOrder"|"subscription">;
export type HealthSettings={subscriptionId?:string;webhookUrl?:string};
export function validateHealthSettings(settings:HealthSettings):void {
  if(settings.subscriptionId) z.string().uuid().parse(settings.subscriptionId);
  if(settings.webhookUrl) {
    const url=new URL(settings.webhookUrl);
    if(url.protocol!=="https:" || url.username || url.password || url.search || url.hash || url.pathname!=="/v1/webhooks/coinbase/onramp") throw new Error("Invalid funding webhook URL");
  }
}
export class FundingReconciler {
  constructor(private readonly pool:Pool,private readonly provider:Provider) {}
  async checkHealth(settings:HealthSettings):Promise<string> {
    validateHealthSettings(settings);
    const id=settings.subscriptionId ?? "unconfigured";
    let status="unconfigured";
    if(settings.subscriptionId && settings.webhookUrl) {
      try {
        const sub=await this.provider.subscription(settings.subscriptionId);
        status=sub.subscriptionId!==settings.subscriptionId || sub.target.url!==settings.webhookUrl
          || (sub.target.method && sub.target.method!=="POST") || !requiredEvents.every(event=>sub.eventTypes.includes(event)) ? "mismatch" : sub.isEnabled ? "healthy" : "disabled";
      } catch {status="unavailable";}
    }
    await this.pool.query(`INSERT INTO funding_subscription_health(subscription_id,status) VALUES($1,$2)
      ON CONFLICT(subscription_id) DO UPDATE SET status=excluded.status,checked_at=now()`,[id,status]);
    return status;
  }
  async runOne():Promise<"idle"|"updated"|"waiting"|"retry"|"attention"|"page"> {
    const client=await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result=await client.query(`SELECT a.*,q.amount_kind AS quote_amount_kind,q.request_amount::text AS quote_request_amount
        FROM funding_attempts a LEFT JOIN funding_quotes q ON q.id=a.quote_id
        WHERE a.reconcile_next_at<=now() AND (a.provider_status IS DISTINCT FROM 'ONRAMP_ORDER_STATUS_COMPLETED' OR a.settlement_status='unverified')
        ORDER BY a.reconcile_next_at,a.id FOR UPDATE OF a SKIP LOCKED LIMIT 1`);
      const attempt=result.rows[0];
      if(!attempt) {await client.query("COMMIT");return "idle";}
      await client.query("SAVEPOINT reconcile_attempt");
      try {
        const legacyRef=`${attempt.sandbox?"sandbox-":""}${createHash("sha256").update(`uspeaks:${attempt.user_id}`).digest("hex").slice(0,32)}`;
        const ref=attempt.provider_user_ref ?? legacyRef;
        let status:string,at:Date,transactionId:string|null=null,txHash:string|null=null,expectedUnits:bigint;
        if(attempt.provider_order_id) {
          const order=providerOrderSchema.parse(await this.provider.getOrder(attempt.provider_order_id));
          if(order.orderId!==attempt.provider_order_id || order.partnerUserRef!==ref || order.destinationAddress.toLowerCase()!==attempt.wallet_address || !order.updatedAt) throw new Error("identity_mismatch");
          assertHeadlessOrderValue(order,attempt.quote_amount_kind,attempt.quote_request_amount);
          status=order.status;at=new Date(order.updatedAt);txHash=order.txHash ?? null;expectedUnits=decimalUnits(order.purchaseAmount,6);
        } else {
          if(!attempt.provider_user_ref) throw new Error("legacy_identity_required");
          const page=fundingTransactionPageSchema.parse(await this.provider.transactions(ref,attempt.reconcile_page_key ?? undefined));
          const previous=z.array(fundingTransactionSchema).max(100).parse(attempt.reconcile_candidates);
          const candidates=new Map<string,FundingTransaction>();
          for(const item of [...previous,...page.transactions]) {
            if(item.partner_user_ref!==ref || item.wallet_address.toLowerCase()!==attempt.wallet_address
              || item.purchase_network!=="base" || item.purchase_currency!=="USDC" || item.purchase_amount.currency!=="USDC"
              || item.payment_total.currency!=="USD") throw new Error("identity_mismatch");
            if(decimalUnits(item.purchase_amount.value,6)<=0n || decimalUnits(item.payment_total.value,6)<=0n) throw new Error("invalid_amount");
            if(new Date(item.created_at).getTime()<new Date(attempt.created_at).getTime()-300_000) throw new Error("identity_mismatch");
            if(attempt.kind==="headless") {
              const actual=attempt.quote_amount_kind==="payment" ? item.payment_total.value : item.purchase_amount.value;
              if(decimalUnits(actual,6)!==decimalUnits(attempt.quote_request_amount,6)) throw new Error("invalid_amount");
            }
            candidates.set(item.transaction_id,item);
          }
          if(candidates.size>1) throw new Error("multiple_transactions");
          if(page.next_page_key) {
            const seen=z.array(z.string()).max(100).parse(attempt.reconcile_seen_keys);
            if(page.next_page_key===attempt.reconcile_page_key || seen.includes(page.next_page_key) || seen.length>=100) throw new Error("pagination_cycle");
            await client.query(`UPDATE funding_attempts SET reconcile_page_key=$2,reconcile_candidates=$3::jsonb,
              reconcile_next_at=now()+interval '5 seconds',reconcile_error=NULL,reconcile_seen_keys=$4::jsonb WHERE id=$1`,[attempt.id,page.next_page_key,JSON.stringify([...candidates.values()]),JSON.stringify([...seen,page.next_page_key])]);
            await client.query("COMMIT");return "page";
          }
          const item=[...candidates.values()][0];
          if(!item) {
            const overdue=Date.now()-new Date(attempt.created_at).getTime()>24*60*60_000;
            await client.query(`UPDATE funding_attempts SET reconcile_page_key=NULL,reconcile_seen_keys='[]',reconcile_candidates='[]',
              reconcile_next_at=now()+($2::text||' seconds')::interval,reconcile_error=$3 WHERE id=$1`,
            [attempt.id,overdue?3600:60,overdue?"provider_visibility_overdue":"awaiting_provider_visibility"]);
            await client.query("COMMIT");return overdue?"attention":"waiting";
          }
          if(attempt.provider_transaction_id && attempt.provider_transaction_id!==item.transaction_id) throw new Error("identity_mismatch");
          transactionId=item.transaction_id;expectedUnits=decimalUnits(item.purchase_amount.value,6);
          status="ONRAMP_ORDER_STATUS_"+({ONRAMP_TRANSACTION_STATUS_CREATED:"PENDING_PAYMENT",ONRAMP_TRANSACTION_STATUS_IN_PROGRESS:"PROCESSING",ONRAMP_TRANSACTION_STATUS_SUCCESS:"COMPLETED",ONRAMP_TRANSACTION_STATUS_FAILED:"FAILED"}[item.status]);
          at=new Date(item.completed_at && !item.completed_at.startsWith("0001-") ? item.completed_at : item.created_at);
          txHash=item.tx_hash && /^0x[0-9a-fA-F]{64}$/.test(item.tx_hash)?item.tx_hash:null;
        }
        assertObservationTimestamp(at,new Date());
        if(attempt.settlement_status!=="unverified" && attempt.expected_usdc_units && BigInt(attempt.expected_usdc_units)!==expectedUnits) throw new Error("invalid_amount");
        if(attempt.settlement_status!=="unverified" && attempt.provider_tx_hash && txHash && attempt.provider_tx_hash.toLowerCase()!==txHash.toLowerCase()) throw new Error("identity_mismatch");
        const chosen=chooseStatus(attempt.provider_status,status,attempt.provider_updated_at,at);
        if(chosen || (attempt.provider_status===status && status==="ONRAMP_ORDER_STATUS_COMPLETED")) await client.query(`UPDATE funding_attempts SET provider_status=$2,provider_updated_at=$3,
          provider_transaction_id=coalesce(provider_transaction_id,$4),provider_tx_hash=$5,
          expected_usdc_units=$6,state='ready',updated_at=now() WHERE id=$1`,[attempt.id,chosen ?? status,at,transactionId,txHash,expectedUnits.toString()]);
        await client.query(`UPDATE funding_attempts SET reconcile_attempts=0,reconcile_error=NULL,reconcile_page_key=NULL,
          reconcile_seen_keys='[]',reconcile_candidates='[]',reconcile_next_at=now()+interval '60 seconds' WHERE id=$1`,[attempt.id]);
        await client.query("COMMIT");return "updated";
      } catch(error) {
        await client.query("ROLLBACK TO SAVEPOINT reconcile_attempt");
        const known=["legacy_identity_required","identity_mismatch","multiple_transactions","invalid_amount","invalid_timestamp","pagination_cycle"];
        const category=(error as {code?:string}).code==="23505" ? "identity_mismatch" : error instanceof Error && known.includes(error.message) ? error.message : "provider_unavailable";
        const attention=category!=="provider_unavailable";
        const tries=Number(attempt.reconcile_attempts)+1;
        await client.query(`UPDATE funding_attempts SET reconcile_attempts=$2,reconcile_error=$3,
          reconcile_next_at=now()+($4::text||' seconds')::interval WHERE id=$1`,[attempt.id,tries,category,attention?3600:Math.min(3600,2**Math.min(tries,12))]);
        await client.query("COMMIT");return attention || tries>=8 ? "attention":"retry";
      }
    } catch(error) {await client.query("ROLLBACK").catch(()=>undefined);throw error;}
    finally {client.release();}
  }
}
