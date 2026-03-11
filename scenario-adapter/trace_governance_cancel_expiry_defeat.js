#!/usr/bin/env node
"use strict";

require("dotenv").config();
const {
  bootstrapActors,
  createProposal,
  deployGovernanceTarget,
  moveToActive,
  movePastDeadline,
  passStandardProposal,
  mineBlocks
} = require("./lib/governance_helpers");
const { sendAndWait } = require("./lib/access_helpers");

const RPC_URL = process.env.RPC_URL;
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;
const STATE = {
  Pending: 0n,
  Active: 1n,
  Canceled: 2n,
  Defeated: 3n,
  Succeeded: 4n,
  Queued: 5n,
  Expired: 6n,
  Executed: 7n
};

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");

  const {
    provider,
    founder,
    voter1,
    voter2,
    proposal,
    timelock,
    dummyArtifact,
    proposalArtifact
  } = await bootstrapActors(RPC_URL, DIAMOND_ADDRESS);

  const dummy = await deployGovernanceTarget(founder, dummyArtifact, DIAMOND_ADDRESS);
  const target = await dummy.getAddress();
  const calldata = dummy.interface.encodeFunctionData("transferOwnership", [await voter2.getAddress()]);

  const cancelId = await createProposal(
    proposal,
    proposalArtifact,
    founder,
    [target],
    [0n],
    [calldata],
    "cancel queued proposal",
    0
  );
  await moveToActive(provider, proposal, cancelId);
  await passStandardProposal(proposal, cancelId, founder, voter1, voter2);
  await movePastDeadline(provider, proposal, cancelId);
  if ((await proposal.prState(cancelId)) !== STATE.Succeeded) throw new Error("cancel proposal should succeed before queue");
  await sendAndWait(proposal.connect(founder).prQueue(cancelId, { gasLimit: 5_000_000 }), "cancelPath:queue");
  if ((await proposal.prState(cancelId)) !== STATE.Queued) throw new Error("cancel proposal should be queued before cancellation");
  await sendAndWait(proposal.connect(founder).cancelProposal(cancelId, { gasLimit: 5_000_000 }), "cancelPath:cancel");
  if ((await proposal.prState(cancelId)) !== STATE.Canceled) throw new Error("queued proposal should become canceled");

  const defeatId = await createProposal(
    proposal,
    proposalArtifact,
    founder,
    [target],
    [0n],
    [calldata],
    "defeat proposal",
    0
  );
  await moveToActive(provider, proposal, defeatId);
  await sendAndWait(
    proposal.connect(founder).prCastVote(defeatId, 1, "solo-for", { gasLimit: 3_000_000 }),
    "defeatPath:vote"
  );
  await movePastDeadline(provider, proposal, defeatId);
  if ((await proposal.prState(defeatId)) !== STATE.Defeated) {
    throw new Error(`single-voter proposal should be defeated, got ${(await proposal.prState(defeatId)).toString()}`);
  }

  const expiryId = await createProposal(
    proposal,
    proposalArtifact,
    founder,
    [target],
    [0n],
    [calldata],
    "expiry proposal",
    0
  );
  await moveToActive(provider, proposal, expiryId);
  await passStandardProposal(proposal, expiryId, founder, voter1, voter2);
  await movePastDeadline(provider, proposal, expiryId);
  if ((await proposal.prState(expiryId)) !== STATE.Succeeded) throw new Error("expiry proposal should succeed before expiry window");
  const minDelay = await timelock.getMinDelay();
  const expiryBlocks = Number((minDelay + 300n) / 15n + 2n);
  await mineBlocks(provider, expiryBlocks);
  if ((await proposal.prState(expiryId)) !== STATE.Expired) {
    throw new Error(`unqueued passed proposal should expire, got ${(await proposal.prState(expiryId)).toString()}`);
  }

  console.log("TRACE_GOVERNANCE_CANCEL_EXPIRY_DEFEAT: PASS");
}

main().catch((err) => {
  console.error("TRACE_GOVERNANCE_CANCEL_EXPIRY_DEFEAT: FAIL");
  console.error(err);
  process.exit(1);
});
