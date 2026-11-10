import {Interface,getAddress,type Provider} from "ethers";
import type {Pool} from "pg";
import {BASE_USDC,BASE_SEPOLIA_USDC} from "./config.js";
const transfer=new Interface(["event Transfer(address indexed from,address indexed to,uint256 value)"]);
export class SettlementPending extends Error {}
export type SettlementExpectation={chainId:number;txHash:string;recipient:string;amountUnits:bigint};
export async function verifyUsdcReceipt(provider:Provider,expected:SettlementExpectation) {
  if(![8453,84532].includes(expected.chainId) || !/^0x[0-9a-fA-F]{64}$/.test(expected.txHash) || expected.amountUnits<=0n || expected.amountUnits>=2n**256n) throw new Error("invalid_settlement_expectation");
  if(Number((await provider.getNetwork()).chainId)!==expected.chainId) throw new Error("settlement_chain_mismatch");
  const recipient=getAddress(expected.recipient),token=expected.chainId===8453?BASE_USDC:BASE_SEPOLIA_USDC;
  const receipt=await provider.getTransactionReceipt(expected.txHash);
  if(!receipt) throw new SettlementPending("receipt_pending");
  if(receipt.status!==1 || receipt.hash.toLowerCase()!==expected.txHash.toLowerCase()) throw new Error("receipt_failed_or_mismatched");
  const finalized=await provider.getBlock("finalized");
  if(!finalized || !finalized.hash || finalized.number<receipt.blockNumber) throw new SettlementPending("finality_pending");
  const block=await provider.getBlock(receipt.blockNumber);
  if(!block || block.hash!==receipt.blockHash) throw new SettlementPending("receipt_reorged");
  const matches=[];
  for(const log of receipt.logs) {
    if(log.address.toLowerCase()!==token || log.topics[0]!==transfer.getEvent("Transfer")!.topicHash) continue;
    if(log.removed) throw new SettlementPending("receipt_reorged");
    const parsed=transfer.parseLog(log);
    if(!parsed) throw new Error("invalid_transfer_log");
    if(getAddress(String(parsed.args.to))===recipient) matches.push({log,amount:BigInt(parsed.args.value)});
  }
  if(matches.length!==1 || matches[0].amount!==expected.amountUnits || !Number.isSafeInteger(matches[0].log.index) || matches[0].log.index<0) throw new Error("settlement_token_recipient_or_amount_mismatch");
  const stableBlock=await provider.getBlock(receipt.blockNumber);
  const stableFinalized=await provider.getBlock(finalized.number);
  if(stableBlock?.hash!==receipt.blockHash || stableFinalized?.hash!==finalized.hash) throw new SettlementPending("receipt_reorged");
  return {chainId:expected.chainId,txHash:expected.txHash.toLowerCase(),logIndex:matches[0].log.index,blockNumber:receipt.blockNumber,
    blockHash:receipt.blockHash.toLowerCase(),tokenAddress:token,recipient:recipient.toLowerCase(),amountUnits:expected.amountUnits.toString(),finalizedBlockNumber:finalized.number};
}
export class FundingSettlementProcessor {
  constructor(private readonly pool:Pool,private readonly provider:Provider,private readonly chainId:number) {}
  async runOne():Promise<"idle"|"verified"|"test_verified"|"pending"|"attention"> {
    const client=await this.pool.connect();
    try {
      await client.query("BEGIN");
      const found=await client.query(`SELECT * FROM funding_attempts WHERE chain_id=$1 AND provider_status='ONRAMP_ORDER_STATUS_COMPLETED'
        AND settlement_status='unverified' AND settlement_next_at<=now() ORDER BY settlement_next_at,id FOR UPDATE SKIP LOCKED LIMIT 1`,[this.chainId]);
      const attempt=found.rows[0];if(!attempt){await client.query("COMMIT");return "idle";}
      await client.query("SAVEPOINT settle_attempt");
      try {
        if(!attempt.provider_tx_hash || !attempt.expected_usdc_units) throw new SettlementPending("provider_receipt_metadata_pending");
        const proof=await verifyUsdcReceipt(this.provider,{chainId:this.chainId,txHash:attempt.provider_tx_hash,recipient:attempt.wallet_address,amountUnits:BigInt(attempt.expected_usdc_units)});
        const status=attempt.sandbox?"test_verified":"verified";
        if(!attempt.sandbox && this.chainId!==8453) throw new Error("settlement_chain_mismatch");
        await client.query(`INSERT INTO funding_settlements(attempt_id,chain_id,tx_hash,log_index,block_number,block_hash,token_address,recipient,amount_units,sandbox)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[attempt.id,proof.chainId,proof.txHash,proof.logIndex,proof.blockNumber,proof.blockHash,proof.tokenAddress,proof.recipient,proof.amountUnits,attempt.sandbox]);
        await client.query("UPDATE funding_attempts SET settlement_status=$2,settlement_error=NULL,updated_at=now() WHERE id=$1",[attempt.id,status]);
        await client.query("COMMIT");return status;
      } catch(error) {
        await client.query("ROLLBACK TO SAVEPOINT settle_attempt");
        const pending=error instanceof SettlementPending;
        const allowed=["invalid_settlement_expectation","settlement_chain_mismatch","receipt_failed_or_mismatched","invalid_transfer_log","settlement_token_recipient_or_amount_mismatch"];
        const category=pending?error.message:(error as {code?:string})?.code==="23505"?"settlement_identity_conflict":error instanceof Error && allowed.includes(error.message)?error.message:"settlement_rpc_unavailable";
        await client.query(`UPDATE funding_attempts SET settlement_error=$2,settlement_next_at=now()+($3::text||' seconds')::interval WHERE id=$1`,[attempt.id,category,pending?30:3600]);
        await client.query("COMMIT");return pending?"pending":"attention";
      }
    } catch(error){await client.query("ROLLBACK").catch(()=>undefined);throw error;}finally{client.release();}
  }
}
