import express from "express";

import { createApiServer } from "./packages/api/src/app.js";

// Vercel detects this app and owns its listener; the existing API owns middleware/routes.
const app = express();
app.use(createApiServer({ quiet: true }).app);

export default app;
