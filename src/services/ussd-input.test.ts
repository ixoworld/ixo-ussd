import { describe, it, expect } from "vitest";
import { EVENT_TYPES, EVENT_INPUTS } from "../constants/navigation.js";
import { USSDInputService } from "./ussd-input.js";

describe("USSDInputService.parseInput", () => {
  const service = new USSDInputService();

  describe("Empty and initial inputs", () => {
    it("should handle empty input", () => {
      expect(service.parseInput("")).toEqual({
        type: EVENT_TYPES.START,
        value: "",
      });
    });

    it("should handle whitespace-only input", () => {
      expect(service.parseInput("   ")).toEqual({
        type: EVENT_TYPES.START,
        value: "",
      });
    });

    it("should handle undefined input", () => {
      expect(service.parseInput(undefined as any)).toEqual({
        type: EVENT_TYPES.START,
        value: "",
      });
    });
  });

  describe("Direct navigation commands", () => {
    it('should handle direct back command "0"', () => {
      expect(service.parseInput("0")).toEqual({
        type: EVENT_TYPES.INPUT,
        value: EVENT_INPUTS.BACK,
      });
    });

    it('should handle direct back command "back"', () => {
      expect(service.parseInput("back")).toEqual({
        type: EVENT_TYPES.INPUT,
        value: EVENT_INPUTS.BACK,
      });
    });

    it('should handle direct exit command "*"', () => {
      expect(service.parseInput("*")).toEqual({
        type: EVENT_TYPES.INPUT,
        value: EVENT_INPUTS.EXIT,
      });
    });

    it('should handle direct exit command "exit"', () => {
      expect(service.parseInput("exit")).toEqual({
        type: EVENT_TYPES.INPUT,
        value: EVENT_INPUTS.EXIT,
      });
    });

    it('should handle direct exit command "cancel"', () => {
      expect(service.parseInput("cancel")).toEqual({
        type: EVENT_TYPES.INPUT,
        value: EVENT_INPUTS.EXIT,
      });
    });

    it("should handle case-insensitive navigation commands", () => {
      expect(service.parseInput("BACK")).toEqual({
        type: EVENT_TYPES.INPUT,
        value: EVENT_INPUTS.BACK,
      });
      expect(service.parseInput("EXIT")).toEqual({
        type: EVENT_TYPES.INPUT,
        value: EVENT_INPUTS.EXIT,
      });
      expect(service.parseInput("Cancel")).toEqual({
        type: EVENT_TYPES.INPUT,
        value: EVENT_INPUTS.EXIT,
      });
    });
  });

  describe("Simple menu selections", () => {
    it("should handle single digit inputs", () => {
      expect(service.parseInput("1")).toEqual({
        type: EVENT_TYPES.INPUT,
        value: "1",
      });
      expect(service.parseInput("2")).toEqual({
        type: EVENT_TYPES.INPUT,
        value: "2",
      });
      expect(service.parseInput("9")).toEqual({
        type: EVENT_TYPES.INPUT,
        value: "9",
      });
    });

    it("should handle text inputs", () => {
      expect(service.parseInput("John")).toEqual({
        type: EVENT_TYPES.INPUT,
        value: "John",
      });
      expect(service.parseInput("hello world")).toEqual({
        type: EVENT_TYPES.INPUT,
        value: "hello world",
      });
    });
  });

  describe("Cumulative USSD inputs", () => {
    it("should extract last part from cumulative input", () => {
      expect(service.parseInput("1*2")).toEqual({
        type: EVENT_TYPES.INPUT,
        value: "2",
      });
      expect(service.parseInput("1*2*3")).toEqual({
        type: EVENT_TYPES.INPUT,
        value: "3",
      });
      expect(service.parseInput("2*2*John Doe")).toEqual({
        type: EVENT_TYPES.INPUT,
        value: "John Doe",
      });
    });

    it("should handle navigation commands in cumulative input - THIS IS THE BUG", () => {
      // These should be recognized as navigation commands, not regular input
      expect(service.parseInput("1*1*0")).toEqual({
        type: EVENT_TYPES.INPUT,
        value: EVENT_INPUTS.BACK,
      });
      expect(service.parseInput("2*3**")).toEqual({
        type: EVENT_TYPES.INPUT,
        value: EVENT_INPUTS.EXIT,
      });
      expect(service.parseInput("1*back")).toEqual({
        type: EVENT_TYPES.INPUT,
        value: EVENT_INPUTS.BACK,
      });
      expect(service.parseInput("2*exit")).toEqual({
        type: EVENT_TYPES.INPUT,
        value: EVENT_INPUTS.EXIT,
      });
      expect(service.parseInput("1*2*cancel")).toEqual({
        type: EVENT_TYPES.INPUT,
        value: EVENT_INPUTS.EXIT,
      });
    });

    it("should handle edge cases with asterisks", () => {
      expect(service.parseInput("*1")).toEqual({
        type: EVENT_TYPES.INPUT,
        value: "1",
      });
      expect(service.parseInput("**")).toEqual({
        type: EVENT_TYPES.INPUT,
        value: EVENT_INPUTS.EXIT,
      });
      expect(service.parseInput("1**2")).toEqual({
        type: EVENT_TYPES.INPUT,
        value: EVENT_INPUTS.EXIT,
      });
    });
  });

  describe("Whitespace handling", () => {
    it("should trim whitespace from inputs", () => {
      expect(service.parseInput("  1  ")).toEqual({
        type: EVENT_TYPES.INPUT,
        value: "1",
      });
      expect(service.parseInput("  back  ")).toEqual({
        type: EVENT_TYPES.INPUT,
        value: EVENT_INPUTS.BACK,
      });
      expect(service.parseInput("  1*2*John  ")).toEqual({
        type: EVENT_TYPES.INPUT,
        value: "John",
      });
    });
  });
});
