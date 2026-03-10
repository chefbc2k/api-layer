import path from "node:path";
import { fileURLToPath } from "node:url";

import { generatedManifestDir, pascalToCamel, readJson } from "./utils.js";
import { ensureDir } from "./utils.js";
import { writeFile } from "node:fs/promises";

type Manifest = {
  facets: Array<{
    facetName: string;
    facetKey: string;
    abiPath: string;
    functions: Array<{
      name: string;
      wrapperKey: string;
      category: "read" | "write";
      liveRequired: boolean;
      cacheTtlSeconds: number | null;
    }>;
    events: Array<{ name: string; signature: string; wrapperKey: string }>;
  }>;
  subsystems: Array<{ name: string; abiPath: string }>;
};

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const clientGeneratedDir = path.resolve(currentDir, "..", "packages", "client", "src", "generated");

function sanitizeMethodName(name: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(name) ? name : JSON.stringify(name);
}

async function main(): Promise<void> {
  const manifest = await readJson<Manifest>(path.join(generatedManifestDir, "contract-manifest.json"));
  await ensureDir(clientGeneratedDir);

  const registryLines: string[] = [];
  const registryExports: string[] = [
    "export const facetRegistry = {",
  ];

  const wrapperIndexExports: string[] = [];
  const coverageManifest = {
    generatedAt: new Date().toISOString(),
    facets: {} as Record<string, { read: string[]; write: string[]; events: string[] }>,
  };
  const createFacetWrappers = manifest.facets
    .map((facet) => `    ${facet.facetKey}: create${facet.facetName}Wrapper(context),`)
    .join("\n");

  for (const facet of manifest.facets) {
    registryLines.push(
      `import ${facet.facetName}Abi from "../../../../generated/abis/facets/${facet.facetName}.json";`,
    );
    registryExports.push(
      `  ${facet.facetName}: {`,
      `    facetName: "${facet.facetName}",`,
      `    facetKey: "${facet.facetKey}",`,
      `    abi: ${facet.facetName}Abi,`,
      `  },`,
    );

    const readMethodSet = new Set<string>();
    const readMethods = facet.functions
      .filter((method) => method.category === "read")
      .flatMap((method) => {
        const contractKey = method.wrapperKey;
        if (readMethodSet.has(contractKey)) {
          return [];
        }
        readMethodSet.add(contractKey);
        return [`    ${sanitizeMethodName(contractKey)}: (...args: unknown[]) => invokeRead(context, "${facet.facetName}", "${contractKey}", args, ${method.liveRequired ? "true" : "false"}, ${method.cacheTtlSeconds ?? "null"}),`];
      })
      .join("\n");
    const writeMethodSet = new Set<string>();
    const writeMethods = facet.functions
      .filter((method) => method.category === "write")
      .flatMap((method) => {
        const contractKey = method.wrapperKey;
        if (writeMethodSet.has(contractKey)) {
          return [];
        }
        writeMethodSet.add(contractKey);
        return [`    ${sanitizeMethodName(contractKey)}: (...args: unknown[]) => invokeWrite(context, "${facet.facetName}", "${contractKey}", args),`];
      })
      .join("\n");

    const eventMethodSet = new Set<string>();
    const eventMethods = facet.events
      .flatMap((event) => {
        const eventKey = event.wrapperKey;
        if (eventMethodSet.has(eventKey)) {
          return [];
        }
        eventMethodSet.add(eventKey);
        return [`    ${sanitizeMethodName(eventKey)}: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "${facet.facetName}", "${eventKey}", fromBlock, toBlock) },`];
      })
      .join("\n");

    const wrapperSource = `import { invokeRead, invokeWrite, queryEvent } from "../runtime/invoke.js";
import type { FacetWrapperContext } from "../types.js";

export function create${facet.facetName}Wrapper(context: FacetWrapperContext) {
  return {
    facetName: "${facet.facetName}" as const,
    read: {
${readMethods}
    },
    write: {
${writeMethods}
    },
    events: {
${eventMethods}
    },
  };
}
`;

    await writeFile(path.join(clientGeneratedDir, `${facet.facetName}.ts`), wrapperSource, "utf8");
    wrapperIndexExports.push(`export { create${facet.facetName}Wrapper } from "./${facet.facetName}.js";`);
    coverageManifest.facets[facet.facetName] = {
      read: [...readMethodSet],
      write: [...writeMethodSet],
      events: [...eventMethodSet],
    };
  }

  registryExports.push("} as const;");
  const registrySource = `${registryLines.join("\n")}

${registryExports.join("\n")}

export type FacetName = keyof typeof facetRegistry;
`;

  await writeFile(path.join(clientGeneratedDir, "registry.ts"), registrySource, "utf8");

  const subsystemSource = manifest.subsystems
    .map(
      (subsystem) =>
        `import ${subsystem.name}Abi from "../../../../generated/abis/subsystems/${subsystem.name}.json";`,
    )
    .join("\n");

  const subsystemRegistry = `${subsystemSource}

export const subsystemRegistry = {
${manifest.subsystems
  .map(
    (subsystem) =>
      `  ${pascalToCamel(subsystem.name)}: { name: "${subsystem.name}", abi: ${subsystem.name}Abi },`,
  )
  .join("\n")}
} as const;
`;
  await writeFile(path.join(clientGeneratedDir, "subsystems.ts"), subsystemRegistry, "utf8");

  const wrapperIndexSource = `${wrapperIndexExports.join("\n")}
export { facetRegistry } from "./registry.js";
export { subsystemRegistry } from "./subsystems.js";
`;
  await writeFile(path.join(clientGeneratedDir, "index.ts"), wrapperIndexSource, "utf8");

  const clientIndex = `import { ${manifest.facets.map((facet) => `create${facet.facetName}Wrapper`).join(", ")} } from "./index.js";
import type { FacetWrapperContext } from "../types.js";

export function createFacetWrappers(context: FacetWrapperContext) {
  return {
${createFacetWrappers}
  };
}
`;
  await writeFile(path.join(clientGeneratedDir, "createFacetWrappers.ts"), clientIndex, "utf8");
  await ensureDir(generatedManifestDir);
  await writeFile(
    path.join(generatedManifestDir, "wrapper-coverage.json"),
    `${JSON.stringify(coverageManifest, null, 2)}\n`,
    "utf8",
  );

  console.log(`generated ${manifest.facets.length} typed facet wrappers`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
