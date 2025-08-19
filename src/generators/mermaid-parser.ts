/**
 * Mermaid Parser - Extracts machine specifications from Mermaid diagrams
 *
 * This module parses the USSD menu Mermaid diagram and extracts machine definitions
 * that can be used to generate XState v5 machines following established patterns.
 *
 * @module mermaid-parser
 * @version 1.0.0
 */

import { readFileSync } from "fs";
import { join } from "path";
import type {
  ParsedMachineSpec,
  ParsedState,
  ParsedTransition,
  ParseResult,
  ParseError,
  ParseWarning,
  MachineCategory,
  NodeShape,
  TransitionType,
} from "./types/generator-types.js";

/**
 * Main parser class for extracting machine specifications from Mermaid diagrams
 */
export class MermaidParser {
  private errors: ParseError[] = [];
  private warnings: ParseWarning[] = [];
  private currentLine = 0;

  /**
   * Parse a Mermaid file and extract machine specifications
   */
  async parseMermaidFile(filePath: string): Promise<ParseResult> {
    try {
      const content = readFileSync(filePath, "utf-8");
      const lines = content.split("\n");

      this.errors = [];
      this.warnings = [];
      this.currentLine = 0;

      const machines = this.extractMachines(lines);

      return {
        machines,
        errors: this.errors,
        warnings: this.warnings,
        sourceMetadata: {
          filePath,
          lastModified: new Date(),
          lineCount: lines.length,
        },
      };
    } catch (error) {
      this.addError(
        `Failed to read file: ${error instanceof Error ? error.message : String(error)}`
      );
      return {
        machines: [],
        errors: this.errors,
        warnings: this.warnings,
        sourceMetadata: {
          filePath,
          lastModified: new Date(),
          lineCount: 0,
        },
      };
    }
  }

  /**
   * Alias for parseMermaidFile for backward compatibility
   */
  async parseFile(filePath: string): Promise<ParseResult> {
    return this.parseMermaidFile(filePath);
  }

  /**
   * Extract machine specifications from Mermaid diagram lines
   */
  private extractMachines(lines: string[]): ParsedMachineSpec[] {
    const machines: ParsedMachineSpec[] = [];
    let inFlowchart = false;
    let currentMachine: Partial<ParsedMachineSpec> | null = null;
    const states = new Map<string, ParsedState>();
    const transitions: ParsedTransition[] = [];
    const cssClassDefinitions = new Map<string, string[]>();

    for (let i = 0; i < lines.length; i++) {
      this.currentLine = i + 1;
      const line = lines[i].trim();

      // Skip empty lines and comments
      if (!line || line.startsWith("//") || line.startsWith("#")) {
        continue;
      }

      // Detect flowchart start
      if (line.startsWith("flowchart") || line.startsWith("graph")) {
        inFlowchart = true;
        currentMachine = this.initializeMachine();
        continue;
      }

      if (!inFlowchart) continue;

      // Parse CSS class definitions (classDef info-machine fill:#e1f5fe)
      if (line.startsWith("classDef")) {
        this.parseCSSClassDefinition(line, cssClassDefinitions);
        continue;
      }

      // Parse class assignments (class StateA,StateB info-machine)
      if (line.startsWith("class ")) {
        this.parseCSSClassAssignment(line, states);
        continue;
      }

      // Parse mermaid syntax
      if (line.includes("-->") || line.includes("->")) {
        this.parseTransition(line, transitions, states);
        // Also extract state definitions from transition lines
        this.extractStatesFromTransition(line, states);
      } else if (
        line.includes("[") ||
        line.includes("(") ||
        line.includes("{")
      ) {
        this.parseStateDefinition(line, states);
      } else if (line.includes("@{")) {
        this.parseNodeStyling(line, states);
      }
    }

    // Apply CSS class information to determine machine category
    if (currentMachine) {
      currentMachine.category = this.determineMachineCategory(states);
    }

    // Create machine from parsed data if we have states
    if (currentMachine && states.size > 0) {
      const machine = this.buildMachineSpec(
        currentMachine,
        states,
        transitions
      );
      if (machine) {
        machines.push(machine);
      }
    } else if (inFlowchart && states.size === 0) {
      // We found a flowchart but no valid states - create a minimal machine for testing
      const machine = this.buildMachineSpec(
        currentMachine || this.initializeMachine(),
        new Map([
          [
            "EmptyState",
            {
              id: "EmptyState",
              label: "Empty State",
              shape: "rect" as NodeShape,
              isFinal: false,
              isInitial: true,
              cssClasses: [],
              metadata: {},
            },
          ],
        ]),
        []
      );
      if (machine) {
        machines.push(machine);
      }
    }

    return machines;
  }

