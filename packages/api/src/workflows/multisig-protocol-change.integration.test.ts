import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runProposeMultisigProtocolChangeWorkflow: vi.fn(),
  runApproveMultisigProtocolChangeWorkflow: vi.fn(),
  runExecuteMultisigProtocolChangeWorkflow: vi.fn(),
}));

vi.mock("./multisig-protocol-change.js", async () => {
  const actual = await vi.importActual<typeof import("./multisig-protocol-change.js")>("./multisig-protocol-change.js");
  return {
    ...actual,
    runProposeMultisigProtocolChangeWorkflow: mocks.runProposeMultisigProtocolChangeWorkflow,
    runApproveMultisigProtocolChangeWorkflow: mocks.runApproveMultisigProtocolChangeWorkflow,
    runExecuteMultisigProtocolChangeWorkflow: mocks.runExecuteMultisigProtocolChangeWorkflow,
  };
});

import { createWorkflowRouter } from "./index.js";

describe("multisig protocol change workflow routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runProposeMultisigProtocolChangeWorkflow.mockResolvedValue({
      operation: { proposal: { operationId: `0x${"a".repeat(64)}` } },
      summary: { operationId: `0x${"a".repeat(64)}` },
    });
    mocks.runApproveMultisigProtocolChangeWorkflow.mockResolvedValue({
      approval: { approved: true },
      summary: { operationId: `0x${"a".repeat(64)}` },
    });
    mocks.runExecuteMultisigProtocolChangeWorkflow.mockResolvedValue({
      execution: { txHash: "0xexec" },
      summary: { operationId: `0x${"a".repeat(64)}` },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns structured responses for the multisig protocol change routes", async () => {
    const router = createWorkflowRouter({
      apiKeys: {
        "admin-key": {
          apiKey: "admin-key",
          label: "admin",
          roles: ["service"],
          allowGasless: false,
        },
      },
    } as never);

    const requestFactory = (body: unknown) => ({
      body,
      header(name: string) {
        return name.toLowerCase() === "x-api-key" ? "admin-key" : undefined;
      },
    });
    const responseFactory = () => ({
      statusCode: 200,
      payload: undefined as unknown,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: unknown) {
        this.payload = payload;
        return this;
      },
    });

    const proposeHandler = router.stack.find((entry) => entry.route?.path === "/v1/workflows/propose-multisig-protocol-change")?.route?.stack?.[0]?.handle;
    const approveHandler = router.stack.find((entry) => entry.route?.path === "/v1/workflows/approve-multisig-protocol-change")?.route?.stack?.[0]?.handle;
    const executeHandler = router.stack.find((entry) => entry.route?.path === "/v1/workflows/execute-multisig-protocol-change")?.route?.stack?.[0]?.handle;

    const proposeResponse = responseFactory();
    await proposeHandler(requestFactory({
      operation: {
        actions: [{
          kind: "accept-ownership",
        }],
        requiredApprovals: "1",
      },
    }), proposeResponse);
    expect(proposeResponse.statusCode).toBe(202);
    expect(proposeResponse.payload).toEqual(expect.objectContaining({
      operation: expect.any(Object),
      summary: expect.any(Object),
    }));

    const approveResponse = responseFactory();
    await approveHandler(requestFactory({
      operationId: `0x${"a".repeat(64)}`,
    }), approveResponse);
    expect(approveResponse.statusCode).toBe(202);
    expect(approveResponse.payload).toEqual(expect.objectContaining({
      approval: expect.any(Object),
      summary: expect.any(Object),
    }));

    const executeResponse = responseFactory();
    await executeHandler(requestFactory({
      operationId: `0x${"a".repeat(64)}`,
    }), executeResponse);
    expect(executeResponse.statusCode).toBe(202);
    expect(executeResponse.payload).toEqual(expect.objectContaining({
      execution: expect.any(Object),
      summary: expect.any(Object),
    }));
  });

  it("rejects invalid multisig protocol change input before workflow execution", async () => {
    const router = createWorkflowRouter({
      apiKeys: {
        "admin-key": {
          apiKey: "admin-key",
          label: "admin",
          roles: ["service"],
          allowGasless: false,
        },
      },
    } as never);
    const handler = router.stack.find((entry) => entry.route?.path === "/v1/workflows/propose-multisig-protocol-change")?.route?.stack?.[0]?.handle;
    const response = {
      statusCode: 200,
      payload: undefined as unknown,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: unknown) {
        this.payload = payload;
        return this;
      },
    };

    await handler({
      body: {
        operation: {
          actions: [{
            kind: "transfer-ownership",
            newOwner: "bad-address",
          }],
          requiredApprovals: "1",
        },
      },
      header(name: string) {
        return name.toLowerCase() === "x-api-key" ? "admin-key" : undefined;
      },
    }, response);

    expect(response.statusCode).toBe(400);
    expect(mocks.runProposeMultisigProtocolChangeWorkflow).not.toHaveBeenCalled();
  });
});

