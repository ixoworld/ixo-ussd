/**
 * Configuration Barrel Export
 *
 * This file exports the appropriate guard limits configuration based on the current environment.
 * It automatically selects between development, production, and default configurations.
 */

import { GuardLimits, defaultGuardLimits } from "./guard-limits.js";
import { devGuardLimits } from "./guard-limits.dev.js";
import { prodGuardLimits } from "./guard-limits.prod.js";
import { ENV } from "../config.js";

/**
 * Get the appropriate guard limits configuration for the current environment
 * Uses centralized environment detection from config
 */
function getGuardLimits(): GuardLimits {
  switch (ENV.CURRENT) {
    case "production":
      return prodGuardLimits;
    case "development":
      return devGuardLimits;
    case "test":
      // Use development limits for testing
      return devGuardLimits;
    default:
      // Fallback to default limits
      return defaultGuardLimits;
  }
}

/**
 * Current environment's guard limits configuration
 */
export const guardLimits = getGuardLimits();

/**
 * Re-export types and interfaces for convenience
 */
export type { GuardLimits } from "./guard-limits.js";
export { defaultGuardLimits } from "./guard-limits.js";
export { devGuardLimits } from "./guard-limits.dev.js";
export { prodGuardLimits } from "./guard-limits.prod.js";
