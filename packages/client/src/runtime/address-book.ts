export type FacetAddressBook = {
  diamond: string;
  facets?: Partial<Record<string, string>>;
};

export class AddressBook {
  constructor(private readonly addresses: FacetAddressBook) {}

  resolveFacetAddress(facetName: string): string {
    return this.addresses.facets?.[facetName] ?? this.addresses.diamond;
  }

  toJSON(): FacetAddressBook {
    return this.addresses;
  }
}

