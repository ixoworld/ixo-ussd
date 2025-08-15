/**
 * @deprecated This file has been refactored into themed modules.
 *
 * DEPRECATION NOTICE: This file is now a compatibility shim.
 * Please update your imports to use the new themed guard modules:
 *
 * - Navigation guards: import from './navigation.guards.js'
 * - Validation guards: import from './validation.guards.js'
 * - IXO guards: import from './ixo.guards.js'
 * - System guards: import from './system.guards.js'
 * - Composite guards: import from './composite.guards.js'
 * - Guard utilities: import from './guardUtils.js'
 * - Or use the barrel export: import from './guards/index.js'
 *
 * This file will be removed in a future version.
 */

// Re-export all guards from the new themed modules for backward compatibility
export * from "./index.js";
