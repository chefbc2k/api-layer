import {mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {describe,it,expect,vi} from "vitest";
import type {Pool} from "pg";
import {inspectFundingReleaseDatabase,runFundingReleaseReadiness,fundingMigrationChecksums,fundingReleaseMain} from "./funding-release-readiness.js";
describe("funding database rollout inspection",()=>{
 it("reports unconfigured without interpreting deployment flags as launch acceptance or leaking secrets",async()=>{
  const result=await runFundingReleaseReadiness({CDP_API_KEY_ID:"private-id",CDP_API_KEY_SECRET:"private-secret",API_LAYER_FUNDING_WEBHOOK_SECRET:"private-hook",API_LAYER_FUNDING_ENABLED:"true",API_LAYER_FUNDING_CHECKOUT_ENABLED:"true"});
  expect(result).toMatchObject({database:{status:"unconfigured"},configured:{cdpServerCredentials:true,webhookSecret:true},productionReleaseAccepted:false,productionWrites:0});expect(JSON.stringify(result)).not.toMatch(/private-id|private-secret|private-hook/);
 });
 it("fails closed when a configured database endpoint is unavailable",async()=>{
  const result=await runFundingReleaseReadiness({API_LAYER_FUNDING_RELEASE_DB_URL:"postgres://read-only:private-secret@127.0.0.1:1/funding?connect_timeout=1"});
  expect(result.database).toMatchObject({status:"unavailable",readOnly:false});
  expect(result.productionReleaseAccepted).toBe(false);
  expect(JSON.stringify(result)).not.toContain("private-secret");
 });
 it("uses the actual checked-in migration bytes and fixed migration names",async()=>{const hashes=await fundingMigrationChecksums();expect(Object.keys(hashes)).toContain("0012_funding_purchase_requests.sql");expect(Object.values(hashes).every(value=>/^[a-f0-9]{64}$/.test(value))).toBe(true);});
 it("writes an unconfigured read-only report and fails closed without a database URL",async()=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),"funding-release-readiness-"));const output=path.join(directory,"reports","readiness.json");const previousExitCode=process.exitCode;
  try {
   await fundingReleaseMain({CDP_API_KEY_ID:"private-id",CDP_API_KEY_SECRET:"private-secret",API_LAYER_FUNDING_ENABLED:"true"},output);
   const report=JSON.parse(await readFile(output,"utf8"));
   expect(report).toMatchObject({database:{status:"unconfigured"},configured:{cdpServerCredentials:true,fundingEnabled:true},productionReleaseAccepted:false,productionWrites:0});
   expect(JSON.stringify(report)).not.toMatch(/private-id|private-secret/);
   expect(process.exitCode).toBe(2);
  }finally{process.exitCode=previousExitCode;await rm(directory,{recursive:true,force:true});}
 });
 it("loads an explicit env file while allowing explicit process values to override it",async()=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),"funding-release-env-"));const envFile=path.join(directory,"release.env");const output=path.join(directory,"readiness.json");const previousExitCode=process.exitCode;
  try {
   await writeFile(envFile,"CDP_API_KEY_ID=file-id\nCDP_API_KEY_SECRET=file-secret\nAPI_LAYER_FUNDING_ENABLED=true\n");
   await fundingReleaseMain({API_LAYER_FUNDING_RELEASE_ENV_FILE:envFile,API_LAYER_FUNDING_ENABLED:"false"},output);
   const report=JSON.parse(await readFile(output,"utf8"));
   expect(report.configured).toMatchObject({cdpServerCredentials:true,fundingEnabled:false});
   expect(report.database.status).toBe("unconfigured");
   expect(JSON.stringify(report)).not.toMatch(/file-id|file-secret/);
  }finally{process.exitCode=previousExitCode;await rm(directory,{recursive:true,force:true});}
 });
 it("starts an explicit read-only transaction, rolls back errors and sanitizes diagnostics",async()=>{
  const query=vi.fn(async(sql:string)=>{if(sql.startsWith("SELECT"))throw new Error("postgres://private-key@private-host secret");return {rows:[],rowCount:0};}),release=vi.fn();
  const pool={connect:async()=>({query,release})};await expect(inspectFundingReleaseDatabase(pool as unknown as Pool,{one:"checksum"})).rejects.toThrow("Funding database release inspection unavailable");
  expect(query.mock.calls.map(call=>call[0])).toEqual(["BEGIN READ ONLY","SET LOCAL statement_timeout='5000ms'","SELECT current_setting('transaction_read_only') AS value","ROLLBACK"]);expect(release).toHaveBeenCalledOnce();
 });
});
