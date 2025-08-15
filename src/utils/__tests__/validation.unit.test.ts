import { describe, expect, it } from "vitest";
import { validateAmount, validateCustomerId } from "../input-validation.js";

// Helper functions for tests
const validatePhoneNumberSimple = (phone: string): boolean => {
  const kenyanPhoneRegex = /^\+254[1-9]\d{8}$/;
  return kenyanPhoneRegex.test(phone);
};

const validatePinSimple = (pin: string): boolean => {
  return /^\d{5}$/.test(pin);
};

const validateAmountSimple = (amount: string): boolean => {
  const result = validateAmount(amount);
  return result.isValid;
};

const validateWalletId = (walletId: string): boolean => {
  const result = validateCustomerId(walletId);
  return result.isValid;
};

const formatPhoneNumber = (phone: string): string => {
  // Remove spaces and format to Kenyan standard
  const cleaned = phone.replace(/\s+/g, "");

  if (cleaned.startsWith("0")) {
    return "+254" + cleaned.substring(1);
  }

  if (cleaned.startsWith("254")) {
    return "+" + cleaned;
  }

  if (cleaned.startsWith("+254")) {
    return cleaned;
  }

  return phone; // Return as-is if format not recognized
};

const sanitizeInputLocal = (input: string): string => {
  return input.trim().replace(/[^\w\s+@.-]/g, "");
};

describe("Validation Utilities", () => {
  describe("Phone Number Validation", () => {
    it("should validate correct Kenyan phone numbers", () => {
      expect(validatePhoneNumberSimple("+254712345678")).toBe(true);
      expect(validatePhoneNumberSimple("+254722345678")).toBe(true);
      expect(validatePhoneNumberSimple("+254732345678")).toBe(true);
    });

    it("should reject invalid phone numbers", () => {
      expect(validatePhoneNumberSimple("254712345678")).toBe(false); // Missing +
      expect(validatePhoneNumberSimple("+25471234567")).toBe(false); // Too short
      expect(validatePhoneNumberSimple("+2547123456789")).toBe(false); // Too long
      expect(validatePhoneNumberSimple("+254012345678")).toBe(false); // Invalid network code
      expect(validatePhoneNumberSimple("invalid")).toBe(false);
      expect(validatePhoneNumberSimple("")).toBe(false);
    });

    it("should format phone numbers correctly", () => {
      expect(formatPhoneNumber("0712345678")).toBe("+254712345678");
      expect(formatPhoneNumber("254712345678")).toBe("+254712345678");
      expect(formatPhoneNumber("+254712345678")).toBe("+254712345678");
      expect(formatPhoneNumber("071 234 5678")).toBe("+254712345678");
    });

    it("should handle edge cases in phone formatting", () => {
      expect(formatPhoneNumber("")).toBe("");
      expect(formatPhoneNumber("invalid")).toBe("invalid");
      expect(formatPhoneNumber("+1234567890")).toBe("+1234567890"); // Non-Kenyan number
    });
  });

  describe("PIN Validation", () => {
    it("should validate correct PINs", () => {
      expect(validatePinSimple("12345")).toBe(true);
      expect(validatePinSimple("00000")).toBe(true);
      expect(validatePinSimple("99999")).toBe(true);
    });

    it("should reject invalid PINs", () => {
      expect(validatePinSimple("123")).toBe(false); // Too short
      expect(validatePinSimple("123456")).toBe(false); // Too long
      expect(validatePinSimple("abcd")).toBe(false); // Non-numeric
      expect(validatePinSimple("12a4")).toBe(false); // Mixed
      expect(validatePinSimple("")).toBe(false); // Empty
      expect(validatePinSimple("12 34")).toBe(false); // With space
    });
  });

  describe("Amount Validation", () => {
    it("should validate correct amounts", () => {
      expect(validateAmountSimple("100")).toBe(true);
      expect(validateAmountSimple("1000.50")).toBe(true);
      expect(validateAmountSimple("0.01")).toBe(true);
      expect(validateAmountSimple("999999")).toBe(true);
    });

    it("should reject invalid amounts", () => {
      expect(validateAmountSimple("0")).toBe(false); // Zero
      expect(validateAmountSimple("-100")).toBe(false); // Negative
      expect(validateAmountSimple("1000001")).toBe(false); // Too large
      expect(validateAmountSimple("abc")).toBe(false); // Non-numeric
      expect(validateAmountSimple("")).toBe(false); // Empty
      expect(validateAmountSimple("100.123")).toBe(false); // Too many decimals
    });

    it("should handle edge cases", () => {
      expect(validateAmountSimple("1000000")).toBe(true); // Maximum allowed
      expect(validateAmountSimple("1000000.01")).toBe(false); // Just over maximum
      expect(validateAmountSimple("   100   ")).toBe(true); // With whitespace
    });
  });

  describe("Customer ID Validation", () => {
    it("should validate correct Customer IDs", () => {
      expect(validateWalletId("C12345678")).toBe(true);
      expect(validateWalletId("C00000000")).toBe(true);
      expect(validateWalletId("C99999999")).toBe(true);
    });

    it("should reject invalid wallet IDs", () => {
      expect(validateWalletId("1234567")).toBe(false); // Missing C
      expect(validateWalletId("C1234567")).toBe(false); // Too short
      expect(validateWalletId("C123456789")).toBe(false); // Too long
      expect(validateWalletId("c12345678")).toBe(true); // Lowercase C (auto-corrected)
      expect(validateWalletId("CA2345678")).toBe(false); // Letter in number part
      expect(validateWalletId("")).toBe(false); // Empty
    });
  });

  describe("Input Sanitization", () => {
    it("should sanitize dangerous characters", () => {
      expect(sanitizeInputLocal("Hello World")).toBe("Hello World");
      expect(sanitizeInputLocal("test@example.com")).toBe("test@example.com");
      expect(sanitizeInputLocal("+254712345678")).toBe("+254712345678");
    });

    it("should remove dangerous characters", () => {
      expect(sanitizeInputLocal('<script>alert("xss")</script>')).toBe(
        "scriptalertxssscript"
      );
      expect(sanitizeInputLocal("test<>[]{}|")).toBe("test");
      expect(sanitizeInputLocal("valid-name_123")).toBe("valid-name_123");
    });

    it("should trim whitespace", () => {
      expect(sanitizeInputLocal("   test   ")).toBe("test");
      expect(sanitizeInputLocal("\t\ntest\r\n")).toBe("test");
    });

    it("should handle empty and edge cases", () => {
      expect(sanitizeInputLocal("")).toBe("");
      expect(sanitizeInputLocal("   ")).toBe("");
      expect(sanitizeInputLocal("123.45")).toBe("123.45");
    });
  });
});

