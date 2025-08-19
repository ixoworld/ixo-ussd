/**
 * XState v5 Machine Test Template Generator
 *
 * This module provides templates for generating comprehensive test suites
 * for XState v5 machines following the established testing patterns.
 *
 * @module test-template
 * @version 1.0.0
 */

import type {
  GeneratedMachineSpec,
  GeneratedStateSpec,
} from "../types/generator-types.js";

/**
 * Test template configuration
 */
export interface TestTemplateConfig {
  /** Test style: smoke tests only or comprehensive */
  testStyle: "smoke" | "comprehensive";

  /** Whether to include integration tests */
  includeIntegration: boolean;

  /** Whether to include performance tests */
  includePerformance: boolean;

  /** Custom test utilities to import */
  customUtilities: string[];
}

/**
 * Default test template configuration
 */
export const DEFAULT_TEST_CONFIG: TestTemplateConfig = {
  testStyle: "smoke",
  includeIntegration: false,
  includePerformance: false,
  customUtilities: [],
};

/**
 * Test template generator class
 */
export class TestTemplateGenerator {
  private config: TestTemplateConfig;

  constructor(config: Partial<TestTemplateConfig> = {}) {
    this.config = { ...DEFAULT_TEST_CONFIG, ...config };
  }

  /**
   * Generate complete test suite
   */
  generateTestSuite(spec: GeneratedMachineSpec): string {
    const parts = [
      this.generateTestHeader(spec),
      this.generateTestImports(spec),
      this.generateMainTestSuite(spec),
    ];

    return parts.join("\n\n");
  }

  /**
   * Generate test file header
   */
  private generateTestHeader(spec: GeneratedMachineSpec): string {
    return `/**
 * ${spec.name} Tests - Generated Test Suite
 *
 * Auto-generated test suite for ${spec.name} XState v5 machine.
 * Tests follow the established patterns in the SupaMoto USSD server.
 *
 * @module ${spec.name}.test
 * @generated true
 * @version 1.0.0
 */`;
  }

  /**
   * Generate test imports
   */
  private generateTestImports(spec: GeneratedMachineSpec): string {
    const imports = [
      'import { describe, it, expect, beforeEach, afterEach } from "vitest";',
      'import { createActor } from "xstate";',
      `import { ${spec.id}, type Context, type Events } from "./${spec.name}.generated.js";`,
      ...this.config.customUtilities,
    ];

    return imports.join("\n");
  }

  /**
   * Generate main test suite
   */
  private generateMainTestSuite(spec: GeneratedMachineSpec): string {
    if (this.config.testStyle === "smoke") {
      return this.generateSmokeTests(spec);
    } else {
      return this.generateComprehensiveTests(spec);
    }
  }

