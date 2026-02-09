# PLASMA 
## GHO 
### Contracts upgradeability
| contract |upgradeable by |
|----------|----------|
|  [GHO](https://plasmascan.to//address/0xb77E872A68C62CfC0dFb02C067Ecc3DA23B4bbf3) |  Governance | |--------|--------|
|  [GHO ProxyAdmin](https://plasmascan.to//address/0x24c7badd8f85197ffb2c7e1e0c52e86010721f4c) |  not upgradeable | |--------|--------|

### Actions type
| type |can be executed by |
|----------|----------|
|  adiConfigurations |  Governance | |--------|--------|
|  retryAndInvalidateMessages |  Multi-sig,Governance | |--------|--------|

### Contracts
| contract |proxyAdmin |modifier |permission owner |functions |
|----------|----------|----------|----------|----------|
|  [GHO](https://plasmascan.to//address/0xb77E872A68C62CfC0dFb02C067Ecc3DA23B4bbf3) |  [GHO ProxyAdmin](https://plasmascan.to//address/0x24C7baDd8F85197ffB2c7E1E0C52E86010721f4c) |  onlyFacilitator |  [Gho Direct Minter](https://plasmascan.to//address/0x360d8aa8F6b09B7BC57aF34db2Eb84dD87bf4d12) |  mint, burn | |--------|--------|--------|--------|--------|
|  [GHO](https://plasmascan.to//address/0xb77E872A68C62CfC0dFb02C067Ecc3DA23B4bbf3) |  [GHO ProxyAdmin](https://plasmascan.to//address/0x24C7baDd8F85197ffB2c7E1E0C52E86010721f4c) |  onlyFacilitatorManager |  [Executor_lvl1](https://plasmascan.to//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A) |  addFacilitator, removeFacilitator | |--------|--------|--------|--------|--------|
|  [GHO](https://plasmascan.to//address/0xb77E872A68C62CfC0dFb02C067Ecc3DA23B4bbf3) |  [GHO ProxyAdmin](https://plasmascan.to//address/0x24C7baDd8F85197ffB2c7E1E0C52E86010721f4c) |  onlyBucketManager |  [Executor_lvl1](https://plasmascan.to//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A), [Gho Bucket Steward](https://plasmascan.to//address/0x2Ce400703dAcc37b7edFA99D228b8E70a4d3831B) |  setFacilitatorBucketCapacity | |--------|--------|--------|--------|--------|
|  [GHO ProxyAdmin](https://plasmascan.to//address/0x24c7badd8f85197ffb2c7e1e0c52e86010721f4c) |  - |  onlyOwner |  [Executor_lvl1](https://plasmascan.to//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A) |  changeProxyAdmin, upgrade, upgradeAndCall | |--------|--------|--------|--------|--------|

### Admins
| Role |Contract |
|----------|----------|
|  DEFAULT_ADMIN |  [Executor_lvl1](https://plasmascan.to//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A) | |--------|--------|
|  FACILITATOR_MANAGER_ROLE |  [Executor_lvl1](https://plasmascan.to//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A) | |--------|--------|
|  BUCKET_MANAGER_ROLE |  [Executor_lvl1](https://plasmascan.to//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A), [Gho Bucket Steward](https://plasmascan.to//address/0x2Ce400703dAcc37b7edFA99D228b8E70a4d3831B) | |--------|--------|

