import { describe, expect, it } from "vitest";

import { projectionTables } from "./tables.js";

describe("projectionTables", () => {
  it("enumerates the indexed projection tables in a stable order", () => {
    expect(projectionTables).toEqual([
      "voice_assets",
      "voice_datasets",
      "voice_dataset_members",
      "voice_license_templates",
      "voice_licenses",
      "market_listings",
      "market_sales",
      "payment_flows",
      "payment_withdrawals",
      "staking_positions",
      "staking_rewards",
      "governance_proposals",
      "governance_votes",
      "governance_delegations",
      "timelock_operations",
      "emergency_incidents",
      "emergency_withdrawals",
      "vesting_schedules",
      "vesting_releases",
      "multisig_operations",
      "upgrade_requests",
      "ownership_transfers",
    ]);
  });
});
