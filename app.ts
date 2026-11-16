import { createApiServer } from "./packages/api/src/app.js";

// Vercel owns the HTTP listener; reuse the same middleware and routes as the CLI.
export default createApiServer({ quiet: true }).app;
