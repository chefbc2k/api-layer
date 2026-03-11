import path from "node:path";
import { rm } from "node:fs/promises";

import { copyTree, ensureDir, fileExists, localScenarioOverrideDir, localScenarioSnapshotDir, resolveScenarioSourceDir } from "./utils.js";

async function main(): Promise<void> {
  const sourceDir = await resolveScenarioSourceDir();
  if (!sourceDir) {
    console.log(`no parent scenario source found; keeping checked-in snapshot at ${localScenarioSnapshotDir}`);
    return;
  }

  const targetDir = localScenarioSnapshotDir;
  for (const entry of ["lib"]) {
    await rm(path.join(targetDir, entry), { recursive: true, force: true });
  }
  await ensureDir(targetDir);
  await copyTree(sourceDir, targetDir);
  if (await fileExists(localScenarioOverrideDir)) {
    await copyTree(localScenarioOverrideDir, targetDir);
  }
  console.log(`synced scenarios from ${sourceDir} -> ${targetDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
