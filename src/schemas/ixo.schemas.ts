import { z } from "zod";
import { phoneNumberSchema, pinSchema, amountSchema } from "./ussd.schemas.js";

/**
 * IXO-specific Validation Schemas
 *
 * Schemas and helpers related to IXO blockchain addressing and transactions.
 */

// IXO address validation - blockchain address format
export const ixoAddressSchema = z
  .string()
  .min(39, "IXO address too short")
  .max(45, "IXO address too long")
  .regex(/^ixo[a-z0-9]{37,41}$/, "Invalid IXO address format");

/**
 * Authentication Schemas (IXO)
 */
export const pinAuthSchema = z
  .object({
    phoneNumber: phoneNumberSchema,
    pin: pinSchema,
    address: ixoAddressSchema.optional(),
  })
  .strict();

export type PinAuth = z.infer<typeof pinAuthSchema>;

/**
 * Transaction Schemas (IXO)
 */
export const sendTransactionSchema = z
  .object({
    fromAddress: ixoAddressSchema,
    toAddress: ixoAddressSchema,
    amount: amountSchema,
    pin: pinSchema,
    memo: z.string().max(256).optional(),
  })
  .strict();

export type SendTransaction = z.infer<typeof sendTransactionSchema>;

/**
 * Validation Helper Functions (IXO)
 */
export function validateIxoAddress(address: string): {
  isValid: boolean;
  error?: string;
} {
  try {
    ixoAddressSchema.parse(address);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.issues[0].message };
    }
    return { isValid: false, error: "Invalid IXO address" };
  }
}
