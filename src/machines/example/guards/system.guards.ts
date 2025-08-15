/**
 * System Guards for Example Wallet Machine
 *
 * This module contains guards related to system-level operations.
 * These guards handle rate limiting, service availability, and session management.
 */

import { createModuleLogger } from "../../../services/logger.js";
import {
  BusinessValidator,
  RateLimitValidator,
} from "../../../utils/input-validation.js";
import { guardLimits } from "../../../config/index.js";
import type { CombinedGuard } from "../types.js";

const logger = createModuleLogger("system-guards");

// =================================================================================================
// RATE LIMITING GUARDS
// =================================================================================================

/**
 * Checks if user is rate limited
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const isRateLimited: CombinedGuard = (context, _event) => {
  const rateLimitCheck = RateLimitValidator.validateRateLimit(
    context.phoneNumber,
    guardLimits.rateLimit.requestsPerMinute,
    guardLimits.rateLimit.windowMinutes
  );

  if (!rateLimitCheck.isValid) {
    logger.warn(
      {
        phoneNumber: `***${context.phoneNumber.slice(-4)}`,
        error: rateLimitCheck.error,
      },
      "Rate limit exceeded"
    );
  }

  return !rateLimitCheck.isValid;
};

/**
 * Checks if user is NOT rate limited (inverse of isRateLimited)
 */
export const isNotRateLimited: CombinedGuard = (context, event) => {
  return !isRateLimited(context, event);
};

// =================================================================================================
// SERVICE AVAILABILITY GUARDS
// =================================================================================================

/**
 * Checks if service is available
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const isServiceAvailable: CombinedGuard = (_context, _event) => {
  const validation = BusinessValidator.validateServiceAvailability();
  return validation.isValid;
};

/**
 * Checks if service is in maintenance mode
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const isServiceInMaintenance: CombinedGuard = (_context, _event) => {
  return guardLimits.service.maintenanceMode;
};

/**
 * Checks if service is operational (not in maintenance)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const isServiceOperational: CombinedGuard = (_context, _event) => {
  return !guardLimits.service.maintenanceMode && guardLimits.service.available;
};

// =================================================================================================
// PROCESSING STATE GUARDS
// =================================================================================================

/**
 * Checks if system is currently processing a request
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const isProcessing: CombinedGuard = (context, _event) => {
  return context.temp.isProcessing === true;
};

/**
 * Checks if system is NOT processing a request
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const isNotProcessing: CombinedGuard = (context, _event) => {
  return context.temp.isProcessing !== true;
};

// =================================================================================================
// SYSTEM HEALTH GUARDS
// =================================================================================================

/**
 * Checks if system is healthy (all system checks pass)
 */
export const isSystemHealthy: CombinedGuard = (context, event) => {
  return (
    isServiceAvailable(context, event) &&
    isNotRateLimited(context, event) &&
    isNotProcessing(context, event)
  );
};

/**
 * Checks if system can accept new requests
 */
export const canAcceptRequests: CombinedGuard = (context, event) => {
  return (
    isServiceOperational(context, event) && isNotRateLimited(context, event)
  );
};

// =================================================================================================
// SYSTEM GUARD COLLECTION
// =================================================================================================

/**
 * Collection of all system guards for easy access
 */
export const systemGuards = {
  isRateLimited,
  isNotRateLimited,
  isServiceAvailable,
  isServiceInMaintenance,
  isServiceOperational,
  isProcessing,
  isNotProcessing,
  isSystemHealthy,
  canAcceptRequests,
} as const;
