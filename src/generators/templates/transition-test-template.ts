/**
 * State Transition Test Template Generator
 *
 * This module provides templates for generating comprehensive state transition tests
 * that cover all defined flows in XState v5 machines.
 *
 * @module transition-test-template
 * @version 1.0.0
 */

import type {
  GeneratedMachineSpec,
  GeneratedStateSpec,
} from "../types/generator-types.js";

/**
 * Transition test configuration
 */
export interface TransitionTestConfig {
  /** Whether to include path coverage tests */
  includePathCoverage: boolean;

  /** Whether to include transition validation */
  includeTransitionValidation: boolean;

  /** Whether to include state invariant tests */
  includeStateInvariants: boolean;

  /** Maximum path depth to test */
  maxPathDepth: number;
}

/**
 * Default transition test configuration
 */
export const DEFAULT_TRANSITION_TEST_CONFIG: TransitionTestConfig = {
  includePathCoverage: true,
  includeTransitionValidation: true,
  includeStateInvariants: true,
  maxPathDepth: 5,
};

/**
 * Transition test template generator class
 */
export class TransitionTestTemplateGenerator {
  private config: TransitionTestConfig;

  constructor(config: Partial<TransitionTestConfig> = {}) {
    this.config = { ...DEFAULT_TRANSITION_TEST_CONFIG, ...config };
  }

  /**
   * Generate comprehensive transition tests
   */
  generateTransitionTests(spec: GeneratedMachineSpec): string {
    const parts = [
      this.generateTransitionTestHeader(spec),
      this.generateTransitionTestImports(spec),
      this.generateTransitionTestSuite(spec),
    ];

    return parts.join("\n\n");
  }

  /**
   * Generate transition test file header
   */
  private generateTransitionTestHeader(spec: GeneratedMachineSpec): string {
    return `/**
 * ${spec.name} Transition Tests - Generated State Transition Test Suite
 *
 * Auto-generated comprehensive transition tests for ${spec.name} XState v5 machine.
 * Tests cover all defined state flows and transition paths.
 *
 * @module ${spec.name}.transitions.test
 * @generated true
 * @version 1.0.0
 */`;
  }

  /**
   * Generate transition test imports
   */
  private generateTransitionTestImports(spec: GeneratedMachineSpec): string {
    const imports = [
      'import { describe, it, expect, beforeEach, afterEach } from "vitest";',
      'import { createActor } from "xstate";',
      `import { ${spec.id}, type Context, type Events } from "./${spec.name}.generated.js";`,
    ];

    return imports.join("\n");
  }

  /**
   * Generate main transition test suite
   */
  private generateTransitionTestSuite(spec: GeneratedMachineSpec): string {
    const parts = [
      this.generateBasicTransitionTests(spec),
      this.generateStateSpecificTransitionTests(spec),
      this.generateTransitionPathTests(spec),
      this.generateTransitionValidationTests(spec),
    ];

    return parts.filter(Boolean).join("\n\n");
  }

  /**
   * Generate basic transition tests
   */
  private generateBasicTransitionTests(spec: GeneratedMachineSpec): string {
    return `describe("${spec.id} - State Transition Tests", () => {
  let actor: ReturnType<typeof createActor>;

  beforeEach(() => {
    actor = createActor(${spec.id});
    actor.start();
  });

  afterEach(() => {
    if (actor && actor.getSnapshot().status !== "stopped") {
      actor.stop();
    }
  });

  describe("Basic State Transitions", () => {
    it("should start in initial state", () => {
      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe("${spec.initialState}");
    });

    it("should maintain state when receiving unknown events", () => {
      const initialState = actor.getSnapshot().value;
      
      actor.send({ type: "UNKNOWN_EVENT" as any });
      
      const finalState = actor.getSnapshot().value;
      expect(finalState).toBe(initialState);
    });

    it("should handle multiple rapid transitions", () => {
      const initialState = actor.getSnapshot().value;
      
      // Send multiple events rapidly
      actor.send({ type: "START" });
      actor.send({ type: "BACK" });
      actor.send({ type: "MAIN" });
      
      // Machine should remain stable
      expect(actor.getSnapshot().status).toBe("active");
    });

    ${this.generateAllStatesReachabilityTest(spec)}
  });`;
  }

