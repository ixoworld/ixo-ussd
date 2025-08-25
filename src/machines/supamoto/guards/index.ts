/**
 * Guards Barrel Export
 *
 * Clean, modular re-exports for all guard functionality.
 * Import specific guards from their domain modules for better tree-shaking and clarity.
 */

// Re-export all guard modules
export * from "./navigation.guards.js";
export * from "./validation.guards.js";
export * from "./ixo.guards.js";
export * from "./system.guards.js";
export * from "./composite.guards.js";
export * from "./guardUtils.js";

// Re-export named collections for convenience
export { navigationGuards } from "./navigation.guards.js";
export { validationGuards } from "./validation.guards.js";
export { ixoGuards } from "./ixo.guards.js";
export { systemGuards } from "./system.guards.js";
export { compositeGuards } from "./composite.guards.js";
export { guardUtils } from "./guardUtils.js";
