/**
 * Machine Generator - Converts parsed Mermaid specs to XState v5 machines
 *
 * This module takes parsed Mermaid machine specifications and converts them
 * into complete XState v5 machine specifications ready for code generation.
 *
 * @module machine-generator
 * @version 1.0.0
 */

import type {
  ParsedMachineSpec,
  ParsedState,
  ParsedTransition,
  GeneratedMachineSpec,
  GeneratedStateSpec,
  GeneratedEventSpec,
  GeneratedContextSpec,
  MachineCategory,
} from "./types/generator-types.js";

/**
 * Machine generation configuration
 */
export interface MachineGeneratorConfig {
  /** Whether to generate comprehensive context fields */
  generateContext: boolean;

  /** Whether to infer events from transitions */
  inferEvents: boolean;

  /** Whether to generate guards for conditional transitions */
  generateGuards: boolean;

  /** Whether to generate actions for state changes */
  generateActions: boolean;

  /** Whether to generate actors for external services */
  generateActors: boolean;

  /** Custom naming conventions */
  namingConventions: {
    contextPrefix: string;
    eventSuffix: string;
    guardPrefix: string;
    actionSuffix: string;
  };
}

/**
 * Default generator configuration
 */
export const DEFAULT_GENERATOR_CONFIG: MachineGeneratorConfig = {
  generateContext: true,
  inferEvents: true,
  generateGuards: true,
  generateActions: true,
  generateActors: true,
  namingConventions: {
    contextPrefix: "",
    eventSuffix: "",
    guardPrefix: "is",
    actionSuffix: "Action",
  },
};

/**
 * Main machine generator class
 */
export class MachineGenerator {
  private config: MachineGeneratorConfig;

  constructor(config: Partial<MachineGeneratorConfig> = {}) {
    this.config = { ...DEFAULT_GENERATOR_CONFIG, ...config };
  }

  /**
   * Convert parsed Mermaid spec to generated machine spec
   */
  generateMachineSpec(parsedSpec: ParsedMachineSpec): GeneratedMachineSpec {
    const context = this.generateContextSpec(parsedSpec);
    const events = this.generateEventSpecs(parsedSpec);
    const states = this.generateStateSpecs(parsedSpec);
    const guards = this.extractGuards(parsedSpec);
    const actions = this.extractActions(parsedSpec);
    const actors = this.extractActors(parsedSpec);
    const imports = this.generateImports(parsedSpec);

    return {
      id: this.sanitizeMachineName(parsedSpec.id),
      name: this.formatMachineName(parsedSpec.name),
      category: parsedSpec.category,
      context,
      events,
      states,
      initialState: parsedSpec.initialState,
      imports,
      actors,
      guards,
      actions,
      description: this.generateMachineDescription(parsedSpec),
    };
  }

  /**
   * Generate context specification from parsed states and transitions
   */
  private generateContextSpec(
    parsedSpec: ParsedMachineSpec
  ): GeneratedContextSpec[] {
    if (!this.config.generateContext) {
      return [];
    }

    const contextFields: GeneratedContextSpec[] = [];

    // Add category-specific context fields
    contextFields.push(...this.getCategoryContextFields(parsedSpec.category));

    // Add fields based on machine complexity
    if (parsedSpec.states.length > 3) {
      contextFields.push({
        name: "currentStep",
        type: "number",
        defaultValue: "1",
        optional: false,
        description: "Current step in the flow",
      });
    }

    // Add error handling context
    contextFields.push({
      name: "error",
      type: "string | null",
      defaultValue: "null",
      optional: true,
      description: "Current error message if any",
    });

    // Add input tracking if machine has user input transitions
    const hasUserInput = parsedSpec.transitions.some(
      t => t.type === "user_input"
    );
    if (hasUserInput) {
      contextFields.push({
        name: "userInput",
        type: "string",
        defaultValue: '""',
        optional: true,
        description: "Last user input received",
      });
    }

    return contextFields;
  }

