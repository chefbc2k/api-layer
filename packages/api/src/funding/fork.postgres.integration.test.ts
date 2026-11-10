import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {readFile} from "node:fs/promises";
import {describe,it,expect} from "vitest";
const enabled=process.env.API_LAYER_FUNDING_RUN_FORK_PROOF==="true" && process.env.API_LAYER_FUNDING_TEST_DB_URL;
describe.skipIf(!enabled)("native Circle USDC fork and database handoff",()=>{
  it("verifies the actual native receipt, persists unique test settlement and signs bounded approval and explicit purchase through HTTP on a disposable fork",async()=>{
    const result=await promisify(execFile)("pnpm",["exec","tsx","scripts/proof-funding-settlement-fork.ts",".runtime/funding-fork-proof.json"],{env:process.env,timeout:180_000,maxBuffer:1024*1024});
    expect(result.stdout).toContain("Native USDC fork proof passed");
    const artifact=JSON.parse(await readFile(".runtime/funding-fork-proof.json","utf8"));
    expect(artifact).toMatchObject({sourceChainId:84532,nativeUsdcCodeReplaced:false,providerSandbox:false,productionTransfers:0,approvedUnits:"10000001",databaseProof:{status:"test_verified",replay:"idle",amountUnits:"10000001"},purchaseProof:{status:"test_confirmed",marketplaceFixture:true,buyerSigned:true,priceChangeRejected:true,privateLookupVerified:true,replayVerified:true,proof:{priceUsdcUnits:"10000001"}}});
  },180_000);
});
