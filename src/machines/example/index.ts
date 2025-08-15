/**
 * Example Machine Module - Simplified Architecture
 *
 * Main entry point for the generic Example state machine and related components.
 * Currently supports core functionality with placeholders for future development.
 *
 * Available Modules:
 * - Main orchestrator machine coordinates between service domains
 * - Information services handle "Know More" flows
 * - Account management handles login and registration flows
 * - Shared utilities and types support all domains
 */

// Main orchestrator machine - simplified architecture
export { exampleMachine } from "./parentMachine.js";
export type {
  ExampleMachine,
  ExampleMachineContext,
  ExampleMachineEvent,
} from "./parentMachine.js";

export { knowMoreMachine } from "./information/index.js";
export { accountMenuMachine } from "./account-menu/index.js";
export { loginMachine } from "./account-login/index.js";
export { accountCreationMachine } from "./account-creation/index.js";

export * from "./guards/index.js";
export * from "./utils/navigation-mixin.js";
export * from "./utils/navigation-patterns.js";
