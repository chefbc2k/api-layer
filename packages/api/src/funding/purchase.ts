import {Contract,Interface,getAddress,toQuantity,type Provider} from "ethers";
import {Router} from "express";
import {z} from "zod";
import {Pool} from "pg";
import type {ApiExecutionContext} from "../shared/execution-context.js";
import {authenticate,assertWriteAuthorized} from "../shared/auth.js";
import {HttpError,toHttpError} from "../shared/errors.js";
import {fundingActor} from "./routes.js";
import {inspectReadiness} from "./readiness.js";
const uint=z.string().regex(/^(0|[1-9][0-9]{0,77})$/).refine(v=>BigInt(v)<2n**256n);
export const purchaseInput=z.object({fundingAttemptId:z.string().uuid(),tokenId:uint,expectedPriceUsdcUnits:uint.refine(v=>BigInt(v)>0n),expectedSeller:z.string().refine(v=>{try{return getAddress(v)!=="0x0000000000000000000000000000000000000000";}catch{return false;}}),authorizePurchase:z.literal(true)}).strict();
const abi=new Interface(["function getListing(uint256) view returns(tuple(uint256 tokenId,address seller,uint256 price,uint256 createdAt,uint256 createdBlock,uint256 lastUpdateBlock,uint256 expiresAt,bool isActive))","function ownerOf(uint256) view returns(address)","function getOriginalOwner(uint256) view returns(address)","function isInEscrow(uint256) view returns(bool)","function isPaused() view returns(bool)","function paymentPaused() view returns(bool)","function purchaseAsset(uint256)","event AssetPurchased(uint256 indexed tokenId,address indexed seller,address indexed buyer,uint256 price)","event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)"]);
const erc20=new Interface(["event Transfer(address indexed from,address indexed to,uint256 value)"]);
export async function preparePurchase(provider:Provider,chainId:number,diamond:string,wallet:string,input:z.infer<typeof purchaseInput>) {
  const snapshot=await inspectReadiness(provider,chainId,diamond,wallet,input.tokenId);
  if(snapshot.readiness!=="ready_for_user_signature")throw new HttpError(409,"Purchase requires funded wallet, allowance, gas and successful simulation");
  if(snapshot.requiredUsdcUnits!==input.expectedPriceUsdcUnits || snapshot.allowanceUsdcUnits!==input.expectedPriceUsdcUnits)throw new HttpError(409,"Price or exact allowance changed; review and authorize again");
  const market=new Contract(diamond,abi,provider),at={blockTag:snapshot.blockNumber};
  const [listing,owner,original,inEscrow,paused,paymentPaused]=await Promise.all([market.getListing(input.tokenId,at),market.ownerOf(input.tokenId,at),market.getOriginalOwner(input.tokenId,at),market.isInEscrow(input.tokenId,at),market.isPaused(at),market.paymentPaused(at)]);
  if(!listing.isActive || BigInt(listing.price)!==BigInt(input.expectedPriceUsdcUnits) || getAddress(String(listing.seller))!==getAddress(input.expectedSeller)
    || !inEscrow || getAddress(String(owner))!==getAddress(diamond) || getAddress(String(original))!==getAddress(input.expectedSeller) || paused || paymentPaused)throw new HttpError(409,"Listing, seller ownership, escrow or pause state changed; review again");
  if((await provider.getBlock(snapshot.blockNumber))?.hash!==snapshot.blockHash)throw new HttpError(503,"Purchase snapshot changed; prepare again");
  return {chainId,walletAddress:snapshot.walletAddress,diamondAddress:getAddress(diamond),tokenAddress:snapshot.tokenAddress,tokenId:input.tokenId,seller:getAddress(input.expectedSeller),priceUsdcUnits:input.expectedPriceUsdcUnits,
    observedBlock:snapshot.blockNumber,observedBlockHash:snapshot.blockHash,requiresUserSignature:true,mustRevalidateBeforeSigning:true,
    onchainConstraints:{tokenId:true,maximumSpendViaExactAllowance:true,seller:false,deadline:false},
    transaction:{from:snapshot.walletAddress,to:getAddress(diamond),chainId:toQuantity(chainId),data:abi.encodeFunctionData("purchaseAsset",[input.tokenId]),value:"0x0",gas:toQuantity(BigInt(snapshot.gasUnits!))}};
}
export type PurchaseIntent=Awaited<ReturnType<typeof preparePurchase>>;
export async function verifyPurchase(provider:Provider,intent:PurchaseIntent,hash:string) {
  if(!/^0x[0-9a-fA-F]{64}$/.test(hash) || Number((await provider.getNetwork()).chainId)!==intent.chainId)throw new HttpError(409,"Purchase chain or hash mismatch");
  const [tx,receipt]=await Promise.all([provider.getTransaction(hash),provider.getTransactionReceipt(hash)]);
  if(!tx || !receipt)throw new HttpError(409,"Purchase receipt pending");
  if(receipt.status!==1 || receipt.hash.toLowerCase()!==hash.toLowerCase() || tx.hash.toLowerCase()!==hash.toLowerCase() || tx.chainId!==BigInt(intent.chainId)
    || getAddress(tx.from)!==intent.walletAddress || !tx.to || getAddress(tx.to)!==intent.diamondAddress || tx.data!==intent.transaction.data || tx.value!==0n)throw new HttpError(409,"Transaction is not the authorized purchase");
  const final=await provider.getBlock("finalized"),block=await provider.getBlock(receipt.blockNumber);
  if(!final?.hash || final.number<receipt.blockNumber || block?.hash!==receipt.blockHash)throw new HttpError(409,"Purchase finality pending");
  const events=receipt.logs.filter(log=>!log.removed && getAddress(log.address)===intent.diamondAddress && log.topics[0]===abi.getEvent("AssetPurchased")!.topicHash).map(log=>abi.parseLog(log)!);
  if(events.length!==1 || BigInt(events[0].args.tokenId)!==BigInt(intent.tokenId) || getAddress(String(events[0].args.buyer))!==intent.walletAddress || getAddress(String(events[0].args.seller))!==intent.seller || BigInt(events[0].args.price)!==BigInt(intent.priceUsdcUnits))throw new HttpError(409,"Purchase event differs from customer authorization");
  let spent=0n;for(const log of receipt.logs){if(getAddress(log.address)!==getAddress(intent.tokenAddress) || log.topics[0]!==erc20.getEvent("Transfer")!.topicHash)continue;if(log.removed)throw new HttpError(409,"Purchase reorg pending");const event=erc20.parseLog(log)!;if(getAddress(String(event.args.from))===intent.walletAddress)spent+=BigInt(event.args.value);}
  const owner=await new Contract(intent.diamondAddress,abi,provider).ownerOf(intent.tokenId,{blockTag:receipt.blockNumber});
  if(spent!==BigInt(intent.priceUsdcUnits) || getAddress(String(owner))!==intent.walletAddress)throw new HttpError(409,"Purchase payment or ownership proof mismatch");
  if((await provider.getBlock(receipt.blockNumber))?.hash!==receipt.blockHash || (await provider.getBlock(final.number))?.hash!==final.hash)throw new HttpError(409,"Purchase reorg pending");
  return {txHash:hash.toLowerCase(),blockNumber:receipt.blockNumber,blockHash:receipt.blockHash,priceUsdcUnits:spent.toString(),owner:intent.walletAddress,finalizedBlockNumber:final.number};
}
export function createPurchaseRouter(context:ApiExecutionContext,pool:Pool,sandbox:boolean) {
  const router=Router();
  router.post(["/v1/funding/purchase-requests","/v1/funding/purchase-requests/:id/receipt"],async(request,response)=>{
    try{
      const auth=authenticate(context.apiKeys,request.header("x-api-key"));try{assertWriteAuthorized(auth);}catch{throw new HttpError(403,"API key not permitted for funding writes");}
      const actor=fundingActor(auth,request);await context.rateLimiter.enforce("write",`funding:${actor.userId}`);
      if(request.params.id){
        const id=z.string().uuid().parse(request.params.id),{txHash}=z.object({txHash:z.string().regex(/^0x[0-9a-fA-F]{64}$/)}).strict().parse(request.body);
        const found=await pool.query("SELECT * FROM funding_purchase_requests WHERE id=$1 AND user_id=$2 AND wallet_address=$3 AND sandbox=$4",[id,actor.userId,actor.wallet.toLowerCase(),sandbox]);const row=found.rows[0];if(!row)throw new HttpError(404,"Purchase request not found");
        if(row.tx_hash && row.tx_hash!==txHash.toLowerCase())throw new HttpError(409,"Purchase already bound to a different receipt");
        const proof=await context.providerRouter.withProvider("read","funding.purchase.receipt",rpc=>verifyPurchase(rpc,row.intent,txHash));
        const saved=await pool.query("UPDATE funding_purchase_requests SET tx_hash=$4,proof=$5::jsonb,confirmed_at=coalesce(confirmed_at,now()) WHERE id=$1 AND user_id=$2 AND wallet_address=$3 AND (tx_hash IS NULL OR tx_hash=$4) RETURNING id",[id,actor.userId,actor.wallet.toLowerCase(),proof.txHash,JSON.stringify(proof)]);
        if(!saved.rowCount)throw new HttpError(409,"Purchase receipt conflict");response.json({requestId:id,status:sandbox?"test_confirmed":"confirmed",late:Date.now()>new Date(row.expires_at).getTime(),proof});return;
      }
      const input=purchaseInput.parse(request.body);
      const funding=await pool.query("SELECT id FROM funding_attempts WHERE id=$1 AND user_id=$2 AND wallet_address=$3 AND chain_id=$4 AND sandbox=$5 AND settlement_status=$6",[input.fundingAttemptId,actor.userId,actor.wallet.toLowerCase(),context.config.chainId,sandbox,sandbox?"test_verified":"verified"]);
      if(!funding.rowCount)throw new HttpError(409,"Verified customer funding settlement required");
      const intent=await context.providerRouter.withProvider("read","funding.purchase.prepare",rpc=>preparePurchase(rpc,context.config.chainId,context.config.diamondAddress,actor.wallet,input));
      const saved=await pool.query("INSERT INTO funding_purchase_requests(user_id,wallet_address,funding_attempt_id,chain_id,sandbox,intent,expires_at) VALUES($1,$2,$3,$4,$5,$6::jsonb,now()+interval '60 seconds') RETURNING id,expires_at",[actor.userId,actor.wallet.toLowerCase(),input.fundingAttemptId,context.config.chainId,sandbox,JSON.stringify(intent)]);
      response.json({requestId:saved.rows[0].id,expiresAt:saved.rows[0].expires_at.toISOString(),expiryIsAdvisory:true,...intent});
    }catch(error){const http=(error as {code?:string})?.code==="23505"?new HttpError(409,"Purchase receipt already used"):toHttpError(error);response.status(http.statusCode).json({error:error instanceof HttpError?http.message:http.statusCode>=500?"Funding purchase unavailable":"Invalid funding purchase request"});}
  });return router;
}
