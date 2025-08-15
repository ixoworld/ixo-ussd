/**
 * USSD Input Service
 *
 * Handles parsing of USSD input text into machine events.
 * Processes cumulative USSD inputs and normalizes navigation commands.
 */

import {
  BACK_ALIASES,
  EXIT_ALIASES,
  EVENT_TYPES,
  EVENT_INPUTS,
} from "../constants/navigation.js";

export class USSDInputService {
  /**
   * Parse USSD input text into machine events
   * Handles cumulative USSD inputs like "2*2*John Doe" by extracting the last part
   */
  parseInput(input: string): { type: string; value: string } {
    if (!input) {
      return { type: EVENT_TYPES.START, value: "" };
    }
    const trimmedInput = input.trim();
    // Handle empty input (initial dial)
    if (!trimmedInput) {
      return { type: EVENT_TYPES.START, value: "" };
    }

    // Handle exit command
    if (trimmedInput === "*" || trimmedInput.includes("**")) {
      return { type: EVENT_TYPES.INPUT, value: EVENT_INPUTS.EXIT };
    }

    // Parse cumulative USSD input (e.g., "2*2*John Doe")
    // Extract the last part after the last "*"
    const parts = trimmedInput.split("*");
    const currentInput =
      parts.length > 1 ? parts[parts.length - 1] : trimmedInput;

    // Handle common navigation
    if (
      BACK_ALIASES.includes(
        currentInput.toLowerCase() as (typeof BACK_ALIASES)[number]
      )
    ) {
      return { type: EVENT_TYPES.INPUT, value: EVENT_INPUTS.BACK };
    }

    if (
      EXIT_ALIASES.includes(
        currentInput.toLowerCase() as (typeof EXIT_ALIASES)[number]
      )
    ) {
      return { type: EVENT_TYPES.INPUT, value: EVENT_INPUTS.EXIT };
    }

    return { type: EVENT_TYPES.INPUT, value: currentInput };
  }
}

// Export a singleton instance for convenience
export const ussdInputService = new USSDInputService();
