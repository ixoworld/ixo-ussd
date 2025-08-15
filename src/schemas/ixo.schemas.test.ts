import { describe, expect, it } from "vitest";
import {
  ixoAddressSchema,
  pinAuthSchema,
  sendTransactionSchema,
  validateIxoAddress,
} from "./ixo.schemas.js";
import { amountSchema, phoneNumberSchema, pinSchema } from "./ussd.schemas.js";

describe("IXO Schemas", () => {
  describe("ixoAddressSchema", () => {
    it("should validate correct IXO addresses", () => {
      const validAddresses = [
        "ixo1qwertyuiopasdfghjklzxcvbnm1234567890",
        "ixo1abcdefghijklmnopqrstuvwxyz1234567890",
      ];

      validAddresses.forEach(address => {
        expect(() => ixoAddressSchema.parse(address)).not.toThrow();
      });
    });

    it("should reject invalid IXO addresses", () => {
      const invalidAddresses = [
        "",
        "ixo",
        "ixo1", // too short
        "cosmos1qwertyuiopasdfghjklzxcvbnm1234567890",
        "ixo1UPPERCASE",
        "ixo1address@invalid",
        "ixo1toolongaddressthatexceedsmaximumlengthway",
      ];

      invalidAddresses.forEach(address => {
        expect(() => ixoAddressSchema.parse(address)).toThrow();
      });
    });
  });

  describe("pinAuthSchema", () => {
    it("should validate proper pin auth payload", () => {
      const payload = {
        phoneNumber: phoneNumberSchema.parse("+1234567890"),
        pin: pinSchema.parse("1234"),
        address: "ixo1qwertyuiopasdfghjklzxcvbnm1234567890",
      };
      expect(() => pinAuthSchema.parse(payload)).not.toThrow();
    });

    it("should reject payload with invalid address", () => {
      const payload = {
        phoneNumber: phoneNumberSchema.parse("+1234567890"),
        pin: pinSchema.parse("1234"),
        address: "invalid",
      };
      expect(() => pinAuthSchema.parse(payload)).toThrow();
    });
  });

  describe("sendTransactionSchema", () => {
    it("should validate correct transaction payload", () => {
      const payload = {
        fromAddress: "ixo1qwertyuiopasdfghjklzxcvbnm1234567890",
        toAddress: "ixo1abcdefghijklmnopqrstuvwxyz1234567890",
        amount: "100.00", // amountSchema will transform this to number
        pin: "1234",
        memo: "Test",
      } as any;
      expect(() => sendTransactionSchema.parse(payload)).not.toThrow();
    });

    it("should reject invalid transaction payload", () => {
      const payload = {
        fromAddress: "invalid",
        toAddress: "alsoinvalid",
        amount: amountSchema.parse("100.00"),
        pin: pinSchema.parse("1234"),
      } as any;
      expect(() => sendTransactionSchema.parse(payload)).toThrow();
    });
  });

  describe("validateIxoAddress", () => {
    it("should return valid result for correct addresses", () => {
      const result = validateIxoAddress(
        "ixo1qwertyuiopasdfghjklzxcvbnm1234567890"
      );
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return error for invalid addresses", () => {
      const result = validateIxoAddress("invalid");
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
