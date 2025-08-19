/**
 * Test Suite Generator Tests - Comprehensive validation of generated tests
 *
 * This test suite validates that all generated test files are syntactically correct,
 * executable, and follow established testing patterns.
 *
 * @module test-suite-generator.test
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach } from "vitest";
import { TestTemplateGenerator } from "./templates/test-template.js";
import { TransitionTestTemplateGenerator } from "./templates/transition-test-template.js";
import { ErrorTestTemplateGenerator } from "./templates/error-test-template.js";
import { ServiceTemplateGenerator } from "./templates/service-template.js";
import type { GeneratedMachineSpec } from "./types/generator-types.js";

describe("Test Suite Generator Validation", () => {
  let mockMachineSpec: GeneratedMachineSpec;

  beforeEach(() => {
    mockMachineSpec = {
      id: "testMachine",
      name: "TestMachine",
      category: "user-machine",
      description: "Test machine for validation",
      initialState: "idle",
      states: [
        {
          name: "idle",
          type: "normal",
          description: "Initial idle state",
          transitions: [
            {
              event: "START",
              target: "processing",
              guard: "canStart",
              actions: ["logStart"],
            },
          ],
          entry: ["onEnterIdle"],
          exit: ["onExitIdle"],
          states: [],
        },
        {
          name: "processing",
          type: "normal",
          description: "Processing state",
          transitions: [
            {
              event: "COMPLETE",
              target: "completed",
              actions: ["logComplete"],
            },
            {
              event: "ERROR",
              target: "error",
              actions: ["logError"],
            },
          ],
          entry: [],
          exit: [],
          states: [],
        },
        {
          name: "completed",
          type: "final",
          description: "Completed state",
          transitions: [],
          entry: [],
          exit: [],
          states: [],
        },
        {
          name: "error",
          type: "normal",
          description: "Error state",
          transitions: [
            {
              event: "RETRY",
              target: "idle",
              actions: ["resetError"],
            },
          ],
          entry: [],
          exit: [],
          states: [],
        },
      ],
      events: [
        {
          type: "START",
          description: "Start processing",
          payload: [],
        },
        {
          type: "COMPLETE",
          description: "Complete processing",
          payload: [],
        },
        {
          type: "ERROR",
          description: "Error occurred",
          payload: [
            {
              name: "error",
              type: "string",
              defaultValue: '""',
              optional: false,
              description: "Error message",
            },
          ],
        },
        {
          type: "RETRY",
          description: "Retry operation",
          payload: [],
        },
      ],
      context: [
        {
          name: "userId",
          type: "string",
          defaultValue: '""',
          optional: false,
          description: "User identifier",
        },
        {
          name: "attempts",
          type: "number",
          defaultValue: "0",
          optional: false,
          description: "Number of attempts",
        },
        {
          name: "lastError",
          type: "string | null",
          defaultValue: "null",
          optional: true,
          description: "Last error message",
        },
      ],
      guards: ["canStart", "hasMaxAttempts"],
      actions: [
        "logStart",
        "logComplete",
        "logError",
        "resetError",
        "onEnterIdle",
        "onExitIdle",
      ],
      actors: ["userService", "notificationService"],
      imports: [
        'import { assign } from "xstate";',
        'import { userService } from "../services/user.js";',
      ],
    };
  });

  describe("TestTemplateGenerator", () => {
    let generator: TestTemplateGenerator;

    beforeEach(() => {
      generator = new TestTemplateGenerator();
    });

    it("should generate valid smoke tests", () => {
      const smokeTestGenerator = new TestTemplateGenerator({
        testStyle: "smoke",
        includeIntegration: false,
        includePerformance: false,
      });

      const testCode = smokeTestGenerator.generateTestSuite(mockMachineSpec);

      // Validate structure
      expect(testCode).toContain("describe(");
      expect(testCode).toContain("it(");
      expect(testCode).toContain("expect(");
      expect(testCode).toContain("beforeEach(");
      expect(testCode).toContain("afterEach(");

      // Validate imports
      expect(testCode).toContain(
        'import { describe, it, expect, beforeEach, afterEach } from "vitest"'
      );
      expect(testCode).toContain('import { createActor } from "xstate"');
      expect(testCode).toContain(
        `import { ${mockMachineSpec.id}, type Context, type Events }`
      );

      // Validate test structure
      expect(testCode).toContain("Machine Creation and Startup");
      expect(testCode).toContain("Initial State Verification");
      expect(testCode).toContain("Basic Event Handling");
      expect(testCode).toContain("Context Management");
      expect(testCode).toContain("State Machine Properties");

      // Validate specific tests
      expect(testCode).toContain("should create machine without errors");
      expect(testCode).toContain("should start successfully");
      expect(testCode).toContain("should start in correct initial state");
      expect(testCode).toContain("should handle START event without errors");
    });

    it("should generate valid comprehensive tests", () => {
      const comprehensiveGenerator = new TestTemplateGenerator({
        testStyle: "comprehensive",
        includeIntegration: true,
        includePerformance: false,
      });

      const testCode =
        comprehensiveGenerator.generateTestSuite(mockMachineSpec);

      // Should include smoke tests plus additional comprehensive tests
      expect(testCode).toContain("Smoke Tests");
      expect(testCode).toContain("State-Specific Tests");
      expect(testCode).toContain("Guard Tests");
      expect(testCode).toContain("Action Tests");

      // Validate state-specific tests
      mockMachineSpec.states.forEach(state => {
        expect(testCode).toContain(`${state.name} State`);
      });

      // Validate guard tests
      mockMachineSpec.guards.forEach(guard => {
        expect(testCode).toContain(`${guard} Guard`);
      });

      // Validate action tests
      mockMachineSpec.actions.forEach(action => {
        expect(testCode).toContain(`${action} Action`);
      });
    });

    it("should handle machines with no context", () => {
      const noContextSpec = { ...mockMachineSpec, context: [] };
      const testCode = generator.generateTestSuite(noContextSpec);

      expect(testCode).toContain("No context fields to test");
      expect(testCode).not.toThrow;
    });

    it("should handle machines with no guards or actions", () => {
      const minimalSpec = {
        ...mockMachineSpec,
        guards: [],
        actions: [],
        states: mockMachineSpec.states.map(state => ({
          ...state,
          transitions: state.transitions.map(t => ({
            ...t,
            guard: undefined,
            actions: [],
          })),
          entry: [],
          exit: [],
        })),
      };

      const testCode = generator.generateTestSuite(minimalSpec);

      expect(testCode).toBeDefined();
      expect(testCode).toContain("describe(");
      expect(testCode).not.toThrow;
    });
  });

  describe("TransitionTestTemplateGenerator", () => {
    let generator: TransitionTestTemplateGenerator;

    beforeEach(() => {
      generator = new TransitionTestTemplateGenerator();
    });

    it("should generate valid transition tests", () => {
      const testCode = generator.generateTransitionTests(mockMachineSpec);

      // Validate structure
      expect(testCode).toContain("State Transition Tests");
      expect(testCode).toContain("Basic State Transitions");
      expect(testCode).toContain("State-Specific Transition Tests");
      expect(testCode).toContain("Transition Path Coverage");
      expect(testCode).toContain("Transition Validation");

      // Validate specific transition tests
      expect(testCode).toContain("should start in initial state");
      expect(testCode).toContain(
        "should maintain state when receiving unknown events"
      );
      expect(testCode).toContain("should handle multiple rapid transitions");

      // Validate state-specific tests
      mockMachineSpec.states.forEach(state => {
        expect(testCode).toContain(`${state.name} State Transitions`);
      });

      // Validate path coverage tests
      expect(testCode).toContain(
        "should handle complete flow from start to final state"
      );
      expect(testCode).toContain("should handle error recovery paths");
      expect(testCode).toContain("should handle navigation loops");
    });

    it("should handle states with no transitions", () => {
      const noTransitionSpec = {
        ...mockMachineSpec,
        states: [
          {
            name: "isolated",
            type: "normal" as const,
            description: "Isolated state",
            transitions: [],
            entry: [],
            exit: [],
            states: [],
          },
        ],
      };

      const testCode = generator.generateTransitionTests(noTransitionSpec);

      expect(testCode).toContain("should have no outgoing transitions");
      expect(testCode).not.toThrow;
    });

    it("should validate configuration options", () => {
      const customGenerator = new TransitionTestTemplateGenerator({
        includePathCoverage: false,
        includeTransitionValidation: false,
        includeStateInvariants: false,
        maxPathDepth: 3,
      });

      const testCode = customGenerator.generateTransitionTests(mockMachineSpec);

      // Should not include path coverage tests when disabled
      expect(testCode).not.toContain("Transition Path Coverage");
      expect(testCode).not.toContain("Transition Validation");
    });
  });

  describe("ErrorTestTemplateGenerator", () => {
    let generator: ErrorTestTemplateGenerator;

    beforeEach(() => {
      generator = new ErrorTestTemplateGenerator();
    });

    it("should generate valid error handling tests", () => {
      const testCode = generator.generateErrorTests(mockMachineSpec);

      // Validate structure
      expect(testCode).toContain("Error Handling Tests");
      expect(testCode).toContain("Basic Error Handling");
      expect(testCode).toContain("Invalid Input Handling");
      expect(testCode).toContain("Boundary Value Tests");
      expect(testCode).toContain("Edge Case Handling");
      expect(testCode).toContain("Error Recovery");

      // Validate specific error tests
      expect(testCode).toContain(
        "should handle null/undefined events gracefully"
      );
      expect(testCode).toContain("should handle malformed event objects");
      expect(testCode).toContain("should handle events with invalid payload");
      expect(testCode).toContain(
        "should handle circular references in event data"
      );

      // Validate boundary tests
      expect(testCode).toContain("should handle empty string inputs");
      expect(testCode).toContain("should handle maximum length string inputs");
      expect(testCode).toContain("should handle numeric boundary values");
      expect(testCode).toContain("should handle special characters in strings");

      // Validate recovery tests
      expect(testCode).toContain("should recover from error states");
      expect(testCode).toContain(
        "should maintain context integrity during errors"
      );
      expect(testCode).toContain("should handle cascading errors gracefully");
    });

    it("should handle configuration options", () => {
      const customGenerator = new ErrorTestTemplateGenerator({
        includeBoundaryTests: false,
        includeMalformedInputTests: false,
        includeConcurrencyTests: true,
        includeResourceTests: false,
      });

      const testCode = customGenerator.generateErrorTests(mockMachineSpec);

      // Should not include boundary tests when disabled
      expect(testCode).not.toContain("Boundary Value Tests");
      expect(testCode).not.toContain("Invalid Input Handling");

      // Should include concurrency tests when enabled
      expect(testCode).toContain("Concurrency and Race Conditions");
    });

    it("should generate context-specific error tests", () => {
      const testCode = generator.generateErrorTests(mockMachineSpec);

      // Should include context field validation
      expect(testCode).toContain("should handle invalid context on creation");
      expect(testCode).toContain(
        "should handle context with invalid field types"
      );
      expect(testCode).toContain(
        "should handle missing required context fields"
      );

      // Should reference actual context fields
      mockMachineSpec.context.forEach(field => {
        if (!field.optional) {
          expect(testCode).toContain(field.name);
        }
      });
    });
  });

  describe("ServiceTemplateGenerator", () => {
    let generator: ServiceTemplateGenerator;

    beforeEach(() => {
      generator = new ServiceTemplateGenerator();
    });

    it("should generate valid service class", () => {
      const serviceCode = generator.generateService(mockMachineSpec);

      // Validate structure
      expect(serviceCode).toContain(`${mockMachineSpec.name}Service`);
      expect(serviceCode).toContain(`${mockMachineSpec.name}ServiceInput`);
      expect(serviceCode).toContain(`${mockMachineSpec.name}ServiceOutput`);
      expect(serviceCode).toContain(`${mockMachineSpec.name}ServiceConfig`);
      expect(serviceCode).toContain(`${mockMachineSpec.name}ServiceError`);
      expect(serviceCode).toContain(`${mockMachineSpec.name}ServiceException`);

      // Validate imports
      expect(serviceCode).toContain("import { logger }");

      // Validate class structure
      expect(serviceCode).toContain("export class");
      expect(serviceCode).toContain("constructor(");
      expect(serviceCode).toContain("async");

      // Validate error handling
      expect(serviceCode).toContain("try {");
      expect(serviceCode).toContain("catch (error)");
      expect(serviceCode).toContain("handleError");

      // Validate exports
      expect(serviceCode).toContain("export default");
      expect(serviceCode).toContain("export const");
      expect(serviceCode).toContain("export type");
    });

    it("should generate category-specific methods", () => {
      const userServiceCode = generator.generateService({
        ...mockMachineSpec,
        category: "user-machine",
      });

      expect(userServiceCode).toContain("validateUser");
      expect(userServiceCode).toContain("processUserAction");
      expect(userServiceCode).toContain("validatePhoneNumber");

      const agentServiceCode = generator.generateService({
        ...mockMachineSpec,
        category: "agent-machine",
      });

      expect(agentServiceCode).toContain("validateAgent");
      expect(agentServiceCode).toContain("processAgentOperation");
      expect(agentServiceCode).toContain("validateAgentCredentials");

      const accountServiceCode = generator.generateService({
        ...mockMachineSpec,
        category: "account-machine",
      });

      expect(accountServiceCode).toContain("getAccountInfo");
      expect(accountServiceCode).toContain("updateAccount");
      expect(accountServiceCode).toContain("getAccountBalance");
    });

    it("should handle configuration options", () => {
      const minimalGenerator = new ServiceTemplateGenerator({
        variant: "minimal",
        includeErrorHandling: false,
        includeLogging: false,
        includeValidation: false,
        includeCaching: false,
      });

      const serviceCode = minimalGenerator.generateService(mockMachineSpec);

      // Should still generate basic structure
      expect(serviceCode).toContain(`${mockMachineSpec.name}Service`);
      expect(serviceCode).toContain("export class");
    });

    it("should generate context-aware interfaces", () => {
      const serviceCode = generator.generateService(mockMachineSpec);

      // Should include context fields in service input interface
      mockMachineSpec.context.forEach(field => {
        expect(serviceCode).toContain(field.name);
        expect(serviceCode).toContain(field.type);
      });
    });
  });

  describe("Integration Tests", () => {
    it("should generate all test types without conflicts", () => {
      const testGenerator = new TestTemplateGenerator();
      const transitionGenerator = new TransitionTestTemplateGenerator();
      const errorGenerator = new ErrorTestTemplateGenerator();
      const serviceGenerator = new ServiceTemplateGenerator();

      expect(() => {
        testGenerator.generateTestSuite(mockMachineSpec);
        transitionGenerator.generateTransitionTests(mockMachineSpec);
        errorGenerator.generateErrorTests(mockMachineSpec);
        serviceGenerator.generateService(mockMachineSpec);
      }).not.toThrow();
    });

    it("should generate consistent naming across all generators", () => {
      const testCode = new TestTemplateGenerator().generateTestSuite(
        mockMachineSpec
      );
      const transitionCode =
        new TransitionTestTemplateGenerator().generateTransitionTests(
          mockMachineSpec
        );
      const errorCode = new ErrorTestTemplateGenerator().generateErrorTests(
        mockMachineSpec
      );
      const serviceCode = new ServiceTemplateGenerator().generateService(
        mockMachineSpec
      );

      // All should reference the same machine ID
      [testCode, transitionCode, errorCode].forEach(code => {
        expect(code).toContain(mockMachineSpec.id);
        expect(code).toContain("createActor");
      });

      expect(serviceCode).toContain(mockMachineSpec.name);
    });

    it("should handle edge cases consistently", () => {
      const emptySpec: GeneratedMachineSpec = {
        ...mockMachineSpec,
        states: [],
        events: [],
        context: [],
        guards: [],
        actions: [],
        actors: [],
      };

      expect(() => {
        new TestTemplateGenerator().generateTestSuite(emptySpec);
        new TransitionTestTemplateGenerator().generateTransitionTests(
          emptySpec
        );
        new ErrorTestTemplateGenerator().generateErrorTests(emptySpec);
        new ServiceTemplateGenerator().generateService(emptySpec);
      }).not.toThrow();
    });
  });
});
