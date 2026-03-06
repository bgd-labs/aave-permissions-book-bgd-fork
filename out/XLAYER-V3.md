# XLAYER 
## V3 
### Contracts upgradeability
| contract |upgradeable by |
|----------|----------|
|  [PoolAddressesProvider](https://xlayerscan.com//address/0xdFf435BCcf782f11187D3a4454d96702eD78e092) |  not upgradeable | |--------|--------|
|  [Pool](https://xlayerscan.com//address/0xE3F3Caefdd7180F884c01E57f65Df979Af84f116) |  Governance | |--------|--------|
|  [PoolConfigurator](https://xlayerscan.com//address/0x1408b48B6A610948f04813EA6b2F438A6BBAd2f2) |  Governance | |--------|--------|
|  [AaveOracle](https://xlayerscan.com//address/0x91FC11136d5615575a0fC5981Ab5C0C54418E2C6) |  not upgradeable | |--------|--------|
|  [RewardsController](https://xlayerscan.com//address/0x5404934c8F472818135176C80095283d78EB32D6) |  Governance | |--------|--------|
|  [WrappedTokenGatewayV3](https://xlayerscan.com//address/0xd449FeD49d9C443688d6816fE6872F21402e41de) |  not upgradeable | |--------|--------|
|  [EmissionManager](https://xlayerscan.com//address/0x8b78174D19d40Ce5dC1d12309F95088756c5BEc4) |  not upgradeable | |--------|--------|
|  [PoolAddressesProviderRegistry](https://xlayerscan.com//address/0x0f2b21fd713379bb406bE2eA956EaFe55197DE9C) |  not upgradeable | |--------|--------|
|  [ACLManager](https://xlayerscan.com//address/0xc8f2720Fa7D857576d82e6aEca8EdC4869E9190e) |  not upgradeable | |--------|--------|
|  [Manual AGRS](https://xlayerscan.com//address/0xb5970A521073ADE4836dD4A24854Eb387a67c5C8) |  not upgradeable | |--------|--------|
|  [Collector](https://xlayerscan.com//address/0x3E9CfB4FDe8180C48b823C12DD2c4B841843f92E) |  Governance | |--------|--------|
|  [CollectorProxyAdmin](https://xlayerscan.com//address/0xfd762bb3401e9a904c0ce722e1672d3858585233) |  not upgradeable | |--------|--------|
|  Aave a/v/s tokens |  Governance | |--------|--------|
|  [GranularGuardian](https://xlayerscan.com//address/0xD6727ec503A8d0C10a0EAA4e76eAf9A628188b25) |  not upgradeable | |--------|--------|
|  [PayloadsController](https://xlayerscan.com//address/0x80e11cB895a23C901a990239E5534054C66476B5) |  Not owned | |--------|--------|
|  [Executor_lvl1](https://xlayerscan.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19) |  not upgradeable | |--------|--------|
|  [XLayer native adapter](https://xlayerscan.com//address/0xEbc2c80073E4752e9A1D2e9A9bC98e8F4EeE9Be9) |  not upgradeable | |--------|--------|
|  [CrossChainController](https://xlayerscan.com//address/0xFdd46155fD3DA5B907AD3B9f9395366290f58097) |  Not owned | |--------|--------|

### Actions type
| type |can be executed by |
|----------|----------|
|  updateReserveBorrowSettings |  Governance | |--------|--------|
|  configureProtocolFees |  Governance | |--------|--------|
|  updateReserveCaps |  Governance | |--------|--------|
|  updateReserveSettings |  Governance | |--------|--------|
|  configureCollateral |  Governance | |--------|--------|
|  upgradeAaveTokens (a/v/s) |  Governance | |--------|--------|
|  upgradeAaveOracles |  Governance | |--------|--------|
|  reserveUpgradeability |  Governance | |--------|--------|
|  pausePool |  Governance,Multi-sig | |--------|--------|
|  pauseAndFreezeReserve |  Governance,Multi-sig | |--------|--------|
|  reserveListing |  Governance | |--------|--------|
|  adminsConfiguration |  Governance | |--------|--------|
|  protocolUpgradeablity |  Governance | |--------|--------|
|  adiConfigurations |  Governance | |--------|--------|
|  retryAndInvalidateMessages |  Multi-sig,Governance | |--------|--------|
|  updateRiskParameters |  Steward | |--------|--------|

### Contracts
| contract |proxyAdmin |modifier |permission owner |functions |
|----------|----------|----------|----------|----------|
|  [PoolAddressesProvider](https://xlayerscan.com//address/0xdFf435BCcf782f11187D3a4454d96702eD78e092) |  - |  onlyOwner |  [Executor_lvl1](https://xlayerscan.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19) |  setMarketId, setAddress, setAddressAsProxy, setPoolImpl, setPoolConfiguratorImpl, setPriceOracle, setACLManager, setACLAdmin, setPriceOracleSentinel, setPoolDataProvider | |--------|--------|--------|--------|--------|
|  [Pool](https://xlayerscan.com//address/0xE3F3Caefdd7180F884c01E57f65Df979Af84f116) |  [PoolAddressesProvider](https://xlayerscan.com//address/0xdFf435BCcf782f11187D3a4454d96702eD78e092) |  onlyPoolConfigurator |  [PoolConfigurator](https://xlayerscan.com//address/0x1408b48B6A610948f04813EA6b2F438A6BBAd2f2) |  initReserve, dropReserve, setReserveInterestRateStrategyAddress, setConfiguration, updateBridgeProtocolFee, updateFlashloanPremiums, configureEModeCategory, resetIsolationModeTotalDebt | |--------|--------|--------|--------|--------|
|  [Pool](https://xlayerscan.com//address/0xE3F3Caefdd7180F884c01E57f65Df979Af84f116) |  [PoolAddressesProvider](https://xlayerscan.com//address/0xdFf435BCcf782f11187D3a4454d96702eD78e092) |  onlyPoolAdmin |  [Executor_lvl1](https://xlayerscan.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19) |  rescueTokens | |--------|--------|--------|--------|--------|
|  [PoolConfigurator](https://xlayerscan.com//address/0x1408b48B6A610948f04813EA6b2F438A6BBAd2f2) |  [PoolAddressesProvider](https://xlayerscan.com//address/0xdFf435BCcf782f11187D3a4454d96702eD78e092) |  onlyPoolAdmin |  [Executor_lvl1](https://xlayerscan.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19) |  dropReserve, dropReserve, updateAToken, updateStableDebtToken, updateVariableDebtToken, setReserveActive, updateBridgeProtocolFee, updateFlashloanPremiumTotal, updateFlashloanPremiumToProtocol | |--------|--------|--------|--------|--------|
|  [PoolConfigurator](https://xlayerscan.com//address/0x1408b48B6A610948f04813EA6b2F438A6BBAd2f2) |  [PoolAddressesProvider](https://xlayerscan.com//address/0xdFf435BCcf782f11187D3a4454d96702eD78e092) |  onlyAssetListingOrPoolAdmins |  [Executor_lvl1](https://xlayerscan.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19) |  initReserves | |--------|--------|--------|--------|--------|
|  [PoolConfigurator](https://xlayerscan.com//address/0x1408b48B6A610948f04813EA6b2F438A6BBAd2f2) |  [PoolAddressesProvider](https://xlayerscan.com//address/0xdFf435BCcf782f11187D3a4454d96702eD78e092) |  onlyRiskOrPoolAdmins |  [Executor_lvl1](https://xlayerscan.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19) |  setReserveBorrowing, setReserveBorrowing, configureReserveAsCollateral, setReserveStableRateBorrowing, setBorrowableInIsolation, setReserveFactor, setDebtCeiling, setSiloedBorrowing, setBorrowCap, setSupplyCap, setLiquidationProtocolFee, setEModeCategory, setAssetEModeCategory, setUnbackedMintCap, setReserveInterestRateStrategyAddress, setReserveFlashLoaning | |--------|--------|--------|--------|--------|
|  [PoolConfigurator](https://xlayerscan.com//address/0x1408b48B6A610948f04813EA6b2F438A6BBAd2f2) |  [PoolAddressesProvider](https://xlayerscan.com//address/0xdFf435BCcf782f11187D3a4454d96702eD78e092) |  onlyRiskOrPoolOrEmergencyAdmins |  [Executor_lvl1](https://xlayerscan.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19), [Aave Protocol Guardian XLayer](https://xlayerscan.com//address/0xD0D1CcB0391aADF1EaD96814ce7ab4008Ebdb336) |  setReserveFreeze | |--------|--------|--------|--------|--------|
|  [PoolConfigurator](https://xlayerscan.com//address/0x1408b48B6A610948f04813EA6b2F438A6BBAd2f2) |  [PoolAddressesProvider](https://xlayerscan.com//address/0xdFf435BCcf782f11187D3a4454d96702eD78e092) |  onlyEmergencyOrPoolAdmin |  [Executor_lvl1](https://xlayerscan.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19), [Aave Protocol Guardian XLayer](https://xlayerscan.com//address/0xD0D1CcB0391aADF1EaD96814ce7ab4008Ebdb336) |  setPoolPause, setReservePause | |--------|--------|--------|--------|--------|
|  [AaveOracle](https://xlayerscan.com//address/0x91FC11136d5615575a0fC5981Ab5C0C54418E2C6) |  - |  onlyAssetListingOrPoolAdmins |  [Executor_lvl1](https://xlayerscan.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19) |  setAssetSources, setFallbackOracle | |--------|--------|--------|--------|--------|
|  [RewardsController](https://xlayerscan.com//address/0x5404934c8F472818135176C80095283d78EB32D6) |  [PoolAddressesProvider](https://xlayerscan.com//address/0xdFf435BCcf782f11187D3a4454d96702eD78e092) |  onlyEmissionManager |  [EmissionManager](https://xlayerscan.com//address/0x8b78174D19d40Ce5dC1d12309F95088756c5BEc4) |  configureAssets, setTransferStrategy, setRewardOracle, setClaimer | |--------|--------|--------|--------|--------|
|  [WrappedTokenGatewayV3](https://xlayerscan.com//address/0xd449FeD49d9C443688d6816fE6872F21402e41de) |  - |  onlyOwner |  [Executor_lvl1](https://xlayerscan.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19) |  emergencyTokenTransfer, emergencyEtherTransfer | |--------|--------|--------|--------|--------|
|  [EmissionManager](https://xlayerscan.com//address/0x8b78174D19d40Ce5dC1d12309F95088756c5BEc4) |  - |  onlyOwner |  [Executor_lvl1](https://xlayerscan.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19) |  setClaimer, setEmissionAdmin, setRewardsController | |--------|--------|--------|--------|--------|
|  [PoolAddressesProviderRegistry](https://xlayerscan.com//address/0x0f2b21fd713379bb406bE2eA956EaFe55197DE9C) |  - |  onlyOwner |  [Executor_lvl1](https://xlayerscan.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19) |  registerAddressesProvider, unregisterAddressesProvider | |--------|--------|--------|--------|--------|
|  [ACLManager](https://xlayerscan.com//address/0xc8f2720Fa7D857576d82e6aEca8EdC4869E9190e) |  - |  onlyRole |  [Executor_lvl1](https://xlayerscan.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19) |  setRoleAdmin | |--------|--------|--------|--------|--------|
|  [Manual AGRS](https://xlayerscan.com//address/0xb5970A521073ADE4836dD4A24854Eb387a67c5C8) |  - |  onlyOwner |  [Executor_lvl1](https://xlayerscan.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19) |  setRiskConfig, setAddressRestricted | |--------|--------|--------|--------|--------|
|  [Manual AGRS](https://xlayerscan.com//address/0xb5970A521073ADE4836dD4A24854Eb387a67c5C8) |  - |  onlyRiskCouncil |  [0xa43F8eDf0a0aE07e951bca11162625e77e7609A1 (Safe)](https://xlayerscan.com//address/0xa43F8eDf0a0aE07e951bca11162625e77e7609A1) |  updateCaps, updateRates, updateCollateralSide, updateLstPriceCaps, updateStablePriceCaps | |--------|--------|--------|--------|--------|
|  [Collector](https://xlayerscan.com//address/0x3E9CfB4FDe8180C48b823C12DD2c4B841843f92E) |  [CollectorProxyAdmin](https://xlayerscan.com//address/0xfD762BB3401e9A904c0ce722e1672d3858585233) |  onlyFundsAdmin |  [Executor_lvl1](https://xlayerscan.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19) |  approve, transfer, setFundsAdmin, createStream | |--------|--------|--------|--------|--------|
|  [Collector](https://xlayerscan.com//address/0x3E9CfB4FDe8180C48b823C12DD2c4B841843f92E) |  [CollectorProxyAdmin](https://xlayerscan.com//address/0xfD762BB3401e9A904c0ce722e1672d3858585233) |  onlyAdminOrRecipient |  [CollectorProxyAdmin](https://xlayerscan.com//address/0xfD762BB3401e9A904c0ce722e1672d3858585233), [Executor_lvl1](https://xlayerscan.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19) |  withdrawFromStream, cancelStream | |--------|--------|--------|--------|--------|
|  [CollectorProxyAdmin](https://xlayerscan.com//address/0xfd762bb3401e9a904c0ce722e1672d3858585233) |  - |  onlyOwner |  [Executor_lvl1](https://xlayerscan.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19) |  changeProxyAdmin, upgrade, upgradeAndCall | |--------|--------|--------|--------|--------|

### Governance V3 Contracts
| contract |proxyAdmin |modifier |permission owner |functions |
|----------|----------|----------|----------|----------|
|  [GranularGuardian](https://xlayerscan.com//address/0xD6727ec503A8d0C10a0EAA4e76eAf9A628188b25) |  - |  onlyRetryGuardian |  [BGD](https://xlayerscan.com//address/0x734c3fF8DE95c3745770df69053A31FDC92F2526) |  retryEnvelope, retryTransaction | |--------|--------|--------|--------|--------|
|  [GranularGuardian](https://xlayerscan.com//address/0xD6727ec503A8d0C10a0EAA4e76eAf9A628188b25) |  - |  onlyEmergencyGuardian |  [Aave Governance Guardian XLayer](https://xlayerscan.com//address/0xeB55A63bf9993d80c86D47f819B5eC958c7C127B) |  solveEmergency | |--------|--------|--------|--------|--------|
|  [GranularGuardian](https://xlayerscan.com//address/0xD6727ec503A8d0C10a0EAA4e76eAf9A628188b25) |  - |  onlyDefaultAdmin |  [Executor_lvl1](https://xlayerscan.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19) |  updateGuardian | |--------|--------|--------|--------|--------|
|  [PayloadsController](https://xlayerscan.com//address/0x80e11cB895a23C901a990239E5534054C66476B5) |  [0xCd9d8E4b607C492a2363bc44B02794ADa6533C57](https://xlayerscan.com//address/0xCd9d8E4b607C492a2363bc44B02794ADa6533C57) |  onlyOwner |  [Executor_lvl1](https://xlayerscan.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19) |  updateExecutors | |--------|--------|--------|--------|--------|
|  [PayloadsController](https://xlayerscan.com//address/0x80e11cB895a23C901a990239E5534054C66476B5) |  [0xCd9d8E4b607C492a2363bc44B02794ADa6533C57](https://xlayerscan.com//address/0xCd9d8E4b607C492a2363bc44B02794ADa6533C57) |  onlyGuardian |  [Aave Governance Guardian XLayer](https://xlayerscan.com//address/0xeB55A63bf9993d80c86D47f819B5eC958c7C127B) |  cancelPayload | |--------|--------|--------|--------|--------|
|  [PayloadsController](https://xlayerscan.com//address/0x80e11cB895a23C901a990239E5534054C66476B5) |  [0xCd9d8E4b607C492a2363bc44B02794ADa6533C57](https://xlayerscan.com//address/0xCd9d8E4b607C492a2363bc44B02794ADa6533C57) |  onlyOwnerOrGuardian |  [Aave Governance Guardian XLayer](https://xlayerscan.com//address/0xeB55A63bf9993d80c86D47f819B5eC958c7C127B), [Executor_lvl1](https://xlayerscan.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19) |  updateGuardian | |--------|--------|--------|--------|--------|
|  [PayloadsController](https://xlayerscan.com//address/0x80e11cB895a23C901a990239E5534054C66476B5) |  [0xCd9d8E4b607C492a2363bc44B02794ADa6533C57](https://xlayerscan.com//address/0xCd9d8E4b607C492a2363bc44B02794ADa6533C57) |  onlyRescueGuardian |  [Executor_lvl1](https://xlayerscan.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19) |  emergencyTokenTransfer, emergencyEtherTransfer | |--------|--------|--------|--------|--------|
|  [Executor_lvl1](https://xlayerscan.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19) |  - |  onlyOwner |  [PayloadsController](https://xlayerscan.com//address/0x80e11cB895a23C901a990239E5534054C66476B5) |  executeTransaction | |--------|--------|--------|--------|--------|
|  [XLayer native adapter](https://xlayerscan.com//address/0xEbc2c80073E4752e9A1D2e9A9bC98e8F4EeE9Be9) |  - |  trustedRemote |  [CrossChainController(Eth)](https://xlayerscan.com//address/0xEd42a7D8559a463722Ca4beD50E0Cc05a386b0e1) |  receiveMessage | |--------|--------|--------|--------|--------|
|  [CrossChainController](https://xlayerscan.com//address/0xFdd46155fD3DA5B907AD3B9f9395366290f58097) |  [0x74a75d024033bff99c196B4aE772dF1E28df5b96](https://xlayerscan.com//address/0x74a75d024033bff99c196B4aE772dF1E28df5b96) |  onlyOwner |  [Executor_lvl1](https://xlayerscan.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19) |  approveSenders, removeSenders, enableBridgeAdapters, disableBridgeAdapters, updateMessagesValidityTimestamp, allowReceiverBridgeAdapters, disallowReceiverBridgeAdapters | |--------|--------|--------|--------|--------|
|  [CrossChainController](https://xlayerscan.com//address/0xFdd46155fD3DA5B907AD3B9f9395366290f58097) |  [0x74a75d024033bff99c196B4aE772dF1E28df5b96](https://xlayerscan.com//address/0x74a75d024033bff99c196B4aE772dF1E28df5b96) |  onlyOwnerOrGuardian |  [GranularGuardian](https://xlayerscan.com//address/0xD6727ec503A8d0C10a0EAA4e76eAf9A628188b25), [Executor_lvl1](https://xlayerscan.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19) |  retryEnvelope, retryTransaction, updateGuardian | |--------|--------|--------|--------|--------|
|  [CrossChainController](https://xlayerscan.com//address/0xFdd46155fD3DA5B907AD3B9f9395366290f58097) |  [0x74a75d024033bff99c196B4aE772dF1E28df5b96](https://xlayerscan.com//address/0x74a75d024033bff99c196B4aE772dF1E28df5b96) |  onlyRescueGuardian |  [Executor_lvl1](https://xlayerscan.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19) |  emergencyTokenTransfer, emergencyEtherTransfer | |--------|--------|--------|--------|--------|
|  [CrossChainController](https://xlayerscan.com//address/0xFdd46155fD3DA5B907AD3B9f9395366290f58097) |  [0x74a75d024033bff99c196B4aE772dF1E28df5b96](https://xlayerscan.com//address/0x74a75d024033bff99c196B4aE772dF1E28df5b96) |  onlyApprovedSenders |   |  forwardMessage | |--------|--------|--------|--------|--------|
|  [CrossChainController](https://xlayerscan.com//address/0xFdd46155fD3DA5B907AD3B9f9395366290f58097) |  [0x74a75d024033bff99c196B4aE772dF1E28df5b96](https://xlayerscan.com//address/0x74a75d024033bff99c196B4aE772dF1E28df5b96) |  onlyApprovedBridges |  [XLayer native adapter](https://xlayerscan.com//address/0xEbc2c80073E4752e9A1D2e9A9bC98e8F4EeE9Be9) |  receiveCrossChainMessage | |--------|--------|--------|--------|--------|

### Guardians 
| Guardian |Threshold |Address |Owners |
|----------|----------|----------|----------|
|  [Aave Protocol Guardian XLayer](https://xlayerscan.com//address/0xD0D1CcB0391aADF1EaD96814ce7ab4008Ebdb336) |  5/9 |  0xD0D1CcB0391aADF1EaD96814ce7ab4008Ebdb336 |  [0x5d49dBcdd300aECc2C311cFB56593E71c445d60d](https://xlayerscan.com//address/0x5d49dBcdd300aECc2C311cFB56593E71c445d60d), [0xbA037E4746ff58c55dc8F27a328C428F258DDACb](https://xlayerscan.com//address/0xbA037E4746ff58c55dc8F27a328C428F258DDACb), [0x818C277dBE886b934e60aa047250A73529E26A99](https://xlayerscan.com//address/0x818C277dBE886b934e60aa047250A73529E26A99), [0x4f96743057482a2E10253AFDacDA3fd9CF2C1DC9](https://xlayerscan.com//address/0x4f96743057482a2E10253AFDacDA3fd9CF2C1DC9), [0xb647055A9915bF9c8021a684E175A353525b9890](https://xlayerscan.com//address/0xb647055A9915bF9c8021a684E175A353525b9890), [0x57ab7ee15cE5ECacB1aB84EE42D5A9d0d8112922](https://xlayerscan.com//address/0x57ab7ee15cE5ECacB1aB84EE42D5A9d0d8112922), [0xC5bE5c0134857B4b96F45AA6f6B77DB96Ac1487e](https://xlayerscan.com//address/0xC5bE5c0134857B4b96F45AA6f6B77DB96Ac1487e), [0xd4af2E86a27F8F77B0556E081F97B215C9cA8f2E](https://xlayerscan.com//address/0xd4af2E86a27F8F77B0556E081F97B215C9cA8f2E), [0xf71fc92e2949ccF6A5Fd369a0b402ba80Bc61E02](https://xlayerscan.com//address/0xf71fc92e2949ccF6A5Fd369a0b402ba80Bc61E02) | |--------|--------|--------|--------|
|  [0xa43F8eDf0a0aE07e951bca11162625e77e7609A1 (Safe)](https://xlayerscan.com//address/0xa43F8eDf0a0aE07e951bca11162625e77e7609A1) |  2/2 |  0xa43F8eDf0a0aE07e951bca11162625e77e7609A1 |  [0xc2cf0387f2a83A7F5C6675F4CDe7F367ea1B989a](https://xlayerscan.com//address/0xc2cf0387f2a83A7F5C6675F4CDe7F367ea1B989a), [0x5d49dBcdd300aECc2C311cFB56593E71c445d60d](https://xlayerscan.com//address/0x5d49dBcdd300aECc2C311cFB56593E71c445d60d) | |--------|--------|--------|--------|
|  [BGD](https://xlayerscan.com//address/0x734c3fF8DE95c3745770df69053A31FDC92F2526) |  2/3 |  0x734c3fF8DE95c3745770df69053A31FDC92F2526 |  [0xf71fc92e2949ccF6A5Fd369a0b402ba80Bc61E02](https://xlayerscan.com//address/0xf71fc92e2949ccF6A5Fd369a0b402ba80Bc61E02), [0x5811d9FF80ff4B73A8F9bA42A6082FaB82E89Ea7](https://xlayerscan.com//address/0x5811d9FF80ff4B73A8F9bA42A6082FaB82E89Ea7), [0x0650302887619fa7727D8BD480Cda11A638B219B](https://xlayerscan.com//address/0x0650302887619fa7727D8BD480Cda11A638B219B) | |--------|--------|--------|--------|
|  [Aave Governance Guardian XLayer](https://xlayerscan.com//address/0xeB55A63bf9993d80c86D47f819B5eC958c7C127B) |  5/9 |  0xeB55A63bf9993d80c86D47f819B5eC958c7C127B |  [0xDA5Ae43e179987a66B9831F92223567e1F38BE7D](https://xlayerscan.com//address/0xDA5Ae43e179987a66B9831F92223567e1F38BE7D), [0x1e3804357eD445251FfECbb6e40107bf03888885](https://xlayerscan.com//address/0x1e3804357eD445251FfECbb6e40107bf03888885), [0x4f96743057482a2E10253AFDacDA3fd9CF2C1DC9](https://xlayerscan.com//address/0x4f96743057482a2E10253AFDacDA3fd9CF2C1DC9), [0xebED04E9137AfeBFF6a1B97aC0adf61a544eFE29](https://xlayerscan.com//address/0xebED04E9137AfeBFF6a1B97aC0adf61a544eFE29), [0xbd4DCfA978c6D0d342cE36809AfFFa49d4B7f1F7](https://xlayerscan.com//address/0xbd4DCfA978c6D0d342cE36809AfFFa49d4B7f1F7), [0xA3103D0ED00d24795Faa2d641ACf6A320EeD7396](https://xlayerscan.com//address/0xA3103D0ED00d24795Faa2d641ACf6A320EeD7396), [0x936CD9654271083cCF93A975919Da0aB3Bc99EF3](https://xlayerscan.com//address/0x936CD9654271083cCF93A975919Da0aB3Bc99EF3), [0x0D2394C027602Dc4c3832Ffd849b5df45DBac0E9](https://xlayerscan.com//address/0x0D2394C027602Dc4c3832Ffd849b5df45DBac0E9), [0x4C30E33758216aD0d676419c21CB8D014C68099f](https://xlayerscan.com//address/0x4C30E33758216aD0d676419c21CB8D014C68099f) | |--------|--------|--------|--------|

### Admins
| Role |Contract |
|----------|----------|
|  DEFAULT_ADMIN |  [Executor_lvl1](https://xlayerscan.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19) | |--------|--------|
|  POOL_ADMIN |  [Executor_lvl1](https://xlayerscan.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19) | |--------|--------|
|  EMERGENCY_ADMIN |  [Aave Protocol Guardian XLayer](https://xlayerscan.com//address/0xD0D1CcB0391aADF1EaD96814ce7ab4008Ebdb336) | |--------|--------|
|  ASSET_LISTING_ADMIN |   | |--------|--------|
|  FLASH_BORROWER |   | |--------|--------|
|  RISK_ADMIN |   | |--------|--------|

### Granular Guardian Admins
| Role |Contract |
|----------|----------|
|  DEFAULT_ADMIN |  [Executor_lvl1](https://xlayerscan.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19) | |--------|--------|
|  SOLVE_EMERGENCY_ROLE |  [Aave Governance Guardian XLayer](https://xlayerscan.com//address/0xeB55A63bf9993d80c86D47f819B5eC958c7C127B) | |--------|--------|
|  RETRY_ROLE |  [BGD](https://xlayerscan.com//address/0x734c3fF8DE95c3745770df69053A31FDC92F2526) | |--------|--------|

### Collector Admins
| Role |Contract |
|----------|----------|
|  DEFAULT_ADMIN |  [Executor_lvl1](https://xlayerscan.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19) | |--------|--------|
|  FUNDS_ADMIN_ROLE |  [Executor_lvl1](https://xlayerscan.com//address/0xE2E8Badc5d50f8a6188577B89f50701cDE2D4e19) | |--------|--------|

