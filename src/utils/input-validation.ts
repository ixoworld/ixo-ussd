/**
 * Input Validation Utilities for USSD State Machines
 *
 * Comprehensive validation for user inputs with business logic rules
 * and security considerations for financial transactions
 */
import { createModuleLogger } from "../services/logger.js";

const logger = createModuleLogger("input-validation");

/**
 * Validation result interface for consistent error handling
 */
export interface ValidationResult<T = string> {
  isValid: boolean;
  value?: T;
  error?: string;
  sanitized?: string;
}

/**
 * Business logic constants
 */
export const VALIDATION_RULES = {
  PIN: {
    MIN_LENGTH: 5,
    MAX_LENGTH: 5,
    MAX_ATTEMPTS: 3,
    WEAK_PINS: [
      "00000",
      "11111",
      "22222",
      "33333",
      "44444",
      "55555",
      "66666",
      "77777",
      "88888",
      "99999",
      "12345",
      "54321",
    ] as readonly string[],
  },
  AMOUNT: {
    MIN: 0.01,
    MAX: 1000000,
    DECIMALS: 2,
  },
  PHONE: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 15,
  },
  TEXT_INPUT: {
    MAX_LENGTH: 100,
  },
  SESSION: {
    TIMEOUT_MINUTES: 15,
    MAX_INACTIVE_MINUTES: 5,
  },
} as const;

/**
 * Sanitize user input by removing dangerous characters and normalizing
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>"'&]/g, "") // Remove HTML/script injection characters
    .replace(/s+/g, " ") // Normalize whitespace
    .substring(0, VALIDATION_RULES.TEXT_INPUT.MAX_LENGTH); // Truncate
}

/**
 * Validate menu selection (single digit 0-9)
 */
export function validateMenuSelection(input: string): ValidationResult<number> {
  const sanitized = sanitizeInput(input);

  if (!sanitized) {
    return { isValid: false, error: "Menu selection cannot be empty" };
  }

  if (sanitized.length !== 1) {
    return { isValid: false, error: "Menu selection must be a single digit" };
  }

  if (!/^[0-9]$/.test(sanitized)) {
    return {
      isValid: false,
      error: "Menu selection must be a number from 0-9",
    };
  }

  const value = parseInt(sanitized, 10);
  return { isValid: true, value, sanitized };
}

/**
 * Validate PIN with security considerations
 */
export function validatePin(
  input: string,
  options: {
    checkWeakPins?: boolean;
    requireNumeric?: boolean;
  } = {}
): ValidationResult<string> {
  const { checkWeakPins = true, requireNumeric = true } = options;
  const sanitized = sanitizeInput(input);

  if (!sanitized) {
    return { isValid: false, error: "PIN cannot be empty" };
  }

  if (sanitized.length < VALIDATION_RULES.PIN.MIN_LENGTH) {
    return {
      isValid: false,
      error: `PIN must be at least ${VALIDATION_RULES.PIN.MIN_LENGTH} digits`,
    };
  }

  if (sanitized.length > VALIDATION_RULES.PIN.MAX_LENGTH) {
    return {
      isValid: false,
      error: `PIN must not exceed ${VALIDATION_RULES.PIN.MAX_LENGTH} digits`,
    };
  }

  if (requireNumeric && !/^\d+$/.test(sanitized)) {
    return { isValid: false, error: "PIN must contain only numbers" };
  }

  if (checkWeakPins && VALIDATION_RULES.PIN.WEAK_PINS.includes(sanitized)) {
    return {
      isValid: false,
      error: "PIN is too weak. Please choose a different PIN",
    };
  }

  logger.debug(
    {
      length: sanitized.length,
      isWeak: VALIDATION_RULES.PIN.WEAK_PINS.includes(sanitized),
    },
    "PIN validation completed"
  );

  return { isValid: true, value: sanitized, sanitized };
}

/**
 * Validate transaction amount with business rules
 */
export function validateAmount(input: string): ValidationResult<number> {
  const sanitized = sanitizeInput(input);

  if (!sanitized) {
    return { isValid: false, error: "Amount cannot be empty" };
  }

  // Allow decimal notation
  if (!/^\d+(\.\d{1,2})?$/.test(sanitized)) {
    return {
      isValid: false,
      error: "Amount must be a valid number with up to 2 decimal places",
    };
  }

  const value = parseFloat(sanitized);

  if (isNaN(value)) {
    return { isValid: false, error: "Amount must be a valid number" };
  }

  if (value <= 0) {
    return { isValid: false, error: "Amount must be greater than zero" };
  }

  if (value < VALIDATION_RULES.AMOUNT.MIN) {
    return {
      isValid: false,
      error: `Minimum amount is ${VALIDATION_RULES.AMOUNT.MIN}`,
    };
  }

  if (value > VALIDATION_RULES.AMOUNT.MAX) {
    return {
      isValid: false,
      error: `Maximum amount is ${VALIDATION_RULES.AMOUNT.MAX.toLocaleString()}`,
    };
  }

  logger.debug({ value, sanitized }, "Amount validation completed");

  return { isValid: true, value, sanitized };
}

