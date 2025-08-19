/**
 * Error Handling Test Template Generator
 *
 * This module provides templates for generating comprehensive error handling tests
 * covering invalid inputs, edge cases, and error recovery scenarios.
 *
 * @module error-test-template
 * @version 1.0.0
 */

import type { GeneratedMachineSpec } from "../types/generator-types.js";

/**
 * Error test configuration
 */
export interface ErrorTestConfig {
  /** Whether to include boundary value tests */
  includeBoundaryTests: boolean;

  /** Whether to include malformed input tests */
  includeMalformedInputTests: boolean;

  /** Whether to include concurrent access tests */
  includeConcurrencyTests: boolean;

  /** Whether to include memory/resource tests */
  includeResourceTests: boolean;
}

/**
 * Default error test configuration
 */
export const DEFAULT_ERROR_TEST_CONFIG: ErrorTestConfig = {
  includeBoundaryTests: true,
  includeMalformedInputTests: true,
  includeConcurrencyTests: false,
  includeResourceTests: false,
};

/**
 * Error test template generator class
 */
export class ErrorTestTemplateGenerator {
  private config: ErrorTestConfig;

  constructor(config: Partial<ErrorTestConfig> = {}) {
    this.config = { ...DEFAULT_ERROR_TEST_CONFIG, ...config };
  }

  /**
   * Generate comprehensive error handling tests
   */
  generateErrorTests(spec: GeneratedMachineSpec): string {
    const parts = [
      this.generateErrorTestHeader(spec),
      this.generateErrorTestImports(spec),
      this.generateErrorTestSuite(spec),
    ];

    return parts.join("\n\n");
  }

  /**
   * Generate error test file header
   */
  private generateErrorTestHeader(spec: GeneratedMachineSpec): string {
    return `/**
 * ${spec.name} Error Handling Tests - Generated Error Test Suite
 *
 * Auto-generated comprehensive error handling tests for ${spec.name} XState v5 machine.
 * Tests cover invalid inputs, edge cases, and error recovery scenarios.
 *
 * @module ${spec.name}.errors.test
 * @generated true
 * @version 1.0.0
 */`;
  }

  /**
   * Generate error test imports
   */
  private generateErrorTestImports(spec: GeneratedMachineSpec): string {
    const imports = [
      'import { describe, it, expect, beforeEach, afterEach } from "vitest";',
      'import { createActor } from "xstate";',
      `import { ${spec.id}, type Context, type Events } from "./${spec.name}.generated.js";`,
    ];

    return imports.join("\n");
  }

  /**
   * Generate main error test suite
   */
  private generateErrorTestSuite(spec: GeneratedMachineSpec): string {
    const parts = [
      this.generateBasicErrorHandlingTests(spec),
      this.generateInvalidInputTests(spec),
      this.generateBoundaryValueTests(),
      this.generateEdgeCaseTests(spec),
      this.generateErrorRecoveryTests(),
      this.generateConcurrencyTests(spec),
    ];

    return parts.filter(Boolean).join("\n\n");
  }

