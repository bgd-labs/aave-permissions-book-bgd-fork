/**
 * Decentralization analysis for Aave protocol contracts.
 *
 * Determines two things for each contract/action:
 * 1. Upgradeability: whether a contract has a proxy admin (and who controls it)
 * 2. Action executors: who can perform each action type (governance, multisig, steward, etc.)
 *
 * Ownership is resolved by walking the modifier chain recursively:
 *   Contract -> modifier -> owner address -> is it governance? multisig? steward?
 *
 * For upgradeable contracts, the proxy admin's owner determines the controller.
 * For non-upgradeable contracts, the contract's own onlyOwner modifier is checked.
 *
 * Configuration is externalized to statics/decentralizationConfig.json to allow
 * easy updates without code changes (e.g., adding new governance-owned addresses).
 */
import { AddressInfo, ContractInfo, Contracts } from './types.js';
import actionsConfigJson from '../statics/actionsConfig.json' assert { type: 'json' };

// actionsConfig maps action names to the contract functions that perform them.
// Example: { "Listing": ["initReserve", "addPool"], "Pause": ["setReservePause"] }
const actionsConfig = actionsConfigJson as Record<string, string[]>;
import decentralizationConfig from '../statics/decentralizationConfig.json' assert { type: 'json' };

export type Decentralization = {
  upgradeable: boolean;
  ownedBy: Controller;
};

export enum Controller {
  NONE = 'Not owned',
  GOV_V3 = 'Governance',
  MULTI_SIG = 'Multi-sig',
  EOA = 'External Contract',
  PPC_MULTI_SIG = 'PPC Multi-sig',
  STEWARD = 'Steward',
}

// ============================================================================
// Configuration from statics/decentralizationConfig.json
// ============================================================================

// Addresses known to be governance-owned that can't be resolved by walking modifiers
// (e.g., cross-chain executors whose ownership is on another chain)
const KNOWN_GOV_OWNED_ADDRESSES = new Set(
  decentralizationConfig.knownGovernanceOwnedAddresses.map((item) =>
    item.address.toLowerCase(),
  ),
);

// Contracts where onlyRiskCouncil should not be treated as an admin modifier
// (e.g., GhoStewardV2 where risk council is a functional role, not ownership)
const RISK_COUNCIL_EXCEPTIONS = new Set(decentralizationConfig.riskCouncilExceptions);
// Substrings that identify steward contracts (e.g., "steward", "agrs")
const STEWARD_INDICATORS = decentralizationConfig.stewardIndicators;
// Actions that are always governance-only regardless of modifier analysis
const GOVERNANCE_ONLY_ACTIONS = new Set(decentralizationConfig.governanceOnlyActions);
// Modifiers that indicate direct ownership (e.g., "onlyOwner")
const STRICT_MODIFIERS = new Set(decentralizationConfig.strictModifiers);
// Broader set of modifiers indicating admin control (strict + role-based like "onlyPoolAdmin")
const ADMINISTERED_MODIFIERS = new Set(decentralizationConfig.administeredModifiers);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Checks if a name indicates a steward contract.
 * Stewards are special risk management contracts (e.g., RiskSteward, AGRS).
 */
const isSteward = (name: string | undefined): boolean => {
  if (!name) return false;
  const lower = name.toLowerCase();
  return STEWARD_INDICATORS.some((indicator) => lower.includes(indicator));
};

/**
 * Finds a contract in poolInfo by its address.
 */
const findContractByAddress = (
  address: string,
  poolInfo: Contracts,
): { name: string; contract: ContractInfo } | undefined => {
  const lowerAddress = address.toLowerCase();
  for (const [name, contract] of Object.entries(poolInfo)) {
    if (contract.address?.toLowerCase() === lowerAddress) {
      return { name, contract };
    }
  }
  return undefined;
};

// ============================================================================
// Ownership Resolution
// ============================================================================

type OwnershipCheckMode = 'strict' | 'administered';

interface OwnershipResult {
  owned: boolean;
  ownedBy: Controller;
  ownedByAddress?: string;
}

/**
 * Determines if an address is owned by governance by walking the ownership chain.
 *
 * The chain typically looks like:
 *   Contract -> ProxyAdmin -> Executor -> PayloadsController -> Governance
 *
 * Recursion terminates when:
 * - A multisig is found (has owners) -> not gov-owned
 * - A circular reference is detected (executor <-> PayloadsController) -> gov-owned
 * - No matching contract/modifier is found -> not gov-owned
 *
 * @param initialAddress - Used to detect circular references in the ownership chain
 */
