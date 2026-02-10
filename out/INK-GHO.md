# INK 
## GHO 
### Contracts upgradeability
| contract |upgradeable by |
|----------|----------|
|  [GHO](https://explorer.inkonchain.com//address/0xfc421aD3C883Bf9E7C4f42dE845C4e4405799e73) |  Governance | |--------|--------|
|  [GHO ProxyAdmin](https://explorer.inkonchain.com//address/0x06ba20fb633cbf38b7acfdc243829fb5f897e19c) |  not upgradeable | |--------|--------|

### Actions type
| type |can be executed by |
|----------|----------|
|  adiConfigurations |  Governance | |--------|--------|
|  retryAndInvalidateMessages |  Multi-sig,Governance | |--------|--------|

### Contracts
| contract |proxyAdmin |modifier |permission owner |functions |
|----------|----------|----------|----------|----------|
|  [GHO](https://explorer.inkonchain.com//address/0xfc421aD3C883Bf9E7C4f42dE845C4e4405799e73) |  [GHO ProxyAdmin](https://explorer.inkonchain.com//address/0x06BA20FB633cbF38b7acFdC243829Fb5f897e19c) |  onlyFacilitator |  [Gho Direct Minter](https://explorer.inkonchain.com//address/0xDe6539018B095353A40753Dc54C91C68c9487D4E) |  mint, burn | |--------|--------|--------|--------|--------|
|  [GHO](https://explorer.inkonchain.com//address/0xfc421aD3C883Bf9E7C4f42dE845C4e4405799e73) |  [GHO ProxyAdmin](https://explorer.inkonchain.com//address/0x06BA20FB633cbF38b7acFdC243829Fb5f897e19c) |  onlyFacilitatorManager |  [Executor_lvl1](https://explorer.inkonchain.com//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A) |  addFacilitator, removeFacilitator | |--------|--------|--------|--------|--------|
|  [GHO](https://explorer.inkonchain.com//address/0xfc421aD3C883Bf9E7C4f42dE845C4e4405799e73) |  [GHO ProxyAdmin](https://explorer.inkonchain.com//address/0x06BA20FB633cbF38b7acFdC243829Fb5f897e19c) |  onlyBucketManager |  [Executor_lvl1](https://explorer.inkonchain.com//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A), [Gho Bucket Steward](https://explorer.inkonchain.com//address/0xA5Ba213867E175A182a5dd6A9193C6158738105A) |  setFacilitatorBucketCapacity | |--------|--------|--------|--------|--------|
|  [GHO ProxyAdmin](https://explorer.inkonchain.com//address/0x06ba20fb633cbf38b7acfdc243829fb5f897e19c) |  - |  onlyOwner |  [Executor_lvl1](https://explorer.inkonchain.com//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A) |  changeProxyAdmin, upgrade, upgradeAndCall | |--------|--------|--------|--------|--------|

### Admins
| Role |Contract |
|----------|----------|
|  DEFAULT_ADMIN |  [Executor_lvl1](https://explorer.inkonchain.com//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A) | |--------|--------|
|  FACILITATOR_MANAGER_ROLE |  [Executor_lvl1](https://explorer.inkonchain.com//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A) | |--------|--------|
|  BUCKET_MANAGER_ROLE |  [Executor_lvl1](https://explorer.inkonchain.com//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A), [Gho Bucket Steward](https://explorer.inkonchain.com//address/0xA5Ba213867E175A182a5dd6A9193C6158738105A) | |--------|--------|

