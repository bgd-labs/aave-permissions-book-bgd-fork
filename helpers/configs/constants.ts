// ============================================================================
// Pool Types Enum
// ============================================================================

export enum Pools {
  V2 = 'V2',
  V3 = 'V3',
  V2_AMM = 'V2_AMM',
  V2_ARC = 'V2_ARC',
  V2_MISC = 'V2_MISC',
  V2_AMM_TENDERLY = 'V2_AMM_TENDERLY',
  V2_ARC_TENDERLY = 'V2_ARC_TENDERLY',
  V2_MISC_TENDERLY = 'V2_MISC_TENDERLY',
  GOV_V2 = 'GOV_V2',
  SAFETY_MODULE = 'SAFETY_MODULE',
  SAFETY_MODULE_TENDERLY = 'SAFETY_MODULE_TENDERLY',
  TENDERLY = 'TENDERLY',
  V2_TENDERLY = 'V2_TENDERLY',
  GHO = 'GHO',
  GHO_TENDERLY = 'GHO_TENDERLY',
  GOV_V2_TENDERLY = 'GOV_V2_TENDERLY',
  GHO_GSM = 'GHO_GSM',
  LIDO = 'LIDO',
  ETHERFI = 'ETHERFI',
  ETHERFI_TENDERLY = 'ETHERFI_TENDERLY',
  LIDO_TENDERLY = 'LIDO_TENDERLY',
  V3_WHITE_LABEL = 'V3_WHITE_LABEL',
}

// ============================================================================
// Role Names
// ============================================================================

export const ghoRoleNames = [
  'DEFAULT_ADMIN',
  'FACILITATOR_MANAGER_ROLE',
  'BUCKET_MANAGER_ROLE',
];

export const collectorRoleNames = [
  'DEFAULT_ADMIN',
  'FUNDS_ADMIN_ROLE',
];

export const clinicStewardRoleNames = [
  'DEFAULT_ADMIN',
  'CLEANUP_ROLE',
];

export const ghoGSMRoleNames = [
  'DEFAULT_ADMIN_ROLE',
  'CONFIGURATOR_ROLE',
  'TOKEN_RESCUER_ROLE',
  'SWAP_FREEZER_ROLE',
  'LIQUIDATOR_ROLE',
];

export const protocolRoleNames = [
  'ASSET_LISTING_ADMIN',
  'DEFAULT_ADMIN',
  'EMERGENCY_ADMIN',
  'FLASH_BORROWER',
  'POOL_ADMIN',
  'RISK_ADMIN',
];

export const granularGuardianRoleNames = [
  'DEFAULT_ADMIN',
  'RETRY_ROLE',
  'SOLVE_EMERGENCY_ROLE',
];

export const umbrellaRoleNames = [
  'DEFAULT_ADMIN',
  'COVERAGE_MANAGER_ROLE',
  'PAUSE_GUARDIAN_ROLE',
  'RESCUE_GUARDIAN_ROLE',
];

export const umbrellaIncentivesRoleNames = [
  'DEFAULT_ADMIN',
  'REWARDS_ADMIN_ROLE',
];

// ============================================================================
// Network Name Mapping
// ============================================================================

export const getNetowkName: Record<string | number, string> = {
  1: 'Eth',
  100: 'Gno',
  137: 'Pol',
  43114: 'Avax',
  42161: 'Arb',
  250: 'FTM',
  10: 'Opt',
  1088: 'Met',
  56: 'BNB',
  8453: 'Bas',
  324: 'ZkSync',
};
