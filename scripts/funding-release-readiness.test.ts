import {mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import {spawnSync} from "node:child_process";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {describe,it,expect,vi} from "vitest";
import type {Pool} from "pg";
import * as releaseReadiness from "../packages/api/src/funding/release-readiness.js";
import {inspectFundingReleaseDatabase,runFundingReleaseReadiness,fundingMigrationChecksums,fundingReleaseMain,reportFundingReleaseReadinessFailure} from "./funding-release-readiness.js";
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
 it("uses process environment and argv defaults when no CLI arguments are supplied",async()=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),"funding-release-defaults-"));const output=path.join(directory,"default-readiness.json");const previousExitCode=process.exitCode;const previousArg=process.argv[2];const previousCwd=process.cwd();
  const envKeys=["API_LAYER_FUNDING_RELEASE_DB_URL","API_LAYER_FUNDING_RELEASE_ENV_FILE","CDP_API_KEY_ID","CDP_API_KEY_SECRET","API_LAYER_FUNDING_WEBHOOK_SUBSCRIPTION_ID","API_LAYER_FUNDING_WEBHOOK_SECRET","API_LAYER_FUNDING_ENABLED","API_LAYER_FUNDING_CHECKOUT_ENABLED"] as const;
  const previousEnv=Object.fromEntries(envKeys.map((key)=>[key,process.env[key]]));
  try {
   for(const key of envKeys)delete process.env[key];process.argv[2]=output;
   await expect(runFundingReleaseReadiness()).resolves.toMatchObject({database:{status:"unconfigured"},configured:{cdpServerCredentials:false,webhookSubscriptionId:false,webhookSecret:false,fundingEnabled:false,checkoutEnabled:false},productionReleaseAccepted:false,productionWrites:0});
   await fundingReleaseMain();
   const report=JSON.parse(await readFile(output,"utf8"));
   expect(report).toMatchObject({database:{status:"unconfigured"},configured:{cdpServerCredentials:false,webhookSubscriptionId:false,webhookSecret:false,fundingEnabled:false,checkoutEnabled:false},productionReleaseAccepted:false,productionWrites:0});
   expect(process.exitCode).toBe(2);
   process.argv.splice(2,1);process.chdir(directory);
   await fundingReleaseMain();
   const fallbackReport=JSON.parse(await readFile(path.join(directory,"output","coinbase-usdc","funding-release-readiness.json"),"utf8"));
   expect(fallbackReport.database.status).toBe("unconfigured");
  }finally{process.chdir(previousCwd);for(const key of envKeys){const value=previousEnv[key];if(value===undefined)delete process.env[key];else process.env[key]=value;}process.argv[2]=previousArg;process.exitCode=previousExitCode;await rm(directory,{recursive:true,force:true});}
 });
 it("does not treat a verified database inspection as production release authorization",async()=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),"funding-release-verified-"));const output=path.join(directory,"readiness.json");const previousExitCode=process.exitCode;const pool={end:vi.fn().mockResolvedValue(undefined)};
  const poolSpy=vi.spyOn(releaseReadiness,"createFundingReleasePool").mockReturnValue(pool as unknown as Pool);
  const inspectSpy=vi.spyOn(releaseReadiness,"inspectFundingReleaseDatabase").mockResolvedValue({status:"verified",readOnly:true,missingMigrations:[],checksumMismatches:[],missingTables:[],unsafeBrowserGrants:[],missingServiceGrants:[],rlsDisabled:[],missingUniqueIdentities:[]});
  try {
   process.exitCode=undefined;
   await fundingReleaseMain({API_LAYER_FUNDING_RELEASE_DB_URL:"postgres://disposable"},output);
   const report=JSON.parse(await readFile(output,"utf8"));
   expect(report).toMatchObject({database:{status:"verified",readOnly:true},productionReleaseAccepted:false,productionWrites:0});
   expect(process.exitCode).toBeUndefined();
   expect(pool.end).toHaveBeenCalledOnce();
  }finally{poolSpy.mockRestore();inspectSpy.mockRestore();process.exitCode=previousExitCode;await rm(directory,{recursive:true,force:true});}
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
 it("sanitizes command-line configuration failures",async()=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),"funding-release-cli-"));
  try {
   const script=path.join(path.dirname(fileURLToPath(import.meta.url)),"funding-release-readiness.ts");
   const tsx=path.resolve("node_modules/.bin/tsx");
   const result=spawnSync(tsx,[script],{cwd:directory,encoding:"utf8",env:{...process.env,API_LAYER_FUNDING_RELEASE_ENV_FILE:path.join(directory,"missing.env")} });
   expect(result.status).toBe(1);
   expect(result.stderr).toContain("Funding release inspection failed; inspect private configuration");
   expect(result.stderr).not.toContain(directory);
  }finally{await rm(directory,{recursive:true,force:true});}
 });
 it("reports CLI failures without leaking configuration and sets a failing exit code",()=>{
  const previousExitCode=process.exitCode;const write=vi.spyOn(process.stderr,"write").mockImplementation(()=>true);
  try {
   reportFundingReleaseReadinessFailure();
   expect(write).toHaveBeenCalledWith("Funding release inspection failed; inspect private configuration\n");
   expect(process.exitCode).toBe(1);
  }finally{write.mockRestore();process.exitCode=previousExitCode;}
 });
 it("runs the sanitized failure handler when invoked directly with a missing env file",async()=>{
  const previousExitCode=process.exitCode;const previousArg=process.argv[1];const previousEnv=process.env.API_LAYER_FUNDING_RELEASE_ENV_FILE;const write=vi.spyOn(process.stderr,"write").mockImplementation(()=>true);
  try {
   process.env.API_LAYER_FUNDING_RELEASE_ENV_FILE=path.join(os.tmpdir(),`missing-funding-release-${process.pid}.env`);
   process.argv[1]=path.resolve("scripts/funding-release-readiness.ts");
   vi.resetModules();
   await import("./funding-release-readiness.js");
   await vi.waitFor(()=>expect(write).toHaveBeenCalledWith("Funding release inspection failed; inspect private configuration\n"),{timeout:2_000});
   expect(process.exitCode).toBe(1);
  }finally{write.mockRestore();process.exitCode=previousExitCode;process.argv[1]=previousArg;if(previousEnv===undefined)delete process.env.API_LAYER_FUNDING_RELEASE_ENV_FILE;else process.env.API_LAYER_FUNDING_RELEASE_ENV_FILE=previousEnv;vi.resetModules();}
 });
 it("starts an explicit read-only transaction, rolls back errors and sanitizes diagnostics",async()=>{
  const query=vi.fn(async(sql:string)=>{if(sql.startsWith("SELECT"))throw new Error("postgres://private-key@private-host secret");return {rows:[],rowCount:0};}),release=vi.fn();
  const pool={connect:async()=>({query,release})};await expect(inspectFundingReleaseDatabase(pool as unknown as Pool,{one:"checksum"})).rejects.toThrow("Funding database release inspection unavailable");
  expect(query.mock.calls.map(call=>call[0])).toEqual(["BEGIN READ ONLY","SET LOCAL statement_timeout='5000ms'","SELECT current_setting('transaction_read_only') AS value","ROLLBACK"]);expect(release).toHaveBeenCalledOnce();
 });
});
