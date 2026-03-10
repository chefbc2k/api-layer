import type { ContractRunner, Provider } from "ethers";

import { AddressBook } from "./runtime/address-book.js";
import { LocalCache } from "./runtime/cache.js";
import type { ProviderRouter } from "./runtime/provider-router.js";
import type { RpcTransport } from "./transports/json-rpc.js";

export type SignerFactory = (provider: Provider) => Promise<ContractRunner>;

export type FacetWrapperContext = {
  addressBook: AddressBook;
  providerRouter: ProviderRouter;
  cache: LocalCache;
  transport?: RpcTransport;
  signerFactory?: SignerFactory;
};

