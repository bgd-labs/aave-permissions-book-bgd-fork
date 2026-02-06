import { generateRoles } from '../helpers/jsonParsers.js';
import { getProxyAdmin } from '../helpers/proxyAdmin.js';
import { AaveGovernanceV2ABI } from '../abis/AaveGovernanceV2.js';
import { executorWithTimelockAbi } from '../abis/executorWithTimelockAbi.js';
import { AddressBook, Contracts, PermissionsJson } from '../helpers/types.js';
import { Address, Client, getAddress, getContract } from 'viem';
import { createOwnerResolver } from '../helpers/ownerResolver.js';

export const resolveGovV2Modifiers = async (
  addressBook: AddressBook,
  provider: Client,
  permissionsObject: PermissionsJson,
): Promise<Contracts> => {
  const obj: Contracts = {};
  const roles = generateRoles(permissionsObject);

  // Create owner resolver with caching for this network
  const ownerResolver = createOwnerResolver(provider);

  const govContract = getContract({ address: getAddress('0xec568fffba86c094cf06b22134b23074dfe2252c'), abi: AaveGovernanceV2ABI, client: provider });

  const guardian = await govContract.read.getGuardian() as Address;
  const govOwner = await govContract.read.owner() as Address;

  const guardianInfo = await ownerResolver.resolve(guardian);
  const govOwnerInfo = await ownerResolver.resolve(govOwner);

  obj['AaveGovernanceV2'] = {
    address: '0xEC568fffba86c094cf06b22134B23074DFE2252c',
    modifiers: [
      {
        modifier: 'onlyGuardian',
        addresses: [
          {
            address: guardian,
            owners: guardianInfo.owners,
            signersThreshold: guardianInfo.threshold,
          },
        ],
        functions: roles['AaveGovernanceV2']['onlyGuardian'],
      },
      {
        modifier: 'onlyOwner',
        addresses: [
          {
            address: govOwner,
            owners: govOwnerInfo.owners,
            signersThreshold: govOwnerInfo.threshold,
          },
        ],
        functions: roles['AaveGovernanceV2']['onlyOwner'],
      },
    ],
  };

  const shortExecutor = getContract({ address: getAddress(addressBook.SHORT_EXECUTOR), abi: executorWithTimelockAbi, client: provider });
  const pendingAdmin = await shortExecutor.read.getPendingAdmin() as Address;
  const admin = await shortExecutor.read.getAdmin() as Address;

  const pendingAdminInfo = await ownerResolver.resolve(pendingAdmin);
  const adminInfo = await ownerResolver.resolve(admin);

  obj['ShortExecutor'] = {
    address: addressBook.SHORT_EXECUTOR,
    modifiers: [
      {
        modifier: 'onlyTimelock',
        addresses: [
          {
            address: shortExecutor.address,
            owners: [],
          },
        ],
        functions: roles['ExecutorWithTimelock']['onlyTimelock'],
      },
      {
        modifier: 'onlyPendingAdmin',
        addresses: [
          {
            address: pendingAdmin,
            owners: pendingAdminInfo.owners,
            signersThreshold: pendingAdminInfo.threshold,
          },
        ],
        functions: roles['ExecutorWithTimelock']['onlyPendingAdmin'],
      },
      {
        modifier: 'onlyAdmin',
        addresses: [
          {
            address: admin,
            owners: adminInfo.owners,
            signersThreshold: adminInfo.threshold,
          },
        ],
        functions: roles['ExecutorWithTimelock']['onlyAdmin'],
      },
    ],
  };

  const longExecutor = getContract({ address: getAddress(addressBook.LONG_EXECUTOR), abi: executorWithTimelockAbi, client: provider });
  const longPendingAdmin = await longExecutor.read.getPendingAdmin() as Address;
  const longAdmin = await longExecutor.read.getAdmin() as Address;

  const longPendingAdminInfo = await ownerResolver.resolve(longPendingAdmin);
  const longAdminInfo = await ownerResolver.resolve(longAdmin);

  obj['LongExecutor'] = {
    address: addressBook.LONG_EXECUTOR,
    modifiers: [
      {
        modifier: 'onlyTimelock',
        addresses: [
          {
            address: longExecutor.address,
            owners: [],
          },
        ],
        functions: roles['ExecutorWithTimelock']['onlyTimelock'],
      },
      {
        modifier: 'onlyPendingAdmin',
        addresses: [
          {
            address: longPendingAdmin,
            owners: longPendingAdminInfo.owners,
            signersThreshold: longPendingAdminInfo.threshold,
          },
        ],
        functions: roles['ExecutorWithTimelock']['onlyPendingAdmin'],
      },
      {
        modifier: 'onlyAdmin',
        addresses: [
          {
            address: longAdmin,
            owners: longAdminInfo.owners,
            signersThreshold: longAdminInfo.threshold,
          },
        ],
        functions: roles['ExecutorWithTimelock']['onlyAdmin'],
      },
    ],
  };

  // add proxy admins
  const proxyAdminContracts: string[] = permissionsObject
    .filter((contract) => contract.proxyAdmin)
    .map((contract) => contract.contract);
  for (let i = 0; i < proxyAdminContracts.length; i++) {
    obj[proxyAdminContracts[i]]['proxyAdmin'] = await getProxyAdmin(
      obj[proxyAdminContracts[i]].address,
      provider,
    );
  }

  return obj;
};
