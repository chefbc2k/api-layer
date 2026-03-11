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
    expect(sql).toContain("create policy if not exists raw_events_service_all on raw_events");
    expect(sql).toContain("add column if not exists relay_mode text");
    expect(sql).toContain("add column if not exists api_key_label text");
  });
});
