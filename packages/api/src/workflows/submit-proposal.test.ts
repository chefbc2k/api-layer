import { Interface } from "ethers";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { facetRegistry } from "../../../client/src/generated/index.js";

const mocks = vi.hoisted(() => ({
  createGovernancePrimitiveService: vi.fn(),
  waitForWorkflowWriteReceipt: vi.fn(),
}));

vi.mock("../modules/governance/primitives/generated/index.js", () => ({
  createGovernancePrimitiveService: mocks.createGovernancePrimitiveService,
}));

vi.mock("./wait-for-write.js", () => ({
  waitForWorkflowWriteReceipt: mocks.waitForWorkflowWriteReceipt,
}));

import {
  extractProposalIdFromReceipt,
  extractResult,
  runSubmitProposalWorkflow,
} from "./submit-proposal.js";

describe("submit proposal workflow", () => {
  const auth = {
    apiKey: "test-key",
    label: "test",
    roles: ["service"],
    allowGasless: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("extracts proposal id from a real ProposalCreated receipt log", () => {
    const iface = new Interface(facetRegistry.ProposalFacet.abi);
    const event = iface.encodeEventLog(
      iface.getEvent("ProposalCreated"),
      [
        123n,
        "0x00000000000000000000000000000000000000aa",
        ["0x00000000000000000000000000000000000000bb"],
        [0n],
        ["0x1234"],
        "hello",
        55n,
        99n,
        0,
      ],
    );

    const proposalId = extractProposalIdFromReceipt({
      logs: [{ topics: event.topics, data: event.data }],
    });

    expect(proposalId).toBe("123");
    expect(extractResult({ result: "456" })).toBe("456");
  });

  it("submits the modern proposal path, reads the proposal window, and returns a structured result", async () => {
    const iface = new Interface(facetRegistry.ProposalFacet.abi);
    const event = iface.encodeEventLog(
      iface.getEvent("ProposalCreated"),
      [
        777n,
        "0x00000000000000000000000000000000000000aa",
        ["0x00000000000000000000000000000000000000bb"],
        [0n],
        ["0x1234"],
        "workflow governance proof",
        120n,
        240n,
        0,
      ],
    );
    const context = {
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, label: string, work: (provider: {
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
          getBlockNumber: () => Promise<number>;
          getBlock: (tag: string) => Promise<unknown>;
        }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 21, logs: [{ topics: event.topics, data: event.data }] })),
          getBlockNumber: vi.fn(async () => 100),
          getBlock: vi.fn(async () => ({ timestamp: 1_000 })),
        })),
      },
    } as never;
    const governance = {
      proposeAddressArrayUint256ArrayBytesArrayStringUint8: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xproposal-write", result: "999" },
      }),
      proposalSnapshot: vi.fn().mockResolvedValue({ statusCode: 200, body: "120" }),
      prState: vi.fn().mockResolvedValue({ statusCode: 200, body: "0" }),
      proposalDeadline: vi.fn().mockResolvedValue({ statusCode: 200, body: "240" }),
      proposalCreatedEventQuery: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: [{ transactionHash: "0xproposal-receipt" }],
      }),
    };
    mocks.createGovernancePrimitiveService.mockReturnValue(governance);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xproposal-receipt");

    const result = await runSubmitProposalWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      description: "workflow governance proof",
      targets: ["0x00000000000000000000000000000000000000bb"],
      values: ["0"],
      calldatas: ["0x1234"],
      proposalType: "0",
    });

    expect(governance.proposeAddressArrayUint256ArrayBytesArrayStringUint8).toHaveBeenCalledWith({
      auth,
      api: { executionSource: "auto", gaslessMode: "none" },
      walletAddress: "0x00000000000000000000000000000000000000aa",
      wireParams: [
        ["0x00000000000000000000000000000000000000bb"],
        ["0"],
        ["0x1234"],
        "workflow governance proof",
        "0",
      ],
    });
    expect(result).toEqual({
      proposal: {
        submission: { txHash: "0xproposal-write", result: "999" },
        txHash: "0xproposal-receipt",
        proposalId: "777",
        eventCount: 1,
      },
      readback: {
        snapshot: "120",
        proposalState: "0",
        deadline: "240",
      },
      votingWindow: {
        earliestVotingBlock: "120",
        proposalDeadlineBlock: "240",
        currentBlock: "100",
        latestBlockTimestamp: "1000",
        estimatedVotingStartTimestamp: "1300",
      },
      summary: {
        proposalId: "777",
        proposalType: "0",
        targetCount: 1,
        calldataCount: 1,
      },
    });
  });

  it("retries proposal window reads and falls back to the payload result when the receipt log is absent", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: TimerHandler) => {
      if (typeof callback === "function") {
        callback();
      }
      return 0 as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);
    const context = {
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, label: string, work: (provider: {
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
          getBlockNumber: () => Promise<number>;
          getBlock: (tag: string) => Promise<unknown>;
        }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 31, logs: [] })),
          getBlockNumber: vi.fn(async () => 100),
          getBlock: vi.fn(async () => ({ timestamp: 1_000 })),
        })),
      },
    } as never;
    const governance = {
      proposeAddressArrayUint256ArrayBytesArrayStringUint8: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xproposal-write", result: "888" },
      }),
      proposalSnapshot: vi.fn()
        .mockResolvedValueOnce({ statusCode: 503, body: { error: "lag" } })
        .mockResolvedValueOnce({ statusCode: 200, body: "101" }),
      prState: vi.fn()
        .mockResolvedValueOnce({ statusCode: 503, body: { error: "lag" } })
        .mockResolvedValueOnce({ statusCode: 200, body: "0" }),
      proposalDeadline: vi.fn()
        .mockResolvedValueOnce({ statusCode: 503, body: { error: "lag" } })
        .mockResolvedValueOnce({ statusCode: 200, body: "200" }),
      proposalCreatedEventQuery: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: [] })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: [{ transactionHash: "0xproposal-receipt" }],
        }),
    };
    mocks.createGovernancePrimitiveService.mockReturnValue(governance);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xproposal-receipt");

    const result = await runSubmitProposalWorkflow(context, auth, undefined, {
      description: "retry proof",
      targets: ["0x00000000000000000000000000000000000000bb"],
      values: ["0"],
      calldatas: ["0x1234"],
      proposalType: "1",
    });

    expect(governance.proposalSnapshot).toHaveBeenCalledTimes(2);
    expect(governance.prState).toHaveBeenCalledTimes(2);
    expect(governance.proposalDeadline).toHaveBeenCalledTimes(2);
    expect(governance.proposalCreatedEventQuery).toHaveBeenCalledTimes(2);
    expect(result.proposal.proposalId).toBe("888");
    setTimeoutSpy.mockRestore();
  });

  it("throws when a proposal id cannot be derived", async () => {
    const context = {
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: {
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
          getBlockNumber: () => Promise<number>;
          getBlock: (tag: string) => Promise<unknown>;
        }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 41, logs: [] })),
          getBlockNumber: vi.fn(async () => 100),
          getBlock: vi.fn(async () => ({ timestamp: 1_000 })),
        })),
      },
    } as never;
    mocks.createGovernancePrimitiveService.mockReturnValue({
      proposeAddressArrayUint256ArrayBytesArrayStringUint8: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xproposal-write", result: null },
      }),
      proposalSnapshot: vi.fn(),
      prState: vi.fn(),
      proposalDeadline: vi.fn(),
      proposalCreatedEventQuery: vi.fn(),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xproposal-receipt");

    await expect(runSubmitProposalWorkflow(context, auth, undefined, {
      description: "missing id",
      targets: ["0x00000000000000000000000000000000000000bb"],
      values: ["0"],
      calldatas: ["0x1234"],
      proposalType: "0",
    })).rejects.toThrow("proposal id could not be derived from workflow response or receipt");
  });
});
