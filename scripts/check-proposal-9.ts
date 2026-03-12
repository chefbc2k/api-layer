import { loadRepoEnv, readConfigFromEnv } from "../packages/client/src/runtime/config.js";
import { facetRegistry } from "../packages/client/src/generated/index.js";
import { Contract, JsonRpcProvider } from "ethers";

async function main() {
  const env = loadRepoEnv();
  const config = readConfigFromEnv(env);
  const provider = new JsonRpcProvider(config.cbdpRpcUrl, config.chainId);
  const proposalId = 9n;
  const proposalFacet = new Contract(config.diamondAddress, facetRegistry.ProposalFacet.abi, provider);

  try {
    const [snapshot, deadline, state, currentBlock] = await Promise.all([
      proposalFacet.proposalSnapshot(proposalId),
      proposalFacet.proposalDeadline(proposalId),
      proposalFacet.prState(proposalId),
      provider.getBlockNumber(),
    ]);

    console.log(JSON.stringify({
      chainId: config.chainId,
      diamond: config.diamondAddress,
      proposalId: proposalId.toString(),
      snapshot: snapshot.toString(),
      deadline: deadline.toString(),
      state: state.toString(),
      currentBlock,
      active: currentBlock >= Number(snapshot) && Number(state) === 1,
    }, null, 2));
  } finally {
    await provider.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
