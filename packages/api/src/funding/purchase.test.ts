import {Interface,type Provider} from "ethers";
import {describe,it,expect,vi} from "vitest";
import {preparePurchase,verifyPurchase,purchaseInput} from "./purchase.js";
import {BASE_SEPOLIA_USDC} from "./config.js";
const buyer="0x00000000000000000000000000000000000000AA",seller="0x00000000000000000000000000000000000000bb",diamond="0x00000000000000000000000000000000000000dd";
const abi=new Interface(["function getUsdcToken() view returns(address)","function getListing(uint256) view returns(tuple(uint256 tokenId,address seller,uint256 price,uint256 createdAt,uint256 createdBlock,uint256 lastUpdateBlock,uint256 expiresAt,bool isActive))","function decimals() view returns(uint8)","function balanceOf(address) view returns(uint256)","function allowance(address,address) view returns(uint256)","function ownerOf(uint256) view returns(address)","function getOriginalOwner(uint256) view returns(address)","function isInEscrow(uint256) view returns(bool)","function isPaused() view returns(bool)","function paymentPaused() view returns(bool)","event AssetPurchased(uint256 indexed tokenId,address indexed seller,address indexed buyer,uint256 price)","event Transfer(address indexed from,address indexed to,uint256 value)"]);
export const purchaseFixtureInput={fundingAttemptId:"00000000-0000-4000-8000-000000000001",tokenId:"1",expectedPriceUsdcUnits:"10000001",expectedSeller:seller,authorizePurchase:true as const};
function fixture(overrides:Record<string,unknown[]>={}) {
 const block={number:100,timestamp:Math.floor(Date.now()/1000),hash:"0x"+"ab".repeat(32)};
 const values:Record<string,unknown[]>={getUsdcToken:[BASE_SEPOLIA_USDC],getListing:[[1,seller,10000001n,0,0,0,0,true]],decimals:[6],balanceOf:[10000001n],allowance:[10000001n],ownerOf:[diamond],getOriginalOwner:[seller],isInEscrow:[true],isPaused:[false],paymentPaused:[false],...overrides};
 const rpc={getNetwork:vi.fn(async()=>({chainId:84532n})),getBlockNumber:vi.fn(async()=>100),getBlock:vi.fn(async()=>block),getCode:vi.fn(async()=>"0x"),getBalance:vi.fn(async()=>10n**18n),estimateGas:vi.fn(async()=>100000n),getFeeData:vi.fn(async()=>({maxFeePerGas:2n})),broadcastTransaction:vi.fn(),call:vi.fn(async(tx:{data:string})=>{const parsed=abi.parseTransaction(tx)!;return abi.encodeFunctionResult(parsed.name,values[parsed.name]);})};
 return {rpc,values,run:()=>preparePurchase(rpc as unknown as Provider,84532,diamond,buyer,purchaseFixtureInput)};
}
describe("funded explicit customer purchase",()=>{
 it("prepares a fresh exact allowance purchase without signing or broadcasting",async()=>{const f=fixture(),result=await f.run();expect(result).toMatchObject({priceUsdcUnits:"10000001",seller,requiresUserSignature:true,onchainConstraints:{seller:false,deadline:false},transaction:{from:buyer,to:diamond,value:"0x0"}});expect(f.rpc.broadcastTransaction).not.toHaveBeenCalled();});
 it.each([{allowance:[10000002n]},{balanceOf:[1n]},{ownerOf:[seller]},{getOriginalOwner:[buyer]},{isInEscrow:[false]},{isPaused:[true]},{paymentPaused:[true]},{getListing:[[1,seller,10000002n,0,0,0,0,true]]},{getListing:[[1,seller,10000001n,0,0,0,0,false]]}])("rejects changed funding, price, seller ownership or pause state %s",async overrides=>{await expect(fixture(overrides).run()).rejects.toThrow();});
 it.each([{...purchaseFixtureInput,authorizePurchase:false},{...purchaseFixtureInput,expectedPriceUsdcUnits:"0"},{...purchaseFixtureInput,expectedSeller:"bad"},{...purchaseFixtureInput,spender:buyer}])("requires explicit bounded purchase consent %s",input=>expect(()=>purchaseInput.parse(input)).toThrow());
 it("verifies the signed transaction, finalized event, actual native-USDC debit and receipt-block ownership",async()=>{
  const f=fixture(),intent=await f.run(),hash="0x"+"cd".repeat(32),blockHash="0x"+"ab".repeat(32);
  const event=abi.encodeEventLog(abi.getEvent("AssetPurchased")!,[1,seller,buyer,10000001n]),debit=abi.encodeEventLog(abi.getEvent("Transfer")!,[buyer,seller,10000001n]);
  const tx={hash,chainId:84532n,from:buyer,to:diamond,data:intent.transaction.data,value:0n};
  const receipt={hash,status:1,blockNumber:100,blockHash,logs:[{address:diamond,...event,removed:false},{address:BASE_SEPOLIA_USDC,...debit,removed:false}]};
  const rpc={...f.rpc,getTransaction:vi.fn(async()=>tx),getTransactionReceipt:vi.fn(async()=>receipt)};f.values.ownerOf=[buyer];
  expect(await verifyPurchase(rpc as unknown as Provider,intent,hash)).toMatchObject({txHash:hash,priceUsdcUnits:"10000001",owner:buyer});
  for(const field of ["from","to","data","value","chainId"] as const){const old=tx[field];Object.assign(tx,{[field]:field==="value"?1n:field==="chainId"?8453n:field==="data"?"0x":seller});await expect(verifyPurchase(rpc as unknown as Provider,intent,hash)).rejects.toThrow();Object.assign(tx,{[field]:old});}
  receipt.status=0;await expect(verifyPurchase(rpc as unknown as Provider,intent,hash)).rejects.toThrow();receipt.status=1;
  receipt.logs[1].data="0x"+(10000000n).toString(16).padStart(64,"0");await expect(verifyPurchase(rpc as unknown as Provider,intent,hash)).rejects.toThrow("payment or ownership");
 });
});
