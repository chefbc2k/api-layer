import {describe,it,expect,afterAll} from "vitest";
import {createFundingReleasePool,inspectFundingReleaseDatabase,fundingMigrationChecksums} from "./funding-release-readiness.js";
const database=process.env.API_LAYER_FUNDING_TEST_DB_URL;
describe.skipIf(!database)("actual funding database rollout inspection",()=>{
 const pool=createFundingReleasePool(database!);afterAll(async()=>{await pool.end();});
 it("verifies migration checksums, private grants, RLS and unique receipt identities under read-only inspection",async()=>{
  expect(["localhost","127.0.0.1"]).toContain(new URL(database!).hostname);
  const expected=await fundingMigrationChecksums();await pool.query("CREATE TABLE IF NOT EXISTS api_layer_schema_migrations(name text PRIMARY KEY,sha256 text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())");
  for(const [name,hash] of Object.entries(expected))await pool.query("INSERT INTO api_layer_schema_migrations(name,sha256) VALUES($1,$2) ON CONFLICT(name) DO UPDATE SET sha256=excluded.sha256",[name,hash]);
  expect(await inspectFundingReleaseDatabase(pool,expected)).toMatchObject({status:"verified",readOnly:true,missingMigrations:[],checksumMismatches:[],unsafeBrowserGrants:[],missingUniqueIdentities:[]});
 });
 it("identifies missing or changed migration content without accepting schema alone",async()=>{
  const result=await inspectFundingReleaseDatabase(pool,{"0012_funding_purchase_requests.sql":"0".repeat(64),"9999_missing.sql":"1".repeat(64)});
  expect(result).toMatchObject({status:"incomplete",missingMigrations:["9999_missing.sql"],checksumMismatches:["0012_funding_purchase_requests.sql"]});
 });
 it("detects browser grant and RLS drift even when history hashes match",async()=>{
  await pool.query("GRANT SELECT ON funding_purchase_requests TO anon");await pool.query("ALTER TABLE funding_purchase_requests DISABLE ROW LEVEL SECURITY");try{
   const result=await inspectFundingReleaseDatabase(pool,await fundingMigrationChecksums());expect(result).toMatchObject({status:"incomplete",unsafeBrowserGrants:["anon:funding_purchase_requests"],rlsDisabled:["funding_purchase_requests"]});
  }finally{await pool.query("REVOKE SELECT ON funding_purchase_requests FROM anon");await pool.query("ALTER TABLE funding_purchase_requests ENABLE ROW LEVEL SECURITY");}
 });
});
