import {
  AaveV3Mantle,
  GovernanceV3Mantle,
  MiscMantle,
} from '@bgd-labs/aave-address-book';
import { Pools } from '../constants.js';
import { NetworkConfig } from '../../types.js';
import { createV3Pool } from '../poolBuilder.js';
import { mergeAddressNames } from '../addresses/index.js';

// ============================================================================
// V3 Pool
// ============================================================================
const v3Pool = createV3Pool({
  aclBlock: 90172810,
  collectorBlock: 90172810,
  crossChainControllerBlock: 75528130,
  granularGuardianBlock: 75528470,
  addressBook: {
    ...AaveV3Mantle,
    ...MiscMantle,
  },
  governanceAddressBook: {
    ...GovernanceV3Mantle,
    ...MiscMantle,
  },
});

// ============================================================================
// Network Config Export
// ============================================================================
export const mantleConfig: NetworkConfig = {
  name: 'Mantle',
  rpcUrl: process.env.RPC_MANTLE,
  explorer: 'https://explorer.mantle.xyz/',
  addressesNames: mergeAddressNames({
    '0x172867391d690Eb53896623DaD22208624230686': 'Aave Protocol Guardian Mantle',
    '0x0686f59Cc2aEc1ccf891472Dc6C89bB747F6a4A7': 'BGD',
    '0xb26670d2800DBB9cfCe2f2660FfDcA48C799c86d': 'Aave Granular Guardian Mantle',
    '0x14816fC7f443A9C834d30eeA64daD20C4f56fBCD': 'Aave Governance Guardian Mantle',
    '0xfF0ACe5060bd25f6900eb4bD91a868213C5346B5': 'Risk Council',
  }),
  pools: {
    [Pools.V3]: v3Pool,
  },
};
