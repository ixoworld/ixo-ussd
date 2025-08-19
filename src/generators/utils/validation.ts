/**
 * Validation Utilities
 *
 * This module provides comprehensive validation for Mermaid syntax, business rules,
 * and generated code to ensure quality and consistency.
 *
 * @module validation
 * @version 1.0.0
 */

import { existsSync, readFileSync } from "fs";
// Path utilities not needed for validation logic
import type {
  ParsedMachineSpec,
  ParsedTransition,
  BusinessValidationMachineSpec,
  BusinessValidationState,
  BusinessValidationTransition,
  MachineCategory,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from "../types/generator-types.js";

/**
 * Validation severity levels
 */
export enum ValidationSeverity {
  ERROR = "error",
  WARNING = "warning",
  INFO = "info",
}

/**
 * Validation rule configuration
 */
export interface ValidationConfig {
  strictMode: boolean;
  checkBusinessRules: boolean;
  validateTransitions: boolean;
  validateNaming: boolean;
  validateStructure: boolean;
  maxStatesPerMachine: number;
  maxTransitionsPerState: number;
  allowedCategories: MachineCategory[];
}

/**
 * Default validation configuration
 */
export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  strictMode: true,
  checkBusinessRules: true,
  validateTransitions: true,
  validateNaming: true,
  validateStructure: true,
  maxStatesPerMachine: 50,
  maxTransitionsPerState: 20,
  allowedCategories: [
    "user-machine",
    "agent-machine",
    "account-machine",
    "info-machine",
    "core-machine",
  ],
};

/**
 * Mermaid syntax validation patterns
 */
const MERMAID_PATTERNS = {
  flowchartStart: /^flowchart\s+(TD|TB|BT|RL|LR)$/,
  nodeDefinition:
    /^([A-Za-z0-9_]+)(\[.*?\]|\(.*?\)|\{.*?\}|>.*?<|\[\[.*?\]\])?$/,
  transition: /^([A-Za-z0-9_]+)\s*-->\s*([A-Za-z0-9_]+)$/,
  transitionWithLabel:
    /^([A-Za-z0-9_]+)\s*--\s*\|([^|]+)\|\s*-->\s*([A-Za-z0-9_]+)$/,
  classDefinition: /^classDef\s+([A-Za-z0-9_-]+)\s+(.+)$/,
  classApplication: /^class\s+([A-Za-z0-9_,\s]+)\s+([A-Za-z0-9_-]+)$/,
  comment: /^%%.*$/,
  subgraph: /^subgraph\s+([A-Za-z0-9_\s]+)$/,
  subgraphEnd: /^end$/,
};

/**
 * State naming conventions
 */
const NAMING_PATTERNS = {
  stateName: /^[A-Z][a-zA-Z0-9]*$/,
  eventName: /^[A-Z_][A-Z0-9_]*$/,
  machineName: /^[A-Z][a-zA-Z0-9]*Machine$/,
  fileName: /^[a-z][a-zA-Z0-9]*(-[a-z][a-zA-Z0-9]*)*\.ts$/,
};

/**
 * Main validation class
 */
export class MermaidValidator {
  private config: ValidationConfig;
  private errors: ValidationError[];
  private warnings: ValidationWarning[];