  /**
   * Generate basic error handling tests
   */
  private generateBasicErrorHandlingTests(spec: GeneratedMachineSpec): string {
    return `describe("${spec.id} - Error Handling Tests", () => {
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

  describe("Basic Error Handling", () => {
    it("should handle null/undefined events gracefully", () => {
      expect(() => {
        actor.send(null as any);
      }).not.toThrow();
      
      expect(() => {
        actor.send(undefined as any);
      }).not.toThrow();
      
      // Machine should remain stable
      expect(actor.getSnapshot().status).toBe("active");
    });

    it("should handle malformed event objects", () => {
      const malformedEvents = [
        {},
        { type: null },
        { type: undefined },
        { type: "" },
        { type: 123 },
        { type: {} },
        { type: [] },
        { notType: "INVALID" },
      ];

      malformedEvents.forEach(event => {
        expect(() => {
          actor.send(event as any);
        }).not.toThrow();
      });

      // Machine should remain stable after all malformed events
      expect(actor.getSnapshot().status).toBe("active");
    });

    it("should handle events with invalid payload", () => {
      const invalidPayloads = [
        { type: "ERROR", error: null },
        { type: "ERROR", error: undefined },
        { type: "ERROR", error: 123 },
        { type: "ERROR", error: {} },
        { type: "ERROR", error: [] },
        { type: "ERROR", extraField: "unexpected" },
      ];

      invalidPayloads.forEach(event => {
        expect(() => {
          actor.send(event as any);
        }).not.toThrow();
      });

      expect(actor.getSnapshot().status).toBe("active");
    });

    it("should handle circular references in event data", () => {
      const circularEvent: any = { type: "ERROR" };
      circularEvent.circular = circularEvent;

      expect(() => {
        actor.send(circularEvent);
      }).not.toThrow();

      expect(actor.getSnapshot().status).toBe("active");
    });

    it("should handle very large event payloads", () => {
      const largeString = "x".repeat(10000);
      const largeArray = new Array(1000).fill("data");
      const largeObject = Object.fromEntries(
        Array.from({ length: 100 }, (_, i) => [\`key\${i}\`, \`value\${i}\`])
      );

      const largeEvents = [
        { type: "ERROR", error: largeString },
        { type: "ERROR", data: largeArray },
        { type: "ERROR", payload: largeObject },
      ];

      largeEvents.forEach(event => {
        expect(() => {
          actor.send(event as any);
        }).not.toThrow();
      });

      expect(actor.getSnapshot().status).toBe("active");
    });
  });`;
  }

  /**
   * Generate invalid input tests
   */
  private generateInvalidInputTests(spec: GeneratedMachineSpec): string {
    if (!this.config.includeMalformedInputTests) {
      return "";
    }

    return `
  describe("Invalid Input Handling", () => {
    it("should handle invalid context on creation", () => {
      const invalidContexts = [
        null,
        undefined,
        "string",
        123,
        [],
        true,
        Symbol("test"),
      ];

      invalidContexts.forEach(invalidContext => {
        expect(() => {
          const testActor = createActor(${spec.id}, {
            input: invalidContext as any,
          });
          testActor.start();
          testActor.stop();
        }).not.toThrow();
      });
    });

    it("should handle context with invalid field types", () => {
      const invalidContextFields = {
        ${this.generateInvalidContextFields(spec)}
      };

      expect(() => {
        const testActor = createActor(${spec.id}, {
          input: invalidContextFields,
        });
        testActor.start();
        testActor.stop();
      }).not.toThrow();
    });

    it("should handle missing required context fields", () => {
      const incompleteContext = {
        // Intentionally missing required fields
      };

      expect(() => {
        const testActor = createActor(${spec.id}, {
          input: incompleteContext,
        });
        testActor.start();
        testActor.stop();
      }).not.toThrow();
    });

    it("should handle extra unexpected context fields", () => {
      const contextWithExtras = {
        ${this.generateValidContextSample(spec)}
        unexpectedField: "should be ignored",
        anotherExtra: 123,
        nestedExtra: { deep: { value: true } },
      };

      expect(() => {
        const testActor = createActor(${spec.id}, {
          input: contextWithExtras,
        });
        testActor.start();
        testActor.stop();
      }).not.toThrow();
    });
  });`;
  }

