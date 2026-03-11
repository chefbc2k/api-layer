import { AddressBook, type FacetAddressBook } from "./runtime/address-book.js";
import { LocalCache } from "./runtime/cache.js";
import { ProviderRouter, type ProviderRouterOptions } from "./runtime/provider-router.js";
import { createFacetWrappers } from "./generated/createFacetWrappers.js";
import { subsystemRegistry } from "./generated/subsystems.js";
import type { ExecutionSource, SignerFactory } from "./types.js";

export type UspeaksClientOptions = {
  providerRouterOptions?: ProviderRouterOptions;
  providerRouter?: ProviderRouter;
  addresses: FacetAddressBook;
  cache?: LocalCache;
  executionSource?: ExecutionSource;
  signerFactory?: SignerFactory;
};

export function createUspeaksClient(options: UspeaksClientOptions) {
  if (!options.providerRouter && !options.providerRouterOptions) {
    throw new Error("createUspeaksClient requires providerRouter or providerRouterOptions");
  }
  const providerRouter = options.providerRouter ?? new ProviderRouter(options.providerRouterOptions!);
  const cache = options.cache ?? new LocalCache();
  const addressBook = new AddressBook(options.addresses);
  const context = {
    addressBook,
    providerRouter,
    cache,
    executionSource: options.executionSource,
    signerFactory: options.signerFactory,
  };

  return {
    providerRouter,
    addressBook,
    cache,
    facets: createFacetWrappers(context),
    subsystems: subsystemRegistry,
  };
}
