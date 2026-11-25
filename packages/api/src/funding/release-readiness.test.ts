import { describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { createFundingReleasePool, inspectFundingReleaseDatabase } from "./release-readiness.js";

const tableNames = ["funding_quotes", "funding_attempts", "funding_webhook_inbox", "funding_subscription_health", "funding_settlements", "funding_purchase_requests"];
const uniqueIndexes: Record<string, string[][]> = {
  funding_settlements: [["chain_id", "tx_hash", "log_index"]],
  funding_purchase_requests: [["chain_id", "tx_hash"]],
};
function databaseHarness(options: {
  migrations?: Record<string, string> | null;
  missingTables?: string[];
  disabledRls?: string[];
  browserGrants?: string[];
  missingServiceGrants?: string[];
  unique?: Record<string, string[][]>;
  readOnly?: boolean;
  fail?: Error;
  rollbackFail?: Error;
} = {}) {
  const calls: Array<{ sql: string; values?: unknown[] }> = [];
  const query = vi.fn(async (sql: string, values?: unknown[]) => {
    calls.push({ sql, values });
    if (sql === "ROLLBACK" && options.rollbackFail) throw options.rollbackFail;
    if (options.fail && sql.startsWith("SELECT")) throw options.fail;
    if (sql.startsWith("SELECT current_setting")) return { rows: [{ value: options.readOnly === false ? "off" : "on" }], rowCount: 1 };
    if (sql.startsWith("SELECT to_regclass")) return { rows: [{ present: options.migrations !== null }], rowCount: 1 };
    if (sql.startsWith("SELECT name,sha256")) return { rows: Object.entries(options.migrations ?? {}).map(([name, sha256]) => ({ name, sha256 })), rowCount: Object.keys(options.migrations ?? {}).length };
    if (sql.startsWith("SELECT relrowsecurity")) {
      const table = String(values?.[0]).replace("public.", "");
      return options.missingTables?.includes(table) ? { rows: [], rowCount: 0 } : { rows: [{ relrowsecurity: !options.disabledRls?.includes(table) }], rowCount: 1 };
    }
    if (sql.startsWith("SELECT has_table_privilege")) {
      const role = values?.length === 2 ? String(values[0]) : "service_role";
      const table = String(values?.at(-1)).replace("public.", "");
      const allowed = role === "service_role"
        ? !options.missingServiceGrants?.includes(table)
        : options.browserGrants?.includes(`${role}:${table}`) ?? false;
      return { rows: [{ value: allowed }], rowCount: 1 };
    }
    if (sql.startsWith("SELECT array_agg")) {
      const table = String(values?.[0]).replace("public.", "");
      return { rows: (options.unique ?? uniqueIndexes)[table]?.map(columns => ({ columns })) ?? [], rowCount: (options.unique ?? uniqueIndexes)[table]?.length ?? 0 };
    }
    return { rows: [], rowCount: 0 };
  });
  const release = vi.fn();
  const pool = { connect: vi.fn().mockResolvedValue({ query, release }) } as unknown as Pool;
  return { pool, query, release, calls };
}

describe("funding release database inspection", () => {
  it("configures a one-connection pool with bounded connection and statement timeouts", async () => {
    const pool = createFundingReleasePool("postgresql://localhost/funding");
    expect(pool.options).toMatchObject({ max: 1, connectionTimeoutMillis: 5000, statement_timeout: 5000 });
    await pool.end();
  });

  it("verifies read-only migrations, RLS, grants and receipt identities", async () => {
    const { pool, query, release } = databaseHarness({ migrations: { "0012_funding.sql": "checksum" } });
    const result = await inspectFundingReleaseDatabase(pool, { "0012_funding.sql": "checksum" });
    expect(result).toMatchObject({ status: "verified", readOnly: true, missingMigrations: [], checksumMismatches: [], missingTables: [], unsafeBrowserGrants: [], missingServiceGrants: [], rlsDisabled: [], missingUniqueIdentities: [] });
    expect(query.mock.calls[0]?.[0]).toBe("BEGIN READ ONLY");
    expect(query.mock.calls.at(-1)?.[0]).toBe("COMMIT");
    expect(release).toHaveBeenCalledOnce();
  });

  it("reports missing history, migrations, checksum mismatches, tables and indexes", async () => {
    const { pool } = databaseHarness({ migrations: null, missingTables: ["funding_settlements"], unique: { funding_purchase_requests: [] } });
    const result = await inspectFundingReleaseDatabase(pool, { "0012_funding.sql": "wanted" });
    expect(result).toMatchObject({
      status: "incomplete", missingMigrations: ["0012_funding.sql"], missingTables: ["funding_settlements"],
      missingUniqueIdentities: ["funding_settlements", "funding_purchase_requests"],
    });
    const changed = await inspectFundingReleaseDatabase(databaseHarness({ migrations: { "0012_funding.sql": "actual" } }).pool, { "0012_funding.sql": "wanted" });
    expect(changed.checksumMismatches).toEqual(["0012_funding.sql"]);
  });

  it("detects writable browser grants, missing service grants, disabled RLS and non-read-only sessions", async () => {
    const { pool } = databaseHarness({
      migrations: {}, disabledRls: ["funding_quotes"], browserGrants: ["anon:funding_quotes", "authenticated:funding_attempts"],
      missingServiceGrants: ["funding_webhook_inbox"], readOnly: false,
    });
    const result = await inspectFundingReleaseDatabase(pool, {});
    expect(result).toMatchObject({
      status: "incomplete", readOnly: false,
      unsafeBrowserGrants: ["anon:funding_quotes", "authenticated:funding_attempts"],
      missingServiceGrants: ["funding_webhook_inbox"], rlsDisabled: ["funding_quotes"],
    });
  });

  it("sanitizes database failures and suppresses rollback errors", async () => {
    const { pool, query, release } = databaseHarness({ fail: new Error("postgres://private:secret@host/db"), rollbackFail: new Error("rollback failed") });
    await expect(inspectFundingReleaseDatabase(pool, {})).rejects.toThrow("Funding database release inspection unavailable");
    expect(query.mock.calls.at(-1)?.[0]).toBe("ROLLBACK");
    expect(release).toHaveBeenCalledOnce();
  });

  it("uses the missing-history branch without reading migration rows", async () => {
    const { pool, query } = databaseHarness({ migrations: null });
    await inspectFundingReleaseDatabase(pool, {});
    expect(query).not.toHaveBeenCalledWith("SELECT name,sha256 FROM public.api_layer_schema_migrations");
    expect(tableNames).toHaveLength(6);
  });
});
