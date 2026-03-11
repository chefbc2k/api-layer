import type { ContractRunner, Provider } from "ethers";

import { AddressBook } from "./runtime/address-book.js";
import { LocalCache } from "./runtime/cache.js";
import type { ProviderRouter } from "./runtime/provider-router.js";

export type SignerFactory = (provider: Provider) => Promise<ContractRunner>;
export type ExecutionSource = "auto" | "live" | "cache" | "indexed";

export type FacetWrapperContext = {
  addressBook: AddressBook;
  providerRouter: ProviderRouter;
  cache: LocalCache;
  executionSource?: ExecutionSource;
  signerFactory?: SignerFactory;
};
