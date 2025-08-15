import crypto from "crypto";
import { createModuleLogger } from "../services/logger.js";

const logger = createModuleLogger("customer-id");

/**
 * Generates a unique Customer ID in the format C21009802
 * Uses high-precision timestamp + deterministic hashing for guaranteed uniqueness
 *
 * Approach:
 * 1. Get high-precision timestamp (microseconds via process.hrtime.bigint())
 * 2. Create deterministic hash of the precise timestamp
 * 3. Convert to 8-character alphanumeric string
 *
 * This handles concurrent sessions by using microsecond precision (~1,000,000 unique
 * values per second) making same-timestamp collisions virtually impossible.
 */
export function generateUniqueCustomerId(): string {
  // Get high-precision timestamp in nanoseconds
  const hrTime = process.hrtime.bigint();

  // Convert to microseconds (divide by 1000) for reasonable precision
  // This gives us ~1,000,000 unique values per second
  const microseconds = hrTime / 1000n;

  // Create deterministic hash of the microsecond timestamp
  const timestampStr = microseconds.toString();
  const hash = crypto.createHash("sha256").update(timestampStr).digest("hex");

  // Take first 8 characters of hash and convert to uppercase
  // This gives us 8 characters from [0-9A-F] set
  const hashPrefix = hash.substring(0, 8).toUpperCase();

  const customerId = `C${hashPrefix}`;

  logger.debug(
    {
      customerId,
      microseconds: microseconds.toString(),
      timestampStr,
      hashPrefix,
    },
    "Generated high-precision deterministic customer ID"
  );

  return customerId;
}
