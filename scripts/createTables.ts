import {
  getPermissionsByNetwork,
  saveJson,
} from '../helpers/fileSystem.js';
import { getNetowkName, networkConfigs, Pools } from '../helpers/configs.js';
import { explorerAddressUrlComposer } from '../helpers/explorer.js';
import { ChainId } from '@bgd-labs/toolbox';
import { generateContractsByAddress } from '../helpers/jsonParsers.js';
import {
  getLineSeparator,
  getTableBody,
  getTableHeader,
} from '../helpers/tables.js';
import { getPrincipalReadme } from './readme.js';
import {
  ContractsByAddress,
  PoolConfigs,
  PoolGuardians,
} from '../helpers/types.js';
import {
  Decentralization,
  getActionExecutors,
  getLevelOfDecentralization,
} from '../helpers/decentralization.js';
import { getAddress } from 'viem';
import {
  generateContractTable,
  generateRoleTable,
  generateGsmRolesTables,
  TableContext,
} from '../helpers/tableGenerator.js';

export const generateTableAddress = (
  address: string | undefined,
  addressesNames: Record<string, string>,
  contractsByAddress: ContractsByAddress,
  poolGuardians: PoolGuardians,
  network: string,
  chainId?: string,
): string => {
  if (!address) {
    return '-';
  }

  const checkSummedAddress = getAddress(address);

  // Handle cross-chain address resolution
  if (chainId) {
    const newContractsByAddress = generateContractsByAddress({
      ...getPermissionsByNetwork(chainId)['V3'].govV3?.contracts,
      ...getPermissionsByNetwork(chainId)['V3'].ppc?.contracts,
      ...getPermissionsByNetwork(chainId)['V3_WHITE_LABEL']?.govV3?.contracts,
      ...getPermissionsByNetwork(chainId)['V3_WHITE_LABEL']?.ppc?.contracts,
    });
    const networkContractsByAddress: Record<string, string> = {};
    Object.keys(newContractsByAddress).forEach((key) => {
      networkContractsByAddress[key] = `${newContractsByAddress[key]}(${getNetowkName[chainId]})`;
    });
    contractsByAddress = {
      ...contractsByAddress,
      ...networkContractsByAddress,
    };
  }

  // Resolve display name (priority order)
  const resolveDisplayName = (): string => {
    // 1. Check addressesNames with original address
    if (addressesNames[address]) {
      return addressesNames[address];
    }
    // 2. Check addressesNames with checksummed address
    if (addressesNames[checkSummedAddress]) {
      return addressesNames[checkSummedAddress];
    }
    // 3. Check contractsByAddress with original address
    if (contractsByAddress[address]) {
      return contractsByAddress[address];
    }
    // 4. Check contractsByAddress with checksummed address
    if (contractsByAddress[checkSummedAddress]) {
      return contractsByAddress[checkSummedAddress];
    }
    // 5. Check if it's a Safe (has owners)
    const guardian = poolGuardians[checkSummedAddress];
    if (guardian && guardian.owners.length > 0) {
      return addressesNames[checkSummedAddress] || `${checkSummedAddress} (Safe)`;
    }
    // 6. Fall back to checksummed address
    return checkSummedAddress;
  };

  // Resolve explorer URL (ShortExecutor/LongExecutor go to mainnet)
  const resolveExplorerUrl = (): string => {
    const contractName = contractsByAddress[checkSummedAddress];
    if (contractName === 'ShortExecutor' || contractName === 'LongExecutor') {
      return explorerAddressUrlComposer(checkSummedAddress, ChainId.mainnet.toString());
    }
    return explorerAddressUrlComposer(checkSummedAddress, network);
  };

  return `[${resolveDisplayName()}](${resolveExplorerUrl()})`;
};

