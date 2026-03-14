import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runOperatorIncentiveGrantFlowWorkflow: vi.fn(),
}));

vi.mock("./operator-incentive-grant-flow.js", async () => {
  const actual = await vi.importActual<typeof import("./operator-incentive-grant-flow.js")>("./operator-incentive-grant-flow.js");
  return {
    ...actual,
    runOperatorIncentiveGrantFlowWorkflow: mocks.runOperatorIncentiveGrantFlowWorkflow,
  };
});

import { createWorkflowRouter } from "./index.js";

describe("operator-incentive-grant-flow workflow route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runOperatorIncentiveGrantFlowWorkflow.mockResolvedValue({
      policy: {
        before: { status: "completed", result: { timewave: { minimumDuration: "2592000" } }, block: null },
        update: { status: "not-requested", result: null, block: null },
        after: { status: "not-requested", result: null, block: null },
      },
      activation: {
        summary: {
          participant: "0x00000000000000000000000000000000000000aa",
          delegatee: "0x00000000000000000000000000000000000000bb",
          rewardCampaignId: "7",
          stakingCompleted: true,
          claimCompleted: false,
          vestingCreated: false,
          blockedSteps: [],
          externalPreconditions: [],
        },
      },
      summary: {
        story: "operator incentive grant flow",
        participant: "0x00000000000000000000000000000000000000aa",
        delegatee: "0x00000000000000000000000000000000000000bb",
        rewardCampaignId: "7",
        stakingCompleted: true,
        claimCompleted: false,
        vestingCreated: false,
        policyUpdated: false,
        blockedSteps: [],
        externalPreconditions: [],
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the structured operator incentive grant response over the router path", async () => {
    const router = createWorkflowRouter({
      apiKeys: {
        "participant-key": {
          apiKey: "participant-key",
          label: "participant",
          roles: ["service"],
          allowGasless: false,
        },
      },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/operator-incentive-grant-flow");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
        activation: {
          staking: {
            amount: "10",
            delegatee: "0x00000000000000000000000000000000000000bb",
          },
        },
      },
      header(name: string) {
        if (name.toLowerCase() === "x-api-key") {
          return "participant-key";
        }
        if (name.toLowerCase() === "x-wallet-address") {
          return "0x00000000000000000000000000000000000000aa";
        }
        return undefined;
      },
    };
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

    await handler(request, response);

    expect(response.statusCode).toBe(202);
    expect(response.payload).toEqual({
      policy: expect.any(Object),
      activation: expect.any(Object),
      summary: expect.objectContaining({
        story: "operator incentive grant flow",
        participant: "0x00000000000000000000000000000000000000aa",
      }),
    });
  });

  it("rejects invalid operator incentive grant input before child workflow invocation", async () => {
    const router = createWorkflowRouter({
      apiKeys: {
        "participant-key": {
          apiKey: "participant-key",
          label: "participant",
          roles: ["service"],
          allowGasless: false,
        },
      },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/operator-incentive-grant-flow");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
        policy: {},
        activation: {
          staking: {
            amount: "bad",
            delegatee: "0x00000000000000000000000000000000000000bb",
          },
        },
      },
      header(name: string) {
        return name.toLowerCase() === "x-api-key" ? "participant-key" : undefined;
      },
    };
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

    await handler(request, response);

    expect(response.statusCode).toBe(400);
    expect(mocks.runOperatorIncentiveGrantFlowWorkflow).not.toHaveBeenCalled();
    expect(response.payload).toEqual({
      error: expect.stringContaining("operator-incentive-grant-flow"),
    });
  });
});