  /**
   * Generate smoke tests (basic functionality)
   */
  private generateSmokeTests(spec: GeneratedMachineSpec): string {
    return `describe("${spec.id} - Smoke Tests", () => {
  let actor: ReturnType<typeof createActor>;

  beforeEach(() => {
    actor = createActor(${spec.id});
  });

  afterEach(() => {
    if (actor && actor.getSnapshot().status !== "stopped") {
      actor.stop();
    }
  });

  describe("Machine Creation and Startup", () => {
    it("should create machine without errors", () => {
      expect(() => {
        createActor(${spec.id});
      }).not.toThrow();
    });

    it("should start successfully", () => {
      expect(() => {
        actor.start();
      }).not.toThrow();

      expect(actor.getSnapshot().status).toBe("active");
    });

    it("should stop successfully", () => {
      actor.start();

      expect(() => {
        actor.stop();
      }).not.toThrow();

      expect(actor.getSnapshot().status).toBe("stopped");
    });

    it("should restart successfully", () => {
      actor.start();
      actor.stop();

      expect(() => {
        actor.start();
      }).not.toThrow();

      expect(actor.getSnapshot().status).toBe("active");
    });
  });

  describe("Initial State Verification", () => {
    it("should start in correct initial state", () => {
      actor.start();
      const snapshot = actor.getSnapshot();

      expect(snapshot.value).toBe("${spec.initialState}");
    });

    it("should have valid initial context", () => {
      actor.start();
      const snapshot = actor.getSnapshot();

      expect(snapshot.context).toBeDefined();
      expect(typeof snapshot.context).toBe("object");

      // Verify required context fields exist
      ${this.generateContextValidation(spec.context)}
    });

    it("should not be in final state initially", () => {
      actor.start();
      const snapshot = actor.getSnapshot();

      expect(snapshot.status).toBe("active");
      expect(snapshot.status).not.toBe("done");
    });
  });

  describe("Basic Event Handling", () => {
    it("should handle START event without errors", () => {
      actor.start();

      expect(() => {
        actor.send({ type: "START" });
      }).not.toThrow();

      // Machine should remain active
      expect(actor.getSnapshot().status).toBe("active");
    });

    it("should handle navigation events", () => {
      actor.start();

      const navigationEvents = ["BACK", "MAIN"];

      navigationEvents.forEach(eventType => {
        expect(() => {
          actor.send({ type: eventType as any });
        }).not.toThrow();

        // Machine should remain active after navigation
        expect(actor.getSnapshot().status).toBe("active");
      });
    });

    it("should handle error events gracefully", () => {
      actor.start();

      expect(() => {
        actor.send({ type: "ERROR", error: "Test error message" });
      }).not.toThrow();

      // Machine should handle errors without crashing
      expect(actor.getSnapshot().status).toBe("active");
    });

    it("should ignore unknown events", () => {
      actor.start();
      const initialSnapshot = actor.getSnapshot();

      expect(() => {
        actor.send({ type: "UNKNOWN_EVENT" as any });
      }).not.toThrow();

      // State should remain unchanged for unknown events
      const finalSnapshot = actor.getSnapshot();
      expect(finalSnapshot.value).toBe(initialSnapshot.value);
    });
  });

  describe("Context Management", () => {
    it("should accept input context on creation", () => {
      const inputContext: Partial<Context> = {
        ${this.generateTestInputContext(spec.context)}
      };

      const actorWithInput = createActor(${spec.id}, {
        input: inputContext,
      });

      actorWithInput.start();
      const snapshot = actorWithInput.getSnapshot();

      expect(snapshot.context).toMatchObject(inputContext);
      actorWithInput.stop();
    });

    it("should maintain context consistency", () => {
      actor.start();
      const initialContext = actor.getSnapshot().context;

      // Send a few events
      actor.send({ type: "START" });
      actor.send({ type: "BACK" });

      const finalContext = actor.getSnapshot().context;

      // Context should be an object and maintain its structure
      expect(typeof finalContext).toBe("object");
      expect(finalContext).toBeDefined();
    });

    it("should handle context updates through events", () => {
      actor.start();
      const initialSnapshot = actor.getSnapshot();

      // Send event that might update context
      actor.send({ type: "ERROR", error: "Test error" });

      const updatedSnapshot = actor.getSnapshot();

      // Context should still be valid after updates
      expect(updatedSnapshot.context).toBeDefined();
      expect(typeof updatedSnapshot.context).toBe("object");
    });
  });

  describe("State Machine Properties", () => {
    it("should have deterministic behavior", () => {
      // Create two identical actors
      const actor1 = createActor(${spec.id});
      const actor2 = createActor(${spec.id});

      actor1.start();
      actor2.start();

      // Both should start in same state
      expect(actor1.getSnapshot().value).toBe(actor2.getSnapshot().value);

      // Both should respond identically to same event
      actor1.send({ type: "START" });
      actor2.send({ type: "START" });

      expect(actor1.getSnapshot().value).toBe(actor2.getSnapshot().value);

      actor1.stop();
      actor2.stop();
    });

    it("should maintain state consistency", () => {
      actor.start();

      // Get multiple snapshots
      const snapshot1 = actor.getSnapshot();
      const snapshot2 = actor.getSnapshot();

      // Snapshots should be consistent
      expect(snapshot1.value).toBe(snapshot2.value);
      expect(snapshot1.status).toBe(snapshot2.status);
    });

    it("should handle rapid event sequences", () => {
      actor.start();

      expect(() => {
        // Send multiple events rapidly
        actor.send({ type: "START" });
        actor.send({ type: "BACK" });
        actor.send({ type: "MAIN" });
        actor.send({ type: "START" });
      }).not.toThrow();

      // Machine should remain stable
      expect(actor.getSnapshot().status).toBe("active");
    });
  });

  ${this.generateFinalStateTests(spec)}
});`;
  }

  /**
   * Generate comprehensive tests
   */
  private generateComprehensiveTests(spec: GeneratedMachineSpec): string {
    const smokeTests = this.generateSmokeTests(spec);
    const stateTests = this.generateStateSpecificTests(spec);
    const guardTests = this.generateGuardTests(spec);
    const actionTests = this.generateActionTests(spec);

    return `${smokeTests}

${stateTests}

${guardTests}

${actionTests}`;
  }

