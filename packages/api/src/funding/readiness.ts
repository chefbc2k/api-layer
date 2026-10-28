import { Contract, Interface, getAddress, type Provider } from "ethers";
import { Router } from "express";
import { z } from "zod";
import type { ApiExecutionContext } from "../shared/execution-context.js";
import { authenticate } from "../shared/auth.js";
import { HttpError, toHttpError } from "../shared/errors.js";
import { BASE_USDC, BASE_SEPOLIA_USDC } from "./config.js";
import { fundingActor } from "./routes.js";

const listingAbi = ["function getUsdcToken() view returns (address)",
  "function getListing(uint256) view returns (tuple(uint256 tokenId,address seller,uint256 price,uint256 createdAt,uint256 createdBlock,uint256 lastUpdateBlock,uint256 expiresAt,bool isActive))",
  "function purchaseAsset(uint256)"];
const tokenAbi = ["function decimals() view returns (uint8)","function balanceOf(address) view returns (uint256)","function allowance(address,address) view returns (uint256)"];
export async function inspectReadiness(provider: Provider, chainId: number, diamondAddress: string, walletAddress: string, tokenId: string) {
  const wallet=getAddress(walletAddress), spender=getAddress(diamondAddress);
  const network=await provider.getNetwork();
  if (Number(network.chainId)!==chainId || ![8453,84532].includes(chainId)) throw new HttpError(409,"Funding chain mismatch");
  const blockNumber=await provider.getBlockNumber();
  const block=await provider.getBlock(blockNumber);
  if (!block) throw new Error("Readiness block unavailable");
  const diamond=new Contract(spender,listingAbi,provider);
  const token=getAddress(String(await diamond.getUsdcToken({blockTag:blockNumber})));
  if (token.toLowerCase()!==(chainId===8453?BASE_USDC:BASE_SEPOLIA_USDC)) throw new HttpError(409,"Marketplace token is not native USDC");
  const erc20=new Contract(token,tokenAbi,provider);
  const [listing,decimals,balance,allowance,nativeBalance,code] = await Promise.all([
    diamond.getListing(tokenId,{blockTag:blockNumber}),erc20.decimals({blockTag:blockNumber}),
    erc20.balanceOf(wallet,{blockTag:blockNumber}),erc20.allowance(wallet,spender,{blockTag:blockNumber}),
    provider.getBalance(wallet,blockNumber),provider.getCode(wallet,blockNumber),
  ]);
  if (BigInt(decimals)!==6n) throw new HttpError(409,"USDC decimal configuration mismatch");
  if (!listing.isActive || BigInt(listing.tokenId)!==BigInt(tokenId) || BigInt(listing.price)<=0n
    || (BigInt(listing.expiresAt)!==0n && BigInt(listing.expiresAt)<BigInt(block.timestamp))
    || getAddress(String(listing.seller))===wallet) throw new HttpError(409,"Listing is unavailable for this buyer");
  const price=BigInt(listing.price), usdcBalance=BigInt(balance), approved=BigInt(allowance);
  const blockers:string[]=[];
  if (usdcBalance<price) blockers.push("insufficient_usdc");
  if (approved<price) blockers.push("approval_required");
  let gasUnits:bigint|null=null, gasBudget:bigint|null=null;
  if (code!=="0x") blockers.push("customer_sponsorship_unverified");
  else if (blockers.length===0) {
    try {
      const [estimate,fees]=await Promise.all([provider.estimateGas({from:wallet,to:spender,data:new Interface(listingAbi).encodeFunctionData("purchaseAsset",[tokenId])}),provider.getFeeData()]);
      const fee=fees.maxFeePerGas ?? fees.gasPrice;
      if (fee===null || fee<=0n) throw new Error("Fee unavailable");
      gasUnits=(estimate*120n+99n)/100n; gasBudget=gasUnits*fee;
      if (nativeBalance<gasBudget) blockers.push("insufficient_gas");
    } catch { blockers.push("purchase_simulation_unavailable"); }
  } else blockers.push("gas_estimate_requires_funding_and_allowance");
  return { walletAddress:wallet,chainId,tokenAddress:token,spender,tokenId,blockNumber,blockHash:block.hash,
    requiredUsdcUnits:price.toString(),balanceUsdcUnits:usdcBalance.toString(),allowanceUsdcUnits:approved.toString(),
    nativeBalanceWei:nativeBalance.toString(),gasUnits:gasUnits?.toString() ?? null,gasBudgetWei:gasBudget?.toString() ?? null,
    readiness: blockers.length===0?"ready_for_user_signature":"action_required",blockers,
    purchaseAuthorized:false,settlementStatus:"unverified",sponsorshipVerified:false };
}
export function createReadinessRouter(context:ApiExecutionContext):Router {
  const router=Router();
  router.get("/v1/funding/readiness",async (request,response)=>{
    try {
      const actor=fundingActor(authenticate(context.apiKeys,request.header("x-api-key")),request);
      await context.rateLimiter.enforce("read",`funding:${actor.userId}`);
      const {tokenId}=z.object({tokenId:z.string().regex(/^(0|[1-9][0-9]{0,77})$/).refine(value=>BigInt(value)<2n**256n)}).strict().parse(request.query);
      const result=await context.providerRouter.withProvider("read","funding.readiness",rpc=>inspectReadiness(rpc,context.config.chainId,context.config.diamondAddress,actor.wallet,tokenId));
      response.json(result);
    } catch(error) { const http=toHttpError(error); response.status(http.statusCode).json({error:http.statusCode>=500?"Funding readiness unavailable":http.message}); }
  });
  return router;
}
