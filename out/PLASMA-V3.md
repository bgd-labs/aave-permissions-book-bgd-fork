# PLASMA 
## V3 
### Contracts upgradeability
| contract |upgradeable by |
|----------|----------|
|  [PoolAddressesProvider](https://plasmascan.to//address/0x061D8e131F26512348ee5FA42e2DF1bA9d6505E9) |  not upgradeable | |--------|--------|
|  [Pool](https://plasmascan.to//address/0x925a2A7214Ed92428B5b1B090F80b25700095e12) |  Governance | |--------|--------|
|  [PoolConfigurator](https://plasmascan.to//address/0xc022B6c71c30A8Ad52Dac504eFA132d13D99d2D9) |  Governance | |--------|--------|
|  [AaveOracle](https://plasmascan.to//address/0x33E0b3fc976DC9C516926BA48CfC0A9E10a2aAA5) |  not upgradeable | |--------|--------|
|  [RewardsController](https://plasmascan.to//address/0x3A57eAa3Ca3794D66977326af7991eB3F6dD5a5A) |  Governance | |--------|--------|
|  [WrappedTokenGatewayV3](https://plasmascan.to//address/0x54BDcc37c4143f944A3EE51C892a6cBDF305E7a0) |  not upgradeable | |--------|--------|
|  [EmissionManager](https://plasmascan.to//address/0x5117F170716eCEAC8ef63d375bc7416Afa6f4497) |  not upgradeable | |--------|--------|
|  [PoolAddressesProviderRegistry](https://plasmascan.to//address/0xeE8Ba3464abcEeA6E34554d174DCbdd66083641b) |  not upgradeable | |--------|--------|
|  [ACLManager](https://plasmascan.to//address/0xa860355F0ccFdC823F7332ac108317b2a1509C06) |  not upgradeable | |--------|--------|
|  [Manual AGRS](https://plasmascan.to//address/0x98F756B77D6Fde14E08bb064b248ec7512F9f8ba) |  not upgradeable | |--------|--------|
|  [Collector](https://plasmascan.to//address/0x5E2d083417D12d4B0824E14Ecd48D26831F4Da7D) |  Governance | |--------|--------|
|  [CollectorProxyAdmin](https://plasmascan.to//address/0xd5dc085ffd52bbc19a934fcf67d56a998e0f9472) |  not upgradeable | |--------|--------|
|  Aave a/v/s tokens |  Governance | |--------|--------|
|  [GranularGuardian](https://plasmascan.to//address/0x60665b4F4FF7073C5fed2656852dCa271DfE2684) |  not upgradeable | |--------|--------|
|  [PayloadsController](https://plasmascan.to//address/0xe76EB348E65eF163d85ce282125FF5a7F5712A1d) |  Governance | |--------|--------|
|  [PayloadsControllerProxyAdmin](https://plasmascan.to//address/0x4a195262caf35d94832458fd7b8d2c92bd355482) |  not upgradeable | |--------|--------|
|  [Executor_lvl1](https://plasmascan.to//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A) |  not upgradeable | |--------|--------|
|  [LayerZero adapter](https://plasmascan.to//address/0x99950E7C7eB320A8551916e8676a42b90b058d5D) |  not upgradeable | |--------|--------|
|  [Hyperlane adapter](https://plasmascan.to//address/0x13Dc9eBb19bb1A14aa56215b443B2703A07ba2D5) |  not upgradeable | |--------|--------|
|  [CCIP adapter](https://plasmascan.to//address/0x719e23D7B48Fc5AEa65Cff1bc58865C2b8d89A34) |  not upgradeable | |--------|--------|
|  [CrossChainController](https://plasmascan.to//address/0x643441742f73e270e565619be6DE5f4D55E08cd6) |  Governance | |--------|--------|
|  [CrossChainControllerProxyAdmin](https://plasmascan.to//address/0x4b58bd6163c7020333b6e33a6e6495f308f420b9) |  not upgradeable | |--------|--------|

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
|  [PoolAddressesProvider](https://plasmascan.to//address/0x061D8e131F26512348ee5FA42e2DF1bA9d6505E9) |  - |  onlyOwner |  [Executor_lvl1](https://plasmascan.to//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A) |  setMarketId, setAddress, setAddressAsProxy, setPoolImpl, setPoolConfiguratorImpl, setPriceOracle, setACLManager, setACLAdmin, setPriceOracleSentinel, setPoolDataProvider | |--------|--------|--------|--------|--------|
|  [Pool](https://plasmascan.to//address/0x925a2A7214Ed92428B5b1B090F80b25700095e12) |  [PoolAddressesProvider](https://plasmascan.to//address/0x061D8e131F26512348ee5FA42e2DF1bA9d6505E9) |  onlyPoolConfigurator |  [PoolConfigurator](https://plasmascan.to//address/0xc022B6c71c30A8Ad52Dac504eFA132d13D99d2D9) |  initReserve, dropReserve, setReserveInterestRateStrategyAddress, setConfiguration, updateBridgeProtocolFee, updateFlashloanPremiums, configureEModeCategory, resetIsolationModeTotalDebt | |--------|--------|--------|--------|--------|
|  [Pool](https://plasmascan.to//address/0x925a2A7214Ed92428B5b1B090F80b25700095e12) |  [PoolAddressesProvider](https://plasmascan.to//address/0x061D8e131F26512348ee5FA42e2DF1bA9d6505E9) |  onlyPoolAdmin |  [Executor_lvl1](https://plasmascan.to//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A) |  rescueTokens | |--------|--------|--------|--------|--------|
|  [PoolConfigurator](https://plasmascan.to//address/0xc022B6c71c30A8Ad52Dac504eFA132d13D99d2D9) |  [PoolAddressesProvider](https://plasmascan.to//address/0x061D8e131F26512348ee5FA42e2DF1bA9d6505E9) |  onlyPoolAdmin |  [Executor_lvl1](https://plasmascan.to//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A) |  dropReserve, dropReserve, updateAToken, updateStableDebtToken, updateVariableDebtToken, setReserveActive, updateBridgeProtocolFee, updateFlashloanPremiumTotal, updateFlashloanPremiumToProtocol | |--------|--------|--------|--------|--------|
|  [PoolConfigurator](https://plasmascan.to//address/0xc022B6c71c30A8Ad52Dac504eFA132d13D99d2D9) |  [PoolAddressesProvider](https://plasmascan.to//address/0x061D8e131F26512348ee5FA42e2DF1bA9d6505E9) |  onlyAssetListingOrPoolAdmins |  [Executor_lvl1](https://plasmascan.to//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A) |  initReserves | |--------|--------|--------|--------|--------|
|  [PoolConfigurator](https://plasmascan.to//address/0xc022B6c71c30A8Ad52Dac504eFA132d13D99d2D9) |  [PoolAddressesProvider](https://plasmascan.to//address/0x061D8e131F26512348ee5FA42e2DF1bA9d6505E9) |  onlyRiskOrPoolAdmins |  [Executor_lvl1](https://plasmascan.to//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A) |  setReserveBorrowing, setReserveBorrowing, configureReserveAsCollateral, setReserveStableRateBorrowing, setBorrowableInIsolation, setReserveFactor, setDebtCeiling, setSiloedBorrowing, setBorrowCap, setSupplyCap, setLiquidationProtocolFee, setEModeCategory, setAssetEModeCategory, setUnbackedMintCap, setReserveInterestRateStrategyAddress, setReserveFlashLoaning | |--------|--------|--------|--------|--------|
|  [PoolConfigurator](https://plasmascan.to//address/0xc022B6c71c30A8Ad52Dac504eFA132d13D99d2D9) |  [PoolAddressesProvider](https://plasmascan.to//address/0x061D8e131F26512348ee5FA42e2DF1bA9d6505E9) |  onlyRiskOrPoolOrEmergencyAdmins |  [Executor_lvl1](https://plasmascan.to//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A), [Aave Protocol Guardian Plasma](https://plasmascan.to//address/0xEf323B194caD8e02D9E5D8F07B34f625f1c088f1) |  setReserveFreeze | |--------|--------|--------|--------|--------|
|  [PoolConfigurator](https://plasmascan.to//address/0xc022B6c71c30A8Ad52Dac504eFA132d13D99d2D9) |  [PoolAddressesProvider](https://plasmascan.to//address/0x061D8e131F26512348ee5FA42e2DF1bA9d6505E9) |  onlyEmergencyOrPoolAdmin |  [Executor_lvl1](https://plasmascan.to//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A), [Aave Protocol Guardian Plasma](https://plasmascan.to//address/0xEf323B194caD8e02D9E5D8F07B34f625f1c088f1) |  setPoolPause, setReservePause | |--------|--------|--------|--------|--------|
|  [AaveOracle](https://plasmascan.to//address/0x33E0b3fc976DC9C516926BA48CfC0A9E10a2aAA5) |  - |  onlyAssetListingOrPoolAdmins |  [Executor_lvl1](https://plasmascan.to//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A) |  setAssetSources, setFallbackOracle | |--------|--------|--------|--------|--------|
|  [RewardsController](https://plasmascan.to//address/0x3A57eAa3Ca3794D66977326af7991eB3F6dD5a5A) |  [PoolAddressesProvider](https://plasmascan.to//address/0x061D8e131F26512348ee5FA42e2DF1bA9d6505E9) |  onlyEmissionManager |  [EmissionManager](https://plasmascan.to//address/0x5117F170716eCEAC8ef63d375bc7416Afa6f4497) |  configureAssets, setTransferStrategy, setRewardOracle, setClaimer | |--------|--------|--------|--------|--------|
|  [WrappedTokenGatewayV3](https://plasmascan.to//address/0x54BDcc37c4143f944A3EE51C892a6cBDF305E7a0) |  - |  onlyOwner |  [Executor_lvl1](https://plasmascan.to//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A) |  emergencyTokenTransfer, emergencyEtherTransfer | |--------|--------|--------|--------|--------|
|  [EmissionManager](https://plasmascan.to//address/0x5117F170716eCEAC8ef63d375bc7416Afa6f4497) |  - |  onlyOwner |  [Executor_lvl1](https://plasmascan.to//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A) |  setClaimer, setEmissionAdmin, setRewardsController | |--------|--------|--------|--------|--------|
|  [PoolAddressesProviderRegistry](https://plasmascan.to//address/0xeE8Ba3464abcEeA6E34554d174DCbdd66083641b) |  - |  onlyOwner |  [Executor_lvl1](https://plasmascan.to//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A) |  registerAddressesProvider, unregisterAddressesProvider | |--------|--------|--------|--------|--------|
|  [ACLManager](https://plasmascan.to//address/0xa860355F0ccFdC823F7332ac108317b2a1509C06) |  - |  onlyRole |  [Executor_lvl1](https://plasmascan.to//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A) |  setRoleAdmin | |--------|--------|--------|--------|--------|
|  [Manual AGRS](https://plasmascan.to//address/0x98F756B77D6Fde14E08bb064b248ec7512F9f8ba) |  - |  onlyOwner |  [Executor_lvl1](https://plasmascan.to//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A) |  setRiskConfig, setAddressRestricted | |--------|--------|--------|--------|--------|
|  [Manual AGRS](https://plasmascan.to//address/0x98F756B77D6Fde14E08bb064b248ec7512F9f8ba) |  - |  onlyRiskCouncil |  [Risk Council](https://plasmascan.to//address/0xE71C189C7D8862EfDa0D9E031157199D2F3B4893) |  updateCaps, updateRates, updateCollateralSide, updateLstPriceCaps, updateStablePriceCaps | |--------|--------|--------|--------|--------|
|  [Collector](https://plasmascan.to//address/0x5E2d083417D12d4B0824E14Ecd48D26831F4Da7D) |  [CollectorProxyAdmin](https://plasmascan.to//address/0xD5dC085FfD52BbC19A934fCF67D56a998e0F9472) |  onlyFundsAdmin |  [Executor_lvl1](https://plasmascan.to//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A) |  approve, transfer, setFundsAdmin, createStream | |--------|--------|--------|--------|--------|
|  [Collector](https://plasmascan.to//address/0x5E2d083417D12d4B0824E14Ecd48D26831F4Da7D) |  [CollectorProxyAdmin](https://plasmascan.to//address/0xD5dC085FfD52BbC19A934fCF67D56a998e0F9472) |  onlyAdminOrRecipient |  [CollectorProxyAdmin](https://plasmascan.to//address/0xD5dC085FfD52BbC19A934fCF67D56a998e0F9472), [Executor_lvl1](https://plasmascan.to//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A) |  withdrawFromStream, cancelStream | |--------|--------|--------|--------|--------|
|  [CollectorProxyAdmin](https://plasmascan.to//address/0xd5dc085ffd52bbc19a934fcf67d56a998e0f9472) |  - |  onlyOwner |  [Executor_lvl1](https://plasmascan.to//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A) |  changeProxyAdmin, upgrade, upgradeAndCall | |--------|--------|--------|--------|--------|

### Governance V3 Contracts 
| contract |proxyAdmin |modifier |permission owner |functions |
|----------|----------|----------|----------|----------|
|  [GranularGuardian](https://plasmascan.to//address/0x60665b4F4FF7073C5fed2656852dCa271DfE2684) |  - |  onlyRetryGuardian |  [BGD](https://plasmascan.to//address/0xdc62E0e65b2251Dc66404ca717FD32dcC365Be3A) |  retryEnvelope, retryTransaction | |--------|--------|--------|--------|--------|
|  [GranularGuardian](https://plasmascan.to//address/0x60665b4F4FF7073C5fed2656852dCa271DfE2684) |  - |  onlyEmergencyGuardian |  [Aave Governance Guardian Plasma](https://plasmascan.to//address/0x19CE4363FEA478Aa04B9EA2937cc5A2cbcD44be6) |  solveEmergency | |--------|--------|--------|--------|--------|
|  [GranularGuardian](https://plasmascan.to//address/0x60665b4F4FF7073C5fed2656852dCa271DfE2684) |  - |  onlyDefaultAdmin |  [Executor_lvl1](https://plasmascan.to//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A) |  updateGuardian | |--------|--------|--------|--------|--------|
|  [PayloadsController](https://plasmascan.to//address/0xe76EB348E65eF163d85ce282125FF5a7F5712A1d) |  [PayloadsControllerProxyAdmin](https://plasmascan.to//address/0x4a195262cAf35D94832458Fd7b8D2c92bD355482) |  onlyOwner |  [Executor_lvl1](https://plasmascan.to//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A) |  updateExecutors | |--------|--------|--------|--------|--------|
|  [PayloadsController](https://plasmascan.to//address/0xe76EB348E65eF163d85ce282125FF5a7F5712A1d) |  [PayloadsControllerProxyAdmin](https://plasmascan.to//address/0x4a195262cAf35D94832458Fd7b8D2c92bD355482) |  onlyGuardian |  [Aave Governance Guardian Plasma](https://plasmascan.to//address/0x19CE4363FEA478Aa04B9EA2937cc5A2cbcD44be6) |  cancelPayload | |--------|--------|--------|--------|--------|
|  [PayloadsController](https://plasmascan.to//address/0xe76EB348E65eF163d85ce282125FF5a7F5712A1d) |  [PayloadsControllerProxyAdmin](https://plasmascan.to//address/0x4a195262cAf35D94832458Fd7b8D2c92bD355482) |  onlyOwnerOrGuardian |  [Aave Governance Guardian Plasma](https://plasmascan.to//address/0x19CE4363FEA478Aa04B9EA2937cc5A2cbcD44be6), [Executor_lvl1](https://plasmascan.to//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A) |  updateGuardian | |--------|--------|--------|--------|--------|
|  [PayloadsController](https://plasmascan.to//address/0xe76EB348E65eF163d85ce282125FF5a7F5712A1d) |  [PayloadsControllerProxyAdmin](https://plasmascan.to//address/0x4a195262cAf35D94832458Fd7b8D2c92bD355482) |  onlyRescueGuardian |  [Executor_lvl1](https://plasmascan.to//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A) |  emergencyTokenTransfer, emergencyEtherTransfer | |--------|--------|--------|--------|--------|
|  [PayloadsControllerProxyAdmin](https://plasmascan.to//address/0x4a195262caf35d94832458fd7b8d2c92bd355482) |  - |  onlyOwner |  [Executor_lvl1](https://plasmascan.to//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A) |  changeProxyAdmin, upgrade, upgradeAndCall | |--------|--------|--------|--------|--------|
|  [Executor_lvl1](https://plasmascan.to//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A) |  - |  onlyOwner |  [PayloadsController](https://plasmascan.to//address/0xe76EB348E65eF163d85ce282125FF5a7F5712A1d) |  executeTransaction | |--------|--------|--------|--------|--------|
|  [LayerZero adapter](https://plasmascan.to//address/0x99950E7C7eB320A8551916e8676a42b90b058d5D) |  - |  trustedRemote |  [CrossChainController(Eth)](https://plasmascan.to//address/0xEd42a7D8559a463722Ca4beD50E0Cc05a386b0e1) |  receiveMessage | |--------|--------|--------|--------|--------|
|  [Hyperlane adapter](https://plasmascan.to//address/0x13Dc9eBb19bb1A14aa56215b443B2703A07ba2D5) |  - |  trustedRemote |  [CrossChainController(Eth)](https://plasmascan.to//address/0xEd42a7D8559a463722Ca4beD50E0Cc05a386b0e1) |  receiveMessage | |--------|--------|--------|--------|--------|
|  [CCIP adapter](https://plasmascan.to//address/0x719e23D7B48Fc5AEa65Cff1bc58865C2b8d89A34) |  - |  trustedRemote |  [CrossChainController(Eth)](https://plasmascan.to//address/0xEd42a7D8559a463722Ca4beD50E0Cc05a386b0e1) |  receiveMessage | |--------|--------|--------|--------|--------|
|  [CrossChainController](https://plasmascan.to//address/0x643441742f73e270e565619be6DE5f4D55E08cd6) |  [CrossChainControllerProxyAdmin](https://plasmascan.to//address/0x4B58BD6163c7020333b6e33a6E6495F308f420B9) |  onlyOwner |  [Executor_lvl1](https://plasmascan.to//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A) |  approveSenders, removeSenders, enableBridgeAdapters, disableBridgeAdapters, updateMessagesValidityTimestamp, allowReceiverBridgeAdapters, disallowReceiverBridgeAdapters | |--------|--------|--------|--------|--------|
|  [CrossChainController](https://plasmascan.to//address/0x643441742f73e270e565619be6DE5f4D55E08cd6) |  [CrossChainControllerProxyAdmin](https://plasmascan.to//address/0x4B58BD6163c7020333b6e33a6E6495F308f420B9) |  onlyOwnerOrGuardian |  [Aave Granular Guardian Plasma](https://plasmascan.to//address/0x60665b4F4FF7073C5fed2656852dCa271DfE2684), [Executor_lvl1](https://plasmascan.to//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A) |  retryEnvelope, retryTransaction, updateGuardian | |--------|--------|--------|--------|--------|
|  [CrossChainController](https://plasmascan.to//address/0x643441742f73e270e565619be6DE5f4D55E08cd6) |  [CrossChainControllerProxyAdmin](https://plasmascan.to//address/0x4B58BD6163c7020333b6e33a6E6495F308f420B9) |  onlyRescueGuardian |  [Executor_lvl1](https://plasmascan.to//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A) |  emergencyTokenTransfer, emergencyEtherTransfer | |--------|--------|--------|--------|--------|
|  [CrossChainController](https://plasmascan.to//address/0x643441742f73e270e565619be6DE5f4D55E08cd6) |  [CrossChainControllerProxyAdmin](https://plasmascan.to//address/0x4B58BD6163c7020333b6e33a6E6495F308f420B9) |  onlyApprovedSenders |   |  forwardMessage | |--------|--------|--------|--------|--------|
|  [CrossChainController](https://plasmascan.to//address/0x643441742f73e270e565619be6DE5f4D55E08cd6) |  [CrossChainControllerProxyAdmin](https://plasmascan.to//address/0x4B58BD6163c7020333b6e33a6E6495F308f420B9) |  onlyApprovedBridges |  [LayerZero adapter](https://plasmascan.to//address/0x99950E7C7eB320A8551916e8676a42b90b058d5D), [Hyperlane adapter](https://plasmascan.to//address/0x13Dc9eBb19bb1A14aa56215b443B2703A07ba2D5), [CCIP adapter](https://plasmascan.to//address/0x719e23D7B48Fc5AEa65Cff1bc58865C2b8d89A34) |  receiveCrossChainMessage | |--------|--------|--------|--------|--------|
|  [CrossChainControllerProxyAdmin](https://plasmascan.to//address/0x4b58bd6163c7020333b6e33a6e6495f308f420b9) |  - |  onlyOwner |  [Executor_lvl1](https://plasmascan.to//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A) |  changeProxyAdmin, upgrade, upgradeAndCall | |--------|--------|--------|--------|--------|

### Guardians 
| Guardian |Threshold |Address |Owners |
|----------|----------|----------|----------|
|  [Aave Protocol Guardian Plasma](https://plasmascan.to//address/0xEf323B194caD8e02D9E5D8F07B34f625f1c088f1) |  5/9 |  0xEf323B194caD8e02D9E5D8F07B34f625f1c088f1 |  [0x5d49dBcdd300aECc2C311cFB56593E71c445d60d](https://plasmascan.to//address/0x5d49dBcdd300aECc2C311cFB56593E71c445d60d), [0xbA037E4746ff58c55dc8F27a328C428F258DDACb](https://plasmascan.to//address/0xbA037E4746ff58c55dc8F27a328C428F258DDACb), [0x818C277dBE886b934e60aa047250A73529E26A99](https://plasmascan.to//address/0x818C277dBE886b934e60aa047250A73529E26A99), [0x4f96743057482a2E10253AFDacDA3fd9CF2C1DC9](https://plasmascan.to//address/0x4f96743057482a2E10253AFDacDA3fd9CF2C1DC9), [0xb647055A9915bF9c8021a684E175A353525b9890](https://plasmascan.to//address/0xb647055A9915bF9c8021a684E175A353525b9890), [0x57ab7ee15cE5ECacB1aB84EE42D5A9d0d8112922](https://plasmascan.to//address/0x57ab7ee15cE5ECacB1aB84EE42D5A9d0d8112922), [0xC5bE5c0134857B4b96F45AA6f6B77DB96Ac1487e](https://plasmascan.to//address/0xC5bE5c0134857B4b96F45AA6f6B77DB96Ac1487e), [0xd4af2E86a27F8F77B0556E081F97B215C9cA8f2E](https://plasmascan.to//address/0xd4af2E86a27F8F77B0556E081F97B215C9cA8f2E), [0xf71fc92e2949ccF6A5Fd369a0b402ba80Bc61E02](https://plasmascan.to//address/0xf71fc92e2949ccF6A5Fd369a0b402ba80Bc61E02) | |--------|--------|--------|--------|
|  [Risk Council](https://plasmascan.to//address/0xE71C189C7D8862EfDa0D9E031157199D2F3B4893) |  2/2 |  0xE71C189C7D8862EfDa0D9E031157199D2F3B4893 |  [0x5d49dBcdd300aECc2C311cFB56593E71c445d60d](https://plasmascan.to//address/0x5d49dBcdd300aECc2C311cFB56593E71c445d60d), [0xc2cf0387f2a83A7F5C6675F4CDe7F367ea1B989a](https://plasmascan.to//address/0xc2cf0387f2a83A7F5C6675F4CDe7F367ea1B989a) | |--------|--------|--------|--------|
|  [BGD](https://plasmascan.to//address/0xdc62E0e65b2251Dc66404ca717FD32dcC365Be3A) |  2/3 |  0xdc62E0e65b2251Dc66404ca717FD32dcC365Be3A |  [0x0650302887619fa7727D8BD480Cda11A638B219B](https://plasmascan.to//address/0x0650302887619fa7727D8BD480Cda11A638B219B), [0xf71fc92e2949ccF6A5Fd369a0b402ba80Bc61E02](https://plasmascan.to//address/0xf71fc92e2949ccF6A5Fd369a0b402ba80Bc61E02), [0x5811d9FF80ff4B73A8F9bA42A6082FaB82E89Ea7](https://plasmascan.to//address/0x5811d9FF80ff4B73A8F9bA42A6082FaB82E89Ea7) | |--------|--------|--------|--------|
|  [Aave Governance Guardian Plasma](https://plasmascan.to//address/0x19CE4363FEA478Aa04B9EA2937cc5A2cbcD44be6) |  5/9 |  0x19CE4363FEA478Aa04B9EA2937cc5A2cbcD44be6 |  [0xDA5Ae43e179987a66B9831F92223567e1F38BE7D](https://plasmascan.to//address/0xDA5Ae43e179987a66B9831F92223567e1F38BE7D), [0x1e3804357eD445251FfECbb6e40107bf03888885](https://plasmascan.to//address/0x1e3804357eD445251FfECbb6e40107bf03888885), [0x4f96743057482a2E10253AFDacDA3fd9CF2C1DC9](https://plasmascan.to//address/0x4f96743057482a2E10253AFDacDA3fd9CF2C1DC9), [0xebED04E9137AfeBFF6a1B97aC0adf61a544eFE29](https://plasmascan.to//address/0xebED04E9137AfeBFF6a1B97aC0adf61a544eFE29), [0xbd4DCfA978c6D0d342cE36809AfFFa49d4B7f1F7](https://plasmascan.to//address/0xbd4DCfA978c6D0d342cE36809AfFFa49d4B7f1F7), [0xA3103D0ED00d24795Faa2d641ACf6A320EeD7396](https://plasmascan.to//address/0xA3103D0ED00d24795Faa2d641ACf6A320EeD7396), [0x936CD9654271083cCF93A975919Da0aB3Bc99EF3](https://plasmascan.to//address/0x936CD9654271083cCF93A975919Da0aB3Bc99EF3), [0x0D2394C027602Dc4c3832Ffd849b5df45DBac0E9](https://plasmascan.to//address/0x0D2394C027602Dc4c3832Ffd849b5df45DBac0E9), [0x4C30E33758216aD0d676419c21CB8D014C68099f](https://plasmascan.to//address/0x4C30E33758216aD0d676419c21CB8D014C68099f) | |--------|--------|--------|--------|

### Admins 
| Role |Contract |
|----------|----------|
|  DEFAULT_ADMIN |  [Executor_lvl1](https://plasmascan.to//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A) | |--------|--------|
|  POOL_ADMIN |  [Executor_lvl1](https://plasmascan.to//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A) | |--------|--------|
|  EMERGENCY_ADMIN |  [Aave Protocol Guardian Plasma](https://plasmascan.to//address/0xEf323B194caD8e02D9E5D8F07B34f625f1c088f1) | |--------|--------|
|  ASSET_LISTING_ADMIN |   | |--------|--------|
|  FLASH_BORROWER |   | |--------|--------|
|  RISK_ADMIN |   | |--------|--------|

### Granular Guardian Admins 
| Role |Contract |
|----------|----------|
|  DEFAULT_ADMIN |  [Executor_lvl1](https://plasmascan.to//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A) | |--------|--------|
|  SOLVE_EMERGENCY_ROLE |  [Aave Governance Guardian Plasma](https://plasmascan.to//address/0x19CE4363FEA478Aa04B9EA2937cc5A2cbcD44be6) | |--------|--------|
|  RETRY_ROLE |  [BGD](https://plasmascan.to//address/0xdc62E0e65b2251Dc66404ca717FD32dcC365Be3A) | |--------|--------|

### Collector Admins 
| Role |Contract |
|----------|----------|
|  DEFAULT_ADMIN |  [Executor_lvl1](https://plasmascan.to//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A) | |--------|--------|
|  FUNDS_ADMIN_ROLE |  [Executor_lvl1](https://plasmascan.to//address/0x47aAdaAE1F05C978E6aBb7568d11B7F6e0FC4d6A) | |--------|--------|