  /**
   * Get category-specific context fields
   */
  private getCategoryContextFields(
    category: MachineCategory
  ): GeneratedContextSpec[] {
    const categoryFields: Record<MachineCategory, GeneratedContextSpec[]> = {
      "user-machine": [
        {
          name: "phoneNumber",
          type: "string",
          defaultValue: '""',
          optional: false,
          description: "User's phone number",
        },
        {
          name: "sessionId",
          type: "string",
          defaultValue: '""',
          optional: false,
          description: "USSD session ID",
        },
      ],
      "agent-machine": [
        {
          name: "agentId",
          type: "string",
          defaultValue: '""',
          optional: false,
          description: "Agent identifier",
        },
        {
          name: "agentVerified",
          type: "boolean",
          defaultValue: "false",
          optional: false,
          description: "Whether agent is verified",
        },
      ],
      "info-machine": [
        {
          name: "currentPage",
          type: "number",
          defaultValue: "1",
          optional: false,
          description: "Current information page",
        },
        {
          name: "totalPages",
          type: "number",
          defaultValue: "1",
          optional: false,
          description: "Total number of pages",
        },
      ],
      "account-machine": [
        {
          name: "accountId",
          type: "string",
          defaultValue: '""',
          optional: false,
          description: "Account identifier",
        },
        {
          name: "balance",
          type: "number",
          defaultValue: "0",
          optional: true,
          description: "Account balance",
        },
      ],
      "core-machine": [
        {
          name: "route",
          type: "string",
          defaultValue: '""',
          optional: false,
          description: "Current route",
        },
      ],
    };

    return categoryFields[category] || [];
  }

  /**
   * Generate event specifications from transitions
   */
  private generateEventSpecs(
    parsedSpec: ParsedMachineSpec
  ): GeneratedEventSpec[] {
    if (!this.config.inferEvents) {
      return [];
    }

    const eventMap = new Map<string, GeneratedEventSpec>();

    // Extract events from transitions
    parsedSpec.transitions.forEach(transition => {
      if (!transition.label) return;

      const eventType = this.extractEventType(transition.label);
      if (!eventType || eventMap.has(eventType)) return;

      const payload = this.inferEventPayload(transition);

      eventMap.set(eventType, {
        type: eventType,
        payload,
        description: `Event for ${transition.label}`,
      });
    });

    return Array.from(eventMap.values());
  }

  /**
   * Extract event type from transition label
   */
  private extractEventType(label: string): string | null {
    // Remove guard and action annotations
    const cleanLabel = label
      .replace(/guard:\s*\w+/g, "")
      .replace(/action:\s*\w+/g, "")
      .trim();

    if (!cleanLabel) return null;

    // Convert to event type format
    return cleanLabel
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
  }

  /**
   * Infer event payload from transition context
   */
  private inferEventPayload(
    transition: ParsedTransition
  ): GeneratedContextSpec[] {
    const payload: GeneratedContextSpec[] = [];

    // Add payload based on transition type
    switch (transition.type) {
      case "user_input":
        payload.push({
          name: "input",
          type: "string",
          defaultValue: '""',
          optional: false,
          description: "User input value",
        });
        break;

      case "error":
        payload.push({
          name: "error",
          type: "string",
          defaultValue: '""',
          optional: false,
          description: "Error message",
        });
        break;

      case "external":
        payload.push({
          name: "data",
          type: "any",
          defaultValue: "null",
          optional: true,
          description: "External service response data",
        });
        break;
    }

    return payload;
  }

  /**
   * Generate state specifications
   */
  private generateStateSpecs(
    parsedSpec: ParsedMachineSpec
  ): GeneratedStateSpec[] {
    return parsedSpec.states.map(state =>
      this.convertParsedState(state, parsedSpec)
    );
  }

  /**
   * Convert parsed state to generated state spec
   */
  private convertParsedState(
    parsedState: ParsedState,
    spec: ParsedMachineSpec
  ): GeneratedStateSpec {
    const transitions = this.getStateTransitions(
      parsedState.id,
      spec.transitions
    );
    const stateType = parsedState.isFinal ? "final" : "normal";

    return {
      name: parsedState.id,
      type: stateType,
      entry: this.generateStateEntry(parsedState),
      exit: this.generateStateExit(parsedState),
      transitions: transitions.map(t => ({
        event: this.extractEventType(t.label) || "UNKNOWN",
        target: t.to,
        guard: t.guard,
        actions: t.action ? [t.action] : [],
      })),
      description: `State: ${parsedState.label}`,
    };
  }

  /**
   * Get transitions for a specific state
   */
  private getStateTransitions(
    stateId: string,
    allTransitions: ParsedTransition[]
  ): ParsedTransition[] {
    return allTransitions.filter(t => t.from === stateId);
  }

  /**
   * Generate entry actions for a state
   */
  private generateStateEntry(state: ParsedState): string[] {
    const actions: string[] = [];

    // Add logging action for development
    actions.push("logStateEntry");

    // Add category-specific entry actions
    if (state.cssClasses.includes("user-machine")) {
      actions.push("validateUserSession");
    }

    if (state.cssClasses.includes("agent-machine")) {
      actions.push("validateAgentCredentials");
    }

    return actions;
  }

