import { keccak256, encodePacked, ParseEventLogsReturnType } from 'viem';
import { aclManagerAbi } from '../abis/aclManager.js';

// Properly typed log from the ACL Manager ABI
type RoleEventLog = ParseEventLogsReturnType<typeof aclManagerAbi>[number];

export const defaultRolesAdmin =
  '0x0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Initializes a map from role hash to role name.
 */
const initializeRoleCodeMap = (roleNames: string[], collector?: boolean): Map<string, string> => {
  const roleCodeMap = new Map<string, string>([
    [
      '0x0000000000000000000000000000000000000000000000000000000000000000',
      'DEFAULT_ADMIN',
    ],
  ]);

  for (const roleName of roleNames) {
    const code = keccak256(encodePacked(['string'], [roleName]));
    roleCodeMap.set(code, roleName);
  }

  if (collector) {
    roleCodeMap.set(
      '0x46554e44535f41444d494e000000000000000000000000000000000000000000',
      'FUNDS_ADMIN_ROLE',
    );
  }

  return roleCodeMap;
};

/**
 * Processes RoleGranted/RoleRevoked events to determine current role assignments.
 *
 * This is a pure function that takes event logs and returns the computed roles.
 * It does NOT make any RPC calls.
 *
 * @param oldRoles - Previously known role assignments (from saved JSON)
 * @param roleNames - List of role names to track
 * @param collector - Whether this is for the Collector contract (has special FUNDS_ADMIN_ROLE)
 * @param eventLogs - Array of RoleGranted/RoleRevoked event logs
 * @returns Updated role assignments
 */
export const getRoleAdmins = ({
  oldRoles,
  roleNames,
  collector,
  eventLogs,
}: {
  oldRoles: Record<string, string[]>;
  roleNames: string[];
  collector?: boolean;
  eventLogs: RoleEventLog[];
}): Record<string, string[]> => {
  const roleHexToNameMap = initializeRoleCodeMap(roleNames, collector);
  const roles: Record<string, string[]> = { ...oldRoles };

  for (const eventLog of eventLogs) {
    const { role, account } = eventLog.args;
    const roleName = roleHexToNameMap.get(role);

    if (eventLog.eventName === 'RoleGranted') {
      if (roleName && !roles[roleName]) {
        roles[roleName] = [];
      }

      if (roleName && roles[roleName]) {
        const accountFound = roles[roleName].find(
          (roleAddress) => roleAddress === account,
        );
        if (!accountFound) {
          roles[roleName].push(account);
        }
      }
    } else if (eventLog.eventName === 'RoleRevoked') {
      if (roleName && roles[roleName]) {
        roles[roleName] = roles[roleName].filter((addr) => addr !== account);
      }
    }
  }

  // Ensure all role names have at least an empty array
  for (const roleName of roleNames) {
    if (!roles[roleName]) {
      roles[roleName] = [];
    }
  }

  return roles;
};