export const generateTable = (network: string, pool: string): string => {
  let readmeDirectoryTable: string = '';

  // to generate tenderly tables, add TENDERLY flag on .env file
  if (
    (!process.env.TENDERLY || process.env.TENDERLY === 'false') &&
    pool.toLowerCase().indexOf('tenderly') > -1
  ) {
    return '';
  }

  const networkPermits = getPermissionsByNetwork(network);
  const mainnetPermissions = getPermissionsByNetwork(ChainId.mainnet);

  const networkName = networkConfigs[Number(network)].name.toUpperCase();
  const addressesNames = networkConfigs[network].addressesNames || {};

  // create network Readme with pool tables
  let readmeByNetwork = `# ${networkName} \n`;

  const poolGuardians: PoolGuardians = {};
  let poolPermitsByContract = networkPermits[pool];
  poolPermitsByContract.contracts = {
    ...networkPermits[pool].contracts,
    ...getPermissionsByNetwork(network)[pool].collector?.contracts,
    ...getPermissionsByNetwork(network)[pool].clinicSteward?.contracts,
    // ...getPermissionsByNetwork(network)[pool].agentHub?.contracts,
    // ...getPermissionsByNetwork(network)[pool].umbrella?.contracts,
    // ...getPermissionsByNetwork(network)[pool].ppc?.contracts,
  }

  if (!poolPermitsByContract?.contracts) {
    return readmeDirectoryTable;
  }

  if (pool === Pools.LIDO || pool === Pools.ETHERFI || pool === Pools.LIDO_TENDERLY || pool === Pools.ETHERFI_TENDERLY) {
    poolPermitsByContract.contracts = {
      ...poolPermitsByContract.contracts,
      PoolExposureSteward: getPermissionsByNetwork(network)['V3'].contracts['PoolExposureSteward'],
    };
  }

  // create pool table
  readmeByNetwork += `## ${pool} \n`;

  let contractsByAddress: Record<string, string> = {};

  // add gov contracts to contractsByAddresses
  if (pool !== Pools.GOV_V2 && pool !== Pools.GOV_V2_TENDERLY) {
    contractsByAddress = generateContractsByAddress({
      ...mainnetPermissions[Pools.GOV_V2].contracts,
    });
  }

  let v3Contracts;
  if (
    pool === Pools.LIDO ||
    pool === Pools.ETHERFI
  ) {
    v3Contracts = generateContractsByAddress({
      ...(poolPermitsByContract?.contracts || {}),
      ...getPermissionsByNetwork(network)['V3'].govV3?.contracts,
      ...getPermissionsByNetwork(network)['V3'].collector?.contracts,
      ...getPermissionsByNetwork(network)['V3'].clinicSteward?.contracts,
      ...getPermissionsByNetwork(network)['V3'].umbrella?.contracts,
      ...getPermissionsByNetwork(network)['V3'].ppc?.contracts,
    });
  } else if (
    pool === Pools.TENDERLY
  ) {
    v3Contracts = generateContractsByAddress({
      ...(poolPermitsByContract?.contracts || {}),
      ...getPermissionsByNetwork(network)['V3'].govV3?.contracts,
      ...getPermissionsByNetwork(network)['V3'].collector?.contracts,
      ...getPermissionsByNetwork(network)['V3'].clinicSteward?.contracts,
      ...getPermissionsByNetwork(network)['V3'].umbrella?.contracts,
      ...getPermissionsByNetwork(network)['V3'].ppc?.contracts,
      ...getPermissionsByNetwork(network)['V3'].agentHub?.contracts,
      ...getPermissionsByNetwork(network)['TENDERLY'].govV3?.contracts,
      ...getPermissionsByNetwork(network)['TENDERLY'].collector?.contracts,
      ...getPermissionsByNetwork(network)['TENDERLY'].clinicSteward?.contracts,
      ...getPermissionsByNetwork(network)['TENDERLY'].umbrella?.contracts,
      ...getPermissionsByNetwork(network)['TENDERLY'].ppc?.contracts,
      ...getPermissionsByNetwork(network)['TENDERLY'].agentHub?.contracts,
    });
  } else if (
    pool === Pools.LIDO_TENDERLY
  ) {
    v3Contracts = generateContractsByAddress({
      ...(poolPermitsByContract?.contracts || {}),
      ...getPermissionsByNetwork(network)['V3'].govV3?.contracts,
      ...getPermissionsByNetwork(network)['V3'].collector?.contracts,
      ...getPermissionsByNetwork(network)['V3'].clinicSteward?.contracts,
      ...getPermissionsByNetwork(network)['V3'].umbrella?.contracts,
      ...getPermissionsByNetwork(network)['V3'].ppc?.contracts,
      ...getPermissionsByNetwork(network)['V3'].agentHub?.contracts,
      ...getPermissionsByNetwork(network)['LIDO_TENDERLY'].govV3?.contracts,
      ...getPermissionsByNetwork(network)['LIDO_TENDERLY'].collector?.contracts,
      ...getPermissionsByNetwork(network)['LIDO_TENDERLY'].clinicSteward?.contracts,
      ...getPermissionsByNetwork(network)['LIDO_TENDERLY'].umbrella?.contracts,
      ...getPermissionsByNetwork(network)['LIDO_TENDERLY'].ppc?.contracts,
      ...getPermissionsByNetwork(network)['LIDO_TENDERLY'].agentHub?.contracts,
    });
  } else if (
    pool === Pools.ETHERFI_TENDERLY
  ) {
    v3Contracts = generateContractsByAddress({
      ...(poolPermitsByContract?.contracts || {}),
      ...getPermissionsByNetwork(network)['V3'].govV3?.contracts,
      ...getPermissionsByNetwork(network)['V3'].collector?.contracts,
      ...getPermissionsByNetwork(network)['V3'].clinicSteward?.contracts,
      ...getPermissionsByNetwork(network)['V3'].umbrella?.contracts,
      ...getPermissionsByNetwork(network)['V3'].ppc?.contracts,
      ...getPermissionsByNetwork(network)['V3'].agentHub?.contracts,
      ...getPermissionsByNetwork(network)['ETHERFI_TENDERLY'].govV3?.contracts,
      ...getPermissionsByNetwork(network)['ETHERFI_TENDERLY'].collector?.contracts,
      ...getPermissionsByNetwork(network)['ETHERFI_TENDERLY'].clinicSteward?.contracts,
      ...getPermissionsByNetwork(network)['ETHERFI_TENDERLY'].umbrella?.contracts,
      ...getPermissionsByNetwork(network)['ETHERFI_TENDERLY'].ppc?.contracts,
      ...getPermissionsByNetwork(network)['ETHERFI_TENDERLY'].agentHub?.contracts,
    });
  } else if (pool === Pools.V3_WHITE_LABEL) {
    v3Contracts = generateContractsByAddress({
      ...(poolPermitsByContract?.contracts || {}),
      ...getPermissionsByNetwork(network)['V3_WHITE_LABEL']?.govV3?.contracts,
      ...getPermissionsByNetwork(network)['V3_WHITE_LABEL']?.contracts,
      ...getPermissionsByNetwork(network)['V3_WHITE_LABEL']?.collector?.contracts,
      ...getPermissionsByNetwork(network)['V3_WHITE_LABEL']?.clinicSteward?.contracts,
      ...getPermissionsByNetwork(network)['V3_WHITE_LABEL']?.umbrella?.contracts,
      ...getPermissionsByNetwork(network)['V3_WHITE_LABEL']?.ppc?.contracts,
      ...getPermissionsByNetwork(network)['V3_WHITE_LABEL']?.agentHub?.contracts,
    });
  } else {
    v3Contracts = generateContractsByAddress({
      ...(poolPermitsByContract?.contracts || {}),
      ...getPermissionsByNetwork(network)['V3'].govV3?.contracts,
      ...getPermissionsByNetwork(network)['V3'].contracts,
      ...getPermissionsByNetwork(ChainId.mainnet)['GHO'].contracts,
      ...getPermissionsByNetwork(network)['V3'].collector?.contracts,
      ...getPermissionsByNetwork(network)['V3'].clinicSteward?.contracts,
      ...getPermissionsByNetwork(network)['V3'].ppc?.contracts,
      ...getPermissionsByNetwork(network)['V3'].umbrella?.contracts,
      ...getPermissionsByNetwork(network)['V3'].agentHub?.contracts,
    });
  }
  contractsByAddress = { ...contractsByAddress, ...v3Contracts };

  let decentralizationTable = `### Contracts upgradeability\n`;
  const decentralizationHeaderTitles = ['contract', 'upgradeable by'];
  const decentralizationHeader = getTableHeader(decentralizationHeaderTitles);
  decentralizationTable += decentralizationHeader;

  // fill pool table
  let decentralizationTableBody = '';
  for (let contractName of Object.keys(poolPermitsByContract.contracts)) {
    const contract = poolPermitsByContract.contracts[contractName];
    let govPermissions = pool === Pools.V3_WHITE_LABEL ? {
      ...getPermissionsByNetwork(network)['V3_WHITE_LABEL']?.govV3?.contracts,
      ...getPermissionsByNetwork(network)['V3_WHITE_LABEL']?.ppc?.contracts,
    } : {
      ...getPermissionsByNetwork(network)['V3'].govV3?.contracts,
    };
    if (pool === Pools.V2_ARC) {
      govPermissions = {
        ...getPermissionsByNetwork(network)['V3'].govV3?.contracts,
        ...getPermissionsByNetwork(ChainId.mainnet)['V2_ARC'].contracts,
      };
    }
    const { upgradeable, ownedBy }: Decentralization =
      getLevelOfDecentralization(
        contract,
        pool === Pools.LIDO ||
          pool === Pools.ETHERFI ||
          pool === Pools.ETHERFI_TENDERLY ||
          pool === Pools.LIDO_TENDERLY
          ? {
            ...poolPermitsByContract.contracts,
            ...getPermissionsByNetwork(network)['V3'].collector?.contracts,
            ...getPermissionsByNetwork(network)['V3'].govV3?.contracts,
            ...getPermissionsByNetwork(network)['V3'].clinicSteward?.contracts,
            ...getPermissionsByNetwork(network)['V3'].umbrella?.contracts,
            ...getPermissionsByNetwork(network)['V3'].ppc?.contracts,
            ...getPermissionsByNetwork(network)['V3'].agentHub?.contracts,
          }
          : pool === Pools.V3_WHITE_LABEL ?
            {

              ...getPermissionsByNetwork(network)['V3_WHITE_LABEL']?.govV3?.contracts,
              ...getPermissionsByNetwork(network)['V3_WHITE_LABEL']?.contracts,
              ...getPermissionsByNetwork(network)['V3_WHITE_LABEL']?.collector?.contracts,
              ...getPermissionsByNetwork(network)['V3_WHITE_LABEL']?.clinicSteward?.contracts,
              ...getPermissionsByNetwork(network)['V3_WHITE_LABEL']?.umbrella?.contracts,
              ...getPermissionsByNetwork(network)['V3_WHITE_LABEL']?.ppc?.contracts,
              ...getPermissionsByNetwork(network)['V3_WHITE_LABEL']?.agentHub?.contracts,
            } :
            {
              ...poolPermitsByContract.contracts,
              ...getPermissionsByNetwork(network)['V3'].contracts,
              ...getPermissionsByNetwork(network)['V3'].collector?.contracts,
              ...getPermissionsByNetwork(network)['V3'].govV3?.contracts,
              ...getPermissionsByNetwork(network)['V3'].clinicSteward?.contracts,
              ...getPermissionsByNetwork(network)['V3'].umbrella?.contracts,
              ...getPermissionsByNetwork(network)['V3'].ppc?.contracts,
              ...getPermissionsByNetwork(network)['V3'].agentHub?.contracts,
            },
        govPermissions,
        pool === Pools.V3_WHITE_LABEL ? true : false,
      );
    decentralizationTableBody += getTableBody([
      `[${contractName}](${explorerAddressUrlComposer(
        contract.address,
        network,
      )})`,
      `${upgradeable ? ownedBy : 'not upgradeable'}`,
    ]);
    decentralizationTableBody += getLineSeparator(
      decentralizationHeaderTitles.length,
    );
  }
  // hardcode aave a/v/s tokens
  if (pool.includes('V3') || pool.includes('V2') || pool.includes('LIDO') || pool.includes('ETHERFI')) {
    decentralizationTableBody += getTableBody([
      `Aave a/v/s tokens`,
      `${pool === Pools.V3_WHITE_LABEL ? 'PPC Multi-sig' : 'Governance'}`,
    ]);
    decentralizationTableBody += getLineSeparator(
      decentralizationHeaderTitles.length,
    );
  }

  if (
    poolPermitsByContract.govV3 &&
    Object.keys(poolPermitsByContract.govV3).length > 0 &&
    poolPermitsByContract.govV3.contracts
  ) {
    for (let contractName of Object.keys(
      poolPermitsByContract.govV3.contracts,
    )) {
      const contract = poolPermitsByContract.govV3.contracts[contractName];
      const { upgradeable, ownedBy }: Decentralization =
        getLevelOfDecentralization(
          contract,
          {
            ...poolPermitsByContract.contracts,
            ...getPermissionsByNetwork(network)['V3'].govV3?.contracts,
          },
          getPermissionsByNetwork(network)['V3'].govV3?.contracts || {},
          pool === Pools.V3_WHITE_LABEL ? true : false,
        );
      decentralizationTableBody += getTableBody([
        `[${contractName}](${explorerAddressUrlComposer(
          contract.address,
          network,
        )})`,
        `${upgradeable ? ownedBy : 'not upgradeable'}`,
      ]);
      decentralizationTableBody += getLineSeparator(
        decentralizationHeaderTitles.length,
      );
    }
  }

  decentralizationTable += decentralizationTableBody;
  readmeByNetwork += decentralizationTable + '\n';

  let actionsTable = `### Actions type\n`;
  const actionsHeaderTitles = ['type', 'can be executed by'];
  const actionsHeader = getTableHeader(actionsHeaderTitles);
  actionsTable += actionsHeader;

  // fill pool table
  let actionsTableBody = '';
  const actionExecutors = getActionExecutors(
    pool === Pools.V3_WHITE_LABEL ?
      {
        ...poolPermitsByContract.contracts,
        ...getPermissionsByNetwork(network)['V3_WHITE_LABEL']?.govV3?.contracts,
        ...getPermissionsByNetwork(network)['V3_WHITE_LABEL']?.contracts,
        ...getPermissionsByNetwork(network)['V3_WHITE_LABEL']?.collector?.contracts,
        ...getPermissionsByNetwork(network)['V3_WHITE_LABEL']?.clinicSteward?.contracts,
        ...getPermissionsByNetwork(network)['V3_WHITE_LABEL']?.umbrella?.contracts,
        ...getPermissionsByNetwork(network)['V3_WHITE_LABEL']?.ppc?.contracts,
        ...getPermissionsByNetwork(network)['V3_WHITE_LABEL']?.agentHub?.contracts,
      } :
      {
        ...poolPermitsByContract.contracts,
        ...getPermissionsByNetwork(network)['V3'].govV3?.contracts,
        ...getPermissionsByNetwork(network)['V3'].collector?.contracts,
        ...getPermissionsByNetwork(network)['V3'].clinicSteward?.contracts,
        ...getPermissionsByNetwork(ChainId.mainnet)['GHO'].contracts,
        ...getPermissionsByNetwork(network)['V3'].agentHub?.contracts,
      },
    pool === Pools.V3_WHITE_LABEL ?
      {
        ...getPermissionsByNetwork(network)['V3_WHITE_LABEL']?.govV3?.contracts,
        ...getPermissionsByNetwork(network)['V3_WHITE_LABEL']?.ppc?.contracts,
      } :
      {
        ...getPermissionsByNetwork(network)['V3'].govV3?.contracts,
        ...getPermissionsByNetwork(network)['V3'].ppc?.contracts,
        ...getPermissionsByNetwork(network)['V3'].clinicSteward?.contracts,
        ...getPermissionsByNetwork(ChainId.mainnet)['GHO'].contracts,
        ...getPermissionsByNetwork(network)['V3'].agentHub?.contracts,
      },
    pool === Pools.V3_WHITE_LABEL ? true : false,
    networkConfigs[Number(network)].addressesNames || {} as Record<string, string>
  );
  for (let actionName of Object.keys(actionExecutors)) {
    if (Array.from(actionExecutors[actionName]).length > 0) {
      actionsTableBody += getTableBody([
        actionName,
        `${Array.from(actionExecutors[actionName])}`,
      ]);
      actionsTableBody += getLineSeparator(actionsHeaderTitles.length);
    }
  }
  if (actionsTableBody !== '') {
    actionsTable += actionsTableBody;
    readmeByNetwork += actionsTable + '\n';
  }

  // Create table context for use with generic table generators
  const tableCtx: TableContext = {
    network,
    addressesNames,
    contractsByAddress,
    poolGuardians,
    generateTableAddress,
  };

  // Contracts table
  if (poolPermitsByContract.contracts && Object.keys(poolPermitsByContract.contracts).length > 0) {
    readmeByNetwork += generateContractTable(
      { title: 'Contracts', contracts: poolPermitsByContract.contracts },
      tableCtx,
    );

    readmeDirectoryTable += getTableBody([
      networkName,
      pool,
      `[Permissions](./out/${networkName}-${pool}.md#contracts)`,
    ]);
    readmeDirectoryTable += getLineSeparator(3);
  }

  // Governance V3 Contracts table
  readmeByNetwork += generateContractTable(
    { title: 'Governance V3 Contracts', contracts: poolPermitsByContract.govV3?.contracts },
    tableCtx,
  );

  // Umbrella Contracts table
  readmeByNetwork += generateContractTable(
    { title: 'Umbrella Contracts', contracts: poolPermitsByContract.umbrella?.contracts },
    tableCtx,
  );

  // Risk Agent Contracts table (agentHub)
  readmeByNetwork += generateContractTable(
    { title: 'Risk Agent Contracts', contracts: poolPermitsByContract.agentHub?.contracts },
    tableCtx,
  );

  // Permissioned Payloads Controller Contracts table (ppc)
  readmeByNetwork += generateContractTable(
    { title: 'Permissioned Payloads Controller Contracts', contracts: poolPermitsByContract.ppc?.contracts },
    tableCtx,
  );

  if (Object.keys(poolGuardians).length > 0) {
    let guardianTable = `### Guardians \n`;
    const guardianHeaderTitles = ['Guardian', 'Threshold', 'Address', 'Owners'];
    const guardianHeader = getTableHeader(guardianHeaderTitles);
    guardianTable += guardianHeader;

    Object.keys(poolGuardians).forEach((guardian) => {
      guardianTable += getTableBody([
        `[${addressesNames[getAddress(guardian)]
          ? addressesNames[getAddress(guardian)]
          : `${getAddress(guardian)} (Safe)`
        }](${explorerAddressUrlComposer(guardian, network)})`,
        `${poolGuardians[guardian].threshold}/${poolGuardians[guardian].owners.length}`,
        guardian,
        `${poolGuardians[guardian].owners
          .map(
            (owner) =>
              `[${owner}](${explorerAddressUrlComposer(owner, network)})`,
          )
          .join(', ')}`,
      ]);
      guardianTable += getLineSeparator(guardianHeaderTitles.length);
    });

    readmeByNetwork += guardianTable + '\n';
  }
  // Admins table
  readmeByNetwork += generateRoleTable(
    { title: 'Admins', roles: poolPermitsByContract.roles?.role },
    tableCtx,
  );

  // Granular Guardian Admins table
  readmeByNetwork += generateRoleTable(
    { title: 'Granular Guardian Admins', roles: poolPermitsByContract.govV3?.ggRoles?.role },
    tableCtx,
  );

  // Umbrella Admins table (merged from umbrellaRoles and umbrellaIncentivesRoles)
  const umbrellaRoles = poolPermitsByContract.umbrella?.umbrellaRoles?.role && poolPermitsByContract.umbrella?.umbrellaIncentivesRoles?.role
    ? { ...poolPermitsByContract.umbrella.umbrellaRoles.role, ...poolPermitsByContract.umbrella.umbrellaIncentivesRoles.role }
    : undefined;
  readmeByNetwork += generateRoleTable(
    { title: 'Umbrella Admins', roles: umbrellaRoles },
    tableCtx,
  );

  // Collector Admins table
  readmeByNetwork += generateRoleTable(
    { title: 'Collector Admins', roles: poolPermitsByContract.collector?.cRoles?.role },
    tableCtx,
  );

  // Clinic Steward Admins table
  readmeByNetwork += generateRoleTable(
    { title: 'Clinic Steward Admins', roles: poolPermitsByContract.clinicSteward?.clinicStewardRoles?.role },
    tableCtx,
  );

  // GSM Admins tables
  readmeByNetwork += generateGsmRolesTables(poolPermitsByContract.gsmRoles, tableCtx);

  let poolName = pool;
  if (networkConfigs[network].pools[pool].tenderlyBasePool) {
    poolName = networkConfigs[network].pools[pool].tenderlyBasePool;
  }
  saveJson(`./out/${networkName}-${poolName}.md`, readmeByNetwork);

  return readmeDirectoryTable;
};

