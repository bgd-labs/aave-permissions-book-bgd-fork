import { Address, Client, getAddress,getContract } from "viem";
import { EMISSION_MANAGER_ABI } from "../abis/emissionManager.js";
import { UI_POOL_DATA_PROVIDER_ABI } from "../abis/uiPoolDataProvider.js";
import { AggregatedReserveData } from "../helpers/types.js";
import { ghoABI } from "../abis/ghoABI.js";

export const getEmissionAdminsFromScratch = async (addressBook: any, provider: Client) => {

  const emissionAdminsByToken: Record<Address, {symbol: string, emissionAdmin: Address}> = {};
  if (addressBook.UI_POOL_DATA_PROVIDER && addressBook.POOL_ADDRESSES_PROVIDER && addressBook.EMISSION_MANAGER) {
    // get all pool tokens
    const uiPoolDataProvider = getContract({ address: getAddress(addressBook.UI_POOL_DATA_PROVIDER), abi: UI_POOL_DATA_PROVIDER_ABI, client: provider });
    const reservesData: AggregatedReserveData[] = await uiPoolDataProvider.read.getReservesData(addressBook.POOL_ADDRESSES_PROVIDER) as AggregatedReserveData[];
    
    const poolTokens = new Set<Address>();
    reservesData.forEach((reserve: AggregatedReserveData) => {
      poolTokens.add(reserve.aTokenAddress);
      poolTokens.add(reserve.variableDebtTokenAddress);
      poolTokens.add(reserve.underlyingAsset);
    });

    const emissionManager = getContract({ address: getAddress(addressBook.EMISSION_MANAGER), abi: EMISSION_MANAGER_ABI, client: provider });
    

    for (const token of Array.from(poolTokens)) {
      const tokenContract = getContract({ address: token, abi: ghoABI, client: provider });
      const symbol = await tokenContract.read.symbol() as string;
      const emissionAdmin = await emissionManager.read.getEmissionAdmin([token]) as Address;
      emissionAdminsByToken[token] = { symbol, emissionAdmin };
    }
  }
  return emissionAdminsByToken;
};