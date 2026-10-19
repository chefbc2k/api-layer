import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runTreasuryMultisigWithdrawalWorkflow: vi.fn(),
}));

vi.mock("./treasury-multisig-withdrawal.js", async () => {
  const actual = await vi.importActual<typeof import("./treasury-multisig-withdrawal.js")>("./treasury-multisig-withdrawal.js");
  return {
    ...actual,
    runTreasuryMultisigWithdrawalWorkflow: mocks.runTreasuryMultisigWithdrawalWorkflow,
  };
});

import { createWorkflowRouter } from "./index.js";

describe("treasury multisig withdrawal workflow route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runTreasuryMultisigWithdrawalWorkflow.mockResolvedValue({
      approvals: { txHashes: ["0xapprove1", "0xapprove2"], economicsUnchanged: true },
      execution: { txHash: "0xexecute", conservation: "0" },
      summary: { releasedAmount: "100", remainingPending: "0", approvalCount: 2 },
    });
  });

  function routeFixture() {
    const router = createWorkflowRouter({
      apiKeys: {
        "finance-key": {
          apiKey: "finance-key",
          label: "finance",
          roles: ["service"],
          allowGasless: false,
        },
      },
    } as never);
    const handler = router.stack.find((entry) => entry.route?.path === "/v1/workflows/treasury-multisig-withdrawal")?.route?.stack?.[0]?.handle;
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
    return { handler, response };
  }

  it("returns the structured multisig economic proof", async () => {
    const { handler, response } = routeFixture();
    const body = {
      requiredApprovals: "2",
      approvers: [
        { apiKey: "signer-one", walletAddress: "0x00000000000000000000000000000000000000b1" },
        { apiKey: "signer-two", walletAddress: "0x00000000000000000000000000000000000000b2" },
      ],
    };

    await handler({
      body,
      header(name: string) {
        if (name.toLowerCase() === "x-api-key") return "finance-key";
        if (name.toLowerCase() === "x-wallet-address") return "0x00000000000000000000000000000000000000aa";
        return undefined;
      },
    }, response);

    expect(response.statusCode).toBe(202);
    expect(response.payload).toMatchObject({
      execution: { txHash: "0xexecute", conservation: "0" },
      summary: { releasedAmount: "100", approvalCount: 2 },
    });
    expect(mocks.runTreasuryMultisigWithdrawalWorkflow).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ apiKey: "finance-key" }),
      "0x00000000000000000000000000000000000000aa",
      body,
    );
  });

  it("rejects invalid approval thresholds before workflow execution", async () => {
    const { handler, response } = routeFixture();
    await handler({
      body: {
        requiredApprovals: "1",
        approvers: [
          { apiKey: "signer-one" },
          { apiKey: "signer-two" },
        ],
      },
      header(name: string) {
        return name.toLowerCase() === "x-api-key" ? "finance-key" : undefined;
      },
    }, response);

    expect(response.statusCode).toBe(400);
    expect(mocks.runTreasuryMultisigWithdrawalWorkflow).not.toHaveBeenCalled();
  });
});
