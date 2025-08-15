/**
 * Validation Schemas - Barrel Export
 *
 * Central export for all validation schemas and utilities
 */

// Export all USSD schemas
export * from "./ussd.schemas.js";

// Export IXO schemas
export * from "./ixo.schemas.js";

// Re-export commonly used Zod utilities
export { z, ZodError } from "zod";

/**
 * Common validation result type for consistency across the application
 */
export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: Record<string, any>;
}

/**
 * Generic validation function that returns a consistent result format
 */
export function validateData<T>(
  schema: any,
  data: unknown
): ValidationResult<T> {
  try {
    const validatedData = schema.parse(data);
    return {
      success: true,
      data: validatedData,
    };
  } catch (error: any) {
    if (error.name === "ZodError") {
      return {
        success: false,
        error: error.issues[0]?.message || "Validation failed",
        details: error.issues,
      };
    }
    return {
      success: false,
      error: "Validation failed",
      details: { originalError: error.message },
    };
  }
}

/**
 * Create a validation function for a specific schema
 */
export function createValidator<T>(schema: any) {
  return (data: unknown): ValidationResult<T> => {
    return validateData<T>(schema, data);
  };
}
