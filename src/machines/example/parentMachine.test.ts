import { describe, it, expect } from "vitest";
import { createActor } from "xstate";
import { exampleMachine } from "./parentMachine.js";

describe("exampleMachine - Smoke Tests", () => {
  const mockInput = {
    sessionId: "test-session-123",
    phoneNumber: "+260987654321",
    serviceCode: "*2233#",
    walletId: "C21009802",
    currentBalance: 100,
  };

  describe("Basic Functionality", () => {
    it("should create and start successfully", () => {
      const actor = createActor(exampleMachine, { input: mockInput });
      actor.start();

      const snapshot = actor.getSnapshot();
      expect(snapshot).toBeDefined();
      expect(snapshot.context.sessionId).toBe("test-session-123");
    });

    it("should handle DIAL_USSD event", () => {
      const actor = createActor(exampleMachine, { input: mockInput });
      actor.start();

      actor.send({
        type: "DIAL_USSD",
        phoneNumber: "+260987654321",
        serviceCode: "*2233#",
      });

      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBeDefined();
      expect(snapshot.context).toBeDefined();
    });

    it("should handle input events", () => {
      const actor = createActor(exampleMachine, { input: mockInput });
      actor.start();

      actor.send({ type: "INPUT", input: "1" });

      const snapshot = actor.getSnapshot();
      expect(snapshot).toBeDefined();
    });

    it("should handle session close", () => {
      const actor = createActor(exampleMachine, { input: mockInput });
      actor.start();

      actor.send({ type: "INPUT", input: "0" });

      const snapshot = actor.getSnapshot();
      expect(snapshot).toBeDefined();
    });
  });
});
