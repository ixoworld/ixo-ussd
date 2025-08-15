/**
 * IXO Guards for Example Wallet Machine
 *
 * This module contains guards related to IXO-specific business logic.
 * These guards handle IXO account management, transactions, and authentication.
 */

import { BusinessValidator } from "../../../utils/input-validation.js";
import { isValidPin } from "./validation.guards.js";
import { guardLimits } from "../../../config/index.js";
import type { CombinedGuard } from "../types.js";

// =================================================================================================
// IXO ACCOUNT GUARDS
// =================================================================================================

/**
 * Checks if user has any IXO addresses
 */
// export const hasIxoAddresses: CombinedGuard = context => {
//   const addresses = context.ixo.user?.ixoAddress || context.ixo.addresses;
//   return !!(addresses && addresses.length > 0);
// };

/**
 * Checks if user has an IXO account
 */
export const hasIxoAccount: CombinedGuard = context => {
  return context.userState.hasIxoAccount === true;
};

/**
 * Checks if wallet setup is complete
 */
export const isWalletSetupComplete: CombinedGuard = context => {
  return context.userState.isWalletSetupComplete === true;
};

/**
 * Checks if user has completed IXO account setup
 */
export const hasCompleteIxoAccount: CombinedGuard = context => {
  return (
    context.userState.hasIxoAccount && context.userState.isWalletSetupComplete
  );
};

/**
 * Checks if an IXO address is selected
 */
export const hasSelectedIxoAddress: CombinedGuard = context => {
  return !!context.ixo.selectedAddress;
};

// =================================================================================================
// IXO AUTHENTICATION GUARDS
// =================================================================================================

/**
 * Checks if PIN has been verified for IXO operations
 */
export const isIxoPinVerified: CombinedGuard = context => {
  return context.userState.pinVerified === true;
};

/**
 * Checks if user has Matrix session for IXO
 */
export const hasMatrixSession: CombinedGuard = context => {
  return !!(context.ixo.matrixSession && context.ixo.matrixSession.accessToken);
};

/**
 * Checks if PIN attempts are within allowed limits
 */
export const withinPinAttemptLimit: CombinedGuard = context => {
  const attempts = context.ixo.pinAttempts || context.temp.pinAttempts || 0;
  const validation = BusinessValidator.validatePinAttempts(attempts);
  return validation.isValid;
};

/**
 * Checks if input is valid PIN and matches context PIN
 */
export const isPinMatch: CombinedGuard = (context, event) => {
  if (!isValidPin(context, event)) {
    return false;
  }

  // Compare the input PIN with the stored PIN
  return event.input === context.ixo.pin;
};

// =================================================================================================
// IXO TRANSACTION GUARDS
// =================================================================================================

/**
 * Checks if transaction amount is within business limits
 */
export const isValidTransactionAmount: CombinedGuard = context => {
  const amount = parseFloat(context.ixo.sendAmount || "0");
  const mockBalance = guardLimits.transaction.mockBalance; // TODO: Use actual balance
  const mockDailyTransactions = guardLimits.transaction.mockDailyTransactions; // TODO: Use actual transaction count

  const validation = BusinessValidator.validateTransactionEligibility(
    amount,
    mockBalance,
    guardLimits.transaction.dailyLimit,
    mockDailyTransactions,
    guardLimits.transaction.maxDailyTransactions
  );

  return validation.isValid;
};

/**
 * Checks if user has sufficient balance for transaction
 */
export const hasSufficientIxoBalance: CombinedGuard = context => {
  const amount = parseFloat(context.ixo.sendAmount || "0");
  const balance =
    typeof context.ixo.balance === "string"
      ? parseFloat(context.ixo.balance)
      : parseFloat(context.ixo.balance?.ixo || "0");

  return balance >= amount;
};

// =================================================================================================
// IXO GUARD COLLECTION
// =================================================================================================

/**
 * Collection of all IXO guards for easy access
 */
export const ixoGuards = {
  hasIxoAccount,
  isWalletSetupComplete,
  hasCompleteIxoAccount,
  hasSelectedIxoAddress,
  isIxoPinVerified,
  hasMatrixSession,
  withinPinAttemptLimit,
  isPinMatch,
  isValidTransactionAmount,
  hasSufficientIxoBalance,
} as const;
