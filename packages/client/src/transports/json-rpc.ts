export type RpcTransport = {
  invoke(method: string, params: unknown[]): Promise<unknown>;
};

export class JsonRpcHttpTransport implements RpcTransport {
  constructor(
    private readonly endpoint: string,
    private readonly apiKey?: string,
  ) {}

  async invoke(method: string, params: unknown[]): Promise<unknown> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.apiKey ? { "x-api-key": this.apiKey } : {}),
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: crypto.randomUUID(),
        method,
        params,
      }),
    });

    if (!response.ok) {
      throw new Error(`JSON-RPC HTTP ${response.status}`);
    }

    const payload = (await response.json()) as { result?: unknown; error?: { message?: string } };
    if (payload.error) {
      throw new Error(payload.error.message ?? "JSON-RPC error");
    }
    return payload.result;
  }
}