  /**
   * Generate exit actions for a state
   */
  private generateStateExit(state: ParsedState): string[] {
    const actions: string[] = [];

    // Add cleanup action
    if (state.isFinal) {
      actions.push("cleanupSession");
    }

    return actions;
  }

  /**
   * Extract guard names from transitions
   */
  private extractGuards(parsedSpec: ParsedMachineSpec): string[] {
    const guards = new Set<string>();

    parsedSpec.transitions.forEach(transition => {
      if (transition.guard) {
        guards.add(transition.guard);
      }

      // Add type-specific guards
      if (transition.type === "conditional") {
        const guardName = `${this.config.namingConventions.guardPrefix}${this.capitalize(transition.from)}Valid`;
        guards.add(guardName);
      }
    });

    return Array.from(guards);
  }

  /**
   * Extract action names from transitions and states
   */
  private extractActions(parsedSpec: ParsedMachineSpec): string[] {
    const actions = new Set<string>();

    // Add standard actions
    actions.add("logStateEntry");
    actions.add("cleanupSession");

    // Add category-specific actions
    if (parsedSpec.category === "user-machine") {
      actions.add("validateUserSession");
    }

    if (parsedSpec.category === "agent-machine") {
      actions.add("validateAgentCredentials");
    }

    // Extract from transitions
    parsedSpec.transitions.forEach(transition => {
      if (transition.action) {
        actions.add(transition.action);
      }
    });

    return Array.from(actions);
  }

  /**
   * Extract actor names for external services
   */
  private extractActors(parsedSpec: ParsedMachineSpec): string[] {
    const actors = new Set<string>();

    // Add actors based on transition types
    const hasExternalTransitions = parsedSpec.transitions.some(
      t => t.type === "external"
    );
    if (hasExternalTransitions) {
      actors.add("externalService");
    }

    // Add category-specific actors
    if (parsedSpec.category === "user-machine") {
      actors.add("userService");
    }

    if (parsedSpec.category === "agent-machine") {
      actors.add("agentService");
    }

    return Array.from(actors);
  }

  /**
   * Generate required imports
   */
  private generateImports(parsedSpec: ParsedMachineSpec): string[] {
    const imports: string[] = [];

    // Add category-specific imports
    const categoryImports: Record<MachineCategory, string[]> = {
      "user-machine": [
        'import { validatePhoneNumber } from "../../services/validation.js";',
        'import { getUserSession } from "../../services/session.js";',
      ],
      "agent-machine": [
        'import { validateAgentCredentials } from "../../services/agent.js";',
      ],
      "info-machine": [
        'import { getInformationContent } from "../../services/content.js";',
      ],
      "account-machine": [
        'import { getAccountBalance } from "../../services/account.js";',
      ],
      "core-machine": [
        'import { routeToMachine } from "../../services/routing.js";',
      ],
    };

    imports.push(...(categoryImports[parsedSpec.category] || []));

    return imports;
  }

  /**
   * Generate machine description
   */
  private generateMachineDescription(parsedSpec: ParsedMachineSpec): string {
    const categoryDesc = this.getCategoryDescription(parsedSpec.category);
    return `Auto-generated ${categoryDesc} machine with ${parsedSpec.states.length} states and ${parsedSpec.transitions.length} transitions.`;
  }

  /**
   * Get description for machine category
   */
  private getCategoryDescription(category: MachineCategory): string {
    const descriptions = {
      "info-machine": "information and read-only",
      "user-machine": "authenticated user service",
      "agent-machine": "agent-specific workflow",
      "account-machine": "account management",
      "core-machine": "core system routing",
    };

    return descriptions[category] || "general purpose";
  }

  /**
   * Sanitize machine name for use as identifier
   */
  private sanitizeMachineName(name: string): string {
    return (
      name
        .replace(/[^a-zA-Z0-9]/g, "")
        .replace(/^[0-9]/, "_$&") // Ensure doesn't start with number
        .toLowerCase() + "Machine"
    );
  }

  /**
   * Format machine name for display
   */
  private formatMachineName(name: string): string {
    return name
      .split(/[-_\s]+/)
      .map(word => this.capitalize(word))
      .join(" ");
  }

  /**
   * Capitalize first letter of string
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
}

/**
 * Convenience function to generate machine spec
 */
export function generateMachineSpec(
  parsedSpec: ParsedMachineSpec,
  config?: Partial<MachineGeneratorConfig>
): GeneratedMachineSpec {
  const generator = new MachineGenerator(config);
  return generator.generateMachineSpec(parsedSpec);
}
