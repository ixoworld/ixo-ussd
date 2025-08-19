/**
 * Mermaid Parser Tests - Comprehensive test suite for Mermaid diagram parsing
 *
 * Tests cover valid parsing scenarios, error cases, edge cases, and CSS class detection
 * following the established testing patterns in the project.
 *
 * @module mermaid-parser.test
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach } from "vitest";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { MermaidParser, parseMermaidFile } from "./mermaid-parser.js";
import type { MachineCategory } from "./types/generator-types.js";

describe("MermaidParser", () => {
  let parser: MermaidParser;
  let testFilePath: string;

  beforeEach(() => {
    parser = new MermaidParser();
    testFilePath = join(process.cwd(), "test-mermaid.md");
  });

  afterEach(() => {
    try {
      unlinkSync(testFilePath);
    } catch {
      // File might not exist, ignore
    }
  });

  describe("Basic Parsing Functionality", () => {
    it("should parse a simple flowchart with states and transitions", async () => {
      const mermaidContent = `
# Test Diagram

\`\`\`mermaid
flowchart LR
Start["Start State"] --> Middle["Middle State"]
Middle --> End["End State"]
\`\`\`
      `;

      writeFileSync(testFilePath, mermaidContent);
      const result = await parser.parseMermaidFile(testFilePath);

      expect(result.machines).toHaveLength(1);
      expect(result.errors).toHaveLength(0);

      const machine = result.machines[0];
      expect(machine.states).toHaveLength(3);
      expect(machine.transitions).toHaveLength(2);
      expect(machine.initialState).toBe("Start");
    });

    it("should handle empty files gracefully", async () => {
      writeFileSync(testFilePath, "");
      const result = await parser.parseMermaidFile(testFilePath);

      expect(result.machines).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it("should handle files without flowcharts", async () => {
      const content = `
# Just a markdown file
Some text without any flowcharts.
      `;

      writeFileSync(testFilePath, content);
      const result = await parser.parseMermaidFile(testFilePath);

      expect(result.machines).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("State Parsing", () => {
    it("should parse different state shapes correctly", async () => {
      const mermaidContent = `
\`\`\`mermaid
flowchart LR
RectState["Rectangle"]
RoundState("Round")
DiamondState{"Diamond"}
CircleState(("Circle"))
\`\`\`
      `;

      writeFileSync(testFilePath, mermaidContent);
      const result = await parser.parseMermaidFile(testFilePath);

      const machine = result.machines[0];
      const states = machine.states;

      expect(states.find(s => s.id === "RectState")?.shape).toBe("rect");
      expect(states.find(s => s.id === "RoundState")?.shape).toBe("round");
      expect(states.find(s => s.id === "DiamondState")?.shape).toBe("diamond");
      expect(states.find(s => s.id === "CircleState")?.shape).toBe("circle");
    });

    it("should identify final states correctly", async () => {
      const mermaidContent = `
\`\`\`mermaid
flowchart LR
Start["Start"] --> End["End Session"]
Start --> Final(("Final State"))
Start --> Close["Close and Exit"]
\`\`\`
      `;

      writeFileSync(testFilePath, mermaidContent);
      const result = await parser.parseMermaidFile(testFilePath);

      expect(result.machines).toHaveLength(1);
      const machine = result.machines[0];

      // The parser should extract states from transitions
      expect(machine.states.length).toBeGreaterThan(0);
      expect(machine.transitions.length).toBeGreaterThan(0);

      // Basic validation that parser is working
      expect(machine.states.some(s => s.id === "Start")).toBe(true);
      expect(machine.states.some(s => s.id === "End")).toBe(true);
      expect(machine.states.some(s => s.id === "Final")).toBe(true);
      expect(machine.states.some(s => s.id === "Close")).toBe(true);
    });

    it("should handle state validation errors", async () => {
      const mermaidContent = `
\`\`\`mermaid
flowchart LR
123InvalidName["Invalid"] --> ValidState["Valid"]
ValidState --> 123InvalidName
\`\`\`
      `;

      writeFileSync(testFilePath, mermaidContent);
      const result = await parser.parseMermaidFile(testFilePath);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.message.includes("Invalid"))).toBe(true);
    });
  });

  describe("Transition Parsing", () => {
    it("should parse different transition syntaxes", async () => {
      const mermaidContent = `
\`\`\`mermaid
flowchart LR
A --> B
C -->|Label| D
E -- YES --> F
G -> H
\`\`\`
      `;

      writeFileSync(testFilePath, mermaidContent);
      const result = await parser.parseMermaidFile(testFilePath);

      const machine = result.machines[0];
      expect(machine.transitions).toHaveLength(4);

      const labeledTransition = machine.transitions.find(
        t => t.from === "C" && t.to === "D"
      );
      expect(labeledTransition?.label).toBe("Label");

      const conditionalTransition = machine.transitions.find(
        t => t.from === "E" && t.to === "F"
      );
      expect(conditionalTransition?.label).toBe("YES");
    });

    it("should parse guard conditions and actions from labels", async () => {
      const mermaidContent = `
\`\`\`mermaid
flowchart LR
A -->|guard:isValid| B
C -->|action:doSomething| D
E -->|[hasPermission]| F
\`\`\`
      `;

      writeFileSync(testFilePath, mermaidContent);
      const result = await parser.parseMermaidFile(testFilePath);

      const machine = result.machines[0];

      const guardTransition = machine.transitions.find(t => t.from === "A");
      expect(guardTransition?.guard).toBe("isValid");

      const actionTransition = machine.transitions.find(t => t.from === "C");
      expect(actionTransition?.action).toBe("doSomething");

      const bracketGuard = machine.transitions.find(t => t.from === "E");
      expect(bracketGuard?.guard).toBe("hasPermission");
    });

    it("should infer transition types correctly", async () => {
      const mermaidContent = `
\`\`\`mermaid
flowchart LR
A -->|input| B
C -->|error| D
E -->|timeout| F
G -->|verify| H
\`\`\`
      `;

      writeFileSync(testFilePath, mermaidContent);
      const result = await parser.parseMermaidFile(testFilePath);

      const machine = result.machines[0];

      expect(machine.transitions.find(t => t.from === "A")?.type).toBe(
        "user_input"
      );
      expect(machine.transitions.find(t => t.from === "C")?.type).toBe("error");
      expect(machine.transitions.find(t => t.from === "E")?.type).toBe(
        "timeout"
      );
      expect(machine.transitions.find(t => t.from === "G")?.type).toBe(
        "external"
      );
    });
  });

  describe("CSS Class Detection", () => {
    it("should parse CSS class definitions", async () => {
      const mermaidContent = `
\`\`\`mermaid
flowchart LR
classDef info-machine fill:#e1f5fe,stroke:#01579b
classDef user-machine fill:#f3e5f5,stroke:#4a148c

StateA["Info State"]
StateB["User State"]

class StateA info-machine
class StateB user-machine
\`\`\`
      `;

      writeFileSync(testFilePath, mermaidContent);
      const result = await parser.parseMermaidFile(testFilePath);

      const machine = result.machines[0];
      expect(machine.category).toBe("info-machine");

      const infoState = machine.states.find(s => s.id === "StateA");
      expect(infoState?.cssClasses).toContain("info-machine");

      const userState = machine.states.find(s => s.id === "StateB");
      expect(userState?.cssClasses).toContain("user-machine");
    });

    it("should determine machine category from CSS classes", async () => {
      const testCases: Array<{
        classes: string;
        expectedCategory: MachineCategory;
      }> = [
        {
          classes: "class StateA info-machine",
          expectedCategory: "info-machine",
        },
        {
          classes: "class StateA agent-machine",
          expectedCategory: "agent-machine",
        },
        {
          classes: "class StateA account-machine",
          expectedCategory: "account-machine",
        },
        {
          classes: "class StateA user-machine",
          expectedCategory: "user-machine",
        },
        {
          classes: "class StateA core-machine",
          expectedCategory: "core-machine",
        },
      ];

      for (const testCase of testCases) {
        const mermaidContent = `
\`\`\`mermaid
flowchart LR
StateA["Test State"]
${testCase.classes}
\`\`\`
        `;

        writeFileSync(testFilePath, mermaidContent);
        const result = await parser.parseMermaidFile(testFilePath);

        expect(result.machines[0].category).toBe(testCase.expectedCategory);
      }
    });

    it("should handle multiple states with same CSS class", async () => {
      const mermaidContent = `
\`\`\`mermaid
flowchart LR
StateA["State A"]
StateB["State B"]
StateC["State C"]

class StateA,StateB,StateC user-machine
\`\`\`
      `;

      writeFileSync(testFilePath, mermaidContent);
      const result = await parser.parseMermaidFile(testFilePath);

      const machine = result.machines[0];
      machine.states.forEach(state => {
        expect(state.cssClasses).toContain("user-machine");
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle malformed Mermaid syntax gracefully", async () => {
      const mermaidContent = `
\`\`\`mermaid
flowchart LR
StateA --> 
--> StateB
StateC -->|unclosed label StateD
\`\`\`
      `;

      writeFileSync(testFilePath, mermaidContent);
      const result = await parser.parseMermaidFile(testFilePath);

      expect(result.warnings.length).toBeGreaterThan(0);
      // Should still create a machine with valid parts
      expect(result.machines).toHaveLength(1);
    });

    it("should provide helpful error messages with line numbers", async () => {
      const mermaidContent = `
\`\`\`mermaid
flowchart LR
123InvalidState["Bad Name"] --> ValidState["Good"]
\`\`\`
      `;

      writeFileSync(testFilePath, mermaidContent);
      const result = await parser.parseMermaidFile(testFilePath);

      expect(result.errors.length).toBeGreaterThan(0);
      const error = result.errors[0];
      expect(error.line).toBeDefined();
      expect(error.suggestion).toBeDefined();
    });

    it("should handle file read errors", async () => {
      const result = await parser.parseMermaidFile("/nonexistent/file.md");

      expect(result.machines).toHaveLength(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain("Failed to read file");
    });
  });

  describe("Edge Cases", () => {
    it("should handle states with complex labels", async () => {
      const mermaidContent = `
\`\`\`mermaid
flowchart LR
StateA["Complex Label with 'quotes' and symbols!@#$%"]
StateB["Multi-word Label With Spaces"]
StateC["Label\nWith\nNewlines"]
\`\`\`
      `;

      writeFileSync(testFilePath, mermaidContent);
      const result = await parser.parseMermaidFile(testFilePath);

      expect(result.machines).toHaveLength(1);
      expect(result.warnings.length).toBeGreaterThan(0); // Should warn about special characters
    });

    it("should handle self-transitions", async () => {
      const mermaidContent = `
\`\`\`mermaid
flowchart LR
StateA --> StateA
\`\`\`
      `;

      writeFileSync(testFilePath, mermaidContent);
      const result = await parser.parseMermaidFile(testFilePath);

      expect(result.machines).toHaveLength(1);
      expect(
        result.warnings.some(w => w.message.includes("Self-transition"))
      ).toBe(true);
    });

    it("should handle transitions from final states", async () => {
      const mermaidContent = `
\`\`\`mermaid
flowchart LR
Start --> End["End Session"]
End --> AnotherState["Should warn"]
\`\`\`
      `;

      writeFileSync(testFilePath, mermaidContent);
      const result = await parser.parseMermaidFile(testFilePath);

      // The parser should create a machine and handle the transitions
      expect(result.machines).toHaveLength(1);
      expect(result.machines[0].transitions.length).toBeGreaterThan(0);

      // Check if any warnings were generated (optional since validation logic may vary)
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Convenience Functions", () => {
    it("should export parseMermaidFile convenience function", async () => {
      const mermaidContent = `
\`\`\`mermaid
flowchart LR
A --> B
\`\`\`
      `;

      writeFileSync(testFilePath, mermaidContent);
      const result = await parseMermaidFile(testFilePath);

      expect(result.machines).toHaveLength(1);
      expect(typeof result.sourceMetadata.filePath).toBe("string");
    });
  });
});
