import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("db hardening migration", () => {
  it("adds typed projection columns and public/admin RLS surfaces", () => {
    const sql = readFileSync(
      path.resolve(process.cwd(), "db", "migrations", "0002_hardening.sql"),
      "utf8",
    );

    expect(sql).toContain("add column if not exists source_raw_event_id bigint");
    expect(sql).toContain("add column if not exists canonical_status text");
    expect(sql).toContain("add column if not exists actor_address text");
    expect(sql).toContain("create view raw_events_public as");
    expect(sql).toContain("create policy raw_events_service_all on raw_events");
    expect(sql).toContain("add column if not exists relay_mode text");
    expect(sql).toContain("add column if not exists api_key_label text");
  });

  it("uses PostgreSQL-compatible idempotent policy and trigger creation", () => {
    const initial = readFileSync(path.resolve(process.cwd(), "db", "migrations", "0001_initial.sql"), "utf8");
    const hardening = readFileSync(path.resolve(process.cwd(), "db", "migrations", "0002_hardening.sql"), "utf8");
    const blockJournal = readFileSync(path.resolve(process.cwd(), "db", "migrations", "0003_indexer_block_journal.sql"), "utf8");

    expect(initial).not.toContain("create policy if not exists");
    expect(hardening).not.toContain("create policy if not exists");
    expect(initial).toContain("drop trigger if exists %I_set_updated_at on %I");
    expect(initial).toContain("drop policy if exists raw_events_public_select on raw_events");
    expect(blockJournal).toContain("create table if not exists indexer_blocks");
    expect(blockJournal).toContain("indexer_blocks_canonical_height_uidx");
    expect(blockJournal).toContain("drop policy if exists indexer_blocks_service_all on indexer_blocks");
    expect(blockJournal).not.toContain("create policy if not exists");
    expect(hardening).toContain("drop policy if exists raw_events_service_all on raw_events");
  });
});