  constructor(config: Partial<ValidationConfig> = {}) {
    this.config = { ...DEFAULT_VALIDATION_CONFIG, ...config };
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Validate Mermaid file content
   */
  validateMermaidFile(filePath: string): ValidationResult {
    this.reset();

    try {
      if (!existsSync(filePath)) {
        this.addError("File not found", 0, `File does not exist: ${filePath}`);
        return this.getResult();
      }

      const content = readFileSync(filePath, "utf-8");
      return this.validateMermaidContent(content);
    } catch (error) {
      this.addError("File read error", 0, `Failed to read file: ${error}`);
      return this.getResult();
    }
  }

  /**
   * Validate Mermaid content string
   */
  validateMermaidContent(content: string): ValidationResult {
    this.reset();

    const lines = content.split("\n");
    let inMermaidBlock = false;
    let mermaidLines: string[] = [];
    let mermaidStartLine = 0;

    // Extract Mermaid blocks
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line === "```mermaid") {
        if (inMermaidBlock) {
          this.addError(
            "Nested Mermaid blocks",
            i + 1,
            "Mermaid blocks cannot be nested"
          );
        }
        inMermaidBlock = true;
        mermaidStartLine = i + 1;
        mermaidLines = [];
      } else if (line === "```" && inMermaidBlock) {
        inMermaidBlock = false;
        this.validateMermaidBlock(mermaidLines, mermaidStartLine);
      } else if (inMermaidBlock) {
        mermaidLines.push(line);
      }
    }

    if (inMermaidBlock) {
      this.addError(
        "Unclosed Mermaid block",
        mermaidStartLine,
        "Mermaid block is not properly closed with ```"
      );
    }

    if (mermaidLines.length === 0) {
      this.addWarning(
        "No Mermaid content",
        1,
        "No Mermaid diagrams found in file"
      );
    }

