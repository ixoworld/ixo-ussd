/**
 * Generator Types - TypeScript interfaces for the specification-driven development system
 *
 * This module defines the core types used throughout the code generation system
 * for parsing Mermaid diagrams and generating XState v5 machines.
 *
 * @module generator-types
 * @version 1.0.0
 */

/**
 * CSS class annotations used in Mermaid diagrams to categorize machines
 */
export type MachineCategory =
  | "info-machine" // Information/read-only machines (Know More flows)
  | "user-machine" // User service machines (authenticated operations)
  | "agent-machine" // Agent-specific workflow machines
  | "account-machine" // Account management machines
  | "core-machine"; // Core system machines (routing, welcome)

/**
 * Supported Mermaid node shapes that affect state behavior
 */
export type NodeShape =
  | "rect" // Rectangle - standard state
  | "round" // Rounded rectangle - standard state
  | "circle" // Circle - typically final states
  | "diamond" // Diamond - decision states
  | "hexagon" // Hexagon - special processing states
  | "stadium"; // Stadium - start/end states

/**
 * Types of transitions between states in the Mermaid diagram
 */
export type TransitionType =
  | "user_input" // User provides input (text, selection)
  | "system_action" // System performs action automatically
  | "conditional" // Conditional transition based on guards
  | "error" // Error handling transition
  | "timeout" // Timeout-based transition
  | "external"; // External service response

/**
 * Represents a single state in the parsed Mermaid diagram
 */
export interface ParsedState {
  /** Unique identifier for the state */
  id: string;

  /** Human-readable label for the state */
  label: string;

  /** Visual shape of the node in Mermaid */
  shape: NodeShape;

  /** Whether this is a final state */
  isFinal: boolean;

  /** Whether this is the initial state */
  isInitial: boolean;

  /** CSS classes applied to this node */
  cssClasses: string[];

  /** Additional metadata from Mermaid annotations */
  metadata: Record<string, any>;
}

/**
 * Represents a transition between states in the parsed Mermaid diagram
 */
export interface ParsedTransition {
  /** Source state ID */
  from: string;

  /** Target state ID */
  to: string;

  /** Label on the transition (event name, condition, etc.) */
  label: string;

  /** Type of transition for code generation */
  type: TransitionType;

  /** Guard condition if applicable */
  guard?: string;

  /** Action to execute on transition */
  action?: string;

  /** Additional metadata */
  metadata: Record<string, any>;
}

/**
 * Complete machine specification parsed from Mermaid diagram
 */
export interface ParsedMachineSpec {
  /** Machine identifier (derived from diagram section) */
  id: string;

  /** Human-readable machine name */
  name: string;

  /** Machine category based on CSS classes */
  category: MachineCategory;

  /** All states in this machine */
  states: ParsedState[];

  /** All transitions in this machine */
  transitions: ParsedTransition[];

  /** Initial state ID */
  initialState: string;

  /** Final state IDs */
  finalStates: string[];

  /** Machine-level metadata */
  metadata: Record<string, any>;
}

/**
 * Context interface specification for generated machines
 */
export interface GeneratedContextSpec {
  /** Context field name */
  name: string;

  /** TypeScript type */
  type: string;

  /** Default value */
  defaultValue: string;

  /** Whether field is optional */
  optional: boolean;

  /** Documentation comment */
  description?: string;
}

/**
 * Event interface specification for generated machines
 */
export interface GeneratedEventSpec {
  /** Event type name */
  type: string;

  /** Event payload fields */
  payload: GeneratedContextSpec[];

  /** Documentation comment */
  description?: string;
}

/**
 * State specification for generated machines
 */
export interface GeneratedStateSpec {
  /** State name */
  name: string;

  /** State type (normal, final, parallel, etc.) */
  type: "normal" | "final" | "parallel" | "compound";

  /** Entry actions */
  entry?: string[];

  /** Exit actions */
  exit?: string[];

  /** State transitions */
  transitions: {
    event: string;
    target?: string;
    guard?: string;
    actions?: string[];
  }[];

  /** Nested states for compound states */
  states?: GeneratedStateSpec[];

  /** Documentation comment */
  description?: string;
}

/**
 * Complete specification for generating an XState v5 machine
 */
export interface GeneratedMachineSpec {
  /** Machine ID */
  id: string;

  /** Machine name for file naming */
  name: string;

  /** Target directory category */
  category: MachineCategory;