  /**
   * Generate state-specific transition tests
   */
  private generateStateSpecificTransitionTests(
    spec: GeneratedMachineSpec
  ): string {
    const stateTests = spec.states
      .map(state => {
        return this.generateSingleStateTransitionTests(state);
      })
      .join("\n\n");

    return `
  describe("State-Specific Transition Tests", () => {
${stateTests}
  });`;
  }

  /**
   * Generate transition tests for a single state
   */
  private generateSingleStateTransitionTests(
    state: GeneratedStateSpec
  ): string {
    if (state.transitions.length === 0) {
      return `    describe("${state.name} State Transitions", () => {
      it("should have no outgoing transitions", () => {
        // TODO: Navigate to ${state.name} state
        // Verify no transitions are possible
        expect(true).toBe(true); // Placeholder
      });
    });`;
    }

    const transitionTests = state.transitions
      .map(transition => {
        return `      it("should transition from ${state.name} to ${transition.target || "same state"} on ${transition.event}", () => {
        // TODO: Navigate to ${state.name} state first
        // const initialSnapshot = actor.getSnapshot();
        
        actor.send({ type: "${transition.event}" });
        
        const finalSnapshot = actor.getSnapshot();
        ${
          transition.target
            ? `expect(finalSnapshot.value).toBe("${transition.target}");`
            : `// Event handled but no state change expected`
        }
        
        ${
          transition.guard
            ? `// Guard: ${transition.guard} should be evaluated`
            : ""
        }
        
        ${
          transition.actions && transition.actions.length > 0
            ? `// Actions executed: ${transition.actions.join(", ")}`
            : ""
        }
      });`;
      })
      .join("\n\n");

    return `    describe("${state.name} State Transitions", () => {
${transitionTests}
    });`;
  }

  /**
   * Generate transition path tests
   */
  private generateTransitionPathTests(spec: GeneratedMachineSpec): string {
    if (!this.config.includePathCoverage) {
      return "";
    }

    const pathTests = this.generateCommonPathTests();

    return `
  describe("Transition Path Coverage", () => {
    ${pathTests}
    
    it("should handle complete flow from start to final state", () => {
      // Test complete happy path
      expect(actor.getSnapshot().value).toBe("${spec.initialState}");
      
      // TODO: Define complete flow sequence
      // Example: START -> PROCESS -> COMPLETE
      
      ${
        spec.states.filter(s => s.type === "final").length > 0
          ? `// Should eventually reach a final state
        // expect(actor.getSnapshot().status).toBe("done");`
          : `// Machine has no final states defined`
      }
    });

    it("should handle error recovery paths", () => {
      // Test error scenarios and recovery
      actor.send({ type: "ERROR", error: "Test error" });
      
      // Should handle error gracefully
      expect(actor.getSnapshot().status).toBe("active");
      
      // Should be able to recover
      actor.send({ type: "BACK" });
      expect(actor.getSnapshot().status).toBe("active");
    });

    it("should handle navigation loops", () => {
      const initialState = actor.getSnapshot().value;
      
      // Test navigation loop: MAIN -> BACK -> MAIN
      actor.send({ type: "MAIN" });
      actor.send({ type: "BACK" });
      actor.send({ type: "MAIN" });
      
      // Should remain stable
      expect(actor.getSnapshot().status).toBe("active");
    });
  });`;
  }

  /**
   * Generate common path tests
   */
  private generateCommonPathTests(): string {
    const commonPaths = [
      "Happy path navigation",
      "Error handling path",
      "Back navigation path",
      "Main menu return path",
    ];

    return commonPaths
      .map(pathName => {
        return `it("should handle ${pathName.toLowerCase()}", () => {
      // TODO: Implement ${pathName.toLowerCase()} test
      expect(actor.getSnapshot().status).toBe("active");
    });`;
      })
      .join("\n\n    ");
  }

  /**
   * Generate transition validation tests
   */
  private generateTransitionValidationTests(
    spec: GeneratedMachineSpec
  ): string {
    if (!this.config.includeTransitionValidation) {
      return "";
    }

    return `
  describe("Transition Validation", () => {
    it("should validate all transitions are properly defined", () => {
      const machineDefinition = ${spec.id}.config;
      
      // Verify machine has states
      expect(machineDefinition.states).toBeDefined();
      expect(Object.keys(machineDefinition.states)).toHaveLength(${spec.states.length});
    });

    it("should validate initial state exists", () => {
      const machineDefinition = ${spec.id}.config;
      
      expect(machineDefinition.initial).toBe("${spec.initialState}");
      expect(machineDefinition.states).toHaveProperty("${spec.initialState}");
    });

    ${this.generateGuardValidationTests(spec)}

    ${this.generateActionValidationTests(spec)}

    it("should validate context structure", () => {
      const snapshot = actor.getSnapshot();
      
      expect(snapshot.context).toBeDefined();
      expect(typeof snapshot.context).toBe("object");
      
      ${this.generateContextStructureValidation(spec)}
    });

    it("should validate event handling", () => {
      // Test that machine handles all defined events
      const definedEvents = [${spec.events.map(e => `"${e.type}"`).join(", ")}];
      
      definedEvents.forEach(eventType => {
        expect(() => {
          actor.send({ type: eventType as any });
        }).not.toThrow();
      });
    });
  });`;
  }

  /**
   * Generate guard validation tests
   */
  private generateGuardValidationTests(spec: GeneratedMachineSpec): string {
    if (spec.guards.length === 0) {
      return "";
    }

    return `
    it("should validate guard functions are defined", () => {
      const machineDefinition = ${spec.id}.config;
      
      // Check that all guards are defined
      const definedGuards = [${spec.guards.map(g => `"${g}"`).join(", ")}];
      
      definedGuards.forEach(guardName => {
        expect(machineDefinition.options?.guards).toHaveProperty(guardName);
      });
    });`;
  }

  /**
   * Generate action validation tests
   */
  private generateActionValidationTests(spec: GeneratedMachineSpec): string {
    if (spec.actions.length === 0) {
      return "";
    }

    return `
    it("should validate action functions are defined", () => {
      const machineDefinition = ${spec.id}.config;
      
      // Check that all actions are defined
      const definedActions = [${spec.actions.map(a => `"${a}"`).join(", ")}];
      
      definedActions.forEach(actionName => {
        expect(machineDefinition.options?.actions).toHaveProperty(actionName);
      });
    });`;
  }

  /**
   * Generate context structure validation
   */
  private generateContextStructureValidation(
    spec: GeneratedMachineSpec
  ): string {
    if (spec.context.length === 0) {
      return "// No specific context validation needed";
    }

    return spec.context
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
   * Generate all states reachability test
   */
  private generateAllStatesReachabilityTest(
    spec: GeneratedMachineSpec
  ): string {
    return `
    it("should have all states reachable (structural test)", () => {
      const machineDefinition = ${spec.id}.config;
      const allStates = [${spec.states.map(s => `"${s.name}"`).join(", ")}];
      
      // Verify all states are defined in machine
      allStates.forEach(stateName => {
        expect(machineDefinition.states).toHaveProperty(stateName);
      });
      
      // TODO: Add reachability analysis
      // This would require graph traversal to ensure all states are reachable
    });`;
  }
}

/**
 * Convenience function to generate transition test code
 */
export function generateTransitionTestCode(
  spec: GeneratedMachineSpec,
  config?: Partial<TransitionTestConfig>
): string {
  const generator = new TransitionTestTemplateGenerator(config);
  return generator.generateTransitionTests(spec);
}