describe("Business Logic Validation", () => {
  describe("Transaction Limits", () => {
    const checkDailyLimit = (amount: number, dailySpent: number): boolean => {
      const DAILY_LIMIT = 50000; // KES 50,000
      return dailySpent + amount <= DAILY_LIMIT;
    };

    const checkMinimumBalance = (
      currentBalance: number,
      amount: number
    ): boolean => {
      const MINIMUM_BALANCE = 10; // KES 10
      return currentBalance - amount >= MINIMUM_BALANCE;
    };

    it("should enforce daily transaction limits", () => {
      expect(checkDailyLimit(1000, 0)).toBe(true); // First transaction
      expect(checkDailyLimit(1000, 49000)).toBe(true); // Within limit
      expect(checkDailyLimit(1000, 49500)).toBe(false); // Exceeds limit
      expect(checkDailyLimit(50000, 1)).toBe(false); // Single large transaction exceeds
    });

    it("should enforce minimum balance requirements", () => {
      expect(checkMinimumBalance(1000, 100)).toBe(true); // Sufficient balance
      expect(checkMinimumBalance(100, 90)).toBe(true); // Exactly minimum
      expect(checkMinimumBalance(100, 91)).toBe(false); // Below minimum
      expect(checkMinimumBalance(10, 1)).toBe(false); // Would leave less than minimum
    });
  });

  describe("Session Security", () => {
    const isValidSessionTimeout = (
      lastActivity: Date,
      timeoutMinutes: number = 5
    ): boolean => {
      const now = new Date();
      const diffMinutes =
        (now.getTime() - lastActivity.getTime()) / (1000 * 60);
      return diffMinutes <= timeoutMinutes;
    };

    const generateSessionId = (): string => {
      return (
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15)
      );
    };

    it("should validate session timeouts", () => {
      const now = new Date();
      const fourMinutesAgo = new Date(now.getTime() - 4 * 60 * 1000);
      const sixMinutesAgo = new Date(now.getTime() - 6 * 60 * 1000);

      expect(isValidSessionTimeout(now)).toBe(true);
      expect(isValidSessionTimeout(fourMinutesAgo)).toBe(true);
      expect(isValidSessionTimeout(sixMinutesAgo)).toBe(false);
    });

    it("should generate unique session IDs", () => {
      const id1 = generateSessionId();
      const id2 = generateSessionId();

      expect(id1).not.toBe(id2);
      expect(id1.length).toBeGreaterThan(10);
      expect(id2.length).toBeGreaterThan(10);
    });
  });
});