  /** Context interface specification */
  context: GeneratedContextSpec[];

  /** Event type specifications */
  events: GeneratedEventSpec[];

  /** State specifications */
  states: GeneratedStateSpec[];

  /** Initial state name */
  initialState: string;

  /** Required imports */
  imports: string[];

  /** External actors/services needed */
  actors: string[];

  /** Guard functions needed */
  guards: string[];

  /** Action functions needed */
  actions: string[];

  /** Machine-level documentation */
  description?: string;
}

/**
 * Configuration for the code generation process
 */
export interface GeneratorConfig {
  /** Source Mermaid file path */
  sourcePath: string;

  /** Output directory for generated machines */
  outputDir: string;

  /** Whether to generate demo files */
  generateDemos: boolean;

  /** Whether to generate test files */
  generateTests: boolean;

  /** Whether to overwrite existing files */
  overwrite: boolean;

  /** Verbose logging */
  verbose: boolean;

  /** Dry run mode (no file writes) */
  dryRun: boolean;
}

/**
 * Result of parsing a Mermaid diagram
 */
export interface ParseResult {
  /** Successfully parsed machines */
  machines: ParsedMachineSpec[];

  /** Parsing errors encountered */
  errors: ParseError[];

  /** Warnings during parsing */
  warnings: ParseWarning[];

  /** Source file metadata */
  sourceMetadata: {
    filePath: string;
    lastModified: Date;
    lineCount: number;
  };
}

/**
 * Parsing error information
 */
export interface ParseError {
  /** Error message */
  message: string;

  /** Line number where error occurred */
  line?: number;

  /** Column number where error occurred */
  column?: number;

  /** Error severity */
  severity: "error" | "warning";

  /** Suggested fix */
  suggestion?: string;
}

/**
 * Parsing warning information
 */
export interface ParseWarning {
  /** Warning message */
  message: string;

  /** Line number where warning occurred */
  line?: number;

  /** Warning type */
  type: "syntax" | "semantic" | "style";

  /** Suggested improvement */
  suggestion?: string;
}

/**
 * Result of generating machine code
 */
export interface GenerationResult {
  /** Successfully generated files */
  generatedFiles: GeneratedFile[];

  /** Generation errors */
  errors: ParseError[];

  /** Generation warnings */
  warnings: ParseWarning[];

  /** Generation statistics */
  stats: {
    machinesGenerated: number;
    filesCreated: number;
    linesOfCode: number;
    duration: number;
  };
}

/**
 * Information about a generated file
 */
export interface GeneratedFile {
  /** File path */
  path: string;

  /** File type */
  type: "machine" | "test" | "demo" | "service";

  /** File content */
  content: string;

  /** Whether file was overwritten */
  overwritten: boolean;

  /** File size in bytes */
  size: number;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary: ValidationSummary;
}

/**
 * Validation error interface
 */
export interface ValidationError {
  type: string;
  line: number;
  message: string;
  suggestion?: string;
  severity: "error";
}

/**
 * Validation warning interface
 */
export interface ValidationWarning {
  type: string;
  line: number;
  message: string;
  suggestion?: string;
  severity: "warning";
}

/**
 * Validation summary interface
 */
export interface ValidationSummary {
  totalIssues: number;
  errorCount: number;
  warningCount: number;
}

/**
 * Business validation interfaces (used by validation tests and business rule validator)
 * These interfaces represent the structure expected by the business validation system
 */

/**
 * State specification for business validation
 */
export interface BusinessValidationState {
  name: string;
  type: "normal" | "final" | "parallel" | "compound";
  description: string;
  transitions: BusinessValidationTransition[];
  entry: string[];
  exit: string[];
  states: BusinessValidationState[];
}

/**
 * Transition specification for business validation
 */
export interface BusinessValidationTransition {
  event: string;
  target?: string;
  guard?: string;
  actions: string[];
}

/**
 * Machine specification for business validation
 */
export interface BusinessValidationMachineSpec {
  id: string;
  name: string;
  category: MachineCategory;
  description: string;
  initialState: string;
  states: BusinessValidationState[];
  events: Array<{
    type: string;
    description: string;
    payload: Array<{
      name: string;
      type: string;
      optional: boolean;
    }>;
  }>;
  context: Array<{
    name: string;
    type: string;
    defaultValue: string;
    optional: boolean;
  }>;
  guards: string[];
  actions: string[];
  actors: string[];
  imports: string[];
}
