import contractManifest from "../../../../generated/manifests/contract-manifest.json";

export type MethodMetadata = {
  facetName: string;
  name: string;
  signature: string;
  wrapperKey: string;
  category: "read" | "write";
  liveRequired: boolean;
  cacheTtlSeconds: number | null;
};

const methodMetadata = new Map<string, MethodMetadata>();
const typedContractManifest = contractManifest as unknown as {
  facets: Array<{
    facetName: string;
    functions: Array<Omit<MethodMetadata, "facetName">>;
  }>;
};

for (const facet of typedContractManifest.facets) {
  for (const method of facet.functions) {
    methodMetadata.set(`${facet.facetName}.${method.wrapperKey}`, {
      facetName: facet.facetName,
      name: method.name,
      signature: method.signature,
      wrapperKey: method.wrapperKey,
      category: method.category,
      liveRequired: method.liveRequired,
      cacheTtlSeconds: method.cacheTtlSeconds,
    });
  }
}

export function getMethodMetadata(method: string): MethodMetadata | null {
  return methodMetadata.get(method) ?? null;
}
