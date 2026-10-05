import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApiServer } from "../app.js";

const originalEnv = { ...process.env };
const operationId = `0x${"ab".repeat(32)}`;
const operator = "0x00000000000000000000000000000000000000aa";

const destructiveMultisigCases = [
  {
    key: "MultiSigFacet.cancelOperation",
    path: "/v1/multisig/commands/cancel-operation",
    body: { operationId, reason: "stale operation" },
  },
  {
    key: "MultiSigFacet.removeOperator",
    path: "/v1/multisig/commands/remove-operator",
    body: { operator },
  },
] as const;

async function startServer() {
  const server = createApiServer({ port: 0, quiet: true }).listen();
  await new Promise<void>((resolve) => {
    if (server.listening) {
      resolve();
      return;
    }
    server.once("listening", () => resolve());
  });
  const boundAddress = server.address();
  if (!boundAddress || typeof boundAddress === "string") {
    throw new Error("multisig command safety server did not bind a TCP port");
  }
  return { server, port: boundAddress.port };
}

async function closeServer(server: Awaited<ReturnType<typeof startServer>>["server"]) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

describe("destructive multisig command preflight safety", () => {
  beforeEach(() => {
    process.env.RPC_URL = "http://127.0.0.1:1";
    process.env.ALCHEMY_RPC_URL = "http://127.0.0.1:1";
    process.env.DIAMOND_ADDRESS = "0x0000000000000000000000000000000000000001";
    process.env.API_LAYER_KEYS_JSON = JSON.stringify({
      "read-only-key": {
        label: "read-only",
        signerId: "reader",
        roles: ["read-only"],
        allowGasless: false,
      },
    });
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it.each(destructiveMultisigCases)(
    "rejects unauthorized $key before provider access or mutation",
    async ({ key, path, body }) => {
      const { server, port } = await startServer();

      try {
        const response = await fetch(`http://127.0.0.1:${port}${path}`, {
          method: "DELETE",
          headers: {
            "content-type": "application/json",
            "x-api-key": "read-only-key",
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(2_500),
        });

        expect(response.status, key).toBe(403);
        await expect(response.json()).resolves.toEqual({
          error: "API key not permitted for write execution",
        });
      } finally {
        await closeServer(server);
      }
    },
  );
});
