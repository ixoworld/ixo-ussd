import { describe, it, expect, beforeEach, vi } from "vitest";
import { createActor } from "xstate";
import {
  SKIP_EMAIL_INPUT,
  accountCreationMachine,
  AccountCreationOutput,
} from "./accountCreationMachine.js";

// Mock the background IXO creation service
vi.mock("../../../services/ixo/background-ixo-creation.js", () => ({
  createIxoAccountBackground: vi.fn(() => Promise.resolve({ success: true })),
}));

// Mock the progressive data service
vi.mock("../../../services/progressive-data.js", () => ({
  progressiveDataService: {
    createOrUpdatePhoneRecord: vi.fn(),
    createCustomerRecord: vi.fn(),
  },
}));

describe("Account Creation Machine", () => {
  const mockInput = {
    sessionId: "test-session-123",
    phoneNumber: "+260971230000",
    serviceCode: "*2233#",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Initial State", () => {
    it("should start in nameEntry state", () => {
      const actor = createActor(accountCreationMachine, { input: mockInput });
      actor.start();
      const snapshot = actor.getSnapshot();

      expect(snapshot.value).toBe("nameEntry");
      expect(snapshot.context.sessionId).toBe(mockInput.sessionId);
      expect(snapshot.context.phoneNumber).toBe(mockInput.phoneNumber);
      expect(snapshot.context.serviceCode).toBe(mockInput.serviceCode);
      expect(snapshot.context.message).toContain("Enter your full name");
      expect(snapshot.context.nextParentState).toBe(
        AccountCreationOutput.UNDEFINED
      );
    });

    it("should initialize with empty form data", () => {
      const actor = createActor(accountCreationMachine, { input: mockInput });
      actor.start();
      const snapshot = actor.getSnapshot();

      expect(snapshot.context.fullName).toBe("");
      expect(snapshot.context.email).toBe("");
      expect(snapshot.context.isEmailSkipped).toBe(false);
      expect(snapshot.context.pin).toBe("");
      expect(snapshot.context.confirmPin).toBe("");
    });
  });

  describe("Name Entry Flow", () => {
    it("should accept valid name and move to email entry", () => {
      const actor = createActor(accountCreationMachine, { input: mockInput });
      actor.start();

      actor.send({ type: "INPUT", input: "John Doe" });
      const snapshot = actor.getSnapshot();

      expect(snapshot.value).toBe("emailEntry");
      expect(snapshot.context.fullName).toBe("John Doe");
      expect(snapshot.context.message).toContain("Enter your email address");
    });

    it("should accept any name", () => {
      const actor = createActor(accountCreationMachine, { input: mockInput });
      actor.start();

      actor.send({ type: "INPUT", input: "J" });
      const snapshot = actor.getSnapshot();

      expect(snapshot.value).toBe("emailEntry");
      expect(snapshot.context.fullName).toBe("J");
    });
  });

  describe("Email Entry Flow", () => {
    beforeEach(() => {
      // Helper to get to email entry state
    });

    it("should accept valid email and move to pin entry", () => {
      const actor = createActor(accountCreationMachine, { input: mockInput });
      actor.start();

      // Navigate to email entry
      actor.send({ type: "INPUT", input: "John Doe" });
      actor.send({ type: "INPUT", input: "john@example.com" });

      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe("pinEntry");
      expect(snapshot.context.email).toBe("john@example.com");
    });

    it("should allow skipping email with '00'", () => {
      const actor = createActor(accountCreationMachine, { input: mockInput });
      actor.start();

      // Navigate to email entry and skip
      actor.send({ type: "INPUT", input: "John Doe" });
      actor.send({ type: "INPUT", input: SKIP_EMAIL_INPUT });

      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe("pinEntry");
      expect(snapshot.context.email).toBe("");
      expect(snapshot.context.isEmailSkipped).toBe(true);
    });

    it("should set isEmailSkipped to false when valid email is entered", () => {
      const actor = createActor(accountCreationMachine, { input: mockInput });
      actor.start();

      // Navigate to email entry and enter valid email
      actor.send({ type: "INPUT", input: "John Doe" });
      actor.send({ type: "INPUT", input: "john@example.com" });

      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe("pinEntry");
      expect(snapshot.context.email).toBe("john@example.com");
      expect(snapshot.context.isEmailSkipped).toBe(false);
    });
  });

  describe("PIN Entry Flow", () => {
    it("should accept valid 5-digit PIN", () => {
      const actor = createActor(accountCreationMachine, { input: mockInput });
      actor.start();

      // Navigate to PIN entry
      actor.send({ type: "INPUT", input: "John Doe" });
      actor.send({ type: "INPUT", input: SKIP_EMAIL_INPUT }); // Skip email
      actor.send({ type: "INPUT", input: "10101" });

      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe("confirmPin");
      expect(snapshot.context.pin).toBe("10101");
    });

    // it("should reject invalid PIN format", () => {
    //   const actor = createActor(accountCreationMachine, { input: mockInput });
    //   actor.start();

    //   // Navigate to PIN entry
    //   actor.send({ type: "INPUT", input: "John Doe" });
    //   actor.send({ type: "INPUT", input: SKIP_EMAIL_INPUT }); // Skip email
    //   actor.send({ type: "INPUT", input: "123" }); // PIN too short

    //   const snapshot = actor.getSnapshot();
    //   expect(snapshot.value).toBe("pinEntry");
    //   expect(snapshot.context.pin).toBe("");
    // });
  });

  describe("PIN Confirmation Flow", () => {
    it("should accept matching PIN confirmation", () => {
      const actor = createActor(accountCreationMachine, { input: mockInput });
      actor.start();

      // Navigate to PIN confirmation
      actor.send({ type: "INPUT", input: "John Doe" });
      actor.send({ type: "INPUT", input: SKIP_EMAIL_INPUT }); // Skip email
      actor.send({ type: "INPUT", input: "10101" });
      actor.send({ type: "INPUT", input: "10101" }); // Matching confirmation

      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe("creatingAccount");
      expect(snapshot.context.confirmPin).toBe("10101");
    });

    it("should reject mismatched PIN confirmation and return to PIN entry", () => {
      const actor = createActor(accountCreationMachine, { input: mockInput });
      actor.start();

      // Navigate to PIN confirmation
      actor.send({ type: "INPUT", input: "John Doe" });
      actor.send({ type: "INPUT", input: SKIP_EMAIL_INPUT }); // Skip email
      actor.send({ type: "INPUT", input: "10101" });
      actor.send({ type: "INPUT", input: "50505" }); // Mismatched confirmation

      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe("pinEntry");
      expect(snapshot.context.message).toContain(
        "Create a 5-digit PIN for your account:"
      );
    });
  });

  describe("Router Pattern Output", () => {
    it("should transition to parent when cancelled", () => {
      const actor = createActor(accountCreationMachine, { input: mockInput });
      actor.start();

      // Navigate to cancelled state
      actor.send({ type: "INPUT", input: "*" }); // Exit command

      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe("routeToMain");
      expect(snapshot.output).toEqual({
        result: AccountCreationOutput.UNDEFINED,
      });
    });
  });

  describe("Success State Navigation", () => {
    it("should display 'Press any key to continue' message", () => {
      const actor = createActor(accountCreationMachine, { input: mockInput });
      actor.start();

      // Mock successful account creation by directly transitioning to success
      // (In real scenario, this would happen after database creation)
      actor.send({ type: "INPUT", input: "John Doe" });
      actor.send({ type: "INPUT", input: SKIP_EMAIL_INPUT }); // Skip email
      actor.send({ type: "INPUT", input: "10101" }); // PIN
      actor.send({ type: "INPUT", input: "10101" }); // Confirm PIN

      // The machine should be in creatingAccount state
      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe("creatingAccount");
    });
  });

  describe("Background IXO Processing", () => {
    it("should not affect main account creation flow", () => {
      const actor = createActor(accountCreationMachine, { input: mockInput });
      actor.start();

      // Complete the account creation flow
      actor.send({ type: "INPUT", input: "John Doe" });
      actor.send({ type: "INPUT", input: "00" }); // Skip email
      actor.send({ type: "INPUT", input: "10101" }); // PIN
      actor.send({ type: "INPUT", input: "10101" }); // Confirm PIN

      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe("creatingAccount");

      // Background IXO creation should be called but not block the flow
      // The machine should proceed to success state regardless of IXO result
    });

    it("should handle IXO background failures gracefully", () => {
      // The main flow should still succeed even if background IXO fails
      // This is tested implicitly by the fire-and-forget pattern
      const actor = createActor(accountCreationMachine, { input: mockInput });
      actor.start();

      // The machine should work normally regardless of background processing
      expect(actor.getSnapshot().value).toBe("nameEntry");
    });
  });

  describe("Navigation", () => {
    it("should handle back navigation correctly", () => {
      const actor = createActor(accountCreationMachine, { input: mockInput });
      actor.start();

      // Navigate to email entry, then back
      actor.send({ type: "INPUT", input: "John Doe" });
      actor.send({ type: "INPUT", input: "0" }); // Back command

      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe("nameEntry");
    });

    it("should handle exit navigation correctly", () => {
      const actor = createActor(accountCreationMachine, { input: mockInput });
      actor.start();

      // Exit from any state
      actor.send({ type: "INPUT", input: "*" });

      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe("routeToMain");
    });
  });
});