const isOwnedByGov = (
  address: string,
  govInfo: Contracts,
  initialAddress: string,
): boolean => {
  for (const contract of Object.values(govInfo)) {
    if (contract.address.toLowerCase() !== address.toLowerCase()) {
      continue;
    }

    // If has proxy admin, check if proxy admin is gov-owned
    if (contract.proxyAdmin) {
      if (isOwnedByGov(contract.proxyAdmin, govInfo, initialAddress)) {
        return true;
      }
    }

    // Check modifiers for governance ownership
    for (const modifierInfo of contract.modifiers) {
      if (
        modifierInfo.modifier !== 'onlyOwner' &&
        modifierInfo.modifier !== 'onlyEthereumGovernanceExecutor'
      ) {
        continue;
      }

      const primaryAddress = modifierInfo.addresses[0];

      // If has multisig owners, not directly gov-owned
      if (primaryAddress.owners.length > 0) {
        return false;
      }

      // Check for circular reference (executor owned by PC, PC owned by executor)
      if (primaryAddress.address.toLowerCase() === initialAddress.toLowerCase()) {
        return true;
      }

      // Recurse to check owner
      return isOwnedByGov(primaryAddress.address, govInfo, address);
    }
  }

  return false;
};

/**
 * Determines if an address is owned/administered and by whom.
 *
 * @param mode - 'strict' checks only onlyOwner, 'administered' checks multiple admin modifiers
 */
const checkOwnership = (
  address: string,
  poolInfo: Contracts,
  govInfo: Contracts,
  isWhiteLabel: boolean,
  mode: OwnershipCheckMode,
): OwnershipResult => {
  // Check known governance-owned addresses first
  if (KNOWN_GOV_OWNED_ADDRESSES.has(address.toLowerCase())) {
    return { owned: true, ownedBy: Controller.GOV_V3 };
  }

  const modifiersToCheck =
    mode === 'strict' ? STRICT_MODIFIERS : ADMINISTERED_MODIFIERS;

  for (const [contractName, contract] of Object.entries(poolInfo)) {
    if (contract.address?.toLowerCase() !== address.toLowerCase()) {
      continue;
    }

    // If has proxy admin, recurse to check proxy admin ownership
    if (contract.proxyAdmin) {
      return checkOwnership(
        contract.proxyAdmin,
        poolInfo,
        govInfo,
        isWhiteLabel,
        'strict',
      );
    }

    // Check modifiers
    for (const modifierInfo of contract.modifiers) {
      // Skip onlyRiskCouncil for exception contracts (e.g., GhoStewardV2)
      if (
        modifierInfo.modifier === 'onlyRiskCouncil' &&
        RISK_COUNCIL_EXCEPTIONS.has(contractName)
      ) {
        continue;
      }

      if (!modifiersToCheck.has(modifierInfo.modifier)) {
        continue;
      }

      const primaryAddress = modifierInfo.addresses[0];

      // Has multisig owners
      if (primaryAddress.owners.length > 0) {
        return { owned: true, ownedBy: Controller.MULTI_SIG };
      }

      // Check if owned by governance
      const ownedByGov = isOwnedByGov(
        primaryAddress.address,
        govInfo,
        primaryAddress.address,
      );

      if (ownedByGov) {
        return {
          owned: true,
          ownedBy: isWhiteLabel ? Controller.PPC_MULTI_SIG : Controller.GOV_V3,
        };
      }

      return {
        owned: true,
        ownedBy: Controller.EOA,
        ownedByAddress: primaryAddress.address,
      };
    }
  }

  return { owned: false, ownedBy: Controller.EOA };
};

/**
 * Checks if an address is owned (strict check - only onlyOwner modifier).
 */
const isOwnedAndByWho = (
  address: string,
  poolInfo: Contracts,
  govInfo: Contracts,
  isWhiteLabel: boolean,
): OwnershipResult => {
  return checkOwnership(address, poolInfo, govInfo, isWhiteLabel, 'strict');
};

/**
 * Checks if an address is administered (broader check - multiple admin modifiers).
 */
const isAdministeredAndByWho = (
  address: string,
  poolInfo: Contracts,
  govInfo: Contracts,
  isWhiteLabel: boolean,
): OwnershipResult => {
  return checkOwnership(address, poolInfo, govInfo, isWhiteLabel, 'administered');
};

// ============================================================================
// Controller Classification
// ============================================================================

interface ClassificationContext {
  addressInfo: AddressInfo;
  contractName: string;
  poolInfo: Contracts;
  govInfo: Contracts;
  addressesNames: Record<string, string>;
  isWhiteLabel: boolean;
}

