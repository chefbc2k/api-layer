import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdir,writeFile } from "node:fs/promises";
import path from "node:path";
import { Interface,JsonRpcProvider } from "ethers";
import { inspectReadiness } from "../packages/api/src/funding/readiness.js";
import { BASE_SEPOLIA_USDC } from "../packages/api/src/funding/config.js";

// Disposable EVM read fixtures, not production marketplace execution or provider acceptance.
function runtime(entries:Array<[string,string]>) {
  const word=(value:number)=>value.toString(16).padStart(4,"0");
  const start=6+11*entries.length+5;
  let header="60003560e01c";
  entries.forEach(([selector],index)=>{header+=`8063${selector}1461${word(start+17*index)}57`;});
  header+="60006000fd";
  let offset=start+17*entries.length,branches="",data="";
  for(const [,encoded] of entries) {
    const bytes=encoded.replace(/^0x/,"");const length=bytes.length/2;
    branches+=`5b5061${word(length)}61${word(offset)}60003961${word(length)}6000f3`;offset+=length;data+=bytes;
  }
  return `0x${header}${branches}${data}`;
}
async function main() {
  const listener=createServer();await new Promise<void>(resolve=>listener.listen(0,"127.0.0.1",resolve));
  const port=(listener.address() as {port:number}).port;await new Promise<void>(resolve=>listener.close(()=>resolve()));
  const processHandle=spawn(process.env.ANVIL_BIN ?? "/Users/chef/.foundry/bin/anvil",["--host","127.0.0.1","--port",String(port),"--chain-id","84532","--silent"],{stdio:"ignore"});
  const rpc=new JsonRpcProvider(`http://127.0.0.1:${port}`,84532,{cacheTimeout:-1});
  const wallet="0x00000000000000000000000000000000000000aa",diamond="0x00000000000000000000000000000000000000dd";
  const abi=new Interface(["function getUsdcToken() view returns(address)","function getListing(uint256) view returns(tuple(uint256 tokenId,address seller,uint256 price,uint256 createdAt,uint256 createdBlock,uint256 lastUpdateBlock,uint256 expiresAt,bool isActive))","function purchaseAsset(uint256)","function decimals() view returns(uint8)","function balanceOf(address) view returns(uint256)","function allowance(address,address) view returns(uint256)"]);
  const entry=(name:string,args:unknown[]):[string,string]=>[abi.getFunction(name)!.selector.slice(2),abi.encodeFunctionResult(name,args)];
  const tokenCode=(balance:bigint,allowance:bigint)=>runtime([entry("decimals",[6]),entry("balanceOf",[balance]),entry("allowance",[allowance])]);
  const diamondCode=(token:string)=>runtime([entry("getUsdcToken",[token]),entry("getListing",[[1,"0x00000000000000000000000000000000000000bb",10_000_001n,0,0,0,0,true]]),entry("purchaseAsset",[])]);
  try {
    let ready=false;
    for(let i=0;i<40;i++) {try {await rpc.send("eth_chainId",[]);ready=true;break;}catch {await new Promise(resolve=>setTimeout(resolve,100));}}
    if(!ready) throw new Error("Local Anvil unavailable");
    await rpc.send("anvil_setCode",[diamond,diamondCode(BASE_SEPOLIA_USDC)]);
    await rpc.send("anvil_setBalance",[wallet,"0xde0b6b3a7640000"]);
    const observations:Record<string,unknown>={};
    for(const [name,balance,allowance] of [["ready",10_000_001n,10_000_001n],["one_unit_short",10_000_000n,10_000_001n],["allowance_short",10_000_001n,10_000_000n]] as const) {
      await rpc.send("anvil_setCode",[BASE_SEPOLIA_USDC,tokenCode(balance,allowance)]);await rpc.send("evm_mine",[]);
      observations[name]=await inspectReadiness(rpc,84532,diamond,wallet,"1");
    }
    const result=observations.ready as Awaited<ReturnType<typeof inspectReadiness>>;
    if(result.readiness!=="ready_for_user_signature" || result.requiredUsdcUnits!=="10000001") throw new Error("Ready proof failed");
    for(const name of ["one_unit_short","allowance_short"]) if((observations[name] as typeof result).readiness!=="action_required") throw new Error("Shortfall proof failed");
    await rpc.send("anvil_setCode",[BASE_SEPOLIA_USDC,tokenCode(10_000_001n,10_000_001n)]);
    await rpc.send("anvil_setCode",[wallet,"0x00"]);await rpc.send("evm_mine",[]);
    observations.smartWallet=await inspectReadiness(rpc,84532,diamond,wallet,"1");
    if(!(observations.smartWallet as typeof result).blockers.includes("customer_sponsorship_unverified")) throw new Error("Sponsorship proof failed");
    await rpc.send("anvil_setCode",[diamond,diamondCode(wallet)]);await rpc.send("evm_mine",[]);
    let mismatch=false;try {await inspectReadiness(rpc,84532,diamond,wallet,"1");}catch {mismatch=true;}
    if(!mismatch) throw new Error("Token mismatch not rejected");
    const output=path.resolve(process.argv[2] ?? "output/coinbase-usdc/readiness-local-proof.json");
    await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify({environment:"disposable-local-anvil",contractFixture:"read-only ABI dispatch runtime",productionMarketplaceExecution:false,providerSandbox:false,tokenMismatchRejected:mismatch,nonce:await rpc.getTransactionCount(wallet),observations},null,2)+"\n");
    process.stdout.write("Local readiness EVM proof passed: exact units, allowance, sponsorship and token mismatch; no transfers.\n");
  } finally {rpc.destroy();processHandle.kill("SIGTERM");}
}
main().catch(()=>{process.stderr.write("Local funding readiness proof failed\n");process.exitCode=1;});
