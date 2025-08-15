/**
 * Validation Guards for Example Wallet Machine
 *
 * This module contains guards related to input validation.
 * These guards validate user input using the input validation utilities.
 */

import { createModuleLogger } from "../../../services/logger.js";
import { validateUserInput } from "../../../utils/input-validation.js";
import { isInputOneOf } from "./navigation.guards.js";
import type {
  CombinedGuard,
  AppTypesContext as ExampleWalletContext,
  ExampleWalletEvent,
} from "../types.js";

const logger = createModuleLogger("validation-guards");

// =================================================================================================
// VALIDATION OPTION TYPES
// =================================================================================================

/**
 * Options for PIN validation
 */
export interface PinValidationOptions {
  checkWeakPins?: boolean;
  requireNumeric?: boolean;
}

/**
 * Options for text input validation
 */
export interface TextValidationOptions {
  minLength?: number;
  maxLength?: number;
  allowSpecialChars?: boolean;
}

/**
 * Options for menu validation (currently no specific options)
 */
export interface MenuValidationOptions {}

/**
 * Options for amount validation (currently no specific options)
 */
export interface AmountValidationOptions {}

/**
 * Options for address validation (currently no specific options)
 */
export interface AddressValidationOptions {}

/**
 * Options for phone validation (currently no specific options)
 */
export interface PhoneValidationOptions {}

/**
 * Options for wallet validation (currently no specific options)
 */
export interface WalletValidationOptions {}

/**
 * Options for boolean validation (currently no specific options)
 */
export interface BooleanValidationOptions {}

/**
 * Mapped type that associates each validation type with its corresponding options interface
 */
export type ValidationOptionsMap = {
  menu: MenuValidationOptions;
  pin: PinValidationOptions;
  amount: AmountValidationOptions;
  address: AddressValidationOptions;
  phone: PhoneValidationOptions;
  wallet: WalletValidationOptions;
  text: TextValidationOptions;
  boolean: BooleanValidationOptions;
};

// =================================================================================================
// VALIDATION GUARD FACTORY
// =================================================================================================

/**
 * Creates a validation guard using the input validation utilities
 * Uses TypeScript overloads to ensure type safety between validation type and options
 */
export function createValidationGuard<T extends keyof ValidationOptionsMap>(
  type: T,
  options?: ValidationOptionsMap[T]
): CombinedGuard;
// eslint-disable-next-line no-redeclare
export function createValidationGuard(
  type: keyof ValidationOptionsMap,
  options: ValidationOptionsMap[keyof ValidationOptionsMap] = {}
): CombinedGuard {
  return (
    context: ExampleWalletContext,
    event: ExampleWalletEvent
  ): boolean => {
    if (event.type !== "INPUT") return false;

    const validation = validateUserInput(event.input, type, options);

    if (!validation.isValid) {
      logger.warn(
        {
          type,
          error: validation.error,
          hasInput: !!event.input,
          phoneNumber: `***${context.phoneNumber.slice(-4)}`,
        },
        "Input validation failed"
      );
    }

    return validation.isValid;
  };
}

// =================================================================================================
// SPECIFIC VALIDATION GUARDS
// =================================================================================================

/**
 * Validates menu selection input
 */
export const isValidMenuInput: CombinedGuard = createValidationGuard("menu");

/**
 * Validates PIN input
 */
export const isValidPin: CombinedGuard = createValidationGuard("pin");

/**
 * Validates PIN input with weak PIN checking
 */
export const isValidStrongPin: CombinedGuard = createValidationGuard("pin", {
  checkWeakPins: true,
} satisfies PinValidationOptions);

/**
 * Validates amount input for transactions
 */
export const isValidAmount: CombinedGuard = createValidationGuard("amount");

/**
 * Validates IXO address input
 */
export const isValidIxoAddress: CombinedGuard =
  createValidationGuard("address");

/**
 * Validates wallet ID input
 */
export const isValidWalletId: CombinedGuard = createValidationGuard("wallet");

/**
 * Validates text input (general purpose)
 */
export const isValidTextInput: CombinedGuard = createValidationGuard("text");

/**
 * Validates boolean input (yes/no, 1/0)
 */
export const isValidBooleanInput: CombinedGuard =
  createValidationGuard("boolean");

/**
 * Validates phone number input
 */
export const isValidPhoneInput: CombinedGuard = createValidationGuard("phone");

// =================================================================================================
// COMPOSITE VALIDATION GUARDS
// =================================================================================================

/**
 * Checks if input is valid menu selection for specific menu options
 */
export const isValidMenuChoice =
  (validOptions: string[]): CombinedGuard =>
  (context, event) => {
    return (
      isValidMenuInput(context, event) &&
      isInputOneOf(validOptions)(context, event)
    );
  };

/**
 * Validates menu selection for common menu sizes
 */
export const isValidMainMenuChoice = isValidMenuChoice([
  "1",
  "2",
  "3",
  "4",
  "5",
]);
export const isValidSubMenuChoice = isValidMenuChoice(["1", "2", "3", "0"]);
export const isValidBinaryChoice = isValidMenuChoice(["1", "2", "0"]);

// =================================================================================================
// VALIDATION GUARD COLLECTION
// =================================================================================================

/**
 * Collection of all validation guards for easy access
 */
export const validationGuards = {
  createValidationGuard,
  isValidMenuInput,
  isValidPin,
  isValidStrongPin,
  isValidAmount,
  isValidIxoAddress,
  isValidWalletId,
  isValidTextInput,
  isValidBooleanInput,
  isValidPhoneInput,
  isValidMenuChoice,
  isValidMainMenuChoice,
  isValidSubMenuChoice,
  isValidBinaryChoice,
} as const;
