import {Interface,toQuantity,type Provider} from "ethers";
import {Router} from "express";
import {z} from "zod";
import {randomUUID} from "node:crypto";
import type {ApiExecutionContext} from "../shared/execution-context.js";
import {authenticate,assertWriteAuthorized} from "../shared/auth.js";
import {HttpError,toHttpError} from "../shared/errors.js";
import {fundingActor} from "./routes.js";
import {inspectReadiness} from "./readiness.js";
const approve=new Interface(["function approve(address spender,uint256 amount) returns(bool)"]);
export const approvalInput=z.object({tokenId:z.string().regex(/^(0|[1-9][0-9]{0,77})$/).refine(value=>BigInt(value)<2n**256n),
  maximumUsdcUnits:z.string().regex(/^[1-9][0-9]{0,77}$/).refine(value=>BigInt(value)<2n**256n),authorizeApprovalPreparation:z.literal(true)}).strict();
export async function prepareUsdcApproval(provider:Provider,chainId:number,diamondAddress:string,walletAddress:string,body:z.infer<typeof approvalInput>) {
  const snapshot=await inspectReadiness(provider,chainId,diamondAddress,walletAddress,body.tokenId);
  if(BigInt(snapshot.requiredUsdcUnits)>BigInt(body.maximumUsdcUnits)) throw new HttpError(409,"Listing price exceeds the authorized USDC limit");
  if(snapshot.blockers.includes("customer_sponsorship_unverified")) throw new HttpError(409,"Customer smart-account approval signing requires its verified wallet adapter");
  const base={requestId:randomUUID(),chainId,walletAddress:snapshot.walletAddress,tokenAddress:snapshot.tokenAddress,spender:snapshot.spender,tokenId:body.tokenId,
    maximumUsdcUnits:body.maximumUsdcUnits,requiredUsdcUnits:snapshot.requiredUsdcUnits,observedBlock:snapshot.blockNumber,observedBlockHash:snapshot.blockHash,
    requiresUserSignature:true,purchaseAuthorized:false,mustRevalidateBeforeSigning:true,expiresAt:new Date(Date.now()+60_000).toISOString()};
  if(snapshot.allowanceUsdcUnits===snapshot.requiredUsdcUnits) return {...base,transaction:null,nextStep:"approval_already_exact"};
  const amount=BigInt(snapshot.allowanceUsdcUnits)===0n?BigInt(snapshot.requiredUsdcUnits):0n;
  const data=approve.encodeFunctionData("approve",[snapshot.spender,amount]);
  const [estimate,fees]=await Promise.all([provider.estimateGas({from:snapshot.walletAddress,to:snapshot.tokenAddress,data,value:0n}),provider.getFeeData()]);
  const fee=fees.maxFeePerGas ?? fees.gasPrice;if(fee===null || fee<=0n) throw new HttpError(503,"Approval gas price unavailable");
  const gas=(estimate*120n+99n)/100n;
  if(BigInt(snapshot.nativeBalanceWei)<gas*fee) throw new HttpError(409,"Customer wallet needs native gas for USDC approval");
  if((await provider.getBlock(snapshot.blockNumber))?.hash!==snapshot.blockHash) throw new HttpError(503,"Approval snapshot changed; prepare again");
  return {...base,approvalUsdcUnits:amount.toString(),gasBudgetWei:(gas*fee).toString(),
    transaction:{from:snapshot.walletAddress,to:snapshot.tokenAddress,chainId:toQuantity(chainId),data,value:"0x0",gas:toQuantity(gas)},
    nextStep:amount===0n?"confirm_zero_allowance_then_prepare_again":"sign_approval_and_confirm_receipt"};
}
export function createApprovalRouter(context:ApiExecutionContext):Router {
  const router=Router();
  router.post("/v1/funding/approval-requests",async(request,response)=>{
    try {
      const auth=authenticate(context.apiKeys,request.header("x-api-key"));
      try{assertWriteAuthorized(auth);}catch{throw new HttpError(403,"API key not permitted for funding writes");}
      const actor=fundingActor(auth,request);await context.rateLimiter.enforce("write",`funding:${actor.userId}`);
      const body=approvalInput.parse(request.body);
      const result=await context.providerRouter.withProvider("read","funding.approval.prepare",rpc=>prepareUsdcApproval(rpc,context.config.chainId,context.config.diamondAddress,actor.wallet,body));
      response.json(result);
    }catch(error){const http=toHttpError(error);response.status(http.statusCode).json({error:error instanceof HttpError?http.message:http.statusCode>=500?"Funding approval preparation unavailable":"Invalid funding approval request"});}
  });
  return router;
}
