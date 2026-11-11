import {createHash} from "node:crypto";
import {readFile,writeFile,mkdir} from "node:fs/promises";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {parse} from "dotenv";
import {rootDir} from "./utils.js";
import {createFundingReleasePool, type ReleaseDatabaseReport} from "../packages/api/src/funding/release-readiness.js";
export {createFundingReleasePool,inspectFundingReleaseDatabase} from "../packages/api/src/funding/release-readiness.js";
import {inspectFundingReleaseDatabase} from "../packages/api/src/funding/release-readiness.js";
export async function fundingMigrationChecksums():Promise<Record<string,string>> {
 const {readdir}=await import("node:fs/promises");const result:Record<string,string>={};
 for(const name of (await readdir(path.join(rootDir,"db/migrations"))).filter(n=>/^\d{4}_.*\.sql$/.test(n)).sort())result[name]=createHash("sha256").update(await readFile(path.join(rootDir,"db/migrations",name))).digest("hex");return result;
}
export async function runFundingReleaseReadiness(env:NodeJS.ProcessEnv=process.env) {
 const empty:ReleaseDatabaseReport={status:"unconfigured",readOnly:false,missingMigrations:[],checksumMismatches:[],missingTables:[],unsafeBrowserGrants:[],missingServiceGrants:[],rlsDisabled:[],missingUniqueIdentities:[]};
 let database=empty;
 if(env.API_LAYER_FUNDING_RELEASE_DB_URL){const pool=createFundingReleasePool(env.API_LAYER_FUNDING_RELEASE_DB_URL);try{database=await inspectFundingReleaseDatabase(pool,await fundingMigrationChecksums());}catch{database={...empty,status:"unavailable"};}finally{await pool.end();}}
 // External evidence is never inferred from environment flags or fixture success.
 return {generatedAt:new Date().toISOString(),purpose:"read-only funding database rollout inspection",database,
  configured:{cdpServerCredentials:Boolean(env.CDP_API_KEY_ID && env.CDP_API_KEY_SECRET),webhookSubscriptionId:Boolean(env.API_LAYER_FUNDING_WEBHOOK_SUBSCRIPTION_ID),webhookSecret:Boolean(env.API_LAYER_FUNDING_WEBHOOK_SECRET),fundingEnabled:env.API_LAYER_FUNDING_ENABLED==="true",checkoutEnabled:env.API_LAYER_FUNDING_CHECKOUT_ENABLED==="true"},
  productionReleaseAccepted:false,externalAcceptance:"Review actual provider, frontend, deployed marketplace/indexer and exact-commit CI evidence separately; this command cannot authorize launch.",productionWrites:0};
}
export async function fundingReleaseMain(){
 let env=process.env;if(env.API_LAYER_FUNDING_RELEASE_ENV_FILE)env={...parse(await readFile(env.API_LAYER_FUNDING_RELEASE_ENV_FILE,"utf8")),...env};
 const report=await runFundingReleaseReadiness(env);const output=path.resolve(process.argv[2]??"output/coinbase-usdc/funding-release-readiness.json");await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+"\n");process.stdout.write("Funding database rollout inspection: "+report.database.status+"; no production release accepted.\n");if(report.database.status!=="verified")process.exitCode=2;
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href)fundingReleaseMain().catch(()=>{process.stderr.write("Funding release inspection failed; inspect private configuration\n");process.exitCode=1;});
