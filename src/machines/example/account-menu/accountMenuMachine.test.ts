import { describe, it, expect } from "vitest";
import { createActor } from "xstate";
import { accountMenuMachine, AccountMenuOutput } from "./accountMenuMachine.js";

describe("accountMenuMachine", () => {
  const mockInput = {
    sessionId: "test-session-123",
    phoneNumber: "+260971230000",
    serviceCode: "*2233#",
  };

  describe("Initial State", () => {
    it("should start directly in showMenu state with proper context", () => {
      const actor = createActor(accountMenuMachine, { input: mockInput });
      actor.start();
      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe("showMenu");
      expect(snapshot.context.sessionId).toBe("test-session-123");
      expect(snapshot.context.phoneNumber).toBe("+260971230000");
      expect(snapshot.context.serviceCode).toBe("*2233#");
      expect(snapshot.context.message).toContain("Account Menu");
      expect(snapshot.context.message).toContain(
        "Do you have an existing account?"
      );
      expect(snapshot.context.error).toBeUndefined();
    });
  });

  describe("Login State", () => {
    it("should transition directly to parent via routeToMain", () => {
      const actor = createActor(accountMenuMachine, { input: mockInput });
      actor.start();
      actor.send({ type: "INPUT", input: "1" });
      const snapshot = actor.getSnapshot();
      expect(snapshot.value === "routeToMain").toBe(true);
      expect(snapshot.context.error).toBeUndefined();
      expect(snapshot.output).toEqual({
        result: AccountMenuOutput.LOGIN_SELECTED,
      });
    });
    it("should send CREATE_SELECTED to parent as next state", () => {
      const actor = createActor(accountMenuMachine, { input: mockInput });
      actor.start();
      actor.send({ type: "INPUT", input: "2" });
      const snapshot = actor.getSnapshot();
      expect(snapshot.value === "routeToMain").toBe(true);
      expect(snapshot.context.error).toBeUndefined();
      expect(snapshot.output).toEqual({
        result: AccountMenuOutput.CREATE_SELECTED,
      });
    });
  });
});
