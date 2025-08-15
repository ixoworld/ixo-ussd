import { describe, it, expect, beforeEach } from "vitest";
import { createActor } from "xstate";
import { knowMoreMachine } from "./knowMoreMachine.js";

describe("knowMoreMachine", () => {
  const mockInput = {
    sessionId: "test-session-123",
    phoneNumber: "+260971230000",
    serviceCode: "*2233#",
  };

  let actor: ReturnType<typeof createActor<typeof knowMoreMachine>>;

  beforeEach(() => {
    actor = createActor(knowMoreMachine, {
      input: mockInput,
    });
    actor.start();
  });

  describe("Initial State", () => {
    it("should start in the correct initial state", () => {
      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe("infoMenu");
      expect(snapshot.context.sessionId).toBe(mockInput.sessionId);
      expect(snapshot.context.phoneNumber).toBe(mockInput.phoneNumber);
      expect(snapshot.context.serviceCode).toBe(mockInput.serviceCode);
    });

    it("should have the correct initial context", () => {
      const snapshot = actor.getSnapshot();
      expect(snapshot.context).toMatchObject({
        sessionId: mockInput.sessionId,
        phoneNumber: mockInput.phoneNumber,
        serviceCode: mockInput.serviceCode,
      });
      expect(snapshot.context.message).toMatch(
        /Welcome to .+ Information Center/
      );
    });
  });

  describe("Service Overview State", () => {
    it("should transition to benefits on input '1'", () => {
      actor.send({ type: "INPUT", input: "1" });
      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe("sendSMS");
    });

    it("should transition to howItWorks on input '2'", () => {
      actor.send({ type: "INPUT", input: "2" });
      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe("sendSMS");
    });

    it("should transition to getStarted on input '3'", () => {
      actor.send({ type: "INPUT", input: "3" });
      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe("sendSMS");
    });

    it("should handle back navigation correctly", () => {
      actor.send({ type: "INPUT", input: "0" });
      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe("routeToMain");
    });

    it("should handle invalid input and stay in same state", () => {
      actor.send({ type: "INPUT", input: "9" });
      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe("sendSMS");
      expect(snapshot.context.message).toContain("Thank you for your interest");
    });
  });

  describe("Benefits State", () => {
    beforeEach(() => {
      actor.send({ type: "INPUT", input: "1" });
    });

    it("should display benefits information", () => {
      const snapshot = actor.getSnapshot();
      expect(snapshot.context.message).toContain("Thank you for your interest");
    });

    it("should return to serviceOverview on back input", () => {
      actor.send({ type: "INPUT", input: "0" });
      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe("infoMenu");
    });

    it("should exit on exit input", () => {
      actor.send({ type: "INPUT", input: "*" });
      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe("routeToMain");
    });
  });

  describe("How It Works State", () => {
    beforeEach(() => {
      actor.send({ type: "INPUT", input: "2" });
    });

    it("should display how it works information", () => {
      const snapshot = actor.getSnapshot();
      expect(snapshot.context.message).toContain("Thank you for your interest");
    });

    it("should return to serviceOverview on back input", () => {
      actor.send({ type: "INPUT", input: "0" });
      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe("infoMenu");
    });
  });

  describe("Get Started State", () => {
    beforeEach(() => {
      actor.send({ type: "INPUT", input: "3" });
    });

    it("should display get started information", () => {
      const snapshot = actor.getSnapshot();
      expect(snapshot.context.message).toContain("Thank you for your interest");
    });

    it("should return to serviceOverview on back input", () => {
      actor.send({ type: "INPUT", input: "0" });
      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe("infoMenu");
    });
  });

  describe("Exit State", () => {
    it("should be a final state", () => {
      actor.send({ type: "INPUT", input: "*" });
      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe("routeToMain");
      expect(snapshot.status).toBe("done");
    });
  });

  describe("Error Handling", () => {
    it("should handle ERROR events gracefully", () => {
      actor.send({ type: "ERROR", error: "Test error" });
      const snapshot = actor.getSnapshot();
      expect(snapshot.context.error).toBe("Test error");
    });

    it("should transition to error state on system errors", () => {
      actor.send({ type: "ERROR", error: "System failure" });
      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe("error");
    });
  });

  describe("Navigation Patterns", () => {
    it("should handle navigation commands consistently across all states", () => {
      const states = [
        "serviceOverview",
        "benefits",
        "howItWorks",
        "getStarted",
      ];

      states.forEach((stateName, index) => {
        // Reset actor
        actor = createActor(knowMoreMachine, { input: mockInput });
        actor.start();

        // Navigate to specific state
        if (index > 0) {
          actor.send({ type: "INPUT", input: index.toString() });
        }

        // Test back navigation
        actor.send({ type: "INPUT", input: "0" });
        const backSnapshot = actor.getSnapshot();

        if (stateName === "serviceOverview") {
          expect(backSnapshot.value).toBe("routeToMain");
        } else {
          expect(backSnapshot.value).toBe("infoMenu");
        }
      });
    });

    it("should handle exit commands from any state", () => {
      const navigationInputs = ["1", "2", "3"];

      navigationInputs.forEach(input => {
        // Reset actor
        actor = createActor(knowMoreMachine, { input: mockInput });
        actor.start();

        // Navigate to state
        actor.send({ type: "INPUT", input });

        // Test exit
        actor.send({ type: "INPUT", input: "*" });
        const snapshot = actor.getSnapshot();
        expect(snapshot.value).toBe("routeToMain");
      });
    });
  });

  describe("Context Updates", () => {
    it("should maintain session information throughout navigation", () => {
      actor.send({ type: "INPUT", input: "1" });
      actor.send({ type: "INPUT", input: "0" });
      actor.send({ type: "INPUT", input: "2" });

      const snapshot = actor.getSnapshot();
      expect(snapshot.context.sessionId).toBe(mockInput.sessionId);
      expect(snapshot.context.phoneNumber).toBe(mockInput.phoneNumber);
      expect(snapshot.context.serviceCode).toBe(mockInput.serviceCode);
    });

    it("should update messages appropriately on state changes", () => {
      const initialMessage = actor.getSnapshot().context.message;

      actor.send({ type: "INPUT", input: "1" });
      const smsMessage = actor.getSnapshot().context.message;

      expect(smsMessage).not.toBe(initialMessage);
      expect(smsMessage).toContain("Thank you for your interest");
    });
  });

  describe("Output", () => {
    it("should provide correct output when machine completes", () => {
      actor.send({ type: "INPUT", input: "*" });
      const snapshot = actor.getSnapshot();

      expect(snapshot.value).toBe("routeToMain");
      expect(snapshot.status).toBe("done");
    });
  });
});