    return this.getResult();
  }

  /**
   * Validate a single Mermaid block
   */
  private validateMermaidBlock(lines: string[], startLine: number): void {
    if (lines.length === 0) {
      this.addError(
        "Empty Mermaid block",
        startLine,
        "Mermaid block contains no content"
      );
      return;
    }

    // Check for flowchart declaration
    const firstLine = lines[0].trim();
    if (!MERMAID_PATTERNS.flowchartStart.test(firstLine)) {
      this.addError(
        "Invalid flowchart declaration",
        startLine + 1,
        `Expected 'flowchart TD|TB|BT|RL|LR', got: ${firstLine}`,
        "Use 'flowchart LR' for left-to-right layout or 'flowchart TD' for top-down"
      );
    }

    // Validate each line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNumber = startLine + i + 1;

      if (line === "" || MERMAID_PATTERNS.comment.test(line)) {
        continue; // Skip empty lines and comments
      }

      this.validateMermaidLine(line, lineNumber);
    }
  }

  /**
   * Validate a single Mermaid line
   */
  private validateMermaidLine(line: string, lineNumber: number): void {
    // Check for various Mermaid syntax patterns
    if (line.includes("-->")) {
      // Handle all transition syntax
      this.validateTransitionLine(line, lineNumber);
    } else if (MERMAID_PATTERNS.nodeDefinition.test(line)) {
      this.validateNodeDefinition(line, lineNumber);
    } else if (MERMAID_PATTERNS.classDefinition.test(line)) {
      this.validateClassDefinition(line, lineNumber);
    } else if (MERMAID_PATTERNS.classApplication.test(line)) {
      this.validateClassApplication(line, lineNumber);
    } else if (
      MERMAID_PATTERNS.subgraph.test(line) ||
      MERMAID_PATTERNS.subgraphEnd.test(line)
    ) {
      // Subgraphs are valid but not used in our machine generation
      this.addWarning(
        "Subgraph usage",
        lineNumber,
        "Subgraphs are not converted to machine states"
      );
    } else if (/^[A-Za-z0-9_]+$/.test(line)) {
      // Simple node name - this is valid
      this.validateStateName(line, lineNumber, "node");
    } else {
      this.addError(
        "Invalid syntax",
        lineNumber,
        `Unrecognized Mermaid syntax: ${line}`,
        "Check Mermaid documentation for valid syntax patterns"
      );
    }
  }

  /**
   * Validate transition line syntax
   */
  private validateTransitionLine(line: string, lineNumber: number): void {
    // Try labeled transition first (with pipes)
    const labeledMatch = line.match(
      /([A-Za-z0-9_]+)\s*-->\s*\|([^|]+)\|\s*([A-Za-z0-9_]+)/
    );
    if (labeledMatch) {
      const [, from, label, to] = labeledMatch;
      this.validateStateName(from, lineNumber, "source state");
      this.validateStateName(to, lineNumber, "target state");
      this.validateTransitionLabel(label.trim(), lineNumber);
      return;
    }

    // Try basic transition
    const basicMatch = line.match(/([A-Za-z0-9_]+)\s*-->\s*([A-Za-z0-9_]+)/);
    if (basicMatch) {
      const [, from, to] = basicMatch;
      this.validateStateName(from, lineNumber, "source state");
      this.validateStateName(to, lineNumber, "target state");
      return;
    }

    // If no pattern matches, it's an error
    this.addError(
      "Invalid transition syntax",
      lineNumber,
      `Invalid transition syntax: ${line}`,
      "Use format: StateA --> StateB or StateA --> |EVENT| StateB"
    );
  }

  /**
   * Validate node definition syntax
   */
  private validateNodeDefinition(line: string, lineNumber: number): void {
    const match = MERMAID_PATTERNS.nodeDefinition.exec(line);
    if (match) {
      const [, nodeId, nodeLabel] = match;
      this.validateStateName(nodeId, lineNumber, "node ID");

      if (nodeLabel) {
        this.validateNodeLabel(nodeLabel, lineNumber);
      }
    }
  }

  /**
   * Validate class definition syntax
   */
  private validateClassDefinition(line: string, lineNumber: number): void {
    const match = MERMAID_PATTERNS.classDefinition.exec(line);
    if (match) {
      const [, className, classStyles] = match;
      this.validateClassName(className, lineNumber);
      this.validateClassStyles(classStyles, lineNumber);
    }
  }

  /**
   * Validate class application syntax
   */
  private validateClassApplication(line: string, lineNumber: number): void {
    const match = MERMAID_PATTERNS.classApplication.exec(line);
    if (match) {
      const [, nodeList, className] = match;
      const nodes = nodeList.split(",").map(n => n.trim());

      nodes.forEach(node => {
        this.validateStateName(node, lineNumber, "class target node");
      });

      this.validateClassName(className, lineNumber);
    }
  }

  /**
   * Validate state name conventions
   */
  private validateStateName(
    name: string,
    lineNumber: number,
    context: string
  ): void {
    if (!name || name.length === 0) {
      this.addError(
        "Empty state name",
        lineNumber,
        `${context} cannot be empty`
      );
      return;
    }

    if (this.config.validateNaming && this.config.strictMode) {
      if (!NAMING_PATTERNS.stateName.test(name)) {
        this.addWarning(
          "State naming convention",
          lineNumber,
          `${context} '${name}' should follow PascalCase convention`,
          "Use PascalCase for state names (e.g., 'StartState', 'ProcessingData')"
        );
      }
    }

    // Check for reserved keywords
    const reservedKeywords = [
      "start",
      "end",
      "initial",
      "final",
      "error",
      "done",
    ];
    if (reservedKeywords.includes(name.toLowerCase())) {
      this.addWarning(
        "Reserved keyword",
        lineNumber,
        `${context} '${name}' is a reserved keyword and may cause conflicts`
      );
    }

    // Check length
    if (name.length > 50) {
      this.addWarning(
        "Long state name",
        lineNumber,
        `${context} '${name}' is very long (${name.length} characters)`
      );
    }
  }

  /**
   * Validate transition label
   */
  private validateTransitionLabel(label: string, lineNumber: number): void {
    if (!label || label.length === 0) {
      this.addWarning(
        "Empty transition label",
        lineNumber,
        "Transition label is empty"
      );
      return;
    }

    if (this.config.validateNaming && this.config.strictMode) {
      if (!NAMING_PATTERNS.eventName.test(label)) {
        this.addWarning(
          "Event naming convention",
          lineNumber,
          `Event '${label}' should follow UPPER_SNAKE_CASE convention`,
          "Use UPPER_SNAKE_CASE for event names (e.g., 'START', 'USER_INPUT', 'PROCESS_COMPLETE')"
        );
      }
    }
  }

  /**
   * Validate node label syntax
   */
  private validateNodeLabel(label: string, lineNumber: number): void {
    // Check for balanced brackets/parentheses
    const brackets = { "[": "]", "(": ")", "{": "}", "<": ">", "[[": "]]" };

    for (const [open, close] of Object.entries(brackets)) {
      if (label.startsWith(open) && !label.endsWith(close)) {
        this.addError(
          "Unbalanced brackets",
          lineNumber,
          `Node label starts with '${open}' but doesn't end with '${close}'`
        );
      }
    }
  }

  /**
   * Validate class name
   */
  private validateClassName(className: string, lineNumber: number): void {
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(className)) {
      this.addError(
        "Invalid class name",
        lineNumber,
        `Class name '${className}' contains invalid characters`
      );
    }
  }

  /**
   * Validate class styles
   */
  private validateClassStyles(styles: string, lineNumber: number): void {
    // Basic validation for CSS-like styles
    const stylePattern = /^[a-zA-Z0-9_-]+:[^;]+(?:;[a-zA-Z0-9_-]+:[^;]+)*;?$/;
    if (!stylePattern.test(styles.replace(/\s/g, ""))) {
      this.addWarning(
        "Invalid class styles",
        lineNumber,
        `Class styles may not be valid CSS: ${styles}`
      );
    }
  }

  /**
   * Add validation error
   */
  private addError(
    type: string,
    line: number,
    message: string,
    suggestion?: string
  ): void {
    this.errors.push({
      type,
      line,
      message,
      suggestion,
      severity: "error",
    });
  }

  /**
   * Add validation warning
   */
  private addWarning(
    type: string,
    line: number,
    message: string,
    suggestion?: string
  ): void {
    this.warnings.push({
      type,
      line,
      message,
      suggestion,
      severity: "warning",
    });
  }

  /**
   * Reset validation state
   */
  private reset(): void {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Get validation result
   */
  private getResult(): ValidationResult {
    return {
      isValid: this.errors.length === 0,
      errors: [...this.errors],
      warnings: [...this.warnings],
      summary: {
        totalIssues: this.errors.length + this.warnings.length,
        errorCount: this.errors.length,
        warningCount: this.warnings.length,
      },
    };
  }
}

