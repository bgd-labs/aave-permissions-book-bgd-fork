import { Client } from 'viem';
import { AddressInfo } from './types.js';
import { getSafeOwners, getSafeThreshold } from './guardian.js';

/**
 * Removes duplicate addresses from an array of AddressInfo objects.
 * Uses case-insensitive comparison on the address field.
 * Keeps the first occurrence of each address.
 */
export const uniqueAddresses = (addressesInfo: AddressInfo[]): AddressInfo[] => {
  const seen = new Set<string>();
  const result: AddressInfo[] = [];

  for (const addressInfo of addressesInfo) {
    const key = addressInfo.address.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(addressInfo);
    }
  }

  return result;
};

/**
 * Fetches Safe owners for an address and returns an AddressInfo object.
 * This is a convenience function for simple owner lookups.
 * For bulk operations, prefer using OwnerResolver for caching.
 */
export const getAddressInfo = async (
  provider: Client,
  address: string,
): Promise<AddressInfo> => {
  const owners = await getSafeOwners(provider, address);
  return {
    address,
    owners,
  };
};

/**
 * Fetches Safe owners and threshold for an address and returns a full AddressInfo object.
 * This is a convenience function for simple owner lookups.
 * For bulk operations, prefer using OwnerResolver for caching.
 */
export const getFullAddressInfo = async (
  provider: Client,
  address: string,
): Promise<AddressInfo> => {
  const owners = await getSafeOwners(provider, address);
  const signersThreshold = await getSafeThreshold(provider, address);
  return {
    address,
    owners,
    signersThreshold,
  };
};