  /**
   * Generate boundary value tests
   */
  private generateBoundaryValueTests(): string {
    if (!this.config.includeBoundaryTests) {
      return "";
    }

    return `
  describe("Boundary Value Tests", () => {
    it("should handle empty string inputs", () => {
      const emptyStringEvents = [
        { type: "ERROR", error: "" },
        { type: "START", input: "" },
      ];

      emptyStringEvents.forEach(event => {
        expect(() => {
          actor.send(event as any);
        }).not.toThrow();
      });

      expect(actor.getSnapshot().status).toBe("active");
    });

    it("should handle maximum length string inputs", () => {
      const maxLengthString = "x".repeat(1000);
      
      expect(() => {
        actor.send({ type: "ERROR", error: maxLengthString });
      }).not.toThrow();

      expect(actor.getSnapshot().status).toBe("active");
    });

    it("should handle numeric boundary values", () => {
      const boundaryNumbers = [
        0,
        -0,
        1,
        -1,
        Number.MAX_SAFE_INTEGER,
        Number.MIN_SAFE_INTEGER,
        Number.MAX_VALUE,
        Number.MIN_VALUE,
        Infinity,
        -Infinity,
        NaN,
      ];

      boundaryNumbers.forEach(num => {
        expect(() => {
          actor.send({ type: "ERROR", code: num } as any);
        }).not.toThrow();
      });

      expect(actor.getSnapshot().status).toBe("active");
    });

    it("should handle special characters in strings", () => {
      const specialCharStrings = [
        "\\n\\r\\t",
        "\\u0000\\u0001\\u0002",
        "🚀🎉💻",
        "\\x00\\x01\\x02",
        "\\"\\'\`",
        "<script>alert('xss')</script>",
        "../../etc/passwd",
        "'; DROP TABLE users; --",
      ];

      specialCharStrings.forEach(str => {
        expect(() => {
          actor.send({ type: "ERROR", error: str });
        }).not.toThrow();
      });

      expect(actor.getSnapshot().status).toBe("active");
    });
  });`;
  }

  /**
   * Generate edge case tests
   */
  private generateEdgeCaseTests(spec: GeneratedMachineSpec): string {
    return `
  describe("Edge Case Handling", () => {
    it("should handle rapid start/stop cycles", () => {
      expect(() => {
        for (let i = 0; i < 10; i++) {
          actor.stop();
          actor.start();
        }
      }).not.toThrow();

      expect(actor.getSnapshot().status).toBe("active");
    });

    it("should handle events sent to stopped machine", () => {
      actor.stop();

      expect(() => {
        actor.send({ type: "START" });
        actor.send({ type: "ERROR", error: "test" });
      }).not.toThrow();

      // Machine should remain stopped
      expect(actor.getSnapshot().status).toBe("stopped");
    });

    it("should handle multiple identical events", () => {
      const sameEvent = { type: "START" };

      expect(() => {
        for (let i = 0; i < 100; i++) {
          actor.send(sameEvent);
        }
      }).not.toThrow();

      expect(actor.getSnapshot().status).toBe("active");
    });

    it("should handle event flooding", () => {
      const events = [
        { type: "START" },
        { type: "BACK" },
        { type: "MAIN" },
        { type: "ERROR", error: "flood test" },
      ];

      expect(() => {
        for (let i = 0; i < 1000; i++) {
          const event = events[i % events.length];
          actor.send(event);
        }
      }).not.toThrow();

      expect(actor.getSnapshot().status).toBe("active");
    });

    it("should handle state machine recreation", () => {
      const originalState = actor.getSnapshot().value;

      // Stop and recreate
      actor.stop();
      actor = createActor(${spec.id});
      actor.start();

      // Should start in same initial state
      expect(actor.getSnapshot().value).toBe(originalState);
    });
  });`;
  }

