/**
 * Composite Guards for Example Machine
 *
 * This module contains guards that combine multiple domains or complex business logic.
 * These guards provide high-level checks that span across IXO, Example, and system concerns.
 */

import { createModuleLogger } from "../../../services/logger.js";
import type { CombinedGuard } from "../types.js";
import { allGuards, anyGuard, notGuard } from "./guardUtils.js";
import { hasCompleteIxoAccount, isIxoPinVerified } from "./ixo.guards.js";
import { isRateLimited, isServiceAvailable } from "./system.guards.js";

const logger = createModuleLogger("composite-guards");

// =================================================================================================
// FEATURE ACCESS GUARDS
// =================================================================================================

/**
 * Checks if user can access IXO features (has account and is verified)
 */
export const canAccessIxoFeatures: CombinedGuard = (context, event) => {
  return allGuards(hasCompleteIxoAccount, isIxoPinVerified)(context, event);
};

/**
 * Checks if user can access any wallet features (either IXO or Example)
 */
export const canAccessWalletFeatures: CombinedGuard = (context, event) => {
  return anyGuard(canAccessIxoFeatures)(context, event);
};

// =================================================================================================
// TRANSACTION GUARDS
// =================================================================================================

/**
 * Checks if user can perform financial transactions
 */
export const canPerformTransactions: CombinedGuard = (context, event) => {
  return allGuards(
    notGuard(isRateLimited),
    isServiceAvailable,
    canAccessWalletFeatures
  )(context, event);
};

/**
 * Checks if user can perform IXO transactions specifically
 */
export const canPerformIxoTransactions: CombinedGuard = (context, event) => {
  return allGuards(
    notGuard(isRateLimited),
    isServiceAvailable,
    canAccessIxoFeatures
  )(context, event);
};

/**
 * Checks if user can perform Example transactions specifically
 */
export const canPerformExampleTransactions: CombinedGuard = (
  context,
  event
) => {
  return allGuards(
    notGuard(isRateLimited),
    isServiceAvailable,
    canAccessIxoFeatures
  )(context, event);
};

// =================================================================================================
// ACCOUNT MANAGEMENT GUARDS
// =================================================================================================

/**
 * Checks if user can create new accounts
 */
export const canCreateAccounts: CombinedGuard = (context, event) => {
  return allGuards(notGuard(isRateLimited), isServiceAvailable)(context, event);
};

/**
 * Checks if user can modify account settings
 */
export const canModifyAccountSettings: CombinedGuard = (context, event) => {
  return allGuards(
    notGuard(isRateLimited),
    isServiceAvailable,
    canAccessWalletFeatures
  )(context, event);
};

/**
 * Checks if user can view account information
 */
export const canViewAccountInfo: CombinedGuard = (context, event) => {
  return allGuards(isServiceAvailable, canAccessWalletFeatures)(context, event);
};

// =================================================================================================
// OPERATIONAL GUARDS
// =================================================================================================

/**
 * Checks if user can perform basic operations (menu navigation, etc.)
 */
export const canPerformBasicOperations: CombinedGuard = (context, event) => {
  return allGuards(notGuard(isRateLimited), isServiceAvailable)(context, event);
};

/**
 * Checks if user can perform advanced operations (requiring authentication)
 */
export const canPerformAdvancedOperations: CombinedGuard = (context, event) => {
  return allGuards(
    notGuard(isRateLimited),
    isServiceAvailable,
    canAccessWalletFeatures
  )(context, event);
};

/**
 * Checks if user can perform administrative operations
 * SECURITY ALERT: This guard currently has insufficient admin authorization checks
 */
export const canPerformAdminOperations: CombinedGuard = (context, event) => {
  // Log all admin operation attempts for security audit
  logger.warn(
    {
      phoneNumber: `***${context.phoneNumber.slice(-4)}`,
      sessionId: context.sessionId,
      eventType: event.type,
      input: event.input ? "***" : undefined,
      timestamp: new Date().toISOString(),
    },
    "Admin operation attempted"
  );

  // TODO: Add proper admin role checking here
  // Example: context.userState.role === 'admin' || context.ixo.user?.role === 'admin'
  // TODO: Add additional admin credential verification
  // Example: context.userState.adminVerified === true

  const canAccess = allGuards(
    notGuard(isRateLimited),
    isServiceAvailable,
    canAccessWalletFeatures
    // TODO: Add admin-specific authorization guards here
  )(context, event);

  // Log the result for security monitoring
  logger.warn(
    {
      phoneNumber: `***${context.phoneNumber.slice(-4)}`,
      sessionId: context.sessionId,
      accessGranted: canAccess,
      timestamp: new Date().toISOString(),
    },
    "Admin operation access decision"
  );

  return canAccess;
};

// =================================================================================================
// FLOW CONTROL GUARDS
// =================================================================================================

/**
 * Checks if user can enter IXO flow
 */
export const canEnterIxoFlow: CombinedGuard = (context, event) => {
  return allGuards(canPerformBasicOperations, canAccessIxoFeatures)(
    context,
    event
  );
};

/**
 * Checks if user can enter Example flow
 */
export const canEnterExampleFlow: CombinedGuard = (context, event) => {
  return allGuards(canPerformBasicOperations, canAccessIxoFeatures)(
    context,
    event
  );
};

/**
 * Checks if user can switch between flows
 */
export const canSwitchFlows: CombinedGuard = (context, event) => {
  return allGuards(canPerformBasicOperations, canAccessWalletFeatures)(
    context,
    event
  );
};

// =================================================================================================
// SECURITY GUARDS
// =================================================================================================

/**
 * Checks if operation requires elevated security
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const requiresElevatedSecurity: CombinedGuard = (context, event) => {
  // Check for high-risk operations
  const highRiskEventTypes = [
    "TRANSFER_FUNDS",
    "CHANGE_PIN",
    "DELETE_ACCOUNT",
    "EXPORT_KEYS",
  ];

  return highRiskEventTypes.includes(event.type);
};

/**
 * Checks if user has met security requirements
 */
export const hasMetSecurityRequirements: CombinedGuard = (context, event) => {
  return allGuards(canAccessWalletFeatures)(context, event);
};

/**
 * Checks if user can perform security-sensitive operations
 */
export const canPerformSecurityOperations: CombinedGuard = (context, event) => {
  return allGuards(
    notGuard(isRateLimited),
    isServiceAvailable,
    hasMetSecurityRequirements
  )(context, event);
};

// =================================================================================================
// COMPOSITE GUARD COLLECTION
// =================================================================================================

/**
 * Collection of all composite guards for easy access
 */
export const compositeGuards = {
  canAccessIxoFeatures,
  canAccessWalletFeatures,
  canPerformTransactions,
  canPerformIxoTransactions,
  canPerformExampleTransactions,
  canCreateAccounts,
  canModifyAccountSettings,
  canViewAccountInfo,
  canPerformBasicOperations,
  canPerformAdvancedOperations,
  canPerformAdminOperations,
  canEnterIxoFlow,
  canEnterExampleFlow,
  canSwitchFlows,
  requiresElevatedSecurity,
  hasMetSecurityRequirements,
  canPerformSecurityOperations,
} as const;