const checkForTenderlyPool = (
  pools: Record<string, PoolConfigs>,
  selectedPool: string,
): boolean => {
  if (!process.env.TENDERLY || process.env.TENDERLY === 'false') {
    return false;
  }

  const poolNames = Object.keys(pools).map((pool) => pool);
  for (const poolName of poolNames) {
    if (
      poolName !== selectedPool &&
      pools[poolName].tenderlyBasePool &&
      pools[poolName].tenderlyBasePool === selectedPool
    ) {
      return true;
    }
  }

  return false;
};

export const generateAllTables = () => {
  const networks = Object.keys(networkConfigs).map((network) => network);

  // create readme string
  let readmeDirectoryTable = '';
  const readmeDirectoryTableHeaderTitles = ['Network', 'System type', 'Tables'];
  const readmeDirectoryHeader = getTableHeader(
    readmeDirectoryTableHeaderTitles,
  );
  readmeDirectoryTable += readmeDirectoryHeader;

  for (let network of networks) {
    const pools = Object.keys(networkConfigs[network].pools).map(
      (pool) => pool,
    );
    for (let pool of pools) {
      // if pool has a tenderly pool enabled only generate tenderly
      const hasTenderlyTable = checkForTenderlyPool(
        networkConfigs[network].pools,
        pool,
      );

      if (!hasTenderlyTable) {
        readmeDirectoryTable += generateTable(network, pool);
      }
    }
  }

  saveJson('./README.md', getPrincipalReadme(readmeDirectoryTable));
};

generateAllTables();
