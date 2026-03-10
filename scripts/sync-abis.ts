import { copyTree, generatedAbiDir, resetDir, resolveAbiSourceDir } from "./utils.js";

async function main(): Promise<void> {
  const sourceDir = await resolveAbiSourceDir();
  await resetDir(generatedAbiDir);
  await copyTree(sourceDir, generatedAbiDir);
  console.log(`synced ABI inventory from ${sourceDir} -> ${generatedAbiDir}`);
}
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