  /**
   * Generate error recovery tests
   */
  private generateErrorRecoveryTests(): string {
    return `
  describe("Error Recovery", () => {
    it("should recover from error states", () => {
      // Trigger error
      actor.send({ type: "ERROR", error: "Test error" });

      // Should be able to recover
      expect(() => {
        actor.send({ type: "BACK" });
        actor.send({ type: "MAIN" });
        actor.send({ type: "START" });
      }).not.toThrow();

      expect(actor.getSnapshot().status).toBe("active");
    });

    it("should maintain context integrity during errors", () => {
      const initialContext = actor.getSnapshot().context;

      // Send error event
      actor.send({ type: "ERROR", error: "Context test" });

      const errorContext = actor.getSnapshot().context;

      // Context should still be valid object
      expect(typeof errorContext).toBe("object");
      expect(errorContext).toBeDefined();

      // Should be able to continue operating
      actor.send({ type: "START" });
      expect(actor.getSnapshot().status).toBe("active");
    });

    it("should handle cascading errors gracefully", () => {
      // Send multiple error events
      const errors = [
        "First error",
        "Second error",
        "Third error",
        "",
        null,
        undefined,
      ];

      errors.forEach(error => {
        expect(() => {
          actor.send({ type: "ERROR", error: error as any });
        }).not.toThrow();
      });

      // Should still be functional
      expect(actor.getSnapshot().status).toBe("active");
      
      // Should be able to recover
      actor.send({ type: "MAIN" });
      expect(actor.getSnapshot().status).toBe("active");
    });

    it("should handle error during state transitions", () => {
      // Start a transition
      actor.send({ type: "START" });

      // Send error during transition
      actor.send({ type: "ERROR", error: "Mid-transition error" });

      // Should handle gracefully
      expect(actor.getSnapshot().status).toBe("active");

      // Should be able to continue
      actor.send({ type: "BACK" });
      expect(actor.getSnapshot().status).toBe("active");
    });
  });`;
  }

  /**
   * Generate concurrency tests
   */
  private generateConcurrencyTests(spec: GeneratedMachineSpec): string {
    if (!this.config.includeConcurrencyTests) {
      return "";
    }

    return `
  describe("Concurrency and Race Conditions", () => {
    it("should handle concurrent event sending", async () => {
      const promises = Array.from({ length: 10 }, (_, i) => 
        Promise.resolve().then(() => {
          actor.send({ type: "START" });
          actor.send({ type: "BACK" });
        })
      );

      await expect(Promise.all(promises)).resolves.toBeDefined();
      expect(actor.getSnapshot().status).toBe("active");
    });

    it("should handle multiple actor instances", () => {
      const actors = Array.from({ length: 5 }, () => {
        const a = createActor(${spec.id});
        a.start();
        return a;
      });

      // Send events to all actors
      actors.forEach(a => {
        expect(() => {
          a.send({ type: "START" });
          a.send({ type: "ERROR", error: "Multi-actor test" });
        }).not.toThrow();
      });

      // All should remain active
      actors.forEach(a => {
        expect(a.getSnapshot().status).toBe("active");
        a.stop();
      });
    });
  });`;
  }

  /**
   * Generate invalid context fields for testing
   */
  private generateInvalidContextFields(spec: GeneratedMachineSpec): string {
    if (spec.context.length === 0) {
      return "// No context fields to test";
    }

    return spec.context
      .slice(0, 3)
      .map(field => {
        let invalidValue = "null";

        if (field.type.includes("string")) {
          invalidValue = "123"; // number instead of string
        } else if (field.type.includes("number")) {
          invalidValue = '"not-a-number"'; // string instead of number
        } else if (field.type.includes("boolean")) {
          invalidValue = '"not-a-boolean"'; // string instead of boolean
        }

        return `${field.name}: ${invalidValue}`;
      })
      .join(",\n        ");
  }

  /**
   * Generate valid context sample for testing
   */
  private generateValidContextSample(spec: GeneratedMachineSpec): string {
    if (spec.context.length === 0) {
      return "// No context fields defined";
    }

    return spec.context
      .slice(0, 2)
      .map(field => {
        let validValue = field.defaultValue || "undefined";

        if (field.type.includes("string") && !validValue.startsWith('"')) {
          validValue = '"test-value"';
        } else if (field.type.includes("number") && isNaN(Number(validValue))) {
          validValue = "42";
        } else if (field.type.includes("boolean")) {
          validValue = "true";
        }

        return `${field.name}: ${validValue}`;
      })
      .join(",\n        ");
  }
}

/**
 * Convenience function to generate error test code
 */
export function generateErrorTestCode(
  spec: GeneratedMachineSpec,
  config?: Partial<ErrorTestConfig>
): string {
  const generator = new ErrorTestTemplateGenerator(config);
  return generator.generateErrorTests(spec);
}
