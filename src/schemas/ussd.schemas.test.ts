import {
  amountSchema,
  phoneNumberSchema,
  pinSchema,
  serviceCodeSchema,
  sessionIdSchema,
  ussdRequestSchema,
  validatePhoneNumber,
  validatePin,
} from "./ussd.schemas.js";

describe("USSD Validation Schemas", () => {
  describe("phoneNumberSchema", () => {
    it("should validate correct phone numbers", () => {
      const validNumbers = [
        "+1234567890",
        "1234567890",
        "+254712345678",
        "254712345678",
        "+27123456789",
      ];

      validNumbers.forEach(number => {
        expect(() => phoneNumberSchema.parse(number)).not.toThrow();
      });
    });

    it("should normalize phone numbers correctly", () => {
      expect(phoneNumberSchema.parse("+1234567890")).toBe("1234567890");
      expect(phoneNumberSchema.parse("01234567890")).toBe("1234567890");
      expect(phoneNumberSchema.parse("1234567890")).toBe("1234567890");
    });

    it("should reject invalid phone numbers", () => {
      expect(() => phoneNumberSchema.parse("")).toThrow();
      expect(() => phoneNumberSchema.parse("123")).toThrow();
      expect(() => phoneNumberSchema.parse("abcdefghij")).toThrow(); // no digits
      expect(() => phoneNumberSchema.parse("0000000000")).toThrow();
    });
  });

  describe("sessionIdSchema", () => {
    it("should validate correct session IDs", () => {
      const validIds = [
        "session123",
        "ABC-123-DEF",
        "uuid-like-session-id",
        "12345",
        "a1b2c3d4e5f6",
      ];

      validIds.forEach(id => {
        expect(() => sessionIdSchema.parse(id)).not.toThrow();
      });
    });

    it("should reject invalid session IDs", () => {
      const invalidIds = [
        "",
        "session with spaces",
        "session@123",
        "session#123",
        "a".repeat(101), // too long
      ];

      invalidIds.forEach(id => {
        expect(() => sessionIdSchema.parse(id)).toThrow();
      });
    });
  });

  describe("serviceCodeSchema", () => {
    it("should validate correct USSD service codes", () => {
      const validCodes = [
        "*123#",
        "*123*456#",
        "*123*456*789#",
        "*2233#",
        "*144*1*1#",
      ];

      validCodes.forEach(code => {
        expect(() => serviceCodeSchema.parse(code)).not.toThrow();
      });
    });

    it("should reject invalid service codes", () => {
      const invalidCodes = [
        "",
        "123",
        "*abc#",
        "*123",
        "#123*",
        "*123*#456#",
        "not-a-ussd-code",
      ];

      invalidCodes.forEach(code => {
        expect(() => serviceCodeSchema.parse(code)).toThrow();
      });
    });
  });

  describe("pinSchema", () => {
    it("should validate correct PINs", () => {
      const validPins = ["1234", "0000", "123456"];

      validPins.forEach(pin => {
        expect(() => pinSchema.parse(pin)).not.toThrow();
      });
    });

    it("should reject invalid PINs", () => {
      const invalidPins = [
        "",
        "123", // too short
        "1234567", // too long
        "abcd",
        "12a4",
        "1234 ",
      ];

      invalidPins.forEach(pin => {
        expect(() => pinSchema.parse(pin)).toThrow();
      });
    });
  });

  describe("amountSchema", () => {
    it("should validate and transform correct amounts", () => {
      expect(amountSchema.parse("100")).toBe(100);
      expect(amountSchema.parse("100.50")).toBe(100.5);
      expect(amountSchema.parse("0.01")).toBe(0.01);
      expect(amountSchema.parse("999999.99")).toBe(999999.99);
    });

    it("should reject invalid amounts", () => {
      const invalidAmounts = [
        "",
        "0",
        "-100",
        "abc",
        "100.123", // too many decimals
        "1000001", // exceeds limit
      ];

      invalidAmounts.forEach(amount => {
        expect(() => amountSchema.parse(amount)).toThrow();
      });
    });
  });

  // IXO-specific tests moved to ixo.schemas.test.ts

  describe("ussdRequestSchema", () => {
    it("should validate complete USSD request", () => {
      const validRequest = {
        sessionId: "session123",
        serviceCode: "*2233#",
        phoneNumber: "+1234567890",
        text: "1",
      };

      const result = ussdRequestSchema.parse(validRequest);
      expect(result).toEqual({
        sessionId: "session123",
        serviceCode: "*2233#",
        phoneNumber: "1234567890", // normalized
        text: "1",
      });
    });

    it("should handle optional text field", () => {
      const requestWithoutText = {
        sessionId: "session123",
        serviceCode: "*2233#",
        phoneNumber: "+1234567890",
      };

      const result = ussdRequestSchema.parse(requestWithoutText);
      expect(result.text).toBe(""); // default value
    });

    it("should reject invalid USSD requests", () => {
      const invalidRequests = [
        {}, // missing all fields
        { sessionId: "session123" }, // missing required fields
        {
          sessionId: "",
          serviceCode: "*2233#",
          phoneNumber: "+1234567890",
        }, // invalid sessionId
        {
          sessionId: "session123",
          serviceCode: "invalid",
          phoneNumber: "+1234567890",
        }, // invalid serviceCode
      ];

      invalidRequests.forEach(request => {
        expect(() => ussdRequestSchema.parse(request)).toThrow();
      });
    });
  });

  describe("validation helper functions", () => {
    describe("validatePhoneNumber", () => {
      it("should return valid result for correct phone numbers", () => {
        const result = validatePhoneNumber("+1234567890");
        expect(result.isValid).toBe(true);
        expect(result.normalized).toBe("1234567890");
        expect(result.error).toBeUndefined();
      });

      it("should return error for invalid phone numbers", () => {
        const result = validatePhoneNumber("invalid");
        expect(result.isValid).toBe(false);
        expect(result.normalized).toBeUndefined();
        expect(result.error).toBeDefined();
      });
    });

    describe("validatePin", () => {
      it("should return valid result for correct PINs", () => {
        const result = validatePin("1234");
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it("should return error for invalid PINs", () => {
        const result = validatePin("invalid");
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    // validateIxoAddress tests moved to ixo.schemas.test.ts
  });

  describe("edge cases and security", () => {
    it("should handle very long inputs gracefully", () => {
      const longString = "a".repeat(10000);
      expect(() => phoneNumberSchema.parse(longString)).toThrow();
      expect(() => sessionIdSchema.parse(longString)).toThrow();
    });

    it("should handle special characters in session ID", () => {
      expect(() => sessionIdSchema.parse("session<script>")).toThrow();
      expect(() => sessionIdSchema.parse('session"injection"')).toThrow();
    });

    it("should normalize phone numbers consistently", () => {
      const variations = ["+1234567890", "01234567890", "1234567890"];

      const normalized = variations.map(num => phoneNumberSchema.parse(num));
      expect(normalized).toEqual(["1234567890", "1234567890", "1234567890"]);
    });

    it("should enforce strict object validation", () => {
      const requestWithExtra = {
        sessionId: "session123",
        serviceCode: "*2233#",
        phoneNumber: "+1234567890",
        text: "1",
        extraField: "should be rejected",
      };

      expect(() => ussdRequestSchema.parse(requestWithExtra)).toThrow();
    });
  });
});
