import { generateRoles } from '../helpers/jsonParsers.js';
import { getProxyAdmin } from '../helpers/proxyAdmin.js';
import { stkToken } from '../abis/stkToken.js';
import { abptABI } from '../abis/abptABI.js';
import { bptABI } from '../abis/bptABI.js';
import { Contracts, PermissionsJson } from '../helpers/types.js';
import { Address, Client, getAddress, getContract } from 'viem';
import { createOwnerResolver } from '../helpers/ownerResolver.js';

export const resolveSafetyV2Modifiers = async (
  addressBook: any,
  provider: Client,
  permissionsObject: PermissionsJson,
): Promise<Contracts> => {
  const SLASH_ADMIN_ROLE = 0;
  const COOLDOWN_ADMIN_ROLE = 1;
  const CLAIM_HELPER_ROLE = 2;

  const obj: Contracts = {};
  const roles = generateRoles(permissionsObject);

  // Create owner resolver with caching for this network
  const ownerResolver = createOwnerResolver(provider);

  // stk aave token
  const stkAaveContract = getContract({ address: getAddress(addressBook.STK_AAVE), abi: stkToken, client: provider });

  const stkAaveEmissionManager = await stkAaveContract.read.EMISSION_MANAGER() as Address;
  const slashAdmin = await stkAaveContract.read.getAdmin([SLASH_ADMIN_ROLE]) as Address;
  const cooldDownAdmin = await stkAaveContract.read.getAdmin([COOLDOWN_ADMIN_ROLE]) as Address;
  const claimHelperAdmin = await stkAaveContract.read.getAdmin([CLAIM_HELPER_ROLE]) as Address;

  const emissionManagerInfo = await ownerResolver.resolve(stkAaveEmissionManager);
  const slashAdminInfo = await ownerResolver.resolve(slashAdmin);
  const cooldownAdminInfo = await ownerResolver.resolve(cooldDownAdmin);
  const claimHelperAdminInfo = await ownerResolver.resolve(claimHelperAdmin);

  obj['stkAave'] = {
    address: addressBook.STK_AAVE,
    modifiers: [
      {
        modifier: 'onlyEmissionManager',
        addresses: [
          {
            address: stkAaveEmissionManager,
            owners: emissionManagerInfo.owners,
            signersThreshold: emissionManagerInfo.threshold,
          },
        ],
        functions: roles['stkAave']['onlyEmissionManager'],
      },
      {
        modifier: 'onlySlashingAdmin',
        addresses: [
          {
            address: slashAdmin,
            owners: slashAdminInfo.owners,
            signersThreshold: slashAdminInfo.threshold,
          },
        ],
        functions: roles['stkAave']['onlySlashingAdmin'],
      },
      {
        modifier: 'onlyCooldownAdmin',
        addresses: [
          {
            address: cooldDownAdmin,
            owners: cooldownAdminInfo.owners,
            signersThreshold: cooldownAdminInfo.threshold,
          },
        ],
        functions: roles['stkAave']['onlyCooldownAdmin'],
      },
      {
        modifier: 'onlyClaimHelper',
        addresses: [
          {
            address: claimHelperAdmin,
            owners: claimHelperAdminInfo.owners,
            signersThreshold: claimHelperAdminInfo.threshold,
          },
        ],
        functions: roles['stkAave']['onlyClaimHelper'],
      },
    ],
  };

  // stk ABPT token
  const stkABPTContract = getContract({ address: getAddress(addressBook.STK_ABPT), abi: stkToken, client: provider });

  const stkABPTEmissionManager = await stkABPTContract.read.EMISSION_MANAGER() as Address;
  const abptAddress = await stkABPTContract.read.STAKED_TOKEN() as Address;
  const stkABPTslashAdmin = await stkABPTContract.read.getAdmin([SLASH_ADMIN_ROLE]) as Address;
  const stkABPTcooldDownAdmin = await stkABPTContract.read.getAdmin([COOLDOWN_ADMIN_ROLE]) as Address;
  const stkABPTclaimHelperAdmin = await stkABPTContract.read.getAdmin([CLAIM_HELPER_ROLE]) as Address;

  const stkABPTEmissionManagerInfo = await ownerResolver.resolve(stkABPTEmissionManager);
  const stkABPTslashAdminInfo = await ownerResolver.resolve(stkABPTslashAdmin);
  const stkABPTcooldownAdminInfo = await ownerResolver.resolve(stkABPTcooldDownAdmin);
  const stkABPTclaimHelperAdminInfo = await ownerResolver.resolve(stkABPTclaimHelperAdmin);

  obj['stkABPT'] = {
    address: addressBook.STK_ABPT,
    modifiers: [
      {
        modifier: 'onlyEmissionManager',
        addresses: [
          {
            address: stkABPTEmissionManager,
            owners: stkABPTEmissionManagerInfo.owners,
            signersThreshold: stkABPTEmissionManagerInfo.threshold,
          },
        ],
        functions: roles['stkABPT']['onlyEmissionManager'],
      },
      {
        modifier: 'onlySlashingAdmin',
        addresses: [
          {
            address: stkABPTslashAdmin,
            owners: stkABPTslashAdminInfo.owners,
            signersThreshold: stkABPTslashAdminInfo.threshold,
          },
        ],
        functions: roles['stkAave']['onlySlashingAdmin'],
      },
      {
        modifier: 'onlyCooldownAdmin',
        addresses: [
          {
            address: stkABPTcooldDownAdmin,
            owners: stkABPTcooldownAdminInfo.owners,
            signersThreshold: stkABPTcooldownAdminInfo.threshold,
          },
        ],
        functions: roles['stkAave']['onlyCooldownAdmin'],
      },
      {
        modifier: 'onlyClaimHelper',
        addresses: [
          {
            address: stkABPTclaimHelperAdmin,
            owners: stkABPTclaimHelperAdminInfo.owners,
            signersThreshold: stkABPTclaimHelperAdminInfo.threshold,
          },
        ],
        functions: roles['stkAave']['onlyClaimHelper'],
      },
    ],
  };

  const abptContract = getContract({ address: abptAddress, abi: abptABI, client: provider });
  const bPool = await abptContract.read.bPool() as Address;
  const abptController = await abptContract.read.getController() as Address;
  const abptControllerInfo = await ownerResolver.resolve(abptController);

  obj['ABPT'] = {
    address: abptAddress,
    modifiers: [
      {
        modifier: 'onlyOwner',
        addresses: [
          {
            address: abptController,
            owners: abptControllerInfo.owners,
            signersThreshold: abptControllerInfo.threshold,
          },
        ],
        functions: roles['ABPT']['onlyOwner'],
      },
    ],
  };

  const bptContract = getContract({ address: bPool, abi: bptABI, client: provider });
  const bptController = await bptContract.read.getController() as Address;
  const bptControllerInfo = await ownerResolver.resolve(bptController);

  obj['BPT'] = {
    address: bPool,
    modifiers: [
      {
        modifier: 'onlyController',
        addresses: [
          {
            address: bptController,
            owners: bptControllerInfo.owners,
            signersThreshold: bptControllerInfo.threshold,
          },
        ],
        functions: roles['BPT']['onlyController'],
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
