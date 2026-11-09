import { FundingReconciler } from "../packages/api/src/funding/reconciliation.js";
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
    const provider=new CoinbaseFundingProvider(config);
    const processor=new FundingProcessor(pool,provider);
    const counts={processed:0,retry:0,quarantined:0};
    for(let i=0;i<100;i++) { const result=await processor.runOne(); if(result==="idle") break; counts[result]++; }
    if(env.API_LAYER_FUNDING_RECONCILIATION_ENABLED==="true") {
      const reconciler=new FundingReconciler(pool,provider);
      const health=await reconciler.checkHealth({subscriptionId:env.API_LAYER_FUNDING_WEBHOOK_SUBSCRIPTION_ID,webhookUrl:env.API_LAYER_FUNDING_WEBHOOK_URL});
      const reconciliation={updated:0,waiting:0,retry:0,attention:0,page:0};
      for(let i=0;i<100;i++) {const result=await reconciler.runOne();if(result==="idle") break;reconciliation[result]++;}
      process.stdout.write(JSON.stringify({inbox:counts,reconciliation,subscriptionHealth:health})+"\n");
      if(health!=="healthy" || reconciliation.attention>0) process.exitCode=2;
    } else process.stdout.write(JSON.stringify(counts)+"\n");
  } finally {await pool.end();}
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) runFundingWorker().catch(()=>{process.stderr.write("Funding worker failed; inspect private database health\n");process.exitCode=1;});