/**
 * Validate IXO blockchain address
 */
export function validateIxoAddress(input: string): ValidationResult<string> {
  const sanitized = sanitizeInput(input);

  if (!sanitized) {
    return { isValid: false, error: "IXO address cannot be empty" };
  }

  // IXO addresses start with 'ixo' and are 39-45 characters long
  if (!/^ixo[a-z0-9]{36,42}$/.test(sanitized)) {
    return { isValid: false, error: "Invalid IXO address format" };
  }

  if (sanitized.length < 39 || sanitized.length > 45) {
    return {
      isValid: false,
      error: "IXO address must be between 39-45 characters",
    };
  }

  return { isValid: true, value: sanitized, sanitized };
}

/**
 * Validate phone number (basic international format)
 */
export function validatePhoneNumber(input: string): ValidationResult<string> {
  const sanitized = input.replace(/\D/g, ""); // Remove non-digits

  if (!sanitized) {
    return { isValid: false, error: "Phone number cannot be empty" };
  }

  if (sanitized.length < VALIDATION_RULES.PHONE.MIN_LENGTH) {
    return {
      isValid: false,
      error: `Phone number must be at least ${VALIDATION_RULES.PHONE.MIN_LENGTH} digits`,
    };
  }

  if (sanitized.length > VALIDATION_RULES.PHONE.MAX_LENGTH) {
    return {
      isValid: false,
      error: `Phone number must not exceed ${VALIDATION_RULES.PHONE.MAX_LENGTH} digits`,
    };
  }

  // Normalize: remove leading zero, add country code if needed
  const normalized = sanitized.startsWith("0")
    ? sanitized.substring(1)
    : sanitized;

  return { isValid: true, value: normalized, sanitized: normalized };
}

/**
 * Validate Customer ID (C followed by 8+ alphanumeric)
 */
export function validateCustomerId(input: string): ValidationResult<string> {
  const sanitized = sanitizeInput(input).toUpperCase();

  if (!sanitized) {
    return { isValid: false, error: "Wallet ID cannot be empty" };
  }

  if (!/^C\d{8}$/.test(sanitized)) {
    return {
      isValid: false,
      error: "Wallet ID must be C followed by 8 digits (e.g., C12345678)",
    };
  }

  return { isValid: true, value: sanitized, sanitized };
}

/**
 * Validate text input for usernames, display names, etc.
 */
export function validateTextInput(
  input: string,
  options: {
    minLength?: number;
    maxLength?: number;
    allowSpecialChars?: boolean;
  } = {}
): ValidationResult<string> {
  const {
    minLength = 1,
    maxLength = VALIDATION_RULES.TEXT_INPUT.MAX_LENGTH,
    allowSpecialChars = false,
  } = options;

  const sanitized = sanitizeInput(input);

  if (!sanitized) {
    return { isValid: false, error: "Input cannot be empty" };
  }

  if (sanitized.length < minLength) {
    return {
      isValid: false,
      error: `Input must be at least ${minLength} characters`,
    };
  }

  if (sanitized.length > maxLength) {
    return {
      isValid: false,
      error: `Input must not exceed ${maxLength} characters`,
    };
  }

  if (!allowSpecialChars && !/^[a-zA-Z0-9\s]+$/.test(sanitized)) {
    return {
      isValid: false,
      error: "Input can only contain letters, numbers, and spaces",
    };
  }

  return { isValid: true, value: sanitized, sanitized };
}

/**
 * Validate boolean yes/no input (1/0, y/n, yes/no)
 */
export function validateBooleanInput(input: string): ValidationResult<boolean> {
  const sanitized = sanitizeInput(input).toLowerCase();

  const truthyValues = ["1", "y", "yes", "true", "confirm"];
  const falsyValues = ["0", "n", "no", "false", "cancel"];

  if (truthyValues.includes(sanitized)) {
    return { isValid: true, value: true, sanitized };
  }

  if (falsyValues.includes(sanitized)) {
    return { isValid: true, value: false, sanitized };
  }

  return { isValid: false, error: "Please enter 1 for Yes or 0 for No" };
}

