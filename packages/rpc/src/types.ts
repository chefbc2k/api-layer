export type JsonRpcRequest = {
  id?: string | number | null;
  jsonrpc: "2.0";
  method: string;
  params?: unknown[];
};

export type JsonRpcSuccess = {
  id: string | number | null;
  jsonrpc: "2.0";
  result: unknown;
};

export type JsonRpcError = {
  id: string | number | null;
  jsonrpc: "2.0";
  error: {
    code: number;
    message: string;
  };
};

