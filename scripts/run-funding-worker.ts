import { Pool } from "pg";
import { pathToFileURL } from "node:url";
import { readFundingConfig } from "../packages/api/src/funding/config.js";
import { CoinbaseFundingProvider } from "../packages/api/src/funding/provider.js";
import { FundingProcessor } from "../packages/api/src/funding/processor.js";

export async function runFundingWorker(env:NodeJS.ProcessEnv=process.env) {
  const config=readFundingConfig(env);
  if (!config || env.API_LAYER_FUNDING_WORKER_ENABLED!=="true") throw new Error("Funding worker requires explicit enablement");
  const pool=new Pool({connectionString:config.databaseUrl,max:2,statement_timeout:30_000,idle_in_transaction_session_timeout:30_000});
  try {
    const processor=new FundingProcessor(pool,new CoinbaseFundingProvider(config));
    const counts={processed:0,retry:0,quarantined:0};
    for(let i=0;i<100;i++) { const result=await processor.runOne(); if(result==="idle") break; counts[result]++; }
    process.stdout.write(JSON.stringify(counts)+"\n");
  } finally {await pool.end();}
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) runFundingWorker().catch(()=>{process.stderr.write("Funding worker failed; inspect private database health\n");process.exitCode=1;});