/**
 * Validate session timeout and activity
 */
export function validateSessionActivity(
  lastActivity: Date
): ValidationResult<boolean> {
  const now = new Date();
  const minutesSinceActivity =
    (now.getTime() - lastActivity.getTime()) / (1000 * 60);

  if (minutesSinceActivity > VALIDATION_RULES.SESSION.TIMEOUT_MINUTES) {
    return {
      isValid: false,
      error: "Session has expired due to inactivity. Please start again.",
      value: false,
    };
  }

  if (minutesSinceActivity > VALIDATION_RULES.SESSION.MAX_INACTIVE_MINUTES) {
    logger.warn({ minutesSinceActivity }, "Session approaching timeout");
  }

  return { isValid: true, value: true };
}

/**
 * Comprehensive input validator that routes to appropriate validation function
 */
export function validateUserInput(
  input: string,
  type:
    | "menu"
    | "pin"
    | "amount"
    | "address"
    | "phone"
    | "wallet"
    | "text"
    | "boolean",
  options: any = {}
): ValidationResult<any> {
  logger.debug(
    {
      type,
      hasInput: !!input,
      inputLength: input?.length || 0,
    },
    "Validating user input"
  );

  try {
    switch (type) {
      case "menu":
        return validateMenuSelection(input);
      case "pin":
        return validatePin(input, options);
      case "amount":
        return validateAmount(input);
      case "address":
        return validateIxoAddress(input);
      case "phone":
        return validatePhoneNumber(input);
      case "wallet":
        return validateCustomerId(input);
      case "text":
        return validateTextInput(input, options);
      case "boolean":
        return validateBooleanInput(input);
      default:
        return { isValid: false, error: `Unknown validation type: ${type}` };
    }
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        type,
        hasInput: !!input,
      },
      "Validation error"
    );
    return { isValid: false, error: "Validation failed due to internal error" };
  }
}

/**
 * Business logic validators for complex rules
 */
export class BusinessValidator {
  /**
   * Validate if user can perform transaction based on balance and limits
   */
  static validateTransactionEligibility(
    amount: number,
    currentBalance: number,
    dailyLimit: number = 50000,
    transactionsToday: number = 0,
    maxDailyTransactions: number = 10
  ): ValidationResult<boolean> {
    if (amount > currentBalance) {
      return {
        isValid: false,
        error: "Insufficient balance for this transaction",
      };
    }

    if (amount > dailyLimit) {
      return {
        isValid: false,
        error: `Transaction exceeds daily limit of ${dailyLimit.toLocaleString()}`,
      };
    }

    if (transactionsToday >= maxDailyTransactions) {
      return {
        isValid: false,
        error: `Daily transaction limit of ${maxDailyTransactions} reached`,
      };
    }

    return { isValid: true, value: true };
  }

  /**
   * Validate PIN attempts to prevent brute force
   */
  static validatePinAttempts(attempts: number): ValidationResult<boolean> {
    if (attempts >= VALIDATION_RULES.PIN.MAX_ATTEMPTS) {
      return {
        isValid: false,
        error: "Maximum PIN attempts exceeded. Account temporarily locked.",
        value: false,
      };
    }

    if (attempts === VALIDATION_RULES.PIN.MAX_ATTEMPTS - 1) {
      return {
        isValid: true,
        error: "Warning: One more incorrect attempt will lock your account.",
        value: true,
      };
    }

    return { isValid: true, value: true };
  }

  /**
   * Validate service availability during maintenance windows
   */
  static validateServiceAvailability(): ValidationResult<boolean> {
    const now = new Date();
    const hour = now.getHours();

    // Example: Maintenance window between 2-4 AM
    if (hour >= 2 && hour < 4) {
      return {
        isValid: false,
        error:
          "Service temporarily unavailable for maintenance. Please try again later.",
        value: false,
      };
    }

    return { isValid: true, value: true };
  }
}

/**
 * Rate limiting validator for API calls
 */
export class RateLimitValidator {
  private static requestCounts = new Map<
    string,
    { count: number; resetTime: number }
  >();

  static validateRateLimit(
    identifier: string,
    limit: number = 60,
    windowMinutes: number = 1
  ): ValidationResult<boolean> {
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;

    const current = this.requestCounts.get(identifier);

    if (!current || now > current.resetTime) {
      this.requestCounts.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
      });
      return { isValid: true, value: true };
    }

    if (current.count >= limit) {
      return {
        isValid: false,
        error: "Too many requests. Please wait before trying again.",
        value: false,
      };
    }

    current.count++;
    return { isValid: true, value: true };
  }
}
