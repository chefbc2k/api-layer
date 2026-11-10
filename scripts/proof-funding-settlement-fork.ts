import {Pool} from "pg";
import {randomUUID} from "node:crypto";
import {FundingStore} from "../packages/api/src/funding/store.js";
import {FundingSettlementProcessor} from "../packages/api/src/funding/settlement.js";
import {openSync,closeSync} from "node:fs";
import {spawn} from "node:child_process";
import {createServer} from "node:net";
import {mkdir,writeFile} from "node:fs/promises";
import path from "node:path";
import {Contract,Interface,JsonRpcProvider,JsonRpcSigner,Wallet,keccak256} from "ethers";
import {verifyUsdcReceipt} from "../packages/api/src/funding/settlement.js";
import {prepareUsdcApproval} from "../packages/api/src/funding/approval.js";
import {BASE_SEPOLIA_USDC} from "../packages/api/src/funding/config.js";
function runtime(entries:Array<[string,string]>) {
  const word=(value:number)=>value.toString(16).padStart(4,"0");const start=6+11*entries.length+5;let header="60003560e01c";
  entries.forEach(([selector],index)=>{header+=`8063${selector}1461${word(start+17*index)}57`;});header+="60006000fd";
  let offset=start+17*entries.length,branches="",data="";
  for(const [,encoded] of entries){const bytes=encoded.slice(2),length=bytes.length/2;branches+=`5b5061${word(length)}61${word(offset)}60003961${word(length)}6000f3`;offset+=length;data+=bytes;}
  return `0x${header}${branches}${data}`;
}
let phase="source";
async function main() {
  // Source is read-only. All signers and writes below use the separately created loopback RPC.
  const source=process.env.API_LAYER_FUNDING_FORK_RPC_URL ?? "https://sepolia.base.org";
  const sourceProvider=new JsonRpcProvider(source);
  let forkBlock:number,sourceCode:string;
  try {
    if(Number((await sourceProvider.getNetwork()).chainId)!==84532) throw new Error("Base Sepolia fork required");
    forkBlock=await sourceProvider.getBlockNumber();sourceCode=await sourceProvider.getCode(BASE_SEPOLIA_USDC);
    if(sourceCode==="0x") throw new Error("Native USDC unavailable");
  }finally{sourceProvider.destroy();}
  const listener=createServer();await new Promise<void>(resolve=>listener.listen(0,"127.0.0.1",resolve));const port=(listener.address() as {port:number}).port;
  await new Promise<void>(resolve=>listener.close(()=>resolve()));
  phase="fork-start";await mkdir(".runtime",{recursive:true});const logFd=openSync(".runtime/funding-fork-node.log","w");
  const node=spawn(process.env.ANVIL_BIN ?? "/Users/chef/.foundry/bin/anvil",["--host","127.0.0.1","--port",String(port),"--fork-url",source,"--fork-block-number",String(forkBlock),"--chain-id","84532","--silent"],{stdio:["ignore","ignore",logFd]});closeSync(logFd);
  const rpc=new JsonRpcProvider(`http://127.0.0.1:${port}`,84532,{cacheTimeout:-1});
  try {
    let ready=false;for(let i=0;i<300;i++){try{await rpc.send("eth_chainId",[]);ready=true;break;}catch{await new Promise(resolve=>setTimeout(resolve,100));}}
    if(!ready) throw new Error("Local fork unavailable");
    phase="native-token";const distributor=await rpc.getSigner(0),buyer=Wallet.createRandom().connect(rpc),minter=await rpc.getSigner(2);
    await rpc.send("anvil_setBalance",[await buyer.getAddress(),"0x3635c9adc5dea00000"]);
    const recipient=await buyer.getAddress(),diamond="0x00000000000000000000000000000000000000dd",amount=10_000_001n;
    const tokenAbi=["function masterMinter() view returns(address)","function configureMinter(address,uint256) returns(bool)","function mint(address,uint256) returns(bool)","function transfer(address,uint256) returns(bool)","function approve(address,uint256) returns(bool)","function allowance(address,address) view returns(uint256)","function balanceOf(address) view returns(uint256)"];
    const token=new Contract(BASE_SEPOLIA_USDC,tokenAbi,rpc);const master=String(await token.masterMinter());
    await rpc.send("anvil_impersonateAccount",[master]);await rpc.send("anvil_setBalance",[master,"0xde0b6b3a7640000"]);
    const administrator=new Contract(BASE_SEPOLIA_USDC,tokenAbi,new JsonRpcSigner(rpc,master));
    phase="configure-minter";await (await administrator.configureMinter(await minter.getAddress(),amount)).wait();
    phase="mint";await (await new Contract(BASE_SEPOLIA_USDC,tokenAbi,minter).mint(await distributor.getAddress(),amount)).wait();
    phase="transfer";const send=await new Contract(BASE_SEPOLIA_USDC,tokenAbi,distributor).transfer(recipient,amount);await send.wait();
    await rpc.send("anvil_mine",["0x80","0x0"]);
    phase="settlement";const settlement=await verifyUsdcReceipt(rpc,{chainId:84532,txHash:send.hash,recipient,amountUnits:amount});
    let wrongAmountRejected=false;try{await verifyUsdcReceipt(rpc,{chainId:84532,txHash:send.hash,recipient,amountUnits:amount-1n});}catch{wrongAmountRejected=true;}
    if(!wrongAmountRejected) throw new Error("Wrong settlement amount accepted");
    const fixture=new Interface(["function getUsdcToken() view returns(address)","function getListing(uint256) view returns(tuple(uint256 tokenId,address seller,uint256 price,uint256 createdAt,uint256 createdBlock,uint256 lastUpdateBlock,uint256 expiresAt,bool isActive))"]);
    await rpc.send("anvil_setCode",[diamond,runtime([
      [fixture.getFunction("getUsdcToken")!.selector.slice(2),fixture.encodeFunctionResult("getUsdcToken",[BASE_SEPOLIA_USDC])],
      [fixture.getFunction("getListing")!.selector.slice(2),fixture.encodeFunctionResult("getListing",[[1,await distributor.getAddress(),amount,0,0,0,0,true]])],
    ])]);await rpc.send("evm_mine",[]);
    const body={tokenId:"1",maximumUsdcUnits:amount.toString(),authorizeApprovalPreparation:true as const};
    phase="approval";const approval=await prepareUsdcApproval(rpc,84532,diamond,recipient,body);
    const sign=async(prepared:typeof approval)=>{
      const tx=prepared.transaction;if(!tx)throw new Error("Missing approval transaction");
      const sent=await buyer.sendTransaction({to:tx.to,data:tx.data,value:BigInt(tx.value),gasLimit:BigInt(tx.gas),chainId:BigInt(tx.chainId)});await sent.wait();return sent.hash;
    };
    const approvalHash=await sign(approval);
    if(BigInt(await token.allowance(recipient,diamond))!==amount) throw new Error("Approval amount mismatch");
    const buyerToken=new Contract(BASE_SEPOLIA_USDC,tokenAbi,buyer);await (await buyerToken.approve(diamond,1n)).wait();
    const reset=await prepareUsdcApproval(rpc,84532,diamond,recipient,body);
    if(reset.approvalUsdcUnits!=="0")throw new Error("Reset was not bounded to zero");const resetHash=await sign(reset);
    if(BigInt(await token.allowance(recipient,diamond))!==0n)throw new Error("Reset not confirmed");
    const afterReset=await prepareUsdcApproval(rpc,84532,diamond,recipient,body);const finalApprovalHash=await sign(afterReset);
    if(BigInt(await token.allowance(recipient,diamond))!==amount || BigInt(await token.balanceOf(recipient))!==amount) throw new Error("Approval changed custody or bound");
    let databaseProof:unknown=null;
    if(process.env.API_LAYER_FUNDING_TEST_DB_URL){
      phase="database";const databaseUrl=new URL(process.env.API_LAYER_FUNDING_TEST_DB_URL);
      if(!["127.0.0.1","localhost"].includes(databaseUrl.hostname))throw new Error("Disposable local database required");
      const pool=new Pool({connectionString:databaseUrl.toString()});
      try{
        const store=new FundingStore(pool),userId="fork_"+randomUUID().replaceAll("-","");
        const {attempt}=await store.beginAttempt({userId,kind:"hosted",key:"native_fork_0001",fingerprint:"a".repeat(64),wallet:recipient,chainId:84532,sandbox:true});
        await pool.query("UPDATE funding_attempts SET state='ready',provider_status='ONRAMP_ORDER_STATUS_COMPLETED',provider_tx_hash=$2,expected_usdc_units=$3 WHERE id=$1",[attempt.id,send.hash,amount.toString()]);
        const processor=new FundingSettlementProcessor(pool,rpc,84532);const result=await processor.runOne();if(result!=="test_verified")throw new Error("Native receipt persistence failed");
        const persisted=(await pool.query("SELECT amount_units::text AS amount,tx_hash,log_index FROM funding_settlements WHERE attempt_id=$1",[attempt.id])).rows[0];
        if(persisted.amount!==amount.toString() || persisted.tx_hash!==send.hash.toLowerCase())throw new Error("Native receipt identity mismatch");
        databaseProof={status:result,replay:await processor.runOne(),amountUnits:persisted.amount,logIndex:persisted.log_index};
      }finally{await pool.end();}
    }
    const output=path.resolve(process.argv[2] ?? "output/coinbase-usdc/funding-settlement-approval-fork.json");await mkdir(path.dirname(output),{recursive:true});
    await writeFile(output,JSON.stringify({environment:"disposable-Base-Sepolia-fork",sourceChainId:84532,forkBlock,nativeUsdc:BASE_SEPOLIA_USDC,nativeUsdcProxyCodeHash:keccak256(sourceCode),nativeUsdcCodeReplaced:false,listingFixture:true,providerSandbox:false,productionTransfers:0,databaseProof,sandboxSettlementStatus:"test_verified",settlement,wrongAmountRejected,approvalHash,resetHash,finalApprovalHash,approvedUnits:amount.toString(),recipientBalanceUnits:(await token.balanceOf(recipient)).toString()},null,2)+"\n");
    process.stdout.write("Native USDC fork proof passed: finalized transfer, exact bounded approval, confirmed zero reset; local writes only.\n");
  }finally{rpc.destroy();node.kill("SIGTERM");}
}
main().catch(()=>{process.stderr.write("Funding settlement/approval fork proof failed at "+phase+"; inspect private local environment\n");process.exitCode=1;});
