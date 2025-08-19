/**
 * Machine Generator Tests - Comprehensive test suite for machine generation
 *
 * Tests cover conversion from parsed Mermaid specs to generated machine specs,
 * context generation, event inference, and category-specific features.
 *
 * @module machine-generator.test
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MachineGenerator, generateMachineSpec } from "./machine-generator.js";
import type {
  ParsedMachineSpec,
  MachineCategory,
  NodeShape,
  TransitionType,
} from "./types/generator-types.js";

describe("MachineGenerator", () => {
  let generator: MachineGenerator;
  let mockParsedSpec: ParsedMachineSpec;

  beforeEach(() => {
    generator = new MachineGenerator();

    // Create a mock parsed spec for testing
    mockParsedSpec = {
      id: "testMachine",
      name: "Test Machine",
      category: "user-machine",
      states: [
        {
          id: "idle",
          label: "Idle State",
          shape: "rect" as NodeShape,
          isFinal: false,
          isInitial: true,
          cssClasses: ["user-machine"],
          metadata: {},
        },
        {
          id: "processing",
          label: "Processing",
          shape: "rect" as NodeShape,
          isFinal: false,
          isInitial: false,
          cssClasses: [],
          metadata: {},
        },
        {
          id: "complete",
          label: "Complete",
          shape: "circle" as NodeShape,
          isFinal: true,
          isInitial: false,
          cssClasses: [],
          metadata: {},
        },
      ],
      transitions: [
        {
          from: "idle",
          to: "processing",
          label: "start process",
          type: "user_input" as TransitionType,
          metadata: {},
        },
        {
          from: "processing",
          to: "complete",
          label: "finish",
          type: "system_action" as TransitionType,
          metadata: {},
        },
        {
          from: "processing",
          to: "idle",
          label: "cancel",
          type: "user_input" as TransitionType,
          guard: "canCancel",
          action: "resetProcess",
          metadata: {},
        },
      ],
      initialState: "idle",
      finalStates: ["complete"],
      metadata: {},
    };
  });

  describe("Basic Machine Generation", () => {
    it("should generate a complete machine spec from parsed spec", () => {
      const result = generator.generateMachineSpec(mockParsedSpec);

      expect(result).toBeDefined();
      expect(result.id).toBe("testmachineMachine");
      expect(result.name).toBe("Test Machine");
      expect(result.category).toBe("user-machine");
      expect(result.initialState).toBe("idle");
    });

    it("should sanitize machine names correctly", () => {
      const testCases = [
        { input: "test-machine", expected: "testmachineMachine" },
        { input: "Test Machine!", expected: "testmachineMachine" },
        { input: "123invalid", expected: "_123invalidMachine" },
        { input: "valid_name", expected: "validnameMachine" },
      ];

      testCases.forEach(({ input, expected }) => {
        const spec = { ...mockParsedSpec, id: input };
        const result = generator.generateMachineSpec(spec);
        expect(result.id).toBe(expected);
      });
    });

    it("should format machine names for display", () => {
      const spec = { ...mockParsedSpec, name: "test-machine-name" };
      const result = generator.generateMachineSpec(spec);
      expect(result.name).toBe("Test Machine Name");
    });
  });

  describe("Context Generation", () => {
    it("should generate category-specific context fields", () => {
      const result = generator.generateMachineSpec(mockParsedSpec);

      expect(result.context).toBeDefined();
      expect(result.context.length).toBeGreaterThan(0);

      // Should include user-machine specific fields
      const phoneNumberField = result.context.find(
        f => f.name === "phoneNumber"
      );
      expect(phoneNumberField).toBeDefined();
      expect(phoneNumberField?.type).toBe("string");

      const sessionIdField = result.context.find(f => f.name === "sessionId");
      expect(sessionIdField).toBeDefined();
    });

    it("should generate different context for different categories", () => {
      const categories: MachineCategory[] = [
        "info-machine",
        "agent-machine",
        "account-machine",
        "core-machine",
      ];

      categories.forEach(category => {
        const spec = { ...mockParsedSpec, category };
        const result = generator.generateMachineSpec(spec);

        expect(result.context.length).toBeGreaterThan(0);
        expect(result.category).toBe(category);
      });
    });

    it("should add error handling context", () => {
      const result = generator.generateMachineSpec(mockParsedSpec);

      const errorField = result.context.find(f => f.name === "error");
      expect(errorField).toBeDefined();
      expect(errorField?.type).toBe("string | null");
      expect(errorField?.defaultValue).toBe("null");
    });

    it("should add user input context for machines with user input", () => {
      const result = generator.generateMachineSpec(mockParsedSpec);

      const userInputField = result.context.find(f => f.name === "userInput");
      expect(userInputField).toBeDefined();
      expect(userInputField?.type).toBe("string");
    });

    it("should add step tracking for complex machines", () => {
      // Add more states to make it complex
      const complexSpec = {
        ...mockParsedSpec,
        states: [
          ...mockParsedSpec.states,
          {
            id: "step1",
            label: "Step 1",
            shape: "rect" as NodeShape,
            isFinal: false,
            isInitial: false,
            cssClasses: [],
            metadata: {},
          },
          {
            id: "step2",
            label: "Step 2",
            shape: "rect" as NodeShape,
            isFinal: false,
            isInitial: false,
            cssClasses: [],
            metadata: {},
          },
        ],
      };

      const result = generator.generateMachineSpec(complexSpec);

      const stepField = result.context.find(f => f.name === "currentStep");
      expect(stepField).toBeDefined();
      expect(stepField?.type).toBe("number");
    });
  });

  describe("Event Generation", () => {
    it("should infer events from transition labels", () => {
      const result = generator.generateMachineSpec(mockParsedSpec);

      expect(result.events).toBeDefined();
      expect(result.events.length).toBeGreaterThan(0);

      // Should extract events from transition labels
      const eventTypes = result.events.map(e => e.type);
      expect(eventTypes).toContain("START_PROCESS");
      expect(eventTypes).toContain("FINISH");
      expect(eventTypes).toContain("CANCEL");
    });

    it("should generate appropriate payload for different event types", () => {
      const result = generator.generateMachineSpec(mockParsedSpec);

      // User input events should have input payload
      const userInputEvent = result.events.find(
        e => e.type === "START_PROCESS"
      );
      expect(userInputEvent?.payload).toBeDefined();
      expect(userInputEvent?.payload.some(p => p.name === "input")).toBe(true);
    });

    it("should handle events with guards and actions", () => {
      const result = generator.generateMachineSpec(mockParsedSpec);

      // Should still generate events even when transitions have guards/actions
      expect(result.events.length).toBeGreaterThan(0);
    });
  });

  describe("State Generation", () => {
    it("should convert all parsed states to generated states", () => {
      const result = generator.generateMachineSpec(mockParsedSpec);

      expect(result.states).toBeDefined();
      expect(result.states.length).toBe(mockParsedSpec.states.length);

      const stateNames = result.states.map(s => s.name);
      expect(stateNames).toContain("idle");
      expect(stateNames).toContain("processing");
      expect(stateNames).toContain("complete");
    });

    it("should correctly identify final states", () => {
      const result = generator.generateMachineSpec(mockParsedSpec);

      const completeState = result.states.find(s => s.name === "complete");
      expect(completeState?.type).toBe("final");

      const idleState = result.states.find(s => s.name === "idle");
      expect(idleState?.type).toBe("normal");
    });

    it("should generate state transitions correctly", () => {
      const result = generator.generateMachineSpec(mockParsedSpec);

      const idleState = result.states.find(s => s.name === "idle");
      expect(idleState?.transitions).toBeDefined();
      expect(idleState?.transitions.length).toBe(1);
      expect(idleState?.transitions[0].target).toBe("processing");
    });

    it("should include guards and actions in transitions", () => {
      const result = generator.generateMachineSpec(mockParsedSpec);

      const processingState = result.states.find(s => s.name === "processing");
      const cancelTransition = processingState?.transitions.find(
        t => t.event === "CANCEL"
      );

      expect(cancelTransition?.guard).toBe("canCancel");
      expect(cancelTransition?.actions).toContain("resetProcess");
    });

    it("should generate entry and exit actions", () => {
      const result = generator.generateMachineSpec(mockParsedSpec);

      result.states.forEach(state => {
        expect(state.entry).toBeDefined();
        expect(Array.isArray(state.entry)).toBe(true);

        if (state.type === "final") {
          expect(state.exit).toContain("cleanupSession");
        }
      });
    });
  });

  describe("Guards, Actions, and Actors", () => {
    it("should extract guards from transitions", () => {
      const result = generator.generateMachineSpec(mockParsedSpec);

      expect(result.guards).toBeDefined();
      expect(result.guards).toContain("canCancel");
    });

    it("should extract actions from transitions", () => {
      const result = generator.generateMachineSpec(mockParsedSpec);

      expect(result.actions).toBeDefined();
      expect(result.actions).toContain("resetProcess");
      expect(result.actions).toContain("logStateEntry");
    });

    it("should generate category-specific actions", () => {
      const result = generator.generateMachineSpec(mockParsedSpec);

      // User machine should have validation actions
      expect(result.actions).toContain("validateUserSession");
    });

    it("should generate actors for external services", () => {
      // Add external transition
      const specWithExternal = {
        ...mockParsedSpec,
        transitions: [
          ...mockParsedSpec.transitions,
          {
            from: "processing",
            to: "complete",
            label: "external service",
            type: "external" as TransitionType,
            metadata: {},
          },
        ],
      };

      const result = generator.generateMachineSpec(specWithExternal);

      expect(result.actors).toContain("externalService");
      expect(result.actors).toContain("userService"); // Category-specific
    });
  });

  describe("Imports Generation", () => {
    it("should generate category-specific imports", () => {
      const result = generator.generateMachineSpec(mockParsedSpec);

      expect(result.imports).toBeDefined();
      expect(result.imports.length).toBeGreaterThan(0);

      // Should include user-machine specific imports
      expect(
        result.imports.some(imp => imp.includes("validatePhoneNumber"))
      ).toBe(true);
      expect(result.imports.some(imp => imp.includes("getUserSession"))).toBe(
        true
      );
    });

    it("should generate different imports for different categories", () => {
      const agentSpec = {
        ...mockParsedSpec,
        category: "agent-machine" as MachineCategory,
      };
      const result = generator.generateMachineSpec(agentSpec);

      expect(
        result.imports.some(imp => imp.includes("validateAgentCredentials"))
      ).toBe(true);
    });
  });

  describe("Configuration Options", () => {
    it("should respect configuration options", () => {
      const customGenerator = new MachineGenerator({
        generateContext: false,
        inferEvents: false,
        generateGuards: false,
      });

      const result = customGenerator.generateMachineSpec(mockParsedSpec);

      expect(result.context).toHaveLength(0);
      expect(result.events).toHaveLength(0);
    });

    it("should use custom naming conventions", () => {
      const customGenerator = new MachineGenerator({
        namingConventions: {
          contextPrefix: "ctx",
          eventSuffix: "Event",
          guardPrefix: "check",
          actionSuffix: "Handler",
        },
      });

      const result = customGenerator.generateMachineSpec(mockParsedSpec);

      // Naming conventions should be applied
      expect(result).toBeDefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty machine specs", () => {
      const emptySpec: ParsedMachineSpec = {
        id: "empty",
        name: "Empty Machine",
        category: "core-machine",
        states: [],
        transitions: [],
        initialState: "",
        finalStates: [],
        metadata: {},
      };

      expect(() => {
        generator.generateMachineSpec(emptySpec);
      }).not.toThrow();
    });

    it("should handle machine with only one state", () => {
      const singleStateSpec: ParsedMachineSpec = {
        ...mockParsedSpec,
        states: [mockParsedSpec.states[0]],
        transitions: [],
      };

      const result = generator.generateMachineSpec(singleStateSpec);

      expect(result.states).toHaveLength(1);
      expect(result.events).toHaveLength(0);
    });

    it("should handle transitions without labels", () => {
      const noLabelSpec: ParsedMachineSpec = {
        ...mockParsedSpec,
        transitions: [
          {
            from: "idle",
            to: "processing",
            label: "",
            type: "system_action",
            metadata: {},
          },
        ],
      };

      expect(() => {
        generator.generateMachineSpec(noLabelSpec);
      }).not.toThrow();
    });
  });

  describe("Convenience Function", () => {
    it("should work with convenience function", () => {
      const result = generateMachineSpec(mockParsedSpec);

      expect(result).toBeDefined();
      expect(result.id).toBe("testmachineMachine");
    });

    it("should accept custom configuration", () => {
      const result = generateMachineSpec(mockParsedSpec, {
        generateContext: false,
      });

      expect(result.context).toHaveLength(0);
    });
  });
});
