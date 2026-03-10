import { AddressBook, type FacetAddressBook } from "./runtime/address-book.js";
import { LocalCache } from "./runtime/cache.js";
import { ProviderRouter, type ProviderRouterOptions } from "./runtime/provider-router.js";
import { createFacetWrappers } from "./generated/createFacetWrappers.js";
import { subsystemRegistry } from "./generated/subsystems.js";
import type { RpcTransport } from "./transports/json-rpc.js";
import type { SignerFactory } from "./types.js";

export type UspeaksClientOptions = {
  providerRouterOptions: ProviderRouterOptions;
  addresses: FacetAddressBook;
  transport?: RpcTransport;
  signerFactory?: SignerFactory;
};

export function createUspeaksClient(options: UspeaksClientOptions) {
  const providerRouter = new ProviderRouter(options.providerRouterOptions);
  const cache = new LocalCache();
  const addressBook = new AddressBook(options.addresses);
  const context = {
    addressBook,
    providerRouter,
    cache,
    transport: options.transport,
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

