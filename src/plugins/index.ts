/**
 * Plugins Barrel Export
 *
 * Central export for all Fastify plugins used in the USSD server.
 * Provides clean imports and conditional plugin loading based on environment.
 */

// Core plugins (always available)
export { default as validationPlugin } from "./validation.js";

// Security plugins (production/staging only)
export { default as advancedSecurityPlugin } from "./advanced-security.js";
export { default as rateLimitPlugin } from "./rate-limit.js";
export { default as securityPlugin } from "./security.js";

// Re-export types for TypeScript support
export type {
  AdvancedSecurityConfig,
  RequestAnalysis,
  ThreatLevel,
} from "./advanced-security.js";
export type { RateLimitConfig } from "./rate-limit.js";
export type { SecurityConfig } from "./security.js";
export type { ValidationError, ValidationOptions } from "./validation.js";

// Plugin utilities
export { getAdvancedSecurityConfig } from "./advanced-security.js";
export {
  extractPhoneNumber,
  generateUserKey,
  getRateLimitConfig,
} from "./rate-limit.js";
export { getSecurityConfig } from "./security.js";

// Import plugins for use in environment functions
import rateLimitPluginDefault from "./rate-limit.js";
import validationPluginDefault from "./validation.js";

/**
 * Get plugins for specific environment
 */
export function getProductionPlugins() {
  return {
    security: null,
    rateLimit: rateLimitPluginDefault,
    advancedSecurity: null,
    validation: validationPluginDefault,
  };
}

export function getDevelopmentPlugins() {
  return {
    validation: validationPluginDefault,
  };
}

export function getTestPlugins() {
  return {
    // Minimal plugins for testing
    validation: validationPluginDefault,
  };
}
