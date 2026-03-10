import { Contract, Interface, type ContractRunner, type EventLog, type Log } from "ethers";

import { facetRegistry } from "../generated/registry.js";
import type { FacetWrapperContext } from "../types.js";

function cacheKey(facetName: string, methodName: string, args: unknown[]): string {
  return `${facetName}:${methodName}:${JSON.stringify(args)}`;
}

function connectContract(context: FacetWrapperContext, facetName: keyof typeof facetRegistry, runner: ContractRunner): Contract {
  const facet = facetRegistry[facetName];
  return new Contract(context.addressBook.resolveFacetAddress(facetName), facet.abi, runner);
}

export async function invokeRead(
  context: FacetWrapperContext,
  facetName: keyof typeof facetRegistry,
  methodName: string,
  args: unknown[],
  liveRequired: boolean,
  cacheTtlSeconds: number | null,
): Promise<unknown> {
  if (context.transport) {
    return context.transport.invoke(`${String(facetName)}.${String(methodName)}`, args);
  }
  if (!liveRequired && cacheTtlSeconds) {
    const cached = context.cache.get(cacheKey(String(facetName), String(methodName), args));
    if (cached !== null) {
      return cached;
    }
  }

  const value = await context.providerRouter.withProvider("read", `${String(facetName)}.${String(methodName)}`, async (provider) => {
    const contract = connectContract(context, facetName, provider);
    return contract[methodName](...args) as Promise<unknown>;
  });

  if (!liveRequired && cacheTtlSeconds) {
    context.cache.set(cacheKey(String(facetName), String(methodName), args), value, cacheTtlSeconds);
  }
  return value;
}

export async function invokeWrite(
  context: FacetWrapperContext,
  facetName: keyof typeof facetRegistry,
  methodName: string,
  args: unknown[],
): Promise<unknown> {
  if (context.transport) {
    return context.transport.invoke(`${String(facetName)}.${String(methodName)}`, args);
  }
  if (!context.signerFactory) {
    throw new Error(`write method ${String(facetName)}.${String(methodName)} requires signerFactory or transport`);
  }
  return context.providerRouter.withProvider("write", `${String(facetName)}.${String(methodName)}`, async (provider) => {
    const signer = await context.signerFactory!(provider);
    const contract = connectContract(context, facetName, signer);
    return contract[methodName](...args) as Promise<unknown>;
  });
}

export async function queryEvent(
  context: FacetWrapperContext,
  facetName: keyof typeof facetRegistry,
  eventName: string,
  fromBlock?: bigint | number,
  toBlock?: bigint | number | "latest",
): Promise<Array<EventLog | Log>> {
  if (context.transport) {
    return context.transport.invoke("events.query", [
      {
        facetName,
        eventName,
        fromBlock: fromBlock?.toString(),
        toBlock: typeof toBlock === "bigint" ? toBlock.toString() : toBlock,
      },
    ]) as Promise<Array<EventLog | Log>>;
  }
  return context.providerRouter.withProvider("events", `${String(facetName)}.${eventName}`, async (provider) => {
    const facet = facetRegistry[facetName];
    const iface = new Interface(facet.abi);
    const fragment = iface.getEvent(eventName);
    if (!fragment) {
      throw new Error(`unknown event ${String(facetName)}.${eventName}`);
    }
    return provider.getLogs({
      address: context.addressBook.resolveFacetAddress(facetName),
      topics: [fragment.topicHash],
      fromBlock: fromBlock == null ? undefined : Number(fromBlock),
      toBlock: toBlock == null || toBlock === "latest" ? toBlock : Number(toBlock),
    });
  });
}

export function decodeLog(facetName: keyof typeof facetRegistry, log: Log): ReturnType<Interface["parseLog"]> | null {
  const iface = new Interface(facetRegistry[facetName].abi);
  try {
    return iface.parseLog(log);
  } catch {
    return null;
  }
}
