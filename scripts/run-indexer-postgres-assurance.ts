import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

async function availablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("failed to allocate a PostgreSQL assurance port"));
        return;
      }
      server.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
}

async function commandPath(command: string): Promise<string> {
  try {
    return (await run("which", [command])).stdout.trim();
  } catch {
    throw new Error(`${command} is required for the PostgreSQL indexer assurance gate`);
  }
}

async function main(): Promise<void> {
  const [initdb, pgCtl, psql] = await Promise.all([
    commandPath("initdb"),
    commandPath("pg_ctl"),
    commandPath("psql"),
  ]);
  const root = await mkdtemp(path.join(os.tmpdir(), "api-indexer-postgres-"));
  const data = path.join(root, "data");
  const log = path.join(root, "postgres.log");
  const port = await availablePort();
  let started = false;

  try {
    await run(initdb, ["-D", data, "-A", "trust", "-U", "postgres", "--no-locale"]);
    await mkdir(path.join(root, "socket"));
    await run(pgCtl, ["-D", data, "-o", `-p ${port} -h 127.0.0.1`, "-l", log, "start"]);
    started = true;

    const databaseArgs = ["-h", "127.0.0.1", "-p", String(port), "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"];
    await run(psql, [...databaseArgs, "-c", "create role anon; create role authenticated; create role service_role; create schema auth;"]);
    await run(psql, [...databaseArgs, "-c", "create function auth.uid() returns uuid language sql stable as 'select null::uuid';"]);
    await run(psql, [...databaseArgs, "-c", "create function auth.jwt() returns json language sql stable as 'select json_build_object();';"]);
    for (let pass = 0; pass < 2; pass += 1) {
      await run(psql, [...databaseArgs, "-f", "db/migrations/0001_initial.sql", "-f", "db/migrations/0002_hardening.sql"]);
    }

    const test = await run("pnpm", ["exec", "vitest", "run", "packages/indexer/src/postgres.integration.test.ts", "--maxWorkers", "1"], {
      env: {
        ...process.env,
        API_LAYER_INDEXER_TEST_DB_URL: `postgresql://postgres@127.0.0.1:${port}/postgres`,
      },
      maxBuffer: 10 * 1024 * 1024,
    });
    process.stdout.write(test.stdout);
    process.stderr.write(test.stderr);
  } finally {
    if (started) {
      await run(pgCtl, ["-D", data, "stop"]).catch(() => undefined);
    }
    await rm(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
