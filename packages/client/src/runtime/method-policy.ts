import { getAllAbiMethodDefinitions, getAbiMethodDefinition, type AbiMethodDefinition } from "./abi-registry.js";

export type MethodMetadata = AbiMethodDefinition;

const methodMetadata = new Map<string, MethodMetadata>(Object.entries(getAllAbiMethodDefinitions()));

export function getMethodMetadata(method: string): MethodMetadata | null {
  return methodMetadata.get(method) ?? getAbiMethodDefinition(method);
}