  /**
   * Generate state-specific tests
   */
  private generateStateSpecificTests(spec: GeneratedMachineSpec): string {
    const stateTestSuites = spec.states
      .map(state => {
        return `  describe("${state.name} State", () => {
    it("should enter ${state.name} state correctly", () => {
      actor.start();
      
      // Navigate to ${state.name} state
      // TODO: Add specific navigation logic for ${state.name}
      
      const snapshot = actor.getSnapshot();
      expect(snapshot.matches("${state.name}")).toBe(true);
    });

    it("should handle events in ${state.name} state", () => {
      actor.start();
      
      // Navigate to ${state.name} state first
      // TODO: Add navigation logic
      
      ${this.generateStateEventTests(state)}
    });

    ${
      state.type === "final"
        ? `
    it("should be a final state", () => {
      actor.start();
      
      // Navigate to ${state.name} state
      // TODO: Add navigation logic
      
      const snapshot = actor.getSnapshot();
      expect(snapshot.status).toBe("done");
    });`
        : ""
    }
  });`;
      })
      .join("\n\n");

    return `describe("State-Specific Tests", () => {
${stateTestSuites}
});`;
  }

  /**
   * Generate event tests for a specific state
   */
  private generateStateEventTests(state: GeneratedStateSpec): string {
    if (state.transitions.length === 0) {
      return `// No specific transitions defined for ${state.name}`;
    }

    return state.transitions
      .map(transition => {
        return `      // Test ${transition.event} event
      expect(() => {
        actor.send({ type: "${transition.event}" });
      }).not.toThrow();`;
      })
      .join("\n");
  }

  /**
   * Generate guard tests
   */
  private generateGuardTests(spec: GeneratedMachineSpec): string {
    if (spec.guards.length === 0) {
      return "";
    }

    const guardTests = spec.guards
      .map(guard => {
        return `  describe("${guard} Guard", () => {
    it("should evaluate ${guard} guard correctly", () => {
      actor.start();
      
      // TODO: Set up context and event for ${guard} guard test
      const testContext: Partial<Context> = {};
      const testEvent: Events = { type: "START" };
      
      // Test guard logic
      // Note: Direct guard testing requires access to guard implementation
      expect(true).toBe(true); // Placeholder
    });
  });`;
      })
      .join("\n\n");

    return `describe("Guard Tests", () => {
${guardTests}
});`;
  }

  /**
   * Generate action tests
   */
  private generateActionTests(spec: GeneratedMachineSpec): string {
    if (spec.actions.length === 0) {
      return "";
    }

    const actionTests = spec.actions
      .map(action => {
        return `  describe("${action} Action", () => {
    it("should execute ${action} action correctly", () => {
      actor.start();
      
      const initialSnapshot = actor.getSnapshot();
      const initialContext = initialSnapshot.context;
      
      // TODO: Send event that triggers ${action} action
      // actor.send({ type: "SOME_EVENT" });
      
      const finalSnapshot = actor.getSnapshot();
      
      // Verify action effects
      expect(finalSnapshot.context).toBeDefined();
      // TODO: Add specific assertions for ${action} action effects
    });
  });`;
      })
      .join("\n\n");

    return `describe("Action Tests", () => {
${actionTests}
});`;
  }

  /**
   * Generate context validation for smoke tests
   */
  private generateContextValidation(context: any[]): string {
    if (!context || context.length === 0) {
      return "// No specific context validation needed";
    }

    return context
      .map(field => {
        if (field.optional) {
          return `// ${field.name} is optional`;
        } else {
          return `expect(snapshot.context).toHaveProperty("${field.name}");`;
        }
      })
      .join("\n      ");
  }

  /**
   * Generate test input context
   */
  private generateTestInputContext(context: any[]): string {
    if (!context || context.length === 0) {
      return "// No context fields to test";
    }

    return context
      .slice(0, 2)
      .map(field => {
        let testValue = "undefined";

        if (field.type.includes("string")) {
          testValue = '"test-value"';
        } else if (field.type.includes("number")) {
          testValue = "42";
        } else if (field.type.includes("boolean")) {
          testValue = "true";
        }

        return `${field.name}: ${testValue}`;
      })
      .join(",\n        ");
  }

  /**
   * Generate final state tests if machine has final states
   */
  private generateFinalStateTests(spec: GeneratedMachineSpec): string {
    const finalStates = spec.states.filter(state => state.type === "final");

    if (finalStates.length === 0) {
      return "";
    }

    return `
  describe("Final State Handling", () => {
    it("should handle final states correctly", () => {
      actor.start();

      // TODO: Navigate to final state
      // This would require specific navigation logic for each machine

      // For now, just verify machine can handle completion
      expect(actor.getSnapshot().status).toBe("active");
    });

    it("should stop when reaching final state", () => {
      // TODO: Implement test for reaching final state
      // This requires knowledge of how to reach final states
      expect(true).toBe(true); // Placeholder
    });
  });`;
  }
}

/**
 * Convenience function to generate test code
 */
export function generateTestCode(
  spec: GeneratedMachineSpec,
  config?: Partial<TestTemplateConfig>
): string {
  const generator = new TestTemplateGenerator(config);
  return generator.generateTestSuite(spec);
}
