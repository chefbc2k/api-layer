import { isLoopbackRpcUrl } from "./alchemy-debug-lib.js";

export type RightsGroupFixtureInput = {
  rpcUrl: string;
  voiceHash: string;
  member: string;
  timestamp: bigint;
  fixtureName: string;
  readExisting: () => Promise<boolean>;
  fundSigner: () => Promise<void>;
  createGroup: (args: {
    name: string;
    rights: Array<{
      rightType: string;
      startTime: bigint;
      endTime: bigint;
      transferable: boolean;
      restrictions: string[];
      revocable: boolean;
    }>;
    members: string[];
  }) => Promise<{ status: number | null; transactionHash: string; blockNumber: number }>;
  verifiedVoiceHash?: string;
  verifyGroup: () => Promise<void>;
};

export type RightsGroupFixtureResult = {
  status: "already_present" | "created";
  methodKey: "RightsFacet.createRightsGroup" | "RightsFacet.getRightsGroup";
  voiceHash: string;
  groupIndex: "0";
  transactionHash: string | null;
  blockNumber: number | null;
};

export async function ensureLocalForkRightsGroupFixture(
  input: RightsGroupFixtureInput,
): Promise<RightsGroupFixtureResult> {
  if (!isLoopbackRpcUrl(input.rpcUrl)) {
    throw new Error("rights_group_fixture_requires_loopback_fork");
  }

  if (await input.readExisting()) {
    return {
      status: "already_present",
      methodKey: "RightsFacet.getRightsGroup",
      voiceHash: input.voiceHash,
      groupIndex: "0",
      transactionHash: null,
      blockNumber: null,
    };
  }

  await input.fundSigner();
  const receipt = await input.createGroup({
    name: input.fixtureName,
    rights: [{
      rightType: "commercial",
      startTime: input.timestamp,
      endTime: input.timestamp + 86_400n,
      transferable: true,
      restrictions: ["isolated-fork"],
      revocable: true,
    }],
    members: [input.member],
  });
  if (receipt.status !== 1) throw new Error("rights_group_fixture_receipt_failed");
  await input.verifyGroup();
  const voiceHash = input.verifiedVoiceHash ?? input.voiceHash;

  return {
    status: "created",
    methodKey: "RightsFacet.createRightsGroup",
    voiceHash,
    groupIndex: "0",
    transactionHash: receipt.transactionHash,
    blockNumber: receipt.blockNumber,
  };
}
