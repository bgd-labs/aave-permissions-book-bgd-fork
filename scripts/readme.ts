export const getPrincipalReadme = (directory: string): string => {
  let readme = `
![Aave Permissions Book](./permissions_banner.jpg)
# Aave Permissions Book

Tool to index and visualize all permissions across the Aave smart contracts ecosystem.

## Table of Contents
- [Description](#description)
- [Permissions](#permissions)
- [Usage](#usage)
- [License](#license)

## Description

The Aave Protocol smart contracts use a system of roles, modifiers, and access control to gate who can execute which functions. These permissions are held by various addresses: other smart contracts, multi-sigs, governance, stewards, or EOAs.

This repository indexes on-chain events to produce a comprehensive directory of tables showing:
- Which permissions are needed to execute each function of every Aave contract.
- Who holds those permissions (and the full ownership chain behind them).
- Whether each contract is upgradeable, and who controls the upgrade.

## Permissions

A [permissions document](./out) has been generated for every pool on every network where the Aave Protocol is deployed. Each document contains the following tables:

- **Contracts Upgradeability**: Indicates whether each smart contract uses an upgradeable proxy and, if so, who can perform the upgrade.
- **Actions Type**: An aggregated view of the actions that can affect the Aave protocol, classified by who can execute them (governance, multisig, steward, or EOA).
- **Contracts**: Detailed per-contract information:
  - **contract**: Name of the contract.
  - **proxyAdmin**: The proxy admin address (if the contract follows the Proxy Pattern), which has permission to upgrade the implementation.
  - **modifier**: The access control gate that restricts who can call a function. There is an entry for every modifier on the contract.
  - **permission owner**: The address that holds permission to pass through the modifier, along with its ownership chain.
  - **functions**: The functions gated by that modifier.
- **Guardians**: Multi-sig addresses with permissions to call certain emergency or operational methods, acting under a mandate from Aave Governance.
- **Roles**: The different roles defined by each protocol component (e.g., POOL_ADMIN, EMERGENCY_ADMIN) and which addresses hold each role.

### Permissions Directory
${directory}

## Usage

For setup instructions, CLI options, how to add new networks and pools, and how to use Tenderly forks, see the [Usage Guide](./USAGE.md).

## License
This repository is under [MIT License](./LICENSE)
`;
  return readme;
};
