import { describe, expect, it } from "vitest";

import httpEndpointRegistryJson from "../../../../generated/manifests/http-endpoint-registry.json";
import rpcMethodRegistryJson from "../../../../generated/manifests/rpc-method-registry.json";
import apiSurfaceJson from "../../../../reviewed/reviewed-api-surface.json";
import writeInvariantsJson from "../../../../reviewed/reviewed-write-invariants.json";

const legacyProposalKey = "ProposalFacet.propose(string,string,address[],uint256[],bytes[],uint8)";

describe("legacy proposal overload exclusion safety", () => {
  it("rejects HTTP exposure while retaining fork-only ABI policy evidence", () => {
    expect(rpcMethodRegistryJson.methods).toHaveProperty(legacyProposalKey);
    expect(httpEndpointRegistryJson.methods).not.toHaveProperty(legacyProposalKey);
    expect(apiSurfaceJson.methods).not.toHaveProperty(legacyProposalKey);

    expect(writeInvariantsJson.methods).toHaveProperty(legacyProposalKey);
    expect(writeInvariantsJson.methods[legacyProposalKey]).toMatchObject({
      abiSignature: "propose(string,string,address[],uint256[],bytes[],uint8)",
      liveNetworkSafety: {
        classification: "fork-only",
        requiresExplicitOptIn: true,
      },
    });
  });
});
