# MEGAETH 
## V3 
### Contracts upgradeability
| contract |upgradeable by |
|----------|----------|
|  Aave a/v/s tokens |  Governance | |--------|--------|
|  [GranularGuardian](https://megaeth.blockscout.com//address/0x8Fa22D09b13486A40cd6b04398b948AA8bD5853A) |  not upgradeable | |--------|--------|
|  [PayloadsController](https://megaeth.blockscout.com//address/0x80e11cB895a23C901a990239E5534054C66476B5) |  Governance | |--------|--------|
|  [PayloadsControllerProxyAdmin](https://megaeth.blockscout.com//address/0xcd9d8e4b607c492a2363bc44b02794ada6533c57) |  not upgradeable | |--------|--------|
|  [Executor_lvl1](https://megaeth.blockscout.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19) |  not upgradeable | |--------|--------|
|  [MegaEth native adapter](https://megaeth.blockscout.com//address/0x9Ec11a4c2fEc289Db81D75eF31140c358CB93CC6) |  not upgradeable | |--------|--------|
|  [CrossChainController](https://megaeth.blockscout.com//address/0x5EE63ACb37AeCDc7e23ACA283098f8ffD9677BBe) |  Governance | |--------|--------|
|  [CrossChainControllerProxyAdmin](https://megaeth.blockscout.com//address/0x736af22508a0e5aa20829a1f9f30b163e516182f) |  not upgradeable | |--------|--------|

### Actions type
| type |can be executed by |
|----------|----------|
|  adiConfigurations |  Governance | |--------|--------|
|  retryAndInvalidateMessages |  Multi-sig,Governance | |--------|--------|

### Governance V3 Contracts 
| contract |proxyAdmin |modifier |permission owner |functions |
|----------|----------|----------|----------|----------|
|  [GranularGuardian](https://megaeth.blockscout.com//address/0x8Fa22D09b13486A40cd6b04398b948AA8bD5853A) |  - |  onlyRetryGuardian |  [BGD](https://megaeth.blockscout.com//address/0x58528Cd7B8E84520df4D3395249D24543f431c21) |  retryEnvelope, retryTransaction | |--------|--------|--------|--------|--------|
|  [GranularGuardian](https://megaeth.blockscout.com//address/0x8Fa22D09b13486A40cd6b04398b948AA8bD5853A) |  - |  onlyEmergencyGuardian |  [Aave Governance Guardian MegaETH](https://megaeth.blockscout.com//address/0x5a578ee1dA2c798Be60036AdDD223Ac164d948Af) |  solveEmergency | |--------|--------|--------|--------|--------|
|  [GranularGuardian](https://megaeth.blockscout.com//address/0x8Fa22D09b13486A40cd6b04398b948AA8bD5853A) |  - |  onlyDefaultAdmin |  [Executor_lvl1](https://megaeth.blockscout.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19) |  updateGuardian | |--------|--------|--------|--------|--------|
|  [PayloadsController](https://megaeth.blockscout.com//address/0x80e11cB895a23C901a990239E5534054C66476B5) |  [PayloadsControllerProxyAdmin](https://megaeth.blockscout.com//address/0xCd9d8E4b607C492a2363bc44B02794ADa6533C57) |  onlyOwner |  [Executor_lvl1](https://megaeth.blockscout.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19) |  updateExecutors | |--------|--------|--------|--------|--------|
|  [PayloadsController](https://megaeth.blockscout.com//address/0x80e11cB895a23C901a990239E5534054C66476B5) |  [PayloadsControllerProxyAdmin](https://megaeth.blockscout.com//address/0xCd9d8E4b607C492a2363bc44B02794ADa6533C57) |  onlyGuardian |  [Aave Governance Guardian MegaETH](https://megaeth.blockscout.com//address/0x5a578ee1dA2c798Be60036AdDD223Ac164d948Af) |  cancelPayload | |--------|--------|--------|--------|--------|
|  [PayloadsController](https://megaeth.blockscout.com//address/0x80e11cB895a23C901a990239E5534054C66476B5) |  [PayloadsControllerProxyAdmin](https://megaeth.blockscout.com//address/0xCd9d8E4b607C492a2363bc44B02794ADa6533C57) |  onlyOwnerOrGuardian |  [Aave Governance Guardian MegaETH](https://megaeth.blockscout.com//address/0x5a578ee1dA2c798Be60036AdDD223Ac164d948Af), [Executor_lvl1](https://megaeth.blockscout.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19) |  updateGuardian | |--------|--------|--------|--------|--------|
|  [PayloadsController](https://megaeth.blockscout.com//address/0x80e11cB895a23C901a990239E5534054C66476B5) |  [PayloadsControllerProxyAdmin](https://megaeth.blockscout.com//address/0xCd9d8E4b607C492a2363bc44B02794ADa6533C57) |  onlyRescueGuardian |  [Executor_lvl1](https://megaeth.blockscout.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19) |  emergencyTokenTransfer, emergencyEtherTransfer | |--------|--------|--------|--------|--------|
|  [PayloadsControllerProxyAdmin](https://megaeth.blockscout.com//address/0xcd9d8e4b607c492a2363bc44b02794ada6533c57) |  - |  onlyOwner |  [Executor_lvl1](https://megaeth.blockscout.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19) |  changeProxyAdmin, upgrade, upgradeAndCall | |--------|--------|--------|--------|--------|
|  [Executor_lvl1](https://megaeth.blockscout.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19) |  - |  onlyOwner |  [PayloadsController](https://megaeth.blockscout.com//address/0x80e11cB895a23C901a990239E5534054C66476B5) |  executeTransaction | |--------|--------|--------|--------|--------|
|  [MegaEth native adapter](https://megaeth.blockscout.com//address/0x9Ec11a4c2fEc289Db81D75eF31140c358CB93CC6) |  - |  trustedRemote |  [CrossChainController(Eth)](https://megaeth.blockscout.com//address/0xEd42a7D8559a463722Ca4beD50E0Cc05a386b0e1) |  receiveMessage | |--------|--------|--------|--------|--------|
|  [CrossChainController](https://megaeth.blockscout.com//address/0x5EE63ACb37AeCDc7e23ACA283098f8ffD9677BBe) |  [CrossChainControllerProxyAdmin](https://megaeth.blockscout.com//address/0x736AF22508A0E5aa20829A1f9F30B163e516182f) |  onlyOwner |  [Executor_lvl1](https://megaeth.blockscout.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19) |  approveSenders, removeSenders, enableBridgeAdapters, disableBridgeAdapters, updateMessagesValidityTimestamp, allowReceiverBridgeAdapters, disallowReceiverBridgeAdapters | |--------|--------|--------|--------|--------|
|  [CrossChainController](https://megaeth.blockscout.com//address/0x5EE63ACb37AeCDc7e23ACA283098f8ffD9677BBe) |  [CrossChainControllerProxyAdmin](https://megaeth.blockscout.com//address/0x736AF22508A0E5aa20829A1f9F30B163e516182f) |  onlyOwnerOrGuardian |  [Aave Granular Guardian MegaETH](https://megaeth.blockscout.com//address/0x8Fa22D09b13486A40cd6b04398b948AA8bD5853A), [Executor_lvl1](https://megaeth.blockscout.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19) |  retryEnvelope, retryTransaction, updateGuardian | |--------|--------|--------|--------|--------|
|  [CrossChainController](https://megaeth.blockscout.com//address/0x5EE63ACb37AeCDc7e23ACA283098f8ffD9677BBe) |  [CrossChainControllerProxyAdmin](https://megaeth.blockscout.com//address/0x736AF22508A0E5aa20829A1f9F30B163e516182f) |  onlyRescueGuardian |  [Executor_lvl1](https://megaeth.blockscout.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19) |  emergencyTokenTransfer, emergencyEtherTransfer | |--------|--------|--------|--------|--------|
|  [CrossChainController](https://megaeth.blockscout.com//address/0x5EE63ACb37AeCDc7e23ACA283098f8ffD9677BBe) |  [CrossChainControllerProxyAdmin](https://megaeth.blockscout.com//address/0x736AF22508A0E5aa20829A1f9F30B163e516182f) |  onlyApprovedSenders |   |  forwardMessage | |--------|--------|--------|--------|--------|
|  [CrossChainController](https://megaeth.blockscout.com//address/0x5EE63ACb37AeCDc7e23ACA283098f8ffD9677BBe) |  [CrossChainControllerProxyAdmin](https://megaeth.blockscout.com//address/0x736AF22508A0E5aa20829A1f9F30B163e516182f) |  onlyApprovedBridges |  [MegaEth native adapter](https://megaeth.blockscout.com//address/0x9Ec11a4c2fEc289Db81D75eF31140c358CB93CC6) |  receiveCrossChainMessage | |--------|--------|--------|--------|--------|
|  [CrossChainControllerProxyAdmin](https://megaeth.blockscout.com//address/0x736af22508a0e5aa20829a1f9f30b163e516182f) |  - |  onlyOwner |  [Executor_lvl1](https://megaeth.blockscout.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19) |  changeProxyAdmin, upgrade, upgradeAndCall | |--------|--------|--------|--------|--------|

### Guardians 
| Guardian |Threshold |Address |Owners |
|----------|----------|----------|----------|
|  [BGD](https://megaeth.blockscout.com//address/0x58528Cd7B8E84520df4D3395249D24543f431c21) |  2/3 |  0x58528Cd7B8E84520df4D3395249D24543f431c21 |  [0x0650302887619fa7727D8BD480Cda11A638B219B](https://megaeth.blockscout.com//address/0x0650302887619fa7727D8BD480Cda11A638B219B), [0xf71fc92e2949ccF6A5Fd369a0b402ba80Bc61E02](https://megaeth.blockscout.com//address/0xf71fc92e2949ccF6A5Fd369a0b402ba80Bc61E02), [0x5811d9FF80ff4B73A8F9bA42A6082FaB82E89Ea7](https://megaeth.blockscout.com//address/0x5811d9FF80ff4B73A8F9bA42A6082FaB82E89Ea7) | |--------|--------|--------|--------|
|  [Aave Governance Guardian MegaETH](https://megaeth.blockscout.com//address/0x5a578ee1dA2c798Be60036AdDD223Ac164d948Af) |  5/9 |  0x5a578ee1dA2c798Be60036AdDD223Ac164d948Af |  [0xDA5Ae43e179987a66B9831F92223567e1F38BE7D](https://megaeth.blockscout.com//address/0xDA5Ae43e179987a66B9831F92223567e1F38BE7D), [0x1e3804357eD445251FfECbb6e40107bf03888885](https://megaeth.blockscout.com//address/0x1e3804357eD445251FfECbb6e40107bf03888885), [0x4f96743057482a2E10253AFDacDA3fd9CF2C1DC9](https://megaeth.blockscout.com//address/0x4f96743057482a2E10253AFDacDA3fd9CF2C1DC9), [0xebED04E9137AfeBFF6a1B97aC0adf61a544eFE29](https://megaeth.blockscout.com//address/0xebED04E9137AfeBFF6a1B97aC0adf61a544eFE29), [0xbd4DCfA978c6D0d342cE36809AfFFa49d4B7f1F7](https://megaeth.blockscout.com//address/0xbd4DCfA978c6D0d342cE36809AfFFa49d4B7f1F7), [0xA3103D0ED00d24795Faa2d641ACf6A320EeD7396](https://megaeth.blockscout.com//address/0xA3103D0ED00d24795Faa2d641ACf6A320EeD7396), [0x936CD9654271083cCF93A975919Da0aB3Bc99EF3](https://megaeth.blockscout.com//address/0x936CD9654271083cCF93A975919Da0aB3Bc99EF3), [0x0D2394C027602Dc4c3832Ffd849b5df45DBac0E9](https://megaeth.blockscout.com//address/0x0D2394C027602Dc4c3832Ffd849b5df45DBac0E9), [0x4C30E33758216aD0d676419c21CB8D014C68099f](https://megaeth.blockscout.com//address/0x4C30E33758216aD0d676419c21CB8D014C68099f) | |--------|--------|--------|--------|

### Granular Guardian Admins 
| Role |Contract |
|----------|----------|
|  DEFAULT_ADMIN |  [Executor_lvl1](https://megaeth.blockscout.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19) | |--------|--------|
|  SOLVE_EMERGENCY_ROLE |  [Aave Governance Guardian MegaETH](https://megaeth.blockscout.com//address/0x5a578ee1dA2c798Be60036AdDD223Ac164d948Af) | |--------|--------|
|  RETRY_ROLE |  [BGD](https://megaeth.blockscout.com//address/0x58528Cd7B8E84520df4D3395249D24543f431c21) | |--------|--------|