/**
 * Determines what type of controller owns/administers an address.
 *
 * Classification priority:
 * 1. If address name contains steward indicator -> STEWARD
 * 2. If address is a multisig (has owners) -> MULTI_SIG or STEWARD (if contract is steward)
 * 3. If address is a known contract in poolInfo that's a steward -> STEWARD
 * 4. Otherwise, check ownership chain via isAdministeredAndByWho
 */
const classifyController = (ctx: ClassificationContext): Controller => {
  const {
    addressInfo,
    contractName,
    poolInfo,
    govInfo,
    addressesNames,
    isWhiteLabel,
  } = ctx;
  const addressName = addressesNames[addressInfo.address];

  // 1. Check if address name indicates steward
  if (isSteward(addressName)) {
    return Controller.STEWARD;
  }

  // 2. Check if it's a multisig
  if (addressInfo.owners.length > 0) {
    return isSteward(contractName) ? Controller.STEWARD : Controller.MULTI_SIG;
  }

  // 3. Check if address is a known steward contract in poolInfo
  const matchingContract = findContractByAddress(addressInfo.address, poolInfo);
  if (matchingContract && isSteward(matchingContract.name)) {
    return Controller.STEWARD;
  }

  // 4. Check ownership chain
  const ownedInfo = isAdministeredAndByWho(
    addressInfo.address,
    poolInfo,
    govInfo,
    isWhiteLabel,
  );

  if (!ownedInfo.owned) {
    // Not owned by known entity - check if contract itself is steward
    const addressEOAName = addressesNames[addressInfo.address];
    if (isSteward(contractName) || isSteward(addressEOAName)) {
      return Controller.STEWARD;
    }
    return Controller.EOA;
  }

  // Check if the owner is a steward
  if (ownedInfo.ownedByAddress && isSteward(addressesNames[ownedInfo.ownedByAddress])) {
    return Controller.STEWARD;
  }

  return ownedInfo.ownedBy;
};

// ============================================================================
// Public API
// ============================================================================

/**
 * Determines which controllers can execute each action type.
 *
 * For each action defined in actionsConfig.json, this function:
 * 1. Finds all contracts that have functions matching the action
 * 2. Identifies who can call those functions (via modifiers)
 * 3. Classifies each caller as GOV_V3, MULTI_SIG, STEWARD, PPC_MULTI_SIG, or EOA
 *
 * @returns Record mapping action names to Sets of Controller types
 */
export const getActionExecutors = (
  poolInfo: Contracts,
  govInfo: Contracts,
  isWhiteLabel: boolean,
  addressesNames: Record<string, string>,
): Record<string, Set<string>> => {
  const actionsObject: Record<string, Set<string>> = {};

  for (const action of Object.keys(actionsConfig)) {
    actionsObject[action] = new Set<string>();

    for (const [contractName, contract] of Object.entries(poolInfo)) {
      for (const modifier of contract.modifiers) {
        const hasMatchingFunction = modifier.functions.some((functionName: string) =>
          actionsConfig[action]?.includes(functionName),
        );

        if (!hasMatchingFunction) {
          continue;
        }

        // Governance-only actions skip steward classification
        if (GOVERNANCE_ONLY_ACTIONS.has(action)) {
          actionsObject[action].add(
            isWhiteLabel ? Controller.PPC_MULTI_SIG : Controller.GOV_V3,
          );
          continue;
        }

        // Classify each address that can call this modifier
        for (const addressInfo of modifier.addresses) {
          const controller = classifyController({
            addressInfo,
            contractName,
            poolInfo,
            govInfo,
            addressesNames,
            isWhiteLabel,
          });
          actionsObject[action].add(controller);
        }
      }
    }
  }

  return actionsObject;
};

/**
 * Determines the level of decentralization for a contract.
 *
 * @returns Object with upgradeable status and ownership type
 */
export const getLevelOfDecentralization = (
  contract: ContractInfo,
  poolInfo: Contracts,
  govInfo: Contracts,
  isWhiteLabel: boolean,
): Decentralization => {
  let upgradeable = false;
  let ownedBy = Controller.NONE;

  // Check if it has proxy admin (means upgradeable)
  if (contract.proxyAdmin) {
    upgradeable = true;
    const proxyOwnership = isOwnedAndByWho(
      contract.proxyAdmin,
      poolInfo,
      govInfo,
      isWhiteLabel,
    );

    if (proxyOwnership.owned) {
      ownedBy = proxyOwnership.ownedBy;
    }
  } else {
    const ownership = isOwnedAndByWho(
      contract.address,
      poolInfo,
      govInfo,
      isWhiteLabel,
    );
    if (ownership.owned) {
      ownedBy = ownership.ownedBy;
    }
  }

  return { upgradeable, ownedBy };
};
