import { EventIndexer } from "./worker.js";

const indexer = new EventIndexer();
indexer.runRealtime().catch((error) => {
  console.error(error);
  process.exit(1);
});
