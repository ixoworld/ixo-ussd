import { z } from "zod";

/**
 * USSD Request/Response Validation Schemas
 *
 * Comprehensive validation for USSD API endpoints using Zod
 */

// Phone number validation - supports various international formats
export const phoneNumberSchema = z
  .string()
  .min(10, "Phone number must be at least 10 digits")
  .max(15, "Phone number must not exceed 15 digits")
  .transform(val => {
    // Normalize phone number format
    const cleaned = val.replace(/\D/g, "");
    return cleaned.startsWith("0") ? cleaned.substring(1) : cleaned;
  })
  .refine(val => /^[1-9]\d{8,13}$/.test(val), "Invalid phone number format");

// Session ID validation - typically UUID or alphanumeric
export const sessionIdSchema = z
  .string()
  .min(1, "Session ID is required")
  .max(100, "Session ID too long")
  .regex(/^[A-Za-z0-9_-]+$/, "Session ID contains invalid characters");

// Service code validation - USSD format like *123# or *123*456#
export const serviceCodeSchema = z
  .string()
  .min(3, "Service code too short")
  .max(20, "Service code too long")
  .regex(/^\*\d+(\*\d+)*#$/, "Invalid USSD service code format");

// USSD text input validation - user's menu selections and inputs
export const ussdTextSchema = z
  .string()
  .max(1000, "Input text too long")
  .optional()
  .default("");

// PIN validation - 4-6 digit numeric PIN
export const pinSchema = z
  .string()
  .min(4, "PIN must be at least 4 digits")
  .max(6, "PIN must not exceed 6 digits")
  .regex(/^\d+$/, "PIN must contain only digits");

// Amount validation for financial transactions
export const amountSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format")
  .transform(val => parseFloat(val))
  .refine(val => val > 0, "Amount must be positive")
  .refine(val => val <= 1000000, "Amount exceeds maximum limit");

// Keep language schema here as it is USSD-related

// Language code validation
export const languageSchema = z
  .enum(["eng", "swa", "fra", "por"])
  .default("eng");

/**
 * Main USSD Request Schema
 */
export const ussdRequestSchema = z
  .object({
    sessionId: sessionIdSchema,
    serviceCode: serviceCodeSchema,
    phoneNumber: phoneNumberSchema,
    text: ussdTextSchema,
  })
  .strict();

export type USSDRequest = z.infer<typeof ussdRequestSchema>;

/**
 * State Machine Test Request Schema
 */
export const stateTestRequestSchema = z
  .object({
    inputs: z.array(z.string().max(100)).optional().default([]),
    phoneNumber: phoneNumberSchema.optional().default("1234567890"),
    sessionId: sessionIdSchema.optional(),
    language: languageSchema.optional(),
  })
  .strict();

export type StateTestRequest = z.infer<typeof stateTestRequestSchema>;

/**
 * Session Update Schema - for updating session context
 */
export const sessionUpdateSchema = z
  .object({
    sessionId: sessionIdSchema,
    phoneNumber: phoneNumberSchema,
    serviceCode: serviceCodeSchema,
    language: languageSchema,
    data: z.record(z.string(), z.any()).optional().default({}),
  })
  .strict();

export type SessionUpdate = z.infer<typeof sessionUpdateSchema>;

/**
 * User Input Validation Schemas
 */
export const menuSelectionSchema = z
  .string()
  .regex(/^[0-9]$/, "Menu selection must be a single digit")
  .transform(val => parseInt(val, 10));

export const textInputSchema = z
  .string()
  .min(1, "Input cannot be empty")
  .max(100, "Input too long")
  .trim();

export const numericInputSchema = z
  .string()
  .regex(/^\d+$/, "Input must contain only numbers")
  .transform(val => parseInt(val, 10));

/**
 * Response Schemas
 */
export const ussdResponseSchema = z
  .object({
    message: z.string().min(1, "Response message is required"),
    continueSession: z.boolean().default(true),
    sessionId: sessionIdSchema.optional(),
  })
  .strict();

export type USSDResponse = z.infer<typeof ussdResponseSchema>;

/**
 * Error Response Schema
 */
export const errorResponseSchema = z
  .object({
    error: z.string(),
    code: z.string().optional(),
    details: z.record(z.string(), z.any()).optional(),
  })
  .strict();

export type ErrorResponse = z.infer<typeof errorResponseSchema>;

/**
 * Health Check Schema
 */
export const healthCheckSchema = z
  .object({
    status: z.enum(["ok", "error"]),
    timestamp: z.string().datetime().optional(),
    services: z
      .record(z.string(), z.enum(["healthy", "degraded", "unhealthy"]))
      .optional(),
  })
  .strict();

export type HealthCheck = z.infer<typeof healthCheckSchema>;

/**
 * Validation Helper Functions
 */

/**
 * Validate and sanitize phone number
 */
export function validatePhoneNumber(phone: string): {
  isValid: boolean;
  normalized?: string;
  error?: string;
} {
  try {
    const normalized = phoneNumberSchema.parse(phone);
    return { isValid: true, normalized };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.issues[0].message };
    }
    return { isValid: false, error: "Invalid phone number" };
  }
}

/**
 * Validate PIN with specific rules
 */
export function validatePin(pin: string): { isValid: boolean; error?: string } {
  try {
    pinSchema.parse(pin);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.issues[0].message };
    }
    return { isValid: false, error: "Invalid PIN" };
  }
}