/**
 * Convenience function for quick validation
 */
export function validateMermaidFile(
  filePath: string,
  config?: Partial<ValidationConfig>
): ValidationResult {
  const validator = new MermaidValidator(config);
  return validator.validateMermaidFile(filePath);
}

/**
 * Convenience function for content validation
 */
export function validateMermaidContent(
  content: string,
  config?: Partial<ValidationConfig>
): ValidationResult {
  const validator = new MermaidValidator(config);
  return validator.validateMermaidContent(content);
}

/**
 * Business rule validator for machine specifications
 */
export class BusinessRuleValidator {
  private config: ValidationConfig;
  private errors: ValidationError[];
  private warnings: ValidationWarning[];

  constructor(config: Partial<ValidationConfig> = {}) {
    this.config = { ...DEFAULT_VALIDATION_CONFIG, ...config };
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Validate machine specifications against business rules
   */
  validateMachineSpecs(
    specs: BusinessValidationMachineSpec[]
  ): ValidationResult {
    this.reset();

    if (specs.length === 0) {
      this.addWarning(
        "No machines",
        0,
        "No machine specifications found to validate"
      );
      return this.getResult();
    }

    // Validate each machine specification
    specs.forEach(spec => {
      this.validateMachineSpec(spec);
    });

    // Cross-machine validation
    this.validateMachineInteractions(specs);

    return this.getResult();
  }

  /**
   * Validate individual machine specification
   */
  private validateMachineSpec(spec: BusinessValidationMachineSpec): void {
    // Validate machine structure
    this.validateMachineStructure(spec);

    // Validate states
    this.validateStates(spec);

    // Validate transitions
    this.validateTransitions(spec);

    // Validate business logic
    this.validateBusinessLogic(spec);

    // Validate naming conventions
    this.validateNamingConventions(spec);
  }

  /**
   * Validate machine structure
   */
  private validateMachineStructure(spec: BusinessValidationMachineSpec): void {
    // Check for required fields
    if (!spec.id || spec.id.trim() === "") {
      this.addError("Missing machine ID", 0, "Machine must have a valid ID");
    }

    if (!spec.name || spec.name.trim() === "") {
      this.addError(
        "Missing machine name",
        0,
        "Machine must have a valid name"
      );
    }

    if (!spec.category) {
      this.addError(
        "Missing machine category",
        0,
        "Machine must have a category"
      );
    } else if (!this.config.allowedCategories.includes(spec.category)) {
      this.addError(
        "Invalid machine category",
        0,
        `Category '${spec.category}' is not allowed. Valid categories: ${this.config.allowedCategories.join(", ")}`
      );
    }

    // Check machine size limits
    if (spec.states.length > this.config.maxStatesPerMachine) {
      this.addWarning(
        "Too many states",
        0,
        `Machine has ${spec.states.length} states, which exceeds the recommended limit of ${this.config.maxStatesPerMachine}`
      );
    }

    if (spec.states.length === 0) {
      this.addError("No states", 0, "Machine must have at least one state");
    }

    // Check for initial state
    if (!spec.initialState) {
      this.addError(
        "Missing initial state",
        0,
        "Machine must have an initial state"
      );
    } else {
      const initialStateExists = spec.states.some(
        state => state.name === spec.initialState
      );
      if (!initialStateExists) {
        this.addError(
          "Invalid initial state",
          0,
          `Initial state '${spec.initialState}' is not defined in the machine`
        );
      }
    }
  }

  /**
   * Validate states
   */
  private validateStates(spec: BusinessValidationMachineSpec): void {
    const stateNames = new Set<string>();
    let finalStateCount = 0;

    spec.states.forEach(state => {
      // Check for duplicate state names
      if (stateNames.has(state.name)) {
        this.addError(
          "Duplicate state",
          0,
          `State '${state.name}' is defined multiple times`
        );
      }
      stateNames.add(state.name);

      // Validate individual state
      this.validateState(state, spec);

      // Count final states
      if (state.type === "final") {
        finalStateCount++;
      }
    });

    // Business rule: Should have at least one final state for user-facing machines
    if (spec.category === "user-machine" && finalStateCount === 0) {
      this.addWarning(
        "No final state",
        0,
        "User-facing machines should have at least one final state for proper completion"
      );
    }

    // Business rule: Too many final states might indicate design issues
    if (finalStateCount > 5) {
      this.addWarning(
        "Many final states",
        0,
        `Machine has ${finalStateCount} final states, which might indicate complex termination logic`
      );
    }
  }

  /**
   * Validate individual state
   */
  private validateState(
    state: BusinessValidationState,
    spec: BusinessValidationMachineSpec
  ): void {
    // Check transition count
    if (state.transitions.length > this.config.maxTransitionsPerState) {
      this.addWarning(
        "Too many transitions",
        0,
        `State '${state.name}' has ${state.transitions.length} transitions, which exceeds the recommended limit of ${this.config.maxTransitionsPerState}`
      );
    }

    // Business rule: Non-final states should have at least one outgoing transition
    if (state.type !== "final" && state.transitions.length === 0) {
      this.addWarning(
        "Dead-end state",
        0,
        `State '${state.name}' has no outgoing transitions and is not marked as final`
      );
    }

    // Business rule: Final states should not have outgoing transitions
    if (state.type === "final" && state.transitions.length > 0) {
      this.addError(
        "Final state with transitions",
        0,
        `Final state '${state.name}' should not have outgoing transitions`
      );
    }

    // Validate state naming for specific categories
    this.validateStateNaming(state, spec.category);
  }

  /**
   * Validate transitions
   */
  private validateTransitions(spec: BusinessValidationMachineSpec): void {
    const allStates = new Set(spec.states.map(s => s.name));
    const reachableStates = new Set([spec.initialState]);

    spec.states.forEach(state => {
      state.transitions.forEach(transition => {
        // Check if target state exists
        if (transition.target && !allStates.has(transition.target)) {
          this.addError(
            "Invalid transition target",
            0,
            `Transition from '${state.name}' targets non-existent state '${transition.target}'`
          );
        }

        // Track reachable states
        if (transition.target) {
          reachableStates.add(transition.target);
        }

        // Validate transition logic
        this.validateTransition(transition, state, spec);
      });
    });

    // Check for unreachable states
    allStates.forEach(stateName => {
      if (!reachableStates.has(stateName)) {
        this.addWarning(
          "Unreachable state",
          0,
          `State '${stateName}' is not reachable from the initial state`
        );
      }
    });
  }

  /**
   * Validate individual transition
   */
  private validateTransition(
    transition: BusinessValidationTransition,
    fromState: BusinessValidationState,
    spec: BusinessValidationMachineSpec
  ): void {
    // Business rule: Error transitions should exist for user-facing states
    if (
      spec.category === "user-machine" &&
      fromState.name.toLowerCase().includes("input")
    ) {
      const hasErrorTransition = fromState.transitions.some(
        t =>
          t.event.toLowerCase().includes("error") ||
          (t.target && t.target.toLowerCase().includes("error"))
      );

      if (!hasErrorTransition) {
        this.addWarning(
          "Missing error handling",
          0,
          `Input state '${fromState.name}' should have error handling transitions`
        );
      }
    }

    // Business rule: Navigation transitions for user machines
    if (spec.category === "user-machine") {
      const hasBackTransition = fromState.transitions.some(
        t =>
          t.event.toLowerCase().includes("back") ||
          t.event.toLowerCase().includes("cancel")
      );

      if (!hasBackTransition && fromState.name !== spec.initialState) {
        this.addWarning(
          "Missing navigation",
          0,
          `User state '${fromState.name}' should have back/cancel navigation`
        );
      }
    }

    // Validate event naming
    if (transition.event && this.config.validateNaming) {
      if (!NAMING_PATTERNS.eventName.test(transition.event)) {
        this.addWarning(
          "Event naming convention",
          0,
          `Event '${transition.event}' should follow UPPER_SNAKE_CASE convention`
        );
      }
    }
  }

  /**
   * Validate business logic rules
   */
  private validateBusinessLogic(spec: BusinessValidationMachineSpec): void {
    switch (spec.category) {
      case "user-machine":
        this.validateUserMachineRules(spec);
        break;
      case "agent-machine":
        this.validateAgentMachineRules(spec);
        break;
      case "account-machine":
        this.validateAccountMachineRules(spec);
        break;
      case "info-machine":
        this.validateInfoMachineRules(spec);
        break;
      case "core-machine":
        this.validateCoreMachineRules(spec);
        break;
    }
  }

  /**
   * Validate user machine specific rules
   */
  private validateUserMachineRules(spec: BusinessValidationMachineSpec): void {
    // Should have authentication/session validation
    const hasAuthState = spec.states.some(
      state =>
        state.name.toLowerCase().includes("auth") ||
        state.name.toLowerCase().includes("login") ||
        state.name.toLowerCase().includes("session")
    );

    if (!hasAuthState) {
      this.addWarning(
        "Missing authentication",
        0,
        "User machines should include authentication or session validation"
      );
    }

    // Should have menu/navigation states
    const hasMenuState = spec.states.some(
      state =>
        state.name.toLowerCase().includes("menu") ||
        state.name.toLowerCase().includes("main")
    );

    if (!hasMenuState) {
      this.addWarning(
        "Missing menu state",
        0,
        "User machines should include menu or main navigation state"
      );
    }
  }

  /**
   * Validate agent machine specific rules
   */
  private validateAgentMachineRules(spec: BusinessValidationMachineSpec): void {
    // Should have permission validation
    const hasPermissionCheck = spec.states.some(
      state =>
        state.name.toLowerCase().includes("permission") ||
        state.name.toLowerCase().includes("authorize")
    );

    if (!hasPermissionCheck) {
      this.addWarning(
        "Missing permission check",
        0,
        "Agent machines should include permission validation"
      );
    }
  }

  /**
   * Validate account machine specific rules
   */
  private validateAccountMachineRules(
    spec: BusinessValidationMachineSpec
  ): void {
    // Should have balance/account validation
    const hasAccountValidation = spec.states.some(
      state =>
        state.name.toLowerCase().includes("balance") ||
        state.name.toLowerCase().includes("account") ||
        state.name.toLowerCase().includes("validate")
    );

    if (!hasAccountValidation) {
      this.addWarning(
        "Missing account validation",
        0,
        "Account machines should include balance or account validation"
      );
    }
  }

  /**
   * Validate info machine specific rules
   */
  private validateInfoMachineRules(spec: BusinessValidationMachineSpec): void {
    // Should be relatively simple (few states)
    if (spec.states.length > 10) {
      this.addWarning(
        "Complex info machine",
        0,
        "Information machines should be simple with few states"
      );
    }
  }

  /**
   * Validate core machine specific rules
   */
  private validateCoreMachineRules(spec: BusinessValidationMachineSpec): void {
    // Should have routing/dispatch logic
    const hasRoutingState = spec.states.some(
      state =>
        state.name.toLowerCase().includes("route") ||
        state.name.toLowerCase().includes("dispatch") ||
        state.name.toLowerCase().includes("select")
    );

    if (!hasRoutingState) {
      this.addWarning(
        "Missing routing logic",
        0,
        "Core machines should include routing or dispatch logic"
      );
    }
  }

  /**
   * Validate naming conventions
   */
  private validateNamingConventions(spec: BusinessValidationMachineSpec): void {
    if (!this.config.validateNaming) return;

    // Machine name should end with "Machine"
    if (!NAMING_PATTERNS.machineName.test(spec.name)) {
      this.addWarning(
        "Machine naming convention",
        0,
        `Machine name '${spec.name}' should end with 'Machine' and follow PascalCase`
      );
    }

    // State names should follow PascalCase
    spec.states.forEach(state => {
      if (!NAMING_PATTERNS.stateName.test(state.name)) {
        this.addWarning(
          "State naming convention",
          0,
          `State name '${state.name}' should follow PascalCase convention`
        );
      }
    });
  }

  /**
   * Validate state naming for specific categories
   */
  private validateStateNaming(
    state: BusinessValidationState,
    category: MachineCategory
  ): void {
    const stateName = state.name.toLowerCase();

    // Category-specific naming suggestions
    switch (category) {
      case "user-machine":
        if (stateName.includes("input") && !stateName.includes("user")) {
          this.addWarning(
            "State naming suggestion",
            0,
            `Consider prefixing input state '${state.name}' with 'User' for clarity`
          );
        }
        break;

      case "agent-machine":
        if (stateName.includes("process") && !stateName.includes("agent")) {
          this.addWarning(
            "State naming suggestion",
            0,
            `Consider prefixing process state '${state.name}' with 'Agent' for clarity`
          );
        }
        break;
    }
  }

  /**
   * Validate interactions between machines
   */
  private validateMachineInteractions(
    specs: BusinessValidationMachineSpec[]
  ): void {
    // Check for naming conflicts
    const machineNames = new Set<string>();
    specs.forEach(spec => {
      if (machineNames.has(spec.name)) {
        this.addError(
          "Duplicate machine name",
          0,
          `Machine name '${spec.name}' is used by multiple machines`
        );
      }
      machineNames.add(spec.name);
    });

    // Validate category distribution
    const categoryCount = new Map<MachineCategory, number>();
    specs.forEach(spec => {
      categoryCount.set(
        spec.category,
        (categoryCount.get(spec.category) || 0) + 1
      );
    });

    // Business rule: Should have balanced machine types
    if (categoryCount.get("user-machine") === 0) {
      this.addWarning(
        "Missing user machines",
        0,
        "System should include user-facing machines for USSD interactions"
      );
    }

    if (categoryCount.get("core-machine") === 0) {
      this.addWarning(
        "Missing core machine",
        0,
        "System should include a core routing machine"
      );
    }
  }

  /**
   * Add validation error
   */
  private addError(
    type: string,
    line: number,
    message: string,
    suggestion?: string
  ): void {
    this.errors.push({
      type,
      line,
      message,
      suggestion,
      severity: "error",
    });
  }

  /**
   * Add validation warning
   */
  private addWarning(
    type: string,
    line: number,
    message: string,
    suggestion?: string
  ): void {
    this.warnings.push({
      type,
      line,
      message,
      suggestion,
      severity: "warning",
    });
  }

  /**
   * Reset validation state
   */
  private reset(): void {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Get validation result
   */
  private getResult(): ValidationResult {
    return {
      isValid: this.errors.length === 0,
      errors: [...this.errors],
      warnings: [...this.warnings],
      summary: {
        totalIssues: this.errors.length + this.warnings.length,
        errorCount: this.errors.length,
        warningCount: this.warnings.length,
      },
    };
  }
}

/**
 * Convert ParsedMachineSpec to BusinessValidationMachineSpec
 */
export function convertToBusinessValidationSpec(
  spec: ParsedMachineSpec
): BusinessValidationMachineSpec {
  // Convert states
  const states: BusinessValidationState[] = spec.states.map(state => ({
    name: state.id,
    type: state.isFinal ? "final" : "normal",
    description: state.label || state.id,
    transitions: convertTransitionsForState(state.id, spec.transitions),
    entry: [],
    exit: [],
    states: [],
  }));

  return {
    id: spec.id,
    name: spec.name,
    category: spec.category,
    description: spec.name,
    initialState: spec.initialState,
    states,
    events: extractEventsFromTransitions(spec.transitions),
    context: [],
    guards: [],
    actions: [],
    actors: [],
    imports: [],
  };
}

/**
 * Convert transitions for a specific state
 */
function convertTransitionsForState(
  stateId: string,
  allTransitions: ParsedTransition[]
): BusinessValidationTransition[] {
  return allTransitions
    .filter(t => t.from === stateId)
    .map(t => ({
      event: t.label || "NEXT",
      target: t.to,
      guard: t.guard,
      actions: t.action ? [t.action] : [],
    }));
}

/**
 * Extract unique events from transitions
 */
function extractEventsFromTransitions(transitions: ParsedTransition[]): Array<{
  type: string;
  description: string;
  payload: Array<{
    name: string;
    type: string;
    optional: boolean;
  }>;
}> {
  const uniqueEvents = new Set(transitions.map(t => t.label || "NEXT"));
  return Array.from(uniqueEvents).map(event => ({
    type: event,
    description: `Event: ${event}`,
    payload: [],
  }));
}

/**
 * Convenience function for business rule validation
 */
export function validateBusinessRules(
  specs: BusinessValidationMachineSpec[],
  config?: Partial<ValidationConfig>
): ValidationResult {
  const validator = new BusinessRuleValidator(config);
  return validator.validateMachineSpecs(specs);
}

/**
 * Convenience function for business rule validation with ParsedMachineSpec
 */
export function validateBusinessRulesFromParsed(
  specs: ParsedMachineSpec[],
  config?: Partial<ValidationConfig>
): ValidationResult {
  const businessSpecs = specs.map(convertToBusinessValidationSpec);
  return validateBusinessRules(businessSpecs, config);
}