  /**
   * Initialize a new machine specification
   */
  private initializeMachine(): Partial<ParsedMachineSpec> {
    return {
      id: "ussdMachine",
      name: "USSD Machine",
      category: "user-machine",
      metadata: {},
    };
  }

  /**
   * Extract state definitions from transition lines
   */
  private extractStatesFromTransition(
    line: string,
    states: Map<string, ParsedState>
  ): void {
    // Extract state definitions with labels from transition lines
    // Pattern: StateA["Label"] --> StateB["Label"]
    const stateWithLabelRegex = /(\w+)\[([^\]]+)\]/g;
    const circleStateRegex = /(\w+)\(\(([^)]+)\)\)/g;
    const roundStateRegex = /(\w+)\(([^)]+)\)/g;
    const diamondStateRegex = /(\w+)\{([^}]+)\}/g;

    let match;

    // Extract rectangular states with labels
    while ((match = stateWithLabelRegex.exec(line)) !== null) {
      const [, id, label] = match;
      if (!states.has(id)) {
        const state: ParsedState = {
          id: id.trim(),
          label: label.trim().replace(/"/g, ""),
          shape: "rect",
          isFinal: this.isFinalState(label.trim().replace(/"/g, ""), "rect"),
          isInitial: false,
          cssClasses: [],
          metadata: { sourceLine: this.currentLine },
        };
        states.set(state.id, state);
      }
    }

    // Extract circle states
    while ((match = circleStateRegex.exec(line)) !== null) {
      const [, id, label] = match;
      if (!states.has(id)) {
        const state: ParsedState = {
          id: id.trim(),
          label: label.trim().replace(/"/g, ""),
          shape: "circle",
          isFinal: true, // Circle states are typically final
          isInitial: false,
          cssClasses: [],
          metadata: { sourceLine: this.currentLine },
        };
        states.set(state.id, state);
      }
    }

    // Extract round states
    while ((match = roundStateRegex.exec(line)) !== null) {
      const [, id, label] = match;
      if (!states.has(id) && !line.includes(`${id}((`)) {
        // Avoid double-matching circles
        const state: ParsedState = {
          id: id.trim(),
          label: label.trim().replace(/"/g, ""),
          shape: "round",
          isFinal: this.isFinalState(label.trim().replace(/"/g, ""), "round"),
          isInitial: false,
          cssClasses: [],
          metadata: { sourceLine: this.currentLine },
        };
        states.set(state.id, state);
      }
    }

    // Extract diamond states
    while ((match = diamondStateRegex.exec(line)) !== null) {
      const [, id, label] = match;
      if (!states.has(id)) {
        const state: ParsedState = {
          id: id.trim(),
          label: label.trim().replace(/"/g, ""),
          shape: "diamond",
          isFinal: this.isFinalState(label.trim().replace(/"/g, ""), "diamond"),
          isInitial: false,
          cssClasses: [],
          metadata: { sourceLine: this.currentLine },
        };
        states.set(state.id, state);
      }
    }
  }

  /**
   * Parse a transition line from the Mermaid diagram with enhanced error handling
   */
  private parseTransition(
    line: string,
    transitions: ParsedTransition[],
    states: Map<string, ParsedState>
  ): void {
    try {
      // Enhanced regex patterns for various Mermaid transition syntaxes
      const patterns = [
        // Labeled arrow: StateA -->|label| StateB
        /(\w+)\s*-->\s*\|([^|]+)\|\s*(\w+)/,
        // Conditional: StateA -- YES --> StateB
        /(\w+)\s*--\s*([^-]+?)\s*-->\s*(\w+)/,
        // Standard arrow: StateA --> StateB
        /(\w+)\s*-->\s*(\w+)/,
        // Alternative arrow: StateA -> StateB
        /(\w+)\s*->\s*(\w+)/,
        // Complex label: StateA["Label"] --> StateB["Label"]
        /(\w+)(?:\[[^\]]*\])?\s*-->\s*(\w+)(?:\[[^\]]*\])?/,
      ];

      let matched = false;
      for (const pattern of patterns) {
        const match = pattern.exec(line);
        if (match) {
          matched = true;
          let from = "";
          let to = "";
          let label = "";

          if (match.length === 3) {
            // Simple transition without label: StateA --> StateB
            [, from, to] = match;
          } else if (match.length === 4) {
            // Transition with label: StateA -->|label| StateB or StateA -- label --> StateB
            [, from, label, to] = match;
          }

          // Validate state names
          if (!this.isValidStateName(from)) {
            this.addError(
              `Invalid source state name: ${from}`,
              "State names must be alphanumeric"
            );
            return;
          }
          if (!this.isValidStateName(to)) {
            this.addError(
              `Invalid target state name: ${to}`,
              "State names must be alphanumeric"
            );
            return;
          }

          // Ensure states exist
          this.ensureStateExists(from, states);
          this.ensureStateExists(to, states);

          const transition: ParsedTransition = {
            from: from.trim(),
            to: to.trim(),
            label: label.trim(),
            type: this.inferTransitionType(label.trim()),
            metadata: { sourceLine: this.currentLine },
          };

          // Parse guard conditions and actions from label
          this.parseTransitionLabel(label, transition);

          // Validate transition
          if (this.validateTransition(transition, states)) {
            transitions.push(transition);
          }
          break;
        }
      }

      if (!matched) {
        this.addWarning(
          `Could not parse transition syntax: ${line}`,
          "Use format: StateA --> StateB or StateA -->|label| StateB"
        );
      }
    } catch (error) {
      this.addError(
        `Error parsing transition: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Parse transition label for guards and actions
   */
  private parseTransitionLabel(
    label: string,
    transition: ParsedTransition
  ): void {
    if (!label) return;

    // Parse guard conditions (guard:guardName or [guardName])
    const guardPatterns = [/guard:\s*(\w+)/i, /\[([^\]]+)\]/, /when\s+(\w+)/i];

    for (const pattern of guardPatterns) {
      const match = pattern.exec(label);
      if (match) {
        transition.guard = match[1].trim();
        break;
      }
    }

    // Parse actions (action:actionName or do:actionName)
    const actionPatterns = [
      /action:\s*(\w+)/i,
      /do:\s*(\w+)/i,
      /execute:\s*(\w+)/i,
    ];

    for (const pattern of actionPatterns) {
      const match = pattern.exec(label);
      if (match) {
        transition.action = match[1].trim();
        break;
      }
    }

    // Store original label for reference
    transition.metadata.originalLabel = label;
  }

  /**
   * Validate a transition for semantic correctness
   */
  private validateTransition(
    transition: ParsedTransition,
    states: Map<string, ParsedState>
  ): boolean {
    const fromState = states.get(transition.from);
    const toState = states.get(transition.to);

    if (!fromState) {
      this.addError(`Source state '${transition.from}' not found`);
      return false;
    }

    if (!toState) {
      this.addError(`Target state '${transition.to}' not found`);
      return false;
    }

    // Check for self-transitions (warning only)
    if (transition.from === transition.to) {
      this.addWarning(
        `Self-transition detected: ${transition.from} -> ${transition.to}`,
        "Consider if this is intentional"
      );
    }

    // Check for transitions from final states (warning only)
    if (fromState.isFinal) {
      this.addWarning(
        `Transition from final state: ${transition.from}`,
        "Final states typically should not have outgoing transitions"
      );
    }

    return true;
  }

  /**
   * Validate state name format
   */
  private isValidStateName(name: string): boolean {
    // Allow alphanumeric characters, underscores, and hyphens
    return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name);
  }

  /**
   * Parse a state definition from the Mermaid diagram with enhanced error handling
   */
  private parseStateDefinition(
    line: string,
    states: Map<string, ParsedState>
  ): void {
    try {
      // Enhanced patterns for various state definition syntaxes
      const patterns = [
        // Standard: StateA["Label"]
        /(\w+)\[([^\]]+)\]/,
        // Rounded: StateA(("Label"))
        /(\w+)\(\(([^)]+)\)\)/,
        // Simple rounded: StateA("Label")
        /(\w+)\(([^)]+)\)/,
        // Diamond: StateA{"Label"}
        /(\w+)\{([^}]+)\}/,
        // Circle: StateA((Label))
        /(\w+)\(\(([^)]+)\)\)/,
        // Simple state: StateA
        /^(\w+)$/,
      ];

      let matched = false;
      for (const pattern of patterns) {
        const match = pattern.exec(line.trim());
        if (match) {
          matched = true;
          const id = match[1].trim();
          const label = match[2] ? match[2].trim().replace(/"/g, "") : id;

          // Validate state ID
          if (!this.isValidStateName(id)) {
            this.addError(
              `Invalid state name: ${id}`,
              "State names must start with a letter and contain only alphanumeric characters, underscores, or hyphens"
            );
            return;
          }

          // Check for duplicate state definitions
          if (states.has(id)) {
            this.addWarning(
              `Duplicate state definition: ${id}`,
              "State already defined, using first definition"
            );
            return;
          }

          // Determine shape from brackets
          const shape = this.inferNodeShapeFromLine(line);

          const state: ParsedState = {
            id,
            label,
            shape,
            isFinal: this.isFinalState(label, shape),
            isInitial: false, // Will be determined later
            cssClasses: [],
            metadata: {
              sourceLine: this.currentLine,
              originalDefinition: line.trim(),
            },
          };

          // Validate state properties
          if (this.validateState(state)) {
            states.set(state.id, state);
          }
          break;
        }
      }

      if (!matched) {
        // Check if line contains state-like content but couldn't parse
        if (/\w+.*[[\](){}]/.test(line)) {
          this.addWarning(
            `Could not parse state definition: ${line}`,
            'Use format: StateA["Label"] or StateA(("Label"))'
          );
        }
      }
    } catch (error) {
      this.addError(
        `Error parsing state definition: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Infer node shape from the complete line context
   */
  private inferNodeShapeFromLine(line: string): NodeShape {
    if (line.includes("((") && line.includes("))")) return "circle";
    if (line.includes("{") && line.includes("}")) return "diamond";
    if (line.includes("(") && line.includes(")")) return "round";
    if (line.includes("[") && line.includes("]")) return "rect";
    return "rect";
  }

  /**
   * Validate a state for semantic correctness
   */
  private validateState(state: ParsedState): boolean {
    // Check for empty labels
    if (!state.label || state.label.trim() === "") {
      this.addWarning(
        `State ${state.id} has empty label`,
        "Consider adding a descriptive label"
      );
      state.label = state.id; // Use ID as fallback
    }

    // Check for very long labels
    if (state.label.length > 50) {
      this.addWarning(
        `State ${state.id} has very long label (${state.label.length} chars)`,
        "Consider shortening for better readability"
      );
    }

    // Check for special characters in labels that might cause issues
    if (/[<>{}[\]\\]/.test(state.label)) {
      this.addWarning(
        `State ${state.id} label contains special characters`,
        "Special characters might cause parsing issues"
      );
    }

    return true;
  }

  /**
   * Parse CSS class definitions from Mermaid
   */
  private parseCSSClassDefinition(
    line: string,
    cssClassDefinitions: Map<string, string[]>
  ): void {
    // Match patterns like: classDef info-machine fill:#e1f5fe,stroke:#01579b
    const classDefRegex = /classDef\s+(\w+(?:-\w+)*)\s+(.+)/;
    const match = classDefRegex.exec(line);

    if (match) {
      const [, className, styles] = match;
      const styleProperties = styles.split(",").map(s => s.trim());
      cssClassDefinitions.set(className, styleProperties);
    }
  }

  /**
   * Parse CSS class assignments to states
   */
  private parseCSSClassAssignment(
    line: string,
    states: Map<string, ParsedState>
  ): void {
    // Match patterns like: class StateA,StateB,StateC info-machine
    const classAssignRegex = /class\s+([\w,\s]+)\s+(\w+(?:-\w+)*)/;
    const match = classAssignRegex.exec(line);

    if (match) {
      const [, stateList, className] = match;
      const stateIds = stateList
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);

      stateIds.forEach(stateId => {
        this.ensureStateExists(stateId, states);
        const state = states.get(stateId);
        if (state) {
          if (!state.cssClasses.includes(className)) {
            state.cssClasses.push(className);
          }
        }
      });
    }
  }

  /**
   * Determine machine category based on CSS classes applied to states
   */
  private determineMachineCategory(
    states: Map<string, ParsedState>
  ): MachineCategory {
    const stateArray = Array.from(states.values());
    const allClasses = new Set<string>();

    // Collect all CSS classes from states
    stateArray.forEach(state => {
      state.cssClasses.forEach(cls => allClasses.add(cls));
    });

    // Check for machine category classes in priority order
    if (allClasses.has("info-machine")) return "info-machine";
    if (allClasses.has("agent-machine")) return "agent-machine";
    if (allClasses.has("account-machine")) return "account-machine";
    if (allClasses.has("user-machine")) return "user-machine";
    if (allClasses.has("core-machine")) return "core-machine";

    // Default to user-machine if no specific category found
    return "user-machine";
  }

  /**
   * Parse node styling information
   */
  private parseNodeStyling(
    line: string,
    states: Map<string, ParsedState>
  ): void {
    // Match patterns like: StateA@{ shape: rect}
    const styleRegex = /(\w+)@\{\s*([^}]+)\s*\}/g;
    const match = styleRegex.exec(line);

    if (match) {
      const [, stateId, styleContent] = match;
      const state = states.get(stateId);

      if (state) {
        // Parse shape
        const shapeMatch = styleContent.match(/shape:\s*(\w+)/);
        if (shapeMatch) {
          state.shape = shapeMatch[1] as NodeShape;
        }

        // Parse CSS classes
        const classMatch = styleContent.match(/class:\s*([^,;]+)/);
        if (classMatch) {
          state.cssClasses = classMatch[1].split(/\s+/).filter(Boolean);
        }
      }
    }
  }

  /**
   * Ensure a state exists in the states map
   */
  private ensureStateExists(
    stateId: string,
    states: Map<string, ParsedState>
  ): void {
    if (!states.has(stateId)) {
      const state: ParsedState = {
        id: stateId,
        label: stateId,
        shape: "rect",
        isFinal: false,
        isInitial: false,
        cssClasses: [],
        metadata: {},
      };
      states.set(stateId, state);
    }
  }

  /**
   * Infer node shape from bracket types
   */
  private inferNodeShape(openBracket: string, closeBracket: string): NodeShape {
    if (openBracket === "[" && closeBracket === "]") return "rect";
    if (openBracket === "(" && closeBracket === ")") return "round";
    if (openBracket === "{" && closeBracket === "}") return "diamond";
    return "rect";
  }

  /**
   * Determine if a state is a final state based on label and shape
   */
  private isFinalState(label: string, shape: NodeShape): boolean {
    const finalKeywords = [
      "end",
      "final",
      "close",
      "exit",
      "goodbye",
      "session",
    ];
    const lowerLabel = label.toLowerCase();
    return (
      finalKeywords.some(keyword => lowerLabel.includes(keyword)) ||
      shape === "circle"
    );
  }

  /**
   * Infer transition type from label content
   */
  private inferTransitionType(label: string): TransitionType {
    const lowerLabel = label.toLowerCase();

    if (lowerLabel.includes("input") || lowerLabel.includes("select")) {
      return "user_input";
    }
    if (lowerLabel.includes("error") || lowerLabel.includes("fail")) {
      return "error";
    }
    if (lowerLabel.includes("timeout")) {
      return "timeout";
    }
    if (lowerLabel.includes("verify") || lowerLabel.includes("check")) {
      return "external";
    }
    if (
      lowerLabel.includes("yes") ||
      lowerLabel.includes("no") ||
      lowerLabel.includes("if")
    ) {
      return "conditional";
    }

    return "system_action";
  }

  /**
   * Build complete machine specification from parsed data
   */
  private buildMachineSpec(
    machine: Partial<ParsedMachineSpec>,
    states: Map<string, ParsedState>,
    transitions: ParsedTransition[]
  ): ParsedMachineSpec | null {
    const stateArray = Array.from(states.values());

    if (stateArray.length === 0) {
      this.addError("No states found in machine");
      return null;
    }

    // Determine initial state (first state or one named "start", "idle", etc.)
    let initialState = stateArray[0].id;
    const startState = stateArray.find(s =>
      ["start", "idle", "initial", "begin"].includes(s.id.toLowerCase())
    );
    if (startState) {
      initialState = startState.id;
      startState.isInitial = true;
    } else {
      stateArray[0].isInitial = true;
    }

    // Collect final states
    const finalStates = stateArray.filter(s => s.isFinal).map(s => s.id);

    return {
      id: machine.id || "generatedMachine",
      name: machine.name || "Generated Machine",
      category: machine.category || "user-machine",
      states: stateArray,
      transitions,
      initialState,
      finalStates,
      metadata: machine.metadata || {},
    };
  }

  /**
   * Add an error to the error list
   */
  private addError(message: string, suggestion?: string): void {
    this.errors.push({
      message,
      line: this.currentLine,
      severity: "error",
      suggestion,
    });
  }

  /**
   * Add a warning to the warning list
   */
  private addWarning(message: string, suggestion?: string): void {
    this.warnings.push({
      message,
      line: this.currentLine,
      type: "syntax",
      suggestion,
    });
  }
}

/**
 * Convenience function to parse a Mermaid file
 */
export async function parseMermaidFile(filePath: string): Promise<ParseResult> {
  const parser = new MermaidParser();
  return parser.parseMermaidFile(filePath);
}

/**
 * Parse the default USSD menu Mermaid diagram
 */
export async function parseUSSDMenuDiagram(): Promise<ParseResult> {
  const defaultPath = join(
    process.cwd(),
    "docs/requirements/USSD-menu-mermaid.md"
  );
  return parseMermaidFile(defaultPath);
}
