import {describe,it,expect,vi} from "vitest";
import type {Pool} from "pg";
import {inspectFundingReleaseDatabase,runFundingReleaseReadiness,fundingMigrationChecksums} from "./funding-release-readiness.js";
describe("funding database rollout inspection",()=>{
 it("reports unconfigured without interpreting deployment flags as launch acceptance or leaking secrets",async()=>{
  const result=await runFundingReleaseReadiness({CDP_API_KEY_ID:"private-id",CDP_API_KEY_SECRET:"private-secret",API_LAYER_FUNDING_WEBHOOK_SECRET:"private-hook",API_LAYER_FUNDING_ENABLED:"true",API_LAYER_FUNDING_CHECKOUT_ENABLED:"true"});
  expect(result).toMatchObject({database:{status:"unconfigured"},configured:{cdpServerCredentials:true,webhookSecret:true},productionReleaseAccepted:false,productionWrites:0});expect(JSON.stringify(result)).not.toMatch(/private-id|private-secret|private-hook/);
 });
 it("uses the actual checked-in migration bytes and fixed migration names",async()=>{const hashes=await fundingMigrationChecksums();expect(Object.keys(hashes)).toContain("0012_funding_purchase_requests.sql");expect(Object.values(hashes).every(value=>/^[a-f0-9]{64}$/.test(value))).toBe(true);});
 it("starts an explicit read-only transaction, rolls back errors and sanitizes diagnostics",async()=>{
  const query=vi.fn(async(sql:string)=>{if(sql.startsWith("SELECT"))throw new Error("postgres://private-key@private-host secret");return {rows:[],rowCount:0};}),release=vi.fn();
  const pool={connect:async()=>({query,release})};await expect(inspectFundingReleaseDatabase(pool as unknown as Pool,{one:"checksum"})).rejects.toThrow("Funding database release inspection unavailable");
  expect(query.mock.calls.map(call=>call[0])).toEqual(["BEGIN READ ONLY","SET LOCAL statement_timeout='5000ms'","SELECT current_setting('transaction_read_only') AS value","ROLLBACK"]);expect(release).toHaveBeenCalledOnce();
 });
});
