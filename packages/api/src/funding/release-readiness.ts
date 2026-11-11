import {Pool} from "pg";
export function createFundingReleasePool(connectionString:string){return new Pool({connectionString,max:1,connectionTimeoutMillis:5000,statement_timeout:5000});}
export type ReleaseDatabaseReport={status:"verified"|"unconfigured"|"unavailable"|"incomplete";readOnly:boolean;missingMigrations:string[];checksumMismatches:string[];missingTables:string[];unsafeBrowserGrants:string[];missingServiceGrants:string[];rlsDisabled:string[];missingUniqueIdentities:string[]};
const tables=["funding_quotes","funding_attempts","funding_webhook_inbox","funding_subscription_health","funding_settlements","funding_purchase_requests"];
export async function inspectFundingReleaseDatabase(pool:Pool,expected:Record<string,string>):Promise<ReleaseDatabaseReport> {
 const report:ReleaseDatabaseReport={status:"incomplete",readOnly:false,missingMigrations:[],checksumMismatches:[],missingTables:[],unsafeBrowserGrants:[],missingServiceGrants:[],rlsDisabled:[],missingUniqueIdentities:[]};
 const client=await pool.connect();try{
  await client.query("BEGIN READ ONLY");await client.query("SET LOCAL statement_timeout='5000ms'");
  report.readOnly=(await client.query("SELECT current_setting('transaction_read_only') AS value")).rows[0].value==="on";
  const history=(await client.query("SELECT to_regclass('public.api_layer_schema_migrations') IS NOT NULL AS present")).rows[0].present;
  const actual:Record<string,string>=history?Object.fromEntries((await client.query("SELECT name,sha256 FROM public.api_layer_schema_migrations")).rows.map(row=>[row.name,row.sha256])):{};
  for(const [name,checksum] of Object.entries(expected)){if(!actual[name])report.missingMigrations.push(name);else if(actual[name]!==checksum)report.checksumMismatches.push(name);}
  for(const table of tables){
   const exists=await client.query("SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass($1)",["public."+table]);
   if(!exists.rowCount){report.missingTables.push(table);continue;}
   if(!exists.rows[0].relrowsecurity)report.rlsDisabled.push(table);
   for(const role of ["anon","authenticated"]){
    const allowed=(await client.query("SELECT has_table_privilege($1,$2,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS value",[role,"public."+table])).rows[0].value;
    if(allowed)report.unsafeBrowserGrants.push(role+":"+table);
   }
   if(!(await client.query("SELECT has_table_privilege('service_role',$1,'SELECT') AS value",["public."+table])).rows[0].value)report.missingServiceGrants.push(table);
  }
  for(const [table,keys] of [["funding_settlements",["chain_id","tx_hash","log_index"]],["funding_purchase_requests",["chain_id","tx_hash"]]] as const){
   if(report.missingTables.includes(table)){report.missingUniqueIdentities.push(table);continue;}
   const indexes=await client.query(`SELECT array_agg(a.attname::text ORDER BY u.ordinality) AS columns FROM pg_index i CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY u(attnum,ordinality) JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=u.attnum WHERE i.indrelid=to_regclass($1) AND i.indisunique AND i.indisvalid AND i.indisready AND i.indpred IS NULL AND u.ordinality<=i.indnkeyatts GROUP BY i.indexrelid`,["public."+table]);
   if(!indexes.rows.some(row=>JSON.stringify(row.columns)===JSON.stringify(keys)))report.missingUniqueIdentities.push(table);
  }
  await client.query("COMMIT");
  report.status=report.readOnly && [report.missingMigrations,report.checksumMismatches,report.missingTables,report.unsafeBrowserGrants,report.missingServiceGrants,report.rlsDisabled,report.missingUniqueIdentities].every(items=>items.length===0)?"verified":"incomplete";return report;
 }catch{await client.query("ROLLBACK").catch(()=>undefined);throw new Error("Funding database release inspection unavailable");}finally{client.release();}
}
